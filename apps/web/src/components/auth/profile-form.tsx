'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Banner, Button, Field, Input, MetaItem, MetaList, MutedText, SectionHeader } from '@ai-craft/ui';
import styles from './workspace-shell.module.css';

type Props = {
  initialDisplayName: string;
  email: string;
  roleLabel: string;
};

export function ProfileForm({ initialDisplayName, email, roleLabel }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = displayName.trim();
    if (!normalized || pending) return;

    setPending(true);
    setNotice('');
    setError('');

    try {
      const response = await fetch('/api/account/profile', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ displayName: normalized })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось сохранить профиль');
      }

      setNotice('Имя обновлено');
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось сохранить профиль');
    } finally {
      setPending(false);
    }
  };

  return (
    <form className={styles.stack} onSubmit={handleSubmit}>
      <SectionHeader
        eyebrow="Аккаунт"
        title="Мой профиль"
        description="Личные данные, под которыми ты появляешься в библиотеке шаблонов, команде и истории изменений."
      />
      <Field className={styles.field} label="Имя">
        <Input
          className={styles.input}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Как вас показывать в системе"
        />
      </Field>
      <MetaList className={styles.metaList}>
        <MetaItem className={styles.metaItem}>
          <MutedText className={styles.metaName}>Почта</MutedText>
          <span>{email}</span>
        </MetaItem>
        <MetaItem className={styles.metaItem}>
          <MutedText className={styles.metaName}>Роль</MutedText>
          <span>{roleLabel}</span>
        </MetaItem>
      </MetaList>
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
      <Button type="submit" disabled={pending || !displayName.trim()}>
        {pending ? 'Сохраняем...' : 'Сохранить профиль'}
      </Button>
    </form>
  );
}
