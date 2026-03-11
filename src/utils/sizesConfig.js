/**
 * Модуль для загрузки и управления конфигурацией размеров
 * Размеры загружаются из sizes-config.json и могут быть изменены через UI
 */

// Дефолтные размеры (используются как fallback)
const DEFAULT_PRESET_SIZES = {
  'Общие': [
    { width: 1080, height: 1080, checked: true },
    { width: 1080, height: 1920, checked: true },
    { width: 1920, height: 720, checked: true }
  ],
  // Перформанс-форматы РСЯ + Поиск
  'РСЯ': [
    { width: 1600, height: 1200, checked: true },
    { width: 240, height: 400, checked: true }
  ],
  // Графические форматы Яндекс Директ
  'Яндекс Директ': [
    { width: 160, height: 600, checked: true },
    { width: 240, height: 600, checked: true },
    { width: 300, height: 250, checked: true },
    { width: 300, height: 300, checked: true },
    { width: 300, height: 500, checked: true },
    { width: 300, height: 600, checked: true },
    { width: 320, height: 50, checked: true },
    { width: 320, height: 100, checked: true },
    { width: 320, height: 480, checked: true },
    { width: 336, height: 280, checked: true },
    { width: 480, height: 320, checked: true },
    { width: 728, height: 90, checked: true },
    { width: 970, height: 250, checked: true },
    { width: 1000, height: 120, checked: true }
  ],
  'MTS': [
    { width: 200, height: 200, checked: true },
    { width: 240, height: 400, checked: true },
    { width: 300, height: 250, checked: true },
    { width: 300, height: 300, checked: true },
    { width: 300, height: 50, checked: true },
    { width: 300, height: 600, checked: true },
    { width: 320, height: 50, checked: true },
    { width: 320, height: 100, checked: true },
    { width: 320, height: 480, checked: true },
    { width: 336, height: 280, checked: true },
    { width: 728, height: 90, checked: true }
  ],
  'Upravel': [
    { width: 300, height: 250, checked: true },
    { width: 300, height: 300, checked: true },
    { width: 300, height: 600, checked: true },
    { width: 320, height: 50, checked: true },
    { width: 320, height: 100, checked: true },
    { width: 336, height: 280, checked: true }
  ],
  'Habr': [
    { width: 300, height: 250, checked: true },
    { width: 300, height: 600, checked: true },
    { width: 520, height: 800, checked: true },
    { width: 960, height: 450, checked: true },
    { width: 1560, height: 320, checked: true }
  ],
  'Ozon': [
    { width: 2832, height: 600, checked: true },
    { width: 1080, height: 450, checked: true }
  ]
};

// Текущие размеры (загружаются из файла или localStorage)
let currentPresetSizes = null;

/**
 * Загружает размеры из файла sizes-config.json
 * Если файл не найден, использует размеры из localStorage или дефолтные
 */
export const loadSizesConfig = async () => {
  try {
    // Сначала проверяем localStorage (приоритет у пользовательских изменений)
    const savedSizes = localStorage.getItem('sizes-config');
    if (savedSizes) {
      try {
        const parsed = JSON.parse(savedSizes);
        // Миграция старых названий платформ
        if (parsed['Я.Директ']) {
          parsed['РСЯ'] = parsed['РСЯ'] || parsed['Я.Директ'];
          delete parsed['Я.Директ'];
        }
        if (parsed['Я.Директ Графические']) {
          parsed['Яндекс Директ'] = parsed['Яндекс Директ'] || parsed['Я.Директ Графические'];
          delete parsed['Я.Директ Графические'];
        }
        currentPresetSizes = parsed;
        console.log('Размеры загружены из localStorage');
        return parsed;
      } catch (e) {
        console.warn('Ошибка при парсинге размеров из localStorage:', e);
      }
    }

    // Пытаемся загрузить из файла
    const response = await fetch('/sizes-config.json');
    if (response.ok) {
      const config = await response.json();
      // Миграция старых названий платформ
      if (config['Я.Директ']) {
        config['РСЯ'] = config['РСЯ'] || config['Я.Директ'];
        delete config['Я.Директ'];
      }
      if (config['Я.Директ Графические']) {
        config['Яндекс Директ'] = config['Яндекс Директ'] || config['Я.Директ Графические'];
        delete config['Я.Директ Графические'];
      }
      currentPresetSizes = config;
      console.log('Размеры загружены из sizes-config.json');
      return config;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('Не удалось загрузить sizes-config.json, используем дефолтные размеры:', error);
    currentPresetSizes = JSON.parse(JSON.stringify(DEFAULT_PRESET_SIZES));
    return currentPresetSizes;
  }
};

/**
 * Получает текущие размеры
 */
export const getPresetSizes = () => {
  if (!currentPresetSizes) {
    // Если размеры еще не загружены, возвращаем дефолтные
    return JSON.parse(JSON.stringify(DEFAULT_PRESET_SIZES));
  }
  return JSON.parse(JSON.stringify(currentPresetSizes));
};

/**
 * Сохраняет размеры в localStorage
 */
export const saveSizesConfig = (sizes) => {
  try {
    currentPresetSizes = JSON.parse(JSON.stringify(sizes));
    localStorage.setItem('sizes-config', JSON.stringify(sizes));
    console.log('Размеры сохранены в localStorage');
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении размеров:', error);
    return false;
  }
};

/**
 * Экспортирует размеры в JSON файл (скачивает файл)
 */
export const exportSizesConfig = () => {
  try {
    const sizes = getPresetSizes();
    const json = JSON.stringify(sizes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sizes-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Размеры экспортированы в sizes-config.json');
    return true;
  } catch (error) {
    console.error('Ошибка при экспорте размеров:', error);
    return false;
  }
};

/**
 * Импортирует размеры из JSON файла
 */
export const importSizesConfig = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const sizes = JSON.parse(e.target.result);
        // Валидация структуры
        if (typeof sizes !== 'object' || sizes === null) {
          throw new Error('Некорректный формат файла');
        }
        // Проверяем, что все значения - массивы с объектами {width, height, checked}
        for (const [platform, sizesList] of Object.entries(sizes)) {
          if (!Array.isArray(sizesList)) {
            throw new Error(`Платформа "${platform}" должна содержать массив размеров`);
          }
          for (const size of sizesList) {
            if (typeof size.width !== 'number' || typeof size.height !== 'number') {
              throw new Error(`Некорректный размер в платформе "${platform}"`);
            }
            if (size.checked === undefined) {
              size.checked = true; // Устанавливаем checked по умолчанию
            }
          }
        }
        saveSizesConfig(sizes);
        resolve(sizes);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка при чтении файла'));
    reader.readAsText(file);
  });
};

/**
 * Сбрасывает размеры к дефолтным
 */
export const resetSizesConfig = () => {
  localStorage.removeItem('sizes-config');
  currentPresetSizes = JSON.parse(JSON.stringify(DEFAULT_PRESET_SIZES));
  return currentPresetSizes;
};

