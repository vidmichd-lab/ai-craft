import {
  getState,
  setKey,
  setState,
  batch,
  subscribe,
  saveSettingsSnapshot,
  applySavedSettings,
  resetState,
  togglePresetSize,
  selectAllPresetSizes,
  deselectAllPresetSizes,
  getCheckedSizes,
  ensurePresetSelection,
  addTitleSubtitlePair,
  removeTitleSubtitlePair,
  setActivePairIndex,
  updatePairTitle,
  updatePairSubtitle,
  updatePairKV,
  updatePairBgImage,
  addCustomSize,
  removeCustomSize,
  toggleCustomSize
} from '../state/store.js';
import { AVAILABLE_LOGOS, AVAILABLE_FONTS, AVAILABLE_KV, PRESET_BACKGROUND_COLORS, FONT_WEIGHT_TO_NAME, FONT_NAME_TO_WEIGHT, AVAILABLE_WEIGHTS } from '../constants.js';
import { scanLogos, scanKV } from '../utils/assetScanner.js';
import { loadImage as loadImageCached } from '../utils/imageCache.js';
import {
  updateLogoUI,
  handleLogoUpload,
  clearLogo,
  selectPreloadedLogo,
  refreshLogoColumns,
  initializeLogoDropdown,
  openLogoSelectModal,
  closeLogoSelectModal,
  populateLogoColumns,
  updateLogoTriggerText
} from './components/logoSelector.js';
import { renderer, clearTextMeasurementCache } from '../renderer.js';
import { getDom } from './domCache.js';
import { t } from '../utils/i18n.js';
import {
  getAvailableWeightsForFamily,
  updateWeightDropdown,
  updateCustomWeightDropdown,
  updateCustomFontDropdown,
  updateFontDropdown,
  updateCustomFontInfo,
  closeAllFontDropdowns,
  selectFontFamily,
  handleTitleFontUpload,
  handleSubtitleFontUpload,
  handleLegalFontUpload,
  handleAgeFontUpload,
  clearTitleCustomFont,
  clearSubtitleCustomFont,
  clearLegalCustomFont,
  clearAgeCustomFont,
  selectTitleFontFamily,
  selectSubtitleFontFamily,
  selectLegalFontFamily,
  selectAgeFontFamily,
  initializeFontDropdown,
  initializeFontDropdowns
} from './components/fontSelector.js';
import {
  updateKVUI,
  handleKVUpload,
  clearKV,
  selectPreloadedKV,
  handlePairKVUpload,
  refreshKVColumns as refreshKVColumnsFromModule,
  initializeKVDropdown,
  loadDefaultKV,
  updateKVBorderRadius,
  updateKVTriggerText,
  openKVSelectModal,
  closeKVSelectModal
} from './components/kvSelector.js';
import {
  handleBgImageUpload,
  clearBgImage,
  updateBgColor,
  applyPresetBgColor,
  updateBgPosition,
  updateBgUI,
  initializeBackgroundUI,
  selectPreloadedBG,
  selectPairBG,
  refreshBGColumns,
  initializeBGDropdown,
  openBGSelectModal,
  closeBGSelectModal,
  updateBgGradientType,
  updateBgGradientAngle,
  addGradientStop,
  removeGradientStop
} from './components/backgroundSelector.js';
import {
  updateSizesSummary,
  renderPresetSizes,
  renderCustomSizes,
  changePreviewSizeCategory,
  toggleSize,
  toggleCustomSizeAction,
  removeCustomSizeAction,
  addCustomSizeAction,
  addCustomSizeFromInput,
  updateAddSizeButtonState,
  selectAllSizesAction,
  deselectAllSizesAction,
  togglePlatformSizes,
  initializeSizeManager
} from './components/sizeManager.js';
import { showSizesAdmin } from './components/sizesAdmin.js';
let savedSettings = null;

// Переменные для работы с KV (используются в функциях для пар)
let cachedKV = null;
let kvScanning = false;
let selectedFolder1 = null;
let selectedFolder2 = null;
let currentKVModalPairIndex = null;

// Переменные для работы с логотипами (используются в функциях)
let cachedLogosStructure = null;
let selectedLogoFolder1 = null;
let selectedLogoFolder2 = null;
let selectedLogoFolder3 = null;

// Функции для работы со шрифтами теперь импортируются из ./components/fontSelector.js

const updateChipGroup = (group, value) => {
  document.querySelectorAll(`[data-group="${group}"]`).forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.value === value);
  });
};

const syncChips = (state) => {
  // Обновляем тумблеры для выключки текста и вертикальной позиции
  updateTitleAlignToggle(state.titleAlign || 'left');
  updateTitleVPosToggle(state.titleVPos || 'top');
  // Остальные чипсы
  updateBgPositionToggle(state.bgPosition || 'center');
  updateBgVPositionToggle(state.bgVPosition || 'center');
  updateLogoPosToggle(state.logoPos || 'left');
  updateChipGroup('logo-lang', state.logoLanguage || 'ru');
  updateKVPositionToggle(state.kvPosition || 'center');
};

export const syncFormFields = () => {
  const state = getState();
  const dom = getDom();

  if (!dom.paddingPercent) return;

  const paddingPercent = state.paddingPercent ?? 5;
  dom.paddingPercent.value = paddingPercent;
  if (dom.paddingValue) dom.paddingValue.textContent = `${paddingPercent}%`;
  
  // Синхронизируем активную пару
  if (state.titleSubtitlePairs && state.titleSubtitlePairs.length > 0) {
    const activePair = state.titleSubtitlePairs[state.activePairIndex || 0];
    if (activePair) {
      if (dom.title) dom.title.value = activePair.title || '';
      if (dom.subtitle) dom.subtitle.value = activePair.subtitle || '';
    }
  } else {
    if (dom.title) dom.title.value = state.title || '';
    if (dom.subtitle) dom.subtitle.value = state.subtitle || '';
  }
  dom.titleColor.value = state.titleColor || '#ffffff';
  if (dom.titleColorHex) dom.titleColorHex.value = state.titleColor || '#ffffff';
  const titleSize = state.titleSize ?? 8;
  dom.titleSize.value = titleSize;
  if (dom.titleSizeValue) {
    const titleSizeNum = typeof titleSize === 'number' && !isNaN(titleSize) ? titleSize : 8;
    dom.titleSizeValue.textContent = `${titleSizeNum}%`;
  }
  // Конвертируем вес из числа в название для обратной совместимости
  const titleWeight = typeof state.titleWeight === 'number' 
    ? FONT_WEIGHT_TO_NAME[state.titleWeight.toString()] || 'Regular' 
    : (state.titleWeight || 'Regular');
  // Обновляем кастомные дропдауны для заголовка
  const titleFontFamilyText = document.getElementById('titleFontFamilyText');
  const titleFontFamilyDropdown = document.getElementById('titleFontFamilyDropdown');
  if (titleFontFamilyText && titleFontFamilyDropdown) {
    const titleFontFamily = state.titleFontFamily || state.fontFamily || 'YS Text';
    titleFontFamilyText.textContent = titleFontFamily === 'system-ui' ? 'System Default' : titleFontFamily;
    updateCustomFontDropdown(titleFontFamilyDropdown, titleFontFamilyText, titleFontFamily, (value) => {
      selectTitleFontFamily(value);
    });
  }
  
  const titleWeightText = document.getElementById('titleWeightText');
  const titleWeightDropdown = document.getElementById('titleWeightDropdown');
  if (titleWeightText && titleWeightDropdown) {
    const titleFontFamily = state.titleFontFamily || state.fontFamily || 'YS Text';
    updateCustomWeightDropdown(titleWeightDropdown, titleWeightText, titleFontFamily, titleWeight, async (value) => {
      clearTextMeasurementCache();
      // Загружаем шрифт с новым начертанием
      const weightValue = FONT_NAME_TO_WEIGHT[value] || '400';
      const fontToLoad = AVAILABLE_FONTS.find(f => 
        f.family === titleFontFamily && 
        f.weight === weightValue && 
        f.style === 'normal'
      );
      if (fontToLoad && fontToLoad.file) {
        // Динамически импортируем loadFonts из main.js
        const { loadFonts } = await import('../main.js');
        await loadFonts([fontToLoad]);
      }
      setKey('titleWeight', value);
      renderer.render();
    });
  }
  
  // Обратная совместимость со старыми select элементами
  if (dom.titleFontFamily) {
    dom.titleFontFamily.value = state.titleFontFamily || state.fontFamily || 'YS Text';
    // Обновляем селект начертаний на основе выбранной гарнитуры
    if (dom.titleWeight) {
      updateWeightDropdown(dom.titleWeight, dom.titleFontFamily.value, titleWeight);
    }
  }
  if (state.titleCustomFontName) {
    updateCustomFontInfo('title', state.titleCustomFontName);
  }
  dom.titleLetterSpacing.value = state.titleLetterSpacing;
  dom.titleLineHeight.value = state.titleLineHeight;

  dom.subtitle.value = state.subtitle || '';
  dom.subtitleColor.value = state.subtitleColor || '#e0e0e0';
  if (dom.subtitleColorHex) dom.subtitleColorHex.value = state.subtitleColor || '#e0e0e0';
  const subtitleOpacity = state.subtitleOpacity ?? 90;
  dom.subtitleOpacity.value = subtitleOpacity;
  if (dom.subtitleOpacityValue) {
    const subtitleOpacityNum = typeof subtitleOpacity === 'number' && !isNaN(subtitleOpacity) ? subtitleOpacity : 90;
    dom.subtitleOpacityValue.textContent = `${subtitleOpacityNum}%`;
  }
  const subtitleSize = state.subtitleSize ?? 4;
  dom.subtitleSize.value = subtitleSize;
  if (dom.subtitleSizeValue) {
    const subtitleSizeNum = typeof subtitleSize === 'number' && !isNaN(subtitleSize) ? subtitleSize : 4;
    dom.subtitleSizeValue.textContent = `${subtitleSizeNum}%`;
  }
  // Конвертируем вес из числа в название для обратной совместимости
  const subtitleWeight = typeof state.subtitleWeight === 'number' 
    ? FONT_WEIGHT_TO_NAME[state.subtitleWeight.toString()] || 'Regular' 
    : (state.subtitleWeight || 'Regular');
  // Обновляем кастомные дропдауны для подзаголовка
  const subtitleFontFamilyText = document.getElementById('subtitleFontFamilyText');
  const subtitleFontFamilyDropdown = document.getElementById('subtitleFontFamilyDropdown');
  if (subtitleFontFamilyText && subtitleFontFamilyDropdown) {
    const subtitleFontFamily = state.subtitleFontFamily || state.fontFamily || 'YS Text';
    subtitleFontFamilyText.textContent = subtitleFontFamily === 'system-ui' ? 'System Default' : subtitleFontFamily;
    updateCustomFontDropdown(subtitleFontFamilyDropdown, subtitleFontFamilyText, subtitleFontFamily, (value) => {
      selectSubtitleFontFamily(value);
    });
  }
  
  const subtitleWeightText = document.getElementById('subtitleWeightText');
  const subtitleWeightDropdown = document.getElementById('subtitleWeightDropdown');
  if (subtitleWeightText && subtitleWeightDropdown) {
    const subtitleFontFamily = state.subtitleFontFamily || state.fontFamily || 'YS Text';
    updateCustomWeightDropdown(subtitleWeightDropdown, subtitleWeightText, subtitleFontFamily, subtitleWeight, async (value) => {
      clearTextMeasurementCache();
      // Загружаем шрифт с новым начертанием
      const weightValue = FONT_NAME_TO_WEIGHT[value] || '400';
      const fontToLoad = AVAILABLE_FONTS.find(f => 
        f.family === subtitleFontFamily && 
        f.weight === weightValue && 
        f.style === 'normal'
      );
      if (fontToLoad && fontToLoad.file) {
        // Динамически импортируем loadFonts из main.js
        const { loadFonts } = await import('../main.js');
        await loadFonts([fontToLoad]);
      }
      setKey('subtitleWeight', value);
      renderer.render();
    });
  }
  
  // Обратная совместимость со старыми select элементами
  if (dom.subtitleFontFamily) {
    dom.subtitleFontFamily.value = state.subtitleFontFamily || state.fontFamily || 'YS Text';
    // Обновляем селект начертаний на основе выбранной гарнитуры
    if (dom.subtitleWeight) {
      updateWeightDropdown(dom.subtitleWeight, dom.subtitleFontFamily.value, subtitleWeight);
    }
  }
  if (state.subtitleCustomFontName) {
    updateCustomFontInfo('subtitle', state.subtitleCustomFontName);
  }
  dom.subtitleLetterSpacing.value = state.subtitleLetterSpacing;
  dom.subtitleLineHeight.value = state.subtitleLineHeight;
  dom.subtitleGap.value = state.subtitleGap;

  dom.legal.value = state.legal || '';
  dom.legalColor.value = state.legalColor || '#ffffff';
  if (dom.legalColorHex) dom.legalColorHex.value = state.legalColor || '#ffffff';
  const legalOpacity = state.legalOpacity ?? 60;
  dom.legalOpacity.value = legalOpacity;
  if (dom.legalOpacityValue) {
    const legalOpacityNum = typeof legalOpacity === 'number' && !isNaN(legalOpacity) ? legalOpacity : 60;
    dom.legalOpacityValue.textContent = `${legalOpacityNum}%`;
  }
  const legalSize = state.legalSize ?? 2;
  dom.legalSize.value = legalSize;
  if (dom.legalSizeValue) {
    const legalSizeNum = typeof legalSize === 'number' && !isNaN(legalSize) ? legalSize : 2;
    dom.legalSizeValue.textContent = `${legalSizeNum.toFixed(1)}%`;
  }
  // Конвертируем вес из числа в название для обратной совместимости
  const legalWeight = typeof state.legalWeight === 'number' 
    ? FONT_WEIGHT_TO_NAME[state.legalWeight.toString()] || 'Regular' 
    : (state.legalWeight || 'Regular');
  // Обновляем кастомные дропдауны для юридического текста
  const legalFontFamilyText = document.getElementById('legalFontFamilyText');
  const legalFontFamilyDropdown = document.getElementById('legalFontFamilyDropdown');
  if (legalFontFamilyText && legalFontFamilyDropdown) {
    const legalFontFamily = state.legalFontFamily || state.fontFamily || 'YS Text';
    legalFontFamilyText.textContent = legalFontFamily === 'system-ui' ? 'System Default' : legalFontFamily;
    updateCustomFontDropdown(legalFontFamilyDropdown, legalFontFamilyText, legalFontFamily, (value) => {
      selectLegalFontFamily(value);
    });
  }
  
  const legalWeightText = document.getElementById('legalWeightText');
  const legalWeightDropdown = document.getElementById('legalWeightDropdown');
  if (legalWeightText && legalWeightDropdown) {
    const legalFontFamily = state.legalFontFamily || state.fontFamily || 'YS Text';
    updateCustomWeightDropdown(legalWeightDropdown, legalWeightText, legalFontFamily, legalWeight, async (value) => {
      clearTextMeasurementCache();
      // Загружаем шрифт с новым начертанием
      const weightValue = FONT_NAME_TO_WEIGHT[value] || '400';
      const fontToLoad = AVAILABLE_FONTS.find(f => 
        f.family === legalFontFamily && 
        f.weight === weightValue && 
        f.style === 'normal'
      );
      if (fontToLoad && fontToLoad.file) {
        // Динамически импортируем loadFonts из main.js
        const { loadFonts } = await import('../main.js');
        await loadFonts([fontToLoad]);
      }
      setKey('legalWeight', value);
      renderer.render();
    });
  }
  
  // Обратная совместимость со старыми select элементами
  if (dom.legalFontFamily) {
    dom.legalFontFamily.value = state.legalFontFamily || state.fontFamily || 'YS Text';
    // Обновляем селект начертаний на основе выбранной гарнитуры
    if (dom.legalWeight) {
      updateWeightDropdown(dom.legalWeight, dom.legalFontFamily.value, legalWeight);
    }
  }
  if (state.legalCustomFontName) {
    updateCustomFontInfo('legal', state.legalCustomFontName);
  }
  dom.legalLetterSpacing.value = state.legalLetterSpacing;
  dom.legalLineHeight.value = state.legalLineHeight;

  dom.age.value = state.age || '18+';
  const ageSize = state.ageSize ?? 4;
  dom.ageSize.value = ageSize;
  if (dom.ageSizeValue) {
    const ageSizeNum = typeof ageSize === 'number' && !isNaN(ageSize) ? ageSize : 4;
    dom.ageSizeValue.textContent = `${ageSizeNum}%`;
  }
  // Обновляем кастомный дропдаун для возраста
  const ageFontFamilyText = document.getElementById('ageFontFamilyText');
  const ageFontFamilyDropdown = document.getElementById('ageFontFamilyDropdown');
  if (ageFontFamilyText && ageFontFamilyDropdown) {
    const ageFontFamily = state.ageFontFamily || state.fontFamily || 'YS Text';
    ageFontFamilyText.textContent = ageFontFamily === 'system-ui' ? 'System Default' : ageFontFamily;
    updateCustomFontDropdown(ageFontFamilyDropdown, ageFontFamilyText, ageFontFamily, (value) => {
      selectAgeFontFamily(value);
    });
  }
  // Обратная совместимость со старыми select элементами
  if (dom.ageFontFamily) dom.ageFontFamily.value = state.ageFontFamily || state.fontFamily || 'YS Text';
  if (state.ageCustomFontName) {
    updateCustomFontInfo('age', state.ageCustomFontName);
  }
  if (dom.ageGapPercent) dom.ageGapPercent.value = state.ageGapPercent;
  if (dom.ageGapPercentValue) {
    const ageGapPercentNum = typeof state.ageGapPercent === 'number' && !isNaN(state.ageGapPercent) ? state.ageGapPercent : 1;
    dom.ageGapPercentValue.textContent = `${ageGapPercentNum}%`;
  }

  if (dom.showLogo) dom.showLogo.checked = state.showLogo !== false;
  if (dom.showSubtitle) dom.showSubtitle.checked = state.showSubtitle;
  if (dom.hideSubtitleOnWide) dom.hideSubtitleOnWide.checked = state.hideSubtitleOnWide;
  if (dom.showLegal) dom.showLegal.checked = state.showLegal;
  if (dom.showAge) dom.showAge.checked = state.showAge;
  if (dom.showKV) dom.showKV.checked = state.showKV;

  if (dom.logoSelect) dom.logoSelect.value = state.logoSelected || '';
  updateLogoTriggerText(state.logoSelected || '');
  const logoSize = state.logoSize ?? 40;
  dom.logoSize.value = logoSize;
  if (dom.logoSizeValue) {
    const logoSizeNum = typeof logoSize === 'number' && !isNaN(logoSize) ? logoSize : 40;
    dom.logoSizeValue.textContent = `${logoSizeNum}%`;
  }

  if (dom.kvSelect) {
    dom.kvSelect.value = state.kvSelected || '';
    updateKVTriggerText(state.kvSelected || '');
  }
  const kvBorderRadius = state.kvBorderRadius ?? 0;
  if (dom.kvBorderRadius) {
    dom.kvBorderRadius.value = kvBorderRadius;
  }
  if (dom.kvBorderRadiusValue) {
    const kvBorderRadiusNum = typeof kvBorderRadius === 'number' && !isNaN(kvBorderRadius) ? kvBorderRadius : 0;
    dom.kvBorderRadiusValue.textContent = `${kvBorderRadiusNum}%`;
  }

  dom.bgColor.value = state.bgColor;
  if (dom.bgColorHex) dom.bgColorHex.value = state.bgColor;
  
  // Синхронизируем тип размещения фонового изображения
  const bgSizeSelect = document.getElementById('bgSize');
  if (bgSizeSelect) {
    bgSizeSelect.value = state.bgSize || 'cover';
    // Показываем/скрываем поле размера изображения
    const bgImageSizeGroup = document.getElementById('bgImageSizeGroup');
    if (bgImageSizeGroup) {
      const bgSize = state.bgSize || 'cover';
      if (bgSize === 'tile' || bgSize === 'cover' || bgSize === 'contain') {
        bgImageSizeGroup.style.display = 'block';
      } else {
        bgImageSizeGroup.style.display = 'none';
      }
    }
  }
  // Синхронизируем размер изображения
  const bgImageSizeInput = document.getElementById('bgImageSize');
  const bgImageSizeValue = document.getElementById('bgImageSizeValue');
  if (bgImageSizeInput) {
    const size = state.bgImageSize ?? 100;
    bgImageSizeInput.value = size;
    if (bgImageSizeValue) {
      bgImageSizeValue.textContent = `${Math.round(size)}%`;
    }
  }
  
  const textGradientOpacity = state.textGradientOpacity ?? 100;
  if (dom.textGradientOpacity) {
    dom.textGradientOpacity.value = textGradientOpacity;
  }
  if (dom.textGradientOpacityValue) {
    const textGradientOpacityNum = typeof textGradientOpacity === 'number' && !isNaN(textGradientOpacity) ? textGradientOpacity : 100;
    dom.textGradientOpacityValue.textContent = `${textGradientOpacityNum}%`;
  }

  dom.namePrefix.value = state.namePrefix;
  
  // Обновляем переключатель масштаба экспорта
  const exportScale = state.exportScale || 1;
  updateExportScaleToggle(exportScale);

  const fontSelect = dom.fontFamily;
  if (fontSelect) {
    fontSelect.value = state.fontFamily;
  }

  syncChips(state);
  updateChipGroup('layout-mode', state.layoutMode || 'auto');
  updateLogoToggle(state.logoLanguage || 'ru');
};

