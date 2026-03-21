import { z } from 'zod';
import { requireWorkspaceSuperadminSession } from '@/server/auth/request-session';
import { createRequestContext } from '@/server/http/request-context';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';
import { removeTeamMember } from '@/server/services/team-admin';

const payloadSchema = z.object({
  userId: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const payload = payloadSchema.parse(await request.json());
    const session = await requireWorkspaceSuperadminSession(request, context);
    if (!session.ok) return session.response;

    const result = await removeTeamMember(
      {
        teamId: session.me.team.id,
        userId: payload.userId
      },
      session.cookie,
      session.me.user
    );

    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'User removal failed', context);
  }
}
