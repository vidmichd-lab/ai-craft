import { z } from 'zod';
import { requireWorkspaceSession } from '@/server/auth/request-session';
import { updateWorkspaceProfile } from '@/server/workspace-api/client';
import { createRequestContext } from '@/server/http/request-context';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';
import { auditLog } from '@/server/observability/audit';

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
    auditLog({
      action: 'account.profile.update',
      actor: {
        id: session.me.user.id,
        email: session.me.user.email,
        role: session.role
      },
      teamId: session.me.team.id,
      targetId: session.me.user.id,
      metadata: {
        previousDisplayName: session.me.user.displayName || '',
        displayName: payload.displayName
      }
    });
    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Profile update failed', context);
  }
}
