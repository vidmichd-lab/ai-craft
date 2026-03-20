const normalizeBaseUrl = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/g, '');
};

const getWorkspaceConfig = () => {
  const config = window.__APP_CONFIG?.workspaceApi;
  return config && typeof config === 'object' ? config : {};
};

export const isWorkspaceApiEnabled = () => {
  const config = getWorkspaceConfig();
  return config.enabled !== false;
};

export const getWorkspaceApiBaseUrl = () => {
  const config = getWorkspaceConfig();
  return normalizeBaseUrl(config.baseUrl || '');
};

const buildUrl = (path) => {
  const baseUrl = getWorkspaceApiBaseUrl();
  return `${baseUrl}${path}`;
};

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const buildRequestHeaders = ({ body, headers = {} }) => {
  const nextHeaders = {
    Accept: 'application/json',
    ...headers
  };

  if (body !== undefined && !nextHeaders['Content-Type']) {
    nextHeaders['Content-Type'] = 'application/json';
  }

  return nextHeaders;
};

const request = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const response = await fetch(buildUrl(path), {
    method,
    credentials: 'include',
    headers: buildRequestHeaders({ body, headers }),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const getWorkspaceHealth = () => request('/workspace/health');
export const listPublicWorkspaceTeams = () => request('/teams/public');
export const listAdminWorkspaceTeams = () => request('/admin/teams');
export const createAdminWorkspaceTeam = ({ name, slug }) => request('/admin/teams', {
  method: 'POST',
  body: { name, slug }
});
export const updateAdminWorkspaceTeam = ({ teamId, name, slug, status }) => request('/admin/teams/update', {
  method: 'POST',
  body: { teamId, name, slug, status }
});
export const listAdminWorkspaceUsers = ({ teamId }) => request(`/admin/users?teamId=${encodeURIComponent(teamId)}`);
export const createAdminWorkspaceUser = ({ teamId, email, displayName, role }) => request('/admin/users', {
  method: 'POST',
  body: { teamId, email, displayName, role }
});
export const resetAdminWorkspaceUserPassword = ({ teamId, userId }) => request('/admin/users/reset-password', {
  method: 'POST',
  body: { teamId, userId }
});
export const updateAdminWorkspaceUserRole = ({ teamId, userId, role }) => request('/admin/users/role', {
  method: 'POST',
  body: { teamId, userId, role }
});
export const removeAdminWorkspaceUser = ({ teamId, userId }) => request('/admin/users/remove', {
  method: 'POST',
  body: { teamId, userId }
});
export const loginWorkspace = ({ email, password, teamSlug }) => request('/auth/login', {
  method: 'POST',
  body: teamSlug ? { email, password, teamSlug } : { email, password }
});
export const logoutWorkspace = () => request('/auth/logout', { method: 'POST' });
export const getWorkspaceMe = () => request('/auth/me');
export const updateWorkspaceAccount = ({ displayName }) => request('/account/profile', {
  method: 'POST',
  body: { displayName }
});
export const getCurrentWorkspaceTeam = () => request('/teams/current');
export const listWorkspaceTeamMembers = () => request('/team-members');
export const getWorkspaceTeamDefaults = () => request('/team-defaults');
export const saveWorkspaceTeamDefaults = ({ defaults, mediaSources }) => request('/team-defaults', {
  method: 'POST',
  body: { defaults, mediaSources }
});
export const getAdminWorkspaceTeamDefaults = ({ teamId }) => request(`/admin/team-defaults?teamId=${encodeURIComponent(teamId)}`);
export const saveAdminWorkspaceTeamDefaults = ({ teamId, defaults, mediaSources }) => request('/admin/team-defaults', {
  method: 'POST',
  body: { teamId, defaults, mediaSources }
});
export const listWorkspaceProjects = ({ includeArchived = false } = {}) => request(`/projects?includeArchived=${includeArchived ? 'true' : 'false'}`);
export const createWorkspaceProject = ({ name, description = '', state = {} }) => request('/projects', {
  method: 'POST',
  body: { name, description, state }
});
export const updateWorkspaceProject = ({ projectId, name, description, state }) => request('/projects/update', {
  method: 'POST',
  body: { projectId, name, description, state }
});
export const archiveWorkspaceProject = ({ projectId }) => request('/projects/archive', {
  method: 'POST',
  body: { projectId }
});
export const listWorkspaceSnapshots = ({ projectId = '', kind = '' } = {}) => {
  const query = new URLSearchParams();
  if (projectId) query.set('projectId', projectId);
  if (kind) query.set('kind', kind);
  return request(`/snapshots?${query.toString()}`);
};
export const saveWorkspaceSnapshot = ({ projectId, name, kind = 'snapshot', state }) => request('/snapshots', {
  method: 'POST',
  body: { projectId, name, kind, state }
});
