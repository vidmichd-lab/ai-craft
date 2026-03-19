/**
 * Утилиты для рендеринга
 */

import { TEXT_CONSTANTS } from './constants.js';

/**
 * Конвертирует hex цвет в RGB
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
};

/**
 * Получает X координату для выравнивания текста
 */
export const getAlignedX = (align, canvasWidth, paddingPx) => {
  if (align === 'left') return paddingPx;
  if (align === 'center') return canvasWidth / 2;
  if (align === 'right') return canvasWidth - paddingPx;
  return paddingPx;
};

/**
 * Получает X координату для выравнивания текста в области
 */
export const getAlignedXWithinArea = (align, area) => {
  if (align === 'center') return (area.left + area.right) / 2;
  if (align === 'right') return area.right;
  return area.left;
};

/**
 * Проверяет пересечение прямоугольников
 */
export const rectanglesOverlap = (r1, r2, margin = 10) => {
  return !(
    r1.x + r1.width + margin < r2.x ||
    r2.x + r2.width + margin < r1.x ||
    r1.y + r1.height + margin < r2.y ||
    r2.y + r2.height + margin < r1.y
  );
};

/**
 * Объединяет границы нескольких элементов
 */
export const mergeBounds = (...bounds) =>
  bounds
    .filter(Boolean)
    .reduce((acc, bound) => {
      if (!acc) return { ...bound };
      const minX = Math.min(acc.x, bound.x);
      const minY = Math.min(acc.y, bound.y);
      const maxX = Math.max(acc.x + acc.width, bound.x + bound.width);
      const maxY = Math.max(acc.y + acc.height, bound.y + bound.height);
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }, null);

/**
 * Ограничивает значение в диапазоне
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Проверяет, является ли слово висячим предлогом/союзом
 */
export const isHangingPreposition = (word) => {
  const cleanWord = word.replace(/[.,!?;:—–\-()«»""'']/g, '').toLowerCase();
  return TEXT_CONSTANTS.HANGING_PREPOSITIONS.has(cleanWord);
};

