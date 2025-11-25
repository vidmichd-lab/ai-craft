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
  
  // В режиме Figma используем конструктор со слоями из Figma (не показываем просто изображение)
  // Режим constructor - обычный конструктор без данных из Figma
  // Режим figma - конструктор с данными из Figma (элементы уже применены к state)
  
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
  
  // Вычисляем отступы для охранной области (если она есть)
  let horizontalPadding = 0;
  let verticalPadding = 0;
  let useSafeArea = false;
  let safeAreaWidth = width;
  let safeAreaHeight = height;
  
  if (safeArea) {
    // Вычисляем отступы для центрирования охранной области
    horizontalPadding = (width - safeArea.width) / 2;
    verticalPadding = (height - safeArea.height) / 2;
    safeAreaWidth = safeArea.width;
    safeAreaHeight = safeArea.height;
    useSafeArea = true;
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
  
  // Увеличиваем отступы для супер широких форматов
  // Для охранных областей используем paddingPx (относительно охранной области)
  const effectivePaddingPx = isSuperWide ? paddingPx * LAYOUT_CONSTANTS.PADDING_MULTIPLIER_SUPER_WIDE : paddingPx;

  // Вычисляем множители размеров - используем размеры охранной области
  let logoSizePercent = state.logoSize;
  const multipliers = calculateSizeMultipliers(effectiveWidth, effectiveHeight, layoutType);
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
  
  // Отладка для охранных областей
  if (useSafeArea && safeArea) {
    console.log('Safe Area Debug:', {
      platform,
      sizeKey,
      safeArea,
      horizontalPadding,
      verticalPadding,
      logoWidth,
      logoHeight,
      logoBounds: logoBounds ? { x: logoBounds.x, y: logoBounds.y, width: logoBounds.width, height: logoBounds.height } : null,
      showLogo: state.showLogo,
      hasLogo: !!state.logo
    });
  }
  
  // Сохраняем logoBounds без смещения для расчетов, сместим позже перед отрисовкой
  const logoBoundsForCalculations = logoBounds;
  const logoHeightValue = logoBounds ? logoBounds.height : 0;

  // Вычисляем позицию KV и область для текста - используем модули
  let kvPlannedMeta = null;
  let textArea;
  let maxTextWidth;
  
  // Проверяем, что KV загружен и валиден перед использованием
  const isKVValid = state.kv && state.kv.complete && state.kv.naturalWidth > 0 && state.kv.naturalHeight > 0;
  
  // Сначала вычисляем KV для разных типов макетов
  // Для охранных областей используем размеры охранной области
  const kvWidth = useSafeArea ? safeAreaWidth : width;
  const kvHeight = useSafeArea ? safeAreaHeight : height;
  const kvPadding = useSafeArea ? paddingPx : effectivePaddingPx;
  const kvHorizontalPadding = useSafeArea ? paddingPx : effectiveHorizontalPadding;
  
  // Используем logoBounds без смещения для расчетов
  if (isSuperWide && state.showKV && isKVValid) {
    kvPlannedMeta = calculateSuperWideKV(state, kvWidth, kvHeight, kvPadding, logoBoundsForCalculations, legalBlockHeight);
  } else if (isUltraWide && state.showKV && isKVValid) {
    kvPlannedMeta = calculateUltraWideKV(state, kvWidth, kvHeight, kvHorizontalPadding, legalBlockHeight);
  } else if (layoutType.isHorizontalLayout && state.showKV && isKVValid) {
    const result = calculateHorizontalKV(state, kvWidth, kvHeight, kvHorizontalPadding, legalBlockHeight);
    kvPlannedMeta = result.kvMeta;
    maxTextWidth = result.textWidth;
  }
  
  // Смещаем KV на отступы охранной области (если используется)
  if (useSafeArea && kvPlannedMeta) {
    const originalKV = { kvX: kvPlannedMeta.kvX, kvY: kvPlannedMeta.kvY };
    kvPlannedMeta = {
      ...kvPlannedMeta,
      kvX: kvPlannedMeta.kvX + horizontalPadding,
      kvY: kvPlannedMeta.kvY + verticalPadding
    };
    
    // Отладка смещения KV
    console.log('KV bounds shifted:', {
      original: originalKV,
      shifted: { kvX: kvPlannedMeta.kvX, kvY: kvPlannedMeta.kvY },
      horizontalPadding,
      verticalPadding,
      showKV: state.showKV,
      isKVValid
    });
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
    textArea.top += verticalPadding;
    textArea.bottom += verticalPadding;
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
  if (isHorizontalLayout && state.showKV && state.kv && !kvPlannedMeta) {
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
      const legalY = useSafeArea ? Math.max(verticalPadding + paddingPx, legalTop) : Math.max(effectiveVerticalPadding, legalTop);
      
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
          x: effectiveHorizontalPadding,
          y: Math.max(effectiveVerticalPadding, legalTop),
          width: legalMaxWidthForFlex,
          height: legalHeight
        };
        
        legalTextBounds = {
          x: effectiveHorizontalPadding,
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
  const shouldShowSubtitle = state.showSubtitle && state.subtitle && !(state.hideSubtitleOnWide && effectiveHeight < 150);
  
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
      // Вычисляем межбуквенное расстояние в пикселях на основе процента от размера шрифта
      const letterSpacingPx = (state.subtitleLetterSpacing / 100) * subtitleSize;
      // Приблизительно вычитаем максимальный letter spacing для длинной строки
      // Это консервативная оценка, чтобы гарантировать, что текст не выйдет за границы
      const estimatedCharsPerLine = Math.floor(maxTextWidth / (subtitleSize * 0.6)); // примерная ширина символа
      const letterSpacingImpact = letterSpacingPx * Math.max(0, estimatedCharsPerLine - 1);
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
  // Для охранных областей используем высоту охранной области
  const effectiveSubtitleGap = isUltraWide ? state.subtitleGap - LAYOUT_CONSTANTS.SUBTITLE_GAP_REDUCTION_ULTRA_WIDE : state.subtitleGap;
  const subtitleGapPx = shouldShowSubtitle && subtitleLines.length > 0 ? (effectiveSubtitleGap / 100) * effectiveHeight : 0;
  const totalTextHeight = titleBlockHeight + subtitleGapPx + subtitleBlockHeight;

  let startY;

  if (isSuperWide || isUltraWide || isHorizontalLayout) {
    // Для широких форматов учитываем titleVPos
    const currentPadding = isSuperWide ? effectivePaddingPx : effectiveVerticalPadding;
    
    if (state.titleVPos === 'top') {
      startY = currentPadding + titleSize;
      if (state.showLogo && state.logo && logoBoundsForCalculations) {
        // Используем logoBounds без смещения для расчетов
        // Для РСЯ 1600x1200 добавляем дополнительный отступ между логотипом и заголовком
        const isRSYA1600x1200ForGap = platform === 'РСЯ' && sizeKey === '1600x1200';
        const additionalGap = isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0);
        const logoTitleGap = currentPadding + additionalGap;
        const logoBottom = logoBoundsForCalculations.y + logoBoundsForCalculations.height;
        const logoStart = logoBottom + logoTitleGap + titleSize;
        startY = Math.max(startY, logoStart);
      }
      if (legalBlockHeight > 0) {
        const bottomPadding = currentPadding + legalBlockHeight + currentPadding * 0.5;
        const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
        startY = Math.min(startY, maxY - bottomPadding - totalTextHeight + titleSize);
      }
      startY = Math.max(currentPadding + titleSize, startY);
    } else if (state.titleVPos === 'center') {
      // При центрировании текста логотип остается вверху, центрируем только текст
      // Для РСЯ 1600x1200 добавляем дополнительный отступ между логотипом и заголовком
      const isRSYA1600x1200ForGap = platform === 'РСЯ' && sizeKey === '1600x1200';
      const additionalGap = isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0);
      const logoTitleGap = currentPadding + additionalGap;
      const logoBottom = (state.showLogo && state.logo && logoBoundsForCalculations) 
        ? logoBoundsForCalculations.y + logoBoundsForCalculations.height 
        : currentPadding;
      const topArea = Math.max(currentPadding, logoBottom + logoTitleGap);
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
          const logoTitleGap = effectiveVerticalPadding + additionalGap;
          startY = logoBoundsForCalculations.y + logoBoundsForCalculations.height + logoTitleGap + titleSize;
        } else {
          startY = effectiveVerticalPadding + titleSize;
      }
      // Для РСЯ 1600x1200 добавляем дополнительный отступ
      const minLogoGap = isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0);
      const minStart = (state.showLogo && logoBoundsForCalculations) ? logoBoundsForCalculations.y + logoBoundsForCalculations.height + minLogoGap + titleSize : paddingPx + titleSize;
      startY = Math.max(minStart, startY);
    } else if (state.titleVPos === 'center') {
      // При центрировании текста логотип остается вверху, центрируем только текст
      // Учитываем логотип при вычислении доступной высоты для текста
      // Для РСЯ 1600x1200 добавляем дополнительный отступ между логотипом и заголовком
      const isRSYA1600x1200ForGap = platform === 'РСЯ' && sizeKey === '1600x1200';
      const additionalGap = isRSYA1600x1200ForGap ? paddingPx * 0.5 : (useSafeArea ? paddingPx * 0.4 : 0);
      const logoTitleGap = paddingPx + additionalGap;
      const logoBottom = (state.showLogo && state.logo && logoBoundsForCalculations) 
        ? logoBoundsForCalculations.y + logoBoundsForCalculations.height 
        : paddingPx;
      const topArea = Math.max(paddingPx, logoBottom + logoTitleGap);
      const maxY = useSafeArea ? (verticalPadding + effectiveHeight) : height;
      const bottomArea = maxY - paddingPx - legalBlockHeight;
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
  const isRSYA1600x1200 = platform === 'РСЯ' && sizeKey === '1600x1200';
  let effectiveTitleAlign;
  if (isRSYA1600x1200) {
    // Для РСЯ 1600x1200 всегда центрируем
    effectiveTitleAlign = 'center';
  } else if (isHorizontalLayout || isUltraWide || isSuperWide) {
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
  } else if (isHorizontalLayout || isUltraWide || isSuperWide) {
    titleX = textArea.left; // Используем textArea.left, который уже учитывает safe area и KV
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
      const subtitleGapPx = (effectiveSubtitleGap / 100) * effectiveHeight;
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
  if (titleLines.length === 0) {
    console.warn('Нет строк заголовка для отрисовки');
  }
  
  // Ограничиваем координаты заголовка границами canvas
  const titleMinX = 0;
  const titleMaxX = width;
  const titleMinY = 0;
  const titleMaxY = height;
  
  titleLines.forEach((line, index) => {
    const lineY = startY + index * titleSize * state.titleLineHeight;
    // Проверяем, что строка видна (хотя бы частично)
    if (lineY >= titleMinY - titleSize && lineY <= titleMaxY + titleSize) {
      // Ограничиваем X координату границами canvas
      let clampedTitleX = titleX;
      if (effectiveTitleAlign === 'left') {
        clampedTitleX = Math.max(titleMinX, Math.min(titleX, titleMaxX));
      } else if (effectiveTitleAlign === 'right') {
        const lineWidth = measureLineWidth(ctx, line);
        clampedTitleX = Math.max(titleMinX, Math.min(titleX, titleMaxX - lineWidth));
      } else {
        // center
        const lineWidth = measureLineWidth(ctx, line);
        clampedTitleX = Math.max(titleMinX + lineWidth / 2, Math.min(titleX, titleMaxX - lineWidth / 2));
      }
      
      if (state.titleLetterSpacing) {
        drawTextWithSpacing(ctx, line, clampedTitleX, lineY, state.titleLetterSpacing, titleSize, effectiveTitleAlign);
      } else {
        ctx.fillText(line, clampedTitleX, lineY);
      }
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
      const subtitleGapPx = (effectiveSubtitleGap / 100) * effectiveHeight;
      actualSubtitleY = startY + titleBlockHeight + subtitleGapPx;
    }
    
    // Для широких форматов подзаголовок тоже прибит к левому краю (с учетом safe area и textArea)
    // textArea уже учитывает KV, поэтому используем textArea.left для правильного позиционирования
    // Исключение: для РСЯ 1600x1200 всегда центрируем
    const subtitleX = isRSYA1600x1200
      ? getAlignedXWithinArea('center', textArea)
      : ((isHorizontalLayout || isUltraWide || isSuperWide) 
          ? textArea.left
          : getAlignedXWithinArea(effectiveTitleAlign, textArea));
    const effectiveSubtitleAlign = effectiveTitleAlign;
    // subtitleWeight уже определен выше
    ctx.font = getFontString(subtitleWeight, subtitleSize, state.subtitleFontFamily || state.fontFamily);
    // Подзаголовок использует цвет заголовка с прозрачностью 90%
    const { r, g, b } = hexToRgb(state.titleColor);
    const opacity = 0.9; // Всегда 90% для подзаголовка
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

  const textBlockBottom = Math.max(
    titleBounds ? titleBounds.y + titleBounds.height : startY,
    subtitleBounds ? subtitleBounds.y + subtitleBounds.height : 0
  );

  // Используем проверку валидности KV
  // Для вертикальных форматов (не широких) рассчитываем KV здесь
  if (state.showKV && isKVValid && !kvPlannedMeta) {
    // Отладка для вертикальных форматов
    if (useSafeArea && safeArea) {
      console.log('Calculating KV for vertical format with safe area:', {
        isUltraWide,
        isHorizontalLayout,
        isSuperWide,
        effectiveWidth,
        effectiveHeight,
        showKV: state.showKV,
        isKVValid
      });
    }
    
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

      const legalReserved = (state.showLegal && legalLines.length > 0) || (state.showAge && state.age) ? legalBlockHeight : 0;
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

      // Отладка placement для вертикальных форматов
      if (useSafeArea && safeArea) {
        console.log('KV placement calculation:', {
          topFit: topFit ? { kvX: topFit.kvX, kvY: topFit.kvY, kvW: topFit.kvW, kvH: topFit.kvH } : null,
          bottomFit: bottomFit ? { kvX: bottomFit.kvX, kvY: bottomFit.kvY, kvW: bottomFit.kvW, kvH: bottomFit.kvH } : null,
          placement: placement ? { kvX: placement.kvX, kvY: placement.kvY, kvW: placement.kvW, kvH: placement.kvH } : null,
          topAreaHeight,
          bottomAreaHeight,
          topAreaStart,
          bottomAreaStart
        });
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
          
          // Отладка смещения для вертикальных форматов
          console.log('KV placement shifted for vertical format:', {
            before: beforeShift,
            after: { kvX: kvPlannedMeta.kvX, kvY: kvPlannedMeta.kvY },
            horizontalPadding,
            verticalPadding
          });
        }
      } else if (useSafeArea && safeArea) {
        console.warn('KV placement is null - KV will not be rendered');
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
      maxLegalWidth = Math.min(maxLegalWidth, maxLegalWidthWithKV);
      
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
    const clippedWidth = Math.max(0, Math.min(maxLegalWidth, width - clippedX));
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
      console.warn('Age выходит за границы canvas, корректируем:', {
        before: originalAgeCoords,
        ageRight,
        ageBottom,
        canvasWidth: width,
        canvasHeight: height
      });
      
      // Корректируем координаты, чтобы age был в пределах canvas
      ageBoundsRect.x = Math.max(0, Math.min(ageBoundsRect.x, width - ageBoundsRect.width));
      ageBoundsRect.y = Math.max(0, Math.min(ageBoundsRect.y, height - ageBoundsRect.height));
      ageWasAdjusted = true;
      
      console.log('Age coordinates adjusted:', {
        before: originalAgeCoords,
        after: { x: ageBoundsRect.x, y: ageBoundsRect.y, width: ageBoundsRect.width, height: ageBoundsRect.height }
      });
    }
    
    const ageWeight = getFontWeight(state.ageWeight || state.legalWeight);
    ctx.font = getFontString(ageWeight, ageSizePx, state.ageFontFamily || state.fontFamily);
    // 18+ использует цвет заголовка с прозрачностью 80%
    const { r, g, b } = hexToRgb(state.titleColor);
    const opacity = 0.8; // Всегда 80% для 18+
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = 'left';
    // Draw age at the same baseline as legal's last line
    // Используем правильный commonBaselineY (уже вычислен выше)
    // Ограничиваем commonBaselineY границами canvas
    const clampedBaselineY = Math.max(ageSizePx, Math.min(commonBaselineY, height));
    ctx.fillText(state.age, ageBoundsRect.x, clampedBaselineY);
  }

  let kvRenderMeta = null;
  if (kvPlannedMeta) {
    // Логируем начальные координаты KV
    console.log('KV calculation started:', {
      kvX: kvPlannedMeta.kvX,
      kvY: kvPlannedMeta.kvY,
      kvW: kvPlannedMeta.kvW,
      kvH: kvPlannedMeta.kvH,
      canvasWidth: width,
      canvasHeight: height,
      useSafeArea,
      horizontalPadding: useSafeArea ? horizontalPadding : undefined,
      verticalPadding: useSafeArea ? verticalPadding : undefined
    });
    
    // KV всегда должен быть немного выше legal текста
    if (legalTextBounds || legalContentBounds || ageBoundsRect) {
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
    if (!state.kv.complete || state.kv.naturalWidth <= 0 || state.kv.naturalHeight <= 0) {
      console.warn('KV не загружен или невалиден:', {
        complete: state.kv.complete,
        naturalWidth: state.kv.naturalWidth,
        naturalHeight: state.kv.naturalHeight
      });
      kvRenderMeta = null;
    } else {
      // Проверяем и корректируем границы canvas ПЕРЕД отрисовкой
      const kvRight = kvPlannedMeta.kvX + kvPlannedMeta.kvW;
      const kvBottom = kvPlannedMeta.kvY + kvPlannedMeta.kvH;
      const originalCoords = { kvX: kvPlannedMeta.kvX, kvY: kvPlannedMeta.kvY, kvW: kvPlannedMeta.kvW, kvH: kvPlannedMeta.kvH };
      let wasAdjusted = false;
      
      if (kvPlannedMeta.kvX < 0 || kvPlannedMeta.kvY < 0 || kvRight > width || kvBottom > height) {
        console.warn('KV выходит за границы canvas, корректируем:', {
          before: originalCoords,
          kvRight,
          kvBottom,
          canvasWidth: width,
          canvasHeight: height
        });
        
        // Корректируем координаты, чтобы KV был в пределах canvas
        kvPlannedMeta.kvX = Math.max(0, Math.min(kvPlannedMeta.kvX, width - kvPlannedMeta.kvW));
        kvPlannedMeta.kvY = Math.max(0, Math.min(kvPlannedMeta.kvY, height - kvPlannedMeta.kvH));
        wasAdjusted = true;
        
        console.log('KV coordinates adjusted:', {
          before: originalCoords,
          after: { kvX: kvPlannedMeta.kvX, kvY: kvPlannedMeta.kvY, kvW: kvPlannedMeta.kvW, kvH: kvPlannedMeta.kvH }
        });
      }
      
      // Логируем финальные координаты перед отрисовкой
      console.log('Rendering KV:', {
        kvX: kvPlannedMeta.kvX,
        kvY: kvPlannedMeta.kvY,
        kvW: kvPlannedMeta.kvW,
        kvH: kvPlannedMeta.kvH,
        canvasWidth: width,
        canvasHeight: height,
        useSafeArea,
        horizontalPadding: useSafeArea ? horizontalPadding : undefined,
        verticalPadding: useSafeArea ? verticalPadding : undefined,
        wasAdjusted,
        willFit: kvPlannedMeta.kvX + kvPlannedMeta.kvW <= width && kvPlannedMeta.kvY + kvPlannedMeta.kvH <= height
      });
      
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
      
      try {
        console.log('Drawing KV at:', { x: kvPlannedMeta.kvX, y: kvPlannedMeta.kvY, w: kvPlannedMeta.kvW, h: kvPlannedMeta.kvH });
        ctx.drawImage(state.kv, kvPlannedMeta.kvX, kvPlannedMeta.kvY, kvPlannedMeta.kvW, kvPlannedMeta.kvH);
        console.log('KV drawn successfully');
      } catch (error) {
        console.error('Ошибка отрисовки KV:', error);
      }
      
      if (state.kvBorderRadius > 0) {
        ctx.restore();
      }
      
      kvRenderMeta = kvPlannedMeta;
    }
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
      
      // Отладка для РСЯ 1600x1200
      console.log('РСЯ 1600x1200 Logo positioning:', {
        centered: { x: centeredX, y: centeredY },
        constrained: { x: constrainedX, y: constrainedY },
        safeAreaBounds: { minX, minY, maxX, maxY },
        logoSize: { width: logoBoundsForCalculations.totalWidth, height: logoBoundsForCalculations.height },
        safeAreaSize: { width: safeAreaWidth, height: safeAreaHeight },
        horizontalPadding,
        verticalPadding
      });
    } else {
      // Для остальных случаев применяем смещение
      logoBounds = {
        ...logoBoundsForCalculations,
        x: logoBoundsForCalculations.x + horizontalPadding,
        y: logoBoundsForCalculations.y + verticalPadding
      };
    }
    
    // Отладка смещения логотипа
    console.log('Logo bounds shifted:', {
      original: { x: logoBoundsForCalculations.x, y: logoBoundsForCalculations.y },
      shifted: { x: logoBounds.x, y: logoBounds.y },
      horizontalPadding,
      verticalPadding
    });
  } else if (logoBoundsForCalculations) {
    // Если нет охранной области, просто используем оригинальные координаты
    logoBounds = logoBoundsForCalculations;
  }
  
  if (state.showLogo && state.logo && logoBounds) {
    // Логируем начальные координаты логотипа
    console.log('Logo calculation started:', {
      logoBounds: { x: logoBounds.x, y: logoBounds.y, width: logoBounds.width, height: logoBounds.height },
      canvasWidth: width,
      canvasHeight: height,
      useSafeArea,
      horizontalPadding: useSafeArea ? horizontalPadding : undefined,
      verticalPadding: useSafeArea ? verticalPadding : undefined
    });
    
    // Проверяем, что изображение загружено и валидно
    if (!state.logo.complete || state.logo.naturalWidth <= 0 || state.logo.naturalHeight <= 0) {
      console.warn('Логотип не загружен или невалиден:', {
        complete: state.logo.complete,
        naturalWidth: state.logo.naturalWidth,
        naturalHeight: state.logo.naturalHeight,
        showLogo: state.showLogo,
        hasLogo: !!state.logo,
        hasLogoBounds: !!logoBounds,
        useSafeArea
      });
    } else {
      // Проверяем и корректируем границы canvas ПЕРЕД отрисовкой
      const logoRight = logoBounds.x + logoBounds.width;
      const logoBottom = logoBounds.y + logoBounds.height;
      const originalCoords = { x: logoBounds.x, y: logoBounds.y, width: logoBounds.width, height: logoBounds.height };
      let wasAdjusted = false;
      
      if (logoBounds.x < 0 || logoBounds.y < 0 || logoRight > width || logoBottom > height) {
        console.warn('Логотип выходит за границы canvas, корректируем:', {
          before: originalCoords,
          logoRight,
          logoBottom,
          canvasWidth: width,
          canvasHeight: height
        });
        
        // Корректируем координаты, чтобы логотип был в пределах canvas
        logoBounds.x = Math.max(0, Math.min(logoBounds.x, width - logoBounds.width));
        logoBounds.y = Math.max(0, Math.min(logoBounds.y, height - logoBounds.height));
        wasAdjusted = true;
        
        console.log('Logo coordinates adjusted:', {
          before: originalCoords,
          after: { x: logoBounds.x, y: logoBounds.y, width: logoBounds.width, height: logoBounds.height }
        });
      }
      
      // Логируем финальные координаты перед отрисовкой
      console.log('Rendering logo:', {
        logoBounds: { x: logoBounds.x, y: logoBounds.y, width: logoBounds.width, height: logoBounds.height },
        canvasWidth: width,
        canvasHeight: height,
        logoComplete: state.logo.complete,
        logoNaturalWidth: state.logo.naturalWidth,
        logoNaturalHeight: state.logo.naturalHeight,
        useSafeArea,
        horizontalPadding: useSafeArea ? horizontalPadding : undefined,
        verticalPadding: useSafeArea ? verticalPadding : undefined,
        wasAdjusted,
        willFit: logoBounds.x + logoBounds.width <= width && logoBounds.y + logoBounds.height <= height
      });
      
      try {
        console.log('Drawing logo at:', { x: logoBounds.x, y: logoBounds.y, w: logoBounds.width, h: logoBounds.height });
        ctx.drawImage(state.logo, logoBounds.x, logoBounds.y, logoBounds.width, logoBounds.height);
        console.log('Logo drawn successfully');
        
        // Рисуем партнерский логотип, если есть
        if (logoBounds.hasPartnerLogo && state.partnerLogo && state.partnerLogo.complete) {
          const separatorX = logoBounds.x + logoBounds.width;
          const separatorY = logoBounds.y;
          const separatorHeight = logoBounds.height;
          
          // Отступ от основного логотипа до разделителя
          const gapBeforeSeparator = 24;
          // Отступ от разделителя до партнерского логотипа (одинаковое расстояние)
          const gapAfterSeparator = 24;
          
          // Рассчитываем размеры партнерского логотипа
          const partnerLogoScale = logoBounds.height / state.partnerLogo.height;
          const partnerLogoWidth = state.partnerLogo.width * partnerLogoScale;
          const partnerLogoX = separatorX + gapBeforeSeparator + gapAfterSeparator; // Отступ после разделителя
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
  } else {
    // Отладка: почему логотип не рисуется
    if (useSafeArea && safeArea) {
      console.warn('Logo not rendered:', {
        showLogo: state.showLogo,
        hasLogo: !!state.logo,
        hasLogoBounds: !!logoBounds,
        logoBounds: logoBounds ? { x: logoBounds.x, y: logoBounds.y } : null
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
    // Для охранных областей используем effectiveWidth и effectiveHeight
    const availableWidth = Math.max(0, effectiveWidth - paddingPx * 2);
    const availableHeight = Math.max(0, effectiveHeight - paddingPx * 2);
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
  if (useSafeArea && safeArea && isPreview) {
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