// updatePreviewSizeSelect имеет дополнительную логику с обработчиками в ui.js
// Поэтому оставляем её здесь, а не используем версию из sizeManager.js
export const updatePreviewSizeSelect = () => {
  const dom = getDom();
  const categorized = renderer.getCategorizedSizes();
  let needsRender = false;

  // Обновляем кастомный дропдаун для узких форматов
  const narrowBtn = document.getElementById('previewSizeSelectNarrowBtn');
  const narrowText = document.getElementById('previewSizeSelectNarrowText');
  const narrowDropdown = document.getElementById('previewSizeSelectNarrowDropdown');
  
  if (narrowBtn && narrowText && narrowDropdown) {
    narrowDropdown.innerHTML = '';
    
    if (!categorized.narrow.length) {
      narrowText.textContent = t('export.preview.noNarrow');
      const emptyOption = document.createElement('div');
      emptyOption.className = 'custom-select-option';
      emptyOption.textContent = t('export.preview.noNarrow');
      emptyOption.style.opacity = '0.5';
      emptyOption.style.cursor = 'not-allowed';
      narrowDropdown.appendChild(emptyOption);
    } else {
      categorized.narrow.forEach((size, index) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = index;
        option.textContent = `${size.width} × ${size.height} (${size.platform})`;
        option.onclick = () => {
          narrowText.textContent = option.textContent;
          narrowDropdown.style.display = 'none';
          closeAllPreviewDropdowns();
          changePreviewSizeCategory('narrow', index.toString());
        };
        narrowDropdown.appendChild(option);
      });
      
      if (categorized.narrow.length > 0) {
        narrowText.textContent = `${categorized.narrow[0].width} × ${categorized.narrow[0].height} (${categorized.narrow[0].platform})`;
        renderer.setCategoryIndex('narrow', 0, false);
        needsRender = true;
      }
    }
    
    if (!narrowBtn.onclick) {
      narrowBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllPreviewDropdowns();
        narrowDropdown.style.display = narrowDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }

  // Обновляем кастомный дропдаун для широких форматов
  const wideBtn = document.getElementById('previewSizeSelectWideBtn');
  const wideText = document.getElementById('previewSizeSelectWideText');
  const wideDropdown = document.getElementById('previewSizeSelectWideDropdown');
  
  if (wideBtn && wideText && wideDropdown) {
    wideDropdown.innerHTML = '';
    
    if (!categorized.wide.length) {
      wideText.textContent = t('export.preview.noWide');
      const emptyOption = document.createElement('div');
      emptyOption.className = 'custom-select-option';
      emptyOption.textContent = t('export.preview.noWide');
      emptyOption.style.opacity = '0.5';
      emptyOption.style.cursor = 'not-allowed';
      wideDropdown.appendChild(emptyOption);
    } else {
      const defaultIndex = categorized.wide.findIndex(size => size.width === 1600 && size.height === 1200);
      const selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;
      
      categorized.wide.forEach((size, index) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        if (index === selectedIndex) option.classList.add('selected');
        option.dataset.value = index;
        option.textContent = `${size.width} × ${size.height} (${size.platform})`;
        option.onclick = () => {
          wideText.textContent = option.textContent;
          wideDropdown.style.display = 'none';
          closeAllPreviewDropdowns();
          changePreviewSizeCategory('wide', index.toString());
        };
        wideDropdown.appendChild(option);
      });
      
      wideText.textContent = `${categorized.wide[selectedIndex].width} × ${categorized.wide[selectedIndex].height} (${categorized.wide[selectedIndex].platform})`;
      renderer.setCategoryIndex('wide', selectedIndex, false);
      needsRender = true;
    }
    
    if (!wideBtn.onclick) {
      wideBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllPreviewDropdowns();
        wideDropdown.style.display = wideDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }

  // Обновляем кастомный дропдаун для квадратных форматов
  const squareBtn = document.getElementById('previewSizeSelectSquareBtn');
  const squareText = document.getElementById('previewSizeSelectSquareText');
  const squareDropdown = document.getElementById('previewSizeSelectSquareDropdown');
  
  if (squareBtn && squareText && squareDropdown) {
    squareDropdown.innerHTML = '';
    
    if (!categorized.square.length) {
      squareText.textContent = t('export.preview.noSquare');
      const emptyOption = document.createElement('div');
      emptyOption.className = 'custom-select-option';
      emptyOption.textContent = t('export.preview.noSquare');
      emptyOption.style.opacity = '0.5';
      emptyOption.style.cursor = 'not-allowed';
      squareDropdown.appendChild(emptyOption);
    } else {
      categorized.square.forEach((size, index) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = index;
        option.textContent = `${size.width} × ${size.height} (${size.platform})`;
        option.onclick = () => {
          squareText.textContent = option.textContent;
          squareDropdown.style.display = 'none';
          closeAllPreviewDropdowns();
          changePreviewSizeCategory('square', index.toString());
        };
        squareDropdown.appendChild(option);
      });
      
      if (categorized.square.length > 0) {
        squareText.textContent = `${categorized.square[0].width} × ${categorized.square[0].height} (${categorized.square[0].platform})`;
        renderer.setCategoryIndex('square', 0, false);
        needsRender = true;
      }
    }
    
    if (!squareBtn.onclick) {
      squareBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllPreviewDropdowns();
        squareDropdown.style.display = squareDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }

  // Вызываем render один раз после всех обновлений
  if (needsRender) {
    renderer.render();
  }
};

// Функция для закрытия всех дропдаунов превью
const closeAllPreviewDropdowns = () => {
  const dropdowns = [
    document.getElementById('previewSizeSelectNarrowDropdown'),
    document.getElementById('previewSizeSelectWideDropdown'),
    document.getElementById('previewSizeSelectSquareDropdown')
  ];
  dropdowns.forEach(dropdown => {
    if (dropdown) dropdown.style.display = 'none';
  });
};

// Закрываем дропдауны при клике вне их
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
      closeAllPreviewDropdowns();
      closeAllFontDropdowns();
    }
  });
}

// Обратная совместимость со старым дроплистом
// Функция updateLogoUI теперь импортируется из ./components/logoSelector.js

// updateKVUI теперь импортируется из ./components/kvSelector.js
// updateBgUI теперь импортируется из ./components/backgroundSelector.js

export const selectBgPosition = (position) => {
  updateBgPosition(position);
  updateBgPositionToggle(position);
};

export const selectBgVPosition = (position) => {
  if (!['top', 'center', 'bottom'].includes(position)) {
    console.warn('Некорректное значение для bgVPosition:', position);
    return;
  }
  setKey('bgVPosition', position);
  updateBgVPositionToggle(position);
  renderer.render();
};

export const updatePartnerLogoUI = () => {
  const state = getState();
  const dom = getDom();
  const partnerLogoPreview = document.getElementById('partnerLogoPreviewImg');
  const partnerLogoPlaceholder = document.getElementById('partnerLogoPreviewPlaceholder');
  const partnerLogoSection = document.getElementById('partnerLogoSection');
  const addPartnerLogoBtn = document.getElementById('addPartnerLogoBtn');
  
  if (!partnerLogoPreview || !partnerLogoPlaceholder || !partnerLogoSection || !addPartnerLogoBtn) return;
  
  if (state.partnerLogo) {
    partnerLogoPreview.src = state.partnerLogoFile || '';
    partnerLogoPreview.style.display = 'block';
    partnerLogoPlaceholder.style.display = 'none';
    partnerLogoSection.style.display = 'block';
    addPartnerLogoBtn.style.display = 'none';
  } else {
    partnerLogoPreview.style.display = 'none';
    partnerLogoPlaceholder.style.display = 'block';
    partnerLogoSection.style.display = 'none';
    addPartnerLogoBtn.style.display = 'block';
  }
};

export const handlePartnerLogoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    setKey('partnerLogo', img);
    setKey('partnerLogoFile', dataURL);
    updatePartnerLogoUI();
    renderer.render();
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить логотип партнера.');
  }
};

export const clearPartnerLogo = () => {
  setKey('partnerLogo', null);
  setKey('partnerLogoFile', null);
  updatePartnerLogoUI();
  renderer.render();
};

export const showPartnerLogoSection = () => {
  const partnerLogoSection = document.getElementById('partnerLogoSection');
  const addPartnerLogoBtn = document.getElementById('addPartnerLogoBtn');
  const partnerLogoUpload = document.getElementById('partnerLogoUpload');
  
  if (partnerLogoSection && addPartnerLogoBtn) {
    partnerLogoSection.style.display = 'block';
    addPartnerLogoBtn.style.display = 'none';
    if (partnerLogoUpload) {
      partnerLogoUpload.click();
    }
  }
};

export const refreshMediaPreviews = () => {
  updateLogoUI();
  updatePartnerLogoUI();
  updateKVUI();
  updateBgUI();
};

