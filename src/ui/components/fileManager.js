/**
 * Компонент для управления файлами и папками в logo и assets
 */

import { scanLogos, scanKV, scanBG } from '../../utils/assetScanner.js';
import { deleteRemoteObject, isRemoteMediaEnabled, publishRemoteObject, uploadRemoteFile } from '../../utils/remoteMediaApi.js';

const isRemoteFilePath = (filePath) => typeof filePath === 'string' && /^(https?:)?\/\//i.test(filePath);
const REMOTE_ASSETS_FOLDERS_STORAGE_KEY = 'file-manager-remote-assets-folders';

const parseRemoteAssetsTargetPath = (targetPath) => {
  if (typeof targetPath !== 'string') return null;

  const normalized = targetPath.trim().replace(/^\/+|\/+$/g, '');
  if (!normalized.startsWith('assets/')) return null;

  const parts = normalized.split('/');
  if (parts.length !== 3) return null;

  const [, folder1, folder2] = parts;
  if (!folder1 || !folder2) return null;

  return { folder1, folder2 };
};

const normalizeFolderSegment = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^\/+|\/+$/g, '');
};

const normalizeRemoteFolderRegistryEntry = (value) => {
  const normalized = normalizeFolderSegment(value);
  if (!normalized.startsWith('assets/')) return '';

  const parts = normalized.split('/').filter(Boolean);
  if (parts[0] !== 'assets') return '';
  if (parts.length === 2 && parts[1]) {
    return `assets/${parts[1]}`;
  }
  if (parts.length === 3 && parts[1] && parts[2]) {
    return `assets/${parts[1]}/${parts[2]}`;
  }

  return '';
};

const loadRemoteAssetsFolderRegistry = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(REMOTE_ASSETS_FOLDERS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return Array.from(new Set(parsed.map(normalizeRemoteFolderRegistryEntry).filter(Boolean))).sort();
  } catch (error) {
    console.warn('Не удалось прочитать реестр remote-папок:', error);
    return [];
  }
};

const saveRemoteAssetsFolderRegistry = (folders) => {
  if (typeof window === 'undefined') return;

  const normalized = Array.from(new Set((folders || []).map(normalizeRemoteFolderRegistryEntry).filter(Boolean))).sort();
  window.localStorage.setItem(REMOTE_ASSETS_FOLDERS_STORAGE_KEY, JSON.stringify(normalized));
};

const registerRemoteAssetsFolder = (folderPath) => {
  const normalized = normalizeRemoteFolderRegistryEntry(folderPath);
  if (!normalized) return [];

  const next = Array.from(new Set([...loadRemoteAssetsFolderRegistry(), normalized])).sort();
  saveRemoteAssetsFolderRegistry(next);
  return next;
};

const unregisterRemoteAssetsFolder = (folderPath) => {
  const normalized = normalizeRemoteFolderRegistryEntry(folderPath);
  if (!normalized) return [];

  const next = loadRemoteAssetsFolderRegistry().filter((item) => item !== normalized && !item.startsWith(`${normalized}/`));
  saveRemoteAssetsFolderRegistry(next);
  return next;
};

const mergeRemoteAssetsFoldersIntoStructure = (structure, folders) => {
  const target = structure && typeof structure === 'object' ? structure : {};

  (folders || []).forEach((folderPath) => {
    const normalized = normalizeRemoteFolderRegistryEntry(folderPath);
    if (!normalized) return;

    const [, folder1, folder2] = normalized.split('/');
    if (!target[folder1] || typeof target[folder1] !== 'object' || Array.isArray(target[folder1])) {
      target[folder1] = {};
    }
    if (!folder2) return;
    if (!target[folder1][folder2] || typeof target[folder1][folder2] !== 'object' || Array.isArray(target[folder1][folder2])) {
      target[folder1][folder2] = {};
    }
  });

  return target;
};

const parsePathSegmentsFromUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return [];

  const trimmed = value.trim();
  const withoutQuery = trimmed.split('?')[0];

  if (!isRemoteFilePath(trimmed)) {
    return withoutQuery.split('/').filter(Boolean);
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    return url.pathname.split('/').filter(Boolean);
  } catch {
    return withoutQuery.split('/').filter(Boolean);
  }
};

