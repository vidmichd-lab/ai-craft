/**
 * Константы для рендеринга
 */

export const LAYOUT_CONSTANTS = {
  // Пороги для определения типа макета
  VERTICAL_THRESHOLD: 1.5,      // height >= width * 1.5 (вертикальные)
  HORIZONTAL_THRESHOLD: 1.5,    // width >= height * 1.5 (горизонтальные/широкие)
  ULTRA_WIDE_THRESHOLD: 8,      // width >= height * 8 (ультра-широкие)
  SUPER_WIDE_HEIGHT: 120,       // высота для супер-широких форматов
  
  // Минимальные размеры
  MIN_KV_SIZE: 30,              // Минимальный размер для KV
  CRITICAL_MIN_KV_SIZE: 10,     // Критически минимальный размер
  
  // Множители размеров для разных типов макетов
  VERTICAL_LOGO_MULTIPLIER: 2,
  ULTRA_WIDE_LOGO_MULTIPLIER: 0.75,
  
  // Множители для заголовков
  ULTRA_WIDE_TITLE_MULTIPLIER_SMALL: 3,      // height < 120
  ULTRA_WIDE_TITLE_MULTIPLIER_MEDIUM: 2.2,   // height < 200
  ULTRA_WIDE_TITLE_MULTIPLIER_LARGE: 2,      // height >= 200
  
  // Множители для legal текста
  ULTRA_WIDE_LEGAL_MULTIPLIER_NORMAL: 2.5,
  ULTRA_WIDE_LEGAL_MULTIPLIER_MEDIUM: 2,     // height 250-350
  
  // Множители для age
  ULTRA_WIDE_AGE_MULTIPLIER: 2,
  
  // Отношения размеров
  TITLE_SUBTITLE_RATIO: 1 / 2,
  LEGAL_DESCENT_FACTOR: 0.2,
  
  // Отступы и зазоры
  PADDING_MULTIPLIER_SUPER_WIDE: 2,
  SUBTITLE_GAP_REDUCTION_ULTRA_WIDE: 3,  // Уменьшение gap для ultra-wide
  
  // Проценты для layout
  HORIZONTAL_LEFT_SECTION_RATIO: 0.55,
  MIN_TEXT_RATIO_WIDE: 0.68,              // width >= height * 3
  MIN_TEXT_RATIO_NORMAL: 0.5,
  MIN_TEXT_WIDTH: 200,
  KV_MAX_WIDTH_RATIO: 0.25,               // Максимальная ширина KV
  KV_MAX_WIDTH_RATIO_SUPER: 0.25,
  
  // Безопасные зазоры
  SAFE_GAP_MULTIPLIER: 0.5,
  MIN_SAFE_GAP: 0.5,
};

export const TEXT_CONSTANTS = {
  // Висячие предлоги и союзы (не должны оставаться в конце строки)
  HANGING_PREPOSITIONS: new Set([
    'в', 'во', 'на', 'над', 'под', 'с', 'со', 'к', 'ко', 'от', 'о', 'об', 'обо',
    'из', 'изо', 'до', 'по', 'про', 'для', 'при', 'без', 'безо', 'через', 'сквозь',
    'между', 'среди', 'перед', 'передо', 'за', 'у', 'около', 'возле', 'вдоль',
    'поперёк', 'против', 'ради', 'благодаря', 'согласно', 'вопреки', 'навстречу',
    'наперекор', 'подобно', 'соответственно', 'относительно', 'касательно',
    'и', 'а', 'но', 'или', 'либо', 'что', 'как', 'когда', 'если', 'хотя', 'чтобы'
  ]),
};

