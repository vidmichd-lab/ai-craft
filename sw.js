/**
 * Service Worker для кеширования статических ресурсов
 */

// Версия кеша - обновлять при каждом деплое
// ⚠️ MUST MATCH APP_VERSION in index.html
const CACHE_VERSION = '1.0.2';
const CACHE_NAME = `practicum-banners-v${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `practicum-banners-static-v${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `practicum-banners-images-v${CACHE_VERSION}`;

// Ресурсы для кеширования при установке (с версионированием)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  `/styles.css?v=${CACHE_VERSION}`,
  `/src/main.js?v=${CACHE_VERSION}`,
  `/src/constants.js?v=${CACHE_VERSION}`,
  `/src/state/store.js?v=${CACHE_VERSION}`,
  `/src/renderer.js?v=${CACHE_VERSION}`,
  `/src/ui/ui.js?v=${CACHE_VERSION}`,
  `/src/ui/domCache.js?v=${CACHE_VERSION}`,
  `/src/ui/eventHandler.js?v=${CACHE_VERSION}`,
  `/src/utils/assetScanner.js?v=${CACHE_VERSION}`,
  `/src/utils/sizesConfig.js?v=${CACHE_VERSION}`,
  `/src/utils/imageCache.js?v=${CACHE_VERSION}`,
  `/sizes-config.json?v=${CACHE_VERSION}`
];

// Максимальное количество изображений в кеше
const MAX_IMAGE_CACHE_SIZE = 100;

// Время жизни кеша (7 дней)
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Установка Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

/**
 * Активация Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Удаляем все старые кеши, которые не соответствуют текущей версии
          if (!cacheName.includes(`v${CACHE_VERSION}`)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

/**
 * Обработка запросов
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }

  // Пропускаем chrome-extension и другие протоколы
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Не перехватываем запросы к аналитике/трекингу — пусть идут в сеть без SW (избегаем 408 при блокировке)
  if (isAnalyticsOrTracking(request.url)) {
    return;
  }

  // Стратегия для статических ресурсов
  if (isStaticAsset(request.url)) {
    // Для JS файлов используем Network First, чтобы всегда получать свежие версии
    if (isJavaScript(request.url)) {
      event.respondWith(networkFirstWithCache(request, STATIC_CACHE_NAME));
      return;
    }
    // Для CSS и HTML используем Cache First
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // Стратегия для изображений
  if (isImage(request.url)) {
    event.respondWith(cacheFirstWithExpiry(request, IMAGE_CACHE_NAME));
    return;
  }

  // Стратегия для шрифтов
  if (isFont(request.url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // Для остальных - network first
  event.respondWith(networkFirst(request));
});

/**
 * Проверка, является ли URL аналитикой/трекингом (не перехватываем — иначе при блокировке получаем 408)
 */
function isAnalyticsOrTracking(url) {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    return host.includes('mc.yandex.ru') || host.includes('yandex.ru/metrika') ||
           host.includes('google-analytics.com') || host.includes('googletagmanager.com') ||
           host.includes('doubleclick.net') || host.includes('facebook.com/tr');
  } catch (e) {
    return false;
  }
}

/**
 * Проверка, является ли ресурс статическим
 */
function isStaticAsset(url) {
  return /\.(css|js|html|json)$/i.test(url) || 
         url.includes('/src/') ||
         url.endsWith('/') ||
         url.endsWith('/index.html');
}

/**
 * Проверка, является ли ресурс JavaScript файлом
 */
function isJavaScript(url) {
  return /\.js$/i.test(url) || url.includes('/src/');
}

/**
 * Проверка, является ли ресурс изображением
 */
function isImage(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url) ||
         url.includes('/assets/') ||
         url.includes('/logo/');
}

/**
 * Проверка, является ли ресурс шрифтом
 */
function isFont(url) {
  return /\.(woff|woff2|ttf|otf|eot)$/i.test(url) ||
         url.includes('/font/');
}

/**
 * Проверка, является ли URL внешним CDN
 */
