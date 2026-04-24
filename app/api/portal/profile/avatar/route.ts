import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    // Validate size (max 2MB for Base64 DB storage)
    if (buffer.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Vui lòng chọn ảnh dưới 2MB' }, { status: 400 });
    }

    // Since Vercel is Read-Only, we convert the image to Base64 and store it in the database
    const mimeType = file.type || 'image/png';
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    // Update DB
    await pool.query('UPDATE admin_users SET avatar_url = $1 WHERE id = $2', [dataUri, userToken.id]);

    return NextResponse.json({ success: true, avatar_url: dataUri });

  } catch (error: any) {
    console.error("Upload avatar error:", error);
    return NextResponse.json({ error: `Lỗi máy chủ: ${error.message || 'Không xác định'}` }, { status: 500 });
  }
}
