import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['TELE_BIRR', 'CBE', 'AWASH_BANK', 'ABYSSINIA_BANK', 'DASHEN_BANK', 'M_PESA']),
  name: z.string().min(1, 'Account holder name is required'),
  phone: z.string().optional(),
  accountNumber: z.string().optional(),
  reason: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const withdrawals = await prisma.moneyTransfers.findMany({
    where: { userId: session.id, amount: { lt: 0 } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const serialized = withdrawals.map((w) => ({ ...w, amount: Math.abs(Number(w.amount)) }));
  return NextResponse.json(serialized);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = withdrawSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { amount, type, name, phone, accountNumber, reason } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { balance: true },
    });

    if (!user || Number(user.balance) < amount) {
      return NextResponse.json({ errors: { form: ['Insufficient balance'] } }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.id },
        data: { balance: { decrement: amount } },
      });

      const withdrawal = await tx.moneyTransfers.create({
        data: {
          userId: session.id,
          amount: -amount,
          type,
          name,
          phone,
          transactionId: accountNumber || undefined,
          reason: `WITHDRAWAL: ${reason || 'Withdrawal request'}`,
          status: 'PENDING',
        },
      });

      return withdrawal;
    });

    return NextResponse.json({ ...result, amount: Math.abs(Number(result.amount)) }, { status: 201 });
  } catch {
    return NextResponse.json({ errors: { form: ['Something went wrong'] } }, { status: 500 });
  }
}
