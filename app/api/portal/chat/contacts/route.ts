import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const myId = userToken.id;

    // Load available users with the most recent message between them and 'me'
    const { rows } = await pool.query(
      `WITH LastMessages AS (
        SELECT 
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as contact_id,
          MAX(created_at) as last_time
        FROM chat_messages
        WHERE sender_id = $1 OR receiver_id = $1
        GROUP BY 1
      ),
      unread_counts AS (
        SELECT sender_id as contact_id, COUNT(*) as unread
        FROM chat_messages
        WHERE receiver_id = $1 AND is_read = FALSE
        GROUP BY 1
      )
      SELECT 
        u.id, u.name, u.username, u.avatar_url, u.status, u.job_title,
        lm.last_time,
        uc.unread,
        m.content as last_message_content,
        m.sender_id as last_message_sender_id
      FROM admin_users u
      LEFT JOIN LastMessages lm ON u.id = lm.contact_id
      LEFT JOIN unread_counts uc ON u.id = uc.contact_id
      LEFT JOIN chat_messages m ON (
        (m.sender_id = $1 AND m.receiver_id = u.id) OR (m.sender_id = u.id AND m.receiver_id = $1)
      ) AND m.created_at = lm.last_time
      WHERE u.id != $1
      ORDER BY 
        lm.last_time DESC NULLS LAST, 
        CASE WHEN u.status = 'ONLINE' THEN 1 WHEN u.status = 'BUSY' THEN 2 ELSE 3 END ASC,
        u.name ASC`,
      [myId]
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Chat contacts API error:", error);
    return NextResponse.json({ error: 'Lỗi lấy danh bạ' }, { status: 500 });
  }
}
