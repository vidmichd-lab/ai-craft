import { cacheDom } from './ui/domCache.js';
import { initEventDelegation, registerHandler, initCheckboxHandlers } from './ui/eventHandler.js';
import {
  syncFormFields,
  updatePreviewSizeSelect,
  renderPresetSizes,
  renderCustomSizes,
  updatePadding,
  updateLegalOpacity,
  updateSubtitleOpacity,
  updateLogoSize,
  updateTitleOpacity,
  updateTitleSize,
  updateSubtitleSize,
  updateSubtitleGap,
  updateTitleLogoGap,
  updateRsyaCropGridVisible,
  updateLegalSize,
  updateAgeSize,
  updateAgeGapPercent,
  updateKVBorderRadius,
  selectKVPosition,
  updateTextGradientOpacity,
  updateBgOffsetX,
  updateBgOffsetY,
  selectPreloadedLogo,
  selectFontFamily,
  selectTitleFontFamily,
  selectSubtitleFontFamily,
  selectLegalFontFamily,
  selectAgeFontFamily,
  selectTitleAlign,
  toggleTitleAlign,
  selectTitleVPos,
  toggleTitleVPos,
  selectLogoPos,
  toggleLogoPos,
  selectLogoLanguage,
  toggleLogoLanguage,
  toggleProMode,
  selectProMode,
  selectProjectMode,
  selectVariantMode,
  selectLayoutMode,
  selectRsyaLayout,
  updateColorFromPicker,
  updateColorFromHex,
  selectBgPosition,
  selectBgVPosition,
  updateBgGradientType,
  updateBgGradientAngle,
  addGradientStop,
  removeGradientStop,
  applyPresetBgColor,
  handleLogoUpload,
  handlePartnerLogoUpload,
  handleKVUpload,
  handleRsyaKV2Upload,
  handleRsyaKV3Upload,
  handleBgUpload,
  clearLogo,
  clearPartnerLogo,
  showPartnerLogoSection,
  clearKV,
  clearRsyaKV2,
  clearRsyaKV3,
  swapRsyaKV12,
  swapRsyaKV23,
  clearBg,
  showSection,
  toggleSection,
  togglePlatform,
  toggleSize,
  toggleCustomSizeAction,
  removeCustomSizeAction,
  addCustomSizeFromInput,
  updateAddSizeButtonState,
  changePreviewSize,
  changePreviewSizeCategory,
  handlePresetContainerClick,
  selectAllSizesAction,
  deselectAllSizesAction,
  showSizesAdmin,
  saveSettings,
  loadSettings,
  resetAll,
  initializeLogoDropdown,
  initializeLogoToggle,
  initializeLogoPosToggle,
  initializeProModeToggle,
  initializeTitleAlignToggle,
  initializeTitleVPosToggle,
  initializeKVPositionToggle,
  initializeBgPositionToggle,
  initializeBgVPositionToggle,
  initializeExportScaleToggle,
  initializeFontDropdown,
  initializeFontDropdowns,
  initializeKVDropdown,
  initializeTabs,
  openLogoSelectModal,
  closeLogoSelectModal,
  openKVSelectModal,
  closeKVSelectModal,
  selectPreloadedKV,
  selectPreloadedBG,
  selectPairBG,
  refreshBGColumns,
  closeBGSelectModal,
  openBGSelectModal,
    loadDefaultKV,
    initializeStateSubscribers,
    refreshMediaPreviews,
    updatePartnerLogoUI,
    updateSizesSummary,
    addTitleSubtitlePairAction,
    removeTitleSubtitlePairAction,
    setActiveTitlePair,
    updateActivePairTitle,
    updateActivePairSubtitle,
    updatePairTitleDirect,
    updatePairSubtitleDirect,
    refreshLogoColumns,
    refreshKVColumns,
    refreshAllAssets,
    handleTitleFontUpload,
    handleSubtitleFontUpload,
    handleLegalFontUpload,
    handleAgeFontUpload,
    clearTitleCustomFont,
    clearSubtitleCustomFont,
    clearLegalCustomFont,
    clearAgeCustomFont,
    transformTitleText,
    transformSubtitleText,
    transformLegalText,
    selectTitleTransform,
    selectSubtitleTransform,
    selectLegalTransform,
    initializeTitleTransformToggle,
    initializeSubtitleTransformToggle,
    initializeLegalTransformToggle,
    updateRsyaCropPreviews,
    initializeRsyaCanvasDrag,
  initializeBackgroundUI,
  initializeSizeManager
} from './ui/ui.js';
import { renderer } from './renderer.js';
import { clearTextMeasurementCache } from './renderer/text.js';
import { setKey, getState, ensurePresetSelection, getCheckedSizes, updatePresetSizesFromConfig, getDefaultValues } from './state/store.js';
import { exportPNG, exportJPG } from './exporter.js';
import { scanFonts } from './utils/assetScanner.js';
import { setAvailableFonts, initializePresetSizes, DEFAULT_KV_PATH } from './constants.js';
import { preloadImages } from './utils/imageCache.js';
import { loadConfigFromFile } from './utils/fullConfig.js';
import { showLogoAssetsAdmin } from './ui/components/logoAssetsAdmin.js';
import { openGuideModal, closeGuideModal } from './ui/ui.js';
import { setLanguage, getLanguage, updateUI, t } from './utils/i18n.js';
import { initPanelResizers } from './utils/panelResizer.js';
import { initWorkspacePanel } from './ui/components/workspacePanel.js';

