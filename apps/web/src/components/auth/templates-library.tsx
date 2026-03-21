'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { getProjectDocumentPreview, normalizeStoredTemplateState } from '@ai-craft/editor-model';
import {
  Banner,
  Button,
  EmptyStateLayout,
  Input,
  Section,
  SidebarSection,
  SplitLayout,
  StatGroup,
  Toolbar,
  ToolbarGroup
} from '@ai-craft/ui';
import { buildSolidPreviewDataUrl } from './preview-background';
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
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [refreshKey, reloadKey]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...templates]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .filter((template) => {
        if (!normalizedQuery) return true;

        const haystack = [
          template.name,
          template.authorName,
          JSON.stringify(template.state || {})
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });
  }, [query, templates]);

  const latestTemplate = filteredTemplates[0] || templates[0] || null;

  return (
    <Section
      className={styles.panel}
      eyebrow="Templates"
      title="Библиотека шаблонов"
      description="Сохраняй удачные сцены из редактора и быстро возвращай их в работу всей командой."
    >
      <Toolbar className={styles.toolbarRow}>
        <ToolbarGroup className={styles.toolbarInput}>
          <Input
            className={`${styles.input} ${styles.toolbarInput}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию, автору или содержимому"
          />
        </ToolbarGroup>
        <ToolbarGroup>
          <Button type="button" onClick={() => setReloadKey((current) => current + 1)} disabled={loading}>
            {loading ? 'Обновляем...' : 'Обновить'}
          </Button>
        </ToolbarGroup>
      </Toolbar>
      <div className={styles.sectionDescription}>
        Найдено шаблонов: {filteredTemplates.length}
      </div>
        {loading ? <div className={styles.empty}>Загружаем шаблоны...</div> : null}
        {error ? (
          <Banner className={styles.error} tone="error">
            {error}
          </Banner>
        ) : null}
        {!loading && !error ? (
          <SplitLayout
            className={styles.libraryLayout}
            variant="content-sidebar"
            start={
              <div className={styles.stack}>
                <StatGroup
                  className={styles.heroStats}
                  items={[
                    { className: styles.heroStat, label: 'Шаблоны', value: templates.length, hint: 'Всего в библиотеке команды' },
                    { className: styles.heroStat, label: 'В выдаче', value: filteredTemplates.length, hint: 'После текущего поиска' },
                    {
                      className: styles.heroStat,
                      label: 'Последнее обновление',
                      value: latestTemplate ? new Date(latestTemplate.createdAt).toLocaleDateString('ru-RU') : '—',
                      hint: latestTemplate ? latestTemplate.authorName || 'Неизвестный автор' : 'Пока без сохранений'
                    },
                    {
                      className: styles.heroStat,
                      label: 'Источник',
                      value: 'Editor',
                      hint: 'Новые шаблоны сохраняются прямо из рабочей сцены'
                    }
                  ]}
                />
                {filteredTemplates.length ? (
                  <div className={styles.templateGrid}>
                    {filteredTemplates.map((template) => {
                      const structuredTemplate = normalizeStoredTemplateState(template.state, template.name);
                      const preview = getProjectDocumentPreview(structuredTemplate.definition.document);
                      return (
                        <article className={styles.templateCard} key={template.id}>
                          <div className={styles.templatePreview}>
                            <Image
                              className={styles.templatePreviewImage}
                              src={buildSolidPreviewDataUrl(preview.backgroundColor)}
                              alt=""
                              fill
                              unoptimized
                              sizes="(max-width: 768px) 100vw, 360px"
                            />
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
                          <div className={styles.templateCardBody}>
                            <div className={styles.memberName}>{template.name}</div>
                            <div className={styles.templateMetaGrid}>
                              <div className={styles.templateMetaItem}>
                                <div className={styles.metaValueLabel}>Автор</div>
                                <div className={styles.templateMetaValue}>{template.authorName || 'Неизвестно'}</div>
                              </div>
                              <div className={styles.templateMetaItem}>
                                <div className={styles.metaValueLabel}>Доступ</div>
                                <div className={styles.templateMetaValue}>Вся команда</div>
                              </div>
                              <div className={styles.templateMetaItem}>
                                <div className={styles.metaValueLabel}>Recipe</div>
                                <div className={styles.templateMetaValue}>{structuredTemplate.definition.recipe}</div>
                              </div>
                              <div className={styles.templateMetaItem}>
                                <div className={styles.metaValueLabel}>Сохранен</div>
                                <div className={styles.templateMetaValue}>
                                  {new Date(template.createdAt).toLocaleString('ru-RU')}
                                </div>
                              </div>
                            </div>
                            {onApplyTemplate ? (
                              <div className={styles.templateActions}>
                                <Button type="button" onClick={() => onApplyTemplate(template)}>
                                  Применить в редактор
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyStateLayout
                    title={templates.length ? 'Ничего не найдено' : 'Шаблонов пока нет'}
                    description={
                      templates.length
                        ? 'По текущему фильтру ничего не найдено. Попробуй сократить запрос или обновить библиотеку.'
                        : 'Сохрани первую удачную сцену из редактора, и она сразу появится здесь для всей команды.'
                    }
                  />
                )}
              </div>
            }
            end={
              <aside className={`${styles.sidebarColumn} ${styles.stickyPanel}`}>
                <SidebarSection
                  className={styles.sidebarCard}
                  eyebrow="Фокус"
                  title={latestTemplate ? latestTemplate.name : 'Пока без шаблонов'}
                  description={
                    latestTemplate
                      ? 'Последний сохраненный шаблон можно быстро вернуть в редактор и продолжить с него новую сцену.'
                      : 'Библиотека оживает после первого сохранения из редактора. Дальше команда сможет переиспользовать удачные сцены без ручной сборки.'
                  }
                />
                <SidebarSection className={styles.sidebarCard} eyebrow="Как это работает" title="Шаблоны в рабочем цикле">
                  <div className={styles.sidebarList}>
                    <div className={styles.sidebarListItem}>
                      <span>1.</span>
                      <span>Собери сцену в редакторе и сохрани ее как шаблон.</span>
                    </div>
                    <div className={styles.sidebarListItem}>
                      <span>2.</span>
                      <span>Шаблон сразу станет доступен всей команде в этой библиотеке.</span>
                    </div>
                    <div className={styles.sidebarListItem}>
                      <span>3.</span>
                      <span>Применяй шаблон обратно в редактор одним действием.</span>
                    </div>
                  </div>
                </SidebarSection>
              </aside>
            }
          />
        ) : null}
    </Section>
  );
}
