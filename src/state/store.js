import { PRESET_SIZES, FONT_NAME_TO_WEIGHT, FONT_WEIGHT_TO_NAME, getPRESET_SIZES } from '../constants.js';
import { getPresetSizes } from '../utils/sizesConfig.js';

const TITLE_SUBTITLE_RATIO = 1 / 2;

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

const createTitleSubtitlePair = (index = 0, baseState = null) => {
  const brandName = (baseState && baseState.brandName) || 'Практикума';
  
  // Получаем значения по умолчанию из localStorage, если есть
  let defaultTitle = `Курс «Frontend-разработчик» от ${brandName}`;
  let defaultSubtitle = 'Научитесь писать код для сайтов и веб-сервисов — с нуля за 10 месяцев';
  let defaultKV = 'assets/3d/sign/01.webp';
  
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('default-values');
      if (saved) {
        const savedDefaults = JSON.parse(saved);
        if (savedDefaults.title) defaultTitle = savedDefaults.title;
        if (savedDefaults.subtitle) defaultSubtitle = savedDefaults.subtitle;
        if (savedDefaults.kvSelected) defaultKV = savedDefaults.kvSelected;
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  
  return {
    id: `pair-${Date.now()}-${index}`,
    title: index === 0 ? defaultTitle : '',
    subtitle: index === 0 ? defaultSubtitle : '',
    kvSelected: index === 0 ? defaultKV : '', // KV для этой пары
    bgImageSelected: null, // Фоновое изображение для этой пары
    bgColor: (baseState && baseState.bgColor) || '#1e1e1e'
  };
};

const createInitialState = () => {
  // Получаем размеры из конфига (или дефолтные, если еще не загружены)
  const sizes = getPresetSizes();
  // Получаем brandName из localStorage, если есть
  const savedBrandName = typeof localStorage !== 'undefined' ? localStorage.getItem('brandName') : null;
  const brandName = savedBrandName || 'Практикума';
  
  // Загружаем значения по умолчанию из localStorage (если есть)
  let savedDefaults = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('default-values');
      if (saved) {
        savedDefaults = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Ошибка при загрузке default-values из localStorage:', e);
    }
  }
  
  // Функция-хелпер для получения значения из savedDefaults или дефолтного значения
  const getValue = (key, defaultValue) => {
    if (savedDefaults && savedDefaults.hasOwnProperty(key)) {
      return savedDefaults[key];
    }
    return defaultValue;
  };
  
  // Загружаем пользовательские охранные области из localStorage
  let userSafeAreas = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('user-safe-areas');
      if (saved) {
        userSafeAreas = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Ошибка при загрузке user-safe-areas из localStorage:', e);
    }
  }
  
  // Загружаем множители размера логотипа из localStorage
  let logoSizeMultipliers = null;
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('logoSizeMultipliers');
      if (saved) {
        logoSizeMultipliers = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Ошибка при загрузке logoSizeMultipliers из localStorage:', e);
    }
  }
  
  return {
    paddingPercent: getValue('paddingPercent', 5),
    // Массивы заголовков и подзаголовков
    titleSubtitlePairs: [createTitleSubtitlePair(0, { bgColor: getValue('bgColor', '#1e1e1e'), brandName })],
    activePairIndex: 0, // Индекс активной пары для отображения на превью
    // Общие настройки для всех заголовков
    titleColor: getValue('titleColor', '#ffffff'),
    titleAlign: getValue('titleAlign', 'left'),
    titleVPos: getValue('titleVPos', 'top'),
    titleSize: getValue('titleSize', 8),
    titleWeight: getValue('titleWeight', 'Regular'), // Используем название начертания вместо цифр
    titleLetterSpacing: getValue('titleLetterSpacing', 0),
    titleLineHeight: getValue('titleLineHeight', 1.1),
    titleFontFamily: getValue('titleFontFamily', null) || getValue('fontFamily', 'YS Text'),
    titleFontFamilyFile: null,
    titleCustomFont: null, // URL blob для загруженного шрифта
    titleCustomFontName: null, // Имя загруженного файла
    titleTransform: 'none', // Преобразование регистра заголовка
    // Общие настройки для всех подзаголовков
    subtitleColor: getValue('subtitleColor', '#e0e0e0'),
    subtitleOpacity: getValue('subtitleOpacity', 90),
    subtitleAlign: getValue('subtitleAlign', 'left'),
    subtitleSize: getValue('subtitleSize', 4),
    subtitleWeight: getValue('subtitleWeight', 'Regular'), // Используем название начертания вместо цифр
    subtitleLetterSpacing: getValue('subtitleLetterSpacing', 0),
    subtitleLineHeight: getValue('subtitleLineHeight', 1.2),
    subtitleGap: getValue('subtitleGap', -1),
    titleSubtitleRatio: getValue('titleSubtitleRatio', 0.5), // Коэффициент зависимости размера подзаголовка от заголовка (0.5 = подзаголовок в 2 раза меньше)
    subtitleFontFamily: getValue('subtitleFontFamily', null) || getValue('fontFamily', 'YS Text'),
    subtitleFontFamilyFile: null,
    subtitleCustomFont: null,
    subtitleCustomFontName: null,
    subtitleTransform: 'none', // Преобразование регистра подзаголовка
    // Обратная совместимость (используются для рендеринга активной пары)
    title: getValue('title', `Курс «Frontend-разработчик» от ${brandName}`), // Использует brandName из state
    subtitle: getValue('subtitle', 'Научитесь писать код для сайтов и веб-сервисов — с нуля за 10 месяцев'),
    legal: getValue('legal', 'Рекламодатель АНО ДПО «Образовательные технологии Яндекса», действующая на основании лицензии N° ЛО35-01298-77/00185314 от 24 марта 2015 года, 119021, г. Москва, ул. Тимура Фрунзе, д. 11, к. 2. ОГРН 1147799006123 Сайт: https://practicum.yandex.ru/'),
    legalKZ: '*Жарнама / Реклама. ТОО "Y. Izdeu men Jarnama", регистрационный номер:170240015454 Сайт: https://practicum.yandex.kz/.',
    legalColor: getValue('legalColor', '#ffffff'),
    legalOpacity: getValue('legalOpacity', 60),
    legalAlign: getValue('legalAlign', 'left'),
    legalSize: getValue('legalSize', 2),
    legalTransform: 'none', // Преобразование регистра юридического текста
    legalWeight: getValue('legalWeight', 'Regular'), // Используем название начертания вместо цифр
    legalLetterSpacing: getValue('legalLetterSpacing', 0),
    legalLineHeight: getValue('legalLineHeight', 1.4),
    age: getValue('age', '18+'),
    ageGapPercent: getValue('ageGapPercent', 1),
    ageSize: getValue('ageSize', 4),
    ageWeight: getValue('ageWeight', 'Regular'), // Используем название начертания вместо цифр
    showLogo: true,
    showSubtitle: true,
    hideSubtitleOnWide: false,
    showLegal: true,
    showAge: true,
    showKV: true,
    showBlocks: false,
    showGuides: false,
    logo: null,
    logoSelected: getValue('logoSelected', 'logo/white/ru/main.svg'),
    logoSize: getValue('logoSize', 40),
    logoLanguage: getValue('logoLanguage', 'ru'), // ru или kz
    partnerLogo: null,
    partnerLogoFile: getValue('partnerLogoFile', null),
    kv: null,
    kvSelected: getValue('kvSelected', 'assets/3d/sign/01.webp'),
    kvBorderRadius: getValue('kvBorderRadius', 0),
    kvPosition: getValue('kvPosition', 'center'), // 'left', 'center', 'right' - позиция KV (не применяется к широким макетам)
    bgColor: getValue('bgColor', '#1e1e1e'),
    bgGradient: getValue('bgGradient', null), // { type: 'linear'|'radial'|'angular'|'diamond', stops: [{color, position, alpha}], angle: number }
    bgGradientAngle: getValue('bgGradientAngle', 0), // Угол градиента (0-360)
    bgImage: null,
    bgSize: getValue('bgSize', 'cover'),
    bgPosition: getValue('bgPosition', 'center'),
    bgVPosition: getValue('bgVPosition', 'center'), // 'top', 'center', 'bottom' - вертикальная позиция фона
    bgImageSize: getValue('bgImageSize', 100), // Размер изображения в процентах (10-500)
    textGradientOpacity: getValue('textGradientOpacity', 100), // Прозрачность градиентной подложки под текстом (0-100)
    centerTextOverlayOpacity: 20, // Прозрачность подложки для центрированного текста (0-100)
    logoPos: getValue('logoPos', 'left'),
    fontFamily: getValue('fontFamily', 'YS Text'), // Общая гарнитура (для обратной совместимости)
    fontFamilyFile: null,
    customFont: null,
    legalFontFamily: getValue('legalFontFamily', null) || getValue('fontFamily', 'YS Text'),
    legalFontFamilyFile: null,
    legalCustomFont: null,
    // Figma интеграция
    figmaMode: getValue('figmaMode', 'constructor'), // 'constructor' или 'figma'
    figmaUrl: getValue('figmaUrl', ''),
    figmaData: getValue('figmaData', null), // { fileKey, nodeId, imageUrl, image, bounds }
    legalCustomFontName: null,
    ageFontFamily: (getValue('ageFontFamily', null) || getValue('fontFamily', 'YS Text')),
    ageFontFamilyFile: null,
    ageCustomFont: null,
    ageCustomFontName: null,
    presetSizes: cloneDeep(sizes),
    customSizes: [], // Кастомные размеры: [{ width, height, checked, id }]
    namePrefix: 'layout',
    kvCanvasWidth: null,
    kvCanvasHeight: null,
    exportScale: 1, // Масштаб экспорта: 1, 2, 3 или 4
    brandName: brandName, // Название бренда для использования в интерфейсе
    layoutMode: getValue('layoutMode', 'auto'),
    // Настройки веса файла при экспорте
    maxFileSizeUnit: getValue('maxFileSizeUnit', 'KB'), // 'KB' или 'MB'
    maxFileSizeValue: getValue('maxFileSizeValue', 150), // Значение (например, 1 для 1MB или 150 для 150KB)
    // Настройки рамки для Хабра
    habrBorderEnabled: getValue('habrBorderEnabled', false), // Включена ли рамка для Хабра
    habrBorderColor: getValue('habrBorderColor', '#D5DDDF'), // Цвет рамки для Хабра
    // Охранные области для специфичных платформ (игнорируют paddingPercent)
    // Пользовательские значения имеют приоритет над дефолтными
    safeAreas: userSafeAreas || getValue('safeAreas', {
      'Ozon': {
        '2832x600': { width: 2100, height: 570 },
        '1080x450': { width: 1020, height: 405 }
      },
      'РСЯ': {
        '1600x1200': { width: 900, height: 900 }
      }
    }),
    // Множители размера логотипа для конкретных размеров
    logoSizeMultipliers: logoSizeMultipliers || getValue('logoSizeMultipliers', {})
  };
};

