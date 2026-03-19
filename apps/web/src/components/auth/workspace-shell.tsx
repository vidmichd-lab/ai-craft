import styles from './workspace-shell.module.css';
import { LogoutButton } from './logout-button';
import { ProfileForm } from './profile-form';
import { WorkspaceContent } from './workspace-content';
import { formatWorkspaceRole } from '@ai-craft/workspace-sdk';
import type {
  WorkspaceCurrentTeamResponse,
  WorkspaceMeResponse,
  WorkspaceTeamMembersResponse
} from '@/server/workspace-api/schema';

type Props = {
  session: WorkspaceMeResponse;
  currentTeam: WorkspaceCurrentTeamResponse | null;
  teamMembers: WorkspaceTeamMembersResponse | null;
};

export function WorkspaceShell({ session, currentTeam, teamMembers }: Props) {
  const roleLabel = formatWorkspaceRole(session.user.role, session.user.isSuperadmin);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.eyebrow}>AI-Craft Workspace</div>
            <h1 className={styles.heading}>{currentTeam?.team.name || session.team.name}</h1>
            <div className={styles.subheading}>
              {session.user.displayName || session.user.email} · {roleLabel}
            </div>
          </div>
          <div className={styles.headerActions}>
            <LogoutButton />
          </div>
        </header>

        <section className={styles.grid}>
          <div className={styles.stack}>
            <section className={styles.panel}>
              <ProfileForm
                initialDisplayName={session.user.displayName || ''}
                email={session.user.email}
                roleLabel={roleLabel}
              />
            </section>
          </div>
          <WorkspaceContent
            currentTeam={currentTeam}
            teamMembers={teamMembers}
            canManageMembers={Boolean(session.user.isSuperadmin)}
          />
        </section>
      </div>
    </main>
  );
}
