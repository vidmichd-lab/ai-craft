import { z } from 'zod';
import { requireWorkspaceRoleSession } from '@/server/auth/request-session';
import { createRequestContext } from '@/server/http/request-context';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';
import { saveTeamDepartments } from '@/server/services/team-departments';

const payloadSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('upsert'),
    id: z.string().optional(),
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1)
  }),
  z.object({
    action: z.literal('remove'),
    departmentId: z.string().trim().min(1)
  })
]);

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const payload = payloadSchema.parse(await request.json());
    const session = await requireWorkspaceRoleSession(request, ['admin', 'lead'], context);
    if (!session.ok) return session.response;

    const result = await saveTeamDepartments(payload, session.cookie, session.me.user);

    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Department update failed', context);
  }
}
