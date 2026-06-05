import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ errors: { form: ['Unauthorized'] } }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, newPassword2 } = await request.json();

    if (!currentPassword) {
      return NextResponse.json(
        { errors: { form: ['Current password is required'] } },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({ where: { id: session.id } });
    if (!admin) {
      return NextResponse.json({ errors: { form: ['Admin not found'] } }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) {
      return NextResponse.json(
        { errors: { form: ['Current password is incorrect'] } },
        { status: 403 }
      );
    }

    const data: Record<string, string> = {};

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { errors: { form: ['New password must be at least 6 characters'] } },
          { status: 400 }
        );
      }
      data.password = await bcrypt.hash(newPassword, 12);
    }

    if (newPassword2 !== undefined) {
      if (newPassword2 && newPassword2.length < 6) {
        return NextResponse.json(
          { errors: { form: ['Second password must be at least 6 characters'] } },
          { status: 400 }
        );
      }
      data.password2 = newPassword2 ? await bcrypt.hash(newPassword2, 12) : '';
    }

    await prisma.admin.update({
      where: { id: session.id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { errors: { form: ['Something went wrong'] } },
      { status: 500 }
    );
  }
}
