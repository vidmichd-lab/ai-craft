import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  cloneJson,
  loadWorkspaceConfig,
  toTimestamp
} from './config.mjs';
import { createWorkspaceAdminHandlers } from './admin.mjs';
import { createWorkspaceAuth } from './auth.mjs';
import { createWorkspaceProjectHandlers } from './projects.mjs';
import { createMemoryStorage } from './storage-memory.mjs';
import { createYdbStorage } from './storage-ydb.mjs';
import { createWorkspaceTeamHandlers } from './team.mjs';
import { createHttpHelpers } from './http.mjs';

const PROJECT_ROLES = new Set(['admin', 'lead', 'editor']);
const TEAM_DEFAULTS_ROLES = new Set(['admin', 'lead']);
const ASSIGNABLE_TEAM_ROLES = new Set(['lead', 'editor']);
const PUBLIC_TEAM_STATUSES = new Set(['active']);
const config = loadWorkspaceConfig();
const { inferOrigin, inferMethod, inferPath, buildHeaders, json, toError } = createHttpHelpers(config.allowedOrigins);

const parseBody = (event) => {
  if (!event?.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  if (!raw) return {};
  return JSON.parse(raw);
};

const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  const [algorithm, salt, digest] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !digest) return false;
  const actual = scryptSync(password, salt, 64).toString('hex');
  const left = Buffer.from(actual, 'hex');
  const right = Buffer.from(digest, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
};

const sanitizeProjectName = (value) => {
  const name = typeof value === 'string' ? value.trim() : '';
  return name.slice(0, 120);
};

const sanitizeText = (value, maxLength = 1000) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.slice(0, maxLength);
};

const slugifyValue = (value, fallback = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

const sanitizeEmail = (value) => sanitizeText(value, 320).toLowerCase();
const sanitizeDisplayName = (value) => sanitizeText(value, 120);
const sanitizeTeamSlug = (value) => slugifyValue(sanitizeText(value, 120));

const sanitizeState = (value) => (value && typeof value === 'object' ? cloneJson(value) : null);

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  return value.toLowerCase() === 'true';
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPassword = (value) => typeof value === 'string' && value.length >= 8;
const normalizeRole = (value) => sanitizeText(value, 32).toLowerCase();
const isAssignableRole = (value) => ASSIGNABLE_TEAM_ROLES.has(normalizeRole(value));
const resolveDefaultRole = () => {
  const defaultRole = normalizeRole(config.defaultRole);
  return ASSIGNABLE_TEAM_ROLES.has(defaultRole) ? defaultRole : 'editor';
};
const resolveRequestedRole = (value, fallback = resolveDefaultRole()) => {
  const role = normalizeRole(value);
  return ASSIGNABLE_TEAM_ROLES.has(role) ? role : fallback;
};
const isSuperAdminEmail = (email) => !!email && config.superAdminEmails.includes(String(email).toLowerCase());
const resolveBootstrapRole = (email) => isSuperAdminEmail(email) ? 'admin' : resolveDefaultRole();
const generatePassword = () => randomBytes(12).toString('base64url');

const buildPublicUser = (user, role = '') => ({
  id: user.id,
  email: user.email,
  role,
  displayName: user.displayName,
  status: user.status,
  isSuperadmin: isSuperAdminEmail(user.email)
});

const buildPublicTeam = (team) => ({
  id: team.id,
  slug: team.slug,
  name: team.name
});

const buildTeamSummary = (team, sessionFallback) => team
  ? buildPublicTeam(team)
  : {
    id: sessionFallback.teamId,
    slug: sessionFallback.teamSlug || '',
    name: ''
  };

const buildAdminTeam = (team) => ({
  id: team.id,
  slug: team.slug,
  name: team.name,
  status: team.status,
  createdAt: team.createdAt,
  updatedAt: team.updatedAt,
  archivedAt: team.archivedAt
});

const buildAdminMember = ({ user, membership }) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  status: user.status,
  role: membership.role,
  membershipStatus: membership.status,
  isSuperadmin: isSuperAdminEmail(user.email),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLoginAt: user.lastLoginAt
});

const buildPublicProject = (project) => ({
  id: project.id,
  teamId: project.teamId,
  name: project.name,
  description: project.description,
  status: project.status,
  state: cloneJson(project.state),
  createdBy: project.createdBy,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  archivedAt: project.archivedAt
});

