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
    return user.permissions?.includes('crm') || user.permissions?.includes('users'); // allow admin or crm
  } catch(e) { return false; }
}

export async function GET() {
  if (!(await checkAdminStatus())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  
  try {
    const { rows } = await pool.query(`SELECT * FROM crm_leads ORDER BY created_at DESC`);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
