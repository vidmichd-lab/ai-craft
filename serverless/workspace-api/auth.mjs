import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8');

export const createWorkspaceAuth = ({
  config,
  storage,
  json,
  toError,
  withStorageErrors,
  parseBody,
  hashPassword,
  verifyPassword,
  sanitizeEmail,
  sanitizeDisplayName,
  sanitizeTeamSlug,
  buildPublicUser,
  buildPublicTeam,
  buildTeamSummary,
  isSuperAdminEmail,
  resolveBootstrapRole
}) => {
  const signToken = (payload) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = createHmac('sha256', config.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  };

  const verifyToken = (token) => {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expected = createHmac('sha256', config.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return null;
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  };

  const parseCookies = (event) => {
    const header = event?.headers?.cookie || event?.headers?.Cookie || '';
    return header.split(';').reduce((acc, item) => {
      const [rawKey, ...rawValue] = item.trim().split('=');
      if (!rawKey) return acc;
      acc[rawKey] = decodeURIComponent(rawValue.join('=') || '');
      return acc;
    }, {});
  };

  const buildSessionCookie = (token, maxAgeSeconds) => {
    const sameSite = ['lax', 'strict', 'none'].includes(config.cookieSameSite)
      ? config.cookieSameSite
      : 'lax';
    const parts = [
      `workspace_session=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
      `Max-Age=${maxAgeSeconds}`
    ];

    if (config.cookieSecure) parts.push('Secure');
    if (config.cookieDomain) parts.push(`Domain=${config.cookieDomain}`);
    return parts.join('; ');
  };

  const clearSessionCookie = () => buildSessionCookie('', 0);

  const createAccessPayload = ({ userId, teamId, role, email, displayName, sessionId, teamSlug }) => ({
    sub: userId,
    teamId,
    role,
    email,
    displayName,
    isSuperadmin: isSuperAdminEmail(email),
    teamSlug,
    sessionId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + config.accessTtlSeconds,
    jti: randomUUID()
  });

  const requireAuth = async (event) => {
    const cookies = parseCookies(event);
    const token = cookies.workspace_session || '';
    const payload = verifyToken(token);
    if (!payload) return null;
    const session = await storage.getSessionById({
      userId: payload.sub,
      sessionId: payload.sessionId
    });
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) {
      return null;
    }
    return payload;
  };

  const requireRole = (session, allowedRoles) => {
    if (!session) return false;
    return allowedRoles.includes(session.role);
  };

  const requireSuperAdmin = (session) => !!session?.isSuperadmin;

  const isBootstrapAdminCredentials = (email, password) =>
    !!config.bootstrapAdminEmail
    && !!config.bootstrapAdminPassword
    && email === config.bootstrapAdminEmail
    && password === config.bootstrapAdminPassword;

  const ensureBootstrapAdminAccess = async () => {
    if (!config.bootstrapAdminEmail || !config.bootstrapAdminPassword) return;

    let team = await storage.getTeamBySlug({ teamSlug: config.bootstrapTeamSlug });
    if (!team && typeof storage.createTeam === 'function') {
      team = await storage.createTeam({
        slug: config.bootstrapTeamSlug,
        name: config.bootstrapTeamName
      });
    }
    if (!team) return;

    let user = await storage.getUserByEmail({ email: config.bootstrapAdminEmail });
    if (!user && typeof storage.createUser === 'function') {
      user = await storage.createUser({
        email: config.bootstrapAdminEmail,
        password: config.bootstrapAdminPassword,
        displayName: config.bootstrapAdminName || config.bootstrapAdminEmail
      });
    }
    if (!user) return;

    if (!verifyPassword(config.bootstrapAdminPassword, user.passwordHash) && typeof storage.updateUserPassword === 'function') {
      user = await storage.updateUserPassword({
        userId: user.id,
        passwordHash: hashPassword(config.bootstrapAdminPassword)
      }) || user;
    }

    const loginContext = await storage.findLoginContext({
      email: config.bootstrapAdminEmail,
      teamSlug: config.bootstrapTeamSlug
    });

    if (!loginContext?.membership && typeof storage.createMembership === 'function') {
      await storage.createMembership({
        teamId: team.id,
        userId: user.id,
        role: resolveBootstrapRole(config.bootstrapAdminEmail)
      });
    }
  };

  const createAuthSuccessResponse = async ({ user, team, membership, origin }) => {
    const session = await storage.createSession({
      userId: user.id,
      teamId: team.id
    });
    await storage.updateUserLastLogin({ userId: user.id });

    const accessPayload = createAccessPayload({
      userId: user.id,
      teamId: team.id,
      role: membership.role,
      email: user.email,
      displayName: user.displayName,
      teamSlug: team.slug,
      sessionId: session.sessionId
    });

    const token = signToken(accessPayload);
    return json(200, {
      ok: true,
      user: buildPublicUser(user, membership.role),
      team: buildPublicTeam(team),
      membership: {
        role: membership.role,
        status: membership.status
      }
    }, origin, {
      'Set-Cookie': buildSessionCookie(token, config.sessionTtlSeconds)
    });
  };

  const handleLogin = async (event, origin) => withStorageErrors(origin, async () => {
    const body = parseBody(event);
    const email = sanitizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    const teamSlug = sanitizeTeamSlug(body.teamSlug);

    if (!email || !password) {
      return json(400, toError('email and password are required'), origin);
    }

    if (isBootstrapAdminCredentials(email, password)) {
      await ensureBootstrapAdminAccess();
    }

    const loginContext = await storage.findLoginContext({ email, teamSlug });
    const passwordMatches = !!(loginContext && verifyPassword(password, loginContext.user.passwordHash));
    if (!loginContext || !passwordMatches) {
      return json(401, toError('Invalid credentials'), origin);
    }

    return createAuthSuccessResponse({
      user: loginContext.user,
      team: loginContext.team,
      membership: loginContext.membership,
      origin
    });
  });

  const handleRegister = async (event, origin) => withStorageErrors(origin, async () =>
    json(403, toError('Self-registration is disabled. Ask an admin or lead to create your account.'), origin)
  );

  const handleLogout = async (event, origin) => {
    const session = await requireAuth(event);
    if (session?.sessionId) {
      await storage.revokeSession({
        userId: session.sub,
        sessionId: session.sessionId
      });
    }

    return json(200, { ok: true }, origin, {
      'Set-Cookie': clearSessionCookie()
    });
  };

  const handleMe = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }

    const currentTeam = await storage.getCurrentTeam({ teamId: session.teamId });
    return json(200, {
      ok: true,
      user: {
        id: session.sub,
        email: session.email,
        role: session.role,
        displayName: session.displayName || '',
        isSuperadmin: !!session.isSuperadmin
      },
      team: currentTeam?.team
        ? buildPublicTeam(currentTeam.team)
        : { id: session.teamId, slug: session.teamSlug || '', name: '' }
    }, origin);
  });

  const handleAccountProfileUpdate = async (event, origin) => withStorageErrors(origin, async () => {
    const session = await requireAuth(event);
    if (!session) {
      return json(401, toError('Unauthorized'), origin);
    }

    const body = parseBody(event);
    const displayName = sanitizeDisplayName(body.displayName);
    if (!displayName) {
      return json(400, toError('displayName is required'), origin);
    }

    const updatedUser = await storage.updateUserProfile({ userId: session.sub, displayName });
    if (!updatedUser) {
      return json(404, toError('User not found', { userId: session.sub }), origin);
    }

    const currentTeam = await storage.getCurrentTeam({ teamId: session.teamId });
    const accessPayload = createAccessPayload({
      userId: updatedUser.id,
      teamId: session.teamId,
      role: session.role,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      teamSlug: currentTeam?.team?.slug || session.teamSlug || '',
      sessionId: session.sessionId
    });

    const token = signToken(accessPayload);

    return json(200, {
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: session.role,
        displayName: updatedUser.displayName,
        isSuperadmin: !!session.isSuperadmin
      },
      team: buildTeamSummary(currentTeam?.team, session)
    }, origin, {
      'Set-Cookie': buildSessionCookie(token, config.sessionTtlSeconds)
    });
  });

  return {
    buildSessionCookie,
    clearSessionCookie,
    createAccessPayload,
    requireAuth,
    requireRole,
    requireSuperAdmin,
    signToken,
    verifyToken,
    parseCookies,
    handleLogin,
    handleRegister,
    handleLogout,
    handleMe,
    handleAccountProfileUpdate
  };
};
