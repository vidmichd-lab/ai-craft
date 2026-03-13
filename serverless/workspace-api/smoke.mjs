import { handler } from './index.mjs';

const bootstrapEmail = process.env.WORKSPACE_BOOTSTRAP_ADMIN_EMAIL || '';
const bootstrapPassword = process.env.WORKSPACE_BOOTSTRAP_ADMIN_PASSWORD || '';
const email = process.env.WORKSPACE_SMOKE_EMAIL
  || process.env.WORKSPACE_SUPERADMIN_EMAILS?.split(',').map((item) => item.trim()).find(Boolean)
  || bootstrapEmail
  || 'vidmichd@ya.ru';
const password = process.env.WORKSPACE_SMOKE_PASSWORD || bootstrapPassword || 'change-me-now';
const teamSlug = process.env.WORKSPACE_BOOTSTRAP_TEAM_SLUG || 'practicum';
const originHeaders = {
  origin: 'http://localhost:8000'
};

const register = async () => handler({
  httpMethod: 'POST',
  path: '/auth/register',
  headers: originHeaders,
  body: JSON.stringify({
    displayName: 'Workspace Smoke',
    email,
    password,
    teamSlug
  })
});

const login = async () => handler({
  httpMethod: 'POST',
  path: '/auth/login',
  headers: originHeaders,
  body: JSON.stringify({
    email,
    password,
    teamSlug
  })
});

let authResponse;
if (bootstrapEmail && bootstrapPassword) {
  authResponse = await login();
} else {
  authResponse = await register();
  if (authResponse.statusCode === 409) {
    authResponse = await login();
  }
}

if (authResponse.statusCode !== 200) {
  console.error(authResponse.body);
  process.exit(1);
}

const cookie = authResponse.headers['Set-Cookie'];
const health = await handler({
  httpMethod: 'GET',
  path: '/workspace/health',
  headers: originHeaders
});

const createProject = await handler({
  httpMethod: 'POST',
  path: '/projects',
  headers: {
    origin: 'http://localhost:8000',
    cookie
  },
  body: JSON.stringify({
    name: `Smoke ${new Date().toISOString()}`,
    description: 'workspace-api smoke',
    state: {
      title: 'Smoke title'
    }
  })
});

if (createProject.statusCode !== 200) {
  console.error(createProject.body);
  process.exit(1);
}

const projectId = JSON.parse(createProject.body).project.id;
const saveTemplate = await handler({
  httpMethod: 'POST',
  path: '/snapshots',
  headers: {
    origin: 'http://localhost:8000',
    cookie
  },
  body: JSON.stringify({
    projectId,
    name: 'Smoke Template',
    kind: 'template',
    state: {
      title: 'Smoke title'
    }
  })
});

if (saveTemplate.statusCode !== 200) {
  console.error(saveTemplate.body);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  health: JSON.parse(health.body),
  auth: JSON.parse(authResponse.body),
  createProject: JSON.parse(createProject.body),
  saveTemplate: JSON.parse(saveTemplate.body)
}, null, 2));
