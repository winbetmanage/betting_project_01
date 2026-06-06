import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    include: { gameOddsTable: true },
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
    const { matchId, homeTeamOdds, awayTeamOdds, drawOdds } = await request.json();

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
