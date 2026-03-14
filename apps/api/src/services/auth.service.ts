import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, refreshTokens, roles, passwordResetTokens } from '../db/schema/index.js';
import { env } from '../config/environment.js';
import { parseDuration, parseDurationSec } from '../utils/parse-duration.js';
import { AppError } from '../utils/app-error.js';
import type { JwtPayload, TokenPair, RegisterInput, LoginInput, ChangePasswordInput, UpdateProfileInput } from '@eli-cms/shared';
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATIONS_MIN, RESET_TOKEN_EXPIRY_MIN } from '@eli-cms/shared';
import { eventBus } from './event-bus.js';
import type { Actor } from './content.service.js';
import { EmailService } from './email.service.js';

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
      .returning({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, roleId: users.roleId, createdAt: users.createdAt });

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
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, input.email))
      .limit(1);

    if (!row) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check lockout
    if (row.lockedUntil && row.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new AppError(429, `Account temporarily locked. Try again in ${minutesLeft} minute(s).`);
    }

    const valid = await bcrypt.compare(input.password, row.password);
    if (!valid) {
      const newAttempts = row.failedLoginAttempts + 1;
      const updates: Record<string, unknown> = { failedLoginAttempts: newAttempts };

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const tier = Math.min(Math.floor(newAttempts / MAX_LOGIN_ATTEMPTS) - 1, LOCKOUT_DURATIONS_MIN.length - 1);
        const lockoutMinutes = LOCKOUT_DURATIONS_MIN[tier];
        updates.lockedUntil = new Date(Date.now() + lockoutMinutes * 60_000);
      }

      await db.update(users).set(updates).where(eq(users.id, row.id));
      throw new AppError(401, 'Invalid credentials');
    }

    // Successful login — reset counters
    if (row.failedLoginAttempts > 0 || row.lockedUntil) {
      await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, row.id));
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

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    // Build partial update — only set fields present in input
    const updates: Record<string, unknown> = {};

    if (input.email !== undefined) {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
      if (existing && existing.id !== userId) {
        throw new AppError(409, 'Email already in use');
      }
      updates.email = input.email;
    }

    if (input.firstName !== undefined) {
      updates.firstName = input.firstName;
    }
    if (input.lastName !== undefined) {
      updates.lastName = input.lastName;
    }
    if (input.avatarStyle !== undefined) {
      updates.avatarStyle = input.avatarStyle;
    }
    if (input.avatarSeed !== undefined) {
      updates.avatarSeed = input.avatarSeed;
    }

    if (Object.keys(updates).length > 0) {
      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      if (!updated) throw new AppError(404, 'User not found');
    }

    // Return full user with role info
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        avatarStyle: users.avatarStyle,
        avatarSeed: users.avatarSeed,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleName: roles.name,
        roleSlug: roles.slug,
        permissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) throw new AppError(404, 'User not found');

    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      roleId: row.roleId,
      avatarStyle: row.avatarStyle,
      avatarSeed: row.avatarSeed,
      role: { name: row.roleName, slug: row.roleSlug, permissions: row.permissions },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static async getUserFromToken(payload: JwtPayload) {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: users.roleId,
        avatarStyle: users.avatarStyle,
        avatarSeed: users.avatarSeed,
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
      firstName: row.firstName,
      lastName: row.lastName,
      roleId: row.roleId,
      avatarStyle: row.avatarStyle,
      avatarSeed: row.avatarSeed,
      role: { name: row.roleName, slug: row.roleSlug, permissions: row.permissions },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static async forgotPassword(email: string, frontendUrl: string): Promise<void> {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Silent return if user not found — don't leak existence
    if (!user) return;

    const rawToken = randomUUID();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MIN * 60_000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    try {
      await EmailService.sendPasswordReset(user.email, rawToken, frontendUrl);
    } catch {
      // Log but don't expose email delivery failures
    }
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);

    const [stored] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    if (stored.usedAt) {
      throw new AppError(400, 'This reset token has already been used');
    }

    if (stored.expiresAt < new Date()) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.transaction(async (tx) => {
      await tx.update(users).set({ password: hashedPassword }).where(eq(users.id, stored.userId));
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, stored.id));
      // Revoke all refresh tokens for the user
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, stored.userId), isNull(refreshTokens.revokedAt)));
    });

    eventBus.emit('auth.password_reset', { userId: stored.userId });
  }

  private static async generateTokens(payload: JwtPayload, family: string): Promise<TokenPair> {
    const accessExpiresIn = parseDurationSec(env.JWT_ACCESS_EXPIRY);

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
