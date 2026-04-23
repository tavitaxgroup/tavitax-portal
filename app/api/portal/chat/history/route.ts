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

    const url = new URL(req.url);
    const peerId = url.searchParams.get('userId');
    const afterDate = url.searchParams.get('after');

    if (!peerId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    // Mark messages from peer to me as READ
    await pool.query(
      `UPDATE chat_messages SET is_read = TRUE 
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [peerId, myId]
    );

    // Fetch messages
    let query = `
      SELECT id, sender_id, receiver_id, content, is_read, created_at, attachment_url, attachment_type, attachment_name, status, message_type, reactions
      FROM chat_messages
      WHERE (sender_id = $1 AND receiver_id = $2) 
         OR (sender_id = $2 AND receiver_id = $1)
    `;
    const params: any[] = [myId, peerId];

    if (afterDate) {
      params.push(afterDate);
      query += ` AND created_at > $3`;
    }

    query += ` ORDER BY created_at ASC LIMIT 100`;

    const { rows } = await pool.query(query, params);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Chat history API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
