/**
 * Модуль для работы с выбором шрифтов и начертаний
 */

import { getState, setState, setKey } from '../../state/store.js';
import { AVAILABLE_FONTS, AVAILABLE_WEIGHTS, FONT_WEIGHT_TO_NAME, FONT_NAME_TO_WEIGHT } from '../../constants.js';
import { renderer } from '../../renderer.js';
import { clearTextMeasurementCache } from '../../renderer.js';
import { getDom } from '../domCache.js';
import { withLoader } from '../../utils/loader.js';

// Функция для получения доступных начертаний для конкретной гарнитуры
export const getAvailableWeightsForFamily = (fontFamily) => {
  // Для system-ui и кастомных шрифтов показываем все начертания
  if (!fontFamily || fontFamily === 'system-ui' || fontFamily.startsWith('CustomFont_')) {
    return AVAILABLE_WEIGHTS.map(w => w.name);
  }
  
  // Получаем уникальные начертания для данной гарнитуры
  const availableWeights = new Set();
  AVAILABLE_FONTS.forEach((font) => {
    if (font.family === fontFamily && font.weightName) {
      availableWeights.add(font.weightName);
    }
  });
  
  // Если начертания не найдены, возвращаем Regular как минимум
  if (availableWeights.size === 0) {
    return ['Regular'];
  }
  
  // Сортируем начертания в правильном порядке
  const weightOrder = ['Thin', 'ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'Heavy', 'Black'];
  return Array.from(availableWeights).sort((a, b) => {
    const indexA = weightOrder.indexOf(a);
    const indexB = weightOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

// Функция для обновления селекта начертаний на основе выбранной гарнитуры
export const updateWeightDropdown = (selectElement, fontFamily, currentWeight) => {
  if (!selectElement) return;
  
  const availableWeights = getAvailableWeightsForFamily(fontFamily);
  const currentValue = currentWeight || 'Regular';
  
  // Сохраняем текущее значение, если оно доступно
  const shouldKeepCurrent = availableWeights.includes(currentValue);
  
  // Очищаем селект
  selectElement.innerHTML = '';
  
  // Маппинг названий начертаний на русские описания
  const weightLabels = {
    'Thin': 'Thin',
    'ExtraLight': 'ExtraLight',
    'Light': 'Light',
    'Regular': 'Regular',
    'Medium': 'Medium',
    'SemiBold': 'SemiBold',
    'Bold': 'Bold',
    'Heavy': 'Heavy',
    'Black': 'Black'
  };
  
  // Добавляем только доступные начертания
  availableWeights.forEach((weightName) => {
    const option = document.createElement('option');
    option.value = weightName;
    option.textContent = weightLabels[weightName] || weightName;
    if (weightName === (shouldKeepCurrent ? currentValue : 'Regular')) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
  
  // Если текущее начертание недоступно, выбираем Regular или первое доступное
  if (!shouldKeepCurrent) {
    selectElement.value = availableWeights.includes('Regular') ? 'Regular' : availableWeights[0];
  }
};

// Функция для закрытия всех дропдаунов шрифтов
export const closeAllFontDropdowns = () => {
  const dropdowns = [
    document.getElementById('titleFontFamilyDropdown'),
    document.getElementById('titleWeightDropdown'),
    document.getElementById('subtitleFontFamilyDropdown'),
    document.getElementById('subtitleWeightDropdown'),
    document.getElementById('legalFontFamilyDropdown'),
    document.getElementById('legalWeightDropdown'),
    document.getElementById('ageFontFamilyDropdown')
  ];
  dropdowns.forEach(dropdown => {
    if (dropdown) dropdown.style.display = 'none';
  });
};

// Функция для обновления кастомного дропдауна начертаний
export const updateCustomWeightDropdown = (dropdownElement, textElement, fontFamily, currentWeight, updateCallback) => {
  if (!dropdownElement || !textElement) return;
  
  const availableWeights = getAvailableWeightsForFamily(fontFamily);
  const currentValue = currentWeight || 'Regular';
  const shouldKeepCurrent = availableWeights.includes(currentValue);
  const selectedValue = shouldKeepCurrent ? currentValue : (availableWeights.includes('Regular') ? 'Regular' : availableWeights[0]);
  
  const weightLabels = {
    'Thin': 'Thin',
    'ExtraLight': 'ExtraLight',
    'Light': 'Light',
    'Regular': 'Regular',
    'Medium': 'Medium',
    'SemiBold': 'SemiBold',
    'Bold': 'Bold',
    'Heavy': 'Heavy',
    'Black': 'Black'
  };
  
  // Если в дропдауне уже есть опции (статические из HTML), обновляем их
  const existingOptions = dropdownElement.querySelectorAll('.custom-select-option');
  if (existingOptions.length > 0) {
    // Обновляем существующие опции
    existingOptions.forEach(option => {
      const value = option.dataset.value;
      if (availableWeights.includes(value)) {
        option.style.display = '';
        // Обновляем класс selected
        if (value === selectedValue) {
          option.classList.add('selected');
          textElement.textContent = option.textContent;
        } else {
          option.classList.remove('selected');
        }
        // Устанавливаем обработчик клика для каждой опции
        option.onclick = () => {
          textElement.textContent = option.textContent;
          dropdownElement.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          dropdownElement.style.display = 'none';
          closeAllFontDropdowns();
          if (updateCallback) updateCallback(value);
        };
      } else {
        // Скрываем недоступные опции
        option.style.display = 'none';
        option.classList.remove('selected');
        // Удаляем обработчик для недоступных опций
        option.onclick = null;
      }
    });
  } else {
    // Если опций нет, создаем их
    dropdownElement.innerHTML = '';
    
    availableWeights.forEach((weightName) => {
      const option = document.createElement('div');
      option.className = 'custom-select-option';
      if (weightName === selectedValue) {
        option.classList.add('selected');
        textElement.textContent = weightLabels[weightName] || weightName;
      }
      option.dataset.value = weightName;
      option.textContent = weightLabels[weightName] || weightName;
      option.onclick = () => {
        textElement.textContent = option.textContent;
        dropdownElement.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        dropdownElement.style.display = 'none';
        closeAllFontDropdowns();
        if (updateCallback) updateCallback(weightName);
      };
      dropdownElement.appendChild(option);
    });
  }
  
  // Обновляем выбранное значение в тексте кнопки
  const selectedOption = dropdownElement.querySelector(`[data-value="${selectedValue}"]`);
  if (selectedOption) {
    textElement.textContent = selectedOption.textContent;
  }
};

// Функция для обновления кастомного дропдауна шрифтов
export const updateCustomFontDropdown = (dropdownElement, textElement, currentValue, selectCallback) => {
  if (!dropdownElement || !textElement) return;
  
  // Получаем уникальные семейства шрифтов
  const fontFamilies = new Set();
  AVAILABLE_FONTS.forEach((font) => {
    fontFamilies.add(font.family);
  });
  
  // Очищаем дропдаун
  dropdownElement.innerHTML = '';
  
  // Добавляем опцию "System Default"
  const systemOption = document.createElement('div');
  systemOption.className = 'custom-select-option';
  if (currentValue === 'system-ui') {
    systemOption.classList.add('selected');
    textElement.textContent = 'System Default';
  }
  systemOption.dataset.value = 'system-ui';
  systemOption.textContent = 'System Default';
  systemOption.onclick = () => {
    textElement.textContent = 'System Default';
    dropdownElement.style.display = 'none';
    closeAllFontDropdowns();
    if (selectCallback) selectCallback('system-ui');
  };
  dropdownElement.appendChild(systemOption);
  
  // Добавляем опции для каждого семейства
  const sortedFamilies = Array.from(fontFamilies).sort();
  sortedFamilies.forEach((family) => {
    const option = document.createElement('div');
    option.className = 'custom-select-option';
    if (currentValue === family) {
      option.classList.add('selected');
      textElement.textContent = family;
    }
    option.dataset.value = family;
    option.textContent = family;
    option.onclick = () => {
      textElement.textContent = family;
      dropdownElement.style.display = 'none';
      closeAllFontDropdowns();
      if (selectCallback) selectCallback(family);
    };
    dropdownElement.appendChild(option);
  });
  
  // Если текущее значение не установлено, используем первое доступное
  if (!currentValue || (!sortedFamilies.includes(currentValue) && currentValue !== 'system-ui')) {
    const defaultFont = sortedFamilies.includes('YS Text') ? 'YS Text' : sortedFamilies[0];
    textElement.textContent = defaultFont;
    dropdownElement.querySelector(`[data-value="${defaultFont}"]`)?.classList.add('selected');
  }
};

// Функция для обновления стандартного селекта шрифтов
export const updateFontDropdown = (selectElement, currentValue) => {
  if (!selectElement) return;
  
  // Получаем уникальные семейства шрифтов
  const fontFamilies = new Set();
  AVAILABLE_FONTS.forEach((font) => {
    fontFamilies.add(font.family);
  });
  
  // Очищаем селект
  selectElement.innerHTML = '';
  
  // Добавляем опцию "System Default"
  const systemOption = document.createElement('option');
  systemOption.value = 'system-ui';
  systemOption.textContent = 'System Default';
  if (currentValue === 'system-ui') {
    systemOption.selected = true;
  }
  selectElement.appendChild(systemOption);
  
  // Добавляем опции для каждого семейства
  const sortedFamilies = Array.from(fontFamilies).sort();
  sortedFamilies.forEach((family) => {
    const option = document.createElement('option');
    option.value = family;
    option.textContent = family;
    if (currentValue === family) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
  
  // Если текущее значение не установлено, используем первое доступное
  if (!currentValue || (!sortedFamilies.includes(currentValue) && currentValue !== 'system-ui')) {
    const defaultFont = sortedFamilies.includes('YS Text') ? 'YS Text' : sortedFamilies[0];
    selectElement.value = defaultFont;
  }
};

// Функция для обновления UI информации о кастомном шрифте
export const updateCustomFontInfo = (fontType, fileName) => {
  const infoDiv = document.getElementById(`${fontType}CustomFontInfo`);
  const nameSpan = document.getElementById(`${fontType}CustomFontName`);
  
  if (infoDiv && nameSpan) {
    if (fileName) {
      infoDiv.style.display = 'block';
      nameSpan.textContent = fileName;
    } else {
      infoDiv.style.display = 'none';
      nameSpan.textContent = '';
    }
  }
};

// Функция для загрузки пользовательских шрифтов
const loadCustomFont = async (file, fontType) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        
        // Если шрифт не в формате WOFF2, показываем предупреждение
        // (конвертация в браузере требует дополнительных библиотек)
        const fileName = file.name.toLowerCase();
        const isWoff2 = fileName.endsWith('.woff2');
        
        if (!isWoff2) {
          console.warn(`Шрифт ${file.name} не в формате WOFF2. Рекомендуется конвертировать для лучшей производительности.`);
        }
        
        const blob = new Blob([arrayBuffer], { 
          type: isWoff2 ? 'font/woff2' : (file.type || 'application/octet-stream')
        });
        const url = URL.createObjectURL(blob);
        
        // Определяем формат шрифта
        let format = 'woff2';
        if (fileName.endsWith('.woff')) format = 'woff';
        else if (fileName.endsWith('.ttf')) format = 'truetype';
        else if (fileName.endsWith('.otf')) format = 'opentype';
        else if (fileName.endsWith('.woff2')) format = 'woff2';
        
        // Создаем уникальное имя для шрифта
        const fontName = `CustomFont_${fontType}_${Date.now()}`;
        
        // Создаем @font-face правило
        const style = document.createElement('style');
        style.id = `font-face-${fontType}`;
        style.textContent = `
          @font-face {
            font-family: '${fontName}';
            src: url('${url}') format('${format}');
            font-display: swap;
          }
        `;
        
        // Удаляем старое правило, если есть
        const oldStyle = document.getElementById(`font-face-${fontType}`);
        if (oldStyle) {
          oldStyle.remove();
          // Освобождаем старый URL
          const state = getState();
          const oldUrl = state[`${fontType}CustomFont`];
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
          }
        }
        
        document.head.appendChild(style);
        
        resolve({ url, fontName, fileName: file.name });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Экспортируемые функции для работы со шрифтами
export const selectFontFamily = (fontFamily) => {
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ fontFamily, fontFamilyFile: font?.file || null });
  clearTextMeasurementCache();
  renderer.render();
};

export const handleTitleFontUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    await withLoader(
      async () => {
        const { url, fontName, fileName } = await loadCustomFont(file, 'title');
        setState({
          titleCustomFont: url,
          titleCustomFontName: fileName,
          titleFontFamily: fontName
        });
        updateCustomFontInfo('title', fileName);
        clearTextMeasurementCache();
        renderer.render();
      },
      'Загрузка шрифта для заголовка...',
      true
    );
  } catch (error) {
    console.error('Ошибка загрузки шрифта:', error);
    alert('Ошибка загрузки шрифта');
  }
  
  // Сбрасываем input
  event.target.value = '';
};

export const handleSubtitleFontUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    await withLoader(
      async () => {
        const { url, fontName, fileName } = await loadCustomFont(file, 'subtitle');
        setState({
          subtitleCustomFont: url,
          subtitleCustomFontName: fileName,
          subtitleFontFamily: fontName
        });
        updateCustomFontInfo('subtitle', fileName);
        clearTextMeasurementCache();
        renderer.render();
      },
      'Загрузка шрифта для подзаголовка...',
      true
    );
  } catch (error) {
    console.error('Ошибка загрузки шрифта:', error);
    alert('Ошибка загрузки шрифта');
  }
  
  event.target.value = '';
};

export const handleLegalFontUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    await withLoader(
      async () => {
        const { url, fontName, fileName } = await loadCustomFont(file, 'legal');
        setState({
          legalCustomFont: url,
          legalCustomFontName: fileName,
          legalFontFamily: fontName
        });
        updateCustomFontInfo('legal', fileName);
        clearTextMeasurementCache();
        renderer.render();
      },
      'Загрузка шрифта для лигала...',
      true
    );
  } catch (error) {
    console.error('Ошибка загрузки шрифта:', error);
    alert('Ошибка загрузки шрифта');
  }
  
  event.target.value = '';
};

