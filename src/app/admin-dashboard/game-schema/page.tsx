import schedule from '@/lib/full_game_schedule2.json';
import countries from '@/lib/countries.json';
import Image from 'next/image';

const countryFlagMap = Object.fromEntries(
  countries.map((c) => [c.name, c.flag])
);

const stageOrder = [
  'Group Stage',
  'Round of 32',
  'Round of 16',
  'Quarter-finals',
  'Semi-finals',
  'Third Place',
  'Final',
];

const groupLabels = 'ABCDEFGHIJKL';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function MatchCard({ match }: { match: (typeof schedule)[number] }) {
  const homeFlag = countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
  const awayFlag = countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm transition hover:shadow-md">
      <div className="w-16 shrink-0 text-[11px] text-zinc-400">
        {match.date.slice(5)} {match.timeLocal}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <div className="flex w-24 items-center gap-1.5 text-right">
          <span className="flex-1 truncate text-zinc-800">{match.homeTeam}</span>
          {homeFlag && (
            <Image
              src={`/flags/${homeFlag}`}
              alt={match.homeTeam}
              width={20}
              height={14}
              className="h-3.5 w-5 shrink-0 object-cover"
            />
          )}
        </div>
        <span className="shrink-0 text-xs font-semibold text-zinc-400">vs</span>
        <div className="flex w-24 items-center gap-1.5">
          {awayFlag && (
            <Image
              src={`/flags/${awayFlag}`}
              alt={match.awayTeam}
              width={20}
              height={14}
              className="h-3.5 w-5 shrink-0 object-cover"
            />
          )}
          <span className="flex-1 truncate text-zinc-800">{match.awayTeam}</span>
        </div>
      </div>
      <div className="hidden w-36 text-[11px] text-zinc-400 sm:block truncate">
        {match.stadium}, {match.city}
      </div>
    </div>
  );
}

export default function GameSchemaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Game Schema</h1>
        <p className="mt-1 text-sm text-zinc-500">
          2026 FIFA World Cup — Full Match Schedule
        </p>
      </div>

      {stageOrder.map((stage) => {
        const stageMatches = schedule.filter((m) => m.stage === stage);
        if (stageMatches.length === 0) return null;

        const isGroup = stage === 'Group Stage';

        return (
          <div key={stage}>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">{stage}</h2>

            {isGroup ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {groupLabels.split('').map((letter) => {
                  const groupMatches = stageMatches.filter(
                    (m) => m.group === letter
                  );
                  if (groupMatches.length === 0) return null;

                  return (
                    <div
                      key={letter}
                      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">
                        Group {letter}
                      </h3>
                      <div className="space-y-2">
                        {groupMatches.map((match) => (
                          <MatchCard key={match.matchId} match={match} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {stageMatches.map((match) => (
                  <MatchCard key={match.matchId} match={match} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
