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
import { AVAILABLE_LOGOS, AVAILABLE_KV, PRESET_BACKGROUND_COLORS, FONT_WEIGHT_TO_NAME, AVAILABLE_WEIGHTS, DEFAULT_KV_PATH, DEFAULT_PRO_KV_PATH } from '../constants.js';
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
  closeKVSelectModal,
  setKVModalTargetSlot
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
import {
  applyWorkspaceTeamDefaultsLocally,
  getSelectedWorkspaceDepartmentId,
  getWorkspaceLayoutDepartmentEntriesFromLocalBundle,
  resolveWorkspaceDepartmentBundleLocally,
  setSelectedWorkspaceDepartmentId
} from '../utils/workspaceTeamDefaults.js';
let savedSettings = null;
let activeRsyaCropKey = '1600';
let activeRsyaVisualSlot = 0;

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
let rsyaFitResizeBound = false;

let sizesAdminModulePromise = null;
let logoAssetsAdminModulePromise = null;

const getRsyaVisualScaleKey = (slotIndex = 0) => `rsyaKVScale${Math.max(0, Math.min(2, Number(slotIndex) || 0)) + 1}`;

const getRsyaVisualScale = (state, slotIndex = 0) => {
  const key = getRsyaVisualScaleKey(slotIndex);
  const numeric = Number(state?.[key]);
  return Number.isFinite(numeric) ? Math.max(40, Math.min(300, numeric)) : 100;
};

const getSizesAdminModule = async () => {
  if (!sizesAdminModulePromise) {
    sizesAdminModulePromise = import('./components/sizesAdmin.js');
  }
  return sizesAdminModulePromise;
};

const getLogoAssetsAdminModule = async () => {
  if (!logoAssetsAdminModulePromise) {
    logoAssetsAdminModulePromise = import('./components/logoAssetsAdmin.js');
  }
  return logoAssetsAdminModulePromise;
};

// Функции для работы со шрифтами теперь импортируются из ./components/fontSelector.js

const normalizeKVAssetPath = (value) => {
  if (!value || typeof value !== 'string') return value;
  const normalized = value.replace(/(^|\/)assets\/pro\/assets\/0+(\d+)\.(webp|png|jpg|jpeg)$/i, '$1assets/pro/assets/$2.$3');
  if (normalized === 'assets/3d/logos/02.webp') {
    return DEFAULT_KV_PATH;
  }
  return normalized;
};
const SINGLE_PAIR_MODE = true;

const updateChipGroup = (group, value) => {
  document.querySelectorAll(`[data-group="${group}"]`).forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.value === value);
  });
};

const getLegacyDepartmentEntries = () => ([
  { id: 'reskill', name: 'Reskill', slug: 'reskill', isGeneral: false },
  { id: 'pro', name: 'PRO', slug: 'pro', isGeneral: false },
  { id: 'kz', name: 'KZ', slug: 'kz', isGeneral: false }
]);

const getLayoutDepartmentEntries = () => {
  const entries = getWorkspaceLayoutDepartmentEntriesFromLocalBundle();
  return entries.length ? entries : getLegacyDepartmentEntries();
};

const inferLegacyDepartmentId = (state = getState()) => {
  if (state.proMode) return 'pro';
  if ((state.logoLanguage || 'ru') === 'kz') return 'kz';
  return 'reskill';
};

const resolveActiveDepartmentId = (state = getState()) => {
  const entries = getLayoutDepartmentEntries();
  const currentId = String(state.departmentId || '').trim() || getSelectedWorkspaceDepartmentId();
  if (currentId && entries.some((entry) => entry.id === currentId)) {
    return currentId;
  }
  return entries[0]?.id || inferLegacyDepartmentId(state);
};

