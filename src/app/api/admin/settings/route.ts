import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await prisma.setting.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(settings);
}

const upsertSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.number().or(z.string()).or(z.boolean()),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'COLOR', 'JSON']).optional(),
  label: z.string().optional(),
  group: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { key, value, type, label, group } = parsed.data;
    const resolvedType = type || (typeof value === 'number' ? 'NUMBER' : typeof value === 'boolean' ? 'BOOLEAN' : 'STRING');

    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value: { value: value },
        type: resolvedType as any,
        label: label || undefined,
        group: group || undefined,
      },
      create: {
        key,
        value: { value: value },
        type: resolvedType as any,
        label: label || undefined,
        group: group || undefined,
      },
    });

    return NextResponse.json(setting, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param required' }, { status: 400 });
    }

    await prisma.setting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
