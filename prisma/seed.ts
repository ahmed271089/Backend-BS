import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Technology', slug: 'technology', icon: '💻' },
    { name: 'Cars', slug: 'cars', icon: '🚗' },
    { name: 'Home Repair', slug: 'home-repair', icon: '🔧' },
    { name: 'Electrical', slug: 'electrical', icon: '⚡' },
    { name: 'Gardening', slug: 'gardening', icon: '🌱' },
    { name: 'Appliances', slug: 'appliances', icon: '🧺' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  // System account used to post the AI's diagnosis as a comment.
  await prisma.user.upsert({
    where: { email: 'ai-agent@system.local' },
    update: {},
    create: {
      email: 'ai-agent@system.local',
      name: 'AI Agent',
      provider: 'EMAIL',
      isVerified: true,
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
