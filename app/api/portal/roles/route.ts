import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth');
  return !!token;
}

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await pool.query('SELECT * FROM admin_roles ORDER BY created_at DESC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET roles error:", error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, permissions } = body;

    // validation
    if (!name) return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 });

    const perms = Array.isArray(permissions) ? permissions : [];
    
    const { rows } = await pool.query(
      `INSERT INTO admin_roles (name, permissions) VALUES ($1, $2::jsonb) RETURNING *`,
      [name, JSON.stringify(perms)]
    );

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("POST role error:", error);
    if (error.code === '23505') { // UNIQUE violation
      return NextResponse.json({ error: 'Tên nhóm quyền đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
