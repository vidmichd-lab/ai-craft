'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { Banner, Button, cx, Field, Input, SectionHeader, Select } from '@ai-craft/ui';
import { formatWorkspaceRoleLabel } from '@ai-craft/workspace-domain';
import { listDepartmentEntries, type WorkspaceDepartmentEntry } from '@ai-craft/workspace-sdk';
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

type TeamMember = WorkspaceTeamMembersResponse['users'][number];

export function TeamSettings({ currentTeam, teamMembers, canManageMembers }: Props) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(currentTeam?.team.name || '');
  const [teamSlug, setTeamSlug] = useState(currentTeam?.team.slug || '');
  const [teamStatus, setTeamStatus] = useState<'active' | 'inactive'>(
    currentTeam?.team.status === 'inactive' ? 'inactive' : 'active'
  );
  const [departmentName, setDepartmentName] = useState('');
  const [departmentSlug, setDepartmentSlug] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<'editor' | 'lead'>('editor');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pendingKey, setPendingKey] = useState('');

  const departments = useMemo(
    () => listDepartmentEntries((currentTeam?.defaults?.defaults || {}) as Record<string, unknown>),
    [currentTeam]
  );

  const resetDepartmentForm = () => {
    setEditingDepartmentId('');
    setDepartmentName('');
    setDepartmentSlug('');
  };

  const runMutation = async (key: string, input: RequestInfo, init: RequestInit, successMessage?: string) => {
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
      const payload = (await response.json().catch(() => null)) as { error?: string; generatedPassword?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось выполнить действие');
      }
      setNotice(payload?.generatedPassword ? `${successMessage || 'Готово'}. Новый пароль: ${payload.generatedPassword}` : (successMessage || 'Готово'));
      router.refresh();
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
    await runMutation(
      'team',
      '/api/team/settings',
      {
        method: 'POST',
        body: JSON.stringify({ name: teamName, slug: teamSlug, status: teamStatus })
      },
      'Настройки команды обновлены'
    );
  };

  const handleDepartmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = editingDepartmentId
      ? { action: 'upsert', id: editingDepartmentId, name: departmentName, slug: departmentSlug }
      : { action: 'upsert', name: departmentName, slug: departmentSlug };
    const result = await runMutation(
      'department',
      '/api/team/departments',
      { method: 'POST', body: JSON.stringify(body) },
      editingDepartmentId ? 'Отдел обновлен' : 'Отдел добавлен'
    );
    if (result) {
      resetDepartmentForm();
    }
  };

  const handleCreateMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await runMutation(
      'member-create',
      '/api/team/users',
      {
        method: 'POST',
        body: JSON.stringify({ email: memberEmail, displayName: memberName, role: memberRole })
      },
      'Пользователь создан'
    );
    if (result) {
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

      <section className={styles.panel}>
        <div className={styles.stack}>
          <SectionHeader eyebrow="Команда" title="Настройки команды" />
          <form className={styles.stack} onSubmit={handleSaveTeam}>
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
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stack}>
          <SectionHeader eyebrow="Отделы" title="Структура команды" />
          <div className={styles.memberList}>
            {departments.map((department: WorkspaceDepartmentEntry) => (
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
                        void runMutation(
                          `department-remove-${department.id}`,
                          '/api/team/departments',
                          {
                            method: 'POST',
                            body: JSON.stringify({ action: 'remove', departmentId: department.id })
                          },
                          `Отдел "${department.name}" удален`
                        );
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
            <div className={styles.actionsRow}>
              <Button type="submit" disabled={pendingKey === 'department' || !departmentName.trim() || !departmentSlug.trim()}>
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
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.stack}>
          <SectionHeader eyebrow="Участники" title="Команда и доступы" />
          {canManageMembers ? (
            <form className={styles.stack} onSubmit={handleCreateMember}>
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

          {teamMembers?.users?.length ? (
            <div className={styles.memberList}>
              {teamMembers.users.map((member: TeamMember) => (
                <article className={styles.memberItem} key={member.id}>
                  <div className={styles.memberIdentity}>
                    <div className={styles.memberName}>{member.displayName || member.email}</div>
                    <div className={styles.memberEmail}>{member.email}</div>
                  </div>
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
                          );
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
                          );
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
                          void runMutation(
                            `remove-${member.id}`,
                            '/api/team/users/remove',
                            {
                              method: 'POST',
                              body: JSON.stringify({ userId: member.id })
                            },
                            `${member.email} удален из команды`
                          );
                        }}
                      >
                        Удалить
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>Список участников пока недоступен или пуст.</div>
          )}
        </div>
      </section>
    </div>
  );
}
