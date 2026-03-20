import { z } from 'zod';
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
    const cookie = request.headers.get('cookie') || '';
    const result = await updateWorkspaceProfile(payload, cookie);
    return jsonWithCookies(result.data, result.setCookies, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Profile update failed', context);
  }
}
