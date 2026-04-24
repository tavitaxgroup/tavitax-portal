import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const pool = getDb();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let user: any;
    try {
      user = jwt.verify(token, JWT_SECRET);
    } catch {
      try { user = JSON.parse(Buffer.from(token, 'base64').toString('utf8')); } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng cung cấp mật khẩu cũ và mới' }, { status: 400 });
    }

    // Lấy mật khẩu hiện tại từ DB
    const { rows } = await pool.query("SELECT password FROM admin_users WHERE id = $1", [user.id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    const storedPassword = rows[0].password;
    const isHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$');

    // Kiểm tra mật khẩu hiện tại
    let passwordMatch = false;
    if (isHashed) {
      passwordMatch = await bcrypt.compare(currentPassword, storedPassword);
    } else {
      passwordMatch = (currentPassword === storedPassword);
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
    }

    // Hash mật khẩu mới và lưu vào DB
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE admin_users SET password = $1 WHERE id = $2", [hashedNewPassword, user.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Change password API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
