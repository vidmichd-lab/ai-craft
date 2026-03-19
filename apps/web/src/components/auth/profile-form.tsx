'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
      <div>
        <div className={styles.sectionLabel}>Аккаунт</div>
        <h2 className={styles.sectionTitle}>Мои настройки</h2>
      </div>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Имя</span>
        <input
          className={styles.input}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Как вас показывать в системе"
        />
      </label>
      <div className={styles.metaList}>
        <div className={styles.metaItem}>
          <span className={styles.metaName}>Почта</span>
          <span>{email}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaName}>Роль</span>
          <span>{roleLabel}</span>
        </div>
      </div>
      {notice ? <div className={styles.notice}>{notice}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      <button className={styles.button} type="submit" disabled={pending || !displayName.trim()}>
        {pending ? 'Сохраняем...' : 'Сохранить'}
      </button>
    </form>
  );
}
