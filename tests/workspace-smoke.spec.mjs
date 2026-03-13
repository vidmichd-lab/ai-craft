import { expect, test } from '@playwright/test';

test('workspace flow allows login, project save and template save', async ({ page }) => {
  const state = {
    loggedIn: false,
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
      displayName: 'Workspace Admin'
    },
    team: {
      id: 'team-demo',
      slug: 'demo',
      name: 'Demo Team',
      status: 'active',
      settings: {}
    },
    defaults: {
      version: 1,
      defaults: {
        brandName: 'Demo Team',
        title: 'Командный заголовок',
        subtitle: 'Командный подзаголовок'
      },
      mediaSources: {},
      updatedAt: '2026-03-13T12:00:00.000Z'
    },
    projects: [],
    templatesByProject: {}
  };

  const dialogAnswers = ['Launch Project', 'Demo description', 'Launch Template'];
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt') {
      await dialog.accept(dialogAnswers.shift() || '');
      return;
    }

    await dialog.accept();
  });

  await page.route('**/workspace/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        service: 'workspace-api',
        storage: { mode: 'memory', provider: 'memory', ready: true }
      })
    });
  });

  await page.route('**/auth/me', async (route) => {
    if (!state.loggedIn) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Unauthorized' })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: state.user,
        team: {
          id: state.team.id,
          slug: state.team.slug,
          name: state.team.name
        }
      })
    });
  });

  await page.route('**/teams/public', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        teams: [
          {
            id: state.team.id,
            slug: state.team.slug,
            name: state.team.name
          }
        ]
      })
    });
  });

  await page.route('**/auth/login', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: {
          id: state.user.id,
          email: state.user.email,
          displayName: state.user.displayName,
          status: 'active'
        },
        team: {
          id: state.team.id,
          slug: state.team.slug,
          name: state.team.name
        },
        membership: {
          role: 'admin',
          status: 'active'
        }
      })
    });
  });

  await page.route('**/auth/logout', async (route) => {
    state.loggedIn = false;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    });
  });

  await page.route('**/teams/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        team: state.team,
        defaults: state.defaults
      })
    });
  });

  await page.route('**/projects?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        projects: state.projects
      })
    });
  });

  await page.route('**/projects', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const project = {
      id: `project-${state.projects.length + 1}`,
      teamId: state.team.id,
      name: body.name,
      description: body.description || '',
      status: 'active',
      state: body.state || {},
      createdBy: state.user.id,
      createdAt: '2026-03-13T12:10:00.000Z',
      updatedAt: '2026-03-13T12:10:00.000Z',
      archivedAt: null
    };
    state.projects = [project, ...state.projects];
    state.templatesByProject[project.id] = state.templatesByProject[project.id] || [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, project })
    });
  });

  await page.route('**/projects/update', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const current = state.projects.find((project) => project.id === body.projectId);
    const project = {
      ...current,
      name: body.name || current.name,
      description: body.description ?? current.description,
      state: body.state || current.state,
      updatedAt: '2026-03-13T12:20:00.000Z'
    };
    state.projects = state.projects.map((item) => item.id === project.id ? project : item);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, project })
    });
  });

  await page.route('**/projects/archive', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    state.projects = state.projects.filter((project) => project.id !== body.projectId);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    });
  });

  await page.route('**/snapshots?*', async (route) => {
    const url = new URL(route.request().url());
    const projectId = url.searchParams.get('projectId') || '';
    const templates = state.templatesByProject[projectId] || [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshots: templates
      })
    });
  });

  await page.route('**/snapshots', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const snapshot = {
      id: `template-${(state.templatesByProject[body.projectId] || []).length + 1}`,
      projectId: body.projectId,
      teamId: state.team.id,
      name: body.name,
      kind: body.kind,
      state: body.state,
      createdBy: state.user.id,
      createdAt: '2026-03-13T12:30:00.000Z'
    };
    state.templatesByProject[body.projectId] = [snapshot, ...(state.templatesByProject[body.projectId] || [])];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, snapshot })
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  await expect(page.locator('#workspaceControls')).toBeVisible();
  await expect(page.locator('#workspaceStatus')).toContainText('Нужен вход');
  await expect(page.locator('#workspaceAuthOverlay')).toBeVisible();

  await page.fill('#workspaceAuthEmail', 'admin@example.com');
  await page.fill('#workspaceAuthPassword', 'change-me-now');
  await page.click('#workspaceAuthForm button[type="submit"]');

  await expect(page.locator('#workspaceStatus')).toContainText('Demo Team');
  await expect(page.locator('#workspaceModalBody')).toContainText('Workspace Admin');

  await page.click('[data-workspace-action="close-settings"]');

  await page.click('#workspaceSaveBtn');
  await expect(page.locator('#workspaceStatus')).toContainText('Launch Project');

  await page.click('#workspaceProjectsBtn');
  await expect(page.locator('#workspaceModalBody')).toContainText('Launch Project');

  await page.click('#workspaceModalCloseBtn');
  await page.click('#workspaceTemplateBtn');
  await page.click('#workspaceProjectsBtn');
  await expect(page.locator('#workspaceModalBody')).toContainText('Launch Template');
});

