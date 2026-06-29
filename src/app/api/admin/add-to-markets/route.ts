import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

function findOutcome(outcomes: any[], name: string) {
  const lowerName = name.toLowerCase();
  return outcomes.find((o: any) => o.name.toLowerCase() === lowerName);
}

function findOutcomePartial(outcomes: any[], names: string[]) {
  return outcomes.find((o: any) => {
    const lower = o.name.toLowerCase();
    return names.some((n) => lower.includes(n.toLowerCase()));
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { matchId, marketKey } = await request.json();
    if (!matchId || !marketKey) {
      return NextResponse.json({ error: 'matchId and marketKey are required' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, apiMatchId: true, homeTeam: true, awayTeam: true },
    });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'src', 'lib', 'game_odd_details', `${match.apiMatchId}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'No odds file found for this match. Fetch odds first.' }, { status: 400 });
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const bookmakers = Array.isArray(raw.bookmakers) ? raw.bookmakers : [];
    if (bookmakers.length === 0) {
      return NextResponse.json({ error: 'No bookmaker data in odds file' }, { status: 400 });
    }

    let market: any = null;
    for (const bm of bookmakers) {
      const found = (bm.markets || []).find((m: any) => m.key === marketKey);
      if (found) { market = found; break; }
    }
    if (!market || !Array.isArray(market.outcomes)) {
      return NextResponse.json({ error: `Market "${marketKey}" not found in odds data` }, { status: 400 });
    }

    const outcomes = market.outcomes;

    await prisma.typesOfMarkets.upsert({
      where: { shortName: marketKey },
      update: {},
      create: { shortName: marketKey, name: marketKey, description: null },
    });

    switch (marketKey) {
      case 'h2h':
      case 'h2h_lay': {
        const home = findOutcome(outcomes, match.homeTeam);
        const away = findOutcome(outcomes, match.awayTeam);
        const draw = findOutcome(outcomes, 'draw');
        if (!home || !away || !draw) {
          return NextResponse.json({ error: 'Missing home/away/draw outcomes for h2h' }, { status: 400 });
        }
        await prisma.h2h_records.upsert({
          where: { id: `${matchId}_${marketKey}` } as any,
          update: { home_wins: home.price, away_wins: away.price, draw: draw.price, type_name: marketKey },
          create: { id: `${matchId}_${marketKey}`, matchId, type_name: marketKey, home_wins: home.price, away_wins: away.price, draw: draw.price },
        });
        break;
      }
      case 'btts': {
        const yes = findOutcome(outcomes, 'yes');
        const no = findOutcome(outcomes, 'no');
        if (!yes || !no) {
          return NextResponse.json({ error: 'Missing yes/no outcomes for btts' }, { status: 400 });
        }
        await prisma.btts_records.upsert({
          where: { id: `${matchId}_btts` } as any,
          update: { yes: yes.price, no: no.price },
          create: { id: `${matchId}_btts`, matchId, type_name: 'btts', yes: yes.price, no: no.price },
        });
        break;
      }
      case 'totals': {
        const over = findOutcome(outcomes, 'over');
        const under = findOutcome(outcomes, 'under');
        if (!over || !under) {
          return NextResponse.json({ error: 'Missing over/under outcomes for totals' }, { status: 400 });
        }
        const point = over.point ?? under.point ?? 2.5;
        await prisma.totals_records.upsert({
          where: { id: `${matchId}_totals` } as any,
          update: { over: over.price, under: under.price, point },
          create: { id: `${matchId}_totals`, matchId, type_name: 'totals', over: over.price, under: under.price, point },
        });
        break;
      }
      case 'double_chance': {
        const homeTeam = match.homeTeam;
        const awayTeam = match.awayTeam;
        const homeDraw = findOutcomePartial(outcomes, [`${homeTeam} or Draw`, `${homeTeam} or draw`, 'home or draw', '1x', `${homeTeam} or Draw (1X)`]);
        const awayDraw = findOutcomePartial(outcomes, [`${awayTeam} or Draw`, `${awayTeam} or draw`, 'away or draw', 'x2', `${awayTeam} or Draw (X2)`]);
        const homeAway = findOutcomePartial(outcomes, [`${homeTeam} or ${awayTeam}`, 'home or away', '12']);
        if (!homeDraw || !awayDraw || !homeAway) {
          return NextResponse.json({ error: 'Missing outcomes for double_chance' }, { status: 400 });
        }
        await prisma.double_chance_records.upsert({
          where: { id: `${matchId}_double_chance` } as any,
          update: { home_draw: homeDraw.price, away_draw: awayDraw.price, home_away: homeAway.price },
          create: { id: `${matchId}_double_chance`, matchId, type_name: 'double_chance', home_draw: homeDraw.price, away_draw: awayDraw.price, home_away: homeAway.price },
        });
        break;
      }
      case 'draw_no_bet': {
        const home = findOutcome(outcomes, match.homeTeam);
        const away = findOutcome(outcomes, match.awayTeam);
        if (!home || !away) {
          return NextResponse.json({ error: 'Missing home/away outcomes for draw_no_bet' }, { status: 400 });
        }
        await prisma.no_bet_records.upsert({
          where: { id: `${matchId}_draw_no_bet` } as any,
          update: { home: home.price, away: away.price },
          create: { id: `${matchId}_draw_no_bet`, matchId, type_name: 'draw_no_bet', home: home.price, away: away.price },
        });
        break;
      }
      case 'spreads':
      case 'spreads_h1': {
        for (const outcome of outcomes as any[]) {
          const teamName = outcome.name || 'Unknown';
          await prisma.spread_records.upsert({
            where: { id: `${matchId}_${marketKey}_${teamName}` } as any,
            update: { teams: teamName, team: outcome.price, points: outcome.point ?? 0 },
            create: { id: `${matchId}_${marketKey}_${teamName}`, matchId, type_name: marketKey, teams: teamName, team: outcome.price, points: outcome.point ?? 0 },
          });
        }
        break;
      }
      case 'alternate_spreads': {
        for (const outcome of outcomes as any[]) {
          const teamName = outcome.name || 'Unknown';
          const pt = outcome.point ?? 0;
          await prisma.spread_records.upsert({
            where: { id: `${matchId}_${marketKey}_${teamName}_${pt}` } as any,
            update: { teams: teamName, team: outcome.price, points: pt },
            create: { id: `${matchId}_${marketKey}_${teamName}_${pt}`, matchId, type_name: marketKey, teams: teamName, team: outcome.price, points: pt },
          });
        }
        break;
      }
      case 'h2h_h1':
      case 'h2h_h2': {
        const home = findOutcome(outcomes, match.homeTeam);
        const away = findOutcome(outcomes, match.awayTeam);
        const draw = findOutcome(outcomes, 'draw');
        if (!home || !away || !draw) {
          return NextResponse.json({ error: `Missing home/away/draw outcomes for ${marketKey}` }, { status: 400 });
        }
        await prisma.h2h_records.upsert({
          where: { id: `${matchId}_${marketKey}` } as any,
          update: { home_wins: home.price, away_wins: away.price, draw: draw.price, type_name: marketKey },
          create: { id: `${matchId}_${marketKey}`, matchId, type_name: marketKey, home_wins: home.price, away_wins: away.price, draw: draw.price },
        });
        break;
      }
      case 'totals_h1': {
        const over = findOutcome(outcomes, 'over');
        const under = findOutcome(outcomes, 'under');
        if (!over || !under) {
          return NextResponse.json({ error: `Missing over/under outcomes for ${marketKey}` }, { status: 400 });
        }
        const point = over.point ?? under.point ?? 2.5;
        await prisma.totals_records.upsert({
          where: { id: `${matchId}_${marketKey}` } as any,
          update: { over: over.price, under: under.price, point, type_name: marketKey },
          create: { id: `${matchId}_${marketKey}`, matchId, type_name: marketKey, over: over.price, under: under.price, point },
        });
        break;
      }
      case 'alternate_totals': {
        for (const outcome of outcomes as any[]) {
          const isOver = outcome.name?.toLowerCase() === 'over';
          const isUnder = outcome.name?.toLowerCase() === 'under';
          if (!isOver && !isUnder) continue;
          const pt = outcome.point ?? 2.5;
          await prisma.totals_records.upsert({
            where: { id: `${matchId}_${marketKey}_${isOver ? 'over' : 'under'}_${pt}` } as any,
            update: {
              over: isOver ? outcome.price : 0,
              under: isUnder ? outcome.price : 0,
              point: pt,
              type_name: marketKey,
            },
            create: {
              id: `${matchId}_${marketKey}_${isOver ? 'over' : 'under'}_${pt}`,
              matchId,
              type_name: marketKey,
              over: isOver ? outcome.price : 0,
              under: isUnder ? outcome.price : 0,
              point: pt,
            },
          });
        }
        break;
      }
      default: {
        return NextResponse.json({ error: `Unsupported market key: ${marketKey}` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, marketKey });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add to markets' }, { status: 500 });
  }
}
