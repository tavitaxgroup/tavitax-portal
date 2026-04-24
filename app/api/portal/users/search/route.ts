import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

const pool = getDb();

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    
    if (q.trim() === '') {
      return NextResponse.json([]);
    }

    // Tiền xử lý query để search cả bằng Tên hoặc Email, bỏ dấu
    const searchQuery = `%${q.toLowerCase()}%`;

    const { rows } = await pool.query(
      `SELECT id, name, username, job_title, avatar_url, department, status
       FROM admin_users 
       WHERE LOWER(name) LIKE $1 OR LOWER(username) LIKE $1
       ORDER BY name ASC
       LIMIT 5`,
      [searchQuery]
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Search users API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
