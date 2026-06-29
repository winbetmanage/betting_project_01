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

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'upcominggameslist.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const games = JSON.parse(raw);

    if (!Array.isArray(games)) {
      return NextResponse.json([]);
    }

    const apiIds = games.map((g: any) => hashCode(g.id));
    const existingMatches = await prisma.match.findMany({
      where: { apiMatchId: { in: apiIds } },
      select: { apiMatchId: true, id: true, addToBetting: true },
    });

    const matchByApiId = new Map(existingMatches.map((m) => [m.apiMatchId, m]));

    const enriched = games.map((game: any) => {
      const numId = hashCode(game.id);
      const dbMatch = matchByApiId.get(numId);
      return {
        ...game,
        matchId: dbMatch?.id ?? null,
        addToBetting: dbMatch?.addToBetting ?? false,
        inDb: !!dbMatch,
      };
    });

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: 'Failed to read upcoming games list' }, { status: 500 });
  }
}
