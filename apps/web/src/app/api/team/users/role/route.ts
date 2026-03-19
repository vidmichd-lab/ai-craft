import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspaceAdminSession } from '@/server/auth/request-session';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';
import { updateTeamMemberRole } from '@/server/services/team-admin';

const payloadSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(['editor', 'lead'])
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const session = await requireWorkspaceAdminSession(request);
    if (!session.ok) return session.response;

    const result = await updateTeamMemberRole(
      {
        teamId: session.me.team.id,
        ...payload
      },
      session.cookie
    );

    return jsonWithCookies(result.data, result.setCookies);
  } catch (error) {
    return toRouteErrorResponse(error, 'Role update failed');
  }
}
