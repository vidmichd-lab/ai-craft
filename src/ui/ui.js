import {
  getState,
  setKey,
  setState,
  batch,
  subscribe,
  saveSettingsSnapshot,
  applySavedSettings,
  resetState,
  togglePresetSize,
  selectAllPresetSizes,
  deselectAllPresetSizes,
  getCheckedSizes,
  ensurePresetSelection,
  addTitleSubtitlePair,
  removeTitleSubtitlePair,
  setActivePairIndex,
  updatePairTitle,
  updatePairSubtitle,
  updatePairKV
} from '../state/store.js';
import { AVAILABLE_LOGOS, AVAILABLE_FONTS, AVAILABLE_KV } from '../constants.js';
import { scanLogos, scanKV } from '../utils/assetScanner.js';
import { renderer, clearTextMeasurementCache } from '../renderer.js';
import { getDom } from './domCache.js';
let savedSettings = null;

const updateChipGroup = (group, value) => {
  document.querySelectorAll(`[data-group="${group}"]`).forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.value === value);
  });
};

const syncChips = (state) => {
  updateChipGroup('title-align', state.titleAlign);
  updateChipGroup('title-vpos', state.titleVPos);
  updateChipGroup('logo-pos', state.logoPos);
};

export const syncFormFields = () => {
  const state = getState();
  const dom = getDom();

  if (!dom.paddingPercent) return;

  dom.paddingPercent.value = state.paddingPercent;
  dom.paddingValue.textContent = `${state.paddingPercent}%`;
  
  // Синхронизируем активную пару
  if (state.titleSubtitlePairs && state.titleSubtitlePairs.length > 0) {
    const activePair = state.titleSubtitlePairs[state.activePairIndex || 0];
    if (activePair) {
      if (dom.title) dom.title.value = activePair.title || '';
      if (dom.subtitle) dom.subtitle.value = activePair.subtitle || '';
    }
  } else {
    if (dom.title) dom.title.value = state.title || '';
    if (dom.subtitle) dom.subtitle.value = state.subtitle || '';
  }
  dom.titleColor.value = state.titleColor;
  if (dom.titleColorHex) dom.titleColorHex.value = state.titleColor;
  dom.titleSize.value = state.titleSize;
  dom.titleWeight.value = state.titleWeight;
  if (dom.titleFontFamily) dom.titleFontFamily.value = state.titleFontFamily || state.fontFamily || 'YS Text';
  dom.titleLetterSpacing.value = state.titleLetterSpacing;
  dom.titleLineHeight.value = state.titleLineHeight;

  dom.subtitle.value = state.subtitle;
  dom.subtitleColor.value = state.subtitleColor;
  if (dom.subtitleColorHex) dom.subtitleColorHex.value = state.subtitleColor;
  dom.subtitleOpacity.value = state.subtitleOpacity || 90;
  if (dom.subtitleOpacityValue) dom.subtitleOpacityValue.textContent = `${state.subtitleOpacity || 90}%`;
  dom.subtitleSize.value = state.subtitleSize;
  dom.subtitleWeight.value = state.subtitleWeight;
  if (dom.subtitleFontFamily) dom.subtitleFontFamily.value = state.subtitleFontFamily || state.fontFamily || 'YS Text';
  dom.subtitleLetterSpacing.value = state.subtitleLetterSpacing;
  dom.subtitleLineHeight.value = state.subtitleLineHeight;
  dom.subtitleGap.value = state.subtitleGap;

  dom.legal.value = state.legal;
  dom.legalColor.value = state.legalColor;
  if (dom.legalColorHex) dom.legalColorHex.value = state.legalColor;
  dom.legalOpacity.value = state.legalOpacity;
  dom.legalOpacityValue.textContent = `${state.legalOpacity}%`;
  dom.legalSize.value = state.legalSize;
  dom.legalWeight.value = state.legalWeight;
  if (dom.legalFontFamily) dom.legalFontFamily.value = state.legalFontFamily || state.fontFamily || 'YS Text';
  dom.legalLetterSpacing.value = state.legalLetterSpacing;
  dom.legalLineHeight.value = state.legalLineHeight;

  dom.age.value = state.age;
  dom.ageSize.value = state.ageSize;
  if (dom.ageFontFamily) dom.ageFontFamily.value = state.ageFontFamily || state.fontFamily || 'YS Text';
  dom.ageGapPercent.value = state.ageGapPercent;

  dom.showSubtitle.checked = state.showSubtitle;
  if (dom.hideSubtitleOnWide) dom.hideSubtitleOnWide.checked = state.hideSubtitleOnWide;
  dom.showLegal.checked = state.showLegal;
  dom.showAge.checked = state.showAge;
  dom.showKV.checked = state.showKV;
  dom.showBlocks.checked = state.showBlocks || false;
  dom.showGuides.checked = !!state.showGuides;

  if (dom.logoSelect) dom.logoSelect.value = state.logoSelected || '';
  updateLogoTriggerText(state.logoSelected || '');
  dom.logoSize.value = state.logoSize;
  dom.logoSizeValue.textContent = `${state.logoSize}%`;

  if (dom.kvSelect) {
    dom.kvSelect.value = state.kvSelected || '';
    updateKVTriggerText(state.kvSelected || '');
  }
  if (dom.kvBorderRadius) {
    dom.kvBorderRadius.value = state.kvBorderRadius || 0;
  }
  if (dom.kvBorderRadiusValue) {
    dom.kvBorderRadiusValue.textContent = `${state.kvBorderRadius || 0}%`;
  }

  dom.bgColor.value = state.bgColor;
  if (dom.bgColorHex) dom.bgColorHex.value = state.bgColor;

  dom.namePrefix.value = state.namePrefix;

  const fontSelect = dom.fontFamily;
  if (fontSelect) {
    fontSelect.value = state.fontFamily;
  }

  syncChips(state);
  updateChipGroup('layout-mode', state.layoutMode || 'auto');
};

