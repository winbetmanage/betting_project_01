import { prisma } from '@/lib/prisma';

// ──────────────────────────────────────────────
// The Odds API – supported markets (up to 20)
// ──────────────────────────────────────────────
// We request all of these in a single /odds call.
export const TARGET_MARKETS = [
  // Core game
  'h2h',             // Moneyline (1X2)
  'btts',            // Both Teams to Score (Yes / No)
  'totals',          // Over / Under (point: 2.5, 1.5, etc.)
  'spreads',         // Handicaps (point: -1.5, +1.5, etc.)
  'double_chance',   // 1X / 12 / X2
  'draw_no_bet',     // Home / Away (draw voids)

  // Half-time markets
  'h2h_h1',          // Half-time moneyline
  'h2h_h2',          // Second-half moneyline
  'totals_h1',       // Half-time totals
  'totals_h2',       // Second-half totals
  'spreads_h1',      // Half-time spreads
  'spreads_h2',      // Second-half spreads

  // Alternate lines
  'alternate_totals', // Over/Under with alternate lines
  'alternate_spreads',// Handicaps with alternate lines

  // Team props
  'totals_home',     // Home team total goals
  'totals_away',     // Away team total goals

  // Player props (where available)
  'player_anytime_td', // Anytime goalscorer
  'player_1st_td',     // First goalscorer
  'player_last_td',    // Last goalscorer
] as const;

export type MarketKey = (typeof TARGET_MARKETS)[number];

// ──────────────────────────────────────────────
// Raw API response types
// ──────────────────────────────────────────────
export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiMarket {
  key: string;
  last_update: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiMatchResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

// ──────────────────────────────────────────────
// Normalised record we insert into our DB
// ──────────────────────────────────────────────
export interface MarketOddsRecord {
  gameId: string;          // our internal Match.id (looked up via apiMatchId or team names)
  marketKey: string;
  outcomeName: string;
  point: number | null;
  odds: number;
  bookmakerKey: string;
}

// ──────────────────────────────────────────────
// Fetch odds from The Odds API
// ──────────────────────────────────────────────
export async function fetchOddsFromApi(
  apiKey: string,
  sport = 'soccer_world_cup',
  regions = 'uk',
): Promise<OddsApiMatchResponse[]> {
  const marketsParam = TARGET_MARKETS.join(',');

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds`
    + `?apiKey=${apiKey}`
    + `&regions=${regions}`
    + `&markets=${marketsParam}`
    + `&oddsFormat=decimal`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ──────────────────────────────────────────────
// Parse raw API response into normalised records
// ──────────────────────────────────────────────
export function parseMarketOdds(
  apiMatches: OddsApiMatchResponse[],
  matchLookup: Map<string, string>, // keyed by "homeTeam|awayTeam" -> Match.id
): MarketOddsRecord[] {
  const records: MarketOddsRecord[] = [];

  for (const apiMatch of apiMatches) {
    const lookupKey = `${apiMatch.home_team}|${apiMatch.away_team}`;
    const gameId = matchLookup.get(lookupKey);

    if (!gameId) {
      // Could also match reversed (away|home) for safety
      const reversedKey = `${apiMatch.away_team}|${apiMatch.home_team}`;
      const gameIdRev = matchLookup.get(reversedKey);
      if (!gameIdRev) continue;
      // Use reversed match
    }

    const gid = matchLookup.get(lookupKey) ?? matchLookup.get(`${apiMatch.away_team}|${apiMatch.home_team}`);
    if (!gid) continue;

    for (const bookmaker of apiMatch.bookmakers) {
      for (const market of bookmaker.markets) {
        for (const outcome of market.outcomes) {
          records.push({
            gameId: gid,
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

  return records;
}

// ──────────────────────────────────────────────
// Upsert parsed records into the MarketOdds table
// ──────────────────────────────────────────────
export async function upsertMarketOdds(records: MarketOddsRecord[]): Promise<number> {
  let count = 0;

  for (const r of records) {
    // Delete existing entries for the same (gameId, marketKey, outcomeName, point, bookmakerKey)
    // then insert fresh ― simpler than conditional upsert logic with nullable point.
    await prisma.marketOdds.deleteMany({
      where: {
        gameId: r.gameId,
        marketKey: r.marketKey,
        outcomeName: r.outcomeName,
        bookmakerKey: r.bookmakerKey,
        point: r.point ?? undefined,
      },
    });

    await prisma.marketOdds.create({ data: r });
    count++;
  }

  return count;
}

// ──────────────────────────────────────────────
// One-shot: fetch + parse + upsert
// ──────────────────────────────────────────────
export async function syncOddsFromApi(apiKey: string): Promise<{ matchesFetched: number; oddsInserted: number }> {
  // 1. Fetch from API
  const apiMatches = await fetchOddsFromApi(apiKey);

  // 2. Build lookup: "homeTeam|awayTeam" -> Match.id
  const allMatches = await prisma.match.findMany({
    select: { id: true, homeTeam: true, awayTeam: true },
  });

  const matchLookup = new Map<string, string>();
  for (const m of allMatches) {
    matchLookup.set(`${m.homeTeam}|${m.awayTeam}`, m.id);
  }

  // 3. Parse
  const records = parseMarketOdds(apiMatches, matchLookup);

  // 4. Upsert
  const oddsInserted = await upsertMarketOdds(records);

  return { matchesFetched: apiMatches.length, oddsInserted };
}
