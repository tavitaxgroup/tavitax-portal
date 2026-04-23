import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

async function getUserFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch(e) { return null; }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  // Chỉ Admin hệ thống hoặc Quyền quản lý file mới được phép xóa file
  const roles = user.roles || [];
  if (!roles.includes('users') && !roles.includes('docs_manager')) {
    return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });
  }

  const docId = parseInt(resolvedParams.id, 10);
  if (isNaN(docId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const pool = getDb();
  try {
    // Delete target. Postgres ON DELETE CASCADE should clean up the 'document_files' table automatically.
    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi xóa document:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