const initializeEventDelegation = (dom) => {
  dom.presetSizesList.addEventListener('click', handlePresetContainerClick);
  if (dom.previewSizeSelect) {
    dom.previewSizeSelect.addEventListener('change', (event) => changePreviewSize(event.target.value));
  }
  // Обработчики для кастомных дропдаунов превью форматов больше не нужны
  // они обрабатываются напрямую в updatePreviewSizeSelect
};

/**
 * Инициализирует переключатель языка
 */
const initializeLanguageSelector = () => {
  const languageBtn = document.getElementById('languageSelectBtn');
  const languageText = document.getElementById('languageSelectText');
  const languageDropdown = document.getElementById('languageSelectDropdown');
  
  if (!languageBtn || !languageText || !languageDropdown) {
    console.warn('Элементы селектора языка не найдены');
    return;
  }
  
  // Устанавливаем текущий язык (по умолчанию русский)
  let currentLang = getLanguage();
  if (!currentLang || (currentLang !== 'ru' && currentLang !== 'en' && currentLang !== 'tr')) {
    currentLang = 'ru';
    setLanguage('ru');
  }
  languageText.textContent = currentLang.toUpperCase();
  
  // Убеждаемся, что кнопка и её родительские элементы видимы
  const languageSelector = languageBtn.closest('.language-selector');
  if (languageSelector) {
    languageSelector.style.display = 'flex';
  }
  if (languageBtn.parentElement) {
    languageBtn.parentElement.style.display = '';
  }
  if (languageBtn.parentElement?.parentElement) {
    languageBtn.parentElement.parentElement.style.display = '';
  }
  
  // Обновляем выбранную опцию
  const options = languageDropdown.querySelectorAll('.custom-select-option');
  options.forEach(option => {
    if (option.dataset.value === currentLang) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Обработчик клика на кнопку
  languageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = languageDropdown.style.display === 'block';
    
    // Закрываем все другие дропдауны
    document.querySelectorAll('.custom-select-dropdown').forEach(dropdown => {
      if (dropdown !== languageDropdown) {
        dropdown.style.display = 'none';
      }
    });
    
    languageDropdown.style.display = isOpen ? 'none' : 'block';
  });
  
  // Обработчик клика на опции
  options.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = option.dataset.value;
      
      // Обновляем выбранную опцию
      options.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      
      // Устанавливаем язык
      setLanguage(lang);
      languageText.textContent = lang.toUpperCase();
      
      // Закрываем дропдаун
      languageDropdown.style.display = 'none';
    });
  });
  
  // Закрываем дропдаун при клике вне его
  document.addEventListener('click', (e) => {
    if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
      languageDropdown.style.display = 'none';
    }
  });
  
  // Обновляем UI при изменении языка
  window.addEventListener('languageChanged', () => {
    const currentLang = getLanguage();
    languageText.textContent = currentLang.toUpperCase();
    
    // Обновляем выбранную опцию
    options.forEach(option => {
      if (option.dataset.value === currentLang) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  });
};

async function hardResetCache() {
  const confirmed = confirm('Очистить весь кеш? Настройки, тема и дефолты сохранятся.');
  if (!confirmed) return;

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }

  try {
    indexedDB.deleteDatabase('imageCache');
  } catch (e) {}

  const protectedKeys = ['default-values', 'theme', 'admin_password', 'brandName', 'sizes-config', 'format-multipliers', 'media-sources'];
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const isProtected = protectedKeys.includes(key)
      || key.startsWith('default-values::team::')
      || key.startsWith('media-sources::team::');
    if (!isProtected) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
  }

  window.location.reload(true);
}

