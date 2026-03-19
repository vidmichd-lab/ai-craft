import { env } from '@/server/env';
import {
  loginWorkspaceInputSchema,
  workspaceAuthResponseSchema,
  workspaceAdminRemoveUserResponseSchema,
  workspaceAdminUpdateTeamResponseSchema,
  workspaceAdminUserMutationResponseSchema,
  workspaceCurrentTeamResponseSchema,
  workspaceMeResponseSchema,
  workspaceProjectsResponseSchema,
  workspaceSaveTeamDefaultsResponseSchema,
  workspaceSaveSnapshotResponseSchema,
  workspaceSnapshotsResponseSchema,
  workspaceTeamMembersResponseSchema,
  type LoginWorkspaceInput,
  type WorkspaceAdminRemoveUserResponse,
  type WorkspaceAdminUpdateTeamResponse,
  type WorkspaceAdminUserMutationResponse,
  type WorkspaceAuthResponse,
  type WorkspaceCurrentTeamResponse,
  type WorkspaceMeResponse,
  type WorkspaceProjectsResponse,
  type WorkspaceSaveTeamDefaultsResponse,
  type WorkspaceSaveSnapshotResponse,
  type WorkspaceSnapshotsResponse,
  type WorkspaceTeamMembersResponse
} from '@ai-craft/workspace-sdk';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  cookie?: string;
};

type RequestResult<T> = {
  data: T;
  setCookies: string[];
};

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const getSetCookies = (response: Response) => {
  const headerBag = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headerBag.getSetCookie === 'function') {
    return headerBag.getSetCookie().filter(Boolean);
  }

  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
};

const requestWorkspaceApi = async <T>(
  path: string,
  parser: { parse: (value: unknown) => T },
  options: RequestOptions = {}
): Promise<RequestResult<T>> => {
  const response = await fetch(`${env.WORKSPACE_API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'text/plain;charset=UTF-8' } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store'
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && ('error' in payload || 'message' in payload)
        ? String((payload as { error?: string; message?: string }).error || (payload as { message?: string }).message)
        : '') || `HTTP ${response.status}`;
    const error = new Error(message);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return {
    data: parser.parse(payload),
    setCookies: getSetCookies(response)
  };
};

export const loginWorkspace = (input: LoginWorkspaceInput) => {
  const payload = loginWorkspaceInputSchema.parse(input);
  return requestWorkspaceApi<WorkspaceAuthResponse>('/auth/login', workspaceAuthResponseSchema, {
    method: 'POST',
    body: payload
  });
};

export const getWorkspaceMe = (cookie?: string) =>
  requestWorkspaceApi<WorkspaceMeResponse>('/auth/me', workspaceMeResponseSchema, {
    method: 'GET',
    cookie
  });

export const updateWorkspaceProfile = (input: { displayName: string }, cookie?: string) =>
  requestWorkspaceApi<WorkspaceMeResponse>('/account/profile', workspaceMeResponseSchema, {
    method: 'POST',
    body: input,
    cookie
  });

export const getCurrentWorkspaceTeam = (cookie?: string) =>
  requestWorkspaceApi<WorkspaceCurrentTeamResponse>('/teams/current', workspaceCurrentTeamResponseSchema, {
    method: 'GET',
    cookie
  });

export const getWorkspaceTeamMembers = (cookie?: string) =>
  requestWorkspaceApi<WorkspaceTeamMembersResponse>('/team-members', workspaceTeamMembersResponseSchema, {
    method: 'GET',
    cookie
  });

export const listWorkspaceProjects = (cookie?: string) =>
  requestWorkspaceApi<WorkspaceProjectsResponse>('/projects?includeArchived=false', workspaceProjectsResponseSchema, {
    method: 'GET',
    cookie
  });

export const createWorkspaceProject = (
  input: { name: string; description?: string; state?: Record<string, unknown> },
  cookie?: string
) =>
  requestWorkspaceApi<{ ok: true; project: WorkspaceProjectsResponse['projects'][number] }>(
    '/projects',
    { parse: (value) => value as { ok: true; project: WorkspaceProjectsResponse['projects'][number] } },
    {
      method: 'POST',
      body: input,
      cookie
    }
  );

export const listWorkspaceSnapshots = (
  input: { projectId?: string; kind?: string },
  cookie?: string
) => {
  const query = new URLSearchParams();
  if (input.projectId) query.set('projectId', input.projectId);
  if (input.kind) query.set('kind', input.kind);
  return requestWorkspaceApi<WorkspaceSnapshotsResponse>(`/snapshots?${query.toString()}`, workspaceSnapshotsResponseSchema, {
    method: 'GET',
    cookie
  });
};

export const saveWorkspaceSnapshot = (
  input: { projectId: string; name: string; kind: 'template' | 'snapshot'; state: Record<string, unknown> },
  cookie?: string
) =>
  requestWorkspaceApi<WorkspaceSaveSnapshotResponse>('/snapshots', workspaceSaveSnapshotResponseSchema, {
    method: 'POST',
    body: input,
    cookie
  });

export const saveWorkspaceTeamDefaults = (
  input: { defaults: Record<string, unknown>; mediaSources: Record<string, unknown> },
  cookie?: string
) =>
  requestWorkspaceApi<WorkspaceSaveTeamDefaultsResponse>('/team-defaults', workspaceSaveTeamDefaultsResponseSchema, {
    method: 'POST',
    body: input,
    cookie
  });

export const createAdminWorkspaceUser = (
  input: { teamId: string; email: string; displayName: string; role: string },
  cookie?: string
) =>
  requestWorkspaceApi<WorkspaceAdminUserMutationResponse>('/admin/users', workspaceAdminUserMutationResponseSchema, {
    method: 'POST',
    body: input,
    cookie
  });

export const updateAdminWorkspaceUserRole = (
  input: { teamId: string; userId: string; role: string },
  cookie?: string
) =>
  requestWorkspaceApi<WorkspaceAdminUserMutationResponse>('/admin/users/role', workspaceAdminUserMutationResponseSchema, {
    method: 'POST',
    body: input,
    cookie
  });

export const resetAdminWorkspaceUserPassword = (
  input: { teamId: string; userId: string },
  cookie?: string
) =>
  requestWorkspaceApi<WorkspaceAdminUserMutationResponse>('/admin/users/reset-password', workspaceAdminUserMutationResponseSchema, {
    method: 'POST',
    body: input,
    cookie
  });

export const removeAdminWorkspaceUser = (
  input: { teamId: string; userId: string },
  cookie?: string
) =>
  requestWorkspaceApi<WorkspaceAdminRemoveUserResponse>('/admin/users/remove', workspaceAdminRemoveUserResponseSchema, {
    method: 'POST',
    body: input,
    cookie
  });

export const updateAdminWorkspaceTeam = (
  input: { teamId: string; name: string; slug: string; status: string },
  cookie?: string
) =>
  requestWorkspaceApi<WorkspaceAdminUpdateTeamResponse>('/admin/teams/update', workspaceAdminUpdateTeamResponseSchema, {
    method: 'POST',
    body: input,
    cookie
  });

export const logoutWorkspace = (cookie?: string) =>
  requestWorkspaceApi<{ ok: true }>('/auth/logout', { parse: (value) => value as { ok: true } }, {
    method: 'POST',
    cookie
  });
