import { defineConfig } from 'vitest/config';

// Tests run against a dedicated database so they never touch dev data.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://meetrooms:meetrooms@localhost:5433/meetrooms_test?schema=public';

// Make it available to globalSetup (which shells out to `prisma db push`).
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    setupFiles: ['./test/setup.ts'],
    // The suite shares one database, so run serially to avoid races.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret',
    },
  },
});
