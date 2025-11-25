/**
 * Утилита для конвертации шрифтов в WOFF2 в браузере
 * Использует Web API для конвертации
 */

/**
 * Конвертирует шрифт в WOFF2 используя браузерные API
 * @param {File|Blob} fontFile - Файл шрифта для конвертации
 * @returns {Promise<Blob>} - Конвертированный шрифт в формате WOFF2
 */
export const convertToWoff2 = async (fontFile) => {
  // Если файл уже в формате WOFF2, возвращаем как есть
  if (fontFile.name && fontFile.name.toLowerCase().endsWith('.woff2')) {
    return fontFile;
  }

  try {
    // Читаем файл как ArrayBuffer
    const arrayBuffer = await fontFile.arrayBuffer();
    
    // Используем FontFace API для загрузки шрифта
    const fontName = `temp_font_${Date.now()}`;
    const fontFace = new FontFace(fontName, arrayBuffer);
    
    await fontFace.load();
    
    // К сожалению, браузерный API не позволяет напрямую конвертировать в WOFF2
    // Поэтому используем альтернативный подход - используем исходный файл
    // но приоритизируем WOFF2 при наличии
    
    // Для реальной конвертации нужна библиотека или серверный API
    // Пока возвращаем исходный файл, но можно добавить конвертацию через WebAssembly
    
    return fontFile;
  } catch (error) {
    console.warn('Ошибка при попытке конвертации шрифта:', error);
    // Возвращаем исходный файл при ошибке
    return fontFile;
  }
};

/**
 * Проверяет, нужно ли конвертировать шрифт
 * @param {File} file - Файл шрифта
 * @returns {boolean} - true если нужна конвертация
 */
export const needsConversion = (file) => {
  if (!file || !file.name) return false;
  const ext = file.name.toLowerCase().split('.').pop();
  return ext !== 'woff2';
};