test('superadmin can create a team and a user with generated password', async ({ page }) => {
  const state = {
    loggedIn: false,
    user: {
      id: 'user-superadmin',
      email: 'vidmichd@ya.ru',
      role: 'admin',
      displayName: 'Vidmich',
      isSuperadmin: true
    },
    currentTeam: {
      id: 'team-practicum',
      slug: 'practicum',
      name: 'Яндекс Практикум',
      status: 'active',
      settings: {}
    },
    teams: [
      {
        id: 'team-practicum',
        slug: 'practicum',
        name: 'Яндекс Практикум',
        status: 'active',
        settings: {}
      }
    ],
    teamUsers: {
      'team-practicum': [
        {
          id: 'user-superadmin',
          email: 'vidmichd@ya.ru',
          displayName: 'Vidmich',
          status: 'active',
          role: 'admin',
          membershipStatus: 'active',
          isSuperadmin: true
        }
      ]
    }
  };

  await page.route('**/workspace/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        service: 'workspace-api',
        storage: { mode: 'memory', provider: 'memory', ready: true }
      })
    });
  });

  await page.route('**/teams/public', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        teams: state.teams.map((team) => ({
          id: team.id,
          slug: team.slug,
          name: team.name
        }))
      })
    });
  });

  await page.route('**/auth/me', async (route) => {
    if (!state.loggedIn) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Unauthorized' })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: state.user,
        team: {
          id: state.currentTeam.id,
          slug: state.currentTeam.slug,
          name: state.currentTeam.name
        }
      })
    });
  });

  await page.route('**/auth/login', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: {
          id: state.user.id,
          email: state.user.email,
          displayName: state.user.displayName,
          status: 'active',
          isSuperadmin: true
        },
        team: {
          id: state.currentTeam.id,
          slug: state.currentTeam.slug,
          name: state.currentTeam.name
        },
        membership: {
          role: 'admin',
          status: 'active'
        }
      })
    });
  });

  await page.route('**/auth/logout', async (route) => {
    state.loggedIn = false;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    });
  });

  await page.route('**/teams/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        team: state.currentTeam,
        defaults: null
      })
    });
  });

  await page.route('**/projects?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        projects: []
      })
    });
  });

  await page.route('**/admin/teams', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          teams: state.teams
        })
      });
      return;
    }

    const body = JSON.parse(route.request().postData() || '{}');
    const createdTeam = {
      id: `team-${state.teams.length + 1}`,
      slug: body.slug || `team-${state.teams.length + 1}`,
      name: body.name,
      status: 'active',
      settings: {},
      createdAt: '2026-03-13T12:40:00.000Z',
      updatedAt: '2026-03-13T12:40:00.000Z',
      archivedAt: null
    };
    state.teams = [...state.teams, createdTeam];
    state.teamUsers[createdTeam.id] = [
      {
        id: state.user.id,
        email: state.user.email,
        displayName: state.user.displayName,
        status: 'active',
        role: 'admin',
        membershipStatus: 'active',
        isSuperadmin: true
      }
    ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        team: createdTeam
      })
    });
  });

  await page.route('**/admin/users?*', async (route) => {
    const url = new URL(route.request().url());
    const teamId = url.searchParams.get('teamId') || state.currentTeam.id;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        team: state.teams.find((team) => team.id === teamId) || state.currentTeam,
        users: state.teamUsers[teamId] || []
      })
    });
  });

  await page.route('**/admin/users', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const generatedPassword = 'generated-pass-42';
    const user = {
      id: `user-${Date.now()}`,
      email: body.email,
      displayName: body.displayName || body.email.split('@')[0],
      status: 'active',
      role: body.role || 'editor',
      membershipStatus: 'active',
      isSuperadmin: false
    };
    state.teamUsers[body.teamId] = [...(state.teamUsers[body.teamId] || []), user];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user,
        generatedPassword
      })
    });
  });

  await page.route('**/admin/users/role', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const users = state.teamUsers[body.teamId] || [];
    const nextUser = users.find((user) => user.id === body.userId);

    if (!nextUser) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'User not found' })
      });
      return;
    }

    nextUser.role = body.role;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: nextUser
      })
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  await page.fill('#workspaceAuthEmail', 'vidmichd@ya.ru');
  await page.fill('#workspaceAuthPassword', 'change-me-now');
  await page.click('#workspaceAuthForm button[type="submit"]');

  await expect(page.locator('#workspaceModalBody')).toContainText('Superadmin');
  await page.fill('#workspaceAdminCreateTeamForm input[name="name"]', 'Design Ops');
  await page.fill('#workspaceAdminCreateTeamForm input[name="slug"]', 'design-ops');
  await page.click('#workspaceAdminCreateTeamForm button[type="submit"]');

  await expect(page.locator('#workspaceModalBody')).toContainText('Design Ops');
  await page.click('[data-workspace-action="select-admin-team"][data-team-id="team-2"]');

  await page.fill('#workspaceAdminCreateUserForm input[name="email"]', 'editor@example.com');
  await page.fill('#workspaceAdminCreateUserForm input[name="displayName"]', 'Editor User');
  await page.selectOption('#workspaceAdminCreateUserForm select[name="role"]', 'lead');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/admin/users') && response.request().method() === 'POST'),
    page.locator('#workspaceAdminCreateUserForm').evaluate((form) => form.requestSubmit())
  ]);

  await expect(page.locator('#workspaceModalBody')).toContainText('editor@example.com');
  await expect(page.locator('#workspaceModalBody')).toContainText('lead');
  await expect(page.locator('.workspace-secret-value')).toContainText('generated-pass-42');

  await page.click('[data-workspace-action="set-admin-user-role"][data-role="editor"]');
  await expect(page.locator('#workspaceModalBody')).toContainText('editor');
});

