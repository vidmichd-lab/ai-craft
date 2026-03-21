import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequestContext } from '@/server/http/request-context';

const getWorkspaceMeMock = vi.fn();

vi.mock('@/server/workspace-api/client', () => ({
  getWorkspaceMe: (...args: unknown[]) => getWorkspaceMeMock(...args)
}));

describe('request session boundary', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns unauthorized only for real auth failures', async () => {
    getWorkspaceMeMock.mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), { status: 401 }));

    const { requireWorkspaceSession } = await import('./request-session');
    const result = await requireWorkspaceSession(
      new Request('https://app.example/api/auth/me', {
        headers: { cookie: 'session=1' }
      }),
      createRequestContext(new Request('https://app.example/api/auth/me'))
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected unauthorized session result');
    }
    expect(result.response.status).toBe(401);
  });

  it('rethrows upstream failures instead of masking them as unauthorized', async () => {
    getWorkspaceMeMock.mockRejectedValueOnce(Object.assign(new Error('Upstream unavailable'), { status: 502 }));

    const { requireWorkspaceSession } = await import('./request-session');
    await expect(
      requireWorkspaceSession(
        new Request('https://app.example/api/auth/me', {
          headers: { cookie: 'session=1' }
        }),
        createRequestContext(new Request('https://app.example/api/auth/me'))
      )
    ).rejects.toThrow('Upstream unavailable');
  });
});