class Store {
  constructor(initialState) {
    this.state = initialState;
    this.listeners = new Set();
    this.isBatch = false;
    this.pending = false;
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    if (this.isBatch) {
      this.pending = true;
      return;
    }
    this.listeners.forEach((listener) => listener(this.state));
  }

  batch(callback) {
    this.isBatch = true;
    try {
      callback();
    } finally {
      this.isBatch = false;
      if (this.pending) {
        this.pending = false;
        this.notify();
      }
    }
  }

  setState(partial) {
    const nextState = typeof partial === 'function' ? partial(this.state) : { ...this.state, ...partial };
    this.state = applyDerivedState(nextState, partial);
    this.notify();
  }

  setKey(key, value) {
    if (this.state[key] === value) return;
    const next = { ...this.state, [key]: value };
    this.state = applyDerivedState(next, { [key]: value });
    this.notify();
  }

  reset() {
    this.state = createInitialState();
    this.notify();
  }
}

const applyDerivedState = (state, delta) => {
  if (!delta) return state;
  const next = { ...state };

  // Определяем ключи изменений
  const deltaKeys = delta && typeof delta === 'object' ? delta : {};

  // Используем коэффициент из состояния, если он задан, иначе используем значение по умолчанию
  const ratio = state.titleSubtitleRatio !== undefined ? state.titleSubtitleRatio : TITLE_SUBTITLE_RATIO;
  if ('titleSize' in deltaKeys) {
    next.subtitleSize = parseFloat((state.titleSize * ratio).toFixed(2));
  }

  if ('subtitleSize' in deltaKeys) {
    next.titleSize = parseFloat((state.subtitleSize / ratio).toFixed(2));
  }

  // Автоматически обновляем лигал при изменении языка логотипа
  if ('logoLanguage' in deltaKeys) {
    const logoLanguage = delta.logoLanguage || state.logoLanguage || 'ru';
    if (logoLanguage === 'kz') {
      const legalKZ = state.legalKZ || '*Жарнама / Реклама. ТОО "Y. Izdeu men Jarnama", регистрационный номер:170240015454 Сайт: https://practicum.yandex.kz/.';
      next.legal = legalKZ;
    } else if (logoLanguage === 'ru') {
      const legalRU = 'Рекламодатель АНО ДПО «Образовательные технологии Яндекса», действующая на основании лицензии N° ЛО35-01298-77/00185314 от 24 марта 2015 года, 119021, г. Москва, ул. Тимура Фрунзе, д. 11, к. 2. ОГРН 1147799006123 Сайт: https://practicum.yandex.ru/';
      next.legal = legalRU;
    }
  }

  // Автоматически применяем шрифт по умолчанию ко всем текстовым элементам при его изменении
  if ('fontFamily' in deltaKeys && delta.fontFamily) {
    const newFontFamily = delta.fontFamily === 'system-ui' ? 'YS Text' : delta.fontFamily;
    const fontFile = delta.fontFamilyFile || state.fontFamilyFile || null;
    
    // Обновляем все текстовые шрифты, если они не были изменены индивидуально
    // (т.е. если они равны старому fontFamily)
    if (state.titleFontFamily === state.fontFamily || !state.titleFontFamily) {
      next.titleFontFamily = newFontFamily;
      next.titleFontFamilyFile = fontFile;
    }
    if (state.subtitleFontFamily === state.fontFamily || !state.subtitleFontFamily) {
      next.subtitleFontFamily = newFontFamily;
      next.subtitleFontFamilyFile = fontFile;
    }
    if (state.legalFontFamily === state.fontFamily || !state.legalFontFamily) {
      next.legalFontFamily = newFontFamily;
      next.legalFontFamilyFile = fontFile;
    }
    if (state.ageFontFamily === state.fontFamily || !state.ageFontFamily) {
      next.ageFontFamily = newFontFamily;
      next.ageFontFamilyFile = fontFile;
    }
  }

  // Синхронизируем активную пару с полями title/subtitle/kvSelected/bgImageSelected для обратной совместимости
  if (next.titleSubtitlePairs && next.titleSubtitlePairs.length > 0) {
    const activeIndex = next.activePairIndex || 0;
    const activePair = next.titleSubtitlePairs[activeIndex];
    if (activePair) {
      next.title = activePair.title || '';
      next.subtitle = activePair.subtitle || '';
      // Синхронизируем KV из активной пары
      if (activePair.kvSelected !== undefined) {
        next.kvSelected = activePair.kvSelected || '';
      }
      // Синхронизируем фоновое изображение из активной пары
      if (activePair.bgImageSelected !== undefined) {
        // Если bgImage уже является объектом Image и соответствует bgImageSelected, не перезаписываем
        const currentBgImage = next.bgImage;
        const bgImageSelected = activePair.bgImageSelected;
        
        if (bgImageSelected === null || bgImageSelected === '') {
          next.bgImage = null;
        } else if (typeof bgImageSelected === 'string') {
          // Если bgImageSelected - строка (путь), проверяем, не является ли текущий bgImage уже загруженным объектом Image с этим путем
          if (currentBgImage && typeof currentBgImage === 'object' && currentBgImage.src) {
            // Нормализуем пути для сравнения (убираем протокол и хост для относительных путей)
            const normalizePath = (path) => {
              try {
                const url = new URL(path, window.location.href);
                return url.pathname + url.search + url.hash;
              } catch {
                return path;
              }
            };
            const currentPath = normalizePath(currentBgImage.src);
            const selectedPath = normalizePath(bgImageSelected);
            
            // Если текущий bgImage - объект Image и его путь соответствует bgImageSelected, оставляем его
            if (currentPath === selectedPath || currentBgImage.src === bgImageSelected || 
                currentBgImage.src.endsWith(bgImageSelected) || currentPath.endsWith(selectedPath)) {
              // Не перезаписываем - оставляем загруженный объект Image
            } else {
              // Путь изменился, нужно будет загрузить новое изображение (но не здесь, это сделает UI)
              next.bgImage = bgImageSelected;
            }
          } else {
            // Текущий bgImage не является объектом Image, устанавливаем строку
            next.bgImage = bgImageSelected;
          }
        } else {
          // bgImageSelected уже является объектом Image
          next.bgImage = bgImageSelected;
        }
      }

      if (activePair.bgColor !== undefined && !('bgColor' in deltaKeys)) {
        next.bgColor = activePair.bgColor || '#1e1e1e';
      }
    }
  }

  return next;
};

