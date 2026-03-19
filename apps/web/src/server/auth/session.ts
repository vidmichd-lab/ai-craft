import { cookies } from 'next/headers';
import { cache } from 'react';
import { getWorkspaceMe } from '@/server/workspace-api/client';
import type { WorkspaceMeResponse } from '@/server/workspace-api/schema';

const buildCookieHeader = async () => {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
};

export const getSession = cache(async (): Promise<WorkspaceMeResponse | null> => {
  const cookieHeader = await buildCookieHeader();
  if (!cookieHeader) return null;

  try {
    const { data } = await getWorkspaceMe(cookieHeader);
    return data;
  } catch {
    return null;
  }
});
