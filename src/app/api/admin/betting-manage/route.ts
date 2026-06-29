import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    orderBy: { kickoffTime: 'asc' },
    select: {
      id: true,
      apiMatchId: true,
      homeTeam: true,
      awayTeam: true,
      kickoffTime: true,
      stage: true,
      status: true,
      addToBetting: true,
      gameOddsTable: {
        select: { homeTeamOdds: true, awayTeamOdds: true, drawOdds: true },
      },
      marketOdds: {
        select: { id: true, marketKey: true, outcomeName: true, point: true, odds: true, bookmakerKey: true },
        orderBy: [{ marketKey: 'asc' }, { outcomeName: 'asc' }],
      },
      bets: {
        select: {
          id: true,
          typeofBet: true,
          stake: true,
          potentialPayout: true,
          status: true,
          createdAt: true,
          user: {
            select: { id: true, username: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const now = new Date();
  const activeBets = matches.filter((m) => m.addToBetting && new Date(m.kickoffTime) > now);
  const upcomingMatches = matches.filter((m) => new Date(m.kickoffTime) > now);

  return NextResponse.json({ activeBets, upcomingMatches });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { matchIds, addToBetting } = await request.json();

    if (!Array.isArray(matchIds) || typeof addToBetting !== 'boolean') {
      return NextResponse.json({ error: 'matchIds (array) and addToBetting (boolean) required' }, { status: 400 });
    }

    await prisma.match.updateMany({
      where: { id: { in: matchIds } },
      data: { addToBetting },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