export const handleAgeFontUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    await withLoader(
      async () => {
        const { url, fontName, fileName } = await loadCustomFont(file, 'age');
        setState({
          ageCustomFont: url,
          ageCustomFontName: fileName,
          ageFontFamily: fontName
        });
        updateCustomFontInfo('age', fileName);
        clearTextMeasurementCache();
        renderer.render();
      },
      'Загрузка шрифта для возраста...',
      true
    );
  } catch (error) {
    console.error('Ошибка загрузки шрифта:', error);
    alert('Ошибка загрузки шрифта');
  }
  
  event.target.value = '';
};

export const clearTitleCustomFont = () => {
  const state = getState();
  if (state.titleCustomFont) {
    URL.revokeObjectURL(state.titleCustomFont);
  }
  const style = document.getElementById('font-face-title');
  if (style) style.remove();
  
  setState({
    titleCustomFont: null,
    titleCustomFontName: null,
    titleFontFamily: 'YS Text',
    titleFontFamilyFile: null
  });
  updateCustomFontInfo('title', null);
  clearTextMeasurementCache();
  renderer.render();
};

export const clearSubtitleCustomFont = () => {
  const state = getState();
  if (state.subtitleCustomFont) {
    URL.revokeObjectURL(state.subtitleCustomFont);
  }
  const style = document.getElementById('font-face-subtitle');
  if (style) style.remove();
  
  setState({
    subtitleCustomFont: null,
    subtitleCustomFontName: null,
    subtitleFontFamily: 'YS Text',
    subtitleFontFamilyFile: null
  });
  updateCustomFontInfo('subtitle', null);
  clearTextMeasurementCache();
  renderer.render();
};

