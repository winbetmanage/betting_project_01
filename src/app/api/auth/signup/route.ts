import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  referrerUsername: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { email, username, password, referrerUsername } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return NextResponse.json(
        { errors: { [field]: [`This ${field} is already taken`] } },
        { status: 409 }
      );
    }

    // Validate referrer username exists if provided
    if (referrerUsername) {
      const referrerUser = await prisma.user.findUnique({
        where: { username: referrerUsername },
      });
      if (!referrerUser) {
        return NextResponse.json(
          { errors: { referrerUsername: ['Referral username not found'] } },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        ...(referrerUsername ? { referrer: referrerUsername } : {}),
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, username: user.username, referrer: user.referrer },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { errors: { form: ['Something went wrong. Please try again.'] } },
      { status: 500 }
    );
  }
}
