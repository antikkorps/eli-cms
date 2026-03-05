import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  API_PORT: z.coerce.number().default(8080),
  CORS_ORIGINS: z.string().default('*'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
