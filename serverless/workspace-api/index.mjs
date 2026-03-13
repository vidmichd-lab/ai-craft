import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import YdbSdk from 'ydb-sdk';

const {
  Driver,
  AUTO_TX,
  ExecuteQuerySettings,
  TypedData,
  TypedValues,
  Types,
  getCredentialsFromEnv
} = YdbSdk;

const DEFAULT_ALLOWED_ORIGINS = [
  'https://ai-craft.website.yandexcloud.net',
  'http://localhost:8000',
  'http://localhost:8001'
];

const STORAGE_MODE = (() => {
  const value = process.env.WORKSPACE_STORAGE;
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'memory';
})();
const PROJECT_ROLES = new Set(['admin', 'lead', 'editor']);
const TEAM_DEFAULTS_ROLES = new Set(['admin', 'lead']);
const ASSIGNABLE_TEAM_ROLES = new Set(['lead', 'editor']);
const PUBLIC_TEAM_STATUSES = new Set(['active']);

const getEnv = (name, fallback = '') => {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const splitCsv = (value, fallback = []) => {
  if (!value) return [...fallback];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const safeParseJson = (value, fallback) => {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toTimestamp = () => new Date().toISOString();

const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const IDENTITY_QUERY_SETTINGS = new ExecuteQuerySettings().withIdempotent(true);

const config = {
  storage: STORAGE_MODE,
  jwtSecret: getEnv('WORKSPACE_JWT_SECRET', 'change-me'),
  allowedOrigins: splitCsv(getEnv('WORKSPACE_ALLOWED_ORIGINS'), DEFAULT_ALLOWED_ORIGINS),
  superAdminEmails: splitCsv(getEnv('WORKSPACE_SUPERADMIN_EMAILS', 'vidmichd@ya.ru')).map((item) => item.toLowerCase()),
  cookieDomain: getEnv('WORKSPACE_COOKIE_DOMAIN', ''),
  cookieSecure: getEnv('WORKSPACE_COOKIE_SECURE', 'true').toLowerCase() !== 'false',
  cookieSameSite: getEnv('WORKSPACE_COOKIE_SAME_SITE', 'lax').toLowerCase(),
  accessTtlSeconds: Number.parseInt(getEnv('WORKSPACE_ACCESS_TTL_SECONDS', '43200'), 10) || 43200,
  sessionTtlSeconds: Number.parseInt(getEnv('WORKSPACE_SESSION_TTL_SECONDS', '2592000'), 10) || 2592000,
  defaultRole: getEnv('WORKSPACE_DEFAULT_ROLE', 'editor'),
  bootstrapTeamSlug: getEnv('WORKSPACE_BOOTSTRAP_TEAM_SLUG', 'practicum'),
  bootstrapTeamName: getEnv('WORKSPACE_BOOTSTRAP_TEAM_NAME', 'Яндекс Практикум'),
  bootstrapAdminEmail: getEnv('WORKSPACE_BOOTSTRAP_ADMIN_EMAIL', STORAGE_MODE === 'memory' ? 'admin@example.com' : '').toLowerCase(),
  bootstrapAdminPassword: getEnv('WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD', STORAGE_MODE === 'memory' ? 'change-me-now' : ''),
  bootstrapAdminName: getEnv('WORKSPACE_BOOTSTRAP_ADMIN_NAME', 'Workspace Admin'),
  bootstrapDefaultsJson: safeParseJson(getEnv('WORKSPACE_BOOTSTRAP_DEFAULTS_JSON', '{}'), {}),
  bootstrapMediaSourcesJson: safeParseJson(getEnv('WORKSPACE_BOOTSTRAP_MEDIA_SOURCES_JSON', '{}'), {}),
  ydbEndpoint: getEnv('YDB_ENDPOINT', ''),
  ydbDatabase: getEnv('YDB_DATABASE', ''),
  ydbAuthToken: getEnv('YDB_AUTH_TOKEN', ''),
  debugEvent: getEnv('WORKSPACE_DEBUG_EVENT', 'false').toLowerCase() === 'true'
};

const inferOrigin = (event) => {
  const headers = event?.headers || {};
  return headers.origin || headers.Origin || '';
};

const inferMethod = (event) => {
  const requestMethod = event?.requestContext?.http?.method;
  if (typeof requestMethod === 'string' && requestMethod) {
    return requestMethod.toUpperCase();
  }
  const method = event?.httpMethod;
  return typeof method === 'string' && method ? method.toUpperCase() : 'GET';
};

const inferPath = (event) => {
  const rawPath = (
    event?.requestContext?.http?.path ||
    event?.rawPath ||
    event?.path ||
    '/'
  );
  return String(rawPath).split('?')[0] || '/';
};

const resolveCorsOrigin = (origin) => {
  if (!origin) return config.allowedOrigins[0] || '*';
  if (config.allowedOrigins.includes('*')) return '*';
  return config.allowedOrigins.includes(origin) ? origin : config.allowedOrigins[0] || '*';
};

const buildHeaders = (origin, extra = {}) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '3600',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'Origin, Cookie',
  'X-Content-Type-Options': 'nosniff',
  ...extra
});

const json = (statusCode, payload, origin, extraHeaders = {}) => ({
  statusCode,
  headers: buildHeaders(origin, extraHeaders),
  body: JSON.stringify(payload)
});

const toError = (message, details = {}) => ({
  ok: false,
  error: message,
  ...details
});

const parseBody = (event) => {
  if (!event?.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  if (!raw) return {};
  return JSON.parse(raw);
};

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8');

const signToken = (payload) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', config.jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = createHmac('sha256', config.jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const parseCookies = (event) => {
  const header = event?.headers?.cookie || event?.headers?.Cookie || '';
  return header.split(';').reduce((acc, item) => {
    const [rawKey, ...rawValue] = item.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('=') || '');
    return acc;
  }, {});
};