test('lead can access team defaults controls after workspace login', async ({ page }) => {
  const state = {
    loggedIn: false,
    user: {
      id: 'user-lead',
      email: 'lead@example.com',
      role: 'lead',
      displayName: 'Team Lead',
      isSuperadmin: false
    },
    team: {
      id: 'team-demo',
      slug: 'demo',
      name: 'Demo Team',
      status: 'active',
      settings: {}
    }
  };

  await page.route('**/workspace/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        service: 'workspace-api',
        storage: { mode: 'memory', provider: 'memory', ready: true }
      })
    });
  });

  await page.route('**/teams/public', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        teams: [{
          id: state.team.id,
          slug: state.team.slug,
          name: state.team.name
        }]
      })
    });
  });

  await page.route('**/auth/me', async (route) => {
    if (!state.loggedIn) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Unauthorized' })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: state.user,
        team: {
          id: state.team.id,
          slug: state.team.slug,
          name: state.team.name
        }
      })
    });
  });

  await page.route('**/auth/login', async (route) => {
    state.loggedIn = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        user: {
          id: state.user.id,
          email: state.user.email,
          displayName: state.user.displayName,
          status: 'active',
          isSuperadmin: false
        },
        team: {
          id: state.team.id,
          slug: state.team.slug,
          name: state.team.name
        },
        membership: {
          role: 'lead',
          status: 'active'
        }
      })
    });
  });

  await page.route('**/teams/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        team: state.team,
        defaults: null
      })
    });
  });

  await page.route('**/projects?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        projects: []
      })
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  await expect(page.locator('[data-function="showSizesAdmin"]')).toBeDisabled();
  await expect(page.locator('[data-function="showLogoAssetsAdmin"]')).toBeDisabled();

  await page.fill('#workspaceAuthEmail', 'lead@example.com');
  await page.fill('#workspaceAuthPassword', 'change-me-now');
  await page.click('#workspaceAuthForm button[type="submit"]');

  await expect(page.locator('#workspaceModalBody')).toContainText('lead');
  await expect(page.locator('[data-function="showSizesAdmin"]')).toBeEnabled();
  await expect(page.locator('[data-function="showLogoAssetsAdmin"]')).toBeEnabled();
});
