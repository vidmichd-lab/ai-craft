/**
 * Модуль для управления размерами
 * Содержит функции управления пресетными и кастомными размерами
 */

import { getState, setKey } from '../../state/store.js';
import { PRESET_SIZES } from '../../constants.js';
import {
  togglePresetSize,
  selectAllPresetSizes,
  deselectAllPresetSizes,
  getCheckedSizes,
  addCustomSize,
  removeCustomSize,
  toggleCustomSize
} from '../../state/store.js';
import { renderer } from '../../renderer.js';
import { getDom } from '../domCache.js';
import { t } from '../../utils/i18n.js';

/**
 * Закрывает все дропдауны превью
 */
const closeAllPreviewDropdowns = () => {
  [
    document.getElementById('previewSizeSelectNarrowDropdown'),
    document.getElementById('previewSizeSelectWideDropdown'),
    document.getElementById('previewSizeSelectSquareDropdown')
  ].forEach(dropdown => {
    if (dropdown) dropdown.style.display = 'none';
  });
};

/**
 * Обновляет сводку выбранных размеров
 */
export const updateSizesSummary = () => {
  const dom = getDom();
  if (!dom.sizesSummary) {
    console.warn('sizesSummary element not found in DOM');
    return;
  }
  const sizes = getCheckedSizes();
  const count = sizes.length;
  
  // Формируем правильный текст с учетом множественного числа
  let text = '';
  if (count === 0) {
    text = 'Не выбрано размеров';
  } else if (count === 1) {
    text = 'Выбрано: 1 размер';
  } else if (count >= 2 && count <= 4) {
    text = `Выбрано: ${count} размера`;
  } else {
    text = `Выбрано: ${count} размеров`;
  }
  
  // Используем функцию перевода с параметром
  let translatedText;
  try {
    translatedText = t('export.presetSizes.selected', { count });
  } catch (error) {
    console.warn('Ошибка при переводе sizesSummary:', error);
    translatedText = text;
  }
  
  // Если перевод не сработал (вернул ключ или содержит {count}), используем наш текст
  if (!translatedText || translatedText === 'export.presetSizes.selected' || translatedText.includes('{count}')) {
    dom.sizesSummary.textContent = text;
  } else {
    // Перевод сработал, используем его
    dom.sizesSummary.textContent = translatedText;
  }
  
  // Убираем data-i18n атрибут, чтобы updateUI() не перезаписывал текст
  dom.sizesSummary.removeAttribute('data-i18n');
};

/**
 * Рендерит пресетные размеры
 */
export const renderPresetSizes = () => {
  const state = getState();
  const dom = getDom();
  if (!dom.presetSizesList) return;

  const expandedPlatforms = new Set();
  dom.presetSizesList.querySelectorAll('.platform-sizes:not(.collapsed)').forEach((el) => {
    expandedPlatforms.add(el.id.replace('sizes-', ''));
  });

  let html = '';
  Object.keys(state.presetSizes).forEach((platform) => {
    const isExpanded = expandedPlatforms.has(platform);
    html += `
      <div class="platform-group" id="platform-group-${platform}">
        <div class="platform-header" onclick="togglePlatformSizes('${platform}')">
          <span>${platform}</span>
          <span class="toggle-icon">▼</span>
        </div>
        <div class="platform-sizes ${isExpanded ? '' : 'collapsed'}" id="sizes-${platform}">
    `;
    state.presetSizes[platform].forEach((size, index) => {
      const id = `size-${platform}-${index}`;
      html += `
        <div class="size-checkbox-item">
          <input type="checkbox" id="${id}" data-platform="${platform}" data-index="${index}" ${
            size.checked ? 'checked' : ''
          }>
          <label for="${id}">${size.width} × ${size.height}</label>
        </div>
      `;
    });
    html += `
        </div>
      </div>
    `;
  });

  dom.presetSizesList.innerHTML = html;
  updateSizesSummary();
  renderCustomSizes();
};

/**
 * Рендерит кастомные размеры
 */
