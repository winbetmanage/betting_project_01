import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ errors: { form: ['Unauthorized'] } }, { status: 401 });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, username: true },
  });

  if (!admin) {
    return NextResponse.json({ errors: { form: ['Admin not found'] } }, { status: 404 });
  }

  return NextResponse.json(admin);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ errors: { form: ['Unauthorized'] } }, { status: 401 });
  }

  try {
    const { name, email, username, password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { errors: { form: ['Password is required to confirm changes'] } },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({ where: { id: session.id } });
    if (!admin) {
      return NextResponse.json({ errors: { form: ['Admin not found'] } }, { status: 404 });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return NextResponse.json(
        { errors: { form: ['Incorrect password'] } },
        { status: 403 }
      );
    }

    const updated = await prisma.admin.update({
      where: { id: session.id },
      data: { name, email, username },
      select: { id: true, name: true, email: true, username: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { errors: { form: ['Something went wrong'] } },
      { status: 500 }
    );
  }
}
