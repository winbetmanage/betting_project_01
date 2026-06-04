import schedule from '@/lib/full_game_schedule2.json';
import countries from '@/lib/countries.json';
import Image from 'next/image';
import Navbar from '@/components/common_components/Navbar';
import HeroSection from '@/components/common_components/HeroSection';

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

function MatchRow({ match }: { match: (typeof schedule)[number] }) {
  const homeFlag = countryFlagMap[match.homeTeam as keyof typeof countryFlagMap];
  const awayFlag = countryFlagMap[match.awayTeam as keyof typeof countryFlagMap];

  return (
    <div className="flex items-center gap-2 sm:gap-4 rounded-lg border border-zinc-200 bg-white px-3 py-3 sm:px-5 sm:py-4 text-secondarycolor shadow-sm transition hover:shadow-md">
      <div className="hidden min-w-[80px] text-xs text-zinc-500 sm:block">
        {formatDate(match.date)}
      </div>

      <div className="flex flex-1 items-center gap-2 sm:gap-3">
        <div className="flex w-20 flex-col items-center gap-1 sm:w-28 sm:flex-row">
          {homeFlag && (
            <Image
              src={`/flags/${homeFlag}`}
              alt={match.homeTeam}
              width={24}
              height={16}
              className="h-4 w-6 object-cover"
            />
          )}
          <span className="truncate text-xs font-medium text-right sm:text-left sm:text-sm">
            {match.homeTeam}
          </span>
        </div>

        <span className="shrink-0 text-xs font-bold text-zinc-400">VS</span>

        <div className="flex w-20 flex-col items-center gap-1 sm:w-28 sm:flex-row-reverse">
          {awayFlag && (
            <Image
              src={`/flags/${awayFlag}`}
              alt={match.awayTeam}
              width={24}
              height={16}
              className="h-4 w-6 object-cover"
            />
          )}
          <span className="truncate text-xs font-medium sm:text-sm">
            {match.awayTeam}
          </span>
        </div>
      </div>

      <div className="hidden text-right text-xs text-zinc-500 md:block">
        <div>{match.timeLocal}</div>
        <div className="text-zinc-400">{match.stadium}</div>
      </div>

      <div className="block text-right text-xs text-zinc-500 md:hidden">
        <div>{formatDate(match.date)}</div>
        <div>{match.timeLocal}</div>
      </div>
    </div>
  );
}

function GroupSection({
  label,
  matches,
}: {
  label: string;
  matches: (typeof schedule)[number][];
}) {
  if (matches.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-zinc-200">{label}</h3>
      <div className="space-y-2">
        {matches.map((m) => (
          <MatchRow key={m.matchId} match={m} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const grouped: Record<string, (typeof schedule)[number][]> = {};
  for (const match of schedule) {
    const key = match.stage;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(match);
  }

  return (
    <>
      <Navbar />
      <HeroSection />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            2026 World Cup Schedule
          </h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">
            104 matches across 16 venues in USA, Canada &amp; Mexico
          </p>
        </div>

        <div className="space-y-10">
          {stageOrder.map((stage) => {
            const stageMatches = grouped[stage];
            if (!stageMatches) return null;

            if (stage === 'Group Stage') {
              return (
                <section key={stage}>
                  <h2 className="mb-5 text-xl font-bold text-white">
                    {stage}
                  </h2>
                  <div className="space-y-8">
                    {groupLabels.split('').map((letter) => {
                      const groupMatches = stageMatches.filter(
                        (m) => m.group === letter
                      );
                      if (letter === 'A') {
                        return (
                          <div key={letter} className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                              <GroupSection
                                label={`Group ${letter}`}
                                matches={groupMatches}
                              />
                            </div>
                            <div>
                              <div className="w-full rounded-xl lg:sticky lg:top-20">
                                <img
                                  src="/images/winbetting.png"
                                  alt="WinBet"
                                  className="w-full rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <GroupSection
                          key={letter}
                          label={`Group ${letter}`}
                          matches={groupMatches}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            }

            return (
              <section key={stage}>
                <h2 className="mb-5 text-xl font-bold text-white">
                  {stage}
                </h2>
                <div className="space-y-2">
                  {stageMatches.map((m) => (
                    <MatchRow key={m.matchId} match={m} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
