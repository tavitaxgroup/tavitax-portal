import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const pool = getDb();

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = verifyToken(token);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate size (max 15MB)
    if (buffer.length > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'Kích thước file không được vượt quá 15MB' }, { status: 400 });
    }

    // Prepare upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {}

    // Save with unique name
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `avatar-${userToken.id}-${Date.now()}.${ext}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    const publicUrl = `/uploads/avatars/${fileName}`;

    // Update DB
    await pool.query('UPDATE admin_users SET avatar_url = $1 WHERE id = $2', [publicUrl, userToken.id]);

    return NextResponse.json({ success: true, avatar_url: publicUrl });

  } catch (error: any) {
    console.error("Upload avatar error:", error);
    return NextResponse.json({ error: `Lỗi máy chủ: ${error.message || 'Không xác định'}` }, { status: 500 });
  }
}
