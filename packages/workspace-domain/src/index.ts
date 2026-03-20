export type WorkspaceActorLike = {
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  isSuperadmin?: boolean | null;
};

export const normalizeWorkspaceRole = (role?: string | null, isSuperadmin = false) => {
  if (isSuperadmin || role === 'superadmin') return 'admin';
  return role || 'editor';
};

export const formatWorkspaceRoleLabel = (role?: string | null, isSuperadmin = false) =>
  normalizeWorkspaceRole(role, isSuperadmin);

export const canManageWorkspaceMembers = (actor?: WorkspaceActorLike | null) =>
  normalizeWorkspaceRole(actor?.role, Boolean(actor?.isSuperadmin)) === 'admin';

export const canManageWorkspaceTeamSettings = canManageWorkspaceMembers;

export const getWorkspaceActorName = (actor?: WorkspaceActorLike | null) =>
  actor?.displayName?.trim() || actor?.email || '';
