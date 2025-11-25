/**
 * UI компонент для импорта макетов из Figma
 */

import {
  extractFileKey,
  extractNodeId,
  validateFigmaUrl,
  validateFigmaToken,
  saveFigmaToken,
  getFigmaToken,
  fetchFigmaFile,
  fetchFigmaNode,
  fetchFigmaImages,
  loadFigmaImage
} from '../../utils/figmaApi.js';
import { extractFigmaElements, convertFigmaToState } from '../../utils/figmaSmartResizer.js';
import { setKey, getState, setState } from '../../state/store.js';
import { renderer } from '../../renderer.js';
import { initializeBackgroundUI } from './backgroundSelector.js';

/**
 * Создает UI для импорта из Figma
 * @returns {HTMLElement} - DOM элемент секции
 */
export const createFigmaImporterSection = () => {
  const section = document.createElement('div');
  section.className = 'panel-section';
  section.id = 'panel-section-figma';
  
  section.innerHTML = `
    <div class="form-group">
      <label data-i18n="figma.mode">Режим отображения</label>
      <div class="toggle-switch" id="figmaModeToggle" data-value="constructor" data-options="2">
        <div class="toggle-switch-slider"></div>
        <div class="toggle-switch-track">
          <div class="toggle-switch-option active" data-value="constructor" data-i18n="figma.mode.constructor">Конструктор</div>
          <div class="toggle-switch-option" data-value="figma" data-i18n="figma.mode.figma">Figma</div>
        </div>
      </div>
      <div class="hint" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;" data-i18n="figma.mode.hint">
        Выберите режим: Конструктор — использует настройки конструктора, Figma — показывает макет из Figma
      </div>
    </div>
    
    <div class="form-group">
      <label for="figmaUrl" data-i18n="figma.url">Ссылка на макет Figma</label>
      <div style="display: flex; gap: 8px;">
        <input 
          type="text" 
          id="figmaUrl" 
          placeholder="https://www.figma.com/design/..." 
          class="input"
          style="flex: 1;"
          data-i18n-placeholder="figma.url.placeholder"
        >
        <button 
          class="btn" 
          id="figmaRefreshBtn" 
          data-i18n-title="figma.refresh"
          style="flex: 0 0 auto;"
        >
          <span data-i18n="figma.refresh">Обновить</span>
        </button>
      </div>
      <div class="hint" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;" data-i18n="figma.url.hint">
        Вставьте ссылку на макет в Figma. Убедитесь, что макет доступен по этой ссылке.
      </div>
    </div>
    
    <div class="form-group">
      <label for="figmaToken" data-i18n="figma.token">Personal Access Token</label>
      <div style="display: flex; gap: 8px;">
        <input 
          type="password" 
          id="figmaToken" 
          placeholder="figd_..." 
          class="input"
          style="flex: 1;"
          data-i18n-placeholder="figma.token.placeholder"
        >
        <button 
          class="btn" 
          id="figmaTokenToggle" 
          data-i18n-title="figma.token.toggle"
          style="flex: 0 0 auto;"
        >
          <span class="material-icons" id="figmaTokenIcon">visibility</span>
        </button>
      </div>
      <div class="hint" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;" data-i18n="figma.token.hint">
        Получите токен в настройках Figma: Account → Personal Access Tokens. Токен сохраняется локально.
      </div>
      <a 
        href="https://www.figma.com/developers/api#access-tokens" 
        target="_blank" 
        rel="noopener noreferrer"
        style="color: var(--accent-color); text-decoration: none; font-size: 12px; margin-top: 4px; display: inline-block;"
        data-i18n="figma.token.link"
      >
        Как получить токен?
      </a>
    </div>
    
    <div class="form-group" id="figmaPreviewContainer" style="display: none;">
      <label data-i18n="figma.preview">Предпросмотр макета</label>
      <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; background: var(--bg-secondary);">
        <div id="figmaPreviewInfo" style="margin-bottom: 12px; font-size: 14px; color: var(--text-secondary);"></div>
        <div id="figmaPreviewImage" style="max-width: 100%; border-radius: 4px; overflow: hidden;">
          <img id="figmaPreviewImg" src="" alt="Preview" style="max-width: 100%; height: auto; display: block;">
        </div>
      </div>
    </div>
    
    
    <div id="figmaProgressContainer" style="display: none; margin-top: 16px;">
      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span data-i18n="figma.progress">Прогресс:</span>
          <span id="figmaProgressText">0 / 0</span>
        </div>
        <div style="width: 100%; height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
          <div 
            id="figmaProgressBar" 
            style="height: 100%; background: var(--accent-color); width: 0%; transition: width 0.3s ease;"
          ></div>
        </div>
      </div>
    </div>
    
    <div id="figmaErrorContainer" style="display: none; margin-top: 16px; padding: 12px; background: var(--error-bg, rgba(232, 64, 51, 0.1)); border: 1px solid var(--error-color, #E84033); border-radius: 8px; color: var(--error-color, #E84033);">
      <div style="display: flex; align-items: start; gap: 8px;">
        <span class="material-icons" style="font-size: 20px; flex-shrink: 0;">error</span>
        <div>
          <strong data-i18n="figma.error.title">Ошибка:</strong>
          <div id="figmaErrorText" style="margin-top: 4px; font-size: 14px;"></div>
        </div>
      </div>
    </div>
  `;
  
  return section;
};

