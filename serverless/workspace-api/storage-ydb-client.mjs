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

const IDENTITY_QUERY_SETTINGS = new ExecuteQuerySettings().withIdempotent(true);

export { TypedValues, Types };

export const optionalTimestamp = (value) => value
  ? TypedValues.optional(TypedValues.timestamp(new Date(value)))
  : TypedValues.optionalNull(Types.TIMESTAMP);

export const jsonDocumentValue = (value) => TypedValues.jsonDocument(JSON.stringify(value || {}));

export const createYdbClient = ({ config }) => {
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
    return driver.tableClient.withSession(async (session) => session.executeQuery(
      query,
      params,
      AUTO_TX,
      idempotent ? IDENTITY_QUERY_SETTINGS : new ExecuteQuerySettings().withIdempotent(false)
    ));
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

  return {
    getYdbDriver,
    executeYdbQuery,
    queryRows,
    queryRow
  };
};
