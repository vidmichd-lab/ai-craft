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

if (!ydbEndpoint || !ydbDatabase) {
  throw new Error('YDB_ENDPOINT and YDB_DATABASE are required');
}

if (!email || !password) {
  throw new Error('Usage: node check-user-password.mjs <email> <password>');
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

  const result = await driver.tableClient.withSessionRetry((session) => session.executeQuery(`
    DECLARE $email AS Utf8;

    SELECT id, email, password_hash, display_name, status
    FROM users
    WHERE email = $email;
  `, {
    $email: TypedValues.utf8(email)
  }));

  const rows = result.resultSets?.[0]?.rows ?? [];
  const normalized = rows.map((row) => {
    const items = row.items || [];
    return {
      id: items[0]?.textValue || '',
      email: items[1]?.textValue || '',
      passwordHash: items[2]?.textValue || '',
      displayName: items[3]?.textValue || '',
      status: items[4]?.textValue || '',
      passwordMatches: verifyPassword(password, items[2]?.textValue || '')
    };
  });

  console.log(JSON.stringify(normalized, null, 2));
} finally {
  await driver.destroy();
}
