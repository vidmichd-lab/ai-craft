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

const userIds = process.argv.slice(2).map((value) => String(value || '').trim()).filter(Boolean);

if (!userIds.length) {
  throw new Error('Pass at least one user id');
}

try {
  const ready = await driver.ready(15000);
  if (!ready) {
    throw new Error('Driver not ready');
  }

  for (const userId of userIds) {
    await driver.tableClient.withSessionRetry((session) => session.executeQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $updated_at AS Timestamp;

      UPDATE users
      SET status = "inactive",
          updated_at = $updated_at
      WHERE id = $user_id;
    `, {
      $user_id: TypedValues.utf8(userId),
      $updated_at: TypedValues.timestamp(new Date())
    }));

    console.log(JSON.stringify({ ok: true, deactivatedUserId: userId }));
  }
} finally {
  await driver.destroy();
}
