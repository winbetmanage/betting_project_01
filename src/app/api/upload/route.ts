import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'png';
    const timestamp = Date.now();
    const filename = `transfers/${session.id}/${timestamp}.${ext}`;

    // In production (Vercel), use Vercel Blob. Locally, write to public/uploads/.
    if (process.env.VERCEL === '1' && process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(filename, file, { access: 'public' });
      return NextResponse.json({ url: blob.url });
    }

    const localDir = join(process.cwd(), 'public', 'uploads', 'transfers', session.id);
    await mkdir(localDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(join(localDir, `${timestamp}.${ext}`), Buffer.from(bytes));
    return NextResponse.json({ url: `/uploads/transfers/${session.id}/${timestamp}.${ext}` });
  } catch (e: any) {
    return NextResponse.json({ error: 'Upload failed', detail: e?.message ?? String(e) }, { status: 500 });
  }
}
