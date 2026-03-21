import styles from './workspace-shell.module.css';
import { WorkspaceContent } from './workspace-content';
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
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <WorkspaceContent session={session} currentTeam={currentTeam} teamMembers={teamMembers} />
      </div>
    </main>
  );
}