export const clearLegalCustomFont = () => {
  const state = getState();
  if (state.legalCustomFont) {
    URL.revokeObjectURL(state.legalCustomFont);
  }
  const style = document.getElementById('font-face-legal');
  if (style) style.remove();
  
  setState({
    legalCustomFont: null,
    legalCustomFontName: null,
    legalFontFamily: 'YS Text',
    legalFontFamilyFile: null
  });
  updateCustomFontInfo('legal', null);
  clearTextMeasurementCache();
  renderer.render();
};

export const clearAgeCustomFont = () => {
  const state = getState();
  if (state.ageCustomFont) {
    URL.revokeObjectURL(state.ageCustomFont);
  }
  const style = document.getElementById('font-face-age');
  if (style) style.remove();
  
  setState({
    ageCustomFont: null,
    ageCustomFontName: null,
    ageFontFamily: 'YS Text',
    ageFontFamilyFile: null
  });
  updateCustomFontInfo('age', null);
  clearTextMeasurementCache();
  renderer.render();
};

// Функции для выбора шрифтов для разных элементов
export const selectTitleFontFamily = (fontFamily) => {
  const state = getState();
  // Если выбираем стандартный шрифт (не кастомный), очищаем кастомный
  if (!fontFamily.startsWith('CustomFont_') && state.titleCustomFont) {
    URL.revokeObjectURL(state.titleCustomFont);
    const style = document.getElementById('font-face-title');
    if (style) style.remove();
  }
  
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ 
    titleFontFamily: fontFamily, 
    titleFontFamilyFile: font?.file || null,
    titleCustomFont: fontFamily.startsWith('CustomFont_') ? state.titleCustomFont : null,
    titleCustomFontName: fontFamily.startsWith('CustomFont_') ? state.titleCustomFontName : null
  });
  if (!fontFamily.startsWith('CustomFont_')) {
    updateCustomFontInfo('title', null);
  }
  
  // Обновляем текст в кастомной кнопке
  const titleFontFamilyText = document.getElementById('titleFontFamilyText');
  if (titleFontFamilyText) {
    titleFontFamilyText.textContent = fontFamily === 'system-ui' ? 'System Default' : fontFamily;
  }
  
  // Обновляем селект начертаний для выбранной гарнитуры
  const dom = getDom();
  const titleWeightText = document.getElementById('titleWeightText');
  const titleWeightDropdown = document.getElementById('titleWeightDropdown');
  
  if (titleWeightText && titleWeightDropdown) {
    const currentWeight = typeof state.titleWeight === 'number' 
      ? FONT_WEIGHT_TO_NAME[state.titleWeight.toString()] || 'Regular' 
      : (state.titleWeight || 'Regular');
    updateCustomWeightDropdown(titleWeightDropdown, titleWeightText, fontFamily, currentWeight, (value) => {
      if (typeof window.updateState === 'function') {
        window.updateState('titleWeight', value);
      }
    });
  } else if (dom.titleWeight) {
    updateWeightDropdown(dom.titleWeight, fontFamily, state.titleWeight);
    // Обновляем состояние, если текущее начертание недоступно
    const availableWeights = getAvailableWeightsForFamily(fontFamily);
    if (!availableWeights.includes(state.titleWeight)) {
      const newWeight = availableWeights.includes('Regular') ? 'Regular' : availableWeights[0];
      setState({ titleWeight: newWeight });
    }
  }
  
  clearTextMeasurementCache();
  renderer.render();
};

