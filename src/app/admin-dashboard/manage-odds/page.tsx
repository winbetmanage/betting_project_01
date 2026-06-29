'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, ChevronDown, ChevronRight, Goal, Gauge, Dice1, Swords, CircleDot, Zap, Crosshair, Shield, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import countries from '@/lib/countries.json';
import schedule from '@/lib/full_game_schedule2.json';

const countryFlagMap = Object.fromEntries(
  countries.map((c: { name: string; flag: string }) => [c.name, c.flag])
);

// ── Types ──────────────────────────────────────
type ScheduleEntry = (typeof schedule)[number];

interface OddsTable {
  homeTeamOdds: number | null;
  awayTeamOdds: number | null;
  drawOdds: number | null;
}

interface MarketOddsRow {
  id: string;
  marketKey: string;
  outcomeName: string;
  point: number | null;
  odds: number;
  bookmakerKey: string;
}

interface DbMatch {
  id: string;
  apiMatchId: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  stage: string;
  status: string;
  gameOddsTable: OddsTable | null;
  marketOdds: MarketOddsRow[];
}

interface DisplayMatch {
  scheduleIdx: number;
  matchId: number;          // from schedule
  homeTeam: string;
  awayTeam: string;
  date: string;
  timeLocal: string;
  stage: string;
  group: string;
  dbMatch: DbMatch | null;  // null when DB record missing
}

// ── Market category grouping ──────────────────
const MARKET_CATEGORY: Record<string, 'main' | 'goals' | 'defense'> = {
  h2h:'main', draw_no_bet:'main', btts:'main',
  totals_home:'goals', totals_away:'goals',
  clean_sheet_home:'defense', clean_sheet_away:'defense',
};

const CATEGORY_ORDER: ('main' | 'goals' | 'defense')[] = ['main', 'goals', 'defense'];
const CATEGORY_LABEL: Record<string, string> = {
  main:    'Main Match Markets',
  goals:   'Goal Line Markets',
  defense: 'Defense & Clean Sheet Markets',
};
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  main:    <Swords className="size-4" />,
  goals:   <Goal className="size-4" />,
  defense: <Shield className="size-4" />,
};

// Human-readable labels for each market key
const marketLabels: Record<string, string> = {
  h2h: 'Fulltime Result (1X2)  [ID 1]',
  draw_no_bet: 'Draw No Bet  [ID 10]',
  btts: 'Both Teams to Score  [ID 14]',
  totals_home: 'Home Team Exact Goals  [ID 18]',
  totals_away: 'Away Team Exact Goals  [ID 19]',
  clean_sheet_home: 'Clean Sheet – Home  [ID 50]',
  clean_sheet_away: 'Clean Sheet – Away  [ID 51]',
};

const marketIcons: Record<string, React.ReactNode> = {
  h2h: <Swords className="size-3.5" />,
  draw_no_bet: <Zap className="size-3.5" />,
  btts: <Goal className="size-3.5" />,
  totals_home: <Gauge className="size-3.5" />,
  totals_away: <Gauge className="size-3.5" />,
  clean_sheet_home: <Shield className="size-3.5" />,
  clean_sheet_away: <Shield className="size-3.5" />,
};

