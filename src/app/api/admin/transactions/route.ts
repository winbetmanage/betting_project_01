import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

  const [transfers, total] = await Promise.all([
    prisma.moneyTransfers.findMany({
      include: { user: { select: { username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.moneyTransfers.count(),
  ]);

  const pendingCount = await prisma.moneyTransfers.count({ where: { status: 'PENDING' } });

  return NextResponse.json({ transfers, total, page, pageSize, pendingCount });
}

const updateSchema = z.object({
  id: z.string().min(1),
  amount: z.number().positive(),
  transactionId: z.string().min(1),
  type: z.enum(['TELE_BIRR', 'CBE', 'AWASH_BANK', 'ABYSSINIA_BANK', 'DASHEN_BANK', 'M_PESA']),
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  img: z.string().optional().nullable(),
});

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'approve') {
      const { id } = data as { id: string };
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const transfer = await prisma.moneyTransfers.findUnique({ where: { id } });
      if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (transfer.status !== 'PENDING') {
        return NextResponse.json({ error: 'Transfer is not pending' }, { status: 400 });
      }

      // Withdrawal (negative amount): just mark approved, balance already deducted
      if (Number(transfer.amount) < 0) {
        const updated = await prisma.moneyTransfers.update({
          where: { id },
          data: { status: 'APPROVED' },
        });
        return NextResponse.json(updated);
      }

      // Deposit (positive amount): add to balance
      const [updated] = await prisma.$transaction([
        prisma.moneyTransfers.update({
          where: { id },
          data: { status: 'APPROVED' },
        }),
        prisma.user.update({
          where: { id: transfer.userId },
          data: { balance: { increment: transfer.amount } },
        }),
      ]);

      // Referral bonus logic (outside main transaction — failure won't block approval)
      try {
        const depositingUser = await prisma.user.findUnique({
          where: { id: transfer.userId },
          select: { referrer: true, referral_sent: true, username: true },
        });

        if (depositingUser) {
          if (depositingUser.referral_sent) {
            // Already rewarded — nothing to do
          } else if (Number(transfer.amount) < 20) {
            // Below threshold — don't touch referral_sent
          } else {
            // Amount >= 20 and referral_sent is false
            if (!depositingUser.referrer) {
              // No referrer — just mark referral_sent so it's not checked again
              await prisma.user.update({
                where: { id: transfer.userId },
                data: { referral_sent: true },
              });
            } else {
              // Has a referrer username — look up the user and reward
              const referrerUser = await prisma.user.findFirst({
                where: { username: depositingUser.referrer },
              });

              if (referrerUser) {
                const referralSetting = await prisma.setting.findUnique({
                  where: { key: 'referral_link_gift_value' },
                });

                if (referralSetting) {
                  const bonusValue = Number((referralSetting.value as { value?: number }).value ?? 0);
                  if (bonusValue > 0) {
                    await prisma.$transaction([
                      prisma.user.update({
                        where: { id: referrerUser.id },
                        data: { balance: { increment: bonusValue } },
                      }),
                      prisma.moneyTransfers.create({
                        data: {
                          userId: referrerUser.id,
                          amount: bonusValue,
                          type: 'TELE_BIRR',
                          status: 'APPROVED',
                          reason: `Referral bonus from ${depositingUser.username}`,
                        },
                      }),
                    ]);
                  }
                }
              }

              await prisma.user.update({
                where: { id: transfer.userId },
                data: { referral_sent: true },
              });
            }
          }
        }
      } catch {
        // Referral bonus failed — deposit still went through
      }

      return NextResponse.json(updated);
    }

    if (action === 'reject') {
      const { id } = data as { id: string };
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const transfer = await prisma.moneyTransfers.findUnique({ where: { id } });
      if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (transfer.status !== 'PENDING') {
        return NextResponse.json({ error: 'Transfer is not pending' }, { status: 400 });
      }

      // Withdrawal rejection: refund the balance
      if (Number(transfer.amount) < 0) {
        await prisma.$transaction([
          prisma.moneyTransfers.update({
            where: { id },
            data: { status: 'REJECTED' },
          }),
          prisma.user.update({
            where: { id: transfer.userId },
            data: { balance: { decrement: transfer.amount } }, // decrement a negative = increment
          }),
        ]);
      } else {
        // Deposit rejection: just mark rejected (no balance added yet)
        await prisma.moneyTransfers.update({
          where: { id },
          data: { status: 'REJECTED' },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'edit') {
      const parsed = updateSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
      }

      const existing = await prisma.moneyTransfers.findUnique({
        where: { id: parsed.data.id },
      });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const updated = await prisma.moneyTransfers.update({
        where: { id: parsed.data.id },
        data: {
          amount: parsed.data.amount,
          transactionId: parsed.data.transactionId,
          type: parsed.data.type,
          name: parsed.data.name,
          phone: parsed.data.phone,
          reason: parsed.data.reason,
          img: parsed.data.img,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
