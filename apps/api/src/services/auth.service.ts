import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { env } from '../config/environment.js';
import { AppError } from '../utils/app-error.js';
import type { JwtPayload, TokenPair, RegisterInput, LoginInput } from '@eli-cms/shared';

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

    return this.generateTokens({ userId: user.id, email: user.email, role: user.role });
  }

  static async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
      // Verify user still exists
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!user) {
        throw new AppError(401, 'User not found');
      }
      return this.generateTokens({ userId: user.id, email: user.email, role: user.role });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(401, 'Invalid refresh token');
    }
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

  private static generateTokens(payload: JwtPayload): TokenPair {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
}
