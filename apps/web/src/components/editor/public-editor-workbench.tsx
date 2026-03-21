'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createDefaultEditorDocument, normalizeEditorDocument, type EditorDocument } from '@ai-craft/editor-model';
import {
  Banner,
  Button,
  PageHeader,
  PageLayout,
  Section,
  SegmentedControl,
  SegmentedControlItem,
  StatGroup
} from '@ai-craft/ui';
import { EditorShell } from '@/components/auth/editor-shell';
import styles from '@/components/auth/workspace-shell.module.css';

const STORAGE_KEY = 'ai-craft.public-editor.document.v1';

const formatTimestamp = (value: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(value);

const buildExportFilename = (state: EditorDocument) => {
  const safeBrand = String(state.brand.name || 'layout')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]+/gi, '');

  return `${safeBrand || 'layout'}-editor-document.json`;
};

export function PublicEditorWorkbench() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<EditorDocument>(createDefaultEditorDocument());
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        setState(normalizeEditorDocument(parsed));
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось восстановить локальный черновик');
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setLastSavedAt(Date.now());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось сохранить локальный черновик');
    }
  }, [hydrated, state]);

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildExportFilename(state);
      link.click();
      URL.revokeObjectURL(url);
      setNotice('JSON состояния экспортирован.');
      setError('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось экспортировать состояние');
    }
  };

  const handleReset = () => {
    setState(createDefaultEditorDocument());
    setNotice('Редактор сброшен к базовому состоянию.');
    setError('');
  };

  const handleImportRequest = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      setState(normalizeEditorDocument(parsed));
      setNotice(`Импортирован черновик из ${file.name}.`);
      setError('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось импортировать JSON');
    }
  };

  return (
    <main className={styles.page}>
      <PageLayout className={styles.shell} header={
        <PageHeader
          className={styles.header}
          brand={
            <Link className={styles.logo} href="/" aria-label="AI-Craft">
              <Image src="/logo.svg" alt="AI-Craft" width={122} height={34} priority />
            </Link>
          }
          eyebrow="AI-Craft Studio"
          title="Public editor"
          description="JSON-черновик · локальное сохранение · быстрый перенос в основной workspace"
          badges={<div className={styles.badge}>{lastSavedAt ? `Сохранено в ${formatTimestamp(lastSavedAt)}` : 'Локальный черновик'}</div>}
          actions={
            <>
              <Button className={styles.headerButton} variant="ghost" type="button" onClick={handleExport}>
                Экспорт JSON
              </Button>
              <Button className={styles.headerButton} variant="ghost" type="button" onClick={handleImportRequest}>
                Импорт JSON
              </Button>
              <Button className={styles.headerButton} variant="ghost" type="button" onClick={handleReset}>
                Сбросить
              </Button>
              <Link className={styles.headerLink} href="/">
                В workspace
              </Link>
            </>
          }
        />
      }>
        <Section className={styles.workspaceNavCard}>
          <SegmentedControl className={styles.workspaceTabs} aria-label="Режимы public editor">
            <SegmentedControlItem className={`${styles.workspaceTab} ${styles.workspaceTabActive}`} active type="button">
              Редактор
            </SegmentedControlItem>
            <SegmentedControlItem className={styles.workspaceTab} type="button" onClick={handleImportRequest}>
              Импорт JSON
            </SegmentedControlItem>
            <SegmentedControlItem className={styles.workspaceTab} type="button" onClick={handleExport}>
              Экспорт JSON
            </SegmentedControlItem>
          </SegmentedControl>
          <StatGroup
            className={styles.statusGrid}
            items={[
              { className: styles.statusCard, label: 'Режим', value: 'Local' },
              { className: styles.statusCard, label: 'Состояние', value: hydrated ? 'Активно' : 'Стартуем' },
              { className: styles.statusCard, label: 'Хранилище', value: 'localStorage' },
              { className: styles.statusCard, label: 'Переход', value: 'JSON → workspace' }
            ]}
          />
        </Section>

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

        <input
          ref={fileInputRef}
          className={styles.hiddenInput}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
        />

        <EditorShell
          state={state}
          onChange={setState}
          eyebrow="Public mode"
          title="Локальная рабочая сцена"
          enableTemplateSave={false}
        />
      </PageLayout>
    </main>
  );
}
