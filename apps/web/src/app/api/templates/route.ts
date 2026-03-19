import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getWorkspaceTemplates } from '@/server/workspace-api/templates';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
    const templates = await getWorkspaceTemplates(cookie);
    return NextResponse.json({ ok: true, templates });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Templates fetch failed' },
      { status }
    );
  }
}
