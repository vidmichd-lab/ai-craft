import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WORKSPACE_API_BASE_URL: z.string().url().optional(),
  MEDIA_MANIFEST_URL: z.string().url().optional(),
  MEDIA_MUTATION_TOKEN: z.string().trim().min(1).optional()
});

const rawEnv = {
  NODE_ENV: process.env.NODE_ENV,
  WORKSPACE_API_BASE_URL: process.env.WORKSPACE_API_BASE_URL,
  MEDIA_MANIFEST_URL: process.env.MEDIA_MANIFEST_URL,
  MEDIA_MUTATION_TOKEN: process.env.MEDIA_MUTATION_TOKEN
};

const parsedEnv = envSchema.safeParse(rawEnv);

if (!parsedEnv.success) {
  throw new Error(`Invalid apps/web env: ${parsedEnv.error.issues.map((issue) => issue.path.join('.') || 'root').join(', ')}`);
}

export const env = parsedEnv.data;

export const requireServerEnv = (name: 'WORKSPACE_API_BASE_URL' | 'MEDIA_MANIFEST_URL') => {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required apps/web env: ${name}`);
  }
  return value;
};
