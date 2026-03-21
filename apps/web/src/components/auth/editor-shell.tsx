'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  getProjectDocumentPreview,
  patchEditorDocument,
  type DeepPartial,
  type EditorDocument
} from '@ai-craft/editor-model';
import {
  Banner,
  Button,
  Input,
  GridSection,
  InspectorSection,
  Section,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SplitLayout,
  StatGroup,
  TextArea
} from '@ai-craft/ui';
import type { PreviewSurface } from '@ai-craft/editor-renderer';
import type { WorkspaceDepartmentEntry } from '@ai-craft/workspace-sdk';
import { EditorPreview } from './editor-preview';
import { buildSolidPreviewDataUrl } from './preview-background';
import styles from './workspace-shell.module.css';

type EditorPanel = 'general' | 'visual' | 'logo' | 'headline' | 'subheadline' | 'legal';

type Props = {
  state: EditorDocument;
  onChange: (next: EditorDocument) => void;
  onTemplateSaved?: () => void;
  onOpenTemplates?: () => void;
  departments?: WorkspaceDepartmentEntry[];
  eyebrow?: string;
  title?: string;
  enableTemplateSave?: boolean;
};

const PANEL_LABELS: Array<{ id: EditorPanel; label: string }> = [
  { id: 'general', label: 'Общее' },
  { id: 'visual', label: 'Визуал' },
  { id: 'logo', label: 'Логотип' },
  { id: 'headline', label: 'Заголовок' },
  { id: 'subheadline', label: 'Подзаголовок' },
  { id: 'legal', label: 'Лигал' }
];

