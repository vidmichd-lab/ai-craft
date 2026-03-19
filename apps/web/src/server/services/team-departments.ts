import { getCurrentWorkspaceTeam, saveWorkspaceTeamDefaults } from '@/server/workspace-api/client';
import { removeDepartment, upsertDepartment } from '@/server/workspace-api/departments';

type DepartmentPayload =
  | { action: 'upsert'; id?: string; name: string; slug: string }
  | { action: 'remove'; departmentId: string };

export const saveTeamDepartments = async (payload: DepartmentPayload, cookie: string) => {
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

  return saveWorkspaceTeamDefaults(
    {
      defaults: nextDefaults,
      mediaSources: currentMediaSources
    },
    cookie
  );
};