export const store = new Store(createInitialState());

// Экспортируем функцию для получения реальных значений по умолчанию
export const getDefaultValues = () => {
  // Сначала пытаемся загрузить из localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('default-values');
      if (saved) {
        const savedDefaults = JSON.parse(saved);
        // Возвращаем значения из localStorage, если они есть
        return {
          logoSelected: savedDefaults.logoSelected,
          kvSelected: savedDefaults.kvSelected,
          title: savedDefaults.title,
          subtitle: savedDefaults.subtitle,
          legal: savedDefaults.legal,
          age: savedDefaults.age,
          bgColor: savedDefaults.bgColor,
          bgImage: savedDefaults.bgImage,
          titleColor: savedDefaults.titleColor,
          subtitleColor: savedDefaults.subtitleColor,
          subtitleOpacity: savedDefaults.subtitleOpacity,
          legalColor: savedDefaults.legalColor,
          legalOpacity: savedDefaults.legalOpacity,
          titleAlign: savedDefaults.titleAlign,
          subtitleAlign: savedDefaults.subtitleAlign,
          legalAlign: savedDefaults.legalAlign,
          titleVPos: savedDefaults.titleVPos,
          titleSize: savedDefaults.titleSize,
          subtitleSize: savedDefaults.subtitleSize,
          titleSubtitleRatio: savedDefaults.titleSubtitleRatio,
          legalSize: savedDefaults.legalSize,
          ageSize: savedDefaults.ageSize,
          logoSize: savedDefaults.logoSize,
          titleWeight: savedDefaults.titleWeight,
          subtitleWeight: savedDefaults.subtitleWeight,
          legalWeight: savedDefaults.legalWeight,
          ageWeight: savedDefaults.ageWeight,
          titleLetterSpacing: savedDefaults.titleLetterSpacing,
          subtitleLetterSpacing: savedDefaults.subtitleLetterSpacing,
          legalLetterSpacing: savedDefaults.legalLetterSpacing,
          titleLineHeight: savedDefaults.titleLineHeight,
          subtitleLineHeight: savedDefaults.subtitleLineHeight,
          legalLineHeight: savedDefaults.legalLineHeight,
          subtitleGap: savedDefaults.subtitleGap,
          ageGapPercent: savedDefaults.ageGapPercent,
          logoPos: savedDefaults.logoPos,
          logoLanguage: savedDefaults.logoLanguage,
          partnerLogoFile: savedDefaults.partnerLogoFile,
          kvBorderRadius: savedDefaults.kvBorderRadius,
          kvPosition: savedDefaults.kvPosition,
          bgSize: savedDefaults.bgSize,
          bgImageSize: savedDefaults.bgImageSize,
          bgPosition: savedDefaults.bgPosition,
          bgVPosition: savedDefaults.bgVPosition,
          textGradientOpacity: savedDefaults.textGradientOpacity,
          paddingPercent: savedDefaults.paddingPercent,
          layoutMode: savedDefaults.layoutMode,
          fontFamily: savedDefaults.fontFamily
        };
      }
    } catch (e) {
      console.warn('Ошибка при загрузке default-values из localStorage в getDefaultValues:', e);
    }
  }
  
  // Если в localStorage нет значений, используем значения из createInitialState
  const initialState = createInitialState();
  // Возвращаем только те значения, которые используются в админке
  return {
    logoSelected: initialState.logoSelected,
    kvSelected: initialState.kvSelected,
    title: initialState.title,
    subtitle: initialState.subtitle,
    legal: initialState.legal,
    age: initialState.age,
    bgColor: initialState.bgColor,
    bgImage: initialState.bgImage,
    titleColor: initialState.titleColor,
    subtitleColor: initialState.subtitleColor,
    subtitleOpacity: initialState.subtitleOpacity,
    legalColor: initialState.legalColor,
    legalOpacity: initialState.legalOpacity,
    titleAlign: initialState.titleAlign,
    subtitleAlign: initialState.subtitleAlign,
    legalAlign: initialState.legalAlign,
    titleVPos: initialState.titleVPos,
    titleSize: initialState.titleSize,
    subtitleSize: initialState.subtitleSize,
    titleSubtitleRatio: initialState.titleSubtitleRatio,
    legalSize: initialState.legalSize,
    ageSize: initialState.ageSize,
    logoSize: initialState.logoSize,
    titleWeight: initialState.titleWeight,
    subtitleWeight: initialState.subtitleWeight,
    legalWeight: initialState.legalWeight,
    ageWeight: initialState.ageWeight,
    titleLetterSpacing: initialState.titleLetterSpacing,
    subtitleLetterSpacing: initialState.subtitleLetterSpacing,
    legalLetterSpacing: initialState.legalLetterSpacing,
    titleLineHeight: initialState.titleLineHeight,
    subtitleLineHeight: initialState.subtitleLineHeight,
    legalLineHeight: initialState.legalLineHeight,
    subtitleGap: initialState.subtitleGap,
    ageGapPercent: initialState.ageGapPercent,
    logoPos: initialState.logoPos,
    logoLanguage: initialState.logoLanguage,
    partnerLogoFile: initialState.partnerLogoFile,
    kvBorderRadius: initialState.kvBorderRadius,
    kvPosition: initialState.kvPosition,
    bgSize: initialState.bgSize,
    bgImageSize: initialState.bgImageSize,
    bgPosition: initialState.bgPosition,
    bgVPosition: initialState.bgVPosition,
    textGradientOpacity: initialState.textGradientOpacity,
    paddingPercent: initialState.paddingPercent,
    layoutMode: initialState.layoutMode,
    fontFamily: initialState.fontFamily
  };
};

