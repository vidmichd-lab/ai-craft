/**
 * Модуль для управления canvas и рендерингом
 * Содержит логику работы с preview canvas и индексами
 */

import { LAYOUT_CONSTANTS } from './constants.js';
import { getLegacyCheckedSizes } from './runtime-config.js';

const setCanvasVisibility = (canvas, visible, { opacity = null } = {}) => {
  if (!canvas) return;
  canvas.style.display = visible ? 'block' : 'none';
  canvas.style.opacity = opacity === null ? (visible ? '1' : '0') : String(opacity);
};

/**
 * Получает отсортированные размеры по высоте (от маленькой к большой)
 */
export const getSortedSizes = () => {
  const sizes = getLegacyCheckedSizes();
  return [...sizes].sort((a, b) => a.height - b.height);
};

/**
 * Категоризация размеров на узкие, широкие и квадратные
 */
export const categorizeSizes = (sizes) => {
  const narrow = []; // height >= width * VERTICAL_THRESHOLD (вертикальные)
  const wide = [];   // width >= height * HORIZONTAL_THRESHOLD (горизонтальные)
  const square = []; // остальные (примерно квадратные)
  
  sizes.forEach((size) => {
    if (size.height >= size.width * LAYOUT_CONSTANTS.VERTICAL_THRESHOLD) {
      narrow.push(size);
    } else if (size.width >= size.height * LAYOUT_CONSTANTS.HORIZONTAL_THRESHOLD) {
      wide.push(size);
    } else {
      square.push(size);
    }
  });
  
  // Сортируем каждую категорию для стабильности (по высоте, затем по ширине)
  const sortSizes = (a, b) => {
    if (a.height !== b.height) return a.height - b.height;
    return a.width - b.width;
  };
  
  narrow.sort(sortSizes);
  wide.sort(sortSizes);
  square.sort(sortSizes);
  
  return { narrow, wide, square };
};

/**
 * Класс для управления canvas состояниями
 */
class CanvasManager {
  constructor() {
    this.previewCanvas = null;
    this.previewCanvasNarrow = null;
    this.previewCanvasWide = null;
    this.previewCanvasSquare = null;
    this.currentPreviewIndex = 0;
    this.currentNarrowIndex = 0;
    this.currentWideIndex = 0;
    this.currentSquareIndex = 0;
    this.rafId = null;
    this.lastRenderMeta = null;
    this.renderToCanvasFn = null;
  }

  /**
   * Инициализация одного canvas (для обратной совместимости)
   */
  initialize(canvas) {
    this.previewCanvas = canvas;
  }

  /**
   * Инициализация множественных canvas по категориям
   */
  initializeMulti(canvasNarrow, canvasWide, canvasSquare) {
    this.previewCanvasNarrow = canvasNarrow;
    this.previewCanvasWide = canvasWide;
    this.previewCanvasSquare = canvasSquare;
  }

  /**
   * Устанавливает функцию рендеринга
   */
  setRenderFunction(renderFn) {
    this.renderToCanvasFn = renderFn;
  }

