import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { unstable_cache } from 'next/cache';
import crypto from 'crypto';

// Initialize the SDK. It automatically picks up the GEMINI_API_KEY environment variable.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function generateArticleSummary(postId: string, htmlContent: string): Promise<string[]> {
  // 1. Kiểm tra JSON vật lý trước
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'ai-summaries.json');
    if (fs.existsSync(jsonPath)) {
      const db = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (db[postId] && Array.isArray(db[postId])) {
        return db[postId]; // Trả về luôn nếu đã nằm trong JSON
      }
    }
  } catch (e) {
    console.error("Failed to read summaries DB", e);
  }

  // 2. Nếu chưa có trong JSON (Như chạy trên Vercel mới tinh hoặc script chưa chạy xong) thì mới gọi Gemini
  // Bọc vào unstable_cache để các khách hàng vào sau được kế thừa
  const getSummaryCached = unstable_cache(
    async () => fetchSummaryFromGemini(postId, htmlContent),
    [`article-summary-v2-${postId}`] // Lưu vĩnh viễn (Không có revalidate)
  );

  return getSummaryCached();
}

async function fetchSummaryFromGemini(postId: string, htmlContent: string): Promise<string[]> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Returning fallback summary.");
      return [
        "Chưa thiết lập API Key cho Gemini.",
        "Vui lòng cấu hình GEMINI_API_KEY trong file .env.local",
      ];
    }

    // Strip HTML to reduce token usage and improve input clarity
    const textContent = htmlContent.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

    // Limit text to avoid exceeding token limits unnecessarily
    const textToSummarize = textContent.slice(0, 15000);

    const prompt = `
Hãy tóm tắt nội dung bài viết dưới đây thành TỐI ĐA 3 ý chính cực kỳ ngắn gọn.
YÊU CẦU BẮT BUỘC: Mỗi ý KHÔNG ĐƯỢC VƯỢT QUÁ 15-20 CHỮ. Càng ngắn càng tốt, đọc lướt hiểu ngay.
Không thêm nội dung mở bài, kết bài hay bất kỳ văn bản nào khác.
Bắt đầu mỗi ý bằng dấu - .

Nội dung bài viết:
${textToSummarize}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3, // Low temperature for factual summarization
      }
    });

    const output = response.text || '';

    // Parse the output into an array of strings
    const points = output
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith('-') || line.startsWith('*'))
      .map((line: string) => line.replace(/^[-*]\s*/, ''));

    return points.length > 0 ? points : [];
  } catch (error) {
    console.error("Lỗi khi dùng Gemini API tóm tắt bài viết:", error);
    return [];
  }
}