// updateSizesSummary, renderPresetSizes, renderCustomSizes теперь импортируются из ./components/sizeManager.js
export { 
  updateSizesSummary, 
  renderPresetSizes, 
  renderCustomSizes,
  initializeSizeManager
} from './components/sizeManager.js';

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });

const loadImage = async (src) => {
  // Для data URL используем обычную загрузку
  if (src && src.startsWith('data:')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        console.error(`Failed to load image: ${src}`, error);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }
  
  // Для обычных URL используем кеширование с fallback
  const absoluteUrl = src && !src.startsWith('http') && !src.startsWith('data:')
    ? new URL(src, window.location.origin).href
    : src;
  
  try {
    const cached = await Promise.race([
      loadImageCached(absoluteUrl, {
        useCache: true,
        showBlur: false
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        console.error(`Failed to load image from cache: ${absoluteUrl}`, error);
        // Fallback на прямую загрузку
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = (err) => {
          console.error(`Failed to load image: ${absoluteUrl}`, err);
          reject(new Error(`Failed to load image: ${absoluteUrl}`));
        };
        fallbackImg.src = absoluteUrl;
      };
      img.src = cached.url;
    });
  } catch (error) {
    console.warn('Ошибка загрузки изображения через кеш, используем fallback:', error);
    // Fallback на обычную загрузку
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => {
        console.error(`Failed to load image: ${absoluteUrl}`, err);
        reject(new Error(`Failed to load image: ${absoluteUrl}`));
      };
      img.src = absoluteUrl;
    });
  }
};

const loadImageFile = async (file, target) => {
  try {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    setKey(target, img);
    if (target === 'logo') updateLogoUI();
    if (target === 'kv') updateKVUI();
    if (target === 'bgImage') updateBgUI();
    if (target === 'partnerLogo') updatePartnerLogoUI();
    renderer.render();
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить изображение.');
  }
};

// Функция handleLogoUpload теперь импортируется из ./components/logoSelector.js

// handleKVUpload, handlePairKVUpload, clearKV, selectPreloadedKV, initializeKVDropdown, 
// loadDefaultKV, refreshKVColumns теперь импортируются из ./components/kvSelector.js
// Экспортируем их для обратной совместимости
export { 
  handleKVUpload, 
  handlePairKVUpload, 
  clearKV, 
  selectPreloadedKV, 
  initializeKVDropdown, 
  loadDefaultKV,
  updateKVBorderRadius,
  openKVSelectModal,
  closeKVSelectModal
} from './components/kvSelector.js';

export const handleBgUpload = (event) => {
  handleBgImageUpload(event);
};

// Функция clearLogo теперь импортируется из ./components/logoSelector.js

export const clearBg = () => {
  clearBgImage();
};

// Функция selectPreloadedLogo теперь импортируется из ./components/logoSelector.js

// Все функции для работы со шрифтами теперь импортируются из ./components/fontSelector.js

const updateTitleAlignToggle = (align) => {
  const toggle = document.getElementById('titleAlignToggle');
  if (!toggle) return;
  
  // Устанавливаем значение выключки
  toggle.setAttribute('data-value', align);
  
  // Обновляем опции
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === align) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Принудительно обновляем CSS для слайдера (3 опции)
  // Используем процентные значения как в CSS для точного позиционирования
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider) {
    // Используем те же значения, что и в CSS
    if (align === 'center') {
      slider.style.transform = 'translateX(calc(100% - 2.666667px))';
    } else if (align === 'right') {
      slider.style.transform = 'translateX(calc(200% - 5.333334px))';
    } else {
      slider.style.transform = 'translateX(0)';
    }
  }
};

const updateTitleVPosToggle = (vPos) => {
  const toggle = document.getElementById('titleVPosToggle');
  if (!toggle) return;
  
  // Устанавливаем значение позиции
  toggle.setAttribute('data-value', vPos);
  
  // Обновляем опции
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === vPos) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Принудительно обновляем CSS для слайдера (3 опции)
  // Используем процентные значения как в CSS для точного позиционирования
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider) {
    // Используем те же значения, что и в CSS
    if (vPos === 'center') {
      slider.style.transform = 'translateX(calc(100% - 2.666667px))';
    } else if (vPos === 'bottom') {
      slider.style.transform = 'translateX(calc(200% - 5.333334px))';
    } else {
      // top (по умолчанию)
      slider.style.transform = 'translateX(0)';
    }
  }
};

export const toggleTitleAlign = () => {
  const toggle = document.getElementById('titleAlignToggle');
  if (!toggle) return;
  
  const currentValue = toggle.getAttribute('data-value') || 'left';
  let newValue;
  
  // Циклическое переключение: left -> center -> right -> left
  if (currentValue === 'left') {
    newValue = 'center';
  } else if (currentValue === 'center') {
    newValue = 'right';
  } else {
    newValue = 'left';
  }
  
  // Сразу обновляем визуальное состояние тумблера
  updateTitleAlignToggle(newValue);
  
  // Затем обновляем состояние приложения
  selectTitleAlign(newValue);
};

export const toggleTitleVPos = () => {
  const toggle = document.getElementById('titleVPosToggle');
  if (!toggle) return;
  
  const currentValue = toggle.getAttribute('data-value') || 'top';
  let newValue;
  
  // Циклическое переключение: top -> center -> bottom -> top
  if (currentValue === 'top') {
    newValue = 'center';
  } else if (currentValue === 'center') {
    newValue = 'bottom';
  } else {
    newValue = 'top';
  }
  
  // Сразу обновляем визуальное состояние тумблера
  updateTitleVPosToggle(newValue);
  
  // Затем обновляем состояние приложения
  selectTitleVPos(newValue);
};

export const selectTitleAlign = (align) => {
  setKey('titleAlign', align);
  updateTitleAlignToggle(align);
  renderer.render();
};

export const selectTitleVPos = (vPos) => {
  setKey('titleVPos', vPos);
  updateTitleVPosToggle(vPos);
  renderer.render();
};

export const selectLogoPos = (pos) => {
  setKey('logoPos', pos);
  updateLogoPosToggle(pos);
  renderer.render();
};

export const selectKVPosition = (position) => {
  if (!['left', 'center', 'right'].includes(position)) {
    console.warn('Некорректное значение для kvPosition:', position);
    return;
  }
  setKey('kvPosition', position);
  updateKVPositionToggle(position);
  renderer.render();
};

const updateLogoToggle = (language) => {
  const toggle = document.getElementById('logoLangToggle');
  if (!toggle) return;
  
  // Устанавливаем значение языка
  toggle.setAttribute('data-value', language);
  
  // Обновляем опции
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === language) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Принудительно обновляем CSS для слайдера
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider) {
    if (language === 'kz') {
      slider.style.transform = 'translateX(calc(100% - 4px))';
    } else {
      slider.style.transform = 'translateX(0)';
    }
  }
  
  // Также обновляем класс на самом тумблере для CSS селектора
  toggle.classList.remove('lang-ru', 'lang-kz');
  toggle.classList.add(`lang-${language}`);
};

const updateLogoPosToggle = (pos) => {
  const toggle = document.getElementById('logoPosToggle');
  if (!toggle) return;
  
  // Устанавливаем значение позиции
  toggle.setAttribute('data-value', pos);
  
  // Обновляем опции
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === pos) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Принудительно обновляем CSS для слайдера
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider) {
    if (pos === 'center') {
      slider.style.transform = 'translateX(calc(100% - 4px))';
    } else {
      slider.style.transform = 'translateX(0)';
    }
  }
};

const updateKVPositionToggle = (position) => {
  const toggle = document.getElementById('kvPositionToggle');
  if (!toggle) return;
  
  // Устанавливаем значение позиции
  toggle.setAttribute('data-value', position);
  
  // Обновляем опции
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === position) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Принудительно обновляем CSS для слайдера (3 опции)
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider) {
    if (position === 'center') {
      slider.style.transform = 'translateX(calc(100% - 2.666667px))';
    } else if (position === 'right') {
      slider.style.transform = 'translateX(calc(200% - 5.333334px))';
    } else {
      slider.style.transform = 'translateX(0)';
    }
  }
};

const updateBgPositionToggle = (position) => {
  const toggle = document.getElementById('bgPositionToggle');
  if (!toggle) return;
  
  // Устанавливаем значение позиции
  toggle.setAttribute('data-value', position);
  
  // Обновляем опции
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === position) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Принудительно обновляем CSS для слайдера (3 опции)
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider) {
    if (position === 'center') {
      slider.style.transform = 'translateX(calc(100% - 2.666667px))';
    } else if (position === 'right') {
      slider.style.transform = 'translateX(calc(200% - 5.333334px))';
    } else {
      slider.style.transform = 'translateX(0)';
    }
  }
};

const updateBgVPositionToggle = (position) => {
  const toggle = document.getElementById('bgVPositionToggle');
  if (!toggle) return;
  
  // Устанавливаем значение позиции
  toggle.setAttribute('data-value', position);
  
  // Обновляем опции
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === position) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Принудительно обновляем позицию слайдера через inline стили для гарантированного отображения
  // Используем requestAnimationFrame для применения после reflow
  requestAnimationFrame(() => {
    const slider = toggle.querySelector('.toggle-switch-slider');
    if (slider) {
      // Используем те же значения, что и в CSS
      if (position === 'center') {
        slider.style.transform = 'translateX(calc(100% - 2.666667px))';
      } else if (position === 'bottom') {
        slider.style.transform = 'translateX(calc(200% - 5.333334px))';
      } else {
        // top (по умолчанию) - явно устанавливаем в 0
        slider.style.transform = 'translateX(0)';
      }
    }
  });
};

export const toggleLogoPos = () => {
  const state = getState();
  const currentPos = state.logoPos || 'left';
  const newPos = currentPos === 'left' ? 'center' : 'left';
  selectLogoPos(newPos);
};

export const toggleLogoLanguage = async () => {
  const toggle = document.getElementById('logoLangToggle');
  if (!toggle) return;
  
  const currentLang = toggle.getAttribute('data-value') || 'ru';
  const newLang = currentLang === 'ru' ? 'kz' : 'ru';
  
  // Сразу обновляем визуальное состояние тумблера
  updateLogoToggle(newLang);
  
  // Затем обновляем состояние приложения
  await selectLogoLanguage(newLang);
};

export const selectLogoLanguage = async (language) => {
  const state = getState();
  setKey('logoLanguage', language);
  updateChipGroup('logo-lang', language);
  
  // Автоматически переключаем лигал в зависимости от языка логотипа
  if (language === 'kz') {
    // При выборе KZ устанавливаем лигал KZ
    const legalKZ = state.legalKZ || '*Жарнама / Реклама. ТОО "Y. Izdeu men Jarnama", регистрационный номер:170240015454 Сайт: https://practicum.yandex.kz/.';
    setKey('legal', legalKZ);
    // Обновляем textarea в UI
    const legalTextarea = document.getElementById('legal');
    if (legalTextarea) {
      legalTextarea.value = legalKZ;
    }
  } else if (language === 'ru') {
    // При выборе RU устанавливаем лигал RU
    const legalRU = 'Рекламодатель АНО ДПО «Образовательные технологии Яндекса», действующая на основании лицензии N° ЛО35-01298-77/00185314 от 24 марта 2015 года, 119021, г. Москва, ул. Тимура Фрунзе, д. 11, к. 2. ОГРН 1147799006123 Сайт: https://practicum.yandex.ru/';
    setKey('legal', legalRU);
    // Обновляем textarea в UI
    const legalTextarea = document.getElementById('legal');
    if (legalTextarea) {
      legalTextarea.value = legalRU;
    }
  }
  
  // Обновляем тумблер сразу, чтобы визуально было видно изменение
  updateLogoToggle(language);
  
  // Если заданы дефолты по вариантам (RU/KZ), после setKey applyDerivedState уже подставил logoSelected — загружаем его
  const nextState = getState();
  if (nextState.defaultLogoRU || nextState.defaultLogoKZ) {
    if (nextState.logoSelected) {
      await selectPreloadedLogo(nextState.logoSelected);
    }
  } else if (state.logoSelected && state.logoSelected.startsWith('logo/')) {
    const parts = state.logoSelected.split('/');
    if (parts.length >= 4 && (parts[1] === 'black' || parts[1] === 'white')) {
      const targetFolder = parts[1]; // black или white
      const logoType = parts[3]; // main.svg, main_mono.svg, long.svg
      const newLogoPath = `logo/${targetFolder}/${language}/${logoType}`;
      
      // Обновляем логотип на новый язык
      await selectPreloadedLogo(newLogoPath);
      
      // После загрузки логотипа снова обновляем тумблер (на случай, если что-то сбросилось)
      updateLogoToggle(language);
    }
  }
  
  // Если модальное окно открыто, обновляем колонки
  const logoModalOverlay = document.getElementById('logoSelectModalOverlay');
  if (logoModalOverlay && logoModalOverlay.style.display === 'block') {
    // Перерисовываем колонки с учетом нового языка
    const cachedStructure = cachedLogosStructure;
    if (cachedStructure) {
      // Сбрасываем выбранные папки для перерисовки
      selectedLogoFolder1 = null;
      selectedLogoFolder2 = null;
      selectedLogoFolder3 = null;
      renderLogoColumn1(cachedStructure);
    }
  }
  
  // Финальное обновление тумблера для надежности
  updateLogoToggle(language);
  
  renderer.render();
};

export const selectLayoutMode = (mode) => {
  setKey('layoutMode', mode);
  updateChipGroup('layout-mode', mode);
  updateLayoutPreviewMock();
  renderer.render();
};

const updateProModeTags = (enabled) => {
  const modeTags = document.querySelectorAll('.mode-tag');
  if (!modeTags || modeTags.length === 0) return;
  
  // Обновляем активное состояние тегов
  modeTags.forEach(tag => {
    const mode = tag.dataset.mode;
    if ((mode === 'on' && enabled) || (mode === 'off' && !enabled)) {
      tag.classList.add('active');
      tag.style.background = 'var(--accent-color, #027EF2)';
      tag.style.color = 'white';
      tag.style.borderColor = 'var(--accent-color, #027EF2)';
    } else {
      tag.classList.remove('active');
      tag.style.background = 'var(--bg-secondary)';
      tag.style.color = 'var(--text-primary)';
      tag.style.borderColor = 'var(--border-color)';
    }
  });
};

const updateProModeToggle = (enabled) => {
  updateProModeTags(enabled);
  const select = document.getElementById('logoAssetsDefaultProMode');
  if (select) {
    select.value = enabled ? 'true' : 'false';
  }
};

export const toggleProMode = async () => {
  // Получаем текущее состояние из state
  const state = getState();
  const currentProMode = state.proMode || false;
  const newProMode = !currentProMode;
  
  // Применяем новое состояние
  await selectProMode(newProMode);
};

export const selectProModeByTag = async (mode) => {
  // mode может быть 'on', 'off' или другие режимы в будущем
  if (mode === 'on' || mode === 'off') {
    const enabled = mode === 'on';
    await selectProMode(enabled);
  } else {
    // Для будущих режимов можно добавить свою логику
    console.log('Режим не реализован:', mode);
  }
};

