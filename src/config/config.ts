import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_CHAT_ID: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  AI_PROVIDER: z.enum(['gemini', 'mock']).default('gemini'),
  MIN_MATCH_SCORE: z.coerce.number().min(0).max(100).default(60),
  DATA_DIR: z.string().default(path.resolve(process.cwd(), 'data')),
  LOG_LEVEL: z.string().optional().default('INFO'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
