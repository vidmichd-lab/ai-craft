import YdbSdk from 'ydb-sdk';

const { Driver, getCredentialsFromEnv, TypedValues } = YdbSdk;

const getEnv = (name, fallback = '') => {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const ydbEndpoint = getEnv('YDB_ENDPOINT', '');
const ydbDatabase = getEnv('YDB_DATABASE', '');
const ydbAuthToken = getEnv('YDB_AUTH_TOKEN', '');

if (!ydbEndpoint || !ydbDatabase) {
  throw new Error('YDB_ENDPOINT and YDB_DATABASE are required');
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

const emails = process.argv.slice(2).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);

if (!emails.length) {
  throw new Error('Pass at least one email');
}

try {
  const ready = await driver.ready(15000);
  if (!ready) {
    throw new Error('Driver not ready');
  }

  for (const email of emails) {
    const result = await driver.tableClient.withSessionRetry((session) => session.executeQuery(`
      DECLARE $email AS Utf8;

      SELECT id, email, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE email = $email;
    `, {
      $email: TypedValues.utf8(email)
    }));

    const membershipResult = await driver.tableClient.withSessionRetry((session) => session.executeQuery(`
      DECLARE $email AS Utf8;

      SELECT
        u.id AS user_id,
        u.email AS email,
        m.team_id AS team_id,
        m.role AS role,
        m.status AS membership_status
      FROM users AS u
      INNER JOIN memberships AS m ON m.user_id = u.id
      WHERE u.email = $email;
    `, {
      $email: TypedValues.utf8(email)
    }));

    console.log(JSON.stringify({
      email,
      rows: result.resultSets?.[0]?.rows ?? [],
      memberships: membershipResult.resultSets?.[0]?.rows ?? []
    }, null, 2));
  }
} finally {
  await driver.destroy();
}
