/**
 * Утилита для lazy loading изображений через Intersection Observer
 */

let observer = null;

/**
 * Инициализирует Intersection Observer для lazy loading изображений
 */
export const initLazyImageLoader = () => {
  // Проверяем поддержку Intersection Observer
  if (!('IntersectionObserver' in window)) {
    // Fallback: загружаем все изображения сразу
    document.querySelectorAll('img[data-src]').forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
    return;
  }

  // Создаем observer с настройками
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          // Загружаем изображение
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          // Убираем placeholder стили
          img.style.backgroundColor = '';
          img.style.minHeight = '';
          // Отключаем наблюдение за этим элементом
          observer.unobserve(img);
        }
      }
    });
  }, {
    // Загружаем изображения за 100px до появления в viewport
    rootMargin: '100px',
    threshold: 0.01
  });
};

/**
 * Начинает наблюдение за изображениями в контейнере
 */
export const observeImages = (container) => {
  if (!observer) {
    initLazyImageLoader();
  }
  
  if (!observer) return;
  
  // Находим все изображения с data-src в контейнере
  const lazyImages = container.querySelectorAll('img[data-src]');
  lazyImages.forEach(img => {
    observer.observe(img);
  });
};

/**
 * Останавливает наблюдение за всеми изображениями
 */
export const disconnectObserver = () => {
  if (observer) {
    observer.disconnect();
  }
};

// Инициализируем при загрузке модуля
if (typeof window !== 'undefined') {
  initLazyImageLoader();
}

