import { scryptSync, timingSafeEqual } from 'node:crypto';
import YdbSdk from 'ydb-sdk';

const { Driver, getCredentialsFromEnv, TypedValues } = YdbSdk;

const getEnv = (name, fallback = '') => {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const verifyPassword = (password, storedHash) => {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  const [salt, expected] = storedHash.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
};

const ydbEndpoint = getEnv('YDB_ENDPOINT', '');
const ydbDatabase = getEnv('YDB_DATABASE', '');
const ydbAuthToken = getEnv('YDB_AUTH_TOKEN', '');
const email = String(process.argv[2] || '').trim().toLowerCase();
const password = String(process.argv[3] || '');
const teamSlug = String(process.argv[4] || '').trim().toLowerCase();

if (!ydbEndpoint || !ydbDatabase) {
  throw new Error('YDB_ENDPOINT and YDB_DATABASE are required');
}

if (!email || !password || !teamSlug) {
  throw new Error('Usage: node check-login-context.mjs <email> <password> <teamSlug>');
}

if (ydbAuthToken && !process.env.YDB_ACCESS_TOKEN_CREDENTIALS) {
  process.env.YDB_ACCESS_TOKEN_CREDENTIALS = ydbAuthToken;
}

const connectionString = ydbEndpoint.includes('?database=')
  ? ydbEndpoint
  : `${ydbEndpoint}?database=${encodeURIComponent(ydbDatabase)}`;

const driver = new Driver({
  connectionString,
  authService: getCredentialsFromEnv()
});

const item = (row, index) => row?.items?.[index]?.textValue || '';

try {
  const ready = await driver.ready(15000);
  if (!ready) {
    throw new Error('Driver not ready');
  }

  const userResult = await driver.tableClient.withSessionRetry((session) => session.executeQuery(`
    DECLARE $email AS Utf8;
    SELECT id, email, password_hash, display_name, status
    FROM users
    WHERE email = $email
    LIMIT 1;
  `, {
    $email: TypedValues.utf8(email)
  }));

  const userRow = userResult.resultSets?.[0]?.rows?.[0] || null;
  const user = userRow ? {
    id: item(userRow, 0),
    email: item(userRow, 1),
    passwordHash: item(userRow, 2),
    displayName: item(userRow, 3),
    status: item(userRow, 4)
  } : null;

  let membership = null;

  if (user?.id) {
    const membershipResult = await driver.tableClient.withSessionRetry((session) => session.executeQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $team_slug AS Utf8;

      SELECT
        m.team_id AS team_id,
        m.user_id AS user_id,
        m.role AS role,
        m.status AS status,
        t.id AS id,
        t.slug AS slug,
        t.name AS name,
        t.status AS team_status
      FROM memberships AS m
      INNER JOIN teams AS t ON t.id = m.team_id
      WHERE m.user_id = $user_id
        AND m.status = "active"
        AND t.status = "active"
        AND ($team_slug = "" OR t.slug = $team_slug)
      LIMIT 1;
    `, {
      $user_id: TypedValues.utf8(user.id),
      $team_slug: TypedValues.utf8(teamSlug)
    }));

    const membershipRow = membershipResult.resultSets?.[0]?.rows?.[0] || null;
    membership = membershipRow ? {
      teamId: item(membershipRow, 0),
      userId: item(membershipRow, 1),
      role: item(membershipRow, 2),
      status: item(membershipRow, 3),
      teamSlug: item(membershipRow, 5),
      teamName: item(membershipRow, 6),
      teamStatus: item(membershipRow, 7)
    } : null;
  }

  console.log(JSON.stringify({
    user,
    membership,
    passwordMatches: verifyPassword(password, user?.passwordHash || '')
  }, null, 2));
} finally {
  await driver.destroy();
}