export const renderCustomSizes = () => {
  const state = getState();
  const customSizesSection = document.getElementById('customSizesSection');
  const customSizesList = document.getElementById('customSizesList');
  
  if (!customSizesSection || !customSizesList) return;
  
  if (state.customSizes && state.customSizes.length > 0) {
    customSizesSection.style.display = 'block';
    let html = '';
    state.customSizes.forEach((size) => {
      const id = `custom-size-${size.id}`;
      html += `
        <div class="size-checkbox-item" style="position: relative;">
          <input type="checkbox" id="${id}" data-custom-id="${size.id}" ${
            size.checked ? 'checked' : ''
          }>
          <label for="${id}" style="flex: 1;">${size.width} × ${size.height}</label>
          <button onclick="removeCustomSizeAction('${size.id}')" class="btn-small btn-danger" style="border: none; cursor: pointer; font-size: 16px; line-height: 1; opacity: 0.7; transition: opacity 0.2s; padding: 4px 8px;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'" title="Удалить"><span class="material-icons" style="font-size: 16px;">close</span></button>
        </div>
      `;
    });
    customSizesList.innerHTML = html;
    updateSizesSummary();
  } else {
    customSizesSection.style.display = 'none';
    customSizesList.innerHTML = '';
  }
};

/**
 * Обновляет селект размеров для превью
 */
