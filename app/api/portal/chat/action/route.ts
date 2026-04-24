import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const pool = getDb();

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = verifyToken(token);
    const myId = userToken.id;

    const body = await req.json();
    const { messageId, action, payload } = body; // action is 'REVOKE' or 'REACT'

    if (!messageId || !action) {
      return NextResponse.json({ error: 'Data invalid' }, { status: 400 });
    }

    if (action === 'REVOKE') {
      // User can only revoke THEIR OWN active messages
      const { rowCount } = await pool.query(
        `UPDATE chat_messages SET status = 'REVOKED' WHERE id = $1 AND sender_id = $2`,
        [messageId, myId]
      );
      if (rowCount === 0) return NextResponse.json({ error: 'Không thể thu hồi' }, { status: 403 });
      return NextResponse.json({ success: true, action: 'REVOKE' });
    }

    if (action === 'REACT') {
      // User can react to any message they can see (sender or receiver)
      // Extract current reactions
      const { rows } = await pool.query(
        `SELECT reactions FROM chat_messages WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)`,
        [messageId, myId]
      );
      if (rows.length === 0) return NextResponse.json({ error: 'Tin nhắn không tồn tại' }, { status: 404 });
      
      let reactions = rows[0].reactions || {};
      
      // Simple toggle logic on emojis
      if (!payload) return NextResponse.json({ error: 'Missing payload for react' }, { status: 400 });
      
      // Increment or set. In 1-1, just set is fine.
      reactions[payload] = (reactions[payload] || 0) + 1;

      await pool.query(
        `UPDATE chat_messages SET reactions = $1::jsonb WHERE id = $2`,
        [JSON.stringify(reactions), messageId]
      );
      return NextResponse.json({ success: true, reactions });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error("Chat action API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
