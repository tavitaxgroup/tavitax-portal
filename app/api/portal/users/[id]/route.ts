import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const pool = getDb();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;
  if (!token) return null;
  try {
    const user: any = jwt.verify(token, JWT_SECRET);
    return user.permissions?.includes('users') ? user : null;
  } catch {
    try {
      const user = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      return user.permissions?.includes('users') ? user : null;
    } catch { return null; }
  }
}

export async function PUT(request: Request, context: any) {
  const { id } = await context.params;
  
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { username, password, name, roles } = await request.json();
    const rolesJson = JSON.stringify(roles || []);

    let rows;
    if (password) {
      // Nếu có thay đổi mật khẩu → hash mật khẩu mới
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await pool.query(
        `UPDATE admin_users 
         SET username = $1, password = $2, name = $3, roles = $4::jsonb
         WHERE id = $5
         RETURNING id, username, name, roles`,
        [username, hashedPassword, name, rolesJson, id]
      );
      rows = result.rows;
    } else {
      // Không đổi mật khẩu → chỉ cập nhật các trường khác
      const result = await pool.query(
        `UPDATE admin_users 
         SET username = $1, name = $2, roles = $3::jsonb
         WHERE id = $4
         RETURNING id, username, name, roles`,
        [username, name, rolesJson, id]
      );
      rows = result.rows;
    }
    
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updatedUser = rows[0];

    // If the admin is editing themselves, update the session cookie
    if (adminUser.id === updatedUser.id) {
      const cookieStore = await cookies();
      const newToken = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: 3600 });
      cookieStore.set('tavitax-auth', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 // 1 hour
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  const { id } = await context.params;
  
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { rowCount } = await pool.query(`DELETE FROM admin_users WHERE id = $1`, [id]);
    if (rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