const renderWorkspaceDepartmentTags = () => {
  const root = document.getElementById('workspaceDepartmentTags');
  const wrapper = root?.closest('.workspace-layout-departments');
  if (!root || !wrapper) return;

  const entries = getLayoutDepartmentEntries();
  const activeDepartmentId = resolveActiveDepartmentId();
  wrapper.style.display = entries.length ? 'flex' : 'none';

  root.innerHTML = '';
  entries.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `workspace-layout-department-tag ui-tag-toggle${entry.id === activeDepartmentId ? ' is-active is-selected' : ''}`;
    button.dataset.departmentId = entry.id;
    button.textContent = entry.name;
    root.appendChild(button);
  });

  if (!root.dataset.workspaceBound) {
    root.dataset.workspaceBound = '1';
    root.addEventListener('click', async (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest('[data-department-id]');
      if (!(button instanceof HTMLButtonElement)) return;
      const departmentId = String(button.dataset.departmentId || '').trim();
      if (!departmentId) return;
      await selectWorkspaceDepartment(departmentId);
    });
  }
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
  const titleOpacity = state.titleOpacity ?? 100;
  if (dom.titleOpacity) dom.titleOpacity.value = titleOpacity;
  if (dom.titleOpacityValue) dom.titleOpacityValue.textContent = `${titleOpacity}%`;
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
    updateCustomWeightDropdown(titleWeightDropdown, titleWeightText, titleFontFamily, titleWeight);
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
    updateCustomWeightDropdown(subtitleWeightDropdown, subtitleWeightText, subtitleFontFamily, subtitleWeight);
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
  if (dom.subtitleGapValue) dom.subtitleGapValue.textContent = `${state.subtitleGap}%`;
  if (dom.titleLogoGap) dom.titleLogoGap.value = state.titleLogoGap ?? 0;
  if (dom.titleLogoGapValue) dom.titleLogoGapValue.textContent = `${state.titleLogoGap ?? 0}%`;

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
    updateCustomWeightDropdown(legalWeightDropdown, legalWeightText, legalFontFamily, legalWeight);
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
  const bgOffsetXInput = document.getElementById('bgOffsetX');
  const bgOffsetXValue = document.getElementById('bgOffsetXValue');
  if (bgOffsetXInput) {
    const offsetX = Math.round(state.bgOffsetX ?? 0);
    bgOffsetXInput.value = offsetX;
    if (bgOffsetXValue) bgOffsetXValue.textContent = `${offsetX}px`;
  }
  const bgOffsetYInput = document.getElementById('bgOffsetY');
  const bgOffsetYValue = document.getElementById('bgOffsetYValue');
  if (bgOffsetYInput) {
    const offsetY = Math.round(state.bgOffsetY ?? 0);
    bgOffsetYInput.value = offsetY;
    if (bgOffsetYValue) bgOffsetYValue.textContent = `${offsetY}px`;
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
  const maxFileSizeValueInput = document.getElementById('maxFileSizeValue');
  if (maxFileSizeValueInput) {
    maxFileSizeValueInput.value = state.maxFileSizeValue || 200;
  }
  const rsyaVisualCountInput = document.getElementById('rsyaVisualCount');
  const rsyaVisualCountValue = document.getElementById('rsyaVisualCountValue');
  if (rsyaVisualCountInput) {
    rsyaVisualCountInput.value = state.rsyaVisualCount || 1;
    if (rsyaVisualCountValue) rsyaVisualCountValue.textContent = String(state.rsyaVisualCount || 1);
  }
  const rsyaKVScaleInput = document.getElementById('rsyaKVScale');
  const rsyaKVScaleValue = document.getElementById('rsyaKVScaleValue');
  if (rsyaKVScaleInput) {
    rsyaKVScaleInput.value = state.rsyaKVScale || 200;
    if (rsyaKVScaleValue) rsyaKVScaleValue.textContent = `${state.rsyaKVScale || 200}%`;
  }
  [0, 1, 2].forEach((slotIndex) => {
    const scaleKey = getRsyaVisualScaleKey(slotIndex);
    const input = document.getElementById(scaleKey);
    const value = document.getElementById(`${scaleKey}Value`);
    const scale = getRsyaVisualScale(state, slotIndex);
    if (input) input.value = scale;
    if (value) value.textContent = `${scale}%`;
  });
  const rsyaKVGapInput = document.getElementById('rsyaKVGap');
  const rsyaKVGapValue = document.getElementById('rsyaKVGapValue');
  if (rsyaKVGapInput) {
    const gap = Number.isFinite(Number(state.rsyaKVGap)) ? Number(state.rsyaKVGap) : 8;
    rsyaKVGapInput.value = gap;
    if (rsyaKVGapValue) rsyaKVGapValue.textContent = String(gap);
  }
  const rsyaKVOffsetXInput = document.getElementById('rsyaKVOffsetX');
  const rsyaKVOffsetXValue = document.getElementById('rsyaKVOffsetXValue');
  if (rsyaKVOffsetXInput) {
    rsyaKVOffsetXInput.value = state.rsyaKVOffsetX || 0;
    if (rsyaKVOffsetXValue) rsyaKVOffsetXValue.textContent = String(state.rsyaKVOffsetX || 0);
  }
  const rsyaKVOffsetYInput = document.getElementById('rsyaKVOffsetY');
  const rsyaKVOffsetYValue = document.getElementById('rsyaKVOffsetYValue');
  if (rsyaKVOffsetYInput) {
    rsyaKVOffsetYInput.value = state.rsyaKVOffsetY || 0;
    if (rsyaKVOffsetYValue) rsyaKVOffsetYValue.textContent = String(state.rsyaKVOffsetY || 0);
  }
  const rsyaCropGridVisibleToggle = document.getElementById('rsyaCropGridVisibleToggle');
  if (rsyaCropGridVisibleToggle) {
    rsyaCropGridVisibleToggle.checked = !!state.rsyaCropGridVisible;
  }
  renderRsyaVisualReorder();

  const fontSelect = dom.fontFamily;
  if (fontSelect) {
    fontSelect.value = state.fontFamily;
  }

  syncChips(state);
  updateChipGroup('layout-mode', state.layoutMode || 'auto');
  updateLogoToggle(state.logoLanguage || 'ru');
  updateProjectModeUI();
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
      const selectedIndex = 0;
      categorized.narrow.forEach((size, index) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        if (index === selectedIndex) option.classList.add('selected');
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
      const selectedIndex = 0;
      categorized.square.forEach((size, index) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        if (index === selectedIndex) option.classList.add('selected');
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

export const handleRsyaKV2Upload = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const dataURL = await readFileAsDataURL(file);
  const img = await loadImage(dataURL);
  setKey('rsyaKV2', img);
  setKey('rsyaKV2Selected', dataURL);
  syncRsyaVisualCount();
  renderRsyaVisualReorder();
  renderer.render();
};

export const handleRsyaKV3Upload = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const dataURL = await readFileAsDataURL(file);
  const img = await loadImage(dataURL);
  setKey('rsyaKV3', img);
  setKey('rsyaKV3Selected', dataURL);
  syncRsyaVisualCount();
  renderRsyaVisualReorder();
  renderer.render();
};

export const clearRsyaKV2 = () => {
  setKey('rsyaKV2', null);
  setKey('rsyaKV2Selected', '');
  syncRsyaVisualCount();
  renderRsyaVisualReorder();
  renderer.render();
};

export const clearRsyaKV3 = () => {
  setKey('rsyaKV3', null);
  setKey('rsyaKV3Selected', '');
  syncRsyaVisualCount();
  renderRsyaVisualReorder();
  renderer.render();
};

export const swapRsyaKV12 = () => {
  const state = getState();
  setState({
    kv: state.rsyaKV2 || state.kv,
    kvSelected: state.rsyaKV2Selected || state.kvSelected,
    rsyaKVScale1: getRsyaVisualScale(state, 1),
    rsyaKV2: state.kv || null,
    rsyaKV2Selected: state.kvSelected || '',
    rsyaKVScale2: getRsyaVisualScale(state, 0)
  });
  renderRsyaVisualReorder();
  renderer.render();
};

export const swapRsyaKV23 = () => {
  const state = getState();
  setState({
    rsyaKV2: state.rsyaKV3 || null,
    rsyaKV2Selected: state.rsyaKV3Selected || '',
    rsyaKVScale2: getRsyaVisualScale(state, 2),
    rsyaKV3: state.rsyaKV2 || null,
    rsyaKV3Selected: state.rsyaKV2Selected || '',
    rsyaKVScale3: getRsyaVisualScale(state, 1)
  });
  renderRsyaVisualReorder();
  renderer.render();
};

const getRsyaVisualSlots = (state) => ([
  { image: state.kv || null, selected: state.kvSelected || '', scale: getRsyaVisualScale(state, 0) },
  { image: state.rsyaKV2 || null, selected: state.rsyaKV2Selected || '', scale: getRsyaVisualScale(state, 1) },
  { image: state.rsyaKV3 || null, selected: state.rsyaKV3Selected || '', scale: getRsyaVisualScale(state, 2) }
]);

const syncRsyaVisualCount = () => {
  const slots = getRsyaVisualSlots(getState());
  const loaded = slots.filter((slot) => !!slot.image).length;
  setKey('rsyaVisualCount', Math.max(1, Math.min(3, loaded || 1)));
};

const renderRsyaVisualReorder = () => {
  const wrap = document.getElementById('rsyaVisualReorder');
  if (!wrap) return;
  const slots = getRsyaVisualSlots(getState());
  const items = wrap.querySelectorAll('.rsya-visual-item');
  const filledCount = slots.filter((slot) => !!(slot?.image || slot?.selected)).length;
  const canReorder = filledCount >= 2;

  wrap.classList.toggle('can-reorder', canReorder);

  items.forEach((item, index) => {
    item.dataset.rsyaVisualSlot = String(index);
    item.classList.toggle('active', index === activeRsyaVisualSlot);

    const slot = slots[index];
    const hasImage = !!slot?.image;
    const previewSrc = slot?.selected || slot?.image?.src || '';
    item.draggable = canReorder;
    item.classList.toggle('reorder-disabled', !canReorder);
    item.classList.toggle('is-filled', hasImage);
    item.style.backgroundImage = hasImage && previewSrc ? `url("${previewSrc}")` : 'none';

    const plus = item.querySelector('.rsya-visual-item-plus');
    if (plus) plus.style.display = hasImage ? 'none' : 'grid';

    const libraryBtn = wrap.querySelector(`.rsya-visual-action-btn[data-rsya-action="library"][data-rsya-visual-slot="${index}"]`);
    if (libraryBtn) libraryBtn.disabled = false;
    const clearBtn = wrap.querySelector(`.rsya-visual-action-btn[data-rsya-action="clear"][data-rsya-visual-slot="${index}"]`);
    if (clearBtn) clearBtn.disabled = !hasImage;
  });
};

const reorderRsyaVisualSlots = (fromIndex, toIndex) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
  const state = getState();
  const slots = getRsyaVisualSlots(state);
  if (fromIndex >= slots.length || toIndex >= slots.length) return;
  const next = [...slots];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  setState({
    kv: next[0].image,
    kvSelected: next[0].selected,
    rsyaKVScale1: next[0].scale,
    rsyaKV2: next[1].image,
    rsyaKV2Selected: next[1].selected,
    rsyaKVScale2: next[1].scale,
    rsyaKV3: next[2].image,
    rsyaKV3Selected: next[2].selected,
    rsyaKVScale3: next[2].scale
  });
  syncRsyaVisualCount();
  renderRsyaVisualReorder();
  renderer.render();
};