const buildSessionCookie = (token, maxAgeSeconds) => {
  const sameSite = ['lax', 'strict', 'none'].includes(config.cookieSameSite)
    ? config.cookieSameSite
    : 'lax';
  const parts = [
    `workspace_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
    `Max-Age=${maxAgeSeconds}`
  ];

  if (config.cookieSecure) parts.push('Secure');
  if (config.cookieDomain) parts.push(`Domain=${config.cookieDomain}`);
  return parts.join('; ');
};

const clearSessionCookie = () => buildSessionCookie('', 0);

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

const createAccessPayload = ({ userId, teamId, role, email, displayName, sessionId, teamSlug }) => ({
  sub: userId,
  teamId,
  role,
  email,
  displayName,
  isSuperadmin: isSuperAdminEmail(email),
  teamSlug,
  sessionId,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + config.accessTtlSeconds,
  jti: randomUUID()
});

const requireAuth = async (event) => {
  const cookies = parseCookies(event);
  const token = cookies.workspace_session || '';
  const payload = verifyToken(token);
  if (!payload) return null;
  const session = await storage.getSessionById({
    userId: payload.sub,
    sessionId: payload.sessionId
  });
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }
  return payload;
};

const requireRole = (session, allowedRoles) => {
  if (!session) return false;
  return allowedRoles.includes(session.role);
};

const requireSuperAdmin = (session) => !!session?.isSuperadmin;

const buildPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  status: user.status,
  isSuperadmin: isSuperAdminEmail(user.email)
});

const buildPublicTeam = (team) => ({
  id: team.id,
  slug: team.slug,
  name: team.name
});

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
  createdAt: snapshot.createdAt
});

const toIsoOrNull = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
};

const parseJsonDocument = (value, fallback = {}) => {
  if (value === null || value === undefined || value === '') return cloneJson(fallback);
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return cloneJson(fallback);
    }
  }
  if (typeof value === 'object') {
    return cloneJson(value);
  }
  return cloneJson(fallback);
};

const optionalUtf8 = (value) => (value === null || value === undefined || value === '')
  ? TypedValues.optionalNull(Types.UTF8)
  : TypedValues.utf8(String(value));

const optionalTimestamp = (value) => value
  ? TypedValues.timestamp(new Date(value))
  : TypedValues.optionalNull(Types.TIMESTAMP);

const jsonDocumentValue = (value) => TypedValues.jsonDocument(JSON.stringify(value || {}));

const buildYdbConnectionString = () => {
  if (!config.ydbEndpoint || !config.ydbDatabase) return '';
  if (config.ydbEndpoint.includes('?database=')) return config.ydbEndpoint;
  return `${config.ydbEndpoint}?database=${encodeURIComponent(config.ydbDatabase)}`;
};

let ydbDriverPromise = null;

const getYdbDriver = async () => {
  if (!ydbDriverPromise) {
    ydbDriverPromise = (async () => {
      if (config.ydbAuthToken && !process.env.YDB_ACCESS_TOKEN_CREDENTIALS) {
        process.env.YDB_ACCESS_TOKEN_CREDENTIALS = config.ydbAuthToken;
      }

      const driver = new Driver({
        connectionString: buildYdbConnectionString(),
        authService: getCredentialsFromEnv()
      });

      const ready = await driver.ready(10_000);
      if (!ready) {
        throw new Error('YDB driver is not ready');
      }

      return driver;
    })();
  }

  return ydbDriverPromise;
};

const executeYdbQuery = async (query, params = {}, { idempotent = true } = {}) => {
  const driver = await getYdbDriver();
  return driver.tableClient.withSession(async (session) => {
    const result = await session.executeQuery(
      query,
      params,
      AUTO_TX,
      idempotent ? IDENTITY_QUERY_SETTINGS : new ExecuteQuerySettings().withIdempotent(false)
    );
    return result;
  });
};

const queryRows = async (query, params = {}) => {
  const result = await executeYdbQuery(query, params);
  const resultSet = result?.resultSets?.[0];
  if (!resultSet) return [];
  return TypedData.createNativeObjects(resultSet);
};

const queryRow = async (query, params = {}) => {
  const rows = await queryRows(query, params);
  return rows[0] || null;
};

const normalizeUserRow = (row) => row ? ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  displayName: row.display_name,
  status: row.status,
  createdAt: toIsoOrNull(row.created_at),
  updatedAt: toIsoOrNull(row.updated_at),
  lastLoginAt: toIsoOrNull(row.last_login_at)
}) : null;

const normalizeMembershipRow = (row) => row ? ({
  teamId: row.team_id,
  userId: row.user_id,
  role: row.role,
  status: row.status,
  createdAt: toIsoOrNull(row.created_at),
  updatedAt: toIsoOrNull(row.updated_at)
}) : null;

const normalizeTeamRow = (row) => row ? ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  status: row.status,
  settings: parseJsonDocument(row.settings_json),
  createdAt: toIsoOrNull(row.created_at),
  updatedAt: toIsoOrNull(row.updated_at),
  archivedAt: toIsoOrNull(row.archived_at)
}) : null;

const normalizeProjectRow = (row) => row ? ({
  teamId: row.team_id,
  id: row.id,
  name: row.name,
  status: row.status,
  description: row.description || '',
  state: parseJsonDocument(row.state_json),
  createdBy: row.created_by,
  createdAt: toIsoOrNull(row.created_at),
  updatedAt: toIsoOrNull(row.updated_at),
  archivedAt: toIsoOrNull(row.archived_at)
}) : null;

const normalizeSnapshotRow = (row) => row ? ({
  teamId: row.team_id,
  projectId: row.project_id,
  id: row.id,
  name: row.name,
  kind: row.kind,
  state: parseJsonDocument(row.state_json),
  createdBy: row.created_by,
  createdAt: toIsoOrNull(row.created_at)
}) : null;

const normalizeSessionRow = (row) => row ? ({
  userId: row.user_id,
  sessionId: row.session_id,
  teamId: row.team_id,
  refreshTokenHash: row.refresh_token_hash || null,
  expiresAt: toIsoOrNull(row.expires_at),
  createdAt: toIsoOrNull(row.created_at),
  revokedAt: toIsoOrNull(row.revoked_at)
}) : null;

const normalizeTeamDefaultsRow = (row) => row ? ({
  teamId: row.team_id,
  version: Number(row.version || 1),
  defaults: parseJsonDocument(row.defaults_json),
  mediaSources: parseJsonDocument(row.media_sources_json),
  createdBy: row.created_by,
  createdAt: toIsoOrNull(row.created_at),
  updatedAt: toIsoOrNull(row.updated_at)
}) : null;

const createMemoryStorage = () => {
  const teamId = `team-${config.bootstrapTeamSlug}`;
  const now = toTimestamp();
  const hasBootstrapUser = isValidEmail(config.bootstrapAdminEmail) && !!config.bootstrapAdminPassword;
  const userId = hasBootstrapUser
    ? `user-${config.bootstrapAdminEmail.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'admin'}`
    : '';
  const bootstrapCreatedBy = hasBootstrapUser ? userId : 'system-bootstrap';

  const state = {
    teams: new Map([
      [teamId, {
        id: teamId,
        slug: config.bootstrapTeamSlug,
        name: config.bootstrapTeamName,
        status: 'active',
        settings: {},
        createdAt: now,
        updatedAt: now,
        archivedAt: null
      }]
    ]),
    users: new Map(hasBootstrapUser
      ? [[userId, {
        id: userId,
        email: config.bootstrapAdminEmail,
        passwordHash: hashPassword(config.bootstrapAdminPassword),
        displayName: config.bootstrapAdminName,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null
      }]]
      : []),
    memberships: new Map(hasBootstrapUser
      ? [[`${teamId}:${userId}`, {
        teamId,
        userId,
        role: resolveBootstrapRole(config.bootstrapAdminEmail),
        status: 'active',
        createdAt: now,
        updatedAt: now
      }]]
      : []),
    projects: new Map(),
    snapshots: new Map(),
    teamDefaults: new Map([
      [teamId, {
        teamId,
        version: 1,
        defaults: cloneJson(config.bootstrapDefaultsJson),
        mediaSources: cloneJson(config.bootstrapMediaSourcesJson),
        createdBy: bootstrapCreatedBy,
        createdAt: now,
        updatedAt: now
      }]
    ]),
    sessions: new Map()
  };

  return {
    kind: 'memory',
    async health() {
      return { ready: true, provider: 'memory' };
    },
    async listTeams({ includeArchived = false } = {}) {
      return Array.from(state.teams.values())
        .filter((team) => includeArchived || team.status !== 'archived')
        .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
        .map((team) => cloneJson(team));
    },
    async listPublicTeams() {
      return Array.from(state.teams.values())
        .filter((team) => PUBLIC_TEAM_STATUSES.has(team.status))
        .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
        .map((team) => cloneJson(team));
    },
    async getTeamById({ teamId }) {
      const team = state.teams.get(teamId);
      return team ? cloneJson(team) : null;
    },
    async getTeamBySlug({ teamSlug }) {
      const team = Array.from(state.teams.values())
        .find((item) => item.slug === teamSlug && PUBLIC_TEAM_STATUSES.has(item.status));
      return team ? cloneJson(team) : null;
    },
    async createTeam({ slug, name }) {
      const nowValue = toTimestamp();
      const team = {
        id: `team-${randomUUID()}`,
        slug,
        name,
        status: 'active',
        settings: {},
        createdAt: nowValue,
        updatedAt: nowValue,
        archivedAt: null
      };
      state.teams.set(team.id, team);
      return cloneJson(team);
    },
    async updateTeam({ teamId, slug, name }) {
      const team = state.teams.get(teamId);
      if (!team) return null;
      if (slug) team.slug = slug;
      if (name) team.name = name;
      team.updatedAt = toTimestamp();
      return cloneJson(team);
    },
    async archiveTeam({ teamId }) {
      const team = state.teams.get(teamId);
      if (!team) return null;
      const nowValue = toTimestamp();
      team.status = 'archived';
      team.archivedAt = nowValue;
      team.updatedAt = nowValue;
      return cloneJson(team);
    },
    async getUserByEmail({ email }) {
      const user = Array.from(state.users.values()).find((item) => item.email === email);
      return user ? cloneJson(user) : null;
    },
    async getUserById({ userId }) {
      const user = state.users.get(userId);
      return user ? cloneJson(user) : null;
    },
    async findLoginContext({ email, teamSlug }) {
      const user = Array.from(state.users.values()).find((item) => item.email === email && item.status === 'active');
      if (!user) return null;

      const memberships = Array.from(state.memberships.values())
        .filter((item) => item.userId === user.id && item.status === 'active');

      const team = memberships
        .map((membership) => ({
          membership,
          team: state.teams.get(membership.teamId)
        }))
        .find(({ team }) => team && team.status === 'active' && (!teamSlug || team.slug === teamSlug));

      if (!team) return null;

      return {
        user: cloneJson(user),
        team: cloneJson(team.team),
        membership: cloneJson(team.membership)
      };
    },
    async createUser({ email, password, displayName }) {
      const userId = `user-${randomUUID()}`;
      const nowValue = toTimestamp();
      const user = {
        id: userId,
        email,
        passwordHash: hashPassword(password),
        displayName,
        status: 'active',
        createdAt: nowValue,
        updatedAt: nowValue,
        lastLoginAt: null
      };
      state.users.set(userId, user);
      return cloneJson(user);
    },
    async createMembership({ teamId, userId, role }) {
      const nowValue = toTimestamp();
      const membership = {
        teamId,
        userId,
        role,
        status: 'active',
        createdAt: nowValue,
        updatedAt: nowValue
      };
      state.memberships.set(`${teamId}:${userId}`, membership);
      return cloneJson(membership);
    },
    async updateMembershipRole({ teamId, userId, role }) {
      const membership = state.memberships.get(`${teamId}:${userId}`);
      if (!membership || membership.status !== 'active') return null;

      membership.role = role;
      membership.updatedAt = toTimestamp();
      return cloneJson(membership);
    },
    async listTeamMembers({ teamId, includeInactive = false }) {
      return Array.from(state.memberships.values())
        .filter((membership) => membership.teamId === teamId && (includeInactive || membership.status === 'active'))
        .map((membership) => ({
          membership: cloneJson(membership),
          user: cloneJson(state.users.get(membership.userId))
        }))
        .filter(({ user, membership }) => user && (includeInactive || (user.status === 'active' && membership.status === 'active')))
        .sort((left, right) => left.user.email.localeCompare(right.user.email));
    },
    async updateUserPassword({ userId, passwordHash }) {
      const user = state.users.get(userId);
      if (!user) return null;
      user.passwordHash = passwordHash;
      user.updatedAt = toTimestamp();
      return cloneJson(user);
    },
    async revokeSessions({ userId, teamId = '' } = {}) {
      const nowValue = toTimestamp();
      Array.from(state.sessions.values()).forEach((session) => {
        if (session.userId !== userId) return;
        if (teamId && session.teamId !== teamId) return;
        session.revokedAt = nowValue;
      });
    },
    async removeUserFromTeam({ teamId, userId }) {
      const membership = state.memberships.get(`${teamId}:${userId}`);
      if (!membership) return null;

      const nowValue = toTimestamp();
      membership.status = 'archived';
      membership.updatedAt = nowValue;

      const user = state.users.get(userId);
      const hasActiveMemberships = Array.from(state.memberships.values())
        .some((item) => item.userId === userId && item.status === 'active');

      if (user && !hasActiveMemberships) {
        user.status = 'inactive';
        user.updatedAt = nowValue;
      }

      await this.revokeSessions({ userId, teamId });
      return {
        user: user ? cloneJson(user) : null,
        membership: cloneJson(membership)
      };
    },
    async updateUserLastLogin({ userId }) {
      const user = state.users.get(userId);
      if (!user) return;
      user.lastLoginAt = toTimestamp();
      user.updatedAt = user.lastLoginAt;
    },
    async createSession({ userId, teamId }) {
      const sessionId = randomUUID();
      const nowValue = toTimestamp();
      const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000).toISOString();
      const session = {
        userId,
        sessionId,
        teamId,
        refreshTokenHash: null,
        createdAt: nowValue,
        expiresAt,
        revokedAt: null
      };
      state.sessions.set(`${userId}:${sessionId}`, session);
      return cloneJson(session);
    },
    async getSessionById({ userId, sessionId }) {
      const session = state.sessions.get(`${userId}:${sessionId}`);
      return session ? cloneJson(session) : null;
    },
    async revokeSession({ userId, sessionId }) {
      const session = state.sessions.get(`${userId}:${sessionId}`);
      if (!session) return;
      session.revokedAt = toTimestamp();
    },
    async getCurrentTeam({ teamId }) {
      const team = state.teams.get(teamId);
      if (!team) return null;
      const defaults = state.teamDefaults.get(teamId) || null;
      return {
        team: cloneJson(team),
        defaults: defaults ? cloneJson(defaults) : null
      };
    },
    async listProjects({ teamId, includeArchived }) {
      return Array.from(state.projects.values())
        .filter((project) => project.teamId === teamId && (includeArchived || project.status !== 'archived'))
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .map((project) => cloneJson(project));
    },
    async createProject({ teamId, createdBy, name, description, state: projectState }) {
      const timestamp = toTimestamp();
      const project = {
        id: randomUUID(),
        teamId,
        name,
        description,
        status: 'active',
        state: cloneJson(projectState || {}),
        createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
        archivedAt: null
      };
      state.projects.set(`${teamId}:${project.id}`, project);
      return cloneJson(project);
    },
    async getProject({ teamId, projectId }) {
      const project = state.projects.get(`${teamId}:${projectId}`);
      return project ? cloneJson(project) : null;
    },
    async updateProject({ teamId, projectId, name, description, state: projectState }) {
      const project = state.projects.get(`${teamId}:${projectId}`);
      if (!project) return null;
      if (typeof name === 'string' && name) project.name = name;
      if (typeof description === 'string') project.description = description;
      if (projectState) project.state = cloneJson(projectState);
      project.updatedAt = toTimestamp();
      return cloneJson(project);
    },
    async archiveProject({ teamId, projectId }) {
      const project = state.projects.get(`${teamId}:${projectId}`);
      if (!project) return null;
      project.status = 'archived';
      project.archivedAt = toTimestamp();
      project.updatedAt = project.archivedAt;
      return cloneJson(project);
    },
    async listSnapshots({ teamId, projectId, kind }) {
      return Array.from(state.snapshots.values())
        .filter((snapshot) => snapshot.teamId === teamId && snapshot.projectId === projectId && (!kind || snapshot.kind === kind))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .map((snapshot) => cloneJson(snapshot));
    },
    async createSnapshot({ teamId, projectId, createdBy, name, kind, state: snapshotState }) {
      const timestamp = toTimestamp();
      const snapshot = {
        id: randomUUID(),
        teamId,
        projectId,
        name,
        kind,
        state: cloneJson(snapshotState),
        createdBy,
        createdAt: timestamp
      };
      state.snapshots.set(`${teamId}:${projectId}:${snapshot.id}`, snapshot);

      const project = state.projects.get(`${teamId}:${projectId}`);
      if (project && kind === 'snapshot') {
        project.state = cloneJson(snapshotState);
        project.updatedAt = timestamp;
      }

      return cloneJson(snapshot);
    },
    async getTeamDefaults({ teamId }) {
      const defaults = state.teamDefaults.get(teamId);
      return defaults ? cloneJson(defaults) : null;
    },
    async saveTeamDefaults({ teamId, createdBy, defaults, mediaSources }) {
      const existing = state.teamDefaults.get(teamId);
      const timestamp = toTimestamp();
      const next = {
        teamId,
        version: existing ? existing.version + 1 : 1,
        defaults: cloneJson(defaults || {}),
        mediaSources: cloneJson(mediaSources || {}),
        createdBy,
        createdAt: existing ? existing.createdAt : timestamp,
        updatedAt: timestamp
      };
      state.teamDefaults.set(teamId, next);
      return cloneJson(next);
    }
  };
};

const createYdbStorage = () => ({
  kind: 'ydb',
  async health() {
    if (!config.ydbEndpoint || !config.ydbDatabase) {
      return { ready: false, provider: 'ydb' };
    }

    try {
      await getYdbDriver();
      return { ready: true, provider: 'ydb' };
    } catch (error) {
      return {
        ready: false,
        provider: 'ydb',
        error: error?.message || String(error)
      };
    }
  },
  async listTeams({ includeArchived = false } = {}) {
    const rows = await queryRows(`
      DECLARE $include_archived AS Bool;

      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE ($include_archived OR status <> "archived")
      ORDER BY name ASC;
    `, {
      $include_archived: TypedValues.bool(includeArchived)
    });

    return rows.map(normalizeTeamRow);
  },
  async listPublicTeams() {
    const rows = await queryRows(`
      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE status = "active"
      ORDER BY name ASC;
    `);

    return rows.map(normalizeTeamRow);
  },
  async getTeamById({ teamId }) {
    return normalizeTeamRow(await queryRow(`
      DECLARE $team_id AS Utf8;

      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE id = $team_id
      LIMIT 1;
    `, {
      $team_id: TypedValues.utf8(teamId)
    }));
  },
  async getTeamBySlug({ teamSlug }) {
    return normalizeTeamRow(await queryRow(`
      DECLARE $team_slug AS Utf8;

      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE slug = $team_slug
        AND status = "active"
      LIMIT 1;
    `, {
      $team_slug: TypedValues.utf8(teamSlug)
    }));
  },
  async createTeam({ slug, name }) {
    const team = {
      id: `team-${randomUUID()}`,
      slug,
      name,
      status: 'active',
      settings: {},
      createdAt: toTimestamp(),
      updatedAt: toTimestamp(),
      archivedAt: null
    };

    await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $slug AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $settings_json AS JsonDocument;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO teams (
        id, slug, name, status, settings_json, created_at, updated_at, archived_at
      ) VALUES (
        $id, $slug, $name, $status, $settings_json, $created_at, $updated_at, $archived_at
      );
    `, {
      $id: TypedValues.utf8(team.id),
      $slug: TypedValues.utf8(team.slug),
      $name: TypedValues.utf8(team.name),
      $status: TypedValues.utf8(team.status),
      $settings_json: jsonDocumentValue(team.settings),
      $created_at: TypedValues.timestamp(new Date(team.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(team.updatedAt)),
      $archived_at: TypedValues.optionalNull(Types.TIMESTAMP)
    }, {
      idempotent: false
    });

    return team;
  },
  async updateTeam({ teamId, slug, name }) {
    const current = await this.getTeamById({ teamId });
    if (!current) return null;

    const updated = {
      ...current,
      slug: slug || current.slug,
      name: name || current.name,
      updatedAt: toTimestamp()
    };

    await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $slug AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $settings_json AS JsonDocument;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO teams (
        id, slug, name, status, settings_json, created_at, updated_at, archived_at
      ) VALUES (
        $id, $slug, $name, $status, $settings_json, $created_at, $updated_at, $archived_at
      );
    `, {
      $id: TypedValues.utf8(updated.id),
      $slug: TypedValues.utf8(updated.slug),
      $name: TypedValues.utf8(updated.name),
      $status: TypedValues.utf8(updated.status),
      $settings_json: jsonDocumentValue(updated.settings || {}),
      $created_at: TypedValues.timestamp(new Date(updated.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(updated.updatedAt)),
      $archived_at: optionalTimestamp(updated.archivedAt)
    }, {
      idempotent: false
    });

    return updated;
  },
  async archiveTeam({ teamId }) {
    const current = await this.getTeamById({ teamId });
    if (!current) return null;

    const archived = {
      ...current,
      status: 'archived',
      archivedAt: toTimestamp(),
      updatedAt: toTimestamp()
    };

    await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $slug AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $settings_json AS JsonDocument;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO teams (
        id, slug, name, status, settings_json, created_at, updated_at, archived_at
      ) VALUES (
        $id, $slug, $name, $status, $settings_json, $created_at, $updated_at, $archived_at
      );
    `, {
      $id: TypedValues.utf8(archived.id),
      $slug: TypedValues.utf8(archived.slug),
      $name: TypedValues.utf8(archived.name),
      $status: TypedValues.utf8(archived.status),
      $settings_json: jsonDocumentValue(archived.settings || {}),
      $created_at: TypedValues.timestamp(new Date(archived.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(archived.updatedAt)),
      $archived_at: optionalTimestamp(archived.archivedAt)
    }, {
      idempotent: false
    });

    return archived;
  },
  async getUserByEmail({ email }) {
    return normalizeUserRow(await queryRow(`
      DECLARE $email AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE email = $email
      LIMIT 1;
    `, {
      $email: TypedValues.utf8(email)
    }));
  },
  async getUserById({ userId }) {
    return normalizeUserRow(await queryRow(`
      DECLARE $user_id AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $user_id
      LIMIT 1;
    `, {
      $user_id: TypedValues.utf8(userId)
    }));
  },
  async findLoginContext({ email, teamSlug }) {
    const user = normalizeUserRow(await queryRow(`
      DECLARE $email AS Utf8;
      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE email = $email
      LIMIT 1;
    `, {
      $email: TypedValues.utf8(email)
    }));

    if (!user || user.status !== 'active') {
      return null;
    }

    const membershipRow = await queryRow(`
      DECLARE $user_id AS Utf8;
      DECLARE $team_slug AS Utf8;

      SELECT
        m.team_id AS team_id,
        m.user_id AS user_id,
        m.role AS role,
        m.status AS status,
        m.created_at AS created_at,
        m.updated_at AS updated_at,
        t.id AS id,
        t.slug AS slug,
        t.name AS name,
        t.status AS team_status,
        t.settings_json AS settings_json,
        t.created_at AS team_created_at,
        t.updated_at AS team_updated_at,
        t.archived_at AS team_archived_at
      FROM memberships AS m
      INNER JOIN teams AS t ON t.id = m.team_id
      WHERE m.user_id = $user_id
        AND m.status = "active"
        AND t.status = "active"
        AND ($team_slug = "" OR t.slug = $team_slug)
      LIMIT 1;
    `, {
      $user_id: TypedValues.utf8(user.id),
      $team_slug: TypedValues.utf8(teamSlug || '')
    });

    if (!membershipRow) {
      return null;
    }

    return {
      user,
      membership: normalizeMembershipRow(membershipRow),
      team: {
        id: membershipRow.id,
        slug: membershipRow.slug,
        name: membershipRow.name,
        status: membershipRow.team_status,
        settings: parseJsonDocument(membershipRow.settings_json),
        createdAt: toIsoOrNull(membershipRow.team_created_at),
        updatedAt: toIsoOrNull(membershipRow.team_updated_at),
        archivedAt: toIsoOrNull(membershipRow.team_archived_at)
      }
    };
  },
  async createUser({ email, password, displayName }) {
    const id = `user-${randomUUID()}`;
    const createdAt = toTimestamp();
    const user = {
      id,
      email,
      passwordHash: hashPassword(password),
      displayName,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
      lastLoginAt: null
    };

    await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $password_hash AS Utf8;
      DECLARE $display_name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $last_login_at AS Timestamp?;

      UPSERT INTO users (
        id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      ) VALUES (
        $id, $email, $password_hash, $display_name, $status, $created_at, $updated_at, $last_login_at
      );
    `, {
      $id: TypedValues.utf8(user.id),
      $email: TypedValues.utf8(user.email),
      $password_hash: TypedValues.utf8(user.passwordHash),
      $display_name: TypedValues.utf8(user.displayName),
      $status: TypedValues.utf8(user.status),
      $created_at: TypedValues.timestamp(new Date(user.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(user.updatedAt)),
      $last_login_at: TypedValues.optionalNull(Types.TIMESTAMP)
    }, {
      idempotent: false
    });

    return user;
  },
  async createMembership({ teamId, userId, role }) {
    const createdAt = toTimestamp();
    const membership = {
      teamId,
      userId,
      role,
      status: 'active',
      createdAt,
      updatedAt: createdAt
    };

    await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;
      DECLARE $role AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO memberships (
        team_id, user_id, role, status, created_at, updated_at
      ) VALUES (
        $team_id, $user_id, $role, $status, $created_at, $updated_at
      );
    `, {
      $team_id: TypedValues.utf8(membership.teamId),
      $user_id: TypedValues.utf8(membership.userId),
      $role: TypedValues.utf8(membership.role),
      $status: TypedValues.utf8(membership.status),
      $created_at: TypedValues.timestamp(new Date(membership.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(membership.updatedAt))
    }, {
      idempotent: false
    });

    return membership;
  },
  async updateMembershipRole({ teamId, userId, role }) {
    const membership = normalizeMembershipRow(await queryRow(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;

      SELECT team_id, user_id, role, status, created_at, updated_at
      FROM memberships
      WHERE team_id = $team_id
        AND user_id = $user_id
      LIMIT 1;
    `, {
      $team_id: TypedValues.utf8(teamId),
      $user_id: TypedValues.utf8(userId)
    }));

    if (!membership || membership.status !== 'active') return null;

    const updatedMembership = {
      ...membership,
      role,
      updatedAt: toTimestamp()
    };

    await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;
      DECLARE $role AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO memberships (
        team_id, user_id, role, status, created_at, updated_at
      ) VALUES (
        $team_id, $user_id, $role, $status, $created_at, $updated_at
      );
    `, {
      $team_id: TypedValues.utf8(updatedMembership.teamId),
      $user_id: TypedValues.utf8(updatedMembership.userId),
      $role: TypedValues.utf8(updatedMembership.role),
      $status: TypedValues.utf8(updatedMembership.status),
      $created_at: TypedValues.timestamp(new Date(updatedMembership.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(updatedMembership.updatedAt))
    }, {
      idempotent: false
    });

    return updatedMembership;
  },
  async listTeamMembers({ teamId, includeInactive = false }) {
    const rows = await queryRows(`
      DECLARE $team_id AS Utf8;
      DECLARE $include_inactive AS Bool;

      SELECT
        u.id AS id,
        u.email AS email,
        u.password_hash AS password_hash,
        u.display_name AS display_name,
        u.status AS user_status,
        u.created_at AS user_created_at,
        u.updated_at AS user_updated_at,
        u.last_login_at AS last_login_at,
        m.team_id AS team_id,
        m.user_id AS user_id,
        m.role AS role,
        m.status AS membership_status,
        m.created_at AS membership_created_at,
        m.updated_at AS membership_updated_at
      FROM memberships AS m
      INNER JOIN users AS u ON u.id = m.user_id
      WHERE m.team_id = $team_id
        AND (
          $include_inactive
          OR (m.status = "active" AND u.status = "active")
        )
      ORDER BY u.email ASC;
    `, {
      $team_id: TypedValues.utf8(teamId),
      $include_inactive: TypedValues.bool(includeInactive)
    });

    return rows.map((row) => ({
      user: normalizeUserRow({
        id: row.id,
        email: row.email,
        password_hash: row.password_hash,
        display_name: row.display_name,
        status: row.user_status,
        created_at: row.user_created_at,
        updated_at: row.user_updated_at,
        last_login_at: row.last_login_at
      }),
      membership: normalizeMembershipRow({
        team_id: row.team_id,
        user_id: row.user_id,
        role: row.role,
        status: row.membership_status,
        created_at: row.membership_created_at,
        updated_at: row.membership_updated_at
      })
    }));
  },
  async updateUserPassword({ userId, passwordHash }) {
    const current = await queryRow(`
      DECLARE $user_id AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $user_id
      LIMIT 1;
    `, {
      $user_id: TypedValues.utf8(userId)
    });

    const user = normalizeUserRow(current);
    if (!user) return null;

    const updated = {
      ...user,
      passwordHash,
      updatedAt: toTimestamp()
    };

    await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $password_hash AS Utf8;
      DECLARE $display_name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $last_login_at AS Timestamp?;

      UPSERT INTO users (
        id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      ) VALUES (
        $id, $email, $password_hash, $display_name, $status, $created_at, $updated_at, $last_login_at
      );
    `, {
      $id: TypedValues.utf8(updated.id),
      $email: TypedValues.utf8(updated.email),
      $password_hash: TypedValues.utf8(updated.passwordHash),
      $display_name: TypedValues.utf8(updated.displayName),
      $status: TypedValues.utf8(updated.status),
      $created_at: TypedValues.timestamp(new Date(updated.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(updated.updatedAt)),
      $last_login_at: optionalTimestamp(updated.lastLoginAt)
    }, {
      idempotent: false
    });

    return updated;
  },
  async revokeSessions({ userId, teamId = '' } = {}) {
    const revokedAt = toTimestamp();

    await executeYdbQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $team_id AS Utf8;
      DECLARE $revoked_at AS Timestamp;

      UPDATE sessions
      SET revoked_at = $revoked_at
      WHERE user_id = $user_id
        AND ($team_id = "" OR team_id = $team_id);
    `, {
      $user_id: TypedValues.utf8(userId),
      $team_id: TypedValues.utf8(teamId),
      $revoked_at: TypedValues.timestamp(new Date(revokedAt))
    }, {
      idempotent: false
    });
  },
  async removeUserFromTeam({ teamId, userId }) {
    const membership = normalizeMembershipRow(await queryRow(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;

      SELECT team_id, user_id, role, status, created_at, updated_at
      FROM memberships
      WHERE team_id = $team_id
        AND user_id = $user_id
      LIMIT 1;
    `, {
      $team_id: TypedValues.utf8(teamId),
      $user_id: TypedValues.utf8(userId)
    }));

    if (!membership) return null;

    const updatedMembership = {
      ...membership,
      status: 'archived',
      updatedAt: toTimestamp()
    };

    await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;
      DECLARE $role AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO memberships (
        team_id, user_id, role, status, created_at, updated_at
      ) VALUES (
        $team_id, $user_id, $role, $status, $created_at, $updated_at
      );
    `, {
      $team_id: TypedValues.utf8(updatedMembership.teamId),
      $user_id: TypedValues.utf8(updatedMembership.userId),
      $role: TypedValues.utf8(updatedMembership.role),
      $status: TypedValues.utf8(updatedMembership.status),
      $created_at: TypedValues.timestamp(new Date(updatedMembership.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(updatedMembership.updatedAt))
    }, {
      idempotent: false
    });

    const activeMemberships = await queryRows(`
      DECLARE $user_id AS Utf8;

      SELECT team_id
      FROM memberships
      WHERE user_id = $user_id
        AND status = "active";
    `, {
      $user_id: TypedValues.utf8(userId)
    });

    let user = normalizeUserRow(await queryRow(`
      DECLARE $user_id AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $user_id
      LIMIT 1;
    `, {
      $user_id: TypedValues.utf8(userId)
    }));

    if (user && !activeMemberships.length) {
      user = {
        ...user,
        status: 'inactive',
        updatedAt: toTimestamp()
      };

      await executeYdbQuery(`
        DECLARE $id AS Utf8;
        DECLARE $email AS Utf8;
        DECLARE $password_hash AS Utf8;
        DECLARE $display_name AS Utf8;
        DECLARE $status AS Utf8;
        DECLARE $created_at AS Timestamp;
        DECLARE $updated_at AS Timestamp;
        DECLARE $last_login_at AS Timestamp?;

        UPSERT INTO users (
          id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
        ) VALUES (
          $id, $email, $password_hash, $display_name, $status, $created_at, $updated_at, $last_login_at
        );
      `, {
        $id: TypedValues.utf8(user.id),
        $email: TypedValues.utf8(user.email),
        $password_hash: TypedValues.utf8(user.passwordHash),
        $display_name: TypedValues.utf8(user.displayName),
        $status: TypedValues.utf8(user.status),
        $created_at: TypedValues.timestamp(new Date(user.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(user.updatedAt)),
        $last_login_at: optionalTimestamp(user.lastLoginAt)
      }, {
        idempotent: false
      });
    }

    await this.revokeSessions({ userId, teamId });
    return {
      user,
      membership: updatedMembership
    };
  },
  async updateUserLastLogin({ userId }) {
    const timestamp = toTimestamp();
    await executeYdbQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $updated_at AS Timestamp;

      UPDATE users
      SET last_login_at = $updated_at,
          updated_at = $updated_at
      WHERE id = $user_id;
    `, {
      $user_id: TypedValues.utf8(userId),
      $updated_at: TypedValues.timestamp(new Date(timestamp))
    }, {
      idempotent: false
    });
  },
  async createSession({ userId, teamId }) {
    const sessionId = randomUUID();
    const createdAt = toTimestamp();
    const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000).toISOString();

    await executeYdbQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $session_id AS Utf8;
      DECLARE $team_id AS Utf8;
      DECLARE $refresh_token_hash AS Utf8?;
      DECLARE $expires_at AS Timestamp;
      DECLARE $created_at AS Timestamp;
      DECLARE $revoked_at AS Timestamp?;

      UPSERT INTO sessions (
        user_id,
        session_id,
        team_id,
        refresh_token_hash,
        expires_at,
        created_at,
        revoked_at
      ) VALUES (
        $user_id,
        $session_id,
        $team_id,
        $refresh_token_hash,
        $expires_at,
        $created_at,
        $revoked_at
      );
    `, {
      $user_id: TypedValues.utf8(userId),
      $session_id: TypedValues.utf8(sessionId),
      $team_id: TypedValues.utf8(teamId),
      $refresh_token_hash: TypedValues.optionalNull(Types.UTF8),
      $expires_at: TypedValues.timestamp(new Date(expiresAt)),
      $created_at: TypedValues.timestamp(new Date(createdAt)),
      $revoked_at: TypedValues.optionalNull(Types.TIMESTAMP)
    }, {
      idempotent: false
    });

    return {
      userId,
      sessionId,
      teamId,
      refreshTokenHash: null,
      expiresAt,
      createdAt,
      revokedAt: null
    };
  },
  async getSessionById({ userId, sessionId }) {
    return normalizeSessionRow(await queryRow(`
      DECLARE $user_id AS Utf8;
      DECLARE $session_id AS Utf8;

      SELECT user_id, session_id, team_id, refresh_token_hash, expires_at, created_at, revoked_at
      FROM sessions
      WHERE user_id = $user_id
        AND session_id = $session_id
      LIMIT 1;
    `, {
      $user_id: TypedValues.utf8(userId),
      $session_id: TypedValues.utf8(sessionId)
    }));
  },
  async revokeSession({ userId, sessionId }) {
    const revokedAt = toTimestamp();
    await executeYdbQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $session_id AS Utf8;
      DECLARE $revoked_at AS Timestamp;

      UPDATE sessions
      SET revoked_at = $revoked_at
      WHERE user_id = $user_id
        AND session_id = $session_id;
    `, {
      $user_id: TypedValues.utf8(userId),
      $session_id: TypedValues.utf8(sessionId),
      $revoked_at: TypedValues.timestamp(new Date(revokedAt))
    }, {
      idempotent: false
    });
  },
  async getCurrentTeam({ teamId }) {
    const team = normalizeTeamRow(await queryRow(`
      DECLARE $team_id AS Utf8;

      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE id = $team_id
      LIMIT 1;
    `, {
      $team_id: TypedValues.utf8(teamId)
    }));

    if (!team) return null;

    const defaults = await this.getTeamDefaults({ teamId });
    return { team, defaults };
  },
  async listProjects({ teamId, includeArchived }) {
    const rows = await queryRows(`
      DECLARE $team_id AS Utf8;
      DECLARE $include_archived AS Bool;

      SELECT team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      FROM projects
      WHERE team_id = $team_id
        AND ($include_archived OR status <> "archived")
      ORDER BY updated_at DESC;
    `, {
      $team_id: TypedValues.utf8(teamId),
      $include_archived: TypedValues.bool(includeArchived)
    });

    return rows.map(normalizeProjectRow);
  },
  async createProject({ teamId, createdBy, name, description, state: projectState }) {
    const id = randomUUID();
    const createdAt = toTimestamp();
    await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $description AS Utf8;
      DECLARE $state_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO projects (
        team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      ) VALUES (
        $team_id, $id, $name, $status, $description, $state_json, $created_by, $created_at, $updated_at, $archived_at
      );
    `, {
      $team_id: TypedValues.utf8(teamId),
      $id: TypedValues.utf8(id),
      $name: TypedValues.utf8(name),
      $status: TypedValues.utf8('active'),
      $description: TypedValues.utf8(description || ''),
      $state_json: jsonDocumentValue(projectState || {}),
      $created_by: TypedValues.utf8(createdBy),
      $created_at: TypedValues.timestamp(new Date(createdAt)),
      $updated_at: TypedValues.timestamp(new Date(createdAt)),
      $archived_at: TypedValues.optionalNull(Types.TIMESTAMP)
    }, {
      idempotent: false
    });

    return {
      teamId,
      id,
      name,
      status: 'active',
      description: description || '',
      state: cloneJson(projectState || {}),
      createdBy,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null
    };
  },
  async getProject({ teamId, projectId }) {
    return normalizeProjectRow(await queryRow(`
      DECLARE $team_id AS Utf8;
      DECLARE $project_id AS Utf8;

      SELECT team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      FROM projects
      WHERE team_id = $team_id
        AND id = $project_id
      LIMIT 1;
    `, {
      $team_id: TypedValues.utf8(teamId),
      $project_id: TypedValues.utf8(projectId)
    }));
  },
  async updateProject({ teamId, projectId, name, description, state: projectState }) {
    const current = await this.getProject({ teamId, projectId });
    if (!current) return null;

    const updated = {
      ...current,
      name: typeof name === 'string' && name ? name : current.name,
      description: typeof description === 'string' ? description : current.description,
      state: projectState ? cloneJson(projectState) : cloneJson(current.state),
      updatedAt: toTimestamp()
    };

    await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $description AS Utf8;
      DECLARE $state_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO projects (
        team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      ) VALUES (
        $team_id, $id, $name, $status, $description, $state_json, $created_by, $created_at, $updated_at, $archived_at
      );
    `, {
      $team_id: TypedValues.utf8(updated.teamId),
      $id: TypedValues.utf8(updated.id),
      $name: TypedValues.utf8(updated.name),
      $status: TypedValues.utf8(updated.status),
      $description: TypedValues.utf8(updated.description || ''),
      $state_json: jsonDocumentValue(updated.state),
      $created_by: TypedValues.utf8(updated.createdBy),
      $created_at: TypedValues.timestamp(new Date(updated.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(updated.updatedAt)),
      $archived_at: optionalTimestamp(updated.archivedAt)
    }, {
      idempotent: false
    });

    return updated;
  },
  async archiveProject({ teamId, projectId }) {
    const current = await this.getProject({ teamId, projectId });
    if (!current) return null;

    const archived = {
      ...current,
      status: 'archived',
      archivedAt: toTimestamp(),
      updatedAt: toTimestamp()
    };

    await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $description AS Utf8;
      DECLARE $state_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO projects (
        team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      ) VALUES (
        $team_id, $id, $name, $status, $description, $state_json, $created_by, $created_at, $updated_at, $archived_at
      );
    `, {
      $team_id: TypedValues.utf8(archived.teamId),
      $id: TypedValues.utf8(archived.id),
      $name: TypedValues.utf8(archived.name),
      $status: TypedValues.utf8(archived.status),
      $description: TypedValues.utf8(archived.description || ''),
      $state_json: jsonDocumentValue(archived.state),
      $created_by: TypedValues.utf8(archived.createdBy),
      $created_at: TypedValues.timestamp(new Date(archived.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(archived.updatedAt)),
      $archived_at: optionalTimestamp(archived.archivedAt)
    }, {
      idempotent: false
    });

    return archived;
  },
  async listSnapshots({ teamId, projectId, kind }) {
    const rows = await queryRows(`
      DECLARE $team_id AS Utf8;
      DECLARE $project_id AS Utf8;
      DECLARE $kind AS Utf8;

      SELECT team_id, project_id, id, name, kind, state_json, created_by, created_at
      FROM project_snapshots
      WHERE team_id = $team_id
        AND project_id = $project_id
        AND ($kind = "" OR kind = $kind)
      ORDER BY created_at DESC;
    `, {
      $team_id: TypedValues.utf8(teamId),
      $project_id: TypedValues.utf8(projectId),
      $kind: TypedValues.utf8(kind || '')
    });

    return rows.map(normalizeSnapshotRow);
  },
  async createSnapshot({ teamId, projectId, createdBy, name, kind, state: snapshotState }) {
    const id = randomUUID();
    const createdAt = toTimestamp();

    await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $project_id AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $kind AS Utf8;
      DECLARE $state_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;

      UPSERT INTO project_snapshots (
        team_id, project_id, id, name, kind, state_json, created_by, created_at
      ) VALUES (
        $team_id, $project_id, $id, $name, $kind, $state_json, $created_by, $created_at
      );
    `, {
      $team_id: TypedValues.utf8(teamId),
      $project_id: TypedValues.utf8(projectId),
      $id: TypedValues.utf8(id),
      $name: TypedValues.utf8(name),
      $kind: TypedValues.utf8(kind),
      $state_json: jsonDocumentValue(snapshotState),
      $created_by: TypedValues.utf8(createdBy),
      $created_at: TypedValues.timestamp(new Date(createdAt))
    }, {
      idempotent: false
    });

    if (kind === 'snapshot') {
      await this.updateProject({
        teamId,
        projectId,
        state: snapshotState
      });
    }

    return {
      teamId,
      projectId,
      id,
      name,
      kind,
      state: cloneJson(snapshotState),
      createdBy,
      createdAt
    };
  },
  async getTeamDefaults({ teamId }) {
    return normalizeTeamDefaultsRow(await queryRow(`
      DECLARE $team_id AS Utf8;

      SELECT team_id, version, defaults_json, media_sources_json, created_by, created_at, updated_at
      FROM team_defaults
      WHERE team_id = $team_id
      ORDER BY version DESC
      LIMIT 1;
    `, {
      $team_id: TypedValues.utf8(teamId)
    }));
  },
  async saveTeamDefaults({ teamId, createdBy, defaults, mediaSources }) {
    const current = await this.getTeamDefaults({ teamId });
    const now = toTimestamp();
    const next = {
      teamId,
      version: current ? current.version + 1 : 1,
      defaults: cloneJson(defaults || {}),
      mediaSources: cloneJson(mediaSources || {}),
      createdBy,
      createdAt: current?.createdAt || now,
      updatedAt: now
    };

    await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $version AS Uint64;
      DECLARE $defaults_json AS JsonDocument;
      DECLARE $media_sources_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO team_defaults (
        team_id, version, defaults_json, media_sources_json, created_by, created_at, updated_at
      ) VALUES (
        $team_id, $version, $defaults_json, $media_sources_json, $created_by, $created_at, $updated_at
      );
    `, {
      $team_id: TypedValues.utf8(teamId),
      $version: TypedValues.uint64(next.version),
      $defaults_json: jsonDocumentValue(next.defaults),
      $media_sources_json: jsonDocumentValue(next.mediaSources),
      $created_by: TypedValues.utf8(createdBy),
      $created_at: TypedValues.timestamp(new Date(next.createdAt)),
      $updated_at: TypedValues.timestamp(new Date(next.updatedAt))
    }, {
      idempotent: false
    });

    return next;
  }
});

