/**
 * Модуль для работы с фоном
 * Содержит функции выбора цвета, загрузки изображения и управления фоном
 */

import { getState, setKey, setState, updatePairBgImage, updatePairBgColor } from '../../state/store.js';
import { PRESET_BACKGROUND_COLORS, AVAILABLE_BG } from '../../constants.js';
import { scanBG } from '../../utils/assetScanner.js';
import { renderer } from '../../renderer.js';
import { getDom } from '../domCache.js';
import { autoSelectLogoByTextColor, syncFormFields } from '../ui.js';
import { observeImages } from '../../utils/lazyImageLoader.js';
import { t } from '../../utils/i18n.js';

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
 * Нормализует цвет в формат #RRGGBB
 */
const normalizeColor = (color) => {
  if (!color) return '#000000';
  
  // Если уже в формате #RRGGBB, возвращаем как есть
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color.toUpperCase();
  }
  
  // Если в формате #RGB, конвертируем в #RRGGBB
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  
  // Если в формате rgb(r, g, b), конвертируем
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }
  
  return color;
};

/**
 * Обновляет UI для фона
 */
export const updateBgUI = () => {
  const state = getState();
  const { bgImage } = state;
  const dom = getDom();
  const bgImageOptions = document.getElementById('bgImageOptions');
  
  if (!dom.bgPreviewContainer || !dom.bgPreviewImg || !dom.bgPreviewPlaceholder) return;
  
  // Добавляем обработчик клика на превью для открытия модального окна
  if (dom.bgPreviewContainer) {
    dom.bgPreviewContainer.style.cursor = 'pointer';
    if (!dom.bgPreviewContainer.dataset.clickHandlerAdded) {
      dom.bgPreviewContainer.addEventListener('click', async () => {
        await openBGSelectModal();
      });
      dom.bgPreviewContainer.dataset.clickHandlerAdded = 'true';
    }
  }
  
  if (bgImage) {
    // Есть фоновое изображение
    if (dom.bgPreviewImg) {
      dom.bgPreviewImg.src = bgImage.src || (typeof bgImage === 'string' ? bgImage : '');
      dom.bgPreviewImg.style.display = 'block';
    }
    if (dom.bgPreviewPlaceholder) {
      dom.bgPreviewPlaceholder.style.display = 'none';
    }
    if (dom.bgUploadBtn) {
      dom.bgUploadBtn.style.display = 'none';
    }
    if (dom.bgReplaceBtn) {
      dom.bgReplaceBtn.style.display = 'flex';
    }
    if (dom.bgDeleteBtn) {
      dom.bgDeleteBtn.style.display = 'flex';
    }
    if (bgImageOptions) bgImageOptions.style.display = 'block';
  } else {
    // Нет фонового изображения
    if (dom.bgPreviewImg) {
      dom.bgPreviewImg.src = '';
      dom.bgPreviewImg.style.display = 'none';
    }
    if (dom.bgPreviewPlaceholder) {
      dom.bgPreviewPlaceholder.style.display = 'block';
    }
    if (dom.bgUploadBtn) {
      dom.bgUploadBtn.style.display = 'flex';
    }
    if (dom.bgReplaceBtn) {
      dom.bgReplaceBtn.style.display = 'none';
    }
    if (dom.bgDeleteBtn) {
      dom.bgDeleteBtn.style.display = 'none';
    }
    if (bgImageOptions) bgImageOptions.style.display = 'none';
  }
};

/**
 * Загружает фоновое изображение из файла
 */
export const handleBgImageUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  (async () => {
    try {
      const state = getState();
      const activePairIndex = state.activePairIndex || 0;
      
      const dataURL = await readFileAsDataURL(file);
      const img = await loadImage(dataURL);
      
      // Обновляем фоновое изображение для активной пары
      updatePairBgImage(activePairIndex, img);
      
      updateBgUI();
      // Синхронизируем остальные поля UI (после обновления чекбокса)
      syncFormFields();
      renderer.render();
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить изображение.');
    }
  })();
};

/**
 * Очищает фоновое изображение
 */
export const clearBgImage = () => {
  const state = getState();
  const activePairIndex = state.activePairIndex || 0;
  
  // Очищаем фоновое изображение для активной пары
  updatePairBgImage(activePairIndex, null);
  
  // Восстанавливаем затемнение, если не в PRO режиме
  if (!state.proMode) {
    setKey('textGradientOpacity', 100);
    const domGradient = getDom();
    if (domGradient.textGradientOpacity) {
      domGradient.textGradientOpacity.value = 100;
    }
    if (domGradient.textGradientOpacityValue) {
      domGradient.textGradientOpacityValue.textContent = '100%';
    }
  }
  
  updateBgUI();
  renderer.render();
};

/**
 * Обновляет цвет фона
 */
export const updateBgColor = async (color) => {
  const normalizedColor = normalizeColor(color);
  setKey('bgColor', normalizedColor);
  const state = getState();
  const activePairIndex = state.activePairIndex || 0;
  updatePairBgColor(activePairIndex, normalizedColor);
  const dom = getDom();
  if (dom.bgColor) dom.bgColor.value = normalizedColor;
  if (dom.bgColorHex) dom.bgColorHex.value = normalizedColor;
  
  // Обновляем цвета текста в зависимости от фона
  await updateTextColorsForBg(normalizedColor);
  
  renderer.render();
};