const buildPublicSnapshot = (snapshot) => ({
  id: snapshot.id,
  projectId: snapshot.projectId,
  teamId: snapshot.teamId,
  name: snapshot.name,
  kind: snapshot.kind,
  state: cloneJson(snapshot.state),
  createdBy: snapshot.createdBy,
  authorName: snapshot.authorName || '',
  createdAt: snapshot.createdAt
});

const enrichSnapshotsWithAuthors = async (snapshots = []) => {
  const items = Array.isArray(snapshots) ? snapshots : [];
  const uniqueUserIds = Array.from(new Set(items.map((snapshot) => snapshot?.createdBy).filter(Boolean)));
  if (!uniqueUserIds.length) {
    return items.map((snapshot) => ({ ...snapshot, authorName: '' }));
  }

  const authorEntries = await Promise.all(uniqueUserIds.map(async (userId) => {
    try {
      const user = await storage.getUserById({ userId });
      const authorName = user?.displayName || user?.email || '';
      return [userId, authorName];
    } catch {
      return [userId, ''];
    }
  }));
  const authorMap = new Map(authorEntries);

  return items.map((snapshot) => ({
    ...snapshot,
    authorName: authorMap.get(snapshot.createdBy) || ''
  }));
};

const storage = config.storage === 'ydb'
  ? createYdbStorage({
    config,
    randomUUID,
    toTimestamp,
    cloneJson,
    hashPassword
  })
  : createMemoryStorage({
    config,
    randomUUID,
    toTimestamp,
    cloneJson,
    hashPassword,
    isValidEmail,
    resolveBootstrapRole,
    publicTeamStatuses: PUBLIC_TEAM_STATUSES
  });

const withStorageErrors = async (origin, handler) => {
  try {
    return await handler();
  } catch (error) {
    if (String(error?.message || '').includes('YDB adapter is not implemented yet')) {
      return json(501, toError(
        'Workspace storage adapter is not implemented yet',
        {
          storage: storage.kind,
          nextStep: 'Implement YDB repositories for users, memberships, projects, sessions and team_defaults'
        }
      ), origin);
    }
    throw error;
  }
};

const auth = createWorkspaceAuth({
  config,
  storage,
  json,
  toError,
  withStorageErrors,
  parseBody,
  hashPassword,
  verifyPassword,
  sanitizeEmail,
  sanitizeDisplayName,
  sanitizeTeamSlug,
  buildPublicUser,
  buildPublicTeam,
  buildTeamSummary,
  isSuperAdminEmail,
  resolveBootstrapRole
});
const admin = createWorkspaceAdminHandlers({
  auth,
  storage,
  json,
  toError,
  withStorageErrors,
  parseBody,
  cloneJson,
  sanitizeText,
  sanitizeTeamSlug,
  sanitizeEmail,
  sanitizeDisplayName,
  sanitizeState,
  normalizeRole,
  isValidEmail,
  isAssignableRole,
  isSuperAdminEmail,
  resolveDefaultRole,
  resolveRequestedRole,
  generatePassword,
  hashPassword,
  buildAdminTeam,
  buildAdminMember
});
const team = createWorkspaceTeamHandlers({
  auth,
  storage,
  json,
  toError,
  withStorageErrors,
  parseBody,
  cloneJson,
  sanitizeState,
  teamDefaultsRoles: TEAM_DEFAULTS_ROLES,
  buildPublicTeam,
  buildAdminMember
});
const projects = createWorkspaceProjectHandlers({
  auth,
  storage,
  json,
  toError,
  withStorageErrors,
  parseBody,
  parseBoolean,
  sanitizeText,
  sanitizeState,
  sanitizeProjectName,
  projectRoles: PROJECT_ROLES,
  buildPublicProject,
  buildPublicSnapshot,
  enrichSnapshotsWithAuthors
});

const handleHealth = async (origin) => {
  const health = await storage.health();
  return json(200, {
    ok: true,
    service: 'workspace-api',
    storage: {
      mode: storage.kind,
      ...health
    }
  }, origin);
};

const handlePublicTeams = async (origin) => withStorageErrors(origin, async () => {
  const teams = await storage.listPublicTeams();
  return json(200, {
    ok: true,
    teams: teams.map(buildPublicTeam)
  }, origin);
});

