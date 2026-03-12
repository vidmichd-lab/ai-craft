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

/** Load a single image from URL (uses cache). Returns Promise<Image>; use .catch(() => null) for preload. */
const loadImage = (url) => {
  if (!url || typeof url !== 'string') return Promise.resolve(null);
  const absoluteUrl = !url.startsWith('http') && !url.startsWith('data:')
    ? new URL(url, window.location.origin).href
    : url;
  return Promise.race([
    loadImageCached(absoluteUrl, { useCache: true, showBlur: false }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
  ]).then((cached) => {
    const imgUrl = cached && cached.url ? cached.url : absoluteUrl;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imgUrl;
    });
  }).catch((e) => {
    console.warn('Ошибка загрузки изображения, используем прямой URL:', e);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = absoluteUrl;
    });
  });
};

async function renderSizeToBlob(canvas, width, height, state, format, quality) {
  const { renderToCanvas } = getRendererInternals();
  canvas.width = width;
  canvas.height = height;
  renderToCanvas(canvas, width, height, state);
  await new Promise(r => setTimeout(r, 0));
  const blob = await new Promise(r => canvas.toBlob(r, `image/${format}`, quality));
  return blob;
}

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
  const state = getState();
  const sizes = state.projectMode === 'rsya'
    ? [{ width: 1600, height: 1200, platform: 'РСЯ' }]
    : getCheckedSizes();
  if (!sizes.length) {
    alert('Нет выбранных размеров для экспорта!');
    return;
  }

  if (typeof JSZip === 'undefined') {
    alert('Библиотека JSZip не загружена. Проверьте подключение к интернету.');
    return;
  }

  const pairs = state.projectMode === 'rsya'
    ? [(state.titleSubtitlePairs && state.titleSubtitlePairs[0]) || { title: state.title, subtitle: state.subtitle, kvSelected: state.kvSelected, bgColor: state.bgColor }]
    : (state.titleSubtitlePairs || []);
  
  if (pairs.length === 0) {
    alert('Нет заголовков для экспорта!');
    return;
  }

  const zip = new JSZip();
  const { renderToCanvas } = getRendererInternals();

  // Предзагрузка всех KV и BG изображений параллельно
  const pairAssets = await Promise.all(
    pairs.map(async (pair) => {
      const [kv, bg] = await Promise.all([
        pair.kvSelected ? loadImage(pair.kvSelected).catch(() => null) : Promise.resolve(null),
        pair.bgImageSelected
          ? (typeof pair.bgImageSelected === 'string'
            ? loadImage(pair.bgImageSelected).catch(() => null)
            : Promise.resolve(pair.bgImageSelected))
          : Promise.resolve(null)
      ]);
      const [rsyaKV2, rsyaKV3] = await Promise.all([
        state.rsyaKV2Selected ? loadImage(state.rsyaKV2Selected).catch(() => null) : Promise.resolve(null),
        state.rsyaKV3Selected ? loadImage(state.rsyaKV3Selected).catch(() => null) : Promise.resolve(null)
      ]);
      return { kv, bg, rsyaKV2, rsyaKV3 };
    })
  );

  const totalSizes = pairs.length * sizes.length;
  let completed = 0;
  if (typeof updateExportProgress === 'function') updateExportProgress(0);

  // Экспортируем для каждой пары заголовок/подзаголовок
  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
    const pair = pairs[pairIndex];
    const folderName = sanitizeFolderName(pair.title);
    const pairKV = pairAssets[pairIndex].kv;
    const pairBgImage = pairAssets[pairIndex].bg;
    const pairRsyaKV2 = pairAssets[pairIndex].rsyaKV2;
    const pairRsyaKV3 = pairAssets[pairIndex].rsyaKV3;

    const exportScale = state.exportScale || 1;
    const BATCH_SIZE = 4;
    const quality = format === 'jpeg' ? 0.95 : 1;

    for (let i = 0; i < sizes.length; i += BATCH_SIZE) {
      const batch = sizes.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (size) => {
          const exportState = {
            ...state,
            showBlocks: false,
            showGuides: false,
            title: pair.title || '',
            subtitle: pair.subtitle || '',
            kv: pairKV,
            kvSelected: pair.kvSelected || '',
            bgImage: pairBgImage,
            rsyaKV2: pairRsyaKV2,
            rsyaKV3: pairRsyaKV3,
            bgColor: pair.bgColor || state.bgColor,
            platform: size.platform || 'unknown'
          };
          const canvas = document.createElement('canvas');
          const scaledWidth = size.width * exportScale;
          const scaledHeight = size.height * exportScale;

          let blob;
          try {
            blob = await renderSizeToBlob(canvas, scaledWidth, scaledHeight, exportState, format, quality);
          } catch (e) {
            console.error(e);
            alert('Ошибка экспорта. Запустите проект через локальный сервер.');
            throw e;
          }
          if (!blob) {
            alert('Не удалось сформировать изображение. Возможно, холст «tainted».');
            throw new Error('toBlob failed');
          }

          try {
            const maxFileSizeValue = state.maxFileSizeValue || 200;
            const maxSizeBytes = maxFileSizeValue * 1024;

            if (blob.size <= maxSizeBytes) {
              // skip compression
            } else {
              let compressionLib = null;
              if (typeof window !== 'undefined') {
                compressionLib = window.imageCompression?.default || window.imageCompression || null;
              }
              if (!compressionLib && typeof imageCompression !== 'undefined') {
                compressionLib = imageCompression.default || imageCompression;
              }

              if (compressionLib) {
                const originalSize = blob.size;
                const maxSizeMB = maxSizeBytes / (1024 * 1024);
                const isPNG = format === 'png';

                if (isPNG) {
                  const options = {
                    maxSizeMB: maxSizeMB,
                    maxWidthOrHeight: Math.max(scaledWidth, scaledHeight),
                    useWebWorker: true,
                    fileType: `image/${format}`,
                    initialQuality: 0.9,
                    alwaysKeepResolution: true
                  };
                  const file = new File([blob], `temp.${format === 'jpeg' ? 'jpg' : format}`, { type: `image/${format}` });
                  try {
                    const compressedFile = await compressionLib(file, options);
                    if (compressedFile.size < blob.size) blob = compressedFile;
                  } catch (e) {
                    console.warn('Ошибка при сжатии PNG, используем оригинал:', e);
                  }
                } else {
                  let currentBlob = blob;
                  let q = 0.85;
                  let attempts = 0;
                  const maxAttempts = 3;
                  const qualityStep = 0.15;
                  while (currentBlob.size > maxSizeBytes && attempts < maxAttempts && q > 0.3) {
                    const options = {
                      maxSizeMB: maxSizeMB,
                      maxWidthOrHeight: Math.max(scaledWidth, scaledHeight),
                      useWebWorker: true,
                      fileType: `image/${format}`,
                      initialQuality: q,
                      alwaysKeepResolution: true
                    };
                    const file = new File([currentBlob], `temp.${format === 'jpeg' ? 'jpg' : format}`, { type: `image/${format}` });
                    try {
                      const compressedFile = await compressionLib(file, options);
                      if (compressedFile.size < currentBlob.size && compressedFile.size <= maxSizeBytes) {
                        currentBlob = compressedFile;
                        break;
                      }
                      if (compressedFile.size < currentBlob.size) currentBlob = compressedFile;
                      q -= qualityStep;
                      attempts++;
                    } catch (e) {
                      console.warn(`Ошибка при попытке сжатия (качество ${q}):`, e);
                      q -= qualityStep;
                      attempts++;
                    }
                  }
                  if (currentBlob.size < originalSize) blob = currentBlob;
                }
              } else {
                const compressedBlob = await compressCanvasImage(canvas, format, maxSizeBytes);
                if (compressedBlob) blob = compressedBlob;
              }
            }
          } catch (compressionError) {
            console.warn('Ошибка оптимизации изображения, используем оригинал:', compressionError);
          }

          const platform = (size.platform || 'unknown').toString();
          const filename = `${folderName}/${platform}/${size.width}x${size.height}.${format === 'jpeg' ? 'jpg' : format}`;
          return { path: filename, blob };
        })
      );
      results.forEach((r) => zip.file(r.path, r.blob));
      completed += batch.length;
      const pct = Math.round((completed / totalSizes) * 100);
      if (typeof updateExportProgress === 'function') updateExportProgress(pct);
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