export const selectSubtitleFontFamily = (fontFamily) => {
  const state = getState();
  if (!fontFamily.startsWith('CustomFont_') && state.subtitleCustomFont) {
    URL.revokeObjectURL(state.subtitleCustomFont);
    const style = document.getElementById('font-face-subtitle');
    if (style) style.remove();
  }
  
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ 
    subtitleFontFamily: fontFamily, 
    subtitleFontFamilyFile: font?.file || null,
    subtitleCustomFont: fontFamily.startsWith('CustomFont_') ? state.subtitleCustomFont : null,
    subtitleCustomFontName: fontFamily.startsWith('CustomFont_') ? state.subtitleCustomFontName : null
  });
  if (!fontFamily.startsWith('CustomFont_')) {
    updateCustomFontInfo('subtitle', null);
  }
  
  // Обновляем текст в кастомной кнопке
  const subtitleFontFamilyText = document.getElementById('subtitleFontFamilyText');
  if (subtitleFontFamilyText) {
    subtitleFontFamilyText.textContent = fontFamily === 'system-ui' ? 'System Default' : fontFamily;
  }
  
  // Обновляем селект начертаний для выбранной гарнитуры
  const dom = getDom();
  const subtitleWeightText = document.getElementById('subtitleWeightText');
  const subtitleWeightDropdown = document.getElementById('subtitleWeightDropdown');
  
  if (subtitleWeightText && subtitleWeightDropdown) {
    const currentWeight = typeof state.subtitleWeight === 'number' 
      ? FONT_WEIGHT_TO_NAME[state.subtitleWeight.toString()] || 'Regular' 
      : (state.subtitleWeight || 'Regular');
    updateCustomWeightDropdown(subtitleWeightDropdown, subtitleWeightText, fontFamily, currentWeight, (value) => {
      if (typeof window.updateState === 'function') {
        window.updateState('subtitleWeight', value);
      }
    });
  } else if (dom.subtitleWeight) {
    updateWeightDropdown(dom.subtitleWeight, fontFamily, state.subtitleWeight);
    // Обновляем состояние, если текущее начертание недоступно
    const availableWeights = getAvailableWeightsForFamily(fontFamily);
    if (!availableWeights.includes(state.subtitleWeight)) {
      const newWeight = availableWeights.includes('Regular') ? 'Regular' : availableWeights[0];
      setState({ subtitleWeight: newWeight });
    }
  }
  
  clearTextMeasurementCache();
  renderer.render();
};

