'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Navbar from '@/components/common_components/Navbar';
import { Swords, X, Check, AlertTriangle, Clock, Target, Wallet, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import countries from '@/lib/countries.json';

const countryFlagMap = Object.fromEntries(
  countries.map((c: { name: string; flag: string }) => [c.name, c.flag])
);

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  stage: string;
  status: string;
  gameOddsTable: { homeTeamOdds: number | null; awayTeamOdds: number | null; drawOdds: number | null } | null;
};

type BetType = 'HOME_WINS' | 'AWAY_WINS' | 'DRAW';

const betTypeLabels: Record<BetType, string> = {
  HOME_WINS: 'Home',
  AWAY_WINS: 'Away',
  DRAW: 'Draw',
};

type UserBet = {
  id: string;
  matchId: string | null;
  typeofBet: BetType | null;
  stake: string;
  potentialPayout: string;
  cumulativeOdds: string | null;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOIDED';
  createdAt: string;
  match: { id: string; homeTeam: string; awayTeam: string; kickoffTime: string } | null;
  selections: {
    id: string;
    matchId: string;
    typeofBet: BetType;
    oddsAtBet: string;
    status: string;
    match: { homeTeam: string; awayTeam: string; kickoffTime: string };
  }[];
};

type Selection = {
  matchId: string;
  typeofBet: BetType;
};

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-400',
  WON: 'text-green-400',
  LOST: 'text-red-400',
  VOIDED: 'text-zinc-500',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  WON: 'Won',
  LOST: 'Lost',
  VOIDED: 'Voided',
};

