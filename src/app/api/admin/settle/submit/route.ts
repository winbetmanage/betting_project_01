import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { type Scores, calculateSettlement } from '@/lib/settle';

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

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const scores: Scores = {
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0,
      homeScoreH1: Number(homeScoreH1) || 0,
      awayScoreH1: Number(awayScoreH1) || 0,
      homeScoreH2: Number(homeScoreH2) || 0,
      awayScoreH2: Number(awayScoreH2) || 0,
    };

    // Update match scores
    await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: scores.homeScore,
        awayScore: scores.awayScore,
        homeScoreH1: scores.homeScoreH1,
        awayScoreH1: scores.awayScoreH1,
        homeScoreH2: scores.homeScoreH2,
        awayScoreH2: scores.awayScoreH2,
        status: 'FINISHED',
        settled: true,
        winner: scores.homeScore > scores.awayScore ? 'HOMEWIN' : scores.awayScore > scores.homeScore ? 'AWAYWIN' : 'DRAW',
      },
    });

    // Fecth and settle single bets on this match
    const singleBets = await prisma.bet.findMany({
      where: { matchId, status: 'PENDING' },
      select: {
        id: true,
        userId: true,
        stake: true,
        potentialPayout: true,
        cumulativeOdds: true,
        user: { select: { username: true, balance: true } },
        selections: {
          select: { id: true, marketKey: true, typeofBet: true, point: true, outcomeName: true },
        },
      },
    });

    // Fetch parlay bets with a selection for this match
    const parlayBets = await prisma.bet.findMany({
      where: {
        matchId: null,
        status: 'PENDING',
        selections: { some: { matchId } },
      },
      select: {
        id: true,
        userId: true,
        stake: true,
        potentialPayout: true,
        cumulativeOdds: true,
        user: { select: { username: true, balance: true } },
        selections: {
          select: { id: true, marketKey: true, typeofBet: true, point: true, outcomeName: true },
        },
      },
    });

    const allBets = [...singleBets, ...parlayBets];
    const betInputs = allBets.map((b) => ({
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

    const summary = calculateSettlement(betInputs, scores);

    // Update selection statuses and bet statuses, and distribute payouts
    for (const result of summary.betResults) {
      // Update individual selection statuses
      for (const selResult of result.selections) {
        const selStatus = selResult.outcome === 'WON' ? 'WON' as const : selResult.outcome === 'LOST' ? 'LOST' as const : 'VOIDED' as const;
        await prisma.betSelection.update({
          where: { id: selResult.selectionId },
          data: { status: selStatus },
        });
      }

      // Update bet status and user balance
      const betStatus = result.overall === 'WON' ? 'WON' as const : result.overall === 'LOST' ? 'LOST' as const : 'VOIDED' as const;

      await prisma.bet.update({
        where: { id: result.betId },
        data: { status: betStatus },
      });

      if (result.overall === 'WON' || result.overall === 'PARTIAL_VOID') {
        await prisma.user.update({
          where: { id: result.userId },
          data: { balance: { increment: result.payout } },
        });
      } else if (result.overall === 'VOIDED') {
        // Return stake
        await prisma.user.update({
          where: { id: result.userId },
          data: { balance: { increment: result.stake } },
        });
      }
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Settlement submission error:', error);
    return NextResponse.json({ error: 'Settlement failed' }, { status: 500 });
  }
}
