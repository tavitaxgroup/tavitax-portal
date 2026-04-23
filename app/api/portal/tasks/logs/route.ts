import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');

    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT l.*, u.name as user_name, u.avatar_url as user_avatar 
       FROM task_activity_logs l
       LEFT JOIN admin_users u ON l.user_id = u.id
       WHERE l.task_id = $1
       ORDER BY l.created_at DESC`,
      [taskId]
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
