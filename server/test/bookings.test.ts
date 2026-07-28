import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerCompany, joinCompany, createRoom, hoursFromNow } from './helpers.js';

async function setup() {
  const admin = await registerCompany();
  const room = await createRoom(admin.token);
  return { admin, roomId: room.body.room.id as string };
}

function book(token: string, roomId: string, title: string, start: string, end: string) {
  return request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ roomId, title, startTime: start, endTime: end });
}

describe('bookings', () => {
  it('creates a booking in a free slot', async () => {
    const { admin, roomId } = await setup();
    const res = await book(admin.token, roomId, 'Standup', hoursFromNow(1), hoursFromNow(2));
    expect(res.status).toBe(201);
    expect(res.body.booking.title).toBe('Standup');
  });

  it('rejects an overlapping booking (409)', async () => {
    const { admin, roomId } = await setup();
    await book(admin.token, roomId, 'First', hoursFromNow(1), hoursFromNow(3));
    const clash = await book(admin.token, roomId, 'Overlap', hoursFromNow(2), hoursFromNow(4));
    expect(clash.status).toBe(409);
  });

  it('allows a back-to-back booking that only touches at the boundary', async () => {
    const { admin, roomId } = await setup();
    await book(admin.token, roomId, 'Morning sync', hoursFromNow(1), hoursFromNow(2));
    const adjacent = await book(admin.token, roomId, 'Midday sync', hoursFromNow(2), hoursFromNow(3));
    expect(adjacent.status).toBe(201);
  });

  it('rejects a booking that ends before it starts', async () => {
    const { admin, roomId } = await setup();
    const res = await book(admin.token, roomId, 'Bad', hoursFromNow(3), hoursFromNow(1));
    expect(res.status).toBe(400);
  });

  it('rejects a booking in the past', async () => {
    const { admin, roomId } = await setup();
    const res = await book(admin.token, roomId, 'Past', hoursFromNow(-3), hoursFromNow(-2));
    expect(res.status).toBe(400);
  });

  it('cannot book a room in another company', async () => {
    const { roomId } = await setup();
    const other = await registerCompany('Globex');
    const res = await book(other.token, roomId, 'Sneaky', hoursFromNow(1), hoursFromNow(2));
    expect(res.status).toBe(404);
  });

  it('lets the owner cancel, and blocks a non-owner member', async () => {
    const { admin, roomId } = await setup();
    const member = await joinCompany(admin.company.inviteCode);
    const created = await book(admin.token, roomId, 'Mine', hoursFromNow(1), hoursFromNow(2));
    const bookingId = created.body.booking.id;

    const blocked = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(blocked.status).toBe(403);

    const ok = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(ok.status).toBe(204);
  });

  it('lists only the caller’s own bookings', async () => {
    const { admin, roomId } = await setup();
    const member = await joinCompany(admin.company.inviteCode);
    await book(admin.token, roomId, 'Admin meeting', hoursFromNow(1), hoursFromNow(2));
    await book(member.token, roomId, 'Member meeting', hoursFromNow(3), hoursFromNow(4));

    const mine = await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', `Bearer ${member.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.bookings).toHaveLength(1);
    expect(mine.body.bookings[0].title).toBe('Member meeting');
  });
});
