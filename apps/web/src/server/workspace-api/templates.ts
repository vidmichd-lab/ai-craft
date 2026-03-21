import { listWorkspaceProjects, listWorkspaceSnapshots, createWorkspaceProject } from '@/server/workspace-api/client';

const TEMPLATE_PROJECT_DESCRIPTION = 'system-template-project';

export const ensureTemplateProject = async (cookie: string, displayName = '') => {
  const projects = await listWorkspaceProjects(cookie);
  const existing = projects.data.projects.find((project) => project.description === TEMPLATE_PROJECT_DESCRIPTION);
  if (existing?.id) {
    return existing;
  }

  const fallbackName = displayName ? `${displayName} template storage` : 'Template storage';
  const created = await createWorkspaceProject(
    {
      name: fallbackName,
      description: TEMPLATE_PROJECT_DESCRIPTION,
      state: {}
    },
    cookie
  );

  return created.data.project;
};

export const getWorkspaceTemplates = async (cookie: string) => {
  const response = await listWorkspaceSnapshots({ kind: 'template' }, cookie);
  return response.data.snapshots;
};
