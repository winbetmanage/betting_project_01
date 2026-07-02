import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FetchGameScores } from '@/lib/api_links';
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

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId, homeTeam, awayTeam } = await request.json();
    if (!eventId || !homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'eventId, homeTeam, and awayTeam required' }, { status: 400 });
    }

    const url = FetchGameScores(eventId);
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Odds API returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const game = Array.isArray(data)
      ? data.find((g: any) => g.home_team === homeTeam && g.away_team === awayTeam)
      : null;

    if (!game || game.completed !== true) {
      return NextResponse.json({ completed: false, message: 'Match is not yet completed' });
    }

    const homeScoreRaw = game.scores?.find((s: any) => s.name === homeTeam)?.score;
    const awayScoreRaw = game.scores?.find((s: any) => s.name === awayTeam)?.score;

    if (homeScoreRaw == null || awayScoreRaw == null) {
      return NextResponse.json({ error: 'Scores not found in API response' }, { status: 502 });
    }

    // Update the match in the database if it exists
    const numId = hashCode(eventId);
    const match = await prisma.match.findFirst({ where: { apiMatchId: numId } });
    if (match) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: Number(homeScoreRaw),
          awayScore: Number(awayScoreRaw),
          status: 'FINISHED',
        },
      });
    }

    // Remove the completed game from upcominggameslist.json
    const filePath = path.join(process.cwd(), 'src', 'lib', 'upcominggameslist.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const games = JSON.parse(raw);
      if (Array.isArray(games)) {
        const filtered = games.filter((g: any) => g.id !== eventId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
      }
    }

    return NextResponse.json({
      completed: true,
      homeScore: Number(homeScoreRaw),
      awayScore: Number(awayScoreRaw),
    });
  } catch (error) {
    console.error('Check game status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
