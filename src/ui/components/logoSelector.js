/**
 * Модуль для работы с логотипами
 * Содержит функции выбора, загрузки, отображения и управления логотипами
 */

import { getState, setKey, setState } from '../../state/store.js';
import { AVAILABLE_LOGOS } from '../../constants.js';
import { scanLogos } from '../../utils/assetScanner.js';
import { renderer } from '../../renderer.js';
import { getDom } from '../domCache.js';
import { observeImages } from '../../utils/lazyImageLoader.js';
import { t } from '../../utils/i18n.js';

// Кэш для отсканированных логотипов (структурированный)
let cachedLogosStructure = null;
let logosScanning = false;

/**
 * Обновляет прогресс-бар для логотипов
 */
const updateLogoProgress = (percent) => {
  const progressBar = document.getElementById('logoProgressBar');
  const progressText = document.getElementById('logoProgressText');
  if (progressBar) {
    const clampedPercent = Math.min(100, Math.max(0, percent));
    progressBar.style.width = `${clampedPercent}%`;
    if (progressText) {
      progressText.textContent = `${Math.round(clampedPercent)}%`;
    }
  }
};

// Выбранные папки для навигации по структуре логотипов
let selectedLogoFolder1 = null;
let selectedLogoFolder2 = null;
let selectedLogoFolder3 = null;

const canUseDirectPreviewSrc = (src) => typeof src === 'string' && (
  src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')
);

const flattenNestedFiles = (node) => {
  if (Array.isArray(node)) return [...node];
  if (!node || typeof node !== 'object') return [];
  return Object.values(node).flatMap((value) => flattenNestedFiles(value));
};

const findResolvedLogoSource = async (logoFile) => {
  if (!logoFile || typeof logoFile !== 'string') return null;

  if (!cachedLogosStructure && !logosScanning) {
    cachedLogosStructure = await scanLogos().catch(() => null);
  }

  const allLogos = flattenNestedFiles(cachedLogosStructure);
  if (!allLogos.length) return null;

  return allLogos.find((item) => {
    if (!item?.file) return false;
    if (item.file === logoFile) return true;
    if (typeof item.key === 'string' && item.key) {
      return item.key.endsWith(logoFile);
    }
    return false;
  }) || null;
};

/**
 * Загружает изображение из файла или URL (без кеширования для модальных окон)
 */
const loadImage = async (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => {
      console.error(`Failed to load image: ${src}`, error);
      reject(new Error(`Failed to load image: ${src}`));
    };
    // Используем абсолютный URL для относительных путей
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      img.src = new URL(src, window.location.origin).href;
    } else {
      img.src = src;
    }
  });
};

/**
 * Читает файл как Data URL
 */
const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Обновляет UI для логотипа
 */
export const updateLogoUI = () => {
  const dom = getDom();
  const { logo, logoSelected } = getState();
  const logoRemoveBtn = document.getElementById('logoRemoveBtn');
  const logoPreviewImg = document.getElementById('logoPreviewImg');
  const logoPreviewPlaceholder = document.getElementById('logoPreviewPlaceholder');
  const logoPreviewContainer = document.getElementById('logoPreviewContainer');
  
  // Обновляем превью логотипа
  if (logoPreviewImg && logoPreviewPlaceholder) {
    if (logo) {
      // Загруженное изображение
      logoPreviewImg.src = logo.src;
      logoPreviewImg.style.display = 'block';
      logoPreviewPlaceholder.style.display = 'none';
    } else if (canUseDirectPreviewSrc(logoSelected)) {
      // Предзагруженный логотип
      logoPreviewImg.src = logoSelected;
      logoPreviewImg.style.display = 'block';
      logoPreviewPlaceholder.style.display = 'none';
    } else {
      // Нет логотипа
      logoPreviewImg.src = '';
      logoPreviewImg.style.display = 'none';
      logoPreviewPlaceholder.style.display = 'block';
    }
  }
  
  // Добавляем обработчик клика на превью для открытия модального окна
  if (logoPreviewContainer) {
    logoPreviewContainer.style.cursor = 'pointer';
    // Используем data-атрибут для отслеживания, был ли уже добавлен обработчик
    if (!logoPreviewContainer.dataset.clickHandlerAdded) {
      logoPreviewContainer.addEventListener('click', async () => {
        await openLogoSelectModal();
      });
      logoPreviewContainer.dataset.clickHandlerAdded = 'true';
    }
  }
  
  // Обновляем состояние кнопки "Удалить"
  const logoUploadBtn = document.getElementById('logoUploadBtn');
  const logoReplaceBtn = document.getElementById('logoReplaceBtn');
  
  if (logoRemoveBtn) {
    const hasLogo = !!(logo || logoSelected);
    logoRemoveBtn.disabled = !hasLogo;
    if (hasLogo) {
      logoRemoveBtn.style.opacity = '1';
      logoRemoveBtn.style.cursor = 'pointer';
    } else {
      logoRemoveBtn.style.opacity = '0.5';
      logoRemoveBtn.style.cursor = 'not-allowed';
    }
  }
  
  // Показываем/скрываем кнопки "Загрузить" и "Заменить"
  const hasLogo = !!(logo || logoSelected);
  if (logoUploadBtn) {
    logoUploadBtn.style.display = hasLogo ? 'none' : 'flex';
  }
  if (logoReplaceBtn) {
    logoReplaceBtn.style.display = hasLogo ? 'flex' : 'none';
  }
};

