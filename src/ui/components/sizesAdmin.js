/**
 * Компонент админки для управления размерами
 * Позволяет добавлять, редактировать и удалять размеры и платформы
 */

import {
  getPresetSizes, 
  saveSizesConfig,
  exportSizesConfig,
  importSizesConfig,
  resetSizesConfig,
  loadSizesConfig
} from '../../utils/sizesConfig.js';
import { exportFullConfig, importFullConfig } from '../../utils/fullConfig.js';
import { updatePresetSizesFromConfig, getState, setKey, setState, batch, getDefaultValues, resetState } from '../../state/store.js';
import { renderPresetSizes, updatePreviewSizeSelect, updateSizesSummary } from './sizeManager.js';
import { renderer } from '../../renderer.js';
import { openLogoSelectModal, closeLogoSelectModal, selectPreloadedLogo } from './logoSelector.js';
import { openKVSelectModal, closeKVSelectModal, selectPreloadedKV } from './kvSelector.js';
import { handleLogoUpload, handleKVUpload, handleBgUpload, handlePartnerLogoUpload } from '../ui.js';
import { updateBgColor, applyPresetBgColor, openBGSelectModal } from './backgroundSelector.js';
import { PRESET_BACKGROUND_COLORS, AVAILABLE_FONTS, DEFAULT_KV_PATH } from '../../constants.js';
import { LAYOUT_CONSTANTS } from '../../renderer/constants.js';
import { autoSelectLogoByTextColor } from '../ui.js';
import { getDom } from '../domCache.js';
import { getPassword, checkPassword, setPassword, hasPassword } from '../../utils/passwordManager.js';
import { getScopedStorageKey } from '../../utils/appConfig.js';
import { t } from '../../utils/i18n.js';
import { syncWorkspaceTeamDefaults } from '../../utils/workspaceTeamDefaults.js';
import {
  canManageWorkspaceTeamDefaults,
  hasWorkspaceSession,
  isWorkspaceAccessControlled
} from '../../utils/workspaceAccess.js';

let adminModal = null;
let isAdminOpen = false;
let isAdminAuthenticated = false; // Флаг аутентификации
// Сохраняем исходные значения для возможности отката
let originalDefaults = null;

const resolveWorkspaceTeamDefaultsAccess = () => {
  if (!isWorkspaceAccessControlled()) {
    return { enforced: false, allowed: false };
  }

  if (!hasWorkspaceSession()) {
    alert('Войдите в workspace с ролью lead или admin, чтобы управлять командными defaults.');
    return { enforced: true, allowed: false };
  }

  if (!canManageWorkspaceTeamDefaults()) {
    alert('Эта панель доступна только роли lead или admin в текущей команде.');
    return { enforced: true, allowed: false };
  }

  return { enforced: true, allowed: true };
};

/**
 * Формирует подпись размера с указанием платформы
 */
const formatSizeLabel = (width, height, platformLabel) => {
  const numericWidth = Number(width);
  const numericHeight = Number(height);
  if (!Number.isFinite(numericWidth) || !Number.isFinite(numericHeight)) {
    return null;
  }
  const suffix = platformLabel ? ` (${platformLabel})` : '';
  return `${Math.round(numericWidth)}×${Math.round(numericHeight)}${suffix}`;
};

/**
 * Возвращает строку для отображения списка размеров с ограничением количества
 */
const formatSizeSummary = (sizes = [], maxItems = 8) => {
  if (!sizes || sizes.length === 0) {
    return '';
  }
  if (sizes.length <= maxItems) {
    return sizes.join(', ');
  }
  const displayed = sizes.slice(0, maxItems);
  const remaining = sizes.length - displayed.length;
  return `${displayed.join(', ')} и ещё ${remaining}`;
};

/**
 * Группирует размеры по типам форматов для отображения подсказок
 */
const buildFormatTypeSummaries = (state) => {
  const categories = {
    vertical: [],
    ultraWide: [],
    veryWide: [],
    horizontal: [],
    square: [],
    tall: []
  };
  const seen = Object.keys(categories).reduce((acc, key) => {
    acc[key] = new Set();
    return acc;
  }, {});
  
  const addToCategory = (category, label) => {
    if (!category || !label || !categories[category]) return;
    if (seen[category].has(label)) return;
    seen[category].add(label);
    categories[category].push(label);
  };
  
  const classifySize = (width, height, platformLabel) => {
    const label = formatSizeLabel(width, height, platformLabel);
    if (!label) return;
    const numericWidth = Number(width);
    const numericHeight = Number(height);
    
    if (numericHeight >= numericWidth * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD) {
      addToCategory('vertical', label);
      if (numericHeight / numericWidth >= 2) {
        addToCategory('tall', label);
      }
      return;
    }
    if (numericWidth >= numericHeight * LAYOUT_CONSTANTS.ULTRA_WIDE_THRESHOLD) {
      addToCategory('ultraWide', label);
      return;
    }
    if (numericWidth >= numericHeight * 4) {
      addToCategory('veryWide', label);
      return;
    }
    if (numericWidth >= numericHeight * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD) {
      addToCategory('horizontal', label);
      return;
    }
    
    addToCategory('square', label);
  };
  
  const presetSizes = state?.presetSizes && Object.keys(state.presetSizes).length > 0
    ? state.presetSizes
    : getPresetSizes();
  
  Object.entries(presetSizes || {}).forEach(([platform, sizes = []]) => {
    sizes.forEach((size) => classifySize(size.width, size.height, platform));
  });
  
  (state?.customSizes || []).forEach((size, index) => {
    const platformLabel = size.name || size.label || `Custom ${index + 1}`;
    classifySize(size.width, size.height, platformLabel);
  });
  
  return categories;
};

/**
 * Рендерит раздел значений (без умножения и фонов)
 */
