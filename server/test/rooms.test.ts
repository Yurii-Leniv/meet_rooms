import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerCompany, joinCompany, createRoom } from './helpers.js';

describe('rooms', () => {
  it('lets an admin create a room and serializes amenities as an array', async () => {
    const admin = await registerCompany();
    const res = await createRoom(admin.token, {
      name: 'Zeus',
      amenities: ['tv', 'whiteboard'],
    });
    expect(res.status).toBe(201);
    expect(res.body.room.name).toBe('Zeus');
    expect(res.body.room.amenities).toEqual(['tv', 'whiteboard']);
  });

  it('forbids a MEMBER from creating a room', async () => {
    const admin = await registerCompany();
    const member = await joinCompany(admin.company.inviteCode);
    const res = await createRoom(member.token, { name: 'Hax' });
    expect(res.status).toBe(403);
  });

  it('requires authentication to list rooms', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
  });

  it('only returns rooms from the caller’s company', async () => {
    const a = await registerCompany('Acme');
    const b = await registerCompany('Globex');
    await createRoom(a.token, { name: 'AcmeRoom' });

    const listA = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${a.token}`);
    const listB = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${b.token}`);

    expect(listA.body.rooms).toHaveLength(1);
    expect(listB.body.rooms).toHaveLength(0);
  });

  it('hides another company’s room by id (404)', async () => {
    const a = await registerCompany('Acme');
    const b = await registerCompany('Globex');
    const room = await createRoom(a.token, { name: 'Secret' });

    const res = await request(app)
      .get(`/api/rooms/${room.body.room.id}`)
      .set('Authorization', `Bearer ${b.token}`);
    expect(res.status).toBe(404);
  });

  it('lets an admin update and delete a room', async () => {
    const admin = await registerCompany();
    const room = await createRoom(admin.token, { name: 'Old' });

    const updated = await request(app)
      .patch(`/api/rooms/${room.body.room.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'New', capacity: 10, floor: 2, amenities: [] });
    expect(updated.status).toBe(200);
    expect(updated.body.room.name).toBe('New');
    expect(updated.body.room.capacity).toBe(10);

    const deleted = await request(app)
      .delete(`/api/rooms/${room.body.room.id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(deleted.status).toBe(204);
  });
});
