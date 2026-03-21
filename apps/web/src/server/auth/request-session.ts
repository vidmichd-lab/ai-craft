import { getWorkspaceMe } from '@/server/workspace-api/client';
import type { WorkspaceMeResponse } from '@ai-craft/workspace-sdk';
import type { RequestContext } from '@/server/http/request-context';
import { jsonResponse } from '@/server/http/response';
import { normalizeWorkspaceRole } from '@ai-craft/workspace-domain';

export const getRequestCookie = (request: Request) => request.headers.get('cookie') || '';

export const getRequestWorkspaceSession = async (request: Request) => {
  const cookie = getRequestCookie(request);
  const me = await getWorkspaceMe(cookie);

  return {
    cookie,
    me
  };
};

const unauthorizedResponse = (context?: RequestContext) =>
  jsonResponse(
    {
      error: 'Unauthorized',
      errorCode: 'UNAUTHORIZED',
      requestId: context?.requestId
    },
    context,
    { status: 401 }
  );

const forbiddenResponse = (context?: RequestContext) =>
  jsonResponse(
    {
      error: 'Forbidden',
      errorCode: 'FORBIDDEN',
      requestId: context?.requestId
    },
    context,
    { status: 403 }
  );

const normalizeSessionRole = (session: WorkspaceMeResponse) =>
  normalizeWorkspaceRole(session.user.role, Boolean(session.user.isSuperadmin));

export const requireWorkspaceSession = async (request: Request, context?: RequestContext) => {
  try {
    const session = await getRequestWorkspaceSession(request);

    return {
      ok: true as const,
      cookie: session.cookie,
      me: session.me.data,
      role: normalizeSessionRole(session.me.data)
    };
  } catch {
    return {
      ok: false as const,
      response: unauthorizedResponse(context)
    };
  }
};

export const requireWorkspaceRoleSession = async (
  request: Request,
  allowedRoles: string[],
  context?: RequestContext
) => {
  const session = await requireWorkspaceSession(request, context);
  if (!session.ok) return session;

  if (!allowedRoles.includes(session.role)) {
    return {
      ok: false as const,
      response: forbiddenResponse(context)
    };
  }

  return session;
};

export const requireWorkspaceSuperadminSession = async (request: Request, context?: RequestContext) => {
  const session = await requireWorkspaceSession(request, context);
  if (!session.ok) return session;

  if (!session.me.user.isSuperadmin) {
    return {
      ok: false as const,
      response: forbiddenResponse(context)
    };
  }

  return {
    ok: true as const,
    cookie: session.cookie,
    me: session.me
  };
};

export type RequestWorkspaceSession = {
  cookie: string;
  me: { data: WorkspaceMeResponse; setCookies: string[] };
};
