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

describe('media API server client', () => {
  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('sends JSON payloads with application/json and mutation token', async () => {
    process.env.MEDIA_MANIFEST_URL = 'https://media.example/media/manifest';
    process.env.MEDIA_MUTATION_TOKEN = 'token-1';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, uploadUrl: 'https://upload.example' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const { requestPresignedUpload } = await import('./client');
    await requestPresignedUpload({
      folder1: 'brand',
      folder2: 'logos',
      filename: 'logo.png',
      contentType: 'image/png',
      fileSize: 1024,
      visibility: 'published'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://media.example/media/presign-upload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Media-Api-Token': 'token-1'
        }),
        cache: 'no-store'
      })
    );
  });

  it('fails fast when media manifest env is missing', async () => {
    delete process.env.MEDIA_MANIFEST_URL;

    const { getMediaManifest } = await import('./client');
    expect(() => getMediaManifest()).toThrow('Missing required apps/web env: MEDIA_MANIFEST_URL');
  });
});
