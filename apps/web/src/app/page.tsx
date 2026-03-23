import { WorkspaceShell } from '@/components/auth/workspace-shell';
import { PublicEditorWorkbench } from '@/components/editor/public-editor-workbench';
import { cookies } from 'next/headers';
import { getWorkspaceDashboard } from '@/server/workspace-api/dashboard';

export default async function HomePage() {
  const cookieStore = await cookies();
  const dashboard = await getWorkspaceDashboard(cookieStore.getAll());

  return dashboard
    ? (
      <WorkspaceShell
        session={dashboard.session}
        currentTeam={dashboard.currentTeam}
        teamMembers={dashboard.teamMembers}
      />
    )
    : <PublicEditorWorkbench />;
}
