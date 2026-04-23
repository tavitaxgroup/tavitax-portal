import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 });

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const { rows } = await pool.query("SELECT id, name FROM admin_users WHERE username = $1", [email]);

    if (rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: 'Email không tồn tại trong hệ thống' }, { status: 404 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in DB (expires in 10 minutes)
    await pool.query(
      "UPDATE admin_users SET reset_otp = $1, otp_expires = NOW() + INTERVAL '10 minutes' WHERE id = $2",
      [otp, rows[0].id]
    );
    await pool.end();

    // Send Mail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Tavitax System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔑 Mã xác nhận đặt lại mật khẩu Tavitax Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">TAVITAX PORTAL</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #334155;">Xin chào <strong>${rows[0].name}</strong>,</p>
            <p style="font-size: 16px; color: #334155;">Hệ thống vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP dưới đây để tiếp tục:</p>
            
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <span style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${otp}</span>
            </div>
            
            <p style="font-size: 14px; color: #64748b;">Mã này sẽ hết hạn trong vòng 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Email hệ thống tự động, xin vui lòng không phản hồi.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'OTP sent' });
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
