import { describe, it, expect, beforeEach } from 'vitest';
import { UploadService } from './upload.service.js';
import { AppError } from '../utils/app-error.js';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';

function buildTestFile(
  overrides: Partial<{ buffer: Buffer; originalname: string; mimetype: string; size: number }> = {},
) {
  const buffer = Buffer.from('fake-file-content');
  return {
    buffer,
    originalname: 'test-image.png',
    mimetype: 'image/png',
    size: buffer.length,
    ...overrides,
  };
}

describe('UploadService', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    token = await getAdminToken();
    const me = await agent().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    userId = me.body.data.id;
  });

  // ─── upload ─────────────────────────────────────────

  describe('upload', () => {
    it('uploads a file and returns a record', async () => {
      const file = buildTestFile();
      const record = await UploadService.upload(file, userId);

      expect(record.id).toBeDefined();
      expect(record.originalName).toBe('test-image.png');
      expect(record.mimeType).toBe('image/png');
      expect(record.size).toBe(file.size);
      expect(record.createdBy).toBe(userId);
      expect(record.storageKey).toBeDefined();
    });

    it('generates a unique filename (UUID)', async () => {
      const r1 = await UploadService.upload(buildTestFile(), userId);
      const r2 = await UploadService.upload(buildTestFile(), userId);

      expect(r1.filename).not.toBe(r2.filename);
    });

    it('sanitizes the original filename (strips path separators)', async () => {
      const file = buildTestFile({ originalname: '../../../etc/passwd' });
      const record = await UploadService.upload(file, userId);

      // sanitizeFilename replaces slashes with underscores — path traversal is neutralized
      expect(record.originalName).not.toContain('/');
      expect(record.originalName).not.toBe('../../../etc/passwd');
    });

    it('throws for invalid folder id', async () => {
      const file = buildTestFile();
      await expect(
        UploadService.upload(file, userId, undefined, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(/folder not found/i);
    });

    it('emits media.uploaded event', async () => {
      const { eventBus } = await import('./event-bus.js');
      const events: string[] = [];
      const listener = () => events.push('media.uploaded');
      eventBus.on('media.uploaded', listener);

      await UploadService.upload(buildTestFile(), userId);

      expect(events).toContain('media.uploaded');
      eventBus.removeListener('media.uploaded', listener);
    });
  });

  // ─── findById ───────────────────────────────────────

  describe('findById', () => {
    it('returns the uploaded record', async () => {
      const created = await UploadService.upload(buildTestFile(), userId);
      const found = await UploadService.findById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.originalName).toBe('test-image.png');
    });

    it('throws 404 for non-existent id', async () => {
      await expect(UploadService.findById('00000000-0000-0000-0000-000000000000')).rejects.toThrow(AppError);
    });
  });

  // ─── findAll ────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results', async () => {
      await UploadService.upload(buildTestFile({ originalname: 'a.png' }), userId);
      await UploadService.upload(buildTestFile({ originalname: 'b.png' }), userId);
      await UploadService.upload(buildTestFile({ originalname: 'c.png' }), userId);

      const result = await UploadService.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(3);
    });

    it('filters by mimeType', async () => {
      await UploadService.upload(buildTestFile({ mimetype: 'image/png' }), userId);
      await UploadService.upload(buildTestFile({ mimetype: 'application/pdf', originalname: 'doc.pdf' }), userId);

      const result = await UploadService.findAll({ page: 1, limit: 20, mimeType: 'application/pdf' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].mimeType).toBe('application/pdf');
    });

    it('searches by filename', async () => {
      await UploadService.upload(buildTestFile({ originalname: 'photo-vacation.jpg' }), userId);
      await UploadService.upload(buildTestFile({ originalname: 'document.pdf' }), userId);

      const result = await UploadService.findAll({ page: 1, limit: 20, search: 'vacation' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].originalName).toContain('vacation');
    });
  });

  // ─── update ─────────────────────────────────────────

  describe('update', () => {
    it('updates alt text and caption', async () => {
      const created = await UploadService.upload(buildTestFile(), userId);
      const updated = await UploadService.update(created.id, {
        alt: 'A beautiful sunset',
        caption: 'Taken at the beach',
      });

      expect(updated.alt).toBe('A beautiful sunset');
      expect(updated.caption).toBe('Taken at the beach');
    });

    it('renames the file', async () => {
      const created = await UploadService.upload(buildTestFile(), userId);
      const updated = await UploadService.update(created.id, {
        originalName: 'renamed-file.png',
      });

      expect(updated.originalName).toBe('renamed-file.png');
    });

    it('throws 400 for empty update', async () => {
      const created = await UploadService.upload(buildTestFile(), userId);

      await expect(UploadService.update(created.id, {})).rejects.toThrow(/no fields to update/i);
    });

    it('throws 404 for non-existent media', async () => {
      await expect(UploadService.update('00000000-0000-0000-0000-000000000000', { alt: 'test' })).rejects.toThrow(
        AppError,
      );
    });
  });

  // ─── delete ─────────────────────────────────────────

  describe('delete', () => {
    it('deletes media record and emits event', async () => {
      const { eventBus } = await import('./event-bus.js');
      const events: string[] = [];
      const listener = () => events.push('media.deleted');
      eventBus.on('media.deleted', listener);

      const created = await UploadService.upload(buildTestFile(), userId);
      await UploadService.delete(created.id);

      await expect(UploadService.findById(created.id)).rejects.toThrow(AppError);
      expect(events).toContain('media.deleted');
      eventBus.removeListener('media.deleted', listener);
    });

    it('throws 404 for non-existent media', async () => {
      await expect(UploadService.delete('00000000-0000-0000-0000-000000000000')).rejects.toThrow(AppError);
    });
  });
});
