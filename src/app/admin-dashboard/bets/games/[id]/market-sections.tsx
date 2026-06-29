'use client';

import { useEffect } from 'react';
import { useMarketStore } from '@/stores/market-store';
import { AddToMarketButton } from './add-to-market-button';
import { RemoveFromMarketButton } from './remove-from-market-button';

type AddedMarket = { key: string; label: string; details: { label: string; value: string }[] };
type FirstOutcome = { key: string; outcomes: { name: string; price: number; point: number | null; _idx: number }[] };

export function MarketSections({
  matchId,
  initialAddedMarkets,
  fileMarketKeys,
  firstOutcomes,
}: {
  matchId: string;
  initialAddedMarkets: AddedMarket[];
  fileMarketKeys: string[] | null;
  firstOutcomes: FirstOutcome[] | null;
}) {
  const addedMarkets = useMarketStore((s) => s.addedMarkets);
  const addedKeys = useMarketStore((s) => s.addedKeys);
  const setAddedKeys = useMarketStore((s) => s.setAddedKeys);
  const setAddedMarkets = useMarketStore((s) => s.setAddedMarkets);

  useEffect(() => {
    setAddedMarkets(initialAddedMarkets);
    setAddedKeys(initialAddedMarkets.map((m) => m.key));
  }, [initialAddedMarkets]);

  if (!fileMarketKeys || fileMarketKeys.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-zinc-400">
        No market odds have been fetched yet for this game
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Available market types */}
      <div>
        <p className="mb-3 text-sm text-zinc-500">Available market types from fetched odds:</p>
        <div className="flex flex-wrap gap-2">
          {fileMarketKeys.map((key) => (
            <span key={key} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-medium text-zinc-700">
              {key}
            </span>
          ))}
        </div>
      </div>

      {/* Already added to markets */}
      {addedMarkets.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">Already added to markets:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addedMarkets.map((m) => (
              <div key={m.key} className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-green-700">{m.label}</h4>
                  <RemoveFromMarketButton matchId={matchId} marketKey={m.key} />
                </div>
                <div className="space-y-1">
                  {m.details.map((d, i) => (
                    <div key={`${d.label}-${i}`} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-700">{d.label}</span>
                      <span className="font-semibold text-zinc-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* First bookmaker odds */}
      {firstOutcomes && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">First bookmaker odds per market:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {firstOutcomes.map((item) => (
              <div key={item.key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{item.key}</h4>
                  {addedKeys[item.key] ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Added</span>
                  ) : (
                    <AddToMarketButton matchId={matchId} marketKey={item.key} />
                  )}
                </div>
                <div className="space-y-1">
                  {item.outcomes.map((o) => (
                    <div key={`${item.key}-${o._idx}`} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-700">{o.name}{o.point != null ? ` (${o.point})` : ''}</span>
                      <span className="font-semibold text-zinc-900">×{o.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
