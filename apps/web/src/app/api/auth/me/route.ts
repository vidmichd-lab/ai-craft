import { getWorkspaceMe } from '@/server/workspace-api/client';
import { createRequestContext } from '@/server/http/request-context';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';

export async function GET(request: Request) {
  const context = createRequestContext(request);
  try {
    const cookie = request.headers.get('cookie') || '';
    const result = await getWorkspaceMe(cookie);
    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Unauthorized', context, 401);
  }
}
