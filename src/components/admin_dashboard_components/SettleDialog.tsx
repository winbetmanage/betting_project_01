'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type SettlementSummary } from '@/lib/settle';
import { Calculator, CheckCircle2, Loader2, TrendingDown, TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoffTime: string;
    stage: string;
  };
};

type Page = 'scores' | 'preview' | 'submitting' | 'done';

export default function SettleDialog({ open, onOpenChange, match }: Props) {
  const [page, setPage] = useState<Page>('scores');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<SettlementSummary | null>(null);

  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [homeScoreH1, setHomeScoreH1] = useState('');
  const [awayScoreH1, setAwayScoreH1] = useState('');
  const [homeScoreH2, setHomeScoreH2] = useState('');
  const [awayScoreH2, setAwayScoreH2] = useState('');

  function reset() {
    setPage('scores');
    setLoading(false);
    setError('');
    setSummary(null);
    setHomeScore('');
    setAwayScore('');
    setHomeScoreH1('');
    setAwayScoreH1('');
    setHomeScoreH2('');
    setAwayScoreH2('');
  }

  async function handleCalculate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settle/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: Number(homeScore) || 0,
          awayScore: Number(awayScore) || 0,
          homeScoreH1: Number(homeScoreH1) || 0,
          awayScoreH1: Number(awayScoreH1) || 0,
          homeScoreH2: Number(homeScoreH2) || 0,
          awayScoreH2: Number(awayScoreH2) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Calculation failed');
      setSummary(data.summary);
      setPage('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setPage('submitting');
    setError('');
    try {
      const res = await fetch('/api/admin/settle/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: Number(homeScore) || 0,
          awayScore: Number(awayScore) || 0,
          homeScoreH1: Number(homeScoreH1) || 0,
          awayScoreH1: Number(awayScoreH1) || 0,
          homeScoreH2: Number(homeScoreH2) || 0,
          awayScoreH2: Number(awayScoreH2) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSummary(data.summary);
      setPage('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
      setPage('preview');
    }
  }

  const hNum = Number(homeScore) || 0;
  const aNum = Number(awayScore) || 0;
  const h1Num = Number(homeScoreH1) || 0;
  const a1Num = Number(awayScoreH1) || 0;
  const h2Num = Number(homeScoreH2) || 0;
  const a2Num = Number(awayScoreH2) || 0;

  const hasHomeMismatch = hNum !== h1Num + h2Num;
  const hasAwayMismatch = aNum !== a1Num + a2Num;
  const hasMismatch = hasHomeMismatch || hasAwayMismatch;

  const profitColor = summary && summary.profit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitIcon = summary && summary.profit >= 0 ? TrendingUp : TrendingDown;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Settle: {match.homeTeam} vs {match.awayTeam}
          </DialogTitle>
          <DialogDescription>
            {match.stage} — {new Date(match.kickoffTime).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {/* Page 1: Score Entry */}
        {page === 'scores' && (
          <div className="space-y-4">
            <div className={`rounded-lg border p-4 ${hasMismatch ? 'border-red-400 bg-red-50' : 'border-zinc-200 bg-zinc-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-zinc-700">Full Time Score</h4>
                {hasMismatch && (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertTriangle className="size-3.5" /> FT must equal H1 + H2
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">{match.homeTeam}</label>
                  <Input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} placeholder="Home goals" className={hasHomeMismatch ? 'border-red-400 ring-red-200' : ''} />
                  {hasHomeMismatch && (
                    <p className="mt-0.5 text-[10px] text-red-500">
                      H1 ({homeScoreH1 || 0}) + H2 ({homeScoreH2 || 0}) = {h1Num + h2Num}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">{match.awayTeam}</label>
                  <Input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} placeholder="Away goals" className={hasAwayMismatch ? 'border-red-400 ring-red-200' : ''} />
                  {hasAwayMismatch && (
                    <p className="mt-0.5 text-[10px] text-red-500">
                      H1 ({awayScoreH1 || 0}) + H2 ({awayScoreH2 || 0}) = {a1Num + a2Num}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-zinc-700">Half-Time (H1) Score</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">{match.homeTeam}</label>
                  <Input type="number" min={0} value={homeScoreH1} onChange={(e) => setHomeScoreH1(e.target.value)} placeholder="H1 home goals" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">{match.awayTeam}</label>
                  <Input type="number" min={0} value={awayScoreH1} onChange={(e) => setAwayScoreH1(e.target.value)} placeholder="H1 away goals" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-zinc-700">Second-Half (H2) Score</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">{match.homeTeam}</label>
                  <Input type="number" min={0} value={homeScoreH2} onChange={(e) => setHomeScoreH2(e.target.value)} placeholder="H2 home goals" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">{match.awayTeam}</label>
                  <Input type="number" min={0} value={awayScoreH2} onChange={(e) => setAwayScoreH2(e.target.value)} placeholder="H2 away goals" />
                </div>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {/* Page 2: Results Preview */}
        {page === 'preview' && summary && (
          <div className="space-y-4">
            {/* Entered scores */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="mb-2 text-xs font-semibold text-zinc-500">ENTERED SCORES</p>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-md bg-white p-2">
                  <p className="text-[10px] text-zinc-400">Full Time</p>
                  <p className="font-bold text-zinc-800">{homeScore || 0} — {awayScore || 0}</p>
                </div>
                <div className="rounded-md bg-white p-2">
                  <p className="text-[10px] text-zinc-400">Half-Time</p>
                  <p className="font-bold text-zinc-800">{homeScoreH1 || 0} — {awayScoreH1 || 0}</p>
                </div>
                <div className="rounded-md bg-white p-2">
                  <p className="text-[10px] text-zinc-400">Second-Half</p>
                  <p className="font-bold text-zinc-800">{homeScoreH2 || 0} — {awayScoreH2 || 0}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                <Users className="mx-auto mb-1 size-5 text-zinc-400" />
                <p className="text-lg font-bold text-zinc-900">{summary.totalBets}</p>
                <p className="text-[10px] text-zinc-500">Total Bets</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <TrendingUp className="mx-auto mb-1 size-5 text-green-500" />
                <p className="text-lg font-bold text-green-700">{summary.wonCount}</p>
                <p className="text-[10px] text-green-600">Won</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <TrendingDown className="mx-auto mb-1 size-5 text-red-500" />
                <p className="text-lg font-bold text-red-700">{summary.lostCount}</p>
                <p className="text-[10px] text-red-600">Lost</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center">
                <DollarSign className="mx-auto mb-1 size-5 text-zinc-400" />
                <p className={`text-lg font-bold ${profitColor}`}>{summary.profit.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500">Profit (ETB)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Total Stake</p>
                <p className="font-semibold text-zinc-900">ETB {summary.totalStake.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Total Payout</p>
                <p className="font-semibold text-zinc-900">ETB {(summary.wonPayout + summary.partialVoidPayout + summary.voidedStake).toFixed(2)}</p>
              </div>
              {summary.voidedCount > 0 && (
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Voided Bets</p>
                  <p className="font-semibold text-zinc-900">{summary.voidedCount} (ETB {summary.voidedStake.toFixed(2)} returned)</p>
                </div>
              )}
              {summary.partialVoidCount > 0 && (
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Partial Voids</p>
                  <p className="font-semibold text-zinc-900">{summary.partialVoidCount} (ETB {summary.partialVoidPayout.toFixed(2)})</p>
                </div>
              )}
            </div>

            {/* Bet details — show what each user guessed */}
            <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50">
                  <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase text-zinc-500">
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Pick</th>
                    <th className="px-3 py-2 text-right">Stake</th>
                    <th className="px-3 py-2 text-right">Payout</th>
                    <th className="px-3 py-2 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.betResults.map((r) => (
                    <tr key={r.betId} className="border-b border-zinc-100 text-xs">
                      <td className="px-3 py-2 font-medium text-zinc-800">{r.username}</td>
                      <td className="px-3 py-2">
                        {r.selections.map((sel, i) => (
                          <span key={sel.selectionId}>
                            {i > 0 && <span className="mx-1 text-zinc-300">+</span>}
                            <span className="inline-block rounded bg-primarycolor/10 px-1.5 py-0.5 text-xs font-medium text-primarycolor">
                              {sel.label}
                            </span>
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-zinc-700">
                        ETB {r.stake.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-800">
                        {r.payout > 0 ? `ETB ${r.payout.toFixed(2)}` : <span className="text-zinc-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.overall === 'WON' ? 'bg-green-100 text-green-700' :
                          r.overall === 'LOST' ? 'bg-red-100 text-red-700' :
                          r.overall === 'VOIDED' ? 'bg-zinc-100 text-zinc-500' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.overall === 'PARTIAL_VOID' ? 'PARTIAL' : r.overall}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {/* Page 3: Submitting */}
        {page === 'submitting' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-10 animate-spin text-primarycolor" />
            <p className="mt-4 text-sm text-zinc-600">Settling bets and distributing payouts...</p>
          </div>
        )}

        {/* Page 4: Done */}
        {page === 'done' && summary && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6">
              <CheckCircle2 className="size-12 text-green-500" />
              <p className="mt-3 text-lg font-semibold text-green-700">Settlement Complete</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                <p className="text-lg font-bold text-zinc-900">{summary.totalBets}</p>
                <p className="text-[10px] text-zinc-500">Bets Settled</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <p className="text-lg font-bold text-green-700">{summary.wonCount}</p>
                <p className="text-[10px] text-green-600">Won</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-lg font-bold text-red-700">{summary.lostCount}</p>
                <p className="text-[10px] text-red-600">Lost</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center">
                <p className={`text-lg font-bold ${profitColor}`}>ETB {summary.profit.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500">Profit</p>
              </div>
            </div>

            <div className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-800">
              Winning users&apos; balances have been credited.
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter showCloseButton={page === 'done'}>
          {page === 'scores' && (
            <div className="flex w-full gap-2">
              <DialogClose render={<Button variant="destructive" className="flex-1" />}>Cancel</DialogClose>
              <Button onClick={handleCalculate} disabled={loading || hasMismatch} className="flex-1">
                {loading ? (
                  <><Loader2 className="mr-1 size-4 animate-spin" /> Calculating...</>
                ) : (
                  <><Calculator className="mr-1 size-4" /> Calculate</>
                )}
              </Button>
            </div>
          )}
          {page === 'preview' && (
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPage('scores')}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                <CheckCircle2 className="mr-1 size-4" /> Submit & Settle
              </Button>
            </div>
          )}
          {page === 'submitting' && null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
