import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_INVITE_CODE = 'DEMO-ABCDE';
const DEMO_FLOORS = 3;

const rooms = [
  { name: 'Focus Room 1', capacity: 2, floor: 1, location: null, amenities: 'videoconf', imageUrl: 'https://images.unsplash.com/photo-1600494603989-9650cf6ddd3d?w=800&q=80' },
  { name: 'Focus Room 2', capacity: 2, floor: 1, location: null, amenities: 'videoconf', imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80' },
  { name: 'Huddle A', capacity: 4, floor: 2, location: null, amenities: 'tv,whiteboard', imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80' },
  { name: 'Huddle B', capacity: 4, floor: 2, location: null, amenities: 'tv,whiteboard', imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80' },
  { name: 'Meeting Room', capacity: 8, floor: 3, location: null, amenities: 'tv,whiteboard,videoconf', imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80' },
  { name: 'Board Room', capacity: 12, floor: 3, location: null, amenities: 'projector,videoconf,whiteboard,tv', imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80' },
];

function todayAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: { name: 'Demo Company', inviteCode: DEMO_INVITE_CODE, floors: DEMO_FLOORS },
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Demo Admin',
      email: 'demo@meetrooms.dev',
      passwordHash,
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  const createdRooms = [];
  for (const room of rooms) {
    createdRooms.push(
      await prisma.room.create({ data: { ...room, companyId: company.id } }),
    );
  }

  const huddleA = createdRooms.find((r) => r.name === 'Huddle A')!;
  const board = createdRooms.find((r) => r.name === 'Board Room')!;
  await prisma.booking.createMany({
    data: [
      { roomId: huddleA.id, userId: admin.id, title: 'Daily standup', startTime: todayAt(10, 0), endTime: todayAt(10, 30) },
      { roomId: board.id, userId: admin.id, title: 'Sprint planning', startTime: todayAt(14, 0), endTime: todayAt(15, 30) },
    ],
  });

  console.log(`✅ Seeded company "${company.name}" with ${createdRooms.length} rooms`);
  console.log('   Admin login:  demo@meetrooms.dev / password123');
  console.log(`   Invite code:  ${DEMO_INVITE_CODE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
