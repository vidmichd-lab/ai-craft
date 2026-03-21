import { z } from 'zod';
import { requireWorkspaceSession } from '@/server/auth/request-session';
import { updateWorkspaceProfile } from '@/server/workspace-api/client';
import { createRequestContext } from '@/server/http/request-context';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';

const payloadSchema = z.object({
  displayName: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const payload = payloadSchema.parse(await request.json());
    const session = await requireWorkspaceSession(request, context);
    if (!session.ok) return session.response;

    const result = await updateWorkspaceProfile(payload, session.cookie);
    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Profile update failed', context);
  }
}
