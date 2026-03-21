import { getWorkspaceMe } from '@/server/workspace-api/client';
import type { WorkspaceMeResponse } from '@ai-craft/workspace-sdk';
import type { RequestContext } from '@/server/http/request-context';
import { logRequestEvent } from '@/server/http/request-context';
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

const getErrorStatus = (error: unknown) =>
  typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined;

export const requireWorkspaceSession = async (request: Request, context?: RequestContext) => {
  try {
    const session = await getRequestWorkspaceSession(request);

    return {
      ok: true as const,
      cookie: session.cookie,
      me: session.me.data,
      role: normalizeSessionRole(session.me.data)
    };
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 401) {
      return {
        ok: false as const,
        response: unauthorizedResponse(context)
      };
    }

    if (status === 403) {
      return {
        ok: false as const,
        response: forbiddenResponse(context)
      };
    }

    if (context) {
      logRequestEvent('error', context, 'workspace_session_resolution_failed', {
        status: status || 500,
        message: error instanceof Error ? error.message : 'Unknown session resolution error'
      });
    }

    throw error;
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
