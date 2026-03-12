/**
 * Модуль для работы с KV (key visual)
 * Содержит функции выбора, загрузки, отображения и управления KV
 */

import { getState, setKey, setState } from '../../state/store.js';
import { AVAILABLE_KV, DEFAULT_KV_PATH } from '../../constants.js';
import { scanKV } from '../../utils/assetScanner.js';
import { renderer } from '../../renderer.js';
import { getDom } from '../domCache.js';
import { updatePairKV } from '../../state/store.js';
import { observeImages } from '../../utils/lazyImageLoader.js';
import { t } from '../../utils/i18n.js';

// Кэш для отсканированных KV
let cachedKV = null;
let kvScanning = false;

/**
 * Обновляет прогресс-бар для KV
 */
const updateKVProgress = (percent) => {
  const progressBar = document.getElementById('kvProgressBar');
  const progressText = document.getElementById('kvProgressText');
  if (progressBar) {
    const clampedPercent = Math.min(100, Math.max(0, percent));
    progressBar.style.width = `${clampedPercent}%`;
    if (progressText) {
      progressText.textContent = `${Math.round(clampedPercent)}%`;
    }
  }
};

// Выбранные папки для навигации по структуре KV
let selectedFolder1 = null;
let selectedFolder2 = null;

// Глобальная переменная для хранения индекса пары, для которой открывается модальное окно
let currentKVModalPairIndex = null;
let currentKVModalSlotIndex = 0;

export const setKVModalTargetSlot = (slotIndex = 0) => {
  const normalized = Number.isFinite(Number(slotIndex)) ? Number(slotIndex) : 0;
  currentKVModalSlotIndex = Math.max(0, Math.min(2, normalized));
};

export const getKVModalTargetSlot = () => currentKVModalSlotIndex;

/**
 * Нормализует устаревшие пути ассетов к каноническому виду.
 */
const normalizeKVAssetPath = (src) => {
  if (!src || typeof src !== 'string') return src;
  // Пример миграции: assets/pro/assets/01.webp -> assets/pro/assets/1.webp
  return src.replace(/(^|\/)assets\/pro\/assets\/0+(\d+)\.(webp|png|jpg|jpeg)$/i, '$1assets/pro/assets/$2.$3');
};

/**
 * Загружает изображение из файла или URL (без кеширования для модальных окон)
 */
