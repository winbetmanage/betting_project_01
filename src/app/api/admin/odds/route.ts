import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    include: {
      gameOddsTable: true,
      marketOdds: {
        orderBy: [{ marketKey: 'asc' }, { outcomeName: 'asc' }],
      },
    },
    orderBy: { kickoffTime: 'asc' },
  });

  return NextResponse.json(matches);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // ── MarketOdds update path ──
    if (body.marketOddsId) {
      const { marketOddsId, odds } = body;
      if (odds == null || odds <= 0) {
        return NextResponse.json({ error: 'Invalid odds value' }, { status: 400 });
      }
      const updated = await prisma.marketOdds.update({
        where: { id: marketOddsId },
        data: { odds },
      });
      return NextResponse.json(updated);
    }

    // ── Legacy GameOddsTable update path (h2h) ──
    const { matchId, homeTeamOdds, awayTeamOdds, drawOdds } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const updated = await prisma.gameOddsTable.upsert({
      where: { matchId },
      update: {
        homeTeamOdds: homeTeamOdds ?? null,
        awayTeamOdds: awayTeamOdds ?? null,
        drawOdds: drawOdds ?? null,
      },
      create: {
        matchId,
        homeTeamOdds: homeTeamOdds ?? null,
        awayTeamOdds: awayTeamOdds ?? null,
        drawOdds: drawOdds ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