export const selectLegalFontFamily = (fontFamily) => {
  const state = getState();
  if (!fontFamily.startsWith('CustomFont_') && state.legalCustomFont) {
    URL.revokeObjectURL(state.legalCustomFont);
    const style = document.getElementById('font-face-legal');
    if (style) style.remove();
  }
  
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ 
    legalFontFamily: fontFamily, 
    legalFontFamilyFile: font?.file || null,
    legalCustomFont: fontFamily.startsWith('CustomFont_') ? state.legalCustomFont : null,
    legalCustomFontName: fontFamily.startsWith('CustomFont_') ? state.legalCustomFontName : null
  });
  if (!fontFamily.startsWith('CustomFont_')) {
    updateCustomFontInfo('legal', null);
  }
  
  // Обновляем текст в кастомной кнопке
  const legalFontFamilyText = document.getElementById('legalFontFamilyText');
  if (legalFontFamilyText) {
    legalFontFamilyText.textContent = fontFamily === 'system-ui' ? 'System Default' : fontFamily;
  }
  
  // Обновляем селект начертаний для выбранной гарнитуры
  const dom = getDom();
  const legalWeightText = document.getElementById('legalWeightText');
  const legalWeightDropdown = document.getElementById('legalWeightDropdown');
  
  if (legalWeightText && legalWeightDropdown) {
    const currentWeight = typeof state.legalWeight === 'number' 
      ? FONT_WEIGHT_TO_NAME[state.legalWeight.toString()] || 'Regular' 
      : (state.legalWeight || 'Regular');
    updateCustomWeightDropdown(legalWeightDropdown, legalWeightText, fontFamily, currentWeight, (value) => {
      if (typeof window.updateState === 'function') {
        window.updateState('legalWeight', value);
      }
    });
  } else if (dom.legalWeight) {
    updateWeightDropdown(dom.legalWeight, fontFamily, state.legalWeight);
    // Обновляем состояние, если текущее начертание недоступно
    const availableWeights = getAvailableWeightsForFamily(fontFamily);
    if (!availableWeights.includes(state.legalWeight)) {
      const newWeight = availableWeights.includes('Regular') ? 'Regular' : availableWeights[0];
      setState({ legalWeight: newWeight });
    }
  }
  
  clearTextMeasurementCache();
  renderer.render();
};

