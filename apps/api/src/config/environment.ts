import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  API_PORT: z.coerce.number().default(8080),
});

export const env = envSchema.parse(process.env);
