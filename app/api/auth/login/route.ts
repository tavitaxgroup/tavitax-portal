import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pool = getDb();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Find user in DB (chỉ tìm theo username, không so sánh password trong SQL nữa)
    const { rows } = await pool.query(
      `SELECT id, username, password, name, roles FROM admin_users WHERE username = $1`, 
      [username]
    );
    
    const user = rows[0];
    
    if (!user) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không đúng' }, { status: 401 });
    }

    // So sánh mật khẩu: hỗ trợ cả bcrypt hash và plain text (cho giai đoạn chuyển đổi)
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
    let passwordMatch = false;
    
    if (isHashed) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Giai đoạn chuyển đổi: so sánh plain text rồi tự động hash luôn
      passwordMatch = (password === user.password);
      if (passwordMatch) {
        // Auto-migrate: hash mật khẩu plain text thành bcrypt
        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query(`UPDATE admin_users SET password = $1 WHERE id = $2`, [hashedPassword, user.id]);
        console.log(`[Auth] Auto-migrated password for user ${user.username}`);
      }
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không đúng' }, { status: 401 });
    }

    // roles is an array of UUIDs: ["uuid1", "uuid2"]
    let permissions: string[] = [];
    if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      // Fetch permissions for these roles
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
    
    // Omit password
    const { password: _, ...userData } = user;
    
    // Inject unified permissions
    userData.permissions = permissions;
    
    // Tạo JWT token có chữ ký bảo mật (thay vì base64 thuần)
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: 3600 });
    
    // Ensure we're setting it on the Next.js cookies manager
    try {
      const cookieStore = await cookies();
      cookieStore.set('tavitax-auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 // 1 hour
      });
    } catch (e) {
      console.error("Error setting cookie via next/headers", e);
    }

    return NextResponse.json({ success: true, user: userData });
  } catch (error) {
    console.error("Login err", error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
