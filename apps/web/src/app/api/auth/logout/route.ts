import { logoutWorkspace } from '@/server/workspace-api/client';
import { createRequestContext } from '@/server/http/request-context';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const cookie = request.headers.get('cookie') || '';
    const result = await logoutWorkspace(cookie);
    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Logout failed', context);
  }
}
