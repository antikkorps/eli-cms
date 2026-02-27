import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken, getEditorToken } from '../__tests__/helpers/setup.js';
import { buildBlogContentType, buildBlogData } from '../__tests__/helpers/fixtures.js';

describe('Sanitization', () => {
  let adminToken: string;
  let editorToken: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
    editorToken = await getEditorToken();
  });

  // ─── Content Type: name ────────────────────────────────
  describe('Content Type name sanitization', () => {
    it('strips HTML from content type name', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'xss-test',
          name: '<script>alert("xss")</script>Blog',
          fields: [{ name: 'title', type: 'text', required: true, label: 'Title' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Blog');
      expect(res.body.data.name).not.toContain('<script>');
    });

    it('strips img onerror XSS from name', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'img-xss',
          name: '<img src=x onerror="alert(1)">Posts',
          fields: [{ name: 'title', type: 'text', required: true, label: 'Title' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Posts');
    });
  });

  // ─── Content Type: field label ─────────────────────────
  describe('Field label sanitization', () => {
    it('strips HTML tags from field labels', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'label-xss',
          name: 'Test',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              label: '<b>Title</b><script>alert("xss")</script>',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fields[0].label).toBe('Title');
    });
  });

  // ─── Content Type: field options ───────────────────────
  describe('Field options sanitization', () => {
    it('strips HTML from select options', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'option-xss',
          name: 'Test',
          fields: [
            {
              name: 'category',
              type: 'select',
              required: true,
              label: 'Category',
              options: ['<script>alert(1)</script>safe', '<img src=x>tech'],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fields[0].options[0]).toBe('safe');
      expect(res.body.data.fields[0].options[1]).toBe('tech');
    });
  });

  // ─── Content: text/textarea data ───────────────────────
  describe('Content data sanitization', () => {
    let contentTypeId: string;

    beforeEach(async () => {
      const ctRes = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());
      contentTypeId = ctRes.body.data.id;
    });

    it('strips script tags from text fields', async () => {
      const res = await agent()
        .post('/api/v1/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contentTypeId,
          data: {
            title: '<script>document.cookie</script>Hello',
            body: 'Safe body',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.data.title).toBe('Hello');
      expect(res.body.data.data.title).not.toContain('<script>');
    });

    it('strips HTML from textarea fields', async () => {
      const res = await agent()
        .post('/api/v1/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contentTypeId,
          data: {
            title: 'OK Title',
            body: '<div onclick="alert(1)">Some <b>bold</b> content</div>',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.data.body).toBe('Some bold content');
      expect(res.body.data.data.body).not.toContain('<div');
      expect(res.body.data.data.body).not.toContain('onclick');
    });

    it('strips XSS from updated data', async () => {
      const createRes = await agent()
        .post('/api/v1/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contentTypeId, data: buildBlogData() });
      const id = createRes.body.data.id;

      const res = await agent()
        .put(`/api/v1/contents/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            title: '<img src=x onerror=alert(1)>Updated',
            body: 'Clean body',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.data.title).toBe('Updated');
    });
  });

  // ─── Upload: originalName ──────────────────────────────
  describe('Upload filename sanitization', () => {
    it('strips dangerous characters from originalName', async () => {
      const res = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 test'), {
          filename: 'test<script>alert(1)</script>.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.originalName).not.toContain('<script>');
      expect(res.body.data.originalName).not.toContain('>');
      expect(res.body.data.originalName).toMatch(/\.pdf$/);
    });

    it('handles path traversal in filename', async () => {
      const res = await agent()
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${editorToken}`)
        .attach('file', Buffer.from('%PDF-1.4 test'), {
          filename: '../../../etc/passwd.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.originalName).not.toContain('..');
      expect(res.body.data.originalName).not.toContain('/');
    });
  });

  // ─── Max length constraints ────────────────────────────
  describe('Max length constraints', () => {
    it('rejects content type name over 255 chars', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'long-name',
          name: 'A'.repeat(256),
          fields: [{ name: 'title', type: 'text', required: true, label: 'Title' }],
        });

      expect(res.status).toBe(400);
    });

    it('rejects field label over 255 chars', async () => {
      const res = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'long-label',
          name: 'Test',
          fields: [{ name: 'title', type: 'text', required: true, label: 'L'.repeat(256) }],
        });

      expect(res.status).toBe(400);
    });

    it('rejects search query over 200 chars', async () => {
      const res = await agent()
        .get('/api/v1/content-types')
        .query({ search: 'x'.repeat(201) })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('rejects text field over 1000 chars', async () => {
      const ctRes = await agent()
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildBlogContentType());

      const res = await agent()
        .post('/api/v1/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contentTypeId: ctRes.body.data.id,
          data: {
            title: 'T'.repeat(1001),
            body: 'Valid body',
          },
        });

      expect(res.status).toBe(400);
    });
  });
});
