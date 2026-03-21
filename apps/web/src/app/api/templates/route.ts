import { requireWorkspaceSession } from '@/server/auth/request-session';
import { getWorkspaceTemplates } from '@/server/workspace-api/templates';
import { createRequestContext } from '@/server/http/request-context';
import { jsonResponse, toRouteErrorResponse } from '@/server/http/response';

export async function GET(request: Request) {
  const context = createRequestContext(request);
  try {
    const session = await requireWorkspaceSession(request, context);
    if (!session.ok) return session.response;

    const templates = await getWorkspaceTemplates(session.cookie);
    return jsonResponse({ ok: true, templates }, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Templates fetch failed', context);
  }
}
