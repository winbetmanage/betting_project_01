import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import countries from '@/lib/countries.json';
import fs from 'fs';
import path from 'path';
import { FetchOddsButton } from './fetch-odds-button';
import { MarketSections } from './market-sections';
import { ToggleBettingButton } from './toggle-betting-button';

const countryFlagMap = Object.fromEntries(
  countries.map((c) => [c.name, c.flag])
);

function formatDate(d: Date) {
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const now = new Date();
  const diff = d.getTime() - now.getTime();

  if (diff <= 0) return dateStr;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return `${dateStr} (in ${parts.join(' ')})`;
}

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      gameOddsTable: true,
      marketOdds: { orderBy: [{ marketKey: 'asc' }, { outcomeName: 'asc' }] },
      _count: { select: { bets: true } },
      h2hRecords: true,
      bttsRecords: true,
      totalsRecords: true,
      doubleChanceRecords: true,
      noBetRecords: true,
      spreadRecords: true,
    },
  });

  if (!match) notFound();

  const oddsFile = path.join(process.cwd(), 'src', 'lib', 'game_odd_details', `${match.apiMatchId}.json`);
  const hasExistingOddsFile = fs.existsSync(oddsFile);

  const homeFlag = countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
  const awayFlag = countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];
  const ot = match.gameOddsTable;

  const groupedMarkets = match.marketOdds.reduce<Record<string, typeof match.marketOdds>>((acc, mo) => {
    if (!acc[mo.marketKey]) acc[mo.marketKey] = [];
    acc[mo.marketKey].push(mo);
    return acc;
  }, {});

  let fileMarketKeys: string[] | null = null;
  let firstOutcomes: { key: string; outcomes: { name: string; price: number; point: number | null; _idx: number }[] }[] | null = null;
  if (hasExistingOddsFile) {
    try {
      const raw = JSON.parse(fs.readFileSync(oddsFile, 'utf-8'));
      const bookmakers = Array.isArray(raw.bookmakers) ? raw.bookmakers : [];
      const seenKeys = new Set<string>();
      const keys: string[] = [];
      const outcomes: { key: string; outcomes: { name: string; price: number; point: number | null; _idx: number }[] }[] = [];
      for (const bm of bookmakers) {
        const markets = Array.isArray(bm.markets) ? bm.markets : [];
        for (const m of markets) {
          if (m.key && !seenKeys.has(m.key)) {
            seenKeys.add(m.key);
            keys.push(m.key);
            outcomes.push({ key: m.key, outcomes: (m.outcomes || []).map((o: any, i: number) => ({ name: o.name, price: o.price, point: o.point ?? null, _idx: i })) });
          }
        }
      }
      fileMarketKeys = keys;
      firstOutcomes = outcomes;
    } catch {}
  }

  type AddedMarket = { key: string; label: string; details: { label: string; value: string }[] };

  function groupByTypeName<T extends { type_name: string | null }>(records: T[]): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const r of records) {
      const tn = r.type_name || 'unknown';
      if (!groups[tn]) groups[tn] = [];
      groups[tn].push(r);
    }
    return groups;
  }

  const marketLabels: Record<string, string> = {
    h2h: 'Fulltime Result (1X2)',
    h2h_lay: 'Lay Fulltime Result',
    h2h_h1: 'Half-Time Result (H1)',
    h2h_h2: 'Second-Half Result (H2)',
    btts: 'Both Teams to Score',
    totals: 'Totals',
    totals_h1: 'Half-Time Totals (H1)',
    alternate_totals: 'Alternate Totals',
    double_chance: 'Double Chance',
    draw_no_bet: 'Draw No Bet',
    spreads: 'Spreads',
    spreads_h1: 'Half-Time Spreads (H1)',
    alternate_spreads: 'Alternate Spreads',
  };

  const addedMarkets: AddedMarket[] = [];

  for (const [tn, records] of Object.entries(groupByTypeName(match.h2hRecords))) {
    const r = records[0];
    addedMarkets.push({
      key: tn,
      label: marketLabels[tn] || tn,
      details: [
        { label: 'Home', value: `×${Number(r.home_wins).toFixed(2)}` },
        { label: 'Draw', value: `×${Number(r.draw).toFixed(2)}` },
        { label: 'Away', value: `×${Number(r.away_wins).toFixed(2)}` },
      ],
    });
  }

  if (match.bttsRecords.length > 0) {
    const r = match.bttsRecords[0];
    addedMarkets.push({
      key: 'btts',
      label: marketLabels.btts,
      details: [
        { label: 'Yes', value: `×${Number(r.yes).toFixed(2)}` },
        { label: 'No', value: `×${Number(r.no).toFixed(2)}` },
      ],
    });
  }

  for (const [tn, records] of Object.entries(groupByTypeName(match.totalsRecords))) {
    if (tn === 'alternate_totals') {
      addedMarkets.push({
        key: tn,
        label: marketLabels[tn] || tn,
        details: records.map((r) => {
          const pt = Number(r.point);
          const label = Number(r.over) > 0 ? `Over ${pt}` : `Under ${pt}`;
          const value = Number(r.over) > 0 ? Number(r.over) : Number(r.under);
          return { label, value: `×${value.toFixed(2)}` };
        }),
      });
    } else {
      const r = records[0];
      addedMarkets.push({
        key: tn,
        label: marketLabels[tn] || tn,
        details: [
          { label: `Over ${Number(r.point)}`, value: `×${Number(r.over).toFixed(2)}` },
          { label: `Under ${Number(r.point)}`, value: `×${Number(r.under).toFixed(2)}` },
        ],
      });
    }
  }

  if (match.doubleChanceRecords.length > 0) {
    const r = match.doubleChanceRecords[0];
    addedMarkets.push({
      key: 'double_chance',
      label: marketLabels.double_chance,
      details: [
        { label: 'Home or Draw', value: `×${Number(r.home_draw).toFixed(2)}` },
        { label: 'Away or Draw', value: `×${Number(r.away_draw).toFixed(2)}` },
        { label: 'Home or Away', value: `×${Number(r.home_away).toFixed(2)}` },
      ],
    });
  }

  if (match.noBetRecords.length > 0) {
    const r = match.noBetRecords[0];
    addedMarkets.push({
      key: 'draw_no_bet',
      label: marketLabels.draw_no_bet,
      details: [
        { label: 'Home', value: `×${Number(r.home).toFixed(2)}` },
        { label: 'Away', value: `×${Number(r.away).toFixed(2)}` },
      ],
    });
  }

  for (const [tn, records] of Object.entries(groupByTypeName(match.spreadRecords))) {
    addedMarkets.push({
      key: tn,
      label: marketLabels[tn] || tn,
      details: records.map((r) => ({
        label: `${r.teams} (${Number(r.points)})`,
        value: `×${Number(r.team).toFixed(2)}`,
      })),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Game Details</h1>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          {homeFlag && <Image src={`/flags/${homeFlag}`} alt="" width={28} height={20} className="h-5 w-7 object-cover" />}
          <span className="text-xl font-bold text-zinc-900">{match.homeTeam}</span>
          <span className="text-sm text-zinc-400">v</span>
          <span className="text-xl font-bold text-zinc-900">{match.awayTeam}</span>
          {awayFlag && <Image src={`/flags/${awayFlag}`} alt="" width={28} height={20} className="h-5 w-7 object-cover" />}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Stage:</span>
            <span className="ml-2 font-medium text-zinc-800">{match.stage}</span>
          </div>
          <div>
            <span className="text-zinc-500">Date:</span>
            <span className="ml-2 font-medium text-zinc-800">{formatDate(match.kickoffTime)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Status:</span>
            <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              match.status === 'UPCOMING' ? 'bg-blue-50 text-blue-700' :
              match.status === 'LIVE' ? 'bg-green-50 text-green-700' :
              match.status === 'FINISHED' ? 'bg-zinc-100 text-zinc-600' :
              'bg-red-50 text-red-700'
            }`}>
              {match.status}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Total Bets:</span>
            <span className="ml-2 font-medium text-zinc-800">{match._count.bets}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Add to Betting:</span>
            <span className={`font-medium ${match.addToBetting ? 'text-green-600' : 'text-zinc-400'}`}>
              {match.addToBetting ? 'Yes' : 'No'}
            </span>
            <ToggleBettingButton matchId={match.id} isInBetting={match.addToBetting} />
          </div>
        </div>
      </div>

      {ot && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-zinc-900">1X2 Odds (Legacy)</h2>
          <div className="flex gap-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-center">
              <div className="text-xs text-zinc-500">Home</div>
              <div className="text-lg font-bold text-zinc-800">{ot.homeTeamOdds != null ? `×${ot.homeTeamOdds}` : '—'}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-center">
              <div className="text-xs text-zinc-500">Draw</div>
              <div className="text-lg font-bold text-zinc-800">{ot.drawOdds != null ? `×${ot.drawOdds}` : '—'}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-center">
              <div className="text-xs text-zinc-500">Away</div>
              <div className="text-lg font-bold text-zinc-800">{ot.awayTeamOdds != null ? `×${ot.awayTeamOdds}` : '—'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <h2 className="text-lg font-bold text-zinc-900">Market Odds</h2>
          <FetchOddsButton matchId={match.id} hasExistingFile={hasExistingOddsFile} />
        </div>
        <MarketSections
          matchId={match.id}
          initialAddedMarkets={addedMarkets}
          fileMarketKeys={fileMarketKeys}
          firstOutcomes={firstOutcomes}
        />
      </div>

    </div>
  );
}