export const handler = async (event) => {
  const origin = inferOrigin(event);
  const method = inferMethod(event);
  const path = inferPath(event);

  if (config.debugEvent) {
    return json(200, {
      ok: true,
      debug: {
        method,
        path,
        rawPath: event?.rawPath || null,
        routeKey: event?.routeKey || event?.requestContext?.routeKey || null,
        operationId: event?.requestContext?.operationId || event?.requestContext?.apiGateway?.operationId || null,
        requestContext: event?.requestContext || null
      }
    }, origin);
  }

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: buildHeaders(origin),
      body: ''
    };
  }

  try {
    if (method === 'GET' && path.endsWith('/workspace/health')) {
      return handleHealth(origin);
    }
    if (method === 'GET' && path.endsWith('/teams/public')) {
      return handlePublicTeams(origin);
    }
    if (method === 'GET' && path.endsWith('/admin/teams')) {
      return admin.handleAdminListTeams(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/teams')) {
      return admin.handleAdminCreateTeam(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/teams/update')) {
      return admin.handleAdminUpdateTeam(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/teams/archive')) {
      return admin.handleAdminArchiveTeam(event, origin);
    }
    if (method === 'GET' && path.endsWith('/admin/users')) {
      return admin.handleAdminListUsers(event, origin);
    }
    if (method === 'GET' && path.endsWith('/admin/team-defaults')) {
      return admin.handleAdminGetTeamDefaults(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/users')) {
      return admin.handleAdminCreateUser(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/team-defaults')) {
      return admin.handleAdminSaveTeamDefaults(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/users/reset-password')) {
      return admin.handleAdminResetUserPassword(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/users/role')) {
      return admin.handleAdminUpdateUserRole(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/users/remove')) {
      return admin.handleAdminRemoveUser(event, origin);
    }
    if (method === 'POST' && path.endsWith('/auth/login')) {
      return auth.handleLogin(event, origin);
    }
    if (method === 'POST' && path.endsWith('/auth/register')) {
      return auth.handleRegister(event, origin);
    }
    if (method === 'POST' && path.endsWith('/auth/logout')) {
      return auth.handleLogout(event, origin);
    }
    if (method === 'GET' && path.endsWith('/auth/me')) {
      return auth.handleMe(event, origin);
    }
    if (method === 'POST' && path.endsWith('/account/profile')) {
      return auth.handleAccountProfileUpdate(event, origin);
    }
    if (method === 'GET' && path.endsWith('/teams/current')) {
      return team.handleCurrentTeam(event, origin);
    }
    if (method === 'GET' && path.endsWith('/team-members')) {
      return team.handleTeamMembers(event, origin);
    }
    if (method === 'GET' && path.endsWith('/team-defaults')) {
      return team.handleGetTeamDefaults(event, origin);
    }
    if (method === 'POST' && path.endsWith('/team-defaults')) {
      return team.handleSaveTeamDefaults(event, origin);
    }
    if (method === 'GET' && path.endsWith('/projects')) {
      return projects.handleListProjects(event, origin);
    }
    if (method === 'POST' && path.endsWith('/projects')) {
      return projects.handleCreateProject(event, origin);
    }
    if (method === 'POST' && path.endsWith('/projects/update')) {
      return projects.handleUpdateProject(event, origin);
    }
    if (method === 'POST' && path.endsWith('/projects/archive')) {
      return projects.handleArchiveProject(event, origin);
    }
    if (method === 'GET' && path.endsWith('/snapshots')) {
      return projects.handleListSnapshots(event, origin);
    }
    if (method === 'POST' && path.endsWith('/snapshots')) {
      return projects.handleSaveSnapshot(event, origin);
    }

    console.error('workspace-api route miss', JSON.stringify({
      method,
      path,
      rawPath: event?.rawPath || null,
      operationId: event?.requestContext?.operationId || event?.requestContext?.apiGateway?.operationId || null,
      routeKey: event?.routeKey || event?.requestContext?.routeKey || null
    }));
    return json(404, toError('Not found', { method, path }), origin);
  } catch (error) {
    console.error('workspace-api failure', error);
    return json(500, toError('Internal server error', { message: error?.message || String(error) }), origin);
  }
};

export const __private__ = {
  buildSessionCookie: auth.buildSessionCookie,
  clearSessionCookie: auth.clearSessionCookie,
  createAccessPayload: auth.createAccessPayload,
  hashPassword,
  parseCookies: auth.parseCookies,
  signToken: auth.signToken,
  verifyPassword,
  verifyToken: auth.verifyToken
};
