import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request, context: any) {
  try {
    const { id } = await context.params;

    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    
    // Resolve 'me' ID
    const targetId = id === 'me' ? userToken.id : parseInt(id, 10);

    if (isNaN(targetId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT 
        u.id, u.name, u.username, u.status, u.phone, u.department, u.job_title, 
        u.bio, u.avatar_url, u.created_at, u.reports_to,
        mgr.name as manager_name, mgr.job_title as manager_title
       FROM admin_users u
       LEFT JOIN admin_users mgr ON u.reports_to = mgr.id
       WHERE u.id = $1`,
      [targetId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: rows[0] });

  } catch (error: any) {
    console.error("Get user profile API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

// Update profile details
export async function POST(req: Request, context: any) {
  try {
    const { id } = await context.params;

    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const targetId = id === 'me' ? userToken.id : parseInt(id, 10);

    // Only allow updating own profile for now unless user is Admin
    if (targetId !== userToken.id && !userToken.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { phone, department, job_title, bio, reports_to } = body;

    await pool.query(
      `UPDATE admin_users 
       SET phone = COALESCE($1, phone), 
           department = COALESCE($2, department), 
           job_title = COALESCE($3, job_title), 
           bio = COALESCE($4, bio),
           reports_to = $5
       WHERE id = $6`,
      [phone, department, job_title, bio, reports_to !== undefined ? reports_to : null, targetId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update profile API error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