const initializeRsyaVisualReorder = () => {
  const wrap = document.getElementById('rsyaVisualReorder');
  if (!wrap || wrap.dataset.rsyaReorderInitialized) return;
  wrap.dataset.rsyaReorderInitialized = 'true';
  let dragFrom = -1;

  const clearDragState = () => {
    wrap.querySelectorAll('.rsya-visual-item').forEach((item) => item.classList.remove('drag-over'));
  };

  wrap.addEventListener('dragstart', (event) => {
    const slots = getRsyaVisualSlots(getState());
    const canReorder = !!(slots[1]?.image || slots[1]?.selected);
    if (!canReorder) return;
    const item = event.target.closest('.rsya-visual-item');
    if (!item) return;
    dragFrom = Number(item.dataset.rsyaVisualSlot);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(dragFrom));
    }
  });

  wrap.addEventListener('dragover', (event) => {
    const slots = getRsyaVisualSlots(getState());
    const canReorder = !!(slots[1]?.image || slots[1]?.selected);
    if (!canReorder) return;
    const item = event.target.closest('.rsya-visual-item');
    if (!item) return;
    event.preventDefault();
    clearDragState();
    item.classList.add('drag-over');
  });

  wrap.addEventListener('drop', (event) => {
    const slots = getRsyaVisualSlots(getState());
    const canReorder = !!(slots[1]?.image || slots[1]?.selected);
    if (!canReorder) return;
    const item = event.target.closest('.rsya-visual-item');
    if (!item) return;
    event.preventDefault();
    const dragTo = Number(item.dataset.rsyaVisualSlot);
    reorderRsyaVisualSlots(dragFrom, dragTo);
    dragFrom = -1;
    clearDragState();
  });

  wrap.addEventListener('dragend', () => {
    dragFrom = -1;
    clearDragState();
  });

  wrap.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('.rsya-visual-action-btn');
    if (actionBtn) {
      const slot = Number(actionBtn.dataset.rsyaVisualSlot);
      const action = actionBtn.dataset.rsyaAction;
      activeRsyaVisualSlot = Math.max(0, Math.min(2, slot));
      setKVModalTargetSlot(activeRsyaVisualSlot);
      renderRsyaVisualReorder();

      if (action === 'library') {
        openKVSelectModal(null, 'rsya-slot');
        return;
      }

      if (action === 'clear') {
        if (slot === 0) {
          clearKV();
          return;
        } else if (slot === 1) {
          clearRsyaKV2();
          return;
        } else {
          clearRsyaKV3();
          return;
        }
      }
    }

    const item = event.target.closest('.rsya-visual-item');
    if (!item) return;
    const slot = Number(item.dataset.rsyaVisualSlot);
    activeRsyaVisualSlot = Math.max(0, Math.min(2, slot));
    setKVModalTargetSlot(activeRsyaVisualSlot);
    renderRsyaVisualReorder();

    const uploadInputId = slot === 0 ? 'kvUpload' : (slot === 1 ? 'rsyaKV2Upload' : 'rsyaKV3Upload');
    const input = document.getElementById(uploadInputId);
    if (input) input.click();
  });

  // Публичный хук для обновления плиток из модулей выбора KV.
  window.__refreshRsyaVisualReorder = () => {
    syncRsyaVisualCount();
    renderRsyaVisualReorder();
  };

  setKVModalTargetSlot(activeRsyaVisualSlot);
  renderRsyaVisualReorder();
};

export const updateRsyaCropPreviews = (sourceCanvas, state) => {
  const cropSection = document.getElementById('rsyaCropPreviewSection');
  if (!cropSection || state?.projectMode !== 'rsya') return;
  if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) return;
  const activeCanvas = document.getElementById('rsyaActivePreviewCanvas');
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const specs = [
    { id: 'rsyaCrop1600', ratio: srcW / srcH, key: '1600' },
    { id: 'rsyaCrop169', ratio: 16 / 9, key: '16:9' },
    { id: 'rsyaCrop321', ratio: 3.2 / 1, key: '3.2:1' },
    { id: 'rsyaCrop43', ratio: 4 / 3, key: '4:3' },
    { id: 'rsyaCrop11', ratio: 1, key: '1:1' },
    { id: 'rsyaCrop34', ratio: 3 / 4, key: '3:4' }
  ];

  specs.forEach(({ id, ratio, key }) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const crop = computeCenteredCropRect(sourceCanvas, key, state);
    if (!crop) return;
    const { sx, sy, cropW, cropH } = crop;
    const outW = 320;
    const outH = Math.round(outW / ratio);
    canvas.width = outW;
    canvas.height = outH;
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, 0, 0, outW, outH);
    const thumb = cropSection.querySelector(`[data-rsya-crop-key="${key}"]`);
    if (thumb) {
      thumb.classList.toggle('active', activeRsyaCropKey === key);
    }
  });

  if (activeCanvas) {
    const activeCtx = activeCanvas.getContext('2d');
    if (activeCtx) {
      const activeSpec = specs.find((s) => s.key === activeRsyaCropKey) || specs[0];
      const crop = computeCenteredCropRect(sourceCanvas, activeSpec.key, state);
      if (!crop) return;
      const { sx, sy, cropW, cropH } = crop;
      activeCanvas.width = cropW;
      activeCanvas.height = cropH;
      activeCtx.clearRect(0, 0, cropW, cropH);
      activeCtx.drawImage(sourceCanvas, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
      drawRsyaCropBoundsOverlay(activeCtx, sourceCanvas, activeSpec.key, state);
      fitRsyaActiveCanvasToContainer(activeCanvas);
    }
  }

  updateRsyaKVOverlay();
};

const drawRsyaCropBoundsOverlay = (ctx, sourceCanvas, activeCropKey, state) => {
  if (!ctx || !sourceCanvas || !state?.rsyaCropGridVisible) return;
  const overlayKeys = ['16:9', '3.2:1', '4:3', '1:1', '3:4'];
  const activeCrop = computeCenteredCropRect(sourceCanvas, activeCropKey, state);
  if (!activeCrop || !activeCrop.cropW || !activeCrop.cropH) return;
  const scaleX = ctx.canvas.width / activeCrop.cropW;
  const scaleY = ctx.canvas.height / activeCrop.cropH;
  const displayWidth = ctx.canvas.clientWidth || ctx.canvas.width;
  const displayScale = ctx.canvas.width / Math.max(1, displayWidth);
  const strokeWidth = Math.max(2, Math.round(displayScale));

  ctx.save();
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = 'rgba(232, 64, 51, 1)';

  overlayKeys.forEach((key) => {
    const crop = computeCenteredCropRect(sourceCanvas, key, state);
    if (!crop) return;
    const x = (crop.sx - activeCrop.sx) * scaleX;
    const y = (crop.sy - activeCrop.sy) * scaleY;
    const w = crop.cropW * scaleX;
    const h = crop.cropH * scaleY;
    const inset = strokeWidth / 2;
    ctx.strokeRect(x + inset, y + inset, Math.max(0, w - strokeWidth), Math.max(0, h - strokeWidth));
  });

  ctx.restore();
};

const fitRsyaActiveCanvasToContainer = (canvas) => {
  if (!canvas || !canvas.width || !canvas.height) return;
  const container = canvas.parentElement;
  if (!container) return;
  const availableW = container.clientWidth;
  const availableH = container.clientHeight;
  if (!availableW || !availableH) return;

  const scale = Math.min(availableW / canvas.width, availableH / canvas.height);
  if (!Number.isFinite(scale) || scale <= 0) return;
  canvas.style.setProperty('width', `${Math.floor(canvas.width * scale)}px`, 'important');
  canvas.style.setProperty('height', `${Math.floor(canvas.height * scale)}px`, 'important');
};