export const updatePreviewSizeSelect = () => {
  const categorized = renderer.getCategorizedSizes();
  let indices = renderer.getCategoryIndices();
  
  // Обновляем категорию "Узкие"
  const narrowBtn = document.getElementById('previewSizeSelectNarrowBtn');
  const narrowText = document.getElementById('previewSizeSelectNarrowText');
  const narrowDropdown = document.getElementById('previewSizeSelectNarrowDropdown');
  
  if (narrowBtn && narrowText && narrowDropdown) {
    if (categorized.narrow.length === 0) {
      narrowText.textContent = 'Нет размеров';
      narrowDropdown.innerHTML = '';
    } else {
      // Ищем размер 1080x1920 из категории "Общие" по умолчанию
      const defaultIndex = categorized.narrow.findIndex(size => 
        size.width === 1080 && size.height === 1920 && size.platform === 'Общие'
      );
      
      // Получаем текущий выбранный размер
      const currentIndex = indices.narrow;
      const currentSize = currentIndex >= 0 && currentIndex < categorized.narrow.length 
        ? categorized.narrow[currentIndex] 
        : null;
      
      // Используем текущий выбранный индекс из renderer
      let selectedIndex = indices.narrow;
      
      // Проверяем валидность индекса
      if (selectedIndex < 0 || selectedIndex >= categorized.narrow.length) {
        // Если индекс невалидный, устанавливаем дефолтный или 0
        if (defaultIndex >= 0) {
          selectedIndex = defaultIndex;
          renderer.setCategoryIndex('narrow', defaultIndex, false);
        } else {
          selectedIndex = 0;
          renderer.setCategoryIndex('narrow', 0, false);
        }
        // Получаем обновленные индексы
        indices = renderer.getCategoryIndices();
        selectedIndex = indices.narrow;
      }
      
      // Если индекс равен 0 и есть дефолтный размер, устанавливаем его только один раз при инициализации
      // Проверяем, был ли индекс уже установлен ранее (сохранен в localStorage)
      const savedNarrowIndex = localStorage.getItem('previewSizeNarrowIndex');
      if (savedNarrowIndex !== null) {
        const savedIndex = parseInt(savedNarrowIndex, 10);
        if (savedIndex >= 0 && savedIndex < categorized.narrow.length) {
          selectedIndex = savedIndex;
          renderer.setCategoryIndex('narrow', savedIndex, false);
          indices = renderer.getCategoryIndices();
          selectedIndex = indices.narrow;
        }
      } else if (defaultIndex >= 0 && selectedIndex === 0) {
        // Только при первой инициализации устанавливаем дефолтный размер
        selectedIndex = defaultIndex;
        renderer.setCategoryIndex('narrow', defaultIndex, false);
        localStorage.setItem('previewSizeNarrowIndex', defaultIndex.toString());
        indices = renderer.getCategoryIndices();
        selectedIndex = indices.narrow;
      }
      
      const selectedSize = categorized.narrow[selectedIndex];
      narrowText.textContent = `${selectedSize.width} × ${selectedSize.height} (${selectedSize.platform})`;
      
      narrowDropdown.innerHTML = '';
      categorized.narrow.forEach((size, index) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        if (index === selectedIndex) {
          option.classList.add('selected');
        }
        option.textContent = `${size.width} × ${size.height} (${size.platform})`;
          option.onclick = () => {
            narrowText.textContent = option.textContent;
            narrowDropdown.style.display = 'none';
            closeAllPreviewDropdowns();
            // Сохраняем выбранный индекс
            localStorage.setItem('previewSizeNarrowIndex', index.toString());
            changePreviewSizeCategory('narrow', index.toString());
          };
        narrowDropdown.appendChild(option);
      });
    }
  }
  
  // Обновляем категорию "Широкие"
  const wideBtn = document.getElementById('previewSizeSelectWideBtn');
  const wideText = document.getElementById('previewSizeSelectWideText');
  const wideDropdown = document.getElementById('previewSizeSelectWideDropdown');
  
  if (wideBtn && wideText && wideDropdown) {
    if (categorized.wide.length === 0) {
      wideText.textContent = 'Нет размеров';
      wideDropdown.innerHTML = '';
    } else {
      // Ищем размер 1920x720 из категории "Общие" по умолчанию, иначе 1600x1200
      let defaultIndex = categorized.wide.findIndex(size => 
        size.width === 1920 && size.height === 720 && size.platform === 'Общие'
      );
      if (defaultIndex < 0) {
        defaultIndex = categorized.wide.findIndex(size => size.width === 1600 && size.height === 1200);
      }
      
      // Получаем текущий выбранный размер
      const currentIndex = indices.wide;
      const currentSize = currentIndex >= 0 && currentIndex < categorized.wide.length 
        ? categorized.wide[currentIndex] 
        : null;
      
      // Используем текущий выбранный индекс из renderer
      let selectedIndex = indices.wide;
      
      // Проверяем валидность индекса
      if (selectedIndex < 0 || selectedIndex >= categorized.wide.length) {
        // Если индекс невалидный, устанавливаем дефолтный или 0
        if (defaultIndex >= 0) {
          selectedIndex = defaultIndex;
          renderer.setCategoryIndex('wide', defaultIndex, false);
        } else {
          selectedIndex = 0;
          renderer.setCategoryIndex('wide', 0, false);
        }
        // Получаем обновленные индексы
        indices = renderer.getCategoryIndices();
        selectedIndex = indices.wide;
      }
      
      // Проверяем сохраненный индекс
      const savedWideIndex = localStorage.getItem('previewSizeWideIndex');
      if (savedWideIndex !== null) {
        const savedIndex = parseInt(savedWideIndex, 10);
        if (savedIndex >= 0 && savedIndex < categorized.wide.length) {
          selectedIndex = savedIndex;
          renderer.setCategoryIndex('wide', savedIndex, false);
          indices = renderer.getCategoryIndices();
          selectedIndex = indices.wide;
        }
      } else if (defaultIndex >= 0 && selectedIndex === 0) {
        // Только при первой инициализации устанавливаем дефолтный размер
        selectedIndex = defaultIndex;
        renderer.setCategoryIndex('wide', defaultIndex, false);
        localStorage.setItem('previewSizeWideIndex', defaultIndex.toString());
        indices = renderer.getCategoryIndices();
        selectedIndex = indices.wide;
      }
      
      const selectedSize = categorized.wide[selectedIndex];
      wideText.textContent = `${selectedSize.width} × ${selectedSize.height} (${selectedSize.platform})`;
      
      wideDropdown.innerHTML = '';
      categorized.wide.forEach((size, index) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        if (index === selectedIndex) {
          option.classList.add('selected');
        }
        option.textContent = `${size.width} × ${size.height} (${size.platform})`;
        option.onclick = () => {
          wideText.textContent = option.textContent;
          wideDropdown.style.display = 'none';
          closeAllPreviewDropdowns();
          // Сохраняем выбранный индекс
          localStorage.setItem('previewSizeWideIndex', index.toString());
          changePreviewSizeCategory('wide', index.toString());
        };
        wideDropdown.appendChild(option);
      });
    }
  }
  
  // Обновляем категорию "Квадратные"
  const squareBtn = document.getElementById('previewSizeSelectSquareBtn');
  const squareText = document.getElementById('previewSizeSelectSquareText');
  const squareDropdown = document.getElementById('previewSizeSelectSquareDropdown');
  
  if (squareBtn && squareText && squareDropdown) {
    if (categorized.square.length === 0) {
      squareText.textContent = 'Нет размеров';
      squareDropdown.innerHTML = '';
    } else {
      // Ищем размер 1080x1080 из категории "Общие" по умолчанию
      const defaultIndex = categorized.square.findIndex(size => 
        size.width === 1080 && size.height === 1080 && size.platform === 'Общие'
      );
      
      // Получаем текущий выбранный размер
      const currentIndex = indices.square;
      const currentSize = currentIndex >= 0 && currentIndex < categorized.square.length 
        ? categorized.square[currentIndex] 
        : null;
      
      // Используем текущий выбранный индекс из renderer
      let selectedIndex = indices.square;
      
      // Проверяем валидность индекса
      if (selectedIndex < 0 || selectedIndex >= categorized.square.length) {
        // Если индекс невалидный, устанавливаем дефолтный или 0
        if (defaultIndex >= 0) {
          selectedIndex = defaultIndex;
          renderer.setCategoryIndex('square', defaultIndex, false);
        } else {
          selectedIndex = 0;
          renderer.setCategoryIndex('square', 0, false);
        }
        // Получаем обновленные индексы
        indices = renderer.getCategoryIndices();
        selectedIndex = indices.square;
      }
      
      // Проверяем сохраненный индекс
      const savedSquareIndex = localStorage.getItem('previewSizeSquareIndex');
      if (savedSquareIndex !== null) {
        const savedIndex = parseInt(savedSquareIndex, 10);
        if (savedIndex >= 0 && savedIndex < categorized.square.length) {
          selectedIndex = savedIndex;
          renderer.setCategoryIndex('square', savedIndex, false);
          indices = renderer.getCategoryIndices();
          selectedIndex = indices.square;
        }
      } else if (defaultIndex >= 0 && selectedIndex === 0) {
        // Только при первой инициализации устанавливаем дефолтный размер
        selectedIndex = defaultIndex;
        renderer.setCategoryIndex('square', defaultIndex, false);
        localStorage.setItem('previewSizeSquareIndex', defaultIndex.toString());
        indices = renderer.getCategoryIndices();
        selectedIndex = indices.square;
      }
      
      const selectedSize = categorized.square[selectedIndex];
      squareText.textContent = `${selectedSize.width} × ${selectedSize.height} (${selectedSize.platform})`;
      
      squareDropdown.innerHTML = '';
      categorized.square.forEach((size, index) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        if (index === selectedIndex) {
          option.classList.add('selected');
        }
        option.textContent = `${size.width} × ${size.height} (${size.platform})`;
        option.onclick = () => {
          squareText.textContent = option.textContent;
          squareDropdown.style.display = 'none';
          closeAllPreviewDropdowns();
          // Сохраняем выбранный индекс
          localStorage.setItem('previewSizeSquareIndex', index.toString());
          changePreviewSizeCategory('square', index.toString());
        };
        squareDropdown.appendChild(option);
      });
    }
  }
  
  // Закрываем все дропдауны
  closeAllPreviewDropdowns();
};

