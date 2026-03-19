import { NextResponse } from 'next/server';
import { getWorkspaceMe } from '@/server/workspace-api/client';

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const result = await getWorkspaceMe(cookie);
    const response = NextResponse.json(result.data);
    result.setCookies.forEach((value) => response.headers.append('set-cookie', value));
    return response;
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 401;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status }
    );
  }
}
