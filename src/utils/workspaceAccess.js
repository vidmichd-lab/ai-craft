const cloneAccessState = (state) => ({
  apiEnabled: !!state.apiEnabled,
  ready: !!state.ready,
  user: state.user && typeof state.user === 'object' ? { ...state.user } : null,
  team: state.team && typeof state.team === 'object' ? { ...state.team } : null
});

let workspaceAccessState = cloneAccessState({
  apiEnabled: false,
  ready: false,
  user: null,
  team: null
});

const normalizeRole = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

export const setWorkspaceAccessState = (nextState = {}) => {
  workspaceAccessState = cloneAccessState(nextState);

  if (typeof window !== 'undefined') {
    window.__WORKSPACE_ACCESS__ = cloneAccessState(workspaceAccessState);
  }

  return cloneAccessState(workspaceAccessState);
};

export const getWorkspaceAccessState = () => cloneAccessState(workspaceAccessState);

export const isWorkspaceAccessControlled = () => !!workspaceAccessState.apiEnabled;

export const hasWorkspaceSession = () => !!workspaceAccessState.user && !!workspaceAccessState.team;

export const getWorkspaceRole = () => normalizeRole(workspaceAccessState.user?.role);

export const canManageWorkspaceTeamDefaults = () => {
  if (!workspaceAccessState.apiEnabled) return false;
  if (workspaceAccessState.user?.isSuperadmin) return true;
  return ['admin', 'lead'].includes(getWorkspaceRole());
};

export const canManageWorkspaceSystem = () => !!workspaceAccessState.user?.isSuperadmin;
