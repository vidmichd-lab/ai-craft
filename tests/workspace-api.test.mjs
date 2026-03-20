import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWorkspaceProject, getWorkspaceHealth } from '../src/utils/workspaceApi.js';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

describe('workspaceApi request', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('sends JSON payloads with application/json and credentials', async () => {
    globalThis.window = {
      __APP_CONFIG: {
        workspaceApi: {
          baseUrl: 'https://workspace.example'
        }
      }
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ project: { id: 'project-1' } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
    globalThis.fetch = fetchMock;

    const response = await createWorkspaceProject({
      name: 'Demo project',
      description: 'Saved from test',
      state: { title: 'Hello' }
    });

    expect(response).toEqual({ project: { id: 'project-1' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://workspace.example/projects',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          name: 'Demo project',
          description: 'Saved from test',
          state: { title: 'Hello' }
        })
      })
    );
  });

  it('does not attach a JSON body or content-type to GET requests', async () => {
    globalThis.window = {
      __APP_CONFIG: {
        workspaceApi: {
          baseUrl: 'https://workspace.example'
        }
      }
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
    globalThis.fetch = fetchMock;

    const response = await getWorkspaceHealth();

    expect(response).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://workspace.example/workspace/health',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: expect.objectContaining({
          Accept: 'application/json'
        }),
        body: undefined
      })
    );
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
});
