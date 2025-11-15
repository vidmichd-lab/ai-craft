/**
 * Компонент админки для управления размерами
 * Позволяет добавлять, редактировать и удалять размеры и платформы
 */

import { 
  getPresetSizes, 
  saveSizesConfig, 
  exportSizesConfig, 
  importSizesConfig,
  resetSizesConfig 
} from '../../utils/sizesConfig.js';
import { updatePresetSizesFromConfig, getState, setKey } from '../../state/store.js';
import { renderPresetSizes, updatePreviewSizeSelect, updateSizesSummary } from './sizeManager.js';
import { renderer } from '../../renderer.js';
import { openLogoSelectModal, closeLogoSelectModal, selectPreloadedLogo } from './logoSelector.js';
import { openKVSelectModal, closeKVSelectModal, selectPreloadedKV } from './kvSelector.js';
import { handleLogoUpload, handleKVUpload, handleBgUpload, handlePartnerLogoUpload } from '../ui.js';

let adminModal = null;
let isAdminOpen = false;
// Сохраняем исходные значения для возможности отката
let originalDefaults = null;

/**
 * Рендерит вкладку с настройками по умолчанию
 */
const renderDefaultsTab = () => {
  const state = getState();
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a';
  const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d';
  const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
  
  // Сохраняем исходные значения при первом рендере
  if (!originalDefaults) {
    originalDefaults = JSON.parse(JSON.stringify({
      logoSelected: state.logoSelected || '',
      kvSelected: state.kvSelected || '',
      title: state.title || '',
      subtitle: state.subtitle || '',
      legal: state.legal || '',
      age: state.age || '18+',
      bgColor: state.bgColor || '#1e1e1e',
      bgImage: state.bgImage || null,
      titleColor: state.titleColor || '#ffffff',
      subtitleColor: state.subtitleColor || '#e0e0e0',
      subtitleOpacity: state.subtitleOpacity ?? 90,
      legalColor: state.legalColor || '#ffffff',
      legalOpacity: state.legalOpacity ?? 60,
      titleAlign: state.titleAlign || 'left',
      subtitleAlign: state.subtitleAlign || 'left',
      legalAlign: state.legalAlign || 'left',
      titleVPos: state.titleVPos || 'top',
      titleSize: state.titleSize ?? 8,
      subtitleSize: state.subtitleSize ?? 4,
      legalSize: state.legalSize ?? 2,
      ageSize: state.ageSize ?? 4,
      logoSize: state.logoSize ?? 40,
      titleWeight: state.titleWeight || 'Regular',
      subtitleWeight: state.subtitleWeight || 'Regular',
      legalWeight: state.legalWeight || 'Regular',
      ageWeight: state.ageWeight || 'Regular',
      titleLetterSpacing: state.titleLetterSpacing ?? 0,
      subtitleLetterSpacing: state.subtitleLetterSpacing ?? 0,
      legalLetterSpacing: state.legalLetterSpacing ?? 0,
      titleLineHeight: state.titleLineHeight ?? 1.1,
      subtitleLineHeight: state.subtitleLineHeight ?? 1.2,
      legalLineHeight: state.legalLineHeight ?? 1.4,
      subtitleGap: state.subtitleGap ?? -1,
      ageGapPercent: state.ageGapPercent ?? 1,
      logoPos: state.logoPos || 'left',
      logoLanguage: state.logoLanguage || 'ru',
      partnerLogoFile: state.partnerLogoFile || null,
      kvBorderRadius: state.kvBorderRadius ?? 0,
      kvPosition: state.kvPosition || 'center',
      bgSize: state.bgSize || 'cover',
      bgPosition: state.bgPosition || 'center',
      bgVPosition: state.bgVPosition || 'center',
      textGradientOpacity: state.textGradientOpacity ?? 100,
      paddingPercent: state.paddingPercent ?? 5,
      layoutMode: state.layoutMode || 'auto'
    }));
  }
  
  const hasLogo = !!(state.logoSelected && state.logoSelected !== originalDefaults.logoSelected);
  const hasKV = !!(state.kvSelected && state.kvSelected !== originalDefaults.kvSelected);
  
  return `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">Логотип по умолчанию</label>
        <div id="defaultLogoPreview" class="preview-container" style="width: 100%; height: 60px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; cursor: pointer; position: relative;">
          <img id="defaultLogoPreviewImg" src="${state.logoSelected || ''}" style="max-width: 100%; max-height: 100%; display: none;">
          <span id="defaultLogoPreviewPlaceholder" style="color: ${textPrimary}; opacity: 0.5;">— Нет —</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn" id="defaultLogoSelect" style="flex: 1;"><span class="material-icons" style="font-size: 18px; margin-right: 4px;">folder</span>Выбрать из библиотеки</button>
          <button class="btn" id="defaultLogoUpload" style="flex: 1;"><span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>Загрузить</button>
          <button class="btn btn-danger" id="defaultLogoClear" style="flex: 0 0 auto; display: ${hasLogo ? 'block' : 'none'};" title="Вернуть исходное значение"><span class="material-icons" style="font-size: 18px;">delete</span></button>
          <input type="file" id="defaultLogoUploadFile" accept="image/*,.svg" style="display: none;">
        </div>
      </div>
      
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">Партнерский логотип (КЗ) по умолчанию</label>
        <div id="defaultPartnerLogoPreview" class="preview-container" style="width: 100%; height: 60px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; cursor: pointer; position: relative;">
          <img id="defaultPartnerLogoPreviewImg" src="${state.partnerLogoFile || ''}" style="max-width: 100%; max-height: 100%; display: ${state.partnerLogoFile ? 'block' : 'none'};">
          <span id="defaultPartnerLogoPreviewPlaceholder" style="color: ${textPrimary}; opacity: 0.5; display: ${state.partnerLogoFile ? 'none' : 'block'};">— Нет —</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn" id="defaultPartnerLogoUpload" style="flex: 1;"><span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>Загрузить</button>
          <button class="btn btn-danger" id="defaultPartnerLogoClear" style="flex: 0 0 auto; display: ${state.partnerLogoFile ? 'block' : 'none'};" title="Удалить"><span class="material-icons" style="font-size: 18px;">delete</span></button>
          <input type="file" id="defaultPartnerLogoUploadFile" accept="image/*,.svg" style="display: none;">
        </div>
      </div>
      
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">KV по умолчанию</label>
        <div id="defaultKVPreview" class="preview-container" style="width: 100%; height: 60px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; cursor: pointer; position: relative;">
          <img id="defaultKVPreviewImg" src="${state.kvSelected || ''}" style="max-width: 100%; max-height: 100%; display: none;">
          <span id="defaultKVPreviewPlaceholder" style="color: ${textPrimary}; opacity: 0.5;">— Нет —</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn" id="defaultKVSelect" style="flex: 1;"><span class="material-icons" style="font-size: 18px; margin-right: 4px;">folder</span>Выбрать из библиотеки</button>
          <button class="btn" id="defaultKVUpload" style="flex: 1;"><span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>Загрузить</button>
          <button class="btn btn-danger" id="defaultKVClear" style="flex: 0 0 auto; display: ${hasKV ? 'block' : 'none'};" title="Вернуть исходное значение"><span class="material-icons" style="font-size: 18px;">delete</span></button>
          <input type="file" id="defaultKVUploadFile" accept="image/*" style="display: none;">
        </div>
      </div>
      
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">Заголовок по умолчанию</label>
        <textarea id="defaultTitle" style="width: 100%; min-height: 60px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px; resize: vertical;">${state.title || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">Подзаголовок по умолчанию</label>
        <textarea id="defaultSubtitle" style="width: 100%; min-height: 60px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px; resize: vertical;">${state.subtitle || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">Юридический текст по умолчанию</label>
        <textarea id="defaultLegal" style="width: 100%; min-height: 80px; padding: 12px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px; resize: vertical;">${state.legal || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">Возрастное ограничение по умолчанию</label>
        <input type="text" id="defaultAge" value="${state.age || '18+'}" style="width: 100%; padding: 12px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
      </div>
      
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">Фон по умолчанию</label>
        <div id="defaultBgPreview" class="preview-container" style="width: 100%; height: 60px; background: ${state.bgColor || '#1e1e1e'}; border: 1px solid ${borderColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; position: relative;">
          <img id="defaultBgPreviewImg" src="${state.bgImage || ''}" style="max-width: 100%; max-height: 100%; display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
          <span id="defaultBgPreviewPlaceholder" style="color: ${textPrimary}; opacity: 0.5; z-index: 1;">${state.bgImage ? 'Изображение' : 'Цвет: ' + (state.bgColor || '#1e1e1e')}</span>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input type="color" id="defaultBgColor" value="${state.bgColor || '#1e1e1e'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer;">
          <input type="text" id="defaultBgColorHex" value="${state.bgColor || '#1e1e1e'}" placeholder="#1e1e1e" style="flex: 1; padding: 12px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          <button class="btn btn-danger" id="defaultBgColorReset" style="flex: 0 0 auto; display: ${state.bgColor !== originalDefaults.bgColor ? 'block' : 'none'};" title="Вернуть исходный цвет"><span class="material-icons" style="font-size: 18px;">refresh</span></button>
        </div>
        <button class="btn" id="defaultBgUpload" style="width: 100%;"><span class="material-icons" style="font-size: 18px; margin-right: 4px;">upload</span>Загрузить изображение</button>
        <input type="file" id="defaultBgUploadFile" accept="image/*" style="display: none;">
        <button class="btn btn-danger" id="defaultBgClear" style="width: 100%; margin-top: 8px; display: ${state.bgImage ? 'block' : 'none'};"><span class="material-icons" style="font-size: 18px; margin-right: 4px;">delete</span>Удалить изображение</button>
      </div>
      
      <div class="form-group">
        <label style="font-weight: 600; margin-bottom: 8px;">Цвет заголовка по умолчанию</label>
        <div style="display: flex; gap: 8px;">
          <input type="color" id="defaultTextColor" value="${state.titleColor || '#ffffff'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 8px; cursor: pointer;">
          <input type="text" id="defaultTextColorHex" value="${state.titleColor || '#ffffff'}" placeholder="#ffffff" style="flex: 1; padding: 12px; border: 1px solid ${borderColor}; border-radius: 8px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          <button class="btn btn-danger" id="defaultTextColorReset" style="flex: 0 0 auto; display: ${state.titleColor !== originalDefaults.titleColor ? 'block' : 'none'};" title="Вернуть исходный цвет"><span class="material-icons" style="font-size: 18px;">refresh</span></button>
        </div>
      </div>
      
      <div style="border-top: 1px solid ${borderColor}; padding-top: 20px; margin-top: 10px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Настройки заголовка</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Размер (%)</label>
            <input type="number" id="defaultTitleSize" value="${state.titleSize ?? 8}" step="0.1" min="1" max="20" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Вес шрифта</label>
            <select id="defaultTitleWeight" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="Thin" ${state.titleWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${state.titleWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${state.titleWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${state.titleWeight === 'Regular' || !state.titleWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${state.titleWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${state.titleWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${state.titleWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${state.titleWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${state.titleWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Выравнивание</label>
            <select id="defaultTitleAlign" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="left" ${state.titleAlign === 'left' || !state.titleAlign ? 'selected' : ''}>Слева</option>
              <option value="center" ${state.titleAlign === 'center' ? 'selected' : ''}>По центру</option>
              <option value="right" ${state.titleAlign === 'right' ? 'selected' : ''}>Справа</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Вертикальная позиция</label>
            <select id="defaultTitleVPos" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="top" ${state.titleVPos === 'top' || !state.titleVPos ? 'selected' : ''}>Вверху</option>
              <option value="center" ${state.titleVPos === 'center' ? 'selected' : ''}>По центру</option>
              <option value="bottom" ${state.titleVPos === 'bottom' ? 'selected' : ''}>Внизу</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Межбуквенное расстояние</label>
            <input type="number" id="defaultTitleLetterSpacing" value="${state.titleLetterSpacing ?? 0}" step="0.1" min="-5" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Межстрочный интервал</label>
            <input type="number" id="defaultTitleLineHeight" value="${state.titleLineHeight ?? 1.1}" step="0.1" min="0.5" max="3" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid ${borderColor}; padding-top: 20px; margin-top: 10px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Настройки подзаголовка</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Цвет</label>
            <div style="display: flex; gap: 8px;">
              <input type="color" id="defaultSubtitleColor" value="${state.subtitleColor || '#e0e0e0'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 6px; cursor: pointer;">
              <input type="text" id="defaultSubtitleColorHex" value="${state.subtitleColor || '#e0e0e0'}" placeholder="#e0e0e0" style="flex: 1; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
            </div>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Прозрачность (%)</label>
            <input type="number" id="defaultSubtitleOpacity" value="${state.subtitleOpacity ?? 90}" step="1" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Размер (%)</label>
            <input type="number" id="defaultSubtitleSize" value="${state.subtitleSize ?? 4}" step="0.1" min="1" max="20" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Вес шрифта</label>
            <select id="defaultSubtitleWeight" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="Thin" ${state.subtitleWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${state.subtitleWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${state.subtitleWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${state.subtitleWeight === 'Regular' || !state.subtitleWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${state.subtitleWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${state.subtitleWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${state.subtitleWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${state.subtitleWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${state.subtitleWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Выравнивание</label>
            <select id="defaultSubtitleAlign" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="left" ${state.subtitleAlign === 'left' || !state.subtitleAlign ? 'selected' : ''}>Слева</option>
              <option value="center" ${state.subtitleAlign === 'center' ? 'selected' : ''}>По центру</option>
              <option value="right" ${state.subtitleAlign === 'right' ? 'selected' : ''}>Справа</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Отступ от заголовка</label>
            <input type="number" id="defaultSubtitleGap" value="${state.subtitleGap ?? -1}" step="0.1" min="-10" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Межбуквенное расстояние</label>
            <input type="number" id="defaultSubtitleLetterSpacing" value="${state.subtitleLetterSpacing ?? 0}" step="0.1" min="-5" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Межстрочный интервал</label>
            <input type="number" id="defaultSubtitleLineHeight" value="${state.subtitleLineHeight ?? 1.2}" step="0.1" min="0.5" max="3" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid ${borderColor}; padding-top: 20px; margin-top: 10px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Настройки юридического текста</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Цвет</label>
            <div style="display: flex; gap: 8px;">
              <input type="color" id="defaultLegalColor" value="${state.legalColor || '#ffffff'}" style="width: 60px; height: 40px; border: 1px solid ${borderColor}; border-radius: 6px; cursor: pointer;">
              <input type="text" id="defaultLegalColorHex" value="${state.legalColor || '#ffffff'}" placeholder="#ffffff" style="flex: 1; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
            </div>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Прозрачность (%)</label>
            <input type="number" id="defaultLegalOpacity" value="${state.legalOpacity ?? 60}" step="1" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Размер (%)</label>
            <input type="number" id="defaultLegalSize" value="${state.legalSize ?? 2}" step="0.1" min="1" max="20" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Вес шрифта</label>
            <select id="defaultLegalWeight" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="Thin" ${state.legalWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${state.legalWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${state.legalWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${state.legalWeight === 'Regular' || !state.legalWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${state.legalWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${state.legalWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${state.legalWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${state.legalWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${state.legalWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Выравнивание</label>
            <select id="defaultLegalAlign" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="left" ${state.legalAlign === 'left' || !state.legalAlign ? 'selected' : ''}>Слева</option>
              <option value="center" ${state.legalAlign === 'center' ? 'selected' : ''}>По центру</option>
              <option value="right" ${state.legalAlign === 'right' ? 'selected' : ''}>Справа</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Межбуквенное расстояние</label>
            <input type="number" id="defaultLegalLetterSpacing" value="${state.legalLetterSpacing ?? 0}" step="0.1" min="-5" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Межстрочный интервал</label>
            <input type="number" id="defaultLegalLineHeight" value="${state.legalLineHeight ?? 1.4}" step="0.1" min="0.5" max="3" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid ${borderColor}; padding-top: 20px; margin-top: 10px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Настройки возраста</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Размер (%)</label>
            <input type="number" id="defaultAgeSize" value="${state.ageSize ?? 4}" step="0.1" min="1" max="20" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Вес шрифта</label>
            <select id="defaultAgeWeight" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="Thin" ${state.ageWeight === 'Thin' ? 'selected' : ''}>Thin</option>
              <option value="ExtraLight" ${state.ageWeight === 'ExtraLight' ? 'selected' : ''}>ExtraLight</option>
              <option value="Light" ${state.ageWeight === 'Light' ? 'selected' : ''}>Light</option>
              <option value="Regular" ${state.ageWeight === 'Regular' || !state.ageWeight ? 'selected' : ''}>Regular</option>
              <option value="Medium" ${state.ageWeight === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="SemiBold" ${state.ageWeight === 'SemiBold' ? 'selected' : ''}>SemiBold</option>
              <option value="Bold" ${state.ageWeight === 'Bold' ? 'selected' : ''}>Bold</option>
              <option value="Heavy" ${state.ageWeight === 'Heavy' ? 'selected' : ''}>Heavy</option>
              <option value="Black" ${state.ageWeight === 'Black' ? 'selected' : ''}>Black</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Отступ от текста (%)</label>
            <input type="number" id="defaultAgeGapPercent" value="${state.ageGapPercent ?? 1}" step="0.1" min="0" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid ${borderColor}; padding-top: 20px; margin-top: 10px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Настройки логотипа</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Размер (%)</label>
            <input type="number" id="defaultLogoSize" value="${state.logoSize ?? 40}" step="1" min="10" max="100" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Позиция</label>
            <select id="defaultLogoPos" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="left" ${state.logoPos === 'left' || !state.logoPos ? 'selected' : ''}>Слева</option>
              <option value="center" ${state.logoPos === 'center' ? 'selected' : ''}>По центру</option>
              <option value="right" ${state.logoPos === 'right' ? 'selected' : ''}>Справа</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Язык</label>
            <select id="defaultLogoLanguage" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="ru" ${state.logoLanguage === 'ru' || !state.logoLanguage ? 'selected' : ''}>Русский</option>
              <option value="kz" ${state.logoLanguage === 'kz' ? 'selected' : ''}>Казахский</option>
            </select>
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid ${borderColor}; padding-top: 20px; margin-top: 10px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Настройки KV</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Скругление углов (px)</label>
            <input type="number" id="defaultKvBorderRadius" value="${state.kvBorderRadius ?? 0}" step="1" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Позиция</label>
            <select id="defaultKvPosition" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="left" ${state.kvPosition === 'left' ? 'selected' : ''}>Слева</option>
              <option value="center" ${state.kvPosition === 'center' || !state.kvPosition ? 'selected' : ''}>По центру</option>
              <option value="right" ${state.kvPosition === 'right' ? 'selected' : ''}>Справа</option>
            </select>
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid ${borderColor}; padding-top: 20px; margin-top: 10px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Дополнительные настройки</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Отступы (%)</label>
            <input type="number" id="defaultPaddingPercent" value="${state.paddingPercent ?? 5}" step="0.1" min="0" max="20" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Режим макета</label>
            <select id="defaultLayoutMode" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="auto" ${state.layoutMode === 'auto' || !state.layoutMode ? 'selected' : ''}>Автоматически</option>
              <option value="horizontal" ${state.layoutMode === 'horizontal' ? 'selected' : ''}>Горизонтальный</option>
              <option value="vertical" ${state.layoutMode === 'vertical' ? 'selected' : ''}>Вертикальный</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Размер фона</label>
            <select id="defaultBgSize" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="cover" ${state.bgSize === 'cover' || !state.bgSize ? 'selected' : ''}>Cover</option>
              <option value="contain" ${state.bgSize === 'contain' ? 'selected' : ''}>Contain</option>
              <option value="auto" ${state.bgSize === 'auto' ? 'selected' : ''}>Auto</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Позиция фона (горизонтально)</label>
            <select id="defaultBgPosition" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="left" ${state.bgPosition === 'left' ? 'selected' : ''}>Слева</option>
              <option value="center" ${state.bgPosition === 'center' || !state.bgPosition ? 'selected' : ''}>По центру</option>
              <option value="right" ${state.bgPosition === 'right' ? 'selected' : ''}>Справа</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Позиция фона (вертикально)</label>
            <select id="defaultBgVPosition" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
              <option value="top" ${state.bgVPosition === 'top' ? 'selected' : ''}>Вверху</option>
              <option value="center" ${state.bgVPosition === 'center' || !state.bgVPosition ? 'selected' : ''}>По центру</option>
              <option value="bottom" ${state.bgVPosition === 'bottom' ? 'selected' : ''}>Внизу</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Прозрачность градиента под текстом (%)</label>
            <input type="number" id="defaultTextGradientOpacity" value="${state.textGradientOpacity ?? 100}" step="1" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Рендерит вкладку с настройками множителей форматов
 */
const renderMultipliersTab = () => {
  const state = getState();
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a';
  const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d';
  const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
  
  // Получаем множители из state или используем дефолтные
  const multipliers = state.formatMultipliers || {
    vertical: { logo: 2, title: 1, subtitle: 1, legal: 1, age: 1 },
    ultraWide: { logo: 0.75, titleSmall: 3, titleMedium: 2.2, titleLarge: 2, subtitleSmall: 3, subtitleMedium: 2.2, subtitleLarge: 2, legalNormal: 2.5, legalMedium: 2, age: 2 },
    veryWide: { logo: 0.75, titleMedium: 2.2, titleLarge: 2, titleExtraLarge: 2, subtitleMedium: 2.2, subtitleLarge: 2, subtitleExtraLarge: 2, legalNormal: 2.5, legalMedium: 2, legalExtraLarge: 2.5, age: 2 },
    horizontal: { logo: 0.75, titleSmall: 1.8, titleLarge: 1.6, titleWideSmall: 1.2, titleWideMedium: 1.4, subtitleSmall: 1.8, subtitleLarge: 1.6, subtitleWideSmall: 1.2, subtitleWideMedium: 1.4, legalSmall: 1.8, legalLarge: 2, legalWide450: 1.2, legalWide500: 1.1, legalWideOther: 1.15, age: 2, ageWide: null },
    square: { title: 0.9, subtitle: 0.9 },
    tall: { title: 1.3, subtitle: 1.3 }
  };
  
  return `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div style="padding: 16px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Вертикальные форматы (height >= width × 1.5)</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Логотип</label>
            <input type="number" id="multiplier-vertical-logo" value="${multipliers.vertical.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок</label>
            <input type="number" id="multiplier-vertical-title" value="${multipliers.vertical.title}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок</label>
            <input type="number" id="multiplier-vertical-subtitle" value="${multipliers.vertical.subtitle ?? 1}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический текст</label>
            <input type="number" id="multiplier-vertical-legal" value="${multipliers.vertical.legal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Возраст</label>
            <input type="number" id="multiplier-vertical-age" value="${multipliers.vertical.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Ультра-широкие форматы (width >= height × 8)</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Логотип</label>
            <input type="number" id="multiplier-ultraWide-logo" value="${multipliers.ultraWide.logo}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height < 120)</label>
            <input type="number" id="multiplier-ultraWide-titleSmall" value="${multipliers.ultraWide.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height < 120)</label>
            <input type="number" id="multiplier-ultraWide-subtitleSmall" value="${multipliers.ultraWide.subtitleSmall ?? multipliers.ultraWide.titleSmall}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height < 200)</label>
            <input type="number" id="multiplier-ultraWide-titleMedium" value="${multipliers.ultraWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height < 200)</label>
            <input type="number" id="multiplier-ultraWide-subtitleMedium" value="${multipliers.ultraWide.subtitleMedium ?? multipliers.ultraWide.titleMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Заголовок (height >= 200)</label>
            <input type="number" id="multiplier-ultraWide-titleLarge" value="${multipliers.ultraWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Подзаголовок (height >= 200)</label>
            <input type="number" id="multiplier-ultraWide-subtitleLarge" value="${multipliers.ultraWide.subtitleLarge ?? multipliers.ultraWide.titleLarge}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (обычный)</label>
            <input type="number" id="multiplier-ultraWide-legalNormal" value="${multipliers.ultraWide.legalNormal}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Юридический (height 250-350)</label>
            <input type="number" id="multiplier-ultraWide-legalMedium" value="${multipliers.ultraWide.legalMedium}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
          <div class="form-group">
            <label style="font-weight: 500; margin-bottom: 4px; font-size: 13px;">Возраст</label>
            <input type="number" id="multiplier-ultraWide-age" value="${multipliers.ultraWide.age}" step="0.1" min="0.1" max="10" style="width: 100%; padding: 8px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgPrimary}; color: ${textPrimary}; font-family: inherit; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Очень широкие форматы (width >= height × 4)</h3>
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
      
      <div style="padding: 16px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Горизонтальные форматы (width >= height × 1.5)</h3>
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
      
      <div style="padding: 16px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Дополнительные настройки</h3>
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
    </div>
  `;
};

/**
 * Создает и показывает модальное окно админки размеров
 */
export const showSizesAdmin = () => {
  console.log('showSizesAdmin вызвана');
  if (isAdminOpen) {
    console.log('Админка уже открыта');
    return;
  }
  
  isAdminOpen = true;
  const sizes = getPresetSizes();
  console.log('Размеры загружены:', sizes);
  
  // Создаем модальное окно
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
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  `;
  
  // Получаем цвета из CSS переменных
  const root = getComputedStyle(document.documentElement);
  const bgSecondary = root.getPropertyValue('--bg-secondary') || '#141414';
  const borderColor = root.getPropertyValue('--border-color') || '#2a2a2a';
  
  adminModal.innerHTML = `
    <div class="sizes-admin-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px); z-index: 1;"></div>
    <div class="sizes-admin-content" style="position: relative; background: ${bgSecondary}; border: 1px solid ${borderColor}; border-radius: 12px; width: 90%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); z-index: 2; overflow: hidden;">
      <div class="sizes-admin-header">
        <h2>Настройки</h2>
        <button class="sizes-admin-close" id="sizesAdminClose">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="sizes-admin-body" style="overflow-y: auto; flex: 1; padding: 20px;">
        <div class="sizes-admin-tabs" style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid ${borderColor};">
          <button class="sizes-admin-tab active" data-tab="sizes">Размеры</button>
          <button class="sizes-admin-tab" data-tab="defaults">Значения по умолчанию</button>
          <button class="sizes-admin-tab" data-tab="multipliers">Множители форматов</button>
        </div>
        
        <div class="sizes-admin-tab-content" id="sizesAdminTabSizes">
          <div class="sizes-admin-toolbar" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
            <button class="btn btn-primary" id="sizesAdminAddPlatform">
              <span class="material-icons">add</span> Добавить платформу
            </button>
            <button class="btn" id="sizesAdminExport">
              <span class="material-icons">download</span> Экспорт JSON
            </button>
            <button class="btn" id="sizesAdminImport">
              <span class="material-icons">upload</span> Импорт JSON
            </button>
            <input type="file" id="sizesAdminImportFile" accept=".json" style="display: none;">
            <button class="btn btn-danger" id="sizesAdminReset">
              <span class="material-icons">refresh</span> Сбросить к дефолту
            </button>
          </div>
          <div class="sizes-admin-platforms" id="sizesAdminPlatforms"></div>
        </div>
        
        <div class="sizes-admin-tab-content" id="sizesAdminTabDefaults" style="display: none;">
          ${renderDefaultsTab()}
        </div>
        
        <div class="sizes-admin-tab-content" id="sizesAdminTabMultipliers" style="display: none;">
          ${renderMultipliersTab()}
        </div>
      </div>
      <div class="sizes-admin-footer" style="padding: 16px; border-top: 1px solid ${borderColor}; display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn btn-primary" id="sizesAdminSave">Сохранить</button>
        <button class="btn" id="sizesAdminCancel">Отмена</button>
      </div>
    </div>
  `;
  
  try {
    document.body.appendChild(adminModal);
    console.log('Модальное окно добавлено в DOM');
    console.log('Модальное окно видимо:', adminModal.offsetParent !== null);
    console.log('Z-index модального окна:', window.getComputedStyle(adminModal).zIndex);
    
    // Рендерим платформы
    renderAdminPlatforms(sizes);
    console.log('Платформы отрендерены');
    
    // Сбрасываем исходные значения при открытии
    originalDefaults = null;
    
    // Обновляем превью для значений по умолчанию
    updateDefaultsPreview();
    
    // Обработчики событий
    setupAdminHandlers(sizes);
    setupDefaultsHandlers();
    setupMultipliersHandlers();
    setupTabHandlers();
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
  if (!isAdminOpen || !adminModal) return;
  
  if (adminModal._escapeHandler) {
    document.removeEventListener('keydown', adminModal._escapeHandler);
  }
  
  document.body.removeChild(adminModal);
  adminModal = null;
  isAdminOpen = false;
};

/**
 * Рендерит список платформ в админке
 */
const renderAdminPlatforms = (sizes) => {
  const container = document.getElementById('sizesAdminPlatforms');
  if (!container) return;
  
  let html = '';
  
  Object.keys(sizes).forEach((platform) => {
    html += `
      <div class="sizes-admin-platform" data-platform="${platform}">
        <div class="sizes-admin-platform-header">
          <input type="text" class="sizes-admin-platform-name" value="${platform}" data-original="${platform}">
          <button class="btn-small btn-danger" data-action="remove-platform" data-platform="${platform}">
            <span class="material-icons">delete</span>
          </button>
        </div>
        <div class="sizes-admin-sizes-list">
          ${sizes[platform].map((size, index) => `
            <div class="sizes-admin-size-item">
              <input type="number" class="sizes-admin-size-width" value="${size.width}" min="1" placeholder="Ширина">
              <span>×</span>
              <input type="number" class="sizes-admin-size-height" value="${size.height}" min="1" placeholder="Высота">
              <label>
                <input type="checkbox" ${size.checked ? 'checked' : ''} class="sizes-admin-size-checked">
                Выбрано
              </label>
              <button class="btn-small btn-danger" data-action="remove-size" data-platform="${platform}" data-index="${index}">
                <span class="material-icons">close</span>
              </button>
            </div>
          `).join('')}
        </div>
        <button class="btn-small" data-action="add-size" data-platform="${platform}">
          <span class="material-icons">add</span> Добавить размер
        </button>
      </div>
    `;
  });
  
  container.innerHTML = html;
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
  
  // Обновление размеров при изменении полей
  document.getElementById('sizesAdminPlatforms').addEventListener('input', (e) => {
    const sizeItem = e.target.closest('.sizes-admin-size-item');
    if (!sizeItem) return;
    
    const platform = sizeItem.closest('.sizes-admin-platform').dataset.platform;
    const index = Array.from(sizeItem.parentElement.children).indexOf(sizeItem);
    
    if (currentSizes[platform] && currentSizes[platform][index]) {
      const widthInput = sizeItem.querySelector('.sizes-admin-size-width');
      const heightInput = sizeItem.querySelector('.sizes-admin-size-height');
      const checkedInput = sizeItem.querySelector('.sizes-admin-size-checked');
      
      if (widthInput) {
        const width = parseInt(widthInput.value, 10);
        if (!isNaN(width) && width > 0) {
          currentSizes[platform][index].width = width;
        }
      }
      if (heightInput) {
        const height = parseInt(heightInput.value, 10);
        if (!isNaN(height) && height > 0) {
          currentSizes[platform][index].height = height;
        }
      }
      if (checkedInput) {
        currentSizes[platform][index].checked = checkedInput.checked;
      }
    }
  });
  
  // Сохранение
  document.getElementById('sizesAdminSave').addEventListener('click', () => {
    // Валидация
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
    
    saveSizesConfig(currentSizes);
    updatePresetSizesFromConfig();
    renderPresetSizes();
    updatePreviewSizeSelect();
    updateSizesSummary();
    renderer.render();
    closeSizesAdmin();
    alert('Размеры успешно сохранены!');
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
};

/**
 * Обновляет превью для значений по умолчанию
 */
const updateDefaultsPreview = () => {
  const state = getState();
  
  // Логотип
  const logoImg = document.getElementById('defaultLogoPreviewImg');
  const logoPlaceholder = document.getElementById('defaultLogoPreviewPlaceholder');
  const logoClearBtn = document.getElementById('defaultLogoClear');
  if (logoImg && logoPlaceholder) {
    if (state.logoSelected) {
      logoImg.src = state.logoSelected;
      logoImg.style.display = 'block';
      logoPlaceholder.style.display = 'none';
    } else {
      logoImg.style.display = 'none';
      logoPlaceholder.style.display = 'block';
    }
    // Показываем кнопку удаления, если значение изменилось
    if (logoClearBtn && originalDefaults) {
      logoClearBtn.style.display = (state.logoSelected && state.logoSelected !== originalDefaults.logoSelected) ? 'block' : 'none';
    }
  }
  
  // Партнерский логотип
  const partnerLogoImg = document.getElementById('defaultPartnerLogoPreviewImg');
  const partnerLogoPlaceholder = document.getElementById('defaultPartnerLogoPreviewPlaceholder');
  const partnerLogoClearBtn = document.getElementById('defaultPartnerLogoClear');
  if (partnerLogoImg && partnerLogoPlaceholder) {
    if (state.partnerLogoFile) {
      partnerLogoImg.src = state.partnerLogoFile;
      partnerLogoImg.style.display = 'block';
      partnerLogoPlaceholder.style.display = 'none';
    } else {
      partnerLogoImg.style.display = 'none';
      partnerLogoPlaceholder.style.display = 'block';
    }
    // Показываем кнопку удаления, если есть файл
    if (partnerLogoClearBtn) {
      partnerLogoClearBtn.style.display = state.partnerLogoFile ? 'block' : 'none';
    }
  }
  
  // KV
  const kvImg = document.getElementById('defaultKVPreviewImg');
  const kvPlaceholder = document.getElementById('defaultKVPreviewPlaceholder');
  const kvClearBtn = document.getElementById('defaultKVClear');
  if (kvImg && kvPlaceholder) {
    if (state.kvSelected) {
      kvImg.src = state.kvSelected;
      kvImg.style.display = 'block';
      kvPlaceholder.style.display = 'none';
    } else {
      kvImg.style.display = 'none';
      kvPlaceholder.style.display = 'block';
    }
    // Показываем кнопку удаления, если значение изменилось
    if (kvClearBtn && originalDefaults) {
      kvClearBtn.style.display = (state.kvSelected && state.kvSelected !== originalDefaults.kvSelected) ? 'block' : 'none';
    }
  }
  
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
  // Выбор логотипа из библиотеки
  const defaultLogoSelect = document.getElementById('defaultLogoSelect');
  if (defaultLogoSelect) {
    defaultLogoSelect.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      // Сохраняем оригинальный обработчик
      const originalSelectHandler = window.selectPreloadedLogo;
      let handlerRestored = false;
      
      // Временно переопределяем обработчик выбора
      window.selectPreloadedLogo = async (logoFile) => {
        if (!handlerRestored) {
          handlerRestored = true;
          // Используем импортированную функцию напрямую
          await selectPreloadedLogo(logoFile);
          updateDefaultsPreview();
          // Показываем кнопку удаления
          const clearBtn = document.getElementById('defaultLogoClear');
          if (clearBtn && originalDefaults) {
            const state = getState();
            clearBtn.style.display = (state.logoSelected && state.logoSelected !== originalDefaults.logoSelected) ? 'block' : 'none';
          }
          // Восстанавливаем оригинальный обработчик
          window.selectPreloadedLogo = originalSelectHandler;
        }
      };
      
      // Используем импортированную функцию напрямую
      try {
        console.log('Попытка открыть модальное окно выбора логотипа');
        if (openLogoSelectModal) {
          console.log('Используем импортированную функцию openLogoSelectModal');
          await openLogoSelectModal();
        } else if (typeof window.openLogoSelectModal === 'function') {
          console.log('Используем глобальную функцию window.openLogoSelectModal');
          await window.openLogoSelectModal();
        } else {
          console.error('openLogoSelectModal не найдена');
          window.selectPreloadedLogo = originalSelectHandler;
          return;
        }
        console.log('Модальное окно должно быть открыто');
        
        // Увеличиваем z-index модального окна выбора логотипа, чтобы оно было поверх попапа настроек
        // Используем requestAnimationFrame для гарантии, что модальное окно уже отрендерено
        requestAnimationFrame(() => {
          const logoModal = document.getElementById('logoSelectModalOverlay');
          if (logoModal) {
            logoModal.style.zIndex = '100000';
            const logoPanel = document.getElementById('logoSelectPanel');
            if (logoPanel) {
              logoPanel.style.zIndex = '100001';
            }
          }
        });
        
        // Отслеживаем закрытие модального окна через MutationObserver
        const logoModal = document.getElementById('logoSelectModalOverlay');
        if (logoModal) {
          const observer = new MutationObserver(() => {
            const isVisible = logoModal.style.display !== 'none' && 
                            getComputedStyle(logoModal).display !== 'none';
            if (!isVisible && !handlerRestored) {
              observer.disconnect();
              window.selectPreloadedLogo = originalSelectHandler;
              handlerRestored = true;
            }
          });
          
          observer.observe(logoModal, {
            attributes: true,
            attributeFilter: ['style']
          });
          
          // Также слушаем клики на overlay для закрытия
          const closeHandler = (e) => {
            if (e.target === logoModal && !handlerRestored) {
              observer.disconnect();
              logoModal.removeEventListener('click', closeHandler);
              window.selectPreloadedLogo = originalSelectHandler;
              handlerRestored = true;
            }
          };
          logoModal.addEventListener('click', closeHandler);
          
          // Очищаем через 30 секунд на случай, если что-то пошло не так
          setTimeout(() => {
            observer.disconnect();
            if (logoModal) {
              logoModal.removeEventListener('click', closeHandler);
            }
            if (!handlerRestored) {
              window.selectPreloadedLogo = originalSelectHandler;
              handlerRestored = true;
            }
          }, 30000);
        }
      } catch (error) {
        console.error('Ошибка при открытии модального окна выбора логотипа:', error);
        window.selectPreloadedLogo = originalSelectHandler;
      }
    });
  }
  
  // Удаление логотипа (возврат к исходному)
  const defaultLogoClear = document.getElementById('defaultLogoClear');
  if (defaultLogoClear) {
    defaultLogoClear.addEventListener('click', () => {
      if (originalDefaults) {
        setKey('logoSelected', originalDefaults.logoSelected);
        setKey('logo', null);
        updateDefaultsPreview();
        defaultLogoClear.style.display = 'none';
      }
    });
  }
  
  // Загрузка логотипа
  const defaultLogoUpload = document.getElementById('defaultLogoUpload');
  const defaultLogoUploadFile = document.getElementById('defaultLogoUploadFile');
  if (defaultLogoUpload && defaultLogoUploadFile) {
    defaultLogoUpload.addEventListener('click', () => {
      defaultLogoUploadFile.click();
    });
    defaultLogoUploadFile.addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        const event = { target: e.target };
        await handleLogoUpload(event);
        updateDefaultsPreview();
      }
    });
  }
  
  // Загрузка партнерского логотипа
  const defaultPartnerLogoUpload = document.getElementById('defaultPartnerLogoUpload');
  const defaultPartnerLogoUploadFile = document.getElementById('defaultPartnerLogoUploadFile');
  if (defaultPartnerLogoUpload && defaultPartnerLogoUploadFile) {
    defaultPartnerLogoUpload.addEventListener('click', () => {
      defaultPartnerLogoUploadFile.click();
    });
    defaultPartnerLogoUploadFile.addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        const event = { target: e.target };
        await handlePartnerLogoUpload(event);
        updateDefaultsPreview();
      }
    });
  }
  
  // Удаление партнерского логотипа
  const defaultPartnerLogoClear = document.getElementById('defaultPartnerLogoClear');
  if (defaultPartnerLogoClear) {
    defaultPartnerLogoClear.addEventListener('click', () => {
      setKey('partnerLogo', null);
      setKey('partnerLogoFile', null);
      updateDefaultsPreview();
      renderer.render();
    });
  }
  
  // Выбор KV из библиотеки
  const defaultKVSelect = document.getElementById('defaultKVSelect');
  if (defaultKVSelect) {
    defaultKVSelect.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      // Сохраняем оригинальный обработчик
      const originalSelectHandler = window.selectPreloadedKV;
      let handlerRestored = false;
      
      // Временно переопределяем обработчик выбора
      window.selectPreloadedKV = async (kvFile) => {
        if (!handlerRestored) {
          handlerRestored = true;
          // Используем импортированную функцию напрямую
          await selectPreloadedKV(kvFile);
          updateDefaultsPreview();
          // Показываем кнопку удаления
          const clearBtn = document.getElementById('defaultKVClear');
          if (clearBtn && originalDefaults) {
            const state = getState();
            clearBtn.style.display = (state.kvSelected && state.kvSelected !== originalDefaults.kvSelected) ? 'block' : 'none';
          }
          // Восстанавливаем оригинальный обработчик
          window.selectPreloadedKV = originalSelectHandler;
        }
      };
      
      // Используем импортированную функцию напрямую
      try {
        console.log('Попытка открыть модальное окно выбора KV');
        if (openKVSelectModal) {
          console.log('Используем импортированную функцию openKVSelectModal');
          await openKVSelectModal();
        } else if (typeof window.openKVSelectModal === 'function') {
          console.log('Используем глобальную функцию window.openKVSelectModal');
          await window.openKVSelectModal();
        } else {
          console.error('openKVSelectModal не найдена');
          window.selectPreloadedKV = originalSelectHandler;
          return;
        }
        console.log('Модальное окно должно быть открыто');
        
        // Увеличиваем z-index модального окна выбора KV, чтобы оно было поверх попапа настроек
        // Используем requestAnimationFrame для гарантии, что модальное окно уже отрендерено
        requestAnimationFrame(() => {
          const kvModal = document.getElementById('kvSelectModalOverlay');
          if (kvModal) {
            kvModal.style.zIndex = '100000';
            const kvPanel = document.getElementById('kvSelectPanel');
            if (kvPanel) {
              kvPanel.style.zIndex = '100001';
            }
          }
        });
        
        // Отслеживаем закрытие модального окна через MutationObserver
        const kvModal = document.getElementById('kvSelectModalOverlay');
        if (kvModal) {
          const observer = new MutationObserver(() => {
            const isVisible = kvModal.style.display !== 'none' && 
                            getComputedStyle(kvModal).display !== 'none';
            if (!isVisible && !handlerRestored) {
              observer.disconnect();
              window.selectPreloadedKV = originalSelectHandler;
              handlerRestored = true;
            }
          });
          
          observer.observe(kvModal, {
            attributes: true,
            attributeFilter: ['style']
          });
          
          // Также слушаем клики на overlay для закрытия
          const closeHandler = (e) => {
            if (e.target === kvModal && !handlerRestored) {
              observer.disconnect();
              kvModal.removeEventListener('click', closeHandler);
              window.selectPreloadedKV = originalSelectHandler;
              handlerRestored = true;
            }
          };
          kvModal.addEventListener('click', closeHandler);
          
          // Очищаем через 30 секунд на случай, если что-то пошло не так
          setTimeout(() => {
            observer.disconnect();
            if (kvModal) {
              kvModal.removeEventListener('click', closeHandler);
            }
            if (!handlerRestored) {
              window.selectPreloadedKV = originalSelectHandler;
              handlerRestored = true;
            }
          }, 30000);
        }
      } catch (error) {
        console.error('Ошибка при открытии модального окна выбора KV:', error);
        window.selectPreloadedKV = originalSelectHandler;
      }
    });
  }
  
  // Удаление KV (возврат к исходному)
  const defaultKVClear = document.getElementById('defaultKVClear');
  if (defaultKVClear) {
    defaultKVClear.addEventListener('click', () => {
      if (originalDefaults) {
        setKey('kvSelected', originalDefaults.kvSelected);
        setKey('kv', null);
        updateDefaultsPreview();
        defaultKVClear.style.display = 'none';
      }
    });
  }
  
  // Загрузка KV
  const defaultKVUpload = document.getElementById('defaultKVUpload');
  const defaultKVUploadFile = document.getElementById('defaultKVUploadFile');
  if (defaultKVUpload && defaultKVUploadFile) {
    defaultKVUpload.addEventListener('click', () => {
      defaultKVUploadFile.click();
    });
    defaultKVUploadFile.addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        const event = { target: e.target };
        await handleKVUpload(event);
        updateDefaultsPreview();
        // Показываем кнопку удаления
        const clearBtn = document.getElementById('defaultKVClear');
        if (clearBtn) clearBtn.style.display = 'block';
      }
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
    });
  }
  
  const defaultSubtitle = document.getElementById('defaultSubtitle');
  if (defaultSubtitle) {
    defaultSubtitle.addEventListener('input', (e) => {
      setKey('subtitle', e.target.value);
    });
  }
  
  const defaultLegal = document.getElementById('defaultLegal');
  if (defaultLegal) {
    defaultLegal.addEventListener('input', (e) => {
      setKey('legal', e.target.value);
    });
  }
  
  const defaultAge = document.getElementById('defaultAge');
  if (defaultAge) {
    defaultAge.addEventListener('input', (e) => {
      setKey('age', e.target.value);
    });
  }
  
  // Настройки заголовка
  const defaultTitleSize = document.getElementById('defaultTitleSize');
  if (defaultTitleSize) {
    defaultTitleSize.addEventListener('input', (e) => {
      setKey('titleSize', parseFloat(e.target.value) || 8);
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
  
  // Настройки логотипа
  const defaultLogoSize = document.getElementById('defaultLogoSize');
  if (defaultLogoSize) {
    defaultLogoSize.addEventListener('input', (e) => {
      setKey('logoSize', parseInt(e.target.value) || 40);
      renderer.render();
    });
  }
  
  const defaultLogoPos = document.getElementById('defaultLogoPos');
  if (defaultLogoPos) {
    defaultLogoPos.addEventListener('change', (e) => {
      setKey('logoPos', e.target.value);
      renderer.render();
    });
  }
  
  const defaultLogoLanguage = document.getElementById('defaultLogoLanguage');
  if (defaultLogoLanguage) {
    defaultLogoLanguage.addEventListener('change', (e) => {
      setKey('logoLanguage', e.target.value);
      renderer.render();
    });
  }
  
  // Настройки KV
  const defaultKvBorderRadius = document.getElementById('defaultKvBorderRadius');
  if (defaultKvBorderRadius) {
    defaultKvBorderRadius.addEventListener('input', (e) => {
      setKey('kvBorderRadius', parseInt(e.target.value) || 0);
      renderer.render();
    });
  }
  
  const defaultKvPosition = document.getElementById('defaultKvPosition');
  if (defaultKvPosition) {
    defaultKvPosition.addEventListener('change', (e) => {
      setKey('kvPosition', e.target.value);
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
    defaultBgSize.addEventListener('change', (e) => {
      setKey('bgSize', e.target.value);
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
};

/**
 * Настраивает обработчики для вкладки с множителями форматов
 */
const setupMultipliersHandlers = () => {
  const state = getState();
  const multipliers = state.formatMultipliers || {
    vertical: { logo: 2, title: 1, subtitle: 1, legal: 1, age: 1 },
    ultraWide: { logo: 0.75, titleSmall: 3, titleMedium: 2.2, titleLarge: 2, subtitleSmall: 3, subtitleMedium: 2.2, subtitleLarge: 2, legalNormal: 2.5, legalMedium: 2, age: 2 },
    veryWide: { logo: 0.75, titleMedium: 2.2, titleLarge: 2, titleExtraLarge: 2, subtitleMedium: 2.2, subtitleLarge: 2, subtitleExtraLarge: 2, legalNormal: 2.5, legalMedium: 2, legalExtraLarge: 2.5, age: 2 },
    horizontal: { logo: 0.75, titleSmall: 1.8, titleLarge: 1.6, titleWideSmall: 1.2, titleWideMedium: 1.4, subtitleSmall: 1.8, subtitleLarge: 1.6, subtitleWideSmall: 1.2, subtitleWideMedium: 1.4, legalSmall: 1.8, legalLarge: 2, legalWide450: 1.2, legalWide500: 1.1, legalWideOther: 1.15, age: 2, ageWide: null },
    square: { title: 0.9, subtitle: 0.9 },
    tall: { title: 1.3, subtitle: 1.3 }
  };
  
  // Функция для обновления множителя
  const updateMultiplier = (formatType, key, value) => {
    if (!multipliers[formatType]) {
      multipliers[formatType] = {};
    }
    multipliers[formatType][key] = parseFloat(value) || 0;
    setKey('formatMultipliers', JSON.parse(JSON.stringify(multipliers)));
    // Автоматически перерисовываем превью
    renderer.render();
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
 * Настраивает обработчики для переключения вкладок
 */
const setupTabHandlers = () => {
  const tabs = adminModal.querySelectorAll('.sizes-admin-tab');
  const tabContents = adminModal.querySelectorAll('.sizes-admin-tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Убираем active у всех вкладок
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.style.display = 'none');
      
      // Активируем выбранную вкладку
      tab.classList.add('active');
      const targetContent = adminModal.querySelector(`#sizesAdminTab${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
      if (targetContent) {
        targetContent.style.display = 'block';
      }
    });
  });
};

// Делаем функцию доступной глобально
if (typeof window !== 'undefined') {
  window.showSizesAdmin = showSizesAdmin;
}

