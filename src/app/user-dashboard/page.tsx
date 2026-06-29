import fs from 'fs';
import path from 'path';
import countries from '@/lib/countries.json';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/common_components/Navbar';
import HeroSection from '@/components/common_components/HeroSection';

const countryFlagMap = Object.fromEntries(
  countries.map((c) => [c.name, c.flag])
);

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

export default function UserDashboard() {
  const filePath = path.join(process.cwd(), 'src', 'lib', 'upcominggameslist.json');
  let games: any[] = [];
  if (fs.existsSync(filePath)) {
    try {
      games = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {}
  }

  return (
    <>
      <Navbar />
      <HeroSection />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Upcoming Games
          </h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">
            {games.length} match{games.length !== 1 ? 'es' : ''} coming soon
          </p>
        </div>

        <Link
          href="/user-dashboard/games"
          className="mb-8 block w-full rounded-xl bg-primarycolor px-6 py-4 text-center text-lg font-bold text-white transition hover:brightness-90"
        >
          Start Betting
        </Link>

        {games.length === 0 ? (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-12 text-center">
            <p className="text-zinc-400">No upcoming games at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => {
              const homeFlag = countryFlagMap[game.home_team as keyof typeof countryFlagMap];
              const awayFlag = countryFlagMap[game.away_team as keyof typeof countryFlagMap];
              return (
                <Link
                  key={game.id}
                  href="/user-dashboard/games"
                  className="block rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition hover:border-primarycolor/50 hover:shadow-lg"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {homeFlag && <Image src={`/flags/${homeFlag}`} alt="" width={24} height={16} className="h-4 w-6 shrink-0 object-cover" />}
                      <span className="truncate text-sm font-semibold text-white">{game.home_team}</span>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-zinc-500">VS</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-sm font-semibold text-white">{game.away_team}</span>
                      {awayFlag && <Image src={`/flags/${awayFlag}`} alt="" width={24} height={16} className="h-4 w-6 shrink-0 object-cover" />}
                    </div>
                  </div>
                  <div className="text-center text-xs text-zinc-400">
                    {formatDate(game.commence_time)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
