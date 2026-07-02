import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(null, { status: 200 });
  }

  // Admins are in the Admin table, not User — return session directly
  if (session.role === 'ADMIN') {
    return NextResponse.json(session);
  }

  // Regular users: attach affiliate_link from the User table
  const userRecord = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, username: true, affiliate_link: true },
  });

  if (!userRecord) {
    return NextResponse.json(null, { status: 200 });
  }

  return NextResponse.json({ ...session, affiliate_link: userRecord.affiliate_link });
}
