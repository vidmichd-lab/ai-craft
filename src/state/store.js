import { PRESET_SIZES, FONT_NAME_TO_WEIGHT, FONT_WEIGHT_TO_NAME, getPRESET_SIZES } from '../constants.js';
import { getPresetSizes } from '../utils/sizesConfig.js';

const TITLE_SUBTITLE_RATIO = 1 / 2;

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

const createTitleSubtitlePair = (index = 0) => ({
  id: `pair-${Date.now()}-${index}`,
  title: index === 0 ? 'Курс «Frontend-разработчик» от Практикума' : '',
  subtitle: index === 0 ? 'Научитесь писать код для сайтов и веб-сервисов — с нуля за 10 месяцев' : '',
  kvSelected: index === 0 ? 'assets/3d/sign/01.png' : '', // KV для этой пары
});

const createInitialState = () => {
  // Получаем размеры из конфига (или дефолтные, если еще не загружены)
  const sizes = getPresetSizes();
  return {
    paddingPercent: 5,
    // Массивы заголовков и подзаголовков
    titleSubtitlePairs: [createTitleSubtitlePair(0)],
    activePairIndex: 0, // Индекс активной пары для отображения на превью
    // Общие настройки для всех заголовков
    titleColor: '#ffffff',
    titleAlign: 'left',
    titleVPos: 'top',
    titleSize: 8,
    titleWeight: 'Regular', // Используем название начертания вместо цифр
    titleLetterSpacing: 0,
    titleLineHeight: 1.1,
    titleFontFamily: 'YS Text',
    titleFontFamilyFile: null,
    titleCustomFont: null, // URL blob для загруженного шрифта
    titleCustomFontName: null, // Имя загруженного файла
    titleTransform: 'none', // Преобразование регистра заголовка
    // Общие настройки для всех подзаголовков
    subtitleColor: '#e0e0e0',
    subtitleOpacity: 90,
    subtitleAlign: 'left',
    subtitleSize: 4,
    subtitleWeight: 'Regular', // Используем название начертания вместо цифр
    subtitleLetterSpacing: 0,
    subtitleLineHeight: 1.2,
    subtitleGap: -1,
    titleSubtitleRatio: 0.5, // Коэффициент зависимости размера подзаголовка от заголовка (0.5 = подзаголовок в 2 раза меньше)
    subtitleFontFamily: 'YS Text',
    subtitleFontFamilyFile: null,
    subtitleCustomFont: null,
    subtitleCustomFontName: null,
    subtitleTransform: 'none', // Преобразование регистра подзаголовка
    // Обратная совместимость (используются для рендеринга активной пары)
    title: 'Курс «Frontend-разработчик» от Практикума',
    subtitle: 'Научитесь писать код для сайтов и веб-сервисов — с нуля за 10 месяцев',
    legal: 'Рекламодатель АНО ДПО «Образовательные технологии Яндекса», действующая на основании лицензии N° ЛО35-01298-77/00185314 от 24 марта 2015 года, 119021, г. Москва, ул. Тимура Фрунзе, д. 11, к. 2. ОГРН 1147799006123 Сайт: https://practicum.yandex.ru/',
    legalColor: '#ffffff',
    legalOpacity: 60,
    legalAlign: 'left',
    legalSize: 2,
    legalTransform: 'none', // Преобразование регистра юридического текста
    legalWeight: 'Regular', // Используем название начертания вместо цифр
    legalLetterSpacing: 0,
    legalLineHeight: 1.4,
    age: '18+',
    ageGapPercent: 1,
    ageSize: 4,
    ageWeight: 'Regular', // Используем название начертания вместо цифр
    showLogo: true,
    showSubtitle: true,
    hideSubtitleOnWide: false,
    showLegal: true,
    showAge: true,
    showKV: true,
    showBlocks: false,
    showGuides: false,
    layoutMode: 'auto',
    logo: null,
    logoSelected: 'logo/white/ru/main.svg',
    logoSize: 40,
    logoLanguage: 'ru', // ru или kz
    partnerLogo: null,
    partnerLogoFile: null,
    kv: null,
    kvSelected: 'assets/3d/sign/01.png',
    kvBorderRadius: 0,
    kvPosition: 'center', // 'left', 'center', 'right' - позиция KV (не применяется к широким макетам)
    bgColor: '#1e1e1e',
    bgImage: null,
    bgSize: 'cover',
    bgPosition: 'center',
    bgVPosition: 'center', // 'top', 'center', 'bottom' - вертикальная позиция фона
    textGradientOpacity: 100, // Прозрачность градиентной подложки под текстом (0-100)
    logoPos: 'left',
    fontFamily: 'YS Text', // Общая гарнитура (для обратной совместимости)
    fontFamilyFile: null,
    customFont: null,
    legalFontFamily: 'YS Text',
    legalFontFamilyFile: null,
    legalCustomFont: null,
    legalCustomFontName: null,
    ageFontFamily: 'YS Text',
    ageFontFamilyFile: null,
    ageCustomFont: null,
    ageCustomFontName: null,
    presetSizes: cloneDeep(sizes),
    customSizes: [], // Кастомные размеры: [{ width, height, checked, id }]
    namePrefix: 'layout',
    kvCanvasWidth: null,
    kvCanvasHeight: null,
    exportScale: 1 // Масштаб экспорта: 1, 2, 3 или 4
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


  // Используем коэффициент из состояния, если он задан, иначе используем значение по умолчанию
  const ratio = state.titleSubtitleRatio !== undefined ? state.titleSubtitleRatio : TITLE_SUBTITLE_RATIO;
  if ('titleSize' in delta) {
    next.subtitleSize = parseFloat((state.titleSize * ratio).toFixed(2));
  }

  if ('subtitleSize' in delta) {
    next.titleSize = parseFloat((state.subtitleSize / ratio).toFixed(2));
  }

  // Синхронизируем активную пару с полями title/subtitle/kvSelected для обратной совместимости
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
    }
  }

  return next;
};

export const store = new Store(createInitialState());

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
  const newPair = createTitleSubtitlePair(state.titleSubtitlePairs.length);
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
  
  store.state = applyDerivedState({ ...current, ...snapshot }, snapshot);
  store.notify();
};


