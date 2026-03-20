'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getProjectDocumentPreview, normalizeStoredTemplateState } from '@ai-craft/editor-model';
import { Banner, Button, SectionHeader } from '@ai-craft/ui';
import styles from './workspace-shell.module.css';

type TemplateItem = {
  id: string;
  name: string;
  authorName: string;
  createdAt: string;
  state: Record<string, unknown>;
};

export type TemplatesLibraryItem = TemplateItem;

type Props = {
  onApplyTemplate?: (template: TemplateItem) => void;
  refreshKey?: number;
};

export function TemplatesLibrary({ onApplyTemplate, refreshKey = 0 }: Props) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/templates', { credentials: 'include' });
        const payload = (await response.json().catch(() => null)) as { templates?: TemplateItem[]; error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error || 'Не удалось загрузить шаблоны');
        }
        if (!cancelled) {
          setTemplates(Array.isArray(payload?.templates) ? payload.templates : []);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Не удалось загрузить шаблоны');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <section className={styles.panel}>
      <div className={styles.stack}>
        <SectionHeader eyebrow="Templates" title="Библиотека шаблонов" />
        {loading ? <div className={styles.empty}>Загружаем шаблоны...</div> : null}
        {error ? (
          <Banner className={styles.error} tone="error">
            {error}
          </Banner>
        ) : null}
        {!loading && !error ? (
          templates.length ? (
            <div className={styles.templateGrid}>
              {templates.map((template) => {
                const structuredTemplate = normalizeStoredTemplateState(template.state, template.name);
                const preview = getProjectDocumentPreview(structuredTemplate.definition.document);
                return (
                  <article className={styles.templateCard} key={template.id}>
                    <div className={styles.templatePreview} style={{ background: preview.backgroundColor }}>
                      {preview.backgroundImage ? (
                        <Image
                          className={styles.templatePreviewImage}
                          src={preview.backgroundImage}
                          alt=""
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, 360px"
                        />
                      ) : null}
                      <div className={styles.templateOverlay} />
                      <div className={styles.templateContent}>
                        {preview.logo ? (
                          <Image
                            className={styles.templateLogo}
                            src={preview.logo}
                            alt=""
                            width={72}
                            height={24}
                            unoptimized
                          />
                        ) : null}
                        <div className={styles.templateLabel}>{template.name}</div>
                        <div className={styles.templateTitle}>{preview.title}</div>
                        {preview.subtitle ? <div className={styles.templateSubtitle}>{preview.subtitle}</div> : null}
                      </div>
                    </div>
                    <div className={styles.stack}>
                      <div className={styles.memberName}>{template.name}</div>
                      <div className={styles.memberEmail}>Автор: {template.authorName || 'Неизвестно'}</div>
                      <div className={styles.memberEmail}>Доступ: вся команда</div>
                      <div className={styles.memberEmail}>Recipe: {structuredTemplate.definition.recipe}</div>
                      <div className={styles.memberEmail}>{new Date(template.createdAt).toLocaleString('ru-RU')}</div>
                      {onApplyTemplate ? (
                        <Button type="button" onClick={() => onApplyTemplate(template)}>
                          Применить в редактор
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>Шаблонов пока нет. Редактор уже умеет сохранять сюда новые.</div>
          )
        ) : null}
      </div>
    </section>
  );
}
