/**
 * Модуль для работы с Figma API
 * Обеспечивает получение данных макетов и экспорт изображений
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

/**
 * Извлекает file key из URL Figma
 * @param {string} url - URL макета Figma
 * @returns {string|null} - File key или null
 */
export const extractFileKey = (url) => {
  try {
    // Формат: https://www.figma.com/file/FILE_KEY/...
    // или: https://www.figma.com/design/FILE_KEY/...
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch (e) {
    console.error('Ошибка извлечения file key:', e);
    return null;
  }
};

/**
 * Извлекает node ID из URL Figma
 * @param {string} url - URL макета Figma
 * @returns {string|null} - Node ID или null
 */
export const extractNodeId = (url) => {
  try {
    // Формат: ...?node-id=1:2 или ...&node-id=1:2
    const match = url.match(/node-id=([^&]+)/);
    if (match) {
      // Параметр может быть URL-энкодед (например, 1%3A2)
      const decoded = decodeURIComponent(match[1]);
      return decoded || null;
    }
    return null;
  } catch (e) {
    console.error('Ошибка извлечения node ID:', e);
    return null;
  }
};

/**
 * Получает токен из localStorage или использует переданный
 * @param {string|null} token - Токен (опционально)
 * @returns {string|null} - Токен или null
 */
export const getFigmaToken = (token = null) => {
  if (token) return token;
  try {
    return localStorage.getItem('figma_token') || null;
  } catch (e) {
    return null;
  }
};

/**
 * Сохраняет токен в localStorage
 * @param {string} token - Токен для сохранения
 */
export const saveFigmaToken = (token) => {
  try {
    localStorage.setItem('figma_token', token);
  } catch (e) {
    console.error('Ошибка сохранения токена:', e);
  }
};

/**
 * Выполняет запрос к Figma API
 * @param {string} endpoint - Endpoint API
 * @param {string} token - Personal Access Token
 * @returns {Promise<Object>} - Ответ API
 */
const fetchFigmaApi = async (endpoint, token) => {
  const url = `${FIGMA_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': token
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.err) {
        errorMessage = errorJson.err;
      }
    } catch (e) {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Получает структуру файла Figma
 * @param {string} fileKey - File key
 * @param {string} token - Personal Access Token
 * @returns {Promise<Object>} - Структура файла
 */
export const fetchFigmaFile = async (fileKey, token) => {
  return await fetchFigmaApi(`/files/${fileKey}`, token);
};

/**
 * Получает конкретную ноду из файла
 * @param {string} fileKey - File key
 * @param {string} nodeId - Node ID (может быть в формате "1:2" или "1-2")
 * @param {string} token - Personal Access Token
 * @returns {Promise<Object>} - Данные ноды
 */
export const fetchFigmaNode = async (fileKey, nodeId, token) => {
  // API для получения ноды требует формат с дефисом (1-2)
  // Конвертируем из формата с двоеточием, если нужно
  const nodeIdForApi = nodeId.replace(/:/g, '-');
  return await fetchFigmaApi(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeIdForApi)}`, token);
};

/**
 * Получает изображения для нод
 * @param {string} fileKey - File key
 * @param {string[]} nodeIds - Массив Node ID (в формате с двоеточием, например "1:2")
 * @param {string} token - Personal Access Token
 * @param {number} scale - Масштаб (1, 2, 4)
 * @param {string} format - Формат (png, jpg, svg, pdf)
 * @returns {Promise<Object>} - Объект с URL изображений
 */
export const fetchFigmaImages = async (fileKey, nodeIds, token, scale = 2, format = 'png') => {
  // Убеждаемся, что node IDs в формате с двоеточием для API экспорта изображений
  const normalizedIds = nodeIds.map(id => id.replace(/-/g, ':'));
  const ids = normalizedIds.join(',');
  const endpoint = `/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`;
  return await fetchFigmaApi(endpoint, token);
};

/**
 * Загружает изображение по URL
 * @param {string} imageUrl - URL изображения
 * @returns {Promise<Image>} - Загруженное изображение
 */
export const loadFigmaImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Не удалось загрузить изображение: ${imageUrl}`));
    img.src = imageUrl;
  });
};

/**
 * Валидирует URL Figma
 * @param {string} url - URL для проверки
 * @returns {boolean} - true если валидный
 */
export const validateFigmaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /figma\.com\/(?:file|design)\/[a-zA-Z0-9]+/.test(url);
};

/**
 * Валидирует токен Figma (проверяет доступность API)
 * @param {string} token - Токен для проверки
 * @returns {Promise<boolean>} - true если токен валидный
 */
export const validateFigmaToken = async (token) => {
  try {
    // Пробуем получить информацию о пользователе
    const response = await fetch(`${FIGMA_API_BASE}/me`, {
      headers: {
        'X-Figma-Token': token
      }
    });
    return response.ok;
  } catch (e) {
    return false;
  }
};

