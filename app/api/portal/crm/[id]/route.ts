import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const pool = getDb();

async function checkAdminStatus() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;
  if (!token) return false;
  try {
    const user = verifyToken(token);
    return user.permissions?.includes('crm') || user.permissions?.includes('users');
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
