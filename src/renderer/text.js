/**
 * Модуль для работы с текстом: измерение, перенос, отрисовка
 */

import { isHangingPreposition } from './utils.js';

// Кэш для измерений текста
const textMeasurementCache = new Map();

/**
 * Очищает кэш измерений текста
 */
export const clearTextMeasurementCache = () => {
  textMeasurementCache.clear();
};

/**
 * Создает ключ для кэша
 */
const cacheKey = (ctx, text) => {
  const font = ctx.font;
  return `${font}__${text}`;
};

/**
 * Измеряет ширину строки текста (с кэшированием)
 */
export const measureLineWidth = (ctx, text) => {
  if (!text) return 0;
  const key = cacheKey(ctx, text);
  if (textMeasurementCache.has(key)) {
    return textMeasurementCache.get(key);
  }
  const width = ctx.measureText(text).width;
  textMeasurementCache.set(key, width);
  return width;
};

/**
 * Рисует текст с учетом межбуквенного расстояния
 * letterSpacing - процент от размера шрифта (например, 2 означает 2% от fontSize)
 * fontSize - размер шрифта в пикселях
 */
export const drawTextWithSpacing = (ctx, text, x, y, letterSpacingPercent, fontSize, align) => {
  ctx.textAlign = align;

  if (!letterSpacingPercent) {
    ctx.fillText(text, x, y);
    return;
  }

  // Вычисляем межбуквенное расстояние в пикселях на основе процента от размера шрифта
  const letterSpacingPx = (letterSpacingPercent / 100) * fontSize;

  const characters = Array.from(text);
  const widths = characters.map((char) => measureLineWidth(ctx, char));
  const totalWidth = widths.reduce((acc, width) => acc + width, 0) + letterSpacingPx * (characters.length - 1);

  let startX = x;
  if (align === 'center') {
    startX = x - totalWidth / 2;
  } else if (align === 'right') {
    startX = x - totalWidth;
  }

  let currentX = startX;
  characters.forEach((char, index) => {
    ctx.fillText(char, currentX, y);
    currentX += widths[index] + letterSpacingPx;
  });
};

/**
 * Переносит текст на несколько строк с учетом ширины
 */
