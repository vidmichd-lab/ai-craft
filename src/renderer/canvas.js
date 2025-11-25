/**
 * Модуль для управления canvas и рендерингом
 * Содержит логику работы с preview canvas и индексами
 */

import { getCheckedSizes } from '../state/store.js';
import { LAYOUT_CONSTANTS } from './constants.js';

/**
 * Получает отсортированные размеры по высоте (от маленькой к большой)
 */
export const getSortedSizes = () => {
  const sizes = getCheckedSizes();
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
    console.log('doRender вызван', {
      indices: {
        narrow: this.currentNarrowIndex,
        wide: this.currentWideIndex,
        square: this.currentSquareIndex
      }
    });
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

      const categorized = categorizeSizes(sizes);
      console.log('Категоризированные размеры:', {
        narrow: categorized.narrow.length,
        wide: categorized.wide.length,
        square: categorized.square.length
      });
    
    // Отладочная информация
    if (categorized.narrow.length === 0 && categorized.wide.length === 0 && categorized.square.length === 0) {
      console.warn('Все категории размеров пустые, но есть размеры:', sizes);
    }

    // Функция для получения размера с fallback - всегда возвращает валидный размер
    const getSizeForCategory = (categorySizes, index) => {
      if (categorySizes.length > 0) {
        // Используем сохраненный индекс, если он валиден
        // Важно: проверяем, что index не undefined и не null
        if (index !== undefined && index !== null && index >= 0 && index < categorySizes.length) {
          return categorySizes[index];
        }
        // Если индекс невалиден, используем 0
        return categorySizes[0];
      }
      // Если в категории нет размеров, используем первый доступный размер из любых других категорий
      if (categorized.narrow.length > 0) return categorized.narrow[0];
      if (categorized.square.length > 0) return categorized.square[0];
      if (categorized.wide.length > 0) return categorized.wide[0];
      // В крайнем случае используем первый размер из всех
      return sizes[0];
    };

    // Рендерим узкий формат
    if (this.previewCanvasNarrow) {
      const narrowSize = getSizeForCategory(categorized.narrow, this.currentNarrowIndex);
      console.log('Рендеринг narrow:', { 
        index: this.currentNarrowIndex, 
        size: narrowSize, 
        total: categorized.narrow.length,
        sizes: categorized.narrow.map(s => `${s.width}x${s.height}`),
        canvasBefore: { width: this.previewCanvasNarrow.width, height: this.previewCanvasNarrow.height }
      });
      if (narrowSize) {
        try {
          // Принудительно обновляем canvas, даже если размеры не изменились
          const oldWidth = this.previewCanvasNarrow.width;
          const oldHeight = this.previewCanvasNarrow.height;
          // Принудительно очищаем canvas перед рендерингом
          const ctx = this.previewCanvasNarrow.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, oldWidth, oldHeight);
          }
          // Устанавливаем platform в state для правильной работы охранных полей
          const renderState = { ...state, platform: narrowSize.platform || 'unknown' };
          this.renderToCanvasFn(this.previewCanvasNarrow, narrowSize.width, narrowSize.height, renderState);
          const newWidth = this.previewCanvasNarrow.width;
          const newHeight = this.previewCanvasNarrow.height;
          console.log('Canvas narrow обновлен:', { 
            old: `${oldWidth}x${oldHeight}`, 
            new: `${newWidth}x${newHeight}`,
            target: `${narrowSize.width}x${narrowSize.height}`
          });
          // Проверяем, что canvas действительно отрендерился
          if (this.previewCanvasNarrow.width === 0 || this.previewCanvasNarrow.height === 0) {
            console.warn('Canvas узкого формата имеет нулевой размер после рендеринга');
          } else {
            // Проверяем видимые размеры canvas (только первый раз)
            if (!this._narrowLogged) {
              const rect = this.previewCanvasNarrow.getBoundingClientRect();
              const style = window.getComputedStyle(this.previewCanvasNarrow);
              console.log('Canvas узкого формата:', {
                internal: { width: this.previewCanvasNarrow.width, height: this.previewCanvasNarrow.height },
                visible: { width: rect.width, height: rect.height },
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                position: { x: rect.x, y: rect.y }
              });
              this._narrowLogged = true;
            }
          }
        } catch (error) {
          console.error('Ошибка рендеринга узкого формата:', error);
        }
      } else {
        console.warn('Не найден размер для узкого формата');
      }
    } else {
      console.warn('Canvas узкого формата не инициализирован');
    }

    // Рендерим широкий формат
    if (this.previewCanvasWide) {
      const wideSize = getSizeForCategory(categorized.wide, this.currentWideIndex);
      console.log('Рендеринг wide:', { 
        index: this.currentWideIndex, 
        size: wideSize, 
        total: categorized.wide.length,
        sizes: categorized.wide.map(s => `${s.width}x${s.height}`),
        canvasBefore: { width: this.previewCanvasWide.width, height: this.previewCanvasWide.height }
      });
      if (wideSize) {
        try {
          // Принудительно обновляем canvas, даже если размеры не изменились
          const oldWidth = this.previewCanvasWide.width;
          const oldHeight = this.previewCanvasWide.height;
          // Принудительно очищаем canvas перед рендерингом
          const ctx = this.previewCanvasWide.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, oldWidth, oldHeight);
          }
          // Устанавливаем platform в state для правильной работы охранных полей
          const renderState = { ...state, platform: wideSize.platform || 'unknown' };
          this.lastRenderMeta = this.renderToCanvasFn(this.previewCanvasWide, wideSize.width, wideSize.height, renderState);
          const newWidth = this.previewCanvasWide.width;
          const newHeight = this.previewCanvasWide.height;
          console.log('Canvas wide обновлен:', { 
            old: `${oldWidth}x${oldHeight}`, 
            new: `${newWidth}x${newHeight}`,
            target: `${wideSize.width}x${wideSize.height}`
          });
          // Используем размер широкого формата для kvCanvas (для совместимости)
          setKey('kvCanvasWidth', wideSize.width);
          setKey('kvCanvasHeight', wideSize.height);
          // Проверяем, что canvas действительно отрендерился
          if (this.previewCanvasWide.width === 0 || this.previewCanvasWide.height === 0) {
            console.warn('Canvas широкого формата имеет нулевой размер после рендеринга');
          }
        } catch (error) {
          console.error('Ошибка рендеринга широкого формата:', error);
        }
      } else {
        console.warn('Не найден размер для широкого формата');
      }
    } else {
      console.warn('Canvas широкого формата не инициализирован');
    }

    // Рендерим квадратный формат
    if (this.previewCanvasSquare) {
      const squareSize = getSizeForCategory(categorized.square, this.currentSquareIndex);
      console.log('Рендеринг square:', { 
        index: this.currentSquareIndex, 
        size: squareSize, 
        total: categorized.square.length,
        sizes: categorized.square.map(s => `${s.width}x${s.height}`),
        canvasBefore: { width: this.previewCanvasSquare.width, height: this.previewCanvasSquare.height }
      });
      if (squareSize) {
        try {
          // Принудительно обновляем canvas, даже если размеры не изменились
          const oldWidth = this.previewCanvasSquare.width;
          const oldHeight = this.previewCanvasSquare.height;
          // Принудительно очищаем canvas перед рендерингом
          const ctx = this.previewCanvasSquare.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, oldWidth, oldHeight);
          }
          // Устанавливаем platform в state для правильной работы охранных полей
          const renderState = { ...state, platform: squareSize.platform || 'unknown' };
          this.renderToCanvasFn(this.previewCanvasSquare, squareSize.width, squareSize.height, renderState);
          const newWidth = this.previewCanvasSquare.width;
          const newHeight = this.previewCanvasSquare.height;
          console.log('Canvas square обновлен:', { 
            old: `${oldWidth}x${oldHeight}`, 
            new: `${newWidth}x${newHeight}`,
            target: `${squareSize.width}x${squareSize.height}`
          });
          // Проверяем, что canvas действительно отрендерился
          if (this.previewCanvasSquare.width === 0 || this.previewCanvasSquare.height === 0) {
            console.warn('Canvas квадратного формата имеет нулевой размер после рендеринга');
          }
        } catch (error) {
          console.error('Ошибка рендеринга квадратного формата:', error);
        }
      } else {
        console.warn('Не найден размер для квадратного формата');
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
    console.log('renderSync вызван', { 
      hasGetState: !!getState, 
      hasSetKey: !!setKey,
      indices: {
        narrow: this.currentNarrowIndex,
        wide: this.currentWideIndex,
        square: this.currentSquareIndex
      }
    });
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.doRender(getState, setKey);
    console.log('renderSync завершен');
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
    
    console.log('setCategoryIndex:', { 
      category, 
      index: idx, 
      shouldRender, 
      hasGetState: !!getState, 
      hasSetKey: !!setKey, 
      categorySize: categorySizes.length,
      selectedSize: categorySizes[idx] ? `${categorySizes[idx].width}x${categorySizes[idx].height}` : 'none',
      indices: {
        narrow: this.currentNarrowIndex,
        wide: this.currentWideIndex,
        square: this.currentSquareIndex
      }
    });
    
    if (shouldRender) {
      if (getState && setKey) {
        // Используем renderSync для немедленного обновления при выборе размера
        console.log('Вызываем renderSync для категории:', category);
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
