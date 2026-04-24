import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 });
    }

    const pool = getDb();
    const { rows } = await pool.query(
      `SELECT id FROM admin_users 
       WHERE username = $1 
         AND reset_otp = $2 
         AND otp_expires > NOW()`,
      [email, otp]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Mã xác nhận không đúng hoặc đã hết hạn' }, { status: 400 });
    }

    // Hash mật khẩu mới trước khi lưu
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password, clear OTP
    await pool.query(
      "UPDATE admin_users SET password = $1, reset_otp = NULL, otp_expires = NULL WHERE id = $2",
      [hashedPassword, rows[0].id]
    );
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Reset password API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