  /**
   * Выполняет рендеринг всех canvas
   */
  doRender(getState, setKey) {
    try {
      const sizes = getSortedSizes();
      if (!sizes || !sizes.length) {
        console.warn('Нет выбранных размеров для рендеринга');
        return;
      }

      if (!this.renderToCanvasFn) {
        console.error('Функция рендеринга не установлена');
        return;
      }

      if (typeof getState !== 'function') {
        console.error('getState не является функцией');
        return;
      }

      const state = getState();
      if (!state) {
        console.error('Состояние не получено');
        return;
      }
      const isRsyaMode = state.projectMode === 'rsya';

      const categorized = categorizeSizes(sizes);
      if (categorized.narrow.length === 0 && categorized.wide.length === 0 && categorized.square.length === 0) {
      console.warn('Все категории размеров пустые, но есть размеры:', sizes);
      }

    // Функция для получения размера внутри категории.
    // Не подставляем размеры из других категорий — иначе канвас категории
    // может рендериться в неверном формате (например, wide <- narrow).
    const getSizeForCategory = (categorySizes, index) => {
      if (!categorySizes.length) return null;
      // Используем сохраненный индекс, если он валиден
      if (index !== undefined && index !== null && index >= 0 && index < categorySizes.length) {
        return categorySizes[index];
      }
      // Если индекс невалиден, используем первый размер этой же категории
      return categorySizes[0];
    };

    const clearCanvas = (canvas) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    // В режиме РСЯ рендерим только один главный canvas 1600x1200
    if (isRsyaMode) {
      const rsyaSize = sizes.find((s) => s.width === 1600 && s.height === 1200) || sizes[0];
      if (this.previewCanvasNarrow) {
        clearCanvas(this.previewCanvasNarrow);
        setCanvasVisibility(this.previewCanvasNarrow, false);
      }
      if (this.previewCanvasSquare) {
        clearCanvas(this.previewCanvasSquare);
        setCanvasVisibility(this.previewCanvasSquare, false);
      }

      if (this.previewCanvasWide && rsyaSize) {
        setCanvasVisibility(this.previewCanvasWide, true, { opacity: 0 });
        const renderState = { ...state, platform: rsyaSize.platform || 'РСЯ' };
        this.lastRenderMeta = this.renderToCanvasFn(this.previewCanvasWide, rsyaSize.width, rsyaSize.height, renderState);
        if (typeof setKey === 'function') {
          setKey('kvCanvasWidth', rsyaSize.width);
          setKey('kvCanvasHeight', rsyaSize.height);
        }
      } else if (this.previewCanvasWide) {
        clearCanvas(this.previewCanvasWide);
        setCanvasVisibility(this.previewCanvasWide, false);
      }
      if (typeof window !== 'undefined' && typeof window.__updateRsyaCropPreviews === 'function') {
        window.__updateRsyaCropPreviews(this.previewCanvasWide, state);
      }
      return;
    }

    // Рендерим узкий формат
    if (this.previewCanvasNarrow) {
      const narrowSize = getSizeForCategory(categorized.narrow, this.currentNarrowIndex);
      if (narrowSize) {
        try {
          setCanvasVisibility(this.previewCanvasNarrow, true);
          const oldWidth = this.previewCanvasNarrow.width;
          const oldHeight = this.previewCanvasNarrow.height;
          const ctx = this.previewCanvasNarrow.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, oldWidth, oldHeight);
          }
          const renderState = { ...state, platform: narrowSize.platform || 'unknown' };
          this.renderToCanvasFn(this.previewCanvasNarrow, narrowSize.width, narrowSize.height, renderState);
          if (this.previewCanvasNarrow.width === 0 || this.previewCanvasNarrow.height === 0) {
            console.warn('Canvas узкого формата имеет нулевой размер после рендеринга');
          }
        } catch (error) {
          console.error('Ошибка рендеринга узкого формата:', error);
        }
      } else {
        console.warn('Не найден размер для узкого формата');
        clearCanvas(this.previewCanvasNarrow);
        setCanvasVisibility(this.previewCanvasNarrow, false);
      }
    } else {
      console.warn('Canvas узкого формата не инициализирован');
    }