/**
 * Обновляет тип градиента
 */
export const updateBgGradientType = async (type) => {
  try {
    const state = getState();
    const gradientOptions = document.getElementById('bgGradientOptions');
    const angleContainer = document.getElementById('bgGradientAngleContainer');
    const gradientTypeToggle = document.getElementById('bgGradientTypeToggle');
    
    // Обновляем активное состояние в переключателе
    if (gradientTypeToggle) {
      gradientTypeToggle.setAttribute('data-value', type);
      const options = gradientTypeToggle.querySelectorAll('.toggle-switch-option');
      options.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.value === type) {
          option.classList.add('active');
        }
      });
      
      // Обновляем позицию слайдера для 3 опций
      const slider = gradientTypeToggle.querySelector('.toggle-switch-slider');
      if (slider) {
        if (type === 'linear') {
          slider.style.transform = 'translateX(calc(100% - 2.666667px))';
        } else if (type === 'radial') {
          slider.style.transform = 'translateX(calc(200% - 5.333334px))';
        } else {
          slider.style.transform = 'translateX(0)';
        }
      }
    }
    
    if (type === 'none') {
      setKey('bgGradient', null);
      if (gradientOptions) gradientOptions.style.display = 'none';
    } else {
      // Создаем градиент по умолчанию, если его нет
      let gradient = state.bgGradient;
      if (!gradient || !gradient.stops || gradient.stops.length === 0) {
        gradient = {
          type: type,
          stops: [
            { color: '#000000', position: 0, alpha: 1 },
            { color: '#ffffff', position: 1, alpha: 1 }
          ],
          angle: 0
        };
      } else {
        gradient = { ...gradient, type: type };
      }
      setKey('bgGradient', gradient);
      if (gradientOptions) gradientOptions.style.display = 'block';
      
      // Скрываем угол для радиального градиента
      if (angleContainer) {
        if (type === 'radial') {
          angleContainer.style.display = 'none';
        } else {
          angleContainer.style.display = 'block';
        }
      }
      
      // Вызываем с небольшой задержкой, чтобы DOM успел обновиться
      setTimeout(() => {
        updateGradientStopsUI();
      }, 0);
    }
    
    if (renderer && renderer.render) {
      renderer.render();
    }
  } catch (error) {
    console.error('Ошибка в updateBgGradientType:', error);
  }
};

/**
 * Обновляет угол градиента
 */
export const updateBgGradientAngle = async (angle) => {
  const state = getState();
  const angleValue = parseInt(angle, 10);
  const angleValueEl = document.getElementById('bgGradientAngleValue');
  
  if (angleValueEl) {
    angleValueEl.textContent = `${angleValue}°`;
  }
  
  if (state.bgGradient) {
    const gradient = { ...state.bgGradient, angle: angleValue };
    setKey('bgGradient', gradient);
  }
  
  if (renderer && renderer.render) {
    renderer.render();
  }
};

/**
 * Добавляет остановку градиента
 */
export const addGradientStop = async () => {
  try {
    const state = getState();
    let gradient = state.bgGradient;
    
    if (!gradient || !gradient.stops) {
      gradient = {
        type: 'linear',
        stops: [],
        angle: 0
      };
    }
    
    const newStop = {
      color: '#000000',
      position: gradient.stops.length > 0 ? 
        Math.min(1, Math.max(0, gradient.stops[gradient.stops.length - 1].position + 0.1)) : 0.5,
      alpha: 1
    };
    
    const stops = [...gradient.stops, newStop].sort((a, b) => a.position - b.position);
    gradient = { ...gradient, stops };
    
    setKey('bgGradient', gradient);
    setTimeout(() => {
      updateGradientStopsUI();
    }, 0);
    
    if (renderer && renderer.render) {
      renderer.render();
    }
  } catch (error) {
    console.error('Ошибка в addGradientStop:', error);
  }
};

/**
 * Обновляет UI остановок градиента
 */
