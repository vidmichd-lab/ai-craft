import styles from './workspace-shell.module.css';
import { LogoutButton } from './logout-button';
import { ProfileForm } from './profile-form';
import { WorkspaceContent } from './workspace-content';
import {
  canManageWorkspaceMembers,
  formatWorkspaceRoleLabel,
  getWorkspaceActorName
} from '@ai-craft/workspace-domain';
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
  const roleLabel = formatWorkspaceRoleLabel(session.user.role, session.user.isSuperadmin);
  const actorName = getWorkspaceActorName(session.user);
  const canManageMembers = canManageWorkspaceMembers(session.user);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.eyebrow}>AI-Craft Workspace</div>
            <h1 className={styles.heading}>{currentTeam?.team.name || session.team.name}</h1>
            <div className={styles.subheading}>
              {actorName} · {roleLabel}
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
            canManageMembers={canManageMembers}
          />
        </section>
      </div>
    </main>
  );
}
