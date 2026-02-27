import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken, getEditorToken, getRoleId } from '../__tests__/helpers/setup.js';

describe('GET /api/users', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
  });

  // ─── Auth & Authz ─────────────────────────────────────
  it('returns 401 without token', async () => {
    const res = await agent().get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for editor role', async () => {
    const editorToken = await getEditorToken();
    const res = await agent().get('/api/v1/users').set('Authorization', `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin role', async () => {
    const res = await agent().get('/api/v1/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ─── Pagination defaults ──────────────────────────────
  it('returns default pagination meta', async () => {
    const res = await agent().get('/api/v1/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(20);
  });

  // ─── Pagination explicit ──────────────────────────────
  it('respects explicit page and limit', async () => {
    const api = agent();
    for (let i = 0; i < 4; i++) {
      await api.post('/api/v1/auth/register').send({
        email: `user${i}@test.local`,
        password: 'password123',
      });
    }

    const res = await api
      .get('/api/v1/users')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
  });

  // ─── Filter: roleId ───────────────────────────────────
  it('filters by roleId (editor)', async () => {
    const api = agent();
    await api.post('/api/v1/auth/register').send({
      email: 'editor1@test.local',
      password: 'password123',
    });

    const editorRoleId = await getRoleId('editor');
    const res = await api
      .get('/api/v1/users')
      .query({ roleId: editorRoleId })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((u: { roleId: string }) => u.roleId === editorRoleId)).toBe(true);
  });

  it('filters by roleId (super-admin)', async () => {
    const api = agent();
    await api.post('/api/v1/auth/register').send({
      email: 'editor1@test.local',
      password: 'password123',
    });

    const adminRoleId = await getRoleId('super-admin');
    const res = await api
      .get('/api/v1/users')
      .query({ roleId: adminRoleId })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data.every((u: { roleId: string }) => u.roleId === adminRoleId)).toBe(true);
  });

  // ─── Search ───────────────────────────────────────────
  it('searches by email (ILIKE)', async () => {
    const api = agent();
    await api.post('/api/v1/auth/register').send({
      email: 'findme@test.local',
      password: 'password123',
    });

    const res = await api
      .get('/api/v1/users')
      .query({ search: 'findme' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('findme@test.local');
  });

  // ─── Combined filters ─────────────────────────────────
  it('combines roleId + search + pagination', async () => {
    const api = agent();
    for (let i = 0; i < 5; i++) {
      await api.post('/api/v1/auth/register').send({
        email: `dev${i}@test.local`,
        password: 'password123',
      });
    }

    const editorRoleId = await getRoleId('editor');
    const res = await api
      .get('/api/v1/users')
      .query({ roleId: editorRoleId, search: 'dev', page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(5);
    expect(res.body.meta.totalPages).toBe(3);
  });

  // ─── Shape: no password ───────────────────────────────
  it('does not expose password in response', async () => {
    const res = await agent().get('/api/v1/users').set('Authorization', `Bearer ${adminToken}`);
    for (const user of res.body.data) {
      expect(user).not.toHaveProperty('password');
    }
  });

  // ─── Validation ───────────────────────────────────────
  it('returns 400 for page=0', async () => {
    const res = await agent()
      .get('/api/v1/users')
      .query({ page: 0 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for limit>100', async () => {
    const res = await agent()
      .get('/api/v1/users')
      .query({ limit: 101 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
