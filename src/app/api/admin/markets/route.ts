import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const markets = await prisma.market.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      isLocked: true,
      createdAt: true,
      updatedAt: true,
      match: {
        select: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          kickoffTime: true,
          stage: true,
        },
      },
      outcomes: {
        select: { id: true, name: true, odds: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  return NextResponse.json(markets);
}
