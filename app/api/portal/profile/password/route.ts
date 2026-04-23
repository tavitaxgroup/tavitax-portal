import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng cung cấp mật khẩu cũ và mới' }, { status: 400 });
    }

    const { rows } = await pool.query("SELECT id FROM admin_users WHERE id = $1 AND password = $2", [user.id, currentPassword]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
    }

    await pool.query("UPDATE admin_users SET password = $1 WHERE id = $2", [newPassword, user.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Change password API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
