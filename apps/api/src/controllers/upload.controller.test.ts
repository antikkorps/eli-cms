import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken, getEditorToken } from '../__tests__/helpers/setup.js';

describe('Upload API', () => {
  let adminToken: string;
  let editorToken: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
    editorToken = await getEditorToken();
  });

  // ─── POST /api/uploads ──────────────────────────────────
  describe('POST /api/uploads', () => {
    it('returns 401 without token', async () => {
      const res = await agent()
        .post('/api/uploads')
        .attach('file', Buffer.from('hello'), 'test.txt');
      expect(res.status).toBe(401);
    });

    it('returns 400 when no file is provided', async () => {
      const res = await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no file/i);
    });

    it('uploads a file as editor (201)', async () => {
      const res = await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('hello world'), 'test.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        originalName: 'test.txt',
        mimeType: 'text/plain',
        storageType: 'local',
      });
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.size).toBe(11);
    });

    it('uploads a file as admin (201)', async () => {
      const res = await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('admin file'), 'admin.txt');

      expect(res.status).toBe(201);
      expect(res.body.data.originalName).toBe('admin.txt');
    });
  });

  // ─── GET /api/uploads ───────────────────────────────────
  describe('GET /api/uploads', () => {
    it('returns 401 without token', async () => {
      const res = await agent().get('/api/uploads');
      expect(res.status).toBe(401);
    });

    it('returns paginated list', async () => {
      // Upload 2 files
      await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('file1'), 'a.txt');
      await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('file2'), 'b.txt');

      const res = await agent()
        .get('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('filters by mimeType', async () => {
      await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('text'), 'a.txt');

      const res = await agent()
        .get('/api/uploads')
        .query({ mimeType: 'text/plain' })
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every((m: any) => m.mimeType === 'text/plain')).toBe(true);
    });
  });

  // ─── GET /api/uploads/:id ──────────────────────────────
  describe('GET /api/uploads/:id', () => {
    it('returns media metadata', async () => {
      const upload = await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('content'), 'doc.txt');

      const id = upload.body.data.id;
      const res = await agent()
        .get(`/api/uploads/${id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
      expect(res.body.data.originalName).toBe('doc.txt');
    });

    it('returns 404 for non-existent id', async () => {
      const res = await agent()
        .get('/api/uploads/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /api/uploads/:id/file ─────────────────────────
  describe('GET /api/uploads/:id/file', () => {
    it('serves file content (public, no auth)', async () => {
      const upload = await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('serve me'), 'serve.txt');

      const id = upload.body.data.id;
      const res = await agent().get(`/api/uploads/${id}/file`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toBe('serve me');
    });
  });

  // ─── DELETE /api/uploads/:id ───────────────────────────
  describe('DELETE /api/uploads/:id', () => {
    it('returns 403 for editor', async () => {
      const upload = await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('del'), 'del.txt');

      const res = await agent()
        .delete(`/api/uploads/${upload.body.data.id}`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBe(403);
    });

    it('deletes as admin (204)', async () => {
      const upload = await agent()
        .post('/api/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('bye'), 'bye.txt');

      const id = upload.body.data.id;
      const res = await agent()
        .delete(`/api/uploads/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);

      // Confirm gone
      const check = await agent()
        .get(`/api/uploads/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(check.status).toBe(404);
    });
  });
});

// ─── Settings API ──────────────────────────────────────────
describe('Settings API', () => {
  let adminToken: string;
  let editorToken: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
    editorToken = await getEditorToken();
  });

  describe('GET /api/settings/storage', () => {
    it('returns 403 for editor', async () => {
      const res = await agent()
        .get('/api/settings/storage')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBe(403);
    });

    it('returns default local config for admin', async () => {
      const res = await agent()
        .get('/api/settings/storage')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.activeStorage).toBe('local');
    });
  });

  describe('PUT /api/settings/storage', () => {
    it('returns 403 for editor', async () => {
      const res = await agent()
        .put('/api/settings/storage')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ activeStorage: 'local' });
      expect(res.status).toBe(403);
    });

    it('updates to local', async () => {
      const res = await agent()
        .put('/api/settings/storage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activeStorage: 'local' });
      expect(res.status).toBe(200);
      expect(res.body.data.activeStorage).toBe('local');
    });

    it('validates s3 config required when activeStorage=s3', async () => {
      const res = await agent()
        .put('/api/settings/storage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activeStorage: 's3' });
      expect(res.status).toBe(400);
    });

    it('accepts s3 config and masks secrets in response', async () => {
      const res = await agent()
        .put('/api/settings/storage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activeStorage: 's3',
          s3: {
            bucket: 'my-bucket',
            region: 'us-east-1',
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.data.activeStorage).toBe('s3');
      expect(res.body.data.s3.secretAccessKey).toBe('••••••••');
      expect(res.body.data.s3.accessKeyId).toBe('••••••••');
    });
  });
});
