import { execSync } from 'node:child_process';

/**
 * Runs once before the whole suite: ensures a clean test database exists and
 * that its schema matches the Prisma schema.
 */
export default function setup() {
  // Create the test database (ignore the error if it already exists).
  try {
    execSync(
      'docker exec meetrooms-db psql -U meetrooms -d postgres -c "CREATE DATABASE meetrooms_test"',
      { stdio: 'ignore' },
    );
  } catch {
    // Already exists — that's fine.
  }

  // Sync the schema to the test database.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: process.env,
  });
}