export const selectProMode = async (enabled) => {
  const state = getState();
  setKey('proMode', enabled);
  
  // Обновляем визуальное состояние тегов
  updateProModeTags(enabled);
  
  if (enabled) {
    // При включении PRO режима применяем все настройки
    // 1. Логотип меняется на logo/white/pro/mono.svg
    await selectPreloadedLogo('logo/white/pro/mono.svg');
    
    // 2. Фон ставится из assets/pro/bg/shape=triangle, inside=green, theme=dark.webp
    await selectPreloadedBG('assets/pro/bg/shape=triangle, inside=green, theme=dark.webp');
    
    // Ждем немного, чтобы фон успел загрузиться
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 3. Затемнение градиентом убирается (0%)
    setKey('textGradientOpacity', 0);
    const dom = getDom();
    if (dom.textGradientOpacity) {
      dom.textGradientOpacity.value = 0;
    }
    if (dom.textGradientOpacityValue) {
      dom.textGradientOpacityValue.textContent = '0%';
    }
    
    // Сохраняем исходный размер заголовка перед увеличением
    const currentTitleSize = state.titleSize || 8;
    setKey('titleSizeBeforePro', currentTitleSize);
    
    // Увеличиваем размер заголовка на 10%
    const newTitleSize = parseFloat((currentTitleSize * 1.1).toFixed(2));
    setKey('titleSize', newTitleSize);
    
    // Обновляем UI для размера заголовка
    const domTitleSize = getDom();
    if (domTitleSize.titleSize) {
      domTitleSize.titleSize.value = newTitleSize;
    }
    if (domTitleSize.titleSizeValue) {
      domTitleSize.titleSizeValue.textContent = `${newTitleSize}%`;
    }
    
    // 4. Заголовок всегда капсом с YS Display Cond Regular
    setKey('titleTransform', 'uppercase');
    setKey('titleFontFamily', 'YS Display Cond');
    setKey('titleWeight', 'Regular');
    
    // Определяем цвет типографики в зависимости от темы фона
    // Проверяем, темный ли фон (по умолчанию dark)
    const updatedState = getState();
    const activePairIndex = updatedState.activePairIndex || 0;
    const pairs = updatedState.titleSubtitlePairs || [];
    const activePair = pairs[activePairIndex] || {};
    const bgImage = activePair.bgImageSelected || updatedState.bgImage || updatedState.bgImageSelected;
    // Проверяем путь фона на наличие theme=dark или theme=light
    const bgImagePath = typeof bgImage === 'string' ? bgImage : (bgImage?.src || '');
    const isDarkTheme = !bgImagePath || bgImagePath.includes('theme=dark');
    const typographyColor = isDarkTheme ? '#DCE5BB' : '#778858';
    
    // 5. Цвета типографики меняются (заголовок, подзаголовок и лигал)
    setKey('titleColor', typographyColor);
    setKey('subtitleColor', typographyColor);
    setKey('legalColor', typographyColor);
    
    // Обновляем UI для цветов
    const dom2 = getDom();
    if (dom2.titleColor) {
      dom2.titleColor.value = typographyColor;
    }
    if (dom2.titleColorHex) {
      dom2.titleColorHex.value = typographyColor;
    }
    if (dom2.subtitleColor) {
      dom2.subtitleColor.value = typographyColor;
    }
    if (dom2.subtitleColorHex) {
      dom2.subtitleColorHex.value = typographyColor;
    }
    if (dom2.legalColor) {
      dom2.legalColor.value = typographyColor;
    }
    if (dom2.legalColorHex) {
      dom2.legalColorHex.value = typographyColor;
    }
    
    // Обновляем предзагруженные цвета для PRO режима
    updatePresetColorsForPro(true, isDarkTheme);
    
    // 6. Подзаголовок остается YS Text Regular, но с новым цветом (уже установлен выше)
    setKey('subtitleFontFamily', 'YS Text');
    setKey('subtitleWeight', 'Regular');
    
    // 7. Легал меняется на новый текст
    const legalPRO = 'Реклама. Рекламодатель: ООО "Яндекс" (ИНН 7736207543). Услуги оказывает АНО ДПО "Образовательные технологии Яндекса", действующая на основании лицензии №Л035-01298-77/00185314 от 24 марта 2015 года, 119021, г. Москва, ул. Тимура Фрунзе, д. 11, к. 2. ОГРН 1147799006123 Сайт: https://practicum.yandex.ru/pro/ *PRO – Про';
    setKey('legal', legalPRO);
    const legalTextarea = document.getElementById('legal');
    if (legalTextarea) {
      legalTextarea.value = legalPRO;
    }
    
    // 8. Визуал по умолчанию ставится pro/assets/1.webp
    await selectPreloadedKV('assets/pro/assets/1.webp');
    setKey('showKV', true);
    const showKVCheckbox = document.getElementById('showKV');
    if (showKVCheckbox) {
      showKVCheckbox.checked = true;
    }
    
    // Обновляем тумблер трансформации заголовка
    const titleTransformToggle = document.getElementById('titleTransformToggleMain');
    if (titleTransformToggle) {
      titleTransformToggle.setAttribute('data-value', 'uppercase');
      const transformOptions = titleTransformToggle.querySelectorAll('.toggle-switch-option');
      transformOptions.forEach(option => {
        if (option.dataset.value === 'uppercase') {
          option.classList.add('active');
        } else {
          option.classList.remove('active');
        }
      });
    }
  } else {
    // При выключении PRO режима полностью восстанавливаем Reskill настройки из дефолтных значений
    const { getDefaultValues } = await import('../state/store.js');
    const defaults = getDefaultValues();
    
    // Восстанавливаем размер заголовка
    const titleSizeBeforePro = state.titleSizeBeforePro || defaults.titleSize || 8;
    setKey('titleSize', titleSizeBeforePro);
    
    // Обновляем UI для размера заголовка
    const domTitleSize = getDom();
    if (domTitleSize.titleSize) {
      domTitleSize.titleSize.value = titleSizeBeforePro;
    }
    if (domTitleSize.titleSizeValue) {
      domTitleSize.titleSizeValue.textContent = `${titleSizeBeforePro}%`;
    }
    
    // Восстанавливаем трансформацию заголовка (убираем uppercase)
    setKey('titleTransform', 'none');
    const titleTransformToggle = document.getElementById('titleTransformToggleMain');
    if (titleTransformToggle) {
      titleTransformToggle.setAttribute('data-value', 'none');
      const transformOptions = titleTransformToggle.querySelectorAll('.toggle-switch-option');
      transformOptions.forEach(option => {
        if (option.dataset.value === 'none') {
          option.classList.add('active');
        } else {
          option.classList.remove('active');
        }
      });
    }
    
    // Восстанавливаем шрифты заголовка и подзаголовка из дефолтных значений
    setKey('titleFontFamily', defaults.fontFamily || 'YS Text');
    setKey('titleWeight', defaults.titleWeight || 'Regular');
    setKey('subtitleFontFamily', defaults.fontFamily || 'YS Text');
    setKey('subtitleWeight', defaults.subtitleWeight || 'Regular');
    
    // Восстанавливаем цвета из дефолтных значений
    setKey('titleColor', defaults.titleColor || '#ffffff');
    setKey('subtitleColor', defaults.subtitleColor || '#e0e0e0');
    setKey('legalColor', defaults.legalColor || '#ffffff');
    
    // Обновляем UI для цветов
    const domColors = getDom();
    if (domColors.titleColor) {
      domColors.titleColor.value = defaults.titleColor || '#ffffff';
    }
    if (domColors.titleColorHex) {
      domColors.titleColorHex.value = defaults.titleColor || '#ffffff';
    }
    if (domColors.subtitleColor) {
      domColors.subtitleColor.value = defaults.subtitleColor || '#e0e0e0';
    }
    if (domColors.subtitleColorHex) {
      domColors.subtitleColorHex.value = defaults.subtitleColor || '#e0e0e0';
    }
    if (domColors.legalColor) {
      domColors.legalColor.value = defaults.legalColor || '#ffffff';
    }
    if (domColors.legalColorHex) {
      domColors.legalColorHex.value = defaults.legalColor || '#ffffff';
    }
    
    // Восстанавливаем предзагруженные цвета для Reskill режима
    updatePresetColorsForPro(false);
    
    // Восстанавливаем лигал из дефолтных значений
    if (state.logoLanguage === 'kz') {
      const legalKZ = defaults.legal || state.legalKZ || '*Жарнама / Реклама. ТОО "Y. Izdeu men Jarnama", регистрационный номер:170240015454 Сайт: https://practicum.yandex.kz/.';
      setKey('legal', legalKZ);
      const legalTextarea = document.getElementById('legal');
      if (legalTextarea) {
        legalTextarea.value = legalKZ;
      }
    } else {
      const legalRU = defaults.legal || 'Рекламодатель АНО ДПО «Образовательные технологии Яндекса», действующая на основании лицензии N° ЛО35-01298-77/00185314 от 24 марта 2015 года, 119021, г. Москва, ул. Тимура Фрунзе, д. 11, к. 2. ОГРН 1147799006123 Сайт: https://practicum.yandex.ru/';
      setKey('legal', legalRU);
      const legalTextarea = document.getElementById('legal');
      if (legalTextarea) {
        legalTextarea.value = legalRU;
      }
    }
    
    // Восстанавливаем логотип: из дефолтов по варианту (defaultLogoRU/KZ) или фиксированный путь
    const s = getState();
    if (s.logoSelected) {
      await selectPreloadedLogo(s.logoSelected);
    } else if (state.logoLanguage === 'kz') {
      await selectPreloadedLogo('logo/white/kz/main.svg');
    } else {
      await selectPreloadedLogo('logo/white/ru/main.svg');
    }
    
    // Восстанавливаем фон из дефолтных значений
    if (defaults.bgImage) {
      await selectPreloadedBG(defaults.bgImage);
    } else {
      // Если дефолтного фона нет, очищаем фон
      const activePairIndex = state.activePairIndex || 0;
      updatePairBgImage(activePairIndex, null);
      setState({ bgImage: null });
    }
    
    // Восстанавливаем размер фона из дефолтных значений
    setKey('bgImageSize', defaults.bgImageSize || 100);
    const domBgSize = getDom();
    if (domBgSize.bgImageSize) {
      domBgSize.bgImageSize.value = defaults.bgImageSize || 100;
    }
    if (domBgSize.bgImageSizeValue) {
      domBgSize.bgImageSizeValue.textContent = `${defaults.bgImageSize || 100}%`;
    }
    
    // Восстанавливаем затемнение градиентом из дефолтных значений
    setKey('textGradientOpacity', defaults.textGradientOpacity || 100);
    const dom = getDom();
    if (dom.textGradientOpacity) {
      dom.textGradientOpacity.value = defaults.textGradientOpacity || 100;
    }
    if (dom.textGradientOpacityValue) {
      dom.textGradientOpacityValue.textContent = `${defaults.textGradientOpacity || 100}%`;
    }
    
    // Восстанавливаем визуал из дефолтных значений
    if (defaults.kvSelected) {
      await selectPreloadedKV(defaults.kvSelected);
    } else {
      // Загружаем дефолтный визуал через loadDefaultKV
      await loadDefaultKV();
    }
    setKey('showKV', true);
    const showKVCheckbox = document.getElementById('showKV');
    if (showKVCheckbox) {
      showKVCheckbox.checked = true;
    }
  }
  
  // Обновляем тумблер
  updateProModeToggle(enabled);
  
  renderer.render();
};

export const initializeProModeToggle = async () => {
  const modeTags = document.querySelectorAll('.mode-tag');
  if (!modeTags || modeTags.length === 0) return;
  
  const state = getState();
  const proMode = state.proMode || false;
  
  // Устанавливаем начальное состояние тегов
  updateProModeTags(proMode);
  
  // Если PRO режим был включен, применяем его настройки
  if (proMode) {
    await selectProMode(true);
  }
  
  // Добавляем обработчики клика на теги
  modeTags.forEach(tag => {
    tag.addEventListener('click', async (e) => {
      e.stopPropagation();
      const mode = tag.dataset.mode;
      await selectProModeByTag(mode);
    });
    
    // Добавляем hover эффект
    tag.addEventListener('mouseenter', () => {
      if (!tag.classList.contains('active')) {
        tag.style.background = 'var(--bg-hover, #1a1a1a)';
      }
    });
    tag.addEventListener('mouseleave', () => {
      if (!tag.classList.contains('active')) {
        tag.style.background = 'var(--bg-secondary)';
      }
    });
  });
};

export const updatePadding = (value) => {
  const numeric = parseInt(value, 10);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для paddingPercent:', value);
    return;
  }
  setKey('paddingPercent', numeric);
  const dom = getDom();
  if (dom.paddingValue) dom.paddingValue.textContent = `${numeric}%`;
  renderer.render();
};

export const updateLogoSize = (value) => {
  const numeric = parseInt(value, 10);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для logoSize:', value);
    return;
  }
  setKey('logoSize', numeric);
  const dom = getDom();
  if (dom.logoSizeValue) dom.logoSizeValue.textContent = `${numeric}%`;
  renderer.render();
};

export const updateTitleSize = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для titleSize:', value);
    return;
  }
  setKey('titleSize', numeric);
  const dom = getDom();
  if (dom.titleSizeValue) {
    dom.titleSizeValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

export const updateSubtitleSize = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для subtitleSize:', value);
    return;
  }
  setKey('subtitleSize', numeric);
  const dom = getDom();
  if (dom.subtitleSizeValue) {
    dom.subtitleSizeValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

export const updateAgeGapPercent = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для ageGapPercent:', value);
    return;
  }
  setKey('ageGapPercent', numeric);
  const dom = getDom();
  if (dom.ageGapPercentValue) {
    dom.ageGapPercentValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

export const updateAgeSize = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для ageSize:', value);
    return;
  }
  setKey('ageSize', numeric);
  const dom = getDom();
  if (dom.ageSizeValue) {
    dom.ageSizeValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

// updateKVBorderRadius теперь импортируется из ./components/kvSelector.js


export const updateLegalSize = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для legalSize:', value);
    return;
  }
  setKey('legalSize', numeric);
  clearTextMeasurementCache();
  const dom = getDom();
  if (dom.legalSizeValue) {
    dom.legalSizeValue.textContent = `${numeric.toFixed(1)}%`;
  }
  renderer.render();
};

export const updateTextGradientOpacity = (value) => {
  const numeric = parseInt(value, 10);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для textGradientOpacity:', value);
    return;
  }
  setKey('textGradientOpacity', numeric);
  const dom = getDom();
  if (dom.textGradientOpacityValue) {
    dom.textGradientOpacityValue.textContent = `${numeric}%`;
  }
  renderer.render();
};
export const updateLegalOpacity = (value) => {
  const numeric = parseInt(value, 10);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для legalOpacity:', value);
    return;
  }
  setKey('legalOpacity', numeric);
  const dom = getDom();
  if (dom.legalOpacityValue) dom.legalOpacityValue.textContent = `${numeric}%`;
  renderer.render();
};