function updateGradientStopsUI() {
  const state = getState();
  const stopsContainer = document.getElementById('bgGradientStops');
  if (!stopsContainer) return;
  
  const gradient = state.bgGradient;
  if (!gradient || !gradient.stops || gradient.stops.length === 0) {
    stopsContainer.innerHTML = '';
    return;
  }
  
  stopsContainer.innerHTML = gradient.stops.map((stop, index) => `
    <div class="form-group" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
      <input type="color" value="${stop.color || '#000000'}" data-stop-index="${index}" data-stop-property="color" style="flex: 0 0 60px;">
      <input type="number" class="theme-input" min="0" max="100" step="1" value="${Math.round((stop.position !== undefined ? stop.position : 0) * 100)}" data-stop-index="${index}" data-stop-property="position" style="flex: 1;" placeholder="0">
      <span style="min-width: 20px; text-align: center; color: var(--text-muted);">%</span>
      <input type="number" class="theme-input" min="0" max="100" step="1" value="${Math.round((stop.alpha !== undefined ? stop.alpha : 1) * 100)}" data-stop-index="${index}" data-stop-property="alpha" style="flex: 1;" placeholder="100">
      <span style="min-width: 20px; text-align: center; color: var(--text-muted);">%</span>
      <button class="btn btn-small" data-function="removeGradientStop" data-stop-index="${index}" style="flex: 0 0 auto;"><span class="material-icons" style="font-size: 16px;">delete</span></button>
    </div>
  `).join('');
  
  // Добавляем обработчики
  stopsContainer.querySelectorAll('input[type="color"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const currentState = getState();
      const currentGradient = currentState.bgGradient;
      if (!currentGradient || !currentGradient.stops) return;
      
      const index = parseInt(e.target.dataset.stopIndex, 10);
      const stops = [...currentGradient.stops];
      stops[index] = { ...stops[index], color: e.target.value };
      setKey('bgGradient', { ...currentGradient, stops });
      if (renderer && renderer.render) renderer.render();
    });
  });
  
  stopsContainer.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const currentState = getState();
      const currentGradient = currentState.bgGradient;
      if (!currentGradient || !currentGradient.stops) return;
      
      const index = parseInt(e.target.dataset.stopIndex, 10);
      const property = e.target.dataset.stopProperty;
      // Конвертируем проценты в значение от 0 до 1
      const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) / 100;
      const stops = [...currentGradient.stops];
      stops[index] = { ...stops[index], [property]: value };
      
      setKey('bgGradient', { ...currentGradient, stops });
      if (renderer && renderer.render) renderer.render();
    });
    
    input.addEventListener('blur', (e) => {
      // Обновляем значение в инпуте при потере фокуса (на случай, если ввели невалидное значение)
      const property = e.target.dataset.stopProperty;
      const currentState = getState();
      const currentGradient = currentState.bgGradient;
      if (!currentGradient || !currentGradient.stops) return;
      
      const index = parseInt(e.target.dataset.stopIndex, 10);
      const stop = currentGradient.stops[index];
      if (stop) {
        const value = property === 'position' ? stop.position : stop.alpha;
        e.target.value = Math.round(value * 100);
      }
    });
  });
  
  // Добавляем обработчики для кнопок удаления остановок
  stopsContainer.querySelectorAll('button[data-function="removeGradientStop"]').forEach(btn => {
    // Удаляем старые обработчики, если они есть
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const index = newBtn.dataset.stopIndex;
      await removeGradientStop(index);
    });
  });
}

/**
 * Удаляет остановку градиента
 */
export const removeGradientStop = async (index) => {
  try {
    const state = getState();
    const gradient = state.bgGradient;
    
    if (!gradient || !gradient.stops || gradient.stops.length <= 1) {
      return; // Нельзя удалить последнюю остановку
    }
    
    const stops = gradient.stops.filter((_, i) => i !== parseInt(index, 10));
    setKey('bgGradient', { ...gradient, stops });
    setTimeout(() => {
      updateGradientStopsUI();
    }, 0);
    
    if (renderer && renderer.render) {
      renderer.render();
    }
  } catch (error) {
    console.error('Ошибка в removeGradientStop:', error);
  }
};

export const applyPresetBgColor = async (color) => {
  const normalizedColor = normalizeColor(color);
  setKey('bgColor', normalizedColor);
  const state = getState();
  const activePairIndex = state.activePairIndex || 0;
  updatePairBgColor(activePairIndex, normalizedColor);
  const dom = getDom();
  if (dom.bgColor) dom.bgColor.value = normalizedColor;
  if (dom.bgColorHex) dom.bgColorHex.value = normalizedColor;
  
  // Обновляем цвета текста в зависимости от фона
  await updateTextColorsForBg(normalizedColor);
  
  renderer.render();
};

/**
 * Обновляет цвета текста в зависимости от фона
 */
const updateTextColorsForBg = async (bgColor) => {
  const normalizedBg = normalizeColor(bgColor);
  const dom = getDom();
  
  // Специальная проверка для цветов #E84033 и #FF6C26 - всегда белый текст и белый логотип
  if (normalizedBg === '#E84033' || normalizedBg === '#FF6C26') {
    const textColor = '#ffffff';
    setState({
      titleColor: textColor,
      subtitleColor: textColor,
      legalColor: textColor
    });
    
    // Обновляем UI элементы для цветов текста
    if (dom.titleColor) dom.titleColor.value = textColor;
    if (dom.titleColorHex) dom.titleColorHex.value = textColor;
    if (dom.subtitleColor) dom.subtitleColor.value = textColor;
    if (dom.subtitleColorHex) dom.subtitleColorHex.value = textColor;
    if (dom.legalColor) dom.legalColor.value = textColor;
    if (dom.legalColorHex) dom.legalColorHex.value = textColor;
    
    // Автоматически выбираем белый логотип
    await autoSelectLogoByTextColor(textColor);
    return;
  }
  
  // Конвертируем цвет в RGB
  const hex = normalizedBg.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Вычисляем яркость (luminance)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Если фон темный, делаем текст светлым, и наоборот
  const textColor = luminance > 0.5 ? '#1e1e1e' : '#ffffff';
  const subtitleColor = luminance > 0.5 ? '#4a4a4a' : '#e0e0e0';
  const legalColor = luminance > 0.5 ? '#666666' : '#ffffff';
  
  setState({
    titleColor: textColor,
    subtitleColor: subtitleColor,
    legalColor: legalColor
  });
  
  // Обновляем UI элементы для цветов текста
  if (dom.titleColor) dom.titleColor.value = textColor;
  if (dom.titleColorHex) dom.titleColorHex.value = textColor;
  if (dom.subtitleColor) dom.subtitleColor.value = subtitleColor;
  if (dom.subtitleColorHex) dom.subtitleColorHex.value = subtitleColor;
  if (dom.legalColor) dom.legalColor.value = legalColor;
  if (dom.legalColorHex) dom.legalColorHex.value = legalColor;
  
  // Автоматически выбираем соответствующий логотип на основе цвета текста
  await autoSelectLogoByTextColor(textColor);
};

