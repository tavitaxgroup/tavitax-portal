import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth');
  return !!token;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, permissions } = body;

    // validation
    if (!name) return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 });

    const perms = Array.isArray(permissions) ? permissions : [];
    
    // Check if role exists
    const check = await pool.query('SELECT id FROM admin_roles WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy nhóm quyền này' }, { status: 404 });
    }

    const { rows } = await pool.query(
      `UPDATE admin_roles SET name = $1, permissions = $2::jsonb WHERE id = $3 RETURNING *`,
      [name, JSON.stringify(perms), id]
    );

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("PUT role error:", error);
    if (error.code === '23505') { // UNIQUE violation
      return NextResponse.json({ error: 'Tên nhóm quyền đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    
    // We should probably check if it's being used by any users. 
    // For now, let's just delete it. In a real system, we might want to restrict this or trigger a cascade update on users.
    await pool.query('DELETE FROM admin_roles WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE role error:", error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
