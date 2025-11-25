import { renderer } from './renderer.js';
import { getState, getCheckedSizes } from './state/store.js';
import { loadImage as loadImageCached } from './utils/imageCache.js';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Функция для сжатия изображения через canvas (fallback, если библиотека недоступна)
const compressCanvasImage = async (canvas, format, maxSizeBytes) => {
  let quality = 0.9;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, quality));
  
  // Итеративно снижаем качество, пока не достигнем целевого размера
  while (blob && blob.size > maxSizeBytes && quality > 0.1) {
    quality -= 0.1;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, quality));
  }
  
  return blob;
};

const getRendererInternals = () => {
  if (!renderer.__unsafe_getRenderToCanvas) {
    throw new Error('Renderer internals are not exposed.');
  }
  return renderer.__unsafe_getRenderToCanvas();
};

// Функция для создания безопасного имени папки из заголовка
const sanitizeFolderName = (title) => {
  if (!title || title.trim() === '') {
    return 'untitled';
  }
  // Удаляем недопустимые символы для имен папок
  return title
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Удаляем недопустимые символы
    .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
    .substring(0, 100) // Ограничиваем длину
    || 'untitled';
};

const exportSizes = async (format) => {
  const sizes = getCheckedSizes();
  if (!sizes.length) {
    alert('Нет выбранных размеров для экспорта!');
    return;
  }

  if (typeof JSZip === 'undefined') {
    alert('Библиотека JSZip не загружена. Проверьте подключение к интернету.');
    return;
  }

  const state = getState();
  const pairs = state.titleSubtitlePairs || [];
  
  if (pairs.length === 0) {
    alert('Нет заголовков для экспорта!');
    return;
  }

  const zip = new JSZip();
  const { renderToCanvas } = getRendererInternals();

  // Экспортируем для каждой пары заголовок/подзаголовок
  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
    const pair = pairs[pairIndex];
    const folderName = sanitizeFolderName(pair.title);
    
    // Загружаем KV для этой пары, если указан
    let pairKV = null;
    if (pair.kvSelected) {
      try {
        const src = pair.kvSelected;
        const absoluteUrl = src && !src.startsWith('http') && !src.startsWith('data:')
          ? new URL(src, window.location.origin).href
          : src;
        
        // Используем кеш для загрузки с fallback
        let imgUrl = absoluteUrl;
        try {
          const cached = await Promise.race([
            loadImageCached(absoluteUrl, { useCache: true, showBlur: false }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          imgUrl = cached.url;
        } catch (e) {
          console.warn('Ошибка загрузки через кеш, используем прямой URL:', e);
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imgUrl;
        });
        pairKV = img;
      } catch (e) {
        console.warn(`Не удалось загрузить KV для пары ${pairIndex}: ${pair.kvSelected}`, e);
      }
    }
    
    // Используем фоновое изображение из пары, если оно есть
    // Если это строка (путь к файлу), загружаем изображение
    let pairBgImage = null;
    if (pair.bgImageSelected) {
      if (typeof pair.bgImageSelected === 'string') {
        // Это путь к файлу, загружаем изображение
        try {
          const src = pair.bgImageSelected;
          const absoluteUrl = src && !src.startsWith('http') && !src.startsWith('data:')
            ? new URL(src, window.location.origin).href
            : src;
          
          // Используем кеш для загрузки с fallback
          let imgUrl = absoluteUrl;
          try {
            const cached = await Promise.race([
              loadImageCached(absoluteUrl, { useCache: true, showBlur: false }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            imgUrl = cached.url;
          } catch (e) {
            console.warn('Ошибка загрузки через кеш, используем прямой URL:', e);
          }
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imgUrl;
          });
          pairBgImage = img;
        } catch (e) {
          console.warn(`Не удалось загрузить фоновое изображение для пары ${pairIndex}: ${pair.bgImageSelected}`, e);
        }
      } else {
        // Это уже объект Image
        pairBgImage = pair.bgImageSelected;
      }
    }
    
    // Экспортируем все размеры для этой пары
    const exportScale = state.exportScale || 1;
    for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
      const size = sizes[sizeIndex];
      
      // Создаем state для этой пары и размера
      const exportState = { 
        ...state, 
        showBlocks: false, 
        showGuides: false,
        title: pair.title || '',
        subtitle: pair.subtitle || '',
        kv: pairKV,
        kvSelected: pair.kvSelected || '',
        bgImage: pairBgImage,
        bgColor: pair.bgColor || state.bgColor,
        platform: size.platform || 'unknown' // Передаем платформу для проверки рамки Хабра
      };
      const canvas = document.createElement('canvas');
      
      // Применяем масштаб к размерам canvas
      const scaledWidth = size.width * exportScale;
      const scaledHeight = size.height * exportScale;

      try {
        renderToCanvas(canvas, scaledWidth, scaledHeight, exportState);
      } catch (e) {
        console.error(e);
        alert('Ошибка экспорта. Запустите проект через локальный сервер.');
        return;
      }

      const quality = format === 'jpeg' ? 0.95 : 1;
      let blob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, quality));
      if (!blob) {
        alert('Не удалось сформировать изображение. Возможно, холст «tainted».');
        return;
      }

      // Оптимизируем изображение по весу до указанного размера
      try {
        // Получаем настройки веса файла из state
        const maxFileSizeUnit = state.maxFileSizeUnit || 'KB';
        const maxFileSizeValue = state.maxFileSizeValue || 150;
        // Конвертируем в байты
        const maxSizeBytes = maxFileSizeUnit === 'KB' ? maxFileSizeValue * 1024 : maxFileSizeValue * 1024 * 1024;
        
        // Если изображение уже меньше целевого размера, пропускаем сжатие
        if (blob.size <= maxSizeBytes) {
          console.log(`Изображение уже соответствует размеру: ${(blob.size / 1024).toFixed(2)} KB (максимум: ${(maxSizeBytes / 1024).toFixed(2)} KB)`);
        } else {
          // Проверяем наличие библиотеки оптимизации (может быть доступна через window или глобально)
          let compressionLib = null;
          if (typeof window !== 'undefined') {
            compressionLib = window.imageCompression?.default || window.imageCompression || null;
          }
          if (!compressionLib && typeof imageCompression !== 'undefined') {
            compressionLib = imageCompression.default || imageCompression;
          }
          
          if (compressionLib) {
            const originalSize = blob.size;
            // Конвертируем в MB для библиотеки
            const maxSizeMB = maxSizeBytes / (1024 * 1024);
            
            // Итеративно снижаем качество, пока не достигнем целевого размера
            let currentBlob = blob;
            let quality = format === 'jpeg' ? 0.9 : 0.95;
            let attempts = 0;
            const maxAttempts = 10;
            const qualityStep = 0.1;
            
            while (currentBlob.size > maxSizeBytes && attempts < maxAttempts && quality > 0.1) {
              const options = {
                maxSizeMB: maxSizeMB, // Максимальный размер в MB из настроек
                maxWidthOrHeight: Math.max(scaledWidth, scaledHeight), // Сохраняем размер
                useWebWorker: true, // Используем Web Worker для лучшей производительности
                fileType: `image/${format}`,
                initialQuality: quality, // Качество для оптимизации
                alwaysKeepResolution: true // Сохраняем разрешение
              };
              
              // Конвертируем blob в File для библиотеки
              const file = new File([currentBlob], `temp.${format === 'jpeg' ? 'jpg' : format}`, { 
                type: `image/${format}` 
              });
              
              try {
                // Оптимизируем изображение
                const compressedFile = await compressionLib(file, options);
                
                // Если сжатие не помогло или размер все еще больше целевого, снижаем качество
                if (compressedFile.size >= currentBlob.size || compressedFile.size > maxSizeBytes) {
                  quality -= qualityStep;
                  attempts++;
                  continue;
                }
                
                currentBlob = compressedFile;
                
                // Если достигли целевого размера, выходим
                if (currentBlob.size <= maxSizeBytes) {
                  break;
                }
                
                // Если размер все еще больше, но уменьшился, продолжаем с тем же качеством
                // или немного снижаем для следующей итерации
                if (currentBlob.size < maxSizeBytes * 1.1) {
                  // Близко к целевому размеру, можно остановиться
                  break;
                }
                
                quality -= qualityStep;
                attempts++;
              } catch (e) {
                console.warn(`Ошибка при попытке сжатия (качество ${quality}):`, e);
                quality -= qualityStep;
                attempts++;
              }
            }
            
            if (currentBlob.size <= maxSizeBytes || currentBlob.size < originalSize) {
              blob = currentBlob;
              const savedPercent = ((1 - blob.size / originalSize) * 100).toFixed(1);
              const finalSizeKB = (blob.size / 1024).toFixed(2);
              const targetSizeKB = (maxSizeBytes / 1024).toFixed(2);
              console.log(`Сжато до ${finalSizeKB} KB (цель: ${targetSizeKB} KB, экономия ${savedPercent}%)`);
            } else {
              console.warn(`Не удалось сжать до целевого размера. Текущий размер: ${(currentBlob.size / 1024).toFixed(2)} KB, цель: ${(maxSizeBytes / 1024).toFixed(2)} KB`);
              // Используем лучшее сжатие, которое удалось получить
              if (currentBlob.size < originalSize) {
                blob = currentBlob;
              }
            }
          } else {
            // Если библиотека недоступна, используем встроенное сжатие canvas
            console.warn('Библиотека imageCompression недоступна, используем встроенное сжатие canvas');
            const compressedBlob = await compressCanvasImage(canvas, format, maxSizeBytes);
            if (compressedBlob) {
              blob = compressedBlob;
              const finalSizeKB = (blob.size / 1024).toFixed(2);
              const targetSizeKB = (maxSizeBytes / 1024).toFixed(2);
              console.log(`Сжато через canvas до ${finalSizeKB} KB (цель: ${targetSizeKB} KB)`);
            }
          }
        }
      } catch (compressionError) {
        console.warn('Ошибка оптимизации изображения, используем оригинал:', compressionError);
        // Продолжаем с оригинальным blob, если оптимизация не удалась
      }

      const platform = (size.platform || 'unknown').toString();
      // В имени файла оставляем оригинальный размер, но фактически экспортируем в масштабе
      const filename = `${folderName}/${platform}/${size.width}x${size.height}.${format === 'jpeg' ? 'jpg' : format}`;
      
      // Добавляем файл в ZIP
      zip.file(filename, blob);
    }
  }

  // Генерируем ZIP архив
  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFilename = `${state.namePrefix || 'export'}_${format === 'jpeg' ? 'jpg' : format}.zip`;
    downloadBlob(zipBlob, zipFilename);
    console.log(`Экспорт завершен: ${zipFilename}`);
  } catch (e) {
    console.error('Ошибка создания ZIP архива:', e);
    alert('Не удалось создать ZIP архив.');
  }
};

