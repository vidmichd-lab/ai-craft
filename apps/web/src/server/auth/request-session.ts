import { NextResponse } from 'next/server';
import { getWorkspaceMe } from '@/server/workspace-api/client';
import type { WorkspaceMeResponse } from '@ai-craft/workspace-sdk';

export const getRequestCookie = (request: Request) => request.headers.get('cookie') || '';

export const getRequestWorkspaceSession = async (request: Request) => {
  const cookie = getRequestCookie(request);
  const me = await getWorkspaceMe(cookie);

  return {
    cookie,
    me
  };
};

export const requireWorkspaceAdminSession = async (request: Request) => {
  const session = await getRequestWorkspaceSession(request);
  if (!session.me.data.user.isSuperadmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    };
  }

  return {
    ok: true as const,
    cookie: session.cookie,
    me: session.me.data
  };
};

export type RequestWorkspaceSession = {
  cookie: string;
  me: { data: WorkspaceMeResponse; setCookies: string[] };
};
