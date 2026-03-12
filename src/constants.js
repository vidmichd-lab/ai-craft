// Импорты для работы с размерами
import { getPresetSizes, loadSizesConfig } from './utils/sizesConfig.js';

// Единые дефолты ассетов
export const DEFAULT_KV_PATH = 'assets/3d/logos/02.webp';
export const DEFAULT_PRO_KV_PATH = 'assets/pro/assets/1.webp';

export const AVAILABLE_LOGOS = [
  // Логотипы теперь сканируются динамически через scanLogos()
  // Оставляем пустым массив, так как все логотипы загружаются из папок
];

// AVAILABLE_FONTS теперь заполняется динамически через scanFonts()
// По умолчанию пустой массив, заполняется при инициализации
export let AVAILABLE_FONTS = [
  { name: 'System Default', family: 'system-ui', file: null, weight: '400', style: 'normal' }
];

// Функция для обновления списка доступных шрифтов
export const setAvailableFonts = (fonts) => {
  AVAILABLE_FONTS = [
    { name: 'System Default', family: 'system-ui', file: null, weight: '400', weightName: 'Regular', style: 'normal' },
    ...fonts
  ];
};

// Маппинг весов шрифтов на названия начертаний
export const FONT_WEIGHT_TO_NAME = {
  '100': 'Thin',
  '200': 'ExtraLight',
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'SemiBold',
  '700': 'Bold',
  '800': 'Heavy',
  '900': 'Black'
};

// Маппинг названий начертаний на веса шрифтов
export const FONT_NAME_TO_WEIGHT = {
  'Thin': '100',
  'ExtraLight': '200',
  'Light': '300',
  'Regular': '400',
  'Medium': '500',
  'SemiBold': '600',
  'Bold': '700',
  'Heavy': '800',
  'Black': '900'
};

// Доступные начертания для выбора
export const AVAILABLE_WEIGHTS = [
  { name: 'Thin', weight: '100' },
  { name: 'ExtraLight', weight: '200' },
  { name: 'Light', weight: '300' },
  { name: 'Regular', weight: '400' },
  { name: 'Medium', weight: '500' },
  { name: 'SemiBold', weight: '600' },
  { name: 'Bold', weight: '700' },
  { name: 'Heavy', weight: '800' },
  { name: 'Black', weight: '900' }
];

// PRESET_SIZES теперь загружается динамически через loadSizesConfig()
// Используем функцию для получения размеров
// Экспортируем функцию для получения размеров
export const getPRESET_SIZES = () => {
  return getPresetSizes();
};

// Для обратной совместимости экспортируем как константу (будет обновлена после загрузки)
export let PRESET_SIZES = {};

// Инициализация размеров (вызывается при загрузке приложения)
export const initializePresetSizes = async () => {
  const sizes = await loadSizesConfig();
  PRESET_SIZES = sizes;
  return sizes;
};

// Структура KV на основе папки assets/3d/sign/
// Примечание: файлы теперь сканируются динамически через scanKV()
export const AVAILABLE_KV = {};

// Структура фоновых изображений на основе папки assets/3d/
// Примечание: файлы теперь сканируются динамически через scanBG()
export const AVAILABLE_BG = {};

// Предзагруженные цвета для фона
export const PRESET_BACKGROUND_COLORS = [
  '#027EF2',
  '#98D2FE',
  '#07AB4B',
  '#E84033',
  '#FF6C26',
  '#FFD20A',
  '#726BFF',
  '#1E1E1E',
  '#FFFFFF'
];
