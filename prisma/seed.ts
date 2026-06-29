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
    key: string;
    title: string;
    last_update: string;
    markets: {
      key: string;
      last_update: string;
      outcomes: { name: string; price: number; point?: number }[];
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

// ──────────────────────────────────────────────
// Seed the legacy GameOddsTable (h2h only)
// ──────────────────────────────────────────────
async function seedOdds() {
  console.log('Seeding game odds from first bookmaker...');
  const typed = oddsData as OddsEntry[];

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

// ──────────────────────────────────────────────
// Seed the new polymorphic MarketOdds table
// Iterates ALL bookmakers and ALL markets from
// the default_odds.json seed file (h2h only in
// seed data; live API populates the full 20).
// ──────────────────────────────────────────────
async function seedMarketOdds() {
  console.log('Seeding MarketOdds from all bookmakers/markets...');
  const typed = oddsData as OddsEntry[];

  const nameMap: Record<string, string> = {
    'Czech Republic': 'Czechia',
    'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
    'DR Congo': 'Congo DR',
  };

  function normalize(name: string): string {
    return nameMap[name] ?? name;
  }

  // Pre-load all matches into a lookup by normalized team pair
  const allMatches = await prisma.match.findMany();
  const matchLookup = new Map<string, string>();
  for (const m of allMatches) {
    matchLookup.set(`${m.homeTeam}|${m.awayTeam}`, m.id);
  }

  const rows: {
    gameId: string;
    marketKey: string;
    outcomeName: string;
    point: number | null;
    odds: number;
    bookmakerKey: string;
  }[] = [];

  let skippedNoMatch = 0;

  for (const entry of typed) {
    const matchId = matchLookup.get(
      `${normalize(entry.home_team)}|${normalize(entry.away_team)}`
    );

    if (!matchId) {
      skippedNoMatch++;
      continue;
    }

    for (const bookmaker of entry.bookmakers) {
      for (const market of bookmaker.markets) {
        for (const outcome of market.outcomes) {
          rows.push({
            gameId: matchId,
            marketKey: market.key,
            outcomeName: outcome.name,
            point: outcome.point ?? null,
            odds: outcome.price,
            bookmakerKey: bookmaker.key,
          });
        }
      }
    }
  }

  // Batch insert: createMany + skipDuplicates
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const result = await prisma.marketOdds.createMany({ data: batch });
    inserted += result.count;
  }

  console.log(`  ${inserted} market_odds rows inserted.`);
  if (skippedNoMatch > 0) {
    console.warn(`  ${skippedNoMatch} API entries skipped (no matching match in DB).`);
  }
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

  // Legacy h2h odds
  await seedOdds();

  // Expanded polymorphic market odds
  await seedMarketOdds();

  // Market types
  console.log('Seeding market types...');
  const marketTypes = [
    { shortName: 'h2h', name: 'Head-to-Head (Match Winner / 1X2)', description: 'Bet on the team that wins the match (or Draw if offered).' },
    { shortName: 'alternate_spreads', name: 'Alternate Point Spread / Handicap', description: 'Handicap betting with multiple spread options besides the main line.' },
    { shortName: 'btts', name: 'Both Teams To Score', description: 'Whether both teams will score at least one goal (Yes/No).' },
    { shortName: 'double_chance', name: 'Double Chance', description: 'Covers two of the three possible outcomes (Home/Draw, Away/Draw, Home/Away).' },
    { shortName: 'draw_no_bet', name: 'Draw No Bet', description: 'If the match ends in a draw, your stake is refunded.' },
    { shortName: 'h2h_h1', name: 'First Half Head-to-Head', description: 'Predict the winner of the first half.' },
    { shortName: 'h2h_h2', name: 'Second Half Head-to-Head', description: 'Predict the winner of the second half only.' },
    { shortName: 'alternate_totals', name: 'Alternate Totals (Over/Under)', description: 'Over/Under betting with multiple goal totals.' },
    { shortName: 'spreads', name: 'Point Spread / Handicap', description: 'The standard handicap betting market.' },
    { shortName: 'totals', name: 'Totals (Over/Under Goals)', description: 'Bet on whether total goals will be over or under the bookmaker\'s line.' },
    { shortName: 'totals_h1', name: 'First Half Totals (Over/Under)', description: 'Over/Under goals scored in the first half.' },
    { shortName: 'h2h_lay', name: 'Lay Head-to-Head', description: 'Exchange betting where you bet against a team or draw occurring.' },
    { shortName: 'spreads_h1', name: 'First Half Handicap / Spread', description: 'Handicap betting for the first half only.' },
  ];

  for (const mt of marketTypes) {
    await prisma.typesOfMarkets.upsert({
      where: { shortName: mt.shortName },
      update: { name: mt.name, description: mt.description },
      create: mt,
    });
  }
  console.log(`  ${marketTypes.length} market types upserted.`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
