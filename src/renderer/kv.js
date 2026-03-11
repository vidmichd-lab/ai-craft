/**
 * Модуль для работы с KV изображениями
 */

import { LAYOUT_CONSTANTS } from './constants.js';

/** Размеры KV: для расчётов используем naturalWidth/naturalHeight (у Image могут быть 0 width/height) */
const kvSize = (kv) => ({
  w: (kv && (kv.naturalWidth || kv.width)) || 0,
  h: (kv && (kv.naturalHeight || kv.height)) || 0
});

/**
 * Проверяет, является ли KV из папки photo
 */
const isPhotoKV = (state) => {
  const kvPath = state.kvSelected || '';
  return kvPath.includes('/photo/') || kvPath.startsWith('photo/');
};

/**
 * Вычисляет позицию и размер KV для супер-широких форматов
 */
export const calculateSuperWideKV = (state, width, height, paddingPx, logoBounds, legalBlockHeight = 0) => {
  if (!state.showKV || !state.kv) return null;
  const { w: kvW0, h: kvH0 } = kvSize(state.kv);
  if (!kvW0 || !kvH0) return null;

  // Учитываем legal текст внизу
  const legalReserved = (state.showLegal || state.showAge) ? legalBlockHeight : 0;
  const legalTop = height - paddingPx - legalReserved;
  const availableHeight = Math.max(0, legalTop - paddingPx);
  const availableWidth = Math.max(0, width - paddingPx * 2);
  
  const logoRight = logoBounds ? logoBounds.x + logoBounds.width : paddingPx;
  const gap = Math.max(paddingPx * 0.5, width * 0.01);
  const minKvSize = LAYOUT_CONSTANTS.MIN_KV_SIZE;
  const maxKvWidth = Math.max(minKvSize, width * LAYOUT_CONSTANTS.KV_MAX_WIDTH_RATIO);
  
  // Для KV из папки photo используем режим cover - заполняем все доступное пространство
  if (isPhotoKV(state)) {
    // Режим cover: заполняем всю доступную область с сохранением пропорций
    const scaleByHeight = availableHeight > 0 ? availableHeight / kvH0 : 0;
    const scaleByWidth = maxKvWidth / kvW0;
    let kvScale = Math.max(scaleByHeight, scaleByWidth); // Используем максимальный масштаб для cover
    
    let kvW = kvW0 * kvScale;
    let kvH = kvH0 * kvScale;
    
    // Ограничиваем максимальной шириной
    if (kvW > maxKvWidth) {
      kvScale = maxKvWidth / kvW0;
      kvW = maxKvWidth;
      kvH = kvH0 * kvScale;
    }
    
    if (kvScale > 0) {
      const kvX = width - paddingPx - kvW;
      const kvY = legalTop - kvH;
      return { kvX, kvY, kvW, kvH, kvScale, paddingPx };
    }
  }
  
  // Обычный режим: используем максимально возможную высоту для KV с учетом legal
  let kvScale = availableHeight > 0 ? availableHeight / kvH0 : 0;
  let kvW = kvW0 * kvScale;
  let kvH = kvH0 * kvScale;
  
  if (kvW > maxKvWidth) {
    kvScale = maxKvWidth / kvW0;
    kvW = maxKvWidth;
    kvH = kvH0 * kvScale;
  }
  
  // Проверяем, что KV достаточно большой для отображения
  if ((kvW >= minKvSize || kvH >= minKvSize) && kvScale > 0) {
    // Для супер-широких форматов размещаем KV справа, как в других широких форматах
    const kvX = width - paddingPx - kvW;
    // Для широких форматов размещаем KV вплотную к лигалу (без отступа)
    // Используем всю доступную высоту до самого лигала
    const maxKvH = Math.max(minKvSize, legalTop - paddingPx);
    if (kvH > maxKvH) {
      kvScale = maxKvH / kvH0;
      kvH = maxKvH;
      kvW = kvW0 * kvScale;
      // Если ширина стала слишком большой, пересчитываем
      if (kvW > maxKvWidth) {
        kvScale = maxKvWidth / kvW0;
        kvW = maxKvWidth;
        kvH = kvH0 * kvScale;
        // Пересчитываем высоту с учетом ограничения по ширине
        if (kvH > maxKvH) {
          kvScale = maxKvH / kvH0;
          kvH = maxKvH;
          kvW = kvW0 * kvScale;
        }
      }
      // Пересчитываем позицию X после изменения ширины
      const finalKvX = width - paddingPx - kvW;
      // Размещаем KV вплотную к лигалу (без отступа)
      const kvY = legalTop - kvH;
      return { kvX: finalKvX, kvY, kvW, kvH, kvScale, paddingPx };
    }
    // Размещаем KV вплотную к лигалу (без отступа)
    const kvY = legalTop - kvH;
    
    return { kvX, kvY, kvW, kvH, kvScale, paddingPx };
  }
  
  return null;
};

