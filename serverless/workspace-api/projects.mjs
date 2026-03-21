export const createWorkspaceProjectHandlers = ({
  auth,
  storage,
  json,
  toError,
  withStorageErrors,
  parseBody,
  parseBoolean,
  sanitizeText,
  sanitizeState,
  sanitizeProjectName,
  projectRoles,
  buildPublicProject,
  buildPublicSnapshot,
  enrichSnapshotsWithAuthors
}) => {
  const handleListProjects = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }

    const params = event?.queryStringParameters || {};
    const includeArchived = parseBoolean(params.includeArchived, false);
    const projects = await storage.listProjects({
      teamId: session.teamId,
      includeArchived
    });

    return json(200, {
      ok: true,
      projects: projects.map(buildPublicProject)
    }, origin);
  });

  const handleCreateProject = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }
    if (!auth.requireRole(session, [...projectRoles])) {
      return json(403, toError('Forbidden'), origin);
    }

    const body = parseBody(event);
    const name = sanitizeProjectName(body.name);
    const description = sanitizeText(body.description, 500);
    const projectState = sanitizeState(body.state) || {};
    if (!name) {
      return json(400, toError('Project name is required'), origin);
    }

    const project = await storage.createProject({
      teamId: session.teamId,
      createdBy: session.sub,
      name,
      description,
      state: projectState
    });

    return json(200, {
      ok: true,
      project: buildPublicProject(project)
    }, origin);
  });

  const handleUpdateProject = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }
    if (!auth.requireRole(session, [...projectRoles])) {
      return json(403, toError('Forbidden'), origin);
    }

    const body = parseBody(event);
    const projectId = sanitizeText(body.projectId, 200);
    const name = body.name === undefined ? undefined : sanitizeProjectName(body.name);
    const description = body.description === undefined ? undefined : sanitizeText(body.description, 500);
    const projectState = body.state === undefined ? undefined : sanitizeState(body.state);

    if (!projectId) {
      return json(400, toError('projectId is required'), origin);
    }
    if (body.name !== undefined && !name) {
      return json(400, toError('name cannot be empty'), origin);
    }

    const updated = await storage.updateProject({
      teamId: session.teamId,
      projectId,
      name,
      description,
      state: projectState
    });

    if (!updated) {
      return json(404, toError('Project not found', { projectId }), origin);
    }

    return json(200, {
      ok: true,
      project: buildPublicProject(updated)
    }, origin);
  });

  const handleArchiveProject = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }
    if (!auth.requireRole(session, ['admin'])) {
      return json(403, toError('Forbidden'), origin);
    }

    const body = parseBody(event);
    const projectId = sanitizeText(body.projectId, 200);
    if (!projectId) {
      return json(400, toError('projectId is required'), origin);
    }

    const archived = await storage.archiveProject({
      teamId: session.teamId,
      projectId
    });
    if (!archived) {
      return json(404, toError('Project not found', { projectId }), origin);
    }

    return json(200, {
      ok: true,
      project: buildPublicProject(archived)
    }, origin);
  });

  const handleListSnapshots = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }

    const params = event?.queryStringParameters || {};
    const projectId = sanitizeText(params.projectId, 200);
    const kind = params.kind === 'template' ? 'template' : params.kind === 'snapshot' ? 'snapshot' : '';
    if (!projectId && !kind) {
      return json(400, toError('projectId is required'), origin);
    }

    if (projectId) {
      const project = await storage.getProject({ teamId: session.teamId, projectId });
      if (!project) {
        return json(404, toError('Project not found', { projectId }), origin);
      }
    }

    const snapshots = await storage.listSnapshots({
      teamId: session.teamId,
      projectId,
      kind
    });
    const snapshotsWithAuthors = await enrichSnapshotsWithAuthors(snapshots);

    return json(200, {
      ok: true,
      snapshots: snapshotsWithAuthors.map(buildPublicSnapshot)
    }, origin);
  });

  const handleSaveSnapshot = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await auth.requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }
    if (!auth.requireRole(session, [...projectRoles])) {
      return json(403, toError('Forbidden'), origin);
    }

    const body = parseBody(event);
    const projectId = sanitizeText(body.projectId, 200);
    const name = sanitizeProjectName(body.name);
    const kind = body.kind === 'template' ? 'template' : 'snapshot';
    const snapshotState = sanitizeState(body.state);

    if (!projectId || !name || !snapshotState) {
      return json(400, toError('projectId, name and state are required'), origin);
    }

    const project = await storage.getProject({ teamId: session.teamId, projectId });
    if (!project) {
      return json(404, toError('Project not found', { projectId }), origin);
    }

    const snapshot = await storage.createSnapshot({
      teamId: session.teamId,
      projectId,
      createdBy: session.sub,
      name,
      kind,
      state: snapshotState
    });
    const [snapshotWithAuthor] = await enrichSnapshotsWithAuthors([snapshot]);

    return json(200, {
      ok: true,
      snapshot: buildPublicSnapshot(snapshotWithAuthor)
    }, origin);
  });

  return {
    handleListProjects,
    handleCreateProject,
    handleUpdateProject,
    handleArchiveProject,
    handleListSnapshots,
    handleSaveSnapshot
  };
};
