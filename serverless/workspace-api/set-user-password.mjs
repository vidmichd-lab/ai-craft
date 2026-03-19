import { randomBytes, scryptSync } from 'node:crypto';
import YdbSdk from 'ydb-sdk';

const { Driver, getCredentialsFromEnv, TypedValues } = YdbSdk;

const getEnv = (name, fallback = '') => {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const ydbEndpoint = getEnv('YDB_ENDPOINT', '');
const ydbDatabase = getEnv('YDB_DATABASE', '');
const ydbAuthToken = getEnv('YDB_AUTH_TOKEN', '');
const userId = String(process.argv[2] || '').trim();
const password = String(process.argv[3] || '');

if (!ydbEndpoint || !ydbDatabase) {
  throw new Error('YDB_ENDPOINT and YDB_DATABASE are required');
}

if (!userId || !password) {
  throw new Error('Usage: node set-user-password.mjs <userId> <password>');
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
    DECLARE $password_hash AS Utf8;
    DECLARE $updated_at AS Timestamp;

    UPDATE users
    SET password_hash = $password_hash,
        status = "active",
        updated_at = $updated_at
    WHERE id = $user_id;
  `, {
    $user_id: TypedValues.utf8(userId),
    $password_hash: TypedValues.utf8(hashPassword(password)),
    $updated_at: TypedValues.timestamp(new Date())
  }));

  console.log(JSON.stringify({ ok: true, userId }));
} finally {
  await driver.destroy();
}
