import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, refreshTokens } from '../db/schema/index.js';
import { env } from '../config/environment.js';
import { parseDuration, parseDurationSec } from '../utils/parse-duration.js';
import { AppError } from '../utils/app-error.js';
import type { JwtPayload, TokenPair, RegisterInput, LoginInput, ChangePasswordInput } from '@eli-cms/shared';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing.length > 0) {
      throw new AppError(409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);
    const [user] = await db
      .insert(users)
      .values({ email: input.email, password: hashedPassword, role: input.role ?? 'editor' })
      .returning({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt });

    return user;
  }

  static async login(input: LoginInput): Promise<TokenPair> {
    const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials');
    }

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    return this.generateTokens(payload, randomUUID());
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

    // Verify user still exists
    const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // Revoke the current token (rotation)
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));

    // Issue new pair in the same family
    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
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

  static async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
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
  }

  static async getUserFromToken(payload: JwtPayload) {
    const [user] = await db
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      throw new AppError(404, 'User not found');
    }
    return user;
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
