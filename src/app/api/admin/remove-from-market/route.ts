import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { matchId, marketKey } = await request.json();
    if (!matchId || !marketKey) {
      return NextResponse.json({ error: 'matchId and marketKey are required' }, { status: 400 });
    }

    switch (marketKey) {
      case 'h2h':
      case 'h2h_lay':
      case 'h2h_h1':
      case 'h2h_h2':
        await prisma.h2h_records.deleteMany({ where: { matchId, type_name: marketKey } });
        break;
      case 'btts':
        await prisma.btts_records.deleteMany({ where: { matchId } });
        break;
      case 'totals':
      case 'totals_h1':
      case 'alternate_totals':
        await prisma.totals_records.deleteMany({ where: { matchId, type_name: marketKey } });
        break;
      case 'double_chance':
        await prisma.double_chance_records.deleteMany({ where: { matchId } });
        break;
      case 'draw_no_bet':
        await prisma.no_bet_records.deleteMany({ where: { matchId } });
        break;
      case 'spreads':
      case 'spreads_h1':
      case 'alternate_spreads':
        await prisma.spread_records.deleteMany({ where: { matchId, type_name: marketKey } });
        break;
      default:
        return NextResponse.json({ error: `Unsupported market key: ${marketKey}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove market' }, { status: 500 });
  }
}