/**
 * Инициализирует обработчики событий для Figma импортера
 */
export const initFigmaImporter = () => {
  const urlInput = document.getElementById('figmaUrl');
  const tokenInput = document.getElementById('figmaToken');
  const tokenToggle = document.getElementById('figmaTokenToggle');
  const tokenIcon = document.getElementById('figmaTokenIcon');
  const refreshBtn = document.getElementById('figmaRefreshBtn');
  const modeToggle = document.getElementById('figmaModeToggle');
  const progressContainer = document.getElementById('figmaProgressContainer');
  const progressBar = document.getElementById('figmaProgressBar');
  const progressText = document.getElementById('figmaProgressText');
  const errorContainer = document.getElementById('figmaErrorContainer');
  const errorText = document.getElementById('figmaErrorText');
  const previewContainer = document.getElementById('figmaPreviewContainer');
  const previewInfo = document.getElementById('figmaPreviewInfo');
  const previewImg = document.getElementById('figmaPreviewImg');
  
  // Загружаем сохраненный токен и URL
  const savedToken = getFigmaToken();
  if (savedToken) {
    tokenInput.value = savedToken;
  }
  
  // Функция для обновления UI переключателя режимов
  const updateModeToggleUI = (mode) => {
    if (!modeToggle) return;
    
    modeToggle.dataset.value = mode;
    const modeOptions = modeToggle.querySelectorAll('.toggle-switch-option');
    modeOptions.forEach(opt => {
      opt.classList.remove('active');
      if (opt.dataset.value === mode) {
        opt.classList.add('active');
      }
    });
    
    // Обновляем позицию слайдера
    const slider = modeToggle.querySelector('.toggle-switch-slider');
    if (slider) {
      if (mode === 'figma') {
        slider.style.transform = 'translateX(calc(100% - 4px))';
      } else {
        slider.style.transform = 'translateX(0)';
      }
    }
  };
  
  // Загружаем сохраненный URL и режим из state
  const state = getState();
  if (state.figmaUrl) {
    urlInput.value = state.figmaUrl;
  }
  if (state.figmaMode) {
    updateModeToggleUI(state.figmaMode);
  } else {
    updateModeToggleUI('constructor');
  }
  
  // Переключение видимости токена
  if (tokenToggle) {
    tokenToggle.addEventListener('click', () => {
      const isPassword = tokenInput.type === 'password';
      tokenInput.type = isPassword ? 'text' : 'password';
      tokenIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
    });
  }
  
  // Сохранение токена при изменении
  if (tokenInput) {
    tokenInput.addEventListener('blur', () => {
      if (tokenInput.value.trim()) {
        saveFigmaToken(tokenInput.value.trim());
      }
    });
  }
  
  // Обработчик кнопки обновления
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (url && validateFigmaUrl(url)) {
        hideError();
        refreshBtn.disabled = true;
        const refreshText = refreshBtn.querySelector('span[data-i18n]');
        if (refreshText) {
          refreshText.textContent = 'Обновление...';
        }
        try {
          await loadPreview(url);
          await loadFigmaLayout(url);
        } catch (e) {
          console.warn('Не удалось обновить макет:', e);
          showError('Не удалось обновить макет: ' + e.message);
        } finally {
          refreshBtn.disabled = false;
          // Восстанавливаем текст через i18n
          const refreshText = refreshBtn.querySelector('span[data-i18n]');
          if (refreshText) {
            refreshText.setAttribute('data-i18n', 'figma.refresh');
            // Обновляем через систему переводов
            if (window.updateUI) {
              window.updateUI();
            }
          }
        }
      }
    });
  }
  
  // Обработчик тумблера режима
  if (modeToggle) {
    const modeOptions = modeToggle.querySelectorAll('.toggle-switch-option');
    modeOptions.forEach(opt => {
      opt.addEventListener('click', async () => {
        const newMode = opt.dataset.value;
        
        // Сохраняем режим в state
        setKey('figmaMode', newMode);
        
        // Обновляем UI переключателя режимов
        updateModeToggleUI(newMode);
        
        // Если переключились на режим Figma и есть URL, загружаем макет
        if (newMode === 'figma') {
          const url = urlInput.value.trim();
          if (url && validateFigmaUrl(url)) {
            try {
              await loadFigmaLayout(url);
            } catch (e) {
              console.warn('Не удалось загрузить макет из Figma:', e);
            }
          }
        } else if (newMode === 'constructor') {
          // При переключении на конструктор очищаем данные из Figma
          // Используем обычный конструктор без данных из Figma
          setKey('figmaData', null);
        }
        
        // Обновляем рендеринг
        if (renderer && renderer.render) {
          renderer.render();
        }
      });
    });
    
    // Автоматически загружаем макет при загрузке страницы, если режим Figma
    const currentState = getState();
    if (currentState.figmaMode === 'figma' && currentState.figmaUrl && validateFigmaUrl(currentState.figmaUrl)) {
      // Загружаем макет асинхронно после инициализации
      setTimeout(async () => {
        try {
          await loadFigmaLayout(currentState.figmaUrl);
        } catch (e) {
          console.warn('Не удалось загрузить сохраненный макет из Figma:', e);
        }
      }, 100);
    }
  }
  
  // Валидация URL при вводе
  if (urlInput) {
    urlInput.addEventListener('input', async () => {
      hideError();
      const url = urlInput.value.trim();
      
      // Сохраняем URL в state
      setKey('figmaUrl', url);
      
      if (url && validateFigmaUrl(url)) {
        // Загружаем предпросмотр и макет
        try {
          await loadPreview(url);
          // Автоматически загружаем макет, если режим Figma
          const currentState = getState();
          if (currentState.figmaMode === 'figma') {
            await loadFigmaLayout(url);
          }
        } catch (e) {
          console.warn('Не удалось загрузить предпросмотр:', e);
        }
      } else {
        previewContainer.style.display = 'none';
      }
    });
  }
  
  
  /**
   * Загружает макет из Figma и сохраняет его в state для отображения в превью
   */
  async function loadFigmaLayout(url) {
    const token = tokenInput.value.trim() || getFigmaToken();
    if (!token) {
      return;
    }
    
    const fileKey = extractFileKey(url);
    const nodeId = extractNodeId(url);
    
    if (!fileKey) {
      return;
    }
    
    try {
      // Получаем структуру файла
      const fileData = await fetchFigmaFile(fileKey, token);
      const targetNodeId = nodeId || fileData.document.id;
      
      // Получаем данные ноды
      const nodeData = await fetchFigmaNode(fileKey, targetNodeId, token);
      const nodeIdForApi = targetNodeId.replace(/:/g, '-');
      const node = nodeData.nodes[targetNodeId] || nodeData.nodes[nodeIdForApi] || nodeData.nodes[targetNodeId.replace(/-/g, ':')];
      
      if (!node) {
        const availableIds = Object.keys(nodeData.nodes || {});
        throw new Error(`Нода не найдена. Доступные ID: ${availableIds.slice(0, 5).join(', ')}...`);
      }
      
      // Получаем bounds из ноды
      const bounds = node.document?.absoluteBoundingBox || node.absoluteBoundingBox || {};
      
      // Экспортируем изображение для отображения
      const nodeIdForExport = targetNodeId.replace(/-/g, ':');
      const imagesResponse = await fetchFigmaImages(fileKey, [nodeIdForExport], token, 2, 'png');
      
      const nodeIdVariants = [nodeIdForExport, targetNodeId, targetNodeId.replace(/-/g, ':'), targetNodeId.replace(/:/g, '-')];
      let imageUrl = null;
      
      for (const variant of nodeIdVariants) {
        if (imagesResponse.images && imagesResponse.images[variant]) {
          imageUrl = imagesResponse.images[variant];
          break;
        }
      }
      
      if (!imageUrl) {
        throw new Error('Не удалось получить изображение из Figma');
      }
      
      // Загружаем изображение
      const img = await loadFigmaImage(imageUrl);
      
      // Извлекаем элементы из Figma и применяем к state конструктора
      const figmaElements = await extractFigmaElements(fileData, fileKey, targetNodeId, token);
      const originalSize = figmaElements.originalSize;
      const currentState = getState();
      
      // Конвертируем элементы Figma в состояние конструктора
      // Используем originalSize для обоих параметров, чтобы сохранить пропорции
      const figmaState = convertFigmaToState(figmaElements, originalSize, originalSize, currentState);
      
      // Применяем состояние из Figma к текущему state (делаем элементы настраиваемыми)
      // В режиме figma используем конструктор со слоями из Figma
      setState(figmaState);
      
      // Сохраняем данные Figma в state
      setKey('figmaData', {
        fileKey,
        nodeId: targetNodeId,
        imageUrl,
        image: img,
        bounds: bounds
      });
      
      // Переключаем режим на Figma
      setKey('figmaMode', 'figma');
      
      // Обновляем тумблер
      const modeOptions = modeToggle.querySelectorAll('.toggle-switch-option');
      modeOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.value === 'figma') {
          opt.classList.add('active');
        }
      });
      modeToggle.dataset.value = 'figma';
      
      // Обновляем UI фона (включая градиент)
      initializeBackgroundUI();
      
      // Обновляем рендеринг
      if (renderer && renderer.render) {
        renderer.render();
      }
    } catch (e) {
      console.error('Ошибка загрузки макета из Figma:', e);
      throw e;
    }
  }
  
  /**
   * Загружает предпросмотр макета
   */
  async function loadPreview(url) {
    const token = tokenInput.value.trim() || getFigmaToken();
    if (!token) {
      return;
    }
    
    const fileKey = extractFileKey(url);
    const nodeId = extractNodeId(url);
    
    if (!fileKey) {
      return;
    }
    
    try {
      // Получаем структуру файла
      const fileData = await fetchFigmaFile(fileKey, token);
      const targetNodeId = nodeId || fileData.document.id;
      
      // Получаем данные ноды
      const nodeData = await fetchFigmaNode(fileKey, targetNodeId, token);
      const node = nodeData.nodes[targetNodeId];
      
      if (node) {
        const bounds = node.document.absoluteBoundingBox || {};
        previewInfo.textContent = `Размер: ${Math.round(bounds.width || 0)} × ${Math.round(bounds.height || 0)}px`;
        previewContainer.style.display = 'block';
        
        // Экспортируем изображение для предпросмотра
        // Используем формат с двоеточием для экспорта
        const nodeIdForExport = targetNodeId.replace(/-/g, ':');
        const imagesResponse = await fetchFigmaImages(fileKey, [nodeIdForExport], token, 2, 'png');
        
        // Проверяем все возможные форматы node ID
        const nodeIdVariants = [nodeIdForExport, targetNodeId, targetNodeId.replace(/-/g, ':'), targetNodeId.replace(/:/g, '-')];
        let imageUrl = null;
        
        for (const variant of nodeIdVariants) {
          if (imagesResponse.images && imagesResponse.images[variant]) {
            imageUrl = imagesResponse.images[variant];
            break;
          }
        }
        
        if (imageUrl) {
          // Показываем в предпросмотре Figma
          previewImg.src = imageUrl;
        }
      }
    } catch (e) {
      console.warn('Ошибка загрузки предпросмотра:', e);
    }
  }
  
  /**
   * Показывает ошибку
   */
  function showError(message) {
    errorText.textContent = message;
    errorContainer.style.display = 'block';
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  /**
   * Скрывает ошибку
   */
  function hideError() {
    errorContainer.style.display = 'none';
  }
};