const exposeGlobals = () => {
  Object.assign(window, {
    updateState: (key, rawValue) => {
      try {
        // Валидация ключа
        if (!key || typeof key !== 'string') {
          console.warn('Некорректный ключ состояния:', key);
          return;
        }
        
        // Нормализация значения
        let value = rawValue;
        // Булевы значения (true/false) всегда валидны
        if (typeof rawValue === 'boolean') {
          value = rawValue;
        } else if (typeof rawValue === 'string' && rawValue.trim() === '') {
          value = rawValue;
        } else if (rawValue === null || rawValue === undefined) {
          console.warn('Попытка установить null/undefined для ключа:', key);
          return;
        }
        
        // Очищаем кэш измерения текста ПЕРЕД изменением состояния, если меняются параметры текста
        if (key === 'titleWeight' || key === 'subtitleWeight' || key === 'legalWeight' || key === 'ageWeight' ||
            key === 'titleFontFamily' || key === 'subtitleFontFamily' || key === 'legalFontFamily' || key === 'ageFontFamily' ||
            key === 'titleSize' || key === 'subtitleSize' || key === 'legalSize' || key === 'ageSize' ||
            key === 'titleLetterSpacing' || key === 'subtitleLetterSpacing' || key === 'legalLetterSpacing') {
          clearTextMeasurementCache();
        }
        
        // Обновляем состояние
        setKey(key, value);
        
        // Для начертаний используем синхронный рендеринг для немедленного отображения
        if (key === 'titleWeight' || key === 'subtitleWeight' || key === 'legalWeight' || key === 'ageWeight') {
          try {
            renderer.renderSync();
          } catch (renderError) {
            console.error('Ошибка синхронного рендеринга:', renderError);
            try {
              renderer.render();
            } catch (e) {
              console.error('Ошибка асинхронного рендеринга:', e);
            }
          }
        } else {
          try {
            renderer.render();
          } catch (renderError) {
            console.error('Ошибка асинхронного рендеринга:', renderError);
          }
        }
      } catch (error) {
        console.error('Ошибка в updateState:', error);
        console.error('Ключ:', key, 'Значение:', rawValue);
        console.error('Стек ошибки:', error.stack);
        // Не прерываем выполнение, просто логируем ошибку
      }
    },
    updatePadding,
    updateLegalOpacity,
    updateSubtitleOpacity,
    updateLogoSize,
    updateTitleOpacity,
    updateTitleSize,
    updateSubtitleSize,
    updateSubtitleGap,
    updateTitleLogoGap,
    updateRsyaCropGridVisible,
    updateAgeSize,
    updateAgeGapPercent,
    updateLegalSize,
    updateKVBorderRadius,
    updateTextGradientOpacity,
    updateBgOffsetX,
    updateBgOffsetY,
    selectPreloadedLogo,
    selectPreloadedKV,
    selectPreloadedBG,
    selectPairBG,
    refreshBGColumns,
    closeBGSelectModal,
    handleLogoUpload,
    handlePartnerLogoUpload,
    handleKVUpload,
    handleRsyaKV2Upload,
    handleRsyaKV3Upload,
    handleBgUpload,
    clearLogo,
    clearPartnerLogo,
    showPartnerLogoSection,
    clearKV,
    clearRsyaKV2,
    clearRsyaKV3,
    swapRsyaKV12,
    swapRsyaKV23,
    clearBg,
    selectTitleAlign,
    selectTitleVPos,
    selectLogoPos,
    toggleLogoPos,
    selectLogoLanguage,
    toggleLogoLanguage,
    toggleProMode,
    selectProMode,
    selectProjectMode,
    selectVariantMode,
    toggleTitleAlign,
    toggleTitleVPos,
    selectLayoutMode,
    selectRsyaLayout,
    updateColorFromPicker,
    updateColorFromHex,
  applyPresetBgColor,
  selectBgPosition,
  selectBgVPosition,
  selectKVPosition,
  updateBgGradientType,
  updateBgGradientAngle,
  addGradientStop,
  removeGradientStop,
  selectFontFamily,
    selectTitleFontFamily,
    selectSubtitleFontFamily,
    selectLegalFontFamily,
    selectAgeFontFamily,
    showSection,
    toggleSection,
    changePreviewSize,
    changePreviewSizeCategory,
    selectAllSizes: selectAllSizesAction,
    deselectAllSizes: deselectAllSizesAction,
    showSizesAdmin,
    showLogoAssetsAdmin,
    openGuideModal,
    closeGuideModal,
    togglePlatform,
    toggleSize,
    toggleCustomSize: toggleCustomSizeAction,
    removeCustomSize: removeCustomSizeAction,
    addCustomSizeFromInput,
    updateAddSizeButtonState,
    saveSettings,
    loadSettings,
    resetAll,
    exportAllPNG: exportPNG,
    exportAllJPG: exportJPG,
    addTitleSubtitlePair: addTitleSubtitlePairAction,
    removeTitleSubtitlePair: removeTitleSubtitlePairAction,
    setActiveTitlePair,
    updatePairTitleDirect,
    updatePairSubtitleDirect,
    refreshLogoColumns,
    refreshKVColumns,
    refreshBGColumns,
    refreshAllAssets,
    openLogoSelectModal,
    closeLogoSelectModal,
    openKVSelectModal,
    closeKVSelectModal,
    openBGSelectModal,
    closeBGSelectModal,
    handleTitleFontUpload,
    handleSubtitleFontUpload,
    handleLegalFontUpload,
    handleAgeFontUpload,
    clearTitleCustomFont,
    clearSubtitleCustomFont,
    clearLegalCustomFont,
    clearAgeCustomFont,
    transformTitleText,
    transformSubtitleText,
    transformLegalText,
    selectTitleTransform,
    selectSubtitleTransform,
    selectLegalTransform
  });
  window.__updateRsyaCropPreviews = updateRsyaCropPreviews;
  window.hardResetCache = hardResetCache;
};

