import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import countries from '@/lib/countries.json';

const countryFlagMap = Object.fromEntries(
  countries.map((c) => [c.name, c.flag])
);

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function MatchesListPage() {
  const matches = await prisma.match.findMany({
    include: { gameOddsTable: true },
    orderBy: { kickoffTime: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Matches List</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {matches.length} match{matches.length !== 1 && 'es'} in the database
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Odds</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => {
              const homeFlag = countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
              const awayFlag = countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];
              const ot = match.gameOddsTable;

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
                      <span className="font-medium text-zinc-800">{match.homeTeam}</span>
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
                      <span className="font-medium text-zinc-800">{match.awayTeam}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    <div>{formatDate(match.kickoffTime)}</div>
                    <div className="text-xs">{formatTime(match.kickoffTime)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {match.stage}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        match.status === 'UPCOMING'
                          ? 'bg-blue-50 text-blue-700'
                          : match.status === 'LIVE'
                          ? 'bg-green-50 text-green-700'
                          : match.status === 'FINISHED'
                          ? 'bg-zinc-100 text-zinc-600'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {match.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-700">
                    {match.homeScore != null ? `${match.homeScore} - ${match.awayScore}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ot ? (
                      <div className="flex flex-wrap justify-end gap-1">
                        {ot.homeTeamOdds != null && (
                          <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs text-zinc-600">
                            {match.homeTeam}: ×{ot.homeTeamOdds.toFixed(2)}
                          </span>
                        )}
                        {ot.drawOdds != null && (
                          <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs text-zinc-600">
                            Draw: ×{ot.drawOdds.toFixed(2)}
                          </span>
                        )}
                        {ot.awayTeamOdds != null && (
                          <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs text-zinc-600">
                            {match.awayTeam}: ×{ot.awayTeamOdds.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">No odds</span>
                    )}
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
