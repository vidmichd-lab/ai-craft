import {
  createAdminWorkspaceUser,
  removeAdminWorkspaceUser,
  resetAdminWorkspaceUserPassword,
  updateAdminWorkspaceTeam,
  updateAdminWorkspaceUserRole
} from '@/server/workspace-api/client';

export const createTeamMember = (
  input: { teamId: string; email: string; displayName: string; role: 'editor' | 'lead' },
  cookie: string
) => createAdminWorkspaceUser(input, cookie);

export const updateTeamMemberRole = (
  input: { teamId: string; userId: string; role: 'editor' | 'lead' },
  cookie: string
) => updateAdminWorkspaceUserRole(input, cookie);

export const removeTeamMember = (
  input: { teamId: string; userId: string },
  cookie: string
) => removeAdminWorkspaceUser(input, cookie);

export const resetTeamMemberPassword = (
  input: { teamId: string; userId: string },
  cookie: string
) => resetAdminWorkspaceUserPassword(input, cookie);

export const updateTeamSettings = (
  input: { teamId: string; name: string; slug: string; status: 'active' | 'inactive' },
  cookie: string
) => updateAdminWorkspaceTeam(input, cookie);