/**
 * Загружает логотип из файла
 */
export const handleLogoUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  (async () => {
    try {
      const dataURL = await readFileAsDataURL(file);
      const img = await loadImage(dataURL);
      setKey('logo', img);
      updateLogoUI();
      renderer.render();
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить изображение.');
    }
  })();
};

/**
 * Очищает выбранный логотип
 */
export const clearLogo = () => {
  setState({ logo: null, logoSelected: '' });
  const dom = getDom();
  if (dom.logoSelect) dom.logoSelect.value = '';
  updateLogoTriggerText('');
  updateLogoUI();
  renderer.render();
};

/**
 * Выбирает предзагруженный логотип
 */
export const selectPreloadedLogo = async (logoFile) => {
  const dom = getDom();
  
  // Если выбор из медиа-админки для варианта RU/KZ/PRO — сохраняем только дефолт для варианта
  const variant = window._adminDefaultLogoVariant;
  if (variant && (variant === 'ru' || variant === 'kz' || variant === 'pro')) {
    window._adminDefaultLogoVariant = null;
    const key = variant === 'ru' ? 'defaultLogoRU' : variant === 'kz' ? 'defaultLogoKZ' : 'defaultLogoPRO';
    setKey(key, logoFile || '');
    if (typeof window.updateLogoAssetsPreview === 'function') {
      window.updateLogoAssetsPreview();
    }
    closeLogoSelectModal();
    return;
  }
  
  // Закрываем модальное окно выбора
  closeLogoSelectModal();
  
  if (!logoFile) {
    setState({ logo: null, logoSelected: '' });
    updateLogoTriggerText('');
    updateLogoUI();
    renderer.render();
    return;
  }

  updateLogoTriggerText(logoFile);

  // Пробуем найти логотип в структуре или загрузить напрямую
  let logoInfo = null;
  
  // Сначала проверяем в AVAILABLE_LOGOS (если есть)
  if (AVAILABLE_LOGOS && AVAILABLE_LOGOS.length > 0) {
    logoInfo = AVAILABLE_LOGOS.find((logo) => logo.file === logoFile);
  }
  
  // Если не нашли, пробуем загрузить напрямую по пути
  if (!logoInfo) {
    const pathParts = logoFile.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace(/\.(svg|png)$/, '');
    const displayName = nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1).replace(/_/g, ' ');
    logoInfo = { file: logoFile, name: displayName };
  }

  try {
    const resolvedLogo = !logoInfo.file.startsWith('http')
      ? await findResolvedLogoSource(logoFile)
      : null;
    let resolvedFile = resolvedLogo?.file || logoInfo.file;
    try {
      const img = await loadImage(resolvedFile);
      // Проверяем, что изображение действительно загрузилось
      if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
        throw new Error(`Изображение не загружено: ${resolvedFile}`);
      }
      // Обновляем оба поля: logo и logoSelected
      setState({ logo: img, logoSelected: logoFile });
      if (dom.logoSelect) dom.logoSelect.value = logoFile;
      updateLogoUI();
      renderer.render();
      return;
    } catch (primaryError) {
      const fallbackLogo = await findResolvedLogoSource(logoFile);
      if (!fallbackLogo?.file || fallbackLogo.file === resolvedFile) {
        throw primaryError;
      }
      resolvedFile = fallbackLogo.file;
    }

    const img = await loadImage(resolvedFile);
    // Проверяем, что изображение действительно загрузилось
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new Error(`Изображение не загружено: ${resolvedFile}`);
    }
    // Обновляем оба поля: logo и logoSelected
    setState({ logo: img, logoSelected: logoFile });
    if (dom.logoSelect) dom.logoSelect.value = logoFile;
    updateLogoUI();
    renderer.render();
  } catch (error) {
    console.error('Ошибка загрузки логотипа:', error, 'Путь:', logoInfo.file);
    console.error(error);
    alert('Не удалось загрузить логотип.');
    setState({ logo: null, logoSelected: '' });
    updateLogoUI();
    renderer.render();
  }
};

/**
 * Обновляет текст триггера выбора логотипа
 */
export const updateLogoTriggerText = async (value) => {
  const textSpan = document.getElementById('logoSelectText');
  if (!textSpan) return;
  
  if (!value) {
    textSpan.textContent = t('logo.select');
    return;
  }
  
  // Если есть логотип, показываем "Выбрать из библиотеки"
  textSpan.textContent = t('layout.bgImage.select');
};

/**
 * Рендерит первую колонку со списком папок первого уровня
 */