const statusStyles: Record<string, string> = {
  PENDING: 'border-l-yellow-500 bg-yellow-500/5',
  WON: 'border-l-green-500 bg-green-500/5',
  LOST: 'border-l-red-500 bg-red-500/5',
  VOIDED: 'border-l-zinc-600 bg-zinc-600/5',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GamesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [myBets, setMyBets] = useState<UserBet[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [mode, setMode] = useState<'idle' | 'single' | 'parlay'>('idle');

  // single bet
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [selectedBetType, setSelectedBetType] = useState<BetType>('HOME_WINS');
  const [stake, setStake] = useState('');
  const [placing, setPlacing] = useState(false);

  // parlay
  const [parlaySelections, setParlaySelections] = useState<Record<string, BetType>>({});
  const [parlayStake, setParlayStake] = useState('');

  // confirmation
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState<any>(null);

  // result
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // --- helpers ---
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/matches/active');
      setMatches(await r.json());
    } catch { } finally { setLoading(false); }
  };

  const fetchMyBets = async () => {
    setBetsLoading(true);
    try {
      const r = await fetch('/api/bets/my');
      setMyBets(await r.json());
    } catch { } finally { setBetsLoading(false); }
  };

  useEffect(() => {
    fetchMatches();
    fetchMyBets();
    fetch('/api/user/balance')
      .then((r) => r.json())
      .then((d) => { if (d.balance != null) setBalance(Number(d.balance)); })
      .catch(() => {});
  }, []);

  const refreshBalance = () => {
    fetch('/api/user/balance')
      .then((r) => r.json())
      .then((d) => { if (d.balance != null) setBalance(Number(d.balance)); })
      .catch(() => {});
  };

  // --- single bet ---
  const selectedMatch = matches.find((m) => m.id === selectedMatchId);
  const singleOdds = selectedMatch?.gameOddsTable;

  function getOddsForType(odds: Match['gameOddsTable'], type: BetType): number | null {
    if (!odds) return null;
    if (type === 'HOME_WINS') return odds.homeTeamOdds;
    if (type === 'AWAY_WINS') return odds.awayTeamOdds;
    if (type === 'DRAW') return odds.drawOdds;
    return null;
  }

  function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch || !stake || Number(stake) <= 0) return;
    const o = getOddsForType(singleOdds ?? null, selectedBetType);
    if (o == null) return;
    const s = Number(stake);
    if (s > balance) {
      toast.error('Insufficient balance', { description: `Balance is ETB ${balance.toFixed(2)}, you tried to bet ETB ${s.toFixed(2)}.` });
      return;
    }
    setConfirmData({
      type: 'SINGLE', match: selectedMatch, betType: selectedBetType, odds: o,
      stake: s, payout: Math.round(s * o * 100) / 100,
    });
    setShowConfirm(true);
  }

  // --- parlay ---
  const selectedCount = Object.keys(parlaySelections).length;

  const parlayDetails = useMemo(() => {
    return Object.entries(parlaySelections).map(([matchId, bt]) => {
      const m = matches.find((x) => x.id === matchId);
      const o = getOddsForType(m?.gameOddsTable ?? null, bt);
      return { matchId, match: m!, betType: bt, odds: o! };
    }).filter((x) => x.match && x.odds != null);
  }, [parlaySelections, matches]);

  const cumulativeOdds = useMemo(() => {
    if (parlayDetails.length < 2) return 0;
    return Math.round(parlayDetails.reduce((p, s) => p * s.odds, 1) * 100) / 100;
  }, [parlayDetails]);

  function toggleParlayMatch(matchId: string) {
    setParlaySelections((prev) => {
      const next = { ...prev };
      if (next[matchId]) delete next[matchId];
      else next[matchId] = 'HOME_WINS';
      return next;
    });
  }

  function setParlayBetType(matchId: string, bt: BetType) {
    setParlaySelections((prev) => ({ ...prev, [matchId]: bt }));
  }

  function handleParlaySubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = Number(parlayStake);
    if (parlayDetails.length < 2 || !s || s <= 0) return;
    if (s > balance) {
      toast.error('Insufficient balance', { description: `Balance is ETB ${balance.toFixed(2)}, you tried to bet ETB ${s.toFixed(2)}.` });
      return;
    }
    setConfirmData({
      type: 'PARLAY', selections: parlayDetails, cumulativeOdds,
      stake: s, payout: Math.round(s * cumulativeOdds * 100) / 100,
    });
    setShowConfirm(true);
  }

  // --- confirm ---
  async function handleConfirm() {
    if (!confirmData) return;
    setPlacing(true);
    try {
      const payload = confirmData.type === 'SINGLE'
        ? { type: 'SINGLE', matchId: confirmData.match.id, typeofBet: confirmData.betType, stake: confirmData.stake }
        : { type: 'PARLAY', selections: confirmData.selections.map((s: any) => ({ matchId: s.matchId, typeofBet: s.betType })), stake: confirmData.stake };

      const res = await fetch('/api/bets/place', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const desc = confirmData.type === 'SINGLE'
          ? `Potential payout: ETB ${data.bet.potentialPayout}`
          : `Parlay (${data.bet.selections} legs) — Potential payout: ETB ${data.bet.potentialPayout}`;
        setResult({ success: true, message: `Bet placed! ${desc}` });
        setShowConfirm(false);
        setMode('idle');
        setStake('');
        setParlayStake('');
        setParlaySelections({});
        setBalance((prev) => prev - confirmData.stake);
        toast.success('Bet placed!', { description: desc });
        fetchMatches();
        fetchMyBets();
      } else {
        if (data.error === 'Insufficient balance') {
          toast.error('Insufficient balance', { description: 'Your balance changed. Please try a smaller stake.' });
          setShowConfirm(false);
          refreshBalance();
        } else {
          setResult({ success: false, message: data.error || 'Failed to place bet' });
          setShowConfirm(false);
        }
      }
    } catch {
      setResult({ success: false, message: 'Network error' });
      setShowConfirm(false);
    } finally { setPlacing(false); }
  }

  function resetMode() {
    setMode('idle');
    setSelectedMatchId('');
    setStake('');
    setParlayStake('');
    setParlaySelections({});
  }

  // --- bet card ---
  function BetCard({ bet }: { bet: UserBet }) {
    const isParlay = !bet.matchId && bet.selections && bet.selections.length > 0;
    const created = new Date(bet.createdAt);
    return (
      <div className={`rounded-xl border border-zinc-800 bg-zinc-900/80 border-l-4 ${statusStyles[bet.status] || 'border-l-zinc-700'} p-4 shadow-sm`}>
        <div className="mb-2 flex items-start justify-between">
          <div>
            {isParlay ? (
              <p className="text-sm font-medium text-zinc-200">
                Parlay ({bet.selections.length} legs)
              </p>
            ) : (
              <p className="text-sm font-medium text-zinc-200">
                {bet.match?.homeTeam} vs {bet.match?.awayTeam}
              </p>
            )}
            <p className="mt-0.5 text-xs text-zinc-500">
              <Clock className="mr-1 inline-block size-3" />
              {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[bet.status]}`}>
            {statusLabels[bet.status]}
          </span>
        </div>

        {isParlay && (
          <div className="mb-2 space-y-1">
            {bet.selections.map((sel) => (
              <div key={sel.id} className="flex items-center justify-between text-xs text-zinc-500">
                <span>{sel.match.homeTeam} vs {sel.match.awayTeam}</span>
                <span className="text-zinc-400">{betTypeLabels[sel.typeofBet]} @ {Number(sel.oddsAtBet).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex gap-4">
            {!isParlay && (
              <span className="text-zinc-500">
                Pick: <span className="font-medium text-zinc-300">{bet.typeofBet ? betTypeLabels[bet.typeofBet] : '—'}</span>
              </span>
            )}
            <span className="text-zinc-500">
              Stake: <span className="font-medium text-zinc-300">ETB {Number(bet.stake).toFixed(2)}</span>
            </span>
          </div>
          <span className="font-semibold text-primarycolor">
            ETB {Number(bet.potentialPayout).toFixed(2)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primarycolor">
            <Swords className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Games</h1>
            <p className="text-sm text-zinc-400">Active betting matches</p>
          </div>
        </div>

        {/* Action Buttons */}
        {!loading && matches.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => { resetMode(); setMode('single'); }}
              className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
                mode === 'single' ? 'border-primarycolor bg-primarycolor/20 text-primarycolor' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
              }`}
            >
              Bet on Single Game
            </button>
            <button
              onClick={() => { resetMode(); setMode('parlay'); }}
              className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
                mode === 'parlay' ? 'border-primarycolor bg-primarycolor/20 text-primarycolor' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
              }`}
            >
              Bet on Multiple Games
            </button>
          </div>
        )}

        {/* --- Single Bet Form --- */}
        {mode === 'single' && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Place a Single Bet</h2>
              <button onClick={resetMode} className="text-zinc-500 hover:text-zinc-300"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">Select Game</label>
                <select value={selectedMatchId} onChange={(e) => { setSelectedMatchId(e.target.value); setSelectedBetType('HOME_WINS'); }} required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-primarycolor">
                  <option value="">— Choose a match —</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>{m.homeTeam} vs {m.awayTeam} — {formatDate(m.kickoffTime)}</option>
                  ))}
                </select>
              </div>
              {selectedMatch && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5">
                    <Wallet className="size-4 text-primarycolor" />
                    <span className="text-sm text-zinc-400">Balance:</span>
                    <span className="text-sm font-bold text-white">ETB {balance.toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-400">Bet Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['HOME_WINS', 'DRAW', 'AWAY_WINS'] as BetType[]).map((type) => {
                        const o = getOddsForType(singleOdds ?? null, type);
                        return (
                          <button key={type} type="button" onClick={() => setSelectedBetType(type)}
                            className={`rounded-lg border px-3 py-2.5 text-center text-sm transition ${
                              selectedBetType === type ? 'border-primarycolor bg-primarycolor/20 text-primarycolor' : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                            }`}>
                            <div className="font-semibold">{betTypeLabels[type]}</div>
                            <div className="mt-0.5 text-xs opacity-80">{o != null ? `×${o}` : '—'}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-400">Stake (ETB)</label>
                    <input type="number" step="0.01" min="1" value={stake} onChange={(e) => setStake(e.target.value)} required
                      placeholder="e.g. 100"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primarycolor" />
                    {stake && Number(stake) > 0 && getOddsForType(singleOdds ?? null, selectedBetType) != null && (
                      <p className="mt-1.5 text-xs text-zinc-500">
                        Potential payout: <span className="text-primarycolor font-semibold">ETB {Math.round(Number(stake) * getOddsForType(singleOdds ?? null, selectedBetType)! * 100) / 100}</span>
                      </p>
                    )}
                    {Number(stake) > balance && <p className="mt-1 text-xs text-red-400">Exceeds your balance of ETB {balance.toFixed(2)}</p>}
                  </div>
                  <button type="submit" disabled={!stake || Number(stake) <= 0 || Number(stake) > balance}
                    className="w-full rounded-lg bg-primarycolor px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primarycolor/80 disabled:cursor-not-allowed disabled:opacity-50">
                    Place Bet
                  </button>
                </>
              )}
            </form>
          </div>
        )}

        {/* --- Parlay Form --- */}
        {mode === 'parlay' && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Place a Parlay Bet</h2>
              <button onClick={resetMode} className="text-zinc-500 hover:text-zinc-300"><X className="size-5" /></button>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 mb-4">
              <Wallet className="size-4 text-primarycolor" />
              <span className="text-sm text-zinc-400">Balance:</span>
              <span className="text-sm font-bold text-white">ETB {balance.toFixed(2)}</span>
            </div>

            {selectedCount === 0 ? (
              <p className="text-sm text-zinc-500">Select at least 2 matches from the table below</p>
            ) : selectedCount < 2 ? (
              <p className="text-sm text-yellow-400">Select at least 1 more match (minimum 2 for a parlay)</p>
            ) : null}

            {parlayDetails.length >= 2 && (
              <form onSubmit={handleParlaySubmit} className="space-y-4">
                <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Your Selections</p>
                  {parlayDetails.map((s) => (
                    <div key={s.matchId} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{s.match.homeTeam} vs {s.match.awayTeam}</span>
                      <span className="text-zinc-400">{betTypeLabels[s.betType]} <span className="text-primarycolor font-semibold">×{s.odds}</span></span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-700 pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-zinc-300">Cumulative Odds</span>
                    <span className="text-primarycolor">×{cumulativeOdds}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">Total Stake (ETB)</label>
                  <input type="number" step="0.01" min="1" value={parlayStake} onChange={(e) => setParlayStake(e.target.value)} required
                    placeholder="e.g. 100"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primarycolor" />
                  {parlayStake && Number(parlayStake) > 0 && (
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Potential payout: <span className="text-primarycolor font-semibold">ETB {Math.round(Number(parlayStake) * cumulativeOdds * 100) / 100}</span>
                    </p>
                  )}
                  {Number(parlayStake) > balance && <p className="mt-1 text-xs text-red-400">Exceeds your balance of ETB {balance.toFixed(2)}</p>}
                </div>

                <button type="submit" disabled={!parlayStake || Number(parlayStake) <= 0 || Number(parlayStake) > balance}
                  className="w-full rounded-lg bg-primarycolor px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primarycolor/80 disabled:cursor-not-allowed disabled:opacity-50">
                  Place Parlay Bet
                </button>
              </form>
            )}
          </div>
        )}

        {/* Active Matches */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">Loading...</div>
        ) : matches.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-sm text-zinc-500">
            No active betting matches available right now
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const homeFlag = countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
              const awayFlag = countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];
              const o = match.gameOddsTable;
              const isParlaySelected = parlaySelections[match.id] != null;

              return (
                <div
                  key={match.id}
                  className={`rounded-xl border ${isParlaySelected ? 'border-primarycolor bg-primarycolor/10' : 'border-zinc-800 bg-zinc-900'} p-4 shadow-sm ${mode === 'parlay' ? 'cursor-pointer' : ''}`}
                  onClick={() => mode === 'parlay' && toggleParlayMatch(match.id)}
                >
                  {/* Top row: checkbox (parlay) + match info */}
                  <div className="flex items-start gap-3">
                    {mode === 'parlay' && (
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isParlaySelected}
                          onChange={() => toggleParlayMatch(match.id)}
                          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-primarycolor focus:ring-primarycolor"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {/* Match name */}
                      <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
                        {homeFlag && <Image src={`/flags/${homeFlag}`} alt="" width={18} height={12} className="h-3 w-4 shrink-0 object-cover" />}
                        <span className="truncate">{match.homeTeam}</span>
                        <span className="text-xs text-zinc-500 shrink-0">v</span>
                        {awayFlag && <Image src={`/flags/${awayFlag}`} alt="" width={18} height={12} className="h-3 w-4 shrink-0 object-cover" />}
                        <span className="truncate">{match.awayTeam}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{formatDate(match.kickoffTime)}</p>
                    </div>
                  </div>

                  {/* Odds row */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {([{ key: 'HOME_WINS', label: '1' }, { key: 'DRAW', label: 'X' }, { key: 'AWAY_WINS', label: '2' }] as const).map(({ key, label }) => {
                      const val = key === 'HOME_WINS' ? o?.homeTeamOdds : key === 'DRAW' ? o?.drawOdds : o?.awayTeamOdds;
                      const isActiveBetType = mode === 'parlay' && isParlaySelected && parlaySelections[match.id] === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={(e) => {
                            if (mode === 'parlay' && isParlaySelected) {
                              e.stopPropagation();
                              setParlayBetType(match.id, key as BetType);
                            }
                          }}
                          className={`rounded-lg border py-2 text-center text-sm transition ${
                            isActiveBetType
                              ? 'border-primarycolor bg-primarycolor/20 text-primarycolor'
                              : mode === 'parlay' && isParlaySelected
                                ? 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
                                : 'border-zinc-700 bg-zinc-800/50 text-zinc-400'
                          }`}
                        >
                          <div className="font-semibold">{label}</div>
                          <div className="mt-0.5 text-xs font-medium text-primarycolor">{val != null ? val : '—'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* My Bets */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <Target className="size-5 text-primarycolor" />
            My Bets
          </h2>
          {betsLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">Loading...</div>
          ) : myBets.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
              You haven't placed any bets yet
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myBets.map((bet) => <BetCard key={bet.id} bet={bet} />)}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && confirmData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-bold text-white">Confirm Your Bet</h3>
              <div className="space-y-3 text-sm">
                {confirmData.type === 'SINGLE' ? (
                  <>
                    <div className="flex justify-between text-zinc-400">
                      <span>Match</span>
                      <span className="font-medium text-zinc-200">{confirmData.match.homeTeam} vs {confirmData.match.awayTeam}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Bet Type</span>
                      <span className="font-medium text-zinc-200">{betTypeLabels[confirmData.betType as BetType]}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Odds</span>
                      <span className="font-medium text-primarycolor">×{confirmData.odds}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Parlay ({confirmData.selections.length} legs)</p>
                    {confirmData.selections.map((s: any) => (
                      <div key={s.matchId} className="flex justify-between text-zinc-400 text-xs">
                        <span>{s.match.homeTeam} vs {s.match.awayTeam}</span>
                        <span className="text-zinc-300">{betTypeLabels[s.betType as BetType]} <span className="text-primarycolor">×{s.odds}</span></span>
                      </div>
                    ))}
                    <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-700">
                      <span>Cumulative Odds</span>
                      <span className="font-medium text-primarycolor">×{confirmData.cumulativeOdds}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Stake</span>
                  <span className="font-medium text-zinc-200">ETB {confirmData.stake.toFixed(2)}</span>
                </div>
                <div className="border-t border-zinc-700 pt-3">
                  <div className="flex justify-between text-base">
                    <span className="text-zinc-300 font-semibold">Potential Payout</span>
                    <span className="font-bold text-green-400">ETB {confirmData.payout.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-600">Cancel</button>
                <button onClick={handleConfirm} disabled={placing} className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-semibold text-green-400 transition hover:bg-gray-600 disabled:opacity-50">
                  {placing ? 'Placing...' : 'Confirm & Place Bet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result Dialog */}
        {result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
              <div className="flex flex-col items-center text-center">
                {result.success ? (
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-900/40"><Check className="h-7 w-7 text-green-400" /></div>
                ) : (
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-900/40"><AlertTriangle className="h-7 w-7 text-red-400" /></div>
                )}
                <h3 className={`mb-2 text-lg font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? 'Bet Placed!' : 'Bet Failed'}
                </h3>
                <p className="text-sm text-zinc-400">{result.message}</p>
              </div>
              <button onClick={() => setResult(null)} className="mt-6 w-full rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-600">Close</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
