import YdbSdk from 'ydb-sdk';

const {
  Driver,
  Column,
  TableDescription,
  Types,
  getCredentialsFromEnv
} = YdbSdk;

const getEnv = (name, fallback = '') => {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const ydbEndpoint = getEnv('YDB_ENDPOINT', '');
const ydbDatabase = getEnv('YDB_DATABASE', '');
const ydbAuthToken = getEnv('YDB_AUTH_TOKEN', '');

if (!ydbEndpoint || !ydbDatabase) {
  throw new Error('YDB_ENDPOINT and YDB_DATABASE are required for apply-schema.mjs');
}

if (ydbAuthToken && !process.env.YDB_ACCESS_TOKEN_CREDENTIALS) {
  process.env.YDB_ACCESS_TOKEN_CREDENTIALS = ydbAuthToken;
}

const connectionString = ydbEndpoint.includes('?database=')
  ? ydbEndpoint
  : `${ydbEndpoint}?database=${encodeURIComponent(ydbDatabase)}`;

const optional = (type) => Types.optional(type);

const tableDefinitions = [
  {
    name: 'teams',
    description: new TableDescription()
      .withColumn(new Column('id', optional(Types.UTF8)))
      .withColumn(new Column('slug', optional(Types.UTF8)))
      .withColumn(new Column('name', optional(Types.UTF8)))
      .withColumn(new Column('status', optional(Types.UTF8)))
      .withColumn(new Column('settings_json', optional(Types.JSON_DOCUMENT)))
      .withColumn(new Column('created_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('updated_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('archived_at', optional(Types.TIMESTAMP)))
      .withPrimaryKey('id')
  },
  {
    name: 'users',
    description: new TableDescription()
      .withColumn(new Column('id', optional(Types.UTF8)))
      .withColumn(new Column('email', optional(Types.UTF8)))
      .withColumn(new Column('password_hash', optional(Types.UTF8)))
      .withColumn(new Column('display_name', optional(Types.UTF8)))
      .withColumn(new Column('status', optional(Types.UTF8)))
      .withColumn(new Column('created_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('updated_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('last_login_at', optional(Types.TIMESTAMP)))
      .withPrimaryKey('id')
  },
  {
    name: 'memberships',
    description: new TableDescription()
      .withColumn(new Column('team_id', optional(Types.UTF8)))
      .withColumn(new Column('user_id', optional(Types.UTF8)))
      .withColumn(new Column('role', optional(Types.UTF8)))
      .withColumn(new Column('status', optional(Types.UTF8)))
      .withColumn(new Column('created_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('updated_at', optional(Types.TIMESTAMP)))
      .withPrimaryKey('team_id', 'user_id')
  },
  {
    name: 'projects',
    description: new TableDescription()
      .withColumn(new Column('team_id', optional(Types.UTF8)))
      .withColumn(new Column('id', optional(Types.UTF8)))
      .withColumn(new Column('name', optional(Types.UTF8)))
      .withColumn(new Column('status', optional(Types.UTF8)))
      .withColumn(new Column('description', optional(Types.UTF8)))
      .withColumn(new Column('state_json', optional(Types.JSON_DOCUMENT)))
      .withColumn(new Column('created_by', optional(Types.UTF8)))
      .withColumn(new Column('created_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('updated_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('archived_at', optional(Types.TIMESTAMP)))
      .withPrimaryKey('team_id', 'id')
  },
  {
    name: 'project_snapshots',
    description: new TableDescription()
      .withColumn(new Column('team_id', optional(Types.UTF8)))
      .withColumn(new Column('project_id', optional(Types.UTF8)))
      .withColumn(new Column('id', optional(Types.UTF8)))
      .withColumn(new Column('name', optional(Types.UTF8)))
      .withColumn(new Column('kind', optional(Types.UTF8)))
      .withColumn(new Column('state_json', optional(Types.JSON_DOCUMENT)))
      .withColumn(new Column('created_by', optional(Types.UTF8)))
      .withColumn(new Column('created_at', optional(Types.TIMESTAMP)))
      .withPrimaryKey('team_id', 'project_id', 'id')
  },
  {
    name: 'team_defaults',
    description: new TableDescription()
      .withColumn(new Column('team_id', optional(Types.UTF8)))
      .withColumn(new Column('version', optional(Types.UINT64)))
      .withColumn(new Column('defaults_json', optional(Types.JSON_DOCUMENT)))
      .withColumn(new Column('media_sources_json', optional(Types.JSON_DOCUMENT)))
      .withColumn(new Column('created_by', optional(Types.UTF8)))
      .withColumn(new Column('created_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('updated_at', optional(Types.TIMESTAMP)))
      .withPrimaryKey('team_id', 'version')
  },
  {
    name: 'sessions',
    description: new TableDescription()
      .withColumn(new Column('user_id', optional(Types.UTF8)))
      .withColumn(new Column('session_id', optional(Types.UTF8)))
      .withColumn(new Column('team_id', optional(Types.UTF8)))
      .withColumn(new Column('refresh_token_hash', optional(Types.UTF8)))
      .withColumn(new Column('expires_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('created_at', optional(Types.TIMESTAMP)))
      .withColumn(new Column('revoked_at', optional(Types.TIMESTAMP)))
      .withPrimaryKey('user_id', 'session_id')
  }
];

const driver = new Driver({
  connectionString,
  authService: getCredentialsFromEnv()
});

const ready = await driver.ready(10_000);
if (!ready) {
  throw new Error('YDB driver is not ready');
}

const created = [];
const skipped = [];

try {
  await driver.tableClient.withSession(async (session) => {
    for (const table of tableDefinitions) {
      try {
        await session.createTable(table.name, table.description);
        created.push(table.name);
      } catch (error) {
        const message = error?.message || String(error);
        if (/exist|exists|precondition/i.test(message)) {
          skipped.push(table.name);
          continue;
        }
        throw error;
      }
    }
  });

  console.log(JSON.stringify({
    ok: true,
    created,
    skipped
  }, null, 2));
} finally {
  await driver.destroy();
}
