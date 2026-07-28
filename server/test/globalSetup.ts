import { execSync } from 'node:child_process';

export default function setup() {
  try {
    execSync(
      'docker exec meetrooms-db psql -U meetrooms -d postgres -c "CREATE DATABASE meetrooms_test"',
      { stdio: 'ignore' },
    );
  } catch {
    void 0;
  }

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: process.env,
  });
}
