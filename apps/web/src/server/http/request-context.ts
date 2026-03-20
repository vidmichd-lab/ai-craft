import { randomUUID } from 'node:crypto';

export type RequestContext = {
  requestId: string;
  method: string;
  pathname: string;
  startedAt: number;
};

type RequestLogLevel = 'info' | 'warn' | 'error';

const loggerByLevel: Record<RequestLogLevel, typeof console.info> = {
  info: console.info,
  warn: console.warn,
  error: console.error
};

export const createRequestContext = (request?: Request): RequestContext => {
  const url = request ? new URL(request.url) : null;

  return {
    requestId: request?.headers.get('x-request-id')?.trim() || randomUUID(),
    method: request?.method || 'UNKNOWN',
    pathname: url?.pathname || 'unknown',
    startedAt: Date.now()
  };
};

export const logRequestEvent = (
  level: RequestLogLevel,
  context: RequestContext,
  event: string,
  details: Record<string, unknown> = {}
) => {
  const logger = loggerByLevel[level];
  logger(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope: 'ai-craft-web',
      level,
      event,
      requestId: context.requestId,
      method: context.method,
      pathname: context.pathname,
      durationMs: Date.now() - context.startedAt,
      ...details
    })
  );
};