    // Рендерим широкий формат
    if (this.previewCanvasWide) {
      const wideSize = getSizeForCategory(categorized.wide, this.currentWideIndex);
      if (wideSize) {
        try {
          setCanvasVisibility(this.previewCanvasWide, true);
          const oldWidth = this.previewCanvasWide.width;
          const oldHeight = this.previewCanvasWide.height;
          const ctx = this.previewCanvasWide.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, oldWidth, oldHeight);
          }
          const renderState = { ...state, platform: wideSize.platform || 'unknown' };
          this.lastRenderMeta = this.renderToCanvasFn(this.previewCanvasWide, wideSize.width, wideSize.height, renderState);
          setKey('kvCanvasWidth', wideSize.width);
          setKey('kvCanvasHeight', wideSize.height);
          if (this.previewCanvasWide.width === 0 || this.previewCanvasWide.height === 0) {
            console.warn('Canvas широкого формата имеет нулевой размер после рендеринга');
          }
        } catch (error) {
          console.error('Ошибка рендеринга широкого формата:', error);
        }
      } else {
        console.warn('Не найден размер для широкого формата');
        clearCanvas(this.previewCanvasWide);
        setCanvasVisibility(this.previewCanvasWide, false);
      }
    } else {
      console.warn('Canvas широкого формата не инициализирован');
    }

    // Рендерим квадратный формат
    if (this.previewCanvasSquare) {
      const squareSize = getSizeForCategory(categorized.square, this.currentSquareIndex);
      if (squareSize) {
        try {
          setCanvasVisibility(this.previewCanvasSquare, true);
          const oldWidth = this.previewCanvasSquare.width;
          const oldHeight = this.previewCanvasSquare.height;
          const ctx = this.previewCanvasSquare.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, oldWidth, oldHeight);
          }
          const renderState = { ...state, platform: squareSize.platform || 'unknown' };
          this.renderToCanvasFn(this.previewCanvasSquare, squareSize.width, squareSize.height, renderState);
          if (this.previewCanvasSquare.width === 0 || this.previewCanvasSquare.height === 0) {
            console.warn('Canvas квадратного формата имеет нулевой размер после рендеринга');
          }
        } catch (error) {
          console.error('Ошибка рендеринга квадратного формата:', error);
        }
      } else {
        console.warn('Не найден размер для квадратного формата');
        clearCanvas(this.previewCanvasSquare);
        setCanvasVisibility(this.previewCanvasSquare, false);
      }
    } else {
        console.warn('Canvas квадратного формата не инициализирован');
    }

    // Обратная совместимость со старым canvas
    if (this.previewCanvas) {
      if (this.currentPreviewIndex >= sizes.length) {
        this.currentPreviewIndex = 0;
      }
      const size = sizes[this.currentPreviewIndex];
      if (size) {
        try {
          // Устанавливаем platform в state для правильной работы охранных полей
          const renderState = { ...state, platform: size.platform || 'unknown' };
          this.lastRenderMeta = this.renderToCanvasFn(this.previewCanvas, size.width, size.height, renderState);
          if (typeof setKey === 'function') {
            setKey('kvCanvasWidth', size.width);
            setKey('kvCanvasHeight', size.height);
          }
        } catch (error) {
          console.error('Ошибка рендеринга старого canvas:', error);
          console.error('Стек ошибки:', error.stack);
        }
      }
    }
    if (typeof window !== 'undefined' && typeof window.__updateRsyaCropPreviews === 'function') {
      window.__updateRsyaCropPreviews(this.previewCanvasWide, state);
    }
    } catch (error) {
      console.error('Критическая ошибка в doRender:', error);
      console.error('Стек ошибки:', error.stack);
      // Не пробрасываем ошибку дальше, чтобы не сломать приложение
    }
  }

  /**
   * Запланировать рендеринг через requestAnimationFrame
   */
  render(getState, setKey) {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(() => {
      this.doRender(getState, setKey);
    });
  }

  /**
   * Выполнить рендеринг синхронно
   */
  renderSync(getState, setKey) {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.doRender(getState, setKey);
  }

  /**
   * Получить текущий индекс
   */
  getCurrentIndex() {
    return this.currentPreviewIndex;
  }

  /**
   * Установить текущий индекс
   */
  setCurrentIndex(index, getState, setKey) {
    this.currentPreviewIndex = Number(index) || 0;
    this.render(getState, setKey);
  }

  /**
   * Установить индекс для категории
   */
  setCategoryIndex(category, index, shouldRender, getState, setKey) {
    const idx = Number(index) || 0;
    if (category === 'narrow') {
      this.currentNarrowIndex = idx;
    } else if (category === 'wide') {
      this.currentWideIndex = idx;
    } else if (category === 'square') {
      this.currentSquareIndex = idx;
    }
    
    // Получаем категоризированные размеры для проверки валидности индекса
    const categorized = this.getCategorizedSizes();
    const categorySizes = categorized[category] || [];
    
    // Проверяем валидность индекса
    if (idx < 0 || idx >= categorySizes.length) {
      console.warn(`Индекс ${idx} выходит за границы категории ${category} (размер: ${categorySizes.length})`);
      // Устанавливаем валидный индекс
      if (category === 'narrow') {
        this.currentNarrowIndex = categorySizes.length > 0 ? 0 : -1;
      } else if (category === 'wide') {
        this.currentWideIndex = categorySizes.length > 0 ? 0 : -1;
      } else if (category === 'square') {
        this.currentSquareIndex = categorySizes.length > 0 ? 0 : -1;
      }
    }
    
    if (shouldRender) {
      if (getState && setKey) {
        // Принудительно обновляем канвас, даже если размеры не изменились
        this.renderSync(getState, setKey);
      } else {
        console.warn('getState или setKey не переданы в setCategoryIndex');
      }
    }
  }

  /**
   * Получить категоризированные размеры
   */
  getCategorizedSizes() {
    const sizes = getSortedSizes();
    return categorizeSizes(sizes);
  }

  /**
   * Получить текущие индексы для категорий
   */
  getCategoryIndices() {
    return {
      narrow: this.currentNarrowIndex,
      wide: this.currentWideIndex,
      square: this.currentSquareIndex
    };
  }

  /**
   * Получить метаданные последнего рендера
   */
  getRenderMeta() {
    return this.lastRenderMeta;
  }
}

// Создаем единственный экземпляр
export const canvasManager = new CanvasManager();
