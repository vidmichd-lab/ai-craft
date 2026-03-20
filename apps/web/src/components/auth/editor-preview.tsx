'use client';

import { legacySnapshotAdapter, type EditorDocument } from '@ai-craft/editor-model';
import { DEFAULT_PREVIEW_SURFACES, renderEditorSnapshotToSurfaces, type PreviewSurface } from '@ai-craft/editor-renderer';
import { useEffect, useMemo, useState } from 'react';
import styles from './workspace-shell.module.css';

const RENDERER_ASSET_BASE = process.env.NEXT_PUBLIC_LEGACY_ASSET_BASE_URL || 'https://ai-craft.website.yandexcloud.net';

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

  const downloadCanvas = (surfaceKey: string, filename: string) => {
    const canvas = canvasRefs[surfaceKey as keyof typeof canvasRefs].current;
    if (!canvas) return;
    const href = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.click();
  };

  const downloadAll = () => {
    DEFAULT_PREVIEW_SURFACES.forEach((surface: PreviewSurface) => {
      const safeBrand = String(state.brand.name || 'layout')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]+/gi, '');
      downloadCanvas(surface.key, `${safeBrand || 'layout'}-${surface.width}x${surface.height}.png`);
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
      <div className={styles.actionsRow}>
        <button className={styles.button} type="button" onClick={downloadAll}>
          Скачать все PNG
        </button>
      </div>
      <div className={styles.canvasGrid}>
        {DEFAULT_PREVIEW_SURFACES.map((surface: PreviewSurface) => (
          <section className={styles.canvasCard} key={surface.key}>
            <div className={styles.canvasMeta}>
              <span>{surface.label}</span>
              <span>{surface.width / surface.height > 1 ? 'Горизонталь' : surface.width === surface.height ? 'Квадрат' : 'Вертикаль'}</span>
            </div>
            <div className={styles.canvasViewport}>
              <canvas
                ref={(node) => {
                  canvasRefs[surface.key as keyof typeof canvasRefs].current = node;
                }}
                className={styles.previewCanvas}
              />
            </div>
            <div className={styles.actionsRow}>
              <button
                className={styles.button}
                type="button"
                onClick={() => downloadCanvas(surface.key, `${state.brand.name || 'layout'}-${surface.width}x${surface.height}.png`)}
              >
                Скачать PNG
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
