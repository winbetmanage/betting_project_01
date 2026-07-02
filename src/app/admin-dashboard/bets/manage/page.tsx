'use client';

import { useEffect, useState } from 'react';
import { Users, History, Calculator } from 'lucide-react';
import SettleDialog from '@/components/admin_dashboard_components/SettleDialog';

type UserInfo = { id: string; username: string; email: string };

type BetInfo = {
  id: string;
  typeofBet: 'HOME_WINS' | 'AWAY_WINS' | 'DRAW' | 'HOME_WINS_OR_DRAW' | 'AWAY_WINS_OR_DRAW';
  stake: string;
  potentialPayout: string;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOIDED';
  createdAt: string;
  user: UserInfo;
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  stage: string;
  status: string;
  addToBetting: boolean;
  settled: boolean;
  gameOddsTable: { homeTeamOdds: number | null; awayTeamOdds: number | null; drawOdds: number | null } | null;
  bets: BetInfo[];
};

const betTypeLabels: Record<string, string> = {
  HOME_WINS: 'Home',
  AWAY_WINS: 'Away',
  DRAW: 'Draw',
  HOME_WINS_OR_DRAW: '1X',
  AWAY_WINS_OR_DRAW: 'X2',
};

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-600 bg-yellow-50',
  WON: 'text-green-600 bg-green-50',
  LOST: 'text-red-600 bg-red-50',
  VOIDED: 'text-zinc-500 bg-zinc-100',
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

function displayStatus(match: Match): string {
  if (match.status === 'CANCELLED') return 'CANCELLED';
  if (match.status === 'FINISHED') return 'FINISHED';
  if (match.status === 'LIVE') return 'LIVE';
  if (new Date(match.kickoffTime) <= new Date()) return 'FINISHED';
  return match.status;
}

function statusBadgeClass(match: Match): string {
  const s = displayStatus(match);
  if (s === 'FINISHED') return 'bg-green-900/40 text-green-700';
  if (s === 'CANCELLED') return 'bg-red-900/40 text-red-700';
  if (s === 'LIVE') return 'bg-blue-900/40 text-blue-700';
  return 'bg-zinc-100 text-zinc-600';
}