const storage = config.storage === 'ydb' ? createYdbStorage() : createMemoryStorage();

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

const createAuthSuccessResponse = async ({ user, team, membership, origin }) => {
  const session = await storage.createSession({
    userId: user.id,
    teamId: team.id
  });
  await storage.updateUserLastLogin({ userId: user.id });

  const accessPayload = createAccessPayload({
    userId: user.id,
    teamId: team.id,
    role: membership.role,
    email: user.email,
    displayName: user.displayName,
    teamSlug: team.slug,
    sessionId: session.sessionId
  });

  const token = signToken(accessPayload);
  return json(200, {
    ok: true,
    user: buildPublicUser(user),
    team: buildPublicTeam(team),
    membership: {
      role: membership.role,
      status: membership.status
    }
  }, origin, {
    'Set-Cookie': buildSessionCookie(token, config.sessionTtlSeconds)
  });
};

const handlePublicTeams = async (origin) => withStorageErrors(origin, async () => {
  const teams = await storage.listPublicTeams();
  return json(200, {
    ok: true,
    teams: teams.map(buildPublicTeam)
  }, origin);
});

const handleAdminListTeams = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const teams = await storage.listTeams({ includeArchived: true });
  return json(200, {
    ok: true,
    teams: teams.map(buildAdminTeam)
  }, origin);
});

