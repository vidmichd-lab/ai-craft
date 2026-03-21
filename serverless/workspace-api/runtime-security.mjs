const INSECURE_DEFAULT_JWT_SECRET = 'change-me';
const INSECURE_DEFAULT_BOOTSTRAP_PASSWORD = 'change-me-now';

export const insecureWorkspaceDefaults = {
  jwtSecret: INSECURE_DEFAULT_JWT_SECRET,
  bootstrapAdminPassword: INSECURE_DEFAULT_BOOTSTRAP_PASSWORD
};

export const ensureWorkspaceRuntimeSecurity = ({
  nodeEnv = 'development',
  jwtSecret = '',
  bootstrapAdminEmail = '',
  bootstrapAdminPassword = ''
} = {}) => {
  if (nodeEnv !== 'production') return;

  if (!jwtSecret || jwtSecret === INSECURE_DEFAULT_JWT_SECRET) {
    throw new Error('WORKSPACE_JWT_SECRET must be configured in production');
  }

  if (
    bootstrapAdminEmail &&
    (!bootstrapAdminPassword || bootstrapAdminPassword === INSECURE_DEFAULT_BOOTSTRAP_PASSWORD)
  ) {
    throw new Error('WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD must not use the default value in production');
  }
};