export const updateSubtitleOpacity = (value) => {
  const numeric = parseInt(value, 10);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для subtitleOpacity:', value);
    return;
  }
  setKey('subtitleOpacity', numeric);
  const dom = getDom();
  if (dom.subtitleOpacityValue) {
    dom.subtitleOpacityValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

export const showSection = (sectionId) => {
  // Скрываем все разделы
  document.querySelectorAll('.panel-section').forEach((section) => {
    section.classList.remove('active');
  });
  
  // Показываем выбранный раздел
  const targetSection = document.getElementById(`panel-section-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // Обновляем активный таб
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.remove('active');
  });
  
  const targetTab = document.querySelector(`[data-section="${sectionId}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // После переключения раздела обновляем тумблеры, если они теперь видимы
  const state = getState();
    // Используем requestAnimationFrame для обновления после рендеринга
    requestAnimationFrame(() => {
    if (sectionId === 'title') {
      updateTitleAlignToggle(state.titleAlign || 'left');
      updateTitleVPosToggle(state.titleVPos || 'top');
      const transformType = state.titleTransform || 'none';
      updateTitleTransformToggle(transformType);
    } else if (sectionId === 'subtitle') {
      const transformType = state.subtitleTransform || 'none';
      updateSubtitleTransformToggle(transformType);
    } else if (sectionId === 'legal') {
      const transformType = state.legalTransform || 'none';
      updateLegalTransformToggle(transformType);
    } else if (sectionId === 'background') {
      updateBgPositionToggle(state.bgPosition || 'center');
      updateBgVPositionToggle(state.bgVPosition || 'center');
      // Синхронизируем тип размещения фонового изображения
      const bgSizeSelect = document.getElementById('bgSize');
      if (bgSizeSelect) {
        bgSizeSelect.value = state.bgSize || 'cover';
        // Показываем/скрываем поле размера изображения
        const bgImageSizeGroup = document.getElementById('bgImageSizeGroup');
        if (bgImageSizeGroup) {
          const bgSize = state.bgSize || 'cover';
          if (bgSize === 'tile' || bgSize === 'cover' || bgSize === 'contain') {
            bgImageSizeGroup.style.display = 'block';
          } else {
            bgImageSizeGroup.style.display = 'none';
          }
        }
      }
      // Синхронизируем размер изображения
      const bgImageSizeInput = document.getElementById('bgImageSize');
      const bgImageSizeValue = document.getElementById('bgImageSizeValue');
      if (bgImageSizeInput) {
        const size = state.bgImageSize ?? 100;
        bgImageSizeInput.value = size;
        if (bgImageSizeValue) {
          bgImageSizeValue.textContent = `${Math.round(size)}%`;
        }
      }
    } else if (sectionId === 'logo') {
      updateLogoPosToggle(state.logoPos || 'left');
      updateLogoToggle(state.logoLanguage || 'ru');
    } else if (sectionId === 'kv') {
      updateKVPositionToggle(state.kvPosition || 'center');
    }
  });
};

export const initializeTabs = () => {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    const sectionId = tab.dataset.section;
    if (sectionId) {
      // Удаляем старый onclick и добавляем обработчик события
      tab.removeAttribute('onclick');
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        showSection(sectionId);
      });
    }
  });
};

export const toggleSection = (sectionId) => {
  const contentEl = document.getElementById(`content-${sectionId}`);
  const arrowEl = document.getElementById(`arrow-${sectionId}`);
  if (contentEl && arrowEl) {
    const isCollapsed = contentEl.classList.contains('collapsed');
    contentEl.classList.toggle('collapsed');
    arrowEl.classList.toggle('collapsed');
    // Обновляем символ стрелки
    if (isCollapsed) {
      arrowEl.textContent = '▼';
    } else {
      arrowEl.textContent = '▶';
    }
  }
};

// Нормализует цвет: приводит к верхнему регистру и добавляет # если нужно
const normalizeColor = (color) => {
  let normalized = color.toUpperCase().trim();
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }
  
  // Преобразуем короткую форму в полную (#FFF -> #FFFFFF)
  if (normalized.length === 4) {
    normalized = '#' + normalized[1] + normalized[1] + normalized[2] + normalized[2] + normalized[3] + normalized[3];
  }
  
  return normalized;
};

// Автоматически выбирает логотип на основе цвета текста
export const autoSelectLogoByTextColor = async (textColor) => {
  const normalizedColor = normalizeColor(textColor);
  const state = getState();
  const currentLogo = state.logoSelected || '';
  const bgColor = normalizeColor(state.bgColor || '');
  
  // Определяем, какую папку использовать на основе яркости цвета
  let targetFolder = null;
  
  // Проверяем точные значения для обратной совместимости
  if (normalizedColor === '#1E1E1E' || normalizedColor === '#000000') {
    targetFolder = 'black';
  } else if (normalizedColor === '#FFFFFF') {
    targetFolder = 'white';
  } else {
    // Вычисляем яркость цвета для определения темного или светлого
    const hex = normalizedColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Если яркость меньше 0.5, считаем цвет темным (используем white логотип)
      // Если яркость больше или равна 0.5, считаем цвет светлым (используем black логотип)
      targetFolder = luminance < 0.5 ? 'white' : 'black';
    }
  }
  
  // Если не удалось определить папку, не меняем логотип
  if (!targetFolder) {
    return;
  }
  
  // Для красных и оранжевых фонов используем white/ru/mono.svg
  if (bgColor === '#E84033' || bgColor === '#FF6C26') {
    const newLogoPath = 'logo/white/ru/mono.svg';
    // Если путь не изменился, не обновляем
    if (newLogoPath === currentLogo) {
      return;
    }
    // Выбираем новый логотип
    await selectPreloadedLogo(newLogoPath);
    return;
  }
  
  // Используем выбранный язык из состояния
  const language = state.logoLanguage || 'ru';
  let logoType = 'main.svg'; // по умолчанию
  
  // Парсим текущий путь логотипа: logo/{black|white}/{язык}/{тип}
  if (currentLogo && currentLogo.startsWith('logo/')) {
    const parts = currentLogo.split('/');
    if (parts.length >= 4 && (parts[1] === 'black' || parts[1] === 'white')) {
      const currentLogoType = parts[3]; // main.svg, main_mono.svg, mono.svg, long.svg
      // Если текущий логотип - mono.svg (был установлен для красного/оранжевого фона),
      // возвращаемся к main.svg для других фонов
      if (currentLogoType === 'mono.svg') {
        logoType = 'main.svg';
      } else {
        logoType = currentLogoType; // Сохраняем текущий тип (main.svg, main_mono.svg, long.svg)
      }
    }
  }
  
  // Формируем новый путь к логотипу
  const newLogoPath = `logo/${targetFolder}/${language}/${logoType}`;
  
  // Если путь не изменился, не обновляем
  if (newLogoPath === currentLogo) {
    return;
  }
  
  // Выбираем новый логотип
  await selectPreloadedLogo(newLogoPath);
};

const updateTextColorsForBg = async (bgColor) => {
  const dom = getDom();
  const normalizedBg = normalizeColor(bgColor);
  
  // Определяем цвет текста на основе цвета фона
  // Темный текст (#1E1E1E) для светлых/ярких фонов:
  // #98D2FE, #FFD20A, #FFFFFF
  // Белый текст (#FFFFFF) для темных/насыщенных фонов:
  // #027EF2, #07AB4B, #E84033, #FF6C26, #726BFF, #1E1E1E
  
  let textColor = null;
  
  if (normalizedBg === '#98D2FE' || normalizedBg === '#FFD20A' || normalizedBg === '#FFFFFF') {
    // Светлые/яркие фоны - темный текст
    textColor = '#1E1E1E';
  } else if (
    normalizedBg === '#027EF2' ||
    normalizedBg === '#07AB4B' ||
    normalizedBg === '#E84033' ||
    normalizedBg === '#FF6C26' ||
    normalizedBg === '#726BFF' ||
    normalizedBg === '#1E1E1E'
  ) {
    // Темные/насыщенные фоны - белый текст
    textColor = '#FFFFFF';
  }
  
  // Если цвет фона соответствует одному из предустановленных, обновляем цвета текста
  if (textColor) {
    setKey('titleColor', textColor);
    setKey('subtitleColor', textColor);
    setKey('legalColor', textColor);
    if (dom.titleColor) dom.titleColor.value = textColor;
    if (dom.titleColorHex) dom.titleColorHex.value = textColor;
    if (dom.subtitleColor) dom.subtitleColor.value = textColor;
    if (dom.subtitleColorHex) dom.subtitleColorHex.value = textColor;
    if (dom.legalColor) dom.legalColor.value = textColor;
    if (dom.legalColorHex) dom.legalColorHex.value = textColor;
    // Автоматически выбираем соответствующий логотип
    await autoSelectLogoByTextColor(textColor);
  }
};

/**
 * Обновляет предзагруженные цвета для PRO режима
 */
const updatePresetColorsForPro = (isPro, isDarkTheme = true) => {
  const colorKeys = ['titleColor', 'subtitleColor', 'legalColor'];
  
  colorKeys.forEach(key => {
    // Находим все кнопки предзагруженных цветов для этого ключа
    const buttons = document.querySelectorAll(`button[data-function="updateColorFromPicker"][data-params*="${key}"]`);
    
    buttons.forEach((button, index) => {
      if (isPro) {
        // Для PRO режима: первый цвет - для темного фона (#DCE5BB), второй - для светлого (#778858)
        const proColor = index === 0 ? '#DCE5BB' : '#778858';
        const params = JSON.parse(button.getAttribute('data-params'));
        params[1] = proColor;
        button.setAttribute('data-params', JSON.stringify(params));
        button.style.background = proColor;
        button.setAttribute('title', proColor);
      } else {
        // Для Reskill режима: восстанавливаем стандартные цвета
        const defaultColor = index === 0 ? '#FFFFFF' : '#1E1E1E';
        const params = JSON.parse(button.getAttribute('data-params'));
        params[1] = defaultColor;
        button.setAttribute('data-params', JSON.stringify(params));
        button.style.background = defaultColor;
        button.setAttribute('title', defaultColor);
      }
    });
  });
};

export const updateColorFromPicker = async (key, value) => {
  setKey(key, value);
  const dom = getDom();
  const hexInput = dom[`${key}Hex`];
  if (hexInput) hexInput.value = value;
  if (key === 'bgColor') {
    await updateTextColorsForBg(value);
  }
  // Автоматически выбираем логотип на основе цвета текста (только для заголовка и подзаголовка, не для лигала)
  if (key === 'titleColor' || key === 'subtitleColor') {
    await autoSelectLogoByTextColor(value);
  }
  renderer.render();
};

export const updateColorFromHex = async (key, value) => {
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const dom = getDom();
  if (hexPattern.test(value)) {
    setKey(key, value);
    const colorInput = dom[key];
    if (colorInput) colorInput.value = value;
    if (key === 'bgColor') {
      await updateTextColorsForBg(value);
    }
    // Автоматически выбираем логотип на основе цвета текста
    if (key === 'titleColor' || key === 'subtitleColor') {
      await autoSelectLogoByTextColor(value);
    }
    renderer.render();
  } else {
    const hexInput = dom[`${key}Hex`];
    if (hexInput) {
      hexInput.style.borderColor = '#ff4444';
      setTimeout(() => {
        hexInput.style.borderColor = '';
        hexInput.value = getState()[key];
      }, 1000);
    }
  }
};

// applyPresetBgColor теперь импортируется из ./components/backgroundSelector.js
export { 
  applyPresetBgColor,
  selectPreloadedBG,
  selectPairBG,
  refreshBGColumns,
  initializeBGDropdown,
  openBGSelectModal,
  closeBGSelectModal,
  initializeBackgroundUI
} from './components/backgroundSelector.js';

export const changePreviewSize = (index) => {
  renderer.setCurrentIndex(Number(index) || 0);
};

// changePreviewSizeCategory, toggleSize, toggleCustomSizeAction, removeCustomSizeAction, 
// addCustomSizeAction, updateAddSizeButtonState, addCustomSizeFromInput, 
// selectAllSizesAction, deselectAllSizesAction теперь импортируются из ./components/sizeManager.js
export { 
  changePreviewSizeCategory, 
  toggleSize, 
  toggleCustomSizeAction, 
  removeCustomSizeAction,
  addCustomSizeAction, 
  updateAddSizeButtonState, 
  addCustomSizeFromInput,
  selectAllSizesAction, 
  deselectAllSizesAction,
  togglePlatformSizes
} from './components/sizeManager.js';
export { showSizesAdmin } from './components/sizesAdmin.js';
// Реэкспорт showLogoAssetsAdmin - должен быть после всех импортов
export { showLogoAssetsAdmin } from './components/logoAssetsAdmin.js';

export const togglePlatform = (platform) => {
  togglePlatformSizes(platform);
};

export const handlePresetContainerClick = (event) => {
  const header = event.target.closest('.platform-header');
  if (header) {
    const platform = header.dataset.platform;
    togglePlatform(platform);
    return;
  }

  // Клик по чекбоксу или по его label (label связан через for=id, поэтому чекбокс мог переключиться — синхронизируем состояние)
  let checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox && event.target.tagName === 'LABEL' && event.target.getAttribute('for')) {
    checkbox = document.getElementById(event.target.getAttribute('for'));
  }
  if (checkbox) {
    if (checkbox.dataset.platform !== undefined) {
      toggleSize(checkbox.dataset.platform, Number(checkbox.dataset.index));
    } else if (checkbox.dataset.customId) {
      toggleCustomSizeAction(checkbox.dataset.customId);
    }
  }
};

export const saveSettings = () => {
  savedSettings = saveSettingsSnapshot();
  
  // Сохраняем brandName в localStorage
  const state = getState();
  if (state.brandName) {
    localStorage.setItem('brandName', state.brandName);
  }
  
  alert('Настройки сохранены (изображения исключены, выбор пресетов сохранён)');
};

export const loadSettings = () => {
  if (!savedSettings) {
    alert('Нет сохранённых настроек.');
    return;
  }

  const current = getState();
  const currentLogo = current.logo;
  const currentKV = current.kv;
  const currentBg = current.bgImage;

  applySavedSettings(savedSettings);
  ensurePresetSelection();
  setState({ logo: currentLogo, kv: currentKV, bgImage: currentBg });

  // Сохраняем brandName в localStorage, если он был загружен
  const state = getState();
  if (state.brandName) {
    localStorage.setItem('brandName', state.brandName);
    
    // Обновляем заголовок страницы
    const pageTitle = document.querySelector('.header h1');
    if (pageTitle) {
      // Сохраняем версию при обновлении заголовка
      const versionSpan = pageTitle.querySelector('span.app-version, span[style*="color: var(--text-secondary"]');
      const versionHTML = versionSpan ? versionSpan.outerHTML : '';
      pageTitle.innerHTML = `Practicum AI-Craft${versionHTML ? ' ' + versionHTML : ''}`;
    }
  }

  syncFormFields();
  renderPresetSizes();
  updatePreviewSizeSelect();
  updateLogoUI();
  updateKVUI();
  updateBgUI();
  renderer.render();

  alert('Настройки загружены!');
};

export const resetAll = () => {
  if (!confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) return;
  if (!confirm('Точно сбросить? Это действие нельзя отменить.')) return;
  resetState();
  ensurePresetSelection();
  initializeLogoDropdown();
  initializeExportScaleToggle();
  initializeFontDropdown();
  syncFormFields();
  renderPresetSizes();
  updatePreviewSizeSelect();
  updateLogoUI();
  updateKVUI();
  updateBgUI();
  renderer.render();
};

