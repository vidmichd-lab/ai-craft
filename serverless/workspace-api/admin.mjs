export const createWorkspaceAdminHandlers = ({
  auth,
  storage,
  json,
  toError,
  withStorageErrors,
  parseBody,
  cloneJson,
  sanitizeText,
  sanitizeTeamSlug,
  sanitizeEmail,
  sanitizeDisplayName,
  sanitizeState,
  normalizeRole,
  isValidEmail,
  isAssignableRole,
  isSuperAdminEmail,
  resolveDefaultRole,
  resolveRequestedRole,
  generatePassword,
  hashPassword,
  buildAdminTeam,
  buildAdminMember
}) => {
  const requireAdminSession = async (event, origin) => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return { ok: false, response: json(401, toError('Unauthorized'), origin) };
    }
    if (!auth.requireSuperAdmin(session)) {
      return { ok: false, response: json(403, toError('Forbidden'), origin) };
    }
    return { ok: true, session };
  };

  const handleAdminListTeams = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const teams = await storage.listTeams({ includeArchived: true });
    return json(200, {
      ok: true,
      teams: teams.map(buildAdminTeam)
    }, origin);
  });

  const handleAdminCreateTeam = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const body = parseBody(event);
    const name = sanitizeText(body.name, 120);
    const slug = sanitizeTeamSlug(body.slug || name);

    if (!name || !slug) {
      return json(400, toError('name and slug are required'), origin);
    }

    const teams = await storage.listTeams({ includeArchived: true });
    if (teams.some((team) => team.slug === slug)) {
      return json(409, toError('Team slug already exists', { slug }), origin);
    }

    const team = await storage.createTeam({ slug, name });
    await storage.createMembership({
      teamId: team.id,
      userId: access.session.sub,
      role: 'admin'
    });

    return json(200, {
      ok: true,
      team: buildAdminTeam(team)
    }, origin);
  });

  const handleAdminUpdateTeam = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const body = parseBody(event);
    const teamId = sanitizeText(body.teamId, 200);
    const name = sanitizeText(body.name, 120);
    const slug = sanitizeTeamSlug(body.slug || name);
    const status = sanitizeText(body.status, 32).toLowerCase();

    if (!teamId || !name || !slug) {
      return json(400, toError('teamId, name and slug are required'), origin);
    }
    if (status && !['active', 'inactive'].includes(status)) {
      return json(400, toError('status must be active or inactive'), origin);
    }

    const teams = await storage.listTeams({ includeArchived: true });
    if (teams.some((team) => team.id !== teamId && team.slug === slug)) {
      return json(409, toError('Team slug already exists', { slug }), origin);
    }

    const updated = await storage.updateTeam({ teamId, name, slug, status: status || undefined });
    if (!updated) {
      return json(404, toError('Team not found', { teamId }), origin);
    }

    return json(200, {
      ok: true,
      team: buildAdminTeam(updated)
    }, origin);
  });

  const handleAdminArchiveTeam = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const body = parseBody(event);
    const teamId = sanitizeText(body.teamId, 200);

    if (!teamId) {
      return json(400, toError('teamId is required'), origin);
    }
    if (teamId === access.session.teamId) {
      return json(400, toError('Cannot archive the current session team'), origin);
    }

    const archived = await storage.archiveTeam({ teamId });
    if (!archived) {
      return json(404, toError('Team not found', { teamId }), origin);
    }

    return json(200, {
      ok: true,
      team: buildAdminTeam(archived)
    }, origin);
  });

  const handleAdminListUsers = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const params = event?.queryStringParameters || {};
    const teamId = sanitizeText(params.teamId, 200) || access.session.teamId;
    const team = await storage.getTeamById({ teamId });
    if (!team) {
      return json(404, toError('Team not found', { teamId }), origin);
    }

    const users = await storage.listTeamMembers({ teamId, includeInactive: true });
    return json(200, {
      ok: true,
      team: buildAdminTeam(team),
      users: users.map(buildAdminMember)
    }, origin);
  });

  const handleAdminCreateUser = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const body = parseBody(event);
    const teamId = sanitizeText(body.teamId, 200) || access.session.teamId;
    const email = sanitizeEmail(body.email);
    const displayName = sanitizeDisplayName(body.displayName) || email.split('@')[0];
    const requestedRole = normalizeRole(body.role);

    if (!teamId || !email) {
      return json(400, toError('teamId and email are required'), origin);
    }
    if (!isValidEmail(email)) {
      return json(400, toError('Invalid email'), origin);
    }
    if (body.role !== undefined && !isAssignableRole(requestedRole)) {
      return json(400, toError('role must be editor or lead'), origin);
    }

    const team = await storage.getTeamById({ teamId });
    if (!team || team.status !== 'active') {
      return json(404, toError('Active team not found', { teamId }), origin);
    }

    const existingUser = await storage.getUserByEmail({ email });
    if (existingUser) {
      return json(409, toError('Account already exists', { email }), origin);
    }

    const generatedPassword = generatePassword();
    const user = await storage.createUser({
      email,
      password: generatedPassword,
      displayName
    });
    const membership = await storage.createMembership({
      teamId,
      userId: user.id,
      role: isSuperAdminEmail(email) ? 'admin' : resolveRequestedRole(body.role, resolveDefaultRole())
    });

    return json(200, {
      ok: true,
      user: buildAdminMember({ user, membership }),
      generatedPassword
    }, origin);
  });

  const handleAdminUpdateUserRole = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const body = parseBody(event);
    const teamId = sanitizeText(body.teamId, 200) || access.session.teamId;
    const userId = sanitizeText(body.userId, 200);
    const role = normalizeRole(body.role);

    if (!teamId || !userId || !role) {
      return json(400, toError('teamId, userId and role are required'), origin);
    }
    if (!isAssignableRole(role)) {
      return json(400, toError('role must be editor or lead'), origin);
    }
    if (userId === access.session.sub) {
      return json(400, toError('Cannot change the current admin role'), origin);
    }

    const targetUser = await storage.getUserById({ userId });
    if (!targetUser) {
      return json(404, toError('User not found', { userId }), origin);
    }
    if (isSuperAdminEmail(targetUser.email)) {
      return json(403, toError('Cannot change an admin role'), origin);
    }

    const members = await storage.listTeamMembers({ teamId, includeInactive: true });
    const member = members.find((item) => item.user?.id === userId && item.membership?.status === 'active');
    if (!member) {
      return json(404, toError('User not found in team', { teamId, userId }), origin);
    }

    const membership = await storage.updateMembershipRole({ teamId, userId, role });
    if (!membership) {
      return json(404, toError('User membership not found', { teamId, userId }), origin);
    }

    await storage.revokeSessions({ userId, teamId });

    return json(200, {
      ok: true,
      user: buildAdminMember({
        user: targetUser,
        membership
      })
    }, origin);
  });

  const handleAdminResetUserPassword = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const body = parseBody(event);
    const teamId = sanitizeText(body.teamId, 200) || access.session.teamId;
    const userId = sanitizeText(body.userId, 200);

    if (!teamId || !userId) {
      return json(400, toError('teamId and userId are required'), origin);
    }

    const members = await storage.listTeamMembers({ teamId, includeInactive: true });
    const member = members.find((item) => item.user?.id === userId);
    if (!member) {
      return json(404, toError('User not found in team', { teamId, userId }), origin);
    }

    const generatedPassword = generatePassword();
    const updatedUser = await storage.updateUserPassword({
      userId,
      passwordHash: hashPassword(generatedPassword)
    });
    await storage.revokeSessions({ userId });

    return json(200, {
      ok: true,
      user: buildAdminMember({
        user: updatedUser || member.user,
        membership: member.membership
      }),
      generatedPassword
    }, origin);
  });

  const handleAdminRemoveUser = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const body = parseBody(event);
    const teamId = sanitizeText(body.teamId, 200) || access.session.teamId;
    const userId = sanitizeText(body.userId, 200);

    if (!teamId || !userId) {
      return json(400, toError('teamId and userId are required'), origin);
    }
    if (userId === access.session.sub) {
      return json(400, toError('Cannot remove the current admin account'), origin);
    }

    const targetUser = await storage.getUserById({ userId });
    if (!targetUser) {
      return json(404, toError('User not found', { userId }), origin);
    }
    if (isSuperAdminEmail(targetUser.email)) {
      return json(403, toError('Cannot remove an admin account'), origin);
    }

    const removed = await storage.removeUserFromTeam({ teamId, userId });
    if (!removed) {
      return json(404, toError('User not found in team', { teamId, userId }), origin);
    }

    return json(200, {
      ok: true,
      removed: true
    }, origin);
  });

  const handleAdminGetTeamDefaults = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const params = event?.queryStringParameters || {};
    const teamId = sanitizeText(params.teamId, 200);
    if (!teamId) {
      return json(400, toError('teamId is required'), origin);
    }

    const team = await storage.getTeamById({ teamId });
    if (!team) {
      return json(404, toError('Team not found', { teamId }), origin);
    }

    const defaults = await storage.getTeamDefaults({ teamId });
    return json(200, {
      ok: true,
      teamId,
      team: buildAdminTeam(team),
      defaults: defaults
        ? {
          version: defaults.version,
          defaults: cloneJson(defaults.defaults || {}),
          mediaSources: cloneJson(defaults.mediaSources || {}),
          updatedAt: defaults.updatedAt
        }
        : null
    }, origin);
  });

  const handleAdminSaveTeamDefaults = async (event, origin) => withStorageErrors(origin, async () => {
    const access = await requireAdminSession(event, origin);
    if (!access.ok) return access.response;

    const body = parseBody(event);
    const teamId = sanitizeText(body.teamId, 200);
    const defaults = sanitizeState(body.defaults) || {};
    const mediaSources = sanitizeState(body.mediaSources) || {};

    if (!teamId) {
      return json(400, toError('teamId is required'), origin);
    }

    const team = await storage.getTeamById({ teamId });
    if (!team) {
      return json(404, toError('Team not found', { teamId }), origin);
    }

    const saved = await storage.saveTeamDefaults({
      teamId,
      createdBy: access.session.sub,
      defaults,
      mediaSources
    });

    return json(200, {
      ok: true,
      teamId,
      defaults: {
        version: saved.version,
        defaults: cloneJson(saved.defaults),
        mediaSources: cloneJson(saved.mediaSources),
        updatedAt: saved.updatedAt
      }
    }, origin);
  });

  return {
    handleAdminListTeams,
    handleAdminCreateTeam,
    handleAdminUpdateTeam,
    handleAdminArchiveTeam,
    handleAdminListUsers,
    handleAdminCreateUser,
    handleAdminUpdateUserRole,
    handleAdminResetUserPassword,
    handleAdminRemoveUser,
    handleAdminGetTeamDefaults,
    handleAdminSaveTeamDefaults
  };
};
