import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    // Refresh the cookie to live for another 1 hour (3600 seconds)
    cookieStore.set('tavitax-auth', token, {
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