export const exportPNG = async () => {
  // Находим кнопку и показываем спиннер
  const button = document.querySelector('[data-function="exportAllPNG"]');
  let originalHTML = '';
  let wasDisabled = false;
  
  if (button) {
    originalHTML = button.innerHTML;
    wasDisabled = button.disabled;
    button.disabled = true;
    button.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite; display: inline-block; vertical-align: middle;">refresh</span>';
    
    // Добавляем CSS анимацию для спиннера, если её еще нет
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    // Принудительно перерисовываем, чтобы браузер увидел изменения
    button.offsetHeight;
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  
  try {
    await exportSizes('png');
  } finally {
    // Восстанавливаем исходное состояние кнопки
    if (button) {
      button.disabled = wasDisabled;
      button.innerHTML = originalHTML;
    }
  }
};

export const exportJPG = async () => {
  // Находим кнопку и показываем спиннер
  const button = document.querySelector('[data-function="exportAllJPG"]');
  let originalHTML = '';
  let wasDisabled = false;
  
  if (button) {
    originalHTML = button.innerHTML;
    wasDisabled = button.disabled;
    button.disabled = true;
    button.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite; display: inline-block; vertical-align: middle;">refresh</span>';
    
    // Добавляем CSS анимацию для спиннера, если её еще нет
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    // Принудительно перерисовываем, чтобы браузер увидел изменения
    button.offsetHeight;
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  
  try {
    await exportSizes('jpeg');
  } finally {
    // Восстанавливаем исходное состояние кнопки
    if (button) {
      button.disabled = wasDisabled;
      button.innerHTML = originalHTML;
    }
  }
};


