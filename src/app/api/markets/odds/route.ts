import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/markets/odds?matchId=<id>
 * Returns all MarketOdds rows for a given match, grouped by marketKey.
 *
 * GET /api/markets/odds
 * Returns MarketOdds for all matches where addToBetting === true and kickoffTime in the future.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  if (matchId) {
    const odds = await prisma.marketOdds.findMany({
      where: { gameId: matchId },
      orderBy: [{ marketKey: 'asc' }, { outcomeName: 'asc' }],
    });
    return NextResponse.json(odds);
  }

  // Return all active match odds
  const now = new Date();
  const activeMatches = await prisma.match.findMany({
    where: {
      addToBetting: true,
      kickoffTime: { gt: now },
    },
    select: { id: true },
  });

  const activeIds = activeMatches.map((m) => m.id);

  const odds = await prisma.marketOdds.findMany({
    where: { gameId: { in: activeIds } },
    orderBy: [{ gameId: 'asc' }, { marketKey: 'asc' }, { outcomeName: 'asc' }],
  });

  return NextResponse.json(odds);
}
