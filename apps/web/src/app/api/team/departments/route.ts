import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspaceAdminSession } from '@/server/auth/request-session';
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
  try {
    const payload = payloadSchema.parse(await request.json());
    const session = await requireWorkspaceAdminSession(request);
    if (!session.ok) return session.response;

    const result = await saveTeamDepartments(payload, session.cookie);

    return jsonWithCookies(result.data, result.setCookies);
  } catch (error) {
    return toRouteErrorResponse(error, 'Department update failed');
  }
}
