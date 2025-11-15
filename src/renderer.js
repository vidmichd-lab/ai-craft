import { getState, getCheckedSizes, setKey, setState } from './state/store.js';
import { FONT_NAME_TO_WEIGHT } from './constants.js';
import { LAYOUT_CONSTANTS } from './renderer/constants.js';
import { hexToRgb, getAlignedXWithinArea, clamp, mergeBounds, rectanglesOverlap } from './renderer/utils.js';
import { wrapText, measureLineWidth, drawTextWithSpacing, getTextBlockBounds, clearTextMeasurementCache } from './renderer/text.js';
import { getLayoutType, calculateSizeMultipliers, calculateTextArea, calculateLogoBounds } from './renderer/layout.js';
import { drawBackground } from './renderer/background.js';
import { calculateSuperWideKV, calculateUltraWideKV, calculateHorizontalKV, calculateVerticalKV, drawKV } from './renderer/kv.js';
import { canvasManager, getSortedSizes, categorizeSizes } from './renderer/canvas.js';
import { drawTextGradient } from './renderer/textGradient.js';

// Функция для конвертации названия начертания в вес
const getFontWeight = (weightName) => {
  if (typeof weightName === 'number') {
    return weightName; // Для обратной совместимости
  }
  return FONT_NAME_TO_WEIGHT[weightName] || '400';
};

// Функция для формирования строки font с fallback на системный sans-serif
const getFontString = (weight, size, fontFamily) => {
  // Добавляем fallback на системный sans-serif перед загрузкой кастомного шрифта
  const fontFamilyWithFallback = fontFamily ? `${fontFamily}, sans-serif` : 'sans-serif';
  return `${weight} ${size}px ${fontFamilyWithFallback}`;
};