// Кеш для загруженных шрифтов
const loadedFonts = new Set();

const getFontFileExtension = (filePath) => {
  if (typeof filePath !== 'string') return '';

  try {
    const url = new URL(filePath, window.location.origin);
    const pathname = decodeURIComponent(url.pathname || '');
    return pathname.split('.').pop()?.toLowerCase() || '';
  } catch {
    return filePath.split('?')[0].split('.').pop()?.toLowerCase() || '';
  }
};

const resolveFontFileUrl = (filePath) => {
  if (typeof filePath !== 'string') return '';
  if (/^(https?:)?\/\//i.test(filePath) || filePath.startsWith('blob:') || filePath.startsWith('data:')) {
    return filePath;
  }

  return filePath.split('/').map(part => encodeURIComponent(part)).join('/');
};

// Функция для динамической загрузки шрифтов через @font-face
export const loadFonts = async (fonts, preloadOnly = false) => {
  // Создаем стиль для @font-face правил
  let styleElement = document.getElementById('dynamic-fonts');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'dynamic-fonts';
    document.head.appendChild(styleElement);
  }
  
  // Получаем текущие правила
  const existingRules = styleElement.textContent || '';
  
  // Группируем шрифты по семейству для более эффективной загрузки
  const fontGroups = new Map();
  fonts.forEach(font => {
    if (!fontGroups.has(font.family)) {
      fontGroups.set(font.family, []);
    }
    fontGroups.get(font.family).push(font);
  });
  
  // Создаем @font-face правила для каждого шрифта
  let fontFaceRules = existingRules;
  
  fontGroups.forEach((familyFonts, family) => {
    familyFonts.forEach(font => {
      if (font.file) {
        // Проверяем, не загружен ли уже этот шрифт
        const fontKey = `${font.family}-${font.weight}-${font.style}`;
        if (loadedFonts.has(fontKey)) {
          return; // Пропускаем уже загруженные шрифты
        }
        
        // Определяем формат файла по расширению
        const ext = getFontFileExtension(font.file);
        let format = 'truetype';
        if (ext === 'woff') format = 'woff';
        else if (ext === 'woff2') format = 'woff2';
        else if (ext === 'otf') format = 'opentype';
        
        const resolvedUrl = resolveFontFileUrl(font.file);
        
        fontFaceRules += `
@font-face {
  font-family: '${family}';
  src: url('${resolvedUrl}') format('${format}');
  font-weight: ${font.weight};
  font-style: ${font.style};
  font-display: swap;
}
`;
        
        // Помечаем шрифт как загруженный
        loadedFonts.add(fontKey);
      }
    });
  });
  
  // Добавляем правила в style элемент
  if (fontFaceRules.trim()) {
    styleElement.textContent = fontFaceRules;
  }
  
  // Предзагружаем только Regular начертания для быстрой загрузки (если не preloadOnly)
  if (!preloadOnly) {
    const preloadLinks = [];
    const preloadedFamilies = new Set();
    
    fonts.forEach(font => {
      // Предзагружаем только Regular (400, normal) начертания для каждого семейства
      if (font.file && font.weight === '400' && font.style === 'normal' && !preloadedFamilies.has(font.family)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        const ext = getFontFileExtension(font.file);
        link.type = `font/${ext}`;
        link.href = resolveFontFileUrl(font.file);
        link.crossOrigin = 'anonymous';
        preloadLinks.push(link);
        preloadedFamilies.add(font.family);
      }
    });
    
    // Добавляем preload ссылки в head
    preloadLinks.forEach(link => {
      document.head.appendChild(link);
    });
  }
};

let progressInterval = null;
let currentProgress = 0;

// Функции для управления индикатором загрузки
const showLoadingIndicator = () => {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.style.display = 'flex';
  }
  // Скрываем все canvas
  const canvases = ['previewCanvasNarrow', 'previewCanvasSquare', 'previewCanvasWide'];
  canvases.forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      canvas.style.display = 'none';
      canvas.style.opacity = '0';
    }
  });
  
  // Сбрасываем прогресс
  currentProgress = 0;
  updateProgress(0);
  
  // Запускаем симуляцию прогресса (будет обновляться реальным прогрессом)
  startProgressSimulation();
};

const hideLoadingIndicator = () => {
  // Останавливаем интервалы
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  
  // Устанавливаем 100% перед скрытием
  updateProgress(100);
  
  // Ждем немного, чтобы показать 100%
  setTimeout(() => {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    // Показываем все canvas с плавным появлением
    const canvases = ['previewCanvasNarrow', 'previewCanvasSquare', 'previewCanvasWide'];
    canvases.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        canvas.style.display = 'block';
        // Используем requestAnimationFrame для плавного появления
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            canvas.style.opacity = '1';
          });
        });
      }
    });
  }, 300);
};

const updateProgress = (percent) => {
  currentProgress = Math.min(100, Math.max(0, percent));
  const progressBar = document.getElementById('progressBar');
  
  if (progressBar) {
    progressBar.style.width = `${currentProgress}%`;
  }
};

