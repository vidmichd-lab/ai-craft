import { getCurrentWorkspaceTeam, saveWorkspaceTeamDefaults } from '@/server/workspace-api/client';
import { removeDepartment, upsertDepartment } from '@/server/workspace-api/departments';
import type { AuditActor } from '@/server/observability/audit';
import { auditLog } from '@/server/observability/audit';

type DepartmentPayload =
  | { action: 'upsert'; id?: string; name: string; slug: string }
  | { action: 'remove'; departmentId: string };

export const saveTeamDepartments = async (
  payload: DepartmentPayload,
  cookie: string,
  actor?: AuditActor | null
) => {
  const teamResult = await getCurrentWorkspaceTeam(cookie);
  const currentDefaults = teamResult.data.defaults?.defaults || {};
  const currentMediaSources = teamResult.data.defaults?.mediaSources || {};

  const nextDefaults =
    payload.action === 'remove'
      ? removeDepartment(currentDefaults, payload.departmentId)
      : upsertDepartment(currentDefaults, {
          id: payload.id,
          name: payload.name,
          slug: payload.slug
        });

  const result = await saveWorkspaceTeamDefaults(
    {
      defaults: nextDefaults,
      mediaSources: currentMediaSources
    },
    cookie
  );

  auditLog({
    action: payload.action === 'remove' ? 'department.remove' : 'department.upsert',
    actor,
    teamId: teamResult.data.team.id,
    targetId: payload.action === 'remove' ? payload.departmentId : payload.id || payload.slug,
    metadata: payload.action === 'remove'
      ? {}
      : {
          name: payload.name,
          slug: payload.slug
        }
  });

  return result;
};