export const getState = () => store.getState();
export const subscribe = (listener) => store.subscribe(listener);
export const batch = (fn) => store.batch(fn);
export const setState = (partial) => store.setState(partial);
export const setKey = (key, value) => store.setKey(key, value);
export const resetState = () => store.reset();
export const createStateSnapshot = () => cloneDeep(store.getState());

export const restoreState = (snapshot) => {
  store.state = applyDerivedState({ ...snapshot }, snapshot);
  store.notify();
};

export const updateNestedPreset = (platform, index, updater) => {
  const presets = createStateSnapshot().presetSizes;
  if (!presets[platform] || !presets[platform][index]) return;
  presets[platform][index] = updater({ ...presets[platform][index] });
  setKey('presetSizes', presets);
};

export const resetPresetSizes = (checked) => {
  const presets = cloneDeep(getPresetSizes());
  Object.values(presets).forEach((sizes) => sizes.forEach((size) => (size.checked = checked)));
  setKey('presetSizes', presets);
};

// Функция для обновления размеров из конфига
export const updatePresetSizesFromConfig = () => {
  const sizes = getPresetSizes();
  setKey('presetSizes', cloneDeep(sizes));
};

// Функции для управления парами заголовок/подзаголовок
export const addTitleSubtitlePair = () => {
  const state = getState();
  const newPair = createTitleSubtitlePair(state.titleSubtitlePairs.length, { ...state, brandName: state.brandName || 'Практикума' });
  const newPairs = [...state.titleSubtitlePairs, newPair];
  setState({ titleSubtitlePairs: newPairs });
};

