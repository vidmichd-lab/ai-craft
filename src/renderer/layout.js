/**
 * Модуль для расчетов позиций и размеров элементов макета
 */

import { LAYOUT_CONSTANTS } from './constants.js';
import { getState } from '../state/store.js';

/**
 * Определяет тип макета на основе размеров
 * Явно горизонтальный (>= 1.35) — всегда horizontal; явно вертикальный (<= 1/1.35) — vertical.
 * Квадрат (между порогами): только при layoutMode === 'horizontal' считаем горизонтальным, иначе вертикальный.
 */
export const getLayoutType = (width, height, layoutMode = 'auto') => {
  const aspectRatio = width / height;
  const horizontalThreshold = 1.35;
  const stronglyHorizontal = aspectRatio >= horizontalThreshold;
  const stronglyVertical = aspectRatio <= 1 / horizontalThreshold;
  const isHorizontalLayout = stronglyHorizontal
    ? true
    : (stronglyVertical ? false : (layoutMode === 'horizontal'));
  const isUltraWide = width >= height * LAYOUT_CONSTANTS.ULTRA_WIDE_THRESHOLD;
  const isSuperWide = isUltraWide && height < LAYOUT_CONSTANTS.SUPER_WIDE_HEIGHT;
  
  return {
    isHorizontalLayout,
    isUltraWide,
    isSuperWide,
    aspectRatio
  };
};

/**
 * Вычисляет множители размеров для разных элементов в зависимости от типа макета
 */