const getRsyaCropRatioByKey = (key, sourceCanvas) => {
  if (key === '16:9') return 16 / 9;
  if (key === '3.2:1') return 3.2 / 1;
  if (key === '4:3') return 4 / 3;
  if (key === '1:1') return 1;
  if (key === '3:4') return 3 / 4;
  return (sourceCanvas?.width && sourceCanvas?.height) ? (sourceCanvas.width / sourceCanvas.height) : (4 / 3);
};

const resolveRsyaCropAnchor = (key, state) => {
  if (key === '1600') {
    return { x: 'center', y: 'center' };
  }
  const layout = state?.rsyaLayout || 'center';
  if (layout === 'left') {
    return { x: 'left', y: 'center' };
  }
  return { x: 'center', y: 'center' };
};

const computeCenteredCropRect = (sourceCanvas, key, state = null) => {
  if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) return null;
  const frame = { x: 0, y: 0, w: sourceCanvas.width, h: sourceCanvas.height };
  const ratio = getRsyaCropRatioByKey(key, sourceCanvas);
  let cropW = frame.w;
  let cropH = Math.round(cropW / ratio);
  if (cropH > frame.h) {
    cropH = frame.h;
    cropW = Math.round(cropH * ratio);
  }
  const anchor = resolveRsyaCropAnchor(key, state || getState());
  const freeX = Math.max(0, frame.w - cropW);
  const freeY = Math.max(0, frame.h - cropH);
  const anchorX = anchor.x === 'left' ? 0 : (anchor.x === 'right' ? 1 : 0.5);
  const anchorY = anchor.y === 'top' ? 0 : (anchor.y === 'bottom' ? 1 : 0.5);
  const sx = Math.max(0, Math.floor(frame.x + freeX * anchorX));
  const sy = Math.max(0, Math.floor(frame.y + freeY * anchorY));
  return { sx, sy, cropW, cropH };
};

const projectMetaToActiveCrop = (meta, sourceCanvas, activeCanvas, cropKey, state = null) => {
  if (!meta || !sourceCanvas || !activeCanvas || !sourceCanvas.width || !sourceCanvas.height || !activeCanvas.width || !activeCanvas.height) {
    return null;
  }
  const crop = computeCenteredCropRect(sourceCanvas, cropKey, state);
  if (!crop) return null;
  const left = Math.max(meta.kvX, crop.sx);
  const top = Math.max(meta.kvY, crop.sy);
  const right = Math.min(meta.kvX + meta.kvW, crop.sx + crop.cropW);
  const bottom = Math.min(meta.kvY + meta.kvH, crop.sy + crop.cropH);
  if (right <= left || bottom <= top) return null;

  const xInCrop = left - crop.sx;
  const yInCrop = top - crop.sy;
  const wInCrop = right - left;
  const hInCrop = bottom - top;
  return {
    x: xInCrop * (activeCanvas.width / crop.cropW),
    y: yInCrop * (activeCanvas.height / crop.cropH),
    w: wInCrop * (activeCanvas.width / crop.cropW),
    h: hInCrop * (activeCanvas.height / crop.cropH)
  };
};

const updateRsyaKVOverlay = (forceVisible = false) => {
  const overlay = document.getElementById('rsyaKVOverlay');
  const sourceCanvas = document.getElementById('previewCanvasWide');
  const activeCanvas = document.getElementById('rsyaActivePreviewCanvas');
  const state = getState();
  if (!overlay || !sourceCanvas || !activeCanvas || state.projectMode !== 'rsya') {
    if (overlay) overlay.style.display = 'none';
    return null;
  }

  const kvMeta = renderer.getRenderMeta()?.kvRenderMeta;
  const projected = projectMetaToActiveCrop(kvMeta, sourceCanvas, activeCanvas, activeRsyaCropKey, state);
  if (!projected || projected.w < 2 || projected.h < 2) {
    overlay.style.display = 'none';
    return null;
  }

  const activeRect = activeCanvas.getBoundingClientRect();
  const parentRect = overlay.parentElement ? overlay.parentElement.getBoundingClientRect() : activeRect;
  const scale = Math.min(activeRect.width / activeCanvas.width, activeRect.height / activeCanvas.height);
  const drawW = activeCanvas.width * scale;
  const drawH = activeCanvas.height * scale;
  const offsetX = (activeRect.width - drawW) / 2;
  const offsetY = (activeRect.height - drawH) / 2;
  const canvasOffsetLeft = activeRect.left - parentRect.left;
  const canvasOffsetTop = activeRect.top - parentRect.top;
  const localLeft = offsetX + projected.x * scale;
  const localTop = offsetY + projected.y * scale;
  const localWidth = projected.w * scale;
  const localHeight = projected.h * scale;

  overlay.style.display = 'block';
  overlay.style.left = `${canvasOffsetLeft + localLeft}px`;
  overlay.style.top = `${canvasOffsetTop + localTop}px`;
  overlay.style.width = `${localWidth}px`;
  overlay.style.height = `${localHeight}px`;
  overlay.classList.toggle('visible', !!forceVisible);
  return {
    left: localLeft,
    top: localTop,
    width: localWidth,
    height: localHeight
  };
};

const getProjectedRsyaVisualSlots = (state = getState()) => {
  const sourceCanvas = document.getElementById('previewCanvasWide');
  const activeCanvas = document.getElementById('rsyaActivePreviewCanvas');
  const kvMeta = renderer.getRenderMeta()?.kvRenderMeta;
  const slotMetas = Array.isArray(kvMeta?.slotMetas) ? kvMeta.slotMetas : [];
  if (!sourceCanvas || !activeCanvas || !slotMetas.length || state.projectMode !== 'rsya') {
    return [];
  }

  const activeRect = activeCanvas.getBoundingClientRect();
  const scale = Math.min(activeRect.width / activeCanvas.width, activeRect.height / activeCanvas.height);
  const drawW = activeCanvas.width * scale;
  const drawH = activeCanvas.height * scale;
  const offsetX = (activeRect.width - drawW) / 2;
  const offsetY = (activeRect.height - drawH) / 2;

  return slotMetas
    .map((slotMeta) => {
      const projected = projectMetaToActiveCrop(slotMeta, sourceCanvas, activeCanvas, activeRsyaCropKey, state);
      if (!projected || projected.w < 2 || projected.h < 2) return null;
      return {
        slotIndex: slotMeta.slotIndex,
        left: offsetX + projected.x * scale,
        top: offsetY + projected.y * scale,
        width: projected.w * scale,
        height: projected.h * scale
      };
    })
    .filter(Boolean);
};

const getRsyaKVCenterSnapOffsets = (state = getState()) => {
  const sourceCanvas = document.getElementById('previewCanvasWide');
  const activeCanvas = document.getElementById('rsyaActivePreviewCanvas');
  const kvMeta = renderer.getRenderMeta()?.kvRenderMeta;
  if (!sourceCanvas || !activeCanvas || !kvMeta) return null;

  const crop = computeCenteredCropRect(sourceCanvas, activeRsyaCropKey, state);
  if (!crop) return null;

  const targetX = crop.sx + (crop.cropW - kvMeta.kvW) / 2;
  const targetY = crop.sy + (crop.cropH - kvMeta.kvH) / 2;

  return {
    x: Math.round((Number(state.rsyaKVOffsetX) || 0) + (targetX - kvMeta.kvX)),
    y: Math.round((Number(state.rsyaKVOffsetY) || 0) + (targetY - kvMeta.kvY))
  };
};

