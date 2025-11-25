/**
 * Утилита для кеширования изображений с поддержкой IndexedDB и blur hash
 */

// Кеш в памяти для быстрого доступа
const memoryCache = new Map();
const loadingPromises = new Map();

// IndexedDB для персистентного кеша
let db = null;
const DB_NAME = 'imageCache';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/**
 * Инициализация IndexedDB
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

/**
 * Генерация простого blur hash (упрощенная версия)
 * Создает размытое превью изображения
 */
const generateBlurHash = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Создаем миниатюру 20x20 для blur hash
        const size = 20;
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(img, 0, 0, size, size);
        
        // Получаем средний цвет
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        
        // Создаем data URL для blur preview
        canvas.width = 1;
        canvas.height = 1;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, 1, 1);
        
        const blurDataUrl = canvas.toDataURL('image/png');
        resolve(blurDataUrl);
      } catch (error) {
        console.warn('Ошибка генерации blur hash:', error);
        resolve(null);
      }
    };
    
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
};

/**
 * Сохранение изображения в IndexedDB
 */
const saveToDB = async (url, blob, blurHash) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data = {
      url,
      blob,
      blurHash,
      timestamp: Date.now()
    };
    
    await store.put(data);
  } catch (error) {
    console.warn('Ошибка сохранения в IndexedDB:', error);
  }
};

/**
 * Получение изображения из IndexedDB
 */
const getFromDB = async (url) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(url);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          // Проверяем, не устарел ли кеш (7 дней)
          const maxAge = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - result.timestamp < maxAge) {
            resolve({
              blob: result.blob,
              blurHash: result.blurHash,
              url: URL.createObjectURL(result.blob)
            });
            return;
          }
        }
        resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.warn('Ошибка чтения из IndexedDB:', error);
    return null;
  }
};

/**
 * Загрузка изображения с кешированием
 */
export const loadImage = async (url, options = {}) => {
  const {
    useCache = true,
    showBlur = true,
    onBlurReady = null
  } = options;

  // Проверяем кеш в памяти
  if (useCache && memoryCache.has(url)) {
    return memoryCache.get(url);
  }

  // Проверяем, не загружается ли уже это изображение
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url);
  }

  // Создаем промис загрузки
  const loadPromise = (async () => {
    try {
      // Сначала проверяем IndexedDB (с таймаутом)
      if (useCache) {
        try {
          const cached = await Promise.race([
            getFromDB(url),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
          ]);
          if (cached) {
            memoryCache.set(url, cached);
            return cached;
          }
        } catch (dbError) {
          // Игнорируем ошибки IndexedDB и продолжаем загрузку
          console.warn('Ошибка чтения из IndexedDB, продолжаем загрузку:', dbError);
        }
      }

      // Генерируем blur hash для быстрого отображения (не блокируем загрузку)
      let blurHash = null;
      if (showBlur) {
        generateBlurHash(url).then(hash => {
          blurHash = hash;
          if (blurHash && onBlurReady) {
            onBlurReady(blurHash);
          }
        }).catch(() => {
          // Игнорируем ошибки генерации blur hash
        });
      }

      // Загружаем изображение с fallback стратегией
      let response;
      try {
        response = await fetch(url, {
          cache: 'force-cache',
          mode: 'cors'
        });
      } catch (fetchError) {
        // Если CORS не работает, пробуем без mode
        try {
          response = await fetch(url, {
            cache: 'force-cache'
          });
        } catch (e) {
          throw new Error(`Failed to fetch: ${e.message}`);
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const result = {
        url: objectUrl,
        blob,
        blurHash,
        originalUrl: url
      };

      // Сохраняем в кеш
      if (useCache) {
        memoryCache.set(url, result);
        // Сохраняем в IndexedDB асинхронно (не блокируем)
        saveToDB(url, blob, blurHash).catch(err => 
          console.warn('Ошибка сохранения в IndexedDB:', err)
        );
      }

      return result;
    } catch (error) {
      console.error('Ошибка загрузки изображения:', url, error);
      // Удаляем из loadingPromises перед выбросом ошибки
      loadingPromises.delete(url);
      throw error;
    }
  })();

  loadingPromises.set(url, loadPromise);
  return loadPromise;
};

/**
 * Предзагрузка изображений
 */
export const preloadImages = async (urls) => {
  const promises = urls.map(url => 
    loadImage(url, { useCache: true, showBlur: false }).catch(() => null)
  );
  await Promise.all(promises);
};

/**
 * Очистка старого кеша
 */
export const clearOldCache = async (maxAge = 30 * 24 * 60 * 60 * 1000) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor();
    const cutoff = Date.now() - maxAge;
    let deleted = 0;

    return new Promise((resolve) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < cutoff) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      request.onerror = () => resolve(deleted);
    });
  } catch (error) {
    console.warn('Ошибка очистки кеша:', error);
    return 0;
  }
};

/**
 * Получение blur hash для изображения
 */
export const getBlurHash = async (url) => {
  if (memoryCache.has(url)) {
    return memoryCache.get(url).blurHash;
  }
  
  const cached = await getFromDB(url);
  if (cached) {
    return cached.blurHash;
  }
  
  return await generateBlurHash(url);
};

// Инициализация при загрузке модуля
if (typeof window !== 'undefined') {
  initDB().catch(err => console.warn('Ошибка инициализации IndexedDB:', err));
  
  // Очищаем старый кеш при загрузке (старше 30 дней)
  clearOldCache().catch(() => {});
}

