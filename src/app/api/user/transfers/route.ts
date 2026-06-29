import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  transactionId: z.string().optional(),
  type: z.enum(['TELE_BIRR', 'CBE', 'AWASH_BANK', 'ABYSSINIA_BANK', 'DASHEN_BANK', 'M_PESA']),
  name: z.string().optional(),
  phone: z.string().optional(),
  reason: z.string().optional(),
  img: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  transactionId: z.string().optional(),
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

  const serialized = transfers.map((t) => ({
    ...t,
    amount: Math.abs(Number(t.amount)),
    direction: Number(t.amount) >= 0 ? 'deposit' : 'withdrawal',
  }));

  return NextResponse.json({ transfers: serialized, total, page, pageSize });
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

    const data: any = {
      userId: session.id,
      amount: parsed.data.amount,
      type: parsed.data.type,
    };
    if (parsed.data.transactionId) data.transactionId = parsed.data.transactionId;
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.phone) data.phone = parsed.data.phone;
    if (parsed.data.reason) data.reason = parsed.data.reason;
    if (parsed.data.img) data.img = parsed.data.img;

    const transfer = await prisma.moneyTransfers.create({ data });

    return NextResponse.json({ ...transfer, amount: Number(transfer.amount) }, { status: 201 });
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

    const data: any = {
      amount: parsed.data.amount,
      type: parsed.data.type,
    };
    if (parsed.data.transactionId) data.transactionId = parsed.data.transactionId;
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.phone) data.phone = parsed.data.phone;
    if (parsed.data.reason) data.reason = parsed.data.reason;

    const updated = await prisma.moneyTransfers.update({
      where: { id: parsed.data.id },
      data,
    });

    return NextResponse.json({ ...updated, amount: Number(updated.amount) });
  } catch {
    return NextResponse.json(
      { errors: { form: ['Something went wrong'] } },
      { status: 500 }
    );
  }
}