const startProgressSimulation = () => {
  // Симуляция прогресса (будет переопределена реальным прогрессом)
  let simulatedProgress = 0;
  
  if (progressInterval) {
    clearInterval(progressInterval);
  }
  
  progressInterval = setInterval(() => {
    // Медленно увеличиваем прогресс до 90% (остальные 10% будут при завершении)
    if (simulatedProgress < 90 && currentProgress < 90) {
      simulatedProgress = Math.min(90, simulatedProgress + Math.random() * 3);
      updateProgress(simulatedProgress);
    }
  }, 200);
};

const initialize = async () => {
  console.log('=== Начало инициализации ===');
  try {
    // Показываем индикатор загрузки сразу (до любых других операций)
    // Важно: показываем до проверки DOM, чтобы он был виден при обновлении страницы
    console.log('Проверяем наличие loadingIndicator...');
    const indicator = document.getElementById('loadingIndicator');
    console.log('loadingIndicator найден:', !!indicator);
    if (indicator) {
      indicator.style.display = 'flex';
      // Скрываем все canvas сразу
      const canvases = ['previewCanvasNarrow', 'previewCanvasSquare', 'previewCanvasWide'];
      canvases.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
          canvas.style.display = 'none';
          canvas.style.opacity = '0';
        }
      });
      // Инициализируем прогресс
      currentProgress = 0;
      updateProgress(0);
      startProgressSimulation();
    }
    
    // Опциональная загрузка конфигурации из config.json:
    // по умолчанию отключена, чтобы не создавать 404 в проде, где файла нет.
    const searchParams = new URLSearchParams(window.location.search);
    const shouldLoadConfig = window.APP_LOAD_CONFIG === true || searchParams.get('config') === '1';
    if (shouldLoadConfig) {
      console.log('Загружаем конфигурацию...');
      try {
        const configLoaded = await loadConfigFromFile();
        if (configLoaded) {
          console.log('✓ Конфигурация загружена из config.json');
        }
      } catch (error) {
        console.warn('Ошибка загрузки config.json (продолжаем с настройками по умолчанию):', error);
      }
    }
    
    // Загружаем размеры из конфига перед инициализацией
    console.log('Инициализируем размеры пресетов...');
    await initializePresetSizes();
    console.log('Размеры пресетов инициализированы');
    // Обновляем размеры в store
    updatePresetSizesFromConfig();
    // Убеждаемся, что есть выбранные размеры
    ensurePresetSelection();
    
    // Загружаем командные дефолты из config.json и локальные overrides из localStorage
    try {
      const defaults = getDefaultValues();
      if (defaults && Object.keys(defaults).length > 0) {
        const normalizedDefaults = { ...defaults };
        if (normalizedDefaults.fontFamily === 'system-ui') {
          normalizedDefaults.fontFamily = 'YS Text';
        }
        Object.keys(normalizedDefaults).forEach(key => {
          if (normalizedDefaults[key] !== undefined) {
            setKey(key, normalizedDefaults[key]);
          }
        });
        clearTextMeasurementCache();
      }
    } catch (e) {
      console.warn('Ошибка при загрузке сохраненных значений по умолчанию:', e);
    }
    
    // Загружаем сохраненные множители из localStorage
    try {
      const savedMultipliers = localStorage.getItem('format-multipliers');
      if (savedMultipliers) {
        const multipliers = JSON.parse(savedMultipliers);
        setKey('formatMultipliers', multipliers);
      }
    } catch (e) {
      console.warn('Ошибка при загрузке сохраненных множителей:', e);
    }
    
    // Загружаем название бренда и обновляем заголовок страницы
    try {
      const savedBrandName = localStorage.getItem('brandName');
      if (savedBrandName) {
        setKey('brandName', savedBrandName);
        document.title = 'AI-Craft';
      } else {
        // Используем значение из state
        const state = getState();
        if (state.brandName) {
          document.title = 'AI-Craft';
        }
      }
    } catch (e) {
      console.warn('Ошибка при загрузке названия бренда:', e);
    }
    
    // Инициализируем фавиконку
    try {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      const savedFavicon = localStorage.getItem('favicon');
      if (savedFavicon) {
        link.href = savedFavicon;
        const { getState, setKey } = await import('./state/store.js');
        if (!getState().favicon) setKey('favicon', savedFavicon);
      } else {
        // Используем фавиконку из папки fav по умолчанию
        link.href = 'fav/favicon.png';
        link.type = 'image/png';
      }
    } catch (e) {
      console.warn('Ошибка при загрузке фавиконки:', e);
    }
    
    console.log('Кешируем DOM элементы...');
    const dom = cacheDom();
    console.log('DOM элементы закешированы');
    
    // Проверяем наличие canvas элементов
    if (!dom.previewCanvasNarrow || !dom.previewCanvasWide || !dom.previewCanvasSquare) {
      console.error('Canvas элементы не найдены в DOM:', {
        narrow: !!dom.previewCanvasNarrow,
        wide: !!dom.previewCanvasWide,
        square: !!dom.previewCanvasSquare
      });
    } else {
      console.log('✓ Все canvas элементы найдены');
    }
    
    // Инициализируем старый canvas для обратной совместимости
    if (dom.previewCanvas) {
      renderer.initialize(dom.previewCanvas);
    }
    // Инициализируем новые canvas для мульти-превью
    if (dom.previewCanvasNarrow && dom.previewCanvasWide && dom.previewCanvasSquare) {
      renderer.initializeMulti(dom.previewCanvasNarrow, dom.previewCanvasWide, dom.previewCanvasSquare);
    } else {
      console.warn('Не все canvas элементы найдены, мульти-превью не инициализировано');
    }
    
    initializeStateSubscribers();

    initializeTabs();
    
    // Инициализируем переключатель языка (должен быть первым, чтобы язык был установлен до других инициализаций)
    initializeLanguageSelector();
    
    // Убеждаемся, что селектор языка видим после всех инициализаций
    setTimeout(() => {
      const languageSelector = document.querySelector('.language-selector');
      if (languageSelector) {
        languageSelector.style.display = 'flex';
      }
    }, 100);
    // Отложенная инициализация логотипов - будет выполнена при открытии модального окна
    initializeLogoToggle();
    initializeLogoPosToggle();
    await initializeProModeToggle();
    initializeTitleAlignToggle();
    initializeTitleVPosToggle();
    initializeKVPositionToggle();
    initializeBgPositionToggle();
    initializeBgVPositionToggle();
    initializeExportScaleToggle();
    initializeTitleTransformToggle();
    initializeSubtitleTransformToggle();
    initializeLegalTransformToggle();
    
    // Инициализируем менеджер размеров
    initializeSizeManager();
    initializeRsyaCanvasDrag();
    
    // Инициализируем resizers для изменения ширины панелей
    initPanelResizers();
    
    ensurePresetSelection();

    // Сначала экспортируем функции в глобальную область, чтобы они были доступны в HTML
    console.log('Экспортируем функции в window...');
    exposeGlobals();
    console.log('✓ Функции экспортированы в window');
    
    // Проверяем ключевые функции после экспорта
    const criticalFunctions = ['updateState', 'showSizesAdmin', 'showLogoAssetsAdmin', 'showSection', 'exportAllPNG', 'exportAllJPG'];
    criticalFunctions.forEach(funcName => {
      if (typeof window[funcName] === 'function') {
        console.log(`✓ ${funcName} доступна в window`);
      } else {
        console.error(`✗ ${funcName} НЕ доступна в window`);
      }
    });
    
    // Проверяем, что showSizesAdmin доступна сразу после exposeGlobals
    if (typeof window.showSizesAdmin === 'function') {
      console.log('✓ showSizesAdmin доступна в window после exposeGlobals');
    } else {
      console.error('✗ showSizesAdmin НЕ доступна в window после exposeGlobals');
      console.error('showSizesAdmin из импорта:', typeof showSizesAdmin);
      // Пытаемся добавить вручную, если не добавилось
      if (typeof showSizesAdmin === 'function') {
        window.showSizesAdmin = showSizesAdmin;
        console.log('✓ showSizesAdmin добавлена в window вручную');
      }
    }
    
    // Проверяем, что showLogoAssetsAdmin доступна сразу после exposeGlobals
    if (typeof window.showLogoAssetsAdmin === 'function') {
      console.log('✓ showLogoAssetsAdmin доступна в window после exposeGlobals');
    } else {
      console.error('✗ showLogoAssetsAdmin НЕ доступна в window после exposeGlobals');
      console.error('showLogoAssetsAdmin из импорта:', typeof showLogoAssetsAdmin);
      // Пытаемся добавить вручную, если не добавилось
      if (typeof showLogoAssetsAdmin === 'function') {
        window.showLogoAssetsAdmin = showLogoAssetsAdmin;
        console.log('✓ showLogoAssetsAdmin добавлена в window вручную');
      }
    }
    
    renderPresetSizes();
    renderCustomSizes();
    updatePreviewSizeSelect();
    syncFormFields();
    refreshMediaPreviews();
    updatePartnerLogoUI();
    console.log('Инициализируем обработчики событий...');
    initializeEventDelegation(dom);
    console.log('✓ Локальные обработчики событий инициализированы');
    
    // Инициализируем систему делегирования событий
    initEventDelegation();
    console.log('✓ Система делегирования событий инициализирована');
    
    // Инициализируем обработчики для чекбоксов напрямую
    initCheckboxHandlers();
    console.log('✓ Обработчики чекбоксов инициализированы');
    
    updateAddSizeButtonState();
    
    // Показываем раздел по умолчанию
    showSection('layout');
    
    // Обновляем интерфейс с учетом выбранного языка
    updateUI();
    
    // Обновляем сводку размеров ПОСЛЕ updateUI(), чтобы она не перезаписалась
    updateSizesSummary();

    // Убеждаемся, что есть выбранные размеры перед рендерингом
    ensurePresetSelection();
    
    // Функция для выполнения первого рендеринга после загрузки шрифтов
    const performInitialRender = async () => {
      // Проверяем, что canvas элементы действительно в DOM
      const narrow = document.getElementById('previewCanvasNarrow');
      const wide = document.getElementById('previewCanvasWide');
      const square = document.getElementById('previewCanvasSquare');
      
      if (!narrow || !wide || !square) {
        console.error('Canvas элементы не найдены в DOM при попытке рендеринга');
        updateProgress(100);
        hideLoadingIndicator();
        return;
      }
      
      // Проверяем, что есть выбранные размеры
      const sizes = getCheckedSizes();
      if (!sizes || sizes.length === 0) {
        console.warn('Нет выбранных размеров для рендеринга');
        updateProgress(100);
        hideLoadingIndicator();
        return;
      }
      
      // Ресурсы по умолчанию уже загружены, ждем только финальной загрузки шрифтов
      try {
        if (document.fonts && document.fonts.ready) {
          updateProgress(50);
          await document.fonts.ready;
          updateProgress(55);
        }
        // Дополнительная небольшая задержка для гарантии загрузки
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgress(60);
      } catch (error) {
        console.warn('Ошибка при ожидании загрузки шрифтов:', error);
        updateProgress(60);
      }
      
      // Обновляем прогресс: начало рендеринга (60-90%)
      updateProgress(65);
      console.log('Начинаем рендеринг превью, размеров:', sizes.length);
      
      // Рендерим
      renderer.render();
      updateProgress(70);
      
      // Ждем завершения рендеринга
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          updateProgress(85);
          requestAnimationFrame(() => {
            updateProgress(95);
            setTimeout(() => {
              // Скрываем индикатор загрузки после завершения рендеринга
              updateProgress(100);
              hideLoadingIndicator();
              resolve();
            }, 200);
          });
        });
      });
    };
    
    // Отложенная загрузка ресурсов - выполняется после показа UI
    // Это не блокирует отображение интерфейса
    setTimeout(async () => {
      try {
        // Сначала загружаем ресурсы по умолчанию для быстрого отображения
        const defaultState = getState();
        const defaultFontFamily = defaultState.titleFontFamily || defaultState.fontFamily || 'YS Text';
        const defaultLogo = defaultState.logoSelected || 'logo/white/ru/main.svg';
        const defaultKV = defaultState.kvSelected || DEFAULT_KV_PATH;
        
        updateProgress(10);
        
        // Сканируем шрифты и загружаем ресурсы по умолчанию параллельно
        console.log('Загружаем ресурсы по умолчанию...');
        const fontsPromise = scanFonts();
        
        // Загружаем логотип и KV параллельно
        const logoPromise = selectPreloadedLogo(defaultLogo).catch(error => {
          console.warn('Ошибка загрузки логотипа по умолчанию:', error);
        });
        
        const kvPromise = selectPreloadedKV(defaultKV).catch(error => {
          console.warn('Ошибка загрузки Визуал по умолчанию:', error);
        });
        
        // Ждем завершения сканирования шрифтов
        const fonts = await fontsPromise;
        setAvailableFonts(fonts);
        updateProgress(20);
        
        // Находим и загружаем шрифт по умолчанию (Regular начертание)
        const defaultFont = fonts.find(f => 
          f.family === defaultFontFamily && 
          f.weight === '400' && 
          f.style === 'normal'
        );
        
        const fontPromise = defaultFont ? loadFonts([defaultFont]) : Promise.resolve();
        
        // Ждем загрузки всех ресурсов по умолчанию параллельно
        await Promise.all([fontPromise, logoPromise, kvPromise]);
        updateProgress(40);
        
        // Теперь загружаем остальные Regular начертания для быстрой загрузки
        // Остальные шрифты будут загружаться по требованию
        const regularFonts = fonts.filter(f => 
          f.weight === '400' && 
          f.style === 'normal' &&
          (!defaultFont || f.family !== defaultFontFamily) // Не загружаем повторно шрифт по умолчанию
        );
        if (regularFonts.length > 0) {
          await loadFonts(regularFonts);
        }
        
        // Ждем загрузки шрифтов перед первым рендерингом
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        // Дополнительная задержка для гарантии загрузки
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Очищаем кэш измерений текста после загрузки шрифтов
        clearTextMeasurementCache();
        
        // Инициализируем dropdown для шрифтов после их загрузки
        initializeFontDropdown();
        initializeFontDropdowns();
        
        // Выполняем первый рендеринг после загрузки шрифтов
        await performInitialRender();
      } catch (error) {
        console.warn('Ошибка загрузки шрифтов:', error);
        // В случае ошибки все равно пытаемся отрендерить
        await performInitialRender();
        // performInitialRender сам скроет индикатор
      }
      
      // Отложенная инициализация логотипов и KV (при открытии модальных окон)
      // initializeLogoDropdown() и initializeKVDropdown() будут вызваны при открытии модальных окон
      
      // Ресурсы по умолчанию уже загружены выше, здесь только проверяем пары
      try {
        const initialState = getState();
        const pairs = initialState.titleSubtitlePairs || [];
        if (pairs.length > 0) {
          const activePair = pairs[initialState.activePairIndex || 0];
          const defaultKVValue = initialState.kvSelected || DEFAULT_KV_PATH;
          // Если в паре есть свой KV, загружаем его (если он отличается от дефолтного)
          if (activePair && activePair.kvSelected && activePair.kvSelected !== defaultKVValue) {
            await selectPreloadedKV(activePair.kvSelected);
            updateProgress(40);
          }
        }
      } catch (error) {
        console.warn('Ошибка загрузки KV для пары:', error);
      }
      
      // Инициализируем фон после загрузки основных ресурсов
      initializeBackgroundUI();
      await initWorkspacePanel();
    }, 0);
    
    // Проверяем, что showSizesAdmin доступна
    if (typeof window.showSizesAdmin === 'function') {
      console.log('showSizesAdmin доступна в window');
    } else {
      console.warn('showSizesAdmin не доступна в window');
    }
    
    // Проверяем, что showLogoAssetsAdmin доступна
    if (typeof window.showLogoAssetsAdmin === 'function') {
      console.log('showLogoAssetsAdmin доступна в window');
    } else {
      console.warn('showLogoAssetsAdmin не доступна в window');
    }
  } catch (error) {
    console.error('=== ОШИБКА ИНИЦИАЛИЗАЦИИ ===');
    console.error('Ошибка:', error);
    console.error('Сообщение:', error.message);
    console.error('Стек ошибки:', error.stack);
    console.error('Тип ошибки:', error.name);
    alert(`Ошибка загрузки приложения: ${error.message}\n\nПроверьте консоль браузера для подробностей.`);
  } finally {
    console.log('=== Инициализация завершена ===');
  }
};

