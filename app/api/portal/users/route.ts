import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper to check user permission
async function checkAdminStatus() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;
  if (!token) return false;
  try {
    const user = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return user.permissions?.includes('users'); // Explicitly need "users" role
  } catch(e) { return false; }
}

export async function GET() {
  if (!(await checkAdminStatus())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  
  try {
    const { rows } = await pool.query(`SELECT id, username, name, roles, password FROM admin_users ORDER BY id ASC`);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await checkAdminStatus())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { username, password, name, roles } = await request.json();
    if (!username || !password || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const rolesJson = JSON.stringify(roles || []);

    const { rows } = await pool.query(
      `INSERT INTO admin_users (username, password, name, roles) 
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, username, name, roles`,
      [username, password, name, rolesJson]
    );
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
