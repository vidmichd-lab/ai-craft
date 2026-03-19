import { NextResponse } from 'next/server';
import { loginWorkspaceInputSchema } from '@/server/workspace-api/schema';
import { loginWorkspace } from '@/server/workspace-api/client';

export async function POST(request: Request) {
  try {
    const payload = loginWorkspaceInputSchema.parse(await request.json());
    const result = await loginWorkspace(payload);
    const response = NextResponse.json(result.data);
    result.setCookies.forEach((value) => response.headers.append('set-cookie', value));
    return response;
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status }
    );
  }
}
