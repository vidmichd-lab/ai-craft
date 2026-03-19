import type { EditorSnapshot } from '@ai-craft/editor-model';

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

const getLegacyModules = async () => {
  // @ts-expect-error legacy renderer remains JS during migration
  const rendererModule = await import('../../../src/renderer.js');
  // @ts-expect-error legacy store remains JS during migration
  const storeModule = await import('../../../src/state/store.js');

  const unsafeApi = rendererModule.renderer?.__unsafe_getRenderToCanvas?.();
  return {
    renderToCanvas: unsafeApi?.renderToCanvas as
      | ((canvas: HTMLCanvasElement, width: number, height: number, state: Record<string, unknown>) => unknown)
      | undefined,
    createStateSnapshot: storeModule.createStateSnapshot as (() => Record<string, unknown>) | undefined
  };
};

export const renderEditorSnapshotToSurfaces = async (
  state: EditorSnapshot,
  canvases: Record<string, HTMLCanvasElement | null>,
  options: {
    assetBase: string;
    surfaces?: PreviewSurface[];
  }
) => {
  const { renderToCanvas, createStateSnapshot } = await getLegacyModules();
  if (!renderToCanvas || !createStateSnapshot) {
    throw new Error('Legacy renderer is unavailable');
  }

  const baseState = createStateSnapshot();
  const surfaces = options.surfaces || DEFAULT_PREVIEW_SURFACES;
  const pair = Array.isArray(state.titleSubtitlePairs) && state.titleSubtitlePairs.length
    ? state.titleSubtitlePairs[0]
    : null;

  const bgImagePath = String(state.bgImageSelected || pair?.bgImageSelected || '');
  const logoPath = String(state.logoSelected || '');
  const kvPath = String(state.kvSelected || pair?.kvSelected || baseState.kvSelected || '');

  const [bgImage, logoImage, kvImage] = await Promise.all([
    loadRendererImageElement(resolveRendererAssetUrl(bgImagePath, options.assetBase)),
    loadRendererImageElement(resolveRendererAssetUrl(logoPath, options.assetBase)),
    loadRendererImageElement(resolveRendererAssetUrl(kvPath, options.assetBase))
  ]);

  const legacyState = {
    ...baseState,
    ...state,
    title: state.title,
    subtitle: state.subtitle,
    brandName: state.brandName,
    bgColor: state.bgColor,
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
        title: state.title,
        subtitle: state.subtitle,
        bgColor: state.bgColor,
        bgImageSelected: bgImagePath || null,
        kvSelected: kvPath
      }
    ],
    activePairIndex: 0,
    showLogo: Boolean(state.showLogo),
    showKV: Boolean(state.showKV),
    paddingPercent: Number(state.paddingPercent || 5),
    projectMode: state.projectMode === 'layouts' ? 'layouts' : 'rsya'
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
