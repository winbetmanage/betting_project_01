import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchSportmonksOdds, normalizeSportmonksOdds } from '@/lib/new_odds_api';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SPORTMONKS_API_KEY) {
    return NextResponse.json({ error: 'SPORTMONKS_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { matchId } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, apiMatchId: true, homeTeam: true, awayTeam: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (!match.apiMatchId || match.apiMatchId === 0) {
      return NextResponse.json({ error: 'Match has no apiMatchId' }, { status: 400 });
    }

    const raw = await fetchSportmonksOdds(match.apiMatchId);
    const normalized = normalizeSportmonksOdds(raw, match.apiMatchId, match.homeTeam, match.awayTeam);

    let oddsInserted = 0;
    for (const market of normalized.markets) {
      for (const outcome of market.outcomes) {
        await prisma.marketOdds.deleteMany({
          where: {
            gameId: match.id,
            marketKey: market.marketKey,
            outcomeName: outcome.name,
            point: outcome.point ?? undefined,
          },
        });

        await prisma.marketOdds.create({
          data: {
            gameId: match.id,
            marketKey: market.marketKey,
            outcomeName: outcome.name,
            point: outcome.point,
            odds: outcome.price,
            bookmakerKey: market.bookmaker,
          },
        });
        oddsInserted++;
      }
    }

    return NextResponse.json({ success: true, marketsFetched: normalized.markets.length, oddsInserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch odds' }, { status: 500 });
  }
}