// Все функции для работы с логотипами теперь импортируются из ./components/logoSelector.js

// Переэкспортируем функции из logoSelector для обратной совместимости
export { 
  updateLogoUI,
  handleLogoUpload,
  clearLogo,
  selectPreloadedLogo,
  refreshLogoColumns, 
  initializeLogoDropdown,
  openLogoSelectModal,
  closeLogoSelectModal
} from './components/logoSelector.js';

export const initializeLogoToggle = () => {
  const toggle = document.getElementById('logoLangToggle');
  if (!toggle) return;
  
  // Удаляем старые обработчики через клонирование
  const newToggle = toggle.cloneNode(true);
  toggle.parentNode.replaceChild(newToggle, toggle);
  const updatedToggle = document.getElementById('logoLangToggle');
  
  // Добавляем обработчик клика
  updatedToggle.addEventListener('click', async (e) => {
    e.stopPropagation();
    await toggleLogoLanguage();
  });
  
  // Инициализируем состояние тумблера
  const state = getState();
  updateLogoToggle(state.logoLanguage || 'ru');
};

// Все функции для работы с логотипами (renderLogoColumn*, buildLogoStructure, populateLogoColumns, openLogoSelectModal, closeLogoSelectModal) 
// теперь находятся в ./components/logoSelector.js
// Переэкспорт refreshLogoColumns и initializeLogoDropdown уже добавлен выше

export const initializeLogoPosToggle = () => {
  const toggle = document.getElementById('logoPosToggle');
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только инициализируем визуальное состояние
  const state = getState();
  updateLogoPosToggle(state.logoPos || 'left');
};

export const initializeTitleAlignToggle = () => {
  const toggle = document.getElementById('titleAlignToggle');
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только инициализируем визуальное состояние
  const state = getState();
  updateTitleAlignToggle(state.titleAlign || 'left');
};

export const initializeTitleVPosToggle = () => {
  const toggle = document.getElementById('titleVPosToggle');
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только инициализируем визуальное состояние
  const state = getState();
  updateTitleVPosToggle(state.titleVPos || 'top');
};

export const initializeKVPositionToggle = () => {
  const toggle = document.getElementById('kvPositionToggle');
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только инициализируем визуальное состояние
  const state = getState();
  updateKVPositionToggle(state.kvPosition || 'center');
};

export const initializeBgPositionToggle = () => {
  const toggle = document.getElementById('bgPositionToggle');
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только инициализируем визуальное состояние
  const state = getState();
  updateBgPositionToggle(state.bgPosition || 'center');
};

export const initializeBgVPositionToggle = () => {
  const toggle = document.getElementById('bgVPositionToggle');
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только инициализируем визуальное состояние
  const state = getState();
  updateBgVPositionToggle(state.bgVPosition || 'center');
};

const updateExportScaleToggle = (scale) => {
  const toggle = document.getElementById('exportScaleToggle');
  if (!toggle) return;
  const clamped = scale === 2 ? 2 : 1;
  toggle.setAttribute('data-value', String(clamped));
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === String(clamped)) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  // Принудительно обновляем CSS для слайдера (2 опции: ×1 и ×2)
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider) {
    if (scale === 2) {
      slider.style.transform = 'translateX(calc(100% - 3px))';
    } else {
      slider.style.transform = 'translateX(0)';
    }
  }
};

export const initializeExportScaleToggle = () => {
  const toggle = document.getElementById('exportScaleToggle');
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только инициализируем визуальное состояние
  const state = getState();
  updateExportScaleToggle(state.exportScale === 2 ? 2 : 1);
};

// Функция initializeLogoDropdown теперь импортируется из ./components/logoSelector.js

const toggleDropdown = (type) => {
  const dropdown = document.getElementById(`${type}SelectDropdown`);
  if (!dropdown) {
    console.warn(`Dropdown ${type}SelectDropdown not found`);
    return;
  }
  
  const computedStyle = window.getComputedStyle(dropdown);
  const isOpen = computedStyle.display !== 'none';
  
  if (isOpen) {
    dropdown.style.display = 'none';
  } else {
    // Закрываем другие dropdown
    document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
      if (dd !== dropdown) dd.style.display = 'none';
    });
    dropdown.style.display = 'block';
  }
};

const closeDropdown = (type) => {
  const dropdown = document.getElementById(`${type}SelectDropdown`);
  if (dropdown) dropdown.style.display = 'none';
};

// Функция updateLogoTriggerText теперь импортируется из ./components/logoSelector.js

// Функции updateFontDropdown, updateCustomFontDropdown, closeAllFontDropdowns, 
// initializeFontDropdown и initializeFontDropdowns теперь импортируются из ./components/fontSelector.js

// Реэкспортируем функции для работы со шрифтами для использования в main.js
export {
  selectFontFamily,
  handleTitleFontUpload,
  handleSubtitleFontUpload,
  handleLegalFontUpload,
  handleAgeFontUpload,
  clearTitleCustomFont,
  clearSubtitleCustomFont,
  clearLegalCustomFont,
  clearAgeCustomFont,
  selectTitleFontFamily,
  selectSubtitleFontFamily,
  selectLegalFontFamily,
  selectAgeFontFamily,
  initializeFontDropdown,
  initializeFontDropdowns
} from './components/fontSelector.js';

// Все функции для работы с KV (renderKVColumn1-3, buildKVStructure, populateKVColumns, 
// openKVSelectModal, closeKVSelectModal, updateKVTriggerText, selectPreloadedKV, 
// initializeKVDropdown, loadDefaultKV) теперь импортируются из ./components/kvSelector.js

// Функции для работы с KV для пар (используются в других местах)
const renderKVColumn1 = (allKV) => {
  const column1 = document.getElementById('kvFolder1Column');
  if (!column1) return;
  
  column1.innerHTML = '';
  const folders1 = Object.keys(allKV).sort();
  
  folders1.forEach((folder1) => {
    const item = document.createElement('div');
    item.className = 'column-item kv-folder1-item';
    item.dataset.folder1 = folder1;
    item.textContent = folder1;
    
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна
      selectedFolder1 = folder1;
      selectedFolder2 = null;
      // Обновляем стили
      document.querySelectorAll('.kv-folder1-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      
      // Обновляем вторую колонку
      renderKVColumn2(allKV);
      // Очищаем третью колонку
      renderKVColumn3([]);
    });
    
    column1.appendChild(item);
  });
  
  // Выбираем первую папку по умолчанию
  if (folders1.length > 0 && !selectedFolder1) {
    selectedFolder1 = folders1[0];
    const firstItem = column1.querySelector(`[data-folder1="${folders1[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      renderKVColumn2(allKV);
    }
  }
};

const renderKVColumn2 = (allKV) => {
  const column2 = document.getElementById('kvFolder2Column');
  if (!column2 || !selectedFolder1) return;
  
  column2.innerHTML = '';
  const folders2 = Object.keys(allKV[selectedFolder1] || {}).sort();
  
  folders2.forEach((folder2) => {
    const item = document.createElement('div');
    item.className = 'column-item kv-folder2-item';
    item.dataset.folder2 = folder2;
    item.textContent = folder2;
    
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна
      selectedFolder2 = folder2;
      // Обновляем стили
      document.querySelectorAll('.kv-folder2-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      
      // Обновляем третью колонку
      const images = allKV[selectedFolder1][selectedFolder2] || [];
      renderKVColumn3(images);
    });
    
    column2.appendChild(item);
  });
  
  // Выбираем первую подпапку по умолчанию
  if (folders2.length > 0 && !selectedFolder2) {
    selectedFolder2 = folders2[0];
    const firstItem = column2.querySelector(`[data-folder2="${folders2[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      const images = allKV[selectedFolder1][selectedFolder2] || [];
      renderKVColumn3(images);
    }
  }
};

// Используем нативный loading="lazy" для прогрессивной загрузки изображений

const renderKVColumn3 = (images) => {
  const column3 = document.getElementById('kvImagesColumn');
  if (!column3) return;
  
  column3.innerHTML = '';
  
  // Определяем активный KV
  const state = getState();
  let activeKVFile = null;
  
  if (currentKVModalPairIndex !== null) {
    // Модальное окно открыто для конкретной пары
    const pairs = state.titleSubtitlePairs || [];
    const pair = pairs[currentKVModalPairIndex];
    if (pair && pair.kvSelected) {
      activeKVFile = pair.kvSelected;
    }
  } else {
    // Модальное окно открыто для обычного KV
    activeKVFile = state.kvSelected || '';
  }
  
  images.forEach((kv, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'preview-item';
    
    const isActive = activeKVFile && kv.file === activeKVFile;
    
    // Добавляем обводку для активного KV
    if (isActive) {
      imgContainer.style.border = '2px solid #027EF2';
      imgContainer.style.borderRadius = '4px';
    } else {
      imgContainer.style.border = '2px solid transparent';
      imgContainer.style.borderRadius = '4px';
    }
    
    const img = document.createElement('img');
    img.alt = kv.name;
    img.src = kv.file;
    
    // Используем нативный loading="lazy" для прогрессивной загрузки
    // Первые 6 изображений и активное загружаем сразу (eager), остальные - лениво
    if (index < 6 || isActive) {
      img.loading = 'eager'; // Загружаем сразу
    } else {
      img.loading = 'lazy'; // Ленивая загрузка
    }
    
    imgContainer.appendChild(img);
    
    imgContainer.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна до выбора
      selectPreloadedKV(kv.file);
      // Закрываем модальное окно после выбора
      closeKVSelectModal();
    });
    
    column3.appendChild(imgContainer);
  });
};

const buildKVStructure = (scannedKV) => {
  // Объединяем с известными KV из констант
  const allKV = { ...AVAILABLE_KV };
  Object.keys(scannedKV).forEach(folder1 => {
    if (!allKV[folder1]) {
      allKV[folder1] = {};
    }
    Object.keys(scannedKV[folder1]).forEach(folder2 => {
      if (!allKV[folder1][folder2]) {
        allKV[folder1][folder2] = [];
      }
      // Добавляем новые файлы
      scannedKV[folder1][folder2].forEach(kv => {
        if (!allKV[folder1][folder2].find(k => k.file === kv.file)) {
          allKV[folder1][folder2].push(kv);
        }
      });
    });
  });
  return allKV;
};

const populateKVColumns = async (forceRefresh = false) => {
  const column1 = document.getElementById('kvFolder1Column');
  if (!column1) return;
  
  // Если уже сканируем, ждем
  if (kvScanning) {
    return;
  }
  
  // Если принудительное обновление, очищаем кэш
  if (forceRefresh) {
    cachedKV = null;
    selectedFolder1 = null;
    selectedFolder2 = null;
  }
  
  // Если есть кэш и не принудительное обновление, используем его
  if (cachedKV && !forceRefresh) {
    renderKVColumn1(cachedKV);
    return;
  }
  
  // Сканируем в фоне
  kvScanning = true;
  const scannedKV = await scanKV();
  
  // Создаем структуру
  const allKV = buildKVStructure(scannedKV);
  
  cachedKV = allKV;
  kvScanning = false;
  
  // Заполняем колонки
  renderKVColumn1(allKV);
};

// refreshKVColumns теперь импортируется из ./components/kvSelector.js
// Но нам нужно обновить renderKVPairs после обновления кэша
// Поэтому оставляем обертку, которая вызывает импортированную функцию
export const refreshKVColumns = async () => {
  await refreshKVColumnsFromModule();
  // Перерисовываем пары после обновления кэша
  renderKVPairs();
};

// openKVSelectModal и closeKVSelectModal теперь импортируются из ./components/kvSelector.js

// initializeKVDropdown, selectPreloadedKV, loadDefaultKV теперь импортируются из ./components/kvSelector.js

// Функции для управления парами заголовок/подзаголовок
export const updateActivePairTitle = (title) => {
  const state = getState();
  const activeIndex = state.activePairIndex || 0;
  updatePairTitle(activeIndex, title);
  renderer.render();
};

export const updateActivePairSubtitle = (subtitle) => {
  const state = getState();
  const activeIndex = state.activePairIndex || 0;
  updatePairSubtitle(activeIndex, subtitle);
  renderer.render();
};

// Функции для преобразования текста в верхний/нижний регистр
export const selectTitleTransform = (transformType) => {
  // Сохраняем выбор в состояние (текст в textarea не меняем)
  setKey('titleTransform', transformType);
  updateTitleTransformToggle(transformType);
  renderer.render();
};

export const selectSubtitleTransform = (transformType) => {
  // Сохраняем выбор в состояние (текст в textarea не меняем)
  setKey('subtitleTransform', transformType);
  updateSubtitleTransformToggle(transformType);
  renderer.render();
};

export const selectLegalTransform = (transformType) => {
  // Сохраняем выбор в состояние (текст в textarea не меняем)
  clearTextMeasurementCache(); // Очищаем кэш измерений текста
  setKey('legalTransform', transformType);
  updateLegalTransformToggle(transformType);
  renderer.render();
};

// Функция для обновления отдельного toggle-switch
const updateSingleTitleTransformToggle = (toggle, transformType) => {
  if (!toggle) return;
  
  toggle.setAttribute('data-value', transformType);
  
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === transformType) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Обновляем позицию слайдера
  // Порядок кнопок в HTML: none (0), uppercase (1), lowercase (2)
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider && toggle.getAttribute('data-options') === '3') {
    if (transformType === 'none') {
      slider.style.transform = 'translateX(0)';
    } else if (transformType === 'uppercase') {
      slider.style.transform = 'translateX(calc(100% - 2.666667px))';
    } else if (transformType === 'lowercase') {
      slider.style.transform = 'translateX(calc(200% - 5.333334px))';
    }
  }
};

// Функции для обновления состояния toggle-switch
export const updateTitleTransformToggle = (transformType) => {
  const toggle = document.getElementById('titleTransformToggle');
  const toggleMain = document.getElementById('titleTransformToggleMain');
  updateSingleTitleTransformToggle(toggle, transformType);
  updateSingleTitleTransformToggle(toggleMain, transformType);
};

// Функция для обновления отдельного toggle-switch подзаголовка
const updateSingleSubtitleTransformToggle = (toggle, transformType) => {
  if (!toggle) return;
  
  toggle.setAttribute('data-value', transformType);
  
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === transformType) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Обновляем позицию слайдера
  // Порядок кнопок в HTML: none (0), uppercase (1), lowercase (2)
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider && toggle.getAttribute('data-options') === '3') {
    if (transformType === 'none') {
      slider.style.transform = 'translateX(0)';
    } else if (transformType === 'uppercase') {
      slider.style.transform = 'translateX(calc(100% - 2.666667px))';
    } else if (transformType === 'lowercase') {
      slider.style.transform = 'translateX(calc(200% - 5.333334px))';
    }
  }
};

export const updateSubtitleTransformToggle = (transformType) => {
  const toggle = document.getElementById('subtitleTransformToggle');
  const toggleMain = document.getElementById('subtitleTransformToggleMain');
  updateSingleSubtitleTransformToggle(toggle, transformType);
  updateSingleSubtitleTransformToggle(toggleMain, transformType);
};

