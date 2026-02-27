import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken, getEditorToken } from '../__tests__/helpers/setup.js';

describe('Users CRUD', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
  });

  // ─── GET /api/users/:id ──────────────────────────────
  describe('GET /api/users/:id', () => {
    it('200 returns the user without password', async () => {
      const api = agent();

      const regRes = await api.post('/api/v1/auth/register').send({
        email: 'target@test.local',
        password: 'password123',
      });
      const userId = regRes.body.data.id;

      const res = await api
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.email).toBe('target@test.local');
      expect(res.body.data.roleId).toBeDefined();
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('404 for non-existent id', async () => {
      const res = await agent()
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('403 rejects editor role', async () => {
      const editorToken = await getEditorToken();

      const res = await agent()
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('401 without token', async () => {
      const res = await agent().get('/api/v1/users/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /api/users/:id ───────────────────────────
  describe('DELETE /api/users/:id', () => {
    it('204 deletes the user', async () => {
      const api = agent();

      const regRes = await api.post('/api/v1/auth/register').send({
        email: 'deleteme@test.local',
        password: 'password123',
      });
      const userId = regRes.body.data.id;

      const res = await api
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await api
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(404);
    });

    it('404 for non-existent id', async () => {
      const res = await agent()
        .delete('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('403 rejects editor role', async () => {
      const editorToken = await getEditorToken();

      const res = await agent()
        .delete('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('401 without token', async () => {
      const res = await agent().delete('/api/v1/users/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
