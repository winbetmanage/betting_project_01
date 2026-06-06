import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';
import schedule from '../src/lib/full_game_schedule2.json';
import oddsData from '../src/lib/default_odds.json';

type ScheduleEntry = {
  matchId: number;
  date: string;
  timeLocal: string;
  stage: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
};

type OddsEntry = {
  home_team: string;
  away_team: string;
  bookmakers: {
    title: string;
    markets: {
      key: string;
      outcomes: { name: string; price: number }[];
    }[];
  }[];
};

const prisma = new PrismaClient();

function makeKickoffTime(entry: ScheduleEntry): Date {
  const [hours, minutes] = entry.timeLocal.split(':').map(Number);
  const d = new Date(entry.date + 'T12:00:00');
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function seedMatches() {
  console.log('Seeding matches...');
  const typed = schedule as ScheduleEntry[];

  for (const entry of typed) {
    await prisma.match.upsert({
      where: { apiMatchId: entry.matchId },
      update: {
        homeTeam: entry.homeTeam,
        awayTeam: entry.awayTeam,
        kickoffTime: makeKickoffTime(entry),
        stage: entry.group ? `${entry.stage} - Group ${entry.group}` : entry.stage,
      },
      create: {
        apiMatchId: entry.matchId,
        homeTeam: entry.homeTeam,
        awayTeam: entry.awayTeam,
        kickoffTime: makeKickoffTime(entry),
        stage: entry.group ? `${entry.stage} - Group ${entry.group}` : entry.stage,
        status: 'UPCOMING',
      },
    });
  }

  console.log(`  ${typed.length} matches upserted.`);
}

async function seedOdds() {
  console.log('Seeding game odds from first bookmaker...');
  const typed = oddsData as OddsEntry[];

  // Odds API uses different names than the schedule for some countries
  const nameMap: Record<string, string> = {
    'Czech Republic': 'Czechia',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
    'DR Congo': 'Congo DR',
  };

  function normalize(name: string): string {
    return nameMap[name] ?? name;
  }

  let count = 0;

  for (const entry of typed) {
    const match = await prisma.match.findFirst({
      where: {
        homeTeam: normalize(entry.home_team),
        awayTeam: normalize(entry.away_team),
      },
    });

    if (!match) {
      console.warn(`  Match not found for ${entry.home_team} vs ${entry.away_team}`);
      continue;
    }

    const bookmaker = entry.bookmakers[0];
    if (!bookmaker) continue;

    const h2h = bookmaker.markets.find((m) => m.key === 'h2h');
    if (!h2h) continue;

    const homeOutcome = h2h.outcomes.find((o) => o.name === entry.home_team);
    const awayOutcome = h2h.outcomes.find((o) => o.name === entry.away_team);
    const drawOutcome = h2h.outcomes.find((o) => o.name === 'Draw');

    await prisma.gameOddsTable.upsert({
      where: { matchId: match.id },
      update: {
        homeTeamOdds: homeOutcome?.price ?? null,
        awayTeamOdds: awayOutcome?.price ?? null,
        drawOdds: drawOutcome?.price ?? null,
      },
      create: {
        matchId: match.id,
        homeTeamOdds: homeOutcome?.price ?? null,
        awayTeamOdds: awayOutcome?.price ?? null,
        drawOdds: drawOutcome?.price ?? null,
      },
    });

    count++;
  }

  console.log(`  ${count} game odds rows upserted.`);
}

async function main() {
  // Admin account
  const password = await bcrypt.hash('masterkid', 12);
  const password2 = await bcrypt.hash('masterkid2', 12);

  const existing = await prisma.admin.findUnique({
    where: { email: 'admin@admin.com' },
  });

  if (existing) {
    console.log('Admin account already exists, updating passwords...');
    await prisma.admin.update({
      where: { email: 'admin@admin.com' },
      data: { password, password2 },
    });
    console.log('Admin passwords updated.');
  } else {
    await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@admin.com',
        username: 'admin',
        password,
        password2,
      },
    });
    console.log('Admin account created: admin@admin.com');
  }

  // Matches
  await seedMatches();

  // Game odds
  await seedOdds();

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
