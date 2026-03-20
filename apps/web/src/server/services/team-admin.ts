import {
  createAdminWorkspaceUser,
  removeAdminWorkspaceUser,
  resetAdminWorkspaceUserPassword,
  updateAdminWorkspaceTeam,
  updateAdminWorkspaceUserRole
} from '@/server/workspace-api/client';
import type { AuditActor } from '@/server/observability/audit';
import { auditLog } from '@/server/observability/audit';

export const createTeamMember = async (
  input: { teamId: string; email: string; displayName: string; role: 'editor' | 'lead' },
  cookie: string,
  actor?: AuditActor | null
) => {
  const result = await createAdminWorkspaceUser(input, cookie);
  auditLog({
    action: 'team_member.create',
    actor,
    teamId: input.teamId,
    targetId: result.data.user?.id || input.email,
    metadata: {
      email: input.email,
      role: input.role
    }
  });
  return result;
};

export const updateTeamMemberRole = async (
  input: { teamId: string; userId: string; role: 'editor' | 'lead' },
  cookie: string,
  actor?: AuditActor | null
) => {
  const result = await updateAdminWorkspaceUserRole(input, cookie);
  auditLog({
    action: 'team_member.role.update',
    actor,
    teamId: input.teamId,
    targetId: input.userId,
    metadata: {
      role: input.role
    }
  });
  return result;
};

export const removeTeamMember = async (
  input: { teamId: string; userId: string },
  cookie: string,
  actor?: AuditActor | null
) => {
  const result = await removeAdminWorkspaceUser(input, cookie);
  auditLog({
    action: 'team_member.remove',
    actor,
    teamId: input.teamId,
    targetId: input.userId
  });
  return result;
};

export const resetTeamMemberPassword = async (
  input: { teamId: string; userId: string },
  cookie: string,
  actor?: AuditActor | null
) => {
  const result = await resetAdminWorkspaceUserPassword(input, cookie);
  auditLog({
    action: 'team_member.password.reset',
    actor,
    teamId: input.teamId,
    targetId: input.userId
  });
  return result;
};

export const updateTeamSettings = async (
  input: { teamId: string; name: string; slug: string; status: 'active' | 'inactive' },
  cookie: string,
  actor?: AuditActor | null
) => {
  const result = await updateAdminWorkspaceTeam(input, cookie);
  auditLog({
    action: 'team.update',
    actor,
    teamId: input.teamId,
    targetId: input.teamId,
    metadata: {
      name: input.name,
      slug: input.slug,
      status: input.status
    }
  });
  return result;
};
