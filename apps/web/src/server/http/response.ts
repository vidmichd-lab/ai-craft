import { NextResponse } from 'next/server';
import type { RequestContext } from './request-context';
import { logRequestEvent } from './request-context';

export const appendSetCookies = (response: NextResponse, setCookies: string[] = []) => {
  setCookies.forEach((value) => response.headers.append('set-cookie', value));
  return response;
};

export const withRequestContext = (response: NextResponse, context?: RequestContext) => {
  if (context?.requestId) {
    response.headers.set('x-request-id', context.requestId);
  }
  return response;
};

export const jsonResponse = <T>(payload: T, context?: RequestContext, init?: ResponseInit) =>
  withRequestContext(NextResponse.json(payload, init), context);

export const jsonWithCookies = <T>(payload: T, setCookies: string[] = [], context?: RequestContext) =>
  appendSetCookies(jsonResponse(payload, context), setCookies);

export const toRouteErrorResponse = (
  error: unknown,
  fallbackMessage: string,
  context?: RequestContext,
  fallbackStatus = 400
) => {
  const status = (error as Error & { status?: number }).status || fallbackStatus;
  const message = error instanceof Error ? error.message : fallbackMessage;
  const errorCode = status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';

  if (context) {
    logRequestEvent('error', context, 'route_error', { status, message, errorCode });
  }

  return jsonResponse(
    {
      error: message,
      errorCode,
      requestId: context?.requestId
    },
    context,
    { status }
  );
};