const handleAdminCreateTeam = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const name = sanitizeText(body.name, 120);
  const slug = sanitizeTeamSlug(body.slug || name);

  if (!name || !slug) {
    return json(400, toError('name and slug are required'), origin);
  }

  const teams = await storage.listTeams({ includeArchived: true });
  if (teams.some((team) => team.slug === slug)) {
    return json(409, toError('Team slug already exists', { slug }), origin);
  }

  const team = await storage.createTeam({ slug, name });
  await storage.createMembership({
    teamId: team.id,
    userId: session.sub,
    role: 'admin'
  });

  return json(200, {
    ok: true,
    team: buildAdminTeam(team)
  }, origin);
});

const handleAdminUpdateTeam = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const teamId = sanitizeText(body.teamId, 200);
  const name = sanitizeText(body.name, 120);
  const slug = sanitizeTeamSlug(body.slug || name);

  if (!teamId || !name || !slug) {
    return json(400, toError('teamId, name and slug are required'), origin);
  }

  const teams = await storage.listTeams({ includeArchived: true });
  if (teams.some((team) => team.id !== teamId && team.slug === slug)) {
    return json(409, toError('Team slug already exists', { slug }), origin);
  }

  const updated = await storage.updateTeam({ teamId, name, slug });
  if (!updated) {
    return json(404, toError('Team not found', { teamId }), origin);
  }

  return json(200, {
    ok: true,
    team: buildAdminTeam(updated)
  }, origin);
});

