'use client';

import { useState } from 'react';
import {
  applyProjectAsset,
  createDefaultEditorDocument,
  normalizeStoredTemplateState,
  type EditorDocument
} from '@ai-craft/editor-model';
import { EditorShell } from './editor-shell';
import { MediaLibrary } from './media-library';
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
  const [editorState, setEditorState] = useState<EditorDocument>(createDefaultEditorDocument());
  const [templatesRefreshKey, setTemplatesRefreshKey] = useState(0);

  return (
    <div className={styles.contentStack}>
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
        onApplyTemplate={(template) => {
          const structuredTemplate = normalizeStoredTemplateState(template.state, template.name);
          setEditorState(structuredTemplate.definition.document);
        }}
      />
      <MediaLibrary
        onUseAsset={(asset, target) => {
          setEditorState((current) => applyProjectAsset(current, target, asset.file));
        }}
      />
    </div>
  );
}
