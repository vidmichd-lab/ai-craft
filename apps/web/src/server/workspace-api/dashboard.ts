import { cache } from 'react';
import { getSession } from '@/server/auth/session';
import { getCurrentWorkspaceTeam, getWorkspaceTeamMembers } from '@/server/workspace-api/client';

const buildCookieHeader = (cookieStore: { name: string; value: string }[]) =>
  cookieStore.map(({ name, value }) => `${name}=${value}`).join('; ');

export const getWorkspaceDashboard = cache(async (cookieStore: { name: string; value: string }[]) => {
  const session = await getSession();
  if (!session) return null;

  const cookieHeader = buildCookieHeader(cookieStore);
  const [teamResult, membersResult] = await Promise.all([
    getCurrentWorkspaceTeam(cookieHeader).catch(() => null),
    getWorkspaceTeamMembers(cookieHeader).catch(() => null)
  ]);

  return {
    session,
    currentTeam: teamResult?.data || null,
    teamMembers: membersResult?.data || null
  };
});
