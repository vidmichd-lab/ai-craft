import { LAYOUT_CONSTANTS } from './constants.js';
import { hexToRgb, getAlignedXWithinArea, clamp, mergeBounds, rectanglesOverlap } from './utils.js';
import { wrapText, measureLineWidth, drawTextWithSpacing, getTextBlockBounds, clearTextMeasurementCache } from './text.js';
import { getLayoutType, calculateSizeMultipliers, calculateTextArea, calculateLogoBounds } from './layout.js';
import { drawBackground } from './background.js';
import { calculateSuperWideKV, calculateUltraWideKV, calculateHorizontalKV, calculateVerticalKV, drawKV } from './kv.js';
import { drawTextGradient } from './textGradient.js';
import { getFontWeight, getFontString, applyTextTransform, drawImageCover } from './render-helpers.js';

// Экспортируем clearTextMeasurementCache для использования в других модулях
export { clearTextMeasurementCache };

// Canvas management перенесен в ./renderer/canvas.js

// Все функции для работы с текстом теперь импортируются из ./renderer/text.js
// Все утилиты импортируются из ./renderer/utils.js

export const renderToCanvas = (canvas, width, height, state) => {
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

  const isRsyaMode = state.projectMode === 'rsya';
  const rsyaLayout = isRsyaMode ? (state.rsyaLayout || 'center') : 'center';
  const isRsyaLeftLayout = isRsyaMode && rsyaLayout === 'left';
  if (isRsyaMode) {
    if (isRsyaLeftLayout) {
      state = { ...state, titleAlign: 'left', titleVPos: 'center', logoPos: 'left', kvPosition: 'right' };
    } else {
      state = { ...state, titleAlign: 'center', logoPos: 'center', kvPosition: 'center' };
    }
  }
  
  // Режим constructor — обычный конструктор

  // Проверяем, есть ли охранная область для данного размера
  const platform = state.platform || 'unknown';
  const sizeKey = `${width}x${height}`;
  
  // Дефолтные охранные области
  const defaultSafeAreas = {
    'Ozon': {
      '2832x600': { width: 2100, height: 570, hideLegal: false, hideAge: false, titleAlign: 'left' },
      '1080x450': { width: 1020, height: 405, hideLegal: false, hideAge: false, titleAlign: 'left' }
    },
    'РСЯ': {
      '1600x1200': { width: 900, height: 900, hideLegal: true, hideAge: true, titleAlign: 'center', logoPos: 'center' }
    }
  };
  
  // Сначала проверяем пользовательские значения, потом дефолтные
  let safeArea = null;
  let hideLegalForSize = false;
  let hideAgeForSize = false;
  let titleAlignForSize = null; // null означает использовать глобальную настройку
  let logoPosForSize = null; // null означает использовать глобальную настройку
  
  // Получаем дефолтные значения для этого размера (если есть)
  const defaultSafeArea = defaultSafeAreas[platform] && defaultSafeAreas[platform][sizeKey] 
    ? defaultSafeAreas[platform][sizeKey] 
    : null;
  
  if (state.safeAreas && state.safeAreas[platform] && state.safeAreas[platform][sizeKey]) {
    // Пользовательское значение имеет приоритет
    safeArea = state.safeAreas[platform][sizeKey];
    // Если пользователь не указал hideLegal/hideAge, используем дефолтные значения
    hideLegalForSize = safeArea.hideLegal !== undefined ? safeArea.hideLegal : (defaultSafeArea?.hideLegal || false);
    hideAgeForSize = safeArea.hideAge !== undefined ? safeArea.hideAge : (defaultSafeArea?.hideAge || false);
    titleAlignForSize = safeArea.titleAlign !== undefined ? safeArea.titleAlign : (defaultSafeArea?.titleAlign || null);
    logoPosForSize = safeArea.logoPos !== undefined ? safeArea.logoPos : (defaultSafeArea?.logoPos || null);
    // Если пользователь не указал width/height, используем дефолтные
    if (!safeArea.width && defaultSafeArea) {
      safeArea = { ...defaultSafeArea, ...safeArea };
    }
  } else if (defaultSafeArea) {
    // Используем дефолтное значение
    safeArea = defaultSafeArea;
    hideLegalForSize = safeArea.hideLegal || false;
    hideAgeForSize = safeArea.hideAge || false;
    titleAlignForSize = safeArea.titleAlign || null;
    logoPosForSize = defaultSafeArea.logoPos || null;
  }

  // Для РСЯ-варианта "Слева + KV справа" не позволяем safe-area override
  // возвращать выравнивание обратно в центр.
  if (isRsyaLeftLayout) {
    titleAlignForSize = 'left';
    logoPosForSize = 'left';
  }
  
  // Вычисляем отступы для охранной области (если она есть)
  let horizontalPadding = 0;
  let verticalPadding = 0;
  let useSafeArea = false;
  let safeAreaWidth = width;
  let safeAreaHeight = height;
  
  if (safeArea) {
    const rawSafeAreaWidth = Number(safeArea.width);
    const rawSafeAreaHeight = Number(safeArea.height);
    const safeAreaWidthIsValid = Number.isFinite(rawSafeAreaWidth) && rawSafeAreaWidth > 0;
    const safeAreaHeightIsValid = Number.isFinite(rawSafeAreaHeight) && rawSafeAreaHeight > 0;

    if (safeAreaWidthIsValid && safeAreaHeightIsValid) {
      // Не даем охранной области выйти за пределы canvas.
      safeAreaWidth = Math.min(width, rawSafeAreaWidth);
      safeAreaHeight = Math.min(height, rawSafeAreaHeight);
      // Вычисляем отступы для центрирования охранной области
      horizontalPadding = (width - safeAreaWidth) / 2;
      verticalPadding = (height - safeAreaHeight) / 2;
      useSafeArea = true;
    } else {
      // Если размеры охранной области повреждены, рендерим по полному canvas.
      useSafeArea = false;
    }
  }

  // Защита от "схлопнутой" safe area на широких форматах:
  // если пользовательские значения слишком малы, элементы (logo/KV/legal/18+) могут исчезать.
  if (useSafeArea) {
    const isWideCanvas = width >= height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD;
    if (isWideCanvas) {
      const minSafeAreaWidth = Math.max(300, width * 0.5);
      const minSafeAreaHeight = Math.max(80, height * 0.5);
      if (safeAreaWidth < minSafeAreaWidth || safeAreaHeight < minSafeAreaHeight) {
        useSafeArea = false;
        safeAreaWidth = width;
        safeAreaHeight = height;
        horizontalPadding = 0;
        verticalPadding = 0;
      }
    }
  }
  
  // Для расчетов используем размер охранной области (если есть), иначе полный размер
  const effectiveWidth = useSafeArea ? safeAreaWidth : width;
  const effectiveHeight = useSafeArea ? safeAreaHeight : height;
  const minDimension = Math.min(effectiveWidth, effectiveHeight);
  
  // Вычисляем paddingPx относительно охранной области
  let paddingPx = (state.paddingPercent / 100) * minDimension;
  
  // Определяем тип макета - используем размеры охранной области для правильного определения типа
  const layoutType = getLayoutType(effectiveWidth, effectiveHeight, state.layoutMode);
  const { isUltraWide, isSuperWide, isHorizontalLayout } = layoutType;
  const isWideLayout = isHorizontalLayout || isUltraWide || isSuperWide;
  
  // Увеличиваем отступы для супер широких форматов
  // Для охранных областей используем paddingPx (относительно охранной области)
  const effectivePaddingPx = isSuperWide ? paddingPx * LAYOUT_CONSTANTS.PADDING_MULTIPLIER_SUPER_WIDE : paddingPx;

  // Вычисляем множители размеров - используем размеры охранной области
  let logoSizePercent = state.logoSize;
  const multipliers = calculateSizeMultipliers(effectiveWidth, effectiveHeight, layoutType, state);
  const { logoSizeMultiplier, titleSizeMultiplier, subtitleSizeMultiplier, legalMultiplier, ageMultiplier } = multipliers;
  
  // Определяем, является ли формат квадратным - используем размеры охранной области
  const isSquare = effectiveHeight < effectiveWidth * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD && 
                   effectiveWidth < effectiveHeight * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD;
  
  // Проверяем наличие партнерского логотипа
  const hasPartnerLogo = state.partnerLogo && state.showLogo;
  
  // Применяем множитель к логотипу (используем множитель из calculateSizeMultipliers)
  if (logoSizeMultiplier !== 1) {
    logoSizePercent *= logoSizeMultiplier;
  } else if (isSquare && hasPartnerLogo) {
    // Для квадратных форматов с партнерским логотипом умножаем размер логотипа на 1.5
    logoSizePercent *= 1.5;
  }
  
  // Применяем пользовательский множитель для конкретного размера (если задан)
  if (state.logoSizeMultipliers && state.logoSizeMultipliers[platform] && state.logoSizeMultipliers[platform][sizeKey]) {
    const customMultiplier = state.logoSizeMultipliers[platform][sizeKey];
    logoSizePercent *= customMultiplier;
  }

  // Рисуем фон (цвет или изображение) - используем модуль background
  drawBackground(ctx, width, height, state);

  let legalLines = [];
  let legalSize = 0;
  let ageSizePx = 0;
  let ageTextWidth = 0;
  let legalTextBounds = null;
  let ageBoundsRect = null;
  
  // Проверяем, нужно ли скрывать лигал и возраст для этого размера
  const shouldShowLegal = state.showLegal && state.legal && !hideLegalForSize;
  const shouldShowAge = state.showAge && state.age && !hideAgeForSize;
  
  if (shouldShowAge) {
    ageSizePx = (state.ageSize / 100) * minDimension * ageMultiplier;
    const ageWeight = getFontWeight(state.ageWeight || state.legalWeight);
    ctx.font = getFontString(ageWeight, ageSizePx, state.ageFontFamily || state.fontFamily);
    ageTextWidth = measureLineWidth(ctx, state.age || '');
  }

  // Calculate preliminary legalBlockHeight for positioning title/subtitle
  // This will be refined after positioning legal and age
  let preliminaryLegalBlockHeight = 0;
  
  // First, calculate age position to know how much space to reserve
  const ageGapPx = effectiveWidth * (state.ageGapPercent / 100);
  let ageReservedWidth = 0;
  if (shouldShowAge && ageTextWidth > 0) {
    ageReservedWidth = ageTextWidth + ageGapPx;
    preliminaryLegalBlockHeight = Math.max(preliminaryLegalBlockHeight, ageSizePx * 1.5);
  }
  
  if (shouldShowLegal) {
    legalSize = (state.legalSize / 100) * minDimension * legalMultiplier;
    const legalWeight = getFontWeight(state.legalWeight);
    ctx.font = getFontString(legalWeight, legalSize, state.legalFontFamily || state.fontFamily);
    // Legal всегда занимает всю ширину охранной области (минус отступы и место для age)
    const availableWidth = effectiveWidth - paddingPx * 2;
    const legalMaxWidth = Math.max(50, availableWidth - ageReservedWidth);
    const legalText = applyTextTransform(state.legal, state.legalTransform);
    legalLines = wrapText(ctx, legalText, legalMaxWidth, legalSize, legalWeight, state.legalLineHeight);
    preliminaryLegalBlockHeight = Math.max(preliminaryLegalBlockHeight, legalLines.length * legalSize * state.legalLineHeight);
  }
  
  // Use preliminary value for now
  let legalBlockHeight = preliminaryLegalBlockHeight;

  let legalContentBounds = null;
  let legalBounds = null;

  // Для охранных областей используем отдельные отступы
  const effectiveHorizontalPadding = useSafeArea ? horizontalPadding : paddingPx;
  const effectiveVerticalPadding = useSafeArea ? verticalPadding : paddingPx;
  
  // Вычисляем позицию логотипа - используем модуль layout
  // Для охранных областей передаем размеры охранной области
  // logoBounds рассчитывается относительно охранной области (без смещения)
  // Для РСЯ 1600x1200 центрирование должно быть относительно полного canvas, а не safe area
  const isRSYA1600x1200ForLogo = platform === 'РСЯ' && sizeKey === '1600x1200';
  const logoWidth = useSafeArea ? safeAreaWidth : width;
  const logoHeight = useSafeArea ? safeAreaHeight : height;
  const logoPadding = useSafeArea ? paddingPx : effectiveHorizontalPadding;
  // Для РСЯ 1600x1200 передаем полный размер canvas для правильного центрирования
  const logoWidthForCalc = (useSafeArea && isRSYA1600x1200ForLogo) ? width : logoWidth;
  const logoHeightForCalc = (useSafeArea && isRSYA1600x1200ForLogo) ? height : logoHeight;
  // Для РСЯ 1600x1200 нужно использовать paddingPx относительно охранного поля (как и для всех макетов с охранными полями)
  // Это обеспечит отступ внутри охранного поля
  const logoPaddingForCalc = (useSafeArea && isRSYA1600x1200ForLogo) 
    ? paddingPx  // Используем paddingPx относительно охранного поля для отступа внутри
    : logoPadding;
  // Передаем logoPosForSize для использования настройки из админки
  let logoBounds = calculateLogoBounds(state, logoWidthForCalc, logoHeightForCalc, logoPaddingForCalc, layoutType, logoSizePercent, logoPosForSize);
  
  // Сохраняем logoBounds без смещения для расчетов, сместим позже перед отрисовкой
  let logoBoundsForCalculations = logoBounds;
  const logoHeightValue = logoBounds ? logoBounds.height : 0;

  // Вычисляем позицию KV и область для текста - используем модули
  let kvPlannedMeta = null;
  let kvPlanningBranch = 'none';
  let kvPlanningReason = '';
  let textArea;
  let maxTextWidth;
  
  // Проверяем, что KV загружен и валиден перед использованием (учитываем width/height для SVG и вне DOM)
  const isKVValid = state.kv && state.kv.complete && ((state.kv.naturalWidth || state.kv.width) > 0) && ((state.kv.naturalHeight || state.kv.height) > 0);
  const hasRenderableKV = Boolean(state.showKV && isKVValid);
  
  // Сначала вычисляем KV для разных типов макетов
  // Для охранных областей используем размеры охранной области
  const kvWidth = useSafeArea ? safeAreaWidth : width;
  const kvHeight = useSafeArea ? safeAreaHeight : height;
  const kvPadding = useSafeArea ? paddingPx : effectivePaddingPx;
  const kvHorizontalPadding = useSafeArea ? paddingPx : effectiveHorizontalPadding;
  
  // Используем logoBounds без смещения для расчетов
  if (isRsyaLeftLayout && hasRenderableKV) {
    kvPlanningBranch = 'rsya-left';
    const kvW0 = state.kv.naturalWidth || state.kv.width;
    const kvH0 = state.kv.naturalHeight || state.kv.height;
    const maxKvW = Math.max(140, kvWidth * 0.38);
    const maxKvH = Math.max(140, kvHeight * 0.72);
    const scale = Math.min(maxKvW / kvW0, maxKvH / kvH0);
    const kvW = kvW0 * scale;
    const kvH = kvH0 * scale;
    kvPlannedMeta = {
      kvX: kvWidth - kvHorizontalPadding - kvW,
      kvY: Math.max(kvHorizontalPadding, (kvHeight - kvH) / 2),
      kvW,
      kvH,
      kvScale: scale,
      paddingPx: kvHorizontalPadding
    };
  } else if (isSuperWide && hasRenderableKV) {
    kvPlanningBranch = 'superWide';
    kvPlannedMeta = calculateSuperWideKV(state, kvWidth, kvHeight, kvPadding, logoBoundsForCalculations, legalBlockHeight);
  } else if (isUltraWide && hasRenderableKV) {
    kvPlanningBranch = 'ultraWide';
    kvPlannedMeta = calculateUltraWideKV(state, kvWidth, kvHeight, kvHorizontalPadding, legalBlockHeight);
  } else if (layoutType.isHorizontalLayout && hasRenderableKV) {
    kvPlanningBranch = 'horizontal';
    const result = calculateHorizontalKV(state, kvWidth, kvHeight, kvHorizontalPadding, legalBlockHeight);
    kvPlannedMeta = result.kvMeta;
    maxTextWidth = result.textWidth;
  } else if (!state.showKV) {
    kvPlanningReason = 'showKV-disabled';
  } else if (!isKVValid) {
    kvPlanningReason = 'kv-invalid-or-not-loaded';
  } else {
    kvPlanningReason = 'layout-not-wide';
  }

  // Fallback для широких форматов: если основной расчет не дал KV, пробуем безопасное размещение справа.
  if (!kvPlannedMeta && hasRenderableKV && isWideLayout) {
    const kvW0 = state.kv.naturalWidth || state.kv.width;
    const kvH0 = state.kv.naturalHeight || state.kv.height;
    const wideLegalReserve = (shouldShowLegal || shouldShowAge) ? legalBlockHeight : 0;
    const wideAvailableHeight = Math.max(0, kvHeight - kvHorizontalPadding * 2 - wideLegalReserve);
    const wideAvailableWidth = Math.max(0, kvWidth - kvHorizontalPadding * 2);
    const wideMaxKvWidth = Math.max(LAYOUT_CONSTANTS.MIN_KV_SIZE, wideAvailableWidth * LAYOUT_CONSTANTS.KV_MAX_WIDTH_RATIO);
    const scaleByHeight = wideAvailableHeight > 0 ? wideAvailableHeight / kvH0 : 0;
    const scaleByWidth = wideMaxKvWidth > 0 ? wideMaxKvWidth / kvW0 : 0;
    const fallbackScale = Math.min(scaleByHeight, scaleByWidth);

    if (Number.isFinite(fallbackScale) && fallbackScale > 0) {
      const fallbackW = kvW0 * fallbackScale;
      const fallbackH = kvH0 * fallbackScale;
      if (fallbackW >= LAYOUT_CONSTANTS.MIN_KV_SIZE || fallbackH >= LAYOUT_CONSTANTS.MIN_KV_SIZE) {
        const fallbackX = kvWidth - kvHorizontalPadding - fallbackW;
        const fallbackY = Math.max(
          kvHorizontalPadding,
          kvHeight - kvHorizontalPadding - wideLegalReserve - fallbackH
        );
        kvPlannedMeta = {
          kvX: fallbackX,
          kvY: fallbackY,
          kvW: fallbackW,
          kvH: fallbackH,
          kvScale: fallbackScale,
          paddingPx: kvHorizontalPadding
        };
        kvPlanningBranch = `${kvPlanningBranch || 'wide'}-fallback`;
        kvPlanningReason = '';
      }
    }

    if (!kvPlannedMeta) {
      kvPlanningReason = kvPlanningReason || 'wide-fallback-failed';
    }
  }
  
  // Смещаем KV на отступы охранной области (если используется)
  if (useSafeArea && kvPlannedMeta) {
    kvPlannedMeta = {
      ...kvPlannedMeta,
      kvX: kvPlannedMeta.kvX + horizontalPadding,
      kvY: kvPlannedMeta.kvY + verticalPadding
    };
  }
  
  // Вычисляем область для текста - используем модуль layout
  // Для охранных областей передаем размеры охранной области
  // Используем logoBounds и kvPlannedMeta без смещения для расчетов
  const textAreaWidth = useSafeArea ? safeAreaWidth : width;
  const textAreaHeight = useSafeArea ? safeAreaHeight : height;
  // Для calculateTextArea нужен kvPlannedMeta без смещения
  const kvPlannedMetaForTextArea = useSafeArea && kvPlannedMeta ? {
    ...kvPlannedMeta,
    kvX: kvPlannedMeta.kvX - horizontalPadding,
    kvY: kvPlannedMeta.kvY - verticalPadding
  } : kvPlannedMeta;
  const textAreaResult = calculateTextArea(textAreaWidth, textAreaHeight, paddingPx, layoutType, logoBoundsForCalculations, kvPlannedMetaForTextArea);
  textArea = textAreaResult.textArea;
  
  // Смещаем textArea на отступы охранной области (если используется)
  if (useSafeArea) {
    textArea.left += horizontalPadding;
    textArea.right += horizontalPadding;
  }
  if (isRsyaLeftLayout) {
    const canvasPadding = Math.max(24, (state.paddingPercent / 100) * Math.min(width, height));
    const kvLeft = kvPlannedMeta ? kvPlannedMeta.kvX : (width - canvasPadding);
    const gapToKV = Math.max(16, canvasPadding * 0.5);
    textArea.left = canvasPadding;
    textArea.right = Math.max(textArea.left + 140, kvLeft - gapToKV);

    if (logoBoundsForCalculations) {
      const logoX = useSafeArea ? (textArea.left - horizontalPadding) : textArea.left;
      logoBoundsForCalculations = {
        ...logoBoundsForCalculations,
        x: logoX
      };
    }
  }
  // Для горизонтального/широкого формата гарантируем минимальную ширину области текста, иначе клип «схлопывается» и контент не виден
  if (isWideLayout && (textArea.right <= textArea.left || textArea.right - textArea.left < 50)) {
    textArea.left = useSafeArea ? (horizontalPadding + paddingPx) : paddingPx;
    textArea.right = Math.min(width - paddingPx, textArea.left + Math.max(50, (useSafeArea ? safeAreaWidth : width) - paddingPx * 2 - 200));
  }
  maxTextWidth = textAreaResult.maxTextWidth || Math.max(50, textArea.right - textArea.left);

  // Common baseline for legal and age - both should be on the same line at the bottom
  // Age is always at the bottom right, legal text takes remaining space on the left
  // Для охранных областей baseline находится внизу охранной области с отступом paddingPx (как у логотипа сверху)
  const commonBaselineY = useSafeArea 
    ? (height - verticalPadding - paddingPx) 
    : (height - effectiveVerticalPadding);
  
  // Check if KV will be positioned on the right in horizontal layout (to avoid legal text overlap)
  // Для охранных областей используем effectiveWidth
  const kvRightEdgeBase = useSafeArea ? (horizontalPadding + effectiveWidth) : width;
  let kvRightEdge = kvRightEdgeBase - (useSafeArea ? paddingPx : effectiveHorizontalPadding);
  if (isHorizontalLayout && hasRenderableKV && !kvPlannedMeta) {
    // Estimate KV position - it will be on the right side
    const widthAfterPadding = Math.max(0, effectiveWidth - paddingPx * 2);
    const minTextRatio = effectiveWidth >= effectiveHeight * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD ? LAYOUT_CONSTANTS.MIN_TEXT_RATIO_WIDE : LAYOUT_CONSTANTS.MIN_TEXT_RATIO_NORMAL;
      const minTextWidth = Math.max(widthAfterPadding * minTextRatio, LAYOUT_CONSTANTS.MIN_TEXT_WIDTH);
    const gap = Math.max(paddingPx, effectiveWidth * 0.02);
    const availableHeight = Math.max(0, effectiveHeight - paddingPx * 2);
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
        kvRightEdge = kvRightEdgeBase - (useSafeArea ? paddingPx : effectiveHorizontalPadding) - kvW - gap;
      }
    }
  } else if (kvPlannedMeta && isHorizontalLayout) {
    // KV is already planned, use its left edge
    kvRightEdge = kvPlannedMeta.kvX - Math.max(paddingPx, effectiveWidth * 0.02);
  }
  
  if ((shouldShowLegal && legalLines.length > 0) || (shouldShowAge && ageTextWidth > 0)) {
    // Legal всегда занимает всю ширину охранной области (минус отступы и место для age)
    // Для широких форматов age будет справа от legal, поэтому не вычитаем его ширину
    const ageWidth = (shouldShowAge && ageTextWidth > 0) ? ageTextWidth + ageGapPx : 0;
    // Legal занимает всю ширину охранной области по нижнему краю на любом макете
    let fullLegalWidth = effectiveWidth - paddingPx * 2;
    if (!(isHorizontalLayout || isUltraWide || isSuperWide)) {
      // Для вертикальных форматов вычитаем место для age
      fullLegalWidth -= ageWidth;
    }
    
    // Для широких форматов учитываем KV, чтобы legal не заходил на него
    if (kvPlannedMeta && (isHorizontalLayout || isUltraWide) && !isSuperWide) {
      const kvLeft = kvPlannedMeta.kvX;
      const legalLeftPadding = useSafeArea ? (horizontalPadding + paddingPx) : effectiveHorizontalPadding;
      const gap = Math.max(paddingPx * 0.5, effectiveWidth * 0.01);
      const maxLegalWidthWithKV = Math.max(0, kvLeft - legalLeftPadding - gap - ageWidth);
      fullLegalWidth = Math.min(fullLegalWidth, maxLegalWidthWithKV);
    }
    
    let legalMaxWidthForFlex = Math.max(50, fullLegalWidth);
    
    // Calculate legal text block - last line should be at commonBaselineY
    if (shouldShowLegal && legalLines.length > 0) {
      // Legal всегда занимает всю ширину макета (минус отступы и место для age)
      const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
      const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
      const legalTop = commonBaselineY - legalHeight;
      
      // Пересчитываем legalLines с учетом полной ширины (с учетом KV для широких форматов)
      const legalWeight = getFontWeight(state.legalWeight);
      const legalText = applyTextTransform(state.legal, state.legalTransform);
      legalLines = wrapText(ctx, legalText, legalMaxWidthForFlex, legalSize, legalWeight, state.legalLineHeight);
      
      // Для охранных областей позиционируем legal относительно охранной области
      const legalX = useSafeArea ? (horizontalPadding + paddingPx) : effectiveHorizontalPadding;
      const legalYBase = useSafeArea ? Math.max(verticalPadding + paddingPx, legalTop) : Math.max(effectiveVerticalPadding, legalTop);
      const legalY = legalYBase + (state.legalOffsetTopPx || 0);
      
      legalContentBounds = {
        x: legalX,
        y: legalY,
        width: legalMaxWidthForFlex,
        height: legalHeight
      };
      
      legalTextBounds = {
        x: legalX,
        y: legalY,
        width: legalMaxWidthForFlex,
        height: legalHeight
      };
      
      legalBounds = { ...legalContentBounds };
    }

    // Position age at the same baseline as legal's last line (commonBaselineY)
    if (shouldShowAge && ageTextWidth > 0) {
      const ageBaseline = commonBaselineY;
      const ageY = ageBaseline - ageSizePx;
      
      // Для широких форматов age размещается справа от legal, а не в правом нижнем углу
      // Для супер-широких форматов age в правом углу, как у остальных
      // Для охранных областей используем правильные координаты
      const ageMinX = useSafeArea ? (horizontalPadding + paddingPx) : effectiveHorizontalPadding;
      const ageMaxX = useSafeArea 
        ? (horizontalPadding + effectiveWidth - paddingPx - ageTextWidth) 
        : (effectiveWidth - effectiveHorizontalPadding - ageTextWidth);
      
      let ageX;
      if (isSuperWide) {
        // Для супер-широких форматов age в правом нижнем углу охранной области
        ageX = ageMaxX;
      } else if (isHorizontalLayout || isUltraWide) {
        // Age справа от legal
        // Вычисляем реальную ширину legal текста
        let actualLegalWidth = 0;
        if (legalLines.length > 0 && legalTextBounds) {
          const legalWeight = getFontWeight(state.legalWeight);
          ctx.font = getFontString(legalWeight, legalSize, state.legalFontFamily || state.fontFamily);
          legalLines.forEach(line => {
            let lineWidth;
            if (state.legalLetterSpacing) {
              // Вычисляем межбуквенное расстояние в пикселях на основе процента от размера шрифта
              const letterSpacingPx = (state.legalLetterSpacing / 100) * legalSize;
              const characters = Array.from(line);
              const widths = characters.map((char) => measureLineWidth(ctx, char));
              lineWidth = widths.reduce((acc, width) => acc + width, 0) + letterSpacingPx * (characters.length - 1);
            } else {
              lineWidth = measureLineWidth(ctx, line);
            }
            if (lineWidth > actualLegalWidth) {
              actualLegalWidth = lineWidth;
            }
          });
        }
        const legalRight = legalTextBounds ? (legalTextBounds.x + actualLegalWidth) : ageMinX;
        // Используем ageGapPx для расстояния между legal и age
        ageX = legalRight + ageGapPx;
        
        // Для широких форматов проверяем, что age не заходит на KV и не выходит за границы
        if (kvPlannedMeta) {
          const kvLeft = kvPlannedMeta.kvX;
          const gap = Math.max(paddingPx * 0.5, effectiveWidth * 0.01);
          const maxAgeX = Math.max(0, kvLeft - gap - ageTextWidth);
          const finalMaxAgeX = Math.min(maxAgeX, ageMaxX);
          
          if (ageX + ageTextWidth > kvLeft - gap || ageX + ageTextWidth > ageMaxX) {
            ageX = Math.max(legalRight + ageGapPx, finalMaxAgeX);
          }
        }
        
        // Убеждаемся, что age не выходит за границы охранной области
        ageX = Math.max(ageMinX, Math.min(ageX, ageMaxX));
      } else {
        // Для вертикальных форматов age в правом нижнем углу охранной области
        ageX = ageMaxX;
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
          x: useSafeArea ? (horizontalPadding + paddingPx) : effectivePaddingPx,
          y: Math.max(effectiveVerticalPadding, legalTop),
          width: legalMaxWidthForFlex,
          height: legalHeight
        };
        
        legalTextBounds = {
          x: useSafeArea ? (horizontalPadding + paddingPx) : effectivePaddingPx,
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
    const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
    const legalTop = legalTextBounds ? legalTextBounds.y : (legalContentBounds ? legalContentBounds.y : maxY - effectiveVerticalPadding);
    const legalHeight = legalTextBounds ? legalTextBounds.height : (legalContentBounds ? legalContentBounds.height : 0);
    // Legal block extends from its top to the bottom (commonBaselineY)
    // Для охранных областей учитываем отступ paddingPx от нижнего края
    const commonBaselineYForRefine = useSafeArea ? (height - verticalPadding - paddingPx) : (height - effectiveVerticalPadding);
    legalBlockHeight = Math.max(legalBlockHeight, commonBaselineYForRefine - legalTop + effectiveVerticalPadding * 0.5);
  } else if (shouldShowLegal && legalLines.length > 0) {
    // Fallback: use calculated height
    legalBlockHeight = Math.max(legalBlockHeight, legalLines.length * legalSize * state.legalLineHeight + effectiveVerticalPadding * 0.5);
  }
  if (ageBoundsRect && ageSizePx > 0) {
    // Ensure we have enough space for age
    legalBlockHeight = Math.max(legalBlockHeight, ageSizePx + effectiveVerticalPadding * 0.5);
  }

  const baseTitleSize = (state.titleSize / 100) * minDimension;
  const titleSize = baseTitleSize * titleSizeMultiplier;
  const baseSubtitleSize = (state.subtitleSize / 100) * minDimension;
  // Подзаголовок масштабируется с использованием отдельного множителя
  const subtitleSize = baseSubtitleSize * subtitleSizeMultiplier;
  
  // Используем константу для соотношения заголовка и подзаголовка
  const TITLE_SUBTITLE_RATIO = LAYOUT_CONSTANTS.TITLE_SUBTITLE_RATIO;

  // Hide subtitle on wide formats (height < 150px) if option is enabled
  // Для охранных областей проверяем высоту охранной области
  const shouldShowSubtitle = state.showSubtitle && state.subtitle && !(state.hideSubtitleOnWide && effectiveHeight < 150 && !isRsyaMode);
  
  // Получаем веса шрифтов один раз
  const titleWeight = getFontWeight(state.titleWeight);
  const subtitleWeight = getFontWeight(state.subtitleWeight);
  
  ctx.font = getFontString(titleWeight, titleSize, state.titleFontFamily || state.fontFamily);
  const titleText = applyTextTransform(state.title, state.titleTransform);
  const titleLetterSpacingPx = (state.titleLetterSpacing / 100) * titleSize;
  const adjustedMaxTextWidth = titleLetterSpacingPx > 0
    ? Math.max(50, maxTextWidth - (titleLetterSpacingPx * 2))
    : maxTextWidth;
  const titleLines = wrapText(ctx, titleText, adjustedMaxTextWidth, titleSize, titleWeight, state.titleLineHeight);
  const titleBlockHeight = titleLines.length * titleSize * state.titleLineHeight;

  let subtitleBlockHeight = 0;
  let subtitleLines = [];
  if (shouldShowSubtitle) {
    ctx.font = getFontString(subtitleWeight, subtitleSize, state.subtitleFontFamily || state.fontFamily);
    const subtitleLetterSpacingPx = (state.subtitleLetterSpacing / 100) * subtitleSize;
    const adjustedSubtitleMaxWidth = subtitleLetterSpacingPx > 0
      ? Math.max(50, maxTextWidth - (subtitleLetterSpacingPx * 2))
      : maxTextWidth;
    const subtitleText = applyTextTransform(state.subtitle, state.subtitleTransform);
    subtitleLines = wrapText(ctx, subtitleText, adjustedSubtitleMaxWidth, subtitleSize, subtitleWeight, state.subtitleLineHeight);
    if (subtitleLines.length > 0) {
      // Gap is calculated separately, not included in block height
      subtitleBlockHeight = subtitleLines.length * subtitleSize * state.subtitleLineHeight;
    }
  }

  // Total text height includes title, subtitle, and gap between them
  // For ultra-wide formats, reduce gap (closer to title)
  // Для охранных областей используем высоту охранной области
  const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
  const subtitleGapPx = shouldShowSubtitle && subtitleLines.length > 0 ? (effectiveSubtitleGap / 100) * effectiveHeight : 0;
  const titleLogoGapPx = ((state.titleLogoGap ?? 0) / 100) * effectiveHeight;
  const totalTextHeight = titleBlockHeight + subtitleGapPx + subtitleBlockHeight;
  const getLogoTitleGap = (baseGap, minimumGap = 0) => Math.max(minimumGap, baseGap + titleLogoGapPx);

  let startY;

  if (isSuperWide || isUltraWide || isHorizontalLayout) {
    // Для широких форматов учитываем titleVPos
    const currentPadding = isSuperWide ? effectivePaddingPx : effectiveVerticalPadding;
    
    // Для очень низких горизонтальных форматов (height < 150) увеличиваем минимальный отступ
    const isVeryLowHorizontal = isHorizontalLayout && height < 150;
    // Для форматов с высотой 400-500px также увеличиваем отступ
    const isMediumHeight = isHorizontalLayout && height >= 400 && height <= 500;
    const minGapForLow = isVeryLowHorizontal ? Math.max(paddingPx * 0.3, 4) : (isMediumHeight ? Math.max(paddingPx * 0.2, 6) : 0);
    
    if (state.titleVPos === 'top') {
      startY = currentPadding + titleSize + (state.titleOffsetTopPx || 0);
      if (state.showLogo && state.logo && logoBoundsForCalculations) {
        // Используем logoBounds без смещения для расчетов
        // Для РСЯ 1600x1200 добавляем дополнительный отступ между логотипом и заголовком
        const isRSYA1600x1200ForGap = platform === 'РСЯ' && sizeKey === '1600x1200';
        const additionalGap = isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0);
        const logoTitleGap = getLogoTitleGap(currentPadding + additionalGap, minGapForLow);
        const logoBottom = logoBoundsForCalculations.y + logoBoundsForCalculations.height;
        const logoStart = logoBottom + logoTitleGap + titleSize;
        startY = Math.max(startY, logoStart);
        
        // Для очень низких и средних форматов убеждаемся, что заголовок не залезает на логотип
        if (isVeryLowHorizontal || isMediumHeight) {
          const minStartAfterLogo = logoBottom + Math.max(logoTitleGap, titleSize * 0.3);
          startY = Math.max(startY, minStartAfterLogo);
        }
      }
      if (legalBlockHeight > 0) {
        const bottomPadding = currentPadding + legalBlockHeight + currentPadding * 0.5;
        const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
        startY = Math.min(startY, maxY - bottomPadding - totalTextHeight + titleSize);
      }
      startY = Math.max(currentPadding + titleSize + (state.titleOffsetTopPx || 0), startY);
    } else if (state.titleVPos === 'center') {
      // При центрировании текста логотип остается вверху, центрируем только текст
      // Для РСЯ 1600x1200 добавляем дополнительный отступ между логотипом и заголовком
      const isRSYA1600x1200ForGap = platform === 'РСЯ' && sizeKey === '1600x1200';
      const additionalGap = isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0);
      // Для очень низких горизонтальных форматов (height < 150) увеличиваем минимальный отступ
      const isVeryLowHorizontal = isHorizontalLayout && height < 150;
      const minGapForLow = isVeryLowHorizontal ? Math.max(paddingPx * 0.3, 4) : 0;
      const logoTitleGap = getLogoTitleGap(currentPadding + additionalGap, minGapForLow);
      const logoBottom = (state.showLogo && state.logo && logoBoundsForCalculations) 
        ? logoBoundsForCalculations.y + logoBoundsForCalculations.height 
        : currentPadding;
      const topArea = Math.max(currentPadding, logoBottom + logoTitleGap);
      
      // Для очень низких форматов убеждаемся, что есть минимальный отступ после логотипа
      if (isVeryLowHorizontal && state.showLogo && state.logo && logoBoundsForCalculations) {
        const minStartAfterLogo = logoBottom + Math.max(logoTitleGap, titleSize * 0.3);
        const calculatedTopArea = Math.max(currentPadding, minStartAfterLogo);
        if (calculatedTopArea > topArea) {
          const adjustedTopArea = calculatedTopArea;
          const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
          const bottomArea = maxY - currentPadding - legalBlockHeight;
          const availableHeight = Math.max(0, bottomArea - adjustedTopArea);
          if (availableHeight > 0 && totalTextHeight > 0) {
            const centerY = adjustedTopArea + availableHeight / 2;
            startY = centerY - totalTextHeight / 2 + titleSize;
            const minStart = adjustedTopArea + titleSize;
            startY = Math.max(minStart + (state.titleOffsetTopPx || 0), startY);
          } else {
            startY = adjustedTopArea + titleSize;
          }
          if (!isFinite(startY) || startY < currentPadding + titleSize) {
            startY = Math.max(currentPadding + titleSize + (state.titleOffsetTopPx || 0), adjustedTopArea + titleSize + (state.titleOffsetTopPx || 0));
          }
        } else {
          const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
          const bottomArea = maxY - currentPadding - legalBlockHeight;
          const availableHeight = Math.max(0, bottomArea - topArea);
          if (availableHeight > 0 && totalTextHeight > 0) {
            const centerY = topArea + availableHeight / 2;
            startY = centerY - totalTextHeight / 2 + titleSize;
            const minStart = topArea + titleSize;
            startY = Math.max(minStart + (state.titleOffsetTopPx || 0), startY);
          } else {
            startY = topArea + titleSize;
          }
          if (!isFinite(startY) || startY < currentPadding + titleSize) {
            startY = Math.max(currentPadding + titleSize + (state.titleOffsetTopPx || 0), topArea + titleSize + (state.titleOffsetTopPx || 0));
          }
        }
      } else {
        const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
        const bottomArea = maxY - currentPadding - legalBlockHeight;
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
      }
    } else {
      // bottom
      const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
      // Для safe area используем paddingPx для отступа от нижнего края (как у логотипа сверху)
      const bottomPadding = useSafeArea ? paddingPx : currentPadding;
      const legalTop = maxY - bottomPadding - legalBlockHeight;
      const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * effectiveHeight;
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
        // Для РСЯ 1600x1200 добавляем небольшой дополнительный отступ между логотипом и заголовком
        const isRSYA1600x1200ForGap = platform === 'РСЯ' && sizeKey === '1600x1200';
        if (state.showLogo && state.logo && logoBoundsForCalculations) {
          // Для РСЯ 1600x1200 добавляем дополнительный отступ (0.5 * paddingPx)
          const additionalGap = isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0);
          const logoTitleGap = getLogoTitleGap(effectiveVerticalPadding + additionalGap);
          startY = logoBoundsForCalculations.y + logoBoundsForCalculations.height + logoTitleGap + titleSize;
        } else {
          startY = effectiveVerticalPadding + titleSize;
      }
      // Для РСЯ 1600x1200 добавляем дополнительный отступ
      const minLogoGap = getLogoTitleGap(isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0));
      const minStart = (state.showLogo && logoBoundsForCalculations) ? logoBoundsForCalculations.y + logoBoundsForCalculations.height + minLogoGap + titleSize : paddingPx + titleSize;
      startY = Math.max(minStart, startY);
    } else if (state.titleVPos === 'center') {
      // При центрировании текста логотип остается вверху, центрируем только текст
      // Учитываем логотип при вычислении доступной высоты для текста
      // Для РСЯ 1600x1200 добавляем дополнительный отступ между логотипом и заголовком
      const isRSYA1600x1200ForGap = platform === 'РСЯ' && sizeKey === '1600x1200';
      const additionalGap = isRsyaLeftLayout
        ? 0
        : (isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0));
      const baseLogoGap = isRsyaLeftLayout ? Math.max(2, paddingPx * 0.04) : paddingPx;
      const logoTitleGap = getLogoTitleGap(baseLogoGap + additionalGap);
      const logoBottom = (state.showLogo && state.logo && logoBoundsForCalculations) 
        ? logoBoundsForCalculations.y + logoBoundsForCalculations.height 
        : paddingPx;
      const topArea = Math.max(paddingPx, logoBottom + logoTitleGap);
      const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
      const bottomArea = maxY - paddingPx - legalBlockHeight;
      const availableHeight = Math.max(0, bottomArea - topArea);
      if (availableHeight > 0 && totalTextHeight > 0) {
        const centerY = isRsyaLeftLayout
          ? ((useSafeArea ? verticalPadding : 0) + (useSafeArea ? effectiveHeight : height) / 2)
          : (topArea + availableHeight / 2);
        startY = centerY - totalTextHeight / 2 + titleSize;
        if (isRSYA1600x1200ForGap && !isRsyaLeftLayout) {
          startY += effectiveHeight * 0.025;
        }
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
      const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
      // Для safe area используем paddingPx для отступа от нижнего края (как у логотипа сверху)
      const bottomPadding = useSafeArea ? paddingPx : effectiveVerticalPadding;
      const legalTop = maxY - bottomPadding - legalBlockHeight;
      // For ultra-wide formats, reduce gap (closer to title)
      const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * effectiveHeight;
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

  // Определяем выключку текста: сначала проверяем настройку для размера, потом глобальную
  // Для широких форматов текст всегда выравнивается слева и прибит к левому краю макета
  // Исключение: для РСЯ 1600x1200 всегда центрируем
  const isRSYA1600x1200 = platform === 'РСЯ' && sizeKey === '1600x1200' && !isRsyaLeftLayout;
  let effectiveTitleAlign;
  if (isRSYA1600x1200) {
    // Для РСЯ 1600x1200 всегда центрируем
    effectiveTitleAlign = 'center';
  } else if (isWideLayout) {
    effectiveTitleAlign = 'left';
  } else {
    // Используем настройку для размера, если есть, иначе глобальную
    effectiveTitleAlign = titleAlignForSize !== null ? titleAlignForSize : (state.titleAlign || 'left');
  }
  
  // Для широких форматов прибиваем текст к левому краю макета (с учетом safe area и textArea)
  // textArea уже учитывает KV, поэтому используем textArea.left для правильного позиционирования
  // Исключение: для РСЯ 1600x1200 всегда центрируем
  let titleX;
  if (isRSYA1600x1200) {
    titleX = getAlignedXWithinArea('center', textArea);
  } else if (isWideLayout) {
    titleX = textArea.left; // Используем textArea.left, который уже учитывает safe area и KV
  } else {
    titleX = getAlignedXWithinArea(effectiveTitleAlign, textArea);
  }
  // titleWeight уже определен выше
  ctx.font = getFontString(titleWeight, titleSize, state.titleFontFamily || state.fontFamily);
  {
    const { r, g, b } = hexToRgb(state.titleColor);
    const titleOpacity = Math.max(0, Math.min(1, (state.titleOpacity ?? 100) / 100));
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${titleOpacity})`;
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = effectiveTitleAlign;

  const computeTextBounds = (baseY) => {
    // Применяем вертикальные отступы для заголовка и подзаголовка
    const baseYWithTitleOffset = baseY + (state.titleOffsetTopPx || 0);
    const titleBoundsLocal = getTextBlockBounds(
      ctx,
      titleLines,
      titleX,
      baseYWithTitleOffset,
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
      const subtitleGapPx = (effectiveSubtitleGap / 100) * effectiveHeight;
      subtitleYLocal = baseYWithTitleOffset + titleBlockHeight + subtitleGapPx + (state.subtitleOffsetTopPx || 0);
      
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
      const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
      // Для safe area используем paddingPx для отступа от нижнего края (как у логотипа сверху)
      const bottomPadding = useSafeArea ? paddingPx : effectiveVerticalPadding;
      const legalTop = maxY - bottomPadding - legalBlockHeight;
      const effectiveSubtitleGap = state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * effectiveHeight;
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
  // Ограничиваем координаты заголовка границами canvas
  const titleMinX = 0;
  const titleMaxX = width;
  const titleMinY = 0;
  const titleMaxY = height;

  ctx.save();
  ctx.beginPath();
  // Область отсечения: не допускаем нулевую/отрицательную ширину, иначе на широком превью ничего не видно
  const clipLeft = Math.max(0, Math.min(textArea.left, width - 1));
  const clipW = Math.max(1, Math.min(textArea.right, width) - clipLeft);
  ctx.rect(clipLeft, 0, clipW, height);
  ctx.clip();
  
  titleLines.forEach((line, index) => {
    const lineY = startY + index * titleSize * state.titleLineHeight;
    // Проверяем, что строка видна (хотя бы частично)
    if (lineY >= titleMinY - titleSize && lineY <= titleMaxY + titleSize) {
      // Ограничиваем X координату границами canvas и textArea
      let clampedTitleX = titleX;
      const availableWidth = textArea.right - textArea.left;
      
      // Проверяем, что текст не выходит за границы textArea
      let lineToDraw = line;
      if (state.titleLetterSpacing) {
        const letterSpacingPx = (state.titleLetterSpacing / 100) * titleSize;
        const characters = Array.from(line);
        const widths = characters.map((char) => measureLineWidth(ctx, char));
        const totalWidth = widths.reduce((acc, width) => acc + width, 0) + letterSpacingPx * (characters.length - 1);
        
        if (totalWidth > availableWidth) {
          // Обрезаем строку до нужной длины
          let truncatedLine = '';
          let truncatedWidth = 0;
          for (let i = 0; i < characters.length; i++) {
            const char = characters[i];
            const charWidth = widths[i];
            const spacing = i > 0 ? letterSpacingPx : 0;
            if (truncatedWidth + charWidth + spacing <= availableWidth) {
              truncatedLine += char;
              truncatedWidth += charWidth + spacing;
            } else {
              break;
            }
          }
          lineToDraw = truncatedLine;
        }
      } else {
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
      }
      
      if (effectiveTitleAlign === 'left') {
        clampedTitleX = Math.max(textArea.left, Math.min(titleX, textArea.right));
      } else if (effectiveTitleAlign === 'right') {
        const lineWidth = measureLineWidth(ctx, lineToDraw);
        clampedTitleX = Math.max(textArea.left, Math.min(titleX, textArea.right - lineWidth));
      } else {
        // center
        const lineWidth = measureLineWidth(ctx, lineToDraw);
        clampedTitleX = Math.max(textArea.left + lineWidth / 2, Math.min(titleX, textArea.right - lineWidth / 2));
      }
      
      if (state.titleLetterSpacing) {
        drawTextWithSpacing(ctx, lineToDraw, clampedTitleX, lineY, state.titleLetterSpacing, titleSize, effectiveTitleAlign);
      } else {
        ctx.fillText(lineToDraw, clampedTitleX, lineY);
      }
    }
  });
  
  // Draw subtitle if it's enabled and has content
  if (shouldShowSubtitle && subtitleLines.length > 0) {
    // Ensure subtitleY is calculated if it wasn't set
    let actualSubtitleY = subtitleY;
    if (actualSubtitleY === null || actualSubtitleY === undefined) {
      // Calculate subtitle Y position if it wasn't calculated
      // For ultra-wide formats, reduce gap (closer to title)
      const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
      const subtitleGapPx = (effectiveSubtitleGap / 100) * effectiveHeight;
      actualSubtitleY = startY + titleBlockHeight + subtitleGapPx;
    }
    
    // Для широких форматов подзаголовок тоже прибит к левому краю (с учетом safe area и textArea)
    // textArea уже учитывает KV, поэтому используем textArea.left для правильного позиционирования
    // Исключение: для РСЯ 1600x1200 всегда центрируем
    const subtitleX = isRSYA1600x1200
      ? getAlignedXWithinArea('center', textArea)
      : (isWideLayout
          ? textArea.left
          : getAlignedXWithinArea(effectiveTitleAlign, textArea));
    const effectiveSubtitleAlign = effectiveTitleAlign;
    // subtitleWeight уже определен выше
    ctx.font = getFontString(subtitleWeight, subtitleSize, state.subtitleFontFamily || state.fontFamily);
    const { r, g, b } = hexToRgb(state.subtitleColor || state.titleColor);
    const opacity = Math.max(0, Math.min(1, (state.subtitleOpacity ?? 90) / 100));
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = effectiveSubtitleAlign;
    ctx.textBaseline = 'alphabetic';

    subtitleLines.forEach((line, index) => {
      const lineY = actualSubtitleY + index * subtitleSize * state.subtitleLineHeight;
      // For layouts up to 150px height, always show subtitle even if it overflows
      // For larger layouts, only draw if line is at least partially visible
      const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
      const isSmallLayout = effectiveHeight <= 150;
      if (isSmallLayout || (lineY > -subtitleSize && lineY < maxY + subtitleSize)) {
        // Проверяем, что текст не выходит за границы охранного поля
        let lineToDraw = line;
        const availableWidth = textArea.right - textArea.left;
        
        if (state.subtitleLetterSpacing) {
          // Вычисляем межбуквенное расстояние в пикселях на основе процента от размера шрифта
          const letterSpacingPx = (state.subtitleLetterSpacing / 100) * subtitleSize;
          // Измеряем реальную ширину строки с letter spacing
          const characters = Array.from(line);
          const widths = characters.map((char) => measureLineWidth(ctx, char));
          const totalWidth = widths.reduce((acc, width) => acc + width, 0) + letterSpacingPx * (characters.length - 1);
          
          // Если текст выходит за границы, обрезаем его
          if (totalWidth > availableWidth) {
            // Обрезаем строку до нужной длины
            let truncatedLine = '';
            let truncatedWidth = 0;
            for (let i = 0; i < characters.length; i++) {
              const char = characters[i];
              const charWidth = widths[i];
              const spacing = i > 0 ? letterSpacingPx : 0;
              if (truncatedWidth + charWidth + spacing <= availableWidth) {
                truncatedLine += char;
                truncatedWidth += charWidth + spacing;
              } else {
                break;
              }
            }
            lineToDraw = truncatedLine;
          }
          drawTextWithSpacing(ctx, lineToDraw, subtitleX, lineY, state.subtitleLetterSpacing, subtitleSize, effectiveSubtitleAlign);
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

  ctx.restore();

  const textBlockBottom = Math.max(
    titleBounds ? titleBounds.y + titleBounds.height : startY,
    subtitleBounds ? subtitleBounds.y + subtitleBounds.height : 0
  );

  // Используем проверку валидности KV
  // Для вертикальных форматов (не широких) рассчитываем KV здесь
  // Узкие и квадратные форматы планируют KV здесь. После этого блока рендер
  // должен продолжаться всегда, даже если KV скрыт или невалиден.
  if (hasRenderableKV && !kvPlannedMeta) {
    if (!isUltraWide && !isHorizontalLayout) {
      // Определяем, является ли формат узким или квадратным
      // Для охранных областей используем effectiveWidth и effectiveHeight
      const isVertical = effectiveHeight >= effectiveWidth * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD;
      const isSquare = effectiveHeight < effectiveWidth * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD && 
                       effectiveWidth < effectiveHeight * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD;
      
      const safeGapY = paddingPx * 0.5;
      const availableWidth = Math.max(0, effectiveWidth - paddingPx * 2);
      // Для расчетов используем координаты относительно охранной области
      // titleBounds уже содержит смещение, поэтому вычитаем его для расчетов
      const textTopRelative = titleBounds ? (titleBounds.y - (useSafeArea ? verticalPadding : 0)) : paddingPx;
      const logoBottomRelative = logoBoundsForCalculations ? (logoBoundsForCalculations.y + logoBoundsForCalculations.height) : paddingPx;
      const baseTop = paddingPx;
      const topAreaStart = Math.max(baseTop, logoBottomRelative + safeGapY);
      const topAreaEnd = Math.max(topAreaStart, textTopRelative - safeGapY);
      const topAreaHeight = Math.max(0, topAreaEnd - topAreaStart);

      const legalReserved = (shouldShowLegal && legalLines.length > 0) || (shouldShowAge && ageTextWidth > 0) ? legalBlockHeight : 0;
      // textBlockBottom содержит абсолютные координаты, нужно конвертировать в относительные
      const textBlockBottomRelative = textBlockBottom - (useSafeArea ? verticalPadding : 0);
      const bottomAreaStart = textBlockBottomRelative + safeGapY;
      // Учитываем отступ для legal (safeGap для KV должен быть выше legal)
      const maxYRelative = effectiveHeight;
      const legalTopRelative = maxYRelative - paddingPx - legalReserved;
      // Для узких и квадратных форматов убираем отступ между KV и лигалом
      const safeGapForLegal = (isVertical || isSquare) ? 0 : Math.max(paddingPx * 0.5, legalSize * 0.5);
      const bottomAreaEnd = Math.max(bottomAreaStart, legalTopRelative - safeGapForLegal);
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
        // Позиция вычисляется относительно охранной области, смещение будет применено позже
        const kvPosition = state.kvPosition || 'center';
        let kvX;
        if (kvPosition === 'left') {
          kvX = paddingPx;
        } else if (kvPosition === 'right') {
          kvX = availableWidth - paddingPx - kvW;
        } else {
          // center (по умолчанию)
          kvX = paddingPx + (availableWidth - kvW) / 2;
        }
        // Размещаем KV так, чтобы максимально использовать доступное пространство
        // areaStart - это координата относительно охранной области
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

      // Если не помещается ни в top, ни в bottom, не размещаем Визуал (placement остается null)
      // Визуал будет автоматически скрыт в конце функции, если kvRenderMeta будет null

      if (placement) {
        kvPlannedMeta = { ...placement, paddingPx };
        // Если используется охранная область, смещаем KV на отступы
        if (useSafeArea && kvPlannedMeta) {
          const beforeShift = { kvX: kvPlannedMeta.kvX, kvY: kvPlannedMeta.kvY };
          kvPlannedMeta = {
            ...kvPlannedMeta,
            kvX: kvPlannedMeta.kvX + horizontalPadding,
            kvY: kvPlannedMeta.kvY + verticalPadding
          };
        }
      }
    }
  }

  if (shouldShowLegal && legalLines.length > 0) {
    const legalWeight = getFontWeight(state.legalWeight);
    ctx.font = getFontString(legalWeight, legalSize, state.legalFontFamily || state.fontFamily);
    // Лигал использует свой цвет и прозрачность
    const legalColor = state.legalColor || '#ffffff';
    const legalOpacity = (state.legalOpacity ?? 60) / 100; // Конвертируем из процентов (0-100) в 0-1
    const { r, g, b } = hexToRgb(legalColor);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${legalOpacity})`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Для широких форматов учитываем KV, чтобы legal не залезал на него
    // Для широких форматов age будет справа от legal, поэтому не вычитаем его ширину из maxLegalWidth
    // Для очень широких форматов (супер-широких) legal и age занимают всю ширину, как у остальных
    // Для охранных областей используем размеры охранной области
    const legalPadding = useSafeArea ? paddingPx : effectivePaddingPx;
    
    // Draw legal text - last line should be at commonBaselineY
    // Для охранных областей используем правильные координаты
    const drawX = useSafeArea ? (horizontalPadding + legalPadding) : effectivePaddingPx;
    let maxLegalWidth = effectiveWidth - legalPadding * 2;
    
    // Всегда учитываем место для age, чтобы legal не налезал на 18+
    const ageWidth = (shouldShowAge && ageTextWidth > 0) ? ageTextWidth + ageGapPx : 0;
    
    if (!(isHorizontalLayout || isUltraWide || isSuperWide)) {
      // Для вертикальных форматов age в правом углу, вычитаем его ширину
      maxLegalWidth -= ageWidth;
    } else if (isSuperWide) {
      // Для супер-широких форматов age в правом углу, вычитаем его ширину
      maxLegalWidth -= ageWidth;
    } else if ((isHorizontalLayout || isUltraWide) && !kvPlannedMeta) {
      // Для широких форматов без KV age будет справа от legal,
      // нужно ограничить ширину legal, чтобы он не налезал на age
      const maxLegalRight = useSafeArea 
        ? (horizontalPadding + effectiveWidth - paddingPx - ageWidth)
        : (effectiveWidth - effectivePaddingPx - ageWidth);
      const maxLegalWidthForAge = Math.max(0, maxLegalRight - drawX);
      const originalMaxLegalWidth = maxLegalWidth;
      maxLegalWidth = Math.min(maxLegalWidth, maxLegalWidthForAge);
      
      // Пересчитываем legalLines с учетом ограниченной ширины для кастомных полей
      if (maxLegalWidth < originalMaxLegalWidth) {
        const legalText = applyTextTransform(state.legal, state.legalTransform);
        legalLines = wrapText(ctx, legalText, maxLegalWidth, legalSize, legalWeight, state.legalLineHeight);
        
        // Обновляем legalBounds с правильной шириной
        const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
        const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
        const legalTop = commonBaselineY - legalHeight;
        
        legalContentBounds = {
          x: drawX,
          y: Math.max(useSafeArea ? (verticalPadding + paddingPx) : effectiveVerticalPadding, legalTop),
          width: maxLegalWidth,
          height: legalHeight
        };
        
        legalTextBounds = {
          x: drawX,
          y: legalContentBounds.y,
          width: maxLegalWidth,
          height: legalHeight
        };
        
        legalBounds = { ...legalContentBounds };
      }
    }
    
    // Если есть KV справа (для широких и ультра-широких форматов), ограничиваем ширину legal
    if (kvPlannedMeta && (isHorizontalLayout || isUltraWide) && !isSuperWide) {
      // KV находится справа, legal должен быть слева и не заходить на KV
      // Учитываем место для age справа от legal
      const kvLeft = kvPlannedMeta.kvX;
      const gap = Math.max(paddingPx * 0.5, effectiveWidth * 0.01);
      const maxLegalWidthWithKV = Math.max(0, kvLeft - drawX - gap - ageWidth);
      // Не допускаем нулевую ширину — иначе legal не рисуется на широком превью
      const minLegalWidth = 50;
      maxLegalWidth = Math.min(maxLegalWidth, Math.max(minLegalWidth, maxLegalWidthWithKV));
      
      // Пересчитываем legalLines с учетом ограниченной ширины
      const legalText = applyTextTransform(state.legal, state.legalTransform);
      legalLines = wrapText(ctx, legalText, maxLegalWidth, legalSize, legalWeight, state.legalLineHeight);
      
      // Обновляем legalBounds с правильной шириной
      const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
      const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
      const legalTop = commonBaselineY - legalHeight;
      
      legalContentBounds = {
        x: drawX,
        y: Math.max(useSafeArea ? (verticalPadding + paddingPx) : effectiveVerticalPadding, legalTop),
        width: maxLegalWidth,
        height: legalHeight
      };
      
      legalTextBounds = {
        x: drawX,
        y: legalContentBounds.y,
        width: maxLegalWidth,
        height: legalHeight
      };
      
      legalBounds = { ...legalContentBounds };
      
        // Пересчитываем ageBoundsRect для широких форматов после обновления legalBounds
        if (shouldShowAge && ageTextWidth > 0) {
        const ageBaseline = commonBaselineY;
        const ageY = ageBaseline - ageSizePx;
        
        // Вычисляем реальную ширину legal текста (самую широкую строку)
        let actualLegalWidth = 0;
        if (legalLines.length > 0) {
          const legalWeight = getFontWeight(state.legalWeight);
          ctx.font = getFontString(legalWeight, legalSize, state.legalFontFamily || state.fontFamily);
          legalLines.forEach(line => {
            let lineWidth;
            if (state.legalLetterSpacing) {
              // Вычисляем межбуквенное расстояние в пикселях на основе процента от размера шрифта
              const letterSpacingPx = (state.legalLetterSpacing / 100) * legalSize;
              const characters = Array.from(line);
              const widths = characters.map((char) => measureLineWidth(ctx, char));
              lineWidth = widths.reduce((acc, width) => acc + width, 0) + letterSpacingPx * (characters.length - 1);
            } else {
              lineWidth = measureLineWidth(ctx, line);
            }
            if (lineWidth > actualLegalWidth) {
              actualLegalWidth = lineWidth;
            }
          });
        }
        
        // Age справа от legal с учетом gap
        // Для охранных областей используем правильные координаты
        const ageMinX = useSafeArea ? (horizontalPadding + paddingPx) : effectivePaddingPx;
        const ageMaxX = useSafeArea 
          ? (horizontalPadding + effectiveWidth - paddingPx - ageTextWidth) 
          : (effectiveWidth - effectivePaddingPx - ageTextWidth);
        const legalRight = legalTextBounds ? (legalTextBounds.x + actualLegalWidth) : ageMinX;
        const currentAgeGapPx = ageGapPx;
        let ageX = legalRight + currentAgeGapPx;
        
        // Проверяем, что age не заходит на KV и не выходит за границы охранной области
        const kvLeft = kvPlannedMeta.kvX;
        const gap = Math.max(paddingPx * 0.5, effectiveWidth * 0.01);
        const maxAgeX = Math.max(0, kvLeft - gap - ageTextWidth);
        const finalMaxAgeX = Math.min(maxAgeX, ageMaxX);
        
        if (ageX + ageTextWidth > kvLeft - gap || ageX + ageTextWidth > ageMaxX) {
          ageX = Math.max(legalRight + currentAgeGapPx, finalMaxAgeX);
        }
        
        // Убеждаемся, что age не выходит за границы охранной области
        ageX = Math.max(ageMinX, ageX);
        
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
    // Ограничиваем clipping границами canvas
    const clippedX = Math.max(0, Math.min(drawX, width));
    const clippedWidth = Math.max(1, Math.min(maxLegalWidth, width - clippedX));
    ctx.save();
    ctx.beginPath();
    ctx.rect(clippedX, 0, clippedWidth, height);
    ctx.clip();
    
    legalLines.forEach((line, index) => {
      const lineY = firstLineBaselineY + index * legalSize * state.legalLineHeight;
      // Проверяем, что строка видна (хотя бы частично)
      if (lineY < -legalSize || lineY > height + legalSize) {
        return; // Пропускаем строки, которые полностью вне видимой области
      }
      if (state.legalLetterSpacing) {
        // Вычисляем межбуквенное расстояние в пикселях на основе процента от размера шрифта
        const letterSpacingPx = (state.legalLetterSpacing / 100) * legalSize;
        // Измеряем реальную ширину строки с letter spacing
        const characters = Array.from(line);
        const widths = characters.map((char) => measureLineWidth(ctx, char));
        const totalWidth = widths.reduce((acc, width) => acc + width, 0) + letterSpacingPx * (characters.length - 1);
        
        // Если текст выходит за границы, обрезаем его
        if (totalWidth > maxLegalWidth) {
          let truncatedLine = '';
          let truncatedWidth = 0;
          for (let i = 0; i < characters.length; i++) {
            const char = characters[i];
            const charWidth = widths[i];
            const spacing = i > 0 ? letterSpacingPx : 0;
            if (truncatedWidth + charWidth + spacing <= maxLegalWidth) {
              truncatedLine += char;
              truncatedWidth += charWidth + spacing;
            } else {
              break;
            }
          }
          if (truncatedLine.length < line.length) {
            truncatedLine += '...';
          }
          drawTextWithSpacing(ctx, truncatedLine, drawX, lineY, state.legalLetterSpacing, legalSize, 'left');
        } else {
          drawTextWithSpacing(ctx, line, drawX, lineY, state.legalLetterSpacing, legalSize, 'left');
        }
      } else {
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
      }
    });
    
    ctx.restore();
  }

  if (shouldShowAge && ageBoundsRect) {
    // Проверяем и корректируем границы age перед отрисовкой
    const ageRight = ageBoundsRect.x + ageBoundsRect.width;
    const ageBottom = ageBoundsRect.y + ageBoundsRect.height;
    const originalAgeCoords = { x: ageBoundsRect.x, y: ageBoundsRect.y, width: ageBoundsRect.width, height: ageBoundsRect.height };
    let ageWasAdjusted = false;
    
    if (ageBoundsRect.x < 0 || ageBoundsRect.y < 0 || ageRight > width || ageBottom > height) {
      // Корректируем координаты, чтобы age был в пределах canvas
      ageBoundsRect.x = Math.max(0, Math.min(ageBoundsRect.x, width - ageBoundsRect.width));
      ageBoundsRect.y = Math.max(0, Math.min(ageBoundsRect.y, height - ageBoundsRect.height));
      ageWasAdjusted = true;
    }
    
    const ageWeight = getFontWeight(state.ageWeight || state.legalWeight);
    ctx.font = getFontString(ageWeight, ageSizePx, state.ageFontFamily || state.fontFamily);
    // 18+ использует цвет заголовка с прозрачностью 80%
    const { r, g, b } = hexToRgb(state.titleColor);
    const opacity = 0.8; // Всегда 80% для 18+
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Draw age at the same baseline as legal's last line
    // Используем правильный commonBaselineY (уже вычислен выше)
    // Ограничиваем commonBaselineY границами canvas
    const clampedBaselineY = Math.max(ageSizePx, Math.min(commonBaselineY, height));
    ctx.fillText(state.age, ageBoundsRect.x, clampedBaselineY);
  }

  let kvRenderMeta = null;
  // Скругление визуала отключено: превью и экспорт всегда без радиуса.
  const kvRadiusPercent = 0;
  if (kvPlannedMeta) {
    // Для не-wide форматов держим KV выше legal.
    // Для wide форматов не сдвигаем KV по vertical-конфликтам с legal:
    // иначе KV может "схлопываться" или выдавливаться за пределы.
    const shouldAdjustKVAgainstLegal = !(isWideLayout || isRsyaMode);
    if (shouldAdjustKVAgainstLegal && (legalTextBounds || legalContentBounds || ageBoundsRect)) {
      const kvBottom = kvPlannedMeta.kvY + kvPlannedMeta.kvH;
      const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
      const legalTop = legalTextBounds ? legalTextBounds.y : (legalContentBounds ? legalContentBounds.y : maxY);
      const ageTop = ageBoundsRect ? ageBoundsRect.y : maxY;
      const minLegalTop = Math.min(legalTop, ageTop);
      // Для узких и широких форматов убираем отступ между KV и legal
      // Для охранных областей используем effectiveWidth и effectiveHeight
      const isVertical = effectiveHeight >= effectiveWidth * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD;
      const isSquare = effectiveHeight < effectiveWidth * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD && 
                       effectiveWidth < effectiveHeight * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD;
      const safeGap = (isVertical || isSquare || isUltraWide || isSuperWide) 
        ? 0 
        : Math.max(paddingPx * 0.5, legalSize * 0.5);
      
      // Всегда проверяем и корректируем позицию KV, чтобы он был выше legal
      const maxAllowedBottom = minLegalTop - safeGap;
      
      // Если KV находится слишком низко (пересекается или слишком близко к legal), перемещаем его выше
      if (kvBottom > maxAllowedBottom) {
        const minKVY = useSafeArea ? (verticalPadding + paddingPx) : paddingPx;
        if (maxAllowedBottom >= kvPlannedMeta.kvY + kvPlannedMeta.kvH * 0.5) {
          // Move KV up if there's enough space
          kvPlannedMeta.kvY = Math.max(minKVY, maxAllowedBottom - kvPlannedMeta.kvH);
        } else {
          // Reduce KV size to fit if moving up is not enough
          const availableHeight = Math.max(0, maxAllowedBottom - minKVY - safeGap);
          if (availableHeight > 10) {
            const availableWidthForKV = Math.max(0, effectiveWidth - paddingPx * 2);
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
            // kvPlannedMeta.kvX уже содержит правильное значение с учетом смещения (если применено)
            // Пересчитываем позицию относительно текущего kvPlannedMeta.kvX, сохраняя смещение
            const kvPosition = state.kvPosition || 'center';
            // Определяем базовую позицию (без смещения) из текущего kvPlannedMeta.kvX
            const currentBaseX = useSafeArea ? (kvPlannedMeta.kvX - horizontalPadding) : kvPlannedMeta.kvX;
            let newBaseX;
            if (kvPosition === 'left') {
              newBaseX = paddingPx;
            } else if (kvPosition === 'right') {
              newBaseX = availableWidthForKV - paddingPx - kvPlannedMeta.kvW;
            } else {
              // center (по умолчанию) - центрируем по доступной ширине
              newBaseX = paddingPx + Math.max(0, (availableWidthForKV - kvPlannedMeta.kvW) / 2);
            }
            // Применяем смещение обратно
            kvPlannedMeta.kvX = (useSafeArea ? horizontalPadding : 0) + newBaseX;
            kvPlannedMeta.kvY = Math.max(minKVY, maxAllowedBottom - kvPlannedMeta.kvH);
          }
        }
      }
    }
    
    // Проверяем, что изображение загружено и валидно
    // Проверяем, что изображение загружено и валидно (учитываем width/height для SVG)
    if (!state.kv.complete || (state.kv.naturalWidth || state.kv.width) <= 0 || (state.kv.naturalHeight || state.kv.height) <= 0) {
      kvRenderMeta = null;
    } else {
      // Проверяем и корректируем границы canvas ПЕРЕД отрисовкой
      const kvRight = kvPlannedMeta.kvX + kvPlannedMeta.kvW;
      const kvBottom = kvPlannedMeta.kvY + kvPlannedMeta.kvH;
      const originalCoords = { kvX: kvPlannedMeta.kvX, kvY: kvPlannedMeta.kvY, kvW: kvPlannedMeta.kvW, kvH: kvPlannedMeta.kvH };
      let wasAdjusted = false;
      
      if (!isRsyaMode && (kvPlannedMeta.kvX < 0 || kvPlannedMeta.kvY < 0 || kvRight > width || kvBottom > height)) {
        // Корректируем координаты, чтобы KV был в пределах canvas
        kvPlannedMeta.kvX = Math.max(0, Math.min(kvPlannedMeta.kvX, width - kvPlannedMeta.kvW));
        kvPlannedMeta.kvY = Math.max(0, Math.min(kvPlannedMeta.kvY, height - kvPlannedMeta.kvH));
        wasAdjusted = true;
      }
      
      if (kvRadiusPercent > 0) {
        ctx.save();
        const borderRadius = Math.min(kvRadiusPercent / 100 * Math.min(kvPlannedMeta.kvW, kvPlannedMeta.kvH), 
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
      
      try {
        const visuals = [state.kv, state.rsyaKV2, state.rsyaKV3].filter(Boolean);
        const visualCount = Math.max(1, Math.min(3, visuals.length || 1));
        const useMultiKV = isRsyaMode || visualCount > 1;

        if (useMultiKV) {
          const scalePercent = Math.max(40, Math.min(300, Number(state.rsyaKVScale) || 200));
          const gapRaw = Number.isFinite(Number(state.rsyaKVGap)) ? Number(state.rsyaKVGap) : 8;
          const offsetX = Number(state.rsyaKVOffsetX) || 0;
          const offsetY = Number(state.rsyaKVOffsetY) || 0;
          const baseSlotSize = Math.max(24, Math.min(kvPlannedMeta.kvW, kvPlannedMeta.kvH) * (scalePercent / 100));
          const visibleSlotsSource = visuals.slice(0, visualCount);
          const visibleSlots = (visibleSlotsSource.length ? visibleSlotsSource : [state.kv]).map((img, index) => {
            const slotScaleKey = `rsyaKVScale${index + 1}`;
            const slotScalePercent = Math.max(40, Math.min(300, Number(state[slotScaleKey]) || 100));
            return {
              img,
              index,
              slotScalePercent,
              slotSize: Math.max(24, baseSlotSize * (slotScalePercent / 100))
            };
          });
          const maxSlotSize = Math.max(...visibleSlots.map((slot) => slot.slotSize));
          const minGap = -maxSlotSize + 4;
          const gap = Math.max(minGap, Math.min(300, gapRaw));
          const rsyaTextBottom = Math.max(
            titleBounds ? (titleBounds.y + titleBounds.height) : 0,
            subtitleBounds ? (subtitleBounds.y + subtitleBounds.height) : 0
          );
          const rsyaSafeGap = Math.max(24, paddingPx * 0.8);
          const rsyaSafeTop = rsyaTextBottom + rsyaSafeGap;
          const rsyaSafeBottom = (useSafeArea ? (verticalPadding + effectiveHeight) : height) - paddingPx;

          const totalW = visibleSlots.reduce((sum, slot) => sum + slot.slotSize, 0) + (visualCount - 1) * gap;
          const startX = isRsyaLeftLayout
            ? (kvPlannedMeta.kvX + offsetX)
            : (kvPlannedMeta.kvX + (kvPlannedMeta.kvW - totalW) / 2 + offsetX);
          let startY = kvPlannedMeta.kvY + (kvPlannedMeta.kvH - maxSlotSize) / 2 + offsetY;

          if (isRsyaMode && !isRsyaLeftLayout) {
            startY = Math.max(startY, rsyaSafeTop + offsetY);
            const maxStartY = rsyaSafeBottom - maxSlotSize;
            if (Number.isFinite(maxStartY) && maxStartY >= rsyaSafeTop) {
              startY = Math.min(startY, maxStartY);
            }
          }

          const slotMetas = [];
          let cursorX = startX;
          visibleSlots.forEach((slot) => {
            const img = slot.img || state.kv;
            if (!img) return;
            const x = cursorX;
            const y = startY + (maxSlotSize - slot.slotSize) / 2;
            drawImageCover(ctx, img, x, y, slot.slotSize, slot.slotSize);
            slotMetas.push({
              slotIndex: slot.index,
              kvX: x,
              kvY: y,
              kvW: slot.slotSize,
              kvH: slot.slotSize,
              kvScale: slot.slotScalePercent / 100
            });
            cursorX += slot.slotSize + gap;
          });

          kvRenderMeta = {
            ...kvPlannedMeta,
            kvX: startX,
            kvY: startY,
            kvW: totalW,
            kvH: maxSlotSize,
            slotMetas
          };
        } else {
          ctx.drawImage(state.kv, kvPlannedMeta.kvX, kvPlannedMeta.kvY, kvPlannedMeta.kvW, kvPlannedMeta.kvH);
        }
      } catch (error) {
        console.error('Ошибка отрисовки KV:', error);
      }
      
      if (kvRadiusPercent > 0) {
        ctx.restore();
      }
      
      if (!kvRenderMeta) {
        kvRenderMeta = kvPlannedMeta;
      }
    }
  }

  // Аварийный fallback: на широких форматах KV не должен "пропадать" полностью.
  // Если основной расчет не дал валидный блок, рисуем компактный KV справа.
  if (!kvRenderMeta && hasRenderableKV && isWideLayout) {
    const srcW = state.kv.naturalWidth || state.kv.width;
    const srcH = state.kv.naturalHeight || state.kv.height;
    if (srcW > 0 && srcH > 0) {
      const basePad = useSafeArea ? paddingPx : effectiveHorizontalPadding;
      const containerW = useSafeArea ? effectiveWidth : width;
      const containerH = useSafeArea ? effectiveHeight : height;
      const offsetX = useSafeArea ? horizontalPadding : 0;
      const offsetY = useSafeArea ? verticalPadding : 0;
      // На wide форматах KV приоритетен: не резервируем высоту под legal в аварийном режиме.
      const legalReserve = 0;
      const maxW = Math.max(24, containerW * 0.18);
      const maxH = Math.max(32, containerH - basePad * 2);
      const emergencyScale = Math.min(maxW / srcW, maxH / srcH);

      if (Number.isFinite(emergencyScale) && emergencyScale > 0) {
        const drawW = Math.max(32, srcW * emergencyScale);
        const drawH = Math.max(32, srcH * emergencyScale);
        const drawX = offsetX + Math.max(basePad, containerW - basePad - drawW);
        const drawY = offsetY + Math.max(basePad, containerH - basePad - legalReserve - drawH);

        try {
          if (kvRadiusPercent > 0) {
            ctx.save();
            const borderRadius = Math.min(
              (kvRadiusPercent / 100) * Math.min(drawW, drawH),
              Math.min(drawW, drawH) / 2
            );
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(drawX, drawY, drawW, drawH, borderRadius);
            } else {
              const x = drawX;
              const y = drawY;
              const w = drawW;
              const h = drawH;
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
            ctx.drawImage(state.kv, drawX, drawY, drawW, drawH);
            ctx.restore();
          } else {
            ctx.drawImage(state.kv, drawX, drawY, drawW, drawH);
          }
          kvRenderMeta = {
            kvX: drawX,
            kvY: drawY,
            kvW: drawW,
            kvH: drawH,
            kvScale: emergencyScale,
            paddingPx: basePad,
            emergency: true
          };
          kvPlanningBranch = `${kvPlanningBranch || 'wide'}-emergency-render`;
          kvPlanningReason = '';
        } catch (error) {
          console.error('Ошибка аварийной отрисовки KV на wide:', error);
          kvPlanningReason = kvPlanningReason || 'wide-emergency-render-error';
        }
      } else {
        kvPlanningReason = kvPlanningReason || 'wide-emergency-scale-invalid';
      }
    } else {
      kvPlanningReason = kvPlanningReason || 'wide-emergency-source-size-invalid';
    }
  }

  // Точечный debug для проблемного wide-формата.
  if (width === 2832 && height === 600 && hasRenderableKV) {
    console.log('[KV DEBUG][2832x600]', {
      platform,
      useSafeArea,
      safeArea: useSafeArea ? { width: safeAreaWidth, height: safeAreaHeight, horizontalPadding, verticalPadding } : null,
      layout: { isHorizontalLayout, isUltraWide, isSuperWide, branch: kvPlanningBranch },
      kvValid: isKVValid,
      kvPlanningReason,
      kvPlannedMeta,
      kvRenderMeta,
      legalBlockHeight,
      textArea
    });
  }
  if (isWideLayout && hasRenderableKV && !kvRenderMeta) {
    console.warn('[KV DEBUG][WIDE NO RENDER]', {
      size: `${width}x${height}`,
      platform,
      branch: kvPlanningBranch,
      reason: kvPlanningReason,
      kvValid: isKVValid,
      useSafeArea,
      safeArea: useSafeArea ? { width: safeAreaWidth, height: safeAreaHeight, horizontalPadding, verticalPadding } : null
    });
  }

  // Смещаем logoBounds на отступы охранной области перед отрисовкой
  // Важно: используем logoBoundsForCalculations, чтобы не потерять оригинальные координаты
  // Для РСЯ 1600x1200: логотип центрируется относительно полного canvas, но должен быть внутри охранного поля
  // Поэтому применяем смещение, чтобы логотип был внутри охранного поля
  if (useSafeArea && logoBoundsForCalculations) {
    if (isRSYA1600x1200ForLogo && logoPosForSize === 'center') {
      // Для РСЯ 1600x1200 с центрированием: логотип центрирован относительно полного canvas,
      // но нужно убедиться, что он находится внутри охранного поля
      // Вычисляем центрированную позицию относительно полного canvas
      const centeredX = logoBoundsForCalculations.x;
      const centeredY = logoBoundsForCalculations.y;
      
      // Проверяем, что логотип находится внутри охранного поля с отступом paddingPx по всему периметру
      // Для РСЯ 1600x1200 (и всех макетов с охранными полями) добавляем отступ внутри охранного поля
      const minX = horizontalPadding + paddingPx;
      const minY = verticalPadding + paddingPx;
      const maxX = horizontalPadding + safeAreaWidth - logoBoundsForCalculations.totalWidth - paddingPx;
      const maxY = verticalPadding + safeAreaHeight - logoBoundsForCalculations.height - paddingPx;
      
      // Ограничиваем позицию границами охранного поля с отступом, сохраняя центрирование где возможно
      const constrainedX = Math.max(minX, Math.min(centeredX, maxX));
      const constrainedY = Math.max(minY, Math.min(centeredY, maxY));
      
      logoBounds = {
        ...logoBoundsForCalculations,
        x: constrainedX,
        y: constrainedY
      };
      
    } else {
      // Для остальных случаев применяем смещение
      logoBounds = {
        ...logoBoundsForCalculations,
        x: logoBoundsForCalculations.x + horizontalPadding,
        y: logoBoundsForCalculations.y + verticalPadding
      };
    }
  } else if (logoBoundsForCalculations) {
    // Если нет охранной области, просто используем оригинальные координаты
    logoBounds = logoBoundsForCalculations;
  }
  
  if (state.showLogo && state.logo && logoBounds) {
    // Рисуем, если есть хоть какие-то размеры (naturalWidth/Height у SVG или вне DOM могут быть 0)
    const logoImgW = state.logo.naturalWidth || state.logo.width || 0;
    const logoImgH = state.logo.naturalHeight || state.logo.height || 0;
    if (state.logo.complete && logoImgW > 0 && logoImgH > 0) {
      // Проверяем и корректируем границы canvas ПЕРЕД отрисовкой
      const logoRight = logoBounds.x + logoBounds.width;
      const logoBottom = logoBounds.y + logoBounds.height;
      const originalCoords = { x: logoBounds.x, y: logoBounds.y, width: logoBounds.width, height: logoBounds.height };
      let wasAdjusted = false;
      
      if (logoBounds.x < 0 || logoBounds.y < 0 || logoRight > width || logoBottom > height) {
        // Корректируем координаты, чтобы логотип был в пределах canvas
        logoBounds.x = Math.max(0, Math.min(logoBounds.x, width - logoBounds.width));
        logoBounds.y = Math.max(0, Math.min(logoBounds.y, height - logoBounds.height));
        wasAdjusted = true;
      }
      
      try {
        ctx.drawImage(state.logo, logoBounds.x, logoBounds.y, logoBounds.width, logoBounds.height);
        
        // Рисуем партнерский логотип, если есть
        if (logoBounds.hasPartnerLogo && state.partnerLogo && state.partnerLogo.complete) {
          const separatorX = logoBounds.x + logoBounds.width;
          const separatorY = logoBounds.y;
          const separatorHeight = logoBounds.height;
          const pW = state.partnerLogo.naturalWidth || state.partnerLogo.width || 0;
          const pH = state.partnerLogo.naturalHeight || state.partnerLogo.height || 0;
          if (pH > 0) {
            const gapBeforeSeparator = 24;
            const gapAfterSeparator = 24;
            const partnerLogoScale = logoBounds.height / pH;
            const partnerLogoWidth = pW * partnerLogoScale;
            const partnerLogoX = separatorX + gapBeforeSeparator + gapAfterSeparator;
            const partnerLogoRight = partnerLogoX + partnerLogoWidth;
          
          // Проверяем, что партнерский логотип не выходит за границы canvas
          if (partnerLogoRight <= width && partnerLogoX >= 0) {
            // Рисуем разделитель "|" с увеличенными отступами
            // Используем цвет текста для разделителя
            ctx.strokeStyle = state.titleColor || '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const separatorLineX = Math.max(0, Math.min(separatorX + gapBeforeSeparator, width));
            ctx.moveTo(separatorLineX, separatorY + separatorHeight * 0.15);
            ctx.lineTo(separatorLineX, separatorY + separatorHeight * 0.85);
            ctx.stroke();
            
            // Ограничиваем координаты партнерского логотипа границами canvas
            const clampedPartnerLogoX = Math.max(0, Math.min(partnerLogoX, width - partnerLogoWidth));
            const clampedPartnerLogoWidth = Math.min(partnerLogoWidth, width - clampedPartnerLogoX);
            
            // Рисуем партнерский логотип
            if (clampedPartnerLogoWidth > 0) {
              ctx.drawImage(
                state.partnerLogo,
                clampedPartnerLogoX,
                logoBounds.y,
                clampedPartnerLogoWidth,
                logoBounds.height
              );
            }
            }
          }
        }
      } catch (error) {
        console.error('Ошибка отрисовки логотипа:', error);
        if (useSafeArea && safeArea) {
          console.error('Safe area context:', {
            logoBounds,
            horizontalPadding,
            verticalPadding,
            canvasWidth: width,
            canvasHeight: height
          });
        }
      }
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

  // Важно: рендер не должен менять showKV в state.
  // Авто-выключение KV из рендера приводило к "залипанию" отсутствия KV на других форматах.

  // Рисуем рамку для Хабра, если включена настройка и фон светлый
  if (state.habrBorderEnabled) {
    // Проверяем, является ли это размером Хабра (можно проверить по размерам или по платформе из state)
    const habrSizes = [
      { width: 300, height: 600 },
      { width: 300, height: 250 },
      { width: 520, height: 800 },
      { width: 960, height: 450 },
      { width: 1560, height: 320 }
    ];
    const isHabrSize = habrSizes.some(s => s.width === width && s.height === height) || 
                       (state.platform && state.platform.toLowerCase().includes('habr'));
    
    if (isHabrSize) {
      // Проверяем, является ли фон светлым
      const bgColor = state.bgColor || '#1e1e1e';
      const { r, g, b } = hexToRgb(bgColor);
      // Вычисляем яркость по формуле: 0.299*R + 0.587*G + 0.114*B
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // Если яркость больше 0.5, считаем фон светлым
      if (brightness > 0.5) {
        const borderColor = state.habrBorderColor || '#D5DDDF';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
      }
    }
  }

  // Визуализация охранных полей (рисуем в самом конце, поверх всего, только для превью)
  // Показываем охранные поля на превью (canvas с id), но не в экспорте (canvas без id или временный)
  const isPreview = canvas && canvas.id && canvas.id.length > 0;
  if (useSafeArea && safeArea && isPreview && !isRsyaMode) {
    ctx.save();
    // Рисуем охранную область пунктирной линией
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.9)'; // Зеленый цвет для охранной области
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Пунктирная линия
    ctx.strokeRect(horizontalPadding, verticalPadding, safeArea.width, safeArea.height);
    
    // Добавляем подпись "Safe Area" в углу
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.setLineDash([]); // Сбрасываем пунктир для текста
    const labelText = 'Safe Area';
    const labelPadding = 4;
    const labelX = horizontalPadding + labelPadding;
    const labelY = verticalPadding + labelPadding;
    const labelMetrics = ctx.measureText(labelText);
    const labelWidth = labelMetrics.width + labelPadding * 2;
    const labelHeight = 16;
    
    // Фон для подписи
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    
    // Текст подписи
    ctx.fillStyle = 'rgba(76, 175, 80, 1)';
    ctx.fillText(labelText, labelX + labelPadding, labelY + 2);
    
    ctx.restore();
  }

  const toRect = (value, useTotalWidth = false) => {
    if (!value || typeof value !== 'object') return null;
    const x = Number(value.x);
    const y = Number(value.y);
    const w = Number(useTotalWidth ? (value.totalWidth || value.width) : value.width);
    const h = Number(value.height);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
    return { x, y, width: w, height: h };
  };

  const mergeRects = (rects) => {
    const filtered = rects.filter(Boolean);
    if (!filtered.length) return null;
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    filtered.forEach((rect) => {
      left = Math.min(left, rect.x);
      top = Math.min(top, rect.y);
      right = Math.max(right, rect.x + rect.width);
      bottom = Math.max(bottom, rect.y + rect.height);
    });
    if (!Number.isFinite(left) || !Number.isFinite(top) || right <= left || bottom <= top) {
      return null;
    }
    return { x: left, y: top, width: right - left, height: bottom - top };
  };

  const logoRect = state.showLogo ? toRect(logoBounds, true) : null;
  const titleRect = toRect(titleBounds);
  const subtitleRect = state.showSubtitle ? toRect(subtitleBounds) : null;
  const kvRect = (state.showKV && kvRenderMeta)
    ? toRect({ x: kvRenderMeta.kvX, y: kvRenderMeta.kvY, width: kvRenderMeta.kvW, height: kvRenderMeta.kvH })
    : null;
  const legalRect = state.showLegal ? toRect(legalTextBounds || legalContentBounds) : null;
  const ageRect = state.showAge ? toRect(ageBoundsRect) : null;
  const keyElementsBounds = mergeRects([logoRect, titleRect, subtitleRect, kvRect]);

  return {
    kvRenderMeta,
    keyElementsBounds,
    elementsBounds: {
      logo: logoRect,
      title: titleRect,
      subtitle: subtitleRect,
      kv: kvRect,
      legal: legalRect,
      age: ageRect
    },
    canvasWidth: width,
    canvasHeight: height
  };
};
