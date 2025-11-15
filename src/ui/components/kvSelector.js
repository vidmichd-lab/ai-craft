/**
 * Модуль для работы с KV (key visual)
 * Содержит функции выбора, загрузки, отображения и управления KV
 */

import { getState, setKey, setState } from '../../state/store.js';
import { AVAILABLE_KV } from '../../constants.js';
import { scanKV } from '../../utils/assetScanner.js';
import { renderer } from '../../renderer.js';
import { getDom } from '../domCache.js';
import { updatePairKV } from '../../state/store.js';

// Кэш для отсканированных KV
let cachedKV = null;
let kvScanning = false;

// Выбранные папки для навигации по структуре KV
let selectedFolder1 = null;
let selectedFolder2 = null;

// Глобальная переменная для хранения индекса пары, для которой открывается модальное окно
let currentKVModalPairIndex = null;

/**
 * Загружает изображение из файла или URL
 */
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

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
    kvActivePairLabel.textContent = `KV ${String(activeIndex + 1).padStart(2, '0')}`;
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
      const activeIndex = state.activePairIndex || 0;
      
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
  const activeIndex = state.activePairIndex || 0;
  
  // Очищаем KV для активной пары
  updatePairKV(activeIndex, '');
  
  setState({ kv: null, kvSelected: '', showKV: false });
  const dom = getDom();
  if (dom.showKV) dom.showKV.checked = false;
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
  
  // Закрываем модальное окно выбора
  closeKVSelectModal();

  // Если модальное окно открыто для конкретной пары, обновляем только эту пару
  if (currentKVModalPairIndex !== null) {
    await selectPairKV(currentKVModalPairIndex, kvFile || '');
    return;
  }
  
  if (!kvFile) {
    // Очищаем KV для активной пары
    const activeIndex = state.activePairIndex || 0;
    const pairs = state.titleSubtitlePairs || [];
    if (pairs[activeIndex]) {
      updatePairKV(activeIndex, '');
    }
    setState({ kv: null, kvSelected: '', showKV: false });
    if (dom.showKV) dom.showKV.checked = false;
    updateKVTriggerText('');
    updateKVUI();
    renderer.render();
    return;
  }
  
  // Иначе обновляем KV для активной пары (обычное поведение)
  const activeIndex = state.activePairIndex || 0;
  const pairs = state.titleSubtitlePairs || [];
  if (pairs[activeIndex]) {
    updatePairKV(activeIndex, kvFile);
  }
  
  // Сначала устанавливаем kvSelected, чтобы UI обновился
  setState({ kvSelected: kvFile, showKV: true });
  if (dom.showKV) dom.showKV.checked = true;
  updateKVTriggerText(kvFile);

  try {
    const img = await loadImage(kvFile);
    // Проверяем, что изображение действительно загрузилось
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new Error(`Изображение не загружено: ${kvFile}`);
    }
    // Обновляем оба поля: kv и kvSelected, и включаем показ KV
    setState({ kv: img, kvSelected: kvFile, showKV: true });
    if (dom.kvSelect) dom.kvSelect.value = kvFile;
    if (dom.showKV) dom.showKV.checked = true;
    updateKVUI();
    renderer.render();
  } catch (error) {
    console.error('Ошибка загрузки KV:', error, 'Путь:', kvFile);
    setState({ kv: null, kvSelected: '' });
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
  updatePairKV(pairIndex, kvFile || '');
  
  // Если это активная пара, обновляем глобальный KV
  if (pairIndex === (state.activePairIndex || 0)) {
    if (!kvFile) {
      setState({ kv: null, kvSelected: '', showKV: false });
      if (dom.showKV) dom.showKV.checked = false;
      updateKVUI();
    } else {
      try {
        const img = await loadImage(kvFile);
        setState({ kv: img, kvSelected: kvFile, showKV: true });
        if (dom.showKV) dom.showKV.checked = true;
        updateKVUI();
      } catch (error) {
        console.error(error);
        setState({ kv: null, kvSelected: '', showKV: false });
        if (dom.showKV) dom.showKV.checked = false;
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
    textSpan.textContent = 'Выбрать';
    return;
  }
  
  // Если есть KV, показываем "Выбрать из библиотеки"
  textSpan.textContent = 'Выбрать из библиотеки';
};

/**
 * Рендерит первую колонку со списком папок первого уровня
 */
const renderKVColumn1 = (allKV) => {
  const column1 = document.getElementById('kvFolder1Column');
  if (!column1) return;
  
  column1.innerHTML = '';
  const folders1 = Object.keys(allKV).sort();
  
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
    
    column1.appendChild(item);
  });
  
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
const renderKVColumn2 = (allKV) => {
  const column2 = document.getElementById('kvFolder2Column');
  if (!column2 || !selectedFolder1) return;
  
  column2.innerHTML = '';
  const folders2 = Object.keys(allKV[selectedFolder1] || {}).sort();
  
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
    
    column2.appendChild(item);
  });
  
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
    img.src = kv.file;
    
    // Используем нативный loading="lazy" для прогрессивной загрузки
    // Первые 6 изображений и активное загружаем сразу (eager), остальные - лениво
    if (index < 6 || isActive) {
      img.loading = 'eager'; // Загружаем сразу
    } else {
      img.loading = 'lazy'; // Ленивая загрузка
    }
    
    imgContainer.appendChild(img);
    
    imgContainer.addEventListener('click', (e) => {
      e.stopPropagation(); // Предотвращаем закрытие модального окна до выбора
      selectPreloadedKV(kv.file);
      // Закрываем модальное окно после выбора
      closeKVSelectModal();
    });
    
    column3.appendChild(imgContainer);
  });
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
 * Заполняет колонки KV
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
    return;
  }
  
  // Сканируем в фоне
  kvScanning = true;
  const scannedKV = await scanKV();
  
  // Создаем структуру
  const allKV = buildKVStructure(scannedKV);
  
  cachedKV = allKV;
  kvScanning = false;
  
  // Заполняем колонки
  renderKVColumn1(allKV);
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
const openKVSelectModal = async (pairIndex = null) => {
  const overlay = document.getElementById('kvSelectModalOverlay');
  if (!overlay) return;
  
  // Сохраняем индекс пары, если указан
  currentKVModalPairIndex = pairIndex;
  
  // Сбрасываем выбранные папки
  selectedFolder1 = null;
  selectedFolder2 = null;
  
  // При открытии заполняем колонки лениво
  await populateKVColumns();
  
  // Показываем модальное окно
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Блокируем скролл фона
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
 * Загружает KV по умолчанию
 */
export const loadDefaultKV = async () => {
  const dom = getDom();
  const state = getState();
  const defaultKV = state.kvSelected || 'assets/3d/sign/01.png';
  
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