/**
 * Вычисляет позицию и размер KV для ультра-широких форматов
 */
export const calculateUltraWideKV = (state, width, height, paddingPx, legalBlockHeight = 0) => {
  if (!state.showKV || !state.kv) return null;
  const { w: kvW0, h: kvH0 } = kvSize(state.kv);
  if (!kvW0 || !kvH0) return null;

  // Учитываем legal текст внизу
  const legalReserved = (state.showLegal || state.showAge) ? legalBlockHeight : 0;
  const legalTop = height - paddingPx - legalReserved;
  const availableHeight = Math.max(0, legalTop - paddingPx);
  const availableWidth = Math.max(0, width - paddingPx * 2);
  
  const minKvSize = LAYOUT_CONSTANTS.MIN_KV_SIZE;
  const maxKvWidth = Math.max(minKvSize, width * LAYOUT_CONSTANTS.KV_MAX_WIDTH_RATIO);
  
  // Для KV из папки photo используем режим cover - заполняем все доступное пространство
  if (isPhotoKV(state)) {
    // Режим cover: заполняем всю доступную область с сохранением пропорций
    const scaleByHeight = availableHeight > 0 ? availableHeight / kvH0 : 0;
    const scaleByWidth = maxKvWidth / kvW0;
    let kvScale = Math.max(scaleByHeight, scaleByWidth); // Используем максимальный масштаб для cover
    
    let kvW = kvW0 * kvScale;
    let kvH = kvH0 * kvScale;
    
    // Ограничиваем максимальной шириной
    if (kvW > maxKvWidth) {
      kvScale = maxKvWidth / kvW0;
      kvW = maxKvWidth;
      kvH = kvH0 * kvScale;
    }
    
    if (kvScale > 0) {
      const kvX = width - paddingPx - kvW;
      const kvY = legalTop - kvH;
      return { kvX, kvY, kvW, kvH, kvScale, paddingPx };
    }
  }
  
  // Обычный режим: используем максимально возможную высоту для KV с учетом legal
  let kvScale = availableHeight > 0 ? availableHeight / kvH0 : 0;
  let kvW = kvW0 * kvScale;
  let kvH = kvH0 * kvScale;
  
  if (kvW > maxKvWidth) {
    kvScale = maxKvWidth / kvW0;
    kvW = maxKvWidth;
    kvH = kvH0 * kvScale;
  }
  
  // Проверяем, что KV достаточно большой для отображения
  if ((kvW >= minKvSize || kvH >= minKvSize) && kvScale > 0) {
    // Для ультрашироких форматов размещаем KV справа, как в горизонтальных форматах
    const kvX = width - paddingPx - kvW;
    // Для широких форматов размещаем KV вплотную к лигалу (без отступа)
    // Используем всю доступную высоту до самого лигала
    const maxKvH = Math.max(minKvSize, legalTop - paddingPx);
    if (kvH > maxKvH) {
      kvScale = maxKvH / kvH0;
      kvH = maxKvH;
      kvW = kvW0 * kvScale;
      // Если ширина стала слишком большой, пересчитываем
      if (kvW > maxKvWidth) {
        kvScale = maxKvWidth / kvW0;
        kvW = maxKvWidth;
        kvH = kvH0 * kvScale;
        // Пересчитываем высоту с учетом ограничения по ширине
        if (kvH > maxKvH) {
          kvScale = maxKvH / kvH0;
          kvH = maxKvH;
          kvW = kvW0 * kvScale;
        }
      }
      // Пересчитываем позицию X после изменения ширины
      const finalKvX = width - paddingPx - kvW;
      // Размещаем KV вплотную к лигалу (без отступа)
      const kvY = legalTop - kvH;
      return { kvX: finalKvX, kvY, kvW, kvH, kvScale, paddingPx };
    }
    // Размещаем KV вплотную к лигалу (без отступа)
    const kvY = legalTop - kvH;
    
    return { kvX, kvY, kvW, kvH, kvScale, paddingPx };
  }
  
  return null;
};

/**
 * Вычисляет позицию и размер KV для горизонтальных макетов
 */
