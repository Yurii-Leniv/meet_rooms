import { beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/prisma.js';

// Start every test from an empty database for full isolation.
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Booking", "Room", "User", "Company" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
