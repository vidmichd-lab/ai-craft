import { renderer } from './renderer.js';
import { getState, getCheckedSizes } from './state/store.js';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getRendererInternals = () => {
  if (!renderer.__unsafe_getRenderToCanvas) {
    throw new Error('Renderer internals are not exposed.');
  }
  return renderer.__unsafe_getRenderToCanvas();
};

const exportSizes = async (format) => {
  const sizes = getCheckedSizes();
  if (!sizes.length) {
    alert('Нет выбранных размеров для экспорта!');
    return;
  }

  const state = getState();

  for (let index = 0; index < sizes.length; index += 1) {
    const size = sizes[index];
    const canvas = document.createElement('canvas');
    const { renderToCanvas } = getRendererInternals();

    try {
      renderToCanvas(canvas, size.width, size.height, state);
    } catch (e) {
      console.error(e);
      alert('Ошибка экспорта. Запустите проект через локальный сервер.');
      return;
    }

    const quality = format === 'jpeg' ? 0.95 : 1;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, quality));
    if (!blob) {
      alert('Не удалось сформировать изображение. Возможно, холст «tainted».');
      return;
    }

    const platform = (size.platform || 'unknown').toString().toLowerCase();
    const filename = `${state.namePrefix}/${platform}/${size.width}x${size.height}.${format === 'jpeg' ? 'jpg' : format}`;
    downloadBlob(blob, filename);
  }
};

export const exportPNG = () => exportSizes('png');
export const exportJPG = () => exportSizes('jpeg');


