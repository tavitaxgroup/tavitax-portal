import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let dbPool: Pool | null = null;

function getAiSummaries() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'ai-summaries.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Lỗi đọc ai-summaries.json", e);
  }
  return {};
}

export const getDb = () => {
  if (!dbPool) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Khi connect tớ Supabase pooler (port 6543) hoặc direct (5432), set max pool an toàn:
      max: 10,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Create table if not exists
    dbPool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(err => console.error("Database Initial Setup Error: ", err));

    dbPool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INT,
        file_type VARCHAR(100),
        category VARCHAR(100) NOT NULL,
        allowed_roles JSONB DEFAULT '[]'::jsonb,
        uploaded_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_files (
        id SERIAL PRIMARY KEY,
        document_id INT REFERENCES documents(id) ON DELETE CASCADE,
        file_data BYTEA NOT NULL
      );
    `).catch(err => console.error("Database Setup Error for Documents: ", err));
  }
  return dbPool;
};

function extractFirstImage(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src="([^">]+)"/i);
  return match ? match[1] : null;
}

function extractExcerpt(html: string, fallback: string): string {
  // Bỏ qua các chuỗi kế thừa rác hoặc mặc định vô nghĩa
  if (
    fallback && 
    fallback.trim() !== '' && 
    fallback.trim() !== '...' &&
    !fallback.includes('Bài chia sẻ từ chuyên gia')
  ) {
    return fallback;
  }

  if (!html) return '...';
  // Remove HTML tags and decode minimal entities
  let text = html.replace(/<[^>]*>?/gm, '');
  text = text.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > 200) {
    return text.substring(0, 200) + '...';
  }
  return text || '...';
}

export function slugify(str: string, maxLength: number = 75) {
  if (!str) return '';
  let slug = str.toLowerCase()
    .replace(/đ/g, 'd')
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^-a-z0-9\s]+/ig, '')
    .replace(/\s+/gi, "-")
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    // Don't cut a word in half if possible
    const lastDash = slug.lastIndexOf('-');
    if (lastDash > 0) slug = slug.substring(0, lastDash);
  }
  return slug;
}

function generateTags(title: string): string[] {
  const text = (title || "").toLowerCase();
  const tags = new Set<string>();
  
  if (text.includes("thuế") || text.includes("tax") || text.includes("gtgt") || text.includes("tndn") || text.includes("tncn")) tags.add("Thuế");
  if (text.includes("ai ") || text.includes("trí tuệ nhân tạo") || text.includes("chatgpt") || text.includes("openai")) tags.add("AI");
  if (text.includes("doanh nghiệp") || text.includes("công ty") || text.includes("kd")) tags.add("Doanh nghiệp");
  if (text.includes("thu nhập") || text.includes("lương")) tags.add("Thu nhập");
  if (text.includes("kế toán") || text.includes("kiểm toán") || text.includes("kế toán trưởng")) tags.add("Kế toán");
  if (text.includes("pháp lý") || text.includes("luật") || text.includes("nghị định") || text.includes("thông tư") || text.includes("quy định")) tags.add("Cập nhật Luật");
  if (text.includes("đầu tư") || text.includes("fdi") || text.includes("cổ phần")) tags.add("Đầu tư");
  
  if (tags.size === 0) {
    tags.add("Tin tức");
  }
  return Array.from(tags).slice(0, 3); // Giới hạn max 3 tags
}

export const getDatabaseArticles = async () => {
  const pool = getDb();
  try {
    const result = await pool.query(
      `SELECT id, title, excerpt, content, image_url, created_at 
       FROM articles ORDER BY created_at DESC LIMIT 500`
    );
    
    // Get latest summaries
    const aiSummariesCache = getAiSummaries();
    
    // Format to match old structure
    return result.rows.map((row: any) => {
      const extractedImage = extractFirstImage(row.content);
      const idStr = row.id.toString();
      const aiSummary = aiSummariesCache[idStr] ? aiSummariesCache[idStr].join(' ') : null;
      
      return {
        id: idStr,
        title: row.title,
        category: 'Tin Tức',
        tags: generateTags(row.title),
        author: 'Ban Biên Tập Tavitax',
        readTime: '3 phút đọc',
        date: new Date(row.created_at).toLocaleDateString("vi-VN"),
        rawDate: new Date(row.created_at).getTime(),
        desc: aiSummary || extractExcerpt(row.content, row.excerpt),
        content: row.content,
        imageUrl: row.image_url || extractedImage || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
        slug: slugify(row.title) + '-' + idStr
      };
    });
  } catch (error) {
    console.error("Lỗi getDatabaseArticles:", error);
    return [];
  }
};

export const getDatabaseArticleById = async (idOrSlug: string) => {
  const parts = idOrSlug.split('-');
  const numericId = parseInt(parts[parts.length - 1], 10);
  if (isNaN(numericId)) return null;

  const pool = getDb();
  try {
    const result = await pool.query(
      `SELECT id, title, excerpt, content, image_url, created_at 
       FROM articles WHERE id = $1`,
      [numericId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    const aiSummariesCache = getAiSummaries();
    const extractedImage = extractFirstImage(row.content);
    const idStr = row.id.toString();
    const aiSummary = aiSummariesCache[idStr] ? aiSummariesCache[idStr].join(' ') : null;

    return {
      id: idStr,
      title: row.title,
      category: 'Tin Tức',
      tags: generateTags(row.title),
      author: 'Ban Biên Tập Tavitax',
      readTime: '3 phút đọc',
      date: new Date(row.created_at).toLocaleDateString("vi-VN"),
      rawDate: new Date(row.created_at).getTime(),
      desc: aiSummary || extractExcerpt(row.content, row.excerpt),
      content: row.content,
      imageUrl: row.image_url || extractedImage || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
      slug: slugify(row.title) + '-' + idStr
    };
  } catch (error) {
    console.error("Lỗi getDatabaseArticleById:", error);
    return null;
  }
};


