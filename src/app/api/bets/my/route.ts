import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bets = await prisma.bet.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      matchId: true,
      typeofBet: true,
      stake: true,
      potentialPayout: true,
      cumulativeOdds: true,
      status: true,
      createdAt: true,
      match: {
        select: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          kickoffTime: true,
        },
      },
      selections: {
        select: {
          id: true,
          matchId: true,
          typeofBet: true,
          oddsAtBet: true,
          status: true,
          match: {
            select: { homeTeam: true, awayTeam: true, kickoffTime: true },
          },
        },
      },
    },
  });

  return NextResponse.json(bets);
}
