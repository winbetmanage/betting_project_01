'use client';

import { useEffect, useState } from 'react';
import { Lock, Unlock, Calendar } from 'lucide-react';

type Outcome = { id: string; name: string; odds: string };

type Market = {
  id: string;
  name: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  match: { id: string; homeTeam: string; awayTeam: string; kickoffTime: string; stage: string };
  outcomes: Outcome[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/markets')
      .then((r) => r.json())
      .then(setMarkets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Markets</h1>
        <p className="mt-1 text-sm text-zinc-500">All betting markets and their outcomes</p>
      </div>

      {markets.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400 shadow-sm">
          No markets created yet
        </div>
      ) : (
        <div className="space-y-4">
          {markets.map((market) => (
            <div key={market.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900">{market.name}</h3>
                    {market.isLocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                        <Lock className="size-3" /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600">
                        <Unlock className="size-3" /> Open
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {market.match.homeTeam} vs {market.match.awayTeam}
                    <span className="mx-1.5">·</span>
                    <Calendar className="mr-0.5 inline-block size-3" />
                    {formatDate(market.match.kickoffTime)}
                    <span className="mx-1.5">·</span>
                    {market.match.stage}
                  </p>
                </div>
                <span className="text-xs text-zinc-400">{market.outcomes.length} outcomes</span>
              </div>

              {/* Outcomes */}
              <div className="px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {market.outcomes.map((outcome) => (
                    <div
                      key={outcome.id}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm shadow-sm"
                    >
                      <div className="font-medium text-zinc-800">{outcome.name}</div>
                      <div className="mt-0.5 text-xs font-semibold text-primarycolor">×{Number(outcome.odds).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
