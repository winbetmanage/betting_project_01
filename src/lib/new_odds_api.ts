// ──────────────────────────────────────────────
// Sportmonks Football API v3 – Pre-Match Odds
// ──────────────────────────────────────────────
// Ingests deep soccer markets per fixture using
// the Sportmonks pre-match odds endpoint.
// ──────────────────────────────────────────────

import { prisma } from '@/lib/prisma';

// ── Exported types ────────────────────────────
export interface OddsOutcome {
  name: string;
  price: number;
  point: number | null; // handicap or total threshold
}

export interface NormalizedMarket {
  marketKey: string;
  marketLabel: string;
  category: 'main' | 'goals' | 'defense';
  bookmaker: string;
  outcomes: OddsOutcome[];
}

export interface NormalizedMatchOdds {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  markets: NormalizedMarket[];
}

// ── Raw Sportmonks response shapes ────────────
interface SportmonksOdd {
  id: number;
  fixture_id: number;
  market_id: number;
  name: string;           // outcome name: 'Home', 'Away', 'Yes', 'No', …
  value: string;          // decimal odds as string, e.g. '1.85'
  total: number | null;   // threshold for totals / exact-goals markets
  handicap: number | null;// line for spread / handicap markets
  market_description?: string;
  market?: { id: number; name: string };
  bookmaker?: { id: number; name: string };
}

interface SportmonksResponse {
  data: SportmonksOdd[];
  message?: string;
}

// ── Market ID → internal key mapping ──────────
// Target market IDs the user wants to monitor:
//   1   Fulltime Result (H2H)
//   10  Draw No Bet
//   14  Both Teams To Score (BTTS)
//   18  Home Team Exact Goals
//   19  Away Team Exact Goals
//   50  Clean Sheet Home
//   51  Clean Sheet Away
const MARKET_ID_TO_KEY: Record<number, string> = {
  1:  'h2h',
  10: 'draw_no_bet',
  14: 'btts',
  18: 'totals_home',
  19: 'totals_away',
  50: 'clean_sheet_home',
  51: 'clean_sheet_away',
};

const MARKET_KEY_CATEGORY: Record<string, 'main' | 'goals' | 'defense'> = {
  h2h:             'main',
  draw_no_bet:     'main',
  btts:            'main',
  totals_home:     'goals',
  totals_away:     'goals',
  clean_sheet_home:'defense',
  clean_sheet_away:'defense',
};

const MARKET_KEY_LABEL: Record<string, string> = {
  h2h:              'Fulltime Result (1X2)',
  draw_no_bet:      'Draw No Bet',
  btts:             'Both Teams to Score',
  totals_home:      'Home Team Exact Goals',
  totals_away:      'Away Team Exact Goals',
  clean_sheet_home: 'Clean Sheet – Home',
  clean_sheet_away: 'Clean Sheet – Away',
};

// ── Fetch pre-match odds for a single fixture ──
export async function fetchSportmonksOdds(
  fixtureId: number,
): Promise<SportmonksOdd[]> {
  const apiToken = process.env.SPORTMONKS_API_KEY;
  if (!apiToken) throw new Error('SPORTMONKS_API_KEY not configured');

  const url =
    `https://api.sportmonks.com/v3/football/odds/pre-match/fixtures/${fixtureId}`
    + `?api_token=${apiToken}`
    + '&include=market;bookmaker';

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sportmonks API error ${res.status} for fixture ${fixtureId}: ${body}`);
  }

  const json: SportmonksResponse = await res.json();

  if (!Array.isArray(json.data)) {
    throw new Error(
      `Sportmonks returned no data array for fixture ${fixtureId}`
      + (json.message ? ` — ${json.message}` : ''),
    );
  }

  return json.data;
}

// ── Normalise raw Sportmonks odds → our structure ──
export function normalizeSportmonksOdds(
  raw: SportmonksOdd[],
  fixtureId: number,
  homeTeam: string,
  awayTeam: string,
): NormalizedMatchOdds {
  // Group by market_id, picking the first bookmaker's entry per market
  const marketMap = new Map<number, { bookmaker: string; outcomes: OddsOutcome[]; desc: string }>();

  for (const odd of raw) {
    const mkId = odd.market_id;
    if (!marketMap.has(mkId)) {
      const desc = odd.market_description
        || odd.market?.name
        || MARKET_KEY_LABEL[MARKET_ID_TO_KEY[mkId]]
        || `Market ${mkId}`;
      marketMap.set(mkId, { bookmaker: odd.bookmaker?.name ?? 'Sportmonks', outcomes: [], desc });
    }

    const entry = marketMap.get(mkId)!;
    const point = odd.handicap ?? odd.total ?? null;

    // Avoid duplicate outcomes within the same market
    if (!entry.outcomes.some((o) => o.name === odd.name && o.point === point)) {
      entry.outcomes.push({
        name: odd.name,
        price: parseFloat(odd.value),
        point,
      });
    }
  }

  const markets: NormalizedMarket[] = [];
  for (const [mkId, data] of marketMap) {
    const key = MARKET_ID_TO_KEY[mkId] || `market_${mkId}`;
    markets.push({
      marketKey: key,
      marketLabel: data.desc,
      category: MARKET_KEY_CATEGORY[key] || 'main',
      bookmaker: data.bookmaker,
      outcomes: data.outcomes,
    });
  }

  return {
    fixtureId,
    homeTeam,
    awayTeam,
    markets,
  };
}

// ── Sync all matches from DB → Sportmonks ─────
export async function syncAllSportmonksOdds(): Promise<{
  fixturesFetched: number;
  oddsInserted: number;
  errors: string[];
}> {
  // 1. Get all matches from DB with an apiMatchId
  const matches = await prisma.match.findMany({
    where: { apiMatchId: { not: 0 } },
    select: { id: true, apiMatchId: true, homeTeam: true, awayTeam: true },
  });

  let oddsInserted = 0;
  const errors: string[] = [];

  for (const match of matches) {
    try {
      const raw = await fetchSportmonksOdds(match.apiMatchId);
      const normalized = normalizeSportmonksOdds(raw, match.apiMatchId, match.homeTeam, match.awayTeam);

      // Upsert each outcome into MarketOdds
      for (const market of normalized.markets) {
        for (const outcome of market.outcomes) {
          // Delete stale row
          await prisma.marketOdds.deleteMany({
            where: {
              gameId: match.id,
              marketKey: market.marketKey,
              outcomeName: outcome.name,
              point: outcome.point ?? undefined,
            },
          });

          await prisma.marketOdds.create({
            data: {
              gameId: match.id,
              marketKey: market.marketKey,
              outcomeName: outcome.name,
              point: outcome.point,
              odds: outcome.price,
              bookmakerKey: market.bookmaker,
            },
          });
          oddsInserted++;
        }
      }
    } catch (e: any) {
      errors.push(`Fixture ${match.apiMatchId} (${match.homeTeam} v ${match.awayTeam}): ${e.message}`);
    }
  }

  return { fixturesFetched: matches.length, oddsInserted, errors };
}

// ── User-facing single-fixture fetch (for API route) ──
export async function fetchSportmonksByFixtureId(
  fixtureId: number,
): Promise<NormalizedMatchOdds | null> {
  const match = await prisma.match.findUnique({
    where: { apiMatchId: fixtureId },
    select: { id: true, apiMatchId: true, homeTeam: true, awayTeam: true },
  });
  if (!match) return null;

  const raw = await fetchSportmonksOdds(fixtureId);
  return normalizeSportmonksOdds(raw, fixtureId, match.homeTeam, match.awayTeam);
}
