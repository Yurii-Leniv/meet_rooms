import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';

export const app: Express = createApp();

interface Registered {
  token: string;
  user: { id: string; role: string; companyId: string; email: string };
  company: { id: string; name: string; inviteCode: string };
}

let counter = 0;
function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}${counter}@test.dev`;
}

/** Register a brand-new company; the returned user is its ADMIN. */
export async function registerCompany(companyName = 'Acme'): Promise<Registered> {
  const res = await request(app)
    .post('/api/auth/register/company')
    .send({
      name: 'Admin',
      email: uniqueEmail('admin'),
      password: 'password123',
      companyName,
    });
  return res.body;
}

/** Join an existing company by invite code; the returned user is a MEMBER. */
export async function joinCompany(inviteCode: string): Promise<Registered> {
  const res = await request(app)
    .post('/api/auth/register/join')
    .send({
      name: 'Member',
      email: uniqueEmail('member'),
      password: 'password123',
      inviteCode,
    });
  return res.body;
}

/** Create a room in the admin's company; returns the created room. */
export async function createRoom(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Kyiv', capacity: 6, floor: 1, amenities: ['tv'], ...overrides });
  return res;
}

/** An ISO timestamp offset from now by the given number of hours. */
export function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}