const handleAdminArchiveTeam = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const teamId = sanitizeText(body.teamId, 200);

  if (!teamId) {
    return json(400, toError('teamId is required'), origin);
  }
  if (teamId === session.teamId) {
    return json(400, toError('Cannot archive the current session team'), origin);
  }

  const archived = await storage.archiveTeam({ teamId });
  if (!archived) {
    return json(404, toError('Team not found', { teamId }), origin);
  }

  return json(200, {
    ok: true,
    team: buildAdminTeam(archived)
  }, origin);
});

const handleAdminListUsers = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const params = event?.queryStringParameters || {};
  const teamId = sanitizeText(params.teamId, 200) || session.teamId;
  const team = await storage.getTeamById({ teamId });
  if (!team) {
    return json(404, toError('Team not found', { teamId }), origin);
  }

  const users = await storage.listTeamMembers({ teamId, includeInactive: true });
  return json(200, {
    ok: true,
    team: buildAdminTeam(team),
    users: users.map(buildAdminMember)
  }, origin);
});

const handleAdminCreateUser = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const teamId = sanitizeText(body.teamId, 200) || session.teamId;
  const email = sanitizeEmail(body.email);
  const displayName = sanitizeDisplayName(body.displayName) || email.split('@')[0];
  const requestedRole = normalizeRole(body.role);

  if (!teamId || !email) {
    return json(400, toError('teamId and email are required'), origin);
  }
  if (!isValidEmail(email)) {
    return json(400, toError('Invalid email'), origin);
  }
  if (body.role !== undefined && !ASSIGNABLE_TEAM_ROLES.has(requestedRole)) {
    return json(400, toError('role must be editor or lead'), origin);
  }

  const team = await storage.getTeamById({ teamId });
  if (!team || team.status !== 'active') {
    return json(404, toError('Active team not found', { teamId }), origin);
  }

  const existingUser = await storage.getUserByEmail({ email });
  if (existingUser) {
    return json(409, toError('Account already exists', { email }), origin);
  }

  const generatedPassword = generatePassword();
  const user = await storage.createUser({
    email,
    password: generatedPassword,
    displayName
  });
  const membership = await storage.createMembership({
    teamId,
    userId: user.id,
    role: isSuperAdminEmail(email) ? 'admin' : resolveRequestedRole(body.role, resolveDefaultRole())
  });

  return json(200, {
    ok: true,
    user: buildAdminMember({ user, membership }),
    generatedPassword
  }, origin);
});

