import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const { rows } = await pool.query(`SELECT * FROM task_boards ORDER BY id ASC`);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const body = await req.json();
    const { name, color } = body;

    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    const { rows } = await pool.query(
      `INSERT INTO task_boards (name, color, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [name, color || 'indigo', userToken.id]
    );

    return NextResponse.json({ success: true, board: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