export function EditorShell({
  state,
  onChange,
  onTemplateSaved,
  onOpenTemplates,
  departments = [],
  eyebrow = 'Studio',
  title = 'Редактор AI-Craft',
  enableTemplateSave = true
}: Props) {
  const [templateName, setTemplateName] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState<EditorPanel>('general');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [activeSurfaceKey, setActiveSurfaceKey] = useState<PreviewSurface['key']>('wide');
  const [exportScale, setExportScale] = useState<1 | 2>(1);
  const [exportMaxKilobytes, setExportMaxKilobytes] = useState(200);

  useEffect(() => {
    if (!departments.length) return;
    setSelectedDepartmentId((current) => current || departments[0]?.id || '');
  }, [departments]);

  const currentPreview = useMemo(() => getProjectDocumentPreview(state), [state]);
  const departmentOptions = departments.length
    ? departments
    : [{ id: 'general', slug: 'general', name: 'Общий', isGeneral: true } as WorkspaceDepartmentEntry];

  const update = (patch: DeepPartial<EditorDocument>) => {
    onChange(patchEditorDocument(state, patch));
  };

  const updateLayoutNumber = (key: keyof EditorDocument['layout'], fallback = 0) => (value: string) => {
    const numeric = Number(value);
    update({
      layout: {
        [key]: Number.isFinite(numeric) ? numeric : fallback
      } as DeepPartial<EditorDocument['layout']>
    });
  };

  const updateTypographyNumber = (key: keyof EditorDocument['typography'], fallback = 0) => (value: string) => {
    const numeric = Number(value);
    update({
      typography: {
        [key]: Number.isFinite(numeric) ? numeric : fallback
      } as DeepPartial<EditorDocument['typography']>
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || pending) return;
    setPending(true);
    setNotice('');
    setError('');

    try {
      const response = await fetch('/api/templates/save', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: templateName.trim(),
          document: state
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; snapshot?: { name?: string } } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось сохранить шаблон');
      }
      setNotice(`Шаблон "${payload?.snapshot?.name || templateName.trim()}" сохранен.`);
      setTemplateName('');
      onTemplateSaved?.();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось сохранить шаблон');
    } finally {
      setPending(false);
    }
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'general':
        return (
          <div className={styles.stack}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Режим проекта</span>
              <Select
                className={styles.input}
                value={state.layout.projectMode}
                onChange={(event) => update({ layout: { projectMode: event.target.value as EditorDocument['layout']['projectMode'] } })}
              >
                <option value="rsya">РСЯ</option>
                <option value="layouts">Макет</option>
              </Select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Отдел</span>
              <Select
                className={styles.input}
                value={selectedDepartmentId}
                onChange={(event) => setSelectedDepartmentId(event.target.value)}
              >
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Бренд</span>
              <Input
                className={styles.input}
                value={state.brand.name}
                onChange={(event) => update({ brand: { name: event.target.value }, theme: { name: event.target.value } })}
              />
            </label>
            <div className={styles.controlGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Тип верстки</span>
                <Select
                  className={styles.input}
                  value={state.layout.variant}
                  onChange={(event) => update({ layout: { variant: event.target.value as EditorDocument['layout']['variant'] } })}
                >
                  <option value="hero-left">Лого слева</option>
                  <option value="hero-centered">По центру</option>
                  <option value="split">Сплит</option>
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Плотность</span>
                <Select
                  className={styles.input}
                  value={state.layout.density}
                  onChange={(event) => update({ layout: { density: event.target.value as EditorDocument['layout']['density'] } })}
                >
                  <option value="default">Стандарт</option>
                  <option value="compact">Компактно</option>
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Отступ от края, %</span>
                <Input
                  className={styles.input}
                  type="number"
                  min="0"
                  max="30"
                  value={state.layout.paddingPercent}
                  onChange={(event) => updateLayoutNumber('paddingPercent', 5)(event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ориентация сцены</span>
                <Select
                  className={styles.input}
                  value={state.layout.surfaceMode}
                  onChange={(event) => update({ layout: { surfaceMode: event.target.value as EditorDocument['layout']['surfaceMode'] } })}
                >
                  <option value="auto">Авто</option>
                  <option value="horizontal">Горизонталь</option>
                  <option value="vertical">Вертикаль</option>
                </Select>
              </label>
            </div>
          </div>
        );
      case 'visual':
        return (
          <div className={styles.stack}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Цвет фона</span>
              <Input
                className={styles.input}
                value={state.theme.colors.background}
                onChange={(event) => update({ theme: { colors: { background: event.target.value } } })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Фоновое изображение</span>
              <Input
                className={styles.input}
                value={state.assets.background || ''}
                onChange={(event) => update({ assets: { background: event.target.value } })}
                placeholder="URL изображения"
              />
            </label>
            <div className={styles.controlGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Режим фона</span>
                <Select
                  className={styles.input}
                  value={state.layout.backgroundFit}
                  onChange={(event) => update({ layout: { backgroundFit: event.target.value as EditorDocument['layout']['backgroundFit'] } })}
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                  <option value="tile">Tile</option>
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Размер фона, %</span>
                <Input
                  className={styles.input}
                  type="number"
                  min="10"
                  max="500"
                  value={state.layout.backgroundScalePercent}
                  onChange={(event) => updateLayoutNumber('backgroundScalePercent', 100)(event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Позиция фона X</span>
                <Select
                  className={styles.input}
                  value={state.layout.backgroundPositionX}
                  onChange={(event) => update({ layout: { backgroundPositionX: event.target.value as EditorDocument['layout']['backgroundPositionX'] } })}
                >
                  <option value="left">Слева</option>
                  <option value="center">По центру</option>
                  <option value="right">Справа</option>
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Позиция фона Y</span>
                <Select
                  className={styles.input}
                  value={state.layout.backgroundPositionY}
                  onChange={(event) => update({ layout: { backgroundPositionY: event.target.value as EditorDocument['layout']['backgroundPositionY'] } })}
                >
                  <option value="top">Верх</option>
                  <option value="center">Центр</option>
                  <option value="bottom">Низ</option>
                </Select>
              </label>
            </div>
          </div>
        );
      case 'logo':
        return (
          <div className={styles.stack}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Логотип</span>
              <Input
                className={styles.input}
                value={state.assets.logo || ''}
                onChange={(event) => update({ assets: { logo: event.target.value } })}
                placeholder="URL логотипа"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>KV</span>
              <Input
                className={styles.input}
                value={state.assets.kv || ''}
                onChange={(event) => update({ assets: { kv: event.target.value } })}
                placeholder="Путь или URL KV"
              />
            </label>
            <div className={styles.controlGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Позиция лого</span>
                <Select
                  className={styles.input}
                  value={state.layout.logoPosition}
                  onChange={(event) => update({ layout: { logoPosition: event.target.value as EditorDocument['layout']['logoPosition'] } })}
                >
                  <option value="left">Слева</option>
                  <option value="center">По центру</option>
                  <option value="right">Справа</option>
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Позиция KV</span>
                <Select
                  className={styles.input}
                  value={state.layout.kvPosition}
                  onChange={(event) => update({ layout: { kvPosition: event.target.value as EditorDocument['layout']['kvPosition'] } })}
                >
                  <option value="left">Слева</option>
                  <option value="center">По центру</option>
                  <option value="right">Справа</option>
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Размер лого</span>
                <Input
                  className={styles.input}
                  type="number"
                  min="1"
                  max="100"
                  value={state.layout.logoSize}
                  onChange={(event) => updateLayoutNumber('logoSize', 40)(event.target.value)}
                />
              </label>
            </div>
            <div className={styles.actionsRow}>
              <Button type="button" variant={state.layout.showLogo ? 'inverted' : 'neutral'} onClick={() => update({ layout: { showLogo: !state.layout.showLogo } })}>
                {state.layout.showLogo ? 'Лого включено' : 'Лого скрыто'}
              </Button>
              <Button type="button" variant={state.layout.showKV ? 'inverted' : 'neutral'} onClick={() => update({ layout: { showKV: !state.layout.showKV } })}>
                {state.layout.showKV ? 'KV включен' : 'KV скрыт'}
              </Button>
            </div>
          </div>
        );
      case 'headline':
        return (
          <div className={styles.stack}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Заголовок</span>
              <TextArea
                className={styles.textarea}
                value={state.content.headline}
                onChange={(event) => update({ content: { headline: event.target.value } })}
              />
            </label>
            <div className={styles.controlGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Цвет заголовка</span>
                <Input
                  className={styles.input}
                  value={state.theme.colors.headline}
                  onChange={(event) => update({ theme: { colors: { headline: event.target.value } } })}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Размер заголовка</span>
                <Input
                  className={styles.input}
                  type="number"
                  min="1"
                  max="40"
                  value={state.typography.titleSize}
                  onChange={(event) => updateTypographyNumber('titleSize', 8)(event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Выравнивание</span>
                <Select
                  className={styles.input}
                  value={state.layout.alignment}
                  onChange={(event) => update({ layout: { alignment: event.target.value as EditorDocument['layout']['alignment'] } })}
                >
                  <option value="left">Слева</option>
                  <option value="center">По центру</option>
                </Select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Позиция текста</span>
                <Select
                  className={styles.input}
                  value={state.layout.textPositionY}
                  onChange={(event) => update({ layout: { textPositionY: event.target.value as EditorDocument['layout']['textPositionY'] } })}
                >
                  <option value="top">Верх</option>
                  <option value="center">Центр</option>
                  <option value="bottom">Низ</option>
                </Select>
              </label>
            </div>
          </div>
        );
      case 'subheadline':
        return (
          <div className={styles.stack}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Подзаголовок</span>
              <TextArea
                className={styles.textarea}
                value={state.content.subheadline}
                onChange={(event) => update({ content: { subheadline: event.target.value } })}
              />
            </label>
            <div className={styles.controlGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Цвет подзаголовка</span>
                <Input
                  className={styles.input}
                  value={state.theme.colors.subheadline}
                  onChange={(event) => update({ theme: { colors: { subheadline: event.target.value } } })}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Размер подзаголовка</span>
                <Input
                  className={styles.input}
                  type="number"
                  min="1"
                  max="30"
                  value={state.typography.subtitleSize}
                  onChange={(event) => updateTypographyNumber('subtitleSize', 4)(event.target.value)}
                />
              </label>
            </div>
            <Button type="button" variant={state.layout.showSubtitle ? 'inverted' : 'neutral'} onClick={() => update({ layout: { showSubtitle: !state.layout.showSubtitle } })}>
              {state.layout.showSubtitle ? 'Подзаголовок включен' : 'Подзаголовок скрыт'}
            </Button>
          </div>
        );
      case 'legal':
        return (
          <div className={styles.stack}>
            <div className={styles.controlGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Возраст</span>
                <Input
                  className={styles.input}
                  value={state.legal.ageMark}
                  onChange={(event) => update({ legal: { ageMark: event.target.value } })}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Цвет legal</span>
                <Input
                  className={styles.input}
                  value={state.legal.color}
                  onChange={(event) => update({ legal: { color: event.target.value } })}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Размер возраста</span>
                <Input
                  className={styles.input}
                  type="number"
                  min="1"
                  max="20"
                  value={state.typography.ageSize}
                  onChange={(event) => updateTypographyNumber('ageSize', 4)(event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Размер legal</span>
                <Input
                  className={styles.input}
                  type="number"
                  min="1"
                  max="20"
                  value={state.typography.legalSize}
                  onChange={(event) => updateTypographyNumber('legalSize', 2)(event.target.value)}
                />
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Legal</span>
              <TextArea
                className={styles.textarea}
                value={state.legal.body}
                onChange={(event) => update({ legal: { body: event.target.value } })}
              />
            </label>
            <Button type="button" variant={state.legal.enabled ? 'inverted' : 'neutral'} onClick={() => update({ legal: { enabled: !state.legal.enabled } })}>
              {state.legal.enabled ? 'Legal включен' : 'Legal скрыт'}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Section className={styles.panel} eyebrow={eyebrow} title={title}>
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
          className={styles.studioGrid}
          variant="inspector-preview"
          start={<aside className={styles.controlRail}>
            <InspectorSection className={styles.controlTabs} title="Панели">
              <SegmentedControl className={styles.controlTabs}>
              {PANEL_LABELS.map((panel) => (
                <SegmentedControlItem
                  key={panel.id}
                  className={styles.controlTab}
                  active={activePanel === panel.id}
                  onClick={() => setActivePanel(panel.id)}
                >
                  {panel.label}
                </SegmentedControlItem>
              ))}
              </SegmentedControl>
            </InspectorSection>
            <InspectorSection className={styles.subPanel} eyebrow="Параметры" title={PANEL_LABELS.find((entry) => entry.id === activePanel)?.label}>
              <div className={styles.sectionLabel}>{PANEL_LABELS.find((entry) => entry.id === activePanel)?.label}</div>
              {renderPanelContent()}
            </InspectorSection>
          </aside>}
          end={<EditorPreview
            state={state}
            activeSurfaceKey={activeSurfaceKey}
            onSurfaceChange={setActiveSurfaceKey}
            archiveName={templateName}
            onArchiveNameChange={setTemplateName}
            exportScale={exportScale}
            onExportScaleChange={setExportScale}
            exportMaxKilobytes={exportMaxKilobytes}
            onExportMaxKilobytesChange={setExportMaxKilobytes}
          />}
        />

        <GridSection className={styles.templateStrip} columns={3}>
          <InspectorSection className={styles.templateStripCard} eyebrow="Текущая сцена" title={state.brand.name || 'Новый макет'}>
            <div className={styles.templateStripPreview}>
              <Image
                className={styles.templatePreviewImage}
                src={buildSolidPreviewDataUrl(currentPreview.backgroundColor)}
                alt=""
                fill
                unoptimized
                sizes="240px"
              />
              {currentPreview.logo ? (
                <Image className={styles.templateStripLogo} src={currentPreview.logo} alt="" width={92} height={32} unoptimized />
              ) : null}
            </div>
            <div className={styles.templateStripText}>
              {state.content.headline || 'Добавь заголовок, и он появится в текущем снимке сцены.'}
            </div>
          </InspectorSection>

          <InspectorSection className={styles.templateStripActions} eyebrow="Действия" title="Работа с макетом">
            {enableTemplateSave ? (
              <>
                <Button type="button" variant="inverted" onClick={handleSaveTemplate} disabled={pending || !templateName.trim()}>
                  {pending ? 'Сохраняем...' : 'Сохранить текущий макет'}
                </Button>
                {onOpenTemplates ? (
                  <Button type="button" variant="neutral" onClick={onOpenTemplates}>
                    Открыть шаблоны
                  </Button>
                ) : null}
              </>
            ) : (
              <div className={styles.templateStripHint}>
                В public mode шаблоны не сохраняются в командную библиотеку. Используй JSON export/import для переноса.
              </div>
            )}
          </InspectorSection>

          <StatGroup
            className={styles.templateStripStats}
            columns={2}
            items={[
              {
                className: styles.heroStat,
                label: 'Отдел',
                value: departmentOptions.find((item) => item.id === selectedDepartmentId)?.name || 'Общий'
              },
              {
                className: styles.heroStat,
                label: 'Surface',
                value: activeSurfaceKey,
                hint: `${exportScale}x export`
              }
            ]}
          />
        </GridSection>
    </Section>
  );
}