const handleAdminUpdateUserRole = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const teamId = sanitizeText(body.teamId, 200) || session.teamId;
  const userId = sanitizeText(body.userId, 200);
  const role = normalizeRole(body.role);

  if (!teamId || !userId || !role) {
    return json(400, toError('teamId, userId and role are required'), origin);
  }
  if (!ASSIGNABLE_TEAM_ROLES.has(role)) {
    return json(400, toError('role must be editor or lead'), origin);
  }
  if (userId === session.sub) {
    return json(400, toError('Cannot change the current superadmin role'), origin);
  }

  const targetUser = await storage.getUserById({ userId });
  if (!targetUser) {
    return json(404, toError('User not found', { userId }), origin);
  }
  if (isSuperAdminEmail(targetUser.email)) {
    return json(403, toError('Cannot change a superadmin role'), origin);
  }

  const members = await storage.listTeamMembers({ teamId, includeInactive: true });
  const member = members.find((item) => item.user?.id === userId && item.membership?.status === 'active');
  if (!member) {
    return json(404, toError('User not found in team', { teamId, userId }), origin);
  }

  const membership = await storage.updateMembershipRole({ teamId, userId, role });
  if (!membership) {
    return json(404, toError('User membership not found', { teamId, userId }), origin);
  }

  await storage.revokeSessions({ userId, teamId });

  return json(200, {
    ok: true,
    user: buildAdminMember({
      user: targetUser,
      membership
    })
  }, origin);
});

