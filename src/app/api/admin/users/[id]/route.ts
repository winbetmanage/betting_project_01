import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10')));

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      balance: true,
      createdAt: true,
      _count: { select: { bets: true, transfers: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [transfers, transfersTotal] = await Promise.all([
    prisma.moneyTransfers.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.moneyTransfers.count({ where: { userId: id } }),
  ]);

  return NextResponse.json({ user, transfers, transfersTotal, page, pageSize });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { username, email, balance, status } = await request.json();

    if (!username || !email || balance == null || !status) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        username,
        email,
        balance,
        status,
      },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        balance: true,
        createdAt: true,
        _count: { select: { bets: true, transfers: true } },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