export const removeTitleSubtitlePair = (index) => {
  const state = getState();
  if (state.titleSubtitlePairs.length <= 1) {
    alert('Нельзя удалить последнюю пару заголовок/подзаголовок');
    return;
  }
  const newPairs = state.titleSubtitlePairs.filter((_, i) => i !== index);
  let newActiveIndex = state.activePairIndex;
  if (newActiveIndex >= newPairs.length) {
    newActiveIndex = newPairs.length - 1;
  } else if (newActiveIndex > index) {
    newActiveIndex = newActiveIndex - 1;
  }
  setState({ 
    titleSubtitlePairs: newPairs,
    activePairIndex: newActiveIndex
  });
};

export const setActivePairIndex = (index) => {
  const state = getState();
  if (index >= 0 && index < state.titleSubtitlePairs.length) {
    setKey('activePairIndex', index);
  }
};

export const updatePairTitle = (index, title) => {
  const state = getState();
  const newPairs = [...state.titleSubtitlePairs];
  if (newPairs[index]) {
    newPairs[index] = { ...newPairs[index], title };
    setState({ titleSubtitlePairs: newPairs });
  }
};

export const updatePairSubtitle = (index, subtitle) => {
  const state = getState();
  const newPairs = [...state.titleSubtitlePairs];
  if (newPairs[index]) {
    newPairs[index] = { ...newPairs[index], subtitle };
    setState({ titleSubtitlePairs: newPairs });
  }
};

