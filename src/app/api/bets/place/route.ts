import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/library';

// ──────────────────────────────────────────────
// Allowed TypeofBet values for the legacy h2h path
// ──────────────────────────────────────────────
const VALID_TYPES = ['HOME_WINS', 'AWAY_WINS', 'DRAW'];

// ──────────────────────────────────────────────
// Look up odds for a selection
// 1. If marketKey is provided and non-"h2h", query the MarketOdds table
// 2. Fall back to GameOddsTable for backward compatibility
// ──────────────────────────────────────────────
async function resolveOdds(
  matchId: string,
  marketKey: string,
  typeofBet: string,
  point: number | null,
  outcomeName: string | null,
): Promise<{ odds: number; resolvedOutcomeName: string; resolvedPoint: number | null } | null> {
  const mk = marketKey || 'h2h';

  // ── Look up odds from the individual record tables ──

  // h2h, h2h_h1, h2h_h2, h2h_lay
  if (['h2h', 'h2h_h1', 'h2h_h2', 'h2h_lay'].includes(mk)) {
    const row = await prisma.h2h_records.findFirst({
      where: { matchId, type_name: mk },
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return null;
    const name = outcomeName || (typeofBet === 'HOME_WINS' || typeofBet === 'HT_HOME_WINS' || typeofBet === 'HT2_HOME_WINS' ? 'Home'
      : typeofBet === 'DRAW' || typeofBet === 'HT_DRAW' || typeofBet === 'HT2_DRAW' ? 'Draw'
      : 'Away');
    const odds = name === 'Home' ? Number(row.home_wins)
      : name === 'Draw' ? Number(row.draw)
      : Number(row.away_wins);
    if (odds <= 0) return null;
    return { odds, resolvedOutcomeName: name, resolvedPoint: null };
  }

  // btts
  if (mk === 'btts') {
    const row = await prisma.btts_records.findFirst({
      where: { matchId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return null;
    const name = outcomeName || (typeofBet === 'BOTH_TEAMS_TO_SCORE_YES' ? 'Yes' : 'No');
    const odds = name === 'Yes' ? Number(row.yes) : Number(row.no);
    if (odds <= 0) return null;
    return { odds, resolvedOutcomeName: name, resolvedPoint: null };
  }

  // totals, totals_h1, totals_h2, totals_home, totals_away, alternate_totals
  if (['totals', 'totals_h1', 'totals_h2', 'totals_home', 'totals_away', 'alternate_totals'].includes(mk)) {
    const where: any = { matchId, type_name: mk };
    const name = outcomeName || (typeofBet === 'OVER' ? 'Over' : 'Under');
    if (point != null) where.point = point;
    const row = await prisma.totals_records.findFirst({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return null;
    const odds = name === 'Over' ? Number(row.over) : Number(row.under);
    if (odds <= 0) return null;
    return { odds, resolvedOutcomeName: name, resolvedPoint: Number(row.point) };
  }

  // double_chance
  if (mk === 'double_chance') {
    const row = await prisma.double_chance_records.findFirst({
      where: { matchId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return null;
    const name = outcomeName || (
      typeofBet === 'HOME_WINS_OR_DRAW' ? 'Home or Draw'
      : typeofBet === 'AWAY_WINS_OR_DRAW' ? 'Away or Draw'
      : 'Home or Away'
    );
    const odds = name === 'Home or Draw' ? Number(row.home_draw)
      : name === 'Away or Draw' ? Number(row.away_draw)
      : Number(row.home_away);
    if (odds <= 0) return null;
    return { odds, resolvedOutcomeName: name, resolvedPoint: null };
  }

  // draw_no_bet
  if (mk === 'draw_no_bet') {
    const row = await prisma.no_bet_records.findFirst({
      where: { matchId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return null;
    const name = outcomeName || (typeofBet === 'HOME_WINS' ? 'Home' : 'Away');
    const odds = name === 'Home' ? Number(row.home) : Number(row.away);
    if (odds <= 0) return null;
    return { odds, resolvedOutcomeName: name, resolvedPoint: null };
  }

  // spreads, spreads_h1, spreads_h2, alternate_spreads
  if (['spreads', 'spreads_h1', 'spreads_h2', 'alternate_spreads'].includes(mk)) {
    const where: any = { matchId, type_name: mk };
    if (outcomeName) where.teams = outcomeName;
    if (point != null) where.points = point;
    const row = await prisma.spread_records.findFirst({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return null;
    const odds = Number(row.team);
    if (odds <= 0) return null;
    return { odds, resolvedOutcomeName: row.teams, resolvedPoint: Number(row.points) };
  }

  // player markets (anytime_td, 1st_td, last_td) — fallback to MarketOdds
  const playerKeys = ['player_anytime_td', 'player_1st_td', 'player_last_td'];
  if (playerKeys.includes(mk)) {
    const filter: any = { gameId: matchId, marketKey: mk };
    if (outcomeName) filter.outcomeName = outcomeName;
    const row = await prisma.marketOdds.findFirst({
      where: filter,
      orderBy: { updatedAt: 'desc' },
    });
    if (row) {
      return { odds: Number(row.odds), resolvedOutcomeName: row.outcomeName, resolvedPoint: row.point ? Number(row.point) : null };
    }
    return null;
  }

  // ── Fallback: unknown market, try MarketOdds ──
  const fallback = await prisma.marketOdds.findFirst({
    where: { gameId: matchId, marketKey: mk },
    orderBy: { updatedAt: 'desc' },
  });
  if (fallback) {
    return { odds: Number(fallback.odds), resolvedOutcomeName: fallback.outcomeName, resolvedPoint: fallback.point ? Number(fallback.point) : null };
  }

  // ── Final fallback: legacy gameOddsTable (h2h only) ──
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { gameOddsTable: true },
  });
  if (match?.gameOddsTable && (mk === 'h2h' || mk === '')) {
    const table = match.gameOddsTable;
    let odds: number | null = null;
    let resolvedName = '';
    if (typeofBet === 'HOME_WINS') { odds = table.homeTeamOdds; resolvedName = 'Home'; }
    else if (typeofBet === 'AWAY_WINS') { odds = table.awayTeamOdds; resolvedName = 'Away'; }
    else if (typeofBet === 'DRAW') { odds = table.drawOdds; resolvedName = 'Draw'; }
    if (odds != null && odds > 0) return { odds, resolvedOutcomeName: resolvedName, resolvedPoint: null };
  }

  return null;
}

// ──────────────────────────────────────────────
// POST /api/bets/place
// ──────────────────────────────────────────────
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

  // ── SINGLE BET ──────────────────────────────────
  if (type === 'SINGLE' || !type) {
    const { matchId, typeofBet, marketKey, point, outcomeName } = body;

    if (!matchId || !typeofBet) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // For h2h single bets, validate against the legacy set
    const mk = marketKey || 'h2h';
    if (mk === 'h2h' && !VALID_TYPES.includes(typeofBet)) {
      return NextResponse.json({ error: 'Invalid bet type' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, addToBetting: true, kickoffTime: true },
    });

    if (!match || !match.addToBetting || match.kickoffTime <= new Date()) {
      return NextResponse.json({ error: 'Match not available for betting' }, { status: 400 });
    }

    const resolved = await resolveOdds(matchId, mk, typeofBet, point ?? null, outcomeName ?? null);
    if (!resolved || resolved.odds <= 0) {
      return NextResponse.json({ error: 'Odds not available for this selection' }, { status: 400 });
    }

    const potentialPayout = Math.round(stakeAmount * resolved.odds * 100) / 100;

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
            typeofBet: typeofBet as any,
            stake: stakeAmount,
            potentialPayout,
            cumulativeOdds: resolved.odds,
            selections: {
              create: {
                matchId,
                marketKey: mk,
                typeofBet: typeofBet as any,
                point: resolved.resolvedPoint != null ? new Decimal(resolved.resolvedPoint) : null,
                outcomeName: resolved.resolvedOutcomeName,
                oddsAtBet: resolved.odds,
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

  // ── PARLAY BET ──────────────────────────────────
  if (type === 'PARLAY') {
    const { selections } = body;

    if (!Array.isArray(selections) || selections.length < 2) {
      return NextResponse.json({ error: 'At least 2 selections required for a parlay' }, { status: 400 });
    }

    const matchIds = selections.map((s: any) => s.matchId);
    const uniqueMatchIds = [...new Set(matchIds)];

    const matches = await prisma.match.findMany({
      where: { id: { in: uniqueMatchIds }, addToBetting: true, kickoffTime: { gt: new Date() } },
      select: { id: true, homeTeam: true, awayTeam: true },
    });

    if (matches.length !== uniqueMatchIds.length) {
      return NextResponse.json({ error: 'One or more matches are not available for betting' }, { status: 400 });
    }

    const matchMap = new Map(matches.map((m) => [m.id, m]));
    const resolvedSelections: {
      matchId: string;
      marketKey: string;
      typeofBet: string;
      point: number | null;
      outcomeName: string | null;
      oddsAtBet: number;
      homeTeam: string;
      awayTeam: string;
    }[] = [];

    for (const sel of selections) {
      const mk = sel.marketKey || 'h2h';
      if (mk === 'h2h' && !VALID_TYPES.includes(sel.typeofBet)) {
        return NextResponse.json({ error: 'Invalid bet type for a selection' }, { status: 400 });
      }

      const match = matchMap.get(sel.matchId);
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 400 });
      }

      const resolved = await resolveOdds(sel.matchId, mk, sel.typeofBet, sel.point ?? null, sel.outcomeName ?? null);
      if (!resolved || resolved.odds <= 0) {
        return NextResponse.json({
          error: `Odds not available for ${match.homeTeam} vs ${match.awayTeam}`,
        }, { status: 400 });
      }

      resolvedSelections.push({
        matchId: sel.matchId,
        marketKey: mk,
        typeofBet: sel.typeofBet,
        point: resolved.resolvedPoint,
        outcomeName: resolved.resolvedOutcomeName,
        oddsAtBet: resolved.odds,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
      });
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
                marketKey: s.marketKey,
                typeofBet: s.typeofBet as any,
                point: s.point != null ? new Decimal(s.point) : null,
                outcomeName: s.outcomeName,
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