function isExternalCDN(url) {
  const externalDomains = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'cdn.skypack.dev'
  ];
  try {
    const urlObj = new URL(url);
    return externalDomains.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
    return false;
  }
}

/**
 * Стратегия Cache First
 */
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Для внешних CDN не используем credentials
    const fetchOptions = isExternalCDN(request.url) 
      ? { credentials: 'omit' }
      : {};
    const response = await fetch(request, fetchOptions);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache first error:', error);
    return new Response('Network error', { status: 408 });
  }
}

/**
 * Стратегия Cache First с проверкой срока действия
 */
async function cacheFirstWithExpiry(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    let cached = await cache.match(request);
    
    if (cached) {
      const cachedDate = cached.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate);
        if (age < CACHE_MAX_AGE) {
          return cached;
        }
      } else {
        // Если нет даты, считаем валидным
        return cached;
      }
    }
    
    // Для внешних CDN не используем credentials
    const fetchOptions = isExternalCDN(request.url) 
      ? { credentials: 'omit' }
      : {};
    const response = await fetch(request, fetchOptions);
    
    if (response.ok) {
      // Добавляем заголовок с датой кеширования
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
      
      // Очищаем старые изображения, если кеш переполнен
      cleanupImageCache(cache);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache first with expiry error:', error);
    // Пытаемся вернуть кешированную версию даже если она устарела
    try {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
    } catch (e) {
      // Игнорируем ошибки при получении кеша
    }
    return new Response('Network error', { status: 408 });
  }
}

/**
 * Стратегия Network First
 */
async function networkFirst(request) {
  try {
    const fetchOptions = isExternalCDN(request.url)
      ? { credentials: 'omit' }
      : {};
    const response = await fetch(request, fetchOptions);
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // Не пробрасываем ошибку — возвращаем пустой ответ, чтобы не ломать приложение
    console.warn('[SW] networkFirst fetch failed, no cache:', request.url, error.message);
    return new Response('', { status: 408, statusText: 'Request Timeout' });
  }
}

/**
 * Стратегия Network First с кешированием (для JS файлов)
 */
async function networkFirstWithCache(request, cacheName) {
  try {
    // Всегда пытаемся загрузить с сети, игнорируя кеш
    // Для внешних CDN не используем credentials
    const credentials = isExternalCDN(request.url) ? 'omit' : request.credentials;
    
    const networkRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      cache: 'no-store', // Не кешируем в браузере
      credentials: credentials,
      redirect: request.redirect
    });
    
    const response = await fetch(networkRequest);
    
    if (response.ok) {
      // Обновляем кеш только если получили успешный ответ
      const cache = await caches.open(cacheName);
      // Удаляем старую версию из кеша перед добавлением новой
      await cache.delete(request);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Если сеть недоступна, используем кеш, но только если он не старше 5 минут
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      const cachedDate = cached.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate);
        // Если кеш старше 5 минут, не используем его
        if (age < 5 * 60 * 1000) {
          return cached;
        }
      } else {
        // Если нет даты, используем кеш (старая версия)
        return cached;
      }
    }
    throw error;
  }
}

/**
 * Очистка старых изображений из кеша
 */
async function cleanupImageCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= MAX_IMAGE_CACHE_SIZE) {
      return;
    }
    
    // Сортируем по дате кеширования (старые первыми)
    const entries = await Promise.all(
      keys.map(async (key) => {
        const response = await cache.match(key);
        const cachedDate = response?.headers.get('sw-cached-date');
        return {
          key,
          date: cachedDate ? parseInt(cachedDate) : 0
        };
      })
    );
    
    entries.sort((a, b) => a.date - b.date);
    
    // Удаляем самые старые
    const toDelete = entries.slice(0, entries.length - MAX_IMAGE_CACHE_SIZE);
    await Promise.all(toDelete.map(entry => cache.delete(entry.key)));
    
    console.log('[SW] Cleaned up', toDelete.length, 'old images from cache');
  } catch (error) {
    console.error('[SW] Error cleaning up cache:', error);
  }
}

/**
 * Сообщения от клиента
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
        // Уведомляем клиентов об очистке кеша
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
});