const inferFileNameFromPath = (value) => {
  const parts = parsePathSegmentsFromUrl(value);
  return parts.length > 0 ? parts[parts.length - 1] : '';
};

const buildDisplayFileName = (file) => {
  const explicitName = typeof file?.name === 'string' ? file.name.trim() : '';
  const inferredFileName = inferFileNameFromPath(file?.file);

  if (explicitName && /\.[a-z0-9]{2,5}$/i.test(explicitName)) {
    return explicitName;
  }

  if (inferredFileName) {
    if (explicitName && !/\.[a-z0-9]{2,5}$/i.test(explicitName)) {
      const extMatch = inferredFileName.match(/(\.[a-z0-9]{2,5})$/i);
      if (extMatch) {
        return `${explicitName}${extMatch[1]}`;
      }
    }
    return inferredFileName;
  }

  return explicitName || 'file';
};

/**
 * API функции для работы с файлами
 */
const api = {
  async uploadFile(file, targetPath) {
    const remoteEnabled = await isRemoteMediaEnabled().catch(() => false);
    const remoteTarget = remoteEnabled ? parseRemoteAssetsTargetPath(targetPath) : null;

    if (remoteTarget) {
      return uploadRemoteFile({
        file,
        folder1: remoteTarget.folder1,
        folder2: remoteTarget.folder2,
        visibility: 'published'
      });
    }

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
          
          <div id="fileManagerHint" style="display: none; margin-bottom: 16px; padding: 10px 12px; background: rgba(33, 150, 243, 0.1); border-left: 3px solid #2196F3; border-radius: 4px; color: ${textSecondary}; font-size: 13px; line-height: 1.45;"></div>
          
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
  let latestStructure = null;
  let pendingUploadTargetPath = '';

  const getRemoteAssetsTarget = () => parseRemoteAssetsTargetPath(currentPath || currentBasePath || '');
  const getCurrentAssetsDepth = () => (currentPath || currentBasePath || '').split('/').filter(Boolean).length;

  const getRemoteAssetsSubfolders = () => {
    if (!latestStructure || currentBasePath !== 'assets') return [];

    const currentContent = getFolderContent(latestStructure, currentPath);
    if (!currentContent || typeof currentContent !== 'object' || Array.isArray(currentContent)) {
      return [];
    }

    return Object.entries(currentContent)
      .filter(([, value]) => Array.isArray(value))
      .map(([key]) => key)
      .sort();
  };

  const getRemoteFolderKeys = (node) => {
    if (!node) return [];

    if (Array.isArray(node)) {
      return node
        .map((item) => (typeof item?.key === 'string' ? item.key : ''))
        .filter(Boolean);
    }

    if (typeof node !== 'object') return [];

    return Object.values(node).flatMap((value) => getRemoteFolderKeys(value));
  };

  const resolveRemoteUploadTargetPath = () => {
    const directTarget = getRemoteAssetsTarget();
    if (directTarget) {
      return `assets/${directTarget.folder1}/${directTarget.folder2}`;
    }

    const pathParts = (currentPath || '').split('/').filter(Boolean);
    if (pathParts.length !== 2 || pathParts[0] !== 'assets') {
      return '';
    }

    const options = getRemoteAssetsSubfolders();
    if (options.length === 0) {
      return '';
    }

    if (options.length === 1) {
      return `${currentPath}/${options[0]}`;
    }

    const selected = prompt(
      `Выберите подпапку для загрузки: ${options.join(', ')}`,
      options[0]
    );

    if (!selected) {
      return '';
    }

    const normalized = selected.trim();
    if (!options.includes(normalized)) {
      alert(`Допустимые папки: ${options.join(', ')}`);
      return '';
    }

    return `${currentPath}/${normalized}`;
  };

  const setButtonDisabled = (button, disabled) => {
    if (!button) return;
    button.disabled = disabled;
    button.style.opacity = disabled ? '0.55' : '1';
    button.style.cursor = disabled ? 'not-allowed' : 'pointer';
  };

  const updateFileManagerActions = async () => {
    const createFolderBtn = document.getElementById('fileManagerCreateFolderBtn');
    const uploadBtn = document.getElementById('fileManagerUploadBtn');
    const hint = document.getElementById('fileManagerHint');

    const remoteMediaEnabled = await isRemoteMediaEnabled().catch(() => false);
    const remoteAssetsEnabled = currentBasePath === 'assets' && remoteMediaEnabled;
    const remoteLogoMode = currentBasePath === 'logo' && remoteMediaEnabled;
    const remoteTarget = remoteAssetsEnabled ? getRemoteAssetsTarget() : null;
    const remoteSubfolders = remoteAssetsEnabled ? getRemoteAssetsSubfolders() : [];
    const canChooseRemoteSubfolder = !remoteTarget && remoteSubfolders.length > 0;
    const canCreateRemoteFolder = remoteAssetsEnabled && getCurrentAssetsDepth() <= 2;

    setButtonDisabled(createFolderBtn, remoteLogoMode || (remoteAssetsEnabled ? !canCreateRemoteFolder : false));
    setButtonDisabled(uploadBtn, remoteLogoMode || (remoteAssetsEnabled && !remoteTarget && !canChooseRemoteSubfolder));

    if (!hint) return;

    if (remoteLogoMode) {
      hint.style.display = 'block';
      hint.textContent = 'Логотипы теперь ожидаются только из remote manifest. Локальное управление папками logo через этот UI отключено.';
      return;
    }

    if (remoteAssetsEnabled && !remoteTarget) {
      hint.style.display = 'block';
      if (getCurrentAssetsDepth() === 1) {
        hint.textContent = 'В корне assets можно создавать категории. Откройте категорию, чтобы создать внутри неё папку или загрузить туда файлы.';
        return;
      }

      hint.textContent = canChooseRemoteSubfolder
        ? `Вы находитесь в ${currentPath}. Можно создать новую подпапку или выбрать существующую: ${remoteSubfolders.join(', ')}.`
        : 'В этой категории пока нет подпапок. Создайте папку и после этого загружайте в неё файлы.';
      return;
    }

    if (remoteAssetsEnabled && remoteTarget) {
      hint.style.display = 'block';
      hint.textContent = `Remote media активно. Загрузка пойдёт в assets/${remoteTarget.folder1}/${remoteTarget.folder2}.`;
      return;
    }

    hint.style.display = 'none';
    hint.textContent = '';
  };
  
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

    void updateFileManagerActions();
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
      let structure = await getFolderStructure(currentBasePath);
      if (currentBasePath === 'assets' && await isRemoteMediaEnabled().catch(() => false)) {
        structure = mergeRemoteAssetsFoldersIntoStructure(structure, loadRemoteAssetsFolderRegistry());
      }
      latestStructure = structure;
      treeElement.innerHTML = renderFileTree(structure, currentBasePath);
      
      // Добавляем обработчики событий
      attachTreeEventHandlers();
      await updateFileManagerActions();
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
    const lowerPath = String(filePath || '').split('?')[0].toLowerCase();
    return imageExtensions.some(ext => lowerPath.endsWith(ext));
  }
  
  /**
   * Рендерит файл с превью (если это изображение) или без
   */
  function renderFileItem(file, isGrid = false) {
    const fileName = buildDisplayFileName(file);
    const filePath = file.file;
    const isImage = isImageFile(filePath);
    const remoteKey = typeof file.key === 'string' ? file.key : '';
    const visibility = typeof file.visibility === 'string' ? file.visibility : 'published';
    const source = typeof file.source === 'string' ? file.source : (isRemoteFilePath(filePath) ? 'remote' : 'local');
    const publishButton = source === 'remote'
      ? `
            <button class="btn btn-small file-manager-publish-btn" data-path="${filePath}"${remoteKey ? ` data-remote-key="${remoteKey}"` : ''} data-source="${source}" data-visibility="${visibility}" style="
              padding: 4px;
              opacity: 0.7;
              flex-shrink: 0;
            " title="${visibility === 'draft' ? 'Опубликовать' : 'Снять с публикации'}" onclick="event.stopPropagation();">
              <span class="material-icons" style="font-size: 16px;">${visibility === 'draft' ? 'publish' : 'visibility_off'}</span>
            </button>
          `
      : '';
    const dataAttrs = `${remoteKey ? ` data-remote-key="${remoteKey}"` : ''} data-source="${source}" data-visibility="${visibility}"`;
    
    if (isGrid && isImage) {
      // Рендерим в виде карточки с превью
      return `
        <div class="file-manager-item file-manager-image-item" data-type="file" data-path="${filePath}"${dataAttrs} style="
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
            ${publishButton}
            <button class="btn btn-small file-manager-delete-btn" data-path="${filePath}" data-type="file"${remoteKey ? ` data-remote-key="${remoteKey}"` : ''} data-source="${source}" style="
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
        <div class="file-manager-item" data-type="file" data-path="${filePath}"${dataAttrs} style="display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs); margin-left: 0px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s;">
          ${isImage ? `<img src="${filePath}" alt="${fileName}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; flex-shrink: 0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"><span class="material-icons" style="font-size: 18px; color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999'}; display: none;">insert_drive_file</span>` : `<span class="material-icons" style="font-size: 18px; color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#999999'};">insert_drive_file</span>`}
          <span style="flex: 1; color: ${getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e9e9e9'}; font-size: var(--font-size-sm);">${fileName}</span>
          ${publishButton}
          <button class="btn btn-small file-manager-delete-btn" data-path="${filePath}" data-type="file"${remoteKey ? ` data-remote-key="${remoteKey}"` : ''} data-source="${source}" style="padding: 4px 8px; opacity: 0.7;" title="Удалить">
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

          if (currentBasePath === 'assets' && await isRemoteMediaEnabled().catch(() => false)) {
            alert('Переименование папок в assets отключено, пока не появится отдельный remote folder API.');
            input.remove();
            nameSpan.style.display = '';
            return;
          }

          if (currentBasePath === 'logo' && await isRemoteMediaEnabled().catch(() => false)) {
            alert('Переименование папок logo отключено: логотипы теперь берутся только из remote manifest.');
            input.remove();
            nameSpan.style.display = '';
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
        if (e.target.closest('.file-manager-delete-btn') || e.target.closest('.file-manager-publish-btn')) return;
        
        // При клике на файл предлагаем заменить его
        const filePath = item.dataset.path;
        if (isRemoteFilePath(filePath)) {
          alert('Замена remote-файлов через UI пока не поддерживается. Для них сначала нужен отдельный replace/delete API.');
          return;
        }
        
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
        const remoteKey = btn.dataset.remoteKey || '';
        const source = btn.dataset.source || '';
        const type = btn.dataset.type;
        const name = type === 'folder' ? path.split('/').pop() : buildDisplayFileName({ file: path });
        
        if (!confirm(`Вы уверены, что хотите удалить ${type === 'folder' ? 'папку' : 'файл'} "${name}"?`)) {
          return;
        }
        
        try {
          if (type === 'folder') {
            if (currentBasePath === 'logo' && await isRemoteMediaEnabled().catch(() => false)) {
              throw new Error('Удаление папок logo через локальный API отключено: логотипы теперь remote-only.');
            }
            if (currentBasePath === 'assets' && await isRemoteMediaEnabled().catch(() => false)) {
              const folderNode = getFolderContent(latestStructure, path);
              const remoteKeys = Array.from(new Set(getRemoteFolderKeys(folderNode)));

              for (const key of remoteKeys) {
                await deleteRemoteObject({ key });
              }
              unregisterRemoteAssetsFolder(path);
            } else {
              await api.deleteFolder(path);
            }
          } else {
            if (source === 'remote' || isRemoteFilePath(path)) {
              if (!remoteKey) {
                throw new Error('Для remote-файла не найден object key.');
              }
              await deleteRemoteObject({ key: remoteKey });
            } else {
              await api.deleteFile(path);
            }
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

    document.querySelectorAll('.file-manager-publish-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const remoteKey = btn.dataset.remoteKey || '';
        const visibility = btn.dataset.visibility === 'draft' ? 'draft' : 'published';
        const nextVisibility = visibility === 'draft' ? 'published' : 'draft';

        if (!remoteKey) {
          alert('Для remote-файла не найден object key.');
          return;
        }

        try {
          await publishRemoteObject({ key: remoteKey, visibility: nextVisibility });
          await loadFileManagerTree();
          await refreshLibraries();
          if (typeof window.updateLogoAssetsPreview === 'function') {
            window.updateLogoAssetsPreview();
          }
          alert(nextVisibility === 'published' ? 'Файл опубликован' : 'Файл снят с публикации');
        } catch (error) {
          alert(`Ошибка при смене статуса публикации: ${error.message}`);
        }
      });
    });
  }
  
  /**
   * Обновляет библиотеки в интерфейсе
   */
  async function refreshLibraries() {
    // Очищаем кэши сканирования
    const { resetAssetScannerCaches } = await import('../../utils/assetScanner.js');
    if (typeof resetAssetScannerCaches === 'function') {
      resetAssetScannerCaches();
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

      if (currentBasePath === 'logo' && await isRemoteMediaEnabled().catch(() => false)) {
        alert('Создание папок logo через локальный UI отключено: логотипы теперь remote-only.');
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

        if (currentBasePath === 'assets' && await isRemoteMediaEnabled().catch(() => false)) {
          const targetDepth = targetPath.split('/').filter(Boolean).length;
          let remoteFolderPath = '';

          if (targetDepth === 1) {
            remoteFolderPath = `assets/${folderName.trim()}`;
          } else if (targetDepth === 2) {
            remoteFolderPath = `${targetPath}/${folderName.trim()}`;
          } else {
            throw new Error('Для remote assets доступны только два уровня: assets/{категория}/{папка}.');
          }

          registerRemoteAssetsFolder(remoteFolderPath);
          await loadFileManagerTree();
          await refreshLibraries();
          if (typeof window.updateLogoAssetsPreview === 'function') {
            window.updateLogoAssetsPreview();
          }
          alert('Папка создана успешно');
          return;
        }
        
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

      if (currentBasePath === 'logo') {
        isRemoteMediaEnabled().then((remoteEnabled) => {
          if (remoteEnabled) {
            alert('Загрузка логотипов через локальный UI отключена: логотипы теперь remote-only.');
            return;
          }
          pendingUploadTargetPath = currentPath || currentBasePath;
          uploadInput.click();
        }).catch(() => {
          pendingUploadTargetPath = currentPath || currentBasePath;
          uploadInput.click();
        });
        return;
      }

      const targetPath = currentPath || currentBasePath;
      if (currentBasePath === 'assets') {
        isRemoteMediaEnabled().then((remoteEnabled) => {
          if (remoteEnabled && !parseRemoteAssetsTargetPath(targetPath)) {
            const resolvedTargetPath = resolveRemoteUploadTargetPath();
            if (!resolvedTargetPath) {
              return;
            }
            pendingUploadTargetPath = resolvedTargetPath;
            uploadInput.click();
            return;
          }
          pendingUploadTargetPath = targetPath;
          uploadInput.click();
        }).catch(() => {
          pendingUploadTargetPath = targetPath;
          uploadInput.click();
        });
        return;
      }

      pendingUploadTargetPath = targetPath;
      uploadInput.click();
    });
    
    uploadInput.addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      
      const targetPath = pendingUploadTargetPath || currentPath || currentBasePath;
      const files = Array.from(e.target.files);
      const remoteEnabled = currentBasePath === 'assets' ? await isRemoteMediaEnabled().catch(() => false) : false;
      
      try {
        if (remoteEnabled && !parseRemoteAssetsTargetPath(targetPath)) {
          throw new Error('Для remote assets выберите конкретную папку вида assets/{folder1}/{folder2}');
        }

        for (const file of files) {
          await api.uploadFile(file, targetPath);
        }
        if (remoteEnabled && parseRemoteAssetsTargetPath(targetPath)) {
          registerRemoteAssetsFolder(targetPath);
        }
        await loadFileManagerTree();
        await refreshLibraries();
        // Обновляем превью в админке
        if (typeof window.updateLogoAssetsPreview === 'function') {
          window.updateLogoAssetsPreview();
        }
        alert(remoteEnabled ? `Загружено в remote media: ${files.length}` : `Загружено файлов: ${files.length}`);
      } catch (error) {
        alert(`Ошибка при загрузке файлов: ${error.message}`);
      }
      
      // Очищаем input
      pendingUploadTargetPath = '';
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
