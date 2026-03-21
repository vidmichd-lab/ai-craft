import { afterEach, describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';

const originalEnv = { ...process.env };

const restoreEnv = () => {
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  });

  Object.entries(originalEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

const loadMediaApi = async (env = {}) => {
  restoreEnv();
  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  });

  const moduleUrl = `${pathToFileURL(
    new URL('../serverless/media-api/index.mjs', import.meta.url).pathname
  ).href}?test=${Date.now()}-${Math.random()}`;
  return import(/* @vite-ignore */ moduleUrl);
};

afterEach(() => {
  restoreEnv();
});

describe('media-api security', () => {
  it('requires a mutation token for protected routes in production', async () => {
    const mod = await loadMediaApi({
      NODE_ENV: 'production',
      MEDIA_BUCKET: 'ai-craft-media',
      MEDIA_MUTATION_TOKEN: 'top-secret'
    });

    const missingToken = mod.__private__.authorizeMutation({ headers: {} }, 'http://localhost:3000');
    expect(missingToken?.statusCode).toBe(401);

    const wrongToken = mod.__private__.authorizeMutation(
      { headers: { 'x-media-api-token': 'wrong' } },
      'http://localhost:3000'
    );
    expect(wrongToken?.statusCode).toBe(403);

    const success = mod.__private__.authorizeMutation(
      { headers: { 'x-media-api-token': 'top-secret' } },
      'http://localhost:3000'
    );
    expect(success).toBeNull();
  });

  it('keeps folder filters addressable when parsing object keys', async () => {
    const mod = await loadMediaApi({
      MEDIA_BUCKET: 'ai-craft-media'
    });

    expect(mod.__private__.parseObjectKey('published/pro/assets/hero.webp', 'published/')).toMatchObject({
      rootName: 'pro',
      folder1: 'pro',
      folder2: 'assets',
      nestedSegments: ['assets'],
      fileName: 'hero.webp'
    });
  });
});
