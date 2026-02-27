import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, refreshTokens, roles } from '../db/schema/index.js';
import { env } from '../config/environment.js';
import { parseDuration, parseDurationSec } from '../utils/parse-duration.js';
import { AppError } from '../utils/app-error.js';
import type { JwtPayload, TokenPair, RegisterInput, LoginInput, ChangePasswordInput } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  static async register(input: RegisterInput, actor?: Actor) {
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing.length > 0) {
      throw new AppError(409, 'Email already registered');
    }

    // Default to editor role if no roleId provided
    let roleId = input.roleId;
    if (!roleId) {
      const [editorRole] = await db.select().from(roles).where(eq(roles.slug, 'editor')).limit(1);
      if (!editorRole) throw new AppError(500, 'Default editor role not found');
      roleId = editorRole.id;
    } else {
      // Verify role exists
      const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!role) throw new AppError(400, 'Role not found');
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);
    const [user] = await db
      .insert(users)
      .values({ email: input.email, password: hashedPassword, roleId })
      .returning({ id: users.id, email: users.email, roleId: users.roleId, createdAt: users.createdAt });

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : { actorId: user.id, actorType: 'user' as const };
    eventBus.emit('auth.register', { userId: user.id, email: user.email, ...actorData });

    return user;
  }

  static async login(input: LoginInput, actor?: Actor): Promise<TokenPair> {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        roleId: users.roleId,
        permissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, input.email))
      .limit(1);

    if (!row) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, row.password);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const payload: JwtPayload = {
      userId: row.id,
      email: row.email,
      roleId: row.roleId,
      permissions: row.permissions as string[],
    };

    const tokens = await this.generateTokens(payload, randomUUID());
    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : { actorId: row.id, actorType: 'user' as const };
    eventBus.emit('auth.login', { userId: row.id, email: row.email, ...actorData });

    return tokens;
  }

  static async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(rawRefreshToken);

    // Find the stored token
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored) {
      throw new AppError(401, 'Invalid refresh token');
    }

    // Token already revoked → theft detected → revoke entire family
    if (stored.revokedAt !== null) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.family, stored.family), isNull(refreshTokens.revokedAt)));
      throw new AppError(401, 'Token reuse detected — all sessions revoked');
    }

    // Token expired
    if (stored.expiresAt < new Date()) {
      throw new AppError(401, 'Refresh token expired');
    }

    // Verify user still exists + JOIN roles for fresh permissions
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        roleId: users.roleId,
        permissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, stored.userId))
      .limit(1);

    if (!row) {
      throw new AppError(401, 'User not found');
    }

    // Revoke the current token (rotation)
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));

    // Issue new pair in the same family
    const payload: JwtPayload = {
      userId: row.id,
      email: row.email,
      roleId: row.roleId,
      permissions: row.permissions as string[],
    };
    return this.generateTokens(payload, stored.family);
  }

  static async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .limit(1);

    if (!stored) {
      // Silently succeed — idempotent
      return;
    }

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));
  }

  static async logoutAll(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  static async changePassword(userId: string, input: ChangePasswordInput, actor?: Actor): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const valid = await bcrypt.compare(input.currentPassword, user.password);
    if (!valid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 12);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));

    // Revoke all refresh tokens
    await this.logoutAll(userId);

    const actorData = actor ? { actorId: actor.id, actorType: actor.type, ipAddress: actor.ip, userAgent: actor.userAgent } : { actorId: userId, actorType: 'user' as const };
    eventBus.emit('auth.password_changed', { userId, ...actorData });
  }

  static async getUserFromToken(payload: JwtPayload) {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        roleId: users.roleId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleName: roles.name,
        roleSlug: roles.slug,
        permissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!row) {
      throw new AppError(404, 'User not found');
    }
    return {
      id: row.id,
      email: row.email,
      roleId: row.roleId,
      role: { name: row.roleName, slug: row.roleSlug, permissions: row.permissions },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private static async generateTokens(payload: JwtPayload, family: string): Promise<TokenPair> {
    const accessExpiresIn = parseDurationSec(env.JWT_ACCESS_EXPIRY);
    const refreshExpiresIn = parseDurationSec(env.JWT_REFRESH_EXPIRY);

    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: accessExpiresIn });

    // Raw refresh token = random UUID (not a JWT anymore)
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
