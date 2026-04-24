import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getUserFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch(e) { return null; }
}

export async function GET() {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const roles = user.roles || [];
  const pool = getDb();

  try {
    let query = '';
    let params: any[] = [];

    // Người dùng là Admin Portal hoặc Admin Kho Tài Liệu được xem tất cả
    if (roles.includes('users') || roles.includes('docs_manager')) {
      query = 'SELECT id, title, file_name, file_size, file_type, category, allowed_roles, uploaded_by, created_at FROM documents ORDER BY created_at DESC';
    } else {
      // Chỉ cho phép xem nếu mảng roles của user giao nhau với allowed_roles của document
      if (roles.length === 0) {
        return NextResponse.json([]);
      }
      query = 'SELECT id, title, file_name, file_size, file_type, category, allowed_roles, uploaded_by, created_at FROM documents WHERE allowed_roles ?| $1::text[] ORDER BY created_at DESC';
      params = [roles];
    }

    const { rows } = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Lỗi get documents:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  // Chỉ cho phép upload nếu có quyền docs_manager hoặc users
  const roles = user.roles || [];
  if (!roles.includes('docs_manager') && !roles.includes('users')) {
    return NextResponse.json({ error: 'Bạn không có quyền upload tài liệu' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const allowedRolesRaw = formData.get('allowed_roles') as string;

    if (!file || !title || !category) {
      return NextResponse.json({ error: 'Vui lòng nhập đủ thông tin' }, { status: 400 });
    }

    let allowedRoles = [];
    try {
      allowedRoles = JSON.parse(allowedRolesRaw || '[]');
    } catch(e) {}

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Giới hạn max 20MB
    if (buffer.length > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Bản ghi không được vượt quá 20MB' }, { status: 400 });
    }

    const pool = getDb();
    
    // Khởi tạo Transaction bằng tay
    const client = await pool.connect();
    let docId = null;
    
    try {
      await client.query('BEGIN');
      
      const insertDocRes = await client.query(
        `INSERT INTO documents (title, file_name, file_size, file_type, category, allowed_roles, uploaded_by) 
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING id`,
        [title, file.name, buffer.length, file.type, category, JSON.stringify(allowedRoles), user.name]
      );
      
      docId = insertDocRes.rows[0].id;
      
      await client.query(
        `INSERT INTO document_files (document_id, file_data) VALUES ($1, $2)`,
        [docId, buffer]
      );
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, id: docId });

  } catch (error) {
    console.error("Lỗi upload file:", error);
    return NextResponse.json({ error: 'Lỗi tải tệp lên' }, { status: 500 });
  }
}
