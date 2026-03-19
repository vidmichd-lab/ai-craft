import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { saveWorkspaceSnapshot } from '@/server/workspace-api/client';
import { ensureTemplateProject } from '@/server/workspace-api/templates';

const payloadSchema = z.object({
  name: z.string().trim().min(1),
  state: z.record(z.string(), z.unknown())
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const cookieStore = await cookies();
    const cookie = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
    const displayName = cookieStore.get('workspace_display_name')?.value || '';
    const project = await ensureTemplateProject(cookie, displayName);
    const result = await saveWorkspaceSnapshot(
      {
        projectId: project.id,
        name: payload.name,
        kind: 'template',
        state: payload.state
      },
      cookie
    );
    return NextResponse.json(result.data);
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Template save failed' },
      { status }
    );
  }
}
