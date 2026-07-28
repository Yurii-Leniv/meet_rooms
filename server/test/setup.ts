import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/prisma.js';

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Booking", "Room", "User", "Company" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
