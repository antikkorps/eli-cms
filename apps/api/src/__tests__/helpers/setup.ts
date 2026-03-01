import { beforeEach, afterAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/index.js';
import { sql, eq } from 'drizzle-orm';
import { roles } from '../../db/schema/index.js';
import { DEFAULT_ROLE_PERMISSIONS } from '@eli-cms/shared';

const app = createApp();

export function agent() {
  return supertest(app.callback());
}

export async function truncateAll() {
  await db.execute(sql`TRUNCATE TABLE audit_logs, api_keys, webhook_deliveries, webhooks, content_versions, content_relations, media, settings, contents, content_types, refresh_tokens, users, roles RESTART IDENTITY CASCADE`);
}

const roleMetadata: Record<string, { name: string; description: string }> = {
  'super-admin': { name: 'Super Admin', description: 'Full access to all features' },
  editor: { name: 'Editor', description: 'Can manage content and uploads' },
  reviewer: { name: 'Reviewer', description: 'Can manage content and review submissions' },
};

export async function ensureRoles() {
  for (const [slug, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const existing = await db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
    if (existing.length === 0) {
      const meta = roleMetadata[slug] ?? { name: slug, description: '' };
      await db.insert(roles).values({
        name: meta.name,
        slug,
        description: meta.description,
        permissions: [...permissions],
        isSystem: true,
      });
    }
  }
}

export async function getRoleId(slug: string): Promise<string> {
  const [role] = await db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
  if (!role) throw new Error(`Role "${slug}" not found — did you call ensureRoles()?`);
  return role.id;
}

let adminToken: string | null = null;
let editorToken: string | null = null;
let reviewerToken: string | null = null;

export async function getAdminToken(): Promise<string> {
  if (adminToken) return adminToken;

  const api = agent();
  const roleId = await getRoleId('super-admin');
  await api.post('/api/v1/auth/register').send({
    email: 'admin-test@eli-cms.local',
    password: 'admin123',
    roleId,
  });

  const res = await api.post('/api/v1/auth/login').send({
    email: 'admin-test@eli-cms.local',
    password: 'admin123',
  });

  adminToken = res.body.data.accessToken;
  return adminToken!;
}

export async function getEditorToken(): Promise<string> {
  if (editorToken) return editorToken;

  const api = agent();
  // Editor role is default, no need to pass roleId
  await api.post('/api/v1/auth/register').send({
    email: 'editor-test@eli-cms.local',
    password: 'editor123',
  });

  const res = await api.post('/api/v1/auth/login').send({
    email: 'editor-test@eli-cms.local',
    password: 'editor123',
  });

  editorToken = res.body.data.accessToken;
  return editorToken!;
}

export async function getReviewerToken(): Promise<string> {
  if (reviewerToken) return reviewerToken;

  const api = agent();
  const roleId = await getRoleId('reviewer');
  await api.post('/api/v1/auth/register').send({
    email: 'reviewer-test@eli-cms.local',
    password: 'reviewer123',
    roleId,
  });

  const res = await api.post('/api/v1/auth/login').send({
    email: 'reviewer-test@eli-cms.local',
    password: 'reviewer123',
  });

  reviewerToken = res.body.data.accessToken;
  return reviewerToken!;
}

// Runs before EVERY test — guarantees clean DB + fresh tokens
beforeEach(async () => {
  await truncateAll();
  await ensureRoles();
  adminToken = null;
  editorToken = null;
  reviewerToken = null;
});

afterAll(async () => {
  await pool.end();
});