/**
 * Переключает размер превью по категории
 */
export const changePreviewSizeCategory = (category, index) => {
  const categorized = renderer.getCategorizedSizes();
  const sizes = categorized[category] || [];
  const idx = Number(index) || 0;
  if (sizes[idx]) {
    // Обновляем текст кнопки сразу
    const size = sizes[idx];
    if (category === 'narrow') {
      const narrowText = document.getElementById('previewSizeSelectNarrowText');
      if (narrowText) {
        narrowText.textContent = `${size.width} × ${size.height} (${size.platform})`;
      }
    } else if (category === 'wide') {
      const wideText = document.getElementById('previewSizeSelectWideText');
      if (wideText) {
        wideText.textContent = `${size.width} × ${size.height} (${size.platform})`;
      }
    } else if (category === 'square') {
      const squareText = document.getElementById('previewSizeSelectSquareText');
      if (squareText) {
        squareText.textContent = `${size.width} × ${size.height} (${size.platform})`;
      }
    }
    
    // Устанавливаем индекс для категории и запускаем рендеринг
    console.log('changePreviewSizeCategory:', { category, index: idx, sizes: sizes.length });
    renderer.setCategoryIndex(category, idx, true);
    
    // Обновляем только дропдаун (текст кнопки уже обновлен выше)
    // Не вызываем updatePreviewSizeSelect(), чтобы не перезаписать выбранный индекс
    setTimeout(() => {
      // Обновляем только список опций в дропдауне, не меняя выбранный текст
      const categorized = renderer.getCategorizedSizes();
      const sizes = categorized[category] || [];
      const dropdown = category === 'narrow' 
        ? document.getElementById('previewSizeSelectNarrowDropdown')
        : category === 'wide'
        ? document.getElementById('previewSizeSelectWideDropdown')
        : document.getElementById('previewSizeSelectSquareDropdown');
      
      if (dropdown && sizes.length > 0) {
        dropdown.innerHTML = '';
        sizes.forEach((size, index) => {
          const option = document.createElement('div');
          option.className = 'custom-select-option';
          if (index === idx) {
            option.classList.add('selected');
          }
          option.textContent = `${size.width} × ${size.height} (${size.platform})`;
          option.onclick = () => {
            // Обновляем текст кнопки
            if (category === 'narrow') {
              const narrowText = document.getElementById('previewSizeSelectNarrowText');
              if (narrowText) narrowText.textContent = option.textContent;
              dropdown.style.display = 'none';
            } else if (category === 'wide') {
              const wideText = document.getElementById('previewSizeSelectWideText');
              if (wideText) wideText.textContent = option.textContent;
              dropdown.style.display = 'none';
            } else if (category === 'square') {
              const squareText = document.getElementById('previewSizeSelectSquareText');
              if (squareText) squareText.textContent = option.textContent;
              dropdown.style.display = 'none';
            }
            // Закрываем все дроплисты
            closeAllPreviewDropdowns();
            // Сохраняем выбранный индекс
            if (category === 'narrow') {
              localStorage.setItem('previewSizeNarrowIndex', index.toString());
            } else if (category === 'wide') {
              localStorage.setItem('previewSizeWideIndex', index.toString());
            } else if (category === 'square') {
              localStorage.setItem('previewSizeSquareIndex', index.toString());
            }
            changePreviewSizeCategory(category, index.toString());
          };
          dropdown.appendChild(option);
        });
      }
    }, 50);
    
    // Прокручиваем к области превью канваса после завершения рендеринга
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Прокручиваем к конкретному canvas в зависимости от категории
          let targetCanvas = null;
          if (category === 'narrow') {
            targetCanvas = document.getElementById('previewCanvasNarrow');
          } else if (category === 'wide') {
            targetCanvas = document.getElementById('previewCanvasWide');
          } else if (category === 'square') {
            targetCanvas = document.getElementById('previewCanvasSquare');
          }
          
          // Если нашли конкретный canvas, прокручиваем к нему, иначе к области
          const scrollTarget = targetCanvas || document.getElementById('canvasArea');
          if (scrollTarget) {
            // Получаем позицию элемента
            const rect = scrollTarget.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft;
            
            // Вычисляем позицию для центрирования элемента
            const targetY = rect.top + scrollTop - (window.innerHeight / 2) + (rect.height / 2);
            const targetX = rect.left + scrollLeft - (window.innerWidth / 2) + (rect.width / 2);
            
            // Прокручиваем к элементу
            if (window.scrollTo && typeof window.scrollTo === 'function') {
              window.scrollTo({ 
                top: Math.max(0, targetY), 
                left: Math.max(0, targetX), 
                behavior: 'smooth' 
              });
            } else {
              // Fallback для очень старых браузеров
              window.scrollTo(Math.max(0, targetX), Math.max(0, targetY));
            }
          }
        }, 200);
      });
    });
  }
};