/**
 * Обновляет размер фонового изображения
 */
export const updateBgSize = (size) => {
  setKey('bgSize', size);
  
  // Показываем/скрываем поле размера изображения
  const bgImageSizeGroup = document.getElementById('bgImageSizeGroup');
  if (bgImageSizeGroup) {
    if (size === 'tile' || size === 'cover' || size === 'contain') {
      bgImageSizeGroup.style.display = 'block';
    } else {
      bgImageSizeGroup.style.display = 'none';
    }
  }
  
  renderer.render();
};

/**
 * Обновляет размер изображения фона в процентах
 */
export const updateBgImageSize = (size) => {
  const numSize = typeof size === 'number' ? size : parseFloat(size) || 100;
  setKey('bgImageSize', numSize);
  
  // Обновляем отображаемое значение в основном интерфейсе
  const bgImageSizeValue = document.getElementById('bgImageSizeValue');
  if (bgImageSizeValue) {
    bgImageSizeValue.textContent = `${Math.round(numSize)}%`;
  }
  
  // Обновляем отображаемое значение в админке
  const defaultBgImageSizeValue = document.getElementById('defaultBgImageSizeValue');
  if (defaultBgImageSizeValue) {
    defaultBgImageSizeValue.textContent = `${Math.round(numSize)}%`;
  }
  
  renderer.render();
};

/**
 * Обновляет позицию фонового изображения
 */
export const updateBgPosition = (position) => {
  setKey('bgPosition', position);
  renderer.render();
};

/**
 * Инициализирует UI для работы с фоном
 */
export const initializeBackgroundUI = () => {
  try {
    const state = getState();
    const dom = getDom();
    
    // Обновляем цвет фона
    if (dom.bgColor) {
      dom.bgColor.value = state.bgColor || '#1e1e1e';
    }
    if (dom.bgColorHex) {
      dom.bgColorHex.value = state.bgColor || '#1e1e1e';
    }
    
    // Инициализируем UI градиента (с защитой от ошибок)
    try {
      initializeGradientUI();
    } catch (error) {
      console.warn('Ошибка инициализации UI градиента (не критично):', error);
    }
    
    // Обновляем UI фонового изображения
    updateBgUI();
    
    // Инициализируем dropdown для выбора из библиотеки
    initializeBGDropdown();
    
    // Инициализируем предустановленные цвета
    const presetColorsContainer = document.getElementById('presetBgColors');
    if (presetColorsContainer) {
      presetColorsContainer.innerHTML = '';
      PRESET_BACKGROUND_COLORS.forEach((color) => {
        const colorBtn = document.createElement('button');
        colorBtn.className = 'preset-color-btn';
        colorBtn.style.backgroundColor = color;
        colorBtn.title = color;
        colorBtn.addEventListener('click', () => {
          applyPresetBgColor(color);
        });
        presetColorsContainer.appendChild(colorBtn);
      });
    }
  } catch (error) {
    console.error('Ошибка в initializeBackgroundUI:', error);
  }
};

/**
 * Инициализирует UI для градиента
 */
