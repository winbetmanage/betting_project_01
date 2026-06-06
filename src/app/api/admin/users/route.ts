import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  const allowedSortFields = ['username', 'email', 'balance', 'status', 'createdAt'];
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        balance: true,
        createdAt: true,
        _count: { select: { bets: true, transfers: true } },
      },
      orderBy: { [orderField]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pageSize });
}
