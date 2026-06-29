import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { syncAllSportmonksOdds } from '@/lib/new_odds_api';

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SPORTMONKS_API_KEY) {
    return NextResponse.json({ error: 'SPORTMONKS_API_KEY not configured in .env' }, { status: 500 });
  }

  try {
    const result = await syncAllSportmonksOdds();

    const message = result.errors.length === 0
      ? `Synced ${result.fixturesFetched} fixtures, inserted ${result.oddsInserted} market-odds rows.`
      : `Synced ${result.fixturesFetched} fixtures (${result.errors.length} errors), inserted ${result.oddsInserted} market-odds rows.`;

    return NextResponse.json({
      success: true,
      ...result,
      message,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
