import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const pool = getDb();

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = verifyToken(token);
    const myId = userToken.id;

    const url = new URL(req.url);
    const start = url.searchParams.get('start'); // ISO string
    const end = url.searchParams.get('end'); // ISO string

    if (!start || !end) return NextResponse.json({ error: 'Missing date range' }, { status: 400 });

    // Fetch logic: Event is inside range AND (Visibility = PUBLIC OR (Visibility = PRIVATE AND (created_by = me OR I am in attendees)))
    // AUTOMATION: Union with Tasks that have a due_date!
    const { rows } = await pool.query(
      `SELECT c.id, c.title, c.description, c.start_time, c.end_time, c.created_by, c.attendees, c.visibility, c.type, c.created_at, c.updated_at, u.name as creator_name, u.avatar_url as creator_avatar
       FROM calendar_events c
       LEFT JOIN admin_users u ON c.created_by = u.id
       WHERE c.start_time < $2 AND c.end_time > $1
         AND (
           c.visibility = 'PUBLIC'
           OR (c.visibility = 'PRIVATE' AND (c.created_by = $3 OR c.attendees @> $4::jsonb))
         )
       UNION ALL
       SELECT 
         (t.id + 100000) as id, -- prevent id collision on UI frontend
         CONCAT('📌 Khóa sổ: ', t.title) as title, 
         t.description,
         (t.due_date - interval '1 hour') as start_time,
         t.due_date as end_time,
         t.created_by,
         '[]'::jsonb as attendees,
         'PRIVATE' as visibility,
         'TASK' as type,
         t.created_at,
         t.updated_at,
         u.name as creator_name,
         u.avatar_url as creator_avatar
       FROM tasks t
       LEFT JOIN admin_users u ON t.created_by = u.id
       WHERE t.due_date IS NOT NULL 
         AND t.status != 'DONE'
         AND t.due_date < $2 AND t.due_date > $1
         AND (t.assignees @> $4::jsonb OR t.created_by = $3)
       ORDER BY start_time ASC`,
      [start, end, myId, JSON.stringify([myId])]
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Calendar GET error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = verifyToken(token);
    const myId = userToken.id;

    const body = await req.json();
    const { title, description, start_time, end_time, attendees, visibility, type } = body;

    if (!title || !start_time || !end_time) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO calendar_events 
       (title, description, start_time, end_time, created_by, attendees, visibility, type) 
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) RETURNING *`,
      [title, description || '', start_time, end_time, myId, JSON.stringify(attendees || []), visibility || 'PRIVATE', type || 'MEETING']
    );

    return NextResponse.json({ success: true, event: rows[0] });
  } catch (error: any) {
    console.error("Calendar POST error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = verifyToken(token);
    const myId = userToken.id;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { rowCount } = await pool.query(
      `DELETE FROM calendar_events WHERE id = $1 AND created_by = $2`,
      [id, myId] // Only creator can delete
    );

    if (rowCount === 0) return NextResponse.json({ error: 'Không có quyền xóa hoặc sự kiện không tồn tại' }, { status: 403 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Calendar DELETE error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
