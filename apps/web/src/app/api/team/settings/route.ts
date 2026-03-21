import { z } from 'zod';
import { requireWorkspaceSuperadminSession } from '@/server/auth/request-session';
import { createRequestContext } from '@/server/http/request-context';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';
import { updateTeamSettings } from '@/server/services/team-admin';

const payloadSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  status: z.enum(['active', 'inactive']).default('active')
});

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const payload = payloadSchema.parse(await request.json());
    const session = await requireWorkspaceSuperadminSession(request, context);
    if (!session.ok) return session.response;

    const result = await updateTeamSettings(
      {
        teamId: session.me.team.id,
        ...payload
      },
      session.cookie,
      session.me.user
    );

    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Team settings update failed', context);
  }
}
