'use client';

import { legacySnapshotAdapter, type EditorDocument } from '@ai-craft/editor-model';
import {
  DEFAULT_PREVIEW_SURFACES,
  renderEditorSnapshotToSurfaces,
  type PreviewSurface
} from '@ai-craft/editor-renderer';
import { Button, Input, SegmentedControl, SegmentedControlItem, StatCard } from '@ai-craft/ui';
import { useEffect, useMemo, useState } from 'react';
import styles from './workspace-shell.module.css';

const RENDERER_ASSET_BASE = process.env.NEXT_PUBLIC_LEGACY_ASSET_BASE_URL || 'https://aicrafter.ru';

type Props = {
  state: EditorDocument;
  activeSurfaceKey: PreviewSurface['key'];
  onSurfaceChange: (surfaceKey: PreviewSurface['key']) => void;
  archiveName: string;
  onArchiveNameChange: (value: string) => void;
  exportScale: 1 | 2;
  onExportScaleChange: (value: 1 | 2) => void;
  exportMaxKilobytes: number;
  onExportMaxKilobytesChange: (value: number) => void;
};

const blobFromCanvas = async (
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg',
  quality?: number
) => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) {
    throw new Error('Не удалось сформировать файл для экспорта');
  }
  return blob;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function EditorPreview({
  state,
  activeSurfaceKey,
  onSurfaceChange,
  archiveName,
  onArchiveNameChange,
  exportScale,
  onExportScaleChange,
  exportMaxKilobytes,
  onExportMaxKilobytesChange
}: Props) {
  const canvasRefs = useMemo(
    () => ({
      wide: { current: null as HTMLCanvasElement | null },
      square: { current: null as HTMLCanvasElement | null },
      narrow: { current: null as HTMLCanvasElement | null }
    }),
    []
  );
  const [error, setError] = useState('');

  const activeSurface =
    DEFAULT_PREVIEW_SURFACES.find((surface) => surface.key === activeSurfaceKey) || DEFAULT_PREVIEW_SURFACES[0];

  const buildFilename = (surface: PreviewSurface, extension: 'png' | 'jpg') => {
    const safeBase = String(archiveName || state.brand.name || 'layout')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]+/gi, '');

    return `${safeBase || 'layout'}-${surface.width}x${surface.height}-x${exportScale}.${extension}`;
  };

  const cloneForScale = (source: HTMLCanvasElement) => {
    if (exportScale === 1) return source;
    const scaled = document.createElement('canvas');
    scaled.width = source.width * exportScale;
    scaled.height = source.height * exportScale;
    const ctx = scaled.getContext('2d');
    if (!ctx) {
      throw new Error('Не удалось подготовить scaled canvas');
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, 0, 0, scaled.width, scaled.height);
    return scaled;
  };

  const downloadCanvas = async (surfaceKey: PreviewSurface['key'], format: 'png' | 'jpg') => {
    const surface = DEFAULT_PREVIEW_SURFACES.find((entry) => entry.key === surfaceKey) || DEFAULT_PREVIEW_SURFACES[0];
    const canvas = canvasRefs[surfaceKey as keyof typeof canvasRefs].current;
    if (!canvas) return;

    try {
      const workingCanvas = cloneForScale(canvas);
      if (format === 'png') {
        const blob = await blobFromCanvas(workingCanvas, 'image/png');
        downloadBlob(blob, buildFilename(surface, 'png'));
        return;
      }

      const targetBytes = Math.max(1, exportMaxKilobytes) * 1024;
      let quality = 0.92;
      let blob = await blobFromCanvas(workingCanvas, 'image/jpeg', quality);
      while (blob.size > targetBytes && quality > 0.42) {
        quality -= 0.08;
        blob = await blobFromCanvas(workingCanvas, 'image/jpeg', quality);
      }
      downloadBlob(blob, buildFilename(surface, 'jpg'));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось выгрузить изображение');
    }
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
    <div className={styles.previewShell}>
      <section className={styles.previewStage}>
        <SegmentedControl className={styles.surfaceTabs}>
          {DEFAULT_PREVIEW_SURFACES.map((surface) => (
            <SegmentedControlItem
              key={surface.key}
              className={styles.surfaceTab}
              active={activeSurface.key === surface.key}
              onClick={() => onSurfaceChange(surface.key)}
            >
              {surface.width}×{surface.height}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        {error ? <div className={styles.error}>{error}</div> : null}
        <div className={styles.canvasCard}>
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
                hidden={activeSurface.key !== surface.key}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className={styles.exportRail}>
        <div className={styles.subPanel}>
          <div className={styles.sectionLabel}>Архив</div>
          <Input
            className={styles.input}
            value={archiveName}
            onChange={(event) => onArchiveNameChange(event.target.value)}
            placeholder="Имя архива"
          />
        </div>

        <div className={styles.subPanel}>
          <div className={styles.sectionLabel}>Масштаб экспорта</div>
          <SegmentedControl className={styles.segmentedRow}>
            <SegmentedControlItem
              className={styles.segmentedButton}
              active={exportScale === 1}
              onClick={() => onExportScaleChange(1)}
            >
              ×1
            </SegmentedControlItem>
            <SegmentedControlItem
              className={styles.segmentedButton}
              active={exportScale === 2}
              onClick={() => onExportScaleChange(2)}
            >
              ×2
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        <div className={styles.subPanel}>
          <div className={styles.sectionLabel}>Макс. размер, кб</div>
          <Input
            className={styles.input}
            type="number"
            min="20"
            max="5000"
            value={exportMaxKilobytes}
            onChange={(event) => onExportMaxKilobytesChange(Number(event.target.value) || 200)}
          />
        </div>

        <div className={styles.subPanel}>
          <div className={styles.sectionLabel}>Экспорт</div>
          <div className={styles.stack}>
            <Button className={styles.exportButton} type="button" variant="inverted" onClick={() => void downloadCanvas(activeSurface.key, 'png')}>
              Скачать PNG
            </Button>
            <Button className={styles.exportButton} type="button" variant="neutral" onClick={() => void downloadCanvas(activeSurface.key, 'jpg')}>
              Скачать JPG
            </Button>
          </div>
        </div>

        <div className={styles.heroStats}>
          <StatCard
            className={styles.heroStat}
            label="Активный размер"
            value={`${activeSurface.width}×${activeSurface.height}`}
            hint={activeSurface.label}
          />
        </div>
      </aside>
    </div>
  );
}
