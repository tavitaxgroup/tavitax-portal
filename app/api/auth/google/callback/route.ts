import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';
import crypto from 'crypto';

const pool = getDb();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Mã xác thực Google không hợp lệ' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Chưa cấu hình Google Client Credentials' }, { status: 500 });
  }

  // Tự động nhận diện host động tương ứng với môi trường đang chạy
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // 1. Đổi code lấy token từ Google
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 2. Lấy thông tin cá nhân từ Google API
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile || !profile.email) {
      return NextResponse.json({ error: 'Không thể lấy thông tin email từ Google' }, { status: 400 });
    }

    const email = profile.email.toLowerCase();
    const name = profile.name || email.split('@')[0];
    const avatarUrl = profile.picture || null;

    // 3. Tìm tài khoản trong database
    let { rows } = await pool.query(
      `SELECT id, username, name, roles, avatar_url FROM admin_users WHERE username = $1`,
      [email]
    );

    let user = rows[0];

    // 4. Nếu chưa tồn tại, tự động tạo tài khoản mới với danh sách quyền/vai trò trống
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const insertResult = await pool.query(
        `INSERT INTO admin_users (username, name, password, roles, avatar_url, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, name, roles, avatar_url`,
        [email, name, randomPassword, JSON.stringify([]), avatarUrl, 'ONLINE']
      );
      user = insertResult.rows[0];
      console.log(`[Google Auth] Đã tạo tự động tài khoản mới cho: ${email}`);
    } else {
      // Cập nhật avatar hoặc tên mới từ Google nếu có thay đổi
      await pool.query(
        `UPDATE admin_users SET avatar_url = $1, name = $2 WHERE id = $3`,
        [avatarUrl || user.avatar_url, name, user.id]
      );
      user.avatar_url = avatarUrl || user.avatar_url;
      user.name = name;
    }

    // 5. Tìm nạp tất cả các permissions tương ứng với các roles của user
    let permissions: string[] = [];
    if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      const rolesResult = await pool.query(
        `SELECT permissions FROM admin_roles WHERE id::text = ANY($1::text[])`,
        [user.roles]
      );
      
      const permSet = new Set<string>();
      rolesResult.rows.forEach(r => {
        if (Array.isArray(r.permissions)) {
          r.permissions.forEach((p: string) => permSet.add(p));
        }
      });
      permissions = Array.from(permSet);
    }

    // 6. Chuẩn bị payload và ký JWT token bảo mật
    const userData = {
      id: user.id,
      username: user.username,
      name: user.name,
      roles: user.roles,
      avatar_url: user.avatar_url,
      permissions: permissions
    };

    const token = signToken(userData);

    // 7. Thiết lập cookie bảo mật tavitax-auth
    const cookieStore = await cookies();
    cookieStore.set('tavitax-auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8 // Phiên đăng nhập kéo dài 8 tiếng
    });

    // 8. Chuyển hướng người dùng về trang chủ portal
    const response = NextResponse.redirect(`${protocol}://${host}/`);
    return response;
  } catch (error: any) {
    console.error("Lỗi Google Callback API:", error);
    return NextResponse.json({ error: 'Xác thực Google thất bại' }, { status: 500 });
  }
}
