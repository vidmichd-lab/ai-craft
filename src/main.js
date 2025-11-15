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
  updateTitleSize,
  updateSubtitleSize,
    updateTitleSubtitleRatio,
  updateLegalSize,
  updateAgeSize,
  updateKVBorderRadius,
  selectKVPosition,
  updateTextGradientOpacity,
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
  selectLayoutMode,
  updateColorFromPicker,
  updateColorFromHex,
  selectBgPosition,
  selectBgVPosition,
  applyPresetBgColor,
  handleLogoUpload,
  handlePartnerLogoUpload,
  handleKVUpload,
  handleBgUpload,
  clearLogo,
  clearPartnerLogo,
  showPartnerLogoSection,
  clearKV,
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
  initializeBackgroundUI,
  initializeSizeManager
} from './ui/ui.js';
import { renderer } from './renderer.js';
import { clearTextMeasurementCache } from './renderer/text.js';
import { setKey, getState, ensurePresetSelection, getCheckedSizes, updatePresetSizesFromConfig } from './state/store.js';
import { exportPNG, exportJPG } from './exporter.js';
import { scanFonts } from './utils/assetScanner.js';
import { setAvailableFonts, initializePresetSizes } from './constants.js';

const initializeEventDelegation = (dom) => {
  dom.presetSizesList.addEventListener('click', handlePresetContainerClick);
  if (dom.previewSizeSelect) {
    dom.previewSizeSelect.addEventListener('change', (event) => changePreviewSize(event.target.value));
  }
  // Обработчики для кастомных дропдаунов превью форматов больше не нужны
  // они обрабатываются напрямую в updatePreviewSizeSelect
};

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
          // Принудительно очищаем кэш измерения текста перед рендерингом для начертаний
          clearTextMeasurementCache();
          // Используем синхронный рендеринг для немедленного отображения изменений
          try {
            renderer.renderSync();
          } catch (renderError) {
            console.error('Ошибка синхронного рендеринга:', renderError);
            // Пробуем асинхронный рендеринг как fallback
            renderer.render();
          }
        } else {
          // Асинхронный рендеринг для остальных изменений
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
    updateTitleSize,
    updateSubtitleSize,
    updateTitleSubtitleRatio,
    updateAgeSize,
    updateKVBorderRadius,
    updateTextGradientOpacity,
    selectPreloadedLogo,
    selectPreloadedKV,
    handleLogoUpload,
    handlePartnerLogoUpload,
    handleKVUpload,
    handleBgUpload,
    clearLogo,
    clearPartnerLogo,
    showPartnerLogoSection,
    clearKV,
    clearBg,
    selectTitleAlign,
    selectTitleVPos,
    selectLogoPos,
    toggleLogoPos,
    selectLogoLanguage,
    toggleLogoLanguage,
    toggleTitleAlign,
    toggleTitleVPos,
    selectLayoutMode,
    updateColorFromPicker,
    updateColorFromHex,
  applyPresetBgColor,
  selectBgPosition,
  selectBgVPosition,
  selectKVPosition,
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
    refreshAllAssets,
    openLogoSelectModal,
    closeLogoSelectModal,
    openKVSelectModal,
    closeKVSelectModal,
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
};

// Функция для динамической загрузки шрифтов через @font-face
const loadFonts = async (fonts) => {
  // Создаем стиль для @font-face правил
  let styleElement = document.getElementById('dynamic-fonts');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'dynamic-fonts';
    document.head.appendChild(styleElement);
  }
  
  // Группируем шрифты по семейству для более эффективной загрузки
  const fontGroups = new Map();
  fonts.forEach(font => {
    if (!fontGroups.has(font.family)) {
      fontGroups.set(font.family, []);
    }
    fontGroups.get(font.family).push(font);
  });
  
  // Создаем @font-face правила для каждого шрифта
  let fontFaceRules = '';
  
  fontGroups.forEach((familyFonts, family) => {
    familyFonts.forEach(font => {
      if (font.file) {
        // Определяем формат файла по расширению
        const ext = font.file.split('.').pop().toLowerCase();
        let format = 'truetype';
        if (ext === 'woff') format = 'woff';
        else if (ext === 'woff2') format = 'woff2';
        else if (ext === 'otf') format = 'opentype';
        
        // Создаем уникальный идентификатор для каждого шрифта
        const fontId = `${family}-${font.weight}-${font.style}`.replace(/\s+/g, '-');
        
        fontFaceRules += `
@font-face {
  font-family: '${family}';
  src: url('${font.file}') format('${format}');
  font-weight: ${font.weight};
  font-style: ${font.style};
  font-display: swap;
}
`;
      }
    });
  });
  
  // Добавляем правила в style элемент
  if (fontFaceRules.trim()) {
    styleElement.textContent = fontFaceRules;
  }
  
  // Предзагружаем только Regular начертания для быстрой загрузки
  const preloadLinks = [];
  const preloadedFamilies = new Set();
  
  fonts.forEach(font => {
    // Предзагружаем только Regular (400, normal) начертания для каждого семейства
    if (font.file && font.weight === '400' && font.style === 'normal' && !preloadedFamilies.has(font.family)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      const ext = font.file.split('.').pop().toLowerCase();
      link.type = `font/${ext}`;
      link.href = font.file;
      link.crossOrigin = 'anonymous';
      preloadLinks.push(link);
      preloadedFamilies.add(font.family);
    }
  });
  
  // Добавляем preload ссылки в head
  preloadLinks.forEach(link => {
    document.head.appendChild(link);
  });
  
};

