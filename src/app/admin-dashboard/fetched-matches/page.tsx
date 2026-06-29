import Image from 'next/image';
import games from '@/lib/list_of_games_from_odds_api.json';
import countries from '@/lib/countries.json';

const countryFlagMap = Object.fromEntries(
  countries.map((c) => [c.name, c.flag])
);

const nameOverrides: Record<string, string> = {
  'DR Congo': 'Congo DR',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
};

function resolveFlag(team: string): string | undefined {
  return countryFlagMap[nameOverrides[team] ?? team];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FetchedMatchesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Fetched Matches</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {games.length} matches from The Odds API
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Home</th>
              <th className="px-4 py-3" />
              <th className="px-4 py-3">Away</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Kickoff</th>
              <th className="px-4 py-3">API ID</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g, i) => {
              const homeFlag = resolveFlag(g.home_team);
              const awayFlag = resolveFlag(g.away_team);
              return (
                <tr
                  key={g.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3 text-xs text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {homeFlag && (
                        <Image
                          src={`/flags/${homeFlag}`}
                          alt={g.home_team}
                          width={20}
                          height={14}
                          className="h-3.5 w-5 shrink-0 object-cover"
                        />
                      )}
                      <span className="font-medium text-zinc-800">{g.home_team}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-zinc-400">v</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {awayFlag && (
                        <Image
                          src={`/flags/${awayFlag}`}
                          alt={g.away_team}
                          width={20}
                          height={14}
                          className="h-3.5 w-5 shrink-0 object-cover"
                        />
                      )}
                      <span className="font-medium text-zinc-800">{g.away_team}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {formatDate(g.commence_time)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {formatTime(g.commence_time)}
                  </td>
                  <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-zinc-400">
                    {g.id}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
