/**
 * Модуль для работы с фоном
 * Содержит функции выбора цвета, загрузки изображения и управления фоном
 */

import { getState, setKey, setState } from '../../state/store.js';
import { PRESET_BACKGROUND_COLORS } from '../../constants.js';
import { renderer } from '../../renderer.js';
import { getDom } from '../domCache.js';
import { autoSelectLogoByTextColor, syncFormFields } from '../ui.js';

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
  
  if (bgImage) {
    // Есть фоновое изображение
    if (dom.bgPreviewImg) {
      dom.bgPreviewImg.src = bgImage.src;
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
      const dataURL = await readFileAsDataURL(file);
      const img = await loadImage(dataURL);
      // При загрузке фонового изображения автоматически выключаем KV
      // Используем setKey для немедленного обновления состояния
      setKey('bgImage', img);
      setKey('showKV', false);
      
      // Обновляем чекбокс "Показывать KV" сразу
      const dom = getDom();
      if (dom.showKV) {
        dom.showKV.checked = false;
      }
      
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
  setState({ bgImage: null });
  updateBgUI();
  renderer.render();
};

/**
 * Обновляет цвет фона
 */
export const updateBgColor = (color) => {
  const normalizedColor = normalizeColor(color);
  setKey('bgColor', normalizedColor);
  const dom = getDom();
  if (dom.bgColor) dom.bgColor.value = normalizedColor;
  if (dom.bgColorHex) dom.bgColorHex.value = normalizedColor;
  renderer.render();
};

/**
 * Применяет предустановленный цвет фона
 */
export const applyPresetBgColor = async (color) => {
  const normalizedColor = normalizeColor(color);
  setKey('bgColor', normalizedColor);
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
  const state = getState();
  const dom = getDom();
  
  // Обновляем цвет фона
  if (dom.bgColor) {
    dom.bgColor.value = state.bgColor || '#1e1e1e';
  }
  if (dom.bgColorHex) {
    dom.bgColorHex.value = state.bgColor || '#1e1e1e';
  }
  
  // Обновляем UI фонового изображения
  updateBgUI();
  
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
};

// Экспортируем константы для использования в других модулях
export { PRESET_BACKGROUND_COLORS };