export const updatePairKV = (index, kvSelected) => {
  const state = getState();
  const newPairs = [...state.titleSubtitlePairs];
  if (newPairs[index]) {
    newPairs[index] = { ...newPairs[index], kvSelected: kvSelected || '' };
    setState({ titleSubtitlePairs: newPairs });
  }
};

export const updatePairBgImage = (index, bgImage) => {
  const state = getState();
  const newPairs = [...state.titleSubtitlePairs];
  if (newPairs[index]) {
    newPairs[index] = { ...newPairs[index], bgImageSelected: bgImage || null };
    setState({ titleSubtitlePairs: newPairs });
  }
};

export const updatePairBgColor = (index, bgColor) => {
  const state = getState();
  const newPairs = [...state.titleSubtitlePairs];
  if (newPairs[index]) {
    newPairs[index] = { ...newPairs[index], bgColor: bgColor || '#1e1e1e' };
    setState({ titleSubtitlePairs: newPairs });
  }
};

export const getCheckedSizes = () => {
  const { presetSizes, customSizes } = store.getState();
  const sizes = [];
  Object.keys(presetSizes).forEach((platform) => {
    presetSizes[platform].forEach((size) => {
      if (size.checked) {
        sizes.push({ width: size.width, height: size.height, platform });
      }
    });
  });
  // Добавляем кастомные размеры
  customSizes.forEach((size) => {
    if (size.checked) {
      sizes.push({ width: size.width, height: size.height, platform: 'Custom' });
    }
  });
  return sizes;
};

