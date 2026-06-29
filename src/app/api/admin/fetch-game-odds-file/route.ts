import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FetchDetailOddsOfAGame } from '@/lib/api_links';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { matchId } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, apiMatchId: true, homeTeam: true, awayTeam: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const gamesListPath = path.join(process.cwd(), 'src', 'lib', 'upcominggameslist.json');
    let eventId: string | null = null;

    if (fs.existsSync(gamesListPath)) {
      const raw = fs.readFileSync(gamesListPath, 'utf-8');
      const games = JSON.parse(raw);
      if (Array.isArray(games)) {
        const found = games.find(
          (g: any) =>
            g.home_team === match.homeTeam && g.away_team === match.awayTeam,
        );
        if (found) eventId = found.id;
      }
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Could not find original event ID for this match. Fetch upcoming games first.' },
        { status: 400 },
      );
    }

    const url = FetchDetailOddsOfAGame(eventId);

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Odds API error ${res.status}: ${body}` },
        { status: 502 },
      );
    }

    const data = await res.json();

    const dirPath = path.join(process.cwd(), 'src', 'lib', 'game_odd_details');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, `${match.apiMatchId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, file: `${match.apiMatchId}.json` });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch game odds' },
      { status: 500 },
    );
  }
}