const renderValuesTab = () => {
  // ВАЖНО: Берем значения из сохраненных значений по умолчанию, а НЕ из текущего state
  // Это позволяет редактировать настройки по умолчанию независимо от текущего макета
  const savedDefaults = localStorage.getItem(getScopedStorageKey('default-values'));
  const savedValues = savedDefaults ? JSON.parse(savedDefaults) : null;
  
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a';
  const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d';
  const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
  const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999';
  
  // Сохраняем исходные значения при первом рендере (используем реальные значения по умолчанию)
  if (!originalDefaults) {
    originalDefaults = JSON.parse(JSON.stringify(getDefaultValues()));
  }
  
  // Получаем реальные значения по умолчанию для использования в форме
  const defaults = getDefaultValues();
  
  // Используем сохраненные значения, если они есть, иначе дефолтные
  // НЕ используем текущий state, чтобы не применять изменения из превью
  const values = savedValues || defaults;
  
  // Для проверки наличия логотипа и KV используем сохраненные значения, а не текущий state
  const hasLogo = !!(savedValues?.logoSelected && savedValues.logoSelected !== originalDefaults.logoSelected);
  const hasKV = !!(savedValues?.kvSelected && savedValues.kvSelected !== originalDefaults.kvSelected);
  
  // Функция для преобразования hex в rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Цвета для группировки элементов
  const colorTitle = '#FF6B6B';
  const colorSubtitle = '#4ECDC4';
  const colorLegal = '#95E1D3';
  const colorAge = '#F38181';
  const colorLogo = '#AA96DA';
  const colorKV = '#FCBAD3';
  const colorBg = '#FFD93D';
  
  return `
    <div class="form-group" style="display: flex; flex-direction: column; gap: var(--spacing-xl);">
      <div class="admin-info-box">
        <div style="display: flex; align-items: flex-start; gap: var(--spacing-md);">
          <span class="material-icons" style="font-size: var(--font-size-lg); color: #2196F3; flex-shrink: 0; margin-top: 2px;">info</span>
          <div>
            <div style="font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--spacing-xs); font-size: var(--font-size-md);">${t('admin.sizes.defaults.title')}</div>
            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5;">${t('admin.sizes.defaults.desc')}</div>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.titleLabel')}</label>
        <textarea id="defaultTitle" class="theme-input" style="min-height: 60px;">${values.title || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.subtitleLabel')}</label>
        <textarea id="defaultSubtitle" class="theme-input" style="min-height: 60px;">${values.subtitle || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.legalLabel')}</label>
        <textarea id="defaultLegal" class="theme-input" style="min-height: 80px;">${values.legal || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.ageLabel')}</label>
        <input type="text" id="defaultAge" class="theme-input" value="${values.age || '18+'}">
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.bgLabel')}</label>
        <div id="defaultBgPreview" class="preview-container" style="background: ${values.bgColor || '#1e1e1e'};">
          <img id="defaultBgPreviewImg" src="${values.bgImage || ''}" class="preview-img" style="display: ${values.bgImage ? 'block' : 'none'}; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
          <span id="defaultBgPreviewPlaceholder" class="preview-placeholder" style="z-index: 1;">${values.bgImage ? t('admin.sizes.defaults.bgImage') : t('admin.sizes.defaults.bgColor') + (values.bgColor || '#1e1e1e')}</span>
        </div>
        <div class="input-group" style="margin-bottom: var(--spacing-sm);">
          <input type="color" id="defaultBgColor" value="${values.bgColor || '#1e1e1e'}" style="flex: 0 0 60px;">
          <input type="text" id="defaultBgColorHex" class="theme-input" value="${values.bgColor || '#1e1e1e'}" placeholder="#1e1e1e">
          <button class="btn btn-danger" id="defaultBgColorReset" style="display: ${values.bgColor !== originalDefaults.bgColor ? 'block' : 'none'};" title="${t('admin.sizes.defaults.bgReset')}"><span class="material-icons">refresh</span></button>
        </div>
        <button class="btn btn-full" id="defaultBgUpload"><span class="material-icons">upload</span>${t('admin.sizes.defaults.bgUpload')}</button>
        <input type="file" id="defaultBgUploadFile" accept="image/*" style="display: none;">
        <button class="btn btn-danger btn-full" id="defaultBgClear" style="margin-top: var(--spacing-sm); display: ${values.bgImage ? 'block' : 'none'};"><span class="material-icons">delete</span>${t('admin.sizes.defaults.bgDelete')}</button>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.titleColorLabel')}</label>
        <div class="input-group">
          <input type="color" id="defaultTextColor" value="${values.titleColor || '#ffffff'}" style="flex: 0 0 60px;">
          <input type="text" id="defaultTextColorHex" class="theme-input" value="${values.titleColor || '#ffffff'}" placeholder="#ffffff">
          <button class="btn btn-danger" id="defaultTextColorReset" style="display: ${values.titleColor !== originalDefaults.titleColor ? 'block' : 'none'};" title="${t('admin.sizes.defaults.bgReset')}"><span class="material-icons">refresh</span></button>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorTitle}; background: ${hexToRgba(colorTitle, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorTitle, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorTitle, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorTitle}; font-size: var(--font-size-lg);">title</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.titleSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.titleSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.size')}</label>
            <input type="number" id="defaultTitleSize" class="theme-input" value="${values.titleSize ?? defaults.titleSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.weight')}</label>
            <select id="defaultTitleWeight" class="theme-input">
              <option value="Thin" ${values.titleWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${values.titleWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${values.titleWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${values.titleWeight === 'Regular' || !values.titleWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${values.titleWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${values.titleWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${values.titleWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${values.titleWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${values.titleWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.align')}</label>
            <select id="defaultTitleAlign" class="theme-input">
              <option value="left" ${values.titleAlign === 'left' || !values.titleAlign ? 'selected' : ''}>${t('admin.sizes.titleSettings.align.left')}</option>
              <option value="center" ${values.titleAlign === 'center' ? 'selected' : ''}>${t('admin.sizes.titleSettings.align.center')}</option>
              <option value="right" ${values.titleAlign === 'right' ? 'selected' : ''}>${t('admin.sizes.titleSettings.align.right')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.vPos')}</label>
            <select id="defaultTitleVPos" class="theme-input">
              <option value="top" ${values.titleVPos === 'top' || !values.titleVPos ? 'selected' : ''}>${t('admin.sizes.titleSettings.vPos.top')}</option>
              <option value="center" ${values.titleVPos === 'center' ? 'selected' : ''}>${t('admin.sizes.titleSettings.vPos.center')}</option>
              <option value="bottom" ${values.titleVPos === 'bottom' ? 'selected' : ''}>${t('admin.sizes.titleSettings.vPos.bottom')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.letterSpacing')}</label>
            <input type="number" id="defaultTitleLetterSpacing" class="theme-input" value="${values.titleLetterSpacing ?? 0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.lineHeight')}</label>
            <input type="number" id="defaultTitleLineHeight" class="theme-input" value="${values.titleLineHeight ?? 1.1}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorSubtitle}; background: ${hexToRgba(colorSubtitle, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorSubtitle, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorSubtitle, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorSubtitle}; font-size: var(--font-size-lg);">subtitles</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.subtitleSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.subtitleSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.color')}</label>
            <div class="input-group">
              <input type="color" id="defaultSubtitleColor" value="${values.subtitleColor || '#e0e0e0'}" style="flex: 0 0 60px;">
              <input type="text" id="defaultSubtitleColorHex" class="theme-input" value="${values.subtitleColor || '#e0e0e0'}" placeholder="#e0e0e0">
            </div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.opacity')}</label>
            <input type="number" id="defaultSubtitleOpacity" class="theme-input" value="${values.subtitleOpacity ?? defaults.subtitleOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.size')}</label>
            <input type="number" id="defaultSubtitleSize" class="theme-input" value="${values.subtitleSize ?? defaults.subtitleSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.ratio')}</label>
            <input type="range" id="defaultTitleSubtitleRatio" value="${values.titleSubtitleRatio ?? defaults.titleSubtitleRatio}" step="0.01" min="0.1" max="1">
            <div class="slider-value">
              <span>0.1</span>
              <span id="defaultTitleSubtitleRatioValue">${(values.titleSubtitleRatio ?? defaults.titleSubtitleRatio).toFixed(2)}</span>
              <span>1.0</span>
            </div>
            <div class="hint">${t('admin.sizes.subtitleSettings.ratioHint')}</div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.weight')}</label>
            <select id="defaultSubtitleWeight" class="theme-input">
              <option value="Thin" ${values.subtitleWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${values.subtitleWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${values.subtitleWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${values.subtitleWeight === 'Regular' || !values.subtitleWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${values.subtitleWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${values.subtitleWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${values.subtitleWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${values.subtitleWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${values.subtitleWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.align')}</label>
            <select id="defaultSubtitleAlign" class="theme-input">
              <option value="left" ${values.subtitleAlign === 'left' || !values.subtitleAlign ? 'selected' : ''}>${t('admin.sizes.subtitleSettings.align.left')}</option>
              <option value="center" ${values.subtitleAlign === 'center' ? 'selected' : ''}>${t('admin.sizes.subtitleSettings.align.center')}</option>
              <option value="right" ${values.subtitleAlign === 'right' ? 'selected' : ''}>${t('admin.sizes.subtitleSettings.align.right')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.gap')}</label>
            <input type="number" id="defaultSubtitleGap" class="theme-input" value="${values.subtitleGap ?? defaults.subtitleGap}" step="0.1" min="-10" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.letterSpacing')}</label>
            <input type="number" id="defaultSubtitleLetterSpacing" class="theme-input" value="${values.subtitleLetterSpacing ?? 0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.lineHeight')}</label>
            <input type="number" id="defaultSubtitleLineHeight" class="theme-input" value="${values.subtitleLineHeight ?? 1.2}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorLegal}; background: ${hexToRgba(colorLegal, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorLegal, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorLegal, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorLegal}; font-size: var(--font-size-lg);">gavel</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.legalSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.legalSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.color')}</label>
            <div class="input-group">
              <input type="color" id="defaultLegalColor" value="${values.legalColor || '#ffffff'}" style="flex: 0 0 60px;">
              <input type="text" id="defaultLegalColorHex" class="theme-input" value="${values.legalColor || '#ffffff'}" placeholder="#ffffff">
            </div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.opacity')}</label>
            <input type="number" id="defaultLegalOpacity" class="theme-input" value="${values.legalOpacity ?? defaults.legalOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.size')}</label>
            <input type="number" id="defaultLegalSize" class="theme-input" value="${values.legalSize ?? defaults.legalSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.weight')}</label>
            <select id="defaultLegalWeight" class="theme-input">
              <option value="Thin" ${values.legalWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${values.legalWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${values.legalWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${values.legalWeight === 'Regular' || !values.legalWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${values.legalWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${values.legalWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${values.legalWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${values.legalWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${values.legalWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.legalSettings.align')}</label>
            <select id="defaultLegalAlign" class="theme-input">
              <option value="left" ${values.legalAlign === 'left' || !values.legalAlign ? 'selected' : ''}>${t('admin.sizes.legalSettings.align.left')}</option>
              <option value="center" ${values.legalAlign === 'center' ? 'selected' : ''}>${t('admin.sizes.legalSettings.align.center')}</option>
              <option value="right" ${values.legalAlign === 'right' ? 'selected' : ''}>${t('admin.sizes.legalSettings.align.right')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.letterSpacing')}</label>
            <input type="number" id="defaultLegalLetterSpacing" class="theme-input" value="${values.legalLetterSpacing ?? 0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.lineHeight')}</label>
            <input type="number" id="defaultLegalLineHeight" class="theme-input" value="${values.legalLineHeight ?? 1.4}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorAge}; background: ${hexToRgba(colorAge, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorAge, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorAge, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorAge}; font-size: var(--font-size-lg);">child_care</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.ageSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.ageSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.size')}</label>
            <input type="number" id="defaultAgeSize" class="theme-input" value="${values.ageSize ?? defaults.ageSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.weight')}</label>
            <select id="defaultAgeWeight" class="theme-input">
              <option value="Thin" ${values.ageWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${values.ageWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${values.ageWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${values.ageWeight === 'Regular' || !values.ageWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${values.ageWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${values.ageWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${values.ageWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${values.ageWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${values.ageWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.ageSettings.gap')}</label>
            <input type="number" id="defaultAgeGapPercent" class="theme-input" value="${values.ageGapPercent ?? defaults.ageGapPercent}" step="0.1" min="0" max="10">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorBg}; background: ${hexToRgba(colorBg, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorBg, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorBg, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorBg}; font-size: var(--font-size-lg);">settings</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.advancedSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.advancedSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.padding')}</label>
            <input type="number" id="defaultPaddingPercent" class="theme-input" value="${values.paddingPercent ?? defaults.paddingPercent}" step="0.1" min="0" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.layoutMode')}</label>
            <select id="defaultLayoutMode" class="theme-input">
              <option value="auto" ${values.layoutMode === 'auto' || !values.layoutMode ? 'selected' : ''}>${t('admin.sizes.advancedSettings.layoutMode.auto')}</option>
              <option value="horizontal" ${values.layoutMode === 'horizontal' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.layoutMode.horizontal')}</option>
              <option value="vertical" ${values.layoutMode === 'vertical' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.layoutMode.vertical')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.bgHPos')}</label>
            <select id="defaultBgPosition" class="theme-input">
              <option value="left" ${values.bgPosition === 'left' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgHPos.left')}</option>
              <option value="center" ${values.bgPosition === 'center' || !values.bgPosition ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgHPos.center')}</option>
              <option value="right" ${values.bgPosition === 'right' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgHPos.right')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.bgVPos')}</label>
            <select id="defaultBgVPosition" class="theme-input">
              <option value="top" ${values.bgVPosition === 'top' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgVPos.top')}</option>
              <option value="center" ${values.bgVPosition === 'center' || !values.bgVPosition ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgVPos.center')}</option>
              <option value="bottom" ${values.bgVPosition === 'bottom' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgVPos.bottom')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.bgSize')}</label>
            <select id="defaultBgSize" class="theme-input">
              <option value="cover" ${values.bgSize === 'cover' || !values.bgSize ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgSize.cover')}</option>
              <option value="contain" ${values.bgSize === 'contain' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgSize.contain')}</option>
              <option value="fill" ${values.bgSize === 'fill' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgSize.fill')}</option>
              <option value="tile" ${values.bgSize === 'tile' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgSize.tile')}</option>
            </select>
          </div>
          <div class="form-group" id="bgImageSizeGroup" style="display: ${values.bgSize === 'tile' || values.bgSize === 'cover' || values.bgSize === 'contain' ? 'block' : 'none'};">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.bgImageSize')}</label>
            <input type="range" id="defaultBgImageSize" class="theme-input" value="${values.bgImageSize ?? 100}" step="1" min="10" max="500" style="width: 100%;">
            <div class="slider-value" style="display: flex; justify-content: center; margin-top: 4px;">
              <span id="defaultBgImageSizeValue">${values.bgImageSize ?? 100}%</span>
            </div>
            <div class="hint">${t('admin.sizes.advancedSettings.bgImageSizeHint')}</div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.textGradientOpacity')}</label>
            <input type="number" id="defaultTextGradientOpacity" class="theme-input" value="${values.textGradientOpacity ?? defaults.textGradientOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.centerTextOverlayOpacity')}</label>
            <input type="number" id="defaultCenterTextOverlayOpacity" class="theme-input" value="${values.centerTextOverlayOpacity ?? 20}" step="1" min="0" max="100">
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.defaultFont')}</label>
            <select id="defaultFontFamily" class="theme-input">
              ${AVAILABLE_FONTS.map(font => {
                const currentFontFamily = (values.fontFamily === 'system-ui' ? 'YS Text' : values.fontFamily) || 'YS Text';
                const selected = currentFontFamily === font.family ? 'selected' : '';
                return `<option value="${font.family}" ${selected}>${font.name || font.family}</option>`;
              }).join('')}
            </select>
            <div class="hint">${t('admin.sizes.advancedSettings.defaultFontHint')}</div>
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: #4ECDC4; background: ${hexToRgba('#4ECDC4', 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba('#4ECDC4', 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba('#4ECDC4', 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: #4ECDC4; font-size: var(--font-size-lg);">download</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.exportSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.exportSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.exportSettings.maxFileSize')}</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="number" id="defaultMaxFileSizeValue" class="theme-input" value="${values.maxFileSizeValue ?? 150}" step="0.1" min="0.1" max="100" style="flex: 1;">
              <select id="defaultMaxFileSizeUnit" class="theme-input" style="flex: 0 0 120px;">
                <option value="KB" ${(values.maxFileSizeUnit || 'KB') === 'KB' ? 'selected' : ''}>${t('admin.sizes.exportSettings.maxFileSizeUnit.KB')}</option>
                <option value="MB" ${(values.maxFileSizeUnit || 'KB') === 'MB' ? 'selected' : ''}>${t('admin.sizes.exportSettings.maxFileSizeUnit.MB')}</option>
              </select>
            </div>
            <div class="hint">${t('admin.sizes.exportSettings.maxFileSizeHint')}</div>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.exportSettings.habrBorder')}</label>
            <div class="checkbox-group" style="margin-bottom: var(--spacing-sm);">
              <input type="checkbox" id="defaultHabrBorderEnabled" ${values.habrBorderEnabled ? 'checked' : ''}>
              <label for="defaultHabrBorderEnabled" style="margin: 0;">${t('admin.sizes.exportSettings.habrBorderEnabled')}</label>
            </div>
            <div class="input-group" style="display: flex; gap: 8px; align-items: center;">
              <label for="defaultHabrBorderColor" class="sr-only">${t('admin.sizes.exportSettings.habrBorderColor')}</label>
              <input type="color" id="defaultHabrBorderColor" value="${values.habrBorderColor || '#D5DDDF'}" style="flex: 0 0 60px;">
              <input type="text" id="defaultHabrBorderColorHex" class="theme-input" value="${values.habrBorderColor || '#D5DDDF'}" placeholder="#D5DDDF" style="flex: 1;">
            </div>
            <div class="hint">${t('admin.sizes.exportSettings.habrBorderHint')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Рендерит вкладку с настройками по умолчанию
 */
const renderDefaultsTab = () => {
  const state = getState();
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a';
  const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d';
  const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
  const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999';
  
  // Сохраняем исходные значения при первом рендере (используем реальные значения по умолчанию)
  if (!originalDefaults) {
    originalDefaults = JSON.parse(JSON.stringify(getDefaultValues()));
  }
  
  // Получаем реальные значения по умолчанию для использования в форме
  const defaults = getDefaultValues();
  
  const hasLogo = !!(state.logoSelected && state.logoSelected !== originalDefaults.logoSelected);
  const hasKV = !!(state.kvSelected && state.kvSelected !== originalDefaults.kvSelected);
  
  // Функция для преобразования hex в rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Цвета для группировки элементов
  const colorTitle = '#FF6B6B';
  const colorSubtitle = '#4ECDC4';
  const colorLegal = '#95E1D3';
  const colorAge = '#F38181';
  const colorLogo = '#AA96DA';
  const colorKV = '#FCBAD3';
  const colorBg = '#FFD93D';
  
  return `
    <div class="form-group" style="display: flex; flex-direction: column; gap: var(--spacing-xl);">
      <div class="admin-info-box">
        <div style="display: flex; align-items: flex-start; gap: var(--spacing-md);">
          <span class="material-icons" style="font-size: var(--font-size-lg); color: #2196F3; flex-shrink: 0; margin-top: 2px;">info</span>
          <div>
            <div style="font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--spacing-xs); font-size: var(--font-size-md);">${t('admin.sizes.defaults.title')}</div>
            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5;">${t('admin.sizes.defaults.desc')}</div>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.titleLabel')}</label>
        <textarea id="defaultTitle" class="theme-input" style="min-height: 60px;">${values.title || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.subtitleLabel')}</label>
        <textarea id="defaultSubtitle" class="theme-input" style="min-height: 60px;">${values.subtitle || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.legalLabel')}</label>
        <textarea id="defaultLegal" class="theme-input" style="min-height: 80px;">${values.legal || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.ageLabel')}</label>
        <input type="text" id="defaultAge" class="theme-input" value="${values.age || '18+'}">
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.bgLabel')}</label>
        <div id="defaultBgPreview" class="preview-container" style="background: ${values.bgColor || '#1e1e1e'};">
          <img id="defaultBgPreviewImg" src="${values.bgImage || ''}" class="preview-img" style="display: ${values.bgImage ? 'block' : 'none'}; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
          <span id="defaultBgPreviewPlaceholder" class="preview-placeholder" style="z-index: 1;">${values.bgImage ? t('admin.sizes.defaults.bgImage') : t('admin.sizes.defaults.bgColor') + (values.bgColor || '#1e1e1e')}</span>
        </div>
        <div class="input-group" style="margin-bottom: var(--spacing-sm);">
          <input type="color" id="defaultBgColor" value="${values.bgColor || '#1e1e1e'}" style="flex: 0 0 60px;">
          <input type="text" id="defaultBgColorHex" class="theme-input" value="${values.bgColor || '#1e1e1e'}" placeholder="#1e1e1e">
          <button class="btn btn-danger" id="defaultBgColorReset" style="display: ${values.bgColor !== originalDefaults.bgColor ? 'block' : 'none'};" title="${t('admin.sizes.defaults.bgReset')}"><span class="material-icons">refresh</span></button>
        </div>
        <button class="btn btn-full" id="defaultBgUpload"><span class="material-icons">upload</span>${t('admin.sizes.defaults.bgUpload')}</button>
        <input type="file" id="defaultBgUploadFile" accept="image/*" style="display: none;">
        <button class="btn btn-danger btn-full" id="defaultBgClear" style="margin-top: var(--spacing-sm); display: ${values.bgImage ? 'block' : 'none'};"><span class="material-icons">delete</span>${t('admin.sizes.defaults.bgDelete')}</button>
      </div>
      
      <div class="form-group">
        <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm);">${t('admin.sizes.defaults.titleColorLabel')}</label>
        <div class="input-group">
          <input type="color" id="defaultTextColor" value="${values.titleColor || '#ffffff'}" style="flex: 0 0 60px;">
          <input type="text" id="defaultTextColorHex" class="theme-input" value="${values.titleColor || '#ffffff'}" placeholder="#ffffff">
          <button class="btn btn-danger" id="defaultTextColorReset" style="display: ${values.titleColor !== originalDefaults.titleColor ? 'block' : 'none'};" title="${t('admin.sizes.defaults.bgReset')}"><span class="material-icons">refresh</span></button>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorTitle}; background: ${hexToRgba(colorTitle, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorTitle, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorTitle, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorTitle}; font-size: var(--font-size-lg);">title</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.titleSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.titleSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.size')}</label>
            <input type="number" id="defaultTitleSize" class="theme-input" value="${values.titleSize ?? defaults.titleSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.weight')}</label>
            <select id="defaultTitleWeight" class="theme-input">
              <option value="Thin" ${values.titleWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${values.titleWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${values.titleWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${values.titleWeight === 'Regular' || !values.titleWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${values.titleWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${values.titleWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${values.titleWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${values.titleWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${values.titleWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.align')}</label>
            <select id="defaultTitleAlign" class="theme-input">
              <option value="left" ${values.titleAlign === 'left' || !values.titleAlign ? 'selected' : ''}>${t('admin.sizes.titleSettings.align.left')}</option>
              <option value="center" ${values.titleAlign === 'center' ? 'selected' : ''}>${t('admin.sizes.titleSettings.align.center')}</option>
              <option value="right" ${values.titleAlign === 'right' ? 'selected' : ''}>${t('admin.sizes.titleSettings.align.right')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.vPos')}</label>
            <select id="defaultTitleVPos" class="theme-input">
              <option value="top" ${values.titleVPos === 'top' || !values.titleVPos ? 'selected' : ''}>${t('admin.sizes.titleSettings.vPos.top')}</option>
              <option value="center" ${values.titleVPos === 'center' ? 'selected' : ''}>${t('admin.sizes.titleSettings.vPos.center')}</option>
              <option value="bottom" ${values.titleVPos === 'bottom' ? 'selected' : ''}>${t('admin.sizes.titleSettings.vPos.bottom')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.letterSpacing')}</label>
            <input type="number" id="defaultTitleLetterSpacing" class="theme-input" value="${values.titleLetterSpacing ?? 0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.lineHeight')}</label>
            <input type="number" id="defaultTitleLineHeight" class="theme-input" value="${values.titleLineHeight ?? 1.1}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorSubtitle}; background: ${hexToRgba(colorSubtitle, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorSubtitle, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorSubtitle, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorSubtitle}; font-size: var(--font-size-lg);">subtitles</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.subtitleSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.subtitleSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.color')}</label>
            <div class="input-group">
              <input type="color" id="defaultSubtitleColor" value="${values.subtitleColor || '#e0e0e0'}" style="flex: 0 0 60px;">
              <input type="text" id="defaultSubtitleColorHex" class="theme-input" value="${values.subtitleColor || '#e0e0e0'}" placeholder="#e0e0e0">
            </div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.opacity')}</label>
            <input type="number" id="defaultSubtitleOpacity" class="theme-input" value="${values.subtitleOpacity ?? defaults.subtitleOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.size')}</label>
            <input type="number" id="defaultSubtitleSize" class="theme-input" value="${values.subtitleSize ?? defaults.subtitleSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.ratio')}</label>
            <input type="range" id="defaultTitleSubtitleRatio" value="${values.titleSubtitleRatio ?? defaults.titleSubtitleRatio}" step="0.01" min="0.1" max="1">
            <div class="slider-value">
              <span>0.1</span>
              <span id="defaultTitleSubtitleRatioValue">${(values.titleSubtitleRatio ?? defaults.titleSubtitleRatio).toFixed(2)}</span>
              <span>1.0</span>
            </div>
            <div class="hint">${t('admin.sizes.subtitleSettings.ratioHint')}</div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.weight')}</label>
            <select id="defaultSubtitleWeight" class="theme-input">
              <option value="Thin" ${values.subtitleWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${values.subtitleWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${values.subtitleWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${values.subtitleWeight === 'Regular' || !values.subtitleWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${values.subtitleWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${values.subtitleWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${values.subtitleWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${values.subtitleWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${values.subtitleWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.align')}</label>
            <select id="defaultSubtitleAlign" class="theme-input">
              <option value="left" ${values.subtitleAlign === 'left' || !values.subtitleAlign ? 'selected' : ''}>${t('admin.sizes.subtitleSettings.align.left')}</option>
              <option value="center" ${values.subtitleAlign === 'center' ? 'selected' : ''}>${t('admin.sizes.subtitleSettings.align.center')}</option>
              <option value="right" ${values.subtitleAlign === 'right' ? 'selected' : ''}>${t('admin.sizes.subtitleSettings.align.right')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.gap')}</label>
            <input type="number" id="defaultSubtitleGap" class="theme-input" value="${values.subtitleGap ?? defaults.subtitleGap}" step="0.1" min="-10" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.letterSpacing')}</label>
            <input type="number" id="defaultSubtitleLetterSpacing" class="theme-input" value="${values.subtitleLetterSpacing ?? 0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.lineHeight')}</label>
            <input type="number" id="defaultSubtitleLineHeight" class="theme-input" value="${values.subtitleLineHeight ?? 1.2}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorLegal}; background: ${hexToRgba(colorLegal, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorLegal, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorLegal, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorLegal}; font-size: var(--font-size-lg);">gavel</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.legalSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.legalSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.color')}</label>
            <div class="input-group">
              <input type="color" id="defaultLegalColor" value="${values.legalColor || '#ffffff'}" style="flex: 0 0 60px;">
              <input type="text" id="defaultLegalColorHex" class="theme-input" value="${values.legalColor || '#ffffff'}" placeholder="#ffffff">
            </div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.subtitleSettings.opacity')}</label>
            <input type="number" id="defaultLegalOpacity" class="theme-input" value="${values.legalOpacity ?? defaults.legalOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.size')}</label>
            <input type="number" id="defaultLegalSize" class="theme-input" value="${values.legalSize ?? defaults.legalSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.weight')}</label>
            <select id="defaultLegalWeight" class="theme-input">
              <option value="Thin" ${values.legalWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${values.legalWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${values.legalWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${values.legalWeight === 'Regular' || !values.legalWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${values.legalWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${values.legalWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${values.legalWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${values.legalWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${values.legalWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.legalSettings.align')}</label>
            <select id="defaultLegalAlign" class="theme-input">
              <option value="left" ${values.legalAlign === 'left' || !values.legalAlign ? 'selected' : ''}>${t('admin.sizes.legalSettings.align.left')}</option>
              <option value="center" ${values.legalAlign === 'center' ? 'selected' : ''}>${t('admin.sizes.legalSettings.align.center')}</option>
              <option value="right" ${values.legalAlign === 'right' ? 'selected' : ''}>${t('admin.sizes.legalSettings.align.right')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.letterSpacing')}</label>
            <input type="number" id="defaultLegalLetterSpacing" class="theme-input" value="${values.legalLetterSpacing ?? 0}" step="0.1" min="-5" max="10">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.lineHeight')}</label>
            <input type="number" id="defaultLegalLineHeight" class="theme-input" value="${values.legalLineHeight ?? 1.4}" step="0.1" min="0.5" max="3">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorAge}; background: ${hexToRgba(colorAge, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorAge, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorAge, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorAge}; font-size: var(--font-size-lg);">child_care</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.ageSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.ageSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.size')}</label>
            <input type="number" id="defaultAgeSize" class="theme-input" value="${values.ageSize ?? defaults.ageSize}" step="0.1" min="1" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.titleSettings.weight')}</label>
            <select id="defaultAgeWeight" class="theme-input">
              <option value="Thin" ${values.ageWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${values.ageWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${values.ageWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${values.ageWeight === 'Regular' || !values.ageWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${values.ageWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${values.ageWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${values.ageWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${values.ageWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${values.ageWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.ageSettings.gap')}</label>
            <input type="number" id="defaultAgeGapPercent" class="theme-input" value="${values.ageGapPercent ?? defaults.ageGapPercent}" step="0.1" min="0" max="10">
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: ${colorBg}; background: ${hexToRgba(colorBg, 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorBg, 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba(colorBg, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorBg}; font-size: var(--font-size-lg);">settings</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.advancedSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.advancedSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.padding')}</label>
            <input type="number" id="defaultPaddingPercent" class="theme-input" value="${values.paddingPercent ?? defaults.paddingPercent}" step="0.1" min="0" max="20">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.layoutMode')}</label>
            <select id="defaultLayoutMode" class="theme-input">
              <option value="auto" ${values.layoutMode === 'auto' || !values.layoutMode ? 'selected' : ''}>${t('admin.sizes.advancedSettings.layoutMode.auto')}</option>
              <option value="horizontal" ${values.layoutMode === 'horizontal' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.layoutMode.horizontal')}</option>
              <option value="vertical" ${values.layoutMode === 'vertical' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.layoutMode.vertical')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.bgHPos')}</label>
            <select id="defaultBgPosition" class="theme-input">
              <option value="left" ${values.bgPosition === 'left' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgHPos.left')}</option>
              <option value="center" ${values.bgPosition === 'center' || !values.bgPosition ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgHPos.center')}</option>
              <option value="right" ${values.bgPosition === 'right' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgHPos.right')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.bgVPos')}</label>
            <select id="defaultBgVPosition" class="theme-input">
              <option value="top" ${values.bgVPosition === 'top' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgVPos.top')}</option>
              <option value="center" ${values.bgVPosition === 'center' || !values.bgVPosition ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgVPos.center')}</option>
              <option value="bottom" ${values.bgVPosition === 'bottom' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgVPos.bottom')}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.bgSize')}</label>
            <select id="defaultBgSize" class="theme-input">
              <option value="cover" ${values.bgSize === 'cover' || !values.bgSize ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgSize.cover')}</option>
              <option value="contain" ${values.bgSize === 'contain' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgSize.contain')}</option>
              <option value="fill" ${values.bgSize === 'fill' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgSize.fill')}</option>
              <option value="tile" ${values.bgSize === 'tile' ? 'selected' : ''}>${t('admin.sizes.advancedSettings.bgSize.tile')}</option>
            </select>
          </div>
          <div class="form-group" id="bgImageSizeGroup" style="display: ${values.bgSize === 'tile' || values.bgSize === 'cover' || values.bgSize === 'contain' ? 'block' : 'none'};">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.bgImageSize')}</label>
            <input type="range" id="defaultBgImageSize" class="theme-input" value="${values.bgImageSize ?? 100}" step="1" min="10" max="500" style="width: 100%;">
            <div class="slider-value" style="display: flex; justify-content: center; margin-top: 4px;">
              <span id="defaultBgImageSizeValue">${values.bgImageSize ?? 100}%</span>
            </div>
            <div class="hint">${t('admin.sizes.advancedSettings.bgImageSizeHint')}</div>
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.textGradientOpacity')}</label>
            <input type="number" id="defaultTextGradientOpacity" class="theme-input" value="${values.textGradientOpacity ?? defaults.textGradientOpacity}" step="1" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.centerTextOverlayOpacity')}</label>
            <input type="number" id="defaultCenterTextOverlayOpacity" class="theme-input" value="${values.centerTextOverlayOpacity ?? 20}" step="1" min="0" max="100">
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.advancedSettings.defaultFont')}</label>
            <select id="defaultFontFamily" class="theme-input">
              ${AVAILABLE_FONTS.map(font => {
                const currentFontFamily = (values.fontFamily === 'system-ui' ? 'YS Text' : values.fontFamily) || 'YS Text';
                const selected = currentFontFamily === font.family ? 'selected' : '';
                return `<option value="${font.family}" ${selected}>${font.name || font.family}</option>`;
              }).join('')}
            </select>
            <div class="hint">${t('admin.sizes.advancedSettings.defaultFontHint')}</div>
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="border-left-color: #4ECDC4; background: ${hexToRgba('#4ECDC4', 0.08)}; margin-top: var(--spacing-sm);">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba('#4ECDC4', 0.3)};">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: ${hexToRgba('#4ECDC4', 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: #4ECDC4; font-size: var(--font-size-lg);">download</span>
          </div>
          <div>
            <h3 class="admin-section-title">${t('admin.sizes.exportSettings.title')}</h3>
            <div class="hint" style="margin-top: 2px;">${t('admin.sizes.exportSettings.desc')}</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.exportSettings.maxFileSize')}</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="number" id="defaultMaxFileSizeValue" class="theme-input" value="${values.maxFileSizeValue ?? 150}" step="0.1" min="0.1" max="100" style="flex: 1;">
              <select id="defaultMaxFileSizeUnit" class="theme-input" style="flex: 0 0 120px;">
                <option value="KB" ${(values.maxFileSizeUnit || 'KB') === 'KB' ? 'selected' : ''}>${t('admin.sizes.exportSettings.maxFileSizeUnit.KB')}</option>
                <option value="MB" ${(values.maxFileSizeUnit || 'KB') === 'MB' ? 'selected' : ''}>${t('admin.sizes.exportSettings.maxFileSizeUnit.MB')}</option>
              </select>
            </div>
            <div class="hint">${t('admin.sizes.exportSettings.maxFileSizeHint')}</div>
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="label-medium" style="margin-bottom: var(--spacing-xs);">${t('admin.sizes.exportSettings.habrBorder')}</label>
            <div class="checkbox-group" style="margin-bottom: var(--spacing-sm);">
              <input type="checkbox" id="defaultHabrBorderEnabled" ${values.habrBorderEnabled ? 'checked' : ''}>
              <label for="defaultHabrBorderEnabled" style="margin: 0;">${t('admin.sizes.exportSettings.habrBorderEnabled')}</label>
            </div>
            <div class="input-group" style="display: flex; gap: 8px; align-items: center;">
              <label for="defaultHabrBorderColor" class="sr-only">${t('admin.sizes.exportSettings.habrBorderColor')}</label>
              <input type="color" id="defaultHabrBorderColor" value="${values.habrBorderColor || '#D5DDDF'}" style="flex: 0 0 60px;">
              <input type="text" id="defaultHabrBorderColorHex" class="theme-input" value="${values.habrBorderColor || '#D5DDDF'}" placeholder="#D5DDDF" style="flex: 1;">
            </div>
            <div class="hint">${t('admin.sizes.exportSettings.habrBorderHint')}</div>
          </div>
        </div>
      </div>
      
      ${(() => {
        // Содержимое из вкладки множителей
        const multipliers = values.formatMultipliers || {
          vertical: { logo: 2, title: 1, subtitle: 1, legal: 1, age: 1 },
          ultraWide: { logo: 0.75, titleSmall: 3, titleMedium: 2.2, titleLarge: 2, subtitleSmall: 3, subtitleMedium: 2.2, subtitleLarge: 2, legalNormal: 2.5, legalMedium: 2, age: 2 },
          veryWide: { logo: 0.75, titleMedium: 2.2, titleLarge: 2, titleExtraLarge: 2, subtitleMedium: 2.2, subtitleLarge: 2, subtitleExtraLarge: 2, legalNormal: 2.5, legalMedium: 2, legalExtraLarge: 2.5, age: 2 },
          horizontal: { logo: 0.75, titleSmall: 1.8, titleLarge: 1.6, titleWideSmall: 1.2, titleWideMedium: 1.4, subtitleSmall: 1.8, subtitleLarge: 1.6, subtitleWideSmall: 1.2, subtitleWideMedium: 1.4, legalSmall: 1.8, legalLarge: 2, legalWide450: 1.2, legalWide500: 1.1, legalWideOther: 1.15, age: 2, ageWide: null },
          square: { title: 0.9, subtitle: 0.9 },
          tall: { title: 1.3, subtitle: 1.3 }
        };
        
        // Цвета для разных типов форматов
        const colorVertical = '#FF9800';
        const colorUltraWide = '#2196F3';
        const colorVeryWide = '#9C27B0';
        const colorHorizontal = '#4CAF50';
        const colorSquare = '#FFC107';
        const colorTall = '#E91E63';
        
        // Цвета для элементов
        const colorLogo = '#AA96DA';
        const colorTitle = '#FF6B6B';
        const colorSubtitle = '#4ECDC4';
        const colorLegal = '#95E1D3';
        const colorAge = '#F38181';
        
        return `
      <div class="admin-info-box" style="margin-top: var(--spacing-xl);">
        <div style="display: flex; align-items: flex-start; gap: var(--spacing-md);">
          <span class="material-icons" style="font-size: var(--font-size-lg); color: #2196F3; flex-shrink: 0; margin-top: 2px;">zoom_in</span>
          <div>
            <div style="font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--spacing-xs); font-size: var(--font-size-md);">Множители форматов</div>
            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5;">Множители применяются к размерам элементов в зависимости от типа формата. Схожие элементы выделены одинаковыми цветами для удобства навигации.</div>
          </div>
        </div>
      </div>
      
      <div class="admin-color-group" style="background: ${hexToRgba(colorVertical, 0.08)}; border-left-color: ${colorVertical};">
        <div class="admin-section-header" style="border-bottom-color: ${hexToRgba(colorVertical, 0.3)};">
          <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background: ${hexToRgba(colorVertical, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorVertical}; font-size: var(--font-size-xl);">crop_portrait</span>
          </div>
          <div>
            <h3 class="admin-section-title">Вертикальные форматы</h3>
            <div class="hint" style="margin-top: 2px;">height >= width × 1.5 (вертикальные баннеры)</div>
          </div>
        </div>
        <div class="admin-form-grid">
          <div class="form-group" style="border-left: 3px solid ${colorLogo}; padding-left: 10px; background: ${hexToRgba(colorLogo, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLogo};"></span>
              Логотип
            </label>
            <input type="number" id="multiplier-vertical-logo" value="${multipliers.vertical.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorTitle}; padding-left: 10px; background: ${hexToRgba(colorTitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorTitle};"></span>
              Заголовок
            </label>
            <input type="number" id="multiplier-vertical-title" value="${multipliers.vertical.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorSubtitle}; padding-left: 10px; background: ${hexToRgba(colorSubtitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorSubtitle};"></span>
              Подзаголовок
            </label>
            <input type="number" id="multiplier-vertical-subtitle" value="${multipliers.vertical.subtitle ?? 1}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorLegal}; padding-left: 10px; background: ${hexToRgba(colorLegal, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLegal};"></span>
              Юридический текст
            </label>
            <input type="number" id="multiplier-vertical-legal" value="${multipliers.vertical.legal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorAge}; padding-left: 10px; background: ${hexToRgba(colorAge, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorAge};"></span>
              Возраст
            </label>
            <input type="number" id="multiplier-vertical-age" value="${multipliers.vertical.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${hexToRgba(colorUltraWide, 0.08)}; border: 1px solid ${hexToRgba(colorUltraWide, 0.4)}; border-left: 4px solid ${colorUltraWide}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${hexToRgba(colorUltraWide, 0.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${hexToRgba(colorUltraWide, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorUltraWide}; font-size: 22px;">crop_landscape</span>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Ультра-широкие форматы</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">width >= height × 8 (очень широкие баннеры)</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group" style="border-left: 3px solid ${colorLogo}; padding-left: 10px; background: ${hexToRgba(colorLogo, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLogo};"></span>
              Логотип
            </label>
            <input type="number" id="multiplier-ultraWide-logo" value="${multipliers.ultraWide.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorTitle}; padding-left: 10px; background: ${hexToRgba(colorTitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorTitle};"></span>
              Заголовок (height < 120)
            </label>
            <input type="number" id="multiplier-ultraWide-titleSmall" value="${multipliers.ultraWide.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorSubtitle}; padding-left: 10px; background: ${hexToRgba(colorSubtitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorSubtitle};"></span>
              Подзаголовок (height < 120)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleSmall" value="${multipliers.ultraWide.subtitleSmall ?? multipliers.ultraWide.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorTitle}; padding-left: 10px; background: ${hexToRgba(colorTitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorTitle};"></span>
              Заголовок (height < 200)
            </label>
            <input type="number" id="multiplier-ultraWide-titleMedium" value="${multipliers.ultraWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorSubtitle}; padding-left: 10px; background: ${hexToRgba(colorSubtitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorSubtitle};"></span>
              Подзаголовок (height < 200)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleMedium" value="${multipliers.ultraWide.subtitleMedium ?? multipliers.ultraWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorTitle}; padding-left: 10px; background: ${hexToRgba(colorTitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorTitle};"></span>
              Заголовок (height >= 200)
            </label>
            <input type="number" id="multiplier-ultraWide-titleLarge" value="${multipliers.ultraWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorSubtitle}; padding-left: 10px; background: ${hexToRgba(colorSubtitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorSubtitle};"></span>
              Подзаголовок (height >= 200)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleLarge" value="${multipliers.ultraWide.subtitleLarge ?? multipliers.ultraWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorLegal}; padding-left: 10px; background: ${hexToRgba(colorLegal, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLegal};"></span>
              Юридический (обычный)
            </label>
            <input type="number" id="multiplier-ultraWide-legalNormal" value="${multipliers.ultraWide.legalNormal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorLegal}; padding-left: 10px; background: ${hexToRgba(colorLegal, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLegal};"></span>
              Юридический (height 250-350)
            </label>
            <input type="number" id="multiplier-ultraWide-legalMedium" value="${multipliers.ultraWide.legalMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorAge}; padding-left: 10px; background: ${hexToRgba(colorAge, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorAge};"></span>
              Возраст
            </label>
            <input type="number" id="multiplier-ultraWide-age" value="${multipliers.ultraWide.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${hexToRgba(colorVeryWide, 0.08)}; border: 1px solid ${hexToRgba(colorVeryWide, 0.4)}; border-left: 4px solid ${colorVeryWide}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${hexToRgba(colorVeryWide, 0.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${hexToRgba(colorVeryWide, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorVeryWide}; font-size: 22px;">crop_landscape</span>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Очень широкие форматы</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">width >= height × 4 (широкие баннеры)</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Логотип</label>
            <input type="number" id="multiplier-veryWide-logo" value="${multipliers.veryWide.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height < 200)</label>
            <input type="number" id="multiplier-veryWide-titleMedium" value="${multipliers.veryWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height < 200)</label>
            <input type="number" id="multiplier-veryWide-subtitleMedium" value="${multipliers.veryWide.subtitleMedium ?? multipliers.veryWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height >= 200)</label>
            <input type="number" id="multiplier-veryWide-titleLarge" value="${multipliers.veryWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height >= 200)</label>
            <input type="number" id="multiplier-veryWide-subtitleLarge" value="${multipliers.veryWide.subtitleLarge ?? multipliers.veryWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-titleExtraLarge" value="${multipliers.veryWide.titleExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-subtitleExtraLarge" value="${multipliers.veryWide.subtitleExtraLarge ?? multipliers.veryWide.titleExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (обычный)</label>
            <input type="number" id="multiplier-veryWide-legalNormal" value="${multipliers.veryWide.legalNormal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height 250-350)</label>
            <input type="number" id="multiplier-veryWide-legalMedium" value="${multipliers.veryWide.legalMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-legalExtraLarge" value="${multipliers.veryWide.legalExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Возраст</label>
            <input type="number" id="multiplier-veryWide-age" value="${multipliers.veryWide.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${hexToRgba(colorHorizontal, 0.08)}; border: 1px solid ${hexToRgba(colorHorizontal, 0.4)}; border-left: 4px solid ${colorHorizontal}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${hexToRgba(colorHorizontal, 0.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${hexToRgba(colorHorizontal, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorHorizontal}; font-size: 22px;">crop_landscape</span>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Горизонтальные форматы</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">width >= height × 1.5 (горизонтальные баннеры)</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Логотип</label>
            <input type="number" id="multiplier-horizontal-logo" value="${multipliers.horizontal.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height < 200)</label>
            <input type="number" id="multiplier-horizontal-titleSmall" value="${multipliers.horizontal.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height < 200)</label>
            <input type="number" id="multiplier-horizontal-subtitleSmall" value="${multipliers.horizontal.subtitleSmall ?? multipliers.horizontal.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height >= 200)</label>
            <input type="number" id="multiplier-horizontal-titleLarge" value="${multipliers.horizontal.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height >= 200)</label>
            <input type="number" id="multiplier-horizontal-subtitleLarge" value="${multipliers.horizontal.subtitleLarge ?? multipliers.horizontal.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (широкий, height >= 800)</label>
            <input type="number" id="multiplier-horizontal-titleWideSmall" value="${multipliers.horizontal.titleWideSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (широкий, height >= 800)</label>
            <input type="number" id="multiplier-horizontal-subtitleWideSmall" value="${multipliers.horizontal.subtitleWideSmall ?? multipliers.horizontal.titleWideSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (широкий, height 500-800)</label>
            <input type="number" id="multiplier-horizontal-titleWideMedium" value="${multipliers.horizontal.titleWideMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (широкий, height 500-800)</label>
            <input type="number" id="multiplier-horizontal-subtitleWideMedium" value="${multipliers.horizontal.subtitleWideMedium ?? multipliers.horizontal.titleWideMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height 250-350)</label>
            <input type="number" id="multiplier-horizontal-legalSmall" value="${multipliers.horizontal.legalSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height > 350)</label>
            <input type="number" id="multiplier-horizontal-legalLarge" value="${multipliers.horizontal.legalLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, height 450-500)</label>
            <input type="number" id="multiplier-horizontal-legalWide450" value="${multipliers.horizontal.legalWide450}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, height 500-1080)</label>
            <input type="number" id="multiplier-horizontal-legalWide500" value="${multipliers.horizontal.legalWide500}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, другое)</label>
            <input type="number" id="multiplier-horizontal-legalWideOther" value="${multipliers.horizontal.legalWideOther}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Возраст</label>
            <input type="number" id="multiplier-horizontal-age" value="${multipliers.horizontal.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid ${hexToRgba(borderColor, 0.4)}; border-left: 4px solid ${borderColor}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${borderColor};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${textSecondary}; font-size: 22px;">tune</span>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Дополнительные настройки</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">Специальные форматы</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Квадратные форматы: Заголовок</label>
            <input type="number" id="multiplier-square-title" value="${multipliers.square.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Квадратные форматы: Подзаголовок</label>
            <input type="number" id="multiplier-square-subtitle" value="${multipliers.square.subtitle ?? multipliers.square.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Высокие макеты (height/width >= 2): Заголовок</label>
            <input type="number" id="multiplier-tall-title" value="${multipliers.tall.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Высокие макеты (height/width >= 2): Подзаголовок</label>
            <input type="number" id="multiplier-tall-subtitle" value="${multipliers.tall.subtitle ?? multipliers.tall.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; color: ${textPrimary}; font-size: 13px;">
        <strong>💡 Подсказка:</strong> Изменения применяются автоматически при изменении значений. Множители влияют на размеры элементов в зависимости от типа формата.
      </div>
        `;
      })()}
      
      ${(() => {
        // Содержимое из вкладки фонов
        let savedBackgrounds = JSON.parse(localStorage.getItem('adminBackgrounds') || '[]');
        
        // Функция для вычисления настроек цвета
        const getColorSettings = (color) => {
          // Вычисляем цвет текста на основе яркости фона
          const hex = color.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          
          // Специальная проверка для красных и оранжевых фонов - всегда белый текст и белый логотип
          let textColor = '#ffffff';
          let logoFolder = 'white';
          
          if (color === '#FF6C26' || color === '#E84033') {
            textColor = '#ffffff';
            logoFolder = 'white';
          } else {
            textColor = luminance > 0.5 ? '#1e1e1e' : '#ffffff';
            logoFolder = luminance > 0.5 ? 'black' : 'white';
          }
          
          return {
            bgColor: color,
            bgImage: null,
            textColor: textColor,
            logoFolder: logoFolder
          };
        };
        
        // Проверяем, есть ли все предустановленные цвета в сохраненных фонах
        const existingColors = savedBackgrounds.map(bg => bg.bgColor?.toUpperCase()).filter(Boolean);
        const missingPresetColors = PRESET_BACKGROUND_COLORS.filter(color => 
          !existingColors.includes(color.toUpperCase())
        );
        
        // Добавляем недостающие предустановленные цвета
        if (missingPresetColors.length > 0) {
          const newBackgrounds = missingPresetColors.map(color => getColorSettings(color));
          savedBackgrounds = [...savedBackgrounds, ...newBackgrounds];
          // Сохраняем обновленный список
          localStorage.setItem('adminBackgrounds', JSON.stringify(savedBackgrounds));
        }
        
        // Если вообще нет сохраненных фонов, создаем все из предустановленных цветов
        if (savedBackgrounds.length === 0) {
          savedBackgrounds = PRESET_BACKGROUND_COLORS.map(color => getColorSettings(color));
          localStorage.setItem('adminBackgrounds', JSON.stringify(savedBackgrounds));
        }
        
        const colorBg = '#FF6C26';
        
        return `
          <div style="border-top: 2px solid ${borderColor}; margin-top: 32px; padding-top: 32px;">
            <div style="padding: 14px; background: rgba(33, 150, 243, 0.12); border-left: 4px solid #2196F3; border-radius: 6px; margin-bottom: 20px;">
              <div style="display: flex; align-items: flex-start; gap: 10px;">
                <span class="material-icons" style="font-size: 20px; color: #2196F3; flex-shrink: 0; margin-top: 2px;">palette</span>
                <div>
                  <div style="font-weight: 600; color: ${textPrimary}; margin-bottom: 4px; font-size: 14px;">Управление фонами</div>
                  <div style="font-size: 12px; color: ${textSecondary}; line-height: 1.5;">Настройте фоны, цвета текста и логотипы для каждого фона. При выборе фона автоматически применяются соответствующие настройки текста и логотипа.</div>
                </div>
              </div>
            </div>
            
            <div style="margin-bottom: 16px;">
              <button class="btn btn-primary" id="adminAddBackground" style="display: flex; align-items: center; gap: 6px;">
                <span class="material-icons" style="font-size: 18px;">add</span>
                Добавить фон
              </button>
            </div>
            
            <div id="adminBackgroundsList" style="display: flex; flex-direction: column; gap: 16px;">
              ${savedBackgrounds.map((bg, index) => `
                <div class="admin-background-item" data-bg-index="${index}" style="border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px; background: ${bgPrimary};">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 60px; height: 60px; border-radius: 8px; background: ${bg.bgColor || '#1e1e1e'}; border: 1px solid ${borderColor}; position: relative; overflow: hidden;">
                        ${bg.bgImage ? `<img src="${bg.bgImage}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                      </div>
                      <div>
                        <div style="font-weight: 600; color: ${textPrimary}; margin-bottom: 4px;">Фон #${index + 1}</div>
                        <div style="font-size: 12px; color: ${textSecondary};">
                          ${bg.bgImage ? 'Изображение' : `Цвет: ${bg.bgColor || '#1e1e1e'}`}
                        </div>
                      </div>
                    </div>
                    <button class="btn btn-danger" data-remove-bg="${index}" style="padding: 8px;">
                      <span class="material-icons" style="font-size: 18px;">delete</span>
                    </button>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                    <div class="form-group">
                      <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Фон</label>
                      <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="color" class="admin-bg-color" data-bg-index="${index}" value="${bg.bgColor || '#1e1e1e'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer;">
                        <input type="text" class="admin-bg-color-hex" data-bg-index="${index}" value="${bg.bgColor || '#1e1e1e'}" placeholder="#1e1e1e" style="flex: 1; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
                      </div>
                      <button class="btn" data-upload-bg="${index}" style="width: 100%; margin-bottom: 8px;">
                        <span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>
                        Загрузить изображение
                      </button>
                      <input type="file" class="admin-bg-upload-file" data-bg-index="${index}" accept="image/*" style="display: none;">
                      <button class="btn" data-select-bg="${index}" style="width: 100%; margin-bottom: 8px;">
                        <span class="material-icons" style="font-size: 18px; margin-right: 4px;">image</span>
                        Выбрать из библиотеки
                      </button>
                      ${bg.bgImage ? `<button class="btn btn-danger" data-clear-bg="${index}" style="width: 100%;">
                        <span class="material-icons" style="font-size: 18px; margin-right: 4px;">delete</span>
                        Удалить изображение
                      </button>` : ''}
                    </div>
                    
                    <div class="form-group">
                      <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Цвет текста</label>
                      <div style="display: flex; gap: 8px;">
                        <input type="color" class="admin-text-color" data-bg-index="${index}" value="${bg.textColor || '#ffffff'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer;">
                        <input type="text" class="admin-text-color-hex" data-bg-index="${index}" value="${bg.textColor || '#ffffff'}" placeholder="#ffffff" style="flex: 1; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Логотип</label>
                      <select class="admin-logo-folder" data-bg-index="${index}" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
                        <option value="white" ${bg.logoFolder === 'white' ? 'selected' : ''}>Белый</option>
                        <option value="black" ${bg.logoFolder === 'black' || !bg.logoFolder ? 'selected' : ''}>Черный</option>
                      </select>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      })()}
    </div>
  `;
};

/**
 * Рендерит вкладку с настройками множителей форматов
 */
const renderMultipliersTab = () => {
  try {
    const state = getState();
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const borderColor = computedStyle.getPropertyValue('--border-color') || '#2a2a2a';
    const bgPrimary = computedStyle.getPropertyValue('--bg-primary') || '#0d0d0d';
    const textPrimary = computedStyle.getPropertyValue('--text-primary') || '#e9e9e9';
    const textSecondary = computedStyle.getPropertyValue('--text-secondary') || '#999999';
    
    // Получаем множители из state или используем дефолтные
    const multipliers = state.formatMultipliers || {
      vertical: { logo: 2, title: 1, subtitle: 1, legal: 1, age: 1 },
      ultraWide: { logo: 0.75, titleSmall: 3, titleMedium: 2.2, titleLarge: 2, subtitleSmall: 3, subtitleMedium: 2.2, subtitleLarge: 2, legalNormal: 2.5, legalMedium: 2, age: 2 },
      veryWide: { logo: 0.75, titleMedium: 2.2, titleLarge: 2, titleExtraLarge: 2, subtitleMedium: 2.2, subtitleLarge: 2, subtitleExtraLarge: 2, legalNormal: 2.5, legalMedium: 2, legalExtraLarge: 2.5, age: 2 },
      horizontal: { logo: 0.75, titleSmall: 1.8, titleLarge: 1.6, titleWideSmall: 1.2, titleWideMedium: 1.4, subtitleSmall: 1.8, subtitleLarge: 1.6, subtitleWideSmall: 1.2, subtitleWideMedium: 1.4, legalSmall: 1.8, legalLarge: 2, legalWide450: 1.2, legalWide500: 1.1, legalWideOther: 1.15, age: 2, ageWide: null },
      square: { title: 0.9, subtitle: 0.9 },
      tall: { title: 1.3, subtitle: 1.3 }
    };
    
    // Функция для преобразования hex в rgba
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Цвета для разных типов форматов
    const colorVertical = '#FF9800';
    const colorUltraWide = '#2196F3';
    const colorVeryWide = '#9C27B0';
    const colorHorizontal = '#4CAF50';
    const colorSquare = '#FFC107';
    const colorTall = '#E91E63';
    
    // Цвета для элементов
    const colorLogo = '#AA96DA';
    const colorTitle = '#FF6B6B';
    const colorSubtitle = '#4ECDC4';
    const colorLegal = '#95E1D3';
    const colorAge = '#F38181';
    
    const formatSummaries = buildFormatTypeSummaries(state);
    const renderHeadingHint = (type, maxItems = 15) => {
      const summary = formatSizeSummary(formatSummaries[type], maxItems);
      if (!summary) {
        return '';
      }
      return `<div class="format-type-hint" style="font-size: 10px; color: ${textSecondary}; margin-top: 6px; line-height: 1.4; padding: 6px 8px; background: rgba(255, 255, 255, 0.03); border-radius: 4px; font-family: 'Courier New', monospace;">${summary}</div>`;
    };
    const renderInlineHint = (type, maxItems = 10) => {
      const summary = formatSizeSummary(formatSummaries[type], maxItems);
      if (!summary) {
        return '';
      }
      return `<div class="format-type-hint" style="font-size: 10px; color: ${textSecondary}; margin: 4px 0; line-height: 1.4; padding: 4px 6px; background: rgba(255, 255, 255, 0.03); border-radius: 4px; font-family: 'Courier New', monospace;">${summary}</div>`;
    };
    
    return `
    <div style="display: flex; flex-direction: column; gap: 20px; width: 100%; min-width: 0;">
      <div style="padding: 14px; background: rgba(33, 150, 243, 0.12); border-left: 4px solid #2196F3; border-radius: 6px; margin-bottom: 4px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span class="material-icons" style="font-size: 20px; color: #2196F3; flex-shrink: 0; margin-top: 2px;">zoom_in</span>
          <div>
            <div style="font-weight: 600; color: ${textPrimary}; margin-bottom: 4px; font-size: 14px;">Множители форматов</div>
            <div style="font-size: 12px; color: ${textSecondary}; line-height: 1.5;">Множители применяются к размерам элементов в зависимости от типа формата. Схожие элементы выделены одинаковыми цветами для удобства навигации.</div>
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${hexToRgba(colorVertical, 0.08)}; border: 1px solid ${hexToRgba(colorVertical, 0.4)}; border-left: 4px solid ${colorVertical}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${hexToRgba(colorVertical, 0.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${hexToRgba(colorVertical, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorVertical}; font-size: 22px;">crop_portrait</span>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Вертикальные форматы</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">height >= width × 1.5 (вертикальные баннеры)</div>
            ${renderHeadingHint('vertical')}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group" style="border-left: 3px solid ${colorLogo}; padding-left: 10px; background: ${hexToRgba(colorLogo, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLogo};"></span>
              Логотип
            </label>
            <input type="number" id="multiplier-vertical-logo" value="${multipliers.vertical.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorTitle}; padding-left: 10px; background: ${hexToRgba(colorTitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorTitle};"></span>
              Заголовок
            </label>
            <input type="number" id="multiplier-vertical-title" value="${multipliers.vertical.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorSubtitle}; padding-left: 10px; background: ${hexToRgba(colorSubtitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorSubtitle};"></span>
              Подзаголовок
            </label>
            <input type="number" id="multiplier-vertical-subtitle" value="${multipliers.vertical.subtitle ?? 1}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorLegal}; padding-left: 10px; background: ${hexToRgba(colorLegal, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLegal};"></span>
              Юридический текст
            </label>
            <input type="number" id="multiplier-vertical-legal" value="${multipliers.vertical.legal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorAge}; padding-left: 10px; background: ${hexToRgba(colorAge, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorAge};"></span>
              Возраст
            </label>
            <input type="number" id="multiplier-vertical-age" value="${multipliers.vertical.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${hexToRgba(colorUltraWide, 0.08)}; border: 1px solid ${hexToRgba(colorUltraWide, 0.4)}; border-left: 4px solid ${colorUltraWide}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${hexToRgba(colorUltraWide, 0.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${hexToRgba(colorUltraWide, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorUltraWide}; font-size: 22px;">crop_landscape</span>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Ультра-широкие форматы</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">width >= height × 8 (очень широкие баннеры)</div>
            ${renderHeadingHint('ultraWide')}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group" style="border-left: 3px solid ${colorLogo}; padding-left: 10px; background: ${hexToRgba(colorLogo, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLogo};"></span>
              Логотип
            </label>
            <input type="number" id="multiplier-ultraWide-logo" value="${multipliers.ultraWide.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorTitle}; padding-left: 10px; background: ${hexToRgba(colorTitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorTitle};"></span>
              Заголовок (height < 120)
            </label>
            <input type="number" id="multiplier-ultraWide-titleSmall" value="${multipliers.ultraWide.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorSubtitle}; padding-left: 10px; background: ${hexToRgba(colorSubtitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorSubtitle};"></span>
              Подзаголовок (height < 120)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleSmall" value="${multipliers.ultraWide.subtitleSmall ?? multipliers.ultraWide.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorTitle}; padding-left: 10px; background: ${hexToRgba(colorTitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorTitle};"></span>
              Заголовок (height < 200)
            </label>
            <input type="number" id="multiplier-ultraWide-titleMedium" value="${multipliers.ultraWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorSubtitle}; padding-left: 10px; background: ${hexToRgba(colorSubtitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorSubtitle};"></span>
              Подзаголовок (height < 200)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleMedium" value="${multipliers.ultraWide.subtitleMedium ?? multipliers.ultraWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorTitle}; padding-left: 10px; background: ${hexToRgba(colorTitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorTitle};"></span>
              Заголовок (height >= 200)
            </label>
            <input type="number" id="multiplier-ultraWide-titleLarge" value="${multipliers.ultraWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorSubtitle}; padding-left: 10px; background: ${hexToRgba(colorSubtitle, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorSubtitle};"></span>
              Подзаголовок (height >= 200)
            </label>
            <input type="number" id="multiplier-ultraWide-subtitleLarge" value="${multipliers.ultraWide.subtitleLarge ?? multipliers.ultraWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorLegal}; padding-left: 10px; background: ${hexToRgba(colorLegal, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLegal};"></span>
              Юридический (обычный)
            </label>
            <input type="number" id="multiplier-ultraWide-legalNormal" value="${multipliers.ultraWide.legalNormal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorLegal}; padding-left: 10px; background: ${hexToRgba(colorLegal, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorLegal};"></span>
              Юридический (height 250-350)
            </label>
            <input type="number" id="multiplier-ultraWide-legalMedium" value="${multipliers.ultraWide.legalMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group" style="border-left: 3px solid ${colorAge}; padding-left: 10px; background: ${hexToRgba(colorAge, 0.08)};">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colorAge};"></span>
              Возраст
            </label>
            <input type="number" id="multiplier-ultraWide-age" value="${multipliers.ultraWide.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${hexToRgba(colorVeryWide, 0.08)}; border: 1px solid ${hexToRgba(colorVeryWide, 0.4)}; border-left: 4px solid ${colorVeryWide}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${hexToRgba(colorVeryWide, 0.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${hexToRgba(colorVeryWide, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorVeryWide}; font-size: 22px;">crop_landscape</span>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Очень широкие форматы</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">width >= height × 4 (широкие баннеры)</div>
            ${renderHeadingHint('veryWide')}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Логотип</label>
            <input type="number" id="multiplier-veryWide-logo" value="${multipliers.veryWide.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height < 200)</label>
            <input type="number" id="multiplier-veryWide-titleMedium" value="${multipliers.veryWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height < 200)</label>
            <input type="number" id="multiplier-veryWide-subtitleMedium" value="${multipliers.veryWide.subtitleMedium ?? multipliers.veryWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height >= 200)</label>
            <input type="number" id="multiplier-veryWide-titleLarge" value="${multipliers.veryWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height >= 200)</label>
            <input type="number" id="multiplier-veryWide-subtitleLarge" value="${multipliers.veryWide.subtitleLarge ?? multipliers.veryWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-titleExtraLarge" value="${multipliers.veryWide.titleExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-subtitleExtraLarge" value="${multipliers.veryWide.subtitleExtraLarge ?? multipliers.veryWide.titleExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (обычный)</label>
            <input type="number" id="multiplier-veryWide-legalNormal" value="${multipliers.veryWide.legalNormal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height 250-350)</label>
            <input type="number" id="multiplier-veryWide-legalMedium" value="${multipliers.veryWide.legalMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (width >= 2000, height 400-800)</label>
            <input type="number" id="multiplier-veryWide-legalExtraLarge" value="${multipliers.veryWide.legalExtraLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Возраст</label>
            <input type="number" id="multiplier-veryWide-age" value="${multipliers.veryWide.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${hexToRgba(colorHorizontal, 0.08)}; border: 1px solid ${hexToRgba(colorHorizontal, 0.4)}; border-left: 4px solid ${colorHorizontal}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${hexToRgba(colorHorizontal, 0.3)};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: ${hexToRgba(colorHorizontal, 0.2)}; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${colorHorizontal}; font-size: 22px;">crop_landscape</span>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Горизонтальные форматы</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">width >= height × 1.5 (горизонтальные баннеры)</div>
            ${renderHeadingHint('horizontal')}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Логотип</label>
            <input type="number" id="multiplier-horizontal-logo" value="${multipliers.horizontal.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height < 200)</label>
            <input type="number" id="multiplier-horizontal-titleSmall" value="${multipliers.horizontal.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height < 200)</label>
            <input type="number" id="multiplier-horizontal-subtitleSmall" value="${multipliers.horizontal.subtitleSmall ?? multipliers.horizontal.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height >= 200)</label>
            <input type="number" id="multiplier-horizontal-titleLarge" value="${multipliers.horizontal.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height >= 200)</label>
            <input type="number" id="multiplier-horizontal-subtitleLarge" value="${multipliers.horizontal.subtitleLarge ?? multipliers.horizontal.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (широкий, height >= 800)</label>
            <input type="number" id="multiplier-horizontal-titleWideSmall" value="${multipliers.horizontal.titleWideSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (широкий, height >= 800)</label>
            <input type="number" id="multiplier-horizontal-subtitleWideSmall" value="${multipliers.horizontal.subtitleWideSmall ?? multipliers.horizontal.titleWideSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (широкий, height 500-800)</label>
            <input type="number" id="multiplier-horizontal-titleWideMedium" value="${multipliers.horizontal.titleWideMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (широкий, height 500-800)</label>
            <input type="number" id="multiplier-horizontal-subtitleWideMedium" value="${multipliers.horizontal.subtitleWideMedium ?? multipliers.horizontal.titleWideMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height 250-350)</label>
            <input type="number" id="multiplier-horizontal-legalSmall" value="${multipliers.horizontal.legalSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height > 350)</label>
            <input type="number" id="multiplier-horizontal-legalLarge" value="${multipliers.horizontal.legalLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, height 450-500)</label>
            <input type="number" id="multiplier-horizontal-legalWide450" value="${multipliers.horizontal.legalWide450}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, height 500-1080)</label>
            <input type="number" id="multiplier-horizontal-legalWide500" value="${multipliers.horizontal.legalWide500}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (широкий, другое)</label>
            <input type="number" id="multiplier-horizontal-legalWideOther" value="${multipliers.horizontal.legalWideOther}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Возраст</label>
            <input type="number" id="multiplier-horizontal-age" value="${multipliers.horizontal.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid ${hexToRgba(borderColor, 0.4)}; border-left: 4px solid ${borderColor}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${borderColor};">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center;">
            <span class="material-icons" style="color: ${textSecondary}; font-size: 22px;">tune</span>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Дополнительные настройки</h3>
            <div style="font-size: 11px; color: ${textSecondary}; margin-top: 2px;">Специальные форматы</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Квадратные форматы: Заголовок</label>
            ${renderInlineHint('square')}
            <input type="number" id="multiplier-square-title" value="${multipliers.square.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Квадратные форматы: Подзаголовок</label>
            ${renderInlineHint('square')}
            <input type="number" id="multiplier-square-subtitle" value="${multipliers.square.subtitle ?? multipliers.square.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Высокие макеты (height/width >= 2): Заголовок</label>
            ${renderInlineHint('tall')}
            <input type="number" id="multiplier-tall-title" value="${multipliers.tall.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Высокие макеты (height/width >= 2): Подзаголовок</label>
            ${renderInlineHint('tall')}
            <input type="number" id="multiplier-tall-subtitle" value="${multipliers.tall.subtitle ?? multipliers.tall.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; color: ${textPrimary}; font-size: 13px;">
        <strong>💡 Подсказка:</strong> Изменения применяются автоматически при изменении значений. Множители влияют на размеры элементов в зависимости от типа формата.
      </div>
    </div>
  `;
  } catch (error) {
    console.error('Ошибка при рендеринге вкладки множителей:', error);
    return `<div style="padding: 20px; color: red;">Ошибка при загрузке множителей: ${error.message}</div>`;
  }
};

/**
 * Рендерит вкладку с управлением фонами
 */
const renderBackgroundsTab = () => {
  const state = getState();
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a';
  const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d';
  const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
  const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999';
  
  // Получаем сохраненные фоны из localStorage или используем пустой массив
  const savedBackgrounds = JSON.parse(localStorage.getItem('adminBackgrounds') || '[]');
  
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const colorBg = '#FF6C26';
  
  return `
    <div style="padding: 14px; background: rgba(33, 150, 243, 0.12); border-left: 4px solid #2196F3; border-radius: 6px; margin-bottom: 20px;">
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span class="material-icons" style="font-size: 20px; color: #2196F3; flex-shrink: 0; margin-top: 2px;">palette</span>
        <div>
          <div style="font-weight: 600; color: ${textPrimary}; margin-bottom: 4px; font-size: 14px;">Управление фонами</div>
          <div style="font-size: 12px; color: ${textSecondary}; line-height: 1.5;">Настройте фоны, цвета текста и логотипы для каждого фона. При выборе фона автоматически применяются соответствующие настройки текста и логотипа.</div>
        </div>
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <button class="btn btn-primary" id="adminAddBackground" style="display: flex; align-items: center; gap: 6px;">
        <span class="material-icons" style="font-size: 18px;">add</span>
        Добавить фон
      </button>
    </div>
    
    <div id="adminBackgroundsList" style="display: flex; flex-direction: column; gap: 16px;">
      ${savedBackgrounds.map((bg, index) => `
        <div class="admin-background-item" data-bg-index="${index}" style="border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px; background: ${bgPrimary};">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 60px; height: 60px; border-radius: 8px; background: ${bg.bgColor || '#1e1e1e'}; border: 1px solid ${borderColor}; position: relative; overflow: hidden;">
                ${bg.bgImage ? `<img src="${bg.bgImage}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
              </div>
              <div>
                <div style="font-weight: 600; color: ${textPrimary}; margin-bottom: 4px;">Фон #${index + 1}</div>
                <div style="font-size: 12px; color: ${textSecondary};">
                  ${bg.bgImage ? 'Изображение' : `Цвет: ${bg.bgColor || '#1e1e1e'}`}
                </div>
              </div>
            </div>
            <button class="btn btn-danger" data-remove-bg="${index}" style="padding: 8px;">
              <span class="material-icons" style="font-size: 18px;">delete</span>
            </button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Фон</label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="color" class="admin-bg-color" data-bg-index="${index}" value="${bg.bgColor || '#1e1e1e'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer;">
                <input type="text" class="admin-bg-color-hex" data-bg-index="${index}" value="${bg.bgColor || '#1e1e1e'}" placeholder="#1e1e1e" style="flex: 1; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              </div>
              <button class="btn" data-upload-bg="${index}" style="width: 100%; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>
                Загрузить изображение
              </button>
              <input type="file" class="admin-bg-upload-file" data-bg-index="${index}" accept="image/*" style="display: none;">
              <button class="btn" data-select-bg="${index}" style="width: 100%; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">image</span>
                Выбрать из библиотеки
              </button>
              ${bg.bgImage ? `<button class="btn btn-danger" data-clear-bg="${index}" style="width: 100%;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">delete</span>
                Удалить изображение
              </button>` : ''}
            </div>
            
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Цвет текста</label>
              <div style="display: flex; gap: 8px;">
                <input type="color" class="admin-text-color" data-bg-index="${index}" value="${bg.textColor || '#ffffff'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer;">
                <input type="text" class="admin-text-color-hex" data-bg-index="${index}" value="${bg.textColor || '#ffffff'}" placeholder="#ffffff" style="flex: 1; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Логотип</label>
              <select class="admin-logo-folder" data-bg-index="${index}" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
                <option value="white" ${bg.logoFolder === 'white' ? 'selected' : ''}>Белый</option>
                <option value="black" ${bg.logoFolder === 'black' || !bg.logoFolder ? 'selected' : ''}>Черный</option>
              </select>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

/**
 * Создает и показывает модальное окно админки размеров
 */
export const showSizesAdmin = async () => {
  const workspaceAccess = resolveWorkspaceTeamDefaultsAccess();
  if (workspaceAccess.enforced) {
    if (!workspaceAccess.allowed) return;
    await openSizesAdmin();
    return;
  }

  console.log('showSizesAdmin вызвана');
  console.log('isAdminOpen:', isAdminOpen);
  console.log('adminModal:', adminModal);
  console.log('isAdminAuthenticated (до сброса):', isAdminAuthenticated);
  console.log('hasPassword():', hasPassword());
  
  // Проверяем, открыто ли модальное окно
  const existingModal = document.getElementById('sizesAdminModal');
  if (existingModal) {
    const computedStyle = window.getComputedStyle(existingModal);
    const isVisible = computedStyle.display !== 'none' && 
                     computedStyle.visibility !== 'hidden' && 
                     parseFloat(computedStyle.opacity) > 0;
    
    if (isVisible) {
      // Если окно уже открыто, просто закрываем его
      closeSizesAdmin();
      setTimeout(() => {
        showSizesAdmin(); // Рекурсивно вызываем для проверки пароля
      }, 100);
      return;
    }
  }
  
  // ВАЖНО: Всегда сбрасываем флаг аутентификации при открытии, чтобы запрашивать пароль каждый раз
  // (если только пароль не отключен явно)
  isAdminAuthenticated = false;
  
  // Если пароль не установлен (явно отключен), открываем админку без пароля
  if (!hasPassword()) {
    console.log('Пароль не установлен, открываем без пароля');
    isAdminAuthenticated = true;
    await openSizesAdmin().catch(err => console.error('Ошибка при открытии админки:', err));
    return;
  }
  
  // Если уже аутентифицирован в этой сессии (не должно произойти после сброса выше, но на всякий случай)
  if (isAdminAuthenticated) {
    console.log('Уже аутентифицирован, открываем админку');
    await openSizesAdmin().catch(err => console.error('Ошибка при открытии админки:', err));
    return;
  }
  
  // Если не аутентифицирован, показываем окно ввода пароля
  console.log('Показываем окно ввода пароля');
  showPasswordPrompt();
};

/**
 * Показывает модальное окно для изменения пароля
 */
const showChangePasswordModal = () => {
  const root = getComputedStyle(document.documentElement);
  const bgPrimary = root.getPropertyValue('--bg-primary') || '#0d0d0d';
  const bgSecondary = root.getPropertyValue('--bg-secondary') || '#141414';
  const borderColor = root.getPropertyValue('--border-color') || '#2a2a2a';
  const textPrimary = root.getPropertyValue('--text-primary') || '#e9e9e9';
  const textSecondary = root.getPropertyValue('--text-secondary') || '#999999';
  
  // Проверяем текущий пароль
  const currentPassword = getPassword();
  const passwordIsSet = hasPassword();
  
  const passwordModal = document.createElement('div');
  passwordModal.id = 'sizesChangePasswordModal';
  passwordModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100001;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
  `;
  
  passwordModal.innerHTML = `
    <div style="background: ${bgSecondary}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 32px; max-width: 450px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <span class="material-icons" style="font-size: 28px; color: #2196F3;">lock</span>
        <h2 style="margin: 0; font-size: 20px; color: ${textPrimary};">Изменение пароля</h2>
      </div>
      ${passwordIsSet ? `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">Текущий пароль</label>
        <input type="password" id="sizesCurrentPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="Введите текущий пароль" autofocus>
        <div id="sizesCurrentPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">Неверный пароль</div>
      </div>
      ` : ''}
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">Новый пароль</label>
        <input type="password" id="sizesNewPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="Введите новый пароль" ${!passwordIsSet ? 'autofocus' : ''}>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">Подтвердите новый пароль</label>
        <input type="password" id="sizesConfirmPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="Повторите новый пароль">
        <div id="sizesPasswordMatchError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">Пароли не совпадают</div>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 8px; color: ${textSecondary}; font-size: 14px; cursor: pointer;">
          <input type="checkbox" id="sizesRemovePasswordCheckbox" style="width: 18px; height: 18px; cursor: pointer;">
          <span>Удалить пароль (админка будет открываться без пароля)</span>
        </label>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="sizesChangePasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; cursor: pointer;">Отмена</button>
        <button id="sizesChangePasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">Сохранить</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(passwordModal);
  
  const currentPasswordInput = document.getElementById('sizesCurrentPasswordInput');
  const newPasswordInput = document.getElementById('sizesNewPasswordInput');
  const confirmPasswordInput = document.getElementById('sizesConfirmPasswordInput');
  const removePasswordCheckbox = document.getElementById('sizesRemovePasswordCheckbox');
  const currentPasswordError = document.getElementById('sizesCurrentPasswordError');
  const passwordMatchError = document.getElementById('sizesPasswordMatchError');
  const submitBtn = document.getElementById('sizesChangePasswordSubmit');
  const cancelBtn = document.getElementById('sizesChangePasswordCancel');
  
  // Обработчик чекбокса удаления пароля
  if (removePasswordCheckbox) {
    removePasswordCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        newPasswordInput.disabled = true;
        confirmPasswordInput.disabled = true;
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
      } else {
        newPasswordInput.disabled = false;
        confirmPasswordInput.disabled = false;
        newPasswordInput.focus();
      }
    });
  }
  
  const savePassword = () => {
    // Проверяем текущий пароль, если он установлен
    if (passwordIsSet && currentPasswordInput) {
      if (!checkPassword(currentPasswordInput.value)) {
        currentPasswordError.style.display = 'block';
        currentPasswordInput.style.borderColor = '#f44336';
        currentPasswordInput.focus();
        return;
      }
    }
    
    // Проверяем чекбокс удаления пароля
    if (removePasswordCheckbox && removePasswordCheckbox.checked) {
      setPassword('');
      passwordModal.remove();
      alert('Пароль удален. Админка теперь открывается без пароля.');
      return;
    }
    
    // Проверяем новый пароль
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!newPassword) {
      alert('Введите новый пароль');
      newPasswordInput.focus();
      return;
    }
    
    if (newPassword !== confirmPassword) {
      passwordMatchError.style.display = 'block';
      confirmPasswordInput.style.borderColor = '#f44336';
      confirmPasswordInput.focus();
      return;
    }
    
    // Сохраняем пароль
    setPassword(newPassword);
    passwordModal.remove();
    alert('Пароль успешно изменен!');
  };
  
  submitBtn.addEventListener('click', savePassword);
  cancelBtn.addEventListener('click', () => {
    passwordModal.remove();
  });
  
  // Обработка Enter
  [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          savePassword();
        } else if (e.key === 'Escape') {
          passwordModal.remove();
        }
      });
    }
  });
  
  // Закрытие по клику на overlay
  passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
      passwordModal.remove();
    }
  });
  
  // Фокус на первое поле
  setTimeout(() => {
    if (passwordIsSet && currentPasswordInput) {
      currentPasswordInput.focus();
    } else if (newPasswordInput) {
      newPasswordInput.focus();
    }
  }, 100);
};

/**
 * Показывает окно ввода пароля
 */
const showPasswordPrompt = () => {
  const root = getComputedStyle(document.documentElement);
  const bgPrimary = root.getPropertyValue('--bg-primary') || '#0d0d0d';
  const bgSecondary = root.getPropertyValue('--bg-secondary') || '#141414';
  const borderColor = root.getPropertyValue('--border-color') || '#2a2a2a';
  const textPrimary = root.getPropertyValue('--text-primary') || '#e9e9e9';
  const textSecondary = root.getPropertyValue('--text-secondary') || '#999999';
  
  // Удаляем предыдущее окно пароля, если есть
  const existingPrompt = document.getElementById('adminPasswordPrompt');
  if (existingPrompt) {
    existingPrompt.remove();
  }
  
  const passwordModal = document.createElement('div');
  passwordModal.id = 'adminPasswordPrompt';
  passwordModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
  `;
  
  passwordModal.innerHTML = `
    <div style="background: ${bgSecondary}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <span class="material-icons" style="font-size: 28px; color: #2196F3;">lock</span>
        <h2 style="margin: 0; font-size: 20px; color: ${textPrimary};">Вход в админку</h2>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">Пароль</label>
        <input type="password" id="adminPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="Введите пароль" autofocus>
        <div id="adminPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">Неверный пароль</div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="adminPasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; cursor: pointer;">Отмена</button>
        <button id="adminPasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">Войти</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(passwordModal);
  
  const passwordInput = passwordModal.querySelector('#adminPasswordInput');
  const errorDiv = passwordModal.querySelector('#adminPasswordError');
  const submitBtn = passwordModal.querySelector('#adminPasswordSubmit');
  const cancelBtn = passwordModal.querySelector('#adminPasswordCancel');
  
  const checkPasswordHandler = () => {
    const password = passwordInput.value;
    if (checkPassword(password)) {
      isAdminAuthenticated = true;
      passwordModal.remove();
      openSizesAdmin().catch(err => console.error('Ошибка при открытии админки:', err));
    } else {
      errorDiv.style.display = 'block';
      passwordInput.style.borderColor = '#f44336';
      passwordInput.value = '';
      passwordInput.focus();
    }
  };
  
  submitBtn.addEventListener('click', checkPasswordHandler);
  cancelBtn.addEventListener('click', () => {
    passwordModal.remove();
  });
  
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      checkPasswordHandler();
    } else if (e.key === 'Escape') {
      passwordModal.remove();
    }
  });
  
  // Закрытие по клику на overlay
  passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
      passwordModal.remove();
    }
  });
  
  // Фокус на поле ввода
  setTimeout(() => {
    passwordInput.focus();
  }, 100);
};

/**
 * Внутренняя функция для открытия админки
 */
const openSizesAdmin = async () => {
  console.log('openSizesAdmin вызвана');
  isAdminOpen = true;
  
  // Принудительно загружаем размеры из файла, если они еще не загружены
  let sizes = getPresetSizes();
  
  // Проверяем, есть ли платформа РСЯ (перформанс‑форматы)
  if (!sizes['РСЯ']) {
    console.log('Размеры неполные, загружаем из файла...');
    try {
      sizes = await loadSizesConfig();
      console.log('Размеры перезагружены из файла:', sizes);
    } catch (error) {
      console.warn('Не удалось перезагрузить размеры, используем текущие:', error);
    }
  }
  
  console.log('Размеры для админки:', sizes);
  console.log('Платформы:', Object.keys(sizes));
  
  // Получаем цвета из CSS переменных
  const root = getComputedStyle(document.documentElement);
  const bgPrimary = root.getPropertyValue('--bg-primary') || '#0d0d0d';
  const bgSecondary = root.getPropertyValue('--bg-secondary') || '#141414';
  const borderColor = root.getPropertyValue('--border-color') || '#2a2a2a';
  const textPrimary = root.getPropertyValue('--text-primary') || '#e9e9e9';
  const textSecondary = root.getPropertyValue('--text-secondary') || '#999999';
  
  // Удаляем предыдущее модальное окно, если оно существует
  const existingModal = document.getElementById('sizesAdminModal');
  if (existingModal) {
    console.log('Удаляем существующее модальное окно из DOM перед созданием нового');
    if (existingModal._escapeHandler) {
      document.removeEventListener('keydown', existingModal._escapeHandler);
    }
    if (existingModal.parentNode) {
      existingModal.parentNode.removeChild(existingModal);
    }
  }
  
  // Сбрасываем переменную, если она указывает на старый элемент
  if (adminModal && (!adminModal.parentNode || adminModal.parentNode === null)) {
    console.log('Сбрасываем переменную adminModal, так как элемент не в DOM');
    adminModal = null;
  }
  
  // Если adminModal все еще существует, но не в DOM - создаем новый
  if (adminModal && !document.body.contains(adminModal)) {
    console.log('adminModal существует, но не в DOM, создаем новый');
    adminModal = null;
  }
  
  // Если adminModal все еще существует и в DOM - не создаем новый
  if (adminModal && document.body.contains(adminModal)) {
    console.log('adminModal уже в DOM, не создаем новый');
    return;
  }
  
  // Создаем новое модальное окно
  adminModal = document.createElement('div');
  adminModal.id = 'sizesAdminModal';
  adminModal.className = 'sizes-admin-modal';
  
  // Применяем стили напрямую, чтобы гарантировать видимость
  adminModal.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 99999 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    pointer-events: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
  `;
  
  adminModal.innerHTML = `
    <div class="sizes-admin-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px); z-index: 1;"></div>
    <div class="sizes-admin-content" style="position: relative; background: ${bgSecondary}; border: 1px solid ${borderColor}; border-radius: 12px; width: 95%; max-width: 1400px; height: 95vh; max-height: 95vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); z-index: 2; overflow: hidden;">
      <!-- Заголовок -->
      <div class="sizes-admin-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid ${borderColor}; display: flex; align-items: center; justify-content: space-between; background: ${bgPrimary};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="material-icons" style="font-size: 24px; color: ${textPrimary};">settings</span>
          <div>
            <h2 style="margin: 0; font-size: 20px; color: ${textPrimary};">Админка</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${textSecondary}; opacity: 0.8;">Управление форматами и значениями по умолчанию</p>
          </div>
        </div>
        <button class="sizes-admin-close" id="sizesAdminClose" style="padding: 8px 16px; background: transparent; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <span class="material-icons" style="font-size: 20px;">close</span>
          <span>Закрыть</span>
        </button>
      </div>
      
      <!-- Основной контент с аккордеоном -->
      <div class="sizes-admin-body" style="flex: 1; overflow-y: auto; padding: 20px; min-height: 0;">
        <!-- Раздел: Размеры -->
        <div class="admin-accordion-section" data-section="sizes" style="margin-bottom: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${bgSecondary};" data-accordion-toggle="sizes">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${textPrimary};">aspect_ratio</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Размеры</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${textPrimary}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionSizes" style="padding: 20px; display: none;">
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span class="material-icons" style="font-size: 18px; color: #2196F3;">info</span>
                <span style="font-weight: 500; color: ${textPrimary};">Размеры автоматически группируются по типу формата</span>
              </div>
              <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: ${textSecondary};">
                <span style="display: flex; align-items: center; gap: 4px;"><span style="color: #4CAF50;">■</span> Квадратные</span>
                <span style="display: flex; align-items: center; gap: 4px;"><span style="color: #2196F3;">■</span> Горизонтальные</span>
                <span style="display: flex; align-items: center; gap: 4px;"><span style="color: #FF9800;">■</span> Вертикальные</span>
              </div>
            </div>
            <div class="sizes-admin-toolbar" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
              <button class="btn btn-primary" id="sizesAdminAddPlatform" title="Добавить новую платформу для размеров">
                <span class="material-icons">add</span> Добавить платформу
              </button>
              <button class="btn" id="sizesAdminExport" title="Экспортировать настройки размеров в JSON файл">
                <span class="material-icons">download</span> Экспорт JSON
              </button>
              <button class="btn" id="sizesAdminImport" title="Импортировать настройки размеров из JSON файла">
                <span class="material-icons">upload</span> Импорт JSON
              </button>
              <input type="file" id="sizesAdminImportFile" accept=".json" style="display: none;">
              <button class="btn btn-danger" id="sizesAdminReset" title="Сбросить все размеры к значениям по умолчанию">
                <span class="material-icons">refresh</span> Сбросить к дефолту
              </button>
            </div>
            <div class="sizes-admin-platforms" id="sizesAdminPlatforms"></div>
          </div>
        </div>
        
        <!-- Раздел: Значения -->
        <div class="admin-accordion-section" data-section="values" style="margin-bottom: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${bgSecondary};" data-accordion-toggle="values">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${textPrimary};">tune</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Значения</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${textPrimary}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionValues" style="padding: 20px; display: none;">
            ${renderValuesTab()}
          </div>
        </div>
        
        <!-- Раздел: Название бренда -->
        <div class="admin-accordion-section" data-section="brand" style="margin-bottom: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${bgSecondary};" data-accordion-toggle="brand">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${textPrimary};">label</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Название бренда</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${textPrimary}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionBrand" style="padding: 20px; display: none;">
            <div class="admin-info-box" style="margin-bottom: 20px;">
              <div style="display: flex; align-items: flex-start; gap: var(--spacing-md);">
                <span class="material-icons" style="font-size: var(--font-size-lg); color: #2196F3; flex-shrink: 0; margin-top: 2px;">info</span>
                <div>
                  <div style="font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--spacing-xs); font-size: var(--font-size-md);">Изменение названия бренда</div>
                  <div style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5;">
                    Здесь вы можете изменить название бренда, которое используется в заголовке страницы и в текстах по умолчанию. Например, вместо "Практикума" можно указать название вашей компании или проекта.
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-sm); display: block;">
                Название бренда
              </label>
              <input 
                type="text" 
                id="brandNameInput" 
                value="${getState().brandName || 'Практикума'}" 
                placeholder="Практикума"
                style="width: 100%; padding: 12px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-size: 14px; font-family: inherit;"
              />
              <div class="hint" style="margin-top: 8px; font-size: 12px; color: ${textSecondary};">
                Это название будет использоваться в текстах по умолчанию (например, в заголовке курса)
              </div>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
              <div style="padding: 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px;">
                <div style="font-size: 12px; color: ${textSecondary}; margin-bottom: 4px;">Пример использования:</div>
                <div style="font-size: 14px; color: ${textPrimary}; font-weight: 500;" id="brandNamePreview">
                  AI-Craft — ${getState().brandName || 'Практикума'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Раздел: Умножение -->
        <div class="admin-accordion-section" data-section="multipliers" style="margin-bottom: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${bgSecondary};" data-accordion-toggle="multipliers">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${textPrimary};">zoom_in</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Умножение</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${textPrimary}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionMultipliers" style="padding: 20px; display: none;">
            ${(() => {
              try {
                const content = renderMultipliersTab();
                console.log('renderMultipliersTab вернул:', typeof content, 'длина:', content ? content.length : 0);
                return content || '<div>Ошибка загрузки множителей</div>';
              } catch (error) {
                console.error('Ошибка при рендеринге множителей:', error);
                return `<div style="padding: 20px; color: red;">Ошибка загрузки множителей: ${error.message}</div>`;
              }
            })()}
          </div>
        </div>
        
        <!-- Раздел: Фоны -->
        <div class="admin-accordion-section" data-section="backgrounds" style="margin-bottom: 16px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; overflow: hidden;">
          <div class="admin-accordion-header" style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; background: ${bgSecondary};" data-accordion-toggle="backgrounds">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="material-icons" style="font-size: 20px; color: ${textPrimary};">palette</span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Фоны</h3>
            </div>
            <span class="material-icons admin-accordion-icon" style="font-size: 24px; color: ${textPrimary}; transition: transform 0.3s;">expand_more</span>
          </div>
          <div class="admin-accordion-content" id="adminSectionBackgrounds" style="padding: 20px; display: none;">
            ${(() => {
              try {
                const content = renderBackgroundsTab();
                console.log('renderBackgroundsTab вернул:', typeof content, 'длина:', content ? content.length : 0);
                return content || '<div>Ошибка загрузки фонов</div>';
              } catch (error) {
                console.error('Ошибка при рендеринге фонов:', error);
                return `<div style="padding: 20px; color: red;">Ошибка загрузки фонов: ${error.message}</div>`;
              }
            })()}
          </div>
        </div>
        
        <!-- Раздел: Полный сброс -->
        <div style="margin-top: 24px; padding: 20px; border: 2px solid #E84033; border-radius: 8px; background: rgba(232, 64, 51, 0.05);">
          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
            <span class="material-icons" style="font-size: 24px; color: #E84033; flex-shrink: 0;">warning</span>
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${textPrimary};">Полный сброс всех настроек</h3>
              <p style="margin: 0; font-size: 13px; color: ${textSecondary}; line-height: 1.5;">
                Эта кнопка полностью сбросит все настройки, связанные с Практикумом: логотипы, фотографии, тексты, значения по умолчанию, размеры и другие настройки. Все будет возвращено к исходным значениям. Это действие нельзя отменить.
              </p>
            </div>
          </div>
          <button class="btn btn-danger" id="sizesAdminFullReset" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; font-size: 14px; font-weight: 600;">
            <span class="material-icons">delete_forever</span>
            Полностью сбросить все настройки Практикума
          </button>
        </div>
      </div>
      
      <div class="sizes-admin-footer" style="padding: 16px 20px; border-top: 1px solid ${borderColor}; display: flex; gap: 8px; justify-content: space-between; align-items: center; flex-shrink: 0; background: ${bgSecondary};">
        <div style="display: flex; gap: 8px; align-items: center;">
          ${!isWorkspaceAccessControlled() ? `
            <button class="btn" id="sizesAdminChangePassword" style="
              padding: 8px 16px;
              background: transparent;
              border: 1px solid ${borderColor};
              border-radius: 6px;
              color: ${textPrimary};
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 6px;
            " title="Изменить пароль">
              <span class="material-icons" style="font-size: 18px;">lock</span>
              <span>Изменить пароль</span>
            </button>
          ` : ''}
          <button class="btn" id="sizesAdminExportFull" title="Экспортировать полную конфигурацию (все настройки) для передачи другой команде">
            <span class="material-icons">file_download</span> Экспорт полной конфигурации
          </button>
          <button class="btn" id="sizesAdminImportFull" title="Импортировать полную конфигурацию из файла">
            <span class="material-icons">file_upload</span> Импорт полной конфигурации
          </button>
          <input type="file" id="sizesAdminImportFullFile" accept=".json" style="display: none;">
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" id="sizesAdminSave">Сохранить</button>
          <button class="btn" id="sizesAdminCancel">Отмена</button>
        </div>
      </div>
      </div>
    </div>
  `;
  
  try {
    document.body.appendChild(adminModal);
    
    // Принудительно применяем стили после добавления в DOM
    requestAnimationFrame(() => {
      adminModal.style.display = 'flex';
      adminModal.style.visibility = 'visible';
      adminModal.style.opacity = '1';
    });
    
    console.log('Модальное окно добавлено в DOM');
    console.log('Модальное окно видимо:', adminModal.offsetParent !== null);
    console.log('Z-index модального окна:', window.getComputedStyle(adminModal).zIndex);
    console.log('Display:', window.getComputedStyle(adminModal).display);
    console.log('Visibility:', window.getComputedStyle(adminModal).visibility);
    console.log('Position:', window.getComputedStyle(adminModal).position);
    console.log('Width:', adminModal.offsetWidth, 'Height:', adminModal.offsetHeight);
    console.log('ClientWidth:', adminModal.clientWidth, 'ClientHeight:', adminModal.clientHeight);
    
    // Проверяем содержимое
    const content = adminModal.querySelector('.sizes-admin-content');
    if (content) {
      console.log('Контент найден, размеры:', content.offsetWidth, 'x', content.offsetHeight);
    } else {
      console.error('Контент НЕ найден!');
    }
    
    // Рендерим платформы
    renderAdminPlatforms(sizes);
    console.log('Платформы отрендерены');
    
    // Проверяем, что все разделы созданы
    const multipliersSection = adminModal.querySelector('#adminSectionMultipliers');
    const backgroundsSection = adminModal.querySelector('#adminSectionBackgrounds');
    const filesSection = adminModal.querySelector('#adminSectionFiles');
    
    console.log('Проверка разделов:', {
      multipliers: {
        exists: !!multipliersSection,
        hasContent: multipliersSection ? multipliersSection.innerHTML.length > 0 : false,
        contentLength: multipliersSection ? multipliersSection.innerHTML.length : 0
      },
      backgrounds: {
        exists: !!backgroundsSection,
        hasContent: backgroundsSection ? backgroundsSection.innerHTML.length > 0 : false,
        contentLength: backgroundsSection ? backgroundsSection.innerHTML.length : 0
      },
      files: {
        exists: !!filesSection,
        hasContent: filesSection ? filesSection.innerHTML.length > 0 : false,
        contentLength: filesSection ? filesSection.innerHTML.length : 0
      }
    });
    
    // Сбрасываем исходные значения при открытии
    originalDefaults = null;
    
    // Обновляем превью для значений по умолчанию
    updateDefaultsPreview();
    
    // Обработчики событий
    setupAdminHandlers(sizes);
    setupDefaultsHandlers(); // Включает setupBackgroundsHandlers()
    setupMultipliersHandlers();
    setupTabHandlers();
    
    // Устанавливаем активный стиль для первого пункта меню
    const firstMenuItem = adminModal.querySelector('.sizes-admin-menu-item[data-section="sizes"]');
    if (firstMenuItem) {
      const bgSecondary = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary') || '#141414';
      firstMenuItem.style.background = bgSecondary;
    }
    
    console.log('Обработчики событий установлены');
  } catch (error) {
    console.error('Ошибка при создании админки:', error);
    isAdminOpen = false;
    throw error;
  }
  
  // Закрытие по клику на overlay
  const overlay = adminModal.querySelector('.sizes-admin-overlay');
  const closeBtn = adminModal.querySelector('#sizesAdminClose');
  const cancelBtn = adminModal.querySelector('#sizesAdminCancel');
  
  if (overlay) {
    overlay.addEventListener('click', closeSizesAdmin);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSizesAdmin);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeSizesAdmin);
  }
  
  // Закрытие по Escape
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeSizesAdmin();
    }
  };
  document.addEventListener('keydown', escapeHandler);
  adminModal._escapeHandler = escapeHandler;
  
  console.log('Админка размеров открыта');
};

/**
 * Закрывает модальное окно админки
 */
const closeSizesAdmin = () => {
  console.log('closeSizesAdmin вызвана');
  console.log('isAdminOpen:', isAdminOpen);
  console.log('adminModal:', adminModal);
  
  // Проверяем, есть ли модальное окно в DOM
  const existingModal = document.getElementById('sizesAdminModal');
  if (existingModal) {
    console.log('Удаляем модальное окно из DOM');
    if (existingModal._escapeHandler) {
      document.removeEventListener('keydown', existingModal._escapeHandler);
    }
    if (existingModal.parentNode) {
      existingModal.parentNode.removeChild(existingModal);
    }
  }
  
  adminModal = null;
  isAdminOpen = false;
  // Сбрасываем флаг аутентификации при закрытии
  isAdminAuthenticated = false;
  console.log('Модальное окно закрыто, флаги сброшены');
};

/**
 * Рендерит список платформ в админке
 */
const renderAdminPlatforms = (sizes) => {
  const container = document.getElementById('sizesAdminPlatforms');
  if (!container) return;
  
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a';
  const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d';
  const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
  const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999';
  
  // Получаем дефолтные и пользовательские охранные области
  const state = getState();
  const defaultSafeAreas = {
    'Ozon': {
      '2832x600': { width: 2100, height: 570, hideLegal: false, hideAge: false, titleAlign: 'left' },
      '1080x450': { width: 1020, height: 405, hideLegal: false, hideAge: false, titleAlign: 'left' }
    },
    // Перформанс‑форматы РСЯ + Поиск
    'РСЯ': {
      '1600x1200': { width: 900, height: 900, hideLegal: true, hideAge: true, titleAlign: 'center' }
    },
    // Обратная совместимость со старыми сохранёнными конфигами (платформа "РСЯ")
    'РСЯ': {
      '1600x1200': { width: 900, height: 900, hideLegal: true, hideAge: true, titleAlign: 'center' }
    }
  };
  const userSafeAreas = state.safeAreas || {};
  
  // Формируем сводку по типам форматов, чтобы показать подсказки пользователю
  const formatSummaries = buildFormatTypeSummaries(state);
  const typeMeta = [
    {
      key: 'ultraWide',
      label: 'Ультра-широкие',
      icon: 'panorama_wide_angle',
      color: '#2196F3',
      description: 'width ≥ height × 8 — например, большие баннеры и растяжки'
    },
    {
      key: 'veryWide',
      label: 'Очень широкие',
      icon: 'view_stream',
      color: '#9C27B0',
      description: 'width ≥ height × 4 — широкие промо-форматы'
    },
    {
      key: 'horizontal',
      label: 'Широкие',
      icon: 'crop_landscape',
      color: '#4CAF50',
      description: 'width ≥ height × 1.5 — классические горизонтальные'
    },
    {
      key: 'vertical',
      label: 'Вертикальные',
      icon: 'crop_portrait',
      color: '#FF9800',
      description: 'height ≥ width × 1.5 — сторис и баннеры-вытяжки'
    },
    {
      key: 'tall',
      label: 'Длинные вертикали',
      icon: 'align_vertical_top',
      color: '#E91E63',
      description: 'height ≥ width × 2 — особенно вытянутые форматы'
    },
    {
      key: 'square',
      label: 'Квадратные/приближённые',
      icon: 'crop_square',
      color: '#FFC107',
      description: 'aspect ≈ 1 — квадратные или около того'
    }
  ];
  const formatTypeHints = typeMeta.map((type) => {
    const summary = formatSizeSummary(formatSummaries?.[type.key], 8);
    if (!summary) return '';
    return `
      <div class="sizes-admin-format-hint" style="display: flex; gap: 10px; padding: 12px; border: 1px solid ${borderColor}; border-left: 4px solid ${type.color}; border-radius: 8px; background: rgba(255,255,255,0.02);">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center;">
          <span class="material-icons" style="color: ${type.color}; font-size: 18px;">${type.icon}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="font-weight: 600; font-size: 13px; color: ${textPrimary};">${type.label}</div>
          <div style="font-size: 11px; color: ${textSecondary};">${type.description}</div>
          <div style="font-size: 11px; color: ${textSecondary}; opacity: 0.9;">${summary}</div>
        </div>
      </div>
    `;
  }).filter(Boolean).join('');
  
  // Функция для получения охранной области (пользовательская или дефолтная)
  const getSafeArea = (platform, sizeKey) => {
    if (userSafeAreas[platform] && userSafeAreas[platform][sizeKey]) {
      return userSafeAreas[platform][sizeKey];
    }
    if (defaultSafeAreas[platform] && defaultSafeAreas[platform][sizeKey]) {
      return defaultSafeAreas[platform][sizeKey];
    }
    return null;
  };
  
  // Функция для получения значения hideLegal (пользовательское или дефолтное)
  const getHideLegal = (platform, sizeKey) => {
    if (userSafeAreas[platform] && userSafeAreas[platform][sizeKey] && userSafeAreas[platform][sizeKey].hideLegal !== undefined) {
      return userSafeAreas[platform][sizeKey].hideLegal;
    }
    if (defaultSafeAreas[platform] && defaultSafeAreas[platform][sizeKey] && defaultSafeAreas[platform][sizeKey].hideLegal !== undefined) {
      return defaultSafeAreas[platform][sizeKey].hideLegal;
    }
    return false;
  };
  
  // Функция для получения значения hideAge (пользовательское или дефолтное)
  const getHideAge = (platform, sizeKey) => {
    if (userSafeAreas[platform] && userSafeAreas[platform][sizeKey] && userSafeAreas[platform][sizeKey].hideAge !== undefined) {
      return userSafeAreas[platform][sizeKey].hideAge;
    }
    if (defaultSafeAreas[platform] && defaultSafeAreas[platform][sizeKey] && defaultSafeAreas[platform][sizeKey].hideAge !== undefined) {
      return defaultSafeAreas[platform][sizeKey].hideAge;
    }
    return false;
  };
  
  // Функция для получения значения titleAlign (пользовательское или дефолтное)
  const getTitleAlign = (platform, sizeKey) => {
    if (userSafeAreas[platform] && userSafeAreas[platform][sizeKey] && userSafeAreas[platform][sizeKey].titleAlign !== undefined) {
      return userSafeAreas[platform][sizeKey].titleAlign;
    }
    if (defaultSafeAreas[platform] && defaultSafeAreas[platform][sizeKey] && defaultSafeAreas[platform][sizeKey].titleAlign !== undefined) {
      return defaultSafeAreas[platform][sizeKey].titleAlign;
    }
    return null; // null означает использовать глобальную настройку
  };
  
  // Функция для проверки, есть ли пользовательское значение
  const hasUserSafeArea = (platform, sizeKey) => {
    return !!(userSafeAreas[platform] && userSafeAreas[platform][sizeKey]);
  };
  
  // Функция для определения типа формата
  const getFormatType = (width, height) => {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) return 'square';
    if (ratio > 1.2) return 'horizontal';
    if (ratio < 0.8) return 'vertical';
    return 'near-square';
  };
  
  // Функция для получения иконки типа формата
  const getFormatIcon = (type) => {
    switch(type) {
      case 'square': return 'crop_square';
      case 'horizontal': return 'crop_landscape';
      case 'vertical': return 'crop_portrait';
      default: return 'aspect_ratio';
    }
  };
  
  // Функция для получения цвета типа формата
  const getFormatColor = (type) => {
    switch(type) {
      case 'square': return '#4CAF50';
      case 'horizontal': return '#2196F3';
      case 'vertical': return '#FF9800';
      default: return textSecondary;
    }
  };
  
  // Функция для получения названия типа формата
  const getFormatName = (type) => {
    switch(type) {
      case 'square': return 'Квадратный';
      case 'horizontal': return 'Горизонтальный';
      case 'vertical': return 'Вертикальный';
      default: return 'Почти квадратный';
    }
  };
  
  // Группируем размеры по типу формата
  const groupSizesByType = (platformSizes) => {
    const groups = {
      square: [],
      horizontal: [],
      vertical: [],
      'near-square': []
    };
    
    platformSizes.forEach((size, index) => {
      const type = getFormatType(size.width, size.height);
      groups[type].push({...size, originalIndex: index});
    });
    
    return groups;
  };
  
  let html = '';
  if (formatTypeHints) {
    html += `
      <div class="sizes-admin-format-hints" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px;">
        <div style="font-size: 12px; color: ${textSecondary}; line-height: 1.4;">
          Подписи ниже показывают, какие размеры сейчас попадают в каждый тип. Так проще понять, что изменится, если настроить, например, ультра-широкие форматы.
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
          ${formatTypeHints}
        </div>
      </div>
    `;
  }
  
  Object.keys(sizes).forEach((platform) => {
    const groupedSizes = groupSizesByType(sizes[platform]);
    const formatOrder = ['square', 'horizontal', 'vertical', 'near-square'];
    
    html += `
      <div class="sizes-admin-platform" data-platform="${platform}" style="margin-bottom: 24px; border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px; background: ${bgPrimary};">
        <div class="sizes-admin-platform-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${borderColor};">
          <span class="material-icons" style="color: ${textSecondary}; font-size: 20px;">category</span>
          <input type="text" class="sizes-admin-platform-name" value="${platform}" data-original="${platform}" style="flex: 1; font-weight: 600; font-size: 16px;">
          <span style="color: ${textSecondary}; font-size: 12px;">${sizes[platform].length} ${sizes[platform].length === 1 ? 'размер' : sizes[platform].length < 5 ? 'размера' : 'размеров'}</span>
          <button class="btn-small btn-danger" data-action="remove-platform" data-platform="${platform}" title="Удалить платформу">
            <span class="material-icons">delete</span>
          </button>
        </div>
        <div class="sizes-admin-sizes-list">
    `;
    
    formatOrder.forEach(formatType => {
      if (groupedSizes[formatType].length > 0) {
        const formatColor = getFormatColor(formatType);
        const formatIcon = getFormatIcon(formatType);
        const formatName = getFormatName(formatType);
        
        html += `
          <div class="sizes-admin-format-group" style="margin-bottom: 16px; padding: 12px; background: rgba(255, 255, 255, 0.02); border-radius: 6px; border-left: 3px solid ${formatColor};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span class="material-icons" style="color: ${formatColor}; font-size: 18px;">${formatIcon}</span>
              <span style="color: ${textPrimary}; font-weight: 500; font-size: 13px;">${formatName} (${groupedSizes[formatType].length})</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
        `;
        
        groupedSizes[formatType].forEach((size) => {
          const ratio = (size.width / size.height).toFixed(2);
          const index = size.originalIndex;
          const sizeKey = `${size.width}x${size.height}`;
          const safeArea = getSafeArea(platform, sizeKey);
          const hasUserValue = hasUserSafeArea(platform, sizeKey);
          const hasDefault = !!(defaultSafeAreas[platform] && defaultSafeAreas[platform][sizeKey]);
          const hideLegal = getHideLegal(platform, sizeKey);
          const hideAge = getHideAge(platform, sizeKey);
          const titleAlign = getTitleAlign(platform, sizeKey);
          
          html += `
            <div class="sizes-admin-size-item" style="display: flex; flex-direction: column; gap: 12px; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid ${borderColor};">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                  <div style="width: 40px; height: 40px; border: 2px solid ${formatColor}; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.05); position: relative; overflow: hidden;" title="Пропорции: ${ratio}:1">
                    <div style="position: absolute; width: ${Math.min(100, (size.width / Math.max(size.width, size.height)) * 100)}%; height: ${Math.min(100, (size.height / Math.max(size.width, size.height)) * 100)}%; background: ${formatColor}; opacity: 0.3;"></div>
                    <span style="font-size: 10px; color: ${textPrimary}; font-weight: 600; z-index: 1;">${ratio}</span>
                  </div>
                  <input type="number" class="sizes-admin-size-width" value="${size.width}" min="1" placeholder="Ширина" data-platform="${platform}" data-index="${index}" style="width: 100px; padding: 6px 8px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${bgPrimary}; color: ${textPrimary};">
                  <span style="color: ${textSecondary};">×</span>
                  <input type="number" class="sizes-admin-size-height" value="${size.height}" min="1" placeholder="Высота" data-platform="${platform}" data-index="${index}" style="width: 100px; padding: 6px 8px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${bgPrimary}; color: ${textPrimary};">
                  <span style="color: ${textSecondary}; font-size: 12px; min-width: 60px;">${size.width}×${size.height}</span>
                </div>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
                  <input type="checkbox" ${size.checked ? 'checked' : ''} class="sizes-admin-size-checked" data-platform="${platform}" data-index="${index}" style="cursor: pointer;">
                  <span style="color: ${textSecondary}; font-size: 12px;">Выбрано</span>
                </label>
                <button class="btn-small btn-danger" data-action="remove-size" data-platform="${platform}" data-index="${index}" title="Удалить размер" style="padding: 6px;">
                  <span class="material-icons" style="font-size: 18px;">close</span>
                </button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px; background: rgba(255, 255, 255, 0.02); border-radius: 4px; border-left: 3px solid ${hasUserValue ? '#4CAF50' : (hasDefault ? '#FF9800' : '#666666')};">
                <div class="size-settings-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; cursor: pointer; user-select: none;" data-size-key="${sizeKey}" data-platform="${platform}">
                  <span class="material-icons size-settings-icon" style="color: ${hasUserValue ? '#4CAF50' : (hasDefault ? '#FF9800' : '#666666')}; font-size: 16px; transition: transform 0.3s;">expand_more</span>
                  <span class="material-icons" style="color: ${hasUserValue ? '#4CAF50' : (hasDefault ? '#FF9800' : '#666666')}; font-size: 16px;">crop_free</span>
                  <span style="color: ${textPrimary}; font-size: 12px; font-weight: 500;">${t('admin.sizes.safeArea.title')}</span>
                  <span style="color: ${textSecondary}; font-size: 11px; margin-left: auto;">${hasUserValue ? t('admin.sizes.safeArea.custom') : (hasDefault ? t('admin.sizes.safeArea.default') : 'default')}</span>
                </div>
                <div class="size-settings-content" style="display: none;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="color: ${textSecondary}; font-size: 11px; min-width: 80px;">${t('admin.sizes.safeArea.width')}:</label>
                    <input type="number" class="sizes-admin-safe-area-width" value="${safeArea ? safeArea.width : ''}" min="1" placeholder="${hasDefault ? (defaultSafeAreas[platform][sizeKey]?.width || 'default') : 'default'}" data-platform="${platform}" data-size-key="${sizeKey}" style="width: 90px; padding: 4px 6px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${bgPrimary}; color: ${textPrimary}; font-size: 12px;">
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="color: ${textSecondary}; font-size: 11px; min-width: 80px;">${t('admin.sizes.safeArea.height')}:</label>
                    <input type="number" class="sizes-admin-safe-area-height" value="${safeArea ? safeArea.height : ''}" min="1" placeholder="${hasDefault ? (defaultSafeAreas[platform][sizeKey]?.height || 'default') : 'default'}" data-platform="${platform}" data-size-key="${sizeKey}" style="width: 90px; padding: 4px 6px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${bgPrimary}; color: ${textPrimary}; font-size: 12px;">
                  </div>
                  ${hasUserValue ? `
                  <button class="btn-small" data-action="clear-safe-area" data-platform="${platform}" data-size-key="${sizeKey}" title="Вернуть к умолчанию" style="padding: 4px 8px; font-size: 11px;">
                    <span class="material-icons" style="font-size: 14px;">refresh</span>
                  </button>
                  ` : ''}
                </div>
                <div style="display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
                    <input type="checkbox" ${hideLegal ? 'checked' : ''} class="sizes-admin-hide-legal" data-platform="${platform}" data-size-key="${sizeKey}" style="cursor: pointer;">
                    <span style="color: ${textSecondary}; font-size: 11px;">Скрыть лигал</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
                    <input type="checkbox" ${hideAge ? 'checked' : ''} class="sizes-admin-hide-age" data-platform="${platform}" data-size-key="${sizeKey}" style="cursor: pointer;">
                    <span style="color: ${textSecondary}; font-size: 11px;">Скрыть возраст</span>
                  </label>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                  <label style="color: ${textSecondary}; font-size: 11px; min-width: 80px;">Выключка текста:</label>
                  <select class="sizes-admin-title-align" data-platform="${platform}" data-size-key="${sizeKey}" style="width: 120px; padding: 4px 6px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${bgPrimary}; color: ${textPrimary}; font-size: 12px;">
                    <option value="" ${titleAlign === null ? 'selected' : ''}>По умолчанию</option>
                    <option value="left" ${titleAlign === 'left' ? 'selected' : ''}>Слева</option>
                    <option value="center" ${titleAlign === 'center' ? 'selected' : ''}>По центру</option>
                    <option value="right" ${titleAlign === 'right' ? 'selected' : ''}>Справа</option>
                  </select>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                  <label style="color: ${textSecondary}; font-size: 11px; min-width: 80px;">Множитель логотипа:</label>
                  <input type="number" class="sizes-admin-logo-size-multiplier" value="${state.logoSizeMultipliers?.[platform]?.[sizeKey] ?? ''}" step="0.1" min="0.1" max="10" placeholder="По умолчанию" data-platform="${platform}" data-size-key="${sizeKey}" style="width: 120px; padding: 4px 6px; border: 1px solid ${borderColor}; border-radius: 4px; background: ${bgPrimary}; color: ${textPrimary}; font-size: 12px;">
                  ${state.logoSizeMultipliers?.[platform]?.[sizeKey] ? `
                  <button class="btn-small" data-action="clear-logo-size-multiplier" data-platform="${platform}" data-size-key="${sizeKey}" title="Вернуть к умолчанию" style="padding: 4px 8px; font-size: 11px;">
                    <span class="material-icons" style="font-size: 14px;">refresh</span>
                  </button>
                  ` : ''}
                </div>
                <div style="color: ${textSecondary}; font-size: 10px; margin-top: 4px;">${t('admin.sizes.safeArea.hint')}</div>
                </div>
              </div>
            </div>
          `;
        });
        
        html += `
            </div>
          </div>
        `;
      }
    });
    
    html += `
        </div>
        <button class="btn-small" data-action="add-size" data-platform="${platform}" style="margin-top: 12px; width: 100%;">
          <span class="material-icons">add</span> Добавить размер
        </button>
      </div>
    `;
  });
  
  container.innerHTML = html;
};

/**
 * Обновляет превью пропорций для элемента размера
 */
const updateSizePreview = (sizeItem, width, height) => {
  const preview = sizeItem.querySelector('div[title*="Пропорции"]');
  if (!preview) return;
  
  const ratio = (width / height).toFixed(2);
  const formatType = (() => {
    const r = width / height;
    if (Math.abs(r - 1) < 0.1) return 'square';
    if (r > 1.2) return 'horizontal';
    if (r < 0.8) return 'vertical';
    return 'near-square';
  })();
  
  const formatColor = (() => {
    switch(formatType) {
      case 'square': return '#4CAF50';
      case 'horizontal': return '#2196F3';
      case 'vertical': return '#FF9800';
      default: return '#999999';
    }
  })();
  
  const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
  
  preview.style.borderColor = formatColor;
  preview.title = `Пропорции: ${ratio}:1`;
  const previewInner = preview.querySelector('div');
  if (previewInner) {
    previewInner.style.background = formatColor;
    previewInner.style.width = `${Math.min(100, (width / Math.max(width, height)) * 100)}%`;
    previewInner.style.height = `${Math.min(100, (height / Math.max(width, height)) * 100)}%`;
  }
  const ratioSpan = preview.querySelector('span');
  if (ratioSpan) {
    ratioSpan.textContent = ratio;
    ratioSpan.style.color = textPrimary;
  }
};

/**
 * Настраивает обработчики событий для админки
 */
const setupAdminHandlers = (initialSizes) => {
  let currentSizes = JSON.parse(JSON.stringify(initialSizes));
  
  // Добавление платформы
  document.getElementById('sizesAdminAddPlatform').addEventListener('click', () => {
    const platformName = prompt('Введите название платформы:');
    if (platformName && platformName.trim()) {
      const name = platformName.trim();
      if (currentSizes[name]) {
        alert('Платформа с таким названием уже существует');
        return;
      }
      currentSizes[name] = [];
      renderAdminPlatforms(currentSizes);
      setupAdminHandlers(currentSizes);
    }
  });
  
  // Удаление платформы
  document.getElementById('sizesAdminPlatforms').addEventListener('click', (e) => {
    if (e.target.closest('[data-action="remove-platform"]')) {
      const platform = e.target.closest('[data-action="remove-platform"]').dataset.platform;
      if (confirm(`Удалить платформу "${platform}" и все её размеры?`)) {
        delete currentSizes[platform];
        renderAdminPlatforms(currentSizes);
        setupAdminHandlers(currentSizes);
      }
    }
  });
  
  // Переименование платформы
  document.getElementById('sizesAdminPlatforms').addEventListener('change', (e) => {
    if (e.target.classList.contains('sizes-admin-platform-name')) {
      const original = e.target.dataset.original;
      const newName = e.target.value.trim();
      
      if (newName && newName !== original) {
        if (currentSizes[newName]) {
          alert('Платформа с таким названием уже существует');
          e.target.value = original;
          return;
        }
        currentSizes[newName] = currentSizes[original];
        delete currentSizes[original];
        e.target.dataset.original = newName;
        // Обновляем data-platform в родительском элементе
        e.target.closest('.sizes-admin-platform').dataset.platform = newName;
        // Обновляем обработчики
        setupAdminHandlers(currentSizes);
      }
    }
  });
  
  // Добавление размера
  document.getElementById('sizesAdminPlatforms').addEventListener('click', (e) => {
    if (e.target.closest('[data-action="add-size"]')) {
      const platform = e.target.closest('[data-action="add-size"]').dataset.platform;
      if (!currentSizes[platform]) {
        currentSizes[platform] = [];
      }
      currentSizes[platform].push({ width: 1080, height: 1080, checked: true });
      renderAdminPlatforms(currentSizes);
      setupAdminHandlers(currentSizes);
    }
  });
  
  // Удаление размера
  document.getElementById('sizesAdminPlatforms').addEventListener('click', (e) => {
    if (e.target.closest('[data-action="remove-size"]')) {
      const btn = e.target.closest('[data-action="remove-size"]');
      const platform = btn.dataset.platform;
      const index = parseInt(btn.dataset.index, 10);
      if (currentSizes[platform] && currentSizes[platform][index]) {
        currentSizes[platform].splice(index, 1);
        renderAdminPlatforms(currentSizes);
        setupAdminHandlers(currentSizes);
      }
    }
  });
  
  // Обновление названия бренда в реальном времени
  const brandNameInput = document.getElementById('brandNameInput');
  if (brandNameInput) {
    brandNameInput.addEventListener('input', (e) => {
      const brandName = e.target.value.trim() || 'Практикума';
      const preview = document.getElementById('brandNamePreview');
      if (preview) {
        preview.textContent = `AI-Craft — ${brandName}`;
      }
    });
  }
  
  // Обновление размеров при изменении полей
  document.getElementById('sizesAdminPlatforms').addEventListener('input', (e) => {
    const sizeItem = e.target.closest('.sizes-admin-size-item');
    if (!sizeItem) return;
    
    const platform = sizeItem.closest('.sizes-admin-platform').dataset.platform;
    // Находим индекс через data-атрибут, который мы сохранили при рендеринге
    const removeBtn = sizeItem.querySelector('[data-action="remove-size"]');
    if (!removeBtn) return;
    const index = parseInt(removeBtn.dataset.index, 10);
    
    if (currentSizes[platform] && currentSizes[platform][index] !== undefined) {
      const widthInput = sizeItem.querySelector('.sizes-admin-size-width');
      const heightInput = sizeItem.querySelector('.sizes-admin-size-height');
      const checkedInput = sizeItem.querySelector('.sizes-admin-size-checked');
      
      if (widthInput) {
        const width = parseInt(widthInput.value, 10);
        if (!isNaN(width) && width > 0) {
          const oldWidth = currentSizes[platform][index].width;
          const oldHeight = currentSizes[platform][index].height;
          const oldSizeKey = `${oldWidth}x${oldHeight}`;
          currentSizes[platform][index].width = width;
          const newHeight = parseInt(heightInput.value, 10) || currentSizes[platform][index].height;
          const newSizeKey = `${width}x${newHeight}`;
          
          // Если размер изменился, обновляем охранные области (переносим на новый ключ)
          if (oldSizeKey !== newSizeKey) {
            const state = getState();
            let userSafeAreas = state.safeAreas || {};
            if (userSafeAreas[platform] && userSafeAreas[platform][oldSizeKey]) {
              userSafeAreas[platform][newSizeKey] = userSafeAreas[platform][oldSizeKey];
              delete userSafeAreas[platform][oldSizeKey];
              if (Object.keys(userSafeAreas[platform]).length === 0) {
                delete userSafeAreas[platform];
              }
              setKey('safeAreas', userSafeAreas);
              // Перерисовываем, чтобы обновить data-size-key в полях охранных областей
              renderAdminPlatforms(currentSizes);
              setupAdminHandlers(currentSizes);
            }
          }
          
          // Обновляем отображение размера
          const sizeDisplay = sizeItem.querySelector('span[style*="min-width: 60px"]');
          if (sizeDisplay && heightInput) {
            const height = parseInt(heightInput.value, 10) || currentSizes[platform][index].height;
            sizeDisplay.textContent = `${width}×${height}`;
          }
          // Обновляем превью пропорций
          updateSizePreview(sizeItem, width, parseInt(heightInput?.value || currentSizes[platform][index].height, 10));
        }
      }
      if (heightInput) {
        const height = parseInt(heightInput.value, 10);
        if (!isNaN(height) && height > 0) {
          const oldWidth = currentSizes[platform][index].width;
          const oldHeight = currentSizes[platform][index].height;
          const oldSizeKey = `${oldWidth}x${oldHeight}`;
          currentSizes[platform][index].height = height;
          const newWidth = parseInt(widthInput.value, 10) || currentSizes[platform][index].width;
          const newSizeKey = `${newWidth}x${height}`;
          
          // Если размер изменился, обновляем охранные области (переносим на новый ключ)
          if (oldSizeKey !== newSizeKey) {
            const state = getState();
            let userSafeAreas = state.safeAreas || {};
            if (userSafeAreas[platform] && userSafeAreas[platform][oldSizeKey]) {
              userSafeAreas[platform][newSizeKey] = userSafeAreas[platform][oldSizeKey];
              delete userSafeAreas[platform][oldSizeKey];
              if (Object.keys(userSafeAreas[platform]).length === 0) {
                delete userSafeAreas[platform];
              }
              setKey('safeAreas', userSafeAreas);
              // Перерисовываем, чтобы обновить data-size-key в полях охранных областей
              renderAdminPlatforms(currentSizes);
              setupAdminHandlers(currentSizes);
            }
          }
          
          // Обновляем отображение размера
          const sizeDisplay = sizeItem.querySelector('span[style*="min-width: 60px"]');
          if (sizeDisplay && widthInput) {
            const width = parseInt(widthInput.value, 10) || currentSizes[platform][index].width;
            sizeDisplay.textContent = `${width}×${height}`;
          }
          // Обновляем превью пропорций
          updateSizePreview(sizeItem, parseInt(widthInput?.value || currentSizes[platform][index].width, 10), height);
        }
      }
      if (checkedInput) {
        currentSizes[platform][index].checked = checkedInput.checked;
      }
    }
    
    // Обработка охранных областей
    if (e.target.classList.contains('sizes-admin-safe-area-width') || e.target.classList.contains('sizes-admin-safe-area-height')) {
      const platform = e.target.dataset.platform;
      const sizeKey = e.target.dataset.sizeKey;
      const widthInput = e.target.closest('.sizes-admin-size-item')?.querySelector('.sizes-admin-safe-area-width');
      const heightInput = e.target.closest('.sizes-admin-size-item')?.querySelector('.sizes-admin-safe-area-height');
      
      if (platform && sizeKey && widthInput && heightInput) {
        const width = parseInt(widthInput.value, 10);
        const height = parseInt(heightInput.value, 10);
        
        // Получаем текущие пользовательские охранные области
        const state = getState();
        let userSafeAreas = JSON.parse(JSON.stringify(state.safeAreas || {}));
        
        // Если оба поля заполнены валидными значениями, сохраняем пользовательское значение
        if (!isNaN(width) && width > 0 && !isNaN(height) && height > 0) {
          if (!userSafeAreas[platform]) {
            userSafeAreas[platform] = {};
          }
          // Сохраняем существующие настройки hideLegal, hideAge и titleAlign, если они есть
          const existing = userSafeAreas[platform][sizeKey] || {};
          userSafeAreas[platform][sizeKey] = { 
            width, 
            height,
            hideLegal: existing.hideLegal !== undefined ? existing.hideLegal : false,
            hideAge: existing.hideAge !== undefined ? existing.hideAge : false,
            titleAlign: existing.titleAlign !== undefined ? existing.titleAlign : undefined
          };
          setKey('safeAreas', userSafeAreas);
          // Перерисовываем, чтобы обновить индикатор "Свои значения"
          renderAdminPlatforms(currentSizes);
          setupAdminHandlers(currentSizes);
        } else {
          // Если хотя бы одно поле пустое или невалидное, удаляем пользовательское значение (возвращаем к default)
          if (userSafeAreas[platform] && userSafeAreas[platform][sizeKey]) {
            delete userSafeAreas[platform][sizeKey];
            if (Object.keys(userSafeAreas[platform]).length === 0) {
              delete userSafeAreas[platform];
            }
            setKey('safeAreas', userSafeAreas);
            // Перерисовываем, чтобы показать дефолтные значения или "default"
            renderAdminPlatforms(currentSizes);
            setupAdminHandlers(currentSizes);
          }
        }
      }
    }
  });
  
  // Обработчик кнопки "Вернуть к умолчанию" для охранных областей
  document.getElementById('sizesAdminPlatforms').addEventListener('click', (e) => {
    if (e.target.closest('[data-action="clear-safe-area"]')) {
      const btn = e.target.closest('[data-action="clear-safe-area"]');
      const platform = btn.dataset.platform;
      const sizeKey = btn.dataset.sizeKey;
      
      if (platform && sizeKey) {
        const state = getState();
        let userSafeAreas = state.safeAreas || {};
        
        // Удаляем пользовательское значение
        if (userSafeAreas[platform] && userSafeAreas[platform][sizeKey]) {
          delete userSafeAreas[platform][sizeKey];
          if (Object.keys(userSafeAreas[platform]).length === 0) {
            delete userSafeAreas[platform];
          }
          setKey('safeAreas', userSafeAreas);
          // Перерисовываем, чтобы показать дефолтные значения
          renderAdminPlatforms(currentSizes);
          setupAdminHandlers(currentSizes);
        }
      }
    }
  });
  
  // Обработчик множителя размера логотипа
  document.getElementById('sizesAdminPlatforms').addEventListener('input', (e) => {
    if (e.target.classList.contains('sizes-admin-logo-size-multiplier')) {
      const platform = e.target.dataset.platform;
      const sizeKey = e.target.dataset.sizeKey;
      const value = parseFloat(e.target.value);
      
      if (platform && sizeKey) {
        const state = getState();
        let logoSizeMultipliers = JSON.parse(JSON.stringify(state.logoSizeMultipliers || {}));
        
        // Если значение валидное, сохраняем
        if (!isNaN(value) && value > 0) {
          if (!logoSizeMultipliers[platform]) {
            logoSizeMultipliers[platform] = {};
          }
          logoSizeMultipliers[platform][sizeKey] = value;
          setKey('logoSizeMultipliers', logoSizeMultipliers);
          // Сохраняем в localStorage
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('logoSizeMultipliers', JSON.stringify(logoSizeMultipliers));
          }
          // Перерисовываем canvas, чтобы применить изменения
          if (renderer && renderer.renderSync) {
            renderer.renderSync();
          }
          // Перерисовываем, чтобы обновить кнопку очистки
          renderAdminPlatforms(currentSizes);
          setupAdminHandlers(currentSizes);
        } else if (e.target.value === '' || isNaN(value)) {
          // Если поле пустое, удаляем пользовательское значение
          if (logoSizeMultipliers[platform] && logoSizeMultipliers[platform][sizeKey]) {
            delete logoSizeMultipliers[platform][sizeKey];
            if (Object.keys(logoSizeMultipliers[platform]).length === 0) {
              delete logoSizeMultipliers[platform];
            }
            setKey('logoSizeMultipliers', logoSizeMultipliers);
            // Сохраняем в localStorage
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('logoSizeMultipliers', JSON.stringify(logoSizeMultipliers));
            }
            // Перерисовываем canvas, чтобы применить изменения
            if (renderer && renderer.renderSync) {
              renderer.renderSync();
            }
            // Перерисовываем, чтобы обновить кнопку очистки
            renderAdminPlatforms(currentSizes);
            setupAdminHandlers(currentSizes);
          }
        }
      }
    }
  });
  
  // Обработчик кнопки очистки множителя логотипа
  document.getElementById('sizesAdminPlatforms').addEventListener('click', (e) => {
    if (e.target.closest('[data-action="clear-logo-size-multiplier"]')) {
      const btn = e.target.closest('[data-action="clear-logo-size-multiplier"]');
      const platform = btn.dataset.platform;
      const sizeKey = btn.dataset.sizeKey;
      
      if (platform && sizeKey) {
        const state = getState();
        let logoSizeMultipliers = JSON.parse(JSON.stringify(state.logoSizeMultipliers || {}));
        
        // Удаляем пользовательское значение
        if (logoSizeMultipliers[platform] && logoSizeMultipliers[platform][sizeKey]) {
          delete logoSizeMultipliers[platform][sizeKey];
          if (Object.keys(logoSizeMultipliers[platform]).length === 0) {
            delete logoSizeMultipliers[platform];
          }
          setKey('logoSizeMultipliers', logoSizeMultipliers);
          // Сохраняем в localStorage
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('logoSizeMultipliers', JSON.stringify(logoSizeMultipliers));
          }
          // Перерисовываем canvas, чтобы применить изменения
          if (renderer && renderer.renderSync) {
            renderer.renderSync();
          }
          // Перерисовываем, чтобы обновить UI
          renderAdminPlatforms(currentSizes);
          setupAdminHandlers(currentSizes);
        }
      }
    }
  });
  
  // Обработчик чекбоксов для скрытия лигала и возраста
  document.getElementById('sizesAdminPlatforms').addEventListener('change', (e) => {
    if (e.target.classList.contains('sizes-admin-hide-legal') || e.target.classList.contains('sizes-admin-hide-age') || e.target.classList.contains('sizes-admin-title-align')) {
      const platform = e.target.dataset.platform;
      const sizeKey = e.target.dataset.sizeKey;
      const isHideLegal = e.target.classList.contains('sizes-admin-hide-legal');
      const isHideAge = e.target.classList.contains('sizes-admin-hide-age');
      const isTitleAlign = e.target.classList.contains('sizes-admin-title-align');
      
      if (platform && sizeKey) {
        const state = getState();
        let userSafeAreas = JSON.parse(JSON.stringify(state.safeAreas || {}));
        
        if (!userSafeAreas[platform]) {
          userSafeAreas[platform] = {};
        }
        
        // Получаем существующие значения или создаем пустой объект
        const existing = userSafeAreas[platform][sizeKey] || {};
        const defaultSafeAreas = {
          'Ozon': {
            '2832x600': { width: 2100, height: 570, hideLegal: false, hideAge: false, titleAlign: 'left' },
            '1080x450': { width: 1020, height: 405, hideLegal: false, hideAge: false, titleAlign: 'left' }
          },
          // Перформанс‑форматы РСЯ + Поиск
          'РСЯ': {
            '1600x1200': { width: 900, height: 900, hideLegal: true, hideAge: true, titleAlign: 'center' }
          },
          // Обратная совместимость со старыми сохранёнными конфигами (платформа "РСЯ")
          'РСЯ': {
            '1600x1200': { width: 900, height: 900, hideLegal: true, hideAge: true, titleAlign: 'center' }
          }
        };
        
        // Если нет пользовательских значений, используем дефолтные
        if (!existing.width || !existing.height) {
          const defaultArea = defaultSafeAreas[platform] && defaultSafeAreas[platform][sizeKey];
          if (defaultArea) {
            existing.width = defaultArea.width;
            existing.height = defaultArea.height;
          }
        }
        
        // Обновляем настройку скрытия или выключки
        if (isHideLegal) {
          existing.hideLegal = e.target.checked;
        } else if (isHideAge) {
          existing.hideAge = e.target.checked;
        } else if (isTitleAlign) {
          const value = e.target.value;
          if (value === '') {
            // Удаляем настройку, чтобы использовать глобальную
            delete existing.titleAlign;
          } else {
            existing.titleAlign = value;
          }
        }
        
        userSafeAreas[platform][sizeKey] = existing;
        setKey('safeAreas', userSafeAreas);
      }
    }
  });
  
  // Обработчик изменения пароля
  const changePasswordBtn = document.getElementById('sizesAdminChangePassword');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
      // Просим ввести текущий пароль еще раз
      const root = getComputedStyle(document.documentElement);
      const bgPrimary = root.getPropertyValue('--bg-primary') || '#0d0d0d';
      const bgSecondary = root.getPropertyValue('--bg-secondary') || '#141414';
      const borderColor = root.getPropertyValue('--border-color') || '#2a2a2a';
      const textPrimary = root.getPropertyValue('--text-primary') || '#e9e9e9';
      const textSecondary = root.getPropertyValue('--text-secondary') || '#999999';
      
      const verifyModal = document.createElement('div');
      verifyModal.id = 'sizesVerifyPasswordModal';
      verifyModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100001;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(4px);
      `;
      
      verifyModal.innerHTML = `
        <div style="background: ${bgSecondary}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <span class="material-icons" style="font-size: 28px; color: #2196F3;">lock</span>
            <h2 style="margin: 0; font-size: 20px; color: ${textPrimary};">Подтверждение</h2>
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">Введите пароль еще раз</label>
            <input type="password" id="sizesVerifyPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="Введите пароль" autofocus>
            <div id="sizesVerifyPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">Неверный пароль</div>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="sizesVerifyPasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; cursor: pointer;">Отмена</button>
            <button id="sizesVerifyPasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">Продолжить</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(verifyModal);
      
      const verifyInput = document.getElementById('sizesVerifyPasswordInput');
      const verifyError = document.getElementById('sizesVerifyPasswordError');
      const verifySubmit = document.getElementById('sizesVerifyPasswordSubmit');
      const verifyCancel = document.getElementById('sizesVerifyPasswordCancel');
      
      const verify = () => {
        if (checkPassword(verifyInput.value)) {
          verifyModal.remove();
          showChangePasswordModal();
        } else {
          verifyError.style.display = 'block';
          verifyInput.style.borderColor = '#f44336';
          verifyInput.value = '';
          verifyInput.focus();
        }
      };
      
      verifySubmit.addEventListener('click', verify);
      verifyCancel.addEventListener('click', () => {
        verifyModal.remove();
      });
      
      verifyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          verify();
        } else if (e.key === 'Escape') {
          verifyModal.remove();
        }
      });
      
      verifyModal.addEventListener('click', (e) => {
        if (e.target === verifyModal) {
          verifyModal.remove();
        }
      });
      
      setTimeout(() => {
        verifyInput.focus();
      }, 100);
    });
  }
  
  // Сохранение
  document.getElementById('sizesAdminSave').addEventListener('click', async () => {
    // Валидация размеров
    for (const [platform, sizes] of Object.entries(currentSizes)) {
      if (!platform || !platform.trim()) {
        alert('Название платформы не может быть пустым');
        return;
      }
      for (const size of sizes) {
        if (!size.width || !size.height || size.width <= 0 || size.height <= 0) {
          alert(`Некорректный размер в платформе "${platform}"`);
          return;
        }
      }
    }
    
    // Сохраняем размеры
    saveSizesConfig(currentSizes);
    updatePresetSizesFromConfig();
    renderPresetSizes();
    updatePreviewSizeSelect();
    updateSizesSummary();
    
    // Сохраняем значения по умолчанию и множители
    // ВАЖНО: Берем значения ТОЛЬКО из полей админки, а не из текущего state
    const defaults = getDefaultValues();
    
    // Функция для получения значения из поля админки или дефолтного значения
    const getAdminValue = (elementId, defaultValue) => {
      const element = document.getElementById(elementId);
      if (element) {
        if (element.type === 'checkbox') {
          return element.checked;
        }
        if (element.type === 'number') {
          const value = parseFloat(element.value);
          return isNaN(value) ? defaultValue : value;
        }
        return element.value || defaultValue;
      }
      return defaultValue;
    };
    
    // Создаем объект с значениями по умолчанию (исключаем изображения и файлы)
    // Берем значения ТОЛЬКО из полей админки, игнорируя текущий state
    const defaultValues = {
      // Текстовые значения из полей админки
      title: getAdminValue('defaultTitle', ''),
      subtitle: getAdminValue('defaultSubtitle', ''),
      legal: getAdminValue('defaultLegal', ''),
      age: getAdminValue('defaultAge', '18+'),
      
      // Цвета из полей админки
      bgColor: getAdminValue('defaultBgColorHex', '#1e1e1e'),
      titleColor: getAdminValue('defaultTextColorHex', '#ffffff'),
      subtitleColor: getAdminValue('defaultSubtitleColorHex', '#e0e0e0'),
      legalColor: getAdminValue('defaultLegalColorHex', defaults.legalColor),
      
      // Настройки заголовка из полей админки
      titleSize: getAdminValue('defaultTitleSize', defaults.titleSize),
      titleWeight: getAdminValue('defaultTitleWeight', 'Regular'),
      titleAlign: getAdminValue('defaultTitleAlign', defaults.titleAlign),
      titleVPos: getAdminValue('defaultTitleVPos', defaults.titleVPos),
      titleLetterSpacing: getAdminValue('defaultTitleLetterSpacing', defaults.titleLetterSpacing),
      titleLineHeight: getAdminValue('defaultTitleLineHeight', defaults.titleLineHeight),
      
      // Настройки подзаголовка из полей админки
      subtitleSize: getAdminValue('defaultSubtitleSize', defaults.subtitleSize),
      subtitleWeight: getAdminValue('defaultSubtitleWeight', 'Regular'),
      subtitleAlign: getAdminValue('defaultSubtitleAlign', defaults.subtitleAlign),
      subtitleOpacity: getAdminValue('defaultSubtitleOpacity', defaults.subtitleOpacity),
      subtitleLetterSpacing: getAdminValue('defaultSubtitleLetterSpacing', defaults.subtitleLetterSpacing),
      subtitleLineHeight: getAdminValue('defaultSubtitleLineHeight', defaults.subtitleLineHeight),
      subtitleGap: getAdminValue('defaultSubtitleGap', defaults.subtitleGap),
      titleSubtitleRatio: getAdminValue('defaultTitleSubtitleRatio', defaults.titleSubtitleRatio),
      
      // Настройки legal из полей админки
      legalSize: getAdminValue('defaultLegalSize', defaults.legalSize),
      legalWeight: getAdminValue('defaultLegalWeight', 'Regular'),
      legalAlign: getAdminValue('defaultLegalAlign', defaults.legalAlign),
      legalOpacity: getAdminValue('defaultLegalOpacity', defaults.legalOpacity),
      legalLetterSpacing: getAdminValue('defaultLegalLetterSpacing', defaults.legalLetterSpacing),
      legalLineHeight: getAdminValue('defaultLegalLineHeight', defaults.legalLineHeight),
      
      // Настройки age из полей админки
      ageSize: getAdminValue('defaultAgeSize', defaults.ageSize),
      ageWeight: getAdminValue('defaultAgeWeight', 'Regular'),
      ageGapPercent: getAdminValue('defaultAgeGapPercent', defaults.ageGapPercent),
      
      // Шрифт из поля админки
      fontFamily: (() => {
        const selectedValue = getAdminValue('defaultFontFamily', defaults.fontFamily);
        // Заменяем 'system-ui' на 'YS Text' для шрифта по умолчанию
        return selectedValue === 'system-ui' ? 'YS Text' : selectedValue;
      })(),
      
      // Значения, которые не меняются в админке - берем из сохраненных значений по умолчанию
      // или используем дефолтные, но НЕ из текущего state
      logoSelected: '', // Не сохраняем текущий логотип
      kvSelected: DEFAULT_KV_PATH, // Дефолтное значение
      logoSize: defaults.logoSize,
      logoPos: defaults.logoPos,
      logoLanguage: defaults.logoLanguage,
      kvBorderRadius: defaults.kvBorderRadius,
      kvPosition: defaults.kvPosition,
      bgSize: defaults.bgSize,
      bgImageSize: defaults.bgImageSize ?? 100,
      bgPosition: defaults.bgPosition,
      bgVPosition: defaults.bgVPosition,
      textGradientOpacity: defaults.textGradientOpacity,
      centerTextOverlayOpacity: 20,
      paddingPercent: defaults.paddingPercent,
      layoutMode: defaults.layoutMode,
      
      // Настройки экспорта из полей админки
      maxFileSizeUnit: getAdminValue('defaultMaxFileSizeUnit', 'KB'),
      maxFileSizeValue: getAdminValue('defaultMaxFileSizeValue', 150),
      habrBorderEnabled: getAdminValue('defaultHabrBorderEnabled', false),
      habrBorderColor: getAdminValue('defaultHabrBorderColorHex', '#D5DDDF')
    };
    
    // Сохраняем название бренда
    const brandNameInput = document.getElementById('brandNameInput');
    if (brandNameInput) {
      const brandName = brandNameInput.value.trim() || 'Практикума';
      setKey('brandName', brandName);
      
      document.title = 'AI-Craft';
      
      // Обновляем заголовки в парах, если они содержат старое название
      state = getState(); // Обновляем state после изменения brandName
      const updatedPairs = state.titleSubtitlePairs.map(pair => {
        if (pair.title && pair.title.includes('от')) {
          // Обновляем заголовок, если он содержит "от [название]"
          const newTitle = pair.title.replace(/от\s+[^»]+$/, `от ${brandName}`);
          return { ...pair, title: newTitle };
        }
        return pair;
      });
      if (updatedPairs.some((pair, idx) => pair.title !== state.titleSubtitlePairs[idx].title)) {
        setState({ titleSubtitlePairs: updatedPairs });
      }
      
      // Сохраняем в localStorage для сохранения между сессиями
      localStorage.setItem('brandName', brandName);
    }
    
    // Сохраняем значения по умолчанию в localStorage
    localStorage.setItem(getScopedStorageKey('default-values'), JSON.stringify(defaultValues));
    
    // Сохраняем пользовательские охранные области
    state = getState(); // Обновляем state после возможных изменений
    if (state.safeAreas) {
      localStorage.setItem('user-safe-areas', JSON.stringify(state.safeAreas));
    } else {
      localStorage.removeItem('user-safe-areas');
    }
    
    // Сохраняем множители размера логотипа
    if (state.logoSizeMultipliers) {
      localStorage.setItem('logoSizeMultipliers', JSON.stringify(state.logoSizeMultipliers));
    } else {
      localStorage.removeItem('logoSizeMultipliers');
    }
    
    // ВАЖНО: НЕ применяем значения по умолчанию к текущему state
    // Сохраненные значения по умолчанию будут использоваться только при создании новых макетов
    // Текущий макет остается без изменений
    
    // Сохраняем множители, если они есть
    const currentMultipliers = state.formatMultipliers;
    if (currentMultipliers) {
      // Сохраняем в localStorage
      localStorage.setItem('format-multipliers', JSON.stringify(currentMultipliers));
      // Убеждаемся, что множители обновлены в state (создаем новый объект для триггера обновления)
      const updatedMultipliers = JSON.parse(JSON.stringify(currentMultipliers));
      // Принудительно обновляем state, даже если объект выглядит одинаковым
      setState({ formatMultipliers: updatedMultipliers });
    }

    try {
      await syncWorkspaceTeamDefaults();
    } catch (error) {
      console.warn('Не удалось синхронизировать team defaults с workspace API:', error);
    }
    
    // Небольшая задержка перед рендером, чтобы state успел обновиться
    setTimeout(() => {
      // Проверяем, что значения обновились
      const checkState = getState();
      console.log('Значения по умолчанию после сохранения:', {
        titleSize: checkState.titleSize,
        subtitleSize: checkState.subtitleSize,
        logoSize: checkState.logoSize,
        bgColor: checkState.bgColor
      });
      // Принудительно перерисовываем все макеты с новыми значениями
    renderer.render();
    }, 50);
    
    closeSizesAdmin();
    alert('Все настройки успешно сохранены!');
  });
  
  // Экспорт
  document.getElementById('sizesAdminExport').addEventListener('click', () => {
    exportSizesConfig();
  });
  
  // Импорт
  document.getElementById('sizesAdminImport').addEventListener('click', () => {
    document.getElementById('sizesAdminImportFile').click();
  });
  
  document.getElementById('sizesAdminImportFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const imported = await importSizesConfig(file);
      currentSizes = imported;
      renderAdminPlatforms(currentSizes);
      setupAdminHandlers(currentSizes);
      alert('Размеры успешно импортированы!');
    } catch (error) {
      alert(`Ошибка импорта: ${error.message}`);
    }
    e.target.value = '';
  });
  
  // Сброс
  document.getElementById('sizesAdminReset').addEventListener('click', () => {
    if (confirm('Сбросить все размеры к дефолтным? Это действие нельзя отменить.')) {
      const defaults = resetSizesConfig();
      currentSizes = defaults;
      renderAdminPlatforms(currentSizes);
      setupAdminHandlers(currentSizes);
    }
  });
  
  // Экспорт полной конфигурации
  document.getElementById('sizesAdminExportFull').addEventListener('click', () => {
    try {
      const success = exportFullConfig();
      if (success) {
        alert('Полная конфигурация успешно экспортирована! Файл содержит все настройки: размеры, значения по умолчанию, множители и фоны. Вы можете передать этот файл другой команде.');
      } else {
        alert('Ошибка при экспорте конфигурации. Проверьте консоль для подробностей.');
      }
    } catch (error) {
      console.error('Ошибка экспорта полной конфигурации:', error);
      alert(`Ошибка экспорта: ${error.message}`);
    }
  });
  
  // Импорт полной конфигурации
  document.getElementById('sizesAdminImportFull').addEventListener('click', () => {
    document.getElementById('sizesAdminImportFullFile').click();
  });
  
  document.getElementById('sizesAdminImportFullFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm('Импорт полной конфигурации заменит все текущие настройки. Продолжить?')) {
      e.target.value = '';
      return;
    }
    
    try {
      const imported = await importFullConfig(file);
      
      // Обновляем размеры в админке
      const sizes = getPresetSizes();
      currentSizes = sizes;
      renderAdminPlatforms(currentSizes);
      setupAdminHandlers(currentSizes);
      
      // Обновляем размеры в store
      updatePresetSizesFromConfig();
      
      // Применяем значения по умолчанию, если они есть
      if (imported.defaultValues) {
        batch(() => {
          Object.keys(imported.defaultValues).forEach(key => {
            setKey(key, imported.defaultValues[key]);
          });
        });
      }
      
      // Обновляем тему, если она была импортирована
      if (imported.theme) {
        const html = document.documentElement;
        if (imported.theme === 'light') {
          html.setAttribute('data-theme', 'light');
        } else {
          html.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', imported.theme);
      }
      
      // Обновляем название бренда, если оно было импортировано
      if (imported.brandName) {
        setKey('brandName', imported.brandName);
        document.title = 'AI-Craft';
      }
      
      // Перезагружаем страницу для применения всех изменений
      if (confirm('Конфигурация успешно импортирована! Для полного применения изменений рекомендуется перезагрузить страницу. Перезагрузить сейчас?')) {
        window.location.reload();
      } else {
        alert('Конфигурация импортирована. Некоторые изменения могут потребовать перезагрузки страницы.');
      }
    } catch (error) {
      console.error('Ошибка импорта полной конфигурации:', error);
      alert(`Ошибка импорта: ${error.message}`);
    }
    e.target.value = '';
  });
  
  // Полный сброс всех настроек
  document.getElementById('sizesAdminFullReset').addEventListener('click', () => {
    // Первое подтверждение
    if (!confirm('⚠️ ВНИМАНИЕ! Вы собираетесь полностью сбросить ВСЕ настройки, связанные с Практикумом:\n\n' +
                 '• Все логотипы и фотографии\n' +
                 '• Все тексты (заголовки, подзаголовки, юридический текст)\n' +
                 '• Все значения по умолчанию\n' +
                 '• Все размеры и платформы\n' +
                 '• Все настройки админки\n\n' +
                 'Это действие НЕЛЬЗЯ отменить!\n\n' +
                 'Продолжить?')) {
      return;
    }
    
    // Второе подтверждение
    if (!confirm('⚠️ ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ!\n\n' +
                 'Вы точно уверены, что хотите полностью сбросить все настройки?\n\n' +
                 'Все ваши настройки будут безвозвратно удалены и возвращены к исходным значениям.\n\n' +
                 'Нажмите OK для подтверждения или Отмена для отмены.')) {
      return;
    }
    
    try {
      // Очищаем все данные из localStorage
      localStorage.removeItem('sizes-config');
      localStorage.removeItem(getScopedStorageKey('default-values'));
      localStorage.removeItem('format-multipliers');
      localStorage.removeItem('adminBackgrounds');
      localStorage.removeItem('brandName');
      
      // Сбрасываем размеры к дефолтным
      resetSizesConfig();
      
      // Сбрасываем state к дефолтным
      resetState();
      
      // Обновляем размеры в store
      updatePresetSizesFromConfig();
      
      console.log('✓ Все настройки сброшены');
      
      // Перезагружаем страницу для полного применения сброса
      alert('Все настройки успешно сброшены! Страница будет перезагружена.');
      window.location.reload();
    } catch (error) {
      console.error('Ошибка при полном сбросе:', error);
      alert(`Ошибка при сбросе настроек: ${error.message}`);
    }
  });
};

/**
 * Обновляет превью для значений по умолчанию
 */
const updateDefaultsPreview = () => {
  const state = getState();
  
  // Фон
  const bgPreview = document.getElementById('defaultBgPreview');
  const bgImg = document.getElementById('defaultBgPreviewImg');
  const bgPlaceholder = document.getElementById('defaultBgPreviewPlaceholder');
  const bgColorResetBtn = document.getElementById('defaultBgColorReset');
  if (bgPreview && bgImg && bgPlaceholder) {
    if (state.bgImage) {
      bgImg.src = state.bgImage;
      bgImg.style.display = 'block';
      bgPlaceholder.textContent = 'Изображение';
    } else {
      bgImg.style.display = 'none';
      bgPreview.style.background = state.bgColor || '#1e1e1e';
      bgPlaceholder.textContent = 'Цвет: ' + (state.bgColor || '#1e1e1e');
    }
    // Показываем кнопку сброса цвета, если цвет изменился
    if (bgColorResetBtn && originalDefaults) {
      bgColorResetBtn.style.display = (state.bgColor !== originalDefaults.bgColor) ? 'block' : 'none';
    }
  }
};

/**
 * Настраивает обработчики для вкладки с настройками по умолчанию
 */
const setupDefaultsHandlers = () => {
  // Убеждаемся, что превью контейнеры не открывают модальные окна при клике
  const defaultPartnerLogoPreview = document.getElementById('defaultPartnerLogoPreview');
  
  if (defaultPartnerLogoPreview) {
    defaultPartnerLogoPreview.addEventListener('click', (e) => {
      e.stopPropagation();
      // Не открываем модальное окно, просто предотвращаем всплытие
    });
  }
  
  // Загрузка фона
  const defaultBgUpload = document.getElementById('defaultBgUpload');
  const defaultBgUploadFile = document.getElementById('defaultBgUploadFile');
  if (defaultBgUpload && defaultBgUploadFile) {
    defaultBgUpload.addEventListener('click', () => {
      defaultBgUploadFile.click();
    });
    defaultBgUploadFile.addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        const event = { target: e.target };
        await handleBgUpload(event);
        updateDefaultsPreview();
        const clearBtn = document.getElementById('defaultBgClear');
        if (clearBtn) clearBtn.style.display = 'block';
      }
    });
  }
  
  // Удаление фона (изображения)
  const defaultBgClear = document.getElementById('defaultBgClear');
  if (defaultBgClear) {
    defaultBgClear.addEventListener('click', () => {
      setKey('bgImage', null);
      updateDefaultsPreview();
      defaultBgClear.style.display = 'none';
    });
  }
  
  // Сброс цвета фона к исходному
  const defaultBgColorReset = document.getElementById('defaultBgColorReset');
  if (defaultBgColorReset) {
    defaultBgColorReset.addEventListener('click', () => {
      if (originalDefaults) {
        setKey('bgColor', originalDefaults.bgColor);
        const bgColorInput = document.getElementById('defaultBgColor');
        const bgColorHexInput = document.getElementById('defaultBgColorHex');
        if (bgColorInput) bgColorInput.value = originalDefaults.bgColor;
        if (bgColorHexInput) bgColorHexInput.value = originalDefaults.bgColor;
        updateDefaultsPreview();
        defaultBgColorReset.style.display = 'none';
      }
    });
  }
  
  // Цвет фона
  const defaultBgColor = document.getElementById('defaultBgColor');
  const defaultBgColorHex = document.getElementById('defaultBgColorHex');
  if (defaultBgColor && defaultBgColorHex) {
    defaultBgColor.addEventListener('input', (e) => {
      const color = e.target.value;
      setKey('bgColor', color);
      defaultBgColorHex.value = color;
      updateDefaultsPreview();
      // Обновляем рендер справа при изменении цвета
      renderer.render();
      // Показываем кнопку сброса, если цвет изменился
      if (defaultBgColorReset && originalDefaults) {
        defaultBgColorReset.style.display = color !== originalDefaults.bgColor ? 'block' : 'none';
      }
    });
    defaultBgColorHex.addEventListener('change', (e) => {
      const color = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(color)) {
        setKey('bgColor', color);
        defaultBgColor.value = color;
        updateDefaultsPreview();
        // Обновляем рендер справа при изменении цвета
        renderer.render();
        // Показываем кнопку сброса, если цвет изменился
        if (defaultBgColorReset && originalDefaults) {
          defaultBgColorReset.style.display = color !== originalDefaults.bgColor ? 'block' : 'none';
        }
      }
    });
  }
  
  // Цвет текста
  const defaultTextColor = document.getElementById('defaultTextColor');
  const defaultTextColorHex = document.getElementById('defaultTextColorHex');
  const defaultTextColorReset = document.getElementById('defaultTextColorReset');
  if (defaultTextColor && defaultTextColorHex) {
    defaultTextColor.addEventListener('input', (e) => {
      const color = e.target.value;
      setKey('titleColor', color);
      defaultTextColorHex.value = color;
      // Показываем кнопку сброса, если цвет изменился
      if (defaultTextColorReset && originalDefaults) {
        defaultTextColorReset.style.display = color !== originalDefaults.titleColor ? 'block' : 'none';
      }
    });
    defaultTextColorHex.addEventListener('change', (e) => {
      const color = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(color)) {
        setKey('titleColor', color);
        defaultTextColor.value = color;
        // Показываем кнопку сброса, если цвет изменился
        if (defaultTextColorReset && originalDefaults) {
          defaultTextColorReset.style.display = color !== originalDefaults.titleColor ? 'block' : 'none';
        }
      }
    });
  }
  
  // Сброс цвета текста к исходному
  if (defaultTextColorReset) {
    defaultTextColorReset.addEventListener('click', () => {
      if (originalDefaults) {
        setKey('titleColor', originalDefaults.titleColor);
        if (defaultTextColor) defaultTextColor.value = originalDefaults.titleColor;
        if (defaultTextColorHex) defaultTextColorHex.value = originalDefaults.titleColor;
        defaultTextColorReset.style.display = 'none';
      }
    });
  }
  
  // Текстовые поля
  const defaultTitle = document.getElementById('defaultTitle');
  if (defaultTitle) {
    defaultTitle.addEventListener('input', (e) => {
      setKey('title', e.target.value);
      renderer.render();
    });
  }
  
  const defaultSubtitle = document.getElementById('defaultSubtitle');
  if (defaultSubtitle) {
    defaultSubtitle.addEventListener('input', (e) => {
      setKey('subtitle', e.target.value);
      renderer.render();
    });
  }
  
  const defaultLegal = document.getElementById('defaultLegal');
  if (defaultLegal) {
    defaultLegal.addEventListener('input', (e) => {
      setKey('legal', e.target.value);
      renderer.render();
    });
  }
  
  const defaultAge = document.getElementById('defaultAge');
  if (defaultAge) {
    defaultAge.addEventListener('input', (e) => {
      setKey('age', e.target.value);
      renderer.render();
    });
  }
  
  // Настройки заголовка
  const defaultTitleSize = document.getElementById('defaultTitleSize');
  if (defaultTitleSize) {
    defaultTitleSize.addEventListener('input', (e) => {
      const defaults = getDefaultValues();
      setKey('titleSize', parseFloat(e.target.value) || defaults.titleSize);
      // Пересчитываем размер подзаголовка на основе коэффициента
      const state = getState();
      const ratio = state.titleSubtitleRatio ?? defaults.titleSubtitleRatio;
      const newSubtitleSize = parseFloat((state.titleSize * ratio).toFixed(2));
      setKey('subtitleSize', newSubtitleSize);
      renderer.render();
    });
  }
  
  const defaultTitleWeight = document.getElementById('defaultTitleWeight');
  if (defaultTitleWeight) {
    defaultTitleWeight.addEventListener('change', (e) => {
      setKey('titleWeight', e.target.value);
      renderer.render();
    });
  }
  
  const defaultTitleAlign = document.getElementById('defaultTitleAlign');
  if (defaultTitleAlign) {
    defaultTitleAlign.addEventListener('change', (e) => {
      setKey('titleAlign', e.target.value);
      renderer.render();
    });
  }
  
  const defaultTitleVPos = document.getElementById('defaultTitleVPos');
  if (defaultTitleVPos) {
    defaultTitleVPos.addEventListener('change', (e) => {
      setKey('titleVPos', e.target.value);
      renderer.render();
    });
  }
  
  const defaultTitleLetterSpacing = document.getElementById('defaultTitleLetterSpacing');
  if (defaultTitleLetterSpacing) {
    defaultTitleLetterSpacing.addEventListener('input', (e) => {
      setKey('titleLetterSpacing', parseFloat(e.target.value) || 0);
      renderer.render();
    });
  }
  
  const defaultTitleLineHeight = document.getElementById('defaultTitleLineHeight');
  if (defaultTitleLineHeight) {
    defaultTitleLineHeight.addEventListener('input', (e) => {
      setKey('titleLineHeight', parseFloat(e.target.value) || 1.1);
      renderer.render();
    });
  }
  
  // Настройки подзаголовка
  const defaultSubtitleColor = document.getElementById('defaultSubtitleColor');
  const defaultSubtitleColorHex = document.getElementById('defaultSubtitleColorHex');
  if (defaultSubtitleColor && defaultSubtitleColorHex) {
    defaultSubtitleColor.addEventListener('input', (e) => {
      const color = e.target.value;
      setKey('subtitleColor', color);
      defaultSubtitleColorHex.value = color;
      renderer.render();
    });
    defaultSubtitleColorHex.addEventListener('change', (e) => {
      const color = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(color)) {
        setKey('subtitleColor', color);
        defaultSubtitleColor.value = color;
        renderer.render();
      }
    });
  }
  
  const defaultSubtitleOpacity = document.getElementById('defaultSubtitleOpacity');
  if (defaultSubtitleOpacity) {
    defaultSubtitleOpacity.addEventListener('input', (e) => {
      setKey('subtitleOpacity', parseInt(e.target.value) || 90);
      renderer.render();
    });
  }

  const defaultTitleSubtitleRatio = document.getElementById('defaultTitleSubtitleRatio');
  if (defaultTitleSubtitleRatio) {
    defaultTitleSubtitleRatio.addEventListener('input', (e) => {
      const ratio = parseFloat(e.target.value) || 0.5;
      const ratioValue = document.getElementById('defaultTitleSubtitleRatioValue');
      if (ratioValue) {
        ratioValue.textContent = ratio.toFixed(2);
      }
      setKey('titleSubtitleRatio', ratio);
      // Пересчитываем размер подзаголовка на основе нового коэффициента
      const state = getState();
      const newSubtitleSize = parseFloat((state.titleSize * ratio).toFixed(2));
      setKey('subtitleSize', newSubtitleSize);
      renderer.render();
    });
  }
  
  const defaultSubtitleSize = document.getElementById('defaultSubtitleSize');
  if (defaultSubtitleSize) {
    defaultSubtitleSize.addEventListener('input', (e) => {
      setKey('subtitleSize', parseFloat(e.target.value) || 4);
      renderer.render();
    });
  }
  
  const defaultSubtitleWeight = document.getElementById('defaultSubtitleWeight');
  if (defaultSubtitleWeight) {
    defaultSubtitleWeight.addEventListener('change', (e) => {
      setKey('subtitleWeight', e.target.value);
      renderer.render();
    });
  }
  
  const defaultSubtitleAlign = document.getElementById('defaultSubtitleAlign');
  if (defaultSubtitleAlign) {
    defaultSubtitleAlign.addEventListener('change', (e) => {
      setKey('subtitleAlign', e.target.value);
      renderer.render();
    });
  }
  
  const defaultSubtitleGap = document.getElementById('defaultSubtitleGap');
  if (defaultSubtitleGap) {
    defaultSubtitleGap.addEventListener('input', (e) => {
      setKey('subtitleGap', parseFloat(e.target.value) || -1);
      renderer.render();
    });
  }
  
  const defaultSubtitleLetterSpacing = document.getElementById('defaultSubtitleLetterSpacing');
  if (defaultSubtitleLetterSpacing) {
    defaultSubtitleLetterSpacing.addEventListener('input', (e) => {
      setKey('subtitleLetterSpacing', parseFloat(e.target.value) || 0);
      renderer.render();
    });
  }
  
  const defaultSubtitleLineHeight = document.getElementById('defaultSubtitleLineHeight');
  if (defaultSubtitleLineHeight) {
    defaultSubtitleLineHeight.addEventListener('input', (e) => {
      setKey('subtitleLineHeight', parseFloat(e.target.value) || 1.2);
      renderer.render();
    });
  }
  
  // Настройки юридического текста
  const defaultLegalColor = document.getElementById('defaultLegalColor');
  const defaultLegalColorHex = document.getElementById('defaultLegalColorHex');
  if (defaultLegalColor && defaultLegalColorHex) {
    defaultLegalColor.addEventListener('input', (e) => {
      const color = e.target.value;
      setKey('legalColor', color);
      defaultLegalColorHex.value = color;
      renderer.render();
    });
    defaultLegalColorHex.addEventListener('change', (e) => {
      const color = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(color)) {
        setKey('legalColor', color);
        defaultLegalColor.value = color;
        renderer.render();
      }
    });
  }
  
  const defaultLegalOpacity = document.getElementById('defaultLegalOpacity');
  if (defaultLegalOpacity) {
    defaultLegalOpacity.addEventListener('input', (e) => {
      setKey('legalOpacity', parseInt(e.target.value) || 60);
      renderer.render();
    });
  }
  
  const defaultLegalSize = document.getElementById('defaultLegalSize');
  if (defaultLegalSize) {
    defaultLegalSize.addEventListener('input', (e) => {
      setKey('legalSize', parseFloat(e.target.value) || 2);
      renderer.render();
    });
  }
  
  const defaultLegalWeight = document.getElementById('defaultLegalWeight');
  if (defaultLegalWeight) {
    defaultLegalWeight.addEventListener('change', (e) => {
      setKey('legalWeight', e.target.value);
      renderer.render();
    });
  }
  
  const defaultLegalAlign = document.getElementById('defaultLegalAlign');
  if (defaultLegalAlign) {
    defaultLegalAlign.addEventListener('change', (e) => {
      setKey('legalAlign', e.target.value);
      renderer.render();
    });
  }
  
  const defaultLegalLetterSpacing = document.getElementById('defaultLegalLetterSpacing');
  if (defaultLegalLetterSpacing) {
    defaultLegalLetterSpacing.addEventListener('input', (e) => {
      setKey('legalLetterSpacing', parseFloat(e.target.value) || 0);
      renderer.render();
    });
  }
  
  const defaultLegalLineHeight = document.getElementById('defaultLegalLineHeight');
  if (defaultLegalLineHeight) {
    defaultLegalLineHeight.addEventListener('input', (e) => {
      setKey('legalLineHeight', parseFloat(e.target.value) || 1.4);
      renderer.render();
    });
  }
  
  // Настройки возраста
  const defaultAgeSize = document.getElementById('defaultAgeSize');
  if (defaultAgeSize) {
    defaultAgeSize.addEventListener('input', (e) => {
      setKey('ageSize', parseFloat(e.target.value) || 4);
      renderer.render();
    });
  }
  
  const defaultAgeWeight = document.getElementById('defaultAgeWeight');
  if (defaultAgeWeight) {
    defaultAgeWeight.addEventListener('change', (e) => {
      setKey('ageWeight', e.target.value);
      renderer.render();
    });
  }
  
  const defaultAgeGapPercent = document.getElementById('defaultAgeGapPercent');
  if (defaultAgeGapPercent) {
    defaultAgeGapPercent.addEventListener('input', (e) => {
      setKey('ageGapPercent', parseFloat(e.target.value) || 1);
      renderer.render();
    });
  }
  
  // Дополнительные настройки
  const defaultPaddingPercent = document.getElementById('defaultPaddingPercent');
  if (defaultPaddingPercent) {
    defaultPaddingPercent.addEventListener('input', (e) => {
      setKey('paddingPercent', parseFloat(e.target.value) || 5);
      renderer.render();
    });
  }
  
  const defaultLayoutMode = document.getElementById('defaultLayoutMode');
  if (defaultLayoutMode) {
    defaultLayoutMode.addEventListener('change', (e) => {
      setKey('layoutMode', e.target.value);
      renderer.render();
    });
  }
  
  const defaultBgSize = document.getElementById('defaultBgSize');
  if (defaultBgSize) {
    // Инициализируем видимость поля размера изображения при загрузке
    const bgImageSizeGroup = document.getElementById('bgImageSizeGroup');
    if (bgImageSizeGroup) {
      const currentBgSize = defaultBgSize.value;
      if (currentBgSize === 'tile' || currentBgSize === 'cover' || currentBgSize === 'contain') {
        bgImageSizeGroup.style.display = 'block';
      } else {
        bgImageSizeGroup.style.display = 'none';
      }
    }
    
    defaultBgSize.addEventListener('change', (e) => {
      const bgSize = e.target.value;
      setKey('bgSize', bgSize);
      
      // Показываем/скрываем поле размера изображения
      const bgImageSizeGroup = document.getElementById('bgImageSizeGroup');
      if (bgImageSizeGroup) {
        if (bgSize === 'tile' || bgSize === 'cover' || bgSize === 'contain') {
          bgImageSizeGroup.style.display = 'block';
        } else {
          bgImageSizeGroup.style.display = 'none';
        }
      }
      
      renderer.render();
    });
  }
  
  const defaultBgImageSize = document.getElementById('defaultBgImageSize');
  const defaultBgImageSizeValue = document.getElementById('defaultBgImageSizeValue');
  if (defaultBgImageSize) {
    defaultBgImageSize.addEventListener('input', (e) => {
      const size = parseFloat(e.target.value) || 100;
      setKey('bgImageSize', size);
      // Обновляем отображаемое значение
      if (defaultBgImageSizeValue) {
        defaultBgImageSizeValue.textContent = `${Math.round(size)}%`;
      }
      renderer.render();
    });
  }
  
  const defaultBgPosition = document.getElementById('defaultBgPosition');
  if (defaultBgPosition) {
    defaultBgPosition.addEventListener('change', (e) => {
      setKey('bgPosition', e.target.value);
      renderer.render();
    });
  }
  
  const defaultBgVPosition = document.getElementById('defaultBgVPosition');
  if (defaultBgVPosition) {
    defaultBgVPosition.addEventListener('change', (e) => {
      setKey('bgVPosition', e.target.value);
      renderer.render();
    });
  }
  
  const defaultTextGradientOpacity = document.getElementById('defaultTextGradientOpacity');
  if (defaultTextGradientOpacity) {
    defaultTextGradientOpacity.addEventListener('input', (e) => {
      setKey('textGradientOpacity', parseInt(e.target.value) || 100);
      renderer.render();
    });
  }
  
  const defaultCenterTextOverlayOpacity = document.getElementById('defaultCenterTextOverlayOpacity');
  if (defaultCenterTextOverlayOpacity) {
    defaultCenterTextOverlayOpacity.addEventListener('input', (e) => {
      setKey('centerTextOverlayOpacity', parseInt(e.target.value) || 20);
      renderer.render();
    });
  }
  
  // Настройки экспорта - максимальный вес файла
  const defaultMaxFileSizeValue = document.getElementById('defaultMaxFileSizeValue');
  if (defaultMaxFileSizeValue) {
    defaultMaxFileSizeValue.addEventListener('input', (e) => {
      setKey('maxFileSizeValue', parseFloat(e.target.value) || 150);
    });
  }
  
  const defaultMaxFileSizeUnit = document.getElementById('defaultMaxFileSizeUnit');
  if (defaultMaxFileSizeUnit) {
    defaultMaxFileSizeUnit.addEventListener('change', (e) => {
      setKey('maxFileSizeUnit', e.target.value);
    });
  }
  
  // Настройки экспорта - рамка для Хабра
  const defaultHabrBorderEnabled = document.getElementById('defaultHabrBorderEnabled');
  if (defaultHabrBorderEnabled) {
    defaultHabrBorderEnabled.addEventListener('change', (e) => {
      setKey('habrBorderEnabled', e.target.checked);
    });
  }
  
  const defaultHabrBorderColor = document.getElementById('defaultHabrBorderColor');
  const defaultHabrBorderColorHex = document.getElementById('defaultHabrBorderColorHex');
  if (defaultHabrBorderColor && defaultHabrBorderColorHex) {
    defaultHabrBorderColor.addEventListener('input', (e) => {
      const color = e.target.value;
      setKey('habrBorderColor', color);
      defaultHabrBorderColorHex.value = color;
    });
    defaultHabrBorderColorHex.addEventListener('change', (e) => {
      const color = e.target.value;
      if (/^#[0-9A-F]{6}$/i.test(color)) {
        setKey('habrBorderColor', color);
        defaultHabrBorderColor.value = color;
      }
    });
  }
  
  // Настройка обработчиков для управления фонами (перемещено из отдельной вкладки)
  setupBackgroundsHandlers();
};

/**
 * Настраивает обработчики для вкладки с множителями форматов
 */
const setupMultipliersHandlers = () => {
  const state = getState();
  const sanitizeMultipliers = (source) => {
    if (!source || typeof source !== 'object') return source;
    const next = JSON.parse(JSON.stringify(source));
    Object.keys(next).forEach((formatType) => {
      const group = next[formatType];
      if (!group || typeof group !== 'object') return;
      Object.keys(group).forEach((key) => {
        const value = group[key];
        if (value === null || value === undefined) return;
        const numeric = Number.parseFloat(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
          delete group[key];
          return;
        }
        group[key] = Math.min(10, Math.max(0.1, numeric));
      });
    });
    return next;
  };
  
  // Загружаем множители из localStorage, если их нет в state
  let multipliers = state.formatMultipliers;
  if (!multipliers) {
    try {
      const saved = localStorage.getItem('format-multipliers');
      if (saved) {
        multipliers = sanitizeMultipliers(JSON.parse(saved));
        // Инициализируем множители в state
        setKey('formatMultipliers', JSON.parse(JSON.stringify(multipliers)));
      }
    } catch (e) {
      console.warn('Ошибка при загрузке множителей из localStorage:', e);
    }
  }
  
  // Если множителей все еще нет, используем дефолтные
  if (!multipliers) {
    multipliers = {
    vertical: { logo: 2, title: 1, subtitle: 1, legal: 1, age: 1 },
    ultraWide: { logo: 0.75, titleSmall: 3, titleMedium: 2.2, titleLarge: 2, subtitleSmall: 3, subtitleMedium: 2.2, subtitleLarge: 2, legalNormal: 2.5, legalMedium: 2, age: 2 },
    veryWide: { logo: 0.75, titleMedium: 2.2, titleLarge: 2, titleExtraLarge: 2, subtitleMedium: 2.2, subtitleLarge: 2, subtitleExtraLarge: 2, legalNormal: 2.5, legalMedium: 2, legalExtraLarge: 2.5, age: 2 },
    horizontal: { logo: 0.75, titleSmall: 1.8, titleLarge: 1.6, titleWideSmall: 1.2, titleWideMedium: 1.4, subtitleSmall: 1.8, subtitleLarge: 1.6, subtitleWideSmall: 1.2, subtitleWideMedium: 1.4, legalSmall: 1.8, legalLarge: 2, legalWide450: 1.2, legalWide500: 1.1, legalWideOther: 1.15, age: 2, ageWide: null },
    square: { title: 0.9, subtitle: 0.9 },
    tall: { title: 1.3, subtitle: 1.3 }
  };
    // Инициализируем дефолтные множители в state
    setKey('formatMultipliers', JSON.parse(JSON.stringify(multipliers)));
  } else {
    const sanitized = sanitizeMultipliers(multipliers);
    multipliers = sanitized;
    setKey('formatMultipliers', JSON.parse(JSON.stringify(sanitized)));
  }
  
  // Функция для обновления множителя
  const updateMultiplier = (formatType, key, value) => {
    // Получаем актуальное состояние
    const currentState = getState();
    let currentMultipliers = currentState.formatMultipliers || {};
    
    // Создаем копию множителей
    const updatedMultipliers = JSON.parse(JSON.stringify(currentMultipliers));
    
    // Инициализируем тип формата, если его нет
    if (!updatedMultipliers[formatType]) {
      updatedMultipliers[formatType] = {};
    }
    
    // Обновляем значение только валидным числом; не записываем 0 при пустом input.
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return;
    const normalized = Math.min(10, Math.max(0.1, numeric));
    updatedMultipliers[formatType][key] = normalized;
    
    // Обновляем множители в state (используем setState для принудительного обновления)
    setState({ formatMultipliers: updatedMultipliers });
    
    // Обновляем локальную переменную для последующих изменений
    multipliers = updatedMultipliers;
    
    // Автоматически перерисовываем превью с небольшой задержкой
    setTimeout(() => {
      // Проверяем, что множители обновились в state
      const checkState = getState();
      console.log('Множители после обновления:', checkState.formatMultipliers?.[formatType]?.[key]);
    renderer.render();
    }, 50);
  };
  
  // Вертикальные форматы
  const verticalInputs = ['logo', 'title', 'subtitle', 'legal', 'age'];
  verticalInputs.forEach(key => {
    const input = document.getElementById(`multiplier-vertical-${key}`);
    if (input) {
      input.addEventListener('input', (e) => {
        updateMultiplier('vertical', key, e.target.value);
      });
    }
  });
  
  // Ультра-широкие форматы
  const ultraWideInputs = ['logo', 'titleSmall', 'titleMedium', 'titleLarge', 'subtitleSmall', 'subtitleMedium', 'subtitleLarge', 'legalNormal', 'legalMedium', 'age'];
  ultraWideInputs.forEach(key => {
    const input = document.getElementById(`multiplier-ultraWide-${key}`);
    if (input) {
      input.addEventListener('input', (e) => {
        updateMultiplier('ultraWide', key, e.target.value);
      });
    }
  });
  
  // Очень широкие форматы
  const veryWideInputs = ['logo', 'titleMedium', 'titleLarge', 'titleExtraLarge', 'subtitleMedium', 'subtitleLarge', 'subtitleExtraLarge', 'legalNormal', 'legalMedium', 'legalExtraLarge', 'age'];
  veryWideInputs.forEach(key => {
    const input = document.getElementById(`multiplier-veryWide-${key}`);
    if (input) {
      input.addEventListener('input', (e) => {
        updateMultiplier('veryWide', key, e.target.value);
      });
    }
  });
  
  // Горизонтальные форматы
  const horizontalInputs = ['logo', 'titleSmall', 'titleLarge', 'titleWideSmall', 'titleWideMedium', 'subtitleSmall', 'subtitleLarge', 'subtitleWideSmall', 'subtitleWideMedium', 'legalSmall', 'legalLarge', 'legalWide450', 'legalWide500', 'legalWideOther', 'age'];
  horizontalInputs.forEach(key => {
    const input = document.getElementById(`multiplier-horizontal-${key}`);
    if (input) {
      input.addEventListener('input', (e) => {
        updateMultiplier('horizontal', key, e.target.value);
      });
    }
  });
  
  // Квадратные форматы
  const squareTitleInput = document.getElementById('multiplier-square-title');
  if (squareTitleInput) {
    squareTitleInput.addEventListener('input', (e) => {
      updateMultiplier('square', 'title', e.target.value);
    });
  }
  const squareSubtitleInput = document.getElementById('multiplier-square-subtitle');
  if (squareSubtitleInput) {
    squareSubtitleInput.addEventListener('input', (e) => {
      updateMultiplier('square', 'subtitle', e.target.value);
    });
  }
  
  // Высокие макеты
  const tallTitleInput = document.getElementById('multiplier-tall-title');
  if (tallTitleInput) {
    tallTitleInput.addEventListener('input', (e) => {
      updateMultiplier('tall', 'title', e.target.value);
    });
  }
  const tallSubtitleInput = document.getElementById('multiplier-tall-subtitle');
  if (tallSubtitleInput) {
    tallSubtitleInput.addEventListener('input', (e) => {
      updateMultiplier('tall', 'subtitle', e.target.value);
    });
  }
};

/**
 * Настраивает обработчики для управления фонами
 */
const setupBackgroundsHandlers = () => {
  // Функция для сохранения фонов в localStorage
  const saveBackgrounds = (backgrounds) => {
    localStorage.setItem('adminBackgrounds', JSON.stringify(backgrounds));
  };
  
  // Функция для получения фонов из localStorage
  const getBackgrounds = () => {
    return JSON.parse(localStorage.getItem('adminBackgrounds') || '[]');
  };
  
  // Функция для вычисления настроек цвета
  const getColorSettings = (color) => {
    // Вычисляем цвет текста на основе яркости фона
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Специальная проверка для красных и оранжевых фонов - всегда белый текст и белый логотип
    let textColor = '#ffffff';
    let logoFolder = 'white';
    
    if (color === '#FF6C26' || color === '#E84033') {
      textColor = '#ffffff';
      logoFolder = 'white';
    } else {
      textColor = luminance > 0.5 ? '#1e1e1e' : '#ffffff';
      logoFolder = luminance > 0.5 ? 'black' : 'white';
    }
    
    return {
      bgColor: color,
      bgImage: null,
      textColor: textColor,
      logoFolder: logoFolder
    };
  };
  
  // Функция для перерисовки списка фонов (делаем доступной глобально для обновления при открытии вкладки)
  window.refreshBackgroundsList = () => {
    const backgroundsList = adminModal.querySelector('#adminBackgroundsList');
    if (backgroundsList) {
      let savedBackgrounds = JSON.parse(localStorage.getItem('adminBackgrounds') || '[]');
      
      // Проверяем, есть ли все предустановленные цвета в сохраненных фонах
      const existingColors = savedBackgrounds.map(bg => bg.bgColor?.toUpperCase()).filter(Boolean);
      const missingPresetColors = PRESET_BACKGROUND_COLORS.filter(color => 
        !existingColors.includes(color.toUpperCase())
      );
      
      // Добавляем недостающие предустановленные цвета
      if (missingPresetColors.length > 0) {
        const newBackgrounds = missingPresetColors.map(color => getColorSettings(color));
        savedBackgrounds = [...savedBackgrounds, ...newBackgrounds];
        // Сохраняем обновленный список
        localStorage.setItem('adminBackgrounds', JSON.stringify(savedBackgrounds));
      }
      
      // Если вообще нет сохраненных фонов, создаем все из предустановленных цветов
      if (savedBackgrounds.length === 0) {
        savedBackgrounds = PRESET_BACKGROUND_COLORS.map(color => getColorSettings(color));
        localStorage.setItem('adminBackgrounds', JSON.stringify(savedBackgrounds));
      }
      const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a';
      const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d';
      const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
      const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999';
      
      backgroundsList.innerHTML = savedBackgrounds.map((bg, index) => `
        <div class="admin-background-item" data-bg-index="${index}" style="border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px; background: ${bgPrimary};">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 60px; height: 60px; border-radius: 8px; background: ${bg.bgColor || '#1e1e1e'}; border: 1px solid ${borderColor}; position: relative; overflow: hidden;">
                ${bg.bgImage ? `<img src="${bg.bgImage}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
              </div>
              <div>
                <div style="font-weight: 600; color: ${textPrimary}; margin-bottom: 4px;">Фон #${index + 1}</div>
                <div style="font-size: 12px; color: ${textSecondary};">
                  ${bg.bgImage ? 'Изображение' : `Цвет: ${bg.bgColor || '#1e1e1e'}`}
                </div>
              </div>
            </div>
            <button class="btn btn-danger" data-remove-bg="${index}" style="padding: 8px;">
              <span class="material-icons" style="font-size: 18px;">delete</span>
            </button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Фон</label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="color" class="admin-bg-color" data-bg-index="${index}" value="${bg.bgColor || '#1e1e1e'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer;">
                <input type="text" class="admin-bg-color-hex" data-bg-index="${index}" value="${bg.bgColor || '#1e1e1e'}" placeholder="#1e1e1e" style="flex: 1; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              </div>
              <button class="btn" data-upload-bg="${index}" style="width: 100%; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>
                Загрузить изображение
              </button>
              <input type="file" class="admin-bg-upload-file" data-bg-index="${index}" accept="image/*" style="display: none;">
              <button class="btn" data-select-bg="${index}" style="width: 100%; margin-bottom: 8px;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">image</span>
                Выбрать из библиотеки
              </button>
              ${bg.bgImage ? `<button class="btn btn-danger" data-clear-bg="${index}" style="width: 100%;">
                <span class="material-icons" style="font-size: 18px; margin-right: 4px;">delete</span>
                Удалить изображение
              </button>` : ''}
            </div>
            
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Цвет текста</label>
              <div style="display: flex; gap: 8px;">
                <input type="color" class="admin-text-color" data-bg-index="${index}" value="${bg.textColor || '#ffffff'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer;">
                <input type="text" class="admin-text-color-hex" data-bg-index="${index}" value="${bg.textColor || '#ffffff'}" placeholder="#ffffff" style="flex: 1; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: 500; margin-bottom: 8px; font-size: 13px; display: block;">Логотип</label>
              <select class="admin-logo-folder" data-bg-index="${index}" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
                <option value="white" ${bg.logoFolder === 'white' ? 'selected' : ''}>Белый</option>
                <option value="black" ${bg.logoFolder === 'black' || !bg.logoFolder ? 'selected' : ''}>Черный</option>
              </select>
            </div>
          </div>
        </div>
      `).join('');
    }
  };
  
  // Добавление нового фона
  const addBackgroundBtn = adminModal.querySelector('#adminAddBackground');
  if (addBackgroundBtn) {
    addBackgroundBtn.addEventListener('click', () => {
      const backgrounds = getBackgrounds();
      backgrounds.push({
        bgColor: '#1e1e1e',
        bgImage: null,
        textColor: '#ffffff',
        logoFolder: 'white'
      });
      saveBackgrounds(backgrounds);
      window.refreshBackgroundsList();
    });
  }
  
  // Обработчик обновления списка фонов
  adminModal.addEventListener('adminBackgroundsUpdated', () => {
    window.refreshBackgroundsList();
  });
  
  // Используем делегирование событий для динамически создаваемых элементов
  const backgroundsList = adminModal.querySelector('#adminBackgroundsList');
  if (backgroundsList) {
    // Удаление фона
    backgroundsList.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-remove-bg]');
      if (removeBtn) {
        const index = parseInt(removeBtn.dataset.removeBg);
        const backgrounds = getBackgrounds();
        backgrounds.splice(index, 1);
        saveBackgrounds(backgrounds);
        window.refreshBackgroundsList();
      }
    });
    
    // Загрузка изображения фона
    backgroundsList.addEventListener('click', (e) => {
      const uploadBtn = e.target.closest('[data-upload-bg]');
      if (uploadBtn) {
        const index = parseInt(uploadBtn.dataset.uploadBg);
        const fileInput = adminModal.querySelector(`.admin-bg-upload-file[data-bg-index="${index}"]`);
        if (fileInput) fileInput.click();
      }
      
      // Выбор из библиотеки
      const selectBtn = e.target.closest('[data-select-bg]');
      if (selectBtn) {
        const index = parseInt(selectBtn.dataset.selectBg);
        // Сохраняем индекс для использования в обработчике выбора
        window._adminBgSelectIndex = index;
        // Открываем модальное окно выбора фона
        openBGSelectModal().then(() => {
          // Обработчик будет установлен в backgroundSelector.js
        });
      }
    });
    
    // Удаление изображения фона
    backgroundsList.addEventListener('click', (e) => {
      const clearBtn = e.target.closest('[data-clear-bg]');
      if (clearBtn) {
        const index = parseInt(clearBtn.dataset.clearBg);
        const backgrounds = getBackgrounds();
        if (backgrounds[index]) {
          backgrounds[index].bgImage = null;
          saveBackgrounds(backgrounds);
          window.refreshBackgroundsList();
        }
      }
    });
    
    // Изменение цвета фона
    backgroundsList.addEventListener('input', (e) => {
      if (e.target.classList.contains('admin-bg-color')) {
        const index = parseInt(e.target.dataset.bgIndex);
        const backgrounds = getBackgrounds();
        if (backgrounds[index]) {
          backgrounds[index].bgColor = e.target.value;
          const hexInput = adminModal.querySelector(`.admin-bg-color-hex[data-bg-index="${index}"]`);
          if (hexInput) hexInput.value = e.target.value;
          saveBackgrounds(backgrounds);
          window.refreshBackgroundsList();
          // Обновляем рендер справа при изменении цвета
          renderer.render();
        }
      } else if (e.target.classList.contains('admin-bg-color-hex')) {
        const index = parseInt(e.target.dataset.bgIndex);
        const backgrounds = getBackgrounds();
        if (backgrounds[index] && /^#[0-9A-Fa-f]{6}$/i.test(e.target.value)) {
          backgrounds[index].bgColor = e.target.value.toUpperCase();
          const colorInput = adminModal.querySelector(`.admin-bg-color[data-bg-index="${index}"]`);
          if (colorInput) colorInput.value = e.target.value;
          saveBackgrounds(backgrounds);
          refreshBackgroundsList();
          // Обновляем рендер справа при изменении цвета
          renderer.render();
        }
      } else if (e.target.classList.contains('admin-text-color')) {
        const index = parseInt(e.target.dataset.bgIndex);
        const backgrounds = getBackgrounds();
        if (backgrounds[index]) {
          backgrounds[index].textColor = e.target.value;
          const hexInput = adminModal.querySelector(`.admin-text-color-hex[data-bg-index="${index}"]`);
          if (hexInput) hexInput.value = e.target.value;
          saveBackgrounds(backgrounds);
          refreshBackgroundsList();
        }
      } else if (e.target.classList.contains('admin-text-color-hex')) {
        const index = parseInt(e.target.dataset.bgIndex);
        const backgrounds = getBackgrounds();
        if (backgrounds[index] && /^#[0-9A-Fa-f]{6}$/i.test(e.target.value)) {
          backgrounds[index].textColor = e.target.value.toUpperCase();
          const colorInput = adminModal.querySelector(`.admin-text-color[data-bg-index="${index}"]`);
          if (colorInput) colorInput.value = e.target.value;
          saveBackgrounds(backgrounds);
          refreshBackgroundsList();
        }
      } else if (e.target.classList.contains('admin-logo-folder')) {
        const index = parseInt(e.target.dataset.bgIndex);
        const backgrounds = getBackgrounds();
        if (backgrounds[index]) {
          backgrounds[index].logoFolder = e.target.value;
          saveBackgrounds(backgrounds);
        }
      }
    });
    
    // Загрузка файла изображения
    backgroundsList.addEventListener('change', (e) => {
      if (e.target.classList.contains('admin-bg-upload-file')) {
        const index = parseInt(e.target.dataset.bgIndex);
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const backgrounds = getBackgrounds();
            if (backgrounds[index]) {
              backgrounds[index].bgImage = event.target.result;
              saveBackgrounds(backgrounds);
              window.refreshBackgroundsList();
            }
          };
          reader.readAsDataURL(file);
        }
      }
    });
    
    // Применение фона к текущему макету (двойной клик на элементе фона)
    backgroundsList.addEventListener('dblclick', async (e) => {
      const item = e.target.closest('.admin-background-item');
      if (item) {
        const index = parseInt(item.dataset.bgIndex);
        const backgrounds = getBackgrounds();
        const bg = backgrounds[index];
        if (bg) {
          // Применяем фон
          if (bg.bgImage) {
            // Если есть изображение, загружаем его
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = async () => {
              const state = getState();
              const activePairIndex = state.activePairIndex || 0;
              const { updatePairBgImage } = await import('../../state/store.js');
              updatePairBgImage(activePairIndex, img);
              setState({ bgImage: img });
              await applyBackgroundSettings(bg);
            };
            img.src = bg.bgImage;
          } else {
            // Если только цвет, применяем цвет напрямую без автоматического выбора логотипа
            const normalizedColor = bg.bgColor?.toUpperCase() || bg.bgColor;
            setKey('bgColor', normalizedColor);
            const state = getState();
            const activePairIndex = state.activePairIndex || 0;
            const { updatePairBgColor } = await import('../../state/store.js');
            updatePairBgColor(activePairIndex, normalizedColor);
            
            // Обновляем UI элементов цвета фона
            const dom = getDom();
            if (dom.bgColor) dom.bgColor.value = normalizedColor;
            if (dom.bgColorHex) dom.bgColorHex.value = normalizedColor;
            
            // Применяем настройки фона (текст и логотип)
            await applyBackgroundSettings(bg);
          }
        }
      }
    });
  }
  
  // Функция для применения настроек текста и логотипа
  const applyBackgroundSettings = async (bg) => {
    // Устанавливаем цвет текста
    const textColor = bg.textColor || '#ffffff';
    setKey('titleColor', textColor);
    
    // Обновляем UI элементов цвета текста
    const dom = getDom();
    if (dom.titleColor) dom.titleColor.value = textColor;
    if (dom.titleColorHex) dom.titleColorHex.value = textColor;
    
    // Выбираем логотип на основе папки
    const state = getState();
    const language = state.logoLanguage || 'ru';
    
    // Для красных и оранжевых фонов используем mono.svg
    let logoType = 'main.svg'; // по умолчанию
    const bgColor = bg.bgColor?.toUpperCase();
    if (bgColor === '#E84033' || bgColor === '#FF6C26') {
      logoType = 'mono.svg';
    }
    
    const logoPath = `logo/${bg.logoFolder || 'white'}/${language}/${logoType}`;
    setKey('logoSelected', logoPath);
    
    // Загружаем логотип через selectPreloadedLogo
    await selectPreloadedLogo(logoPath);
    
    renderer.render();
  };
};

/**
 * Настраивает обработчики для аккордеона (сворачивание/разворачивание секций)
 */
const setupTabHandlers = () => {
  const accordionHeaders = adminModal.querySelectorAll('.admin-accordion-header');
  
  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const sectionName = header.dataset.accordionToggle;
      const section = adminModal.querySelector(`.admin-accordion-section[data-section="${sectionName}"]`);
      const content = section?.querySelector('.admin-accordion-content');
      const icon = header.querySelector('.admin-accordion-icon');
      
      if (!content) return;
      
      const isExpanded = content.style.display !== 'none';
      
      // Переключаем видимость
      if (isExpanded) {
        content.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        content.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        
        // Перерендериваем контент для динамических разделов при первом открытии
        if (sectionName === 'multipliers' || sectionName === 'backgrounds' || sectionName === 'files') {
          try {
            let newContent = '';
            if (sectionName === 'multipliers') {
              newContent = renderMultipliersTab();
            } else if (sectionName === 'backgrounds') {
              newContent = renderBackgroundsTab();
            } else if (sectionName === 'files') {
              newContent = renderFileManager();
            }
            
            if (newContent) {
              content.innerHTML = newContent;
              
              // Переинициализируем обработчики для динамического контента
              if (sectionName === 'backgrounds') {
                requestAnimationFrame(() => {
                  if (typeof window.refreshBackgroundsList === 'function') {
                    window.refreshBackgroundsList();
                  }
                  setupBackgroundsHandlers();
                });
              } else if (sectionName === 'files') {
                requestAnimationFrame(() => {
                  initFileManager();
                });
              } else if (sectionName === 'multipliers') {
                requestAnimationFrame(() => {
                  setupMultipliersHandlers();
                });
              }
            }
          } catch (error) {
            console.error('Ошибка при перерендеринге раздела:', error);
            content.innerHTML = `<div style="padding: 20px; color: red;">Ошибка загрузки: ${error.message}</div>`;
          }
        }
      }
    });
  });
  
  // По умолчанию все секции закрыты
  
  // Обработчики для открывашек/скрывашек размеров
  const sizeSettingsHeaders = adminModal.querySelectorAll('.size-settings-header');
  sizeSettingsHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const icon = header.querySelector('.size-settings-icon');
      
      if (!content) return;
      
      const isExpanded = content.style.display !== 'none';
      
      // Переключаем видимость
      if (isExpanded) {
        content.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        content.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });
  
  // Старый код для совместимости (если где-то еще используется)
  const menuItems = adminModal.querySelectorAll('.sizes-admin-menu-item');
  if (menuItems.length > 0) {
    console.warn('Найдены старые элементы меню, но они больше не используются');
  }
};
