import { NextResponse } from 'next/server';

export const appendSetCookies = (response: NextResponse, setCookies: string[] = []) => {
  setCookies.forEach((value) => response.headers.append('set-cookie', value));
  return response;
};

export const jsonWithCookies = <T>(payload: T, setCookies: string[] = []) =>
  appendSetCookies(NextResponse.json(payload), setCookies);

export const toRouteErrorResponse = (error: unknown, fallbackMessage: string) => {
  const status = (error as Error & { status?: number }).status || 400;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status }
  );
};