const initialize = async () => {
  try {
    // Загружаем размеры из конфига перед инициализацией
    await initializePresetSizes();
    // Обновляем размеры в store
    updatePresetSizesFromConfig();
    // Убеждаемся, что есть выбранные размеры
    ensurePresetSelection();
    
    // Загружаем шрифты из папки font/
    const fonts = await scanFonts();
    
    // Обновляем список доступных шрифтов
    setAvailableFonts(fonts);
    
    // Загружаем шрифты через @font-face
    await loadFonts(fonts);
    
    const dom = cacheDom();
    
    // Проверяем наличие canvas элементов
    if (!dom.previewCanvasNarrow || !dom.previewCanvasWide || !dom.previewCanvasSquare) {
      console.error('Canvas элементы не найдены в DOM:', {
        narrow: !!dom.previewCanvasNarrow,
        wide: !!dom.previewCanvasWide,
        square: !!dom.previewCanvasSquare
      });
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
    initializeLogoDropdown();
    initializeLogoToggle();
    initializeLogoPosToggle();
    initializeTitleAlignToggle();
    initializeTitleVPosToggle();
    initializeKVPositionToggle();
    initializeBgPositionToggle();
    initializeBgVPositionToggle();
    initializeExportScaleToggle();
    initializeTitleTransformToggle();
    initializeSubtitleTransformToggle();
    initializeLegalTransformToggle();
    
    // Инициализируем dropdown для шрифтов после их загрузки
    initializeFontDropdown();
    
    // Инициализируем dropdown для шрифтов в каждом разделе
    initializeFontDropdowns();
    
    initializeKVDropdown();
    
    // Инициализируем фон
    initializeBackgroundUI();
    
    // Инициализируем менеджер размеров
    initializeSizeManager();
    
    ensurePresetSelection();
    
    // Загружаем логотип и KV, но не блокируем рендеринг при ошибках
    try {
      await selectPreloadedLogo(getState().logoSelected);
    } catch (error) {
      console.warn('Ошибка загрузки логотипа:', error);
    }
    
    // Загружаем KV из активной пары, если есть, иначе используем значение по умолчанию
    try {
      const initialState = getState();
      const pairs = initialState.titleSubtitlePairs || [];
      const activePair = pairs[initialState.activePairIndex || 0];
      const kvToLoad = (activePair && activePair.kvSelected) || initialState.kvSelected || 'assets/3d/sign/01.png';
      if (kvToLoad) {
        await selectPreloadedKV(kvToLoad);
      }
    } catch (error) {
      console.warn('Ошибка загрузки KV:', error);
    }

    // Сначала экспортируем функции в глобальную область, чтобы они были доступны в HTML
    exposeGlobals();
    
    // Проверяем, что showSizesAdmin доступна сразу после exposeGlobals
    if (typeof window.showSizesAdmin === 'function') {
      console.log('✓ showSizesAdmin доступна в window после exposeGlobals');
    } else {
      console.error('✗ showSizesAdmin НЕ доступна в window после exposeGlobals');
    }
    
    renderPresetSizes();
    renderCustomSizes();
    updatePreviewSizeSelect();
    syncFormFields();
    refreshMediaPreviews();
    updatePartnerLogoUI();
    updateSizesSummary();
    initializeEventDelegation(dom);
    
    // Инициализируем систему делегирования событий
    initEventDelegation();
    
    // Инициализируем обработчики для чекбоксов напрямую
    initCheckboxHandlers();
    
    updateAddSizeButtonState();
    
    // Показываем раздел по умолчанию
    showSection('layout');

    // Убеждаемся, что есть выбранные размеры перед рендерингом
    ensurePresetSelection();
    
    // Рендерим после небольшой задержки, чтобы убедиться, что все инициализировано
    // Используем requestAnimationFrame для гарантии, что DOM готов
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Проверяем, что canvas элементы действительно в DOM
        const narrow = document.getElementById('previewCanvasNarrow');
        const wide = document.getElementById('previewCanvasWide');
        const square = document.getElementById('previewCanvasSquare');
        
        if (!narrow || !wide || !square) {
          console.error('Canvas элементы не найдены в DOM при попытке рендеринга');
          return;
        }
        
        // Проверяем, что есть выбранные размеры
        const sizes = getCheckedSizes();
        if (!sizes || sizes.length === 0) {
          console.warn('Нет выбранных размеров для рендеринга');
          return;
        }
        
        console.log('Начинаем рендеринг превью, размеров:', sizes.length);
        renderer.render();
      }, 100);
    });
    
    // Проверяем, что showSizesAdmin доступна
    if (typeof window.showSizesAdmin === 'function') {
      console.log('showSizesAdmin доступна в window');
    } else {
      console.warn('showSizesAdmin не доступна в window');
    }
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    console.error('Стек ошибки:', error.stack);
    alert(`Ошибка загрузки приложения: ${error.message}\n\nПроверьте консоль браузера для подробностей.`);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
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


