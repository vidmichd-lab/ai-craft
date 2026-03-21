'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { Banner, Button, FormSection, InputField, PageLayout, Section, SplitLayout } from '@ai-craft/ui';
import styles from './login-screen.module.css';

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => Boolean(email.trim() && password), [email, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || pending) return;

    setPending(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось войти');
      }

      window.location.assign('/');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось войти');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className={styles.page}>
      <PageLayout className={styles.layout}>
        <SplitLayout
          className={styles.shell}
          variant="balanced"
          start={
            <FormSection
              className={styles.card}
              bodyClassName={styles.cardBody}
              eyebrow="Workspace"
              title="Вход в AI-Craft"
              description="Единый studio shell для шаблонов, медиа и редактора."
              footer={
                <div className={styles.footer}>
                  Вайб-код от <strong>@vidmich</strong>
                </div>
              }
            >
              <Image
                className={styles.logo}
                src="/logo.svg"
                alt="AI-Craft"
                width={114}
                height={32}
                priority
              />
              <form className={styles.form} onSubmit={handleSubmit}>
                <InputField
                  label="Email"
                  type="email"
                  placeholder="Почта"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <InputField
                  label="Пароль"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Пароль"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  trailingIcon={
                    <Button
                      className={styles.toggle}
                      variant="ghost"
                      size="sm"
                      iconOnly
                      type="button"
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path
                          d="M2.2 9C3.78 6.26 6.11 4.88 9 4.88C11.89 4.88 14.22 6.26 15.8 9C14.22 11.74 11.89 13.12 9 13.12C6.11 13.12 3.78 11.74 2.2 9Z"
                          stroke="currentColor"
                          strokeWidth="1.35"
                        />
                        <circle cx="9" cy="9" r="2.1" fill="currentColor" opacity={showPassword ? 1 : 0.4} />
                      </svg>
                    </Button>
                  }
                />
                {error ? (
                  <Banner className={styles.error} tone="error">
                    {error}
                  </Banner>
                ) : null}
                <div className={styles.formActions}>
                  <Button size="sm" type="submit" disabled={!canSubmit || pending}>
                    {pending ? 'Входим...' : 'Войти'}
                  </Button>
                </div>
              </form>
              <div className={styles.secondaryActions}>
                <div className={styles.secondaryText}>Нужен только визуальный редактор без логина?</div>
                <Link className={`ui-button ui-button-ghost ${styles.editorLink}`} href="/editor">
                  Открыть editor без логина
                </Link>
              </div>
            </FormSection>
          }
          end={
            <Section
              className={styles.heroSection}
              bodyClassName={styles.heroBody}
              eyebrow="Simple Design System"
              title="Стабильный интерфейс без ad hoc UI"
              description="Экран собирается через recipes и shared controls, а не через локальный визуальный fork."
            >
              <div className={styles.hero} aria-hidden="true" />
            </Section>
          }
        />
      </PageLayout>
    </main>
  );
}
