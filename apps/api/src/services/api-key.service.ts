import { scryptSync, randomBytes } from 'node:crypto';
import { eq, and, count as drizzleCount } from 'drizzle-orm';
import { db } from '../db/index.js';
import { apiKeys } from '../db/schema/index.js';
import { AppError } from '../utils/app-error.js';
import { buildMeta } from '../utils/pagination.js';
import { env } from '../config/environment.js';
import type { CreateApiKeyInput, UpdateApiKeyInput, ApiKeyListQuery } from '@eli-cms/shared';

const PREFIX = 'eli_';
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 min

/** scrypt KDF — dedicated salt, decoupled from JWT signing key. */
function hashKey(raw: string): string {
  return scryptSync(raw, env.API_KEY_SALT, 32, { N: 2048, r: 8, p: 1 }).toString('hex');
}

export class ApiKeyService {
  static async create(input: CreateApiKeyInput, userId: string) {
    const rawKey = PREFIX + randomBytes(24).toString('hex'); // eli_ + 48 hex chars
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, PREFIX.length + 8); // eli_ + 8 chars

    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        name: input.name,
        keyHash,
        keyPrefix,
        permissions: input.permissions,
        createdBy: userId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        permissions: apiKeys.permissions,
        createdBy: apiKeys.createdBy,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      });

    return { ...apiKey, rawKey };
  }

  static async findAll(query: ApiKeyListQuery) {
    const { page, limit, isActive } = query;
    const offset = (page - 1) * limit;

    const filters = [];
    if (isActive !== undefined) filters.push(eq(apiKeys.isActive, isActive));

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(apiKeys)
      .where(where);

    const data = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        permissions: apiKeys.permissions,
        createdBy: apiKeys.createdBy,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(where)
      .orderBy(apiKeys.createdAt)
      .limit(limit)
      .offset(offset);

    return { data, meta: buildMeta(total, page, limit) };
  }

  static async findById(id: string) {
    const [apiKey] = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        permissions: apiKeys.permissions,
        createdBy: apiKeys.createdBy,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!apiKey) throw new AppError(404, 'API key not found');
    return apiKey;
  }

  static async update(id: string, input: UpdateApiKeyInput) {
    await this.findById(id);

    const values: Record<string, unknown> = {};
    if (input.name !== undefined) values.name = input.name;
    if (input.permissions !== undefined) values.permissions = input.permissions;
    if (input.isActive !== undefined) values.isActive = input.isActive;
    if (input.expiresAt !== undefined) {
      values.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }

    const [apiKey] = await db
      .update(apiKeys)
      .set(values)
      .where(eq(apiKeys.id, id))
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        permissions: apiKeys.permissions,
        createdBy: apiKeys.createdBy,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      });

    return apiKey;
  }

  static async delete(id: string) {
    await this.findById(id);
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  static async validateKey(rawKey: string) {
    const keyHash = hashKey(rawKey);

    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!apiKey) return null;
    if (!apiKey.isActive) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Debounced lastUsedAt update — fire and forget
    const now = new Date();
    if (!apiKey.lastUsedAt || now.getTime() - apiKey.lastUsedAt.getTime() > DEBOUNCE_MS) {
      db.update(apiKeys)
        .set({ lastUsedAt: now })
        .where(eq(apiKeys.id, apiKey.id))
        .execute()
        .catch(() => {});
    }

    return {
      id: apiKey.id,
      permissions: apiKey.permissions,
      createdBy: apiKey.createdBy,
    };
  }
}