export const selectAgeFontFamily = (fontFamily) => {
  const state = getState();
  if (!fontFamily.startsWith('CustomFont_') && state.ageCustomFont) {
    URL.revokeObjectURL(state.ageCustomFont);
    const style = document.getElementById('font-face-age');
    if (style) style.remove();
  }
  
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ 
    ageFontFamily: fontFamily, 
    ageFontFamilyFile: font?.file || null,
    ageCustomFont: fontFamily.startsWith('CustomFont_') ? state.ageCustomFont : null,
    ageCustomFontName: fontFamily.startsWith('CustomFont_') ? state.ageCustomFontName : null
  });
  if (!fontFamily.startsWith('CustomFont_')) {
    updateCustomFontInfo('age', null);
  }
  
  // Обновляем текст в кастомной кнопке
  const ageFontFamilyText = document.getElementById('ageFontFamilyText');
  if (ageFontFamilyText) {
    ageFontFamilyText.textContent = fontFamily === 'system-ui' ? 'System Default' : fontFamily;
  }
  
  clearTextMeasurementCache();
  renderer.render();
};

// Инициализация дропдаунов шрифтов
export const initializeFontDropdown = () => {
  const dom = getDom();
  if (!dom.fontFamily) return;
  const state = getState();
  updateFontDropdown(dom.fontFamily, state.fontFamily || 'YS Text');
};

