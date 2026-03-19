'use client';

import { useState } from 'react';
import { LegacyPreview } from './legacy-preview';
import styles from './workspace-shell.module.css';
import type { EditorSnapshot } from './editor-types';

type Props = {
  state: EditorSnapshot;
  onChange: (next: EditorSnapshot) => void;
  onTemplateSaved?: () => void;
};

export function EditorShell({ state, onChange, onTemplateSaved }: Props) {
  const [templateName, setTemplateName] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const update = (patch: Partial<EditorSnapshot>) => {
    const next = { ...state, ...patch };
    const pair = {
      title: next.title,
      subtitle: next.subtitle,
      bgColor: next.bgColor,
      bgImageSelected: next.bgImageSelected,
      kvSelected: next.kvSelected
    };
    next.titleSubtitlePairs = [pair];
    next.activePairIndex = 0;
    onChange(next);
  };

  const updateNumber = (key: keyof EditorSnapshot, fallback = 0) => (value: string) => {
    const numeric = Number(value);
    update({ [key]: Number.isFinite(numeric) ? numeric : fallback } as Partial<EditorSnapshot>);
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
          state
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

  return (
    <section className={styles.panel}>
      <div className={styles.stack}>
        <div>
          <div className={styles.sectionLabel}>Editor</div>
          <h2 className={styles.sectionTitle}>Workspace editor shell</h2>
        </div>
        {notice ? <div className={styles.notice}>{notice}</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        <div className={styles.editorGrid}>
          <div className={styles.stack}>
            <section className={styles.subPanel}>
              <div className={styles.sectionLabel}>Structure</div>
              <div className={styles.controlGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Режим проекта</span>
                  <select
                    className={styles.input}
                    value={state.projectMode}
                    onChange={(event) => update({ projectMode: event.target.value as EditorSnapshot['projectMode'] })}
                  >
                    <option value="rsya">Перформанс</option>
                    <option value="layouts">Макеты</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Бренд</span>
                  <input className={styles.input} value={state.brandName} onChange={(event) => update({ brandName: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Отступ от края, %</span>
                  <input className={styles.input} type="number" min="0" max="30" value={state.paddingPercent} onChange={(event) => updateNumber('paddingPercent', 5)(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Позиция лого</span>
                  <select className={styles.input} value={String(state.logoPos || 'left')} onChange={(event) => update({ logoPos: event.target.value })}>
                    <option value="left">Слева</option>
                    <option value="center">По центру</option>
                    <option value="right">Справа</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Позиция KV</span>
                  <select className={styles.input} value={String(state.kvPosition || 'center')} onChange={(event) => update({ kvPosition: event.target.value })}>
                    <option value="left">Слева</option>
                    <option value="center">По центру</option>
                    <option value="right">Справа</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Тип макета</span>
                  <select className={styles.input} value={String(state.layoutMode || 'auto')} onChange={(event) => update({ layoutMode: event.target.value })}>
                    <option value="auto">Auto</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </label>
              </div>
              <div className={styles.actionsRow}>
                <button className={styles.button} type="button" onClick={() => update({ showLogo: !state.showLogo })}>
                  {state.showLogo ? 'Скрыть лого' : 'Показать лого'}
                </button>
                <button className={styles.button} type="button" onClick={() => update({ showKV: !state.showKV })}>
                  {state.showKV ? 'Скрыть KV' : 'Показать KV'}
                </button>
                <button className={styles.button} type="button" onClick={() => update({ showSubtitle: !state.showSubtitle })}>
                  {state.showSubtitle ? 'Скрыть саб' : 'Показать саб'}
                </button>
                <button className={styles.button} type="button" onClick={() => update({ showLegal: !state.showLegal })}>
                  {state.showLegal ? 'Скрыть legal' : 'Показать legal'}
                </button>
              </div>
            </section>

            <section className={styles.subPanel}>
              <div className={styles.sectionLabel}>Copy</div>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Заголовок</span>
                <textarea className={styles.textarea} value={state.title} onChange={(event) => update({ title: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Подзаголовок</span>
                <textarea className={styles.textarea} value={state.subtitle} onChange={(event) => update({ subtitle: event.target.value })} />
              </label>
              <div className={styles.controlGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Цвет заголовка</span>
                  <input className={styles.input} value={String(state.titleColor || '#ffffff')} onChange={(event) => update({ titleColor: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Цвет подзаголовка</span>
                  <input className={styles.input} value={String(state.subtitleColor || '#e0e0e0')} onChange={(event) => update({ subtitleColor: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Размер заголовка</span>
                  <input className={styles.input} type="number" min="1" max="40" value={Number(state.titleSize || 8)} onChange={(event) => updateNumber('titleSize', 8)(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Размер подзаголовка</span>
                  <input className={styles.input} type="number" min="1" max="30" value={Number(state.subtitleSize || 4)} onChange={(event) => updateNumber('subtitleSize', 4)(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Выравнивание заголовка</span>
                  <select className={styles.input} value={String(state.titleAlign || 'left')} onChange={(event) => update({ titleAlign: event.target.value })}>
                    <option value="left">Слева</option>
                    <option value="center">По центру</option>
                    <option value="right">Справа</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Позиция текста</span>
                  <select className={styles.input} value={String(state.titleVPos || 'top')} onChange={(event) => update({ titleVPos: event.target.value })}>
                    <option value="top">Верх</option>
                    <option value="center">Центр</option>
                    <option value="bottom">Низ</option>
                  </select>
                </label>
              </div>
            </section>

            <section className={styles.subPanel}>
              <div className={styles.sectionLabel}>Assets</div>
              <div className={styles.controlGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Цвет фона</span>
                  <input className={styles.input} value={state.bgColor} onChange={(event) => update({ bgColor: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Размер фона, %</span>
                  <input className={styles.input} type="number" min="10" max="500" value={Number(state.bgImageSize || 100)} onChange={(event) => updateNumber('bgImageSize', 100)(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Позиция фона X</span>
                  <select className={styles.input} value={String(state.bgPosition || 'center')} onChange={(event) => update({ bgPosition: event.target.value })}>
                    <option value="left">Слева</option>
                    <option value="center">По центру</option>
                    <option value="right">Справа</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Позиция фона Y</span>
                  <select className={styles.input} value={String(state.bgVPosition || 'center')} onChange={(event) => update({ bgVPosition: event.target.value })}>
                    <option value="top">Верх</option>
                    <option value="center">Центр</option>
                    <option value="bottom">Низ</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Режим фона</span>
                  <select className={styles.input} value={String(state.bgSize || 'cover')} onChange={(event) => update({ bgSize: event.target.value })}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                    <option value="tile">Tile</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Размер лого</span>
                  <input className={styles.input} type="number" min="1" max="100" value={Number(state.logoSize || 40)} onChange={(event) => updateNumber('logoSize', 40)(event.target.value)} />
                </label>
              </div>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Фоновое изображение</span>
                <input className={styles.input} value={state.bgImageSelected} onChange={(event) => update({ bgImageSelected: event.target.value })} placeholder="URL изображения" />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Логотип</span>
                <input className={styles.input} value={state.logoSelected} onChange={(event) => update({ logoSelected: event.target.value })} placeholder="URL логотипа" />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>KV</span>
                <input className={styles.input} value={state.kvSelected} onChange={(event) => update({ kvSelected: event.target.value })} placeholder="Путь или URL KV" />
              </label>
            </section>

            <section className={styles.subPanel}>
              <div className={styles.sectionLabel}>Legal</div>
              <div className={styles.controlGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Возраст</span>
                  <input className={styles.input} value={String(state.age || '18+')} onChange={(event) => update({ age: event.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Размер возраста</span>
                  <input className={styles.input} type="number" min="1" max="20" value={Number(state.ageSize || 4)} onChange={(event) => updateNumber('ageSize', 4)(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Размер legal</span>
                  <input className={styles.input} type="number" min="1" max="20" value={Number(state.legalSize || 2)} onChange={(event) => updateNumber('legalSize', 2)(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Цвет legal</span>
                  <input className={styles.input} value={String(state.legalColor || '#ffffff')} onChange={(event) => update({ legalColor: event.target.value })} />
                </label>
              </div>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Legal</span>
                <textarea className={styles.textarea} value={String(state.legal || '')} onChange={(event) => update({ legal: event.target.value })} />
              </label>
            </section>

            <section className={styles.subPanel}>
              <div className={styles.sectionLabel}>Templates</div>
              <div className={styles.actionsRow}>
                <input
                  className={styles.input}
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Название шаблона"
                />
                <button className={styles.button} type="button" onClick={handleSaveTemplate} disabled={pending || !templateName.trim()}>
                  {pending ? 'Сохраняем...' : 'Сохранить как шаблон'}
                </button>
              </div>
            </section>
          </div>

          <div className={styles.editorPreviewWrap}>
            <LegacyPreview state={state} />
          </div>
        </div>
      </div>
    </section>
  );
}
