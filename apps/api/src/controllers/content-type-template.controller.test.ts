import { describe, it, expect, beforeEach } from 'vitest';
import { agent, getAdminToken } from '../__tests__/helpers/setup.js';
import { buildBlogFields } from '../__tests__/helpers/fixtures.js';
import { db } from '../db/index.js';
import { contentTypeTemplates } from '../db/schema/index.js';

describe('Content Type Templates', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await getAdminToken();
  });

  describe('POST /api/v1/content-type-templates', () => {
    it('201 creates a user template', async () => {
      const res = await agent()
        .post('/api/v1/content-type-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: `recipe-${Date.now()}`,
          name: 'Recipe',
          description: 'A recipe template',
          icon: 'i-lucide-chef-hat',
          fields: buildBlogFields(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSystem).toBe(false);
    });

    it('409 on duplicate slug', async () => {
      const slug = `recipe-${Date.now()}`;
      await agent()
        .post('/api/v1/content-type-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug, name: 'A', fields: buildBlogFields() });

      const res = await agent()
        .post('/api/v1/content-type-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug, name: 'B', fields: buildBlogFields() });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/v1/content-type-templates/:id', () => {
    it('403 system template cannot be modified', async () => {
      // Insert a system template directly (bypassing the API which forces isSystem=false)
      const [tpl] = await db
        .insert(contentTypeTemplates)
        .values({
          slug: `system-${Date.now()}`,
          name: 'System Test',
          fields: buildBlogFields(),
          isSystem: true,
        })
        .returning();

      const res = await agent()
        .put(`/api/v1/content-type-templates/${tpl.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('200 user template can be updated', async () => {
      const create = await agent()
        .post('/api/v1/content-type-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: `user-${Date.now()}`, name: 'User Tpl', fields: buildBlogFields() });

      const res = await agent()
        .put(`/api/v1/content-type-templates/${create.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed');
    });
  });

  describe('DELETE /api/v1/content-type-templates/:id', () => {
    it('403 system template cannot be deleted', async () => {
      const [tpl] = await db
        .insert(contentTypeTemplates)
        .values({
          slug: `system-del-${Date.now()}`,
          name: 'System',
          fields: buildBlogFields(),
          isSystem: true,
        })
        .returning();

      const res = await agent()
        .delete(`/api/v1/content-type-templates/${tpl.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('204 user template is deleted', async () => {
      const create = await agent()
        .post('/api/v1/content-type-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: `user-del-${Date.now()}`, name: 'User Tpl', fields: buildBlogFields() });

      const res = await agent()
        .delete(`/api/v1/content-type-templates/${create.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
    });
  });
});
