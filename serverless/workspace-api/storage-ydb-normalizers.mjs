const toIsoOrNull = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
};

const parseJsonDocument = (value, cloneJson, fallback = {}) => {
  if (value === null || value === undefined || value === '') return cloneJson(fallback);
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return cloneJson(fallback);
    }
  }
  if (typeof value === 'object') {
    return cloneJson(value);
  }
  return cloneJson(fallback);
};

export const createYdbNormalizers = ({ cloneJson }) => {
  const normalizeUserRow = (row) => row ? ({
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    status: row.status,
    createdAt: toIsoOrNull(row.created_at),
    updatedAt: toIsoOrNull(row.updated_at),
    lastLoginAt: toIsoOrNull(row.last_login_at)
  }) : null;

  const normalizeMembershipRow = (row) => row ? ({
    teamId: row.team_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    createdAt: toIsoOrNull(row.created_at),
    updatedAt: toIsoOrNull(row.updated_at)
  }) : null;

  const normalizeTeamRow = (row) => row ? ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    settings: parseJsonDocument(row.settings_json, cloneJson),
    createdAt: toIsoOrNull(row.created_at),
    updatedAt: toIsoOrNull(row.updated_at),
    archivedAt: toIsoOrNull(row.archived_at)
  }) : null;

  const normalizeProjectRow = (row) => row ? ({
    teamId: row.team_id,
    id: row.id,
    name: row.name,
    status: row.status,
    description: row.description || '',
    state: parseJsonDocument(row.state_json, cloneJson),
    createdBy: row.created_by,
    createdAt: toIsoOrNull(row.created_at),
    updatedAt: toIsoOrNull(row.updated_at),
    archivedAt: toIsoOrNull(row.archived_at)
  }) : null;

  const normalizeSnapshotRow = (row) => row ? ({
    teamId: row.team_id,
    projectId: row.project_id,
    id: row.id,
    name: row.name,
    kind: row.kind,
    state: parseJsonDocument(row.state_json, cloneJson),
    createdBy: row.created_by,
    createdAt: toIsoOrNull(row.created_at)
  }) : null;

  const normalizeSessionRow = (row) => row ? ({
    userId: row.user_id,
    sessionId: row.session_id,
    teamId: row.team_id,
    refreshTokenHash: row.refresh_token_hash || null,
    expiresAt: toIsoOrNull(row.expires_at),
    createdAt: toIsoOrNull(row.created_at),
    revokedAt: toIsoOrNull(row.revoked_at)
  }) : null;

  const normalizeTeamDefaultsRow = (row) => row ? ({
    teamId: row.team_id,
    version: Number(row.version || 1),
    defaults: parseJsonDocument(row.defaults_json, cloneJson),
    mediaSources: parseJsonDocument(row.media_sources_json, cloneJson),
    createdBy: row.created_by,
    createdAt: toIsoOrNull(row.created_at),
    updatedAt: toIsoOrNull(row.updated_at)
  }) : null;

  return {
    normalizeUserRow,
    normalizeMembershipRow,
    normalizeTeamRow,
    normalizeProjectRow,
    normalizeSnapshotRow,
    normalizeSessionRow,
    normalizeTeamDefaultsRow
  };
};
