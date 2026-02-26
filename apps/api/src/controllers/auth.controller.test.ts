import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';

describe('Auth endpoints', () => {
  // ─── POST /api/auth/register ─────────────────────────
  describe('POST /api/auth/register', () => {
    it('201 creates an editor by default', async () => {
      const res = await agent().post('/api/auth/register').send({
        email: 'new@test.local',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('new@test.local');
      expect(res.body.data.role).toBe('editor');
      expect(res.body.data.id).toBeDefined();
    });

    it('201 creates an admin when role=admin', async () => {
      const res = await agent().post('/api/auth/register').send({
        email: 'admin@test.local',
        password: 'password123',
        role: 'admin',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('admin');
    });

    it('400 rejects invalid email', async () => {
      const res = await agent().post('/api/auth/register').send({
        email: 'not-an-email',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects password shorter than 6 chars', async () => {
      const res = await agent().post('/api/auth/register').send({
        email: 'short@test.local',
        password: '12345',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('409 rejects duplicate email', async () => {
      const api = agent();
      await api.post('/api/auth/register').send({
        email: 'dup@test.local',
        password: 'password123',
      });

      const res = await api.post('/api/auth/register').send({
        email: 'dup@test.local',
        password: 'password123',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('does not expose password in response', async () => {
      const res = await agent().post('/api/auth/register').send({
        email: 'nopw@test.local',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).not.toHaveProperty('password');
    });
  });

  // ─── POST /api/auth/login ────────────────────────────
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await agent().post('/api/auth/register').send({
        email: 'login@test.local',
        password: 'password123',
      });
    });

    it('200 returns accessToken and refreshToken', async () => {
      const res = await agent().post('/api/auth/login').send({
        email: 'login@test.local',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('401 rejects unknown email', async () => {
      const res = await agent().post('/api/auth/login').send({
        email: 'unknown@test.local',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('401 rejects wrong password', async () => {
      const res = await agent().post('/api/auth/login').send({
        email: 'login@test.local',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects invalid body', async () => {
      const res = await agent().post('/api/auth/login').send({
        email: 'not-email',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /api/auth/refresh ──────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('200 returns new token pair', async () => {
      const api = agent();
      await api.post('/api/auth/register').send({
        email: 'refresh@test.local',
        password: 'password123',
      });

      const loginRes = await api.post('/api/auth/login').send({
        email: 'refresh@test.local',
        password: 'password123',
      });

      const res = await api.post('/api/auth/refresh').send({
        refreshToken: loginRes.body.data.refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('401 rejects invalid refresh token', async () => {
      const res = await agent().post('/api/auth/refresh').send({
        refreshToken: 'invalid-token',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects empty body', async () => {
      const res = await agent().post('/api/auth/refresh').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/auth/me ────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('200 returns current user', async () => {
      const token = await getAdminToken();

      const res = await agent().get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe('admin-test@eli-cms.local');
      expect(res.body.data.role).toBe('admin');
    });

    it('401 without token', async () => {
      const res = await agent().get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('does not expose password in response', async () => {
      const token = await getAdminToken();

      const res = await agent().get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty('password');
    });
  });
});
