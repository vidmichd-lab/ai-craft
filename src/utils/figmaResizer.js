/**
 * Модуль для ресайза макетов Figma через Canvas API
 * Экспортирует исходный макет и масштабирует его на клиенте
 */

import { fetchFigmaImages, loadFigmaImage } from './figmaApi.js';

/**
 * Рассчитывает масштаб для ресайза
 * @param {Object} originalSize - Исходный размер {width, height}
 * @param {Object} targetSize - Целевой размер {width, height}
 * @param {string} mode - Режим масштабирования: 'fit', 'fill', 'stretch'
 * @returns {Object} - Масштаб {scaleX, scaleY, offsetX, offsetY, finalWidth, finalHeight}
 */
export const calculateScale = (originalSize, targetSize, mode = 'fit') => {
  const { width: origW, height: origH } = originalSize;
  const { width: targetW, height: targetH } = targetSize;
  
  if (origW === 0 || origH === 0) {
    return {
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
      finalWidth: targetW,
      finalHeight: targetH
    };
  }
  
  let scaleX, scaleY, offsetX, offsetY, finalWidth, finalHeight;
  
  switch (mode) {
    case 'fill':
      // Заполняет весь размер, обрезая при необходимости
      scaleX = targetW / origW;
      scaleY = targetH / origH;
      const fillScale = Math.max(scaleX, scaleY);
      scaleX = fillScale;
      scaleY = fillScale;
      finalWidth = origW * fillScale;
      finalHeight = origH * fillScale;
      offsetX = (targetW - finalWidth) / 2;
      offsetY = (targetH - finalHeight) / 2;
      break;
      
    case 'stretch':
      // Растягивает по обоим осям
      scaleX = targetW / origW;
      scaleY = targetH / origH;
      finalWidth = targetW;
      finalHeight = targetH;
      offsetX = 0;
      offsetY = 0;
      break;
      
    case 'fit':
    default:
      // Вписывает с сохранением пропорций
      scaleX = targetW / origW;
      scaleY = targetH / origH;
      const fitScale = Math.min(scaleX, scaleY);
      scaleX = fitScale;
      scaleY = fitScale;
      finalWidth = origW * fitScale;
      finalHeight = origH * fitScale;
      offsetX = (targetW - finalWidth) / 2;
      offsetY = (targetH - finalHeight) / 2;
      break;
  }
  
  return {
    scaleX,
    scaleY,
    offsetX,
    offsetY,
    finalWidth,
    finalHeight
  };
};

/**
 * Ресайзит изображение через Canvas
 * @param {Image|HTMLImageElement} image - Исходное изображение
 * @param {Object} targetSize - Целевой размер {width, height}
 * @param {string} mode - Режим масштабирования
 * @param {string} backgroundColor - Цвет фона (для режима 'fit')
 * @returns {Promise<HTMLCanvasElement>} - Canvas с ресайзнутым изображением
 */
export const resizeImage = async (image, targetSize, mode = 'fit', backgroundColor = '#000000') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;
  
  // Заполняем фон
  if (backgroundColor && mode === 'fit') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  const originalSize = {
    width: image.width || image.naturalWidth,
    height: image.height || image.naturalHeight
  };
  
  const scale = calculateScale(originalSize, targetSize, mode);
  
  // Применяем сглаживание для лучшего качества
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Рисуем изображение
  ctx.drawImage(
    image,
    scale.offsetX,
    scale.offsetY,
    scale.finalWidth,
    scale.finalHeight
  );
  
  return canvas;
};

/**
 * Экспортирует макет Figma и ресайзит его на все размеры
 * @param {string} fileKey - File key
 * @param {string} nodeId - Node ID
 * @param {Array} sizes - Массив размеров [{width, height, platform}]
 * @param {string} token - Personal Access Token
 * @param {string} mode - Режим масштабирования
 * @param {Function} onProgress - Callback для отслеживания прогресса (current, total)
 * @returns {Promise<Array>} - Массив Canvas элементов для каждого размера
 */