export const calculateSizeMultipliers = (width, height, layoutType) => {
  const { isUltraWide, isSuperWide } = layoutType;
  const state = getState();
  const customMultipliers = state.formatMultipliers;
  
  // Функция для получения множителя (кастомный или дефолтный)
  const getMultiplier = (formatType, key, defaultValue) => {
    const value = customMultipliers?.[formatType]?.[key];
    // Если значение undefined или null, используем дефолтное значение
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return value;
  };
  
  let logoSizeMultiplier = 1;
  let titleSizeMultiplier = 1;
  let subtitleSizeMultiplier = 1;
  let legalMultiplier = 1;
  let ageMultiplier = 1;

  if (height >= width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD) {
    logoSizeMultiplier = getMultiplier('vertical', 'logo', LAYOUT_CONSTANTS.VERTICAL_LOGO_MULTIPLIER);
    titleSizeMultiplier = getMultiplier('vertical', 'title', 1);
    subtitleSizeMultiplier = getMultiplier('vertical', 'subtitle', 1);
    legalMultiplier = getMultiplier('vertical', 'legal', 1);
    ageMultiplier = getMultiplier('vertical', 'age', 1);
  } else if (isUltraWide) {
    logoSizeMultiplier = getMultiplier('ultraWide', 'logo', LAYOUT_CONSTANTS.ULTRA_WIDE_LOGO_MULTIPLIER);
    
    if (height < LAYOUT_CONSTANTS.SUPER_WIDE_HEIGHT) {
      titleSizeMultiplier = getMultiplier('ultraWide', 'titleSmall', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_SMALL);
      subtitleSizeMultiplier = getMultiplier('ultraWide', 'subtitleSmall', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_SMALL);
    } else if (height < 200) {
      titleSizeMultiplier = getMultiplier('ultraWide', 'titleMedium', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_MEDIUM);
      subtitleSizeMultiplier = getMultiplier('ultraWide', 'subtitleMedium', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_MEDIUM);
    } else {
      titleSizeMultiplier = getMultiplier('ultraWide', 'titleLarge', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_LARGE);
      subtitleSizeMultiplier = getMultiplier('ultraWide', 'subtitleLarge', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_LARGE);
    }
    
    if (height >= 250 && height <= 350) {
      legalMultiplier = getMultiplier('ultraWide', 'legalMedium', LAYOUT_CONSTANTS.ULTRA_WIDE_LEGAL_MULTIPLIER_MEDIUM);
    } else {
      legalMultiplier = getMultiplier('ultraWide', 'legalNormal', LAYOUT_CONSTANTS.ULTRA_WIDE_LEGAL_MULTIPLIER_NORMAL);
    }
    
    ageMultiplier = getMultiplier('ultraWide', 'age', LAYOUT_CONSTANTS.ULTRA_WIDE_AGE_MULTIPLIER);
  } else if (width >= height * 4) {
    logoSizeMultiplier = getMultiplier('veryWide', 'logo', LAYOUT_CONSTANTS.ULTRA_WIDE_LOGO_MULTIPLIER);
    
    if (height < 200) {
      titleSizeMultiplier = getMultiplier('veryWide', 'titleMedium', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_MEDIUM);
      subtitleSizeMultiplier = getMultiplier('veryWide', 'subtitleMedium', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_MEDIUM);
    } else {
      titleSizeMultiplier = getMultiplier('veryWide', 'titleLarge', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_LARGE);
      subtitleSizeMultiplier = getMultiplier('veryWide', 'subtitleLarge', LAYOUT_CONSTANTS.ULTRA_WIDE_TITLE_MULTIPLIER_LARGE);
    }
    
    // Для больших форматов типа 2832x600 (большая ширина, средняя высота) увеличиваем заголовок
    if (width >= 2000 && height >= 400 && height <= 800) {
      titleSizeMultiplier = getMultiplier('veryWide', 'titleExtraLarge', 2);
      subtitleSizeMultiplier = getMultiplier('veryWide', 'subtitleExtraLarge', 2);
      legalMultiplier = getMultiplier('veryWide', 'legalExtraLarge', 2.5);
    } else if (height >= 250 && height <= 350) {
      legalMultiplier = getMultiplier('veryWide', 'legalMedium', LAYOUT_CONSTANTS.ULTRA_WIDE_LEGAL_MULTIPLIER_MEDIUM);
    } else {
      legalMultiplier = getMultiplier('veryWide', 'legalNormal', LAYOUT_CONSTANTS.ULTRA_WIDE_LEGAL_MULTIPLIER_NORMAL);
    }
    
    ageMultiplier = getMultiplier('veryWide', 'age', LAYOUT_CONSTANTS.ULTRA_WIDE_AGE_MULTIPLIER);
  } else if (width >= height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD) {
    logoSizeMultiplier = getMultiplier('horizontal', 'logo', LAYOUT_CONSTANTS.ULTRA_WIDE_LOGO_MULTIPLIER);
    
    if (height < 200) {
      titleSizeMultiplier = getMultiplier('horizontal', 'titleSmall', 1.8);
      subtitleSizeMultiplier = getMultiplier('horizontal', 'subtitleSmall', 1.8);
    } else {
      titleSizeMultiplier = getMultiplier('horizontal', 'titleLarge', 1.6);
      subtitleSizeMultiplier = getMultiplier('horizontal', 'subtitleLarge', 1.6);
    }
    
    if (height >= 250 && height <= 350) {
      legalMultiplier = getMultiplier('horizontal', 'legalSmall', 1.8);
    } else {
      legalMultiplier = getMultiplier('horizontal', 'legalLarge', 2);
    }
    
    ageMultiplier = getMultiplier('horizontal', 'age', LAYOUT_CONSTANTS.ULTRA_WIDE_AGE_MULTIPLIER);
  }

  // Для высоких макетов (height/width >= 2) заголовок масштабируется
  const aspectRatio = height / width;
  if (aspectRatio >= 2) {
    titleSizeMultiplier *= getMultiplier('tall', 'title', 1.3);
    subtitleSizeMultiplier *= getMultiplier('tall', 'subtitle', 1.3);
  }

  // Для форматов типа 960x450 или 1920x1080 (широкие горизонтальные форматы с большой высотой)
  const isWideHorizontal = width >= height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD && !isUltraWide;
  if (isWideHorizontal && height >= 400 && height <= 1200 && width >= 800 && width < 2000) {
    const originalLegalMultiplier = (height >= 250 && height <= 350) ? 1.8 : 2;
    let newLegalMultiplier;
    if (height >= 450 && height <= 500) {
      newLegalMultiplier = getMultiplier('horizontal', 'legalWide450', 1.2);
    } else if (height > 500 && height <= 1080) {
      newLegalMultiplier = getMultiplier('horizontal', 'legalWide500', 1.1);
    } else {
      newLegalMultiplier = getMultiplier('horizontal', 'legalWideOther', 1.15);
    }
    legalMultiplier = newLegalMultiplier;
    
    const reductionFactor = newLegalMultiplier / originalLegalMultiplier;
    ageMultiplier = getMultiplier('horizontal', 'age', LAYOUT_CONSTANTS.ULTRA_WIDE_AGE_MULTIPLIER) * reductionFactor;
    
    if (height >= 800) {
      titleSizeMultiplier = getMultiplier('horizontal', 'titleWideSmall', 1.2);
      subtitleSizeMultiplier = getMultiplier('horizontal', 'subtitleWideSmall', 1.2);
    } else if (height >= 500) {
      titleSizeMultiplier = getMultiplier('horizontal', 'titleWideMedium', 1.4);
      subtitleSizeMultiplier = getMultiplier('horizontal', 'subtitleWideMedium', 1.4);
    }
  }

  // Для квадратных форматов уменьшаем заголовок
  const isSquare = height < width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD && 
                   width < height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD;
  if (isSquare) {
    titleSizeMultiplier *= getMultiplier('square', 'title', 0.9);
    subtitleSizeMultiplier *= getMultiplier('square', 'subtitle', 0.9);
  }

  return {
    logoSizeMultiplier,
    titleSizeMultiplier,
    subtitleSizeMultiplier,
    legalMultiplier,
    ageMultiplier
  };
};

