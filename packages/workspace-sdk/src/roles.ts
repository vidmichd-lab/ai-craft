export const formatWorkspaceRole = (role: string, isSuperadmin = false) => {
  if (isSuperadmin || role === 'superadmin') return 'admin';
  return role;
};
