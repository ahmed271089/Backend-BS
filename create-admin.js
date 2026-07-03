const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@bestsolving.app';
  const name = 'System Admin';
  const password = 'admin123';
  const role = 'ADMIN';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role,
      passwordHash,
      status: 'ACTIVE',
      isVerified: true
    },
    create: {
      email,
      name,
      passwordHash,
      provider: 'EMAIL',
      role,
      status: 'ACTIVE',
      isVerified: true
    }
  });

  console.log('Successfully created/updated Admin user:');
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${admin.role}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
