'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Banner, Button, cx, EmptyStateLayout, Field, Input, Select, SettingsPanel, SplitLayout, StatGroup } from '@ai-craft/ui';
import { formatWorkspaceRoleLabel } from '@ai-craft/workspace-domain';
import { listDepartmentEntries, type WorkspaceDepartmentEntry } from '@ai-craft/workspace-sdk';
import styles from './workspace-shell.module.css';
import type {
  WorkspaceAdminRemoveUserResponse,
  WorkspaceAdminUpdateTeamResponse,
  WorkspaceAdminUserMutationResponse,
  WorkspaceCurrentTeamResponse,
  WorkspaceSaveTeamDefaultsResponse,
  WorkspaceTeamMembersResponse
} from '@/server/workspace-api/schema';

type Props = {
  currentTeam: WorkspaceCurrentTeamResponse | null;
  teamMembers: WorkspaceTeamMembersResponse | null;
  canManageMembers: boolean;
};

type TeamMember = WorkspaceTeamMembersResponse['users'][number];

const sortMembers = (members: TeamMember[]) => {
  const roleOrder = { admin: 0, lead: 1, editor: 2 } as const;

  return [...members].sort((left, right) => {
    const leftOrder = roleOrder[left.role as keyof typeof roleOrder] ?? 99;
    const rightOrder = roleOrder[right.role as keyof typeof roleOrder] ?? 99;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return (left.displayName || left.email).localeCompare(right.displayName || right.email, 'ru');
  });
};

