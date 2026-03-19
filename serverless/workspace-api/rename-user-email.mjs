import YdbSdk from 'ydb-sdk';

const { Driver, getCredentialsFromEnv, TypedValues } = YdbSdk;

const getEnv = (name, fallback = '') => {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const ydbEndpoint = getEnv('YDB_ENDPOINT', '');
const ydbDatabase = getEnv('YDB_DATABASE', '');
const ydbAuthToken = getEnv('YDB_AUTH_TOKEN', '');
const userId = String(process.argv[2] || '').trim();
const email = String(process.argv[3] || '').trim().toLowerCase();

if (!ydbEndpoint || !ydbDatabase) {
  throw new Error('YDB_ENDPOINT and YDB_DATABASE are required');
}

if (!userId || !email) {
  throw new Error('Usage: node rename-user-email.mjs <userId> <email>');
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

try {
  const ready = await driver.ready(15000);
  if (!ready) {
    throw new Error('Driver not ready');
  }

  await driver.tableClient.withSessionRetry((session) => session.executeQuery(`
    DECLARE $user_id AS Utf8;
    DECLARE $email AS Utf8;
    DECLARE $updated_at AS Timestamp;

    UPDATE users
    SET email = $email,
        updated_at = $updated_at
    WHERE id = $user_id;
  `, {
    $user_id: TypedValues.utf8(userId),
    $email: TypedValues.utf8(email),
    $updated_at: TypedValues.timestamp(new Date())
  }));

  console.log(JSON.stringify({ ok: true, userId, email }));
} finally {
  await driver.destroy();
}