export const updatePreviewSizeSelect = () => {
  const dom = getDom();
  const categorized = renderer.getCategorizedSizes();
  let needsRender = false;

  // Обновляем дроплист для узких форматов
  if (dom.previewSizeSelectNarrow) {
    if (!categorized.narrow.length) {
      dom.previewSizeSelectNarrow.innerHTML = '<option value="-1">Нет узких форматов</option>';
    } else {
      const options = categorized.narrow
        .map((size, index) => `<option value="${index}">${size.width} × ${size.height} (${size.platform})</option>`)
        .join('');
      dom.previewSizeSelectNarrow.innerHTML = options;
      // Выбираем первый по умолчанию
      dom.previewSizeSelectNarrow.value = '0';
      renderer.setCategoryIndex('narrow', 0, false); // не вызывать render
      needsRender = true;
    }
  }

  // Обновляем дроплист для широких форматов
  if (dom.previewSizeSelectWide) {
    if (!categorized.wide.length) {
      dom.previewSizeSelectWide.innerHTML = '<option value="-1">Нет широких форматов</option>';
    } else {
      // Ищем 1600x1200 в широких форматах
      const defaultIndex = categorized.wide.findIndex(size => size.width === 1600 && size.height === 1200);
      const selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;
      
      const options = categorized.wide
        .map((size, index) => `<option value="${index}" ${index === selectedIndex ? 'selected' : ''}>${size.width} × ${size.height} (${size.platform})</option>`)
        .join('');
      dom.previewSizeSelectWide.innerHTML = options;
      renderer.setCategoryIndex('wide', selectedIndex, false); // не вызывать render
      needsRender = true;
    }
  }

  // Обновляем дроплист для квадратных форматов
  if (dom.previewSizeSelectSquare) {
    if (!categorized.square.length) {
      dom.previewSizeSelectSquare.innerHTML = '<option value="-1">Нет квадратных форматов</option>';
    } else {
      const options = categorized.square
        .map((size, index) => `<option value="${index}">${size.width} × ${size.height} (${size.platform})</option>`)
        .join('');
      dom.previewSizeSelectSquare.innerHTML = options;
      // Выбираем первый по умолчанию
      dom.previewSizeSelectSquare.value = '0';
      renderer.setCategoryIndex('square', 0, false); // не вызывать render
      needsRender = true;
    }
  }

  // Вызываем render один раз после всех обновлений
  if (needsRender) {
    renderer.render();
  }

  // Обратная совместимость со старым дроплистом
  if (dom.previewSizeSelect) {
    const sortedSizes = renderer.getSortedSizes();
    if (!sortedSizes.length) {
      dom.previewSizeSelect.innerHTML = '<option value="-1">No sizes selected</option>';
      return;
    }

    const defaultIndex = sortedSizes.findIndex(size => size.width === 1600 && size.height === 1200);
    const currentIndex = renderer.getCurrentIndex();
    
    let selectedIndex;
    if (currentIndex < 0 || currentIndex >= sortedSizes.length) {
      selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;
    } else if (currentIndex === 0 && defaultIndex >= 0 && defaultIndex !== 0) {
      selectedIndex = defaultIndex;
    } else {
      selectedIndex = currentIndex;
    }

    if (selectedIndex !== currentIndex) {
      renderer.setCurrentIndex(selectedIndex);
    }

    const options = sortedSizes
      .map((size, index) => `<option value="${index}" ${index === selectedIndex ? 'selected' : ''}>${size.width} × ${size.height} (${size.platform})</option>`)
      .join('');

    dom.previewSizeSelect.innerHTML = options;
  }
};

const updateLogoUI = () => {
  const dom = getDom();
  if (!dom.logoPreview || !dom.logoActions || !dom.logoThumb) return;

  const { logo } = getState();
  if (logo) {
    dom.logoPreview.style.display = 'block';
    dom.logoActions.style.display = 'block';
    dom.logoThumb.src = logo.src;
  } else {
    dom.logoPreview.style.display = 'none';
    dom.logoActions.style.display = 'none';
    dom.logoThumb.removeAttribute('src');
  }
};

const updateKVUI = () => {
  const dom = getDom();
  const { kv } = getState();
  if (!dom.kvPreview || !dom.kvActions || !dom.kvThumb) return;

  if (kv) {
    dom.kvPreview.style.display = 'block';
    dom.kvActions.style.display = 'block';
    dom.kvThumb.src = kv.src;
  } else {
    dom.kvPreview.style.display = 'none';
    dom.kvActions.style.display = 'none';
    dom.kvThumb.removeAttribute('src');
  }
};

const updateBgUI = () => {
  const dom = getDom();
  const { bgImage } = getState();
  if (!dom.bgPreview || !dom.bgActions || !dom.bgThumb) return;

  if (bgImage) {
    dom.bgPreview.style.display = 'block';
    dom.bgActions.style.display = 'block';
    dom.bgThumb.style.backgroundImage = `url(${bgImage.src})`;
  } else {
    dom.bgPreview.style.display = 'none';
    dom.bgActions.style.display = 'none';
    dom.bgThumb.style.backgroundImage = 'none';
  }
};

export const refreshMediaPreviews = () => {
  updateLogoUI();
  updateKVUI();
  updateBgUI();
};

export const updateSizesSummary = () => {
  const dom = getDom();
  const sizes = getCheckedSizes();
  dom.sizesSummary.textContent = `Выбрано: ${sizes.length} размеров`;
};

