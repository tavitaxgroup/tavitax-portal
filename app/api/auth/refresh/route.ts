import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    // Giải mã và xác minh token hiện tại
    let userData: any;
    try {
      userData = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      // Hỗ trợ token base64 cũ (giai đoạn chuyển đổi)
      try {
        userData = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Loại bỏ các trường JWT metadata (iat, exp) trước khi ký lại
    const { iat, exp, ...cleanData } = userData;

    // Ký lại token mới với thời hạn 1 giờ
    const newToken = jwt.sign(cleanData, JWT_SECRET, { expiresIn: 3600 });

    cookieStore.set('tavitax-auth', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 // 1 hour
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to refresh session", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
