import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calculateSettlement, type Scores } from '@/lib/settle';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { matchId, homeScore, awayScore, homeScoreH1, awayScoreH1, homeScoreH2, awayScoreH2 } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    const scores: Scores = {
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0,
      homeScoreH1: Number(homeScoreH1) || 0,
      awayScoreH1: Number(awayScoreH1) || 0,
      homeScoreH2: Number(homeScoreH2) || 0,
      awayScoreH2: Number(awayScoreH2) || 0,
    };

    // Fetch all bets for this match that are still PENDING
    const bets = await prisma.bet.findMany({
      where: {
        matchId,
        status: 'PENDING',
      },
      select: {
        id: true,
        userId: true,
        stake: true,
        potentialPayout: true,
        cumulativeOdds: true,
        user: { select: { username: true } },
        selections: {
          select: { id: true, marketKey: true, typeofBet: true, point: true, outcomeName: true },
        },
      },
    });

    const betInputs = bets.map((b) => ({
      id: b.id,
      userId: b.userId,
      username: b.user.username,
      stake: Number(b.stake),
      potentialPayout: Number(b.potentialPayout),
      cumulativeOdds: b.cumulativeOdds ? Number(b.cumulativeOdds) : null,
      selections: b.selections.map((s) => ({
        id: s.id,
        marketKey: s.marketKey,
        typeofBet: s.typeofBet,
        point: s.point ? Number(s.point) : null,
        outcomeName: s.outcomeName,
      })),
    }));

    // Also fetch parlay bets that have a selection for this match
    const parlayBets = await prisma.bet.findMany({
      where: {
        matchId: null,
        status: 'PENDING',
        selections: {
          some: { matchId },
        },
      },
      select: {
        id: true,
        userId: true,
        stake: true,
        potentialPayout: true,
        cumulativeOdds: true,
        user: { select: { username: true } },
        selections: {
          select: { id: true, marketKey: true, typeofBet: true, point: true, outcomeName: true },
        },
      },
    });

    const allBetInputs = [
      ...betInputs,
      ...parlayBets.map((b) => ({
        id: b.id,
        userId: b.userId,
        username: b.user.username,
        stake: Number(b.stake),
        potentialPayout: Number(b.potentialPayout),
        cumulativeOdds: b.cumulativeOdds ? Number(b.cumulativeOdds) : null,
        selections: b.selections.map((s) => ({
          id: s.id,
          marketKey: s.marketKey,
          typeofBet: s.typeofBet,
          point: s.point ? Number(s.point) : null,
          outcomeName: s.outcomeName,
        })),
      })),
    ];

    const summary = calculateSettlement(allBetInputs, scores);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Settlement calculation error:', error);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
