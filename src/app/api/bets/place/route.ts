import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const VALID_TYPES = ['HOME_WINS', 'AWAY_WINS', 'DRAW'];

function getOddsValue(odds: { homeTeamOdds: number | null; awayTeamOdds: number | null; drawOdds: number | null } | null, typeofBet: string): number | null {
  if (!odds) return null;
  if (typeofBet === 'HOME_WINS') return odds.homeTeamOdds ?? null;
  if (typeofBet === 'AWAY_WINS') return odds.awayTeamOdds ?? null;
  if (typeofBet === 'DRAW') return odds.drawOdds ?? null;
  return null;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'USER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, stake } = body;

  if (!stake || stake <= 0) {
    return NextResponse.json({ error: 'Invalid stake' }, { status: 400 });
  }

  const stakeAmount = Math.round(stake * 100) / 100;

  // --- SINGLE BET ---
  if (type === 'SINGLE' || !type) {
    const { matchId, typeofBet } = body;
    if (!matchId || !typeofBet || !VALID_TYPES.includes(typeofBet)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, addToBetting: true, kickoffTime: true, gameOddsTable: true },
    });

    if (!match || !match.addToBetting || match.kickoffTime <= new Date()) {
      return NextResponse.json({ error: 'Match not available for betting' }, { status: 400 });
    }

    const selectedOdds = getOddsValue(match.gameOddsTable, typeofBet);
    if (selectedOdds == null || selectedOdds <= 0) {
      return NextResponse.json({ error: 'Odds not available for this selection' }, { status: 400 });
    }

    const potentialPayout = Math.round(stakeAmount * selectedOdds * 100) / 100;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: session.id },
          select: { balance: true },
        });
        if (Number(user.balance) < stakeAmount) throw new Error('Insufficient balance');

        const bet = await tx.bet.create({
          data: {
            userId: session.id,
            matchId,
            typeofBet,
            stake: stakeAmount,
            potentialPayout,
            cumulativeOdds: selectedOdds,
            selections: {
              create: {
                matchId,
                typeofBet,
                oddsAtBet: selectedOdds,
              },
            },
          },
        });

        await tx.user.update({
          where: { id: session.id },
          data: { balance: { decrement: stakeAmount } },
        });

        return bet;
      });

      return NextResponse.json({
        success: true,
        bet: {
          id: result.id,
          type: 'SINGLE',
          stake: Number(result.stake).toFixed(2),
          potentialPayout: Number(result.potentialPayout).toFixed(2),
          typeofBet: result.typeofBet,
        },
      });
    } catch (error: any) {
      const message = error.message === 'Insufficient balance' ? 'Insufficient balance' : 'Failed to place bet';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // --- PARLAY BET ---
  if (type === 'PARLAY') {
    const { selections } = body;
    if (!Array.isArray(selections) || selections.length < 2) {
      return NextResponse.json({ error: 'At least 2 selections required for a parlay' }, { status: 400 });
    }

    const matchIds = selections.map((s: any) => s.matchId);
    const matches = await prisma.match.findMany({
      where: { id: { in: matchIds }, addToBetting: true, kickoffTime: { gt: new Date() } },
      select: { id: true, homeTeam: true, awayTeam: true, gameOddsTable: true },
    });

    if (matches.length !== selections.length) {
      return NextResponse.json({ error: 'One or more matches are not available for betting' }, { status: 400 });
    }

    const matchMap = new Map(matches.map((m) => [m.id, m]));
    const resolvedSelections: { matchId: string; typeofBet: string; oddsAtBet: number; homeTeam: string; awayTeam: string }[] = [];

    for (const sel of selections) {
      if (!VALID_TYPES.includes(sel.typeofBet)) {
        return NextResponse.json({ error: `Invalid bet type for a selection` }, { status: 400 });
      }
      const match = matchMap.get(sel.matchId);
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 400 });
      }
      const odds = getOddsValue(match.gameOddsTable, sel.typeofBet);
      if (odds == null || odds <= 0) {
        return NextResponse.json({ error: `Odds not available for ${match.homeTeam} vs ${match.awayTeam}` }, { status: 400 });
      }
      resolvedSelections.push({ matchId: sel.matchId, typeofBet: sel.typeofBet, oddsAtBet: odds, homeTeam: match.homeTeam, awayTeam: match.awayTeam });
    }

    const cumulativeOdds = Math.round(resolvedSelections.reduce((prod, s) => prod * s.oddsAtBet, 1) * 100) / 100;
    const potentialPayout = Math.round(stakeAmount * cumulativeOdds * 100) / 100;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: session.id },
          select: { balance: true },
        });
        if (Number(user.balance) < stakeAmount) throw new Error('Insufficient balance');

        const bet = await tx.bet.create({
          data: {
            userId: session.id,
            stake: stakeAmount,
            potentialPayout,
            cumulativeOdds,
            selections: {
              create: resolvedSelections.map((s) => ({
                matchId: s.matchId,
                typeofBet: s.typeofBet as any,
                oddsAtBet: s.oddsAtBet,
              })),
            },
          },
        });

        await tx.user.update({
          where: { id: session.id },
          data: { balance: { decrement: stakeAmount } },
        });

        return bet;
      });

      return NextResponse.json({
        success: true,
        bet: {
          id: result.id,
          type: 'PARLAY',
          stake: Number(result.stake).toFixed(2),
          potentialPayout: Number(result.potentialPayout).toFixed(2),
          cumulativeOdds: Number(result.cumulativeOdds).toFixed(2),
          selections: resolvedSelections.length,
        },
      });
    } catch (error: any) {
      const message = error.message === 'Insufficient balance' ? 'Insufficient balance' : 'Failed to place bet';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Invalid bet type' }, { status: 400 });
}