// Инициализация всех dropdown для шрифтов в разделах
export const initializeFontDropdowns = () => {
  const dom = getDom();
  const state = getState();
  
  // Обновляем кастомный dropdown для заголовка
  const titleFontFamilyBtn = document.getElementById('titleFontFamilyBtn');
  const titleFontFamilyText = document.getElementById('titleFontFamilyText');
  const titleFontFamilyDropdown = document.getElementById('titleFontFamilyDropdown');
  const titleWeightBtn = document.getElementById('titleWeightBtn');
  const titleWeightText = document.getElementById('titleWeightText');
  const titleWeightDropdown = document.getElementById('titleWeightDropdown');
  
  if (titleFontFamilyBtn && titleFontFamilyText && titleFontFamilyDropdown) {
    const titleFontFamily = state.titleFontFamily || state.fontFamily || 'YS Text';
    updateCustomFontDropdown(titleFontFamilyDropdown, titleFontFamilyText, titleFontFamily, (value) => {
      selectTitleFontFamily(value);
    });
    
    if (!titleFontFamilyBtn.onclick) {
      titleFontFamilyBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllFontDropdowns();
        titleFontFamilyDropdown.style.display = titleFontFamilyDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }
  
  if (titleWeightBtn && titleWeightText && titleWeightDropdown) {
    const titleFontFamily = state.titleFontFamily || state.fontFamily || 'YS Text';
    const titleWeight = typeof state.titleWeight === 'number' 
      ? FONT_WEIGHT_TO_NAME[state.titleWeight.toString()] || 'Regular' 
      : (state.titleWeight || 'Regular');
    
    // Обновляем опции дропдауна
    updateCustomWeightDropdown(titleWeightDropdown, titleWeightText, titleFontFamily, titleWeight, (value) => {
      if (typeof window.updateState === 'function') {
        window.updateState('titleWeight', value);
      }
    });
    
    // Добавляем обработчики для всех опций в дропдауне (включая статические из HTML)
    const updateTitleWeightOptions = () => {
      titleWeightDropdown.querySelectorAll('.custom-select-option').forEach(option => {
        option.onclick = () => {
          titleWeightText.textContent = option.textContent;
          titleWeightDropdown.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          titleWeightDropdown.style.display = 'none';
          closeAllFontDropdowns();
          if (typeof window.updateState === 'function') {
            window.updateState('titleWeight', option.dataset.value);
          }
        };
      });
    };
    updateTitleWeightOptions();
    
    if (!titleWeightBtn.onclick) {
      titleWeightBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllFontDropdowns();
        titleWeightDropdown.style.display = titleWeightDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }
  
  // Обновляем кастомный dropdown для подзаголовка
  const subtitleFontFamilyBtn = document.getElementById('subtitleFontFamilyBtn');
  const subtitleFontFamilyText = document.getElementById('subtitleFontFamilyText');
  const subtitleFontFamilyDropdown = document.getElementById('subtitleFontFamilyDropdown');
  const subtitleWeightBtn = document.getElementById('subtitleWeightBtn');
  const subtitleWeightText = document.getElementById('subtitleWeightText');
  const subtitleWeightDropdown = document.getElementById('subtitleWeightDropdown');
  
  if (subtitleFontFamilyBtn && subtitleFontFamilyText && subtitleFontFamilyDropdown) {
    const subtitleFontFamily = state.subtitleFontFamily || state.fontFamily || 'YS Text';
    updateCustomFontDropdown(subtitleFontFamilyDropdown, subtitleFontFamilyText, subtitleFontFamily, (value) => {
      selectSubtitleFontFamily(value);
    });
    
    if (!subtitleFontFamilyBtn.onclick) {
      subtitleFontFamilyBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllFontDropdowns();
        subtitleFontFamilyDropdown.style.display = subtitleFontFamilyDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }
  
  if (subtitleWeightBtn && subtitleWeightText && subtitleWeightDropdown) {
    const subtitleFontFamily = state.subtitleFontFamily || state.fontFamily || 'YS Text';
    const subtitleWeight = typeof state.subtitleWeight === 'number' 
      ? FONT_WEIGHT_TO_NAME[state.subtitleWeight.toString()] || 'Regular' 
      : (state.subtitleWeight || 'Regular');
    
    // Обновляем опции дропдауна
    updateCustomWeightDropdown(subtitleWeightDropdown, subtitleWeightText, subtitleFontFamily, subtitleWeight, (value) => {
      if (typeof window.updateState === 'function') {
        window.updateState('subtitleWeight', value);
      }
    });
    
    // Добавляем обработчики для всех опций в дропдауне (включая статические из HTML)
    const updateSubtitleWeightOptions = () => {
      subtitleWeightDropdown.querySelectorAll('.custom-select-option').forEach(option => {
        option.onclick = () => {
          subtitleWeightText.textContent = option.textContent;
          subtitleWeightDropdown.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          subtitleWeightDropdown.style.display = 'none';
          closeAllFontDropdowns();
          if (typeof window.updateState === 'function') {
            window.updateState('subtitleWeight', option.dataset.value);
          }
        };
      });
    };
    updateSubtitleWeightOptions();
    
    if (!subtitleWeightBtn.onclick) {
      subtitleWeightBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllFontDropdowns();
        subtitleWeightDropdown.style.display = subtitleWeightDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }
  
  // Обновляем кастомный dropdown для юридического текста
  const legalFontFamilyBtn = document.getElementById('legalFontFamilyBtn');
  const legalFontFamilyText = document.getElementById('legalFontFamilyText');
  const legalFontFamilyDropdown = document.getElementById('legalFontFamilyDropdown');
  const legalWeightBtn = document.getElementById('legalWeightBtn');
  const legalWeightText = document.getElementById('legalWeightText');
  const legalWeightDropdown = document.getElementById('legalWeightDropdown');
  
  if (legalFontFamilyBtn && legalFontFamilyText && legalFontFamilyDropdown) {
    const legalFontFamily = state.legalFontFamily || state.fontFamily || 'YS Text';
    updateCustomFontDropdown(legalFontFamilyDropdown, legalFontFamilyText, legalFontFamily, (value) => {
      selectLegalFontFamily(value);
    });
    
    if (!legalFontFamilyBtn.onclick) {
      legalFontFamilyBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllFontDropdowns();
        legalFontFamilyDropdown.style.display = legalFontFamilyDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }
  
  if (legalWeightBtn && legalWeightText && legalWeightDropdown) {
    const legalFontFamily = state.legalFontFamily || state.fontFamily || 'YS Text';
    const legalWeight = typeof state.legalWeight === 'number' 
      ? FONT_WEIGHT_TO_NAME[state.legalWeight.toString()] || 'Regular' 
      : (state.legalWeight || 'Regular');
    
    // Обновляем опции дропдауна
    updateCustomWeightDropdown(legalWeightDropdown, legalWeightText, legalFontFamily, legalWeight, (value) => {
      if (typeof window.updateState === 'function') {
        window.updateState('legalWeight', value);
      }
    });
    
    // Добавляем обработчики для всех опций в дропдауне (включая статические из HTML)
    const updateLegalWeightOptions = () => {
      legalWeightDropdown.querySelectorAll('.custom-select-option').forEach(option => {
        option.onclick = () => {
          legalWeightText.textContent = option.textContent;
          legalWeightDropdown.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          legalWeightDropdown.style.display = 'none';
          closeAllFontDropdowns();
          if (typeof window.updateState === 'function') {
            window.updateState('legalWeight', option.dataset.value);
          }
        };
      });
    };
    updateLegalWeightOptions();
    
    if (!legalWeightBtn.onclick) {
      legalWeightBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllFontDropdowns();
        legalWeightDropdown.style.display = legalWeightDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }
  
  // Обновляем кастомный dropdown для возраста
  const ageFontFamilyBtn = document.getElementById('ageFontFamilyBtn');
  const ageFontFamilyText = document.getElementById('ageFontFamilyText');
  const ageFontFamilyDropdown = document.getElementById('ageFontFamilyDropdown');
  
  if (ageFontFamilyBtn && ageFontFamilyText && ageFontFamilyDropdown) {
    const ageFontFamily = state.ageFontFamily || state.fontFamily || 'YS Text';
    updateCustomFontDropdown(ageFontFamilyDropdown, ageFontFamilyText, ageFontFamily, (value) => {
      selectAgeFontFamily(value);
    });
    
    if (!ageFontFamilyBtn.onclick) {
      ageFontFamilyBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllFontDropdowns();
        ageFontFamilyDropdown.style.display = ageFontFamilyDropdown.style.display === 'none' ? 'block' : 'none';
      };
    }
  }
  
  // Обратная совместимость со старыми select элементами
  if (dom.titleFontFamily) {
    const titleFontFamily = state.titleFontFamily || state.fontFamily || 'YS Text';
    updateFontDropdown(dom.titleFontFamily, titleFontFamily);
    if (dom.titleWeight) {
      const titleWeight = typeof state.titleWeight === 'number' 
        ? FONT_WEIGHT_TO_NAME[state.titleWeight.toString()] || 'Regular' 
        : (state.titleWeight || 'Regular');
      updateWeightDropdown(dom.titleWeight, titleFontFamily, titleWeight);
    }
  }
  
  if (dom.subtitleFontFamily) {
    const subtitleFontFamily = state.subtitleFontFamily || state.fontFamily || 'YS Text';
    updateFontDropdown(dom.subtitleFontFamily, subtitleFontFamily);
    if (dom.subtitleWeight) {
      const subtitleWeight = typeof state.subtitleWeight === 'number' 
        ? FONT_WEIGHT_TO_NAME[state.subtitleWeight.toString()] || 'Regular' 
        : (state.subtitleWeight || 'Regular');
      updateWeightDropdown(dom.subtitleWeight, subtitleFontFamily, subtitleWeight);
    }
  }
  
  if (dom.legalFontFamily) {
    const legalFontFamily = state.legalFontFamily || state.fontFamily || 'YS Text';
    updateFontDropdown(dom.legalFontFamily, legalFontFamily);
    if (dom.legalWeight) {
      const legalWeight = typeof state.legalWeight === 'number' 
        ? FONT_WEIGHT_TO_NAME[state.legalWeight.toString()] || 'Regular' 
        : (state.legalWeight || 'Regular');
      updateWeightDropdown(dom.legalWeight, legalFontFamily, legalWeight);
    }
  }
  
  if (dom.ageFontFamily) {
    const ageFontFamily = state.ageFontFamily || state.fontFamily || 'YS Text';
    updateFontDropdown(dom.ageFontFamily, ageFontFamily);
    if (dom.ageWeight) {
      const ageWeight = typeof state.ageWeight === 'number' 
        ? FONT_WEIGHT_TO_NAME[state.ageWeight.toString()] || 'Regular' 
        : (state.ageWeight || 'Regular');
      updateWeightDropdown(dom.ageWeight, ageFontFamily, ageWeight);
    }
  }
};
