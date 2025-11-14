import { PRESET_SIZES } from '../constants.js';

const TITLE_SUBTITLE_RATIO = 1 / 2;

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

const createInitialState = () => ({
  paddingPercent: 5,
  title: 'Курс «Frontend-разработчик» от Практикума',
  titleColor: '#ffffff',
  titleAlign: 'left',
  titleVPos: 'top',
  titleSize: 8,
  titleWeight: 400,
  titleLetterSpacing: 0,
  titleLineHeight: 1.1,
  subtitle: 'Научитесь писать код для сайтов и веб-сервисов — с нуля за 10 месяцев',
  subtitleColor: '#e0e0e0',
  subtitleOpacity: 90,
  subtitleAlign: 'left',
  subtitleSize: 4,
  subtitleWeight: 400,
  subtitleLetterSpacing: 0,
  subtitleLineHeight: 1.2,
  subtitleGap: 0,
  legal: 'Рекламодатель АНО ДПО «Образовательные технологии Яндекса», действующая на основании лицензии N° ЛО35-01298-77/00185314 от 24 марта 2015 года, 119021, г. Москва, ул. Тимура Фрунзе, д. 11, к. 2. ОГРН 1147799006123 Сайт: https://practicum.yandex.ru/',
  legalColor: '#ffffff',
  legalOpacity: 60,
  legalAlign: 'left',
  legalSize: 2,
  legalWeight: 400,
  legalLetterSpacing: 0,
  legalLineHeight: 1.4,
  age: '18+',
  ageGapPercent: 1,
  ageSize: 4,
  showSubtitle: true,
  showLegal: true,
  showAge: true,
  showKV: true,
  showBlocks: true,
  showGuides: true,
  layoutMode: 'auto',
  logo: null,
  logoSelected: 'logo/white.svg',
  logoSize: 40,
  kv: null,
  bgColor: '#1e1e1e',
  bgImage: null,
  logoPos: 'left',
  fontFamily: 'YS Text',
  fontFamilyFile: null,
  customFont: null,
  presetSizes: cloneDeep(PRESET_SIZES),
  namePrefix: 'layout',
  kvCanvasWidth: null,
  kvCanvasHeight: null
});

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

  if ('titleSize' in delta) {
    next.subtitleSize = parseFloat((state.titleSize * TITLE_SUBTITLE_RATIO).toFixed(2));
  }

  if ('subtitleSize' in delta) {
    next.titleSize = parseFloat((state.subtitleSize / TITLE_SUBTITLE_RATIO).toFixed(2));
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
  const presets = cloneDeep(PRESET_SIZES);
  Object.values(presets).forEach((sizes) => sizes.forEach((size) => (size.checked = checked)));
  setKey('presetSizes', presets);
};

export const getCheckedSizes = () => {
  const { presetSizes } = store.getState();
  const sizes = [];
  Object.keys(presetSizes).forEach((platform) => {
    presetSizes[platform].forEach((size) => {
      if (size.checked) {
        sizes.push({ width: size.width, height: size.height, platform });
      }
    });
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

const hasCheckedSize = (presetSizes) =>
  Object.values(presetSizes || {}).some((sizes) => sizes.some((size) => size.checked));

export const ensurePresetSelection = () => {
  const { presetSizes } = store.getState();
  if (hasCheckedSize(presetSizes)) {
    return;
  }
  const defaults = cloneDeep(PRESET_SIZES);
  store.setKey('presetSizes', defaults);
};

ensurePresetSelection();

export const saveSettingsSnapshot = () => {
  const snapshot = createStateSnapshot();
  delete snapshot.logo;
  delete snapshot.kv;
  delete snapshot.bgImage;
  delete snapshot.customFont;
  return snapshot;
};

export const applySavedSettings = (snapshot) => {
  const current = store.getState();
  store.state = applyDerivedState({ ...current, ...snapshot }, snapshot);
  store.notify();
};


