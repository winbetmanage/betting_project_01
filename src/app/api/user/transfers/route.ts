import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  type: z.enum(['TELE_BIRR', 'CBE', 'AWASH_BANK', 'ABYSSINIA_BANK', 'DASHEN_BANK', 'M_PESA']),
  name: z.string().optional(),
  phone: z.string().optional(),
  reason: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  type: z.enum(['TELE_BIRR', 'CBE', 'AWASH_BANK', 'ABYSSINIA_BANK', 'DASHEN_BANK', 'M_PESA']),
  name: z.string().optional(),
  phone: z.string().optional(),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '15')));

  const [transfers, total] = await Promise.all([
    prisma.moneyTransfers.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.moneyTransfers.count({ where: { userId: session.id } }),
  ]);

  return NextResponse.json({ transfers, total, page, pageSize });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 400 });
    }

    const transfer = await prisma.moneyTransfers.create({
      data: {
        userId: session.id,
        amount: parsed.data.amount,
        transactionId: parsed.data.transactionId,
        type: parsed.data.type,
        name: parsed.data.name,
        phone: parsed.data.phone,
        reason: parsed.data.reason,
      },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch {
    return NextResponse.json(
      { errors: { form: ['Something went wrong'] } },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 400 });
    }

    const existing = await prisma.moneyTransfers.findUnique({
      where: { id: parsed.data.id },
    });

    if (!existing || existing.userId !== session.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { errors: { form: ['Can only edit pending transfers'] } },
        { status: 403 }
      );
    }

    const updated = await prisma.moneyTransfers.update({
      where: { id: parsed.data.id },
      data: {
        amount: parsed.data.amount,
        transactionId: parsed.data.transactionId,
        type: parsed.data.type,
        name: parsed.data.name,
        phone: parsed.data.phone,
        reason: parsed.data.reason,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { errors: { form: ['Something went wrong'] } },
      { status: 500 }
    );
  }
}
