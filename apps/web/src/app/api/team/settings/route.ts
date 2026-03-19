import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspaceAdminSession } from '@/server/auth/request-session';
import { jsonWithCookies, toRouteErrorResponse } from '@/server/http/response';
import { updateTeamSettings } from '@/server/services/team-admin';

const payloadSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  status: z.enum(['active', 'inactive']).default('active')
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const session = await requireWorkspaceAdminSession(request);
    if (!session.ok) return session.response;

    const result = await updateTeamSettings(
      {
        teamId: session.me.team.id,
        ...payload
      },
      session.cookie
    );

    return jsonWithCookies(result.data, result.setCookies);
  } catch (error) {
    return toRouteErrorResponse(error, 'Team settings update failed');
  }
}
