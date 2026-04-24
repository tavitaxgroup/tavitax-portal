import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const pool = getDb();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = verifyToken(token);
    const myId = userToken.id;

    const { rows } = await pool.query(
      `SELECT COUNT(*) as unread_total FROM chat_messages 
       WHERE receiver_id = $1 AND is_read = FALSE`,
      [myId]
    );

    return NextResponse.json({ unread: parseInt(rows[0].unread_total) });
  } catch (error: any) {
    console.error("Chat unread API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