export const exportAndResizeFigmaLayout = async (
  fileKey,
  nodeId,
  sizes,
  token,
  mode = 'fit',
  onProgress = null
) => {
  if (!sizes || sizes.length === 0) {
    throw new Error('Не указаны размеры для экспорта');
  }
  
  // Экспортируем исходное изображение из Figma
  // Важно: Figma API требует node ID в формате с двоеточием для экспорта изображений
  const nodeIdForExport = nodeId.replace(/-/g, ':');
  
  let imagesResponse;
  try {
    imagesResponse = await fetchFigmaImages(fileKey, [nodeIdForExport], token, 2, 'png');
  } catch (error) {
    console.error('Ошибка при запросе изображения из Figma:', error);
    throw new Error(`Ошибка при экспорте изображения из Figma: ${error.message}`);
  }
  
  if (!imagesResponse || !imagesResponse.images) {
    const errorMsg = imagesResponse?.err || 'Неизвестная ошибка';
    throw new Error(`Не удалось экспортировать изображение из Figma: ${errorMsg}`);
  }
  
  // Проверяем все возможные форматы node ID (с двоеточием и с дефисом)
  const nodeIdVariants = [nodeIdForExport, nodeId, nodeId.replace(/-/g, ':'), nodeId.replace(/:/g, '-')];
  let imageUrl = null;
  
  for (const variant of nodeIdVariants) {
    if (imagesResponse.images[variant]) {
      imageUrl = imagesResponse.images[variant];
      break;
    }
  }
  
  if (!imageUrl) {
    // Пробуем найти любой доступный ключ в images
    const availableKeys = Object.keys(imagesResponse.images);
    if (availableKeys.length > 0) {
      imageUrl = imagesResponse.images[availableKeys[0]];
      console.warn(`Node ID ${nodeId} не найден, используется ${availableKeys[0]}`);
    } else {
      const errorDetails = imagesResponse.err ? ` Ошибка API: ${imagesResponse.err}` : '';
      throw new Error(`Не удалось экспортировать изображение из Figma. Node ID: ${nodeId}.${errorDetails}`);
    }
  }
  
  if (!imageUrl || imageUrl === 'null') {
    throw new Error('Figma API вернул пустой URL изображения. Возможно, нода не может быть экспортирована как изображение.');
  }
  
  // Загружаем изображение
  const originalImage = await loadFigmaImage(imageUrl);
  
  // Определяем исходный размер (из изображения или из структуры)
  const originalSize = {
    width: originalImage.naturalWidth || originalImage.width,
    height: originalImage.naturalHeight || originalImage.height
  };
  
  // Ресайзим на все размеры
  const results = [];
  const total = sizes.length;
  
  for (let i = 0; i < total; i++) {
    const size = sizes[i];
    const targetSize = {
      width: size.width,
      height: size.height
    };
    
    // Ресайзим изображение
    const resizedCanvas = await resizeImage(originalImage, targetSize, mode);
    
    results.push({
      canvas: resizedCanvas,
      size: targetSize,
      platform: size.platform || 'unknown',
      originalSize: originalSize
    });
    
    // Вызываем callback прогресса
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }
  
  return results;
};

/**
 * Конвертирует Canvas в Blob
 * @param {HTMLCanvasElement} canvas - Canvas элемент
 * @param {string} format - Формат ('png' или 'jpeg')
 * @param {number} quality - Качество (0-1, только для JPEG)
 * @returns {Promise<Blob>} - Blob изображения
 */
export const canvasToBlob = (canvas, format = 'png', quality = 0.95) => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Не удалось создать blob из canvas'));
        }
      },
      `image/${format}`,
      format === 'jpeg' ? quality : undefined
    );
  });
};

/**
 * Оптимизирует изображение (если доступна библиотека imageCompression)
 * @param {Blob} blob - Исходный blob
 * @param {Object} options - Опции оптимизации
 * @returns {Promise<Blob>} - Оптимизированный blob
 */
export const optimizeImage = async (blob, options = {}) => {
  // Проверяем наличие библиотеки оптимизации
  let compressionLib = null;
  if (typeof window !== 'undefined') {
    compressionLib = window.imageCompression?.default || window.imageCompression || null;
  }
  if (!compressionLib && typeof imageCompression !== 'undefined') {
    compressionLib = imageCompression.default || imageCompression;
  }
  
  if (!compressionLib) {
    // Если библиотека недоступна, возвращаем оригинал
    return blob;
  }
  
  try {
    const file = new File([blob], 'temp.png', { type: blob.type });
    const defaultOptions = {
      maxSizeMB: 2,
      useWebWorker: true,
      alwaysKeepResolution: true
    };
    
    const compressedFile = await compressionLib(file, { ...defaultOptions, ...options });
    return compressedFile;
  } catch (e) {
    console.warn('Ошибка оптимизации изображения:', e);
    return blob;
  }
};

