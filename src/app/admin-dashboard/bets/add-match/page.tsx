'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import countries from '@/lib/countries.json';

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

export default function AddMatchToBetPage() {
  const [activeBets, setActiveBets] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/betting-manage');
      const data = await res.json();
      setActiveBets(data.activeBets ?? []);
      setUpcomingMatches(data.upcomingMatches ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEnable() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await fetch('/api/admin/betting-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: Array.from(selected), addToBetting: true }),
      });
      setSelected(new Set());
      await fetchData();
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setSaving(true);
    try {
      await fetch('/api/admin/betting-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: [id], addToBetting: false }),
      });
      await fetchData();
    } catch {
    } finally {
      setSaving(false);
    }
  }

  const hasSelection = selected.size > 0;

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
                  return (
                    <tr key={match.id} className="border-b border-zinc-100 last:border-0 hover:bg-green-50">
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
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="xs" onClick={() => handleRemove(match.id)} disabled={saving}>
                          <X className="size-3" />
                          Remove
                        </Button>
                      </td>
                    </tr>
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
          {hasSelection && (
            <Button onClick={handleEnable} disabled={saving}>
              <Check className="size-4" />
              {saving ? 'Saving...' : `Enable Betting (${selected.size})`}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Home</th>
                <th className="px-4 py-3 text-right">Draw</th>
                <th className="px-4 py-3 text-right">Away</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingMatches.map((match) => {
                const homeFlag = countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
                const awayFlag = countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];
                const odds = match.gameOddsTable;
                const isActive = match.addToBetting;
                return (
                  <tr
                    key={match.id}
                    className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50 cursor-pointer ${isActive ? 'bg-green-50' : ''}`}
                    onClick={() => !isActive && toggleSelect(match.id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {!isActive && (
                        <input
                          type="checkbox"
                          checked={selected.has(match.id)}
                          onChange={() => toggleSelect(match.id)}
                          className="h-4 w-4 rounded border-zinc-300 text-primarycolor focus:ring-primarycolor"
                        />
                      )}
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
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{match.stage}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{odds?.homeTeamOdds != null ? `×${odds.homeTeamOdds}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{odds?.drawOdds != null ? `×${odds.drawOdds}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{odds?.awayTeamOdds != null ? `×${odds.awayTeamOdds}` : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {isActive ? (
                        <span className="inline-block rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-semibold text-green-300">Active</span>
                      ) : (
                        <span className="inline-block rounded-full bg-zinc-600/40 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">Off</span>
                      )}
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
