import { afterEach, describe, expect, it } from 'vitest';

const originalEnv = { ...process.env };

const restoreEnv = () => {
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  });

  Object.entries(originalEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

const loadRuntimeSecurity = async (env = {}) => {
  restoreEnv();
  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  });

  return import('../serverless/workspace-api/runtime-security.mjs');
};

afterEach(() => {
  restoreEnv();
});

describe('workspace-api runtime security', () => {
  it('rejects production startup with default jwt secret', async () => {
    const mod = await loadRuntimeSecurity({
      NODE_ENV: 'production',
      WORKSPACE_STORAGE: 'memory',
      WORKSPACE_JWT_SECRET: 'change-me',
      WORKSPACE_BOOTSTRAP_ADMIN_EMAIL: '',
      WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD: ''
    });

    expect(() => mod.ensureWorkspaceRuntimeSecurity({
      nodeEnv: 'production',
      jwtSecret: 'change-me',
      bootstrapAdminEmail: '',
      bootstrapAdminPassword: ''
    })).toThrow('WORKSPACE_JWT_SECRET must be configured in production');
  });

  it('rejects production startup with default bootstrap password', async () => {
    const mod = await loadRuntimeSecurity({
      NODE_ENV: 'production',
      WORKSPACE_STORAGE: 'memory',
      WORKSPACE_JWT_SECRET: 'strong-secret',
      WORKSPACE_BOOTSTRAP_ADMIN_EMAIL: 'admin@example.com',
      WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD: 'change-me-now'
    });

    expect(() => mod.ensureWorkspaceRuntimeSecurity({
      nodeEnv: 'production',
      jwtSecret: 'strong-secret',
      bootstrapAdminEmail: 'admin@example.com',
      bootstrapAdminPassword: 'change-me-now'
    })).toThrow(
      'WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD must not use the default value in production'
    );
  });
});
