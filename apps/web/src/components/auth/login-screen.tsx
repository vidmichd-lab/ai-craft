'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { Banner, Button, Input } from '@ai-craft/ui';
import styles from './login-screen.module.css';

export function LoginScreen() {
  const router = useRouter();
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

      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось войти');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <Image
              className={styles.logo}
              src="/logo.svg"
              alt="AI-Craft"
              width={114}
              height={32}
              priority
            />
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <Input
                  className={styles.input}
                  type="email"
                  placeholder="Почта"
                  autoComplete="username"
                  value={email}
                  style={{ minHeight: 36, padding: '8px 12px', borderColor: 'transparent' }}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className={styles.field}>
                <Input
                  className={`${styles.input} ${styles.passwordInput}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Пароль"
                  autoComplete="current-password"
                  value={password}
                  style={{ minHeight: 36, padding: '8px 12px', borderColor: 'transparent' }}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className={styles.toggle}
                  type="button"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? '◉' : '◌'}
                </button>
              </div>
              {error ? (
                <Banner className={styles.error} tone="error">
                  {error}
                </Banner>
              ) : null}
              <Button
                className={styles.submit}
                size="sm"
                type="submit"
                disabled={!canSubmit || pending}
                style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}
              >
                {pending ? 'Входим...' : 'Войти'}
              </Button>
            </form>
          </div>
          <div className={styles.footer}>
            Вайб-код от <strong>@vidmich</strong>
          </div>
        </div>
        <div className={styles.hero} aria-hidden="true" />
      </section>
    </main>
  );
}
