import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

const pool = getDb();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

    const { rows } = await pool.query(`SELECT * FROM task_checklists WHERE task_id = $1 ORDER BY id ASC`, [taskId]);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { task_id, content } = body;
    if (!task_id || !content) return NextResponse.json({ error: 'Missing logic' }, { status: 400 });

    const { rows } = await pool.query(
      `INSERT INTO task_checklists (task_id, content) VALUES ($1, $2) RETURNING *`,
      [task_id, content]
    );

    return NextResponse.json({ success: true, item: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, is_completed } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { rows } = await pool.query(
      `UPDATE task_checklists SET is_completed = $1 WHERE id = $2 RETURNING *`,
      [is_completed, id]
    );

    return NextResponse.json({ success: true, item: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await pool.query(`DELETE FROM task_checklists WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
