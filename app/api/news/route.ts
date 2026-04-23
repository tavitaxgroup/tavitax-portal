import { NextResponse } from 'next/server';
import { getDb, slugify } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, excerpt, content, imageUrl } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Tiêu đề và nội dung là bắt buộc' }, { status: 400 });
    }

    const pool = getDb();
    
    const result = await pool.query(
      `INSERT INTO articles (title, excerpt, content, image_url) 
       VALUES ($1, $2, $3, $4) RETURNING id, title, created_at`,
      [title, excerpt, content, imageUrl || '']
    );

    return NextResponse.json({ success: true, article: result.rows[0] });
  } catch (error: any) {
    console.error("Lỗi lưu DB bài viết:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi lưu bài viết' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const pool = getDb();
    const result = await pool.query(
      `SELECT id, title, excerpt, image_url, created_at 
       FROM articles ORDER BY created_at DESC LIMIT 500`
    );
    const rowsWithSlug = result.rows.map((r: any) => ({
      ...r,
      slug: `${slugify(r.title)}-${r.id}`
    }));
    return NextResponse.json(rowsWithSlug);
  } catch (error: any) {
    console.error("Lỗi lấy danh sách bài viết:", error);
    return NextResponse.json({ error: 'Lỗi dữ liệu' }, { status: 500 });
  }
}
