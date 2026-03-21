export const createHttpHelpers = (allowedOrigins = []) => {
  const inferOrigin = (event) => {
    const headers = event?.headers || {};
    return headers.origin || headers.Origin || '';
  };

  const inferMethod = (event) => {
    const requestMethod = event?.requestContext?.http?.method;
    if (typeof requestMethod === 'string' && requestMethod) {
      return requestMethod.toUpperCase();
    }
    const method = event?.httpMethod;
    return typeof method === 'string' && method ? method.toUpperCase() : 'GET';
  };

  const inferPath = (event) => {
    const rawPath = (
      event?.requestContext?.http?.path ||
      event?.rawPath ||
      event?.path ||
      '/'
    );
    return String(rawPath).split('?')[0] || '/';
  };

  const resolveCorsOrigin = (origin) => {
    if (!origin) return allowedOrigins[0] || '*';
    if (allowedOrigins.includes('*')) return '*';
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';
  };

  const buildHeaders = (origin, extra = {}) => ({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '3600',
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
    Expires: '0',
    Vary: 'Origin, Cookie',
    'X-Content-Type-Options': 'nosniff',
    ...extra
  });

  const json = (statusCode, payload, origin, extraHeaders = {}) => ({
    statusCode,
    headers: buildHeaders(origin, extraHeaders),
    body: JSON.stringify(payload)
  });

  const toError = (message, details = {}) => ({
    ok: false,
    error: message,
    ...details
  });

  return {
    inferOrigin,
    inferMethod,
    inferPath,
    buildHeaders,
    json,
    toError
  };
};