/**
 * Вычисляет область для текста
 */
export const calculateTextArea = (width, height, paddingPx, layoutType, logoBounds, kvPlannedMeta) => {
  const { isUltraWide, isSuperWide, isHorizontalLayout } = layoutType;
  
  let leftSectionWidth;
  let rightSectionWidth;
  let maxTextWidth;
  let textArea = {
    left: paddingPx,
    right: width - paddingPx
  };
  
  if (isUltraWide) {
    leftSectionWidth = width;
    rightSectionWidth = 0;
    maxTextWidth = width - paddingPx * 2;
  } else if (isHorizontalLayout) {
    leftSectionWidth = width * 0.55;
    rightSectionWidth = width - leftSectionWidth - paddingPx;
    maxTextWidth = leftSectionWidth - paddingPx * 2;
    // Не устанавливаем textArea.right здесь - он будет установлен ниже с учетом логотипа и KV
  } else {
    maxTextWidth = width - paddingPx * 2;
    leftSectionWidth = width;
    rightSectionWidth = 0;
  }

  // Учитываем KV и логотип при расчете области текста
  if (isSuperWide && kvPlannedMeta) {
    const textStart = kvPlannedMeta.kvX + kvPlannedMeta.kvW + Math.max(paddingPx, width * 0.01);
    textArea.left = textStart;
    textArea.right = width - paddingPx;
  } else if (isUltraWide && kvPlannedMeta) {
    const textStart = kvPlannedMeta.kvX + kvPlannedMeta.kvW + Math.max(paddingPx, width * 0.02);
    textArea.left = Math.min(width - paddingPx - 200, Math.max(textStart, paddingPx));
    textArea.right = width - paddingPx;
    if (textArea.right - textArea.left < 200) {
      textArea.left = Math.max(paddingPx, textArea.right - 200);
    }
  } else if (isSuperWide) {
    // Для широких форматов без KV текст всегда начинается с paddingPx (не зависит от логотипа)
    textArea.left = paddingPx;
    textArea.right = width - paddingPx;
  } else if (isUltraWide) {
    // Для широких форматов без KV текст всегда начинается с paddingPx (не зависит от логотипа)
    textArea.left = paddingPx;
    textArea.right = width - paddingPx;
  } else if (isHorizontalLayout && kvPlannedMeta) {
    const minTextRatio = width >= height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD ? LAYOUT_CONSTANTS.MIN_TEXT_RATIO_WIDE : LAYOUT_CONSTANTS.MIN_TEXT_RATIO_NORMAL;
    const widthAfterPadding = Math.max(0, width - paddingPx * 2);
    const minTextWidth = Math.max(widthAfterPadding * minTextRatio, LAYOUT_CONSTANTS.MIN_TEXT_WIDTH);
    const gap = Math.max(paddingPx, width * 0.02);
    
    // Рассчитываем ширину текста с учетом KV
    const textWidth = Math.max(minTextWidth, widthAfterPadding - kvPlannedMeta.kvW - gap);
    
    textArea.left = paddingPx;
    textArea.right = paddingPx + textWidth;
    
    // Дополнительная проверка: гарантируем, что текст не заходит на KV
    const kvRight = kvPlannedMeta.kvX + kvPlannedMeta.kvW;
    const maxTextRight = kvRight - gap;
    if (textArea.right > maxTextRight) {
      textArea.right = Math.max(textArea.left + 50, maxTextRight);
    }
  } else if (isHorizontalLayout) {
    // Для горизонтальных форматов без KV текст всегда начинается с paddingPx (не зависит от логотипа)
    textArea.left = paddingPx;
    // Область текста занимает всю доступную ширину
    textArea.right = width - paddingPx;
  }

  if (textArea.right <= textArea.left) {
    textArea.right = width - paddingPx;
    textArea.left = paddingPx;
  }
  
  maxTextWidth = Math.max(50, textArea.right - textArea.left);

  return { textArea, maxTextWidth };
};

