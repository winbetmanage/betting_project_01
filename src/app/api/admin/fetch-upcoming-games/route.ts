import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { FetchUpcomingGamesList } from '@/lib/api_links';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(FetchUpcomingGamesList);

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Odds API error ${res.status}: ${body}` },
        { status: 502 },
      );
    }

    const data = await res.json();

    const filePath = path.join(process.cwd(), 'src', 'lib', 'upcominggameslist.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch upcoming games' },
      { status: 500 },
    );
  }
}