/**
 * Переключает пресетный размер
 */
export const toggleSize = (platform, index) => {
  togglePresetSize(platform, index);
  const checkbox = document.getElementById(`size-${platform}-${index}`);
  if (checkbox) {
    const state = getState();
    checkbox.checked = state.presetSizes[platform]?.[index]?.checked ?? false;
  }
  updatePreviewSizeSelect();
  updateSizesSummary();
  renderer.render();
};

/**
 * Переключает кастомный размер
 */
export const toggleCustomSizeAction = (id) => {
  toggleCustomSize(id);
  updateSizesSummary();
  updatePreviewSizeSelect();
  updateSizesSummary();
  renderer.render();
};

/**
 * Удаляет кастомный размер
 */
export const removeCustomSizeAction = (id) => {
  removeCustomSize(id);
  renderCustomSizes();
  updatePreviewSizeSelect();
  updateSizesSummary(); // Обновляем сводку после удаления
  renderer.render();
};

/**
 * Добавляет кастомный размер
 */
export const addCustomSizeAction = (width, height) => {
  // Проверяем, что значения являются числами и больше 0
  const widthNum = typeof width === 'number' ? width : parseInt(width, 10);
  const heightNum = typeof height === 'number' ? height : parseInt(height, 10);
  
  if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
    return;
  }
  
  addCustomSize(widthNum, heightNum);
  renderCustomSizes();
  updatePreviewSizeSelect();
  updateSizesSummary();
  renderer.render();
};

