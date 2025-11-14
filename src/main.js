import { cacheDom } from './ui/domCache.js';
import {
  syncFormFields,
  updatePreviewSizeSelect,
  renderPresetSizes,
  updatePadding,
  updateLegalOpacity,
  updateSubtitleOpacity,
  updateLogoSize,
  selectPreloadedLogo,
  selectFontFamily,
  selectTitleAlign,
  selectTitleVPos,
  selectLogoPos,
  selectLayoutMode,
  updateColorFromPicker,
  updateColorFromHex,
  handleLogoUpload,
  handleKVUpload,
  handleBgUpload,
  clearLogo,
  clearKV,
  clearBg,
  toggleSection,
  togglePlatform,
  toggleSize,
  changePreviewSize,
  handlePresetContainerClick,
  selectAllSizesAction,
  deselectAllSizesAction,
  saveSettings,
  loadSettings,
  resetAll,
  initializeLogoDropdown,
  initializeFontDropdown,
  loadDefaultKV,
  initializeStateSubscribers,
  refreshMediaPreviews,
  updateSizesSummary
} from './ui/ui.js';
import { renderer } from './renderer.js';
import { setKey, getState, ensurePresetSelection } from './state/store.js';
import { exportPNG, exportJPG } from './exporter.js';

const initializeEventDelegation = (dom) => {
  dom.presetSizesList.addEventListener('click', handlePresetContainerClick);
  dom.previewSizeSelect.addEventListener('change', (event) => changePreviewSize(event.target.value));
};

const exposeGlobals = () => {
  Object.assign(window, {
    updateState: (key, rawValue) => {
      const value = typeof rawValue === 'string' && rawValue.trim() === '' ? rawValue : rawValue;
      setKey(key, value);
      renderer.render();
    },
    updatePadding,
    updateLegalOpacity,
    updateSubtitleOpacity,
    updateLogoSize,
    selectPreloadedLogo,
    handleLogoUpload,
    handleKVUpload,
    handleBgUpload,
    clearLogo,
    clearKV,
    clearBg,
    selectTitleAlign,
    selectTitleVPos,
    selectLogoPos,
    selectLayoutMode,
    updateColorFromPicker,
    updateColorFromHex,
    selectFontFamily,
    toggleSection,
    changePreviewSize,
    selectAllSizes: selectAllSizesAction,
    deselectAllSizes: deselectAllSizesAction,
    togglePlatform,
    toggleSize,
    saveSettings,
    loadSettings,
    resetAll,
    exportAllPNG: exportPNG,
    exportAllJPG: exportJPG
  });
};

const initialize = async () => {
  const dom = cacheDom();
  renderer.initialize(dom.previewCanvas);
  initializeStateSubscribers();

  initializeLogoDropdown();
  initializeFontDropdown();
  ensurePresetSelection();
  await selectPreloadedLogo(getState().logoSelected);
  await loadDefaultKV();

  renderPresetSizes();
  updatePreviewSizeSelect();
  syncFormFields();
  refreshMediaPreviews();
  updateSizesSummary();
  initializeEventDelegation(dom);
  exposeGlobals();

  renderer.render();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}


