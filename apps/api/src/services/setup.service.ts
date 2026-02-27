import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { count as drizzleCount, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, roles, refreshTokens } from '../db/schema/index.js';
import { env } from '../config/environment.js';
import { parseDuration, parseDurationSec } from '../utils/parse-duration.js';
import { AppError } from '../utils/app-error.js';
import { DEFAULT_ROLE_PERMISSIONS } from '@eli-cms/shared';
import type { JwtPayload, TokenPair } from '@eli-cms/shared';
import { createHash } from 'node:crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class SetupService {
  static async getStatus(): Promise<{ needsSetup: boolean }> {
    const [{ total }] = await db.select({ total: drizzleCount() }).from(users);
    return { needsSetup: total === 0 };
  }

  static async initialize(input: { email: string; password: string }) {
    // Guard: refuse if any user already exists
    const { needsSetup } = await this.getStatus();
    if (!needsSetup) {
      throw new AppError(403, 'Setup already completed');
    }

    // 1. Upsert default roles
    for (const [slug, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existing = await db.select().from(roles).where(eq(roles.slug, slug)).limit(1);
      if (existing.length === 0) {
        const name = slug === 'super-admin' ? 'Super Admin' : 'Editor';
        const description = slug === 'super-admin' ? 'Full access to all features' : 'Can manage content and uploads';
        await db.insert(roles).values({
          name,
          slug,
          description,
          permissions: [...permissions],
          isSystem: true,
        });
      }
    }

    // 2. Get the super-admin role
    const [superAdminRole] = await db.select().from(roles).where(eq(roles.slug, 'super-admin')).limit(1);
    if (!superAdminRole) {
      throw new AppError(500, 'Failed to create default roles');
    }

    // 3. Hash password & create user
    const hashedPassword = await bcrypt.hash(input.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        password: hashedPassword,
        roleId: superAdminRole.id,
      })
      .returning({ id: users.id, email: users.email, roleId: users.roleId, createdAt: users.createdAt });

    // 4. Generate tokens (auto-login)
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      permissions: superAdminRole.permissions as string[],
    };
    const tokens = await this.generateTokens(payload, randomUUID());

    return { user, tokens };
  }

  private static async generateTokens(payload: JwtPayload, family: string): Promise<TokenPair> {
    const accessExpiresIn = parseDurationSec(env.JWT_ACCESS_EXPIRY);
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: accessExpiresIn });

    const rawRefreshToken = randomUUID();
    const tokenHash = hashToken(rawRefreshToken);
    const refreshExpiresMs = parseDuration(env.JWT_REFRESH_EXPIRY)!;

    await db.insert(refreshTokens).values({
      userId: payload.userId,
      tokenHash,
      family,
      expiresAt: new Date(Date.now() + refreshExpiresMs),
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