// Функция для применения преобразования регистра к тексту
const applyTextTransform = (text, transformType) => {
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

// Экспортируем clearTextMeasurementCache для использования в других модулях
export { clearTextMeasurementCache };

// Canvas management перенесен в ./renderer/canvas.js

// Все функции для работы с текстом теперь импортируются из ./renderer/text.js
// Все утилиты импортируются из ./renderer/utils.js

const renderToCanvas = (canvas, width, height, state) => {
  try {
    if (!canvas) {
      console.error('Canvas элемент не передан в renderToCanvas');
      return null;
    }
    
    if (!state) {
      console.error('Состояние не передано в renderToCanvas');
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Не удалось получить контекст 2D для canvas');
      return null;
    }
    
    ctx.imageSmoothingQuality = 'high';
    
    // Проверяем валидность размеров
    if (!width || !height || width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      console.error('Некорректные размеры canvas:', { width, height, canvasId: canvas.id });
      return null;
    }
  
  // Устанавливаем размеры canvas
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  
  // Логируем размеры для отладки (только первый раз для каждого canvas)
  const logKey = `_logged_${canvas.id}`;
  if (!renderToCanvas[logKey]) {
    console.log('Рендеринг canvas:', { 
      canvasId: canvas.id, 
      width, 
      height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      state: {
        bgColor: state.bgColor,
        title: state.title,
        showKV: state.showKV,
        showLogo: state.showLogo && !!state.logo
      }
    });
    renderToCanvas[logKey] = true;
  }

  const paddingPx = (state.paddingPercent / 100) * Math.min(width, height);
  const minDimension = Math.min(width, height);
  
  // Определяем тип макета
  const layoutType = getLayoutType(width, height, state.layoutMode);
  const { isUltraWide, isSuperWide, isHorizontalLayout } = layoutType;
  
  // Увеличиваем отступы для супер широких форматов
  const effectivePaddingPx = isSuperWide ? paddingPx * LAYOUT_CONSTANTS.PADDING_MULTIPLIER_SUPER_WIDE : paddingPx;

  // Вычисляем множители размеров
  let logoSizePercent = state.logoSize;
  const multipliers = calculateSizeMultipliers(width, height, layoutType);
  const { titleSizeMultiplier, subtitleSizeMultiplier, legalMultiplier, ageMultiplier } = multipliers;
  
  // Определяем, является ли формат квадратным
  const isSquare = height < width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD && 
                   width < height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD;
  
  // Проверяем наличие партнерского логотипа
  const hasPartnerLogo = state.partnerLogo && state.showLogo;
  
  // Применяем множитель к логотипу
  if (height >= width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD) {
    logoSizePercent *= LAYOUT_CONSTANTS.VERTICAL_LOGO_MULTIPLIER;
  } else if (isUltraWide || width >= height * 4 || width >= height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD) {
    logoSizePercent *= LAYOUT_CONSTANTS.ULTRA_WIDE_LOGO_MULTIPLIER;
  } else if (isSquare && hasPartnerLogo) {
    // Для квадратных форматов с партнерским логотипом умножаем размер логотипа на 1.5
    logoSizePercent *= 1.5;
  }

  // Рисуем фон (цвет или изображение) - используем модуль background
  drawBackground(ctx, width, height, state);

  let legalLines = [];
  let legalSize = 0;
  let ageSizePx = 0;
  let ageTextWidth = 0;
  let legalTextBounds = null;
  let ageBoundsRect = null;
  if (state.showAge && state.age) {
    ageSizePx = (state.ageSize / 100) * minDimension * ageMultiplier;
    const ageWeight = getFontWeight(state.ageWeight || state.legalWeight);
    ctx.font = getFontString(ageWeight, ageSizePx, state.ageFontFamily || state.fontFamily);
    ageTextWidth = measureLineWidth(ctx, state.age || '');
  }

  // Calculate preliminary legalBlockHeight for positioning title/subtitle
  // This will be refined after positioning legal and age
  let preliminaryLegalBlockHeight = 0;
  
  // First, calculate age position to know how much space to reserve
  const ageGapPx = width * (state.ageGapPercent / 100);
  let ageReservedWidth = 0;
  if (state.showAge && state.age && ageTextWidth > 0) {
    ageReservedWidth = ageTextWidth + ageGapPx;
    preliminaryLegalBlockHeight = Math.max(preliminaryLegalBlockHeight, ageSizePx * 1.5);
  }
  
  if (state.showLegal && state.legal) {
    legalSize = (state.legalSize / 100) * minDimension * legalMultiplier;
    const legalWeight = getFontWeight(state.legalWeight);
    ctx.font = getFontString(legalWeight, legalSize, state.legalFontFamily || state.fontFamily);
    // Legal всегда занимает всю ширину макета (минус отступы и место для age)
    const availableWidth = width - paddingPx * 2;
    const legalMaxWidth = Math.max(50, availableWidth - ageReservedWidth);
    const legalText = applyTextTransform(state.legal, state.legalTransform);
    legalLines = wrapText(ctx, legalText, legalMaxWidth, legalSize, legalWeight, state.legalLineHeight);
    preliminaryLegalBlockHeight = Math.max(preliminaryLegalBlockHeight, legalLines.length * legalSize * state.legalLineHeight);
  }
  
  // Use preliminary value for now
  let legalBlockHeight = preliminaryLegalBlockHeight;

  let legalContentBounds = null;
  let legalBounds = null;

  // Вычисляем позицию логотипа - используем модуль layout
  const logoBounds = calculateLogoBounds(state, width, height, paddingPx, layoutType, logoSizePercent);
  const logoHeight = logoBounds ? logoBounds.height : 0;

  // Вычисляем позицию KV и область для текста - используем модули
  let kvPlannedMeta = null;
  let textArea;
  let maxTextWidth;
  
  // Проверяем, что KV загружен и валиден перед использованием
  const isKVValid = state.kv && state.kv.complete && state.kv.naturalWidth > 0 && state.kv.naturalHeight > 0;
  
  // Сначала вычисляем KV для разных типов макетов
  if (isSuperWide && state.showKV && isKVValid) {
    kvPlannedMeta = calculateSuperWideKV(state, width, height, effectivePaddingPx, logoBounds, legalBlockHeight);
  } else if (isUltraWide && state.showKV && isKVValid) {
    kvPlannedMeta = calculateUltraWideKV(state, width, height, paddingPx, legalBlockHeight);
  } else if (layoutType.isHorizontalLayout && state.showKV && isKVValid) {
    const result = calculateHorizontalKV(state, width, height, paddingPx, legalBlockHeight);
    kvPlannedMeta = result.kvMeta;
    maxTextWidth = result.textWidth;
  }
  
  // Вычисляем область для текста - используем модуль layout
  const textAreaResult = calculateTextArea(width, height, paddingPx, layoutType, logoBounds, kvPlannedMeta);
  textArea = textAreaResult.textArea;
  maxTextWidth = textAreaResult.maxTextWidth || Math.max(50, textArea.right - textArea.left);

  // Common baseline for legal and age - both should be on the same line at the bottom
  // Age is always at the bottom right, legal text takes remaining space on the left
  const commonBaselineY = height - effectivePaddingPx;
  
  // Check if KV will be positioned on the right in horizontal layout (to avoid legal text overlap)
  let kvRightEdge = width - paddingPx;
  if (isHorizontalLayout && state.showKV && state.kv && !kvPlannedMeta) {
    // Estimate KV position - it will be on the right side
    const widthAfterPadding = Math.max(0, width - paddingPx * 2);
    const minTextRatio = width >= height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD ? LAYOUT_CONSTANTS.MIN_TEXT_RATIO_WIDE : LAYOUT_CONSTANTS.MIN_TEXT_RATIO_NORMAL;
      const minTextWidth = Math.max(widthAfterPadding * minTextRatio, LAYOUT_CONSTANTS.MIN_TEXT_WIDTH);
    const gap = Math.max(paddingPx, width * 0.02);
    const availableHeight = Math.max(0, height - paddingPx * 2);
    const maxKvWidth = Math.max(0, widthAfterPadding - minTextWidth - gap);
    if (maxKvWidth > 10) {
      const kvWidth = state.kv.naturalWidth || state.kv.width;
      const kvHeight = state.kv.naturalHeight || state.kv.height;
      const scaleByHeight = availableHeight > 0 ? availableHeight / kvHeight : 0;
      let kvW = kvWidth * scaleByHeight;
      if (kvW > maxKvWidth) {
        kvW = maxKvWidth;
      }
      if (kvW > 10) {
        kvRightEdge = width - paddingPx - kvW - gap;
      }
    }
  } else if (kvPlannedMeta && isHorizontalLayout) {
    // KV is already planned, use its left edge
    kvRightEdge = kvPlannedMeta.kvX - Math.max(paddingPx, width * 0.02);
  }
  
  if ((state.showLegal && legalLines.length > 0) || (state.showAge && state.age)) {
    // Legal всегда занимает всю ширину макета (минус отступы и место для age)
    // Для широких форматов age будет справа от legal, поэтому не вычитаем его ширину
    const ageWidth = (state.showAge && state.age && ageTextWidth > 0) ? ageTextWidth + ageGapPx : 0;
    // Legal занимает всю ширину макета по нижнему краю на любом макете
    let fullLegalWidth = width - effectivePaddingPx * 2;
    if (!(isHorizontalLayout || isUltraWide || isSuperWide)) {
      // Для вертикальных форматов вычитаем место для age
      fullLegalWidth -= ageWidth;
    }
    
    // Для широких форматов учитываем KV, чтобы legal не заходил на него
    if (kvPlannedMeta && (isHorizontalLayout || isUltraWide) && !isSuperWide) {
      const kvLeft = kvPlannedMeta.kvX;
      const gap = Math.max(paddingPx * 0.5, width * 0.01);
      const maxLegalWidthWithKV = Math.max(0, kvLeft - effectivePaddingPx - gap - ageWidth);
      fullLegalWidth = Math.min(fullLegalWidth, maxLegalWidthWithKV);
    }
    
    let legalMaxWidthForFlex = Math.max(50, fullLegalWidth);
    
    // Calculate legal text block - last line should be at commonBaselineY
    if (state.showLegal && legalLines.length > 0) {
      // Legal всегда занимает всю ширину макета (минус отступы и место для age)
      const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
      const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
      const legalTop = commonBaselineY - legalHeight;
      
      // Пересчитываем legalLines с учетом полной ширины (с учетом KV для широких форматов)
      const legalWeight = getFontWeight(state.legalWeight);
      legalLines = wrapText(ctx, state.legal, legalMaxWidthForFlex, legalSize, legalWeight, state.legalLineHeight);
      
      legalContentBounds = {
        x: effectivePaddingPx,
        y: Math.max(effectivePaddingPx, legalTop),
        width: legalMaxWidthForFlex,
        height: legalHeight
      };
      
      legalTextBounds = {
        x: effectivePaddingPx,
        y: legalContentBounds.y,
        width: legalMaxWidthForFlex,
        height: legalHeight
      };
      
      legalBounds = { ...legalContentBounds };
    }

    // Position age at the same baseline as legal's last line (commonBaselineY)
    if (state.showAge && state.age && ageTextWidth > 0) {
      const ageBaseline = commonBaselineY;
      const ageY = ageBaseline - ageSizePx;
      
      // Для широких форматов age размещается справа от legal, а не в правом нижнем углу
      // Для супер-широких форматов age в правом углу, как у остальных
      let ageX;
      if (isSuperWide) {
        // Для супер-широких форматов age в правом нижнем углу
        ageX = width - effectivePaddingPx - ageTextWidth;
      } else if (isHorizontalLayout || isUltraWide) {
        // Age справа от legal
        // Вычисляем реальную ширину legal текста
        let actualLegalWidth = 0;
        if (legalLines.length > 0 && legalTextBounds) {
          const legalWeight = getFontWeight(state.legalWeight);
          ctx.font = getFontString(legalWeight, legalSize, state.legalFontFamily || state.fontFamily);
          legalLines.forEach(line => {
            const lineWidth = measureLineWidth(ctx, line);
            if (lineWidth > actualLegalWidth) {
              actualLegalWidth = lineWidth;
            }
          });
        }
        const legalRight = legalTextBounds ? (legalTextBounds.x + actualLegalWidth) : effectivePaddingPx;
        // Используем ageGapPx для расстояния между legal и age
        ageX = legalRight + ageGapPx;
        
        // Для широких форматов проверяем, что age не заходит на KV и не выходит за границы
        if (kvPlannedMeta) {
          const kvLeft = kvPlannedMeta.kvX;
          const gap = Math.max(paddingPx * 0.5, width * 0.01);
          const maxAgeX = Math.max(0, kvLeft - gap - ageTextWidth);
          const maxAgeXByCanvas = width - effectivePaddingPx - ageTextWidth;
          const finalMaxAgeX = Math.min(maxAgeX, maxAgeXByCanvas);
          
          if (ageX + ageTextWidth > kvLeft - gap || ageX + ageTextWidth > width - effectivePaddingPx) {
            ageX = Math.max(legalRight + ageGapPx, finalMaxAgeX);
          }
        }
        
        // Убеждаемся, что age не выходит за границы макета
        ageX = Math.max(effectivePaddingPx, Math.min(ageX, width - effectivePaddingPx - ageTextWidth));
      } else {
        // Для вертикальных форматов age в правом нижнем углу
        ageX = width - effectivePaddingPx - ageTextWidth;
      }
      
      ageBoundsRect = {
        x: ageX,
        y: ageY,
        width: ageTextWidth,
        height: ageSizePx
      };
      
      // Legal уже занимает всю ширину с учетом места для age (ageWidth уже учтен в legalMaxWidthForFlex)
      // Пересчитываем legalLines только если нужно, чтобы убедиться, что текст правильно обернут
      if (state.showLegal && state.legal && legalLines.length > 0) {
        const legalWeight = getFontWeight(state.legalWeight);
        const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
        const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
        const legalTop = commonBaselineY - legalHeight;
        
        // Обновляем bounds с правильной шириной
        legalContentBounds = {
          x: effectivePaddingPx,
          y: Math.max(effectivePaddingPx, legalTop),
          width: legalMaxWidthForFlex,
          height: legalHeight
        };
        
        legalTextBounds = {
          x: effectivePaddingPx,
          y: legalContentBounds.y,
          width: legalMaxWidthForFlex,
          height: legalHeight
        };
        
        legalBounds = { ...legalContentBounds };
      }
    }
  }

  // Refine legalBlockHeight based on actual positions
  // Legal and age are on the same baseline at the bottom, so calculate height from top of legal to bottom
  if (legalTextBounds || legalContentBounds) {
    const legalTop = legalTextBounds ? legalTextBounds.y : (legalContentBounds ? legalContentBounds.y : height - paddingPx);
    const legalHeight = legalTextBounds ? legalTextBounds.height : (legalContentBounds ? legalContentBounds.height : 0);
    // Legal block extends from its top to the bottom (commonBaselineY)
    const commonBaselineY = height - paddingPx;
    legalBlockHeight = Math.max(legalBlockHeight, commonBaselineY - legalTop + paddingPx * 0.5);
  } else if (state.showLegal && legalLines.length > 0) {
    // Fallback: use calculated height
    legalBlockHeight = Math.max(legalBlockHeight, legalLines.length * legalSize * state.legalLineHeight + paddingPx * 0.5);
  }
  if (ageBoundsRect && ageSizePx > 0) {
    // Ensure we have enough space for age
    legalBlockHeight = Math.max(legalBlockHeight, ageSizePx + paddingPx * 0.5);
  }

  const baseTitleSize = (state.titleSize / 100) * minDimension;
  const titleSize = baseTitleSize * titleSizeMultiplier;
  const baseSubtitleSize = (state.subtitleSize / 100) * minDimension;
  // Подзаголовок масштабируется с использованием отдельного множителя
  const subtitleSize = baseSubtitleSize * subtitleSizeMultiplier;
  
  // Используем константу для соотношения заголовка и подзаголовка
  const TITLE_SUBTITLE_RATIO = LAYOUT_CONSTANTS.TITLE_SUBTITLE_RATIO;

  // Hide subtitle on wide formats (height < 150px) if option is enabled
  const shouldShowSubtitle = state.showSubtitle && state.subtitle && !(state.hideSubtitleOnWide && height < 150);
  
  // Получаем веса шрифтов один раз
  const titleWeight = getFontWeight(state.titleWeight);
  const subtitleWeight = getFontWeight(state.subtitleWeight);
  
  ctx.font = getFontString(titleWeight, titleSize, state.titleFontFamily || state.fontFamily);
  const titleText = applyTextTransform(state.title, state.titleTransform);
  const titleLines = wrapText(ctx, titleText, maxTextWidth, titleSize, titleWeight, state.titleLineHeight);
  const titleBlockHeight = titleLines.length * titleSize * state.titleLineHeight;

  let subtitleBlockHeight = 0;
  let subtitleLines = [];
  if (shouldShowSubtitle) {
    ctx.font = getFontString(subtitleWeight, subtitleSize, state.subtitleFontFamily || state.fontFamily);
    // Учитываем letter spacing при обертке текста - уменьшаем maxWidth
    let effectiveMaxWidth = maxTextWidth;
    if (state.subtitleLetterSpacing) {
      // Приблизительно вычитаем максимальный letter spacing для длинной строки
      // Это консервативная оценка, чтобы гарантировать, что текст не выйдет за границы
      const estimatedCharsPerLine = Math.floor(maxTextWidth / (subtitleSize * 0.6)); // примерная ширина символа
      const letterSpacingImpact = state.subtitleLetterSpacing * Math.max(0, estimatedCharsPerLine - 1);
      effectiveMaxWidth = Math.max(50, maxTextWidth - letterSpacingImpact);
    }
    const subtitleText = applyTextTransform(state.subtitle, state.subtitleTransform);
    subtitleLines = wrapText(ctx, subtitleText, effectiveMaxWidth, subtitleSize, subtitleWeight, state.subtitleLineHeight);
    if (subtitleLines.length > 0) {
      // Gap is calculated separately, not included in block height
      subtitleBlockHeight = subtitleLines.length * subtitleSize * state.subtitleLineHeight;
    }
  }

  // Total text height includes title, subtitle, and gap between them
  // For ultra-wide formats, reduce gap (closer to title)
  const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
  const subtitleGapPx = shouldShowSubtitle && subtitleLines.length > 0 ? (effectiveSubtitleGap / 100) * height : 0;
  const totalTextHeight = titleBlockHeight + subtitleGapPx + subtitleBlockHeight;

  let startY;

  if (isSuperWide || isUltraWide || isHorizontalLayout) {
    // Для широких форматов учитываем titleVPos
    const currentPadding = isSuperWide ? effectivePaddingPx : paddingPx;
    
    if (state.titleVPos === 'top') {
      startY = currentPadding + titleSize;
      if (state.showLogo && state.logo && logoBounds) {
        const logoBottom = logoBounds.y + logoBounds.height;
        const logoStart = logoBottom + currentPadding + titleSize;
        startY = Math.max(startY, logoStart);
      }
      if (legalBlockHeight > 0) {
        const bottomPadding = currentPadding + legalBlockHeight + currentPadding * 0.5;
        startY = Math.min(startY, height - bottomPadding - totalTextHeight + titleSize);
      }
      startY = Math.max(currentPadding + titleSize, startY);
    } else if (state.titleVPos === 'center') {
      // При центрировании текста логотип остается вверху, центрируем только текст
      const logoBottom = (state.showLogo && state.logo && logoBounds) 
        ? logoBounds.y + logoBounds.height 
        : currentPadding;
      const topArea = Math.max(currentPadding, logoBottom + currentPadding);
      const bottomArea = height - currentPadding - legalBlockHeight;
      const availableHeight = Math.max(0, bottomArea - topArea);
      if (availableHeight > 0 && totalTextHeight > 0) {
        const centerY = topArea + availableHeight / 2;
        startY = centerY - totalTextHeight / 2 + titleSize;
        const minStart = topArea + titleSize;
        startY = Math.max(minStart, startY);
      } else {
        startY = topArea + titleSize;
      }
      if (!isFinite(startY) || startY < currentPadding + titleSize) {
        startY = Math.max(currentPadding + titleSize, topArea + titleSize);
      }
    } else {
      // bottom
      const legalTop = height - currentPadding - legalBlockHeight;
      const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * height;
      const gapFromSubtitle = subtitleLines.length > 0 ? subtitleGapPx : titleSize * state.titleLineHeight * 0.3;
      // Для широких форматов увеличиваем безопасную зону сверху от legal, чтобы подзаголовок не заезжал
      const legalSafetyMultiplier = (isSuperWide || isUltraWide || isHorizontalLayout) ? 1.5 : 0.5;
      const safetyGap = Math.max(currentPadding * 0.5, gapFromSubtitle, legalSize * state.legalLineHeight * legalSafetyMultiplier);
      const textBottom = legalTop - safetyGap;
      startY = textBottom - totalTextHeight + titleSize;
      if (startY < currentPadding + titleSize) {
        startY = currentPadding + titleSize;
      }
    }
  } else {
    if (state.titleVPos === 'top') {
      if (state.showLogo && state.logo && logoBounds) {
        startY = logoBounds.y + logoBounds.height + paddingPx + titleSize;
      } else {
        startY = paddingPx + titleSize;
      }
      const minStart = (state.showLogo && logoBounds) ? logoBounds.y + logoBounds.height + titleSize : paddingPx + titleSize;
      startY = Math.max(minStart, startY);
    } else if (state.titleVPos === 'center') {
      // При центрировании текста логотип остается вверху, центрируем только текст
      // Учитываем логотип при вычислении доступной высоты для текста
      const logoBottom = (state.showLogo && state.logo && logoBounds) 
        ? logoBounds.y + logoBounds.height 
        : paddingPx;
      const topArea = Math.max(paddingPx, logoBottom + paddingPx);
      const bottomArea = height - paddingPx - legalBlockHeight;
      const availableHeight = Math.max(0, bottomArea - topArea);
      if (availableHeight > 0 && totalTextHeight > 0) {
        const centerY = topArea + availableHeight / 2;
        startY = centerY - totalTextHeight / 2 + titleSize;
        // Убеждаемся, что startY не меньше минимального значения (после логотипа)
        const minStart = topArea + titleSize;
        startY = Math.max(minStart, startY);
      } else {
        // Fallback: размещаем текст сразу после логотипа
        startY = topArea + titleSize;
      }
      // Убеждаемся, что startY валиден
      if (!isFinite(startY) || startY < paddingPx + titleSize) {
        startY = Math.max(paddingPx + titleSize, topArea + titleSize);
      }
    } else {
      const legalTop = height - paddingPx - legalBlockHeight;
      // For ultra-wide formats, reduce gap (closer to title)
      const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * height;
      // Use user-defined gap, with minimum safety gap to avoid overlap
      const gapFromSubtitle = subtitleLines.length > 0 ? subtitleGapPx : titleSize * state.titleLineHeight * 0.3;
      const safetyGap = Math.max(paddingPx * 0.5, gapFromSubtitle, legalSize * state.legalLineHeight * 0.5);
      const textBottom = legalTop - safetyGap;
      startY = textBottom - totalTextHeight + titleSize;
      if (startY < paddingPx + titleSize) {
        startY = paddingPx + titleSize;
      }
    }
  }

  // Для широких форматов текст всегда выравнивается слева и прибит к левому краю макета
  let effectiveTitleAlign = (isHorizontalLayout || isUltraWide || isSuperWide) 
    ? 'left' 
    : (state.titleAlign || 'left');
  
  // Для широких форматов прибиваем текст к левому краю макета (с учетом padding)
  let titleX;
  if (isHorizontalLayout || isUltraWide || isSuperWide) {
    titleX = paddingPx; // Прибиваем к левому краю макета
  } else {
    titleX = getAlignedXWithinArea(effectiveTitleAlign, textArea);
  }
  // titleWeight уже определен выше
  ctx.font = getFontString(titleWeight, titleSize, state.titleFontFamily || state.fontFamily);
  ctx.fillStyle = state.titleColor;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = effectiveTitleAlign;

  const computeTextBounds = (baseY) => {
    const titleBoundsLocal = getTextBlockBounds(
      ctx,
      titleLines,
      titleX,
      baseY,
      titleSize,
      state.titleLineHeight,
      effectiveTitleAlign,
      maxTextWidth
    );

    let subtitleYLocal = null;
    let subtitleBoundsLocal = null;

    if (shouldShowSubtitle && subtitleLines.length > 0) {
      // Calculate subtitle Y position based on title block
      // For ultra-wide formats, reduce gap (closer to title)
      const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * height;
      subtitleYLocal = baseY + titleBlockHeight + subtitleGapPx;
      
      subtitleBoundsLocal = getTextBlockBounds(
        ctx,
        subtitleLines,
        getAlignedXWithinArea(effectiveTitleAlign, textArea),
        subtitleYLocal,
        subtitleSize,
        state.subtitleLineHeight,
        effectiveTitleAlign,
        maxTextWidth
      );
    }

    return { titleBounds: titleBoundsLocal, subtitleBounds: subtitleBoundsLocal, subtitleY: subtitleYLocal };
  };

  let { titleBounds, subtitleBounds, subtitleY } = computeTextBounds(startY);

    // Для широких форматов не корректируем позицию текста - она уже установлена выше
    if (!isHorizontalLayout && !isUltraWide && !isSuperWide && legalBlockHeight > 0) {
      const legalTop = height - paddingPx - legalBlockHeight;
      const effectiveSubtitleGap = state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * height;
      const desiredGap = Math.max(
        paddingPx * 0.5,
        shouldShowSubtitle && subtitleLines.length > 0 ? Math.max(subtitleGapPx, subtitleSize * state.subtitleLineHeight * 0.3) : titleSize * state.titleLineHeight * 0.3,
        legalSize * state.legalLineHeight * 0.4
      );
      const textBottom = Math.max(
        titleBounds ? titleBounds.y + titleBounds.height : -Infinity,
        subtitleBounds ? subtitleBounds.y + subtitleBounds.height : -Infinity
      );
      const allowedBottom = legalTop - desiredGap;
      if (textBottom > allowedBottom) {
        const shift = textBottom - allowedBottom;
        const minStart = paddingPx + titleSize;
        startY = Math.max(minStart, startY - shift);
        ({ titleBounds, subtitleBounds, subtitleY } = computeTextBounds(startY));
      }
    }

  // Рисуем градиентную подложку под текстом (если есть фоновое изображение)
  // Вызываем перед отрисовкой текста, чтобы градиент был под текстом
  drawTextGradient(ctx, width, height, state, logoBounds, titleBounds, subtitleBounds, null, null, null, paddingPx, state.titleVPos, isHorizontalLayout, isUltraWide, isSuperWide);

  // Проверяем, что есть текст для отрисовки
  if (titleLines.length === 0) {
    console.warn('Нет строк заголовка для отрисовки');
  }
  
  titleLines.forEach((line, index) => {
    const lineY = startY + index * titleSize * state.titleLineHeight;
    if (state.titleLetterSpacing) {
      drawTextWithSpacing(ctx, line, titleX, lineY, state.titleLetterSpacing, effectiveTitleAlign);
    } else {
      ctx.fillText(line, titleX, lineY);
    }
  });
  
  // Логируем информацию о тексте (только один раз)
  if (!renderToCanvas._textLogged && titleLines.length > 0) {
    console.log('Текст заголовка отрисован:', {
      lines: titleLines.length,
      firstLine: titleLines[0],
      color: state.titleColor,
      fontSize: titleSize,
      font: ctx.font,
      position: { x: titleX, y: startY }
    });
    renderToCanvas._textLogged = true;
  }

  // Draw subtitle if it's enabled and has content
  if (shouldShowSubtitle && subtitleLines.length > 0) {
    // Ensure subtitleY is calculated if it wasn't set
    let actualSubtitleY = subtitleY;
    if (actualSubtitleY === null || actualSubtitleY === undefined) {
      // Calculate subtitle Y position if it wasn't calculated
      // For ultra-wide formats, reduce gap (closer to title)
      const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * height;
      actualSubtitleY = startY + titleBlockHeight + subtitleGapPx;
    }
    
    // Для широких форматов подзаголовок тоже прибит к левому краю
    const subtitleX = (isHorizontalLayout || isUltraWide || isSuperWide) 
      ? paddingPx 
      : getAlignedXWithinArea(effectiveTitleAlign, textArea);
    const effectiveSubtitleAlign = effectiveTitleAlign;
    // subtitleWeight уже определен выше
    ctx.font = getFontString(subtitleWeight, subtitleSize, state.subtitleFontFamily || state.fontFamily);
    const { r, g, b } = hexToRgb(state.subtitleColor);
    const opacity = Math.max(0, Math.min(100, state.subtitleOpacity || 100)) / 100;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = effectiveSubtitleAlign;
    ctx.textBaseline = 'alphabetic';

    subtitleLines.forEach((line, index) => {
      const lineY = actualSubtitleY + index * subtitleSize * state.subtitleLineHeight;
      // For layouts up to 150px height, always show subtitle even if it overflows
      // For larger layouts, only draw if line is at least partially visible
      const isSmallLayout = height <= 150;
      if (isSmallLayout || (lineY > -subtitleSize && lineY < height + subtitleSize)) {
        // Проверяем, что текст не выходит за границы охранного поля
        let lineToDraw = line;
        const availableWidth = textArea.right - textArea.left;
        
        if (state.subtitleLetterSpacing) {
          // Измеряем реальную ширину строки с letter spacing
          const characters = Array.from(line);
          const widths = characters.map((char) => measureLineWidth(ctx, char));
          const totalWidth = widths.reduce((acc, width) => acc + width, 0) + state.subtitleLetterSpacing * (characters.length - 1);
          
          // Если текст выходит за границы, обрезаем его
          if (totalWidth > availableWidth) {
            // Обрезаем строку до нужной длины
            let truncatedLine = '';
            let truncatedWidth = 0;
            for (let i = 0; i < characters.length; i++) {
              const char = characters[i];
              const charWidth = widths[i];
              const spacing = i > 0 ? state.subtitleLetterSpacing : 0;
              if (truncatedWidth + charWidth + spacing <= availableWidth) {
                truncatedLine += char;
                truncatedWidth += charWidth + spacing;
              } else {
                break;
              }
            }
            lineToDraw = truncatedLine;
          }
          drawTextWithSpacing(ctx, lineToDraw, subtitleX, lineY, state.subtitleLetterSpacing, effectiveSubtitleAlign);
        } else {
          // Проверяем ширину без letter spacing
          const lineWidth = measureLineWidth(ctx, line);
          if (lineWidth > availableWidth) {
            // Обрезаем строку
            let truncatedLine = '';
            let truncatedWidth = 0;
            const characters = Array.from(line);
            for (const char of characters) {
              const charWidth = measureLineWidth(ctx, char);
              if (truncatedWidth + charWidth <= availableWidth) {
                truncatedLine += char;
                truncatedWidth += charWidth;
              } else {
                break;
              }
            }
            lineToDraw = truncatedLine;
          }
          ctx.fillText(lineToDraw, subtitleX, lineY);
        }
      }
    });
  }

  const textBlockBottom = Math.max(
    titleBounds ? titleBounds.y + titleBounds.height : startY,
    subtitleBounds ? subtitleBounds.y + subtitleBounds.height : 0
  );

  // Используем проверку валидности KV
  if (state.showKV && isKVValid && !kvPlannedMeta) {
    if (!isUltraWide && !isHorizontalLayout) {
      // Определяем, является ли формат узким или квадратным
      const isVertical = height >= width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD;
      const isSquare = height < width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD && 
                       width < height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD;
      
      const safeGapY = paddingPx * 0.5;
      const availableWidth = Math.max(0, width - paddingPx * 2);
      const textTop = titleBounds ? titleBounds.y : paddingPx;
      const logoBottom = logoBounds ? logoBounds.y + logoBounds.height : paddingPx;
      const topAreaStart = Math.max(paddingPx, logoBottom + safeGapY);
      const topAreaEnd = Math.max(topAreaStart, textTop - safeGapY);
      const topAreaHeight = Math.max(0, topAreaEnd - topAreaStart);

      const legalReserved = (state.showLegal && legalLines.length > 0) || (state.showAge && state.age) ? legalBlockHeight : 0;
      const bottomAreaStart = textBlockBottom + safeGapY;
      // Учитываем отступ для legal (safeGap для KV должен быть выше legal)
      const legalTop = height - paddingPx - legalReserved;
      // Для узких и квадратных форматов убираем отступ между KV и лигалом
      const safeGapForLegal = (isVertical || isSquare) ? 0 : Math.max(paddingPx * 0.5, legalSize * 0.5);
      const bottomAreaEnd = Math.max(bottomAreaStart, legalTop - safeGapForLegal);
      const bottomAreaHeight = Math.max(0, bottomAreaEnd - bottomAreaStart);

      const minKvSize = LAYOUT_CONSTANTS.MIN_KV_SIZE;
      const computeFit = (availHeight, areaStart, areaEnd) => {
        if (availableWidth <= 0 || availHeight <= 0) return null;
        // Используем максимально возможный масштаб для заполнения доступного пространства
        const kvWidth = state.kv.naturalWidth || state.kv.width;
        const kvHeight = state.kv.naturalHeight || state.kv.height;
        const scale = Math.min(availableWidth / kvWidth, availHeight / kvHeight);
        if (!(scale > 0) || !Number.isFinite(scale)) return null;
        const kvW = kvWidth * scale;
        const kvH = kvHeight * scale;
        
        // Проверяем минимальный размер KV - если слишком маленький, не размещаем
        // Используем более мягкую проверку: хотя бы одна сторона должна быть >= minKvSize
        if (kvW < minKvSize && kvH < minKvSize) return null;
        
        // Применяем позицию KV (left, center, right) - только для нешироких макетов
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
        // Размещаем KV так, чтобы максимально использовать доступное пространство
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

      // Если не помещается ни в top, ни в bottom, не размещаем КВ (placement остается null)
      // КВ будет автоматически скрыт в конце функции, если kvRenderMeta будет null

      if (placement) {
        kvPlannedMeta = { ...placement, paddingPx };
      }
    }
  }

  if (state.showLegal && legalLines.length > 0) {
    const legalWeight = getFontWeight(state.legalWeight);
    ctx.font = getFontString(legalWeight, legalSize, state.legalFontFamily || state.fontFamily);
    const { r, g, b } = hexToRgb(state.legalColor);
    const opacity = Math.max(0, Math.min(100, state.legalOpacity || 100)) / 100;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = 'left';

    // Draw legal text - last line should be at commonBaselineY (height - effectivePaddingPx)
    const commonBaselineY = height - effectivePaddingPx;
    const drawX = effectivePaddingPx;
    
    // Для широких форматов учитываем KV, чтобы legal не залезал на него
    // Для широких форматов age будет справа от legal, поэтому не вычитаем его ширину из maxLegalWidth
    // Для очень широких форматов (супер-широких) legal и age занимают всю ширину, как у остальных
    let maxLegalWidth = width - effectivePaddingPx * 2;
    if (!(isHorizontalLayout || isUltraWide || isSuperWide)) {
      // Для вертикальных форматов age в правом углу, вычитаем его ширину
      maxLegalWidth -= (state.showAge && state.age && ageTextWidth > 0 ? ageTextWidth + ageGapPx : 0);
    } else if (isSuperWide) {
      // Для супер-широких форматов age в правом углу, вычитаем его ширину
      maxLegalWidth -= (state.showAge && state.age && ageTextWidth > 0 ? ageTextWidth + ageGapPx : 0);
    }
    
    // Если есть KV справа (для широких и ультра-широких форматов), ограничиваем ширину legal
    if (kvPlannedMeta && (isHorizontalLayout || isUltraWide) && !isSuperWide) {
      // KV находится справа, legal должен быть слева и не заходить на KV
      // Учитываем место для age справа от legal
      const ageWidth = (state.showAge && state.age && ageTextWidth > 0) ? ageTextWidth + ageGapPx : 0;
      const kvLeft = kvPlannedMeta.kvX;
      const gap = Math.max(paddingPx * 0.5, width * 0.01);
      const maxLegalWidthWithKV = Math.max(0, kvLeft - effectivePaddingPx - gap - ageWidth);
      maxLegalWidth = Math.min(maxLegalWidth, maxLegalWidthWithKV);
      
      // Пересчитываем legalLines с учетом ограниченной ширины
      const legalText = applyTextTransform(state.legal, state.legalTransform);
      legalLines = wrapText(ctx, legalText, maxLegalWidth, legalSize, legalWeight, state.legalLineHeight);
      
      // Обновляем legalBounds с правильной шириной
      const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
      const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
      const legalTop = commonBaselineY - legalHeight;
      
      legalContentBounds = {
        x: effectivePaddingPx,
        y: Math.max(effectivePaddingPx, legalTop),
        width: maxLegalWidth,
        height: legalHeight
      };
      
      legalTextBounds = {
        x: effectivePaddingPx,
        y: legalContentBounds.y,
        width: maxLegalWidth,
        height: legalHeight
      };
      
      legalBounds = { ...legalContentBounds };
      
      // Пересчитываем ageBoundsRect для широких форматов после обновления legalBounds
      if (state.showAge && state.age && ageTextWidth > 0) {
        const ageBaseline = commonBaselineY;
        const ageY = ageBaseline - ageSizePx;
        
        // Вычисляем реальную ширину legal текста (самую широкую строку)
        let actualLegalWidth = 0;
        if (legalLines.length > 0) {
          const legalWeight = getFontWeight(state.legalWeight);
          ctx.font = getFontString(legalWeight, legalSize, state.legalFontFamily || state.fontFamily);
          legalLines.forEach(line => {
            const lineWidth = measureLineWidth(ctx, line);
            if (lineWidth > actualLegalWidth) {
              actualLegalWidth = lineWidth;
            }
          });
        }
        
        // Age справа от legal с учетом gap
        const legalRight = legalTextBounds ? (legalTextBounds.x + actualLegalWidth) : effectivePaddingPx;
        const currentAgeGapPx = ageGapPx;
        let ageX = legalRight + currentAgeGapPx;
        
        // Проверяем, что age не заходит на KV и не выходит за границы макета
        const kvLeft = kvPlannedMeta.kvX;
        const gap = Math.max(paddingPx * 0.5, width * 0.01);
        const maxAgeX = Math.max(0, kvLeft - gap - ageTextWidth);
        const maxAgeXByCanvas = width - effectivePaddingPx - ageTextWidth;
        const finalMaxAgeX = Math.min(maxAgeX, maxAgeXByCanvas);
        
        if (ageX + ageTextWidth > kvLeft - gap || ageX + ageTextWidth > width - effectivePaddingPx) {
          ageX = Math.max(legalRight + currentAgeGapPx, finalMaxAgeX);
        }
        
        // Убеждаемся, что age не выходит за левую границу
        ageX = Math.max(effectivePaddingPx, ageX);
        
        ageBoundsRect = {
          x: ageX,
          y: ageY,
          width: ageTextWidth,
          height: ageSizePx
        };
      }
    }
    
    const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
    
    // Рисуем градиентную подложку под legal текстом (если есть фоновое изображение)
    drawTextGradient(ctx, width, height, state, null, null, null, legalTextBounds, legalContentBounds, ageBoundsRect, effectivePaddingPx, state.titleVPos, isHorizontalLayout, isUltraWide, isSuperWide);
    
    // Use clipping to ensure text doesn't go beyond the allowed area
    ctx.save();
    ctx.beginPath();
    ctx.rect(drawX, 0, maxLegalWidth, height);
    ctx.clip();
    
    legalLines.forEach((line, index) => {
      const lineY = firstLineBaselineY + index * legalSize * state.legalLineHeight;
      // Measure line width to ensure it doesn't exceed maxLegalWidth
      const lineWidth = measureLineWidth(ctx, line);
      if (lineWidth > maxLegalWidth) {
        // If line is too long, truncate it (shouldn't happen if wrapText works correctly)
        let truncatedLine = line;
        while (measureLineWidth(ctx, truncatedLine + '...') > maxLegalWidth && truncatedLine.length > 0) {
          truncatedLine = truncatedLine.slice(0, -1);
        }
        ctx.fillText(truncatedLine + '...', drawX, lineY);
      } else {
        ctx.fillText(line, drawX, lineY);
      }
    });
    
    ctx.restore();
  }

  if (state.showAge && state.age && ageBoundsRect) {
    const ageWeight = getFontWeight(state.ageWeight || state.legalWeight);
    ctx.font = getFontString(ageWeight, ageSizePx, state.ageFontFamily || state.fontFamily);
    const { r, g, b } = hexToRgb(state.legalColor);
    const opacity = Math.max(0, Math.min(100, state.legalOpacity || 100)) / 100;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = 'left';
    // Draw age at the same baseline as legal's last line
    const commonBaselineY = height - paddingPx;
    ctx.fillText(state.age, ageBoundsRect.x, commonBaselineY);
  }

  let kvRenderMeta = null;
  if (kvPlannedMeta) {
    // KV всегда должен быть немного выше legal текста
    if (legalTextBounds || legalContentBounds || ageBoundsRect) {
      const kvBottom = kvPlannedMeta.kvY + kvPlannedMeta.kvH;
      const legalTop = legalTextBounds ? legalTextBounds.y : (legalContentBounds ? legalContentBounds.y : height);
      const ageTop = ageBoundsRect ? ageBoundsRect.y : height;
      const minLegalTop = Math.min(legalTop, ageTop);
      // Для узких и широких форматов убираем отступ между KV и legal
      const isVertical = height >= width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD;
      const isSquare = height < width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD && 
                       width < height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD;
      const safeGap = (isVertical || isSquare || isUltraWide || isSuperWide) 
        ? 0 
        : Math.max(paddingPx * 0.5, legalSize * 0.5);
      
      // Всегда проверяем и корректируем позицию KV, чтобы он был выше legal
      const maxAllowedBottom = minLegalTop - safeGap;
      
      // Если KV находится слишком низко (пересекается или слишком близко к legal), перемещаем его выше
      if (kvBottom > maxAllowedBottom) {
        if (maxAllowedBottom >= kvPlannedMeta.kvY + kvPlannedMeta.kvH * 0.5) {
          // Move KV up if there's enough space
          kvPlannedMeta.kvY = Math.max(paddingPx, maxAllowedBottom - kvPlannedMeta.kvH);
        } else {
          // Reduce KV size to fit if moving up is not enough
          const availableHeight = Math.max(0, maxAllowedBottom - paddingPx - safeGap);
          if (availableHeight > 10) {
            const availableWidthForKV = Math.max(0, width - paddingPx * 2);
            const kvWidth = state.kv.naturalWidth || state.kv.width;
            const kvHeight = state.kv.naturalHeight || state.kv.height;
            const newScale = Math.min(
              kvPlannedMeta.kvScale || 1,
              availableHeight / kvHeight,
              availableWidthForKV / kvWidth
            );
            kvPlannedMeta.kvW = kvWidth * newScale;
            kvPlannedMeta.kvH = kvHeight * newScale;
            kvPlannedMeta.kvScale = newScale;
            // Сохраняем позицию KV при уменьшении размера
            const kvPosition = state.kvPosition || 'center';
            if (kvPosition === 'left') {
              kvPlannedMeta.kvX = paddingPx;
            } else if (kvPosition === 'right') {
              kvPlannedMeta.kvX = width - paddingPx - kvPlannedMeta.kvW;
            } else {
              // center (по умолчанию)
              kvPlannedMeta.kvX = paddingPx + Math.max(0, (availableWidthForKV - kvPlannedMeta.kvW) / 2);
            }
            kvPlannedMeta.kvY = Math.max(paddingPx, maxAllowedBottom - kvPlannedMeta.kvH);
          }
        }
      }
    }
    
    // Применяем скругление углов для KV
    if (state.kvBorderRadius > 0) {
      ctx.save();
      const borderRadius = Math.min(state.kvBorderRadius / 100 * Math.min(kvPlannedMeta.kvW, kvPlannedMeta.kvH), 
                                     Math.min(kvPlannedMeta.kvW, kvPlannedMeta.kvH) / 2);
      
      // Создаем скругленный прямоугольник
      ctx.beginPath();
      if (ctx.roundRect) {
        // Используем современный API, если доступен
        ctx.roundRect(kvPlannedMeta.kvX, kvPlannedMeta.kvY, kvPlannedMeta.kvW, kvPlannedMeta.kvH, borderRadius);
      } else {
        // Fallback для старых браузеров
        const x = kvPlannedMeta.kvX;
        const y = kvPlannedMeta.kvY;
        const w = kvPlannedMeta.kvW;
        const h = kvPlannedMeta.kvH;
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
    
    // Проверяем, что изображение загружено и валидно
    if (state.kv.complete && state.kv.naturalWidth > 0 && state.kv.naturalHeight > 0) {
      try {
        ctx.drawImage(state.kv, kvPlannedMeta.kvX, kvPlannedMeta.kvY, kvPlannedMeta.kvW, kvPlannedMeta.kvH);
      } catch (error) {
        console.error('Ошибка отрисовки KV:', error);
      }
    } else {
      console.warn('KV не загружен или невалиден:', {
        complete: state.kv.complete,
        naturalWidth: state.kv.naturalWidth,
        naturalHeight: state.kv.naturalHeight
      });
    }
    
    if (state.kvBorderRadius > 0) {
      ctx.restore();
    }
    
    kvRenderMeta = kvPlannedMeta;
  }

  if (state.showLogo && state.logo && logoBounds) {
    // Проверяем, что изображение загружено и валидно
    if (state.logo.complete && state.logo.naturalWidth > 0 && state.logo.naturalHeight > 0) {
      try {
        ctx.drawImage(state.logo, logoBounds.x, logoBounds.y, logoBounds.width, logoBounds.height);
        
        // Рисуем партнерский логотип, если есть
        if (logoBounds.hasPartnerLogo && state.partnerLogo && state.partnerLogo.complete) {
          const separatorX = logoBounds.x + logoBounds.width;
          const separatorY = logoBounds.y;
          const separatorHeight = logoBounds.height;
          
          // Отступ от основного логотипа до разделителя
          const gapBeforeSeparator = 24;
          // Отступ от разделителя до партнерского логотипа (одинаковое расстояние)
          const gapAfterSeparator = 24;
          
          // Рисуем разделитель "|" с увеличенными отступами
          // Используем цвет текста для разделителя
          ctx.strokeStyle = state.titleColor || '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(separatorX + gapBeforeSeparator, separatorY + separatorHeight * 0.15);
          ctx.lineTo(separatorX + gapBeforeSeparator, separatorY + separatorHeight * 0.85);
          ctx.stroke();
          
          // Рассчитываем размеры партнерского логотипа
          const partnerLogoScale = logoBounds.height / state.partnerLogo.height;
          const partnerLogoWidth = state.partnerLogo.width * partnerLogoScale;
          const partnerLogoX = separatorX + gapBeforeSeparator + gapAfterSeparator; // Отступ после разделителя
          
          // Рисуем партнерский логотип
          ctx.drawImage(
            state.partnerLogo,
            partnerLogoX,
            logoBounds.y,
            partnerLogoWidth,
            logoBounds.height
          );
        }
      } catch (error) {
        console.error('Ошибка отрисовки логотипа:', error);
      }
    } else {
      console.warn('Логотип не загружен или невалиден:', {
        complete: state.logo.complete,
        naturalWidth: state.logo.naturalWidth,
        naturalHeight: state.logo.naturalHeight
      });
    }
  }

  if (state.showGuides) {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(paddingPx, paddingPx, width - paddingPx * 2, height - paddingPx * 2);
  }

  if (state.showBlocks) {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#74c0fc';
    if (titleBounds) {
      ctx.fillRect(titleBounds.x, titleBounds.y, titleBounds.width, titleBounds.height);
    }
    if (subtitleBounds) {
      ctx.fillStyle = '#ffa94d';
      ctx.fillRect(subtitleBounds.x, subtitleBounds.y, subtitleBounds.width, subtitleBounds.height);
    }
    if (logoBounds) {
      ctx.fillStyle = '#9775fa';
      const logoDisplayWidth = logoBounds.totalWidth || logoBounds.width;
      ctx.fillRect(logoBounds.x, logoBounds.y, logoDisplayWidth, logoBounds.height);
    }
    if (kvRenderMeta) {
      ctx.fillStyle = '#51cf66';
      ctx.fillRect(kvRenderMeta.kvX, kvRenderMeta.kvY, kvRenderMeta.kvW, kvRenderMeta.kvH);
    }
    if (legalTextBounds) {
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(
        legalTextBounds.x,
        legalTextBounds.y,
        isHorizontalLayout ? maxTextWidth : legalTextBounds.width,
        legalTextBounds.height
      );
    }
    if (ageBoundsRect) {
      ctx.fillStyle = '#ff922b';
      ctx.fillRect(ageBoundsRect.x, ageBoundsRect.y, ageBoundsRect.width, ageBoundsRect.height);
    } else if (!legalTextBounds && legalContentBounds) {
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(legalContentBounds.x, legalContentBounds.y, legalContentBounds.width, legalContentBounds.height);
    }
    ctx.globalAlpha = 1.0;
  }

  // Если KV включен, но места для него нет, автоматически выключаем
  // Но только если размер KV уменьшился почти до 0 (меньше 10px) из-за изменения кегля текста
  if (state.showKV && state.kv && !kvRenderMeta) {
    // Проверяем, что места действительно недостаточно
    const availableWidth = Math.max(0, width - paddingPx * 2);
    const availableHeight = Math.max(0, height - paddingPx * 2);
    const criticalMinSize = LAYOUT_CONSTANTS.CRITICAL_MIN_KV_SIZE;
    
    // Вычисляем максимально возможный размер KV при текущих условиях
    const kvWidth = state.kv.naturalWidth || state.kv.width;
    const kvHeight = state.kv.naturalHeight || state.kv.height;
    const scaleByWidth = availableWidth > 0 ? availableWidth / kvWidth : 0;
    const scaleByHeight = availableHeight > 0 ? availableHeight / kvHeight : 0;
    const maxScale = Math.min(scaleByWidth, scaleByHeight);
    const maxKvW = kvWidth * maxScale;
    const maxKvH = kvHeight * maxScale;
    
    // Выключаем KV только если максимально возможный размер стал почти 0
    // Это происходит когда текст занимает почти все место из-за увеличения кегля
    if (maxKvW < criticalMinSize || maxKvH < criticalMinSize) {
      // Используем setTimeout, чтобы избежать изменения состояния во время рендеринга
      setTimeout(() => {
        const currentState = getState();
        // Проверяем, что KV все еще включен (чтобы не выключать его многократно)
        if (currentState.showKV) {
          setState({ showKV: false });
        }
      }, 0);
    }
  }

    return {
      kvRenderMeta,
      canvasWidth: width,
      canvasHeight: height
    };
  } catch (error) {
    console.error('Критическая ошибка в renderToCanvas:', error);
    console.error('Параметры:', { canvasId: canvas?.id, width, height });
    console.error('Стек ошибки:', error.stack);
    // Возвращаем null вместо проброса ошибки
    return null;
  }
};

// Функция doRender перенесена в canvasManager
// Используем canvasManager.doRender() напрямую

// Устанавливаем функцию рендеринга в canvasManager
canvasManager.setRenderFunction(renderToCanvas);

export const renderer = {
  initialize(canvas) {
    canvasManager.initialize(canvas);
  },
  initializeMulti(canvasNarrow, canvasWide, canvasSquare) {
    canvasManager.initializeMulti(canvasNarrow, canvasWide, canvasSquare);
  },
  render() {
    canvasManager.render(getState, setKey);
  },
  renderSync() {
    canvasManager.renderSync(getState, setKey);
  },
  getCurrentIndex() {
    return canvasManager.getCurrentIndex();
  },
  setCurrentIndex(index) {
    canvasManager.setCurrentIndex(index, getState, setKey);
  },
  setCategoryIndex(category, index, shouldRender = true) {
    canvasManager.setCategoryIndex(category, index, shouldRender, getState, setKey);
  },
  getCategorizedSizes() {
    return canvasManager.getCategorizedSizes();
  },
  getCategoryIndices() {
    return canvasManager.getCategoryIndices();
  },
  getCheckedSizes() {
    return getCheckedSizes();
  },
  getSortedSizes() {
    return getSortedSizes();
  },
  getRenderMeta() {
    return canvasManager.getRenderMeta();
  }
};

renderer.__unsafe_getRenderToCanvas = () => ({ renderToCanvas });

// clearTextMeasurementCache экспортируется из ./renderer/text.js


