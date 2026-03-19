import { getState, getCheckedSizes, setKey } from './state/store.js';
import { canvasManager, getSortedSizes } from './renderer/canvas.js';
import { renderToCanvas } from '../packages/editor-renderer/src/legacy/render-to-canvas.js';

export { clearTextMeasurementCache } from '../packages/editor-renderer/src/legacy/render-to-canvas.js';

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

renderer.__unsafe_getRenderToCanvas = () => ({ renderToCanvas });