const handleAdminResetUserPassword = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const teamId = sanitizeText(body.teamId, 200) || session.teamId;
  const userId = sanitizeText(body.userId, 200);

  if (!teamId || !userId) {
    return json(400, toError('teamId and userId are required'), origin);
  }

  const members = await storage.listTeamMembers({ teamId, includeInactive: true });
  const member = members.find((item) => item.user?.id === userId);
  if (!member) {
    return json(404, toError('User not found in team', { teamId, userId }), origin);
  }

  const generatedPassword = generatePassword();
  const updatedUser = await storage.updateUserPassword({
    userId,
    passwordHash: hashPassword(generatedPassword)
  });
  await storage.revokeSessions({ userId });

  return json(200, {
    ok: true,
    user: buildAdminMember({
      user: updatedUser || member.user,
      membership: member.membership
    }),
    generatedPassword
  }, origin);
});

const handleAdminRemoveUser = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireSuperAdmin(session)) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const teamId = sanitizeText(body.teamId, 200) || session.teamId;
  const userId = sanitizeText(body.userId, 200);

  if (!teamId || !userId) {
    return json(400, toError('teamId and userId are required'), origin);
  }
  if (userId === session.sub) {
    return json(400, toError('Cannot remove the current superadmin account'), origin);
  }

  const targetUser = await storage.getUserById({ userId });
  if (!targetUser) {
    return json(404, toError('User not found', { userId }), origin);
  }
  if (isSuperAdminEmail(targetUser.email)) {
    return json(403, toError('Cannot remove a superadmin account'), origin);
  }

  const removed = await storage.removeUserFromTeam({ teamId, userId });
  if (!removed) {
    return json(404, toError('User not found in team', { teamId, userId }), origin);
  }

  return json(200, {
    ok: true,
    removed: true
  }, origin);
});

const handleLogin = async (event, origin) => withStorageErrors(origin, async () => {
  const body = parseBody(event);
  const email = sanitizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const teamSlug = sanitizeTeamSlug(body.teamSlug);

  if (!email || !password) {
    return json(400, toError('email and password are required'), origin);
  }

  const loginContext = await storage.findLoginContext({ email, teamSlug });
  if (!loginContext || !verifyPassword(password, loginContext.user.passwordHash)) {
    return json(401, toError('Invalid credentials'), origin);
  }

  return createAuthSuccessResponse({
    user: loginContext.user,
    team: loginContext.team,
    membership: loginContext.membership,
    origin
  });
});

const handleRegister = async (event, origin) => withStorageErrors(origin, async () => {
  const body = parseBody(event);
  const displayName = sanitizeDisplayName(body.displayName);
  const email = sanitizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const teamSlug = sanitizeTeamSlug(body.teamSlug);

  if (!displayName || !email || !password || !teamSlug) {
    return json(400, toError('displayName, email, password and teamSlug are required'), origin);
  }
  if (!isValidEmail(email)) {
    return json(400, toError('Invalid email'), origin);
  }
  if (!isValidPassword(password)) {
    return json(400, toError('Password must be at least 8 characters'), origin);
  }

  const team = await storage.getTeamBySlug({ teamSlug });
  if (!team || !PUBLIC_TEAM_STATUSES.has(team.status)) {
    return json(404, toError('Team not found', { teamSlug }), origin);
  }

  const existingUser = await storage.getUserByEmail({ email });
  if (existingUser) {
    return json(409, toError('Account already exists'), origin);
  }

  const user = await storage.createUser({
    email,
    password,
    displayName
  });
  const membership = await storage.createMembership({
    teamId: team.id,
    userId: user.id,
    role: isSuperAdminEmail(email) ? 'admin' : resolveDefaultRole()
  });

  return createAuthSuccessResponse({
    user,
    team,
    membership,
    origin
  });
});

const handleLogout = async (event, origin) => {
  const session = await requireAuth(event);
  if (session?.sessionId) {
    await storage.revokeSession({
      userId: session.sub,
      sessionId: session.sessionId
    });
  }

  return json(200, { ok: true }, origin, {
    'Set-Cookie': clearSessionCookie()
  });
};

