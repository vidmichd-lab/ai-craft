/**
 * Модуль для работы с логотипами
 * Содержит функции выбора, загрузки, отображения и управления логотипами
 */

import { getState, setKey, setState } from '../../state/store.js';
import { AVAILABLE_LOGOS } from '../../constants.js';
import { scanLogos } from '../../utils/assetScanner.js';
import { renderer } from '../../renderer.js';
import { getDom } from '../domCache.js';

// Кэш для отсканированных логотипов (структурированный)
let cachedLogosStructure = null;
let logosScanning = false;

// Выбранные папки для навигации по структуре логотипов
let selectedLogoFolder1 = null;
let selectedLogoFolder2 = null;
let selectedLogoFolder3 = null;

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
    } else if (logoSelected) {
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
  
  // Закрываем модальное окно выбора
  closeLogoSelectModal();
  
  if (!logoFile) {
    setState({ logo: null, logoSelected: '' });
    updateLogoTriggerText('');
    updateLogoUI();
    renderer.render();
    return;
  }

  // Сначала устанавливаем logoSelected, чтобы UI обновился
  setState({ logoSelected: logoFile });
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
    const img = await loadImage(logoInfo.file);
    // Проверяем, что изображение действительно загрузилось
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new Error(`Изображение не загружено: ${logoInfo.file}`);
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
    textSpan.textContent = 'Выбрать';
    return;
  }
  
  // Если есть логотип, показываем "Выбрать из библиотеки"
  textSpan.textContent = 'Выбрать из библиотеки';
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
    emptyMsg.textContent = 'Логотипы не найдены';
    emptyMsg.className = 'column-empty-message';
    column1.appendChild(emptyMsg);
    return;
  }
  
  folders1.forEach((folder1) => {
    const item = document.createElement('div');
    item.className = 'column-item logo-folder1-item';
    item.dataset.folder1 = folder1;
    item.textContent = folder1;
    
    item.addEventListener('click', (e) => {
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
    });
    
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
  
  filteredImages.forEach((logo, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'preview-item';
    
    const img = document.createElement('img');
    img.alt = logo.name;
    img.src = logo.file;
    
    // Используем нативный loading="lazy" для прогрессивной загрузки
    // Первые 6 изображений загружаем сразу (eager), остальные - лениво
    if (index < 6) {
      img.loading = 'eager'; // Загружаем сразу
    } else {
      img.loading = 'lazy'; // Ленивая загрузка
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
  
  // Сканируем в фоне
  logosScanning = true;
  const scannedStructure = await scanLogos();
  
  // scanLogos теперь возвращает структурированные данные напрямую
  // Добавляем AVAILABLE_LOGOS в структуру
  const logoStructure = { ...scannedStructure };
  
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
  
  // Сбрасываем выбранные папки перед рендерингом
  selectedLogoFolder1 = null;
  selectedLogoFolder2 = null;
  selectedLogoFolder3 = null;
  
  // Заполняем колонки
  renderLogoColumn1(logoStructure);
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
  
  // Сбрасываем выбранные папки
  selectedLogoFolder1 = null;
  selectedLogoFolder2 = null;
  selectedLogoFolder3 = null;
  
  // При открытии заполняем колонки лениво
  await populateLogoColumns();
  
  // Показываем модальное окно
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Блокируем скролл фона
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