export const calculateHorizontalKV = (state, width, height, paddingPx, legalBlockHeight = 0) => {
  const widthAfterPadding = Math.max(0, width - paddingPx * 2);
  if (!state.showKV || !state.kv) return { kvMeta: null, textWidth: widthAfterPadding };
  const { w: kvW0, h: kvH0 } = kvSize(state.kv);
  if (!kvW0 || !kvH0) return { kvMeta: null, textWidth: widthAfterPadding };

  const minTextRatio = width >= height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD ? LAYOUT_CONSTANTS.MIN_TEXT_RATIO_WIDE : LAYOUT_CONSTANTS.MIN_TEXT_RATIO_NORMAL;
  const minTextWidth = Math.max(widthAfterPadding * minTextRatio, LAYOUT_CONSTANTS.MIN_TEXT_WIDTH);
  const gap = Math.max(paddingPx, width * 0.02);
  
  // KV занимает всю высоту макета (от paddingPx до height - paddingPx)
  const availableHeight = Math.max(0, height - paddingPx * 2);
  
  const minKvSize = LAYOUT_CONSTANTS.MIN_KV_SIZE;

  let kvMeta = null;
  let textWidth = widthAfterPadding;

  const maxKvWidth = Math.max(0, widthAfterPadding - minTextWidth - gap);
  if (maxKvWidth >= minKvSize) {
    // Для KV из папки photo используем режим cover - заполняем все доступное пространство
    if (isPhotoKV(state)) {
      // Режим cover: заполняем всю доступную область с сохранением пропорций
      const scaleByHeight = availableHeight > 0 ? availableHeight / kvH0 : 0;
      const scaleByWidth = maxKvWidth / kvW0;
      const kvScale = Math.max(scaleByHeight, scaleByWidth); // Используем максимальный масштаб для cover
      
      const kvW = kvW0 * kvScale;
      const kvH = kvH0 * kvScale;
      
      // Центрируем изображение в доступной области
      const kvX = width - paddingPx - kvW;
      const kvY = paddingPx + (availableHeight - kvH) / 2;
      
      kvMeta = { kvX, kvY, kvW, kvH, kvScale, paddingPx };
      textWidth = Math.max(minTextWidth, widthAfterPadding - kvW - gap);
    } else {
      // Обычный режим: используем минимальный масштаб, чтобы KV поместилось
      const scaleByHeight = availableHeight > 0 ? availableHeight / kvH0 : 0;
      const scaleByWidth = maxKvWidth / kvW0;
      const kvScale = Math.min(scaleByHeight, scaleByWidth);
      
      const kvW = kvW0 * kvScale;
      const kvH = kvH0 * kvScale;
      
      if (kvW >= minKvSize || kvH >= minKvSize) {
        const kvX = width - paddingPx - kvW;
        const kvY = paddingPx + (availableHeight - kvH) / 2;
        
        kvMeta = { kvX, kvY, kvW, kvH, kvScale, paddingPx };
        textWidth = Math.max(minTextWidth, widthAfterPadding - kvW - gap);
      }
    }
  }

  return { kvMeta, textWidth };
};

/**
 * Вычисляет позицию KV для вертикальных макетов
 */
