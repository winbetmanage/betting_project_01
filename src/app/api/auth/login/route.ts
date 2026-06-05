import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password, password2, adminLogin } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { errors: { form: ['Email and password are required'] } },
        { status: 400 }
      );
    }

    if (adminLogin) {
      const admin = await prisma.admin.findUnique({ where: { email } });

      if (
        !admin ||
        !(await bcrypt.compare(password, admin.password)) ||
        !admin.password2 ||
        !(await bcrypt.compare(password2 || '', admin.password2))
      ) {
        return NextResponse.json(
          { errors: { form: ['Invalid admin credentials'] } },
          { status: 401 }
        );
      }

      await createSession({
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: 'ADMIN',
      });

      return NextResponse.json({
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: 'ADMIN',
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { errors: { form: ['Invalid email or password'] } },
        { status: 401 }
      );
    }

    await createSession({
      id: user.id,
      email: user.email,
      username: user.username,
      role: 'USER',
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: 'USER',
    });
  } catch {
    return NextResponse.json(
      { errors: { form: ['Something went wrong. Please try again.'] } },
      { status: 500 }
    );
  }
}
