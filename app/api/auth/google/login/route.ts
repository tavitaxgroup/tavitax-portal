import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ 
      error: 'Chưa cấu hình Google Client ID hoặc Client Secret trong file .env.local. Vui lòng liên hệ Admin để cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET.' 
    }, { status: 500 });
  }

  // Tự động nhận diện host/origin động để sinh redirect_uri
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'select_account' // Luôn hiển thị danh sách để chọn tài khoản Gmail
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Lỗi Google OAuth Login:", error);
    return NextResponse.json({ error: 'Không thể khởi tạo phiên đăng nhập Google' }, { status: 500 });
  }
}