const handleMe = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }

  const currentTeam = await storage.getCurrentTeam({ teamId: session.teamId });
  return json(200, {
    ok: true,
    user: {
      id: session.sub,
      email: session.email,
      role: session.role,
      displayName: session.displayName || '',
      isSuperadmin: !!session.isSuperadmin
    },
    team: currentTeam?.team
      ? buildPublicTeam(currentTeam.team)
      : { id: session.teamId, slug: session.teamSlug || '', name: '' }
  }, origin);
});

const handleCurrentTeam = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }

  const currentTeam = await storage.getCurrentTeam({ teamId: session.teamId });
  if (!currentTeam?.team) {
    return json(404, toError('Team not found', { teamId: session.teamId }), origin);
  }

  return json(200, {
    ok: true,
    team: {
      id: currentTeam.team.id,
      slug: currentTeam.team.slug,
      name: currentTeam.team.name,
      status: currentTeam.team.status,
      settings: cloneJson(currentTeam.team.settings || {})
    },
    defaults: currentTeam.defaults
      ? {
        version: currentTeam.defaults.version,
        defaults: cloneJson(currentTeam.defaults.defaults || {}),
        mediaSources: cloneJson(currentTeam.defaults.mediaSources || {}),
        updatedAt: currentTeam.defaults.updatedAt
      }
      : null
  }, origin);
});

const handleGetTeamDefaults = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }

  const defaults = await storage.getTeamDefaults({ teamId: session.teamId });
  return json(200, {
    ok: true,
    teamId: session.teamId,
    defaults: defaults
      ? {
        version: defaults.version,
        defaults: cloneJson(defaults.defaults || {}),
        mediaSources: cloneJson(defaults.mediaSources || {}),
        updatedAt: defaults.updatedAt
      }
      : null
  }, origin);
});

const handleSaveTeamDefaults = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireRole(session, [...TEAM_DEFAULTS_ROLES])) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const defaults = sanitizeState(body.defaults) || {};
  const mediaSources = sanitizeState(body.mediaSources) || {};
  const saved = await storage.saveTeamDefaults({
    teamId: session.teamId,
    createdBy: session.sub,
    defaults,
    mediaSources
  });

  return json(200, {
    ok: true,
    teamId: session.teamId,
    defaults: {
      version: saved.version,
      defaults: cloneJson(saved.defaults),
      mediaSources: cloneJson(saved.mediaSources),
      updatedAt: saved.updatedAt
    }
  }, origin);
});

const handleListProjects = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }

  const params = event?.queryStringParameters || {};
  const includeArchived = parseBoolean(params.includeArchived, false);
  const projects = await storage.listProjects({
    teamId: session.teamId,
    includeArchived
  });

  return json(200, {
    ok: true,
    projects: projects.map(buildPublicProject)
  }, origin);
});

const handleCreateProject = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireRole(session, [...PROJECT_ROLES])) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const name = sanitizeProjectName(body.name);
  const description = sanitizeText(body.description, 500);
  const projectState = sanitizeState(body.state) || {};
  if (!name) {
    return json(400, toError('Project name is required'), origin);
  }

  const project = await storage.createProject({
    teamId: session.teamId,
    createdBy: session.sub,
    name,
    description,
    state: projectState
  });

  return json(200, {
    ok: true,
    project: buildPublicProject(project)
  }, origin);
});

const handleUpdateProject = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireRole(session, [...PROJECT_ROLES])) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const projectId = sanitizeText(body.projectId, 200);
  const name = body.name === undefined ? undefined : sanitizeProjectName(body.name);
  const description = body.description === undefined ? undefined : sanitizeText(body.description, 500);
  const projectState = body.state === undefined ? undefined : sanitizeState(body.state);

  if (!projectId) {
    return json(400, toError('projectId is required'), origin);
  }
  if (body.name !== undefined && !name) {
    return json(400, toError('name cannot be empty'), origin);
  }

  const updated = await storage.updateProject({
    teamId: session.teamId,
    projectId,
    name,
    description,
    state: projectState
  });

  if (!updated) {
    return json(404, toError('Project not found', { projectId }), origin);
  }

  return json(200, {
    ok: true,
    project: buildPublicProject(updated)
  }, origin);
});

const handleArchiveProject = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireRole(session, ['admin'])) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const projectId = sanitizeText(body.projectId, 200);
  if (!projectId) {
    return json(400, toError('projectId is required'), origin);
  }

  const archived = await storage.archiveProject({
    teamId: session.teamId,
    projectId
  });
  if (!archived) {
    return json(404, toError('Project not found', { projectId }), origin);
  }

  return json(200, {
    ok: true,
    project: buildPublicProject(archived)
  }, origin);
});

const handleListSnapshots = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }

  const params = event?.queryStringParameters || {};
  const projectId = sanitizeText(params.projectId, 200);
  const kind = params.kind === 'template' ? 'template' : params.kind === 'snapshot' ? 'snapshot' : '';
  if (!projectId) {
    return json(400, toError('projectId is required'), origin);
  }

  const project = await storage.getProject({ teamId: session.teamId, projectId });
  if (!project) {
    return json(404, toError('Project not found', { projectId }), origin);
  }

  const snapshots = await storage.listSnapshots({
    teamId: session.teamId,
    projectId,
    kind
  });

  return json(200, {
    ok: true,
    snapshots: snapshots.map(buildPublicSnapshot)
  }, origin);
});

const handleSaveSnapshot = async (event, origin) => withStorageErrors(origin, async () => {
  const session = await requireAuth(event);
  if (!session) {
    return json(401, toError('Unauthorized'), origin);
  }
  if (!requireRole(session, [...PROJECT_ROLES])) {
    return json(403, toError('Forbidden'), origin);
  }

  const body = parseBody(event);
  const projectId = sanitizeText(body.projectId, 200);
  const name = sanitizeProjectName(body.name);
  const kind = body.kind === 'template' ? 'template' : 'snapshot';
  const snapshotState = sanitizeState(body.state);

  if (!projectId || !name || !snapshotState) {
    return json(400, toError('projectId, name and state are required'), origin);
  }

  const project = await storage.getProject({ teamId: session.teamId, projectId });
  if (!project) {
    return json(404, toError('Project not found', { projectId }), origin);
  }

  const snapshot = await storage.createSnapshot({
    teamId: session.teamId,
    projectId,
    createdBy: session.sub,
    name,
    kind,
    state: snapshotState
  });

  return json(200, {
    ok: true,
    snapshot: buildPublicSnapshot(snapshot)
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
      return handleAdminListTeams(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/teams')) {
      return handleAdminCreateTeam(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/teams/update')) {
      return handleAdminUpdateTeam(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/teams/archive')) {
      return handleAdminArchiveTeam(event, origin);
    }
    if (method === 'GET' && path.endsWith('/admin/users')) {
      return handleAdminListUsers(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/users')) {
      return handleAdminCreateUser(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/users/reset-password')) {
      return handleAdminResetUserPassword(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/users/role')) {
      return handleAdminUpdateUserRole(event, origin);
    }
    if (method === 'POST' && path.endsWith('/admin/users/remove')) {
      return handleAdminRemoveUser(event, origin);
    }
    if (method === 'POST' && path.endsWith('/auth/login')) {
      return handleLogin(event, origin);
    }
    if (method === 'POST' && path.endsWith('/auth/register')) {
      return handleRegister(event, origin);
    }
    if (method === 'POST' && path.endsWith('/auth/logout')) {
      return handleLogout(event, origin);
    }
    if (method === 'GET' && path.endsWith('/auth/me')) {
      return handleMe(event, origin);
    }
    if (method === 'GET' && path.endsWith('/teams/current')) {
      return handleCurrentTeam(event, origin);
    }
    if (method === 'GET' && path.endsWith('/team-defaults')) {
      return handleGetTeamDefaults(event, origin);
    }
    if (method === 'POST' && path.endsWith('/team-defaults')) {
      return handleSaveTeamDefaults(event, origin);
    }
    if (method === 'GET' && path.endsWith('/projects')) {
      return handleListProjects(event, origin);
    }
    if (method === 'POST' && path.endsWith('/projects')) {
      return handleCreateProject(event, origin);
    }
    if (method === 'POST' && path.endsWith('/projects/update')) {
      return handleUpdateProject(event, origin);
    }
    if (method === 'POST' && path.endsWith('/projects/archive')) {
      return handleArchiveProject(event, origin);
    }
    if (method === 'GET' && path.endsWith('/snapshots')) {
      return handleListSnapshots(event, origin);
    }
    if (method === 'POST' && path.endsWith('/snapshots')) {
      return handleSaveSnapshot(event, origin);
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
  buildSessionCookie,
  clearSessionCookie,
  createAccessPayload,
  hashPassword,
  parseCookies,
  signToken,
  verifyPassword,
  verifyToken
};