const initializeRsyaCropSelector = () => {
  const cropSection = document.getElementById('rsyaCropPreviewSection');
  if (!cropSection || cropSection.dataset.rsyaCropInitialized) return;
  cropSection.dataset.rsyaCropInitialized = 'true';
  if (!rsyaFitResizeBound) {
    rsyaFitResizeBound = true;
    window.addEventListener('resize', () => {
      const activeCanvas = document.getElementById('rsyaActivePreviewCanvas');
      fitRsyaActiveCanvasToContainer(activeCanvas);
      updateRsyaKVOverlay(false);
    });
  }
  cropSection.addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-rsya-crop-key]');
    if (!thumb) return;
    const key = thumb.dataset.rsyaCropKey || '1600';
    activeRsyaCropKey = key;
    cropSection.querySelectorAll('[data-rsya-crop-key]').forEach((item) => {
      item.classList.toggle('active', item === thumb);
    });
    const sourceCanvas = document.getElementById('previewCanvasWide');
    if (sourceCanvas && sourceCanvas.width && sourceCanvas.height) {
      updateRsyaCropPreviews(sourceCanvas, getState());
    }
  });
};

export const initializeRsyaCanvasDrag = () => {
  const wideCanvas = document.getElementById('previewCanvasWide');
  const activeCanvas = document.getElementById('rsyaActivePreviewCanvas');
  const stage = document.getElementById('rsyaPreviewStage');
  if ((!wideCanvas && !activeCanvas) || (stage && stage.dataset.rsyaDragInitialized)) return;
  if (stage) stage.dataset.rsyaDragInitialized = 'true';

  let drag = null;
  let hoverMode = null;
  const HANDLE_RADIUS = 14;
  const CLICK_DISTANCE_THRESHOLD = 4;
  const CLICK_DURATION_THRESHOLD = 260;
  const canvases = [wideCanvas, activeCanvas].filter(Boolean);

  const detectClickedRsyaVisualSlot = (event) => {
    const state = getState();
    const activePreviewCanvas = document.getElementById('rsyaActivePreviewCanvas');
    if (!activePreviewCanvas) return 0;
    const projectedSlots = getProjectedRsyaVisualSlots(state);
    const overlayRect = updateRsyaKVOverlay(true);
    if (!overlayRect) return 0;

    const activeRect = activePreviewCanvas.getBoundingClientRect();
    const px = event.clientX - activeRect.left;
    const py = event.clientY - activeRect.top;
    if (px < overlayRect.left || px > overlayRect.left + overlayRect.width || py < overlayRect.top || py > overlayRect.top + overlayRect.height) {
      return 0;
    }

    if (projectedSlots.length) {
      const hitSlot = projectedSlots.find((slot) => (
        px >= slot.left
        && px <= slot.left + slot.width
        && py >= slot.top
        && py <= slot.top + slot.height
      ));
      if (hitSlot) {
        return hitSlot.slotIndex;
      }
    }

    const allSlots = [state.kv, state.rsyaKV2, state.rsyaKV3];
    const loadedSlotIndices = allSlots
      .map((img, idx) => (img ? idx : -1))
      .filter((idx) => idx >= 0);
    const visibleCount = Math.max(1, Math.min(3, loadedSlotIndices.length || 1));
    if (visibleCount === 1) return loadedSlotIndices[0] ?? 0;

    const slotSize = overlayRect.height;
    const gap = visibleCount > 1 ? Math.max(0, (overlayRect.width - visibleCount * slotSize) / (visibleCount - 1)) : 0;
    const localX = px - overlayRect.left;
    let nearestVisibleIndex = 0;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < visibleCount; i += 1) {
      const centerX = (slotSize / 2) + i * (slotSize + gap);
      const dist = Math.abs(localX - centerX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestVisibleIndex = i;
      }
    }
    return loadedSlotIndices[nearestVisibleIndex] ?? 0;
  };

  const updateCanvasCursor = (mode) => {
    const cursor = mode === 'resize'
      ? 'nesw-resize'
      : (mode === 'move' ? 'grab' : '');
    canvases.forEach((canvasEl) => {
      canvasEl.style.cursor = cursor;
    });
  };

  const setDraggingCursor = (cursor) => {
    canvases.forEach((canvasEl) => {
      canvasEl.style.cursor = cursor;
    });
  };

  const detectHoverMode = (event) => {
    const activePreviewCanvas = document.getElementById('rsyaActivePreviewCanvas');
    const overlayRect = updateRsyaKVOverlay();
    if (!activePreviewCanvas || !overlayRect) return null;
    const activeRect = activePreviewCanvas.getBoundingClientRect();
    const px = event.clientX - activeRect.left;
    const py = event.clientY - activeRect.top;
    const inside = px >= overlayRect.left && px <= overlayRect.left + overlayRect.width &&
      py >= overlayRect.top && py <= overlayRect.top + overlayRect.height;
    if (!inside) return null;

    const handleCx = overlayRect.left + overlayRect.width;
    const handleCy = overlayRect.top;
    const dist = Math.hypot(px - handleCx, py - handleCy);
    if (dist <= HANDLE_RADIUS) return 'resize';
    return 'move';
  };

  const onMove = (event) => {
    if (!drag) {
      const mode = detectHoverMode(event);
      hoverMode = mode;
      updateCanvasCursor(mode);
      updateRsyaKVOverlay(!!mode);
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > CLICK_DISTANCE_THRESHOLD || Math.abs(dy) > CLICK_DISTANCE_THRESHOLD) {
      drag.moved = true;
    }
    if (drag.type === 'bg') {
      const nextX = Math.round(drag.baseX + dx);
      const nextY = Math.round(drag.baseY + dy);
      setKey('bgOffsetX', nextX);
      setKey('bgOffsetY', nextY);
      const bgOffsetXInput = document.getElementById('bgOffsetX');
      const bgOffsetYInput = document.getElementById('bgOffsetY');
      const bgOffsetXValue = document.getElementById('bgOffsetXValue');
      const bgOffsetYValue = document.getElementById('bgOffsetYValue');
      if (bgOffsetXInput) bgOffsetXInput.value = String(nextX);
      if (bgOffsetYInput) bgOffsetYInput.value = String(nextY);
      if (bgOffsetXValue) bgOffsetXValue.textContent = `${nextX}px`;
      if (bgOffsetYValue) bgOffsetYValue.textContent = `${nextY}px`;
    } else {
      if (drag.type === 'kv-scale') {
        const baseHeight = Math.max(1, drag.baseMetaH || 1);
        const scaledHeight = Math.max(12, baseHeight - dy);
        const nextScale = Math.max(40, Math.min(300, Math.round((drag.baseScale || 100) * (scaledHeight / baseHeight))));
        const scaleKey = drag.scaleKey || 'rsyaKVScale';
        setKey(scaleKey, nextScale);
        const scaleInput = document.getElementById(scaleKey);
        const scaleValue = document.getElementById(`${scaleKey}Value`);
        if (scaleInput) scaleInput.value = String(nextScale);
        if (scaleValue) scaleValue.textContent = `${nextScale}%`;
      } else {
        let nextOffsetX = Math.round(drag.baseX + dx);
        let nextOffsetY = Math.round(drag.baseY + dy);

        if (event.shiftKey) {
          const snapped = getRsyaKVCenterSnapOffsets(state);
          if (snapped) {
            nextOffsetX = snapped.x;
            nextOffsetY = snapped.y;
          }
        }

        setKey('rsyaKVOffsetX', nextOffsetX);
        setKey('rsyaKVOffsetY', nextOffsetY);
        const offsetXInput = document.getElementById('rsyaKVOffsetX');
        const offsetYInput = document.getElementById('rsyaKVOffsetY');
        const offsetXValue = document.getElementById('rsyaKVOffsetXValue');
        const offsetYValue = document.getElementById('rsyaKVOffsetYValue');
        if (offsetXInput) offsetXInput.value = String(nextOffsetX);
        if (offsetYInput) offsetYInput.value = String(nextOffsetY);
        if (offsetXValue) offsetXValue.textContent = String(nextOffsetX);
        if (offsetYValue) offsetYValue.textContent = String(nextOffsetY);
      }
    }
    renderer.render();
  };
  const onUp = async (event) => {
    if (drag && drag.type === 'kv' && !drag.moved && (Date.now() - drag.startedAt) <= CLICK_DURATION_THRESHOLD) {
      const clickedSlot = detectClickedRsyaVisualSlot(event);
      activeRsyaVisualSlot = Math.max(0, Math.min(2, clickedSlot));
      setKVModalTargetSlot(activeRsyaVisualSlot);
      renderRsyaVisualReorder();
      await openKVSelectModal(null, 'preview-canvas');
    }
    drag = null;
    updateCanvasCursor(hoverMode);
    updateRsyaKVOverlay(!!hoverMode);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };

  const onPointerDown = (event) => {
    const state = getState();
    if (state.projectMode !== 'rsya') return;
    const meta = renderer.getRenderMeta()?.kvRenderMeta;
    const mode = detectHoverMode(event);

    if (mode === 'resize') {
      const activeSlotMeta = Array.isArray(meta?.slotMetas)
        ? meta.slotMetas.find((slotMeta) => slotMeta.slotIndex === activeRsyaVisualSlot)
        : null;
      drag = {
        type: 'kv-scale',
        startX: event.clientX,
        startY: event.clientY,
        baseScale: getRsyaVisualScale(state, activeRsyaVisualSlot),
        baseMetaH: activeSlotMeta ? Number(activeSlotMeta.kvH) || 1 : (meta ? Number(meta.kvH) || 1 : 1),
        scaleKey: getRsyaVisualScaleKey(activeRsyaVisualSlot)
      };
      setDraggingCursor('nesw-resize');
    } else if (mode === 'move') {
      drag = {
        type: 'kv',
        moved: false,
        startedAt: Date.now(),
        startX: event.clientX,
        startY: event.clientY,
        baseX: Number(state.rsyaKVOffsetX) || 0,
        baseY: Number(state.rsyaKVOffsetY) || 0
      };
      setDraggingCursor('grabbing');
    } else if (state.bgImage) {
      drag = {
        type: 'bg',
        moved: false,
        startedAt: Date.now(),
        startX: event.clientX,
        startY: event.clientY,
        baseX: Number(state.bgOffsetX) || 0,
        baseY: Number(state.bgOffsetY) || 0
      };
      setDraggingCursor('grabbing');
    } else {
      return;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onPointerLeave = () => {
    if (drag) return;
    hoverMode = null;
    updateCanvasCursor(null);
    updateRsyaKVOverlay(false);
  };

  canvases.forEach((canvasEl) => {
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointermove', onMove);
    canvasEl.addEventListener('pointerleave', onPointerLeave);
  });
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
  if (!getState().proMode) {
    setKey('variantMode', language === 'kz' ? 'kz' : 'reskill');
    updateVariantModeTags(language === 'kz' ? 'kz' : 'reskill');
  }
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

export const selectRsyaLayout = (mode) => {
  const next = mode === 'left' ? 'left' : 'center';
  setKey('rsyaLayout', next);
  setToggleSwitchValue('rsyaLayoutToggle', next);
  renderer.render();
};

const setToggleSwitchValue = (toggleId, value) => {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;
  toggle.setAttribute('data-value', value);
  const options = Array.from(toggle.querySelectorAll('.toggle-switch-option'));
  options.forEach((option) => {
    const isActive = option.dataset.value === value;
    option.classList.toggle('active', isActive);
    option.classList.toggle('is-active', isActive);
  });
};

const updateProjectModeTags = (mode) => {
  setToggleSwitchValue('projectModeToggle', mode);
};

const updateVariantModeTags = (mode) => {
  setToggleSwitchValue('variantModeToggle', mode);
};

const updateProModeTags = (enabled) => {
  updateVariantModeTags(enabled ? 'pro' : 'reskill');
};

const updateProjectModeUI = () => {
  const state = getState();
  const isRsya = state.projectMode === 'rsya';
  const app = document.querySelector('.app');
  if (app) {
    app.classList.toggle('rsya-mode', isRsya);
  }
  const cropSection = document.getElementById('rsyaCropPreviewSection');
  if (cropSection) cropSection.style.display = isRsya ? 'block' : 'none';
  const rsyaLayoutTypeGroup = document.getElementById('rsyaLayoutTypeGroup');
  if (rsyaLayoutTypeGroup) rsyaLayoutTypeGroup.style.display = isRsya ? 'block' : 'none';
  const rsyaCropGuidesGroup = document.getElementById('rsyaCropGuidesGroup');
  if (rsyaCropGuidesGroup) rsyaCropGuidesGroup.style.display = isRsya ? 'block' : 'none';
  const logoPosGroup = document.getElementById('logoPosGroup');
  if (logoPosGroup) logoPosGroup.style.display = isRsya ? 'none' : 'block';
  const hideSubtitleOnWideGroup = document.getElementById('hideSubtitleOnWideGroup');
  if (hideSubtitleOnWideGroup) hideSubtitleOnWideGroup.style.display = isRsya ? 'none' : 'block';
  const titleAlignGroup = document.getElementById('titleAlignToggle')?.closest('.form-group');
  if (titleAlignGroup) titleAlignGroup.style.display = isRsya ? 'none' : 'flex';
  const titleVPosGroup = document.getElementById('titleVPosToggle')?.closest('.form-group');
  if (titleVPosGroup) titleVPosGroup.style.display = isRsya ? 'none' : 'flex';
  const rsyaControls = document.getElementById('rsyaKVControls');
  if (rsyaControls) rsyaControls.style.display = 'block';
  const exportSizesControls = document.getElementById('exportSizesControls');
  if (exportSizesControls) exportSizesControls.style.display = isRsya ? 'none' : 'block';
  const exportPngButton = document.querySelector('[data-function="exportAllPNG"]');
  if (exportPngButton) {
    exportPngButton.textContent = isRsya ? 'PNG' : t('export.png');
  }
  const exportJpgButton = document.querySelector('[data-function="exportAllJPG"]');
  if (exportJpgButton) {
    exportJpgButton.textContent = isRsya ? 'JPG' : t('export.jpg');
  }
  updateRsyaKVOverlay(false);
};

const setVariantModeState = (mode) => {
  if (mode === 'pro') {
    setKey('variantMode', 'pro');
    setKey('proMode', true);
    setKey('logoLanguage', 'ru');
  } else if (mode === 'kz') {
    setKey('variantMode', 'kz');
    setKey('proMode', false);
    setKey('logoLanguage', 'kz');
  } else {
    setKey('variantMode', 'reskill');
    setKey('proMode', false);
    setKey('logoLanguage', 'ru');
  }
};

const applyResolvedDepartmentState = async (resolvedDepartment) => {
  if (!resolvedDepartment?.defaults) return;

  setSelectedWorkspaceDepartmentId(resolvedDepartment.department?.id || '');
  const appliedDefaults = applyWorkspaceTeamDefaultsLocally(resolvedDepartment.defaults, resolvedDepartment.mediaSources || {});
  applySavedSettings({
    ...(appliedDefaults || resolvedDepartment.defaults),
    departmentId: resolvedDepartment.department?.id || ''
  });
  ensurePresetSelection();
  syncFormFields();
  renderPresetSizes();
  updatePreviewSizeSelect();
  refreshMediaPreviews();
  renderWorkspaceDepartmentTags();
  renderer.render();
};

export const selectProjectMode = async (mode) => {
  const targetMode = mode === 'rsya' ? 'rsya' : 'layouts';
  const currentState = getState();
  const currentGap = Number(currentState.titleLogoGap);
  setKey('projectMode', targetMode);
  if (targetMode === 'layouts' && currentGap === 4) {
    setKey('titleLogoGap', 0);
  } else if (targetMode === 'rsya' && currentGap === 0) {
    setKey('titleLogoGap', 4);
  }
  updateProjectModeTags(targetMode);
  updateProjectModeUI();
  if (targetMode === 'rsya') {
    setKey('showGuides', false);
  } else {
    selectAllSizesAction();
  }
  updatePreviewSizeSelect();
  renderer.render();
};

export const selectVariantMode = async (mode) => {
  const resolvedDepartment = resolveWorkspaceDepartmentBundleLocally(mode);
  if (resolvedDepartment) {
    await applyResolvedDepartmentState(resolvedDepartment);
    return;
  }

  const targetMode = ['reskill', 'pro', 'kz'].includes(mode) ? mode : 'reskill';
  updateVariantModeTags(targetMode);
  setVariantModeState(targetMode);
  setKey('departmentId', targetMode);
  setSelectedWorkspaceDepartmentId(targetMode);
  if (targetMode === 'pro') {
    await selectProMode(true);
  } else {
    await selectProMode(false);
    if (targetMode === 'kz') {
      await selectLogoLanguage('kz');
    } else {
      await selectLogoLanguage('ru');
    }
  }
  renderer.render();
};

export const selectWorkspaceDepartment = async (departmentId) => {
  const resolvedDepartment = resolveWorkspaceDepartmentBundleLocally(departmentId);
  if (resolvedDepartment) {
    await applyResolvedDepartmentState(resolvedDepartment);
    return;
  }

  await selectVariantMode(departmentId);
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
  await selectVariantMode(mode === 'on' ? 'pro' : 'reskill');
};

export const selectProMode = async (enabled) => {
  const state = getState();
  setKey('proMode', enabled);
  setKey('variantMode', enabled ? 'pro' : ((state.logoLanguage || 'ru') === 'kz' ? 'kz' : 'reskill'));
  
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
    await selectPreloadedKV(DEFAULT_PRO_KV_PATH);
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
    
    // Восстанавливаем логотип: явно берём путь Reskill по языку (не s.logoSelected — он может ещё быть PRO)
    const reskillLogoPath = state.logoLanguage === 'kz'
      ? (state.defaultLogoKZ || defaults.defaultLogoKZ || 'logo/white/kz/main.svg')
      : (state.defaultLogoRU || defaults.defaultLogoRU || 'logo/white/ru/main.svg');
    await selectPreloadedLogo(reskillLogoPath);
    
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
  updateVariantModeTags(enabled ? 'pro' : ((getState().logoLanguage || 'ru') === 'kz' ? 'kz' : 'reskill'));
  
  renderer.render();
};

export const initializeProModeToggle = async () => {
  const state = getState();
  const projectMode = state.projectMode || 'rsya';
  const variantMode = state.variantMode || (state.proMode ? 'pro' : (state.logoLanguage === 'kz' ? 'kz' : 'reskill'));

  renderWorkspaceDepartmentTags();
  updateProjectModeTags(projectMode);
  updateVariantModeTags(variantMode);
  updateProjectModeUI();
  if (variantMode === 'pro' || state.proMode) {
    await selectProMode(true);
  }
  initializeRsyaCropSelector();
  initializeRsyaVisualReorder();

  const rsyaLayoutToggle = document.getElementById('rsyaLayoutToggle');
  if (rsyaLayoutToggle) {
    setToggleSwitchValue('rsyaLayoutToggle', state.rsyaLayout || 'center');
  }
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

export const updateTitleOpacity = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для titleOpacity:', value);
    return;
  }
  setKey('titleOpacity', numeric);
  const dom = getDom();
  if (dom.titleOpacityValue) {
    dom.titleOpacityValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

export const updateSubtitleGap = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для subtitleGap:', value);
    return;
  }
  setKey('subtitleGap', numeric);
  const dom = getDom();
  if (dom.subtitleGapValue) {
    dom.subtitleGapValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

export const updateTitleLogoGap = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для titleLogoGap:', value);
    return;
  }
  setKey('titleLogoGap', numeric);
  const dom = getDom();
  if (dom.titleLogoGapValue) {
    dom.titleLogoGapValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

export const updateRsyaCropGridVisible = (value) => {
  const nextValue = !!value;
  setKey('rsyaCropGridVisible', nextValue);
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

export const updateBgOffsetX = (value) => {
  const numeric = Math.round(Number(value) || 0);
  setKey('bgOffsetX', numeric);
  const valueEl = document.getElementById('bgOffsetXValue');
  if (valueEl) valueEl.textContent = `${numeric}px`;
  renderer.render();
};

export const updateBgOffsetY = (value) => {
  const numeric = Math.round(Number(value) || 0);
  setKey('bgOffsetY', numeric);
  const valueEl = document.getElementById('bgOffsetYValue');
  if (valueEl) valueEl.textContent = `${numeric}px`;
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
      const bgOffsetXInput = document.getElementById('bgOffsetX');
      const bgOffsetXValue = document.getElementById('bgOffsetXValue');
      if (bgOffsetXInput) {
        const offsetX = Math.round(state.bgOffsetX ?? 0);
        bgOffsetXInput.value = offsetX;
        if (bgOffsetXValue) bgOffsetXValue.textContent = `${offsetX}px`;
      }
      const bgOffsetYInput = document.getElementById('bgOffsetY');
      const bgOffsetYValue = document.getElementById('bgOffsetYValue');
      if (bgOffsetYInput) {
        const offsetY = Math.round(state.bgOffsetY ?? 0);
        bgOffsetYInput.value = offsetY;
        if (bgOffsetYValue) bgOffsetYValue.textContent = `${offsetY}px`;
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
export const showSizesAdmin = async (...args) => {
  const module = await getSizesAdminModule();
  return module.showSizesAdmin(...args);
};

export const showLogoAssetsAdmin = async (...args) => {
  const module = await getLogoAssetsAdminModule();
  return module.showLogoAssetsAdmin(...args);
};

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
    
    document.title = 'AI-Craft';
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
    const prevKV = state.kv;
    const prevKVSelected = state.kvSelected;
    if (!kvFile) {
      setState({ kv: prevKV || null, kvSelected: prevKVSelected || DEFAULT_KV_PATH });
      updateKVTriggerText(prevKVSelected || DEFAULT_KV_PATH);
      updateKVUI();
      renderer.render();
      renderKVPairs(); // Обновляем кнопки
      return;
    }
    
    try {
      const normalizedKV = normalizeKVAssetPath(kvFile);
      const img = await loadImage(normalizedKV);
      setState({ kv: img, kvSelected: normalizedKV });
      updateKVTriggerText(normalizedKV);
      updateKVUI();
      renderer.render();
      renderKVPairs(); // Обновляем кнопки
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить KV.');
      setState({ kv: prevKV || null, kvSelected: prevKVSelected || DEFAULT_KV_PATH });
      updateKVTriggerText(prevKVSelected || DEFAULT_KV_PATH);
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
            kvDisplayText = pair.kvSelected.split('/').pop().replace(/\.(png|jpg|jpeg|webp)$/i, '');
          }
        } else {
          // Используем имя файла без расширения
          kvDisplayText = pair.kvSelected.split('/').pop().replace(/\.(png|jpg|jpeg|webp)$/i, '');
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
    
    if (pairs.length > 1) {
      const titleHeader = document.createElement('div');
      titleHeader.className = 'form-header';
      if (isActive) titleHeader.classList.add('active');

      const titleButtons = document.createElement('div');
      titleButtons.className = 'gap-sm';
      titleButtons.style.cssText = 'display: flex; align-items: center; margin-left: auto;';

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
      titleHeader.appendChild(titleButtons);
      titleContainer.appendChild(titleHeader);
    }

    titleContainer.appendChild(titleTextarea);
    
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
    if (pairs.length > 1) {
      const subtitleHeader = document.createElement('div');
      subtitleHeader.className = 'form-header';
      if (isActive) subtitleHeader.classList.add('active');

      const subtitleButtons = document.createElement('div');
      subtitleButtons.className = 'gap-sm';
      subtitleButtons.style.cssText = 'display: flex; margin-left: auto;';

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
      subtitleHeader.appendChild(subtitleButtons);
      subtitleContainer.appendChild(subtitleHeader);
    }

    subtitleContainer.appendChild(subtitleTextarea);
    
    // Создаем функцию для создания дивайдера с кнопкой
    const createDivider = (includeButton) => {
      if (!includeButton) {
        const singleLine = document.createElement('div');
        singleLine.style.cssText = 'height: 1px; background: #2a2d35; margin: 12px 0;';
        return singleLine;
      }
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
    const includeButton = !SINGLE_PAIR_MODE && index === 0;
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
  const targetIndex = SINGLE_PAIR_MODE ? 0 : index;
  await setActivePairIndex(targetIndex);
  // Обновляем UI после переключения пары
  syncFormFields();
  renderer.render();
  
  // Загружаем KV и фоновое изображение для активной пары
  const state = getState();
  const prevKV = state.kv;
  const prevKVSelected = state.kvSelected;
  const pairs = state.titleSubtitlePairs || [];
  const activePair = pairs[targetIndex];
  
  // Загружаем KV
  if (activePair && activePair.kvSelected) {
    try {
      const normalizedPairKV = normalizeKVAssetPath(activePair.kvSelected);
      const img = await loadImage(normalizedPairKV);
      setState({ kv: img, kvSelected: normalizedPairKV });
      updateKVTriggerText(normalizedPairKV);
      updateKVUI();
    } catch (error) {
      console.error('Не удалось загрузить KV для активной пары:', error);
      // Не сбрасываем рабочий KV из-за ошибки загрузки пары
      setState({ kv: prevKV || null, kvSelected: prevKVSelected || DEFAULT_KV_PATH });
      updateKVTriggerText(prevKVSelected || DEFAULT_KV_PATH);
      updateKVUI();
    }
  } else {
    // Пустой KV у пары не должен обнулять текущий рабочий KV
    setState({ kv: prevKV || null, kvSelected: prevKVSelected || DEFAULT_KV_PATH });
    updateKVTriggerText(prevKVSelected || DEFAULT_KV_PATH);
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
  if (SINGLE_PAIR_MODE) return;
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
  if (SINGLE_PAIR_MODE) return;
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
    renderWorkspaceDepartmentTags();
    
    // Сохраняем brandName в localStorage при изменении
    if (state.brandName && state.brandName !== lastBrandName) {
      localStorage.setItem('brandName', state.brandName);
      lastBrandName = state.brandName;
      
      document.title = 'AI-Craft';
    }
    
    // Перерисовываем только если изменилась структура (количество/ID) пар или активный индекс
    // НЕ перерисовываем при изменении текста
    const currentPairs = state.titleSubtitlePairs || [];
    const currentPairsStructure = serializePairsStructure(currentPairs);
    const currentActiveIndex = state.activePairIndex || 0;
    
    // Если изменился активный индекс, загружаем KV и фоновое изображение для новой активной пары
    // Делаем это асинхронно, чтобы не блокировать UI
    if (!SINGLE_PAIR_MODE && currentActiveIndex !== lastActiveIndex && currentActiveIndex >= 0 && currentActiveIndex < currentPairs.length) {
      const activePair = currentPairs[currentActiveIndex];
      const prevKV = state.kv;
      const prevKVSelected = state.kvSelected;
      
      // Загружаем изображения асинхронно, не блокируя UI
      requestAnimationFrame(async () => {
        const expectedPairId = activePair.id;
        const expectedPairIndex = getState().activePairIndex;

        // Загружаем KV
        if (activePair && activePair.kvSelected) {
          try {
            const normalizedPairKV = normalizeKVAssetPath(activePair.kvSelected);
            const img = await loadImage(normalizedPairKV);
            const current = getState();
            if (current.activePairIndex !== expectedPairIndex ||
                current.titleSubtitlePairs[current.activePairIndex]?.id !== expectedPairId) {
              return;
            }
            setState({ kv: img, kvSelected: normalizedPairKV });
            updateKVTriggerText(normalizedPairKV);
          } catch (error) {
            console.error('Не удалось загрузить KV для активной пары:', error);
            const current = getState();
            if (current.activePairIndex !== expectedPairIndex ||
                current.titleSubtitlePairs[current.activePairIndex]?.id !== expectedPairId) {
              return;
            }
            // Оставляем прошлый рабочий KV, если KV пары не загрузился
            setState({ kv: prevKV || null, kvSelected: prevKVSelected || DEFAULT_KV_PATH });
            updateKVTriggerText(prevKVSelected || DEFAULT_KV_PATH);
          }
        } else {
          const current = getState();
          if (current.activePairIndex !== expectedPairIndex ||
              current.titleSubtitlePairs[current.activePairIndex]?.id !== expectedPairId) {
            return;
          }
          // Пустой KV в паре не должен стирать глобально текущий KV
          setState({ kv: prevKV || null, kvSelected: prevKVSelected || DEFAULT_KV_PATH });
          updateKVTriggerText(prevKVSelected || DEFAULT_KV_PATH);
        }
        
        // Устанавливаем фоновое изображение из активной пары
        const bgImageSelected = activePair?.bgImageSelected || null;
        if (bgImageSelected) {
          if (typeof bgImageSelected === 'string') {
            // Это путь к файлу, загружаем изображение
            try {
              const img = await loadImage(bgImageSelected);
              const current = getState();
              if (current.activePairIndex !== expectedPairIndex ||
                  current.titleSubtitlePairs[current.activePairIndex]?.id !== expectedPairId) {
                return;
              }
              setState({ bgImage: img });
            } catch (error) {
              console.error('Не удалось загрузить фоновое изображение для активной пары:', error);
              const current = getState();
              if (current.activePairIndex !== expectedPairIndex ||
                  current.titleSubtitlePairs[current.activePairIndex]?.id !== expectedPairId) {
                return;
              }
              setState({ bgImage: null });
            }
          } else {
            // Это уже объект Image
            const current = getState();
            if (current.activePairIndex !== expectedPairIndex ||
                current.titleSubtitlePairs[current.activePairIndex]?.id !== expectedPairId) {
              return;
            }
            setState({ bgImage: bgImageSelected });
          }
        } else {
          const current = getState();
          if (current.activePairIndex !== expectedPairIndex ||
              current.titleSubtitlePairs[current.activePairIndex]?.id !== expectedPairId) {
            return;
          }
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
  renderWorkspaceDepartmentTags();
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
