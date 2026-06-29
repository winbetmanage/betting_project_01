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

export default async function BettingGamesPage() {
  const matches = await prisma.match.findMany({
    where: { addToBetting: true },
    include: { gameOddsTable: true, _count: { select: { bets: true } } },
    orderBy: { kickoffTime: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Games Added to Betting</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {matches.length} game{matches.length !== 1 && 's'} currently available for betting
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400 shadow-sm">
          No games have been added to betting yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Home</th>
                <th className="px-4 py-3 text-right">Draw</th>
                <th className="px-4 py-3 text-right">Away</th>
                <th className="px-4 py-3 text-center">Bets</th>
                <th className="px-4 py-3 text-center">Status</th>
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
                    <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                      {ot?.homeTeamOdds != null ? `×${ot.homeTeamOdds.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                      {ot?.drawOdds != null ? `×${ot.drawOdds.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-800">
                      {ot?.awayTeamOdds != null ? `×${ot.awayTeamOdds.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
                        {match._count.bets}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
