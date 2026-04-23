import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAdminStatus() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;
  if (!token) return false;
  try {
    const user = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return user.roles?.includes('crm') || user.roles?.includes('users');
  } catch(e) { return false; }
}

export async function PUT(request: Request, context: any) {
  const { id } = await context.params;
  
  if (!(await checkAdminStatus())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { status, notes } = await request.json();

    const { rows } = await pool.query(
      `UPDATE crm_leads 
       SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes, id]
    );
    
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
