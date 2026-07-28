import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const rooms = [
  {
    name: 'Kyiv',
    capacity: 8,
    floor: 1,
    location: 'North wing',
    amenities: 'tv,whiteboard,videoconf',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  },
  {
    name: 'Lviv',
    capacity: 4,
    floor: 1,
    location: 'North wing',
    amenities: 'tv,whiteboard',
    imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80',
  },
  {
    name: 'Odesa',
    capacity: 12,
    floor: 2,
    location: 'East wing',
    amenities: 'projector,videoconf,whiteboard',
    imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80',
  },
  {
    name: 'Kharkiv',
    capacity: 2,
    floor: 2,
    location: 'Phone booth',
    amenities: 'videoconf',
    imageUrl: 'https://images.unsplash.com/photo-1600494603989-9650cf6ddd3d?w=800&q=80',
  },
  {
    name: 'Dnipro',
    capacity: 6,
    floor: 3,
    location: 'West wing',
    amenities: 'tv,whiteboard',
    imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
  },
  {
    name: 'Ivano-Frankivsk',
    capacity: 20,
    floor: 3,
    location: 'Conference hall',
    amenities: 'projector,videoconf,whiteboard,tv',
    imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
  },
];

/** Build a Date today at the given hour/minute (local time). */
function todayAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@meetrooms.dev' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@meetrooms.dev',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // Rooms — reset and recreate so seeding is idempotent
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();

  const createdRooms = [];
  for (const room of rooms) {
    createdRooms.push(await prisma.room.create({ data: room }));
  }

  // A couple of sample bookings today so the dashboard isn't empty
  const kyiv = createdRooms.find((r) => r.name === 'Kyiv')!;
  const odesa = createdRooms.find((r) => r.name === 'Odesa')!;

  await prisma.booking.createMany({
    data: [
      {
        roomId: kyiv.id,
        userId: demoUser.id,
        title: 'Daily standup',
        startTime: todayAt(10, 0),
        endTime: todayAt(10, 30),
      },
      {
        roomId: odesa.id,
        userId: demoUser.id,
        title: 'Sprint planning',
        startTime: todayAt(14, 0),
        endTime: todayAt(15, 30),
      },
    ],
  });

  console.log(`✅ Seeded ${createdRooms.length} rooms and demo user (demo@meetrooms.dev / password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