/**
 * Обновляет состояние кнопки добавления размера
 */
export const updateAddSizeButtonState = () => {
  const widthInput = document.getElementById('customWidth');
  const heightInput = document.getElementById('customHeight');
  const addButton = document.getElementById('addSizeButton');
  
  if (!widthInput || !heightInput || !addButton) return;
  
  const width = parseInt(widthInput.value, 10);
  const height = parseInt(heightInput.value, 10);
  
  if (width > 0 && height > 0) {
    addButton.disabled = false;
    addButton.style.opacity = '1';
    addButton.style.cursor = 'pointer';
  } else {
    addButton.disabled = true;
    addButton.style.opacity = '0.5';
    addButton.style.cursor = 'not-allowed';
  }
};

/**
 * Добавляет кастомный размер из полей ввода
 */
let isAddingSize = false; // Флаг для предотвращения повторных вызовов

export const addCustomSizeFromInput = () => {
  // Предотвращаем повторные вызовы
  if (isAddingSize) {
    return;
  }
  
  const widthInput = document.getElementById('customWidth');
  const heightInput = document.getElementById('customHeight');
  
  if (!widthInput || !heightInput) return;
  
  // Получаем значения и проверяем, что они не пустые
  const widthStr = widthInput.value.trim();
  const heightStr = heightInput.value.trim();
  
  if (!widthStr || !heightStr) {
    return;
  }
  
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);
  
  // Проверяем, что значения являются валидными числами и больше 0
  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    return;
  }
  
  // Устанавливаем флаг перед добавлением
  isAddingSize = true;
  
  try {
    addCustomSizeAction(width, height);
    
    // Очищаем поля ввода только после успешного добавления
    widthInput.value = '';
    heightInput.value = '';
    updateAddSizeButtonState();
  } finally {
    // Сбрасываем флаг после завершения
    isAddingSize = false;
  }
};

/**
 * Выбирает все размеры
 */
export const selectAllSizesAction = () => {
  selectAllPresetSizes();
  renderPresetSizes();
  updatePreviewSizeSelect();
  updateSizesSummary();
  renderer.render();
};

/**
 * Снимает выбор со всех размеров
 */
export const deselectAllSizesAction = () => {
  deselectAllPresetSizes();
  renderPresetSizes();
  updatePreviewSizeSelect();
  updateSizesSummary();
  renderer.render();
};

/**
 * Переключает видимость размеров платформы
 */
export const togglePlatformSizes = (platform) => {
  const sizesEl = document.getElementById(`sizes-${platform}`);
  const platformGroup = document.getElementById(`platform-group-${platform}`);
  if (sizesEl && platformGroup) {
    sizesEl.classList.toggle('collapsed');
    const isCollapsed = sizesEl.classList.contains('collapsed');
    const toggleIcon = platformGroup.querySelector('.toggle-icon');
    if (toggleIcon) {
      toggleIcon.textContent = isCollapsed ? '▼' : '▲';
    }
  }
};

// Флаг для отслеживания первой инициализации размеров по умолчанию
let defaultSizesInitialized = false;

/**
 * Инициализирует UI для работы с размерами
 */