function initializeGradientUI() {
  try {
    const state = getState();
    const gradientTypeToggle = document.getElementById('bgGradientTypeToggle');
    const gradientOptions = document.getElementById('bgGradientOptions');
    const angleContainer = document.getElementById('bgGradientAngleContainer');
    const gradientAngleInput = document.getElementById('bgGradientAngle');
    const gradientAngleValue = document.getElementById('bgGradientAngleValue');
    
    if (!gradientTypeToggle) return;
    
    // Устанавливаем текущий тип градиента
    const currentType = state.bgGradient ? state.bgGradient.type : 'none';
    gradientTypeToggle.setAttribute('data-value', currentType);
    
    // Обновляем активную опцию
    const options = gradientTypeToggle.querySelectorAll('.toggle-switch-option');
    options.forEach(opt => {
      opt.classList.remove('active');
      if (opt.dataset.value === currentType) {
        opt.classList.add('active');
      }
    });
    
    // Обновляем позицию слайдера для 3 опций
    const slider = gradientTypeToggle.querySelector('.toggle-switch-slider');
    if (slider) {
      if (currentType === 'linear') {
        slider.style.transform = 'translateX(calc(100% - 2.666667px))';
      } else if (currentType === 'radial') {
        slider.style.transform = 'translateX(calc(200% - 5.333334px))';
      } else {
        slider.style.transform = 'translateX(0)';
      }
    }
    
    // Показываем/скрываем опции градиента
    if (currentType !== 'none' && gradientOptions) {
      gradientOptions.style.display = 'block';
      
      // Скрываем угол для радиального градиента
      if (angleContainer) {
        if (currentType === 'radial') {
          angleContainer.style.display = 'none';
        } else {
          angleContainer.style.display = 'block';
        }
      }
      
      // Вызываем с задержкой, чтобы DOM успел обновиться
      setTimeout(() => {
        updateGradientStopsUI();
      }, 0);
    } else if (gradientOptions) {
      gradientOptions.style.display = 'none';
    }
    
    // Устанавливаем угол градиента
    if (state.bgGradient && gradientAngleInput) {
      gradientAngleInput.value = state.bgGradient.angle || 0;
    }
    if (gradientAngleValue && state.bgGradient) {
      gradientAngleValue.textContent = `${state.bgGradient.angle || 0}°`;
    }
    
    // Добавляем обработчики для тумблера типа градиента
    options.forEach(opt => {
      opt.addEventListener('click', async () => {
        const newType = opt.dataset.value;
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        gradientTypeToggle.setAttribute('data-value', newType);
        await updateBgGradientType(newType);
      });
    });
    
    // Добавляем обработчик для угла градиента
    if (gradientAngleInput) {
      gradientAngleInput.addEventListener('input', (e) => {
        updateBgGradientAngle(e.target.value);
      });
    }
    
    // Добавляем обработчик для кнопки добавления остановки
    const addStopBtn = document.getElementById('addGradientStopBtn');
    if (addStopBtn) {
      addStopBtn.addEventListener('click', async () => {
        await addGradientStop();
      });
    }
  } catch (error) {
    console.error('Ошибка в initializeGradientUI:', error);
  }
}

// Кэш для отсканированных фоновых изображений
let cachedBG = null;
let bgScanning = false;

// Выбранные папки для навигации по структуре фоновых изображений
let selectedBGFolder1 = null;
let selectedBGFolder2 = null;

// Глобальная переменная для хранения индекса пары, для которой открывается модальное окно
let currentBGModalPairIndex = null;

/**
 * Выбирает предзагруженное фоновое изображение из библиотеки
 */
export const selectPreloadedBG = async (bgFile) => {
  const state = getState();
  const activePairIndex = state.activePairIndex || 0;
  
  // Закрываем модальное окно выбора
  closeBGSelectModal();

  // Если открыта админка и выбран фон для админки
  if (window._adminBgSelectIndex !== undefined && window._adminBgSelectIndex !== null) {
    const adminIndex = window._adminBgSelectIndex;
    const backgrounds = JSON.parse(localStorage.getItem('adminBackgrounds') || '[]');
    if (backgrounds[adminIndex]) {
      backgrounds[adminIndex].bgImage = bgFile || null;
      localStorage.setItem('adminBackgrounds', JSON.stringify(backgrounds));
      // Обновляем список фонов в админке
      const adminModal = document.getElementById('sizesAdminModal');
      if (adminModal) {
        const backgroundsList = adminModal.querySelector('#adminBackgroundsList');
        if (backgroundsList) {
          // Вызываем refreshBackgroundsList через событие или напрямую
          const event = new CustomEvent('adminBackgroundsUpdated');
          adminModal.dispatchEvent(event);
        }
      }
    }
    window._adminBgSelectIndex = null;
    return;
  }

  // Если модальное окно открыто для конкретной пары, обновляем только эту пару
  if (currentBGModalPairIndex !== null) {
    await selectPairBG(currentBGModalPairIndex, bgFile || '');
    return;
  }
  
  if (!bgFile) {
    // Очищаем фоновое изображение для активной пары
    updatePairBgImage(activePairIndex, null);
    setState({ bgImage: null });
    
    // Восстанавливаем затемнение, если не в PRO режиме
    const currentState = getState();
    if (!currentState.proMode) {
      setKey('textGradientOpacity', 100);
      const domGradient = getDom();
      if (domGradient.textGradientOpacity) {
        domGradient.textGradientOpacity.value = 100;
      }
      if (domGradient.textGradientOpacityValue) {
        domGradient.textGradientOpacityValue.textContent = '100%';
      }
    }
    
    updateBgUI();
    renderer.render();
    return;
  }
  
  // Обновляем фоновое изображение для активной пары (сохраняем путь как строку)
  updatePairBgImage(activePairIndex, bgFile);
  
  // Если фон из папки pro/bg, убираем затемнение градиентом и устанавливаем размер 110%
  const isProBg = bgFile && (bgFile.includes('pro/bg') || bgFile.includes('assets/pro/bg'));
  if (isProBg) {
    setKey('textGradientOpacity', 0);
    const domGradient = getDom();
    if (domGradient.textGradientOpacity) {
      domGradient.textGradientOpacity.value = 0;
    }
    if (domGradient.textGradientOpacityValue) {
      domGradient.textGradientOpacityValue.textContent = '0%';
    }
    
    // Устанавливаем размер фона 110% для pro/bg
    setKey('bgImageSize', 110);
    const domBgSize = getDom();
    if (domBgSize.bgImageSize) {
      domBgSize.bgImageSize.value = 110;
    }
    if (domBgSize.bgImageSizeValue) {
      domBgSize.bgImageSizeValue.textContent = '110%';
    }
  } else {
    // Если фон не из pro/bg и не в PRO режиме, восстанавливаем затемнение
    const currentState = getState();
    if (!currentState.proMode) {
      setKey('textGradientOpacity', 100);
      const domGradient = getDom();
      if (domGradient.textGradientOpacity) {
        domGradient.textGradientOpacity.value = 100;
      }
      if (domGradient.textGradientOpacityValue) {
        domGradient.textGradientOpacityValue.textContent = '100%';
      }
    }
  }
  
  try {
    const img = await loadImage(bgFile);
    setState({ bgImage: img });
    updateBgUI();
    renderer.render();
  } catch (error) {
    console.error('Ошибка загрузки фонового изображения:', error, 'Путь:', bgFile);
    setState({ bgImage: null });
    updateBgUI();
    renderer.render();
  }
};

