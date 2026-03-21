import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  WORKSPACE_API_BASE_URL: process.env.WORKSPACE_API_BASE_URL,
  MEDIA_MANIFEST_URL: process.env.MEDIA_MANIFEST_URL,
  MEDIA_MUTATION_TOKEN: process.env.MEDIA_MUTATION_TOKEN
};

const restoreEnv = () => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

describe('apps/web env contract', () => {
  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it('does not inject production integration defaults', async () => {
    delete process.env.WORKSPACE_API_BASE_URL;
    delete process.env.MEDIA_MANIFEST_URL;

    const { env } = await import('./env');
    expect(env.WORKSPACE_API_BASE_URL).toBeUndefined();
    expect(env.MEDIA_MANIFEST_URL).toBeUndefined();
  });

  it('throws when a required integration env is accessed without configuration', async () => {
    delete process.env.WORKSPACE_API_BASE_URL;
    delete process.env.MEDIA_MANIFEST_URL;

    const { requireServerEnv } = await import('./env');
    expect(() => requireServerEnv('WORKSPACE_API_BASE_URL')).toThrow(
      'Missing required apps/web env: WORKSPACE_API_BASE_URL'
    );
  });
});