const loadImage = async (src) => {
  const normalizedSrc = normalizeKVAssetPath(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => {
      console.error(`Failed to load image: ${normalizedSrc}`, error);
      reject(new Error(`Failed to load image: ${normalizedSrc}`));
    };
    // Используем абсолютный URL для относительных путей
    if (normalizedSrc && !normalizedSrc.startsWith('http') && !normalizedSrc.startsWith('data:')) {
      img.src = new URL(normalizedSrc, window.location.origin).href;
    } else {
      img.src = normalizedSrc;
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

const buildKVOnlyClearPatch = (state) => ({
  kv: null,
  kvSelected: '',
  showKV: false,
  // Очистка визуала не должна менять другие элементы макета.
  logo: state.logo,
  logoSelected: state.logoSelected,
  legal: state.legal,
  age: state.age,
  showLogo: state.showLogo,
  showLegal: state.showLegal,
  showAge: state.showAge
});

/**
 * Обновляет UI для KV
 */
export const updateKVUI = () => {
  const state = getState();
  const { kv, kvSelected } = state;
  const kvRemoveBtn = document.getElementById('kvRemoveBtn');
  const kvPreviewImg = document.getElementById('kvPreviewImg');
  const kvPreviewPlaceholder = document.getElementById('kvPreviewPlaceholder');
  const kvActivePairLabel = document.getElementById('kvActivePairLabel');
  const kvPreviewContainer = document.getElementById('kvPreviewContainer');
  
  // Обновляем метку активной пары
  const activeIndex = state.activePairIndex || 0;
  if (kvActivePairLabel) {
    kvActivePairLabel.textContent = t('kv.label', { number: String(activeIndex + 1).padStart(2, '0') });
  }
  
  // Обновляем превью KV
  if (kvPreviewImg && kvPreviewPlaceholder) {
    if (kv) {
      // Загруженное изображение
      kvPreviewImg.src = kv.src;
      kvPreviewImg.style.display = 'block';
      kvPreviewPlaceholder.style.display = 'none';
    } else if (kvSelected) {
      // Предзагруженный KV
      kvPreviewImg.src = kvSelected;
      kvPreviewImg.style.display = 'block';
      kvPreviewPlaceholder.style.display = 'none';
    } else {
      // Нет KV
      kvPreviewImg.src = '';
      kvPreviewImg.style.display = 'none';
      kvPreviewPlaceholder.style.display = 'block';
    }
  }
  
  // Добавляем обработчик клика на превью для открытия модального окна
  if (kvPreviewContainer) {
    kvPreviewContainer.style.cursor = 'pointer';
    if (!kvPreviewContainer.dataset.clickHandlerAdded) {
      kvPreviewContainer.addEventListener('click', async () => {
        await openKVSelectModal();
      });
      kvPreviewContainer.dataset.clickHandlerAdded = 'true';
    }
  }
  
  // Обновляем состояние кнопки "Удалить"
  const kvUploadBtn = document.getElementById('kvUploadBtn');
  const kvReplaceBtn = document.getElementById('kvReplaceBtn');
  
  if (kvRemoveBtn) {
    const hasKV = !!(kv || kvSelected);
    kvRemoveBtn.disabled = !hasKV;
    if (hasKV) {
      kvRemoveBtn.style.opacity = '1';
      kvRemoveBtn.style.cursor = 'pointer';
    } else {
      kvRemoveBtn.style.opacity = '0.5';
      kvRemoveBtn.style.cursor = 'not-allowed';
    }
  }
  
  // Показываем/скрываем кнопки "Загрузить" и "Заменить"
  const hasKV = !!(kv || kvSelected);
  if (kvUploadBtn) {
    kvUploadBtn.style.display = hasKV ? 'none' : 'flex';
  }
  if (kvReplaceBtn) {
    kvReplaceBtn.style.display = hasKV ? 'flex' : 'none';
  }
};

/**
 * Загружает KV из файла
 */
export const handleKVUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  (async () => {
    try {
      const dataURL = await readFileAsDataURL(file);
      const img = await loadImage(dataURL);
      const state = getState();
      const activeIndex = 0;
      
      // Обновляем KV для активной пары
      updatePairKV(activeIndex, dataURL);
      
      // Если это активная пара, обновляем глобальный KV
      if (activeIndex === (state.activePairIndex || 0)) {
        setState({ kv: img, kvSelected: dataURL, showKV: true });
        const dom = getDom();
        if (dom.showKV) dom.showKV.checked = true;
        updateKVUI();
        renderer.render();
      }
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить изображение.');
    }
  })();
};

/**
 * Загружает KV для конкретной пары
 */
export const handlePairKVUpload = async (pairIndex, file) => {
  try {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    
    // Обновляем KV для пары
    updatePairKV(pairIndex, dataURL);
    
    // Если это активная пара, обновляем глобальный KV
    const state = getState();
    const dom = getDom();
    if (pairIndex === (state.activePairIndex || 0)) {
      setState({ kv: img, kvSelected: dataURL, showKV: true });
      if (dom.showKV) dom.showKV.checked = true;
      updateKVUI();
    }
    
    renderer.render();
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить изображение.');
  }
};

/**
 * Очищает выбранный KV
 */
export const clearKV = () => {
  const state = getState();
  const activeIndex = 0;
  const visibilityFlags = {
    showLogo: state.showLogo,
    showLegal: state.showLegal,
    showAge: state.showAge
  };
  
  // Очищаем KV для активной пары
  updatePairKV(activeIndex, '');
  
  setState({ ...buildKVOnlyClearPatch(state), ...visibilityFlags });
  const dom = getDom();
  if (dom.showKV) dom.showKV.checked = false;
  if (dom.showLogo) dom.showLogo.checked = visibilityFlags.showLogo !== false;
  if (dom.showLegal) dom.showLegal.checked = !!visibilityFlags.showLegal;
  if (dom.showAge) dom.showAge.checked = !!visibilityFlags.showAge;
  updateKVTriggerText('');
  updateKVUI();
  renderer.render();
};

/**
 * Выбирает предзагруженный KV
 */
export const selectPreloadedKV = async (kvFile) => {
  const dom = getDom();
  const state = getState();
  const prevKV = state.kv;
  const prevKVSelected = state.kvSelected;
  const prevKV2 = state.rsyaKV2;
  const prevKV2Selected = state.rsyaKV2Selected;
  const prevKV3 = state.rsyaKV3;
  const prevKV3Selected = state.rsyaKV3Selected;
  const normalizedKVFile = normalizeKVAssetPath(kvFile);
  
  // Закрываем модальное окно выбора
  closeKVSelectModal();

  // Если модальное окно открыто для конкретной пары, обновляем только эту пару
  if (currentKVModalPairIndex !== null) {
    await selectPairKV(currentKVModalPairIndex, kvFile || '');
    return;
  }

  // Выбор из библиотеки для дополнительных слотов мульти-KV (слоты 2 и 3)
  if (currentKVModalSlotIndex === 1 || currentKVModalSlotIndex === 2) {
    const targetImageKey = currentKVModalSlotIndex === 1 ? 'rsyaKV2' : 'rsyaKV3';
    const targetPathKey = currentKVModalSlotIndex === 1 ? 'rsyaKV2Selected' : 'rsyaKV3Selected';

    if (!normalizedKVFile) {
      setKey(targetImageKey, null);
      setKey(targetPathKey, '');
      if (typeof window.__refreshRsyaVisualReorder === 'function') {
        window.__refreshRsyaVisualReorder();
      }
      renderer.render();
      return;
    }

    try {
      const img = await loadImage(normalizedKVFile);
      if (!img.complete || (img.naturalWidth || img.width) <= 0 || (img.naturalHeight || img.height) <= 0) {
        throw new Error(`Изображение не загружено: ${normalizedKVFile}`);
      }
      setState({
        [targetImageKey]: img,
        [targetPathKey]: normalizedKVFile,
        showKV: true
      });
      if (dom.showKV) dom.showKV.checked = true;
      if (typeof window.__refreshRsyaVisualReorder === 'function') {
        window.__refreshRsyaVisualReorder();
      }
      renderer.render();
      return;
    } catch (error) {
      console.error('Ошибка загрузки KV в дополнительный слот:', error, 'Путь:', normalizedKVFile);
      setState({
        rsyaKV2: prevKV2,
        rsyaKV2Selected: prevKV2Selected,
        rsyaKV3: prevKV3,
        rsyaKV3Selected: prevKV3Selected
      });
      if (typeof window.__refreshRsyaVisualReorder === 'function') {
        window.__refreshRsyaVisualReorder();
      }
      renderer.render();
      return;
    }
  }
  
  if (!normalizedKVFile) {
    // Очищаем KV для активной пары
    const activeIndex = 0;
    updatePairKV(activeIndex, '');
    setState(buildKVOnlyClearPatch(state));
    if (dom.showKV) dom.showKV.checked = false;
    updateKVTriggerText('');
    updateKVUI();
    renderer.render();
    return;
  }
  
  // Иначе обновляем KV для активной пары (обычное поведение)
  const activeIndex = 0;
  updatePairKV(activeIndex, normalizedKVFile);
  
  // Сначала устанавливаем kvSelected, чтобы UI обновился
  setState({ kvSelected: normalizedKVFile, showKV: true });
  if (dom.showKV) dom.showKV.checked = true;
  updateKVTriggerText(normalizedKVFile);

  try {
    const img = await loadImage(normalizedKVFile);
    // Проверяем, что изображение действительно загрузилось
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new Error(`Изображение не загружено: ${normalizedKVFile}`);
    }
    // Обновляем оба поля: kv и kvSelected, и включаем показ KV
    setState({ kv: img, kvSelected: normalizedKVFile, showKV: true });
    if (dom.kvSelect) dom.kvSelect.value = normalizedKVFile;
    if (dom.showKV) dom.showKV.checked = true;
    updateKVUI();
    renderer.render();
  } catch (error) {
    console.error('Ошибка загрузки KV:', error, 'Путь:', normalizedKVFile);
    // Не теряем текущий рабочий KV из-за битого/недоступного пути.
    // Если рабочего KV ещё нет, пробуем загрузить дефолтный.
    let fallbackKV = prevKV || null;
    let fallbackPath = prevKVSelected || DEFAULT_KV_PATH;
    if (!fallbackKV && fallbackPath) {
      try {
        fallbackKV = await loadImage(fallbackPath);
      } catch (fallbackError) {
        console.warn('Не удалось загрузить fallback KV:', fallbackPath, fallbackError);
        fallbackKV = null;
      }
    }
    setState({
      kv: fallbackKV,
      kvSelected: fallbackPath,
      showKV: true
    });
    if (dom.showKV) dom.showKV.checked = true;
    updateKVUI();
    renderer.render();
  }
};

/**
 * Выбирает KV для конкретной пары
 */
export const selectPairKV = async (pairIndex, kvFile) => {
  const state = getState();
  const dom = getDom();
  const prevKV = state.kv;
  const prevKVSelected = state.kvSelected;
  const normalizedKVFile = normalizeKVAssetPath(kvFile || '');
  updatePairKV(pairIndex, normalizedKVFile || '');
  
  // Если это активная пара, обновляем глобальный KV
  if (pairIndex === (state.activePairIndex || 0)) {
    if (!normalizedKVFile) {
      setState(buildKVOnlyClearPatch(state));
      if (dom.showKV) dom.showKV.checked = false;
      updateKVUI();
    } else {
      try {
        const img = await loadImage(normalizedKVFile);
        setState({ kv: img, kvSelected: normalizedKVFile, showKV: true });
        if (dom.showKV) dom.showKV.checked = true;
        updateKVUI();
      } catch (error) {
        console.error(error);
        // Если KV для пары не загрузился, сохраняем предыдущий рабочий KV.
        let fallbackKV = prevKV || null;
        let fallbackPath = prevKVSelected || DEFAULT_KV_PATH;
        if (!fallbackKV && fallbackPath) {
          try {
            fallbackKV = await loadImage(fallbackPath);
          } catch (fallbackError) {
            console.warn('Не удалось загрузить fallback KV для пары:', fallbackPath, fallbackError);
            fallbackKV = null;
          }
        }
        setState({
          kv: fallbackKV,
          kvSelected: fallbackPath,
          showKV: true
        });
        if (dom.showKV) dom.showKV.checked = true;
        updateKVUI();
      }
    }
    renderer.render();
  }
};

/**
 * Обновляет текст триггера выбора KV
 */
export const updateKVTriggerText = (value) => {
  const textSpan = document.getElementById('kvSelectText');
  if (!textSpan) return;
  
  if (!value) {
    textSpan.textContent = t('kv.select');
    return;
  }
  
  // Если есть KV, показываем "Выбрать из библиотеки"
  textSpan.textContent = t('layout.bgImage.select');
};

/**
 * Рендерит первую колонку со списком папок первого уровня
 */
const renderKVColumn1 = (allKV) => {
  const column1 = document.getElementById('kvFolder1Column');
  if (!column1) return;
  
  column1.innerHTML = '';
  const folders1 = Object.keys(allKV).sort();
  
  // Используем DocumentFragment для батчинга DOM операций
  const fragment = document.createDocumentFragment();
  
  folders1.forEach((folder1) => {
    const item = document.createElement('div');
    item.className = 'column-item kv-folder1-item';
    item.dataset.folder1 = folder1;
    item.textContent = folder1;
    
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна
      selectedFolder1 = folder1;
      selectedFolder2 = null;
      // Обновляем стили
      document.querySelectorAll('.kv-folder1-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      
      // Обновляем вторую колонку
      renderKVColumn2(allKV);
      // Очищаем третью колонку
      renderKVColumn3([]);
    });
    
    fragment.appendChild(item);
  });
  
  // Добавляем все элементы одним батчем
  column1.appendChild(fragment);
  
  // Выбираем первую папку по умолчанию
  if (folders1.length > 0 && !selectedFolder1) {
    selectedFolder1 = folders1[0];
    const firstItem = column1.querySelector(`[data-folder1="${folders1[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      renderKVColumn2(allKV);
    }
  }
};

/**
 * Рендерит вторую колонку со списком папок второго уровня
 */
const renderKVColumn2 = (allKV, showLoading = false) => {
  const column2 = document.getElementById('kvFolder2Column');
  if (!column2 || !selectedFolder1) return;
  
  column2.innerHTML = '';
  
  // Показываем индикатор загрузки, если идет сканирование и папок еще нет
  const folders2 = Object.keys(allKV[selectedFolder1] || {}).sort();
  if (showLoading && folders2.length === 0 && kvScanning) {
    const loadingContainer = document.createElement('div');
    loadingContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.cssText = 'width: 24px; height: 24px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: #027EF2; border-radius: 50%; animation: spin 1s linear infinite;';
    
    const text = document.createElement('div');
    text.textContent = t('kv.folders.loading');
    text.style.cssText = 'margin-top: 8px; color: #888; font-size: 12px;';
    
    loadingContainer.appendChild(spinner);
    loadingContainer.appendChild(text);
    column2.appendChild(loadingContainer);
    
    // Добавляем CSS анимацию для спиннера, если её еще нет
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    return;
  }
  
  // Используем DocumentFragment для батчинга DOM операций
  const fragment = document.createDocumentFragment();
  
  folders2.forEach((folder2) => {
    const item = document.createElement('div');
    item.className = 'column-item kv-folder2-item';
    item.dataset.folder2 = folder2;
    item.textContent = folder2;
    
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна
      selectedFolder2 = folder2;
      // Обновляем стили
      document.querySelectorAll('.kv-folder2-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      
      // Обновляем третью колонку
      const images = allKV[selectedFolder1][selectedFolder2] || [];
      renderKVColumn3(images);
    });
    
    fragment.appendChild(item);
  });
  
  // Добавляем все элементы одним батчем
  column2.appendChild(fragment);
  
  // Выбираем первую подпапку по умолчанию
  if (folders2.length > 0 && !selectedFolder2) {
    selectedFolder2 = folders2[0];
    const firstItem = column2.querySelector(`[data-folder2="${folders2[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      const images = allKV[selectedFolder1][selectedFolder2] || [];
      renderKVColumn3(images);
    }
  }
};

/**
 * Рендерит третью колонку с изображениями KV
 */
const renderKVColumn3 = (images) => {
  const column3 = document.getElementById('kvImagesColumn');
  if (!column3) return;
  
  column3.innerHTML = '';
  
  // Показываем прогресс-бар, если изображений нет или идет загрузка
  if (!images || images.length === 0 || kvScanning) {
    const progressContainer = document.createElement('div');
    progressContainer.id = 'kvProgressContainer';
    progressContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; min-height: 200px; width: 100%;';
    
    const text = document.createElement('div');
    text.textContent = t('kv.loading');
    text.style.cssText = 'margin-bottom: 16px; color: var(--text-primary, #e9e9e9); font-size: 14px; text-align: center;';
    
    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = 'width: 100%; max-width: 300px; position: relative;';
    
    const progressBarBg = document.createElement('div');
    progressBarBg.style.cssText = 'width: 100%; height: 8px; background: var(--bg-secondary, #1a1a1a); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color, #2a2a2a); position: relative;';
    
    const progressBar = document.createElement('div');
    progressBar.id = 'kvProgressBar';
    progressBar.style.cssText = 'height: 100%; width: 0%; background: linear-gradient(90deg, var(--accent-color, #027EF2), #00a8ff); border-radius: 4px; transition: width 0.3s ease; position: absolute; top: 0; left: 0;';
    
    const progressText = document.createElement('div');
    progressText.id = 'kvProgressText';
    progressText.style.cssText = 'margin-top: 12px; text-align: center; color: var(--text-secondary, #b4b4b4); font-size: 13px; font-weight: 500;';
    progressText.textContent = '0%';
    
    progressBarBg.appendChild(progressBar);
    progressBarContainer.appendChild(progressBarBg);
    progressBarContainer.appendChild(progressText);
    progressContainer.appendChild(text);
    progressContainer.appendChild(progressBarContainer);
    column3.appendChild(progressContainer);
    
    return;
  }
  
  // Определяем активный KV
  const state = getState();
  let activeKVFile = null;
  
  if (currentKVModalPairIndex !== null) {
    // Модальное окно открыто для конкретной пары
    const pairs = state.titleSubtitlePairs || [];
    const pair = pairs[currentKVModalPairIndex];
    if (pair && pair.kvSelected) {
      activeKVFile = pair.kvSelected;
    }
  } else {
    // Модальное окно открыто для обычного KV
    activeKVFile = state.kvSelected || '';
  }
  
  // Используем DocumentFragment для батчинга DOM операций
  const fragment = document.createDocumentFragment();
  
  images.forEach((kv, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'preview-item';
    
    const isActive = activeKVFile && kv.file === activeKVFile;
    
    // Добавляем обводку для активного KV
    if (isActive) {
      imgContainer.style.border = '2px solid #027EF2';
      imgContainer.style.borderRadius = '4px';
    } else {
      imgContainer.style.border = '2px solid transparent';
      imgContainer.style.borderRadius = '4px';
    }
    
    const img = document.createElement('img');
    img.alt = kv.name;
    
    // Используем data-src для lazy loading через Intersection Observer
    // Первые 12 изображений и активное загружаем сразу для быстрого отображения
    if (index < 12 || isActive) {
      img.src = kv.file;
      img.loading = 'eager';
      // Добавляем обработчик ошибок для отладки
      img.onerror = () => {
        console.warn('Ошибка загрузки изображения:', kv.file);
        img.style.backgroundColor = '#ff0000';
        img.style.minHeight = '100px';
      };
    } else {
      // Для остальных используем data-src и загружаем при появлении в viewport
      img.dataset.src = kv.file;
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
      selectPreloadedKV(kv.file);
      // Закрываем модальное окно после выбора
      closeKVSelectModal();
    });
    
    fragment.appendChild(imgContainer);
  });
  
  // Добавляем все элементы одним батчем
  column3.appendChild(fragment);
  
  // Запускаем lazy loading для изображений в колонке
  observeImages(column3);
};

