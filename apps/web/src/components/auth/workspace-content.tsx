'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  applyProjectAsset,
  createDefaultEditorDocument,
  normalizeStoredTemplateState,
  type EditorDocument
} from '@ai-craft/editor-model';
import { Button, Dialog, SectionHeader, SegmentedControl, SegmentedControlItem, Select, StatCard } from '@ai-craft/ui';
import {
  canManageWorkspaceMembers,
  formatWorkspaceRoleLabel,
  getWorkspaceActorName
} from '@ai-craft/workspace-domain';
import { listDepartmentEntries } from '@ai-craft/workspace-sdk';
import { EditorShell } from './editor-shell';
import { LogoutButton } from './logout-button';
import { MediaLibrary } from './media-library';
import { ProfileForm } from './profile-form';
import { TeamSettings } from './team-settings';
import { TemplatesLibrary } from './templates-library';
import styles from './workspace-shell.module.css';
import type {
  WorkspaceCurrentTeamResponse,
  WorkspaceMeResponse,
  WorkspaceTeamMembersResponse
} from '@/server/workspace-api/schema';

type WorkspaceOverlay = 'templates' | 'media' | 'team' | 'account' | null;
type AccountView = 'profile' | 'general';
type InterfaceTheme = 'dark' | 'light';
type InterfaceLanguage = 'ru' | 'en';

const ACTIVE_OVERLAY_STORAGE_KEY = 'ai-craft.workspace.active-overlay.v1';
const ACCOUNT_VIEW_STORAGE_KEY = 'ai-craft.workspace.account-view.v1';
const THEME_STORAGE_KEY = 'ai-craft.workspace.theme.v1';
const LANGUAGE_STORAGE_KEY = 'ai-craft.workspace.language.v1';

const isWorkspaceOverlay = (value: string): value is Exclude<WorkspaceOverlay, null> =>
  value === 'templates' || value === 'media' || value === 'team' || value === 'account';

const isAccountView = (value: string): value is AccountView =>
  value === 'profile' || value === 'general';

const isTheme = (value: string): value is InterfaceTheme =>
  value === 'dark' || value === 'light';

const isLanguage = (value: string): value is InterfaceLanguage =>
  value === 'ru' || value === 'en';

const formatStableTimestamp = (value?: string | null) => {
  if (!value) return 'не обновлялись';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'не обновлялись';

  return date.toISOString().slice(0, 16).replace('T', ' ');
};

type Props = {
  session: WorkspaceMeResponse;
  currentTeam: WorkspaceCurrentTeamResponse | null;
  teamMembers: WorkspaceTeamMembersResponse | null;
};

