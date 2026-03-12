/**
 * Компонент админки для управления логотипом и assets
 * Позволяет управлять файлами в папках logo и assets, а также настройками по умолчанию
 */

import { renderFileManager, initFileManager } from './fileManager.js';
import { getState, setKey, getDefaultValues } from '../../state/store.js';
import { openLogoSelectModal, closeLogoSelectModal, selectPreloadedLogo } from './logoSelector.js';
import { openKVSelectModal, closeKVSelectModal, selectPreloadedKV } from './kvSelector.js';
import { getPassword, checkPassword, setPassword, hasPassword } from '../../utils/passwordManager.js';
import { DEFAULT_KV_PATH } from '../../constants.js';
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
    console.log('Проверка пароля...', password);
    console.log('checkPassword функция:', typeof checkPassword);
    
    try {
      const isValid = checkPassword(password);
      console.log('Результат проверки пароля:', isValid);
      
      if (isValid) {
        console.log('Пароль верный, открываем админку');
        isAdminAuthenticated = true;
        passwordModal.remove();
        // Небольшая задержка, чтобы модальное окно пароля успело удалиться
        setTimeout(async () => {
          try {
            await openLogoAssetsAdmin();
          } catch (error) {
            console.error('Ошибка при открытии админки:', error);
            alert('Ошибка при открытии админки. Проверьте консоль для деталей.');
          }
        }, 50);
      } else {
        console.log('Пароль неверный');
        errorDiv.style.display = 'block';
        passwordInput.style.borderColor = '#f44336';
        passwordInput.value = '';
        passwordInput.focus();
      }
    } catch (error) {
      console.error('Ошибка при проверке пароля:', error);
      errorDiv.style.display = 'block';
      errorDiv.textContent = 'Ошибка при проверке пароля';
      passwordInput.style.borderColor = '#f44336';
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
 * Обновляет фавиконку в HTML
 */
const updateFavicon = (faviconUrl) => {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  
  if (faviconUrl && faviconUrl !== 'fav/favicon.png') {
    link.href = faviconUrl;
    link.type = faviconUrl.startsWith('data:image/svg') ? 'image/svg+xml' : (faviconUrl.startsWith('data:image/png') ? 'image/png' : '');
    localStorage.setItem('favicon', faviconUrl);
  } else {
    link.href = 'fav/favicon.png';
    link.type = 'image/png';
    if (!faviconUrl || faviconUrl === 'fav/favicon.png') {
      localStorage.removeItem('favicon');
    }
  }
};

/**
 * Обрабатывает загрузку фавиконки
 */
const handleFaviconUpload = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      // Сохраняем в localStorage и state
      localStorage.setItem('favicon', dataUrl);
      setKey('favicon', dataUrl);
      updateFavicon(dataUrl);
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const logoClearBtn = document.getElementById('logoAssetsDefaultLogoClear');
  if (logoPreviewImg && logoPreviewPlaceholder) {
    if (state.logoSelected && state.logoSelected !== defaults.logoSelected) {
      logoPreviewImg.src = state.logoSelected;
      logoPreviewImg.style.display = 'block';
      logoPreviewPlaceholder.style.display = 'none';
      if (logoClearBtn) {
        logoClearBtn.style.display = 'block';
      }
    } else {
      logoPreviewImg.style.display = 'none';
      logoPreviewPlaceholder.style.display = 'block';
      if (logoClearBtn) {
        logoClearBtn.style.display = 'none';
      }
    }
  }
  
  // Обновляем превью KV
  const kvPreviewImg = document.getElementById('logoAssetsDefaultKVPreviewImg');
  const kvPreviewPlaceholder = document.getElementById('logoAssetsDefaultKVPreviewPlaceholder');
  const kvClearBtn = document.getElementById('logoAssetsDefaultKVClear');
  if (kvPreviewImg && kvPreviewPlaceholder) {
    if (state.kvSelected && state.kvSelected !== '' && state.kvSelected !== defaults.kvSelected) {
      kvPreviewImg.src = state.kvSelected;
      kvPreviewImg.style.display = 'block';
      kvPreviewPlaceholder.style.display = 'none';
      if (kvClearBtn) {
        kvClearBtn.style.display = 'block';
      }
    } else {
      kvPreviewImg.src = DEFAULT_KV_PATH;
      kvPreviewImg.style.display = 'block';
      kvPreviewPlaceholder.style.display = 'none';
      if (kvClearBtn) {
        kvClearBtn.style.display = 'none';
      }
    }
  }
  
  // Обновляем превью фавиконки (источник: state, localStorage или текущий <link rel="icon">)
  const faviconPreviewImg = document.getElementById('logoAssetsDefaultFaviconPreviewImg');
  const faviconPreviewPlaceholder = document.getElementById('logoAssetsDefaultFaviconPreviewPlaceholder');
  const faviconClearBtn = document.getElementById('logoAssetsDefaultFaviconClear');
  if (faviconPreviewImg && faviconPreviewPlaceholder) {
    let favicon = state.favicon || localStorage.getItem('favicon') || '';
    if (!favicon) {
      const link = document.querySelector("link[rel~='icon']");
      if (link && link.href && link.href !== '' && !link.href.endsWith('fav/favicon.png')) {
        favicon = link.href;
      }
    }
    if (favicon) {
      faviconPreviewImg.src = favicon;
      faviconPreviewImg.style.display = 'block';
      faviconPreviewPlaceholder.style.display = 'none';
      if (faviconClearBtn) {
        faviconClearBtn.style.display = 'block';
      }
    } else {
      faviconPreviewImg.src = '';
      faviconPreviewImg.style.display = 'none';
      faviconPreviewPlaceholder.style.display = 'flex';
      if (faviconClearBtn) {
        faviconClearBtn.style.display = 'none';
      }
    }
  }
  
  // НЕ обновляем значения в полях ввода при изменении state извне
  // Поля ввода обновляются только при открытии админки
  // Это позволяет пользователю редактировать значения в админке без перезаписи при изменениях в макете

  // Превью логотипов по вариантам (RU / KZ / PRO)
  const variantRuImg = document.getElementById('logoAssetsVariantRuPreviewImg');
  const variantRuPh = document.getElementById('logoAssetsVariantRuPlaceholder');
  if (variantRuImg && variantRuPh) {
    const path = state.defaultLogoRU || state.logoSelected || '';
    if (path) {
      variantRuImg.src = path;
      variantRuImg.style.display = 'block';
      variantRuPh.style.display = 'none';
    } else {
      variantRuImg.style.display = 'none';
      variantRuPh.style.display = 'flex';
    }
  }
  const variantKzImg = document.getElementById('logoAssetsVariantKzPreviewImg');
  const variantKzPh = document.getElementById('logoAssetsVariantKzPlaceholder');
  if (variantKzImg && variantKzPh) {
    const path = state.defaultLogoKZ || '';
    if (path) {
      variantKzImg.src = path;
      variantKzImg.style.display = 'block';
      variantKzPh.style.display = 'none';
    } else {
      variantKzImg.style.display = 'none';
      variantKzPh.style.display = 'flex';
    }
  }
  const variantProImg = document.getElementById('logoAssetsVariantProPreviewImg');
  const variantProPh = document.getElementById('logoAssetsVariantProPlaceholder');
  if (variantProImg && variantProPh) {
    const path = state.defaultLogoPRO || '';
    if (path) {
      variantProImg.src = path;
      variantProImg.style.display = 'block';
      variantProPh.style.display = 'none';
    } else {
      variantProImg.style.display = 'none';
      variantProPh.style.display = 'flex';
    }
  }
};