export const initializeSizeManager = () => {
  renderPresetSizes();
  
  // Устанавливаем размеры из категории "Общие" по умолчанию при первой инициализации
  if (!defaultSizesInitialized) {
    // Небольшая задержка, чтобы убедиться, что размеры загружены и категоризированы
    setTimeout(() => {
      const categorized = renderer.getCategorizedSizes();
      const indices = renderer.getCategoryIndices();
      let needsUpdate = false;
      
      // Устанавливаем 1080x1920 для узких форматов
      if (categorized.narrow.length > 0) {
        const defaultNarrowIndex = categorized.narrow.findIndex(size => 
          size.width === 1080 && size.height === 1920 && size.platform === 'Общие'
        );
        if (defaultNarrowIndex >= 0) {
          const currentSize = indices.narrow >= 0 && indices.narrow < categorized.narrow.length
            ? categorized.narrow[indices.narrow]
            : null;
          // Устанавливаем, если индекс 0 или текущий размер не из "Общие"
          if (indices.narrow === 0 || !currentSize || currentSize.platform !== 'Общие') {
            renderer.setCategoryIndex('narrow', defaultNarrowIndex, false);
            needsUpdate = true;
          }
        }
      }
      
      // Устанавливаем 1920x720 для широких форматов
      if (categorized.wide.length > 0) {
        let defaultWideIndex = categorized.wide.findIndex(size => 
          size.width === 1920 && size.height === 720 && size.platform === 'Общие'
        );
        if (defaultWideIndex < 0) {
          defaultWideIndex = categorized.wide.findIndex(size => size.width === 1600 && size.height === 1200);
        }
        if (defaultWideIndex >= 0) {
          const currentSize = indices.wide >= 0 && indices.wide < categorized.wide.length
            ? categorized.wide[indices.wide]
            : null;
          // Устанавливаем, если индекс 0 или текущий размер не из "Общие"
          if (indices.wide === 0 || !currentSize || currentSize.platform !== 'Общие') {
            renderer.setCategoryIndex('wide', defaultWideIndex, false);
            needsUpdate = true;
          }
        }
      }
      
      // Устанавливаем 1080x1080 для квадратных форматов
      if (categorized.square.length > 0) {
        const defaultSquareIndex = categorized.square.findIndex(size => 
          size.width === 1080 && size.height === 1080 && size.platform === 'Общие'
        );
        if (defaultSquareIndex >= 0) {
          const currentSize = indices.square >= 0 && indices.square < categorized.square.length
            ? categorized.square[indices.square]
            : null;
          // Устанавливаем, если индекс 0 или текущий размер не из "Общие"
          if (indices.square === 0 || !currentSize || currentSize.platform !== 'Общие') {
            renderer.setCategoryIndex('square', defaultSquareIndex, false);
            needsUpdate = true;
          }
        }
      }
      
      // Обновляем UI после установки индексов
      if (needsUpdate) {
        updatePreviewSizeSelect();
        // Запускаем рендеринг после установки размеров по умолчанию
        renderer.render();
      }
      
      defaultSizesInitialized = true;
    }, 100);
  }
  
  updatePreviewSizeSelect();
  updateSizesSummary();
  
  // Инициализируем обработчики для кастомных размеров
  const widthInput = document.getElementById('customWidthInput');
  const heightInput = document.getElementById('customHeightInput');
  
  if (widthInput && heightInput) {
    widthInput.addEventListener('input', updateAddSizeButtonState);
    heightInput.addEventListener('input', updateAddSizeButtonState);
    widthInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addCustomSizeFromInput();
      }
    });
    heightInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addCustomSizeFromInput();
      }
    });
  }
  
  const addButton = document.getElementById('addSizeButton');
  if (addButton) {
    addButton.addEventListener('click', addCustomSizeFromInput);
  }
};

// Делаем функции доступными глобально для использования в HTML
if (typeof window !== 'undefined') {
  window.toggleSizeAction = toggleSize;
  window.toggleCustomSizeAction = toggleCustomSizeAction;
  window.removeCustomSizeAction = removeCustomSizeAction;
  window.addCustomSizeAction = addCustomSizeAction;
  window.updateAddSizeButtonState = updateAddSizeButtonState;
  window.togglePlatformSizes = togglePlatformSizes;
  window.changePreviewSizeCategory = changePreviewSizeCategory;
}

