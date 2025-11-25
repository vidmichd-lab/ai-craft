/**
 * Компонент админки для управления логотипом и assets
 * Позволяет управлять файлами в папках logo и assets, а также настройками по умолчанию
 */

import { renderFileManager, initFileManager } from './fileManager.js';
import { getState, setKey, getDefaultValues } from '../../state/store.js';
import { openLogoSelectModal, closeLogoSelectModal, selectPreloadedLogo } from './logoSelector.js';
import { openKVSelectModal, closeKVSelectModal, selectPreloadedKV } from './kvSelector.js';
import { handleLogoUpload, handleKVUpload } from '../ui.js';
import { getPassword, checkPassword, setPassword, hasPassword } from '../../utils/passwordManager.js';
import { t } from '../../utils/i18n.js';

let adminModal = null;
let isAdminOpen = false;
let isAdminAuthenticated = false;

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
  const existingPrompt = document.getElementById('logoAssetsPasswordPrompt');
  if (existingPrompt) {
    existingPrompt.remove();
  }
  
  const passwordModal = document.createElement('div');
  passwordModal.id = 'logoAssetsPasswordPrompt';
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
        <h2 style="margin: 0; font-size: 20px; color: ${textPrimary};">${t('admin.logoAssets.password.title')}</h2>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.password.label')}</label>
        <input type="password" id="logoAssetsPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="${t('admin.logoAssets.password.placeholder')}" autofocus>
        <div id="logoAssetsPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">${t('admin.logoAssets.password.error')}</div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="logoAssetsPasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; cursor: pointer;">${t('admin.logoAssets.password.cancel')}</button>
        <button id="logoAssetsPasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">${t('admin.logoAssets.password.submit')}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(passwordModal);
  
  const passwordInput = passwordModal.querySelector('#logoAssetsPasswordInput');
  const errorDiv = passwordModal.querySelector('#logoAssetsPasswordError');
  const submitBtn = passwordModal.querySelector('#logoAssetsPasswordSubmit');
  const cancelBtn = passwordModal.querySelector('#logoAssetsPasswordCancel');
  
  const checkPasswordHandler = () => {
    const password = passwordInput.value;
    if (checkPassword(password)) {
      isAdminAuthenticated = true;
      passwordModal.remove();
      openLogoAssetsAdmin();
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
 * Обновляет превью для значений по умолчанию
 */
const updateDefaultsPreview = () => {
  const state = getState();
  const defaults = getDefaultValues();
  
  // Обновляем превью логотипа
  const logoPreviewImg = document.getElementById('logoAssetsDefaultLogoPreviewImg');
  const logoPreviewPlaceholder = document.getElementById('logoAssetsDefaultLogoPreviewPlaceholder');
  if (logoPreviewImg && logoPreviewPlaceholder) {
    if (state.logoSelected) {
      logoPreviewImg.src = state.logoSelected;
      logoPreviewImg.style.display = 'block';
      logoPreviewPlaceholder.style.display = 'none';
    } else {
      logoPreviewImg.style.display = 'none';
      logoPreviewPlaceholder.style.display = 'block';
    }
  }
  
  // Обновляем превью KV
  const kvPreviewImg = document.getElementById('logoAssetsDefaultKVPreviewImg');
  const kvPreviewPlaceholder = document.getElementById('logoAssetsDefaultKVPreviewPlaceholder');
  if (kvPreviewImg && kvPreviewPlaceholder) {
    if (state.kvSelected && state.kvSelected !== '') {
      kvPreviewImg.src = state.kvSelected;
      kvPreviewImg.style.display = 'block';
      kvPreviewPlaceholder.style.display = 'none';
    } else {
      kvPreviewImg.src = 'assets/3d/sign/01.webp';
      kvPreviewImg.style.display = 'block';
      kvPreviewPlaceholder.style.display = 'none';
    }
  }
};

/**
 * Внутренняя функция для открытия админки
 */
const openLogoAssetsAdmin = () => {
  if (isAdminOpen) {
    return;
  }
  
  isAdminOpen = true;
  
  const root = getComputedStyle(document.documentElement);
  const bgPrimary = root.getPropertyValue('--bg-primary') || '#0d0d0d';
  const bgSecondary = root.getPropertyValue('--bg-secondary') || '#141414';
  const borderColor = root.getPropertyValue('--border-color') || '#2a2a2a';
  const textPrimary = root.getPropertyValue('--text-primary') || '#e9e9e9';
  const textSecondary = root.getPropertyValue('--text-secondary') || '#999999';
  
  const state = getState();
  const defaults = getDefaultValues();
  
  const hasLogo = !!(state.logoSelected && state.logoSelected !== defaults.logoSelected);
  const hasKV = !!(state.kvSelected && state.kvSelected !== defaults.kvSelected);
  
  // Функция для преобразования hex в rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const colorLogo = '#AA96DA';
  const colorKV = '#FCBAD3';
  
  adminModal = document.createElement('div');
  adminModal.id = 'logoAssetsAdminModal';
  adminModal.className = 'logo-assets-admin-overlay';
  adminModal.style.cssText = `
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
    padding: 20px;
    box-sizing: border-box;
  `;
  
  adminModal.innerHTML = `
    <div class="logo-assets-admin-content" style="
      background: ${bgSecondary};
      border: 1px solid ${borderColor};
      border-radius: 12px;
      width: 100%;
      max-width: 1200px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    ">
      <div class="logo-assets-admin-header" style="
        padding: 20px;
        border-bottom: 1px solid ${borderColor};
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        background: ${bgSecondary};
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="material-icons" style="font-size: 28px; color: #2196F3;">image</span>
          <h2 style="margin: 0; font-size: 20px; color: ${textPrimary};">${t('admin.logoAssets.title')}</h2>
        </div>
        <button id="logoAssetsAdminClose" class="btn" style="
          padding: 8px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: ${textPrimary};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        " title="${t('admin.logoAssets.close')}">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="logo-assets-admin-body" style="
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      ">
        <!-- Файловый менеджер -->
        <div class="admin-section-box" style="
          padding: 20px;
          background: ${bgPrimary};
          border: 1px solid ${borderColor};
          border-radius: 8px;
        ">
          <div class="admin-section-header" style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${borderColor};
          ">
            <span class="material-icons" style="color: #FF9800; font-size: 24px;">folder</span>
            <h3 style="margin: 0; color: ${textPrimary}; font-size: 18px; font-weight: 600;">${t('admin.logoAssets.fileManager.title')}</h3>
          </div>
          <div id="logoAssetsFileManagerContent">
            ${renderFileManager()}
          </div>
        </div>
        
        <!-- Медиа-элементы по умолчанию -->
        <div class="admin-section-box" style="
          padding: 20px;
          background: ${bgPrimary};
          border: 1px solid ${borderColor};
          border-radius: 8px;
        ">
          <div class="admin-section-header" style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${borderColor};
          ">
            <span class="material-icons" style="color: #FF9800; font-size: 24px;">image</span>
            <h3 style="margin: 0; color: ${textPrimary}; font-size: 18px; font-weight: 600;">${t('admin.logoAssets.defaults.title')}</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div class="form-group">
              <label style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: ${textPrimary};">
                <span class="material-icons" style="font-size: 20px; color: ${textSecondary};">account_circle</span>
                ${t('admin.logoAssets.defaults.logo')}
              </label>
              <div id="logoAssetsDefaultLogoPreview" class="preview-container">
                <img id="logoAssetsDefaultLogoPreviewImg" src="${state.logoSelected || ''}" class="preview-img" style="display: none;">
                <span id="logoAssetsDefaultLogoPreviewPlaceholder" class="preview-placeholder">${t('common.none')}</span>
              </div>
              <div class="input-group" style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn btn-full" id="logoAssetsDefaultLogoUpload" style="flex: 1;">
                  <span class="material-icons">upload</span>${t('admin.logoAssets.defaults.upload')}
                </button>
                <button class="btn btn-danger" id="logoAssetsDefaultLogoClear" style="display: ${hasLogo ? 'block' : 'none'};" title="${t('admin.logoAssets.defaults.reset')}">
                  <span class="material-icons">delete</span>
                </button>
                <input type="file" id="logoAssetsDefaultLogoUploadFile" accept="image/*,.svg" style="display: none;">
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: ${textPrimary};">
                <span class="material-icons" style="font-size: 20px; color: ${textSecondary};">image</span>
                ${t('admin.logoAssets.defaults.kv')}
              </label>
              <div id="logoAssetsDefaultKVPreview" class="preview-container">
                <img id="logoAssetsDefaultKVPreviewImg" src="${(state.kvSelected && state.kvSelected !== '') ? state.kvSelected : 'assets/3d/sign/01.webp'}" class="preview-img" style="display: ${state.kvSelected ? 'block' : 'none'};">
                <span id="logoAssetsDefaultKVPreviewPlaceholder" class="preview-placeholder" style="display: ${state.kvSelected ? 'none' : 'block'};">${t('common.none')}</span>
              </div>
              <div class="input-group" style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn btn-full" id="logoAssetsDefaultKVUpload" style="flex: 1;">
                  <span class="material-icons">upload</span>${t('admin.logoAssets.defaults.upload')}
                </button>
                <button class="btn btn-danger" id="logoAssetsDefaultKVClear" style="display: ${hasKV ? 'block' : 'none'};" title="${t('admin.logoAssets.defaults.reset')}">
                  <span class="material-icons">delete</span>
                </button>
                <input type="file" id="logoAssetsDefaultKVUploadFile" accept="image/*" style="display: none;">
              </div>
            </div>
          </div>
        </div>
        
        <!-- Настройки логотипа -->
        <div class="admin-color-group" style="
          border-left: 4px solid ${colorLogo};
          background: ${hexToRgba(colorLogo, 0.08)};
          padding: 20px;
          border-radius: 8px;
        ">
          <div class="admin-section-header" style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${hexToRgba(colorLogo, 0.3)};
          ">
            <div style="width: 32px; height: 32px; border-radius: 6px; background: ${hexToRgba(colorLogo, 0.2)}; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons" style="color: ${colorLogo}; font-size: 20px;">account_circle</span>
            </div>
            <div>
              <h3 style="margin: 0; color: ${textPrimary}; font-size: 18px; font-weight: 600;">${t('admin.logoAssets.logoSettings.title')}</h3>
              <div style="font-size: 12px; color: ${textSecondary}; margin-top: 2px;">${t('admin.logoAssets.logoSettings.desc')}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.logoSettings.size')}</label>
              <input type="number" id="logoAssetsDefaultLogoSize" class="theme-input" value="${state.logoSize ?? defaults.logoSize}" step="1" min="10" max="100">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.logoSettings.position')}</label>
              <select id="logoAssetsDefaultLogoPos" class="theme-input">
                <option value="left" ${state.logoPos === 'left' || !state.logoPos ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.position.left')}</option>
                <option value="center" ${state.logoPos === 'center' ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.position.center')}</option>
                <option value="right" ${state.logoPos === 'right' ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.position.right')}</option>
              </select>
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.logoSettings.language')}</label>
              <select id="logoAssetsDefaultLogoLanguage" class="theme-input">
                <option value="ru" ${state.logoLanguage === 'ru' || !state.logoLanguage ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.language.ru')}</option>
                <option value="kz" ${state.logoLanguage === 'kz' ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.language.kz')}</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Настройки Визуал -->
        <div class="admin-color-group" style="
          border-left: 4px solid ${colorKV};
          background: ${hexToRgba(colorKV, 0.08)};
          padding: 20px;
          border-radius: 8px;
        ">
          <div class="admin-section-header" style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid ${hexToRgba(colorKV, 0.3)};
          ">
            <div style="width: 32px; height: 32px; border-radius: 6px; background: ${hexToRgba(colorKV, 0.2)}; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons" style="color: ${colorKV}; font-size: 20px;">image</span>
            </div>
            <div>
              <h3 style="margin: 0; color: ${textPrimary}; font-size: 18px; font-weight: 600;">${t('admin.logoAssets.kvSettings.title')}</h3>
              <div style="font-size: 12px; color: ${textSecondary}; margin-top: 2px;">${t('admin.logoAssets.kvSettings.desc')}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.kvSettings.borderRadius')}</label>
              <input type="number" id="logoAssetsDefaultKvBorderRadius" class="theme-input" value="${state.kvBorderRadius ?? defaults.kvBorderRadius}" step="1" min="0" max="100">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.kvSettings.position')}</label>
              <select id="logoAssetsDefaultKvPosition" class="theme-input">
                <option value="left" ${state.kvPosition === 'left' ? 'selected' : ''}>${t('admin.logoAssets.kvSettings.position.left')}</option>
                <option value="center" ${state.kvPosition === 'center' || !state.kvPosition ? 'selected' : ''}>${t('admin.logoAssets.kvSettings.position.center')}</option>
                <option value="right" ${state.kvPosition === 'right' ? 'selected' : ''}>${t('admin.logoAssets.kvSettings.position.right')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div class="logo-assets-admin-footer" style="
        padding: 16px 20px;
        border-top: 1px solid ${borderColor};
        display: flex;
        gap: 8px;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        background: ${bgSecondary};
      ">
        <button class="btn" id="logoAssetsAdminChangePassword" style="
          padding: 8px 16px;
          background: transparent;
          border: 1px solid ${borderColor};
          border-radius: 6px;
          color: ${textPrimary};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        " title="${t('admin.logoAssets.changePassword')}">
          <span class="material-icons" style="font-size: 18px;">lock</span>
          <span>${t('admin.logoAssets.changePassword')}</span>
        </button>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" id="logoAssetsAdminSave">${t('admin.logoAssets.save')}</button>
          <button class="btn" id="logoAssetsAdminCancel">${t('admin.logoAssets.cancel')}</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(adminModal);
  
  // Обновляем превью
  updateDefaultsPreview();
  
  // Инициализируем файловый менеджер
  initFileManager();
  
  // Обработчики событий
  setupHandlers();
  
  // Закрытие по Escape
  const escapeHandler = (e) => {
    if (e.key === 'Escape' && isAdminOpen) {
      closeLogoAssetsAdmin();
    }
  };
  document.addEventListener('keydown', escapeHandler);
  adminModal._escapeHandler = escapeHandler;
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
  passwordModal.id = 'logoAssetsChangePasswordModal';
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
        <h2 style="margin: 0; font-size: 20px; color: ${textPrimary};">${t('admin.logoAssets.changePassword.title')}</h2>
      </div>
      ${passwordIsSet ? `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.changePassword.current')}</label>
        <input type="password" id="logoAssetsCurrentPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="${t('admin.logoAssets.changePassword.currentPlaceholder')}" autofocus>
        <div id="logoAssetsCurrentPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">${t('admin.logoAssets.changePassword.error')}</div>
      </div>
      ` : ''}
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.changePassword.new')}</label>
        <input type="password" id="logoAssetsNewPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="${t('admin.logoAssets.changePassword.newPlaceholder')}" ${!passwordIsSet ? 'autofocus' : ''}>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.changePassword.confirm')}</label>
        <input type="password" id="logoAssetsConfirmPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="${t('admin.logoAssets.changePassword.confirmPlaceholder')}">
        <div id="logoAssetsPasswordMatchError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">${t('admin.logoAssets.changePassword.matchError')}</div>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 8px; color: ${textSecondary}; font-size: 14px; cursor: pointer;">
          <input type="checkbox" id="logoAssetsRemovePasswordCheckbox" style="width: 18px; height: 18px; cursor: pointer;">
          <span>${t('admin.logoAssets.changePassword.remove')}</span>
        </label>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="logoAssetsChangePasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; cursor: pointer;">${t('admin.logoAssets.changePassword.cancel')}</button>
        <button id="logoAssetsChangePasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">${t('admin.logoAssets.changePassword.save')}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(passwordModal);
  
  const currentPasswordInput = document.getElementById('logoAssetsCurrentPasswordInput');
  const newPasswordInput = document.getElementById('logoAssetsNewPasswordInput');
  const confirmPasswordInput = document.getElementById('logoAssetsConfirmPasswordInput');
  const removePasswordCheckbox = document.getElementById('logoAssetsChangePasswordCheckbox');
  const currentPasswordError = document.getElementById('logoAssetsCurrentPasswordError');
  const passwordMatchError = document.getElementById('logoAssetsPasswordMatchError');
  const submitBtn = document.getElementById('logoAssetsChangePasswordSubmit');
  const cancelBtn = document.getElementById('logoAssetsChangePasswordCancel');
  
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
      alert(t('admin.logoAssets.changePassword.removed'));
      return;
    }
    
    // Проверяем новый пароль
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!newPassword) {
      alert(t('admin.logoAssets.changePassword.enterNew'));
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
    alert(t('admin.logoAssets.changePassword.success'));
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
 * Настраивает обработчики событий
 */
const setupHandlers = () => {
  const state = getState();
  const defaults = getDefaultValues();
  
  // Закрытие
  const closeBtn = document.getElementById('logoAssetsAdminClose');
  const cancelBtn = document.getElementById('logoAssetsAdminCancel');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeLogoAssetsAdmin);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeLogoAssetsAdmin);
  }
  
  // Изменение пароля
  const changePasswordBtn = document.getElementById('logoAssetsAdminChangePassword');
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
      verifyModal.id = 'logoAssetsVerifyPasswordModal';
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
            <h2 style="margin: 0; font-size: 20px; color: ${textPrimary};">${t('admin.logoAssets.changePassword.verify')}</h2>
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.changePassword.verifyLabel')}</label>
            <input type="password" id="logoAssetsVerifyPasswordInput" style="width: 100%; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; font-size: 16px; box-sizing: border-box;" placeholder="${t('admin.logoAssets.changePassword.verifyPlaceholder')}" autofocus>
            <div id="logoAssetsVerifyPasswordError" style="margin-top: 8px; color: #f44336; font-size: 12px; display: none;">${t('admin.logoAssets.changePassword.error')}</div>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="logoAssetsVerifyPasswordCancel" class="btn" style="padding: 10px 20px; background: transparent; border: 1px solid ${borderColor}; border-radius: 8px; color: ${textPrimary}; cursor: pointer;">${t('admin.logoAssets.changePassword.cancel')}</button>
            <button id="logoAssetsVerifyPasswordSubmit" class="btn btn-primary" style="padding: 10px 20px; background: #2196F3; border: none; border-radius: 8px; color: white; cursor: pointer;">${t('admin.logoAssets.changePassword.continue')}</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(verifyModal);
      
      const verifyInput = document.getElementById('logoAssetsVerifyPasswordInput');
      const verifyError = document.getElementById('logoAssetsVerifyPasswordError');
      const verifySubmit = document.getElementById('logoAssetsVerifyPasswordSubmit');
      const verifyCancel = document.getElementById('logoAssetsVerifyPasswordCancel');
      
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
  
  // Закрытие по клику на overlay
  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      closeLogoAssetsAdmin();
    }
  });
  
  // Сохранение
  const saveBtn = document.getElementById('logoAssetsAdminSave');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      // Сохраняем настройки логотипа
      const logoSize = document.getElementById('logoAssetsDefaultLogoSize');
      const logoPos = document.getElementById('logoAssetsDefaultLogoPos');
      const logoLanguage = document.getElementById('logoAssetsDefaultLogoLanguage');
      
      if (logoSize) setKey('logoSize', parseFloat(logoSize.value));
      if (logoPos) setKey('logoPos', logoPos.value);
      if (logoLanguage) setKey('logoLanguage', logoLanguage.value);
      
      // Сохраняем настройки KV
      const kvBorderRadius = document.getElementById('logoAssetsDefaultKvBorderRadius');
      const kvPosition = document.getElementById('logoAssetsDefaultKvPosition');
      
      if (kvBorderRadius) setKey('kvBorderRadius', parseFloat(kvBorderRadius.value));
      if (kvPosition) setKey('kvPosition', kvPosition.value);
      
      closeLogoAssetsAdmin();
    });
  }
  
  // Загрузка логотипа
  const logoUploadBtn = document.getElementById('logoAssetsDefaultLogoUpload');
  const logoUploadFile = document.getElementById('logoAssetsDefaultLogoUploadFile');
  if (logoUploadBtn && logoUploadFile) {
    logoUploadBtn.addEventListener('click', () => {
      logoUploadFile.click();
    });
    logoUploadFile.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await handleLogoUpload(e);
        updateDefaultsPreview();
      }
    });
  }
  
  // Очистка логотипа
  const logoClearBtn = document.getElementById('logoAssetsDefaultLogoClear');
  if (logoClearBtn) {
    logoClearBtn.addEventListener('click', () => {
      setKey('logoSelected', defaults.logoSelected);
      updateDefaultsPreview();
      logoClearBtn.style.display = 'none';
    });
  }
  
  // Загрузка KV
  const kvUploadBtn = document.getElementById('logoAssetsDefaultKVUpload');
  const kvUploadFile = document.getElementById('logoAssetsDefaultKVUploadFile');
  if (kvUploadBtn && kvUploadFile) {
    kvUploadBtn.addEventListener('click', () => {
      kvUploadFile.click();
    });
    kvUploadFile.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await handleKVUpload(e);
        updateDefaultsPreview();
      }
    });
  }
  
  // Очистка KV
  const kvClearBtn = document.getElementById('logoAssetsDefaultKVClear');
  if (kvClearBtn) {
    kvClearBtn.addEventListener('click', () => {
      setKey('kvSelected', defaults.kvSelected);
      updateDefaultsPreview();
      kvClearBtn.style.display = 'none';
    });
  }
};

/**
 * Закрывает админку
 */
const closeLogoAssetsAdmin = () => {
  if (!isAdminOpen) return;
  
  isAdminOpen = false;
  
  if (adminModal) {
    // Удаляем обработчик Escape
    if (adminModal._escapeHandler) {
      document.removeEventListener('keydown', adminModal._escapeHandler);
    }
    adminModal.remove();
    adminModal = null;
  }
  
  // Сбрасываем флаг аутентификации при закрытии
  isAdminAuthenticated = false;
  console.log('Модальное окно закрыто, флаг аутентификации сброшен');
};

/**
 * Публичная функция для открытия админки
 */
export const showLogoAssetsAdmin = () => {
  console.log('showLogoAssetsAdmin вызвана');
  console.log('isAdminAuthenticated (до сброса):', isAdminAuthenticated);
  console.log('hasPassword():', hasPassword());
  
  // Проверяем, открыто ли модальное окно
  const existingModal = document.getElementById('logoAssetsAdminModal');
  if (existingModal) {
    const computedStyle = window.getComputedStyle(existingModal);
    const isVisible = computedStyle.display !== 'none' && 
                     computedStyle.visibility !== 'hidden' && 
                     parseFloat(computedStyle.opacity) > 0;
    
    if (isVisible) {
      // Если окно уже открыто, просто закрываем его
      closeLogoAssetsAdmin();
      setTimeout(() => {
        showLogoAssetsAdmin(); // Рекурсивно вызываем для проверки пароля
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
    openLogoAssetsAdmin();
    return;
  }
  
  // Если уже аутентифицирован в этой сессии (не должно произойти после сброса выше, но на всякий случай)
  if (isAdminAuthenticated) {
    console.log('Уже аутентифицирован, открываем админку');
    openLogoAssetsAdmin();
    return;
  }
  
  // Если не аутентифицирован, показываем окно ввода пароля
  console.log('Показываем окно ввода пароля');
  showPasswordPrompt();
};