export const updateLegalTransformToggle = (transformType) => {
  const toggle = document.getElementById('legalTransformToggle');
  if (!toggle) return;
  
  toggle.setAttribute('data-value', transformType);
  
  const options = toggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.dataset.value === transformType) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Обновляем позицию слайдера
  // Порядок кнопок в HTML: none (0), uppercase (1), lowercase (2)
  const slider = toggle.querySelector('.toggle-switch-slider');
  if (slider && toggle.getAttribute('data-options') === '3') {
    if (transformType === 'none') {
      slider.style.transform = 'translateX(0)';
    } else if (transformType === 'uppercase') {
      slider.style.transform = 'translateX(calc(100% - 2.666667px))';
    } else if (transformType === 'lowercase') {
      slider.style.transform = 'translateX(calc(200% - 5.333334px))';
    }
  }
};

// Инициализация toggle-switch для преобразования текста
const initializeSingleTitleTransformToggle = (toggleId) => {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только проверяем наличие элемента
};

export const initializeTitleTransformToggle = () => {
  initializeSingleTitleTransformToggle('titleTransformToggle');
  initializeSingleTitleTransformToggle('titleTransformToggleMain');
  
  // Инициализируем состояние
  const state = getState();
  const transformType = state.titleTransform || 'none';
  updateTitleTransformToggle(transformType);
};

// Инициализация toggle-switch для преобразования текста подзаголовка
const initializeSingleSubtitleTransformToggle = (toggleId) => {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только проверяем наличие элемента
};

export const initializeSubtitleTransformToggle = () => {
  initializeSingleSubtitleTransformToggle('subtitleTransformToggle');
  initializeSingleSubtitleTransformToggle('subtitleTransformToggleMain');
  
  // Инициализируем состояние
  const state = getState();
  const transformType = state.subtitleTransform || 'none';
  updateSubtitleTransformToggle(transformType);
};

export const initializeLegalTransformToggle = () => {
  const toggle = document.getElementById('legalTransformToggle');
  if (!toggle) return;
  
  // Обработчики событий обрабатываются через делегирование в eventHandler.js
  // Здесь только инициализируем визуальное состояние
  const state = getState();
  const transformType = state.legalTransform || 'none';
  updateLegalTransformToggle(transformType);
};

// Обратная совместимость с старыми функциями
export const transformTitleText = selectTitleTransform;
export const transformSubtitleText = selectSubtitleTransform;
export const transformLegalText = selectLegalTransform;

export const updatePairTitleDirect = (index, title) => {
  // Обновляем состояние - структура пар не изменится, только текст
  // поэтому renderTitleSubtitlePairs не будет вызван
  updatePairTitle(index, title);
  // Если это активная пара, обновляем только рендер превью
  const state = getState();
  if (index === (state.activePairIndex || 0)) {
    renderer.render();
  }
};

export const updatePairSubtitleDirect = (index, subtitle) => {
  // Обновляем состояние - структура пар не изменится, только текст
  // поэтому renderTitleSubtitlePairs не будет вызван
  updatePairSubtitle(index, subtitle);
  // Если это активная пара, обновляем только рендер превью
  const state = getState();
  if (index === (state.activePairIndex || 0)) {
    renderer.render();
  }
};

// Функции для работы с KV для пар
const populateKVDropdownForPair = async (pairIndex, dropdown) => {
  // Если уже заполнен (больше чем опция "Нет"), не заполняем повторно
  if (dropdown.children.length > 1) {
    return;
  }
  
  // Используем кэш или сканируем
  let allKV = cachedKV;
  if (!allKV) {
    kvScanning = true;
    const scannedKV = await scanKV();
    allKV = { ...AVAILABLE_KV };
    Object.keys(scannedKV).forEach(folder1 => {
      if (!allKV[folder1]) {
        allKV[folder1] = {};
      }
      Object.keys(scannedKV[folder1]).forEach(folder2 => {
        if (!allKV[folder1][folder2]) {
          allKV[folder1][folder2] = [];
        }
        scannedKV[folder1][folder2].forEach(kv => {
          if (!allKV[folder1][folder2].find(k => k.file === kv.file)) {
            allKV[folder1][folder2].push(kv);
          }
        });
      });
    });
    cachedKV = allKV;
    kvScanning = false;
  }
  
  // Заполняем dropdown
  Object.keys(allKV).sort().forEach((folder1) => {
    Object.keys(allKV[folder1]).sort().forEach((folder2) => {
      const groupLabel = document.createElement('div');
      groupLabel.className = 'custom-select-option-group';
      groupLabel.textContent = folder2 === 'root' ? folder1 : `${folder1}/${folder2}`;
      dropdown.appendChild(groupLabel);
      
      allKV[folder1][folder2].forEach((kv) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = kv.file;
        option.innerHTML = `
          <img src="${kv.file}" class="custom-select-option-preview" alt="${kv.name}">
          <span class="custom-select-option-label">${kv.name}</span>
        `;
        option.onclick = async () => {
          await selectPairKV(pairIndex, kv.file);
          closeKVDropdown(pairIndex);
        };
        dropdown.appendChild(option);
      });
    });
  });
};

const toggleKVDropdown = (pairIndex) => {
  const dropdown = document.getElementById(`kvSelectDropdown-${pairIndex}`);
  if (!dropdown) return;
  
  const computedStyle = window.getComputedStyle(dropdown);
  const isOpen = computedStyle.display !== 'none';
  
  if (isOpen) {
    dropdown.style.display = 'none';
  } else {
    // Закрываем другие dropdown
    document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
      if (dd !== dropdown) dd.style.display = 'none';
    });
    dropdown.style.display = 'block';
  }
};

const closeKVDropdown = (pairIndex) => {
  const dropdown = document.getElementById(`kvSelectDropdown-${pairIndex}`);
  if (dropdown) dropdown.style.display = 'none';
};

export const selectPairKV = async (pairIndex, kvFile) => {
  // Обновляем KV для пары
  updatePairKV(pairIndex, kvFile || '');
  
  // Обновляем текст в кнопке
  const kvText = document.getElementById(`kvSelectText-${pairIndex}`);
  if (kvText) {
    let kvDisplayText = kvFile ? 'Выбрать' : 'Выбрать';
    if (kvFile) {
      // Проверяем, является ли это data URL
      if (kvFile.startsWith('data:')) {
        kvDisplayText = 'Загруженное изображение';
      } else {
        // Пытаемся найти имя KV из кэша или используем имя файла
        if (cachedKV) {
          let foundName = null;
          Object.keys(cachedKV).forEach((folder1) => {
            Object.keys(cachedKV[folder1] || {}).forEach((folder2) => {
              const kv = cachedKV[folder1][folder2].find(k => k.file === kvFile);
              if (kv) foundName = kv.name;
            });
          });
          if (foundName) {
            kvDisplayText = foundName;
          } else {
            // Используем имя файла без расширения
            kvDisplayText = kvFile.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
          }
        } else {
          // Используем имя файла без расширения
          kvDisplayText = kvFile.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
        }
      }
    }
    kvText.textContent = kvDisplayText;
  }
  
  // Превью больше не используется, структура изменилась на dropdown + кнопки
  // Если это активная пара, загружаем KV
  const state = getState();
  if (pairIndex === (state.activePairIndex || 0)) {
    if (!kvFile) {
      setState({ kv: null, kvSelected: '' });
      updateKVTriggerText('');
      updateKVUI();
      renderer.render();
      renderKVPairs(); // Обновляем кнопки
      return;
    }
    
    try {
      const img = await loadImage(kvFile);
      setState({ kv: img, kvSelected: kvFile });
      updateKVTriggerText(kvFile);
      updateKVUI();
      renderer.render();
      renderKVPairs(); // Обновляем кнопки
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить KV.');
      setState({ kv: null, kvSelected: '' });
      updateKVTriggerText('');
      updateKVUI();
      renderer.render();
      renderKVPairs(); // Обновляем кнопки
    }
  } else {
    // Обновляем кнопки даже если это не активная пара
    renderKVPairs();
  }
};

const renderKVPairs = () => {
  const state = getState();
  const pairs = state.titleSubtitlePairs || [];
  const activeIndex = state.activePairIndex || 0;
  
  const kvContainer = document.getElementById('kvPairsContainer');
  if (!kvContainer) return;
  
  // Очищаем контейнер
  kvContainer.innerHTML = '';
  
  // Запускаем сканирование KV в фоне, если кэш пуст (для следующего рендеринга)
  if (!cachedKV && !kvScanning) {
    kvScanning = true;
    scanKV().then((scannedKV) => {
      cachedKV = { ...AVAILABLE_KV };
      Object.keys(scannedKV).forEach(folder1 => {
        if (!cachedKV[folder1]) {
          cachedKV[folder1] = {};
        }
        Object.keys(scannedKV[folder1]).forEach(folder2 => {
          if (!cachedKV[folder1][folder2]) {
            cachedKV[folder1][folder2] = [];
          }
          scannedKV[folder1][folder2].forEach(kv => {
            if (!cachedKV[folder1][folder2].find(k => k.file === kv.file)) {
              cachedKV[folder1][folder2].push(kv);
            }
          });
        });
      });
      kvScanning = false;
      // Перерисовываем после заполнения кэша, чтобы обновить имена
      renderKVPairs();
    }).catch((error) => {
      console.error('Ошибка при сканировании KV:', error);
      kvScanning = false;
    });
  }
  
  // Рендерим KV только для неактивных пар (активная пара показывается в блоке выше)
  pairs.forEach((pair, index) => {
    // Пропускаем активную пару, она показывается в основном блоке
    if (index === activeIndex) return;
    
    const isActive = false;
    
    // Элемент для KV этой пары
    const kvItem = document.createElement('div');
    kvItem.className = `form-group form-item ${isActive ? 'active' : ''}`;
    kvItem.setAttribute('data-kv-pair-index', index);
    
    const kvLabel = document.createElement('label');
    kvLabel.className = `form-label mb-sm ${isActive ? 'active' : ''}`;
    kvLabel.style.display = 'block';
    kvLabel.textContent = isActive 
      ? t('kv.label.active', { number: String(index + 1).padStart(2, '0') })
      : t('kv.label', { number: String(index + 1).padStart(2, '0') });
    
    // Создаем кнопку для выбора KV (как для обычного KV - открывает модальное окно)
    const kvSelectBtn = document.createElement('button');
    kvSelectBtn.className = 'btn btn-full mb-sm';
    kvSelectBtn.id = `kvSelectTrigger-${index}`;
    kvSelectBtn.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
    
    const kvText = document.createElement('span');
    kvText.id = `kvSelectText-${index}`;
    
    // Определяем текст для кнопки KV
    let kvDisplayText = 'Выбрать';
    if (pair.kvSelected) {
      // Проверяем, является ли это data URL
      if (pair.kvSelected.startsWith('data:')) {
        kvDisplayText = 'Загруженное изображение';
      } else {
        // Пытаемся найти имя KV из кэша или используем имя файла
        if (cachedKV) {
          let foundName = null;
          Object.keys(cachedKV).forEach((folder1) => {
            Object.keys(cachedKV[folder1] || {}).forEach((folder2) => {
              const kv = cachedKV[folder1][folder2].find(k => k.file === pair.kvSelected);
              if (kv) foundName = kv.name;
            });
          });
          if (foundName) {
            kvDisplayText = foundName;
          } else {
            // Используем имя файла без расширения
            kvDisplayText = pair.kvSelected.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
          }
        } else {
          // Используем имя файла без расширения
          kvDisplayText = pair.kvSelected.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
        }
      }
    }
    kvText.textContent = kvDisplayText;
    
    kvSelectBtn.appendChild(kvText);
    
    // Открываем модальное окно при клике на кнопку
    kvSelectBtn.onclick = async (e) => {
      e.stopPropagation();
      await openKVSelectModal(index);
    };
    
    // Создаем кнопки действий для KV (всегда видны для каждого KV) - под dropdown
    const kvActions = document.createElement('div');
    kvActions.className = 'gap-sm';
    kvActions.style.cssText = 'display: flex; width: 100%;';
    
    // Кнопка "Загрузить" (всегда видна)
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn';
    loadBtn.style.cssText = 'flex: 1;';
    loadBtn.title = 'Загрузить';
    loadBtn.innerHTML = '<span class="material-icons">download</span>';
    loadBtn.onclick = (e) => {
      e.stopPropagation();
      // Создаем временный input для загрузки файла
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
          await handlePairKVUpload(index, file);
        }
        document.body.removeChild(input);
      };
      document.body.appendChild(input);
      input.click();
    };
    
    // Кнопка "Удалить" (всегда видна, но может быть неактивна)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger';
    removeBtn.setAttribute('data-action', 'remove');
    removeBtn.style.cssText = 'flex: 1;';
    removeBtn.title = 'Удалить';
    removeBtn.innerHTML = '<span class="material-icons">delete</span>';
    removeBtn.disabled = !pair.kvSelected;
    removeBtn.onclick = async (e) => {
      e.stopPropagation();
      if (pair.kvSelected) {
        await selectPairKV(index, '');
      }
    };
    
    kvActions.appendChild(loadBtn);
    kvActions.appendChild(removeBtn);
    
    kvItem.appendChild(kvLabel);
    kvItem.appendChild(kvSelectBtn);
    kvItem.appendChild(kvActions);
    
    kvContainer.appendChild(kvItem);
  });
};