// Регистрация Service Worker для кеширования (не блокируем загрузку при ошибках)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Регистрируем с задержкой, чтобы не блокировать основную загрузку
    setTimeout(() => {
      let isRefreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isRefreshing) return;
        isRefreshing = true;
        window.location.reload();
      });

      navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(window.APP_VERSION || 'dev')}`, { updateViaCache: 'none' })
        .then((registration) => {
          console.log('Service Worker зарегистрирован:', registration.scope);
          
          // Принудительно обновляем при изменении версии
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // Новый worker готов заменить старый без ручной очистки всего кеша.
                    console.log('Новая версия Service Worker установлена, активируем её...');
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    // Первая установка
                    console.log('Service Worker установлен впервые');
                  }
                }
              });
            }
          });
          
          // Принудительно проверяем обновления сразу
          registration.update();
          
          // Периодическая проверка нужна, но без агрессивного polling.
          setInterval(() => {
            registration.update();
          }, 5 * 60 * 1000);
          
          // Проверяем обновления при возвращении пользователя к приложению.
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update();
            }
          });
        })
        .catch((error) => {
          console.warn('Ошибка регистрации Service Worker (продолжаем работу без кеша):', error);
        });
    }, 1000);
  });
}

// Инициализация при загрузке страницы
console.log('main.js загружен, readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('Ожидаем DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded сработал, запускаем initialize');
    initialize().catch(error => {
      console.error('Критическая ошибка при инициализации:', error);
      alert(`Критическая ошибка загрузки: ${error.message}\n\nПроверьте консоль для подробностей.`);
    });
  });
} else {
  console.log('DOM уже готов, запускаем initialize немедленно');
  initialize().catch(error => {
    console.error('Критическая ошибка при инициализации:', error);
    alert(`Критическая ошибка загрузки: ${error.message}\n\nПроверьте консоль для подробностей.`);
  });
}

// Переключение темы
function toggleTheme() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  const currentTheme = themeToggle.getAttribute('data-value') || 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  // Обновляем тему
  const html = document.documentElement;
  if (newTheme === 'dark') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', newTheme);
  }
  localStorage.setItem('theme', newTheme);
  
  // Обновляем toggle switch
  updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  themeToggle.setAttribute('data-value', theme);
  
  // Обновляем активную опцию
  const options = themeToggle.querySelectorAll('.toggle-switch-option');
  options.forEach(option => {
    if (option.getAttribute('data-value') === theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  // Обновляем позицию слайдера
  const slider = themeToggle.querySelector('.toggle-switch-slider');
  if (slider) {
    if (theme === 'light') {
      slider.style.transform = 'translateX(100%)';
    } else {
      slider.style.transform = 'translateX(0)';
    }
  }
}

// Инициализация темы при загрузке
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const html = document.documentElement;
  
  if (savedTheme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }
  
  // Устанавливаем состояние toggle switch
  updateThemeToggle(savedTheme);
  
  // Добавляем обработчик клика на toggle switch
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTheme();
    });
  }
}

// Делаем функции доступными глобально
window.toggleTheme = toggleTheme;

// Инициализируем тему сразу при загрузке скрипта (до отображения страницы)
initTheme();
