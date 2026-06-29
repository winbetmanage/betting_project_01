import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash * 31 + char) | 0;
  }
  return Math.abs(hash);
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'upcominggameslist.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'No upcoming games list found. Fetch games first.' }, { status: 400 });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const games = JSON.parse(raw);

    if (!Array.isArray(games) || games.length === 0) {
      return NextResponse.json({ error: 'Upcoming games list is empty' }, { status: 400 });
    }

    const gameEntries = games.map((g: any) => ({
      apiMatchId: hashCode(g.id),
      homeTeam: g.home_team,
      awayTeam: g.away_team,
      kickoffTime: new Date(g.commence_time),
      stage: g.sport_title || 'FIFA World Cup',
      status: 'UPCOMING' as const,
    }));

    const seen = new Set<number>();
    const unique = gameEntries.filter((e) => {
      if (seen.has(e.apiMatchId)) return false;
      seen.add(e.apiMatchId);
      return true;
    });

    const apiIds = unique.map((e) => e.apiMatchId);
    const existing = await prisma.match.findMany({
      where: { apiMatchId: { in: apiIds } },
      select: { apiMatchId: true },
    });
    const existingSet = new Set(existing.map((m) => m.apiMatchId));

    const toCreate = unique.filter((e) => !existingSet.has(e.apiMatchId));

    let created = 0;
    for (const entry of toCreate) {
      await prisma.match.create({ data: entry });
      created++;
    }

    const skipped = games.length - created;

    return NextResponse.json({ success: true, created, skipped });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to refresh games' },
      { status: 500 },
    );
  }
}
