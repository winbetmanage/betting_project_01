import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const now = new Date();

  const matches = await prisma.match.findMany({
    where: {
      addToBetting: true,
      kickoffTime: { gt: now },
    },
    orderBy: { kickoffTime: 'asc' },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      kickoffTime: true,
      stage: true,
      status: true,
      gameOddsTable: {
        select: { homeTeamOdds: true, awayTeamOdds: true, drawOdds: true },
      },
    },
  });

  return NextResponse.json(matches);
}