export const wrapText = (ctx, text, maxWidth, fontSize, fontWeight, lineHeight) => {
  if (!text) return [];

  const lines = [];
  const paragraphs = text.split(/\n+/);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/\s+/);
    let currentLine = '';

    words.forEach((word, wordIndex) => {
      if (!word) return;
      
      // Обработка слов длиннее maxWidth
      if (!currentLine) {
        // Сначала пробуем разбить по дефису
        if (word.includes('-') && word.length > 1) {
          const parts = word.split('-');
          for (let i = parts.length - 1; i > 0; i--) {
            const firstPart = parts.slice(0, i).join('-') + '-';
            const firstPartWidth = measureLineWidth(ctx, firstPart);
            
            if (firstPartWidth <= maxWidth) {
              lines.push(firstPart);
              currentLine = parts.slice(i).join('-');
              return;
            }
          }
        }
        
        // Если не удалось разбить по дефису, разбиваем по символам
        const chars = Array.from(word);
        let chunk = '';
        chars.forEach((char) => {
          const possible = chunk + char;
          if (measureLineWidth(ctx, possible) <= maxWidth || !chunk) {
            chunk = possible;
          } else {
            if (chunk) lines.push(chunk);
            chunk = char;
          }
        });
        if (chunk) {
          currentLine = chunk;
        }
        return;
      }

      const tentativeLine = `${currentLine} ${word}`;
      const tentativeWidth = measureLineWidth(ctx, tentativeLine);

      if (tentativeWidth <= maxWidth) {
        currentLine = tentativeLine;
        return;
      }

      // Слово не помещается на текущей строке
      // Проверяем, можно ли разбить слово по дефису
      if (word.includes('-') && word.length > 1) {
        const parts = word.split('-');
        for (let i = parts.length - 1; i > 0; i--) {
          const firstPart = parts.slice(0, i).join('-') + '-';
          const secondPart = '-' + parts.slice(i).join('-');
          
          const lineWithFirstPart = currentLine ? `${currentLine} ${firstPart}` : firstPart;
          const firstPartWidth = measureLineWidth(ctx, lineWithFirstPart);
          
          if (firstPartWidth <= maxWidth) {
            lines.push(lineWithFirstPart.trim());
            currentLine = parts.slice(i).join('-');
            return;
          }
        }
      }

      // Проверяем, не остался ли висячий предлог в конце текущей строки
      const lineWords = currentLine.trim().split(/\s+/);
      const lastWord = lineWords[lineWords.length - 1];
      
      if (isHangingPreposition(lastWord) && lineWords.length > 1) {
        // Переносим предлог на следующую строку
        lineWords.pop();
        const lineWithoutPreposition = lineWords.join(' ');
        
        const newLineWithPreposition = `${lastWord} ${word}`;
        const newLineWidth = measureLineWidth(ctx, newLineWithPreposition);
        
        if (newLineWidth <= maxWidth || lineWords.length === 0) {
          if (lineWithoutPreposition) {
            lines.push(lineWithoutPreposition);
          }
          currentLine = newLineWithPreposition;
        } else {
          // Если не помещается даже предлог со словом, проверяем дефис
          if (word.includes('-') && word.length > 1) {
            const parts = word.split('-');
            for (let i = parts.length - 1; i > 0; i--) {
              const firstPart = parts.slice(0, i).join('-') + '-';
              const lineWithPrepositionAndFirst = `${lastWord} ${firstPart}`;
              const width = measureLineWidth(ctx, lineWithPrepositionAndFirst);
              if (width <= maxWidth) {
                if (lineWithoutPreposition) {
                  lines.push(lineWithoutPreposition);
                }
                lines.push(lineWithPrepositionAndFirst.trim());
                currentLine = parts.slice(i).join('-');
                return;
              }
            }
          }
          lines.push(currentLine);
          currentLine = word;
        }
      } else {
        // Обычный перенос
        lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) {
      // Финальная проверка на висячий предлог в последней строке
      const lastWord = currentLine.trim().split(/\s+/).pop();
      if (isHangingPreposition(lastWord) && lines.length > 0) {
        const prevLine = lines[lines.length - 1];
        const newPrevLine = `${prevLine} ${lastWord}`;
        const newPrevWidth = measureLineWidth(ctx, newPrevLine);
        if (newPrevWidth <= maxWidth) {
          lines[lines.length - 1] = newPrevLine;
          const remainingWords = currentLine.trim().split(/\s+/);
          remainingWords.pop();
          if (remainingWords.length > 0) {
            lines.push(remainingWords.join(' '));
          }
        } else {
          lines.push(currentLine);
        }
      } else {
        lines.push(currentLine);
      }
    }

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push('');
    }
  });

  return lines;
};

/**
 * Вычисляет границы блока текста
 */
export const getTextBlockBounds = (ctx, lines, baselineX, baselineY, fontSize, lineHeight, align, maxWidth) => {
  if (!lines.length) return null;

  let maxLineWidth = 0;
  lines.forEach((line) => {
    const width = measureLineWidth(ctx, line || ' ');
    if (width > maxLineWidth) {
      maxLineWidth = width;
    }
  });

  let leftX = baselineX;
  if (align === 'center') {
    leftX = baselineX - maxLineWidth / 2;
  } else if (align === 'right') {
    leftX = baselineX - maxLineWidth;
  }

  const topY = baselineY - fontSize;
  const height = fontSize + (lines.length - 1) * fontSize * lineHeight;

  return {
    x: leftX,
    y: topY,
    width: Math.min(maxWidth, maxLineWidth),
    height
  };
};

