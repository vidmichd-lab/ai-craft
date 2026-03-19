import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateWorkspaceProfile } from '@/server/workspace-api/client';

const payloadSchema = z.object({
  displayName: z.string().trim().min(1)
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const cookie = request.headers.get('cookie') || '';
    const result = await updateWorkspaceProfile(payload, cookie);
    const response = NextResponse.json(result.data);
    result.setCookies.forEach((value) => response.headers.append('set-cookie', value));
    return response;
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Profile update failed' },
      { status }
    );
  }
}