function getMarketIcon(key: string): React.ReactNode {
  return marketIcons[key] ?? <Crosshair className="size-3.5" />;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = keyFn(item);
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

function formatScheduleDate(date: string, time: string) {
  const d = new Date(date + 'T' + time);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Component ──────────────────────────────────
export default function ManageOddsPage() {
  const [displayMatches, setDisplayMatches] = useState<DisplayMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Legacy h2h edit dialog
  const [h2hDialogOpen, setH2hDialogOpen] = useState(false);
  const [editingDbId, setEditingDbId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [homeOdds, setHomeOdds] = useState('');
  const [awayOdds, setAwayOdds] = useState('');
  const [drawOdds, setDrawOdds] = useState('');

  // MarketOdds inline edit
  const [editOddsId, setEditOddsId] = useState<string | null>(null);
  const [editOddsValue, setEditOddsValue] = useState('');

  // ── Load schedule + merge odds ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/odds');
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const dbMatches: DbMatch[] = await res.json();
        const oddsByApiId = new Map<number, DbMatch>();
        for (const m of dbMatches) {
          oddsByApiId.set(m.apiMatchId, m);
        }

        const merged: DisplayMatch[] = schedule.map((entry, idx) => ({
          scheduleIdx: idx,
          matchId: entry.matchId,
          homeTeam: entry.homeTeam,
          awayTeam: entry.awayTeam,
          date: entry.date,
          timeLocal: entry.timeLocal,
          stage: entry.group ? `${entry.stage} - Group ${entry.group}` : entry.stage,
          group: entry.group ?? '',
          dbMatch: oddsByApiId.get(entry.matchId) ?? null,
        }));

        setDisplayMatches(merged);
        setLoading(false);
      } catch (err: any) {
        setFetchError(err.message);
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleExpand = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Legacy h2h editor ──
  const openH2hEditor = useCallback((dm: DisplayMatch) => {
    if (!dm.dbMatch) return;
    setEditingDbId(dm.dbMatch.id);
    setEditingLabel(`${dm.homeTeam} vs ${dm.awayTeam}`);
    const odds = dm.dbMatch.gameOddsTable;
    setHomeOdds(odds?.homeTeamOdds?.toString() ?? '');
    setAwayOdds(odds?.awayTeamOdds?.toString() ?? '');
    setDrawOdds(odds?.drawOdds?.toString() ?? '');
    setH2hDialogOpen(true);
  }, []);

  async function handleH2hSave() {
    if (!editingDbId) return;
    setSavingId(editingDbId);
    try {
      const res = await fetch('/api/admin/odds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: editingDbId,
          homeTeamOdds: homeOdds ? parseFloat(homeOdds) : null,
          awayTeamOdds: awayOdds ? parseFloat(awayOdds) : null,
          drawOdds: drawOdds ? parseFloat(drawOdds) : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setDisplayMatches((prev) =>
        prev.map((dm) =>
          dm.dbMatch?.id === editingDbId
            ? { ...dm, dbMatch: { ...dm.dbMatch, gameOddsTable: updated } }
            : dm
        )
      );
      setH2hDialogOpen(false);
      setEditingDbId(null);
    } catch {
      toast.error('Failed to save odds');
    } finally {
      setSavingId(null);
    }
  }

  // ── MarketOdds inline save ──
  async function handleMarketOddsSave(id: string, currentOdds: number) {
    const val = editOddsValue ? parseFloat(editOddsValue) : currentOdds;
    if (val <= 0) return;
    setSavingId(id);
    try {
      const res = await fetch('/api/admin/odds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketOddsId: id, odds: val }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setDisplayMatches((prev) =>
        prev.map((dm) =>
          dm.dbMatch
            ? {
                ...dm,
                dbMatch: {
                  ...dm.dbMatch,
                  marketOdds: dm.dbMatch.marketOdds.map((o) =>
                    o.id === id ? { ...o, odds: Number(updated.odds) } : o
                  ),
                },
              }
            : dm
        )
      );
      setEditOddsId(null);
      setEditOddsValue('');
    } catch {
      toast.error('Failed to save market odds');
    } finally {
      setSavingId(null);
    }
  }

  const stageGroups = useMemo(() => {
    const groups: Record<string, DisplayMatch[]> = {};
    for (const dm of displayMatches) {
      if (!groups[dm.stage]) groups[dm.stage] = [];
      groups[dm.stage].push(dm);
    }
    return groups;
  }, [displayMatches]);

  // ── Render ──
  if (loading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Manage Odds</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {displayMatches.length} World Cup fixtures — click to expand and manage markets
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const btn = document.activeElement as HTMLButtonElement;
            if (btn) btn.disabled = true;
            try {
              const r = await fetch('/api/odds/fetch', { method: 'POST' });
              const d = await r.json();
              if (r.ok) {
                toast.success(d.message || 'Sync complete');
                const res = await fetch('/api/admin/odds');
                if (res.ok) {
                  const dbMatches: DbMatch[] = await res.json();
                  const oddsByApiId = new Map(dbMatches.map((m) => [m.apiMatchId, m]));
                  setDisplayMatches((prev) =>
                    prev.map((dm) => ({
                      ...dm,
                      dbMatch: oddsByApiId.get(dm.matchId) ?? dm.dbMatch,
                    }))
                  );
                }
              } else {
                toast.error(d.error || 'Sync failed');
              }
            } catch {
              toast.error('Sync failed — network error');
            }
            if (btn) btn.disabled = false;
          }}
        >
          Sync from API
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Could not load odds from database</p>
          <p className="mt-1 text-red-600">{fetchError}</p>
          <p className="mt-2 text-xs text-red-500">Showing schedule-only view. Odds data will appear after DB connection is restored.</p>
        </div>
      )}

      {/* Fixtures by stage */}
      {Object.entries(stageGroups).map(([stage, matches]) => (
        <div key={stage}>
          <h2 className="mb-3 text-lg font-bold text-zinc-800">{stage}</h2>
          <div className="space-y-2">
            {matches.map((dm) => {
              const key = `m-${dm.matchId}`;
              const isOpen = expanded.has(key);
              const h2h = dm.dbMatch?.gameOddsTable ?? null;
              const marketOdds = dm.dbMatch?.marketOdds ?? [];
              const grouped = groupBy(marketOdds, (r) => r.marketKey);
              const marketCount = Object.keys(grouped).length;

              return (
                <div key={key} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleExpand(key)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-zinc-50"
                  >
                    <div className="shrink-0 text-zinc-400">
                      {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </div>

                    {/* Flags + teams */}
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {countryFlagMap[dm.homeTeam as keyof typeof countryFlagMap] && (
                        <Image src={`/flags/${countryFlagMap[dm.homeTeam as keyof typeof countryFlagMap]}`} alt="" width={20} height={14} className="h-3.5 w-5 shrink-0 object-cover" />
                      )}
                      <span className="truncate text-sm font-semibold text-zinc-800">{dm.homeTeam}</span>
                      <span className="text-xs text-zinc-400 shrink-0">v</span>
                      {countryFlagMap[dm.awayTeam as keyof typeof countryFlagMap] && (
                        <Image src={`/flags/${countryFlagMap[dm.awayTeam as keyof typeof countryFlagMap]}`} alt="" width={20} height={14} className="h-3.5 w-5 shrink-0 object-cover" />
                      )}
                      <span className="truncate text-sm font-semibold text-zinc-800">{dm.awayTeam}</span>
                    </div>

                    {/* Date/time */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                      <Calendar className="size-3" />
                      {formatScheduleDate(dm.date, dm.timeLocal)}
                    </div>

                    {/* Quick h2h odds */}
                    <div className="hidden lg:flex items-center gap-1.5 text-xs">
                      {h2h?.homeTeamOdds != null && (
                        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-medium text-zinc-700">1: ×{h2h.homeTeamOdds}</span>
                      )}
                      {h2h?.drawOdds != null && (
                        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-medium text-zinc-700">X: ×{h2h.drawOdds}</span>
                      )}
                      {h2h?.awayTeamOdds != null && (
                        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-medium text-zinc-700">2: ×{h2h.awayTeamOdds}</span>
                      )}
                    </div>

                    {/* Market count badge */}
                    {dm.dbMatch ? (
                      <span className="shrink-0 rounded-full bg-primarycolor/10 px-2.5 py-0.5 text-xs font-semibold text-primarycolor">
                        {marketCount} markets
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                        no odds
                      </span>
                    )}

                    {/* Edit h2h button */}
                    {dm.dbMatch && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openH2hEditor(dm); }}
                        className="shrink-0"
                      >
                        <Pencil className="size-3.5" />
                        <span className="hidden sm:inline ml-1">1X2</span>
                      </Button>
                    )}
                  </button>

                  {/* Accordion Panel */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-zinc-100"
                      >
                        {!dm.dbMatch ? (
                          <div className="px-5 py-8 text-center text-sm text-zinc-400">
                            This fixture is not yet in the database. Run the seed script{' '}
                            (<code className="text-xs bg-zinc-100 px-1 rounded">npm run seed</code>)
                            {' '}or sync from Sportmonks to see odds.
                          </div>
                        ) : marketCount === 0 ? (
                          <div className="px-5 py-8 text-center text-sm text-zinc-400">
                            No market odds loaded. Click "Sync from API" to fetch from Sportmonks.
                          </div>
                        ) : (
                          <div className="divide-y divide-zinc-100">
                            {(() => {
                              const byCategory: Record<string, [string, MarketOddsRow[]][]> = {};
                              for (const cat of CATEGORY_ORDER) {
                                const entries = Object.entries(grouped).filter(
                                  ([k]) => (MARKET_CATEGORY[k] || 'main') === cat
                                );
                                if (entries.length) byCategory[cat] = entries;
                              }

                              return CATEGORY_ORDER.flatMap((cat) => {
                                const entries = byCategory[cat];
                                if (!entries) return [];

                                return [
                                  <div key={cat} className="px-5 py-4">
                                    <div className="mb-3 flex items-center gap-2">
                                      <span className="text-purple-600">{CATEGORY_ICON[cat]}</span>
                                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                                        {CATEGORY_LABEL[cat]}
                                      </span>
                                    </div>
                                    <div className="space-y-3">
                                      {entries.map(([marketKey, rows]) => (
                                        <div key={marketKey}>
                                          <div className="mb-1.5 flex items-center gap-2">
                                            <span className="text-primarycolor">{getMarketIcon(marketKey)}</span>
                                            <span className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                                              {marketLabels[marketKey] || marketKey.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-xs text-zinc-400">· {rows[0].bookmakerKey}</span>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {rows.map((row) => (
                                              <div key={row.id} className="group relative rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm shadow-sm transition hover:border-primarycolor/40">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium text-zinc-800">
                                                    {row.outcomeName}
                                                    {row.point != null && (
                                                      <span className="ml-1 font-mono text-xs text-zinc-500">{row.point}</span>
                                                    )}
                                                  </span>
                                                  <span className="font-semibold text-primarycolor">×{Number(row.odds).toFixed(2)}</span>

                                                  {editOddsId === row.id ? (
                                                    <div className="flex items-center gap-1">
                                                      <Input type="number" step="0.01" min="1.01" value={editOddsValue}
                                                        onChange={(e) => setEditOddsValue(e.target.value)}
                                                        className="h-7 w-20 text-xs" autoFocus />
                                                      <Button size="xs" variant="default"
                                                        onClick={() => handleMarketOddsSave(row.id, Number(row.odds))}
                                                        disabled={savingId === row.id} className="h-7 px-2 text-xs">Save</Button>
                                                      <Button size="xs" variant="outline"
                                                        onClick={() => { setEditOddsId(null); setEditOddsValue(''); }}
                                                        className="h-7 px-2 text-xs">Cancel</Button>
                                                    </div>
                                                  ) : (
                                                    <button onClick={() => { setEditOddsId(row.id); setEditOddsValue(String(Number(row.odds))); }}
                                                      className="opacity-0 group-hover:opacity-100 transition text-zinc-400 hover:text-zinc-600">
                                                      <Pencil className="size-3" />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>,
                                ];
                              });
                            })()}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Legacy h2h Edit Dialog ── */}
      <Dialog open={h2hDialogOpen} onOpenChange={setH2hDialogOpen}>
        {editingDbId && (
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>{editingLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Home Odds</label>
                <Input type="number" step="0.01" min="1.01" value={homeOdds} onChange={(e) => setHomeOdds(e.target.value)} placeholder="e.g. 2.10" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Draw Odds</label>
                <Input type="number" step="0.01" min="1.01" value={drawOdds} onChange={(e) => setDrawOdds(e.target.value)} placeholder="e.g. 3.40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Away Odds</label>
                <Input type="number" step="0.01" min="1.01" value={awayOdds} onChange={(e) => setAwayOdds(e.target.value)} placeholder="e.g. 3.80" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={handleH2hSave} disabled={savingId === editingDbId}>
                {savingId === editingDbId ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
