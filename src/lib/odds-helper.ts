import fs from 'fs';
import path from 'path';

export function findOddsEventId(homeTeam: string, awayTeam: string): string | null {
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'upcominggameslist.json');
    if (!fs.existsSync(filePath)) return null;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const games: any[] = Array.isArray(raw) ? raw : [];
    const game = games.find(
      (g) => g.home_team === homeTeam && g.away_team === awayTeam,
    );
    return game?.id ?? null;
  } catch {
    return null;
  }
}
