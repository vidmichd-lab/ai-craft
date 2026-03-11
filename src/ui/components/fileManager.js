/**
 * Компонент для управления файлами и папками в logo и assets
 */

import { scanLogos, scanKV, scanBG } from '../../utils/assetScanner.js';

/**
 * API функции для работы с файлами
 */
const api = {
  async uploadFile(file, targetPath) {
    // Читаем файл как blob
    const fileData = await file.arrayBuffer();
    
    const url = `/api/upload?path=${encodeURIComponent(targetPath)}&filename=${encodeURIComponent(file.name)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`
      },
      body: fileData
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Upload failed');
    }
    
    return await response.json();
  },
  
  async createFolder(folderName, targetPath) {
    // Убеждаемся, что путь не пустой и является строкой
    if (!targetPath || typeof targetPath !== 'string') {
      throw new Error('Invalid target path');
    }
    
    const url = `/api/create-folder?path=${encodeURIComponent(targetPath)}&name=${encodeURIComponent(folderName)}`;
    const response = await fetch(url, {
      method: 'POST'
    });
    
    if (!response.ok) {
      let errorMessage = 'Create folder failed';
      try {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      } catch (e) {
        // Если не удалось прочитать текст ошибки, используем статус
        errorMessage = `Create folder failed (${response.status})`;
      }
      throw new Error(errorMessage);
    }
    
    return await response.json();
  },
  
  async deleteFile(filePath) {
    const url = `/api/file?path=${encodeURIComponent(filePath)}`;
    const response = await fetch(url, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Delete file failed');
    }
    
    return await response.json();
  },
  
  async deleteFolder(folderPath) {
    const url = `/api/folder?path=${encodeURIComponent(folderPath)}`;
    const response = await fetch(url, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Delete folder failed');
    }
    
    return await response.json();
  },
  
  async renameFolder(folderPath, newName) {
    const url = `/api/rename-folder?path=${encodeURIComponent(folderPath)}&name=${encodeURIComponent(newName)}`;
    const response = await fetch(url, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Rename folder failed');
    }
    
    return await response.json();
  }
};

/**
 * Получает структуру папок из файловой системы
 */
async function getFolderStructure(basePath) {
  // Используем существующие функции сканирования
  if (basePath === 'logo') {
    const structure = await scanLogos();
    return structure;
  } else if (basePath === 'assets') {
    const structure = await scanKV(); // scanKV и scanBG используют одну структуру
    return structure;
  }
  return {};
}

/**
 * Рендерит UI для управления файлами
 */
