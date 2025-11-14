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
  ensurePresetSelection
} from '../state/store.js';
import { AVAILABLE_LOGOS, AVAILABLE_FONTS } from '../constants.js';
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
  dom.title.value = state.title;
  dom.titleColor.value = state.titleColor;
  if (dom.titleColorHex) dom.titleColorHex.value = state.titleColor;
  dom.titleSize.value = state.titleSize;
  dom.titleWeight.value = state.titleWeight;
  dom.titleLetterSpacing.value = state.titleLetterSpacing;
  dom.titleLineHeight.value = state.titleLineHeight;

  dom.subtitle.value = state.subtitle;
  dom.subtitleColor.value = state.subtitleColor;
  if (dom.subtitleColorHex) dom.subtitleColorHex.value = state.subtitleColor;
  dom.subtitleOpacity.value = state.subtitleOpacity || 90;
  if (dom.subtitleOpacityValue) dom.subtitleOpacityValue.textContent = `${state.subtitleOpacity || 90}%`;
  dom.subtitleSize.value = state.subtitleSize;
  dom.subtitleWeight.value = state.subtitleWeight;
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
  dom.legalLetterSpacing.value = state.legalLetterSpacing;
  dom.legalLineHeight.value = state.legalLineHeight;

  dom.age.value = state.age;
  dom.ageSize.value = state.ageSize;
  dom.ageGapPercent.value = state.ageGapPercent;

  dom.showSubtitle.checked = state.showSubtitle;
  dom.showLegal.checked = state.showLegal;
  dom.showAge.checked = state.showAge;
  dom.showKV.checked = state.showKV;
  dom.showBlocks.checked = state.showBlocks || false;
  dom.showGuides.checked = !!state.showGuides;

  dom.logoSelect.value = state.logoSelected || '';
  dom.logoSize.value = state.logoSize;
  dom.logoSizeValue.textContent = `${state.logoSize}%`;

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
  const select = dom.previewSizeSelect;
  const sizes = getCheckedSizes();
  const currentIndex = renderer.getCurrentIndex();

  if (!sizes.length) {
    select.innerHTML = '<option value="-1">No sizes selected</option>';
    return;
  }

  const options = sizes
    .map((size, index) => `<option value="${index}" ${index === currentIndex ? 'selected' : ''}>${size.width} × ${size.height} (${size.platform})</option>`)
    .join('');

  select.innerHTML = options;
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
          <span class="platform-arrow" id="arrow-${platform}">▼</span>
        </div>
        <div class="platform-sizes" id="sizes-${platform}">
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

export const clearLogo = () => {
  setState({ logo: null, logoSelected: '' });
  const dom = getDom();
  dom.logoSelect.value = '';
  updateLogoUI();
  renderer.render();
};

export const clearKV = () => {
  setState({ kv: null, showKV: false });
  const dom = getDom();
  dom.showKV.checked = false;
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

  if (!logoFile) {
    setState({ logo: null });
    updateLogoUI();
    renderer.render();
    return;
  }

  const logoInfo = AVAILABLE_LOGOS.find((logo) => logo.file === logoFile);
  if (!logoInfo) {
    setState({ logo: null });
    updateLogoUI();
    renderer.render();
    return;
  }

  try {
    const img = await loadImage(logoInfo.file);
    setState({ logo: img });
    dom.logoSelect.value = logoFile;
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

export const togglePlatform = (platform) => {
  const sizesEl = document.getElementById(`sizes-${platform}`);
  const arrowEl = document.getElementById(`arrow-${platform}`);
  if (sizesEl) sizesEl.classList.toggle('collapsed');
  if (arrowEl) arrowEl.classList.toggle('collapsed');
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

export const initializeLogoDropdown = () => {
  const dom = getDom();
  if (!dom.logoSelect) return;
  dom.logoSelect.innerHTML = '<option value="">— Нет —</option>';
  AVAILABLE_LOGOS.forEach((logo) => {
    const option = document.createElement('option');
    option.value = logo.file;
    option.textContent = logo.name;
    dom.logoSelect.appendChild(option);
  });
  dom.logoSelect.value = getState().logoSelected || '';
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

export const loadDefaultKV = async () => {
  try {
    const img = await loadImage('assets/3d/sign/01.png');
    setKey('kv', img);
    updateKVUI();
    renderer.render();
  } catch (error) {
    console.warn('Failed to load default KV image: assets/3d/sign/01.png');
  }
};

export const initializeStateSubscribers = () => {
  subscribe(syncFormFields);
};


