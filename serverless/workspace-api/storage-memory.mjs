export const createMemoryStorage = ({
  config,
  randomUUID,
  toTimestamp,
  cloneJson,
  hashPassword,
  isValidEmail,
  resolveBootstrapRole,
  publicTeamStatuses
}) => {
  const teamId = `team-${config.bootstrapTeamSlug}`;
  const now = toTimestamp();
  const hasBootstrapUser = isValidEmail(config.bootstrapAdminEmail) && !!config.bootstrapAdminPassword;
  const userId = hasBootstrapUser
    ? `user-${config.bootstrapAdminEmail.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'admin'}`
    : '';
  const bootstrapCreatedBy = hasBootstrapUser ? userId : 'system-bootstrap';

  const state = {
    teams: new Map([
      [teamId, {
        id: teamId,
        slug: config.bootstrapTeamSlug,
        name: config.bootstrapTeamName,
        status: 'active',
        settings: {},
        createdAt: now,
        updatedAt: now,
        archivedAt: null
      }]
    ]),
    users: new Map(hasBootstrapUser
      ? [[userId, {
        id: userId,
        email: config.bootstrapAdminEmail,
        passwordHash: hashPassword(config.bootstrapAdminPassword),
        displayName: config.bootstrapAdminName,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null
      }]]
      : []),
    memberships: new Map(hasBootstrapUser
      ? [[`${teamId}:${userId}`, {
        teamId,
        userId,
        role: resolveBootstrapRole(config.bootstrapAdminEmail),
        status: 'active',
        createdAt: now,
        updatedAt: now
      }]]
      : []),
    projects: new Map(),
    snapshots: new Map(),
    teamDefaults: new Map([
      [teamId, {
        teamId,
        version: 1,
        defaults: cloneJson(config.bootstrapDefaultsJson),
        mediaSources: cloneJson(config.bootstrapMediaSourcesJson),
        createdBy: bootstrapCreatedBy,
        createdAt: now,
        updatedAt: now
      }]
    ]),
    sessions: new Map()
  };

  return {
    kind: 'memory',
    async health() {
      return { ready: true, provider: 'memory' };
    },
    async listTeams({ includeArchived = false } = {}) {
      return Array.from(state.teams.values())
        .filter((team) => includeArchived || team.status !== 'archived')
        .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
        .map((team) => cloneJson(team));
    },
    async listPublicTeams() {
      return Array.from(state.teams.values())
        .filter((team) => publicTeamStatuses.has(team.status))
        .sort((left, right) => left.name.localeCompare(right.name, 'ru'))
        .map((team) => cloneJson(team));
    },
    async getTeamById({ teamId }) {
      const team = state.teams.get(teamId);
      return team ? cloneJson(team) : null;
    },
    async getTeamBySlug({ teamSlug }) {
      const team = Array.from(state.teams.values())
        .find((item) => item.slug === teamSlug && publicTeamStatuses.has(item.status));
      return team ? cloneJson(team) : null;
    },
    async createTeam({ slug, name }) {
      const nowValue = toTimestamp();
      const team = {
        id: `team-${randomUUID()}`,
        slug,
        name,
        status: 'active',
        settings: {},
        createdAt: nowValue,
        updatedAt: nowValue,
        archivedAt: null
      };
      state.teams.set(team.id, team);
      return cloneJson(team);
    },
    async updateTeam({ teamId, slug, name, status }) {
      const team = state.teams.get(teamId);
      if (!team) return null;
      if (slug) team.slug = slug;
      if (name) team.name = name;
      if (status === 'active' || status === 'inactive') {
        team.status = status;
        team.archivedAt = status === 'inactive' ? (team.archivedAt || toTimestamp()) : null;
      }
      team.updatedAt = toTimestamp();
      return cloneJson(team);
    },
    async archiveTeam({ teamId }) {
      const team = state.teams.get(teamId);
      if (!team) return null;
      const nowValue = toTimestamp();
      team.status = 'archived';
      team.archivedAt = nowValue;
      team.updatedAt = nowValue;
      return cloneJson(team);
    },
    async getUserByEmail({ email }) {
      const user = Array.from(state.users.values()).find((item) => item.email === email);
      return user ? cloneJson(user) : null;
    },
    async getUserById({ userId }) {
      const user = state.users.get(userId);
      return user ? cloneJson(user) : null;
    },
    async findLoginContext({ email, teamSlug }) {
      const user = Array.from(state.users.values()).find((item) => item.email === email && item.status === 'active');
      if (!user) return null;

      const memberships = Array.from(state.memberships.values())
        .filter((item) => item.userId === user.id && item.status === 'active');

      const team = memberships
        .map((membership) => ({
          membership,
          team: state.teams.get(membership.teamId)
        }))
        .find(({ team }) => team && team.status === 'active' && (!teamSlug || team.slug === teamSlug));

      if (!team) return null;

      return {
        user: cloneJson(user),
        team: cloneJson(team.team),
        membership: cloneJson(team.membership)
      };
    },
    async createUser({ email, password, displayName }) {
      const userId = `user-${randomUUID()}`;
      const nowValue = toTimestamp();
      const user = {
        id: userId,
        email,
        passwordHash: hashPassword(password),
        displayName,
        status: 'active',
        createdAt: nowValue,
        updatedAt: nowValue,
        lastLoginAt: null
      };
      state.users.set(userId, user);
      return cloneJson(user);
    },
    async createMembership({ teamId, userId, role }) {
      const nowValue = toTimestamp();
      const membership = {
        teamId,
        userId,
        role,
        status: 'active',
        createdAt: nowValue,
        updatedAt: nowValue
      };
      state.memberships.set(`${teamId}:${userId}`, membership);
      return cloneJson(membership);
    },
    async updateMembershipRole({ teamId, userId, role }) {
      const membership = state.memberships.get(`${teamId}:${userId}`);
      if (!membership || membership.status !== 'active') return null;

      membership.role = role;
      membership.updatedAt = toTimestamp();
      return cloneJson(membership);
    },
    async listTeamMembers({ teamId, includeInactive = false }) {
      return Array.from(state.memberships.values())
        .filter((membership) => membership.teamId === teamId && (includeInactive || membership.status === 'active'))
        .map((membership) => ({
          membership: cloneJson(membership),
          user: cloneJson(state.users.get(membership.userId))
        }))
        .filter(({ user, membership }) => user && (includeInactive || (user.status === 'active' && membership.status === 'active')))
        .sort((left, right) => left.user.email.localeCompare(right.user.email));
    },
    async updateUserPassword({ userId, passwordHash }) {
      const user = state.users.get(userId);
      if (!user) return null;
      user.passwordHash = passwordHash;
      user.updatedAt = toTimestamp();
      return cloneJson(user);
    },
    async updateUserProfile({ userId, displayName }) {
      const user = state.users.get(userId);
      if (!user) return null;
      user.displayName = displayName;
      user.updatedAt = toTimestamp();
      return cloneJson(user);
    },
    async revokeSessions({ userId, teamId = '' } = {}) {
      const nowValue = toTimestamp();
      Array.from(state.sessions.values()).forEach((session) => {
        if (session.userId !== userId) return;
        if (teamId && session.teamId !== teamId) return;
        session.revokedAt = nowValue;
      });
    },
    async removeUserFromTeam({ teamId, userId }) {
      const membership = state.memberships.get(`${teamId}:${userId}`);
      if (!membership) return null;

      const nowValue = toTimestamp();
      membership.status = 'archived';
      membership.updatedAt = nowValue;

      const user = state.users.get(userId);
      const hasActiveMemberships = Array.from(state.memberships.values())
        .some((item) => item.userId === userId && item.status === 'active');

      if (user && !hasActiveMemberships) {
        user.status = 'inactive';
        user.updatedAt = nowValue;
      }

      await this.revokeSessions({ userId, teamId });
      return {
        user: user ? cloneJson(user) : null,
        membership: cloneJson(membership)
      };
    },
    async updateUserLastLogin({ userId }) {
      const user = state.users.get(userId);
      if (!user) return;
      user.lastLoginAt = toTimestamp();
      user.updatedAt = user.lastLoginAt;
    },
    async createSession({ userId, teamId }) {
      const sessionId = randomUUID();
      const nowValue = toTimestamp();
      const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000).toISOString();
      const session = {
        userId,
        sessionId,
        teamId,
        refreshTokenHash: null,
        createdAt: nowValue,
        expiresAt,
        revokedAt: null
      };
      state.sessions.set(`${userId}:${sessionId}`, session);
      return cloneJson(session);
    },
    async getSessionById({ userId, sessionId }) {
      const session = state.sessions.get(`${userId}:${sessionId}`);
      return session ? cloneJson(session) : null;
    },
    async revokeSession({ userId, sessionId }) {
      const session = state.sessions.get(`${userId}:${sessionId}`);
      if (!session) return;
      session.revokedAt = toTimestamp();
    },
    async getCurrentTeam({ teamId }) {
      const team = state.teams.get(teamId);
      if (!team) return null;
      const defaults = state.teamDefaults.get(teamId) || null;
      return {
        team: cloneJson(team),
        defaults: defaults ? cloneJson(defaults) : null
      };
    },
    async listProjects({ teamId, includeArchived }) {
      return Array.from(state.projects.values())
        .filter((project) => project.teamId === teamId && (includeArchived || project.status !== 'archived'))
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .map((project) => cloneJson(project));
    },
    async createProject({ teamId, createdBy, name, description, state: projectState }) {
      const timestamp = toTimestamp();
      const project = {
        id: randomUUID(),
        teamId,
        name,
        description,
        status: 'active',
        state: cloneJson(projectState || {}),
        createdBy,
        createdAt: timestamp,
        updatedAt: timestamp,
        archivedAt: null
      };
      state.projects.set(`${teamId}:${project.id}`, project);
      return cloneJson(project);
    },
    async getProject({ teamId, projectId }) {
      const project = state.projects.get(`${teamId}:${projectId}`);
      return project ? cloneJson(project) : null;
    },
    async updateProject({ teamId, projectId, name, description, state: projectState }) {
      const project = state.projects.get(`${teamId}:${projectId}`);
      if (!project) return null;
      if (typeof name === 'string' && name) project.name = name;
      if (typeof description === 'string') project.description = description;
      if (projectState) project.state = cloneJson(projectState);
      project.updatedAt = toTimestamp();
      return cloneJson(project);
    },
    async archiveProject({ teamId, projectId }) {
      const project = state.projects.get(`${teamId}:${projectId}`);
      if (!project) return null;
      project.status = 'archived';
      project.archivedAt = toTimestamp();
      project.updatedAt = project.archivedAt;
      return cloneJson(project);
    },
    async listSnapshots({ teamId, projectId = '', kind }) {
      return Array.from(state.snapshots.values())
        .filter((snapshot) => snapshot.teamId === teamId && (!projectId || snapshot.projectId === projectId) && (!kind || snapshot.kind === kind))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .map((snapshot) => cloneJson(snapshot));
    },
    async createSnapshot({ teamId, projectId, createdBy, name, kind, state: snapshotState }) {
      const timestamp = toTimestamp();
      const snapshot = {
        id: randomUUID(),
        teamId,
        projectId,
        name,
        kind,
        state: cloneJson(snapshotState),
        createdBy,
        createdAt: timestamp
      };
      state.snapshots.set(`${teamId}:${projectId}:${snapshot.id}`, snapshot);

      const project = state.projects.get(`${teamId}:${projectId}`);
      if (project && kind === 'snapshot') {
        project.state = cloneJson(snapshotState);
        project.updatedAt = timestamp;
      }

      return cloneJson(snapshot);
    },
    async getTeamDefaults({ teamId }) {
      const defaults = state.teamDefaults.get(teamId);
      return defaults ? cloneJson(defaults) : null;
    },
    async saveTeamDefaults({ teamId, createdBy, defaults, mediaSources }) {
      const existing = state.teamDefaults.get(teamId);
      const timestamp = toTimestamp();
      const next = {
        teamId,
        version: existing ? existing.version + 1 : 1,
        defaults: cloneJson(defaults || {}),
        mediaSources: cloneJson(mediaSources || {}),
        createdBy,
        createdAt: existing ? existing.createdAt : timestamp,
        updatedAt: timestamp
      };
      state.teamDefaults.set(teamId, next);
      return cloneJson(next);
    }
  };
};