/**
 * Выбирает фоновое изображение для конкретной пары
 */
export const selectPairBG = async (pairIndex, bgFile) => {
  const state = getState();
  updatePairBgImage(pairIndex, bgFile || null);
  
  // Если это активная пара, обновляем глобальное фоновое изображение
  if (pairIndex === (state.activePairIndex || 0)) {
    if (!bgFile) {
      setState({ bgImage: null });
      updateBgUI();
    } else {
      // Если фон из папки pro/bg, убираем затемнение градиентом и устанавливаем размер 110%
      const isProBg = bgFile && (bgFile.includes('pro/bg') || bgFile.includes('assets/pro/bg'));
      if (isProBg) {
        setKey('textGradientOpacity', 0);
        const domGradient = getDom();
        if (domGradient.textGradientOpacity) {
          domGradient.textGradientOpacity.value = 0;
        }
        if (domGradient.textGradientOpacityValue) {
          domGradient.textGradientOpacityValue.textContent = '0%';
        }
        
        // Устанавливаем размер фона 110% для pro/bg
        setKey('bgImageSize', 110);
        const domBgSize = getDom();
        if (domBgSize.bgImageSize) {
          domBgSize.bgImageSize.value = 110;
        }
        if (domBgSize.bgImageSizeValue) {
          domBgSize.bgImageSizeValue.textContent = '110%';
        }
      } else {
        // Если фон не из pro/bg и не в PRO режиме, восстанавливаем затемнение
        const currentState = getState();
        if (!currentState.proMode) {
          setKey('textGradientOpacity', 100);
          const domGradient = getDom();
          if (domGradient.textGradientOpacity) {
            domGradient.textGradientOpacity.value = 100;
          }
          if (domGradient.textGradientOpacityValue) {
            domGradient.textGradientOpacityValue.textContent = '100%';
          }
        }
      }
      
      try {
        const img = await loadImage(bgFile);
        setState({ bgImage: img });
        updateBgUI();
      } catch (error) {
        console.error(error);
        setState({ bgImage: null });
        updateBgUI();
      }
    }
    renderer.render();
  }
};

/**
 * Рендерит первую колонку со списком папок первого уровня
 */
const renderBGColumn1 = (allBG) => {
  const column1 = document.getElementById('bgFolder1Column');
  if (!column1) return;
  
  column1.innerHTML = '';
  const folders1 = Object.keys(allBG).sort();
  
  // Используем DocumentFragment для батчинга DOM операций
  const fragment = document.createDocumentFragment();
  
  folders1.forEach((folder1) => {
    const item = document.createElement('div');
    item.className = 'column-item bg-folder1-item';
    item.dataset.folder1 = folder1;
    item.textContent = folder1;
    
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedBGFolder1 = folder1;
      selectedBGFolder2 = null;
      document.querySelectorAll('.bg-folder1-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      renderBGColumn2(allBG);
      renderBGColumn3([]);
    });
    
    fragment.appendChild(item);
  });
  
  // Добавляем все элементы одним батчем
  column1.appendChild(fragment);
  
  if (folders1.length > 0 && !selectedBGFolder1) {
    selectedBGFolder1 = folders1[0];
    const firstItem = column1.querySelector(`[data-folder1="${folders1[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      renderBGColumn2(allBG);
    }
  }
};

/**
 * Рендерит вторую колонку со списком папок второго уровня
 */
const renderBGColumn2 = (allBG, showLoading = false) => {
  const column2 = document.getElementById('bgFolder2Column');
  if (!column2 || !selectedBGFolder1) return;
  
  column2.innerHTML = '';
  
  // Показываем индикатор загрузки, если идет сканирование и папок еще нет
  const folders2 = Object.keys(allBG[selectedBGFolder1] || {}).sort();
  if (showLoading && folders2.length === 0 && bgScanning) {
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
    item.className = 'column-item bg-folder2-item';
    item.dataset.folder2 = folder2;
    item.textContent = folder2;
    
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedBGFolder2 = folder2;
      document.querySelectorAll('.bg-folder2-item').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      const images = allBG[selectedBGFolder1][selectedBGFolder2] || [];
      renderBGColumn3(images);
    });
    
    fragment.appendChild(item);
  });
  
  // Добавляем все элементы одним батчем
  column2.appendChild(fragment);
  
  if (folders2.length > 0 && !selectedBGFolder2) {
    selectedBGFolder2 = folders2[0];
    const firstItem = column2.querySelector(`[data-folder2="${folders2[0]}"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      const images = allBG[selectedBGFolder1][selectedBGFolder2] || [];
      renderBGColumn3(images);
    }
  }
};