/**
 * Строит структуру KV из отсканированных данных
 */
const buildKVStructure = (scannedKV) => {
  // Объединяем с известными KV из констант
  const allKV = { ...AVAILABLE_KV };
  Object.keys(scannedKV).forEach(folder1 => {
    if (!allKV[folder1]) {
      allKV[folder1] = {};
    }
    Object.keys(scannedKV[folder1]).forEach(folder2 => {
      if (!allKV[folder1][folder2]) {
        allKV[folder1][folder2] = [];
      }
      // Добавляем новые файлы
      scannedKV[folder1][folder2].forEach(kv => {
        if (!allKV[folder1][folder2].find(k => k.file === kv.file)) {
          allKV[folder1][folder2].push(kv);
        }
      });
    });
  });
  return allKV;
};

/**
 * Заполняет колонки KV с инкрементальной загрузкой
 */
const populateKVColumns = async (forceRefresh = false) => {
  const column1 = document.getElementById('kvFolder1Column');
  if (!column1) return;
  
  // Если уже сканируем, ждем
  if (kvScanning) {
    return;
  }
  
  // Если принудительное обновление, очищаем кэш
  if (forceRefresh) {
    cachedKV = null;
    selectedFolder1 = null;
    selectedFolder2 = null;
  }
  
  // Если есть кэш и не принудительное обновление, используем его
  if (cachedKV && !forceRefresh) {
    renderKVColumn1(cachedKV);
    if (selectedFolder1) {
      renderKVColumn2(cachedKV);
    }
    return;
  }
  
  // Сначала показываем папки из AVAILABLE_KV (известные данные) сразу
  let initialStructure = {};
  if (Object.keys(AVAILABLE_KV).length > 0) {
    initialStructure = JSON.parse(JSON.stringify(AVAILABLE_KV));
    selectedFolder1 = null;
    selectedFolder2 = null;
    renderKVColumn1(initialStructure);
    // Если есть папки первого уровня, выбираем первую и показываем вторую колонку
    const folders1 = Object.keys(initialStructure);
    if (folders1.length > 0) {
      selectedFolder1 = folders1[0];
      const firstItem = column1.querySelector(`[data-folder1="${folders1[0]}"]`);
      if (firstItem) {
        firstItem.classList.add('active');
        renderKVColumn2(initialStructure, true); // Показываем индикатор загрузки
      }
    }
  } else {
    // Если нет известных данных, показываем базовую структуру папок (3d, photo, pro)
    const basicStructure = {
      '3d': {},
      'photo': {},
      'pro': {}
    };
    initialStructure = basicStructure;
    selectedFolder1 = null;
    selectedFolder2 = null;
    renderKVColumn1(basicStructure);
    // Выбираем первую папку и показываем индикатор загрузки
    selectedFolder1 = '3d';
    const firstItem = column1.querySelector(`[data-folder1="3d"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      renderKVColumn2(basicStructure, true);
    }
  }
  
  // Сканируем в фоне по папкам постепенно и обновляем структуру
  kvScanning = true;
  
  // Инициализируем прогресс-бар
  updateKVProgress(0);
  
  // Используем scanKV для автоматического обнаружения всех папок
  const kvStructure = await scanKV();
  
  // Обновляем прогресс
  updateKVProgress(100);
  
  // Небольшая задержка, чтобы показать 100% перед скрытием прогресс-бара
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Финальное обновление
  cachedKV = kvStructure;
  kvScanning = false;
  
  // Сохраняем текущие выбранные папки, чтобы восстановить состояние после обновления
  const currentFolder1 = selectedFolder1;
  const currentFolder2 = selectedFolder2;
  
  // Обновляем колонки с полной структурой
  renderKVColumn1(kvStructure);
  
  // Восстанавливаем выбранные папки и обновляем остальные колонки, если они были открыты
  if (currentFolder1) {
    selectedFolder1 = currentFolder1;
    const folder1Item = document.querySelector(`[data-folder1="${currentFolder1}"]`);
    if (folder1Item) {
      folder1Item.classList.add('active');
      renderKVColumn2(kvStructure, false);
      
      if (currentFolder2) {
        selectedFolder2 = currentFolder2;
        const folder2Item = document.querySelector(`[data-folder2="${currentFolder2}"]`);
        if (folder2Item) {
          folder2Item.classList.add('active');
          const images = kvStructure[currentFolder1]?.[currentFolder2] || [];
          renderKVColumn3(images);
        }
      } else {
        // Если папка второго уровня не выбрана, выбираем первую
        const folders2 = Object.keys(kvStructure[currentFolder1] || {});
        if (folders2.length > 0) {
          selectedFolder2 = folders2[0];
          const column2 = document.getElementById('kvFolder2Column');
          if (column2) {
            const firstItem = column2.querySelector(`[data-folder2="${folders2[0]}"]`);
            if (firstItem) {
              firstItem.classList.add('active');
              const images = kvStructure[currentFolder1][folders2[0]] || [];
              renderKVColumn3(images);
            }
          }
        }
      }
    }
  }
};

/**
 * Обновляет колонки KV (принудительное обновление)
 */
export const refreshKVColumns = async () => {
  // Находим кнопку "Обновить" в модальном окне KV
  const refreshBtn = document.querySelector('[data-function="refreshKVColumns"]');
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
    // Очищаем все кэши KV
    cachedKV = null;
    selectedFolder1 = null;
    selectedFolder2 = null;
    
    // Принудительно обновляем колонки в модальном окне
    await populateKVColumns(true);
  } finally {
    // Восстанавливаем исходное состояние кнопки
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalHTML;
  }
};

/**
 * Открывает модальное окно выбора KV
 */
const openKVSelectModal = async (pairIndex = null, source = 'default') => {
  const state = getState();
  if (state.projectMode === 'rsya' && source !== 'preview-canvas' && source !== 'rsya-slot') {
    return;
  }
  const overlay = document.getElementById('kvSelectModalOverlay');
  if (!overlay) return;
  
  // Инициализируем dropdown, если еще не инициализирован
  const trigger = document.getElementById('kvSelectTrigger');
  if (trigger && !trigger.dataset.initialized) {
    await initializeKVDropdown();
  }
  
  // Сохраняем индекс пары, если указан
  currentKVModalPairIndex = pairIndex;
  
  // Сбрасываем выбранные папки
  selectedFolder1 = null;
  selectedFolder2 = null;
  
  // Показываем модальное окно сразу
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Блокируем скролл фона
  
  // Скрываем индикатор загрузки сразу - показываем содержимое немедленно
  const loadingIndicator = overlay.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  
  // Заполняем колонки сразу (показываем известные данные) и загружаем остальное в фоне
  populateKVColumns().catch((error) => {
    console.error('Ошибка при заполнении колонок KV:', error);
  });
};

/**
 * Закрывает модальное окно выбора KV
 */
const closeKVSelectModal = () => {
  const overlay = document.getElementById('kvSelectModalOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = ''; // Разблокируем скролл
  }
  // Сбрасываем индекс пары при закрытии
  currentKVModalPairIndex = null;
};

/**
 * Инициализирует dropdown для выбора KV
 */
export const initializeKVDropdown = async () => {
  const dom = getDom();
  if (!dom.kvSelect) return;
  
  const trigger = document.getElementById('kvSelectTrigger');
  const textSpan = document.getElementById('kvSelectText');
  
  if (!trigger || !textSpan) return;
  
  // Удаляем старые обработчики через клонирование trigger
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);
  const updatedTrigger = document.getElementById('kvSelectTrigger');
  
  // Помечаем как инициализированный
  if (updatedTrigger) {
    updatedTrigger.dataset.initialized = 'true';
  }
  
  // Обработчик открытия модального окна
  updatedTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await openKVSelectModal();
  });
  
  // Закрытие по Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('kvSelectModalOverlay');
      if (overlay && overlay.style.display === 'block') {
        closeKVSelectModal();
      }
    }
  });
  
  // Делаем функции доступными глобально
  window.openKVSelectModal = openKVSelectModal;
  window.closeKVSelectModal = closeKVSelectModal;
  
  // Обновляем текст триггера
  const state = getState();
  updateKVTriggerText(state.kvSelected || '');
};

/**
 * Загружает Визуал по умолчанию
 */
export const loadDefaultKV = async () => {
  const dom = getDom();
  const state = getState();
  const defaultKV = state.kvSelected || DEFAULT_KV_PATH;
  
  if (!defaultKV) return;
  
  try {
    const img = await loadImage(defaultKV);
    setKey('kv', img);
    setState({ kvSelected: defaultKV });
    if (dom.kvSelect) dom.kvSelect.value = defaultKV;
    updateKVTriggerText(defaultKV);
    updateKVUI();
    renderer.render();
  } catch (error) {
    console.warn(`Failed to load default KV image: ${defaultKV}`);
  }
};

/**
 * Обновляет радиус скругления KV
 */
export const updateKVBorderRadius = (value) => {
  const numeric = parseFloat(value);
  if (isNaN(numeric)) {
    console.warn('Некорректное значение для kvBorderRadius:', value);
    return;
  }
  setKey('kvBorderRadius', numeric);
  const dom = getDom();
  if (dom.kvBorderRadiusValue) {
    dom.kvBorderRadiusValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

/**
 * Выбирает позицию KV
 * Эта функция перенаправляет вызов в ui.js, где находится основная логика
 */
export const selectKVPosition = (position) => {
  if (typeof window.selectKVPosition === 'function') {
    window.selectKVPosition(position);
  }
};

// Экспортируем функции для использования в других модулях
export {
  openKVSelectModal,
  closeKVSelectModal
};
