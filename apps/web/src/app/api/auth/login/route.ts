import { loginWorkspaceInputSchema } from '@/server/workspace-api/schema';
import { loginWorkspace } from '@/server/workspace-api/client';
import { createRequestContext } from '@/server/http/request-context';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const payload = loginWorkspaceInputSchema.parse(await request.json());
    const result = await loginWorkspace(payload);
    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Login failed', context);
  }
}
