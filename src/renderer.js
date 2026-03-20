import {
  configureLegacyRendererRuntime
} from '../packages/editor-renderer/src/legacy/runtime-config.js';
import { canvasManager, getSortedSizes } from '../packages/editor-renderer/src/legacy/canvas.js';
import {
  clearTextMeasurementCache,
  renderToCanvas
} from '../packages/editor-renderer/src/legacy/render-to-canvas.js';
import { FONT_NAME_TO_WEIGHT } from './constants.js';
import { createStateSnapshot, getCheckedSizes, getState, setKey } from './state/store.js';

export { clearTextMeasurementCache };

configureLegacyRendererRuntime({
  getCheckedSizes,
  createStateSnapshot,
  fontNameToWeight: FONT_NAME_TO_WEIGHT
});

canvasManager.setRenderFunction(renderToCanvas);

export const renderer = {
  initialize(canvas) {
    canvasManager.initialize(canvas);
  },
  initializeMulti(canvasNarrow, canvasWide, canvasSquare) {
    canvasManager.initializeMulti(canvasNarrow, canvasWide, canvasSquare);
  },
  render() {
    canvasManager.render(getState, setKey);
  },
  renderSync() {
    canvasManager.renderSync(getState, setKey);
  },
  getCurrentIndex() {
    return canvasManager.getCurrentIndex();
  },
  setCurrentIndex(index) {
    canvasManager.setCurrentIndex(index, getState, setKey);
  },
  setCategoryIndex(category, index, shouldRender = true) {
    canvasManager.setCategoryIndex(category, index, shouldRender, getState, setKey);
  },
  getCategorizedSizes() {
    return canvasManager.getCategorizedSizes();
  },
  getCategoryIndices() {
    return canvasManager.getCategoryIndices();
  },
  getCheckedSizes() {
    return getCheckedSizes();
  },
  getSortedSizes() {
    return getSortedSizes();
  },
  getRenderMeta() {
    return canvasManager.getRenderMeta();
  }
};
