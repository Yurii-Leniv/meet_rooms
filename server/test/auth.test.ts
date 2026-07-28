import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerCompany, joinCompany } from './helpers.js';

describe('auth', () => {
  it('creates a company and makes the first user an ADMIN with an invite code', async () => {
    const res = await request(app).post('/api/auth/register/company').send({
      name: 'Alice',
      email: 'alice@acme.dev',
      password: 'password123',
      companyName: 'Acme',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.company.name).toBe('Acme');
    expect(res.body.company.inviteCode).toMatch(/^ACME-[A-Z0-9]+$/);
  });

  it('rejects registration with a short password', async () => {
    const res = await request(app).post('/api/auth/register/company').send({
      name: 'Al',
      email: 'a@a.dev',
      password: 'short',
      companyName: 'Acme',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    const admin = await registerCompany();
    const res = await request(app).post('/api/auth/register/join').send({
      name: 'Dup',
      email: admin.user.email,
      password: 'password123',
      inviteCode: admin.company.inviteCode,
    });
    expect(res.status).toBe(409);
  });

  it('lets a colleague join with the invite code as a MEMBER', async () => {
    const admin = await registerCompany();
    const member = await joinCompany(admin.company.inviteCode);

    expect(member.user.role).toBe('MEMBER');
    expect(member.user.companyId).toBe(admin.user.companyId);
  });

  it('rejects an invalid invite code', async () => {
    const res = await request(app).post('/api/auth/register/join').send({
      name: 'Nope',
      email: 'nope@x.dev',
      password: 'password123',
      inviteCode: 'DOES-NOTEXIST',
    });
    expect(res.status).toBe(400);
  });

  it('logs in with valid credentials and rejects wrong passwords', async () => {
    await request(app).post('/api/auth/register/company').send({
      name: 'Bob',
      email: 'bob@globex.dev',
      password: 'password123',
      companyName: 'Globex',
    });

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@globex.dev', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@globex.dev', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('returns the current user from /me with a valid token', async () => {
    const admin = await registerCompany();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(admin.user.email);
    expect(res.body.company.id).toBe(admin.company.id);
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
