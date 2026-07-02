import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { FetchGameScores } from '@/lib/api_links';
import { findOddsEventId } from '@/lib/odds-helper';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { matchId } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const eventId = match.apiEventId || findOddsEventId(match.homeTeam, match.awayTeam);
    if (!eventId) {
      return NextResponse.json({ error: 'No API event ID found for this match' }, { status: 404 });
    }

    const url = FetchGameScores(eventId);
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Odds API returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const game = Array.isArray(data)
      ? data.find((g: any) => g.home_team === match.homeTeam && g.away_team === match.awayTeam)
      : null;

    if (!game) {
      return NextResponse.json({ error: 'Match not found in Odds API response' }, { status: 404 });
    }

    if (game.completed !== true) {
      return NextResponse.json({ completed: false, message: 'Match is not yet completed' });
    }

    const homeScoreRaw = game.scores?.find((s: any) => s.name === match.homeTeam)?.score;
    const awayScoreRaw = game.scores?.find((s: any) => s.name === match.awayTeam)?.score;

    if (homeScoreRaw == null || awayScoreRaw == null) {
      return NextResponse.json({ error: 'Scores not found in API response' }, { status: 502 });
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: Number(homeScoreRaw),
        awayScore: Number(awayScoreRaw),
        status: 'FINISHED',
      },
    });

    return NextResponse.json({
      completed: true,
      homeScore: Number(homeScoreRaw),
      awayScore: Number(awayScoreRaw),
    });
  } catch (error) {
    console.error('Fetch match scores error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
