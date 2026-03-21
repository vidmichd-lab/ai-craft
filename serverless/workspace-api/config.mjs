import { ensureWorkspaceRuntimeSecurity, insecureWorkspaceDefaults } from './runtime-security.mjs';

export const DEFAULT_ALLOWED_ORIGINS = [
  'https://aicrafter.ru',
  'https://www.aicrafter.ru',
  'https://ai-craft.website.yandexcloud.net',
  'https://bbatcmo4t42t8vmcrqka.containers.yandexcloud.net',
  'http://localhost:8000',
  'http://localhost:8001'
];

export const getEnv = (name, fallback = '') => {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

export const splitCsv = (value, fallback = []) => {
  if (!value) return [...fallback];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

export const safeParseJson = (value, fallback) => {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const toTimestamp = () => new Date().toISOString();

export const cloneJson = (value) => JSON.parse(JSON.stringify(value));

export const getStorageMode = () => {
  const value = process.env.WORKSPACE_STORAGE;
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'memory';
};

export const loadWorkspaceConfig = () => {
  const storageMode = getStorageMode();
  const config = {
    storage: storageMode,
    jwtSecret: getEnv('WORKSPACE_JWT_SECRET', insecureWorkspaceDefaults.jwtSecret),
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
    bootstrapAdminEmail: getEnv(
      'WORKSPACE_BOOTSTRAP_ADMIN_EMAIL',
      storageMode === 'memory' ? 'admin@example.com' : ''
    ).toLowerCase(),
    bootstrapAdminPassword: getEnv(
      'WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD',
      storageMode === 'memory' ? insecureWorkspaceDefaults.bootstrapAdminPassword : ''
    ),
    bootstrapAdminName: getEnv('WORKSPACE_BOOTSTRAP_ADMIN_NAME', 'Workspace Admin'),
    bootstrapDefaultsJson: safeParseJson(getEnv('WORKSPACE_BOOTSTRAP_DEFAULTS_JSON', '{}'), {}),
    bootstrapMediaSourcesJson: safeParseJson(getEnv('WORKSPACE_BOOTSTRAP_MEDIA_SOURCES_JSON', '{}'), {}),
    ydbEndpoint: getEnv('YDB_ENDPOINT', ''),
    ydbDatabase: getEnv('YDB_DATABASE', ''),
    ydbAuthToken: getEnv('YDB_AUTH_TOKEN', ''),
    debugEvent: getEnv('WORKSPACE_DEBUG_EVENT', 'false').toLowerCase() === 'true'
  };

  ensureWorkspaceRuntimeSecurity({
    nodeEnv: getEnv('NODE_ENV', 'development'),
    jwtSecret: config.jwtSecret,
    bootstrapAdminEmail: config.bootstrapAdminEmail,
    bootstrapAdminPassword: config.bootstrapAdminPassword
  });

  return config;
};
