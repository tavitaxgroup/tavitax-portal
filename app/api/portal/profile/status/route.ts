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

    const user = verifyToken(token);
    const { status } = await req.json();

    if (!['ONLINE', 'BUSY', 'AWAY'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await pool.query("UPDATE admin_users SET status = $1 WHERE id = $2", [status, user.id]);

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("Status update API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    const { rows } = await pool.query("SELECT status FROM admin_users WHERE id = $1", [user.id]);

    return NextResponse.json({ success: true, status: rows[0]?.status || 'ONLINE' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
