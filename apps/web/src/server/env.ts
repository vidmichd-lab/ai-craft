import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WORKSPACE_API_BASE_URL: z.string().url().default('https://d5dvnbnk8h8lkshgdjjm.l3hh3szr.apigw.yandexcloud.net'),
  MEDIA_MANIFEST_URL: z.string().url().default('https://d5dcfknc559sg4v868te.laqt4bj7.apigw.yandexcloud.net/media/manifest')
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  WORKSPACE_API_BASE_URL: process.env.WORKSPACE_API_BASE_URL,
  MEDIA_MANIFEST_URL: process.env.MEDIA_MANIFEST_URL
});
