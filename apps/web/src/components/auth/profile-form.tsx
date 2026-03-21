'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UISchemaRenderer, type UISchemaDocument } from '@ai-craft/ui';
import styles from './workspace-shell.module.css';

type Props = {
  initialDisplayName: string;
  email: string;
  roleLabel: string;
};

const profileFormSchema: UISchemaDocument = {
  version: 1,
  root: {
    type: 'form-section',
    className: styles.stack,
    eyebrow: 'Аккаунт',
    title: 'Мой профиль',
    description: 'Личные данные, под которыми ты появляешься в библиотеке шаблонов, команде и истории изменений.',
    children: [
      {
        type: 'input-field',
        className: styles.field,
        name: 'displayName',
        label: 'Имя',
        placeholder: 'Как вас показывать в системе'
      },
      {
        type: 'meta-list',
        className: styles.metaList,
        items: [
          { label: 'Почта', value: { binding: 'email' } },
          { label: 'Роль', value: { binding: 'roleLabel' } }
        ]
      },
      {
        type: 'banner',
        className: styles.notice,
        tone: 'notice',
        text: { binding: 'notice' },
        when: { binding: 'showNotice' }
      },
      {
        type: 'banner',
        className: styles.error,
        tone: 'error',
        text: { binding: 'error' },
        when: { binding: 'showError' }
      },
      {
        type: 'button',
        label: { binding: 'submitLabel' },
        buttonType: 'submit'
      }
    ]
  }
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
      <UISchemaRenderer
        schema={profileFormSchema}
        bindings={{
          values: {
            displayName,
            email,
            roleLabel,
            notice,
            error,
            submitLabel: pending ? 'Сохраняем...' : 'Сохранить профиль'
          },
          visibility: {
            showNotice: Boolean(notice),
            showError: Boolean(error)
          },
          onValueChange: (name, value) => {
            if (name === 'displayName') {
              setDisplayName(value);
            }
          }
        }}
      />
    </form>
  );
}
