import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('masterkid', 12);
  const password2 = await bcrypt.hash('masterkid2', 12);

  const existing = await prisma.admin.findUnique({
    where: { email: 'admin@admin.com' },
  });

  if (existing) {
    console.log('Admin account already exists, updating passwords...');
    await prisma.admin.update({
      where: { email: 'admin@admin.com' },
      data: { password, password2 },
    });
    console.log('Admin passwords updated.');
  } else {
    await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@admin.com',
        username: 'admin',
        password,
        password2,
      },
    });
    console.log('Admin account created: admin@admin.com');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
