import { beforeEach, afterAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/index.js';
import { sql } from 'drizzle-orm';

const app = createApp();

export function agent() {
  return supertest(app.callback());
}

export async function truncateAll() {
  await db.execute(sql`TRUNCATE TABLE media, settings, contents, content_types, refresh_tokens, users RESTART IDENTITY CASCADE`);
}

let adminToken: string | null = null;
let editorToken: string | null = null;

export async function getAdminToken(): Promise<string> {
  if (adminToken) return adminToken;

  const api = agent();
  await api.post('/api/auth/register').send({
    email: 'admin-test@eli-cms.local',
    password: 'admin123',
    role: 'admin',
  });

  const res = await api.post('/api/auth/login').send({
    email: 'admin-test@eli-cms.local',
    password: 'admin123',
  });

  adminToken = res.body.data.accessToken;
  return adminToken!;
}

export async function getEditorToken(): Promise<string> {
  if (editorToken) return editorToken;

  const api = agent();
  await api.post('/api/auth/register').send({
    email: 'editor-test@eli-cms.local',
    password: 'editor123',
    role: 'editor',
  });

  const res = await api.post('/api/auth/login').send({
    email: 'editor-test@eli-cms.local',
    password: 'editor123',
  });

  editorToken = res.body.data.accessToken;
  return editorToken!;
}

// Runs before EVERY test — guarantees clean DB + fresh tokens
beforeEach(async () => {
  await truncateAll();
  adminToken = null;
  editorToken = null;
});

afterAll(async () => {
  await pool.end();
});
