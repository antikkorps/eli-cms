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
        .post('/api/v1/uploads')
        .attach('file', Buffer.from('%PDF-1.4 test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        });
      expect(res.status).toBe(401);
    });

    it('returns 400 when no file is provided', async () => {
      const res = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no file/i);
    });

    it('uploads a PDF as editor (201)', async () => {
      const res = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 hello world'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        storageType: 'local',
      });
      expect(res.body.data.id).toBeDefined();
    });

    it('uploads a file as admin (201)', async () => {
      const res = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('%PDF-1.4 admin file'), {
          filename: 'admin.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.originalName).toBe('admin.pdf');
    });

    it('rejects disallowed file types (.exe)', async () => {
      const res = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('MZ executable'), {
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no file/i);
    });

    it('rejects text/plain files', async () => {
      const res = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('hello'), 'test.txt');

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/uploads ───────────────────────────────────
  describe('GET /api/uploads', () => {
    it('returns 401 without token', async () => {
      const res = await agent().get('/api/v1/uploads');
      expect(res.status).toBe(401);
    });

    it('returns paginated list', async () => {
      // Upload 2 files
      await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 file1'), {
          filename: 'a.pdf',
          contentType: 'application/pdf',
        });
      await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 file2'), {
          filename: 'b.pdf',
          contentType: 'application/pdf',
        });

      const res = await agent()
        .get('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('filters by mimeType', async () => {
      await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 text'), {
          filename: 'a.pdf',
          contentType: 'application/pdf',
        });

      const res = await agent()
        .get('/api/v1/uploads')
        .query({ mimeType: 'application/pdf' })
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every((m: any) => m.mimeType === 'application/pdf')).toBe(true);
    });
  });

  // ─── GET /api/uploads/:id ──────────────────────────────
  describe('GET /api/uploads/:id', () => {
    it('returns media metadata', async () => {
      const upload = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 content'), {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        });

      const id = upload.body.data.id;
      const res = await agent()
        .get(`/api/v1/uploads/${id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
      expect(res.body.data.originalName).toBe('doc.pdf');
    });

    it('returns 404 for non-existent id', async () => {
      const res = await agent()
        .get('/api/v1/uploads/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── GET /api/uploads/:id/serve ─────────────────────────
  describe('GET /api/uploads/:id/serve', () => {
    it('serves file content (public, no auth)', async () => {
      const upload = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 serve me'), {
          filename: 'serve.pdf',
          contentType: 'application/pdf',
        });

      const id = upload.body.data.id;
      const res = await agent().get(`/api/v1/uploads/${id}/serve`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });
  });

  // ─── DELETE /api/uploads/:id ───────────────────────────
  describe('DELETE /api/uploads/:id', () => {
    it('returns 403 for editor', async () => {
      const upload = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 del'), {
          filename: 'del.pdf',
          contentType: 'application/pdf',
        });

      const res = await agent()
        .delete(`/api/v1/uploads/${upload.body.data.id}`)
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBe(403);
    });

    it('deletes as admin (204)', async () => {
      const upload = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 bye'), {
          filename: 'bye.pdf',
          contentType: 'application/pdf',
        });

      const id = upload.body.data.id;
      const res = await agent()
        .delete(`/api/v1/uploads/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);

      // Confirm gone
      const check = await agent()
        .get(`/api/v1/uploads/${id}`)
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
        .get('/api/v1/settings/storage')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBe(403);
    });

    it('returns default local config for admin', async () => {
      const res = await agent()
        .get('/api/v1/settings/storage')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.activeStorage).toBe('local');
    });
  });

  describe('PUT /api/settings/storage', () => {
    it('returns 403 for editor', async () => {
      const res = await agent()
        .put('/api/v1/settings/storage')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ activeStorage: 'local' });
      expect(res.status).toBe(403);
    });

    it('updates to local', async () => {
      const res = await agent()
        .put('/api/v1/settings/storage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activeStorage: 'local' });
      expect(res.status).toBe(200);
      expect(res.body.data.activeStorage).toBe('local');
    });

    it('validates s3 config required when activeStorage=s3', async () => {
      const res = await agent()
        .put('/api/v1/settings/storage')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activeStorage: 's3' });
      expect(res.status).toBe(400);
    });

    it('accepts s3 config and masks secrets in response', async () => {
      const res = await agent()
        .put('/api/v1/settings/storage')
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
