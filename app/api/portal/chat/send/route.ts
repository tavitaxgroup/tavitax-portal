import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const myId = userToken.id;

    const body = await req.json();
    const { receiver_id, content, attachment_url, attachment_type, attachment_name } = body;

    // Content can be empty if an attachment exists
    if (!receiver_id || (!content?.trim() && !attachment_url)) {
      return NextResponse.json({ error: 'Data invalid' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO chat_messages (sender_id, receiver_id, content, attachment_url, attachment_type, attachment_name) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [myId, receiver_id, content || '', attachment_url || null, attachment_type || null, attachment_name || null]
    );

    return NextResponse.json({ success: true, message: rows[0] });
  } catch (error: any) {
    console.error("Send message API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
