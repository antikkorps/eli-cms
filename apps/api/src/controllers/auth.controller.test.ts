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
    it('200 returns new token pair (rotation)', async () => {
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
      // New refresh token must differ from the old one (rotation)
      expect(res.body.data.refreshToken).not.toBe(loginRes.body.data.refreshToken);
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

    it('401 rejects reused (already-rotated) refresh token', async () => {
      const api = agent();
      await api.post('/api/auth/register').send({
        email: 'reuse@test.local',
        password: 'password123',
      });

      const loginRes = await api.post('/api/auth/login').send({
        email: 'reuse@test.local',
        password: 'password123',
      });

      const oldToken = loginRes.body.data.refreshToken;

      // Use it once → rotates
      await api.post('/api/auth/refresh').send({ refreshToken: oldToken });

      // Reuse the old one → theft detection
      const res = await api.post('/api/auth/refresh').send({ refreshToken: oldToken });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/reuse/i);
    });

    it('theft detection revokes entire family', async () => {
      const api = agent();
      await api.post('/api/auth/register').send({
        email: 'theft@test.local',
        password: 'password123',
      });

      const loginRes = await api.post('/api/auth/login').send({
        email: 'theft@test.local',
        password: 'password123',
      });

      const oldToken = loginRes.body.data.refreshToken;

      // Rotate once to get a new token
      const rotateRes = await api.post('/api/auth/refresh').send({ refreshToken: oldToken });
      const newToken = rotateRes.body.data.refreshToken;

      // Reuse OLD token → theft → entire family revoked
      await api.post('/api/auth/refresh').send({ refreshToken: oldToken });

      // Even the NEW token should now be revoked
      const res = await api.post('/api/auth/refresh').send({ refreshToken: newToken });
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/auth/logout ───────────────────────────
  describe('POST /api/auth/logout', () => {
    it('200 revokes a refresh token', async () => {
      const api = agent();
      await api.post('/api/auth/register').send({
        email: 'logout@test.local',
        password: 'password123',
      });

      const loginRes = await api.post('/api/auth/login').send({
        email: 'logout@test.local',
        password: 'password123',
      });

      const { accessToken, refreshToken } = loginRes.body.data;

      const res = await api
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Refresh token should no longer work
      const refreshRes = await api.post('/api/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it('401 without auth', async () => {
      const res = await agent().post('/api/auth/logout').send({ refreshToken: 'abc' });
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/auth/logout-all ───────────────────────
  describe('POST /api/auth/logout-all', () => {
    it('200 revokes all refresh tokens for the user', async () => {
      const api = agent();
      await api.post('/api/auth/register').send({
        email: 'logoutall@test.local',
        password: 'password123',
      });

      // Login twice to create two families
      const login1 = await api.post('/api/auth/login').send({
        email: 'logoutall@test.local',
        password: 'password123',
      });
      const login2 = await api.post('/api/auth/login').send({
        email: 'logoutall@test.local',
        password: 'password123',
      });

      const res = await api
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${login1.body.data.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Both refresh tokens should be revoked
      const r1 = await api.post('/api/auth/refresh').send({ refreshToken: login1.body.data.refreshToken });
      const r2 = await api.post('/api/auth/refresh').send({ refreshToken: login2.body.data.refreshToken });
      expect(r1.status).toBe(401);
      expect(r2.status).toBe(401);
    });
  });

  // ─── PUT /api/auth/change-password ───────────────────
  describe('PUT /api/auth/change-password', () => {
    it('200 changes password and revokes tokens', async () => {
      const api = agent();
      await api.post('/api/auth/register').send({
        email: 'changepw@test.local',
        password: 'password123',
      });

      const loginRes = await api.post('/api/auth/login').send({
        email: 'changepw@test.local',
        password: 'password123',
      });

      const { accessToken, refreshToken } = loginRes.body.data;

      const res = await api
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Old refresh token should be revoked
      const refreshRes = await api.post('/api/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(401);

      // Can login with new password
      const newLogin = await api.post('/api/auth/login').send({
        email: 'changepw@test.local',
        password: 'newpass456',
      });
      expect(newLogin.status).toBe(200);
    });

    it('401 rejects wrong current password', async () => {
      const api = agent();
      await api.post('/api/auth/register').send({
        email: 'wrongpw@test.local',
        password: 'password123',
      });

      const loginRes = await api.post('/api/auth/login').send({
        email: 'wrongpw@test.local',
        password: 'password123',
      });

      const res = await api
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
        .send({ currentPassword: 'wrongpassword', newPassword: 'newpass456' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('400 rejects short new password', async () => {
      const token = await getAdminToken();

      const res = await agent()
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'admin123', newPassword: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('401 without auth', async () => {
      const res = await agent()
        .put('/api/auth/change-password')
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });

      expect(res.status).toBe(401);
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
