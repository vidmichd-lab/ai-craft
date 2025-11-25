/**
 * Модуль для экспорта и импорта полной конфигурации сервиса
 * Включает все настройки: размеры, значения по умолчанию, множители, фоны и т.д.
 */

/**
 * Экспортирует полную конфигурацию в JSON файл
 * Включает все настройки, которые можно передать другой команде
 */
export const exportFullConfig = () => {
  try {
    const config = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      description: 'Полная конфигурация сервиса для генерации макетов',
      
      // Конфигурация размеров
      sizesConfig: (() => {
        const saved = localStorage.getItem('sizes-config');
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (e) {
            console.warn('Ошибка парсинга sizes-config:', e);
            return null;
          }
        }
        return null;
      })(),
      
      // Значения по умолчанию из админки
      defaultValues: (() => {
        const saved = localStorage.getItem('default-values');
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (e) {
            console.warn('Ошибка парсинга default-values:', e);
            return null;
          }
        }
        return null;
      })(),
      
      // Множители форматов
      formatMultipliers: (() => {
        const saved = localStorage.getItem('format-multipliers');
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (e) {
            console.warn('Ошибка парсинга format-multipliers:', e);
            return null;
          }
        }
        return null;
      })(),
      
      // Сохраненные фоновые изображения в админке
      adminBackgrounds: (() => {
        const saved = localStorage.getItem('adminBackgrounds');
        if (saved) {
          try {
            return JSON.parse(saved);
          } catch (e) {
            console.warn('Ошибка парсинга adminBackgrounds:', e);
            return null;
          }
        }
        return null;
      })(),
      
      // Тема интерфейса (опционально)
      theme: localStorage.getItem('theme') || 'dark',
      
      // Название бренда
      brandName: localStorage.getItem('brandName') || 'Практикума'
    };
    
    // Удаляем null значения для чистоты конфига
    Object.keys(config).forEach(key => {
      if (config[key] === null && key !== 'sizesConfig' && key !== 'defaultValues') {
        delete config[key];
      }
    });
    
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Полная конфигурация экспортирована');
    return true;
  } catch (error) {
    console.error('Ошибка при экспорте полной конфигурации:', error);
    return false;
  }
};

/**
 * Импортирует полную конфигурацию из JSON файла
 * Восстанавливает все настройки из конфига
 */
export const importFullConfig = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        
        // Валидация структуры
        if (typeof config !== 'object' || config === null) {
          throw new Error('Некорректный формат файла конфигурации');
        }
        
        // Импортируем размеры
        if (config.sizesConfig) {
          try {
            localStorage.setItem('sizes-config', JSON.stringify(config.sizesConfig));
            console.log('✓ Размеры импортированы');
          } catch (error) {
            console.warn('Ошибка импорта размеров:', error);
          }
        }
        
        // Импортируем значения по умолчанию
        if (config.defaultValues) {
          try {
            localStorage.setItem('default-values', JSON.stringify(config.defaultValues));
            console.log('✓ Значения по умолчанию импортированы');
          } catch (error) {
            console.warn('Ошибка импорта значений по умолчанию:', error);
          }
        }
        
        // Импортируем множители форматов
        if (config.formatMultipliers) {
          try {
            localStorage.setItem('format-multipliers', JSON.stringify(config.formatMultipliers));
            console.log('✓ Множители форматов импортированы');
          } catch (error) {
            console.warn('Ошибка импорта множителей:', error);
          }
        }
        
        // Импортируем сохраненные фоны
        if (config.adminBackgrounds) {
          try {
            localStorage.setItem('adminBackgrounds', JSON.stringify(config.adminBackgrounds));
            console.log('✓ Фоновые изображения импортированы');
          } catch (error) {
            console.warn('Ошибка импорта фонов:', error);
          }
        }
        
        // Импортируем тему (опционально)
        if (config.theme) {
          try {
            localStorage.setItem('theme', config.theme);
            console.log('✓ Тема импортирована');
          } catch (error) {
            console.warn('Ошибка импорта темы:', error);
          }
        }
        
        // Импортируем название бренда
        if (config.brandName) {
          try {
            localStorage.setItem('brandName', config.brandName);
            console.log('✓ Название бренда импортировано');
          } catch (error) {
            console.warn('Ошибка импорта названия бренда:', error);
          }
        }
        
        resolve(config);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка при чтении файла'));
    reader.readAsText(file);
  });
};

/**
 * Загружает конфигурацию из файла config.json в корне проекта
 * Вызывается при инициализации приложения
 */
export const loadConfigFromFile = async () => {
  try {
    const response = await fetch('/config.json');
    if (response.ok) {
      const config = await response.json();
      
      // Импортируем конфигурацию (используем ту же логику, что и при ручном импорте)
      if (config.sizesConfig) {
        localStorage.setItem('sizes-config', JSON.stringify(config.sizesConfig));
      }
      
      if (config.defaultValues) {
        localStorage.setItem('default-values', JSON.stringify(config.defaultValues));
      }
      
      if (config.formatMultipliers) {
        localStorage.setItem('format-multipliers', JSON.stringify(config.formatMultipliers));
      }
      
      if (config.adminBackgrounds) {
        localStorage.setItem('adminBackgrounds', JSON.stringify(config.adminBackgrounds));
      }
      
      if (config.theme) {
        localStorage.setItem('theme', config.theme);
      }
      
      if (config.brandName) {
        localStorage.setItem('brandName', config.brandName);
      }
      
      console.log('✓ Конфигурация загружена из config.json');
      return config;
    }
    return null;
  } catch (error) {
    // Файл не найден - это нормально, просто используем настройки по умолчанию
    console.log('config.json не найден, используем настройки по умолчанию');
    return null;
  }
};