/**
 * Рендерит третью колонку с изображениями фона
 */
const renderBGColumn3 = (images) => {
  const column3 = document.getElementById('bgImagesColumn');
  if (!column3) return;
  
  column3.innerHTML = '';
  
  // Показываем спиннер, если изображений нет или идет загрузка
  if (!images || images.length === 0 || bgScanning) {
    const spinnerContainer = document.createElement('div');
    spinnerContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; min-height: 200px;';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.cssText = 'width: 40px; height: 40px; border: 4px solid rgba(255, 255, 255, 0.1); border-top-color: #027EF2; border-radius: 50%; animation: spin 1s linear infinite;';
    
    const text = document.createElement('div');
    text.textContent = t('kv.loading');
    text.style.cssText = 'margin-top: 16px; color: #888; font-size: 14px;';
    
    spinnerContainer.appendChild(spinner);
    spinnerContainer.appendChild(text);
    column3.appendChild(spinnerContainer);
    
    // Добавляем CSS анимацию для спиннера, если её еще нет
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    
    return;
  }
  
  const state = getState();
  let activeBGFile = null;
  
  if (currentBGModalPairIndex !== null) {
    const pairs = state.titleSubtitlePairs || [];
    const pair = pairs[currentBGModalPairIndex];
    if (pair && pair.bgImageSelected) {
      activeBGFile = typeof pair.bgImageSelected === 'string' ? pair.bgImageSelected : pair.bgImageSelected.src;
    }
  } else {
    const bgImage = state.bgImage;
    activeBGFile = bgImage ? (typeof bgImage === 'string' ? bgImage : bgImage.src) : '';
  }
  
  // Используем DocumentFragment для батчинга DOM операций
  const fragment = document.createDocumentFragment();
  
  images.forEach((bg, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'preview-item';
    
    const isActive = activeBGFile && bg.file === activeBGFile;
    
    if (isActive) {
      imgContainer.style.border = '2px solid #027EF2';
      imgContainer.style.borderRadius = '4px';
    } else {
      imgContainer.style.border = '2px solid transparent';
      imgContainer.style.borderRadius = '4px';
    }
    
    const img = document.createElement('img');
    img.alt = bg.name;
    
    // Используем data-src для lazy loading через Intersection Observer
    // Первые 12 изображений и активное загружаем сразу для быстрого отображения
    if (index < 12 || isActive) {
      img.src = bg.file;
      img.loading = 'eager';
      // Добавляем обработчик ошибок для отладки
      img.onerror = () => {
        console.warn('Ошибка загрузки изображения:', bg.file);
        img.style.backgroundColor = '#ff0000';
        img.style.minHeight = '100px';
      };
    } else {
      // Для остальных используем data-src и загружаем при появлении в viewport
      img.dataset.src = bg.file;
      img.loading = 'lazy';
      // Показываем placeholder
      img.style.backgroundColor = '#1a1a1a';
      img.style.minHeight = '100px';
      img.style.width = '100%';
      img.style.objectFit = 'cover';
    }
    
    imgContainer.appendChild(img);
    
    imgContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      selectPreloadedBG(bg.file);
      closeBGSelectModal();
    });
    
    fragment.appendChild(imgContainer);
  });
  
  // Добавляем все элементы одним батчем
  column3.appendChild(fragment);
  
  // Запускаем lazy loading для изображений в колонке
  observeImages(column3);
};

/**
 * Строит структуру фоновых изображений из отсканированных данных
 */
const buildBGStructure = (scannedBG) => {
  const allBG = { ...AVAILABLE_BG };
  Object.keys(scannedBG).forEach(folder1 => {
    if (!allBG[folder1]) {
      allBG[folder1] = {};
    }
    Object.keys(scannedBG[folder1]).forEach(folder2 => {
      if (!allBG[folder1][folder2]) {
        allBG[folder1][folder2] = [];
      }
      scannedBG[folder1][folder2].forEach(bg => {
        if (!allBG[folder1][folder2].find(b => b.file === bg.file)) {
          allBG[folder1][folder2].push(bg);
        }
      });
    });
  });
  return allBG;
};

/**
 * Заполняет колонки фоновых изображений
 */
