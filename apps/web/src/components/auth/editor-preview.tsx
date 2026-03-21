'use client';

import { legacySnapshotAdapter, type EditorDocument } from '@ai-craft/editor-model';
import {
  DEFAULT_PREVIEW_SURFACES,
  renderEditorSnapshotToSurfaces,
  type PreviewSurface
} from '@ai-craft/editor-renderer';
import { useEffect, useMemo, useState } from 'react';
import styles from './workspace-shell.module.css';

const RENDERER_ASSET_BASE = process.env.NEXT_PUBLIC_LEGACY_ASSET_BASE_URL || 'https://aicrafter.ru';

type Props = {
  state: EditorDocument;
};

export function EditorPreview({ state }: Props) {
  const canvasRefs = useMemo(
    () => ({
      wide: { current: null as HTMLCanvasElement | null },
      square: { current: null as HTMLCanvasElement | null },
      narrow: { current: null as HTMLCanvasElement | null }
    }),
    []
  );
  const [error, setError] = useState('');
  const [activeSurfaceKey, setActiveSurfaceKey] = useState<PreviewSurface['key']>(DEFAULT_PREVIEW_SURFACES[0].key);

  const activeSurface =
    DEFAULT_PREVIEW_SURFACES.find((surface) => surface.key === activeSurfaceKey) || DEFAULT_PREVIEW_SURFACES[0];

  const downloadCanvas = (surfaceKey: PreviewSurface['key'], filename: string) => {
    const canvas = canvasRefs[surfaceKey as keyof typeof canvasRefs].current;
    if (!canvas) return;
    const href = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.click();
  };

  const buildFilename = (surface: PreviewSurface) => {
    const safeBrand = String(state.brand.name || 'layout')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]+/gi, '');

    return `${safeBrand || 'layout'}-${surface.width}x${surface.height}.png`;
  };

  const downloadAll = () => {
    DEFAULT_PREVIEW_SURFACES.forEach((surface) => {
      downloadCanvas(surface.key, buildFilename(surface));
    });
  };

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        setError('');
        if (cancelled) return;
        const snapshot = legacySnapshotAdapter.fromDocument(state);
        await renderEditorSnapshotToSurfaces(
          snapshot,
          Object.fromEntries(
            DEFAULT_PREVIEW_SURFACES.map((surface) => [surface.key, canvasRefs[surface.key as keyof typeof canvasRefs].current])
          ),
          {
            assetBase: RENDERER_ASSET_BASE,
            surfaces: DEFAULT_PREVIEW_SURFACES
          }
        );
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Preview render failed');
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [canvasRefs, state]);

  return (
    <div className={styles.previewStack}>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.workspaceTabs}>
        {DEFAULT_PREVIEW_SURFACES.map((surface) => (
          <button
            key={surface.key}
            className={`${styles.workspaceTab} ${activeSurface.key === surface.key ? styles.workspaceTabActive : ''}`}
            type="button"
            onClick={() => setActiveSurfaceKey(surface.key)}
          >
            {surface.label}
          </button>
        ))}
      </div>
      <div className={styles.previewGrid}>
        <section className={styles.canvasCard}>
          <div className={styles.canvasMeta}>
            <span>{activeSurface.label}</span>
            <span>
              {activeSurface.width}×{activeSurface.height}
            </span>
          </div>
          <div className={styles.canvasViewport}>
            {DEFAULT_PREVIEW_SURFACES.map((surface) => (
              <canvas
                key={surface.key}
                ref={(node) => {
                  canvasRefs[surface.key as keyof typeof canvasRefs].current = node;
                }}
                className={styles.previewCanvas}
                style={{ display: activeSurface.key === surface.key ? 'block' : 'none' }}
              />
            ))}
          </div>
        </section>

        <div className={styles.stack}>
          <section className={styles.subPanel}>
            <div className={styles.sectionLabel}>Экспорт</div>
            <div className={styles.actionsRow}>
              <button
                className={styles.button}
                type="button"
                onClick={() => downloadCanvas(activeSurface.key, buildFilename(activeSurface))}
              >
                Скачать PNG
              </button>
              <button className={styles.button} type="button" onClick={downloadAll}>
                Скачать все PNG
              </button>
            </div>
            <div className={styles.description}>
              Активный размер: {activeSurface.width}×{activeSurface.height}. Можно переключать форматы выше без смены
              рабочего состояния.
            </div>
          </section>
          <section className={styles.subPanel}>
            <div className={styles.sectionLabel}>Быстрый обзор</div>
            <div className={styles.canvasGrid}>
              {DEFAULT_PREVIEW_SURFACES.filter((surface) => surface.key !== activeSurface.key).map((surface) => (
                <button
                  key={surface.key}
                  className={styles.canvasCard}
                  type="button"
                  onClick={() => setActiveSurfaceKey(surface.key)}
                >
                  <div className={styles.canvasMeta}>
                    <span>{surface.label}</span>
                    <span>
                      {surface.width}×{surface.height}
                    </span>
                  </div>
                  <div className={styles.canvasViewport}>
                    <canvas
                      ref={(node) => {
                        canvasRefs[surface.key as keyof typeof canvasRefs].current = node;
                      }}
                      className={styles.previewCanvas}
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