export function renderFileManager() {
  // Используем значения по умолчанию
  let borderColor = '#2a2a2a';
  let bgPrimary = '#0d0d0d';
  let textPrimary = '#e9e9e9';
  let textSecondary = '#999999';
  
  // Пытаемся получить CSS переменные, если DOM готов
  try {
    if (typeof document !== 'undefined' && document.documentElement) {
      const computedStyle = getComputedStyle(document.documentElement);
      borderColor = computedStyle.getPropertyValue('--border-color').trim() || borderColor;
      bgPrimary = computedStyle.getPropertyValue('--bg-primary').trim() || bgPrimary;
      textPrimary = computedStyle.getPropertyValue('--text-primary').trim() || textPrimary;
      textSecondary = computedStyle.getPropertyValue('--text-secondary').trim() || textSecondary;
    }
  } catch (e) {
    console.warn('Не удалось получить CSS переменные, используются значения по умолчанию:', e);
  }
  
  // Всегда возвращаем HTML
  return `
    <div style="display: flex; flex-direction: column; gap: 20px; width: 100%; padding: 20px; min-height: 400px; box-sizing: border-box;">
      <div style="padding: 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px;">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <span class="material-icons" style="font-size: 20px; color: #2196F3; flex-shrink: 0; margin-top: 2px;">folder</span>
          <div>
            <div style="font-weight: 600; color: ${textPrimary}; margin-bottom: 4px; font-size: 16px;">Управление файлами</div>
            <div style="font-size: 13px; color: ${textSecondary}; line-height: 1.5;">
              Управляйте папками и файлами в logo и assets. Изображения в assets автоматически конвертируются в WebP с качеством 50%.
            </div>
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${borderColor};">
          <span class="material-icons" style="color: #FF9800; font-size: 20px;">image</span>
          <h3 style="margin: 0; color: ${textPrimary}; font-size: 18px; font-weight: 600;">Папки</h3>
        </div>
        
        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <button class="btn btn-full" id="fileManagerLogoBtn" data-base-path="logo" style="flex: 1; padding: 12px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${borderColor}; border-radius: 6px; color: ${textPrimary}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span class="material-icons" style="font-size: 18px;">account_circle</span>
            <span>Логотипы (logo)</span>
          </button>
          <button class="btn btn-full" id="fileManagerAssetsBtn" data-base-path="assets" style="flex: 1; padding: 12px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${borderColor}; border-radius: 6px; color: ${textPrimary}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span class="material-icons" style="font-size: 18px;">image</span>
            <span>Ассеты (assets)</span>
          </button>
        </div>
        
        <div id="fileManagerContent" style="display: none;">
          <div id="fileManagerBreadcrumb" style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 12px; background: ${bgPrimary}; border: 1px solid ${borderColor}; border-radius: 6px; flex-wrap: wrap;">
            <button class="btn btn-small" id="fileManagerBackBtn" style="display: none; padding: 4px 8px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${borderColor}; border-radius: 4px; color: ${textPrimary}; cursor: pointer;" title="Назад">
              <span class="material-icons" style="font-size: 18px;">arrow_back</span>
            </button>
            <span class="material-icons" style="font-size: 18px; color: ${textSecondary};">folder</span>
            <span id="fileManagerCurrentPath" style="color: ${textPrimary}; font-size: 14px;"></span>
          </div>
          
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <button class="btn" id="fileManagerCreateFolderBtn" style="flex: 1; padding: 10px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${borderColor}; border-radius: 6px; color: ${textPrimary}; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-icons" style="font-size: 18px;">create_new_folder</span>
              <span>Создать папку</span>
            </button>
            <button class="btn" id="fileManagerUploadBtn" style="flex: 1; padding: 10px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${borderColor}; border-radius: 6px; color: ${textPrimary}; cursor: pointer; display: flex; align-items: center; justify-content: center;">
              <span>Загрузить файл</span>
            </button>
            <button class="btn" id="fileManagerRefreshBtn" style="padding: 10px; background: var(--bg-secondary, #1a1a1a); border: 1px solid ${borderColor}; border-radius: 6px; color: ${textPrimary}; cursor: pointer;">
              <span class="material-icons" style="font-size: 18px;">refresh</span>
            </button>
          </div>
          
          <div id="fileManagerTree" style="max-height: 500px; overflow-y: auto; border: 1px solid ${borderColor}; border-radius: 6px; padding: 12px; background: ${bgPrimary}; min-height: 200px;">
            <!-- Дерево файлов будет отрисовано здесь -->
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Инициализирует обработчики событий для управления файлами
 */
export function initFileManager() {
  let currentBasePath = null;
  let currentPath = '';
  let pathHistory = []; // История путей для навигации назад
  
  /**
   * Обновляет отображение текущего пути
   */
  function updateFileManagerPath() {
    const pathElement = document.getElementById('fileManagerCurrentPath');
    const backBtn = document.getElementById('fileManagerBackBtn');
    
    if (pathElement) {
      pathElement.textContent = currentPath || currentBasePath || '';
    }
    
    // Показываем кнопку "Назад", если есть история
    if (backBtn) {
      backBtn.style.display = (pathHistory.length > 0) ? 'inline-flex' : 'none';
    }
  }
  
  /**
   * Переходит в папку
   */
  function navigateToPath(path) {
    if (currentPath) {
      pathHistory.push(currentPath);
    }
    currentPath = path;
    updateFileManagerPath();
    loadFileManagerTree();
  }
  
  /**
   * Возвращается назад
   */
  function navigateBack() {
    if (pathHistory.length > 0) {
      currentPath = pathHistory.pop();
      updateFileManagerPath();
      loadFileManagerTree();
    } else {
      // Возвращаемся в корень
      currentPath = currentBasePath;
      updateFileManagerPath();
      loadFileManagerTree();
    }
  }
  
  /**
   * Загружает и отображает дерево файлов
   */
  async function loadFileManagerTree() {
    if (!currentBasePath) return;
    
    const treeElement = document.getElementById('fileManagerTree');
    if (!treeElement) return;
    
    treeElement.innerHTML = '<div style="text-align: center; padding: var(--spacing-md); color: var(--text-secondary);">Загрузка...</div>';
    
    try {
      const structure = await getFolderStructure(currentBasePath);
      treeElement.innerHTML = renderFileTree(structure, currentBasePath);
      
      // Добавляем обработчики событий
      attachTreeEventHandlers();
    } catch (error) {
      console.error('Ошибка при загрузке дерева файлов:', error);
      treeElement.innerHTML = `<div style="text-align: center; padding: var(--spacing-md); color: #f44336;">Ошибка: ${error.message}</div>`;
    }
  }
  
  /**
   * Получает содержимое папки по пути из структуры
   */
  function getFolderContent(structure, path) {
    if (!path || path === currentBasePath) {
      return structure;
    }
    
    // Убираем базовый путь из начала
    const relativePath = path.startsWith(currentBasePath + '/') 
      ? path.substring(currentBasePath.length + 1)
      : path;
    
    const parts = relativePath.split('/');
    let current = structure;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return current;
  }
  
  /**
   * Проверяет, является ли файл изображением
   */
  function isImageFile(filePath) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const lowerPath = filePath.toLowerCase();
    return imageExtensions.some(ext => lowerPath.endsWith(ext));
  }
  
  /**
   * Рендерит файл с превью (если это изображение) или без
   */
  function renderFileItem(file, isGrid = false) {
    const fileName = file.file.split('/').pop();
    const filePath = file.file;
    const isImage = isImageFile(filePath);
    
    if (isGrid && isImage) {
      // Рендерим в виде карточки с превью
      return `
        <div class="file-manager-item file-manager-image-item" data-type="file" data-path="${filePath}" style="
          position: relative;
          display: flex;
          flex-direction: column;
          border: 1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a'};
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          background: ${getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d'};
        ">
          <div style="
            width: 100%;
            aspect-ratio: 1;
            background: ${getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary') || '#141414'};
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
          ">
            <img src="${filePath}" alt="${fileName}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            " onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="
              display: none;
              width: 100%;
              height: 100%;
              align-items: center;
              justify-content: center;
              color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999'};
            ">
              <span class="material-icons" style="font-size: 32px;">broken_image</span>
            </div>
          </div>
          <div style="
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            min-height: 40px;
          ">
            <span style="
              flex: 1;
              color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9'};
              font-size: 12px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            " title="${fileName}">${fileName}</span>
            <button class="btn btn-small file-manager-delete-btn" data-path="${filePath}" data-type="file" style="
              padding: 4px;
              opacity: 0.7;
              flex-shrink: 0;
            " title="Удалить" onclick="event.stopPropagation();">
              <span class="material-icons" style="font-size: 16px;">delete</span>
            </button>
          </div>
        </div>
      `;
    } else {
      // Рендерим в виде строки (для не-изображений или списка)
      return `
        <div class="file-manager-item" data-type="file" data-path="${filePath}" style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); margin-left: 0px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s;">
          ${isImage ? `<img src="${filePath}" alt="${fileName}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; flex-shrink: 0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"><span class="material-icons" style="font-size: 18px; color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999'}; display: none;">insert_drive_file</span>` : `<span class="material-icons" style="font-size: 18px; color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999'};">insert_drive_file</span>`}
          <span style="flex: 1; color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9'}; font-size: var(--font-size-sm);">${fileName}</span>
          <button class="btn btn-small file-manager-delete-btn" data-path="${filePath}" data-type="file" style="padding: 4px 8px; opacity: 0.7;" title="Удалить">
            <span class="material-icons" style="font-size: 16px;">delete</span>
          </button>
        </div>
      `;
    }
  }
  
  /**
   * Рендерит дерево файлов
   */
  function renderFileTree(structure, basePath, level = 0) {
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#2a2a2a';
    const bgPrimary = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0d0d0d';
    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9';
    const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999';
    
    // Получаем содержимое текущей папки
    const currentContent = getFolderContent(structure, currentPath);
    
    if (!currentContent) {
      return `<div style="text-align: center; padding: var(--spacing-md); color: ${textSecondary};">Папка не найдена</div>`;
    }
    
    let html = '';
    
    // Рендерим содержимое текущей папки
    if (Array.isArray(currentContent)) {
      // Это массив файлов
      if (currentContent.length === 0) {
        html = `<div style="text-align: center; padding: var(--spacing-md); color: ${textSecondary};">Папка пуста</div>`;
      } else {
        // Проверяем, есть ли изображения для отображения в grid
        const hasImages = currentContent.some(file => isImageFile(file.file));
        
        if (hasImages) {
          // Отображаем в виде сетки с превью
          html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; padding: 8px;">`;
          currentContent.forEach(file => {
            html += renderFileItem(file, true);
          });
          html += `</div>`;
        } else {
          // Отображаем в виде списка
          currentContent.forEach(file => {
            html += renderFileItem(file, false);
          });
        }
      }
    } else if (typeof currentContent === 'object' && currentContent !== null) {
      // Это объект (папка с подпапками или файлами)
      const keys = Object.keys(currentContent);
      
      if (keys.length === 0) {
        html = `<div style="text-align: center; padding: var(--spacing-md); color: ${textSecondary};">Папка пуста</div>`;
      } else {
        // Сначала отображаем папки
        keys.forEach(key => {
          const subPath = currentPath ? `${currentPath}/${key}` : key;
          const subValue = currentContent[key];
          
          // Проверяем, является ли это папкой (объект) или файлами (массив)
          const isFolder = typeof subValue === 'object' && !Array.isArray(subValue);
          
          if (isFolder) {
            // Это подпапка
            html += `
              <div class="file-manager-item" data-type="folder" data-path="${subPath}" style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); margin-left: 0px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s;">
                <span class="material-icons" style="font-size: 18px; color: ${textSecondary};">folder</span>
                <span class="file-manager-folder-name" style="flex: 1; color: ${textPrimary}; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${key}</span>
                <button class="btn btn-small file-manager-rename-btn" data-path="${subPath}" data-type="folder" style="padding: 4px 8px; opacity: 0.7;" title="Переименовать">
                  <span class="material-icons" style="font-size: 16px;">edit</span>
                </button>
                <button class="btn btn-small file-manager-delete-btn" data-path="${subPath}" data-type="folder" style="padding: 4px 8px; opacity: 0.7;" title="Удалить">
                  <span class="material-icons" style="font-size: 16px;">delete</span>
                </button>
              </div>
            `;
          }
        });
        
        // Затем отображаем файлы
        keys.forEach(key => {
          const subPath = currentPath ? `${currentPath}/${key}` : key;
          const subValue = currentContent[key];
          
          if (Array.isArray(subValue) && subValue.length > 0) {
            // Это массив файлов
            const hasImages = subValue.some(file => isImageFile(file.file));
            
            if (hasImages) {
              // Отображаем в виде сетки с превью
              html += `<div style="margin-top: 16px; margin-bottom: 8px; color: ${textPrimary}; font-size: 14px; font-weight: 600;">${key}</div>`;
              html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; padding: 8px; margin-bottom: 16px;">`;
              subValue.forEach(file => {
                html += renderFileItem(file, true);
              });
              html += `</div>`;
            } else {
              // Отображаем в виде списка
              subValue.forEach(file => {
                html += renderFileItem(file, false);
              });
            }
          }
        });
      }
    } else {
      html = `<div style="text-align: center; padding: var(--spacing-md); color: ${textSecondary};">Папка пуста</div>`;
    }
    
    return html;
  }
  
  /**
   * Прикрепляет обработчики событий к элементам дерева
   */
  function attachTreeEventHandlers() {
    // Обработчики для папок (навигация)
    document.querySelectorAll('.file-manager-item[data-type="folder"]').forEach(item => {
      item.addEventListener('click', (e) => {
        // Игнорируем клики на кнопки
        if (e.target.closest('.file-manager-delete-btn') || 
            e.target.closest('.file-manager-rename-btn')) {
          return;
        }
        
        const folderPath = item.dataset.path;
        // Если мы уже в этой папке, не делаем ничего
        if (folderPath === currentPath) return;
        
        navigateToPath(folderPath);
      });
      
      // Hover эффект
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--bg-secondary, #1a1a1a)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
    });
    
    // Обработчики переименования папок
    document.querySelectorAll('.file-manager-rename-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const folderPath = btn.dataset.path;
        const folderName = folderPath.split('/').pop();
        const nameSpan = btn.closest('.file-manager-item').querySelector('.file-manager-folder-name');
        
        // Создаем input для редактирования
        const input = document.createElement('input');
        input.type = 'text';
        input.value = folderName;
        input.style.cssText = `
          flex: 1;
          padding: 4px 8px;
          background: var(--bg-primary, #0d0d0d);
          border: 1px solid var(--accent-color, #027EF2);
          border-radius: 4px;
          color: var(--text-primary, #e9e9e9);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
        `;
        
        // Заменяем span на input
        nameSpan.style.display = 'none';
        nameSpan.parentNode.insertBefore(input, nameSpan);
        input.focus();
        input.select();
        
        const finishRename = async () => {
          const newName = input.value.trim();
          if (!newName || newName === folderName) {
            // Отменяем переименование
            input.remove();
            nameSpan.style.display = '';
            return;
          }
          
          // Проверяем на недопустимые символы
          if (newName.includes('/') || newName.includes('\\')) {
            alert('Имя папки не может содержать символы / или \\');
            input.focus();
            return;
          }
          
          try {
            await api.renameFolder(folderPath, newName);
            await loadFileManagerTree();
            await refreshLibraries();
            // Обновляем превью в админке
            if (typeof window.updateLogoAssetsPreview === 'function') {
              window.updateLogoAssetsPreview();
            }
          } catch (error) {
            alert(`Ошибка при переименовании: ${error.message}`);
            input.focus();
          }
        };
        
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            finishRename();
          } else if (e.key === 'Escape') {
            input.remove();
            nameSpan.style.display = '';
          }
        });
      });
    });
    
    // Обработчики для файлов (замена)
    document.querySelectorAll('.file-manager-item[data-type="file"]').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.file-manager-delete-btn')) return;
        
        // При клике на файл предлагаем заменить его
        const filePath = item.dataset.path;
        const fileName = filePath.split('/').pop();
        
        const replaceInput = document.createElement('input');
        replaceInput.type = 'file';
        replaceInput.accept = 'image/*';
        replaceInput.style.display = 'none';
        document.body.appendChild(replaceInput);
        
        replaceInput.addEventListener('change', async (e) => {
          if (!e.target.files.length) return;
          
          const file = e.target.files[0];
          const targetDir = filePath.substring(0, filePath.lastIndexOf('/'));
          
          try {
            // Сначала удаляем старый файл
            await api.deleteFile(filePath);
            // Затем загружаем новый
            await api.uploadFile(file, targetDir);
            await loadFileManagerTree();
            await refreshLibraries();
            // Обновляем превью в админке
            if (typeof window.updateLogoAssetsPreview === 'function') {
              window.updateLogoAssetsPreview();
            }
            alert('Файл заменен успешно');
          } catch (error) {
            alert(`Ошибка при замене файла: ${error.message}`);
          }
          
          document.body.removeChild(replaceInput);
        });
        
        replaceInput.click();
      });
      
      // Hover эффект
      item.addEventListener('mouseenter', () => {
        if (!item.classList.contains('file-manager-image-item')) {
          item.style.background = 'var(--bg-secondary, #1a1a1a)';
        } else {
          item.style.transform = 'translateY(-2px)';
          item.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }
      });
      item.addEventListener('mouseleave', () => {
        if (!item.classList.contains('file-manager-image-item')) {
          item.style.background = 'transparent';
        } else {
          item.style.transform = 'translateY(0)';
          item.style.boxShadow = 'none';
        }
      });
    });
    
    // Обработчики удаления
    document.querySelectorAll('.file-manager-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const path = btn.dataset.path;
        const type = btn.dataset.type;
        const name = path.split('/').pop();
        
        if (!confirm(`Вы уверены, что хотите удалить ${type === 'folder' ? 'папку' : 'файл'} "${name}"?`)) {
          return;
        }
        
        try {
          if (type === 'folder') {
            await api.deleteFolder(path);
          } else {
            await api.deleteFile(path);
          }
          await loadFileManagerTree();
          await refreshLibraries();
          // Обновляем превью в админке, если удаленный файл был выбран
          if (typeof window.updateLogoAssetsPreview === 'function') {
            window.updateLogoAssetsPreview();
          }
          alert('Удалено успешно');
        } catch (error) {
          alert(`Ошибка при удалении: ${error.message}`);
        }
      });
    });
  }
  
  /**
   * Обновляет библиотеки в интерфейсе
   */
  async function refreshLibraries() {
    // Очищаем кэш сканирования
    if (window.AVAILABLE_LOGOS) {
      window.AVAILABLE_LOGOS = null;
    }
    if (window.AVAILABLE_KV) {
      window.AVAILABLE_KV = null;
    }
    if (window.AVAILABLE_BG) {
      window.AVAILABLE_BG = null;
    }
    
    // Очищаем кэш проверки файлов
    const { checkFileExists } = await import('../../utils/assetScanner.js');
    if (checkFileExists && checkFileExists.cache) {
      checkFileExists.cache.clear();
    }
    
    // Обновляем превью в админке логотипов и ассетов, если она открыта
    const logoAssetsAdmin = document.getElementById('logoAssetsAdminModal');
    if (logoAssetsAdmin && typeof window.updateLogoAssetsPreview === 'function') {
      try {
        window.updateLogoAssetsPreview();
      } catch (e) {
        console.warn('Не удалось обновить превью в админке:', e);
      }
    }
    
    // Обновляем модальные окна выбора, если они открыты
    const logoSelectModal = document.querySelector('.logo-select-modal');
    const kvSelectModal = document.querySelector('.kv-select-modal');
    const bgSelectModal = document.querySelector('.bg-select-modal');
    
    if (logoSelectModal && typeof window.refreshLogoSelectModal === 'function') {
      try {
        window.refreshLogoSelectModal();
      } catch (e) {
        console.warn('Не удалось обновить модальное окно выбора логотипа:', e);
      }
    }
    
    if (kvSelectModal && typeof window.refreshKVSelectModal === 'function') {
      try {
        window.refreshKVSelectModal();
      } catch (e) {
        console.warn('Не удалось обновить модальное окно выбора KV:', e);
      }
    }
    
    if (bgSelectModal && typeof window.refreshBGSelectModal === 'function') {
      try {
        window.refreshBGSelectModal();
      } catch (e) {
        console.warn('Не удалось обновить модальное окно выбора фона:', e);
      }
    }
    
    console.log('Библиотеки обновлены. Модальные окна обновлены автоматически.');
  }
  
  // Обработчики для кнопок выбора базовой папки
  const logoBtn = document.getElementById('fileManagerLogoBtn');
  const assetsBtn = document.getElementById('fileManagerAssetsBtn');
  const contentDiv = document.getElementById('fileManagerContent');
  
  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      currentBasePath = 'logo';
      currentPath = 'logo';
      pathHistory = [];
      if (contentDiv) contentDiv.style.display = 'block';
      updateFileManagerPath();
      loadFileManagerTree();
      
      // Обновляем активную кнопку
      logoBtn.style.background = 'var(--accent-color, #027EF2)';
      logoBtn.style.color = 'white';
      if (assetsBtn) {
        assetsBtn.style.background = 'var(--bg-secondary, #1a1a1a)';
        assetsBtn.style.color = 'var(--text-primary, #e9e9e9)';
      }
    });
  }
  
  if (assetsBtn) {
    assetsBtn.addEventListener('click', () => {
      currentBasePath = 'assets';
      currentPath = 'assets';
      pathHistory = [];
      if (contentDiv) contentDiv.style.display = 'block';
      updateFileManagerPath();
      loadFileManagerTree();
      
      // Обновляем активную кнопку
      assetsBtn.style.background = 'var(--accent-color, #027EF2)';
      assetsBtn.style.color = 'white';
      if (logoBtn) {
        logoBtn.style.background = 'var(--bg-secondary, #1a1a1a)';
        logoBtn.style.color = 'var(--text-primary, #e9e9e9)';
      }
    });
  }
  
  // Обработчик кнопки "Назад"
  const backBtn = document.getElementById('fileManagerBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', navigateBack);
  }
  
  // Обработчик кнопки "Создать папку"
  const createFolderBtn = document.getElementById('fileManagerCreateFolderBtn');
  if (createFolderBtn) {
    createFolderBtn.addEventListener('click', async () => {
      if (!currentBasePath) {
        alert('Сначала выберите папку (logo или assets)');
        return;
      }
      
      const folderName = prompt('Введите имя новой папки:');
      if (!folderName || !folderName.trim()) {
        return;
      }
      
      // Проверяем на недопустимые символы
      if (folderName.includes('/') || folderName.includes('\\')) {
        alert('Имя папки не может содержать символы / или \\');
        return;
      }
      
      try {
        // Используем currentPath, если он установлен и не пустой, иначе используем currentBasePath
        let targetPath = '';
        if (currentPath && currentPath.trim() && currentPath !== currentBasePath) {
          targetPath = currentPath;
        } else if (currentBasePath) {
          targetPath = currentBasePath;
        }
        
        if (!targetPath || !targetPath.trim()) {
          alert('Ошибка: не выбран путь для создания папки');
          return;
        }
        
        // Убеждаемся, что путь нормализован (без начальных/конечных слэшей)
        targetPath = targetPath.trim().replace(/^\/+|\/+$/g, '');
        
        console.log('Создание папки:', { folderName: folderName.trim(), targetPath });
        await api.createFolder(folderName.trim(), targetPath);
        await loadFileManagerTree();
        await refreshLibraries();
        // Обновляем превью в админке
        if (typeof window.updateLogoAssetsPreview === 'function') {
          window.updateLogoAssetsPreview();
        }
        alert('Папка создана успешно');
      } catch (error) {
        console.error('Ошибка при создании папки:', error);
        alert(`Ошибка при создании папки: ${error.message}`);
      }
    });
  }
  
  // Обработчик кнопки "Загрузить файл"
  const uploadBtn = document.getElementById('fileManagerUploadBtn');
  if (uploadBtn) {
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/*';
    uploadInput.multiple = true;
    uploadInput.style.display = 'none';
    document.body.appendChild(uploadInput);
    
    uploadBtn.addEventListener('click', () => {
      if (!currentBasePath) {
        alert('Сначала выберите папку (logo или assets)');
        return;
      }
      uploadInput.click();
    });
    
    uploadInput.addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      
      const targetPath = currentPath || currentBasePath;
      const files = Array.from(e.target.files);
      
      try {
        for (const file of files) {
          await api.uploadFile(file, targetPath);
        }
        await loadFileManagerTree();
        await refreshLibraries();
        // Обновляем превью в админке
        if (typeof window.updateLogoAssetsPreview === 'function') {
          window.updateLogoAssetsPreview();
        }
        alert(`Загружено файлов: ${files.length}`);
      } catch (error) {
        alert(`Ошибка при загрузке файлов: ${error.message}`);
      }
      
      // Очищаем input
      uploadInput.value = '';
    });
  }
  
  // Обработчик кнопки "Обновить"
  const refreshBtn = document.getElementById('fileManagerRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadFileManagerTree();
      await refreshLibraries();
      // Обновляем превью в админке
      if (typeof window.updateLogoAssetsPreview === 'function') {
        window.updateLogoAssetsPreview();
      }
    });
  }
}