export function TeamSettings({ currentTeam, teamMembers, canManageMembers }: Props) {
  const router = useRouter();
  const initialDepartments = useMemo(
    () => listDepartmentEntries((currentTeam?.defaults?.defaults || {}) as Record<string, unknown>),
    [currentTeam]
  );
  const initialMembers = useMemo(() => sortMembers(teamMembers?.users || []), [teamMembers]);
  const [teamName, setTeamName] = useState(currentTeam?.team.name || '');
  const [teamSlug, setTeamSlug] = useState(currentTeam?.team.slug || '');
  const [teamStatus, setTeamStatus] = useState<'active' | 'inactive'>(
    currentTeam?.team.status === 'inactive' ? 'inactive' : 'active'
  );
  const [departmentsState, setDepartmentsState] = useState<WorkspaceDepartmentEntry[]>(initialDepartments);
  const [membersState, setMembersState] = useState<TeamMember[]>(initialMembers);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentSlug, setDepartmentSlug] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<'editor' | 'lead'>('editor');
  const [memberSearch, setMemberSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pendingKey, setPendingKey] = useState('');

  useEffect(() => {
    setTeamName(currentTeam?.team.name || '');
    setTeamSlug(currentTeam?.team.slug || '');
    setTeamStatus(currentTeam?.team.status === 'inactive' ? 'inactive' : 'active');
  }, [currentTeam]);

  useEffect(() => {
    setDepartmentsState(initialDepartments);
  }, [initialDepartments]);

  useEffect(() => {
    setMembersState(initialMembers);
  }, [initialMembers]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = memberSearch.trim().toLowerCase();

    return membersState
      .filter((member) => {
        if (!normalizedQuery) return true;
        return [member.displayName, member.email, member.role].join(' ').toLowerCase().includes(normalizedQuery);
      });
  }, [memberSearch, membersState]);

  const memberStats = useMemo(() => {
    const admins = membersState.filter((member) => member.role === 'admin').length;
    const leads = membersState.filter((member) => member.role === 'lead').length;
    const editors = membersState.filter((member) => member.role === 'editor').length;
    return { admins, leads, editors };
  }, [membersState]);

  const resetDepartmentForm = () => {
    setEditingDepartmentId('');
    setDepartmentName('');
    setDepartmentSlug('');
  };

  const runMutation = async <TPayload extends object>(
    key: string,
    input: RequestInfo,
    init: RequestInit,
    successMessage?: string
  ): Promise<TPayload | null> => {
    setPendingKey(key);
    setNotice('');
    setError('');

    try {
      const response = await fetch(input, {
        credentials: 'include',
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {})
        }
      });
      const payload = (await response.json().catch(() => null)) as
        | ({ error?: string; generatedPassword?: string } & TPayload)
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось выполнить действие');
      }
      setNotice(
        payload?.generatedPassword
          ? `${successMessage || 'Готово'}. Новый пароль: ${payload.generatedPassword}`
          : successMessage || 'Готово'
      );
      void router.refresh();
      return payload;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось выполнить действие');
      return null;
    } finally {
      setPendingKey('');
    }
  };

  const handleSaveTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await runMutation<WorkspaceAdminUpdateTeamResponse>(
      'team',
      '/api/team/settings',
      {
        method: 'POST',
        body: JSON.stringify({ name: teamName, slug: teamSlug, status: teamStatus })
      },
      'Настройки команды обновлены'
    );
    if (result?.team) {
      setTeamName(result.team.name);
      setTeamSlug(result.team.slug);
      setTeamStatus(result.team.status === 'inactive' ? 'inactive' : 'active');
    }
  };

  const handleDepartmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = editingDepartmentId
      ? { action: 'upsert', id: editingDepartmentId, name: departmentName, slug: departmentSlug }
      : { action: 'upsert', name: departmentName, slug: departmentSlug };
    const result = await runMutation<WorkspaceSaveTeamDefaultsResponse>(
      'department',
      '/api/team/departments',
      { method: 'POST', body: JSON.stringify(body) },
      editingDepartmentId ? 'Отдел обновлен' : 'Отдел добавлен'
    );
    if (result?.defaults) {
      setDepartmentsState(listDepartmentEntries((result.defaults.defaults || {}) as Record<string, unknown>));
      resetDepartmentForm();
    }
  };

  const handleCreateMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await runMutation<WorkspaceAdminUserMutationResponse>(
      'member-create',
      '/api/team/users',
      {
        method: 'POST',
        body: JSON.stringify({ email: memberEmail, displayName: memberName, role: memberRole })
      },
      'Пользователь создан'
    );
    if (result?.user) {
      setMembersState((current) => sortMembers([...current.filter((member) => member.id !== result.user.id), result.user]));
      setMemberEmail('');
      setMemberName('');
      setMemberRole('editor');
    }
  };

  return (
    <div className={styles.stack}>
      {notice ? (
        <Banner className={styles.notice} tone="notice">
          {notice}
        </Banner>
      ) : null}
      {error ? (
        <Banner className={styles.error} tone="error">
          {error}
        </Banner>
      ) : null}

      <SplitLayout
        className={styles.teamLayout}
        variant="balanced"
        start={<div className={styles.stack}>
          <SettingsPanel
            className={styles.panel}
            eyebrow="Команда"
            title="Настройки команды"
            description="Название, slug и статус рабочего контура. Эти параметры задают базовую идентичность пространства."
            stats={
              <StatGroup
                className={styles.heroStats}
                items={[
                  { className: styles.heroStat, label: 'Команда', value: teamName || '—', hint: `Slug: ${teamSlug || '—'}` },
                  { className: styles.heroStat, label: 'Статус', value: teamStatus, hint: 'Текущий режим работы команды' },
                  { className: styles.heroStat, label: 'Отделы', value: departmentsState.length, hint: 'Включая базовый общий отдел' },
                  { className: styles.heroStat, label: 'Участники', value: membersState.length, hint: 'Активные пользователи workspace' }
                ]}
              />
            }
          >
              <form className={styles.stack} onSubmit={handleSaveTeam}>
                <div className={styles.fieldGrid}>
                  <Field className={styles.field} label="Название">
                    <Input
                      className={styles.input}
                      value={teamName}
                      onChange={(event) => setTeamName(event.target.value)}
                      disabled={!canManageMembers}
                    />
                  </Field>
                  <Field className={styles.field} label="Slug">
                    <Input
                      className={styles.input}
                      value={teamSlug}
                      onChange={(event) => setTeamSlug(event.target.value)}
                      disabled={!canManageMembers}
                    />
                  </Field>
                </div>
                <Field className={styles.field} label="Статус">
                  <Select
                    className={styles.input}
                    value={teamStatus}
                    onChange={(event) => setTeamStatus(event.target.value as 'active' | 'inactive')}
                    disabled={!canManageMembers}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </Select>
                </Field>
                {canManageMembers ? (
                  <Button type="submit" disabled={pendingKey === 'team'}>
                    {pendingKey === 'team' ? 'Сохраняем...' : 'Сохранить команду'}
                  </Button>
                ) : null}
              </form>
          </SettingsPanel>

          <SettingsPanel
            className={styles.panel}
            eyebrow="Отделы"
            title="Структура команды"
            description="Общий отдел задает базовую конфигурацию. Остальные отделы наследуют ее и могут переопределять настройки."
          >
              <div className={styles.memberList}>
                {departmentsState.map((department: WorkspaceDepartmentEntry) => (
                  <article className={styles.memberItem} key={department.id}>
                    <div className={styles.memberIdentity}>
                      <div className={styles.memberName}>{department.name}</div>
                      <div className={styles.memberEmail}>
                        {department.slug}
                        {department.isGeneral ? ' · базовый отдел' : ' · наследует Общий'}
                      </div>
                    </div>
                    <div className={styles.memberActions}>
                      <Button
                        type="button"
                        onClick={() => {
                          setEditingDepartmentId(department.id);
                          setDepartmentName(department.name);
                          setDepartmentSlug(department.slug);
                        }}
                      >
                        Изменить
                      </Button>
                      {!department.isGeneral ? (
                        <Button
                          className={cx(styles.button, styles.dangerButton)}
                          variant="danger"
                          type="button"
                          disabled={pendingKey === `department-remove-${department.id}`}
                          onClick={() => {
                            if (!window.confirm(`Удалить отдел "${department.name}"?`)) return;
                            void runMutation(
                              `department-remove-${department.id}`,
                              '/api/team/departments',
                              {
                                method: 'POST',
                                body: JSON.stringify({ action: 'remove', departmentId: department.id })
                              },
                              `Отдел "${department.name}" удален`
                            ).then((result) => {
                              if (!result) return;
                              const payload = result as WorkspaceSaveTeamDefaultsResponse;
                              setDepartmentsState(
                                listDepartmentEntries((payload.defaults?.defaults || {}) as Record<string, unknown>)
                              );
                              if (editingDepartmentId === department.id) resetDepartmentForm();
                            });
                          }}
                        >
                          Удалить
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              <form className={styles.stack} onSubmit={handleDepartmentSubmit}>
                <div className={styles.fieldGrid}>
                  <Field className={styles.field} label="Название отдела">
                    <Input
                      className={styles.input}
                      value={departmentName}
                      onChange={(event) => setDepartmentName(event.target.value)}
                      placeholder="Например, PRO"
                    />
                  </Field>
                  <Field className={styles.field} label="Slug">
                    <Input
                      className={styles.input}
                      value={departmentSlug}
                      onChange={(event) => setDepartmentSlug(event.target.value)}
                      placeholder="pro"
                    />
                  </Field>
                </div>
                <div className={styles.actionsRow}>
                  <Button
                    type="submit"
                    disabled={pendingKey === 'department' || !departmentName.trim() || !departmentSlug.trim()}
                  >
                    {pendingKey === 'department'
                      ? 'Сохраняем...'
                      : editingDepartmentId
                        ? 'Сохранить отдел'
                        : 'Добавить отдел'}
                  </Button>
                  {editingDepartmentId ? (
                    <Button type="button" onClick={resetDepartmentForm}>
                      Отмена
                    </Button>
                  ) : null}
                </div>
              </form>
          </SettingsPanel>
        </div>}

        end={<SettingsPanel
          className={styles.panel}
          eyebrow="Участники"
          title="Команда и доступы"
          description="Управляй ролями, приглашай новых участников и быстро обслуживай доступы без ухода из workspace."
          stats={
            <StatGroup
              className={styles.heroStats}
              items={[
                { className: styles.heroStat, label: 'Admins', value: memberStats.admins, hint: 'Полный доступ к контуру' },
                { className: styles.heroStat, label: 'Leads', value: memberStats.leads, hint: 'Управление командой и шаблонами' },
                { className: styles.heroStat, label: 'Editors', value: memberStats.editors, hint: 'Работа с редактором и медиа' },
                { className: styles.heroStat, label: 'Всего', value: membersState.length, hint: 'Пользователей в workspace' }
              ]}
            />
          }
        >
          {canManageMembers ? (
            <form className={styles.stack} onSubmit={handleCreateMember}>
              <div className={styles.fieldGrid}>
                <Field className={styles.field} label="Имя">
                  <Input
                    className={styles.input}
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    placeholder="Имя пользователя"
                  />
                </Field>
                <Field className={styles.field} label="Email">
                  <Input
                    className={styles.input}
                    type="email"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="user@example.com"
                  />
                </Field>
              </div>
              <Field className={styles.field} label="Роль">
                <Select
                  className={styles.input}
                  value={memberRole}
                  onChange={(event) => setMemberRole(event.target.value as 'editor' | 'lead')}
                >
                  <option value="editor">editor</option>
                  <option value="lead">lead</option>
                </Select>
              </Field>
              <Button type="submit" disabled={pendingKey === 'member-create' || !memberEmail.trim() || !memberName.trim()}>
                {pendingKey === 'member-create' ? 'Создаем...' : 'Добавить пользователя'}
              </Button>
            </form>
          ) : null}

          {membersState.length ? (
            <div className={styles.stack}>
              <Field className={styles.field} label="Поиск по участникам">
                <Input
                  className={styles.input}
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Имя, email или роль"
                />
              </Field>
              <div className={styles.memberList}>
                {filteredMembers.map((member: TeamMember) => (
                  <article className={styles.memberItem} key={member.id}>
                    <div className={styles.memberIdentity}>
                      <div className={styles.memberName}>{member.displayName || member.email}</div>
                      <div className={styles.memberEmail}>{member.email}</div>
                    </div>
                    <div className={styles.stack}>
                      <div className={styles.badge}>{formatWorkspaceRoleLabel(member.role)}</div>
                      <div className={styles.memberActions}>
                        {canManageMembers && (member.role === 'editor' || member.role === 'lead') ? (
                          <Button
                            type="button"
                            disabled={pendingKey === `role-${member.id}`}
                            onClick={() => {
                              void runMutation(
                                `role-${member.id}`,
                                '/api/team/users/role',
                                {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    userId: member.id,
                                    role: member.role === 'lead' ? 'editor' : 'lead'
                                  })
                                },
                                `Роль для ${member.email} обновлена`
                              ).then((result) => {
                                const payload = result as WorkspaceAdminUserMutationResponse | null;
                                if (!payload?.user) return;
                                setMembersState((current) =>
                                  sortMembers(current.map((item) => (item.id === payload.user.id ? payload.user : item)))
                                );
                              });
                            }}
                          >
                            {member.role === 'lead' ? 'Сделать editor' : 'Сделать lead'}
                          </Button>
                        ) : null}
                        {canManageMembers ? (
                          <Button
                            type="button"
                            disabled={pendingKey === `reset-${member.id}`}
                            onClick={() => {
                              void runMutation(
                                `reset-${member.id}`,
                                '/api/team/users/reset-password',
                                {
                                  method: 'POST',
                                  body: JSON.stringify({ userId: member.id })
                                },
                                `Пароль для ${member.email} обновлен`
                              ).then((result) => {
                                const payload = result as WorkspaceAdminUserMutationResponse | null;
                                if (!payload?.user) return;
                                setMembersState((current) =>
                                  sortMembers(current.map((item) => (item.id === payload.user.id ? payload.user : item)))
                                );
                              });
                            }}
                          >
                            Новый пароль
                          </Button>
                        ) : null}
                        {canManageMembers ? (
                          <Button
                            className={`${styles.button} ${styles.dangerButton}`}
                            variant="danger"
                            type="button"
                            disabled={pendingKey === `remove-${member.id}`}
                            onClick={() => {
                              if (!window.confirm(`Удалить ${member.email} из команды?`)) return;
                              void runMutation(
                                `remove-${member.id}`,
                                '/api/team/users/remove',
                                {
                                  method: 'POST',
                                  body: JSON.stringify({ userId: member.id })
                                },
                                `${member.email} удален из команды`
                              ).then((result) => {
                                const payload = result as WorkspaceAdminRemoveUserResponse | null;
                                if (!payload?.removed) return;
                                setMembersState((current) => current.filter((item) => item.id !== member.id));
                              });
                            }}
                          >
                            Удалить
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!filteredMembers.length ? (
                <EmptyStateLayout title="Ничего не найдено" description="По текущему фильтру участников не найдено." />
              ) : null}
            </div>
          ) : (
            <EmptyStateLayout title="Список пуст" description="Список участников пока недоступен или пуст." />
          )}
        </SettingsPanel>}
      />
    </div>
  );
}
