const SVG_SIZE = 1200;
const DEFAULT_PREVIEW_ASSET = '/preview-neutral.svg';

export function buildSolidPreviewDataUrl(color: string | null | undefined) {
  const fill = color && color.trim() ? color.trim() : null;
  if (!fill) {
    return DEFAULT_PREVIEW_ASSET;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" preserveAspectRatio="none"><rect width="${SVG_SIZE}" height="${SVG_SIZE}" fill="${escapeAttribute(fill)}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
