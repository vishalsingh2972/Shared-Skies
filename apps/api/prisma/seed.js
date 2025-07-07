//test
require('dotenv').config({ path: '../.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { clerkId: 'vishal' },
    update: {},
    create: {
      clerkId: 'vishal',
      username: 'vishal',
      email: 'vishal@example.com',
    },
  });

  const room = await prisma.room.upsert({
    where: { id: 'chill-vibes' },
    update: {},
    create: {
      id: 'chill-vibes',
      mood: 'Chill Vibes',
    },
  });

  await prisma.roomUser.create({
    data: {
      userId: user.id,
      roomId: room.id,
    },
  });

  console.log('✅ Seeded User and Room successfully.');
  console.log('User ID:', user.id);
  console.log('Room ID:', room.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });