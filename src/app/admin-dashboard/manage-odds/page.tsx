'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Pencil } from 'lucide-react';
import countries from '@/lib/countries.json';

const countryFlagMap = Object.fromEntries(
  countries.map((c: { name: string; flag: string }) => [c.name, c.flag])
);

interface OddsTable {
  homeTeamOdds: number | null;
  awayTeamOdds: number | null;
  drawOdds: number | null;
}

interface Match {
  id: string;
  apiMatchId: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  stage: string;
  status: string;
  gameOddsTable: OddsTable | null;
}

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

export default function ManageOddsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [homeOdds, setHomeOdds] = useState('');
  const [awayOdds, setAwayOdds] = useState('');
  const [drawOdds, setDrawOdds] = useState('');

  useEffect(() => {
    fetch('/api/admin/odds')
      .then((r) => r.json())
      .then((data) => {
        setMatches(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openEditor = useCallback((match: Match) => {
    setEditingMatch(match);
    const odds = match.gameOddsTable;
    setHomeOdds(odds?.homeTeamOdds?.toString() ?? '');
    setAwayOdds(odds?.awayTeamOdds?.toString() ?? '');
    setDrawOdds(odds?.drawOdds?.toString() ?? '');
    setDialogOpen(true);
  }, []);

  async function handleSave() {
    if (!editingMatch) return;
    setSaving(true);

    try {
      const res = await fetch('/api/admin/odds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: editingMatch.id,
          homeTeamOdds: homeOdds ? parseFloat(homeOdds) : null,
          awayTeamOdds: awayOdds ? parseFloat(awayOdds) : null,
          drawOdds: drawOdds ? parseFloat(drawOdds) : null,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      const updated = await res.json();

      setMatches((prev) =>
        prev.map((m) =>
          m.id === editingMatch.id ? { ...m, gameOddsTable: updated } : m
        )
      );

      setDialogOpen(false);
      setEditingMatch(null);
    } catch {
      alert('Failed to save odds');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Manage Odds</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit 1X2 odds for each match
        </p>
      </div>

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
            {matches.map((match) => {
              const odds = match.gameOddsTable;
              const homeFlag =
                countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
              const awayFlag =
                countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];

              return (
                <tr
                  key={match.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {homeFlag && (
                        <Image
                          src={`/flags/${homeFlag}`}
                          alt={match.homeTeam}
                          width={20}
                          height={14}
                          className="h-3.5 w-5 shrink-0 object-cover"
                        />
                      )}
                      <span className="font-medium text-zinc-800">
                        {match.homeTeam}
                      </span>
                      <span className="text-xs text-zinc-400">v</span>
                      {awayFlag && (
                        <Image
                          src={`/flags/${awayFlag}`}
                          alt={match.awayTeam}
                          width={20}
                          height={14}
                          className="h-3.5 w-5 shrink-0 object-cover"
                        />
                      )}
                      <span className="font-medium text-zinc-800">
                        {match.awayTeam}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {formatDate(match.kickoffTime)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                    {odds?.homeTeamOdds != null
                      ? `×${odds.homeTeamOdds}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                    {odds?.drawOdds != null ? `×${odds.drawOdds}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                    {odds?.awayTeamOdds != null
                      ? `×${odds.awayTeamOdds}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditor(match)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {matches.length === 0 && (
        <div className="py-16 text-center text-sm text-zinc-400">
          No matches found. Run the seed script first.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {editingMatch && (
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>
                {editingMatch.homeTeam} vs {editingMatch.awayTeam}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Home Odds ({editingMatch.homeTeam})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={homeOdds}
                  onChange={(e) => setHomeOdds(e.target.value)}
                  placeholder="e.g. 2.10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Draw Odds
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={drawOdds}
                  onChange={(e) => setDrawOdds(e.target.value)}
                  placeholder="e.g. 3.40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Away Odds ({editingMatch.awayTeam})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={awayOdds}
                  onChange={(e) => setAwayOdds(e.target.value)}
                  placeholder="e.g. 3.80"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
