'use client';

import { Fragment, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight, Eye, Plus, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import countries from '@/lib/countries.json';
import { toast } from 'sonner';
import { FetchGameScores } from '@/lib/api_links';

const countryFlagMap = Object.fromEntries(
  countries.map((c: { name: string; flag: string }) => [c.name, c.flag])
);

type Match = {
  id: string;
  apiMatchId: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  stage: string;
  status: string;
  addToBetting: boolean;
  gameOddsTable: { homeTeamOdds: number | null; awayTeamOdds: number | null; drawOdds: number | null } | null;
};

type UpcomingGame = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  matchId: string | null;
  addToBetting: boolean;
  inDb: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
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

export default function AddMatchToBetPage() {
  const [activeBets, setActiveBets] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addingToBet, setAddingToBet] = useState<Set<string>>(new Set());
  const [expandedOdds, setExpandedOdds] = useState<Set<string>>(new Set());
  const [gameStatuses, setGameStatuses] = useState<Record<string, { checking: boolean; completed: boolean | null }>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bettingRes, gamesRes] = await Promise.all([
        fetch('/api/admin/betting-manage'),
        fetch('/api/admin/upcoming-games-list'),
      ]);
      const bettingData = await bettingRes.json();
      const gamesData = await gamesRes.json();
      setActiveBets(bettingData.activeBets ?? []);
      setUpcomingMatches(Array.isArray(gamesData) ? gamesData : []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function handleRemove(id: string) {
    try {
      await fetch('/api/admin/betting-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: [id], addToBetting: false }),
      });
      await fetchData();
    } catch {
    }
  }

  async function handleFetchUpcomingGames() {
    setFetching(true);
    try {
      const res = await fetch('/api/admin/fetch-upcoming-games', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to fetch');
        return;
      }
      await fetchData();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setFetching(false);
    }
  }

  async function handleAddToBet(matchId: string) {
    setAddingToBet((prev) => new Set(prev).add(matchId));
    try {
      await fetch('/api/admin/betting-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: [matchId], addToBetting: true }),
      });
      await fetchData();
    } catch {
    } finally {
      setAddingToBet((prev) => { const next = new Set(prev); next.delete(matchId); return next; });
    }
  }

  function toggleOddsExpand(id: string) {
    setExpandedOdds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRefreshToGames() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/refresh-to-games', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to refresh');
        return;
      }
      toast.success(`Added ${data.created} games, ${data.skipped} already existed`);
      await fetchData();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCheckStatus(gameId: string, homeTeam: string, awayTeam: string) {
    setGameStatuses((prev) => ({ ...prev, [gameId]: { checking: true, completed: null } }));
    try {
      const url = FetchGameScores(gameId);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const game = Array.isArray(data) ? data.find(
        (g: any) => g.home_team === homeTeam && g.away_team === awayTeam,
      ) : null;
      const completed = game?.completed === true;
      if (completed) {
        setUpcomingMatches((prev) => prev.filter((g) => g.id !== gameId));
        toast.info(`${homeTeam} vs ${awayTeam} is completed and removed from the list`);
      } else {
        setGameStatuses((prev) => ({ ...prev, [gameId]: { checking: false, completed: false } }));
        toast.info(`${homeTeam} vs ${awayTeam} is not yet completed`);
      }
    } catch {
      setGameStatuses((prev) => ({ ...prev, [gameId]: { checking: false, completed: null } }));
      toast.error('Failed to check game status');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Add Match to Bet</h1>
        <p className="mt-1 text-sm text-zinc-500">Select matches to add to the betting pool</p>
      </div>

      {/* Active Bets */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">
          Active Bets ({activeBets.length})
        </h2>
        {activeBets.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400 shadow-sm">
            No active bets — select matches below and enable them
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-4 py-3"></th>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Home</th>
                  <th className="px-4 py-3 text-right">Draw</th>
                  <th className="px-4 py-3 text-right">Away</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeBets.map((match) => {
                  const homeFlag = countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
                  const awayFlag = countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];
                  const odds = match.gameOddsTable;
                  const isOpen = expandedOdds.has(match.id);
                  return (
                    <Fragment key={match.id}>
                      <tr className="border-b border-zinc-100 hover:bg-green-50 cursor-pointer" onClick={() => toggleOddsExpand(match.id)}>
                        <td className="px-4 py-3">
                          <ChevronRight className={`size-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {homeFlag && <Image src={`/flags/${homeFlag}`} alt="" width={20} height={14} className="h-3.5 w-5 shrink-0 object-cover" />}
                            <span className="font-medium text-gray-800">{match.homeTeam}</span>
                            <span className="text-xs text-zinc-400">v</span>
                            {awayFlag && <Image src={`/flags/${awayFlag}`} alt="" width={20} height={14} className="h-3.5 w-5 shrink-0 object-cover" />}
                            <span className="font-medium text-gray-800">{match.awayTeam}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{formatDate(match.kickoffTime)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{odds?.homeTeamOdds != null ? `×${odds.homeTeamOdds}` : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{odds?.drawOdds != null ? `×${odds.drawOdds}` : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{odds?.awayTeamOdds != null ? `×${odds.awayTeamOdds}` : '—'}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="xs" onClick={() => handleRemove(match.id)}>
                            <X className="size-3" />
                            Remove
                          </Button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={7} className="bg-zinc-50 px-4 py-3">
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3"
                              >
                                <Link href={`/admin-dashboard/bets/games/${match.id}`}>
                                  <Button size="sm" variant="outline">
                                    <Eye className="size-3.5" />
                                    Details
                                  </Button>
                                </Link>
                              </motion.div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Upcoming Matches */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">
            All Upcoming Matches ({upcomingMatches.length})
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleFetchUpcomingGames} disabled={fetching}>
              {fetching ? 'Fetching...' : 'Fetch Upcoming Games'}
            </Button>
            <Button onClick={handleRefreshToGames} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh them to games'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Sport</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {upcomingMatches.map((game) => {
                const homeFlag = countryFlagMap[game.home_team as keyof typeof countryFlagMap];
                const awayFlag = countryFlagMap[game.away_team as keyof typeof countryFlagMap];
                const isAdding = addingToBet.has(game.matchId ?? '');
                return (
                  <tr key={game.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {homeFlag && <Image src={`/flags/${homeFlag}`} alt="" width={20} height={14} className="h-3.5 w-5 shrink-0 object-cover" />}
                        <span className="font-medium text-gray-800">{game.home_team}</span>
                        <span className="text-xs text-zinc-400">v</span>
                        {awayFlag && <Image src={`/flags/${awayFlag}`} alt="" width={20} height={14} className="h-3.5 w-5 shrink-0 object-cover" />}
                        <span className="font-medium text-gray-800">{game.away_team}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{formatDate(game.commence_time)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{game.sport_title}</td>
                    <td className="px-4 py-3 text-center">
                      {gameStatuses[game.id]?.checking ? (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                          <RefreshCw className="size-3 animate-spin" />
                          Checking...
                        </span>
                      ) : gameStatuses[game.id]?.completed === false ? (
                        <span className="text-xs text-amber-500">
                          Not completed{new Date(game.commence_time) < new Date() ? ' (Live)' : ''}
                        </span>
                      ) : (
                        <Button size="xs" variant="outline" onClick={() => handleCheckStatus(game.id, game.home_team, game.away_team)}>
                          <RefreshCw className="size-3" />
                          Check Status
                        </Button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {game.inDb && (
                          <Link href={`/admin-dashboard/bets/games/${game.matchId}`}>
                            <Button size="xs" variant="outline">
                              <Eye className="size-3" />
                              Details
                            </Button>
                          </Link>
                        )}
                        {game.inDb && !game.addToBetting && (
                          <Button size="xs" onClick={() => handleAddToBet(game.matchId!)} disabled={isAdding}>
                            <Plus className="size-3" />
                            {isAdding ? 'Adding...' : 'Add to Bets'}
                          </Button>
                        )}
                        {game.inDb && game.addToBetting && (
                          <span className="inline-block rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-semibold text-green-300">Active</span>
                        )}
                        {!game.inDb && (
                          <span className="text-xs text-zinc-400">Not in DB</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {upcomingMatches.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400 shadow-sm">
            No upcoming matches
          </div>
        )}
      </div>
    </div>
  );
}
