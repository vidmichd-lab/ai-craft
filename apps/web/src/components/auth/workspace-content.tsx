'use client';

import { useState } from 'react';
import { EditorShell } from './editor-shell';
import { LegacyStudioFrame } from './legacy-studio-frame';
import { MediaLibrary } from './media-library';
import { normalizeEditorSnapshot, type EditorSnapshot } from './editor-types';
import { TeamSettings } from './team-settings';
import { TemplatesLibrary } from './templates-library';
import styles from './workspace-shell.module.css';
import type {
  WorkspaceCurrentTeamResponse,
  WorkspaceTeamMembersResponse
} from '@/server/workspace-api/schema';

type Props = {
  currentTeam: WorkspaceCurrentTeamResponse | null;
  teamMembers: WorkspaceTeamMembersResponse | null;
  canManageMembers: boolean;
};

export function WorkspaceContent({ currentTeam, teamMembers, canManageMembers }: Props) {
  const [editorState, setEditorState] = useState<EditorSnapshot>(normalizeEditorSnapshot(null));
  const [templatesRefreshKey, setTemplatesRefreshKey] = useState(0);

  return (
    <div className={styles.contentStack}>
      <LegacyStudioFrame />
      <EditorShell
        state={editorState}
        onChange={setEditorState}
        onTemplateSaved={() => setTemplatesRefreshKey((current) => current + 1)}
      />
      <TeamSettings
        currentTeam={currentTeam}
        teamMembers={teamMembers}
        canManageMembers={canManageMembers}
      />
      <TemplatesLibrary
        refreshKey={templatesRefreshKey}
        onApplyTemplate={(template) => setEditorState(normalizeEditorSnapshot(template.state))}
      />
      <MediaLibrary
        onUseAsset={(asset, target) => {
          if (target === 'background') {
            setEditorState((current) => normalizeEditorSnapshot({ ...current, bgImageSelected: asset.file }));
            return;
          }
          if (target === 'kv') {
            setEditorState((current) => normalizeEditorSnapshot({ ...current, kvSelected: asset.file }));
            return;
          }
          setEditorState((current) => normalizeEditorSnapshot({ ...current, logoSelected: asset.file }));
        }}
      />
    </div>
  );
}
