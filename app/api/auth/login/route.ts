import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Find user in DB
    const { rows } = await pool.query(
      `SELECT id, username, password, name, roles FROM admin_users WHERE username = $1 AND password = $2`, 
      [username, password]
    );
    
    const user = rows[0];
    
    if (!user) {
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
    
    // Create base64 encoded user info as token for simplicity
    const token = Buffer.from(JSON.stringify(userData)).toString('base64');
    
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