/**
 * Вычисляет позицию логотипа
 * @param {Object} state - состояние приложения
 * @param {number} width - ширина области для логотипа
 * @param {number} height - высота области для логотипа
 * @param {number} paddingPx - отступ в пикселях
 * @param {Object} layoutType - тип макета
 * @param {number} logoSizePercent - размер логотипа в процентах
 * @param {string|null} logoPosForSize - позиция логотипа для конкретного размера (из админки), null = использовать глобальную настройку
 */
export const calculateLogoBounds = (state, width, height, paddingPx, layoutType, logoSizePercent, logoPosForSize = null) => {
  const { isUltraWide, isSuperWide, isHorizontalLayout } = layoutType;
  
  // Определяем эффективную позицию логотипа: сначала настройка для размера, потом глобальная
  const effectiveLogoPos = logoPosForSize !== null ? logoPosForSize : state.logoPos;
  
  if (!state.showLogo || !state.logo) return null;

  // Учитываем партнерский логотип при расчете общей ширины
  const hasPartnerLogo = state.partnerLogo && state.showLogo;
  const separatorWidth = hasPartnerLogo ? 48 : 0; // Ширина разделителя "|" (24px до разделителя + 24px после)
  
  // Общая ширина для обоих логотипов
  let totalLogoWidth = (width * logoSizePercent) / 100;
  
  // Если есть партнерский логотип, делим пространство пополам
  let mainLogoWidth = totalLogoWidth;
  if (hasPartnerLogo) {
    // Оставляем место для разделителя и делим оставшееся пространство
    const availableWidth = totalLogoWidth - separatorWidth;
    mainLogoWidth = availableWidth / 2;
  }
  
  let logoScale = mainLogoWidth / state.logo.width;
  let logoHeight = state.logo.height * logoScale;

  if (isSuperWide) {
    // Для супер-широких форматов логотип всегда вверху, независимо от titleVPos
    const availableHeight = Math.max(0, height - paddingPx * 2);
    logoHeight = Math.min(availableHeight * 0.3, state.logo.height * logoScale);
    logoScale = logoHeight / state.logo.height;
    mainLogoWidth = state.logo.width * logoScale;
    
    // Пересчитываем для партнерского логотипа
    if (hasPartnerLogo) {
      const partnerLogoScale = logoHeight / state.partnerLogo.height;
      const partnerLogoWidth = state.partnerLogo.width * partnerLogoScale;
      totalLogoWidth = mainLogoWidth + separatorWidth + partnerLogoWidth;
    } else {
      totalLogoWidth = mainLogoWidth;
    }
    
    // Применяем позицию логотипа из настроек
    let logoX;
    if (effectiveLogoPos === 'center') {
      logoX = (width - totalLogoWidth) / 2;
    } else {
      logoX = paddingPx;
    }
    
    return {
      x: logoX,
      y: paddingPx,
      width: mainLogoWidth,
      height: logoHeight,
      totalWidth: totalLogoWidth,
      hasPartnerLogo
    };
  } else if (isUltraWide) {
    const availableHeight = Math.max(0, height - paddingPx * 2);
    logoHeight = Math.min(availableHeight * 0.3, state.logo.height * logoScale);
    logoScale = logoHeight / state.logo.height;
    mainLogoWidth = state.logo.width * logoScale;
    
    // Пересчитываем для партнерского логотипа
    if (hasPartnerLogo) {
      const partnerLogoScale = logoHeight / state.partnerLogo.height;
      const partnerLogoWidth = state.partnerLogo.width * partnerLogoScale;
      totalLogoWidth = mainLogoWidth + separatorWidth + partnerLogoWidth;
    } else {
      totalLogoWidth = mainLogoWidth;
    }
    
    // Применяем позицию логотипа из настроек
    let logoX;
    if (effectiveLogoPos === 'center') {
      logoX = (width - totalLogoWidth) / 2;
    } else {
      logoX = paddingPx;
    }
    
    return {
      x: logoX,
      y: paddingPx + (availableHeight - logoHeight) / 2,
      width: mainLogoWidth,
      height: logoHeight,
      totalWidth: totalLogoWidth,
      hasPartnerLogo
    };
  } else if (isHorizontalLayout) {
    // Для очень низких горизонтальных форматов (height < 150) ограничиваем высоту логотипа
    const isVeryLowHorizontal = height < 150;
    // Для форматов с высотой 400-500px также немного ограничиваем логотип, чтобы не мешал тексту
    const isMediumHeight = height >= 400 && height <= 500;
    
    if (isVeryLowHorizontal) {
      const maxLogoHeight = Math.min(height * 0.4, height - paddingPx * 2);
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoScale = logoHeight / state.logo.height;
        mainLogoWidth = state.logo.width * logoScale;
      }
    } else if (isMediumHeight) {
      // Для средних форматов ограничиваем логотип, чтобы оставить больше места для текста
      const maxLogoHeight = Math.min(height * 0.25, height - paddingPx * 3);
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoScale = logoHeight / state.logo.height;
        mainLogoWidth = state.logo.width * logoScale;
      }
    }
    
    // Пересчитываем для партнерского логотипа
    if (hasPartnerLogo) {
      const partnerLogoScale = logoHeight / state.partnerLogo.height;
      const partnerLogoWidth = state.partnerLogo.width * partnerLogoScale;
      totalLogoWidth = mainLogoWidth + separatorWidth + partnerLogoWidth;
    } else {
      totalLogoWidth = mainLogoWidth;
    }
    
    // Применяем позицию логотипа из настроек
    let logoX;
    if (effectiveLogoPos === 'center') {
      logoX = (width - totalLogoWidth) / 2;
    } else {
      logoX = paddingPx;
    }
    
    return {
      x: logoX,
      y: paddingPx,
      width: mainLogoWidth,
      height: logoHeight,
      totalWidth: totalLogoWidth,
      hasPartnerLogo
    };
  } else {
    let logoX;
    let logoY;
    // Если titleAlign === 'center', то логотип тоже центрируем (для обратной совместимости)
    // Иначе используем effectiveLogoPos из настроек
    const finalLogoPos = (state.titleAlign === 'center' && logoPosForSize === null) ? 'center' : effectiveLogoPos;
    
    // Пересчитываем для партнерского логотипа (нужно сделать это раньше для правильного центрирования)
    if (hasPartnerLogo) {
      const partnerLogoScale = logoHeight / state.partnerLogo.height;
      const partnerLogoWidth = state.partnerLogo.width * partnerLogoScale;
      totalLogoWidth = mainLogoWidth + separatorWidth + partnerLogoWidth;
    } else {
      totalLogoWidth = mainLogoWidth;
    }
    
    if (state.titleVPos === 'top') {
      if (finalLogoPos === 'left') {
        logoX = paddingPx;
        logoY = paddingPx;
      } else if (finalLogoPos === 'center') {
        logoX = (width - totalLogoWidth) / 2;
        logoY = paddingPx;
      } else {
        logoX = paddingPx;
        logoY = paddingPx;
      }
    } else if (state.titleVPos === 'center') {
      // При центрировании текста логотип остается вверху, меняется только позиция текста
      if (finalLogoPos === 'center') {
        logoX = (width - totalLogoWidth) / 2;
        logoY = paddingPx;
      } else if (finalLogoPos === 'left') {
        logoX = paddingPx;
        logoY = paddingPx;
      } else {
        logoX = (width - totalLogoWidth) / 2;
        logoY = paddingPx;
      }
    } else {
      if (finalLogoPos === 'left') {
        logoX = paddingPx;
        logoY = paddingPx;
      } else if (finalLogoPos === 'center') {
        logoX = (width - totalLogoWidth) / 2;
        logoY = paddingPx;
      } else {
        logoX = paddingPx;
        logoY = paddingPx;
      }
    }
    
    // Если позиция center, нужно учесть общую ширину для центрирования (уже сделано выше)
    // Оставляем для обратной совместимости, но это уже не нужно
    if (finalLogoPos === 'center' && hasPartnerLogo) {
      logoX = (width - totalLogoWidth) / 2;
    }
    
    return {
      x: logoX,
      y: logoY,
      width: mainLogoWidth,
      height: logoHeight,
      totalWidth: totalLogoWidth,
      hasPartnerLogo
    };
  }
};

