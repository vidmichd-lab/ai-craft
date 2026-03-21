import {
  createYdbClient,
  jsonDocumentValue,
  optionalTimestamp,
  TypedValues,
  Types
} from './storage-ydb-client.mjs';
import { createYdbNormalizers } from './storage-ydb-normalizers.mjs';

export const createYdbStorage = ({
  config,
  randomUUID,
  toTimestamp,
  cloneJson,
  hashPassword
}) => {
  const {
    getYdbDriver,
    executeYdbQuery,
    queryRows,
    queryRow
  } = createYdbClient({ config });
  const {
    normalizeUserRow,
    normalizeMembershipRow,
    normalizeTeamRow,
    normalizeProjectRow,
    normalizeSnapshotRow,
    normalizeSessionRow,
    normalizeTeamDefaultsRow
  } = createYdbNormalizers({ cloneJson });

  return {
    kind: 'ydb',
    async health() {
      if (!config.ydbEndpoint || !config.ydbDatabase) {
        return { ready: false, provider: 'ydb' };
      }

      try {
        await getYdbDriver();
        return { ready: true, provider: 'ydb' };
      } catch (error) {
        return {
          ready: false,
          provider: 'ydb',
          error: error?.message || String(error)
        };
      }
    },
    async listTeams({ includeArchived = false } = {}) {
      const rows = await queryRows(`
      DECLARE $include_archived AS Bool;

      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE ($include_archived OR status <> "archived")
      ORDER BY name ASC;
    `, {
        $include_archived: TypedValues.bool(includeArchived)
      });

      return rows.map(normalizeTeamRow);
    },
    async listPublicTeams() {
      const rows = await queryRows(`
      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE status = "active"
      ORDER BY name ASC;
    `);

      return rows.map(normalizeTeamRow);
    },
    async getTeamById({ teamId }) {
      return normalizeTeamRow(await queryRow(`
      DECLARE $team_id AS Utf8;

      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE id = $team_id
      LIMIT 1;
    `, {
        $team_id: TypedValues.utf8(teamId)
      }));
    },
    async getTeamBySlug({ teamSlug }) {
      return normalizeTeamRow(await queryRow(`
      DECLARE $team_slug AS Utf8;

      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE slug = $team_slug
        AND status = "active"
      LIMIT 1;
    `, {
        $team_slug: TypedValues.utf8(teamSlug)
      }));
    },
    async createTeam({ slug, name }) {
      const team = {
        id: `team-${randomUUID()}`,
        slug,
        name,
        status: 'active',
        settings: {},
        createdAt: toTimestamp(),
        updatedAt: toTimestamp(),
        archivedAt: null
      };

      await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $slug AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $settings_json AS JsonDocument;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO teams (
        id, slug, name, status, settings_json, created_at, updated_at, archived_at
      ) VALUES (
        $id, $slug, $name, $status, $settings_json, $created_at, $updated_at, $archived_at
      );
    `, {
        $id: TypedValues.utf8(team.id),
        $slug: TypedValues.utf8(team.slug),
        $name: TypedValues.utf8(team.name),
        $status: TypedValues.utf8(team.status),
        $settings_json: jsonDocumentValue(team.settings),
        $created_at: TypedValues.timestamp(new Date(team.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(team.updatedAt)),
        $archived_at: TypedValues.optionalNull(Types.TIMESTAMP)
      }, {
        idempotent: false
      });

      return team;
    },
    async updateTeam({ teamId, slug, name, status }) {
      const current = await this.getTeamById({ teamId });
      if (!current) return null;

      const updated = {
        ...current,
        slug: slug || current.slug,
        name: name || current.name,
        status: status === 'active' || status === 'inactive' ? status : current.status,
        updatedAt: toTimestamp()
      };
      updated.archivedAt = updated.status === 'inactive'
        ? (current.archivedAt || updated.updatedAt)
        : null;

      await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $slug AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $settings_json AS JsonDocument;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO teams (
        id, slug, name, status, settings_json, created_at, updated_at, archived_at
      ) VALUES (
        $id, $slug, $name, $status, $settings_json, $created_at, $updated_at, $archived_at
      );
    `, {
        $id: TypedValues.utf8(updated.id),
        $slug: TypedValues.utf8(updated.slug),
        $name: TypedValues.utf8(updated.name),
        $status: TypedValues.utf8(updated.status),
        $settings_json: jsonDocumentValue(updated.settings || {}),
        $created_at: TypedValues.timestamp(new Date(updated.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(updated.updatedAt)),
        $archived_at: optionalTimestamp(updated.archivedAt)
      }, {
        idempotent: false
      });

      return updated;
    },
    async archiveTeam({ teamId }) {
      const current = await this.getTeamById({ teamId });
      if (!current) return null;

      const archived = {
        ...current,
        status: 'archived',
        archivedAt: toTimestamp(),
        updatedAt: toTimestamp()
      };

      await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $slug AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $settings_json AS JsonDocument;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO teams (
        id, slug, name, status, settings_json, created_at, updated_at, archived_at
      ) VALUES (
        $id, $slug, $name, $status, $settings_json, $created_at, $updated_at, $archived_at
      );
    `, {
        $id: TypedValues.utf8(archived.id),
        $slug: TypedValues.utf8(archived.slug),
        $name: TypedValues.utf8(archived.name),
        $status: TypedValues.utf8(archived.status),
        $settings_json: jsonDocumentValue(archived.settings || {}),
        $created_at: TypedValues.timestamp(new Date(archived.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(archived.updatedAt)),
        $archived_at: optionalTimestamp(archived.archivedAt)
      }, {
        idempotent: false
      });

      return archived;
    },
    async getUserByEmail({ email }) {
      return normalizeUserRow(await queryRow(`
      DECLARE $email AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE email = $email
      LIMIT 1;
    `, {
        $email: TypedValues.utf8(email)
      }));
    },
    async getUserById({ userId }) {
      return normalizeUserRow(await queryRow(`
      DECLARE $user_id AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $user_id
      LIMIT 1;
    `, {
        $user_id: TypedValues.utf8(userId)
      }));
    },
    async findLoginContext({ email, teamSlug }) {
      const user = normalizeUserRow(await queryRow(`
      DECLARE $email AS Utf8;
      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE email = $email
        AND status = "active"
      ORDER BY updated_at DESC, id ASC
      LIMIT 1;
    `, {
        $email: TypedValues.utf8(email)
      }));

      if (!user) {
        return null;
      }

      const membershipRow = await queryRow(`
      DECLARE $user_id AS Utf8;
      DECLARE $team_slug AS Utf8;

      SELECT
        m.team_id AS team_id,
        m.user_id AS user_id,
        m.role AS role,
        m.status AS status,
        m.created_at AS created_at,
        m.updated_at AS updated_at,
        t.id AS id,
        t.slug AS slug,
        t.name AS name,
        t.status AS team_status,
        t.settings_json AS settings_json,
        t.created_at AS team_created_at,
        t.updated_at AS team_updated_at,
        t.archived_at AS team_archived_at
      FROM memberships AS m
      INNER JOIN teams AS t ON t.id = m.team_id
      WHERE m.user_id = $user_id
        AND m.status = "active"
        AND t.status = "active"
        AND ($team_slug = "" OR t.slug = $team_slug)
      LIMIT 1;
    `, {
        $user_id: TypedValues.utf8(user.id),
        $team_slug: TypedValues.utf8(teamSlug || '')
      });

      if (!membershipRow) {
        return null;
      }

      return {
        user,
        membership: normalizeMembershipRow(membershipRow),
        team: {
          id: membershipRow.id,
          slug: membershipRow.slug,
          name: membershipRow.name,
          status: membershipRow.team_status,
          settings: parseJsonDocument(membershipRow.settings_json, cloneJson),
          createdAt: toIsoOrNull(membershipRow.team_created_at),
          updatedAt: toIsoOrNull(membershipRow.team_updated_at),
          archivedAt: toIsoOrNull(membershipRow.team_archived_at)
        }
      };
    },
    async createUser({ email, password, displayName }) {
      const id = `user-${randomUUID()}`;
      const createdAt = toTimestamp();
      const user = {
        id,
        email,
        passwordHash: hashPassword(password),
        displayName,
        status: 'active',
        createdAt,
        updatedAt: createdAt,
        lastLoginAt: null
      };

      await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $password_hash AS Utf8;
      DECLARE $display_name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $last_login_at AS Timestamp?;

      UPSERT INTO users (
        id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      ) VALUES (
        $id, $email, $password_hash, $display_name, $status, $created_at, $updated_at, $last_login_at
      );
    `, {
        $id: TypedValues.utf8(user.id),
        $email: TypedValues.utf8(user.email),
        $password_hash: TypedValues.utf8(user.passwordHash),
        $display_name: TypedValues.utf8(user.displayName),
        $status: TypedValues.utf8(user.status),
        $created_at: TypedValues.timestamp(new Date(user.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(user.updatedAt)),
        $last_login_at: TypedValues.optionalNull(Types.TIMESTAMP)
      }, {
        idempotent: false
      });

      return user;
    },
    async createMembership({ teamId, userId, role }) {
      const createdAt = toTimestamp();
      const membership = {
        teamId,
        userId,
        role,
        status: 'active',
        createdAt,
        updatedAt: createdAt
      };

      await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;
      DECLARE $role AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO memberships (
        team_id, user_id, role, status, created_at, updated_at
      ) VALUES (
        $team_id, $user_id, $role, $status, $created_at, $updated_at
      );
    `, {
        $team_id: TypedValues.utf8(membership.teamId),
        $user_id: TypedValues.utf8(membership.userId),
        $role: TypedValues.utf8(membership.role),
        $status: TypedValues.utf8(membership.status),
        $created_at: TypedValues.timestamp(new Date(membership.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(membership.updatedAt))
      }, {
        idempotent: false
      });

      return membership;
    },
    async updateMembershipRole({ teamId, userId, role }) {
      const membership = normalizeMembershipRow(await queryRow(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;

      SELECT team_id, user_id, role, status, created_at, updated_at
      FROM memberships
      WHERE team_id = $team_id
        AND user_id = $user_id
      LIMIT 1;
    `, {
        $team_id: TypedValues.utf8(teamId),
        $user_id: TypedValues.utf8(userId)
      }));

      if (!membership || membership.status !== 'active') return null;

      const updatedMembership = {
        ...membership,
        role,
        updatedAt: toTimestamp()
      };

      await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;
      DECLARE $role AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO memberships (
        team_id, user_id, role, status, created_at, updated_at
      ) VALUES (
        $team_id, $user_id, $role, $status, $created_at, $updated_at
      );
    `, {
        $team_id: TypedValues.utf8(updatedMembership.teamId),
        $user_id: TypedValues.utf8(updatedMembership.userId),
        $role: TypedValues.utf8(updatedMembership.role),
        $status: TypedValues.utf8(updatedMembership.status),
        $created_at: TypedValues.timestamp(new Date(updatedMembership.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(updatedMembership.updatedAt))
      }, {
        idempotent: false
      });

      return updatedMembership;
    },
    async listTeamMembers({ teamId, includeInactive = false }) {
      const rows = await queryRows(`
      DECLARE $team_id AS Utf8;
      DECLARE $include_inactive AS Bool;

      SELECT
        u.id AS id,
        u.email AS email,
        u.password_hash AS password_hash,
        u.display_name AS display_name,
        u.status AS user_status,
        u.created_at AS user_created_at,
        u.updated_at AS user_updated_at,
        u.last_login_at AS last_login_at,
        m.team_id AS team_id,
        m.user_id AS user_id,
        m.role AS role,
        m.status AS membership_status,
        m.created_at AS membership_created_at,
        m.updated_at AS membership_updated_at
      FROM memberships AS m
      INNER JOIN users AS u ON u.id = m.user_id
      WHERE m.team_id = $team_id
        AND (
          $include_inactive
          OR (m.status = "active" AND u.status = "active")
        )
      ORDER BY u.email ASC;
    `, {
        $team_id: TypedValues.utf8(teamId),
        $include_inactive: TypedValues.bool(includeInactive)
      });

      return rows.map((row) => ({
        user: normalizeUserRow({
          id: row.id,
          email: row.email,
          password_hash: row.password_hash,
          display_name: row.display_name,
          status: row.user_status,
          created_at: row.user_created_at,
          updated_at: row.user_updated_at,
          last_login_at: row.last_login_at
        }),
        membership: normalizeMembershipRow({
          team_id: row.team_id,
          user_id: row.user_id,
          role: row.role,
          status: row.membership_status,
          created_at: row.membership_created_at,
          updated_at: row.membership_updated_at
        })
      }));
    },
    async updateUserPassword({ userId, passwordHash }) {
      const current = await queryRow(`
      DECLARE $user_id AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $user_id
      LIMIT 1;
    `, {
        $user_id: TypedValues.utf8(userId)
      });

      const user = normalizeUserRow(current);
      if (!user) return null;

      const updated = {
        ...user,
        passwordHash,
        updatedAt: toTimestamp()
      };

      await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $password_hash AS Utf8;
      DECLARE $display_name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $last_login_at AS Timestamp?;

      UPSERT INTO users (
        id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      ) VALUES (
        $id, $email, $password_hash, $display_name, $status, $created_at, $updated_at, $last_login_at
      );
    `, {
        $id: TypedValues.utf8(updated.id),
        $email: TypedValues.utf8(updated.email),
        $password_hash: TypedValues.utf8(updated.passwordHash),
        $display_name: TypedValues.utf8(updated.displayName),
        $status: TypedValues.utf8(updated.status),
        $created_at: TypedValues.timestamp(new Date(updated.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(updated.updatedAt)),
        $last_login_at: optionalTimestamp(updated.lastLoginAt)
      }, {
        idempotent: false
      });

      return updated;
    },
    async updateUserProfile({ userId, displayName }) {
      const current = await queryRow(`
      DECLARE $user_id AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $user_id
      LIMIT 1;
    `, {
        $user_id: TypedValues.utf8(userId)
      });

      const user = normalizeUserRow(current);
      if (!user) return null;

      const updated = {
        ...user,
        displayName,
        updatedAt: toTimestamp()
      };

      await executeYdbQuery(`
      DECLARE $id AS Utf8;
      DECLARE $email AS Utf8;
      DECLARE $password_hash AS Utf8;
      DECLARE $display_name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $last_login_at AS Timestamp?;

      UPSERT INTO users (
        id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      ) VALUES (
        $id, $email, $password_hash, $display_name, $status, $created_at, $updated_at, $last_login_at
      );
    `, {
        $id: TypedValues.utf8(updated.id),
        $email: TypedValues.utf8(updated.email),
        $password_hash: TypedValues.utf8(updated.passwordHash),
        $display_name: TypedValues.utf8(updated.displayName),
        $status: TypedValues.utf8(updated.status),
        $created_at: TypedValues.timestamp(new Date(updated.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(updated.updatedAt)),
        $last_login_at: optionalTimestamp(updated.lastLoginAt)
      }, {
        idempotent: false
      });

      return updated;
    },
    async revokeSessions({ userId, teamId = '' } = {}) {
      const revokedAt = toTimestamp();

      await executeYdbQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $team_id AS Utf8;
      DECLARE $revoked_at AS Timestamp;

      UPDATE sessions
      SET revoked_at = $revoked_at
      WHERE user_id = $user_id
        AND ($team_id = "" OR team_id = $team_id);
    `, {
        $user_id: TypedValues.utf8(userId),
        $team_id: TypedValues.utf8(teamId),
        $revoked_at: TypedValues.timestamp(new Date(revokedAt))
      }, {
        idempotent: false
      });
    },
    async removeUserFromTeam({ teamId, userId }) {
      const membership = normalizeMembershipRow(await queryRow(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;

      SELECT team_id, user_id, role, status, created_at, updated_at
      FROM memberships
      WHERE team_id = $team_id
        AND user_id = $user_id
      LIMIT 1;
    `, {
        $team_id: TypedValues.utf8(teamId),
        $user_id: TypedValues.utf8(userId)
      }));

      if (!membership) return null;

      const updatedMembership = {
        ...membership,
        status: 'archived',
        updatedAt: toTimestamp()
      };

      await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $user_id AS Utf8;
      DECLARE $role AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO memberships (
        team_id, user_id, role, status, created_at, updated_at
      ) VALUES (
        $team_id, $user_id, $role, $status, $created_at, $updated_at
      );
    `, {
        $team_id: TypedValues.utf8(updatedMembership.teamId),
        $user_id: TypedValues.utf8(updatedMembership.userId),
        $role: TypedValues.utf8(updatedMembership.role),
        $status: TypedValues.utf8(updatedMembership.status),
        $created_at: TypedValues.timestamp(new Date(updatedMembership.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(updatedMembership.updatedAt))
      }, {
        idempotent: false
      });

      const activeMemberships = await queryRows(`
      DECLARE $user_id AS Utf8;

      SELECT team_id
      FROM memberships
      WHERE user_id = $user_id
        AND status = "active";
    `, {
        $user_id: TypedValues.utf8(userId)
      });

      let user = normalizeUserRow(await queryRow(`
      DECLARE $user_id AS Utf8;

      SELECT id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $user_id
      LIMIT 1;
    `, {
        $user_id: TypedValues.utf8(userId)
      }));

      if (user && !activeMemberships.length) {
        user = {
          ...user,
          status: 'inactive',
          updatedAt: toTimestamp()
        };

        await executeYdbQuery(`
        DECLARE $id AS Utf8;
        DECLARE $email AS Utf8;
        DECLARE $password_hash AS Utf8;
        DECLARE $display_name AS Utf8;
        DECLARE $status AS Utf8;
        DECLARE $created_at AS Timestamp;
        DECLARE $updated_at AS Timestamp;
        DECLARE $last_login_at AS Timestamp?;

        UPSERT INTO users (
          id, email, password_hash, display_name, status, created_at, updated_at, last_login_at
        ) VALUES (
          $id, $email, $password_hash, $display_name, $status, $created_at, $updated_at, $last_login_at
        );
      `, {
          $id: TypedValues.utf8(user.id),
          $email: TypedValues.utf8(user.email),
          $password_hash: TypedValues.utf8(user.passwordHash),
          $display_name: TypedValues.utf8(user.displayName),
          $status: TypedValues.utf8(user.status),
          $created_at: TypedValues.timestamp(new Date(user.createdAt)),
          $updated_at: TypedValues.timestamp(new Date(user.updatedAt)),
          $last_login_at: optionalTimestamp(user.lastLoginAt)
        }, {
          idempotent: false
        });
      }

      await this.revokeSessions({ userId, teamId });
      return {
        user,
        membership: updatedMembership
      };
    },
    async updateUserLastLogin({ userId }) {
      const timestamp = toTimestamp();
      await executeYdbQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $updated_at AS Timestamp;

      UPDATE users
      SET last_login_at = $updated_at,
          updated_at = $updated_at
      WHERE id = $user_id;
    `, {
        $user_id: TypedValues.utf8(userId),
        $updated_at: TypedValues.timestamp(new Date(timestamp))
      }, {
        idempotent: false
      });
    },
    async createSession({ userId, teamId }) {
      const sessionId = randomUUID();
      const createdAt = toTimestamp();
      const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000).toISOString();

      await executeYdbQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $session_id AS Utf8;
      DECLARE $team_id AS Utf8;
      DECLARE $refresh_token_hash AS Utf8?;
      DECLARE $expires_at AS Timestamp;
      DECLARE $created_at AS Timestamp;
      DECLARE $revoked_at AS Timestamp?;

      UPSERT INTO sessions (
        user_id,
        session_id,
        team_id,
        refresh_token_hash,
        expires_at,
        created_at,
        revoked_at
      ) VALUES (
        $user_id,
        $session_id,
        $team_id,
        $refresh_token_hash,
        $expires_at,
        $created_at,
        $revoked_at
      );
    `, {
        $user_id: TypedValues.utf8(userId),
        $session_id: TypedValues.utf8(sessionId),
        $team_id: TypedValues.utf8(teamId),
        $refresh_token_hash: TypedValues.optionalNull(Types.UTF8),
        $expires_at: TypedValues.timestamp(new Date(expiresAt)),
        $created_at: TypedValues.timestamp(new Date(createdAt)),
        $revoked_at: TypedValues.optionalNull(Types.TIMESTAMP)
      }, {
        idempotent: false
      });

      return {
        userId,
        sessionId,
        teamId,
        refreshTokenHash: null,
        expiresAt,
        createdAt,
        revokedAt: null
      };
    },
    async getSessionById({ userId, sessionId }) {
      return normalizeSessionRow(await queryRow(`
      DECLARE $user_id AS Utf8;
      DECLARE $session_id AS Utf8;

      SELECT user_id, session_id, team_id, refresh_token_hash, expires_at, created_at, revoked_at
      FROM sessions
      WHERE user_id = $user_id
        AND session_id = $session_id
      LIMIT 1;
    `, {
        $user_id: TypedValues.utf8(userId),
        $session_id: TypedValues.utf8(sessionId)
      }));
    },
    async revokeSession({ userId, sessionId }) {
      const revokedAt = toTimestamp();
      await executeYdbQuery(`
      DECLARE $user_id AS Utf8;
      DECLARE $session_id AS Utf8;
      DECLARE $revoked_at AS Timestamp;

      UPDATE sessions
      SET revoked_at = $revoked_at
      WHERE user_id = $user_id
        AND session_id = $session_id;
    `, {
        $user_id: TypedValues.utf8(userId),
        $session_id: TypedValues.utf8(sessionId),
        $revoked_at: TypedValues.timestamp(new Date(revokedAt))
      }, {
        idempotent: false
      });
    },
    async getCurrentTeam({ teamId }) {
      const team = normalizeTeamRow(await queryRow(`
      DECLARE $team_id AS Utf8;

      SELECT id, slug, name, status, settings_json, created_at, updated_at, archived_at
      FROM teams
      WHERE id = $team_id
      LIMIT 1;
    `, {
        $team_id: TypedValues.utf8(teamId)
      }));

      if (!team) return null;

      const defaults = await this.getTeamDefaults({ teamId });
      return { team, defaults };
    },
    async listProjects({ teamId, includeArchived }) {
      const rows = await queryRows(`
      DECLARE $team_id AS Utf8;
      DECLARE $include_archived AS Bool;

      SELECT team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      FROM projects
      WHERE team_id = $team_id
        AND ($include_archived OR status <> "archived")
      ORDER BY updated_at DESC;
    `, {
        $team_id: TypedValues.utf8(teamId),
        $include_archived: TypedValues.bool(includeArchived)
      });

      return rows.map(normalizeProjectRow);
    },
    async createProject({ teamId, createdBy, name, description, state: projectState }) {
      const id = randomUUID();
      const createdAt = toTimestamp();
      await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $description AS Utf8;
      DECLARE $state_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO projects (
        team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      ) VALUES (
        $team_id, $id, $name, $status, $description, $state_json, $created_by, $created_at, $updated_at, $archived_at
      );
    `, {
        $team_id: TypedValues.utf8(teamId),
        $id: TypedValues.utf8(id),
        $name: TypedValues.utf8(name),
        $status: TypedValues.utf8('active'),
        $description: TypedValues.utf8(description || ''),
        $state_json: jsonDocumentValue(projectState || {}),
        $created_by: TypedValues.utf8(createdBy),
        $created_at: TypedValues.timestamp(new Date(createdAt)),
        $updated_at: TypedValues.timestamp(new Date(createdAt)),
        $archived_at: TypedValues.optionalNull(Types.TIMESTAMP)
      }, {
        idempotent: false
      });

      return {
        teamId,
        id,
        name,
        status: 'active',
        description: description || '',
        state: cloneJson(projectState || {}),
        createdBy,
        createdAt,
        updatedAt: createdAt,
        archivedAt: null
      };
    },
    async getProject({ teamId, projectId }) {
      return normalizeProjectRow(await queryRow(`
      DECLARE $team_id AS Utf8;
      DECLARE $project_id AS Utf8;

      SELECT team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      FROM projects
      WHERE team_id = $team_id
        AND id = $project_id
      LIMIT 1;
    `, {
        $team_id: TypedValues.utf8(teamId),
        $project_id: TypedValues.utf8(projectId)
      }));
    },
    async updateProject({ teamId, projectId, name, description, state: projectState }) {
      const current = await this.getProject({ teamId, projectId });
      if (!current) return null;

      const updated = {
        ...current,
        name: typeof name === 'string' && name ? name : current.name,
        description: typeof description === 'string' ? description : current.description,
        state: projectState ? cloneJson(projectState) : cloneJson(current.state),
        updatedAt: toTimestamp()
      };

      await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $description AS Utf8;
      DECLARE $state_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO projects (
        team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      ) VALUES (
        $team_id, $id, $name, $status, $description, $state_json, $created_by, $created_at, $updated_at, $archived_at
      );
    `, {
        $team_id: TypedValues.utf8(updated.teamId),
        $id: TypedValues.utf8(updated.id),
        $name: TypedValues.utf8(updated.name),
        $status: TypedValues.utf8(updated.status),
        $description: TypedValues.utf8(updated.description || ''),
        $state_json: jsonDocumentValue(updated.state),
        $created_by: TypedValues.utf8(updated.createdBy),
        $created_at: TypedValues.timestamp(new Date(updated.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(updated.updatedAt)),
        $archived_at: optionalTimestamp(updated.archivedAt)
      }, {
        idempotent: false
      });

      return updated;
    },
    async archiveProject({ teamId, projectId }) {
      const current = await this.getProject({ teamId, projectId });
      if (!current) return null;

      const archived = {
        ...current,
        status: 'archived',
        archivedAt: toTimestamp(),
        updatedAt: toTimestamp()
      };

      await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $status AS Utf8;
      DECLARE $description AS Utf8;
      DECLARE $state_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;
      DECLARE $archived_at AS Timestamp?;

      UPSERT INTO projects (
        team_id, id, name, status, description, state_json, created_by, created_at, updated_at, archived_at
      ) VALUES (
        $team_id, $id, $name, $status, $description, $state_json, $created_by, $created_at, $updated_at, $archived_at
      );
    `, {
        $team_id: TypedValues.utf8(archived.teamId),
        $id: TypedValues.utf8(archived.id),
        $name: TypedValues.utf8(archived.name),
        $status: TypedValues.utf8(archived.status),
        $description: TypedValues.utf8(archived.description || ''),
        $state_json: jsonDocumentValue(archived.state),
        $created_by: TypedValues.utf8(archived.createdBy),
        $created_at: TypedValues.timestamp(new Date(archived.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(archived.updatedAt)),
        $archived_at: optionalTimestamp(archived.archivedAt)
      }, {
        idempotent: false
      });

      return archived;
    },
    async listSnapshots({ teamId, projectId = '', kind }) {
      const rows = await queryRows(`
      DECLARE $team_id AS Utf8;
      DECLARE $project_id AS Utf8;
      DECLARE $kind AS Utf8;

      SELECT team_id, project_id, id, name, kind, state_json, created_by, created_at
      FROM project_snapshots
      WHERE team_id = $team_id
        AND ($project_id = "" OR project_id = $project_id)
        AND ($kind = "" OR kind = $kind)
      ORDER BY created_at DESC;
    `, {
        $team_id: TypedValues.utf8(teamId),
        $project_id: TypedValues.utf8(projectId),
        $kind: TypedValues.utf8(kind || '')
      });

      return rows.map(normalizeSnapshotRow);
    },
    async createSnapshot({ teamId, projectId, createdBy, name, kind, state: snapshotState }) {
      const id = randomUUID();
      const createdAt = toTimestamp();

      await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $project_id AS Utf8;
      DECLARE $id AS Utf8;
      DECLARE $name AS Utf8;
      DECLARE $kind AS Utf8;
      DECLARE $state_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;

      UPSERT INTO project_snapshots (
        team_id, project_id, id, name, kind, state_json, created_by, created_at
      ) VALUES (
        $team_id, $project_id, $id, $name, $kind, $state_json, $created_by, $created_at
      );
    `, {
        $team_id: TypedValues.utf8(teamId),
        $project_id: TypedValues.utf8(projectId),
        $id: TypedValues.utf8(id),
        $name: TypedValues.utf8(name),
        $kind: TypedValues.utf8(kind),
        $state_json: jsonDocumentValue(snapshotState),
        $created_by: TypedValues.utf8(createdBy),
        $created_at: TypedValues.timestamp(new Date(createdAt))
      }, {
        idempotent: false
      });

      if (kind === 'snapshot') {
        await this.updateProject({
          teamId,
          projectId,
          state: snapshotState
        });
      }

      return {
        teamId,
        projectId,
        id,
        name,
        kind,
        state: cloneJson(snapshotState),
        createdBy,
        createdAt
      };
    },
    async getTeamDefaults({ teamId }) {
      return normalizeTeamDefaultsRow(await queryRow(`
      DECLARE $team_id AS Utf8;

      SELECT team_id, version, defaults_json, media_sources_json, created_by, created_at, updated_at
      FROM team_defaults
      WHERE team_id = $team_id
      ORDER BY version DESC
      LIMIT 1;
    `, {
        $team_id: TypedValues.utf8(teamId)
      }));
    },
    async saveTeamDefaults({ teamId, createdBy, defaults, mediaSources }) {
      const current = await this.getTeamDefaults({ teamId });
      const now = toTimestamp();
      const next = {
        teamId,
        version: current ? current.version + 1 : 1,
        defaults: cloneJson(defaults || {}),
        mediaSources: cloneJson(mediaSources || {}),
        createdBy,
        createdAt: current?.createdAt || now,
        updatedAt: now
      };

      await executeYdbQuery(`
      DECLARE $team_id AS Utf8;
      DECLARE $version AS Uint64;
      DECLARE $defaults_json AS JsonDocument;
      DECLARE $media_sources_json AS JsonDocument;
      DECLARE $created_by AS Utf8;
      DECLARE $created_at AS Timestamp;
      DECLARE $updated_at AS Timestamp;

      UPSERT INTO team_defaults (
        team_id, version, defaults_json, media_sources_json, created_by, created_at, updated_at
      ) VALUES (
        $team_id, $version, $defaults_json, $media_sources_json, $created_by, $created_at, $updated_at
      );
    `, {
        $team_id: TypedValues.utf8(teamId),
        $version: TypedValues.uint64(next.version),
        $defaults_json: jsonDocumentValue(next.defaults),
        $media_sources_json: jsonDocumentValue(next.mediaSources),
        $created_by: TypedValues.utf8(createdBy),
        $created_at: TypedValues.timestamp(new Date(next.createdAt)),
        $updated_at: TypedValues.timestamp(new Date(next.updatedAt))
      }, {
        idempotent: false
      });

      return next;
    }
  };
};
