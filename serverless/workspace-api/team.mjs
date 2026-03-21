export const createWorkspaceTeamHandlers = ({
  auth,
  storage,
  json,
  toError,
  withStorageErrors,
  parseBody,
  cloneJson,
  sanitizeState,
  teamDefaultsRoles,
  buildPublicTeam,
  buildAdminMember
}) => {
  const handleCurrentTeam = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }

    const currentTeam = await storage.getCurrentTeam({ teamId: session.teamId });
    if (!currentTeam?.team) {
      return json(404, toError('Team not found', { teamId: session.teamId }), origin);
    }

    return json(200, {
      ok: true,
      team: {
        id: currentTeam.team.id,
        slug: currentTeam.team.slug,
        name: currentTeam.team.name,
        status: currentTeam.team.status,
        settings: cloneJson(currentTeam.team.settings || {})
      },
      defaults: currentTeam.defaults
        ? {
          version: currentTeam.defaults.version,
          defaults: cloneJson(currentTeam.defaults.defaults || {}),
          mediaSources: cloneJson(currentTeam.defaults.mediaSources || {}),
          updatedAt: currentTeam.defaults.updatedAt
        }
        : null
    }, origin);
  });

  const handleTeamMembers = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }
    if (!auth.requireSuperAdmin(session) && !auth.requireRole(session, [...teamDefaultsRoles])) {
      return json(403, toError('Forbidden'), origin);
    }

    const currentTeam = await storage.getCurrentTeam({ teamId: session.teamId });
    if (!currentTeam?.team) {
      return json(404, toError('Team not found', { teamId: session.teamId }), origin);
    }

    const users = await storage.listTeamMembers({ teamId: session.teamId, includeInactive: true });
    return json(200, {
      ok: true,
      team: buildPublicTeam(currentTeam.team),
      users: users.map(buildAdminMember)
    }, origin);
  });

  const handleGetTeamDefaults = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }

    const defaults = await storage.getTeamDefaults({ teamId: session.teamId });
    return json(200, {
      ok: true,
      teamId: session.teamId,
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

  const handleSaveTeamDefaults = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }
    if (!auth.requireRole(session, [...teamDefaultsRoles])) {
      return json(403, toError('Forbidden'), origin);
    }

    const body = parseBody(event);
    const defaults = sanitizeState(body.defaults) || {};
    const mediaSources = sanitizeState(body.mediaSources) || {};
    const saved = await storage.saveTeamDefaults({
      teamId: session.teamId,
      createdBy: session.sub,
      defaults,
      mediaSources
    });

    return json(200, {
      ok: true,
      teamId: session.teamId,
      defaults: {
        version: saved.version,
        defaults: cloneJson(saved.defaults),
        mediaSources: cloneJson(saved.mediaSources),
        updatedAt: saved.updatedAt
      }
    }, origin);
  });

  return {
    handleCurrentTeam,
    handleTeamMembers,
    handleGetTeamDefaults,
    handleSaveTeamDefaults
  };
};