const renderTitleSubtitlePairs = () => {
  const state = getState();
  const pairs = state.titleSubtitlePairs || [];
  const activeIndex = state.activePairIndex || 0;
  
  const titleContainer = document.getElementById('titlePairsContainer');
  const subtitleContainer = document.getElementById('subtitlePairsContainer');
  
  if (!titleContainer || !subtitleContainer) return;
  
  // Сохраняем фокус и позицию курсора перед перерисовкой
  const activeElement = document.activeElement;
  let savedFocus = null;
  let savedSelectionStart = null;
  let savedSelectionEnd = null;
  let savedValue = null;
  
  if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') && 
      (activeElement.id.startsWith('title-') || activeElement.id.startsWith('subtitle-'))) {
    savedFocus = activeElement.id;
    savedSelectionStart = activeElement.selectionStart;
    savedSelectionEnd = activeElement.selectionEnd;
    savedValue = activeElement.value;
  }
  
  // Очищаем контейнеры
  titleContainer.innerHTML = '';
  subtitleContainer.innerHTML = '';
  
  // Рендерим пары заголовков
  pairs.forEach((pair, index) => {
    const isActive = index === activeIndex;
    
    // Создаем header с label и кнопкой для заголовка
    const titleHeader = document.createElement('div');
    titleHeader.className = 'form-header';
    if (isActive) titleHeader.classList.add('active');
    
    const titleLabel = document.createElement('label');
    titleLabel.className = `form-label ${isActive ? 'active' : ''}`;
    titleLabel.textContent = isActive
      ? t('title.label.active', { number: String(index + 1).padStart(2, '0') })
      : t('title.label', { number: String(index + 1).padStart(2, '0') });
    titleLabel.onclick = () => setActiveTitlePair(index);
    
    const titleButtons = document.createElement('div');
    titleButtons.className = 'gap-sm';
    titleButtons.style.cssText = 'display: flex; align-items: center;';
    
    if (pairs.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-small btn-danger';
      removeBtn.style.cssText = 'min-width: 32px;';
      removeBtn.title = 'Удалить';
      removeBtn.innerHTML = '<span class="material-icons" style="font-size: 18px;">remove</span>';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeTitleSubtitlePairAction(index);
      };
      titleButtons.appendChild(removeBtn);
    }
    
    titleHeader.appendChild(titleLabel);
    titleHeader.appendChild(titleButtons);
    
    // Создаем textarea для заголовка
    const titleTextarea = document.createElement('textarea');
    titleTextarea.id = `title-${index}`;
    titleTextarea.className = 'form-textarea';
    titleTextarea.value = pair.title || '';
    titleTextarea.oninput = (e) => {
      updatePairTitleDirect(index, e.target.value);
    };
    titleTextarea.onfocus = async () => {
      const state = getState();
      // Устанавливаем активную пару только если она еще не активна
      if (index !== (state.activePairIndex || 0)) {
        await setActivePairIndex(index);
        // Обновляем UI после переключения пары
        syncFormFields();
        renderer.render();
      }
    };
    
    // Добавляем заголовок напрямую в контейнер
    titleContainer.appendChild(titleHeader);
    titleContainer.appendChild(titleTextarea);
    
    // Создаем header с label и кнопкой для подзаголовка
    const subtitleHeader = document.createElement('div');
    subtitleHeader.className = 'form-header';
    if (isActive) subtitleHeader.classList.add('active');
    
    const subtitleLabel = document.createElement('label');
    subtitleLabel.className = `form-label ${isActive ? 'active' : ''}`;
    subtitleLabel.textContent = isActive
      ? t('subtitle.label.active', { number: String(index + 1).padStart(2, '0') })
      : t('subtitle.label', { number: String(index + 1).padStart(2, '0') });
    subtitleLabel.onclick = () => setActiveTitlePair(index);
    
    const subtitleButtons = document.createElement('div');
    subtitleButtons.className = 'gap-sm';
    subtitleButtons.style.cssText = 'display: flex;';
    
    if (pairs.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-small btn-danger';
      removeBtn.style.cssText = 'min-width: 32px;';
      removeBtn.title = 'Удалить';
      removeBtn.innerHTML = '<span class="material-icons" style="font-size: 18px;">remove</span>';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeTitleSubtitlePairAction(index);
      };
      subtitleButtons.appendChild(removeBtn);
    }
    
    subtitleHeader.appendChild(subtitleLabel);
    if (pairs.length > 1) {
      subtitleHeader.appendChild(subtitleButtons);
    }
    
    // Создаем textarea для подзаголовка
    const subtitleTextarea = document.createElement('textarea');
    subtitleTextarea.id = `subtitle-${index}`;
    subtitleTextarea.className = 'form-textarea';
    subtitleTextarea.value = pair.subtitle || '';
    subtitleTextarea.oninput = (e) => {
      updatePairSubtitleDirect(index, e.target.value);
    };
    subtitleTextarea.onfocus = async () => {
      const state = getState();
      // Устанавливаем активную пару только если она еще не активна
      if (index !== (state.activePairIndex || 0)) {
        await setActivePairIndex(index);
        // Обновляем UI после переключения пары
        syncFormFields();
        renderer.render();
      }
    };
    
    // Добавляем подзаголовок напрямую в контейнер
    subtitleContainer.appendChild(subtitleHeader);
    subtitleContainer.appendChild(subtitleTextarea);
    
    // Создаем функцию для создания дивайдера с кнопкой
    const createDivider = (includeButton) => {
      const divider = document.createElement('div');
      divider.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 12px 0;';
      
      const dividerLine = document.createElement('div');
      dividerLine.style.cssText = 'flex: 1; height: 1px; background: #2a2d35;';
      divider.appendChild(dividerLine);
      
      if (includeButton) {
        const tooltipWrapper = document.createElement('div');
        tooltipWrapper.className = 'tooltip-wrapper';
        
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-tiny';
        addBtn.innerHTML = `<span class="material-icons" style="font-size: 16px; margin-right: 4px;">add</span>${t('common.add')}`;
        addBtn.onclick = (e) => {
          e.stopPropagation();
          addTitleSubtitlePairAction();
        };
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = 'Добавьте еще варианы для заголовка и подзаголовка с отдельным Визуал. Экспорт всех макетов за раз создаст несколько папок с ресайзами для разных заголовков и Визуал';
        
        // Позиционирование tooltip при наведении
        tooltipWrapper.addEventListener('mouseenter', () => {
          const rect = addBtn.getBoundingClientRect();
          tooltip.style.left = `${rect.right + 8}px`;
          tooltip.style.top = `${rect.top + rect.height / 2}px`;
          tooltip.style.transform = 'translateY(-50%)';
        });
        
        tooltipWrapper.appendChild(addBtn);
        tooltipWrapper.appendChild(tooltip);
        divider.appendChild(tooltipWrapper);
      }
      
      divider.appendChild(dividerLine.cloneNode(true));
      return divider;
    };
    
    // Добавляем дивайдер в оба контейнера
    // Кнопка "Добавить" только для первой пары
    const includeButton = index === 0;
    titleContainer.appendChild(createDivider(includeButton));
    subtitleContainer.appendChild(createDivider(includeButton));
  });
  
  // Обновляем текстовые поля активной пары (для обратной совместимости)
  if (pairs.length > 0 && activeIndex < pairs.length) {
    const activePair = pairs[activeIndex];
    const titleInput = document.getElementById('title');
    const subtitleInput = document.getElementById('subtitle');
    if (titleInput) titleInput.value = activePair.title || '';
    if (subtitleInput) subtitleInput.value = activePair.subtitle || '';
  }
  
  // Рендерим KV для каждой пары в разделе KV
  renderKVPairs();
  
  // Восстанавливаем фокус и позицию курсора после перерисовки
  if (savedFocus && savedValue !== null) {
    requestAnimationFrame(() => {
      const element = document.getElementById(savedFocus);
      if (element && element.value === savedValue) {
        // Значение не изменилось, восстанавливаем позицию курсора
        element.focus();
        if (element.setSelectionRange && typeof savedSelectionStart === 'number') {
          const maxPos = element.value.length;
          const start = Math.min(savedSelectionStart, maxPos);
          const end = Math.min(savedSelectionEnd, maxPos);
          element.setSelectionRange(start, end);
        }
      } else if (element) {
        // Значение изменилось, просто фокусируемся
        element.focus();
      }
    });
  }
};

export const setActiveTitlePair = async (index) => {
  await setActivePairIndex(index);
  // Обновляем UI после переключения пары
  syncFormFields();
  renderer.render();
  
  // Загружаем KV и фоновое изображение для активной пары
  const state = getState();
  const pairs = state.titleSubtitlePairs || [];
  const activePair = pairs[index];
  
  // Загружаем KV
  if (activePair && activePair.kvSelected) {
    try {
      const img = await loadImage(activePair.kvSelected);
      setState({ kv: img, kvSelected: activePair.kvSelected });
      updateKVTriggerText(activePair.kvSelected);
      updateKVUI();
    } catch (error) {
      console.error('Не удалось загрузить KV для активной пары:', error);
      setState({ kv: null, kvSelected: '' });
      updateKVTriggerText('');
      updateKVUI();
    }
  } else {
    setState({ kv: null, kvSelected: '' });
    updateKVTriggerText('');
    updateKVUI();
  }
  
  // Устанавливаем фоновое изображение из активной пары
  const bgImageSelected = activePair?.bgImageSelected || null;
  if (bgImageSelected) {
    if (typeof bgImageSelected === 'string') {
      // Это путь к файлу, загружаем изображение
      try {
        const img = await loadImage(bgImageSelected);
        setState({ bgImage: img });
      } catch (error) {
        console.error('Не удалось загрузить фоновое изображение для активной пары:', error);
        setState({ bgImage: null });
      }
    } else {
      // Это уже объект Image
      setState({ bgImage: bgImageSelected });
    }
  } else {
    setState({ bgImage: null });
  }
  updateBgUI();
  
  renderTitleSubtitlePairs();
  renderKVPairs();
  syncFormFields();
  renderer.render();
};

export const addTitleSubtitlePairAction = () => {
  const state = getState();
  const oldLength = (state.titleSubtitlePairs || []).length;
  addTitleSubtitlePair();
  
  // Используем requestAnimationFrame для отложенного обновления, чтобы не блокировать UI
  requestAnimationFrame(() => {
    const newState = getState();
    if (newState.titleSubtitlePairs && newState.titleSubtitlePairs.length > oldLength) {
      // Устанавливаем активный индекс - подписчик состояния автоматически обновит UI
      // Не вызываем renderTitleSubtitlePairs и renderKVPairs здесь, так как подписчик сделает это
      setState({ activePairIndex: oldLength });
      
      // Рендерим canvas в следующем кадре, чтобы не блокировать UI
      requestAnimationFrame(() => {
        renderer.render();
      });
    }
  });
};

export const removeTitleSubtitlePairAction = (index) => {
  removeTitleSubtitlePair(index);
  renderTitleSubtitlePairs();
  renderKVPairs();
  syncFormFields();
  renderer.render();
};

export const initializeStateSubscribers = () => {
  let lastPairsStructure = ''; // Сериализованная структура пар (без текста)
  let lastActiveIndex = -1;
  
  const serializePairsStructure = (pairs) => {
    // Сериализуем только ID пар, не текст
    return pairs.map((p, i) => `${i}:${p.id || ''}`).join('|');
  };
  
  let lastBrandName = null;
  
  subscribe(async (state) => {
    syncFormFields();
    
    // Сохраняем brandName в localStorage при изменении
    if (state.brandName && state.brandName !== lastBrandName) {
      localStorage.setItem('brandName', state.brandName);
      lastBrandName = state.brandName;
      
      // Обновляем заголовок страницы
      const pageTitle = document.querySelector('.header h1');
      if (pageTitle) {
        // Сохраняем версию при обновлении заголовка
        const versionSpan = pageTitle.querySelector('span[style*="color: var(--text-secondary"]');
        const versionHTML = versionSpan ? versionSpan.outerHTML : '';
        pageTitle.innerHTML = `Генератор макетов ${state.brandName}${versionHTML ? ' ' + versionHTML : ''}`;
      }
    }
    
    // Перерисовываем только если изменилась структура (количество/ID) пар или активный индекс
    // НЕ перерисовываем при изменении текста
    const currentPairs = state.titleSubtitlePairs || [];
    const currentPairsStructure = serializePairsStructure(currentPairs);
    const currentActiveIndex = state.activePairIndex || 0;
    
    // Если изменился активный индекс, загружаем KV и фоновое изображение для новой активной пары
    // Делаем это асинхронно, чтобы не блокировать UI
    if (currentActiveIndex !== lastActiveIndex && currentActiveIndex >= 0 && currentActiveIndex < currentPairs.length) {
      const activePair = currentPairs[currentActiveIndex];
      
      // Загружаем изображения асинхронно, не блокируя UI
      requestAnimationFrame(async () => {
        // Загружаем KV
        if (activePair && activePair.kvSelected) {
          try {
            const img = await loadImage(activePair.kvSelected);
            setState({ kv: img, kvSelected: activePair.kvSelected });
            updateKVTriggerText(activePair.kvSelected);
          } catch (error) {
            console.error('Не удалось загрузить KV для активной пары:', error);
            setState({ kv: null, kvSelected: '' });
            updateKVTriggerText('');
          }
        } else {
          setState({ kv: null, kvSelected: '' });
          updateKVTriggerText('');
        }
        
        // Устанавливаем фоновое изображение из активной пары
        const bgImageSelected = activePair?.bgImageSelected || null;
        if (bgImageSelected) {
          if (typeof bgImageSelected === 'string') {
            // Это путь к файлу, загружаем изображение
            try {
              const img = await loadImage(bgImageSelected);
              setState({ bgImage: img });
            } catch (error) {
              console.error('Не удалось загрузить фоновое изображение для активной пары:', error);
              setState({ bgImage: null });
            }
          } else {
            // Это уже объект Image
            setState({ bgImage: bgImageSelected });
          }
        } else {
          setState({ bgImage: null });
        }
        updateBgUI();
      });
    }
    
    if (currentPairsStructure !== lastPairsStructure || currentActiveIndex !== lastActiveIndex) {
      renderTitleSubtitlePairs();
      renderKVPairs();
      // Обновляем заголовок KV при смене активной пары или изменении структуры
      updateKVUI();
      lastPairsStructure = currentPairsStructure;
      lastActiveIndex = currentActiveIndex;
    }
  });
  // Инициализируем отображение пар при загрузке
  const initialState = getState();
  lastPairsStructure = serializePairsStructure(initialState.titleSubtitlePairs || []);
  lastActiveIndex = initialState.activePairIndex || 0;
  lastBrandName = initialState.brandName || null;
  renderTitleSubtitlePairs();
  renderKVPairs();
};

// Функция полного обновления всех ассетов (логотипы и KV)
export const refreshAllAssets = async () => {
  // Показываем индикатор загрузки
  const refreshBtn = document.querySelector('[onclick="refreshAllAssets()"]');
  const originalText = refreshBtn ? refreshBtn.textContent : t('common.refresh');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = t('common.refreshing');
  }
  
  try {
    // Обновляем логотипы (очищает кэш и пересканирует)
    await refreshLogoColumns();
    
    // Обновляем KV (очищает кэш и пересканирует)
    await refreshKVColumns();
    
    // Если модальные окна открыты, обновляем их содержимое
    const logoModalOverlay = document.getElementById('logoSelectModalOverlay');
    const kvModalOverlay = document.getElementById('kvSelectModalOverlay');
    
    if (logoModalOverlay?.style.display === 'block') {
      // Модальное окно логотипов открыто - обновляем его содержимое
      await populateLogoColumns(true);
    }
    
    if (kvModalOverlay?.style.display === 'block') {
      // Модальное окно KV открыто - обновляем его содержимое
      await populateKVColumns(true);
    }
    
    // Обновляем превью медиа
    refreshMediaPreviews();
    
    // Показываем уведомление об успехе
    if (refreshBtn) {
      refreshBtn.textContent = t('common.refreshed');
      setTimeout(() => {
        refreshBtn.textContent = originalText;
        refreshBtn.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error('Ошибка при обновлении ассетов:', error);
    if (refreshBtn) {
      refreshBtn.textContent = t('common.error');
      setTimeout(() => {
        refreshBtn.textContent = originalText;
        refreshBtn.disabled = false;
      }, 2000);
    }
    alert('Произошла ошибка при обновлении. Попробуйте еще раз.');
  }
};

/**
 * Открывает модальное окно с гайдом
 */
export const openGuideModal = () => {
  const overlay = document.getElementById('guideModalOverlay');
  if (overlay) {
    overlay.style.display = 'block';
    // Блокируем скролл body
    document.body.style.overflow = 'hidden';
  }
};

/**
 * Закрывает модальное окно с гайдом
 */
export const closeGuideModal = () => {
  const overlay = document.getElementById('guideModalOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    // Разблокируем скролл body
    document.body.style.overflow = '';
  }
};

// Экспортируем функции градиента
export { updateBgGradientType, updateBgGradientAngle, addGradientStop, removeGradientStop };


