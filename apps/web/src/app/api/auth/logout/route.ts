import { NextResponse } from 'next/server';
import { logoutWorkspace } from '@/server/workspace-api/client';

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const result = await logoutWorkspace(cookie);
    const response = NextResponse.json(result.data);
    result.setCookies.forEach((value) => response.headers.append('set-cookie', value));
    return response;
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Logout failed' },
      { status }
    );
  }
}
