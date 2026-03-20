import { getWorkspaceMe } from '@/server/workspace-api/client';
import type { WorkspaceMeResponse } from '@ai-craft/workspace-sdk';
import type { RequestContext } from '@/server/http/request-context';
import { jsonResponse } from '@/server/http/response';

export const getRequestCookie = (request: Request) => request.headers.get('cookie') || '';

export const getRequestWorkspaceSession = async (request: Request) => {
  const cookie = getRequestCookie(request);
  const me = await getWorkspaceMe(cookie);

  return {
    cookie,
    me
  };
};

export const requireWorkspaceAdminSession = async (request: Request, context?: RequestContext) => {
  const session = await getRequestWorkspaceSession(request);
  if (!session.me.data.user.isSuperadmin) {
    return {
      ok: false as const,
      response: jsonResponse(
        {
          error: 'Forbidden',
          errorCode: 'FORBIDDEN',
          requestId: context?.requestId
        },
        context,
        { status: 403 }
      )
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