export const togglePresetSize = (platform, index) => {
  const { presetSizes } = store.getState();
  if (!presetSizes[platform] || !presetSizes[platform][index]) return;
  const nextPresets = cloneDeep(presetSizes);
  nextPresets[platform][index].checked = !nextPresets[platform][index].checked;
  setKey('presetSizes', nextPresets);
};

export const selectAllPresetSizes = () => {
  const presets = cloneDeep(store.getState().presetSizes);
  Object.values(presets).forEach((sizes) => sizes.forEach((size) => (size.checked = true)));
  setKey('presetSizes', presets);
};

export const deselectAllPresetSizes = () => {
  const presets = cloneDeep(store.getState().presetSizes);
  Object.values(presets).forEach((sizes) => sizes.forEach((size) => (size.checked = false)));
  setKey('presetSizes', presets);
};

export const addCustomSize = (width, height) => {
  const { customSizes } = store.getState();
  const newSize = {
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    width: parseInt(width, 10),
    height: parseInt(height, 10),
    checked: true
  };
  const newCustomSizes = [...customSizes, newSize];
  setKey('customSizes', newCustomSizes);
};

export const removeCustomSize = (id) => {
  const { customSizes } = store.getState();
  const newCustomSizes = customSizes.filter(size => size.id !== id);
  setKey('customSizes', newCustomSizes);
};

