import { prisma } from '@/lib/prisma';

const TARGET_MARKETS = [
  'h2h',
  'alternate_spreads',
  'btts',
  'double_chance',
  'draw_no_bet',
  'h2h_h1',
  'h2h_h2',
  'alternate_totals',
  'spreads',
  'totals',
  'totals_h1',
  'h2h_lay',
  'spreads_h1',
] as const;

const marketLabels: Record<string, string> = {
  h2h: '1X2 (Moneyline)',
  alternate_spreads: 'Alternate Spreads',
  btts: 'Both Teams to Score',
  double_chance: 'Double Chance',
  draw_no_bet: 'Draw No Bet',
  h2h_h1: 'Half-Time 1X2',
  h2h_h2: 'Second-Half 1X2',
  alternate_totals: 'Alternate Totals',
  spreads: 'Spreads',
  totals: 'Over / Under',
  totals_h1: 'Half-Time Totals',
  h2h_lay: 'Lay 1X2',
  spreads_h1: 'Half-Time Spreads',
};

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function MarketOddsPage() {
  const odds = await prisma.marketOdds.findMany({
    where: { marketKey: { in: TARGET_MARKETS as unknown as string[] } },
    include: { match: true },
    orderBy: [{ gameId: 'asc' }, { marketKey: 'asc' }],
  });

  const grouped: Record<string, typeof odds> = {};
  for (const row of odds) {
    if (!grouped[row.gameId]) grouped[row.gameId] = [];
    grouped[row.gameId].push(row);
  }

  const matchIds = Object.keys(grouped);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Market Odds</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {matchIds.length} match{matchIds.length !== 1 && 'es'} · {odds.length} odds entries
        </p>
      </div>

      {matchIds.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400 shadow-sm">
          No market odds found
        </div>
      ) : (
        <div className="space-y-6">
          {matchIds.map((gid) => {
            const rows = grouped[gid];
            const match = rows[0].match;

            const byMarket: Record<string, typeof rows> = {};
            for (const r of rows) {
              if (!byMarket[r.marketKey]) byMarket[r.marketKey] = [];
              byMarket[r.marketKey].push(r);
            }

            return (
              <div
                key={gid}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
              >
                <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                  <h3 className="text-sm font-bold text-zinc-900">
                    {match.homeTeam} vs {match.awayTeam}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDate(match.kickoffTime)} · {match.stage}
                  </p>
                </div>

                <div className="divide-y divide-zinc-100">
                  {Object.entries(byMarket).map(([marketKey, entries]) => (
                    <div key={marketKey} className="px-5 py-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {marketLabels[marketKey] ?? marketKey}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entries.map((e, i) => (
                          <div
                            key={`${e.id}-${i}`}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm shadow-sm"
                          >
                            <div className="font-medium text-zinc-800">
                              {e.outcomeName}
                              {e.point != null && (
                                <span className="ml-1 text-xs text-zinc-400">({Number(e.point)})</span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs font-semibold text-amber-600">
                              ×{Number(e.odds).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
