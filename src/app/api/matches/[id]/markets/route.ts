import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type MarketRow = {
  marketKey: string;
  outcomeName: string;
  point: number | null;
  odds: number;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const markets: MarketRow[] = [];

  // ── h2h_records ──────────────────────────────
  const h2hRows = await prisma.h2h_records.findMany({ where: { matchId: id } });
  for (const r of h2hRows) {
    const mk = r.type_name || 'h2h';
    markets.push(
      { marketKey: mk, outcomeName: 'Home', point: null, odds: Number(r.home_wins) },
      { marketKey: mk, outcomeName: 'Draw', point: null, odds: Number(r.draw) },
      { marketKey: mk, outcomeName: 'Away', point: null, odds: Number(r.away_wins) },
    );
  }

  // ── btts_records ─────────────────────────────
  const bttsRows = await prisma.btts_records.findMany({ where: { matchId: id } });
  for (const r of bttsRows) {
    markets.push(
      { marketKey: 'btts', outcomeName: 'Yes', point: null, odds: Number(r.yes) },
      { marketKey: 'btts', outcomeName: 'No', point: null, odds: Number(r.no) },
    );
  }

  // ── totals_records ───────────────────────────
  const totalsRows = await prisma.totals_records.findMany({ where: { matchId: id } });
  for (const r of totalsRows) {
    const mk = r.type_name || 'totals';
    const pt = Number(r.point);
    if (r.over != null && Number(r.over) > 0) markets.push({ marketKey: mk, outcomeName: 'Over', point: pt, odds: Number(r.over) });
    if (r.under != null && Number(r.under) > 0) markets.push({ marketKey: mk, outcomeName: 'Under', point: pt, odds: Number(r.under) });
  }

  // ── double_chance_records ────────────────────
  const dcRows = await prisma.double_chance_records.findMany({ where: { matchId: id } });
  for (const r of dcRows) {
    markets.push(
      { marketKey: 'double_chance', outcomeName: 'Home or Draw', point: null, odds: Number(r.home_draw) },
      { marketKey: 'double_chance', outcomeName: 'Away or Draw', point: null, odds: Number(r.away_draw) },
      { marketKey: 'double_chance', outcomeName: 'Home or Away', point: null, odds: Number(r.home_away) },
    );
  }

  // ── no_bet_records (draw_no_bet) ──────────────
  const dnbRows = await prisma.no_bet_records.findMany({ where: { matchId: id } });
  for (const r of dnbRows) {
    markets.push(
      { marketKey: 'draw_no_bet', outcomeName: 'Home', point: null, odds: Number(r.home) },
      { marketKey: 'draw_no_bet', outcomeName: 'Away', point: null, odds: Number(r.away) },
    );
  }

  // ── spread_records ───────────────────────────
  const spreadRows = await prisma.spread_records.findMany({ where: { matchId: id } });
  for (const r of spreadRows) {
    const mk = r.type_name || 'spreads';
    const pt = Number(r.points);
    markets.push({ marketKey: mk, outcomeName: r.teams, point: pt, odds: Number(r.team) });
  }

  // ── Also include MarketOdds table data ───────
  const marketOddsRows = await prisma.marketOdds.findMany({
    where: { gameId: id },
    orderBy: [{ marketKey: 'asc' }, { outcomeName: 'asc' }],
  });
  for (const r of marketOddsRows) {
    markets.push({
      marketKey: r.marketKey,
      outcomeName: r.outcomeName,
      point: r.point ? Number(r.point) : null,
      odds: Number(r.odds),
    });
  }

  return NextResponse.json({ id, markets });
}