export const toggleCustomSize = (id) => {
  const { customSizes } = store.getState();
  const newCustomSizes = customSizes.map(size => 
    size.id === id ? { ...size, checked: !size.checked } : size
  );
  setKey('customSizes', newCustomSizes);
};

const hasCheckedSize = (presetSizes) =>
  Object.values(presetSizes || {}).some((sizes) => sizes.some((size) => size.checked));

export const ensurePresetSelection = () => {
  const { presetSizes } = store.getState();
  if (hasCheckedSize(presetSizes)) {
    return;
  }
  const defaults = cloneDeep(getPresetSizes());
  store.setKey('presetSizes', defaults);
};

// Не вызываем ensurePresetSelection() сразу, так как размеры могут быть еще не загружены
// Это будет вызвано после загрузки размеров в main.js

export const saveSettingsSnapshot = () => {
  const snapshot = createStateSnapshot();
  delete snapshot.logo;
  delete snapshot.kv;
  delete snapshot.bgImage;
  delete snapshot.customFont;
  delete snapshot.partnerLogo;
  delete snapshot.partnerLogoFile;
  return snapshot;
};

export const applySavedSettings = (snapshot) => {
  const current = store.getState();
  
  // Конвертируем числовые веса в названия для обратной совместимости
  const convertWeight = (weight) => {
    if (typeof weight === 'number') {
      return FONT_WEIGHT_TO_NAME[weight.toString()] || 'Regular';
    }
    return weight || 'Regular';
  };
  
  // Конвертируем веса в snapshot
  if (snapshot.titleWeight !== undefined) {
    snapshot.titleWeight = convertWeight(snapshot.titleWeight);
  }
  if (snapshot.subtitleWeight !== undefined) {
    snapshot.subtitleWeight = convertWeight(snapshot.subtitleWeight);
  }
  if (snapshot.legalWeight !== undefined) {
    snapshot.legalWeight = convertWeight(snapshot.legalWeight);
  }
  if (snapshot.ageWeight !== undefined) {
    snapshot.ageWeight = convertWeight(snapshot.ageWeight);
  }
  
  // Устанавливаем правильный лигал в зависимости от языка логотипа
  const logoLanguage = snapshot.logoLanguage || current.logoLanguage || 'ru';
  if (logoLanguage === 'kz') {
    const legalKZ = snapshot.legalKZ || current.legalKZ || '*Жарнама / Реклама. ТОО "Y. Izdeu men Jarnama", регистрационный номер:170240015454 Сайт: https://practicum.yandex.kz/.';
    snapshot.legal = legalKZ;
  } else if (logoLanguage === 'ru') {
    const legalRU = 'Рекламодатель АНО ДПО «Образовательные технологии Яндекса», действующая на основании лицензии N° ЛО35-01298-77/00185314 от 24 марта 2015 года, 119021, г. Москва, ул. Тимура Фрунзе, д. 11, к. 2. ОГРН 1147799006123 Сайт: https://practicum.yandex.ru/';
    snapshot.legal = legalRU;
  }
  
  // Заменяем 'system-ui' на 'YS Text' для всех полей шрифтов
  if (snapshot.fontFamily === 'system-ui') {
    snapshot.fontFamily = 'YS Text';
  }
  if (snapshot.titleFontFamily === 'system-ui') {
    snapshot.titleFontFamily = 'YS Text';
  }
  if (snapshot.subtitleFontFamily === 'system-ui') {
    snapshot.subtitleFontFamily = 'YS Text';
  }
  if (snapshot.legalFontFamily === 'system-ui') {
    snapshot.legalFontFamily = 'YS Text';
  }
  if (snapshot.ageFontFamily === 'system-ui') {
    snapshot.ageFontFamily = 'YS Text';
  }
  
  store.state = applyDerivedState({ ...current, ...snapshot }, snapshot);
  store.notify();
};