export function WorkspaceContent({ session, currentTeam, teamMembers }: Props) {
  const [editorState, setEditorState] = useState<EditorDocument>(createDefaultEditorDocument());
  const [templatesRefreshKey, setTemplatesRefreshKey] = useState(0);
  const [activeOverlay, setActiveOverlay] = useState<WorkspaceOverlay>(null);
  const [accountView, setAccountView] = useState<AccountView>('profile');
  const [interfaceTheme, setInterfaceTheme] = useState<InterfaceTheme>('dark');
  const [interfaceLanguage, setInterfaceLanguage] = useState<InterfaceLanguage>('ru');

  useEffect(() => {
    try {
      const storedOverlay = window.sessionStorage.getItem(ACTIVE_OVERLAY_STORAGE_KEY);
      if (storedOverlay && isWorkspaceOverlay(storedOverlay)) {
        setActiveOverlay(storedOverlay);
      }
      const storedAccountView = window.sessionStorage.getItem(ACCOUNT_VIEW_STORAGE_KEY);
      if (storedAccountView && isAccountView(storedAccountView)) {
        setAccountView(storedAccountView);
      }
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme && isTheme(storedTheme)) {
        setInterfaceTheme(storedTheme);
      }
      const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLanguage && isLanguage(storedLanguage)) {
        setInterfaceLanguage(storedLanguage);
      }
    } catch {
      // Ignore storage failures in private mode or hardened browsers.
    }
  }, []);

  useEffect(() => {
    try {
      if (activeOverlay) {
        window.sessionStorage.setItem(ACTIVE_OVERLAY_STORAGE_KEY, activeOverlay);
      } else {
        window.sessionStorage.removeItem(ACTIVE_OVERLAY_STORAGE_KEY);
      }
      window.sessionStorage.setItem(ACCOUNT_VIEW_STORAGE_KEY, accountView);
    } catch {
      // Ignore storage failures in private mode or hardened browsers.
    }
  }, [accountView, activeOverlay]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, interfaceTheme);
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, interfaceLanguage);
    } catch {
      // Ignore storage failures in private mode or hardened browsers.
    }
    document.documentElement.dataset.theme = interfaceTheme;
  }, [interfaceLanguage, interfaceTheme]);

  const roleLabel = formatWorkspaceRoleLabel(session.user.role, session.user.isSuperadmin);
  const actorName = getWorkspaceActorName(session.user);
  const canManageMembers = canManageWorkspaceMembers(session.user);
  const members = teamMembers?.users || [];
  const departments = useMemo(
    () => listDepartmentEntries((currentTeam?.defaults?.defaults || {}) as Record<string, unknown>),
    [currentTeam]
  );
  const defaultsUpdatedAt = formatStableTimestamp(currentTeam?.defaults?.updatedAt);
  const teamName = currentTeam?.team.name || session.team.name;
  const teamSlug = currentTeam?.team.slug || session.team.slug;
  const teamStatus = currentTeam?.team.status || 'active';

  const workspaceActions = [
    { id: 'templates' as const, label: 'Шаблоны', description: 'Библиотека сохраненных сцен' },
    { id: 'media' as const, label: 'Медиатека', description: 'Cloud assets и их переиспользование' },
    { id: 'team' as const, label: 'Команда', description: 'Пользователи, роли и отделы', hidden: !canManageMembers },
    { id: 'account' as const, label: 'Аккаунт', description: 'Профиль и параметры интерфейса' }
  ].filter((action) => !action.hidden);

  return (
    <div className={styles.contentStack}>
      <section className={styles.header}>
        <div className={styles.brand}>
          <Link className={styles.logo} href="/" aria-label="AI-Craft">
            <Image src="/logo.svg" alt="AI-Craft" width={122} height={34} priority />
          </Link>
          <div className={styles.stack}>
            <div className={styles.eyebrow}>AI-Craft Studio</div>
            <h1 className={styles.heading}>{teamName}</h1>
            <div className={styles.subheading}>
              {actorName} · {roleLabel}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.teamBadge}>
            <span className={styles.teamBadgeMark} aria-hidden="true" />
            <span>{teamName}</span>
          </div>
          <div className={styles.badge}>{teamSlug}</div>
          <Button className={styles.headerButton} variant="ghost" type="button" onClick={() => setActiveOverlay('account')}>
            Профиль
          </Button>
          <Link className={styles.headerLink} href="/editor">
            Public editor
          </Link>
          <LogoutButton className={styles.headerButton} variant="ghost" />
        </div>
      </section>

      <section className={styles.workspaceNavCard}>
        <SegmentedControl className={styles.workspaceTabs} aria-label="Разделы AI-Craft">
          <SegmentedControlItem active={activeOverlay === null} className={styles.workspaceTab} onClick={() => setActiveOverlay(null)}>
            Редактор
          </SegmentedControlItem>
          {workspaceActions.map((action) => (
            <SegmentedControlItem
              key={action.id}
              active={activeOverlay === action.id}
              className={styles.workspaceTab}
              onClick={() => setActiveOverlay(action.id)}
            >
              {action.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <div className={styles.statusGrid}>
          <StatCard className={styles.statusCard} label="Статус" value={teamStatus} />
          <StatCard className={styles.statusCard} label="Участники" value={members.length} />
          <StatCard className={styles.statusCard} label="Отделы" value={departments.length} />
          <StatCard className={styles.statusCard} label="Defaults" value={defaultsUpdatedAt} />
        </div>
      </section>

      <EditorShell
        state={editorState}
        onChange={setEditorState}
        onTemplateSaved={() => setTemplatesRefreshKey((current) => current + 1)}
        onOpenTemplates={() => setActiveOverlay('templates')}
        departments={departments}
        eyebrow="Studio"
        title="Основная рабочая сцена"
      />

      {activeOverlay === 'templates' ? (
        <Dialog
          className={styles.studioDialog}
          title="Шаблоны"
          description="Библиотека сохраненных сцен и быстрый возврат удачных решений обратно в редактор."
          closeLabel="Закрыть библиотеку шаблонов"
          onClose={() => setActiveOverlay(null)}
          sheet
        >
          <TemplatesLibrary
            refreshKey={templatesRefreshKey}
            onApplyTemplate={(template) => {
              const structuredTemplate = normalizeStoredTemplateState(template.state, template.name);
              setEditorState(structuredTemplate.definition.document);
              setActiveOverlay(null);
            }}
          />
        </Dialog>
      ) : null}

      {activeOverlay === 'media' ? (
        <Dialog
          className={styles.studioDialog}
          title="Медиатека"
          description="Загружай командные ассеты и вставляй их в сцену как фон, логотип или KV."
          closeLabel="Закрыть медиатеку"
          onClose={() => setActiveOverlay(null)}
          sheet
        >
          <MediaLibrary
            onUseAsset={(asset, target) => {
              setEditorState((current) => applyProjectAsset(current, target, asset.file));
              setActiveOverlay(null);
            }}
          />
        </Dialog>
      ) : null}

      {activeOverlay === 'team' && canManageMembers ? (
        <Dialog
          className={styles.studioDialog}
          title="Команда"
          description="Пользователи, роли, отделы и общие настройки рабочего пространства."
          closeLabel="Закрыть настройки команды"
          onClose={() => setActiveOverlay(null)}
          sheet
        >
          <TeamSettings
            currentTeam={currentTeam}
            teamMembers={teamMembers}
            canManageMembers={canManageMembers}
          />
        </Dialog>
      ) : null}

      {activeOverlay === 'account' ? (
        <Dialog
          className={styles.accountDialog}
          title="Аккаунт"
          description="Личный профиль и общие параметры интерфейса для текущей студии."
          closeLabel="Закрыть настройки аккаунта"
          onClose={() => setActiveOverlay(null)}
          sheet
        >
          <div className={styles.accountDialogBody}>
            <aside className={styles.accountSidebar}>
              <button
                className={`${styles.accountSidebarTab} ${accountView === 'profile' ? styles.accountSidebarTabActive : ''}`}
                type="button"
                onClick={() => setAccountView('profile')}
              >
                Обо мне
              </button>
              <button
                className={`${styles.accountSidebarTab} ${accountView === 'general' ? styles.accountSidebarTabActive : ''}`}
                type="button"
                onClick={() => setAccountView('general')}
              >
                Общее
              </button>
              <LogoutButton className={styles.accountLogoutButton} variant="ghost" />
            </aside>
            <div className={styles.accountMain}>
              {accountView === 'profile' ? (
                <ProfileForm
                  initialDisplayName={session.user.displayName || ''}
                  email={session.user.email}
                  roleLabel={roleLabel}
                />
              ) : (
                <section className={styles.panel}>
                  <div className={styles.stack}>
                    <SectionHeader
                      eyebrow="Общее"
                      title="Параметры интерфейса"
                      description="Локальные предпочтения для текущего браузера без влияния на данные команды."
                    />
                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <div className={styles.fieldLabel}>Тема</div>
                        <SegmentedControl className={styles.segmentedRow}>
                          <SegmentedControlItem
                            className={styles.segmentedButton}
                            active={interfaceTheme === 'dark'}
                            onClick={() => setInterfaceTheme('dark')}
                          >
                            Темная
                          </SegmentedControlItem>
                          <SegmentedControlItem
                            className={styles.segmentedButton}
                            active={interfaceTheme === 'light'}
                            onClick={() => setInterfaceTheme('light')}
                          >
                            Светлая
                          </SegmentedControlItem>
                        </SegmentedControl>
                      </div>
                      <div className={styles.field}>
                        <div className={styles.fieldLabel}>Язык интерфейса</div>
                        <Select
                          className={styles.input}
                          value={interfaceLanguage}
                          onChange={(event) => setInterfaceLanguage(event.target.value as InterfaceLanguage)}
                        >
                          <option value="ru">Русский</option>
                          <option value="en">English</option>
                        </Select>
                      </div>
                    </div>
                    <div className={styles.heroStats}>
                      <StatCard className={styles.heroStat} label="Команда" value={teamName} hint={`Slug: ${teamSlug}`} />
                      <StatCard className={styles.heroStat} label="Доступ" value={roleLabel} hint={actorName} />
                      <StatCard className={styles.heroStat} label="Runtime" value="Next.js" hint="Container + Gateway" />
                      <StatCard className={styles.heroStat} label="Storage" value="Workspace API" hint="YDB-backed team data" />
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
