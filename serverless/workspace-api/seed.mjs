import { randomBytes, scryptSync } from 'node:crypto';
import YdbSdk from 'ydb-sdk';
import { getEnv, safeParseJson, splitCsv } from './config.mjs';

const {
  Driver,
  AUTO_TX,
  ExecuteQuerySettings,
  TypedValues,
  Types,
  getCredentialsFromEnv
} = YdbSdk;

const slugify = (value, fallback) => {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

const normalizeRole = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const config = {
  teamSlug: getEnv('WORKSPACE_BOOTSTRAP_TEAM_SLUG', 'practicum'),
  teamName: getEnv('WORKSPACE_BOOTSTRAP_TEAM_NAME', 'Яндекс Практикум'),
  adminEmail: getEnv('WORKSPACE_BOOTSTRAP_ADMIN_EMAIL', '').toLowerCase(),
  adminPassword: getEnv('WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD', ''),
  adminName: getEnv('WORKSPACE_BOOTSTRAP_ADMIN_NAME', 'Workspace Admin'),
  defaultRole: getEnv('WORKSPACE_DEFAULT_ROLE', 'editor'),
  superAdminEmails: splitCsv(getEnv('WORKSPACE_SUPERADMIN_EMAILS', 'vidmichd@ya.ru')).map((item) => item.toLowerCase()),
  defaultsJson: safeParseJson(getEnv('WORKSPACE_BOOTSTRAP_DEFAULTS_JSON', '{}'), {}),
  mediaSourcesJson: safeParseJson(getEnv('WORKSPACE_BOOTSTRAP_MEDIA_SOURCES_JSON', '{}'), {}),
  ydbEndpoint: getEnv('YDB_ENDPOINT', ''),
  ydbDatabase: getEnv('YDB_DATABASE', ''),
  ydbAuthToken: getEnv('YDB_AUTH_TOKEN', '')
};

const resolveDefaultRole = () => {
  const role = normalizeRole(config.defaultRole);
  return ['lead', 'editor'].includes(role) ? role : 'editor';
};

const isSuperAdminEmail = (email) => !!email && config.superAdminEmails.includes(email.toLowerCase());
const resolveSeedRole = (email) => isSuperAdminEmail(email) ? 'admin' : resolveDefaultRole();
const shouldSeedAdmin = isValidEmail(config.adminEmail) && !!config.adminPassword;

if (!config.ydbEndpoint || !config.ydbDatabase) {
  throw new Error('YDB_ENDPOINT and YDB_DATABASE are required for seed.mjs');
}

if (config.ydbAuthToken && !process.env.YDB_ACCESS_TOKEN_CREDENTIALS) {
  process.env.YDB_ACCESS_TOKEN_CREDENTIALS = config.ydbAuthToken;
}

const teamId = `team-${slugify(config.teamSlug, 'demo')}`;
const userId = shouldSeedAdmin ? `user-${slugify(config.adminEmail, 'admin')}` : '';
const now = new Date().toISOString();
const defaultsCreatedBy = shouldSeedAdmin ? userId : 'system-bootstrap';
const connectionString = config.ydbEndpoint.includes('?database=')
  ? config.ydbEndpoint
  : `${config.ydbEndpoint}?database=${encodeURIComponent(config.ydbDatabase)}`;
const querySettings = new ExecuteQuerySettings().withIdempotent(false);

const driver = new Driver({
  connectionString,
  authService: getCredentialsFromEnv()
});

const ready = await driver.ready(10_000);
if (!ready) {
  throw new Error('YDB driver is not ready');
}

const execute = async (query, params) => driver.tableClient.withSession(async (session) => session.executeQuery(
  query,
  params,
  AUTO_TX,
  querySettings
));

try {
  await execute(`
    DECLARE $team_id AS Utf8;
    DECLARE $slug AS Utf8;
    DECLARE $name AS Utf8;
    DECLARE $team_status AS Utf8;
    DECLARE $settings_json AS JsonDocument;
    DECLARE $team_created_at AS Timestamp;
    DECLARE $team_updated_at AS Timestamp;
    DECLARE $team_archived_at AS Timestamp?;

    DECLARE $defaults_version AS Uint64;
    DECLARE $defaults_json AS JsonDocument;
    DECLARE $media_sources_json AS JsonDocument;
    DECLARE $defaults_created_by AS Utf8;
    DECLARE $defaults_created_at AS Timestamp;
    DECLARE $defaults_updated_at AS Timestamp;

    UPSERT INTO teams (
      id, slug, name, status, settings_json, created_at, updated_at, archived_at
    ) VALUES (
      $team_id, $slug, $name, $team_status, $settings_json, $team_created_at, $team_updated_at, $team_archived_at
    );

    UPSERT INTO team_defaults (
      team_id, version, defaults_json, media_sources_json, created_by, created_at, updated_at
    ) VALUES (
      $team_id, $defaults_version, $defaults_json, $media_sources_json, $defaults_created_by, $defaults_created_at, $defaults_updated_at
    );
  `, {
    $team_id: TypedValues.utf8(teamId),
    $slug: TypedValues.utf8(config.teamSlug),
    $name: TypedValues.utf8(config.teamName),
    $team_status: TypedValues.utf8('active'),
    $settings_json: TypedValues.jsonDocument('{}'),
    $team_created_at: TypedValues.timestamp(new Date(now)),
    $team_updated_at: TypedValues.timestamp(new Date(now)),
    $team_archived_at: TypedValues.optionalNull(Types.TIMESTAMP),

    $defaults_version: TypedValues.uint64(1),
    $defaults_json: TypedValues.jsonDocument(JSON.stringify(config.defaultsJson)),
    $media_sources_json: TypedValues.jsonDocument(JSON.stringify(config.mediaSourcesJson)),
    $defaults_created_by: TypedValues.utf8(defaultsCreatedBy),
    $defaults_created_at: TypedValues.timestamp(new Date(now)),
    $defaults_updated_at: TypedValues.timestamp(new Date(now))
  });

  if (shouldSeedAdmin) {
    await execute(`
      DECLARE $user_id AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $password_hash AS Utf8;
      DECLARE $display_name AS Utf8;
      DECLARE $user_status AS Utf8;
      DECLARE $user_created_at AS Timestamp;
      DECLARE $user_updated_at AS Timestamp;
      DECLARE $last_login_at AS Timestamp?;

      DECLARE $team_id AS Utf8;
      DECLARE $role AS Utf8;
      DECLARE $membership_status AS Utf8;
      DECLARE $membership_created_at AS Timestamp;
      DECLARE $membership_updated_at AS Timestamp;

      UPSERT INTO users (
        id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      ) VALUES (
        $user_id, $email, $password_hash, $display_name, $user_status, $user_created_at, $user_updated_at, $last_login_at
      );

      UPSERT INTO memberships (
        team_id, user_id, role, status, created_at, updated_at
      ) VALUES (
        $team_id, $user_id, $role, $membership_status, $membership_created_at, $membership_updated_at
      );
    `, {
      $user_id: TypedValues.utf8(userId),
      $email: TypedValues.utf8(config.adminEmail),
      $password_hash: TypedValues.utf8(hashPassword(config.adminPassword)),
      $display_name: TypedValues.utf8(config.adminName || config.adminEmail),
      $user_status: TypedValues.utf8('active'),
      $user_created_at: TypedValues.timestamp(new Date(now)),
      $user_updated_at: TypedValues.timestamp(new Date(now)),
      $last_login_at: TypedValues.optionalNull(Types.TIMESTAMP),
      $team_id: TypedValues.utf8(teamId),
      $role: TypedValues.utf8(resolveSeedRole(config.adminEmail)),
      $membership_status: TypedValues.utf8('active'),
      $membership_created_at: TypedValues.timestamp(new Date(now)),
      $membership_updated_at: TypedValues.timestamp(new Date(now))
    });
  }

  console.log(JSON.stringify({
    ok: true,
    teamId,
    ...(shouldSeedAdmin ? { userId, adminEmail: config.adminEmail } : {}),
    teamSlug: config.teamSlug,
    seededAdmin: shouldSeedAdmin
  }, null, 2));
} finally {
  await driver.destroy();
}
