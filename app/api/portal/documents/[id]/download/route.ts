import { NextResponse, NextRequest } from 'next/server';
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getUserFromSession();
  if (!user) return new NextResponse('Unauthorized', { status: 403 });

  const docId = parseInt(resolvedParams.id, 10);
  if (isNaN(docId)) return new NextResponse('Invalid ID', { status: 400 });

  const pool = getDb();
  const permissions = user.permissions || [];
  const roles = user.roles || [];

  try {
    // Kéo thông tin Metadata trước để check quyền tải
    const docRes = await pool.query(`SELECT id, file_name, file_type, allowed_roles FROM documents WHERE id = $1`, [docId]);
    if (docRes.rows.length === 0) return new NextResponse('File Not Found', { status: 404 });
    
    const doc = docRes.rows[0];
    
    // Check Quyền Truy Cập
    if (!permissions.includes('users') && !permissions.includes('docs_manager')) {
       let hasAccess = false;
       for (const role of roles) {
         if (doc.allowed_roles.includes(role)) {
           hasAccess = true;
           break;
         }
       }
       if (!hasAccess) return new NextResponse('Access Denied', { status: 403 });
    }

    // Kéo Binary Data
    const fileRes = await pool.query(`SELECT file_data FROM document_files WHERE document_id = $1`, [docId]);
    if (fileRes.rows.length === 0) return new NextResponse('Binary Not Found', { status: 404 });

    const buffer = fileRes.rows[0].file_data;

    const headers = new Headers();
    // Force browser to download the file by its name instead of rendering inside window
    // Tự động mã hóa tên file URI để tránh lỗi font tiếng Việt
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.file_name)}"`);
    headers.set('Content-Type', doc.file_type || 'application/octet-stream');
    headers.set('Content-Length', buffer.length.toString());

    return new NextResponse(buffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error("Lỗi download file:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