const renderLogoColumn1 = (allLogos) => {
  const column1 = document.getElementById('logoFolder1Column');
  if (!column1) {
    console.error('logoFolder1Column not found');
    return;
  }
  
  column1.innerHTML = '';
  const folders1 = Object.keys(allLogos || {}).sort();
  
  if (folders1.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.textContent = t('logo.notFound');
    emptyMsg.className = 'column-empty-message';
    column1.appendChild(emptyMsg);
    return;
  }
  
  folders1.forEach((folder1) => {
    const item = document.createElement('div');
    item.className = 'column-item logo-folder1-item';
    item.dataset.folder1 = folder1;
    item.textContent = folder1;
    item.style.cursor = 'pointer'; // Убеждаемся, что курсор указывает на кликабельность
    
    const clickHandler = (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна
      selectedLogoFolder1 = folder1;
      selectedLogoFolder2 = null;
      selectedLogoFolder3 = null;
      // Обновляем стили
      document.querySelectorAll('.logo-folder1-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      
      // Обновляем вторую колонку
      renderLogoColumn2(allLogos);
      // Очищаем колонки
      const column3 = document.getElementById('logoFolder3Column');
      const column4 = document.getElementById('logoImagesColumn');
      if (column3) {
        column3.innerHTML = '';
        column3.style.display = 'none';
      }
      if (column4) {
        column4.innerHTML = '';
      }
    };
    
    item.addEventListener('click', clickHandler);
    
    column1.appendChild(item);
  });
  
  // Выбираем первую папку по умолчанию
  if (folders1.length > 0 && !selectedLogoFolder1) {
    selectedLogoFolder1 = folders1[0];
    const firstItem = column1.querySelector(`[data-folder1="${folders1[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      // Сбрасываем выбранные подпапки
      selectedLogoFolder2 = null;
      selectedLogoFolder3 = null;
      renderLogoColumn2(allLogos);
    }
  }
};

/**
 * Рендерит вторую колонку со списком папок второго уровня
 */
const renderLogoColumn2 = (allLogos) => {
  const column2 = document.getElementById('logoFolder2Column');
  const column3 = document.getElementById('logoFolder3Column');
  if (!column2 || !selectedLogoFolder1) return;
  
  column2.innerHTML = '';
  const folders2 = Object.keys(allLogos[selectedLogoFolder1] || {}).sort();
  
  folders2.forEach((folder2) => {
    const item = document.createElement('div');
    item.className = 'column-item logo-folder2-item';
    item.dataset.folder2 = folder2;
    // Показываем "root" как пустую строку или скрываем
    item.textContent = folder2 === 'root' ? '—' : folder2;
    item.style.cursor = 'pointer'; // Убеждаемся, что курсор указывает на кликабельность
    
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна
      selectedLogoFolder2 = folder2;
      selectedLogoFolder3 = null;
      // Обновляем стили
      document.querySelectorAll('.logo-folder2-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      
      const folder2Data = allLogos[selectedLogoFolder1][selectedLogoFolder2];
      
      // Проверяем, является ли это трехуровневой структурой (объект) или массивом
      if (folder2Data && typeof folder2Data === 'object' && !Array.isArray(folder2Data)) {
        // Трехуровневая структура - показываем колонку 3
        if (column3) {
          column3.style.display = 'block';
        }
        renderLogoColumn3(allLogos);
      } else {
        // Двухуровневая структура - скрываем колонку 3 и показываем изображения
        if (column3) {
          column3.style.display = 'none';
        }
        const images = Array.isArray(folder2Data) ? folder2Data : [];
        
        // Фильтруем по языку, если выбран kz
        const state = getState();
        const selectedLanguage = state.logoLanguage || 'ru';
        const filteredImages = selectedLanguage === 'kz' 
          ? images.filter(logo => logo.file.includes(`/${selectedLanguage}/`))
          : images;
        
        renderLogoColumn4(filteredImages);
      }
      
    });
    
    column2.appendChild(item);
  });
  
  // Выбираем первую подпапку по умолчанию
  if (folders2.length > 0 && !selectedLogoFolder2) {
    selectedLogoFolder2 = folders2[0];
    const firstItem = column2.querySelector(`[data-folder2="${folders2[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      const folder2Data = allLogos[selectedLogoFolder1][selectedLogoFolder2];
      if (folder2Data && typeof folder2Data === 'object' && !Array.isArray(folder2Data)) {
        if (column3) {
          column3.style.display = 'block';
        }
        renderLogoColumn3(allLogos);
      } else {
        if (column3) {
          column3.style.display = 'none';
        }
        const images = Array.isArray(folder2Data) ? folder2Data : [];
        
        // Фильтруем по языку, если выбран kz
        const state = getState();
        const selectedLanguage = state.logoLanguage || 'ru';
        const filteredImages = selectedLanguage === 'kz' 
          ? images.filter(logo => logo.file.includes(`/${selectedLanguage}/`))
          : images;
        
        renderLogoColumn4(filteredImages);
      }
    }
  }
};

/**
 * Рендерит третью колонку со списком папок третьего уровня
 */
const renderLogoColumn3 = (allLogos) => {
  const column3 = document.getElementById('logoFolder3Column');
  if (!column3 || !selectedLogoFolder1 || !selectedLogoFolder2) return;
  
  column3.innerHTML = '';
  const folder2Data = allLogos[selectedLogoFolder1][selectedLogoFolder2];
  
  // Проверяем, является ли это трехуровневой структурой
  if (!folder2Data || typeof folder2Data !== 'object' || Array.isArray(folder2Data)) {
    return;
  }
  
  const state = getState();
  const selectedLanguage = state.logoLanguage || 'ru';
  
  // Фильтруем языки: если выбран kz, показываем только kz
  let folders3 = Object.keys(folder2Data).sort();
  if (selectedLanguage === 'kz') {
    folders3 = folders3.filter(folder => folder === 'kz');
  }
  
  folders3.forEach((folder3) => {
    const item = document.createElement('div');
    item.className = 'column-item logo-folder3-item';
    item.dataset.folder3 = folder3;
    item.textContent = folder3 === 'root' ? '—' : folder3.toUpperCase();
    item.style.cursor = 'pointer'; // Убеждаемся, что курсор указывает на кликабельность
    
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна
      selectedLogoFolder3 = folder3;
      // Обновляем стили
      document.querySelectorAll('.logo-folder3-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      
      // Обновляем четвертую колонку с изображениями
      const images = folder2Data[folder3] || [];
      renderLogoColumn4(images);
    });
    
    column3.appendChild(item);
  });
  
  // Выбираем первую подпапку по умолчанию
  if (folders3.length > 0 && !selectedLogoFolder3) {
    selectedLogoFolder3 = folders3[0];
    const firstItem = column3.querySelector(`[data-folder3="${folders3[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      const images = folder2Data[selectedLogoFolder3] || [];
      renderLogoColumn4(images);
    }
  }
};

/**
 * Рендерит четвертую колонку с изображениями логотипов
 */
const renderLogoColumn4 = (images) => {
  const column4 = document.getElementById('logoImagesColumn');
  if (!column4) return;
  
  column4.innerHTML = '';
  
  // Показываем прогресс-бар, если изображений нет или идет загрузка
  if (!images || images.length === 0 || logosScanning) {
    const progressContainer = document.createElement('div');
    progressContainer.id = 'logoProgressContainer';
    progressContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; min-height: 200px; width: 100%;';
    
    const text = document.createElement('div');
    text.textContent = t('logo.loading');
    text.style.cssText = 'margin-bottom: 16px; color: var(--text-primary, #e9e9e9); font-size: 14px; text-align: center;';
    
    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = 'width: 100%; max-width: 300px; position: relative;';
    
    const progressBarBg = document.createElement('div');
    progressBarBg.style.cssText = 'width: 100%; height: 8px; background: var(--bg-secondary, #1a1a1a); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color, #2a2a2a); position: relative;';
    
    const progressBar = document.createElement('div');
    progressBar.id = 'logoProgressBar';
    progressBar.style.cssText = 'height: 100%; width: 0%; background: linear-gradient(90deg, var(--accent-color, #027EF2), #00a8ff); border-radius: 4px; transition: width 0.3s ease; position: absolute; top: 0; left: 0;';
    
    const progressText = document.createElement('div');
    progressText.id = 'logoProgressText';
    progressText.style.cssText = 'margin-top: 12px; text-align: center; color: var(--text-secondary, #b4b4b4); font-size: 13px; font-weight: 500;';
    progressText.textContent = '0%';
    
    progressBarBg.appendChild(progressBar);
    progressBarContainer.appendChild(progressBarBg);
    progressBarContainer.appendChild(progressText);
    progressContainer.appendChild(text);
    progressContainer.appendChild(progressBarContainer);
    column4.appendChild(progressContainer);
    
    return;
  }
  
  const state = getState();
  const selectedLanguage = state.logoLanguage || 'ru';
  
  // Фильтруем логотипы по выбранному языку
  const filteredImages = images.filter((logo) => {
    if (selectedLanguage === 'kz') {
      // Если выбран kz, показываем только логотипы из папки kz
      return logo.file.includes(`/${selectedLanguage}/`);
    }
    // Если выбран ru, показываем все (ru, en, kz)
    return true;
  });
  
  // Если после фильтрации ничего не осталось, показываем сообщение
  if (filteredImages.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.style.cssText = 'display: flex; align-items: center; justify-content: center; padding: 40px; min-height: 200px; color: #888; font-size: 14px;';
    emptyMessage.textContent = t('logo.loading');
    column4.appendChild(emptyMessage);
    return;
  }
  
  filteredImages.forEach((logo, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'preview-item';
    
    const img = document.createElement('img');
    img.alt = logo.name;
    
    // Используем data-src для lazy loading через Intersection Observer
    // Первые 12 изображений загружаем сразу для быстрого отображения
    if (index < 12) {
      img.src = logo.file;
      img.loading = 'eager';
      // Добавляем обработчик ошибок для отладки
      img.onerror = () => {
        console.warn('Ошибка загрузки изображения:', logo.file);
        img.style.backgroundColor = '#ff0000';
        img.style.minHeight = '100px';
      };
    } else {
      // Для остальных используем data-src и загружаем при появлении в viewport
      img.dataset.src = logo.file;
      img.loading = 'lazy';
      // Показываем placeholder
      img.style.backgroundColor = '#1a1a1a';
      img.style.minHeight = '100px';
      img.style.width = '100%';
      img.style.objectFit = 'cover';
    }
    
    imgContainer.appendChild(img);
    
    imgContainer.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна до выбора
      selectPreloadedLogo(logo.file);
      // Закрываем модальное окно после выбора
      closeLogoSelectModal();
    });
    
    column4.appendChild(imgContainer);
  });
  
  // Запускаем lazy loading для изображений в колонке
  observeImages(column4);
};

/**
 * Строит структуру логотипов из отсканированных данных
 */
const buildLogoStructure = (scannedLogos) => {
  const logoStructure = {};
  
  // Добавляем AVAILABLE_LOGOS в структуру
  AVAILABLE_LOGOS.forEach(logo => {
    const pathParts = logo.file.split('/');
    if (pathParts.length >= 3 && pathParts[0] === 'logo') {
      const folder1 = pathParts[1];
      
      // Проверяем трехуровневую структуру (logo/folder1/folder2/folder3/file)
      if (pathParts.length === 5) {
        const folder2 = pathParts[2];
        const folder3 = pathParts[3];
        if (!logoStructure[folder1]) {
          logoStructure[folder1] = {};
        }
        if (!logoStructure[folder1][folder2]) {
          logoStructure[folder1][folder2] = {};
        }
        if (!logoStructure[folder1][folder2][folder3]) {
          logoStructure[folder1][folder2][folder3] = [];
        }
        if (!logoStructure[folder1][folder2][folder3].find(l => l.file === logo.file)) {
          logoStructure[folder1][folder2][folder3].push(logo);
        }
      }
      // Проверяем двухуровневую структуру (logo/folder1/folder2/file)
      else if (pathParts.length === 4) {
        const folder2 = pathParts[2];
        if (!logoStructure[folder1]) {
          logoStructure[folder1] = {};
        }
        if (!logoStructure[folder1][folder2]) {
          logoStructure[folder1][folder2] = [];
        }
        if (!logoStructure[folder1][folder2].find(l => l.file === logo.file)) {
          logoStructure[folder1][folder2].push(logo);
        }
      } else {
        // Одноуровневая структура (logo/folder1/file) - используем "root" как folder2
        if (!logoStructure[folder1]) {
          logoStructure[folder1] = {};
        }
        if (!logoStructure[folder1]['root']) {
          logoStructure[folder1]['root'] = [];
        }
        if (!logoStructure[folder1]['root'].find(l => l.file === logo.file)) {
          logoStructure[folder1]['root'].push(logo);
        }
      }
    }
  });
  
  // Добавляем отсканированные логотипы
  scannedLogos.forEach(logo => {
    const pathParts = logo.file.split('/');
    if (pathParts.length >= 3 && pathParts[0] === 'logo') {
      const folder1 = pathParts[1];
      
      // Проверяем трехуровневую структуру (logo/folder1/folder2/folder3/file)
      if (pathParts.length === 5) {
        const folder2 = pathParts[2];
        const folder3 = pathParts[3];
        if (!logoStructure[folder1]) {
          logoStructure[folder1] = {};
        }
        if (!logoStructure[folder1][folder2]) {
          logoStructure[folder1][folder2] = {};
        }
        if (!logoStructure[folder1][folder2][folder3]) {
          logoStructure[folder1][folder2][folder3] = [];
        }
        if (!logoStructure[folder1][folder2][folder3].find(l => l.file === logo.file)) {
          logoStructure[folder1][folder2][folder3].push(logo);
        }
      }
      // Проверяем двухуровневую структуру (logo/folder1/folder2/file)
      else if (pathParts.length === 4) {
        const folder2 = pathParts[2];
        if (!logoStructure[folder1]) {
          logoStructure[folder1] = {};
        }
        // Если уже есть трехуровневая структура, добавляем в 'root'
        if (logoStructure[folder1][folder2] && typeof logoStructure[folder1][folder2] === 'object' && !Array.isArray(logoStructure[folder1][folder2])) {
          if (!logoStructure[folder1][folder2]['root']) {
            logoStructure[folder1][folder2]['root'] = [];
          }
          if (!logoStructure[folder1][folder2]['root'].find(l => l.file === logo.file)) {
            logoStructure[folder1][folder2]['root'].push(logo);
          }
        } else {
          if (!logoStructure[folder1][folder2]) {
            logoStructure[folder1][folder2] = [];
          }
          if (!logoStructure[folder1][folder2].find(l => l.file === logo.file)) {
            logoStructure[folder1][folder2].push(logo);
          }
        }
      } else {
        // Одноуровневая структура (logo/folder1/file) - используем "root" как folder2
        if (!logoStructure[folder1]) {
          logoStructure[folder1] = {};
        }
        if (!logoStructure[folder1]['root']) {
          logoStructure[folder1]['root'] = [];
        }
        if (!logoStructure[folder1]['root'].find(l => l.file === logo.file)) {
          logoStructure[folder1]['root'].push(logo);
        }
      }
    }
  });
  
  return logoStructure;
};

/**
 * Заполняет колонки логотипами
 */
const populateLogoColumns = async (forceRefresh = false) => {
  const column1 = document.getElementById('logoFolder1Column');
  if (!column1) return;
  
  // Если уже сканируем, ждем
  if (logosScanning) {
    return;
  }
  
  // Если принудительное обновление, очищаем кэш
  if (forceRefresh) {
    cachedLogosStructure = null;
    selectedLogoFolder1 = null;
    selectedLogoFolder2 = null;
    selectedLogoFolder3 = null;
  }
  
  // Если есть кэш и не принудительное обновление, используем его
  if (cachedLogosStructure && !forceRefresh) {
    // Сбрасываем выбранные папки, чтобы автоматически выбралась первая
    selectedLogoFolder1 = null;
    selectedLogoFolder2 = null;
    selectedLogoFolder3 = null;
    renderLogoColumn1(cachedLogosStructure);
    return;
  }
  
  // Сначала показываем папки из AVAILABLE_LOGOS (известные данные) сразу
  const initialStructure = {};
  AVAILABLE_LOGOS.forEach(logo => {
    const pathParts = logo.file.split('/');
    if (pathParts.length >= 3 && pathParts[0] === 'logo') {
      const folder1 = pathParts[1];
      if (!initialStructure[folder1]) {
        initialStructure[folder1] = {};
      }
      // Создаем структуру и добавляем сам логотип
      if (pathParts.length === 5) {
        const folder2 = pathParts[2];
        const folder3 = pathParts[3];
        if (!initialStructure[folder1][folder2]) {
          initialStructure[folder1][folder2] = {};
        }
        if (!initialStructure[folder1][folder2][folder3]) {
          initialStructure[folder1][folder2][folder3] = [];
        }
        // Добавляем логотип в массив
        if (!initialStructure[folder1][folder2][folder3].find(l => l.file === logo.file)) {
          initialStructure[folder1][folder2][folder3].push(logo);
        }
      } else if (pathParts.length === 4) {
        const folder2 = pathParts[2];
        if (!initialStructure[folder1][folder2]) {
          initialStructure[folder1][folder2] = [];
        }
        // Добавляем логотип в массив
        if (!initialStructure[folder1][folder2].find(l => l.file === logo.file)) {
          initialStructure[folder1][folder2].push(logo);
        }
      } else {
        if (!initialStructure[folder1]['root']) {
          initialStructure[folder1]['root'] = [];
        }
        // Добавляем логотип в массив
        if (!initialStructure[folder1]['root'].find(l => l.file === logo.file)) {
          initialStructure[folder1]['root'].push(logo);
        }
      }
    }
  });
  
  // Показываем папки сразу, не дожидаясь сканирования
  if (Object.keys(initialStructure).length > 0) {
    selectedLogoFolder1 = null;
    selectedLogoFolder2 = null;
    selectedLogoFolder3 = null;
    renderLogoColumn1(initialStructure);
  } else {
    // Если нет известных данных, показываем базовую структуру папок (black, white)
    const basicStructure = {
      black: { ru: [], en: [], kz: [] },
      white: { ru: [], en: [], kz: [] }
    };
    selectedLogoFolder1 = null;
    selectedLogoFolder2 = null;
    selectedLogoFolder3 = null;
    renderLogoColumn1(basicStructure);
  }
  
  // Используем кэш, если доступен
  if (cachedLogosStructure && !forceRefresh) {
    selectedLogoFolder1 = null;
    selectedLogoFolder2 = null;
    selectedLogoFolder3 = null;
    renderLogoColumn1(cachedLogosStructure);
    return;
  }
  
  // Сканируем в фоне по папкам постепенно и обновляем структуру
  logosScanning = true;
  
  // Начинаем с текущей структуры (известные данные или базовая)
  let logoStructure = {};
  if (Object.keys(initialStructure).length > 0) {
    logoStructure = JSON.parse(JSON.stringify(initialStructure)); // Глубокое копирование
  } else {
    logoStructure = {
      black: { ru: [], en: [], kz: [] },
      white: { ru: [], en: [], kz: [] }
    };
  }
  
  // Сканируем по папкам постепенно
  const firstLevelFolders = ['black', 'white'];
  const thirdLevelFolders = ['ru', 'en', 'kz'];
  
  // Импортируем функцию проверки файлов
  const { checkFileExists } = await import('../../utils/assetScanner.js');
  
  // Подсчитываем общее количество папок для сканирования
  const totalFolders = firstLevelFolders.length * thirdLevelFolders.length;
  let scannedFolders = 0;
  
  // Инициализируем прогресс-бар
  updateLogoProgress(0);
  
  // Сканируем каждую папку отдельно и обновляем UI
  for (const folder1 of firstLevelFolders) {
    for (const folder3 of thirdLevelFolders) {
      // Сканируем одну папку
      const basePath = `logo/${folder1}/${folder3}`;
      const knownNames = ['main', 'main_mono', 'mono', 'long', 'logo', 'long_logo', 'black', 'white', 'icon', 'symbol', 'mark', 'emblem'];
      
      const folderFiles = [];
      
      // Проверяем файлы в папке
      for (const name of knownNames) {
        const exists = await checkFileExists(`${basePath}/${name}.svg`);
        if (exists) {
          const folder1Name = folder1.charAt(0).toUpperCase() + folder1.slice(1);
          const folder3Name = folder3.toUpperCase();
          const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
          folderFiles.push({ 
            name: `${folder1Name} / ${folder3Name} / ${displayName}`, 
            file: `${basePath}/${name}.svg` 
          });
        }
      }
      
      // Обновляем структуру
      if (folderFiles.length > 0) {
        if (!logoStructure[folder1]) {
          logoStructure[folder1] = {};
        }
        if (!logoStructure[folder1][folder3]) {
          logoStructure[folder1][folder3] = [];
        }
        folderFiles.forEach(file => {
          if (!logoStructure[folder1][folder3].find(l => l.file === file.file)) {
            logoStructure[folder1][folder3].push(file);
          }
        });
        
        // Обновляем UI после каждой папки
        cachedLogosStructure = logoStructure;
        renderLogoColumn1(logoStructure);
      }
      
      // Обновляем прогресс
      scannedFolders++;
      const progress = (scannedFolders / totalFolders) * 100;
      updateLogoProgress(progress);
      
      // Небольшая задержка для плавности
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  // Завершаем прогресс
  updateLogoProgress(100);
  
  // Небольшая задержка, чтобы показать 100% перед скрытием прогресс-бара
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Добавляем AVAILABLE_LOGOS в структуру
  AVAILABLE_LOGOS.forEach(logo => {
    const pathParts = logo.file.split('/');
    if (pathParts.length >= 3 && pathParts[0] === 'logo') {
      const folder1 = pathParts[1];
      
      if (!logoStructure[folder1]) {
        logoStructure[folder1] = {};
      }
      
      // Проверяем трехуровневую структуру (logo/folder1/folder2/folder3/file)
      if (pathParts.length === 5) {
        const folder2 = pathParts[2];
        const folder3 = pathParts[3];
        if (!logoStructure[folder1][folder2]) {
          logoStructure[folder1][folder2] = {};
        }
        if (!logoStructure[folder1][folder2][folder3]) {
          logoStructure[folder1][folder2][folder3] = [];
        }
        if (!logoStructure[folder1][folder2][folder3].find(l => l.file === logo.file)) {
          logoStructure[folder1][folder2][folder3].push(logo);
        }
      }
      // Проверяем двухуровневую структуру (logo/folder1/folder2/file)
      else if (pathParts.length === 4) {
        const folder2 = pathParts[2];
        // Если уже есть трехуровневая структура, добавляем в 'root'
        if (logoStructure[folder1][folder2] && typeof logoStructure[folder1][folder2] === 'object' && !Array.isArray(logoStructure[folder1][folder2])) {
          if (!logoStructure[folder1][folder2]['root']) {
            logoStructure[folder1][folder2]['root'] = [];
          }
          if (!logoStructure[folder1][folder2]['root'].find(l => l.file === logo.file)) {
            logoStructure[folder1][folder2]['root'].push(logo);
          }
        } else {
          if (!logoStructure[folder1][folder2]) {
            logoStructure[folder1][folder2] = [];
          }
          if (!logoStructure[folder1][folder2].find(l => l.file === logo.file)) {
            logoStructure[folder1][folder2].push(logo);
          }
        }
      } else {
        // Одноуровневая структура (logo/folder1/file) - используем "root" как folder2
        if (!logoStructure[folder1]['root']) {
          logoStructure[folder1]['root'] = [];
        }
        if (!logoStructure[folder1]['root'].find(l => l.file === logo.file)) {
          logoStructure[folder1]['root'].push(logo);
        }
      }
    }
  });
  
  cachedLogosStructure = logoStructure;
  logosScanning = false;
  
  // Финальное обновление UI после завершения сканирования всех папок
  // Сохраняем текущие выбранные папки, чтобы восстановить состояние после обновления
  const currentFolder1 = selectedLogoFolder1;
  const currentFolder2 = selectedLogoFolder2;
  const currentFolder3 = selectedLogoFolder3;
  
  // Обновляем колонки с полной структурой
  renderLogoColumn1(logoStructure);
  
  // Восстанавливаем выбранные папки и обновляем остальные колонки, если они были открыты
  if (currentFolder1) {
    selectedLogoFolder1 = currentFolder1;
    const folder1Item = document.querySelector(`[data-folder1="${currentFolder1}"]`);
    if (folder1Item) {
      folder1Item.classList.add('active');
      renderLogoColumn2(logoStructure);
      
      if (currentFolder2) {
        selectedLogoFolder2 = currentFolder2;
        const folder2Item = document.querySelector(`[data-folder2="${currentFolder2}"]`);
        if (folder2Item) {
          folder2Item.classList.add('active');
          const folder2Data = logoStructure[currentFolder1]?.[currentFolder2];
          if (folder2Data && typeof folder2Data === 'object' && !Array.isArray(folder2Data)) {
            // Трехуровневая структура
            renderLogoColumn3(logoStructure);
            if (currentFolder3) {
              selectedLogoFolder3 = currentFolder3;
              const folder3Item = document.querySelector(`[data-folder3="${currentFolder3}"]`);
              if (folder3Item) {
                folder3Item.classList.add('active');
                const images = logoStructure[currentFolder1]?.[currentFolder2]?.[currentFolder3] || [];
                renderLogoColumn4(images);
              }
            }
          } else {
            // Двухуровневая структура
            const images = Array.isArray(folder2Data) ? folder2Data : [];
            const state = getState();
            const selectedLanguage = state.logoLanguage || 'ru';
            const filteredImages = selectedLanguage === 'kz' 
              ? images.filter(logo => logo.file.includes(`/${selectedLanguage}/`))
              : images;
            renderLogoColumn4(filteredImages);
          }
        }
      }
    }
  }
};

/**
 * Обновляет колонки логотипов (принудительное обновление)
 */
export const refreshLogoColumns = async () => {
  // Находим кнопку "Обновить" в модальном окне логотипа
  const refreshBtn = document.querySelector('[data-function="refreshLogoColumns"]');
  if (!refreshBtn) return;
  
  const originalHTML = refreshBtn.innerHTML;
  
  // Показываем анимацию загрузки
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = '<span class="material-icons refresh-spinner">refresh</span> Обновление...';
  
  // Принудительно перерисовываем, чтобы браузер увидел изменения
  refreshBtn.offsetHeight; // trigger reflow
  
  // Используем requestAnimationFrame для гарантированного отображения изменений
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => setTimeout(resolve, 100)); // Небольшая задержка для визуализации
  
  try {
    await populateLogoColumns(true);
  } finally {
    // Восстанавливаем исходное состояние кнопки
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalHTML;
  }
};

/**
 * Открывает модальное окно выбора логотипа
 */
const openLogoSelectModal = async () => {
  const overlay = document.getElementById('logoSelectModalOverlay');
  if (!overlay) return;
  
  // Инициализируем dropdown, если еще не инициализирован
  const trigger = document.getElementById('logoSelectTrigger');
  if (trigger && !trigger.dataset.initialized) {
    await initializeLogoDropdown();
  }
  
  // Сбрасываем выбранные папки
  selectedLogoFolder1 = null;
  selectedLogoFolder2 = null;
  selectedLogoFolder3 = null;
  
  // Показываем модальное окно сразу
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Блокируем скролл фона
  
  // Скрываем индикатор загрузки сразу - показываем содержимое немедленно
  const loadingIndicator = overlay.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  
  // Заполняем колонки сразу (показываем известные данные) и загружаем остальное в фоне
  populateLogoColumns().catch((error) => {
    console.error('Ошибка при заполнении колонок логотипов:', error);
  });
};

/**
 * Закрывает модальное окно выбора логотипа
 */
const closeLogoSelectModal = () => {
  const overlay = document.getElementById('logoSelectModalOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = ''; // Разблокируем скролл
  }
};

/**
 * Инициализирует dropdown для выбора логотипа
 */
export const initializeLogoDropdown = async () => {
  const dom = getDom();
  if (!dom.logoSelect) return;
  
  const trigger = document.getElementById('logoSelectTrigger');
  const textSpan = document.getElementById('logoSelectText');
  
  if (!trigger || !textSpan) return;
  
  // Удаляем старые обработчики через клонирование trigger
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);
  const updatedTrigger = document.getElementById('logoSelectTrigger');
  
  // Помечаем как инициализированный
  if (updatedTrigger) {
    updatedTrigger.dataset.initialized = 'true';
  }
  
  // Обработчик открытия модального окна
  updatedTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await openLogoSelectModal();
  });
  
  // Закрытие по Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('logoSelectModalOverlay');
      if (overlay && overlay.style.display === 'block') {
        closeLogoSelectModal();
      }
    }
  });
  
  // Делаем функции доступными глобально
  window.openLogoSelectModal = openLogoSelectModal;
  window.closeLogoSelectModal = closeLogoSelectModal;
  
  // Обновляем текст триггера
  const state = getState();
  updateLogoTriggerText(state.logoSelected || '');
};

// Экспортируем функции для использования в других модулях
export {
  openLogoSelectModal,
  closeLogoSelectModal,
  populateLogoColumns
};