export const calculateVerticalKV = (state, width, height, paddingPx, titleBounds, subtitleBounds, logoBounds, legalBlockHeight) => {
  if (!state.showKV || !state.kv) return null;
  const { w: kvW0, h: kvH0 } = kvSize(state.kv);
  if (!kvW0 || !kvH0) return null;
  
  const textBlockBottom = Math.max(
    titleBounds ? titleBounds.y + titleBounds.height : -Infinity,
    subtitleBounds ? subtitleBounds.y + subtitleBounds.height : -Infinity
  );
  
  const legalReserved = (state.showLegal || state.showAge) ? legalBlockHeight : 0;
  const legalTop = height - paddingPx - legalReserved;
  const safeGapY = paddingPx * 0.5;
  const availableWidth = Math.max(0, width - paddingPx * 2);
  const bottomAreaStart = textBlockBottom + safeGapY;
  const safeGapForLegal = Math.max(paddingPx * 0.5, 0);
  const bottomAreaEnd = Math.max(bottomAreaStart, legalTop - safeGapForLegal);
  const bottomAreaHeight = Math.max(0, bottomAreaEnd - bottomAreaStart);
  
  // Для KV из папки photo используем режим cover - заполняем все доступное пространство после текста
  if (isPhotoKV(state) && bottomAreaHeight > 0 && availableWidth > 0) {
    // Режим cover: заполняем всю доступную область с сохранением пропорций
    const scaleByWidth = availableWidth / kvW0;
    const scaleByHeight = bottomAreaHeight / kvH0;
    const kvScale = Math.max(scaleByWidth, scaleByHeight); // Используем максимальный масштаб для cover
    
    const kvW = kvW0 * kvScale;
    const kvH = kvH0 * kvScale;
    
    // Применяем позицию KV (left, center, right)
    const kvPosition = state.kvPosition || 'center';
    let kvX;
    if (kvPosition === 'left') {
      kvX = paddingPx;
    } else if (kvPosition === 'right') {
      kvX = width - paddingPx - kvW;
    } else {
      // center (по умолчанию)
      kvX = paddingPx + (availableWidth - kvW) / 2;
    }
    
    // Центрируем по вертикали в доступной области
    const kvY = bottomAreaStart + (bottomAreaHeight - kvH) / 2;
    
    return { kvX, kvY, kvW, kvH, kvScale, paddingPx };
  }
  
  const textTop = titleBounds ? titleBounds.y : paddingPx;
  const logoBottom = logoBounds ? logoBounds.y + logoBounds.height : paddingPx;
  const topAreaStart = Math.max(paddingPx, logoBottom + safeGapY);
  const topAreaEnd = Math.max(topAreaStart, textTop - safeGapY);
  const topAreaHeight = Math.max(0, topAreaEnd - topAreaStart);

  const minKvSize = LAYOUT_CONSTANTS.MIN_KV_SIZE;
  
  const computeFit = (availHeight, areaStart, areaEnd) => {
    if (availableWidth <= 0 || availHeight <= 0) return null;
    const scale = Math.min(availableWidth / kvW0, availHeight / kvH0);
    if (!(scale > 0) || !Number.isFinite(scale)) return null;
    const kvW = kvW0 * scale;
    const kvH = kvH0 * scale;
    
    if (kvW < minKvSize && kvH < minKvSize) return null;
    
    // Применяем позицию KV (left, center, right)
    const kvPosition = state.kvPosition || 'center';
    let kvX;
    if (kvPosition === 'left') {
      kvX = paddingPx;
    } else if (kvPosition === 'right') {
      kvX = width - paddingPx - kvW;
    } else {
      // center (по умолчанию)
      kvX = paddingPx + (availableWidth - kvW) / 2;
    }
    const kvY = areaStart + (availHeight - kvH) / 2;
    return {
      kvW,
      kvH,
      kvScale: scale,
      kvX,
      kvY
    };
  };

  const topFit = computeFit(topAreaHeight, topAreaStart, topAreaEnd);
  const bottomFit = computeFit(bottomAreaHeight, bottomAreaStart, bottomAreaEnd);
  const areaTop = topFit ? topFit.kvW * topFit.kvH : 0;
  const areaBottom = bottomFit ? bottomFit.kvW * bottomFit.kvH : 0;

  let placement = null;
  if (bottomFit && (areaBottom >= areaTop || !topFit)) {
    placement = bottomFit;
  } else if (topFit) {
    placement = topFit;
  }

  if (placement) {
    return { ...placement, paddingPx };
  }
  
  return null;
};

/**
 * Рисует KV на canvas с учетом скругления углов
 */
export const drawKV = (ctx, kvMeta, state) => {
  if (!kvMeta || !state.kv) return;
  
  // Применяем скругление углов для KV
  if (state.kvBorderRadius > 0) {
    ctx.save();
    const borderRadius = Math.min(
      state.kvBorderRadius / 100 * Math.min(kvMeta.kvW, kvMeta.kvH),
      Math.min(kvMeta.kvW, kvMeta.kvH) / 2
    );
    
    // Создаем скругленный прямоугольник
    ctx.beginPath();
    if (ctx.roundRect) {
      // Используем современный API, если доступен
      ctx.roundRect(kvMeta.kvX, kvMeta.kvY, kvMeta.kvW, kvMeta.kvH, borderRadius);
    } else {
      // Fallback для старых браузеров
      const x = kvMeta.kvX;
      const y = kvMeta.kvY;
      const w = kvMeta.kvW;
      const h = kvMeta.kvH;
      const r = borderRadius;
      
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    ctx.clip();
  }
  
  ctx.drawImage(state.kv, kvMeta.kvX, kvMeta.kvY, kvMeta.kvW, kvMeta.kvH);
  
  if (state.kvBorderRadius > 0) {
    ctx.restore();
  }
};

