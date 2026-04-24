import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { verifyToken } from '@/lib/auth';

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
      return NextResponse.json({ error: 'File vượt quá 15MB' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {}

    const originalName = file.name;
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `chat-${userToken.id}-${Date.now()}-${safeName}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    const publicUrl = `/uploads/chat/${fileName}`;

    // Determine type rough
    let type = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    if (file.type.startsWith('video/')) type = 'video';

    return NextResponse.json({ success: true, url: publicUrl, name: originalName, type });
  } catch (error: any) {
    console.error("Chat upload error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