export const renderPresetSizes = () => {
  const dom = getDom();
  const state = getState();
  let html = '';

  Object.keys(state.presetSizes).forEach((platform) => {
    html += `
      <div class="platform-group">
        <div class="platform-header" data-platform="${platform}">
          <span>${platform}</span>
          <span class="platform-arrow collapsed" id="arrow-${platform}">▶</span>
        </div>
        <div class="platform-sizes collapsed" id="sizes-${platform}">
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
};

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

const loadImageFile = async (file, target) => {
  try {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    setKey(target, img);
    if (target === 'logo') updateLogoUI();
    if (target === 'kv') updateKVUI();
    if (target === 'bgImage') updateBgUI();
    renderer.render();
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить изображение.');
  }
};

export const handleLogoUpload = (event) => {
  const file = event.target.files[0];
  if (file) loadImageFile(file, 'logo');
};

export const handleKVUpload = (event) => {
  const file = event.target.files[0];
  if (file) loadImageFile(file, 'kv');
};

export const handleBgUpload = (event) => {
  const file = event.target.files[0];
  if (file) loadImageFile(file, 'bgImage');
};

export const handlePairKVUpload = async (pairIndex, file) => {
  try {
    const dataURL = await readFileAsDataURL(file);
    const img = await loadImage(dataURL);
    
    // Обновляем KV для пары
    const state = getState();
    const pairs = state.titleSubtitlePairs || [];
    const pair = pairs[pairIndex];
    
    if (pair) {
      // Сохраняем путь к файлу (используем data URL как идентификатор)
      updatePairKV(pairIndex, dataURL);
      
      // Если это активная пара, обновляем глобальный KV
      if (pairIndex === (state.activePairIndex || 0)) {
        setState({ kv: img, kvSelected: dataURL });
        renderer.render();
      }
      
      // Обновляем UI
      renderKVPairs();
    }
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить изображение.');
  }
};

export const clearLogo = () => {
  setState({ logo: null, logoSelected: '' });
  const dom = getDom();
  if (dom.logoSelect) dom.logoSelect.value = '';
  updateLogoTriggerText('');
  updateLogoUI();
  renderer.render();
};

export const clearKV = () => {
  setState({ kv: null, kvSelected: '', showKV: false });
  const dom = getDom();
  dom.showKV.checked = false;
  updateKVTriggerText('');
  updateKVUI();
  renderer.render();
};

export const clearBg = () => {
  setState({ bgImage: null });
  updateBgUI();
  renderer.render();
};

export const selectPreloadedLogo = async (logoFile) => {
  const dom = getDom();
  setState({ logoSelected: logoFile || '' });
  updateLogoTriggerText(logoFile || '');

  if (!logoFile) {
    setState({ logo: null });
    updateLogoUI();
    renderer.render();
    return;
  }

  // Сначала проверяем в AVAILABLE_LOGOS
  let logoInfo = AVAILABLE_LOGOS.find((logo) => logo.file === logoFile);
  
  // Если не нашли, сканируем динамически найденные логотипы
  if (!logoInfo) {
    const availableLogos = await scanLogos();
    logoInfo = availableLogos.find((logo) => logo.file === logoFile);
  }
  
  // Если все еще не нашли, пробуем загрузить напрямую по пути
  if (!logoInfo) {
    logoInfo = { file: logoFile, name: logoFile.split('/').pop() };
  }

  try {
    const img = await loadImage(logoInfo.file);
    setState({ logo: img });
    if (dom.logoSelect) dom.logoSelect.value = logoFile;
    updateLogoUI();
    renderer.render();
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить логотип.');
    setState({ logo: null });
    updateLogoUI();
    renderer.render();
  }
};

export const selectFontFamily = (fontFamily) => {
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ fontFamily, fontFamilyFile: font?.file || null });
  clearTextMeasurementCache();
  renderer.render();
};

export const selectTitleFontFamily = (fontFamily) => {
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ 
    titleFontFamily: fontFamily, 
    titleFontFamilyFile: font?.file || null 
  });
  clearTextMeasurementCache();
  renderer.render();
};

export const selectSubtitleFontFamily = (fontFamily) => {
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ 
    subtitleFontFamily: fontFamily, 
    subtitleFontFamilyFile: font?.file || null 
  });
  clearTextMeasurementCache();
  renderer.render();
};

export const selectLegalFontFamily = (fontFamily) => {
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ 
    legalFontFamily: fontFamily, 
    legalFontFamilyFile: font?.file || null 
  });
  clearTextMeasurementCache();
  renderer.render();
};

export const selectAgeFontFamily = (fontFamily) => {
  const font = AVAILABLE_FONTS.find((item) => item.family === fontFamily);
  setState({ 
    ageFontFamily: fontFamily, 
    ageFontFamilyFile: font?.file || null 
  });
  clearTextMeasurementCache();
  renderer.render();
};

export const selectTitleAlign = (align) => {
  setKey('titleAlign', align);
  updateChipGroup('title-align', align);
  renderer.render();
};

export const selectTitleVPos = (vPos) => {
  setKey('titleVPos', vPos);
  updateChipGroup('title-vpos', vPos);
  renderer.render();
};

export const selectLogoPos = (pos) => {
  setKey('logoPos', pos);
  updateChipGroup('logo-pos', pos);
  renderer.render();
};

export const selectLayoutMode = (mode) => {
  setKey('layoutMode', mode);
  updateChipGroup('layout-mode', mode);
  updateLayoutPreviewMock();
  renderer.render();
};

export const updatePadding = (value) => {
  const numeric = parseInt(value, 10);
  setKey('paddingPercent', numeric);
  const dom = getDom();
  dom.paddingValue.textContent = `${numeric}%`;
  renderer.render();
};

export const updateLogoSize = (value) => {
  const numeric = parseInt(value, 10);
  setKey('logoSize', numeric);
  const dom = getDom();
  dom.logoSizeValue.textContent = `${numeric}%`;
  renderer.render();
};

export const updateKVBorderRadius = (value) => {
  const numeric = parseInt(value, 10);
  setKey('kvBorderRadius', numeric);
  const dom = getDom();
  if (dom.kvBorderRadiusValue) {
    dom.kvBorderRadiusValue.textContent = `${numeric}%`;
  }
  renderer.render();
};

export const updateLegalOpacity = (value) => {
  const numeric = parseInt(value, 10);
  setKey('legalOpacity', numeric);
  const dom = getDom();
  dom.legalOpacityValue.textContent = `${numeric}%`;
  renderer.render();
};

export const updateSubtitleOpacity = (value) => {
  const numeric = parseInt(value, 10);
  setKey('subtitleOpacity', numeric);
  const dom = getDom();
  dom.subtitleOpacityValue.textContent = `${numeric}%`;
  renderer.render();
};

export const toggleSection = (sectionId) => {
  const contentEl = document.getElementById(`content-${sectionId}`);
  const arrowEl = document.getElementById(`arrow-${sectionId}`);
  if (contentEl && arrowEl) {
    contentEl.classList.toggle('collapsed');
    arrowEl.classList.toggle('collapsed');
  }
};

export const updateColorFromPicker = (key, value) => {
  setKey(key, value);
  const dom = getDom();
  const hexInput = dom[`${key}Hex`];
  if (hexInput) hexInput.value = value;
  renderer.render();
};

export const updateColorFromHex = (key, value) => {
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const dom = getDom();
  if (hexPattern.test(value)) {
    setKey(key, value);
    const colorInput = dom[key];
    if (colorInput) colorInput.value = value;
    renderer.render();
  } else {
    const hexInput = dom[`${key}Hex`];
    if (hexInput) {
      hexInput.style.borderColor = '#ff4444';
      setTimeout(() => {
        hexInput.style.borderColor = '';
        hexInput.value = getState()[key];
      }, 1000);
    }
  }
};

export const changePreviewSize = (index) => {
  renderer.setCurrentIndex(Number(index) || 0);
};

export const changePreviewSizeCategory = (category, index) => {
  renderer.setCategoryIndex(category, Number(index) || 0);
};

export const togglePlatform = (platform) => {
  const sizesEl = document.getElementById(`sizes-${platform}`);
  const arrowEl = document.getElementById(`arrow-${platform}`);
  if (sizesEl) {
    sizesEl.classList.toggle('collapsed');
    const isCollapsed = sizesEl.classList.contains('collapsed');
    if (arrowEl) {
      arrowEl.classList.toggle('collapsed');
      arrowEl.textContent = isCollapsed ? '▶' : '▼';
    }
  }
};

export const toggleSize = (platform, index) => {
  togglePresetSize(platform, index);
  updatePreviewSizeSelect();
  updateSizesSummary();
  renderer.render();
};

export const handlePresetContainerClick = (event) => {
  const header = event.target.closest('.platform-header');
  if (header) {
    const platform = header.dataset.platform;
    togglePlatform(platform);
    return;
  }

  const checkbox = event.target.closest('input[type="checkbox"]');
  if (checkbox && checkbox.dataset.platform) {
    toggleSize(checkbox.dataset.platform, Number(checkbox.dataset.index));
  }
};

export const selectAllSizesAction = () => {
  selectAllPresetSizes();
  renderPresetSizes();
  updatePreviewSizeSelect();
  renderer.render();
};

export const deselectAllSizesAction = () => {
  deselectAllPresetSizes();
  renderPresetSizes();
  updatePreviewSizeSelect();
  renderer.render();
};

export const saveSettings = () => {
  savedSettings = saveSettingsSnapshot();
  alert('Настройки сохранены (изображения исключены, выбор пресетов сохранён)');
};

export const loadSettings = () => {
  if (!savedSettings) {
    alert('Нет сохранённых настроек.');
    return;
  }

  const current = getState();
  const currentLogo = current.logo;
  const currentKV = current.kv;
  const currentBg = current.bgImage;

  applySavedSettings(savedSettings);
  ensurePresetSelection();
  setState({ logo: currentLogo, kv: currentKV, bgImage: currentBg });

  syncFormFields();
  renderPresetSizes();
  updatePreviewSizeSelect();
  updateLogoUI();
  updateKVUI();
  updateBgUI();
  renderer.render();

  alert('Настройки загружены!');
};

export const resetAll = () => {
  if (!confirm('Сбросить все настройки к значениям по умолчанию?')) return;
  resetState();
  ensurePresetSelection();
  initializeLogoDropdown();
  initializeFontDropdown();
  syncFormFields();
  renderPresetSizes();
  updatePreviewSizeSelect();
  updateLogoUI();
  updateKVUI();
  updateBgUI();
  renderer.render();
};

// Кэш для отсканированных логотипов
let cachedLogos = null;
let logosScanning = false;

const populateLogoDropdown = async () => {
  const dropdown = document.getElementById('logoSelectDropdown');
  if (!dropdown) return;
  
  // Если уже сканируем, ждем
  if (logosScanning) {
    return;
  }
  
  // Если уже заполнен, не заполняем повторно
  if (dropdown.children.length > 1) {
    return;
  }
  
  // Если есть кэш, используем его
  if (cachedLogos) {
    cachedLogos.forEach((logo) => {
      const option = document.createElement('div');
      option.className = 'custom-select-option';
      option.dataset.value = logo.file;
      option.innerHTML = `
        <img src="${logo.file}" class="custom-select-option-preview" alt="${logo.name}">
        <span class="custom-select-option-label">${logo.name}</span>
      `;
      option.addEventListener('click', () => {
        selectPreloadedLogo(logo.file);
        closeDropdown('logo');
      });
      dropdown.appendChild(option);
    });
    return;
  }
  
  // Сканируем в фоне
  logosScanning = true;
  const availableLogos = await scanLogos();
  const allLogos = [...AVAILABLE_LOGOS];
  availableLogos.forEach(logo => {
    if (!allLogos.find(l => l.file === logo.file)) {
      allLogos.push(logo);
    }
  });
  cachedLogos = allLogos;
  logosScanning = false;
  
  // Заполняем dropdown
  allLogos.forEach((logo) => {
    const option = document.createElement('div');
    option.className = 'custom-select-option';
    option.dataset.value = logo.file;
    option.innerHTML = `
      <img src="${logo.file}" class="custom-select-option-preview" alt="${logo.name}">
      <span class="custom-select-option-label">${logo.name}</span>
    `;
    option.addEventListener('click', () => {
      selectPreloadedLogo(logo.file);
      closeDropdown('logo');
    });
    dropdown.appendChild(option);
  });
};

export const initializeLogoDropdown = async () => {
  const dom = getDom();
  if (!dom.logoSelect) return;
  
  const trigger = document.getElementById('logoSelectTrigger');
  const dropdown = document.getElementById('logoSelectDropdown');
  const textSpan = document.getElementById('logoSelectText');
  
  if (!trigger || !dropdown || !textSpan) return;
  
  // Очищаем dropdown
  dropdown.innerHTML = '';
  
  // Создаем опцию "Нет"
  const noneOption = document.createElement('div');
  noneOption.className = 'custom-select-option';
  noneOption.dataset.value = '';
  noneOption.innerHTML = '<span class="custom-select-option-label">— Нет —</span>';
  noneOption.addEventListener('click', () => {
    selectPreloadedLogo('');
    closeDropdown('logo');
  });
  dropdown.appendChild(noneOption);
  
  // Удаляем старые обработчики через клонирование trigger
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);
  const updatedTrigger = document.getElementById('logoSelectTrigger');
  
  // Обработчик открытия/закрытия dropdown
  updatedTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    if (!isOpen) {
      // При открытии заполняем dropdown лениво
      await populateLogoDropdown();
    }
    toggleDropdown('logo');
  });
  
  // Закрытие при клике вне dropdown (используем делегирование)
  if (!window.logoDropdownCloseHandler) {
    window.logoDropdownCloseHandler = (e) => {
      const triggerEl = document.getElementById('logoSelectTrigger');
      const dropdownEl = document.getElementById('logoSelectDropdown');
      if (triggerEl && dropdownEl && !triggerEl.contains(e.target) && !dropdownEl.contains(e.target)) {
        closeDropdown('logo');
      }
    };
    document.addEventListener('click', window.logoDropdownCloseHandler);
  }
  
  // Обновляем текст триггера
  const state = getState();
  updateLogoTriggerText(state.logoSelected || '');
};

const toggleDropdown = (type) => {
  const dropdown = document.getElementById(`${type}SelectDropdown`);
  if (!dropdown) {
    console.warn(`Dropdown ${type}SelectDropdown not found`);
    return;
  }
  
  const computedStyle = window.getComputedStyle(dropdown);
  const isOpen = computedStyle.display !== 'none';
  
  if (isOpen) {
    dropdown.style.display = 'none';
  } else {
    // Закрываем другие dropdown
    document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
      if (dd !== dropdown) dd.style.display = 'none';
    });
    dropdown.style.display = 'block';
  }
};

const closeDropdown = (type) => {
  const dropdown = document.getElementById(`${type}SelectDropdown`);
  if (dropdown) dropdown.style.display = 'none';
};

const updateLogoTriggerText = async (value) => {
  const textSpan = document.getElementById('logoSelectText');
  if (!textSpan) return;
  
  if (!value) {
    textSpan.textContent = '— Нет —';
    return;
  }
  
  // Сначала проверяем в AVAILABLE_LOGOS
  let logo = AVAILABLE_LOGOS.find(l => l.file === value);
  
  // Если не нашли, сканируем динамически найденные логотипы
  if (!logo) {
    const availableLogos = await scanLogos();
    logo = availableLogos.find(l => l.file === value);
  }
  
  if (logo) {
    textSpan.textContent = logo.name;
  } else {
    // Если не нашли, показываем имя файла
    textSpan.textContent = value.split('/').pop().replace(/\.(svg|png)$/, '');
  }
  
  // Обновляем selected класс
  const dropdown = document.getElementById('logoSelectDropdown');
  if (dropdown) {
    dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === value);
    });
  }
};

export const initializeFontDropdown = () => {
  const dom = getDom();
  if (!dom.fontFamily) return;
  dom.fontFamily.innerHTML = '';
  AVAILABLE_FONTS.forEach((font) => {
    const option = document.createElement('option');
    option.value = font.family;
    option.textContent = font.name;
    option.dataset.file = font.file || '';
    dom.fontFamily.appendChild(option);
  });
  dom.fontFamily.value = getState().fontFamily;
};

// Кэш для отсканированных KV
let cachedKV = null;
let kvScanning = false;

const populateKVDropdown = async () => {
  const dropdown = document.getElementById('kvSelectDropdown');
  if (!dropdown) return;
  
  // Если уже сканируем, ждем
  if (kvScanning) {
    return;
  }
  
  // Если уже заполнен (больше чем опция "Нет"), не заполняем повторно
  if (dropdown.children.length > 1) {
    return;
  }
  
  // Если есть кэш, используем его
  if (cachedKV) {
    Object.keys(cachedKV).sort().forEach((folder1) => {
      Object.keys(cachedKV[folder1]).sort().forEach((folder2) => {
        const groupLabel = document.createElement('div');
        groupLabel.className = 'custom-select-option-group';
        groupLabel.textContent = folder2 === 'root' ? folder1 : `${folder1}/${folder2}`;
        dropdown.appendChild(groupLabel);
        
        cachedKV[folder1][folder2].forEach((kv) => {
          const option = document.createElement('div');
          option.className = 'custom-select-option';
          option.dataset.value = kv.file;
          option.innerHTML = `
            <img src="${kv.file}" class="custom-select-option-preview" alt="${kv.name}">
            <span class="custom-select-option-label">${kv.name}</span>
          `;
          option.addEventListener('click', () => {
            selectPreloadedKV(kv.file);
            closeDropdown('kv');
          });
          dropdown.appendChild(option);
        });
      });
    });
    return;
  }
  
  // Сканируем в фоне
  kvScanning = true;
  const scannedKV = await scanKV();
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
  cachedKV = allKV;
  kvScanning = false;
  
  // Заполняем dropdown
  Object.keys(allKV).sort().forEach((folder1) => {
    Object.keys(allKV[folder1]).sort().forEach((folder2) => {
      const groupLabel = document.createElement('div');
      groupLabel.className = 'custom-select-option-group';
      groupLabel.textContent = folder2 === 'root' ? folder1 : `${folder1}/${folder2}`;
      dropdown.appendChild(groupLabel);
      
      allKV[folder1][folder2].forEach((kv) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = kv.file;
        option.innerHTML = `
          <img src="${kv.file}" class="custom-select-option-preview" alt="${kv.name}">
          <span class="custom-select-option-label">${kv.name}</span>
        `;
        option.addEventListener('click', () => {
          selectPreloadedKV(kv.file);
          closeDropdown('kv');
        });
        dropdown.appendChild(option);
      });
    });
  });
};

export const initializeKVDropdown = async () => {
  const dom = getDom();
  if (!dom.kvSelect) return;
  
  const trigger = document.getElementById('kvSelectTrigger');
  const dropdown = document.getElementById('kvSelectDropdown');
  const textSpan = document.getElementById('kvSelectText');
  
  if (!trigger || !dropdown || !textSpan) return;
  
  // Очищаем dropdown
  dropdown.innerHTML = '';
  
  // Создаем опцию "Нет"
  const noneOption = document.createElement('div');
  noneOption.className = 'custom-select-option';
  noneOption.dataset.value = '';
  noneOption.innerHTML = '<span class="custom-select-option-label">— Нет —</span>';
  noneOption.addEventListener('click', () => {
    selectPreloadedKV('');
    closeDropdown('kv');
  });
  dropdown.appendChild(noneOption);
  
  // Удаляем старые обработчики через клонирование trigger
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);
  const updatedTrigger = document.getElementById('kvSelectTrigger');
  
  // Обработчик открытия/закрытия dropdown
  updatedTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display === 'block';
    if (!isOpen) {
      // При открытии заполняем dropdown лениво
      await populateKVDropdown();
    }
    toggleDropdown('kv');
  });
  
  // Закрытие при клике вне dropdown (используем делегирование)
  if (!window.kvDropdownCloseHandler) {
    window.kvDropdownCloseHandler = (e) => {
      const triggerEl = document.getElementById('kvSelectTrigger');
      const dropdownEl = document.getElementById('kvSelectDropdown');
      if (triggerEl && dropdownEl && !triggerEl.contains(e.target) && !dropdownEl.contains(e.target)) {
        closeDropdown('kv');
      }
    };
    document.addEventListener('click', window.kvDropdownCloseHandler);
  }
  
  // Обновляем текст триггера
  const state = getState();
  updateKVTriggerText(state.kvSelected || '');
};

const updateKVTriggerText = (value) => {
  const textSpan = document.getElementById('kvSelectText');
  if (!textSpan) return;
  
  if (!value) {
    textSpan.textContent = '— Нет —';
    return;
  }
  
  // Находим KV по файлу (проверяем в dropdown)
  let kvName = '';
  const kvDropdown = document.getElementById('kvSelectDropdown');
  if (kvDropdown) {
    const option = kvDropdown.querySelector(`[data-value="${value}"]`);
    if (option) {
      const label = option.querySelector('.custom-select-option-label');
      if (label) kvName = label.textContent;
    }
  }
  
  // Если не нашли в dropdown, ищем в константах (для обратной совместимости)
  if (!kvName) {
    Object.keys(AVAILABLE_KV).forEach((folder1) => {
      Object.keys(AVAILABLE_KV[folder1] || {}).forEach((folder2) => {
        const kv = AVAILABLE_KV[folder1][folder2].find(k => k.file === value);
        if (kv) kvName = kv.name;
      });
    });
  }
  
  // Если все еще не нашли, показываем имя файла
  if (kvName) {
    textSpan.textContent = kvName;
  } else {
    // Извлекаем имя из пути файла
    const fileName = value.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
    textSpan.textContent = fileName || '— Нет —';
  }
  
  // Обновляем selected класс
  if (kvDropdown) {
    kvDropdown.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === value);
    });
  }
};

export const selectPreloadedKV = async (kvFile) => {
  const dom = getDom();
  const state = getState();
  
  // Обновляем KV для активной пары
  const activeIndex = state.activePairIndex || 0;
  const pairs = state.titleSubtitlePairs || [];
  if (pairs[activeIndex]) {
    updatePairKV(activeIndex, kvFile || '');
  }
  
  setState({ kvSelected: kvFile || '' });
  updateKVTriggerText(kvFile || '');

  if (!kvFile) {
    setState({ kv: null });
    updateKVUI();
    renderer.render();
    // Обновляем превью в списке KV для пар
    renderKVPairs();
    return;
  }

  try {
    const img = await loadImage(kvFile);
    setState({ kv: img });
    if (dom.kvSelect) dom.kvSelect.value = kvFile;
    updateKVUI();
    renderer.render();
    // Обновляем превью в списке KV для пар
    renderKVPairs();
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить KV.');
    setState({ kv: null });
    updateKVUI();
    renderer.render();
    // Обновляем превью в списке KV для пар
    renderKVPairs();
  }
};

export const loadDefaultKV = async () => {
  const dom = getDom();
  try {
    const defaultKV = 'assets/3d/sign/01.png';
    const img = await loadImage(defaultKV);
    setKey('kv', img);
    setState({ kvSelected: defaultKV });
    if (dom.kvSelect) dom.kvSelect.value = defaultKV;
    updateKVUI();
    renderer.render();
  } catch (error) {
    console.warn('Failed to load default KV image: assets/3d/sign/01.png');
  }
};

// Функции для управления парами заголовок/подзаголовок
export const updateActivePairTitle = (title) => {
  const state = getState();
  const activeIndex = state.activePairIndex || 0;
  updatePairTitle(activeIndex, title);
  renderer.render();
};

export const updateActivePairSubtitle = (subtitle) => {
  const state = getState();
  const activeIndex = state.activePairIndex || 0;
  updatePairSubtitle(activeIndex, subtitle);
  renderer.render();
};

export const updatePairTitleDirect = (index, title) => {
  // Обновляем состояние - структура пар не изменится, только текст
  // поэтому renderTitleSubtitlePairs не будет вызван
  updatePairTitle(index, title);
  // Если это активная пара, обновляем только рендер превью
  const state = getState();
  if (index === (state.activePairIndex || 0)) {
    renderer.render();
  }
};

export const updatePairSubtitleDirect = (index, subtitle) => {
  // Обновляем состояние - структура пар не изменится, только текст
  // поэтому renderTitleSubtitlePairs не будет вызван
  updatePairSubtitle(index, subtitle);
  // Если это активная пара, обновляем только рендер превью
  const state = getState();
  if (index === (state.activePairIndex || 0)) {
    renderer.render();
  }
};

// Функции для работы с KV для пар
const populateKVDropdownForPair = async (pairIndex, dropdown) => {
  // Если уже заполнен (больше чем опция "Нет"), не заполняем повторно
  if (dropdown.children.length > 1) {
    return;
  }
  
  // Используем кэш или сканируем
  let allKV = cachedKV;
  if (!allKV) {
    kvScanning = true;
    const scannedKV = await scanKV();
    allKV = { ...AVAILABLE_KV };
    Object.keys(scannedKV).forEach(folder1 => {
      if (!allKV[folder1]) {
        allKV[folder1] = {};
      }
      Object.keys(scannedKV[folder1]).forEach(folder2 => {
        if (!allKV[folder1][folder2]) {
          allKV[folder1][folder2] = [];
        }
        scannedKV[folder1][folder2].forEach(kv => {
          if (!allKV[folder1][folder2].find(k => k.file === kv.file)) {
            allKV[folder1][folder2].push(kv);
          }
        });
      });
    });
    cachedKV = allKV;
    kvScanning = false;
  }
  
  // Заполняем dropdown
  Object.keys(allKV).sort().forEach((folder1) => {
    Object.keys(allKV[folder1]).sort().forEach((folder2) => {
      const groupLabel = document.createElement('div');
      groupLabel.className = 'custom-select-option-group';
      groupLabel.textContent = folder2 === 'root' ? folder1 : `${folder1}/${folder2}`;
      dropdown.appendChild(groupLabel);
      
      allKV[folder1][folder2].forEach((kv) => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = kv.file;
        option.innerHTML = `
          <img src="${kv.file}" class="custom-select-option-preview" alt="${kv.name}">
          <span class="custom-select-option-label">${kv.name}</span>
        `;
        option.onclick = async () => {
          await selectPairKV(pairIndex, kv.file);
          closeKVDropdown(pairIndex);
        };
        dropdown.appendChild(option);
      });
    });
  });
};

const toggleKVDropdown = (pairIndex) => {
  const dropdown = document.getElementById(`kvSelectDropdown-${pairIndex}`);
  if (!dropdown) return;
  
  const computedStyle = window.getComputedStyle(dropdown);
  const isOpen = computedStyle.display !== 'none';
  
  if (isOpen) {
    dropdown.style.display = 'none';
  } else {
    // Закрываем другие dropdown
    document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
      if (dd !== dropdown) dd.style.display = 'none';
    });
    dropdown.style.display = 'block';
  }
};

const closeKVDropdown = (pairIndex) => {
  const dropdown = document.getElementById(`kvSelectDropdown-${pairIndex}`);
  if (dropdown) dropdown.style.display = 'none';
};

export const selectPairKV = async (pairIndex, kvFile) => {
  // Обновляем KV для пары
  updatePairKV(pairIndex, kvFile || '');
  
  // Обновляем текст в триггере
  const kvText = document.getElementById(`kvSelectText-${pairIndex}`);
  if (kvText) {
    let kvDisplayText = '— Нет —';
    if (kvFile) {
      // Проверяем, является ли это data URL
      if (kvFile.startsWith('data:')) {
        kvDisplayText = 'Загруженное изображение';
      } else {
        // Пытаемся найти имя KV из кэша или используем имя файла
        if (cachedKV) {
          let foundName = null;
          Object.keys(cachedKV).forEach((folder1) => {
            Object.keys(cachedKV[folder1] || {}).forEach((folder2) => {
              const kv = cachedKV[folder1][folder2].find(k => k.file === kvFile);
              if (kv) foundName = kv.name;
            });
          });
          if (foundName) {
            kvDisplayText = foundName;
          } else {
            // Используем имя файла без расширения
            kvDisplayText = kvFile.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
          }
        } else {
          // Используем имя файла без расширения
          kvDisplayText = kvFile.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
        }
      }
    }
    kvText.textContent = kvDisplayText;
  }
  
  // Обновляем превью
  const kvPreview = document.getElementById(`kvPreview-${pairIndex}`);
  if (kvPreview) {
    if (kvFile) {
      kvPreview.src = kvFile;
      kvPreview.style.display = 'block';
    } else {
      kvPreview.style.display = 'none';
    }
  }
  
  // Если это активная пара, загружаем KV и обновляем превью
  const state = getState();
  if (pairIndex === (state.activePairIndex || 0)) {
    if (!kvFile) {
      setState({ kv: null, kvSelected: '' });
      renderer.render();
      renderKVPairs(); // Обновляем кнопки
      return;
    }
    
    try {
      const img = await loadImage(kvFile);
      setState({ kv: img, kvSelected: kvFile });
      renderer.render();
      renderKVPairs(); // Обновляем кнопки
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить KV.');
      setState({ kv: null, kvSelected: '' });
      renderer.render();
      renderKVPairs(); // Обновляем кнопки
    }
  } else {
    // Обновляем кнопки даже если это не активная пара
    renderKVPairs();
  }
};

const renderKVPairs = () => {
  const state = getState();
  const pairs = state.titleSubtitlePairs || [];
  const activeIndex = state.activePairIndex || 0;
  
  const kvContainer = document.getElementById('kvPairsContainer');
  if (!kvContainer) return;
  
  // Очищаем контейнер
  kvContainer.innerHTML = '';
  
  // Запускаем сканирование KV в фоне, если кэш пуст (для следующего рендеринга)
  if (!cachedKV && !kvScanning) {
    kvScanning = true;
    scanKV().then((scannedKV) => {
      cachedKV = { ...AVAILABLE_KV };
      Object.keys(scannedKV).forEach(folder1 => {
        if (!cachedKV[folder1]) {
          cachedKV[folder1] = {};
        }
        Object.keys(scannedKV[folder1]).forEach(folder2 => {
          if (!cachedKV[folder1][folder2]) {
            cachedKV[folder1][folder2] = [];
          }
          scannedKV[folder1][folder2].forEach(kv => {
            if (!cachedKV[folder1][folder2].find(k => k.file === kv.file)) {
              cachedKV[folder1][folder2].push(kv);
            }
          });
        });
      });
      kvScanning = false;
      // Перерисовываем после заполнения кэша, чтобы обновить имена
      renderKVPairs();
    }).catch((error) => {
      console.error('Ошибка при сканировании KV:', error);
      kvScanning = false;
    });
  }
  
  // Рендерим KV для каждой пары
  pairs.forEach((pair, index) => {
    const isActive = index === activeIndex;
    
    // Элемент для KV этой пары
    const kvItem = document.createElement('div');
    kvItem.className = 'form-group';
    kvItem.style.cssText = 'background: #0e0f12; border: 1px solid #242733; border-radius: 6px; padding: 12px;';
    if (isActive) {
      kvItem.style.borderColor = '#4a9eff';
    }
    
    const kvLabel = document.createElement('label');
    kvLabel.style.cssText = `display: block; font-size: 12px; color: ${isActive ? '#4a9eff' : '#8a8f9c'}; margin-bottom: 8px;`;
    kvLabel.textContent = `KV для заголовка ${index + 1}${isActive ? ' (активен)' : ''}`;
    
    // Контейнер для dropdown и превью
    const kvRow = document.createElement('div');
    kvRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    
    // Создаем dropdown для выбора KV
    const kvWrapper = document.createElement('div');
    kvWrapper.className = 'custom-select-wrapper';
    kvWrapper.style.cssText = 'position: relative; flex: 1;';
    kvWrapper.id = `kvSelectWrapper-${index}`;
    
    const kvTrigger = document.createElement('div');
    kvTrigger.className = 'custom-select-trigger';
    kvTrigger.id = `kvSelectTrigger-${index}`;
    kvTrigger.style.cssText = 'width: 100%; background: #0e0f12; border: 1px solid #242733; color: #e9ecf1; padding: 8px 12px; border-radius: 6px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;';
    
    const kvText = document.createElement('span');
    kvText.id = `kvSelectText-${index}`;
    
    // Определяем текст для триггера KV
    let kvDisplayText = '— Нет —';
    if (pair.kvSelected) {
      // Проверяем, является ли это data URL
      if (pair.kvSelected.startsWith('data:')) {
        kvDisplayText = 'Загруженное изображение';
      } else {
        // Пытаемся найти имя KV из кэша или используем имя файла
        if (cachedKV) {
          let foundName = null;
          Object.keys(cachedKV).forEach((folder1) => {
            Object.keys(cachedKV[folder1] || {}).forEach((folder2) => {
              const kv = cachedKV[folder1][folder2].find(k => k.file === pair.kvSelected);
              if (kv) foundName = kv.name;
            });
          });
          if (foundName) {
            kvDisplayText = foundName;
          } else {
            // Используем имя файла без расширения
            kvDisplayText = pair.kvSelected.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
          }
        } else {
          // Используем имя файла без расширения
          kvDisplayText = pair.kvSelected.split('/').pop().replace(/\.(png|jpg|jpeg)$/i, '');
        }
      }
    }
    kvText.textContent = kvDisplayText;
    
    const kvArrow = document.createElement('span');
    kvArrow.style.cssText = 'font-size: 10px;';
    kvArrow.textContent = '▼';
    
    kvTrigger.appendChild(kvText);
    kvTrigger.appendChild(kvArrow);
    
    // Создаем маленькое превью KV
    const kvPreview = document.createElement('img');
    kvPreview.id = `kvPreview-${index}`;
    kvPreview.style.cssText = 'width: 48px; height: 48px; object-fit: contain; border: 1px solid #242733; border-radius: 4px; background: #0e0f12; padding: 4px; flex-shrink: 0;';
    kvPreview.alt = 'KV preview';
    if (pair.kvSelected) {
      kvPreview.src = pair.kvSelected;
      kvPreview.style.display = 'block';
    } else {
      kvPreview.style.display = 'none';
    }
    
    // Создаем кнопки действий для KV (всегда видны для каждого KV)
    const kvActions = document.createElement('div');
    kvActions.style.cssText = 'display: flex; gap: 8px; flex-shrink: 0;';
    
    // Кнопка "Заменить" (всегда видна)
    const replaceBtn = document.createElement('button');
    replaceBtn.className = 'btn';
    replaceBtn.style.cssText = 'padding: 6px 12px; font-size: 12px; background: #242733; border: 1px solid #2a2d3a; color: #e9ecf1;';
    replaceBtn.textContent = pair.kvSelected ? 'Заменить' : 'Загрузить';
    replaceBtn.onclick = (e) => {
      e.stopPropagation();
      // Создаем временный input для загрузки файла
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
          await handlePairKVUpload(index, file);
        }
        document.body.removeChild(input);
      };
      document.body.appendChild(input);
      input.click();
    };
    
    // Кнопка "Удалить" (всегда видна, но может быть неактивна)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn';
    removeBtn.style.cssText = 'padding: 6px 12px; font-size: 12px; background: #2a1f1f; color: #ff6b6b; border-color: #ff6b6b;';
    removeBtn.textContent = 'Удалить';
    removeBtn.disabled = !pair.kvSelected;
    if (!pair.kvSelected) {
      removeBtn.style.opacity = '0.5';
      removeBtn.style.cursor = 'not-allowed';
    }
    removeBtn.onclick = async (e) => {
      e.stopPropagation();
      if (pair.kvSelected) {
        await selectPairKV(index, '');
      }
    };
    
    kvActions.appendChild(replaceBtn);
    kvActions.appendChild(removeBtn);
    
    const kvDropdown = document.createElement('div');
    kvDropdown.className = 'custom-select-dropdown';
    kvDropdown.id = `kvSelectDropdown-${index}`;
    kvDropdown.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; right: 0; background: #15171c; border: 1px solid #242733; border-radius: 6px; margin-top: 4px; max-height: 300px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    
    // Добавляем опцию "Нет"
    const noneOption = document.createElement('div');
    noneOption.className = 'custom-select-option';
    noneOption.dataset.value = '';
    noneOption.innerHTML = '<span class="custom-select-option-label">— Нет —</span>';
    noneOption.onclick = async () => {
      await selectPairKV(index, '');
      closeKVDropdown(index);
    };
    kvDropdown.appendChild(noneOption);
    
    // Заполняем dropdown доступными KV (будет заполнен при открытии)
    kvTrigger.onclick = async (e) => {
      e.stopPropagation();
      await populateKVDropdownForPair(index, kvDropdown);
      toggleKVDropdown(index);
    };
    
    // Закрытие dropdown при клике вне его
    if (!window.kvPairDropdownCloseHandler) {
      window.kvPairDropdownCloseHandler = (e) => {
        const allDropdowns = document.querySelectorAll('[id^="kvSelectDropdown-"]');
        allDropdowns.forEach(dropdown => {
          const wrapper = dropdown.parentElement;
          if (wrapper && !wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
          }
        });
      };
      document.addEventListener('click', window.kvPairDropdownCloseHandler);
    }
    
    kvWrapper.appendChild(kvTrigger);
    kvWrapper.appendChild(kvDropdown);
    
    kvRow.appendChild(kvWrapper);
    kvRow.appendChild(kvPreview);
    kvRow.appendChild(kvActions);
    
    kvItem.appendChild(kvLabel);
    kvItem.appendChild(kvRow);
    
    kvContainer.appendChild(kvItem);
  });
};

const renderTitleSubtitlePairs = () => {
  const state = getState();
  const pairs = state.titleSubtitlePairs || [];
  const activeIndex = state.activePairIndex || 0;
  
  const titleContainer = document.getElementById('titlePairsContainer');
  const subtitleContainer = document.getElementById('subtitlePairsContainer');
  
  if (!titleContainer || !subtitleContainer) return;
  
  // Сохраняем фокус и позицию курсора перед перерисовкой
  const activeElement = document.activeElement;
  let savedFocus = null;
  let savedSelectionStart = null;
  let savedSelectionEnd = null;
  let savedValue = null;
  
  if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') && 
      (activeElement.id.startsWith('title-') || activeElement.id.startsWith('subtitle-'))) {
    savedFocus = activeElement.id;
    savedSelectionStart = activeElement.selectionStart;
    savedSelectionEnd = activeElement.selectionEnd;
    savedValue = activeElement.value;
  }
  
  // Очищаем контейнеры
  titleContainer.innerHTML = '';
  subtitleContainer.innerHTML = '';
  
  // Рендерим пары заголовков
  pairs.forEach((pair, index) => {
    const isActive = index === activeIndex;
    
    // Элемент для заголовка
    const titleItem = document.createElement('div');
    titleItem.className = 'form-group';
    titleItem.style.cssText = 'background: #0e0f12; border: 1px solid #242733; border-radius: 6px; padding: 12px;';
    if (isActive) {
      titleItem.style.borderColor = '#4a9eff';
    }
    
    // Создаем header с label и кнопкой
    const titleHeader = document.createElement('div');
    titleHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;';
    
    const titleLabel = document.createElement('label');
    titleLabel.style.cssText = `margin: 0; font-size: 12px; color: ${isActive ? '#4a9eff' : '#8a8f9c'}; font-weight: ${isActive ? '500' : '400'}; cursor: pointer;`;
    titleLabel.textContent = `Заголовок ${index + 1}${isActive ? ' (активен)' : ''}`;
    titleLabel.onclick = () => setActiveTitlePair(index);
    
    const titleButtons = document.createElement('div');
    titleButtons.style.cssText = 'display: flex; gap: 8px;';
    
    if (pairs.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn';
      removeBtn.style.cssText = 'padding: 4px 8px; font-size: 12px; background: #2a1f1f; color: #ff6b6b; border-color: #ff6b6b; min-width: 32px;';
      removeBtn.textContent = '−';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeTitleSubtitlePairAction(index);
      };
      titleButtons.appendChild(removeBtn);
    }
    
    titleHeader.appendChild(titleLabel);
    if (pairs.length > 1) {
      titleHeader.appendChild(titleButtons);
    }
    
    // Создаем textarea
    const titleTextarea = document.createElement('textarea');
    titleTextarea.id = `title-${index}`;
    titleTextarea.value = pair.title || '';
    titleTextarea.style.cssText = 'width: 100%; min-height: 60px; background: #0e0f12; border: 1px solid #242733; color: #e9ecf1; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-family: inherit; resize: vertical;';
    titleTextarea.oninput = (e) => {
      updatePairTitleDirect(index, e.target.value);
    };
    titleTextarea.onfocus = () => {
      const state = getState();
      // Устанавливаем активную пару только если она еще не активна
      if (index !== (state.activePairIndex || 0)) {
        setActivePairIndex(index);
      }
    };
    
    titleItem.appendChild(titleHeader);
    titleItem.appendChild(titleTextarea);
    titleContainer.appendChild(titleItem);
    
    // Элемент для подзаголовка
    const subtitleItem = document.createElement('div');
    subtitleItem.className = 'form-group';
    subtitleItem.style.cssText = 'background: #0e0f12; border: 1px solid #242733; border-radius: 6px; padding: 12px;';
    if (isActive) {
      subtitleItem.style.borderColor = '#4a9eff';
    }
    
    // Создаем header с label и кнопкой
    const subtitleHeader = document.createElement('div');
    subtitleHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;';
    
    const subtitleLabel = document.createElement('label');
    subtitleLabel.style.cssText = `margin: 0; font-size: 12px; color: ${isActive ? '#4a9eff' : '#8a8f9c'}; font-weight: ${isActive ? '500' : '400'}; cursor: pointer;`;
    subtitleLabel.textContent = `Подзаголовок ${index + 1}${isActive ? ' (активен)' : ''}`;
    subtitleLabel.onclick = () => setActiveTitlePair(index);
    
    const subtitleButtons = document.createElement('div');
    subtitleButtons.style.cssText = 'display: flex; gap: 8px;';
    
    if (pairs.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn';
      removeBtn.style.cssText = 'padding: 4px 8px; font-size: 12px; background: #2a1f1f; color: #ff6b6b; border-color: #ff6b6b; min-width: 32px;';
      removeBtn.textContent = '−';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeTitleSubtitlePairAction(index);
      };
      subtitleButtons.appendChild(removeBtn);
    }
    
    subtitleHeader.appendChild(subtitleLabel);
    if (pairs.length > 1) {
      subtitleHeader.appendChild(subtitleButtons);
    }
    
    // Создаем textarea
    const subtitleTextarea = document.createElement('textarea');
    subtitleTextarea.id = `subtitle-${index}`;
    subtitleTextarea.value = pair.subtitle || '';
    subtitleTextarea.style.cssText = 'width: 100%; min-height: 60px; background: #0e0f12; border: 1px solid #242733; color: #e9ecf1; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-family: inherit; resize: vertical;';
    subtitleTextarea.oninput = (e) => {
      updatePairSubtitleDirect(index, e.target.value);
    };
    subtitleTextarea.onfocus = () => {
      const state = getState();
      // Устанавливаем активную пару только если она еще не активна
      if (index !== (state.activePairIndex || 0)) {
        setActivePairIndex(index);
      }
    };
    
    subtitleItem.appendChild(subtitleHeader);
    subtitleItem.appendChild(subtitleTextarea);
    subtitleContainer.appendChild(subtitleItem);
  });
  
  // Добавляем кнопку "+ добавить еще заголовок" в конец контейнера заголовков
  const addTitleButton = document.createElement('div');
  addTitleButton.className = 'form-group';
  addTitleButton.innerHTML = `
    <button class="btn btn-full" onclick="addTitleSubtitlePair()" style="background: #242733; border: 1px solid #3a3f4d;">
      + Добавить еще заголовок
    </button>
  `;
  titleContainer.appendChild(addTitleButton);
  
  // Добавляем кнопку "+ добавить еще подзаголовок" в конец контейнера подзаголовков
  const addSubtitleButton = document.createElement('div');
  addSubtitleButton.className = 'form-group';
  addSubtitleButton.innerHTML = `
    <button class="btn btn-full" onclick="addTitleSubtitlePair()" style="background: #242733; border: 1px solid #3a3f4d;">
      + Добавить еще подзаголовок
    </button>
  `;
  subtitleContainer.appendChild(addSubtitleButton);
  
  // Обновляем текстовые поля активной пары (для обратной совместимости)
  if (pairs.length > 0 && activeIndex < pairs.length) {
    const activePair = pairs[activeIndex];
    const titleInput = document.getElementById('title');
    const subtitleInput = document.getElementById('subtitle');
    if (titleInput) titleInput.value = activePair.title || '';
    if (subtitleInput) subtitleInput.value = activePair.subtitle || '';
  }
  
  // Рендерим KV для каждой пары в разделе KV
  renderKVPairs();
  
  // Восстанавливаем фокус и позицию курсора после перерисовки
  if (savedFocus && savedValue !== null) {
    requestAnimationFrame(() => {
      const element = document.getElementById(savedFocus);
      if (element && element.value === savedValue) {
        // Значение не изменилось, восстанавливаем позицию курсора
        element.focus();
        if (element.setSelectionRange && typeof savedSelectionStart === 'number') {
          const maxPos = element.value.length;
          const start = Math.min(savedSelectionStart, maxPos);
          const end = Math.min(savedSelectionEnd, maxPos);
          element.setSelectionRange(start, end);
        }
      } else if (element) {
        // Значение изменилось, просто фокусируемся
        element.focus();
      }
    });
  }
};

export const setActiveTitlePair = async (index) => {
  setActivePairIndex(index);
  
  // Загружаем KV для активной пары
  const state = getState();
  const pairs = state.titleSubtitlePairs || [];
  const activePair = pairs[index];
  
  if (activePair && activePair.kvSelected) {
    try {
      const img = await loadImage(activePair.kvSelected);
      setState({ kv: img, kvSelected: activePair.kvSelected });
    } catch (error) {
      console.error('Не удалось загрузить KV для активной пары:', error);
      setState({ kv: null, kvSelected: '' });
    }
  } else {
    setState({ kv: null, kvSelected: '' });
  }
  
  renderTitleSubtitlePairs();
  renderKVPairs();
  syncFormFields();
  renderer.render();
};

export const addTitleSubtitlePairAction = () => {
  const state = getState();
  const oldLength = (state.titleSubtitlePairs || []).length;
  addTitleSubtitlePair();
  // Делаем новую пару активной (индекс последнего элемента = oldLength)
  setActivePairIndex(oldLength);
  renderTitleSubtitlePairs();
  renderKVPairs();
  syncFormFields();
  renderer.render();
};

export const removeTitleSubtitlePairAction = (index) => {
  removeTitleSubtitlePair(index);
  renderTitleSubtitlePairs();
  renderKVPairs();
  syncFormFields();
  renderer.render();
};

export const initializeStateSubscribers = () => {
  let lastPairsStructure = ''; // Сериализованная структура пар (без текста)
  let lastActiveIndex = -1;
  
  const serializePairsStructure = (pairs) => {
    // Сериализуем только ID пар, не текст
    return pairs.map((p, i) => `${i}:${p.id || ''}`).join('|');
  };
  
  subscribe(async (state) => {
    syncFormFields();
    
    // Перерисовываем только если изменилась структура (количество/ID) пар или активный индекс
    // НЕ перерисовываем при изменении текста
    const currentPairs = state.titleSubtitlePairs || [];
    const currentPairsStructure = serializePairsStructure(currentPairs);
    const currentActiveIndex = state.activePairIndex || 0;
    
    // Если изменился активный индекс, загружаем KV для новой активной пары
    if (currentActiveIndex !== lastActiveIndex && currentActiveIndex >= 0 && currentActiveIndex < currentPairs.length) {
      const activePair = currentPairs[currentActiveIndex];
      if (activePair && activePair.kvSelected) {
        try {
          const img = await loadImage(activePair.kvSelected);
          setState({ kv: img, kvSelected: activePair.kvSelected });
        } catch (error) {
          console.error('Не удалось загрузить KV для активной пары:', error);
          setState({ kv: null, kvSelected: '' });
        }
      } else {
        setState({ kv: null, kvSelected: '' });
      }
    }
    
    if (currentPairsStructure !== lastPairsStructure || currentActiveIndex !== lastActiveIndex) {
      renderTitleSubtitlePairs();
      renderKVPairs();
      lastPairsStructure = currentPairsStructure;
      lastActiveIndex = currentActiveIndex;
    }
  });
  // Инициализируем отображение пар при загрузке
  const initialState = getState();
  lastPairsStructure = serializePairsStructure(initialState.titleSubtitlePairs || []);
  lastActiveIndex = initialState.activePairIndex || 0;
  renderTitleSubtitlePairs();
  renderKVPairs();
};