const populateBGColumns = async (forceRefresh = false) => {
  const column1 = document.getElementById('bgFolder1Column');
  if (!column1) return;
  
  if (bgScanning) {
    return;
  }
  
  if (forceRefresh) {
    cachedBG = null;
    selectedBGFolder1 = null;
    selectedBGFolder2 = null;
  }
  
  if (cachedBG && !forceRefresh) {
    renderBGColumn1(cachedBG);
    if (selectedBGFolder1) {
      renderBGColumn2(cachedBG);
    }
    return;
  }
  
  // Сначала показываем папки из AVAILABLE_BG (известные данные) сразу
  let initialStructure = {};
  if (AVAILABLE_BG && Object.keys(AVAILABLE_BG).length > 0) {
    initialStructure = JSON.parse(JSON.stringify(AVAILABLE_BG));
    selectedBGFolder1 = null;
    selectedBGFolder2 = null;
    renderBGColumn1(initialStructure);
    // Если есть папки первого уровня, выбираем первую и показываем вторую колонку
    const folders1 = Object.keys(initialStructure);
    if (folders1.length > 0) {
      selectedBGFolder1 = folders1[0];
      const firstItem = column1.querySelector(`[data-folder1="${folders1[0]}"]`);
      if (firstItem) {
        firstItem.classList.add('active');
        renderBGColumn2(initialStructure, true); // Показываем индикатор загрузки
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
    selectedBGFolder1 = null;
    selectedBGFolder2 = null;
    renderBGColumn1(basicStructure);
    // Выбираем первую папку и показываем индикатор загрузки
    selectedBGFolder1 = '3d';
    const firstItem = column1.querySelector(`[data-folder1="3d"]`);
    if (firstItem) {
      firstItem.classList.add('active');
      renderBGColumn2(basicStructure, true);
    }
  }
  
  // Сканируем в фоне по папкам постепенно и обновляем структуру
  bgScanning = true;
  
  // Используем scanBG для автоматического обнаружения всех папок
  const bgStructure = await scanBG();
  
  // Обновляем кэш и UI
  cachedBG = bgStructure;
  renderBGColumn1(bgStructure);
  
  // Обновляем вторую колонку, если выбрана папка первого уровня
  if (selectedBGFolder1) {
    renderBGColumn2(bgStructure, false);
  }
  
  bgScanning = false;
  
  // Сохраняем текущие выбранные папки, чтобы восстановить состояние после обновления
  const currentFolder1 = selectedBGFolder1;
  const currentFolder2 = selectedBGFolder2;
  
  // Обновляем колонки с полной структурой
  renderBGColumn1(bgStructure);
  
  // Восстанавливаем выбранные папки
  if (currentFolder1) {
    selectedBGFolder1 = currentFolder1;
    const folder1Item = column1.querySelector(`[data-folder1="${currentFolder1}"]`);
    if (folder1Item) {
      folder1Item.classList.add('active');
      renderBGColumn2(bgStructure, false);
      
      if (currentFolder2) {
        selectedBGFolder2 = currentFolder2;
        const column2 = document.getElementById('bgFolder2Column');
        if (column2) {
          const folder2Item = column2.querySelector(`[data-folder2="${currentFolder2}"]`);
          if (folder2Item) {
            folder2Item.classList.add('active');
            renderBGImages(bgStructure, currentFolder1, currentFolder2);
          }
        }
      }
    }
  }
};

/**
 * Обновляет колонки фоновых изображений (принудительное обновление)
 */
export const refreshBGColumns = async () => {
  const refreshBtn = document.querySelector('[data-function="refreshBGColumns"]');
  if (!refreshBtn) return;
  
  const originalHTML = refreshBtn.innerHTML;
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = '<span class="material-icons refresh-spinner">refresh</span> Обновление...';
  refreshBtn.offsetHeight;
  
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    cachedBG = null;
    selectedBGFolder1 = null;
    selectedBGFolder2 = null;
    await populateBGColumns(true);
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalHTML;
  }
};

/**
 * Открывает модальное окно выбора фонового изображения
 */
const openBGSelectModal = async (pairIndex = null) => {
  const overlay = document.getElementById('bgSelectModalOverlay');
  if (!overlay) return;
  
  currentBGModalPairIndex = pairIndex;
  selectedBGFolder1 = null;
  selectedBGFolder2 = null;
  
  // Показываем модальное окно сразу
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  // Заполняем колонки сразу (показываем известные данные) и загружаем остальное в фоне
  populateBGColumns().catch((error) => {
    console.error('Ошибка при заполнении колонок фоновых изображений:', error);
  });
};

/**
 * Закрывает модальное окно выбора фонового изображения
 */
const closeBGSelectModal = () => {
  const overlay = document.getElementById('bgSelectModalOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
  currentBGModalPairIndex = null;
};

/**
 * Инициализирует dropdown для выбора фонового изображения
 */
export const initializeBGDropdown = async () => {
  const trigger = document.getElementById('bgSelectTrigger');
  if (!trigger) return;
  
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);
  const updatedTrigger = document.getElementById('bgSelectTrigger');
  
  updatedTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    await openBGSelectModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('bgSelectModalOverlay');
      if (overlay && overlay.style.display === 'block') {
        closeBGSelectModal();
      }
    }
  });
  
  window.openBGSelectModal = openBGSelectModal;
  window.closeBGSelectModal = closeBGSelectModal;
  window.updateBgSize = updateBgSize;
  window.updateBgImageSize = updateBgImageSize;
};

// Экспортируем функции для использования в других модулях
export {
  openBGSelectModal,
  closeBGSelectModal
};

// Экспортируем константы для использования в других модулях
export { PRESET_BACKGROUND_COLORS };

