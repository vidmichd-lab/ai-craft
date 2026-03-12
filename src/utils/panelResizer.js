/**
 * Утилита для изменения ширины панелей через перетаскивание
 */

// Минимальная и максимальная ширина панелей
const MIN_PANEL_WIDTH = 180;
const MAX_PANEL_WIDTH = 600;
const FIXED_RIGHT_PANEL_WIDTH = 208;

/**
 * Загружает сохраненные ширины панелей из localStorage
 */
function loadPanelWidths() {
  const leftWidth = localStorage.getItem('panel-left-width');
  
  if (leftWidth) {
    document.documentElement.style.setProperty('--panel-left-width', leftWidth);
  }
  // Правая панель экспорта фиксированная по UX.
  document.documentElement.style.setProperty('--panel-right-width', `${FIXED_RIGHT_PANEL_WIDTH}px`);
}

/**
 * Сохраняет ширину панели в localStorage
 */
function savePanelWidth(panel, width) {
  if (panel === 'right') return;
  const key = panel === 'left' ? 'panel-left-width' : 'panel-right-width';
  localStorage.setItem(key, `${width}px`);
}

/**
 * Инициализирует resizer для панели
 */
function initPanelResizer(resizerId, panel) {
  const resizer = document.getElementById(resizerId);
  if (!resizer) return;
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    
    // Получаем текущую ширину панели
    const root = document.documentElement;
    const cssVar = panel === 'left' ? '--panel-left-width' : '--panel-right-width';
    const currentWidth = parseInt(getComputedStyle(root).getPropertyValue(cssVar)) || 240;
    startWidth = currentWidth;
    
    resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = panel === 'left' 
      ? e.clientX - startX  // Для левой панели увеличиваем при движении вправо
      : startX - e.clientX; // Для правой панели увеличиваем при движении влево
    
    let newWidth = startWidth + deltaX;
    
    // Ограничиваем ширину
    newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
    
    // Обновляем CSS переменную
    const cssVar = panel === 'left' ? '--panel-left-width' : '--panel-right-width';
    document.documentElement.style.setProperty(cssVar, `${newWidth}px`);
  });
  
  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    
    isResizing = false;
    resizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Сохраняем новую ширину
    const root = document.documentElement;
    const cssVar = panel === 'left' ? '--panel-left-width' : '--panel-right-width';
    const currentWidth = parseInt(getComputedStyle(root).getPropertyValue(cssVar)) || 240;
    savePanelWidth(panel, currentWidth);
  });
}

/**
 * Инициализирует все resizers
 */
export function initPanelResizers() {
  // Ждем, пока DOM полностью загрузится
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeResizers();
    });
  } else {
    initializeResizers();
  }
}

function initializeResizers() {
  // Загружаем сохраненные ширины
  loadPanelWidths();
  
  // Инициализируем resizers
  initPanelResizer('leftPanelResizer', 'left');
  // Правая колонка фиксированная, без ресайза.
}
