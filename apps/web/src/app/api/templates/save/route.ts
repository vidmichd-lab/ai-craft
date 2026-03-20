import { z } from 'zod';
import { cookies } from 'next/headers';
import { createStoredTemplateState, normalizeStoredTemplateState } from '@ai-craft/editor-model';
import { saveWorkspaceSnapshot } from '@/server/workspace-api/client';
import { ensureTemplateProject } from '@/server/workspace-api/templates';
import { createRequestContext } from '@/server/http/request-context';
import { jsonResponse, toRouteErrorResponse } from '@/server/http/response';

const payloadSchema = z.object({
  name: z.string().trim().min(1),
  document: z.record(z.string(), z.unknown()).optional(),
  state: z.record(z.string(), z.unknown()).optional()
}).refine((payload) => Boolean(payload.document || payload.state), {
  message: 'Template payload is required'
});

export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const payload = payloadSchema.parse(await request.json());
    const state = payload.document
      ? createStoredTemplateState(payload.name, payload.document)
      : normalizeStoredTemplateState(payload.state || {}, payload.name);
    const cookieStore = await cookies();
    const cookie = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
    const displayName = cookieStore.get('workspace_display_name')?.value || '';
    const project = await ensureTemplateProject(cookie, displayName);
    const result = await saveWorkspaceSnapshot(
      {
        projectId: project.id,
        name: payload.name,
        kind: 'template',
        state
      },
      cookie
    );
    return jsonResponse(result.data, context);
  } catch (error) {
    return toRouteErrorResponse(error, 'Template save failed', context);
  }
}
