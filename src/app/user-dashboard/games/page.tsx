'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/common_components/Navbar';
import { Swords, Check, AlertTriangle, Clock, Target, Wallet, X, Plus, Minus, Coins, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import countries from '@/lib/countries.json';

const countryFlagMap = Object.fromEntries(
  countries.map((c: { name: string; flag: string }) => [c.name, c.flag])
);

// ─── Types ──────────────────────────────────────

type MarketOddsItem = {
  id: string;
  marketKey: string;
  outcomeName: string;
  point: number | null;
  odds: number;
  bookmakerKey: string;
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  stage: string;
  status: string;
  gameOddsTable: { homeTeamOdds: number | null; awayTeamOdds: number | null; drawOdds: number | null } | null;
  marketOdds: MarketOddsItem[];
};

type UserBet = {
  id: string;
  matchId: string | null;
  typeofBet: string | null;
  stake: string;
  potentialPayout: string;
  cumulativeOdds: string | null;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOIDED';
  createdAt: string;
  match: { id: string; homeTeam: string; awayTeam: string; kickoffTime: string } | null;
  selections: {
    id: string;
    matchId: string;
    marketKey: string | null;
    typeofBet: string;
    point: string | null;
    outcomeName: string | null;
    oddsAtBet: string;
    status: string;
    match: { homeTeam: string; awayTeam: string; kickoffTime: string };
  }[];
};

type Selection = {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  marketKey: string;
  outcomeName: string;
  point: number | null;
  odds: number;
  typeofBet: string;
  label: string;
};

// ─── Market Display Config ──────────────────────

const marketConfig: Record<string, { label: string; cols: number }> = {
  h2h: { label: 'Match Result', cols: 3 },
  btts: { label: 'Both Teams to Score', cols: 2 },
  double_chance: { label: 'Double Chance', cols: 3 },
  draw_no_bet: { label: 'Draw No Bet', cols: 2 },
  totals: { label: 'Totals', cols: 2 },
  spreads: { label: 'Spreads', cols: 2 },
  totals_home: { label: 'Home Totals', cols: 2 },
  totals_away: { label: 'Away Totals', cols: 2 },
  totals_h1: { label: '1st Half Totals', cols: 2 },
  totals_h2: { label: '2nd Half Totals', cols: 2 },
  spreads_h1: { label: '1st Half Spreads', cols: 2 },
  spreads_h2: { label: '2nd Half Spreads', cols: 2 },
  h2h_h1: { label: '1st Half Winner', cols: 3 },
  h2h_h2: { label: '2nd Half Winner', cols: 3 },
  alternate_totals: { label: 'Alternate Totals', cols: 2 },
  alternate_spreads: { label: 'Alternate Spreads', cols: 2 },
  player_anytime_td: { label: 'Anytime TD Scorer', cols: 3 },
  player_1st_td: { label: '1st TD Scorer', cols: 3 },
  player_last_td: { label: 'Last TD Scorer', cols: 3 },
};

const marketOrder = [
  'h2h', 'btts', 'double_chance', 'draw_no_bet',
  'totals', 'spreads', 'totals_home', 'totals_away',
  'totals_h1', 'totals_h2', 'spreads_h1', 'spreads_h2',
  'h2h_h1', 'h2h_h2', 'alternate_totals', 'alternate_spreads',
  'player_anytime_td', 'player_1st_td', 'player_last_td',
];

// ─── Helpers ────────────────────────────────────

function toTypeofBet(marketKey: string, outcomeName: string): string {
  const mapping: Record<string, Record<string, string>> = {
    h2h: { Home: 'HOME_WINS', Draw: 'DRAW', Away: 'AWAY_WINS' },
    btts: { Yes: 'BOTH_TEAMS_TO_SCORE_YES', No: 'BOTH_TEAMS_TO_SCORE_NO' },
    double_chance: { 'Home or Draw': 'HOME_WINS_OR_DRAW', 'Home or Away': 'HOME_OR_AWAY', 'Away or Draw': 'AWAY_WINS_OR_DRAW' },
    draw_no_bet: { Home: 'HOME_WINS', Away: 'AWAY_WINS' },
    totals: { Over: 'OVER', Under: 'UNDER' },
    spreads: { Home: 'HOME_COVER', Away: 'AWAY_COVER' },
    totals_home: { Over: 'OVER', Under: 'UNDER' },
    totals_away: { Over: 'OVER', Under: 'UNDER' },
    totals_h1: { Over: 'OVER', Under: 'UNDER' },
    totals_h2: { Over: 'OVER', Under: 'UNDER' },
    spreads_h1: { Home: 'HOME_COVER', Away: 'AWAY_COVER' },
    spreads_h2: { Home: 'HOME_COVER', Away: 'AWAY_COVER' },
    h2h_h1: { Home: 'HT_HOME_WINS', Draw: 'HT_DRAW', Away: 'HT_AWAY_WINS' },
    h2h_h2: { Home: 'HT2_HOME_WINS', Draw: 'HT2_DRAW', Away: 'HT2_AWAY_WINS' },
    alternate_totals: { Over: 'OVER', Under: 'UNDER' },
    alternate_spreads: { Home: 'HOME_COVER', Away: 'AWAY_COVER' },
  };
  const playerMap: Record<string, string> = {
    player_anytime_td: 'ANYTIME_GOALSCORER',
    player_1st_td: 'FIRST_GOALSCORER',
    player_last_td: 'LAST_GOALSCORER',
  };
  return mapping[marketKey]?.[outcomeName] || playerMap[marketKey] || outcomeName.replace(/\s+/g, '_').toUpperCase();
}

function h2hLabel(outcomeName: string): string {
  const map: Record<string, string> = { Home: '1', Draw: 'X', Away: '2' };
  return map[outcomeName] || outcomeName;
}

function marketDescription(marketKey: string, outcomeName: string, point: number | null, homeTeam: string, awayTeam: string): string {
  const pt = point != null ? (point > 0 ? `+${point}` : `${point}`) : null;
  switch (marketKey) {
    case 'h2h':
      if (outcomeName === 'Home') return `${homeTeam} to win`;
      if (outcomeName === 'Draw') return 'Match to end in a draw';
      if (outcomeName === 'Away') return `${awayTeam} to win`;
      return outcomeName;
    case 'btts':
      if (outcomeName === 'Yes') return 'Yes, both teams will score';
      return 'No, both teams will NOT score';
    case 'double_chance':
      if (outcomeName === 'Home or Draw') return `${homeTeam} or Draw`;
      if (outcomeName === 'Away or Draw') return `${awayTeam} or Draw`;
      return `${homeTeam} or ${awayTeam} (no draw)`;
    case 'draw_no_bet':
      if (outcomeName === 'Home') return `${homeTeam} to win (draw refunds)`;
      return `${awayTeam} to win (draw refunds)`;
    case 'alternate_totals':
    case 'totals':
    case 'totals_home':
    case 'totals_away':
    case 'totals_h1':
    case 'totals_h2':
      if (outcomeName === 'Over') return `Total score will be Over ${point}`;
      return `Total score will be Under ${point}`;
    case 'alternate_spreads':
    case 'spreads':
    case 'spreads_h1':
    case 'spreads_h2':
      if (outcomeName === 'Home') return `${homeTeam} ${pt}`;
      return `${awayTeam} ${pt}`;
    case 'h2h_h1':
      if (outcomeName === 'Home') return `${homeTeam} to win 1st half`;
      if (outcomeName === 'Draw') return '1st half to end in a draw';
      return `${awayTeam} to win 1st half`;
    case 'h2h_h2':
      if (outcomeName === 'Home') return `${homeTeam} to win 2nd half`;
      if (outcomeName === 'Draw') return '2nd half to end in a draw';
      return `${awayTeam} to win 2nd half`;
    default:
      return `${marketKey} — ${outcomeName}`;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function selectionId(matchId: string, marketKey: string, outcomeName: string, point: number | null): string {
  return `${matchId}-${marketKey}-${outcomeName}-${point ?? ''}`;
}

// ─── Status helpers ─────────────────────────────

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-400', WON: 'text-green-400', LOST: 'text-red-400', VOIDED: 'text-zinc-500',
};
const statusLabels: Record<string, string> = {
  PENDING: 'Pending', WON: 'Won', LOST: 'Lost', VOIDED: 'Voided',
};
const statusStyles: Record<string, string> = {
  PENDING: 'border-l-yellow-500 bg-yellow-500/5',
  WON: 'border-l-green-500 bg-green-500/5',
  LOST: 'border-l-red-500 bg-red-500/5',
  VOIDED: 'border-l-zinc-600 bg-zinc-600/5',
};

// ─── BettingForm Component (inline) ──────────────

function BettingForm({
  match,
  balance,
  onClose,
  onPlaced,
}: {
  match: Match;
  balance: number;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [stake, setStake] = useState('');
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [marketRows, setMarketRows] = useState<MarketOddsItem[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  // ── Fetch markets from API ─────────────────────
  useEffect(() => {
    setMarketsLoading(true);
    fetch(`/api/matches/${match.id}/markets`)
      .then((r) => r.json())
      .then((data) => {
        if (data.markets) {
          setMarketRows(
            data.markets.map((m: any, i: number) => ({
              id: `${m.marketKey}-${m.outcomeName}-${m.point ?? ''}-${i}`,
              marketKey: m.marketKey,
              outcomeName: m.outcomeName,
              point: m.point,
              odds: m.odds,
              bookmakerKey: '',
            })),
          );
        }
        setMarketsLoading(false);
      })
      .catch(() => setMarketsLoading(false));
  }, [match.id]);

  // Group markets
  const grouped: Record<string, MarketOddsItem[]> = {};
  for (const mo of marketRows) {
    if (!grouped[mo.marketKey]) grouped[mo.marketKey] = [];
    grouped[mo.marketKey].push(mo);
  }

  const availableMarkets = marketOrder.filter((mk) => grouped[mk]?.length > 0);

  // Set first available market as selected when data loads
  useEffect(() => {
    if (!marketsLoading && availableMarkets.length > 0 && !selectedMarket) {
      setSelectedMarket(availableMarkets[0]);
    }
  }, [marketsLoading, availableMarkets]);

  function toggleSelection(sel: Selection) {
    setSelections((prev) => {
      if (prev.length === 0) return [sel];
      if (prev[0].id === sel.id) return [];
      return [sel];
    });
  }

  const selected = selections[0] ?? null;

  async function placeBet() {
    const s = Number(stake);
    if (!s || s <= 0) { toast.error('Enter a valid stake'); return; }
    if (s > balance) { toast.error('Insufficient balance'); return; }
    if (!selected) { toast.error('Select an outcome'); return; }

    setPlacing(true);
    const payload = { type: 'SINGLE', matchId: selected.matchId, typeofBet: selected.typeofBet, marketKey: selected.marketKey, point: selected.point, outcomeName: selected.outcomeName, stake: s };

    try {
      const res = await fetch('/api/bets/place', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `Bet placed! Potential payout: ETB ${data.bet.potentialPayout}` });
        toast.success('Bet placed!');
        onPlaced();
      } else { toast.error(data.error || 'Failed to place bet'); }
    } catch { toast.error('Network error'); } finally { setPlacing(false); }
  }

  if (result) {
    return (
      <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 text-center">
        {result.success ? (
          <div className="mb-2 flex justify-center"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-900/40"><Check className="h-5 w-5 text-green-400" /></div></div>
        ) : (
          <div className="mb-2 flex justify-center"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/40"><AlertTriangle className="h-5 w-5 text-red-400" /></div></div>
        )}
        <p className={`text-sm font-semibold ${result.success ? 'text-green-400' : 'text-red-400'}`}>{result.message}</p>
        <button onClick={onClose} className="mt-3 rounded-lg bg-gray-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-600">Close</button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/80 p-4">
      {marketsLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-zinc-500">Loading markets...</div>
      ) : availableMarkets.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-sm text-zinc-500">No markets available for this match</div>
      ) : (
        <>
          {/* Dropdown: each market shows title + all its choices */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 hover:border-zinc-500 transition"
            >
              <span>{marketConfig[selectedMarket]?.label || selectedMarket}</span>
              <ChevronDown className={`size-4 text-zinc-400 transition ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl divide-y divide-zinc-700">
                  {availableMarkets.map((mk) => {
                    const rows = grouped[mk];
                    const cfg = marketConfig[mk] || { label: mk, cols: 3 };
                    return (
                      <div key={mk} className="p-3">
                        <div className="mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{cfg.label}</span>
                        </div>
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)` }}>
                          {rows.map((row) => {
                            const id = selectionId(match.id, mk, row.outcomeName, row.point);
                            const isSel = selections.some((s) => s.id === id);
                            const desc = marketDescription(mk, row.outcomeName, row.point, match.homeTeam, match.awayTeam);
                            const pointStr = row.point != null ? (row.point > 0 ? `+${row.point}` : `${row.point}`) : null;
                            return (
                              <button
                                key={row.id}
                                type="button"
                                onClick={() => toggleSelection({
                                  id, matchId: match.id, marketKey: mk, outcomeName: row.outcomeName, point: row.point, odds: row.odds,
                                  typeofBet: toTypeofBet(mk, row.outcomeName),
                                  label: desc,
                                  homeTeam: match.homeTeam, awayTeam: match.awayTeam,
                                })}
                                className={`rounded-lg border px-1.5 py-2 text-center text-sm transition ${isSel ? 'border-primarycolor bg-primarycolor/20 text-primarycolor' : 'border-zinc-600 bg-zinc-700/50 text-zinc-400 hover:border-zinc-500'}`}
                              >
                                <div className="text-[11px] leading-tight">{desc}</div>
                                <div className="mt-1 text-xs font-semibold text-primarycolor">{row.odds != null ? row.odds : '—'}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Selections summary + stake */}
          {selected && (
            <div className="space-y-3 border-t border-zinc-700 pt-3">
              <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2">
                <div className="flex-1 text-xs text-zinc-300">{selected.label}</div>
                <span className="text-sm font-semibold text-primarycolor">×{selected.odds}</span>
                <button type="button" onClick={() => { setSelections([]); setStake(''); }} className="text-zinc-500 hover:text-red-400 transition"><X className="size-4" /></button>
              </div>

              <div className="flex items-end gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">ETB</span>
                  <input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    value={stake}
                    onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setStake(v); }}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primarycolor"
                  />
                </div>
                <button
                  type="button"
                  onClick={placeBet}
                  disabled={!stake || Number(stake) <= 0 || Number(stake) > balance || placing}
                  className="rounded-lg bg-primarycolor px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50 shrink-0"
                >
                  {placing ? 'Placing...' : 'Place Bet'}
                </button>
              </div>
              {Number(stake) > balance && <p className="text-xs text-red-400">Exceeds balance (ETB {balance.toFixed(2)})</p>}
              {Number(stake) > 0 && Number(stake) <= balance && (
                <p className="text-xs text-zinc-500">Payout: <span className="font-semibold text-green-400">ETB {Math.round(Number(stake) * selected.odds * 100) / 100}</span></p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── GamesPage Component ────────────────────────

export default function GamesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [myBets, setMyBets] = useState<UserBet[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [bettingMatchId, setBettingMatchId] = useState<string | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    try { const r = await fetch('/api/matches/active'); setMatches(await r.json()); } catch { } finally { setLoading(false); }
  };

  const fetchMyBets = async () => {
    setBetsLoading(true);
    try {
      const r = await fetch('/api/bets/my');
      const data = await r.json();
      setMyBets(Array.isArray(data) ? data : []);
    } catch { setMyBets([]); } finally { setBetsLoading(false); }
  };

  useEffect(() => {
    fetchMatches(); fetchMyBets();
    fetch('/api/user/balance').then((r) => r.json()).then((d) => { if (d.balance != null) setBalance(Number(d.balance)); }).catch(() => {});
  }, []);

  const refreshBalance = () => {
    fetch('/api/user/balance').then((r) => r.json()).then((d) => { if (d.balance != null) setBalance(Number(d.balance)); }).catch(() => {});
  };

  function BetCard({ bet }: { bet: UserBet }) {
    const isParlay = !bet.matchId && bet.selections && bet.selections.length > 0;
    const created = new Date(bet.createdAt);
    const singleSel = !isParlay && bet.selections?.length > 0 ? bet.selections[0] : null;
    return (
      <div className={`rounded-xl border border-zinc-800 bg-zinc-900/80 border-l-4 ${statusStyles[bet.status] || 'border-l-zinc-700'} p-4 shadow-sm`}>
        <div className="mb-2 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {isParlay ? (
              <p className="text-sm font-medium text-zinc-200">Parlay ({bet.selections.length} legs)</p>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-200">{bet.match?.homeTeam} vs {bet.match?.awayTeam}</p>
                {singleSel && (
                  <p className="mt-0.5 text-xs text-zinc-300 truncate">
                    {marketLabel(singleSel.marketKey || 'h2h', singleSel.outcomeName || bet.typeofBet || '', singleSel.point ? Number(singleSel.point) : null, bet.match?.homeTeam, bet.match?.awayTeam)}
                  </p>
                )}
              </>
            )}
            <p className="mt-0.5 text-xs text-zinc-500"><Clock className="mr-1 inline-block size-3" />{created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[bet.status]}`}>{statusLabels[bet.status]}</span>
        </div>
        {isParlay && bet.selections.map((sel) => {
          const matchName = [sel.match?.homeTeam, sel.match?.awayTeam].filter(Boolean).join(' v ') || '';
          return (
            <div key={sel.id} className="mb-1.5 flex items-start justify-between gap-2 text-xs text-zinc-500 last:mb-2">
              <div className="min-w-0 flex-1">
                {matchName && <span className="block truncate text-zinc-400 font-medium">{matchName}</span>}
                <span className="block truncate">{marketLabel(sel.marketKey || 'h2h', sel.outcomeName || sel.typeofBet, sel.point ? Number(sel.point) : null, sel.match?.homeTeam, sel.match?.awayTeam)}</span>
              </div>
              <span className="shrink-0 text-zinc-400">@ {Number(sel.oddsAtBet).toFixed(2)}</span>
            </div>
          );
        })}
        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-zinc-800">
          <div className="flex gap-3">
            <span className="text-zinc-500">Stake: <span className="font-medium text-zinc-300">ETB {Number(bet.stake).toFixed(2)}</span></span>
            {bet.cumulativeOdds && <span className="text-zinc-500">Odds: <span className="font-medium text-primarycolor">×{Number(bet.cumulativeOdds).toFixed(2)}</span></span>}
          </div>
          <span className="font-semibold text-primarycolor">ETB {Number(bet.potentialPayout).toFixed(2)}</span>
        </div>
      </div>
    );
  }

  function marketLabel(marketKey: string, outcomeName: string, point: number | null, homeTeam?: string, awayTeam?: string): string {
    return marketDescription(marketKey, outcomeName, point, homeTeam || '', awayTeam || '');
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primarycolor"><Swords className="h-7 w-7 text-white" /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Games</h1>
            <p className="text-sm text-zinc-400">Active betting matches</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-3 py-2 text-sm">
              <Wallet className="size-4 text-primarycolor" /><span className="font-semibold text-white">ETB {balance.toFixed(2)}</span>
            </div>
            <Link href="/user-dashboard/balance" className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-500">
              <Coins className="size-4" /><span className="hidden sm:inline">Add Money</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">Loading...</div>
        ) : matches.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-sm text-zinc-500">No active betting matches available right now</div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const homeFlag = countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
              const awayFlag = countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];
              const isBetting = bettingMatchId === match.id;

              return (
                <div key={match.id} className={`rounded-xl border ${isBetting ? 'border-primarycolor' : 'border-zinc-800'} bg-zinc-900 p-4 shadow-sm`}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
                        {homeFlag && <Image src={`/flags/${homeFlag}`} alt="" width={18} height={12} className="h-3 w-4 shrink-0 object-cover" />}
                        <span className="truncate">{match.homeTeam}</span>
                        <span className="text-xs text-zinc-500 shrink-0">v</span>
                        {awayFlag && <Image src={`/flags/${awayFlag}`} alt="" width={18} height={12} className="h-3 w-4 shrink-0 object-cover" />}
                        <span className="truncate">{match.awayTeam}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{formatDate(match.kickoffTime)}</p>
                    </div>
                    {!isBetting ? (
                      <button type="button" onClick={() => setBettingMatchId(match.id)} className="shrink-0 rounded-lg bg-primarycolor px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90">Bet</button>
                    ) : (
                      <button type="button" onClick={() => { setBettingMatchId(null); }} className="shrink-0 rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:text-zinc-200">Cancel</button>
                    )}
                  </div>

                  {isBetting && (
                    <BettingForm
                      match={match}
                      balance={balance}
                      onClose={() => { setBettingMatchId(null); refreshBalance(); }}
                      onPlaced={() => { setBettingMatchId(null); refreshBalance(); fetchMatches(); fetchMyBets(); }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(() => {
          const activeBets = myBets.filter((b) => b.status === 'PENDING');
          const completedBets = myBets.filter((b) => b.status !== 'PENDING');
          return (
            <>
              <div className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Target className="size-5 text-primarycolor" />Active Bets</h2>
                {betsLoading ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500">Loading...</div>
                ) : activeBets.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">No active bets</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">{activeBets.map((bet) => <BetCard key={bet.id} bet={bet} />)}</div>
                )}
              </div>

              <div className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Target className="size-5 text-zinc-500" />Completed Bets</h2>
                {betsLoading ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500">Loading...</div>
                ) : completedBets.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">No completed bets yet</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {completedBets.map((bet) => {
                      const isParlay = !bet.matchId && bet.selections && bet.selections.length > 0;
                      const singleSel = !isParlay && bet.selections?.[0] ? bet.selections[0] : null;
                      return (
                        <div key={bet.id} className={`rounded-xl border border-zinc-800 bg-zinc-900/80 border-l-4 ${statusStyles[bet.status] || 'border-l-zinc-700'} p-4 shadow-sm`}>
                          <div className="mb-2 flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              {isParlay ? (
                                <p className="text-sm font-medium text-zinc-200">Parlay ({bet.selections.length} legs)</p>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-zinc-200">
                                    {bet.match ? `${bet.match.homeTeam} vs ${bet.match.awayTeam}` : ''}
                                  </p>
                                  {singleSel && (
                                    <p className="mt-0.5 text-xs text-zinc-400">
                                      {marketLabel(singleSel.marketKey || 'h2h', singleSel.outcomeName || bet.typeofBet || '', singleSel.point ? Number(singleSel.point) : null, bet.match?.homeTeam, bet.match?.awayTeam)}
                                    </p>
                                  )}
                                </>
                              )}
                              <p className="mt-0.5 text-xs text-zinc-500">
                                <Clock className="mr-1 inline-block size-3" />
                                {new Date(bet.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {bet.status === 'WON' ? (
                              <span className="shrink-0 text-sm font-bold text-green-400">+ETB {Number(bet.potentialPayout).toFixed(2)}</span>
                            ) : bet.status === 'LOST' ? (
                              <span className="shrink-0 text-xs font-semibold text-red-400">Lost</span>
                            ) : (
                              <span className="shrink-0 text-xs font-semibold text-zinc-500">Voided</span>
                            )}
                          </div>
                          {isParlay && bet.selections.map((sel) => {
                            const matchName = [sel.match?.homeTeam, sel.match?.awayTeam].filter(Boolean).join(' v ') || '';
                            return (
                              <div key={sel.id} className="mb-1.5 flex items-start justify-between gap-2 text-xs text-zinc-500 last:mb-2">
                                <div className="min-w-0 flex-1">
                                  {matchName && <span className="block truncate text-zinc-400 font-medium">{matchName}</span>}
                                  <span className="block truncate">{marketLabel(sel.marketKey || 'h2h', sel.outcomeName || sel.typeofBet, sel.point ? Number(sel.point) : null, sel.match?.homeTeam, sel.match?.awayTeam)}</span>
                                </div>
                                <span className="shrink-0 text-zinc-400">@ {Number(sel.oddsAtBet).toFixed(2)}</span>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-zinc-800">
                            <span className="text-zinc-500">Stake: <span className="font-medium text-zinc-300">ETB {Number(bet.stake).toFixed(2)}</span></span>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[bet.status]}`}>{statusLabels[bet.status]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </main>
    </>
  );
}
