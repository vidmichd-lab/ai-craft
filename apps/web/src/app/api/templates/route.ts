import { cookies } from 'next/headers';
import { getWorkspaceTemplates } from '@/server/workspace-api/templates';
import { createRequestContext } from '@/server/http/request-context';
import { jsonResponse, toRouteErrorResponse } from '@/server/http/response';

export async function GET(request: Request) {
  const context = createRequestContext(request);
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
    const templates = await getWorkspaceTemplates(cookie);
    return jsonResponse({ ok: true, templates }, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Templates fetch failed', context);
  }
}