// Экспортируем функцию для обновления извне
window.updateLogoAssetsPreview = updateDefaultsPreview;

/**
 * Внутренняя функция для открытия админки
 */
const openLogoAssetsAdmin = async () => {
  console.log('openLogoAssetsAdmin вызвана, isAdminOpen:', isAdminOpen);
  if (isAdminOpen) {
    console.log('Админка уже открыта, выходим');
    return;
  }
  
  isAdminOpen = true;
  console.log('Создаем модальное окно админки...');
  
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
                <button type="button" class="btn btn-full" id="logoAssetsDefaultLogoSelect" style="flex: 1;">
                  ${t('admin.logoAssets.defaults.select')}
                </button>
                <button type="button" class="btn btn-danger" id="logoAssetsDefaultLogoClear" style="display: ${hasLogo ? 'block' : 'none'};" title="${t('admin.logoAssets.defaults.reset')}">
                  ${t('admin.logoAssets.defaults.reset')}
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: ${textPrimary};">
                <span class="material-icons" style="font-size: 20px; color: ${textSecondary};">image</span>
                ${t('admin.logoAssets.defaults.kv')}
              </label>
              <div id="logoAssetsDefaultKVPreview" class="preview-container">
                <img id="logoAssetsDefaultKVPreviewImg" src="${(state.kvSelected && state.kvSelected !== '') ? state.kvSelected : DEFAULT_KV_PATH}" class="preview-img" style="display: ${state.kvSelected ? 'block' : 'none'};">
                <span id="logoAssetsDefaultKVPreviewPlaceholder" class="preview-placeholder" style="display: ${state.kvSelected ? 'none' : 'block'};">${t('common.none')}</span>
              </div>
              <div class="input-group" style="display: flex; gap: 8px; margin-top: 8px;">
                <button type="button" class="btn btn-full" id="logoAssetsDefaultKVSelect" style="flex: 1;">
                  ${t('admin.logoAssets.defaults.select')}
                </button>
                <button type="button" class="btn btn-danger" id="logoAssetsDefaultKVClear" style="display: ${hasKV ? 'block' : 'none'};" title="${t('admin.logoAssets.defaults.reset')}">
                  ${t('admin.logoAssets.defaults.reset')}
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: ${textPrimary};">
                <span class="material-icons" style="font-size: 20px; color: ${textSecondary};">favorite</span>
                ${t('admin.logoAssets.defaults.favicon')}
              </label>
              <div id="logoAssetsDefaultFaviconPreview" class="preview-container" style="width: 64px; height: 64px; border-radius: 8px; overflow: hidden;">
                <img id="logoAssetsDefaultFaviconPreviewImg" src="" class="preview-img" style="width: 100%; height: 100%; object-fit: contain; display: none;">
                <span id="logoAssetsDefaultFaviconPreviewPlaceholder" class="preview-placeholder" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${t('common.none')}</span>
              </div>
              <div class="input-group" style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn btn-full" id="logoAssetsDefaultFaviconUpload" style="flex: 1;">
                  ${t('admin.logoAssets.defaults.upload')}
                </button>
                <button class="btn btn-danger" id="logoAssetsDefaultFaviconClear" style="display: none;" title="${t('admin.logoAssets.defaults.reset')}">
                  ${t('admin.logoAssets.defaults.reset')}
                </button>
                <input type="file" id="logoAssetsDefaultFaviconUploadFile" accept="image/*,.svg,.ico" style="display: none;">
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
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.logoSettings.modeLabel')}</label>
            <select id="logoAssetsDefaultLogoMode" class="theme-input">
              <option value="single" ${(state.logoDefaultMode || 'single') === 'single' ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.modeSingle')}</option>
              <option value="perVariant" ${state.logoDefaultMode === 'perVariant' ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.modePerVariant')}</option>
            </select>
          </div>
          <div id="logoAssetsLogoModeSingle" style="display: ${(state.logoDefaultMode || 'single') === 'single' ? 'block' : 'none'};">
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
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: ${textSecondary}; font-size: 14px;">${t('admin.logoAssets.logoSettings.proMode')}</label>
              <select id="logoAssetsDefaultProMode" class="theme-input">
                <option value="false" ${!state.proMode ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.proMode.off')}</option>
                <option value="true" ${state.proMode ? 'selected' : ''}>${t('admin.logoAssets.logoSettings.proMode.on')}</option>
              </select>
            </div>
          </div>
          </div>
          <div id="logoAssetsLogoModePerVariant" style="display: ${state.logoDefaultMode === 'perVariant' ? 'block' : 'none'}; margin-top: 16px;">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div class="form-group" style="padding: 12px; background: ${hexToRgba(colorLogo, 0.05)}; border-radius: 8px;">
                <label style="font-weight: 600; margin-bottom: 8px; color: ${textPrimary};">${t('admin.logoAssets.logoSettings.variant.ru')}</label>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div id="logoAssetsVariantRuPreview" class="preview-container" style="width: 80px; height: 40px; min-width: 80px;">
                    <img id="logoAssetsVariantRuPreviewImg" src="${state.defaultLogoRU || state.logoSelected || ''}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: ${state.defaultLogoRU || state.logoSelected ? 'block' : 'none'};">
                    <span id="logoAssetsVariantRuPlaceholder" class="preview-placeholder" style="display: ${state.defaultLogoRU || state.logoSelected ? 'none' : 'flex'};">—</span>
                  </div>
                  <button type="button" class="btn" id="logoAssetsVariantRuSelect">${t('admin.logoAssets.defaults.select')}</button>
                </div>
              </div>
              <div class="form-group" style="padding: 12px; background: ${hexToRgba(colorLogo, 0.05)}; border-radius: 8px;">
                <label style="font-weight: 600; margin-bottom: 8px; color: ${textPrimary};">${t('admin.logoAssets.logoSettings.variant.kz')}</label>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div id="logoAssetsVariantKzPreview" class="preview-container" style="width: 80px; height: 40px; min-width: 80px;">
                    <img id="logoAssetsVariantKzPreviewImg" src="${state.defaultLogoKZ || ''}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: ${state.defaultLogoKZ ? 'block' : 'none'};">
                    <span id="logoAssetsVariantKzPlaceholder" class="preview-placeholder" style="display: ${state.defaultLogoKZ ? 'none' : 'flex'};">—</span>
                  </div>
                  <button type="button" class="btn" id="logoAssetsVariantKzSelect">${t('admin.logoAssets.defaults.select')}</button>
                </div>
              </div>
              <div class="form-group" style="padding: 12px; background: ${hexToRgba(colorLogo, 0.05)}; border-radius: 8px;">
                <label style="font-weight: 600; margin-bottom: 8px; color: ${textPrimary};">${t('admin.logoAssets.logoSettings.variant.pro')}</label>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div id="logoAssetsVariantProPreview" class="preview-container" style="width: 80px; height: 40px; min-width: 80px;">
                    <img id="logoAssetsVariantProPreviewImg" src="${state.defaultLogoPRO || ''}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: ${state.defaultLogoPRO ? 'block' : 'none'};">
                    <span id="logoAssetsVariantProPlaceholder" class="preview-placeholder" style="display: ${state.defaultLogoPRO ? 'none' : 'flex'};">—</span>
                  </div>
                  <button type="button" class="btn" id="logoAssetsVariantProSelect">${t('admin.logoAssets.defaults.select')}</button>
                </div>
              </div>
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
  console.log('Модальное окно добавлено в DOM');
  
  // Обновляем превью
  try {
    updateDefaultsPreview();
    console.log('Превью обновлено');
  } catch (e) {
    console.error('Ошибка при обновлении превью:', e);
  }
  
  // Инициализируем файловый менеджер
  try {
    initFileManager();
    console.log('Файловый менеджер инициализирован');
  } catch (e) {
    console.error('Ошибка при инициализации файлового менеджера:', e);
  }
  
  // Обработчики событий
  try {
    setupHandlers();
    console.log('Обработчики событий установлены');
  } catch (e) {
    console.error('Ошибка при установке обработчиков:', e);
  }
  
  // Подписываемся на изменения state только для обновления превью изображений
  // Поля ввода НЕ обновляются автоматически, чтобы не перезаписывать изменения пользователя в админке
  const { subscribe } = await import('../../state/store.js');
  const unsubscribe = subscribe(() => {
    // Обновляем только превью изображений, не трогая поля ввода
    // Это позволяет редактировать значения в админке без перезаписи при изменениях в макете
    updateDefaultsPreview();
  });
  adminModal._unsubscribe = unsubscribe;
  
  console.log('Админка успешно открыта');
  
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
      const state = getState();
      // Сохраняем настройки логотипа
      const logoSize = document.getElementById('logoAssetsDefaultLogoSize');
      const logoPos = document.getElementById('logoAssetsDefaultLogoPos');
      const logoLanguage = document.getElementById('logoAssetsDefaultLogoLanguage');
      const proMode = document.getElementById('logoAssetsDefaultProMode');
      const logoMode = document.getElementById('logoAssetsDefaultLogoMode');
      
      if (logoSize) setKey('logoSize', parseFloat(logoSize.value));
      if (logoPos) setKey('logoPos', logoPos.value);
      if (logoLanguage) setKey('logoLanguage', logoLanguage.value);
      if (logoMode) setKey('logoDefaultMode', logoMode.value);
      if (proMode) {
        const proModeValue = proMode.value === 'true';
        setKey('proMode', proModeValue);
        if (typeof window.selectProMode === 'function') {
          window.selectProMode(proModeValue);
        }
      }
      
      // Сохраняем настройки KV
      const kvBorderRadius = document.getElementById('logoAssetsDefaultKvBorderRadius');
      const kvPosition = document.getElementById('logoAssetsDefaultKvPosition');
      
      if (kvBorderRadius) setKey('kvBorderRadius', parseFloat(kvBorderRadius.value));
      if (kvPosition) setKey('kvPosition', kvPosition.value);
      
      // Записываем медиа-дефолты в localStorage default-values
      const nextState = getState();
      try {
        const saved = JSON.parse(localStorage.getItem('default-values') || '{}');
        const updated = {
          ...saved,
          logoSelected: nextState.logoSelected,
          kvSelected: nextState.kvSelected,
          defaultLogoRU: nextState.defaultLogoRU || undefined,
          defaultLogoKZ: nextState.defaultLogoKZ || undefined,
          defaultLogoPRO: nextState.defaultLogoPRO || undefined,
          logoDefaultMode: nextState.logoDefaultMode || 'single',
          logoSize: nextState.logoSize,
          logoPos: nextState.logoPos,
          logoLanguage: nextState.logoLanguage,
          proMode: nextState.proMode,
          kvBorderRadius: nextState.kvBorderRadius,
          kvPosition: nextState.kvPosition
        };
        localStorage.setItem('default-values', JSON.stringify(updated));
      } catch (e) {
        console.warn('Не удалось сохранить default-values:', e);
      }
      
      closeLogoAssetsAdmin();
    });
  }
  
  // Выбор логотипа по умолчанию из библиотеки
  const logoSelectBtn = document.getElementById('logoAssetsDefaultLogoSelect');
  if (logoSelectBtn) {
    logoSelectBtn.addEventListener('click', async () => {
      window._adminDefaultLogoVariant = null; // общий логотип по умолчанию
      await openLogoSelectModal();
    });
  }
  
  // Очистка логотипа по умолчанию
  const logoClearBtn = document.getElementById('logoAssetsDefaultLogoClear');
  if (logoClearBtn) {
    logoClearBtn.addEventListener('click', () => {
      setKey('logoSelected', defaults.logoSelected);
      updateDefaultsPreview();
      logoClearBtn.style.display = 'none';
    });
  }
  
  // Выбор KV по умолчанию из библиотеки
  const kvSelectBtn = document.getElementById('logoAssetsDefaultKVSelect');
  if (kvSelectBtn) {
    kvSelectBtn.addEventListener('click', async () => {
      await openKVSelectModal();
    });
  }
  
  // Очистка KV по умолчанию
  const kvClearBtn = document.getElementById('logoAssetsDefaultKVClear');
  if (kvClearBtn) {
    kvClearBtn.addEventListener('click', () => {
      setKey('kvSelected', defaults.kvSelected);
      updateDefaultsPreview();
      kvClearBtn.style.display = 'none';
    });
  }
  
  // Режим настройки логотипа: один для всех / отдельно RU-KZ-PRO
  const logoModeSelect = document.getElementById('logoAssetsDefaultLogoMode');
  if (logoModeSelect) {
    logoModeSelect.addEventListener('change', () => {
      const mode = logoModeSelect.value;
      setKey('logoDefaultMode', mode);
      const singleBlock = document.getElementById('logoAssetsLogoModeSingle');
      const perVariantBlock = document.getElementById('logoAssetsLogoModePerVariant');
      if (singleBlock) singleBlock.style.display = mode === 'single' ? 'block' : 'none';
      if (perVariantBlock) perVariantBlock.style.display = mode === 'perVariant' ? 'block' : 'none';
    });
  }
  
  // Выбор логотипа для варианта RU
  const variantRuSelect = document.getElementById('logoAssetsVariantRuSelect');
  if (variantRuSelect) {
    variantRuSelect.addEventListener('click', async () => {
      window._adminDefaultLogoVariant = 'ru';
      await openLogoSelectModal();
    });
  }
  const variantKzSelect = document.getElementById('logoAssetsVariantKzSelect');
  if (variantKzSelect) {
    variantKzSelect.addEventListener('click', async () => {
      window._adminDefaultLogoVariant = 'kz';
      await openLogoSelectModal();
    });
  }
  const variantProSelect = document.getElementById('logoAssetsVariantProSelect');
  if (variantProSelect) {
    variantProSelect.addEventListener('click', async () => {
      window._adminDefaultLogoVariant = 'pro';
      await openLogoSelectModal();
    });
  }
  
  // Загрузка фавиконки
  const faviconUploadBtn = document.getElementById('logoAssetsDefaultFaviconUpload');
  const faviconUploadFile = document.getElementById('logoAssetsDefaultFaviconUploadFile');
  if (faviconUploadBtn && faviconUploadFile) {
    faviconUploadBtn.addEventListener('click', () => {
      faviconUploadFile.click();
    });
    faviconUploadFile.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        await handleFaviconUpload(file);
        updateDefaultsPreview();
      }
    });
  }
  
  // Очистка фавиконки
  const faviconClearBtn = document.getElementById('logoAssetsDefaultFaviconClear');
  if (faviconClearBtn) {
    faviconClearBtn.addEventListener('click', () => {
      localStorage.removeItem('favicon');
      setKey('favicon', '');
      updateFavicon('fav/favicon.png');
      // Обновляем тип для PNG
      let link = document.querySelector("link[rel~='icon']");
      if (link) {
        link.type = 'image/png';
      }
      updateDefaultsPreview();
      faviconClearBtn.style.display = 'none';
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
    // Отписываемся от изменений state
    if (adminModal._unsubscribe) {
      adminModal._unsubscribe();
      adminModal._unsubscribe = null;
    }
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
export const showLogoAssetsAdmin = async () => {
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
    await openLogoAssetsAdmin();
    return;
  }
  
  // Если уже аутентифицирован в этой сессии (не должно произойти после сброса выше, но на всякий случай)
  if (isAdminAuthenticated) {
    console.log('Уже аутентифицирован, открываем админку');
    await openLogoAssetsAdmin();
    return;
  }
  
  // Если не аутентифицирован, показываем окно ввода пароля
  console.log('Показываем окно ввода пароля');
  showPasswordPrompt();
};