export default function ManageBettingPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settleMatch, setSettleMatch] = useState<Match | null>(null);

  useEffect(() => {
    fetch('/api/admin/betting-manage')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to fetch matches');
        const all = [...(data.activeBets ?? []), ...(data.upcomingMatches ?? [])];
        const unique = Object.values(
          all.reduce((acc: Record<string, Match>, m: Match) => {
            acc[m.id] = acc[m.id] || m;
            return acc;
          }, {})
        );
        setMatches(unique as Match[]);
        setCompletedMatches(data.completedBets ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Manage Betting</h1>
          <p className="mt-1 text-sm text-zinc-500">View all user bets across matches</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-12 text-center text-sm text-red-600 shadow-sm">
          Failed to load matches: {error}
        </div>
      </div>
    );
  }

  const matchesWithBets = matches.filter((m) => m.bets.length > 0);
  const matchesWithoutBets = matches.filter((m) => m.bets.length === 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Manage Betting</h1>
        <p className="mt-1 text-sm text-zinc-500">View all user bets across matches</p>
      </div>

      {/* Matches with active bets */}
      {matchesWithBets.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400 shadow-sm">
          <Users className="mx-auto mb-3 size-8 text-zinc-300" />
          No bets have been placed yet
        </div>
      ) : (
        <div className="space-y-6">
          {matchesWithBets.map((match) => {
            const totalStake = match.bets.reduce((sum, b) => sum + Number(b.stake), 0);
            const pendingCount = match.bets.filter((b) => b.status === 'PENDING').length;

            return (
              <div key={match.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                {/* Match header */}
                <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">
                        {match.homeTeam} vs {match.awayTeam}
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatDate(match.kickoffTime)} — {match.stage}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-zinc-500">
                        <span className="font-semibold text-zinc-800">{match.bets.length}</span> bets
                      </span>
                      <span className="text-zinc-500">
                        Total stake: <span className="font-semibold text-zinc-800">ETB {totalStake.toFixed(2)}</span>
                      </span>
                      {pendingCount > 0 && (
                        <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                          {pendingCount} pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bets table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <th className="px-5 py-3">User</th>
                        <th className="px-5 py-3">Pick</th>
                        <th className="px-5 py-3 text-right">Stake</th>
                        <th className="px-5 py-3 text-right">Potential Payout</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.bets.map((bet) => (
                        <tr key={bet.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                          <td className="px-5 py-3">
                            <span className="font-medium text-zinc-800">{bet.user.username}</span>
                            <span className="ml-2 text-xs text-zinc-400">{bet.user.email}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-block rounded bg-primarycolor/10 px-2 py-0.5 text-xs font-semibold text-primarycolor">
                              {betTypeLabels[bet.typeofBet] || bet.typeofBet}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-zinc-800">ETB {Number(bet.stake).toFixed(2)}</td>
                          <td className="px-5 py-3 text-right font-medium text-green-700">ETB {Number(bet.potentialPayout).toFixed(2)}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[bet.status]}`}>
                              {bet.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right text-xs text-zinc-400">
                            {formatDate(bet.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Matches with no bets */}
      {matchesWithoutBets.length > 0 && (
        <details className="group rounded-xl border border-zinc-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
            Matches with no bets ({matchesWithoutBets.length})
          </summary>
          <div className="border-t border-zinc-100 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {matchesWithoutBets.map((m) => (
                <span key={m.id} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600">
                  {m.homeTeam} vs {m.awayTeam}
                </span>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Completed matches */}
      {completedMatches.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-zinc-900">
            <History className="mr-1.5 inline-block size-5 align-text-bottom text-zinc-400" />
            Completed ({completedMatches.length})
          </h2>
          <div className="space-y-6">
            {completedMatches.map((match) => {
              const totalStake = match.bets.reduce((sum, b) => sum + Number(b.stake), 0);
              return (
                <div key={match.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                  {/* Match header */}
                  <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-zinc-900">
                          {match.homeTeam} vs {match.awayTeam}
                        </h3>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {formatDate(match.kickoffTime)} — {match.stage}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(match)}`}>
                          {displayStatus(match)}
                        </span>
                        <span className="text-zinc-500">
                          <span className="font-semibold text-zinc-800">{match.bets.length}</span> bets
                        </span>
                        <span className="text-zinc-500">
                          Total stake: <span className="font-semibold text-zinc-800">ETB {totalStake.toFixed(2)}</span>
                        </span>
                        {!match.settled && (
                          <button
                            onClick={() => setSettleMatch(match)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
                          >
                            <Calculator className="size-3.5" /> Calculate
                          </button>
                        )}
                        {match.settled && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-semibold text-green-700">
                            Settled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bets table */}
                  {match.bets.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            <th className="px-5 py-3">User</th>
                            <th className="px-5 py-3">Pick</th>
                            <th className="px-5 py-3 text-right">Stake</th>
                            <th className="px-5 py-3 text-right">Potential Payout</th>
                            <th className="px-5 py-3 text-center">Status</th>
                            <th className="px-5 py-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.bets.map((bet) => (
                            <tr key={bet.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                              <td className="px-5 py-3">
                                <span className="font-medium text-zinc-800">{bet.user.username}</span>
                                <span className="ml-2 text-xs text-zinc-400">{bet.user.email}</span>
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-block rounded bg-primarycolor/10 px-2 py-0.5 text-xs font-semibold text-primarycolor">
                                  {betTypeLabels[bet.typeofBet] || bet.typeofBet}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right font-medium text-zinc-800">ETB {Number(bet.stake).toFixed(2)}</td>
                              <td className="px-5 py-3 text-right font-medium text-green-700">ETB {Number(bet.potentialPayout).toFixed(2)}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[bet.status]}`}>
                                  {bet.status}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-5 py-3 text-right text-xs text-zinc-400">
                                {formatDate(bet.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {match.bets.length === 0 && (
                    <div className="px-5 py-4 text-center text-sm text-zinc-400">No bets placed on this match</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {settleMatch && (
        <SettleDialog
          open={!!settleMatch}
          onOpenChange={(open) => { if (!open) setSettleMatch(null); }}
          match={settleMatch}
        />
      )}
    </div>
  );
}
