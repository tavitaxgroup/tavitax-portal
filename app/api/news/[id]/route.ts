import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const pool = getDb();
    const resolvedParams = await Promise.resolve(params);
    const parts = resolvedParams.id.split('-');
    const numericId = parseInt(parts[parts.length - 1], 10);
    if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const result = await pool.query('SELECT * FROM articles WHERE id = $1', [numericId]);
    
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { title, excerpt, content, imageUrl } = body;
    const pool = getDb();
    const resolvedParams = await Promise.resolve(params);
    const parts = resolvedParams.id.split('-');
    const numericId = parseInt(parts[parts.length - 1], 10);
    if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await pool.query(
      `UPDATE articles SET title = $1, excerpt = $2, content = $3, image_url = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
      [title, excerpt, content, imageUrl, numericId]
    );
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const pool = getDb();
    const resolvedParams = await Promise.resolve(params);
    const parts = resolvedParams.id.split('-');
    const numericId = parseInt(parts[parts.length - 1], 10);
    if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await pool.query('DELETE FROM articles WHERE id = $1', [numericId]);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
