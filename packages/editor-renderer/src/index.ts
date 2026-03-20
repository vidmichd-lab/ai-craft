import {
  createDefaultEditorSnapshot,
  normalizeEditorSnapshot,
  type EditorSnapshot
} from '@ai-craft/editor-model';
import defaultRenderState from './default-render-state.json';
import {
  clearTextMeasurementCache,
  renderToCanvas
} from './legacy/render-to-canvas.js';
import {
  configureLegacyRendererRuntime,
  getLegacyStateSnapshot
} from './legacy/runtime-config.js';

export type PreviewSurface = {
  key: string;
  label: string;
  width: number;
  height: number;
};

export const DEFAULT_PREVIEW_SURFACES: PreviewSurface[] = [
  { key: 'wide', label: '1600×1200', width: 1600, height: 1200 },
  { key: 'square', label: '1080×1080', width: 1080, height: 1080 },
  { key: 'narrow', label: '1080×1920', width: 1080, height: 1920 }
];

const isAbsoluteAsset = (value: string) =>
  /^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:');

export const resolveRendererAssetUrl = (value: string, assetBase: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (isAbsoluteAsset(trimmed)) return trimmed;
  return `${assetBase.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
};

export const loadRendererImageElement = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export { clearTextMeasurementCache, renderToCanvas };
export { configureLegacyRendererRuntime };

export const createDefaultRenderState = () => JSON.parse(JSON.stringify(defaultRenderState)) as Record<string, unknown>;

const getBaseRenderState = async () => {
  const snapshot = getLegacyStateSnapshot();
  if (snapshot && typeof snapshot === 'object') {
    return snapshot as Record<string, unknown>;
  }

  return createDefaultRenderState() || (createDefaultEditorSnapshot() as Record<string, unknown>);
};

export const renderEditorSnapshotToSurfaces = async (
  state: EditorSnapshot,
  canvases: Record<string, HTMLCanvasElement | null>,
  options: {
    assetBase: string;
    surfaces?: PreviewSurface[];
  }
) => {
  const baseState = await getBaseRenderState();
  const surfaces = options.surfaces || DEFAULT_PREVIEW_SURFACES;
  const normalizedState = normalizeEditorSnapshot(state as Record<string, unknown>);
  const pair = Array.isArray(normalizedState.titleSubtitlePairs) && normalizedState.titleSubtitlePairs.length
    ? normalizedState.titleSubtitlePairs[0]
    : null;

  const bgImagePath = String(normalizedState.bgImageSelected || pair?.bgImageSelected || '');
  const logoPath = String(normalizedState.logoSelected || '');
  const kvPath = String(normalizedState.kvSelected || pair?.kvSelected || baseState.kvSelected || '');

  const [bgImage, logoImage, kvImage] = await Promise.all([
    loadRendererImageElement(resolveRendererAssetUrl(bgImagePath, options.assetBase)),
    loadRendererImageElement(resolveRendererAssetUrl(logoPath, options.assetBase)),
    loadRendererImageElement(resolveRendererAssetUrl(kvPath, options.assetBase))
  ]);

  const legacyState = {
    ...baseState,
    ...normalizedState,
    title: normalizedState.title,
    subtitle: normalizedState.subtitle,
    brandName: normalizedState.brandName,
    bgColor: normalizedState.bgColor,
    bgImageSelected: bgImagePath || null,
    bgImage,
    logoSelected: logoPath,
    logo: logoImage,
    kvSelected: kvPath,
    kv: kvImage,
    titleSubtitlePairs: [
      {
        ...(Array.isArray(baseState.titleSubtitlePairs) ? baseState.titleSubtitlePairs[0] || {} : {}),
        ...(pair || {}),
        title: normalizedState.title,
        subtitle: normalizedState.subtitle,
        bgColor: normalizedState.bgColor,
        bgImageSelected: bgImagePath || null,
        kvSelected: kvPath
      }
    ],
    activePairIndex: 0,
    showLogo: Boolean(normalizedState.showLogo),
    showKV: Boolean(normalizedState.showKV),
    paddingPercent: Number(normalizedState.paddingPercent || 5),
    projectMode: normalizedState.projectMode === 'layouts' ? 'layouts' : 'rsya'
  };

  surfaces.forEach((surface) => {
    const canvas = canvases[surface.key];
    if (!canvas) return;
    renderToCanvas(canvas, surface.width, surface.height, {
      ...legacyState,
      platform: surface.label
    });
  });
};
