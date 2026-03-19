import { FONT_NAME_TO_WEIGHT } from '../../../../src/constants.js';

export const getFontWeight = (weightName) => {
  if (typeof weightName === 'number') {
    return weightName;
  }
  return FONT_NAME_TO_WEIGHT[weightName] || '400';
};

export const getFontString = (weight, size, fontFamily) => {
  const fontFamilyWithFallback = fontFamily ? `"${fontFamily}", sans-serif` : 'sans-serif';
  return `${weight} ${size}px ${fontFamilyWithFallback}`;
};

export const applyTextTransform = (text, transformType) => {
  if (!text || !transformType || transformType === 'none') {
    return text;
  }
  if (transformType === 'uppercase') {
    return text.toUpperCase();
  }
  if (transformType === 'lowercase') {
    return text.toLowerCase();
  }
  return text;
};

export const drawImageCover = (ctx, img, x, y, w, h) => {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || !w || !h) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = Math.max(0, (iw - sw) / 2);
  const sy = Math.max(0, (ih - sh) / 2);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
};
