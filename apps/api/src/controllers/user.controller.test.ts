import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken, getEditorToken } from '../__tests__/helpers/setup.js';

describe('GET /api/users', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
  });

  // ─── Auth & Authz ─────────────────────────────────────
  it('returns 401 without token', async () => {
    const res = await agent().get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for editor role', async () => {
    const editorToken = await getEditorToken();
    const res = await agent().get('/api/users').set('Authorization', `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin role', async () => {
    const res = await agent().get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ─── Pagination defaults ──────────────────────────────
  it('returns default pagination meta', async () => {
    const res = await agent().get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    // 2 users exist (admin + editor would need to be created; only admin here from getAdminToken)
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(20);
  });

  // ─── Pagination explicit ──────────────────────────────
  it('respects explicit page and limit', async () => {
    const api = agent();
    // register extra users (admin already exists from getAdminToken)
    for (let i = 0; i < 4; i++) {
      await api.post('/api/auth/register').send({
        email: `user${i}@test.local`,
        password: 'password123',
        role: 'editor',
      });
    }

    const res = await api
      .get('/api/users')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
  });

  // ─── Filter: role ─────────────────────────────────────
  it('filters by role=editor', async () => {
    const api = agent();
    await api.post('/api/auth/register').send({
      email: 'editor1@test.local',
      password: 'password123',
      role: 'editor',
    });

    const res = await api
      .get('/api/users')
      .query({ role: 'editor' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((u: any) => u.role === 'editor')).toBe(true);
  });

  it('filters by role=admin', async () => {
    const api = agent();
    await api.post('/api/auth/register').send({
      email: 'editor1@test.local',
      password: 'password123',
      role: 'editor',
    });

    const res = await api
      .get('/api/users')
      .query({ role: 'admin' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data.every((u: any) => u.role === 'admin')).toBe(true);
  });

  // ─── Search ───────────────────────────────────────────
  it('searches by email (ILIKE)', async () => {
    const api = agent();
    await api.post('/api/auth/register').send({
      email: 'findme@test.local',
      password: 'password123',
      role: 'editor',
    });

    const res = await api
      .get('/api/users')
      .query({ search: 'findme' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('findme@test.local');
  });

  // ─── Combined filters ─────────────────────────────────
  it('combines role + search + pagination', async () => {
    const api = agent();
    for (let i = 0; i < 5; i++) {
      await api.post('/api/auth/register').send({
        email: `dev${i}@test.local`,
        password: 'password123',
        role: 'editor',
      });
    }

    const res = await api
      .get('/api/users')
      .query({ role: 'editor', search: 'dev', page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(5);
    expect(res.body.meta.totalPages).toBe(3);
  });

  // ─── Shape: no password ───────────────────────────────
  it('does not expose password in response', async () => {
    const res = await agent().get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    for (const user of res.body.data) {
      expect(user).not.toHaveProperty('password');
    }
  });

  // ─── Validation ───────────────────────────────────────
  it('returns 400 for page=0', async () => {
    const res = await agent()
      .get('/api/users')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for limit>100', async () => {
    const res = await agent()
      .get('/api/users')
      .query({ limit: 101 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role value', async () => {
    const res = await agent()
      .get('/api/users')
      .query({ role: 'superadmin' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
