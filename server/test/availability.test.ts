import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerCompany, hoursFromNow } from './helpers.js';

describe('room availability search', () => {
  it('bulk-creates rooms and finds them all free for an open window', async () => {
    const admin = await registerCompany();
    const bulk = await request(app)
      .post('/api/rooms/bulk')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        rooms: [
          { name: 'Focus 1', floor: 1 },
          { name: 'Focus 2', floor: 1 },
          { name: 'Board', floor: 2 },
        ],
      });
    expect(bulk.status).toBe(201);
    expect(bulk.body.rooms).toHaveLength(3);

    const res = await request(app)
      .get(`/api/rooms/availability?from=${hoursFromNow(1)}&to=${hoursFromNow(2)}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.rooms).toHaveLength(3);
    expect(res.body.rooms.every((r: { available: boolean }) => r.available)).toBe(true);
  });

  it('marks a room busy when it overlaps the requested window', async () => {
    const admin = await registerCompany();
    const created = await request(app)
      .post('/api/rooms/bulk')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ rooms: [{ name: 'Focus 1', floor: 1 }, { name: 'Focus 2', floor: 1 }] });
    const busyRoomId = created.body.rooms[0].id;

    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        roomId: busyRoomId,
        title: '占用',
        startTime: hoursFromNow(1),
        endTime: hoursFromNow(2),
      });

    // A window that overlaps the booking.
    const res = await request(app)
      .get(`/api/rooms/availability?from=${hoursFromNow(1.5)}&to=${hoursFromNow(2.5)}`)
      .set('Authorization', `Bearer ${admin.token}`);

    const rooms: Array<{ id: string; available: boolean }> = res.body.rooms;
    expect(rooms.find((r) => r.id === busyRoomId)?.available).toBe(false);
    expect(rooms.filter((r) => r.available)).toHaveLength(1);
  });

  it('requires authentication', async () => {
    const res = await request(app).get(
      `/api/rooms/availability?from=${hoursFromNow(1)}&to=${hoursFromNow(2)}`,
    );
    expect(res.status).toBe(401);
  });
});
