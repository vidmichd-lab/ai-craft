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

describe('workspace API server client', () => {
  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('sends JSON payloads with application/json', async () => {
    process.env.WORKSPACE_API_BASE_URL = 'https://workspace.example';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          user: {
            id: 'u1',
            email: 'demo@example.com',
            displayName: 'Demo',
            role: 'editor',
            isSuperadmin: false
          },
          team: {
            id: 't1',
            name: 'Team',
            slug: 'team',
            status: 'active'
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    const { updateWorkspaceProfile } = await import('./client');
    await updateWorkspaceProfile({ displayName: 'Demo' }, 'session=1');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://workspace.example/account/profile',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Cookie: 'session=1'
        }),
        body: JSON.stringify({ displayName: 'Demo' }),
        cache: 'no-store'
      })
    );
  });

  it('fails fast when integration env is missing', async () => {
    delete process.env.WORKSPACE_API_BASE_URL;

    const { getWorkspaceMe } = await import('./client');
    await expect(getWorkspaceMe('session=1')).rejects.toThrow(
      'Missing required apps/web env: WORKSPACE_API_BASE_URL'
    );
  });
});
