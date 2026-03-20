import { env } from '@/server/env';
import { createRequestContext } from '@/server/http/request-context';
import { jsonResponse } from '@/server/http/response';

export function GET(request: Request) {
  const context = createRequestContext(request);
  return jsonResponse(
    {
      ok: true,
      service: 'ai-craft-web',
      environment: env.NODE_ENV
    },
    context
  );
}
