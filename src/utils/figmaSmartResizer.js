/**
 * Умный ресайзер макетов Figma
 * Парсит структуру по слоям и применяет логику конструктора для каждого элемента
 */

import { fetchFigmaFile, fetchFigmaNode, fetchFigmaImages, loadFigmaImage } from './figmaApi.js';
import { parseFigmaStructure } from './figmaParser.js';

/**
 * Извлекает все элементы из структуры Figma с их свойствами
 * @param {Object} fileData - Данные файла из Figma API
 * @param {string} fileKey - File key для экспорта изображений
 * @param {string} nodeId - ID целевой ноды
 * @param {string} token - Personal Access Token
 * @returns {Promise<Object>} - Структура с элементами и их свойствами
 */
export const extractFigmaElements = async (fileData, fileKey, nodeId, token) => {
  const parsed = parseFigmaStructure(fileData, nodeId);
  const elements = {
    originalSize: parsed.originalSize,
    bg: null,
    logo: null,
    title: null,
    subtitle: null,
    legal: null,
    age: null,
    kv: null
  };
  
  // Извлекаем фоновое изображение или цвет
  // Получаем данные ноды через API для получения fills (они могут быть не в fileData)
  let nodeDataFromApi = null;
  try {
    const nodeDataResponse = await fetchFigmaNode(fileKey, nodeId, token);
    const nodeIdForApi = nodeId.replace(/:/g, '-');
    const nodeIdVariants = [nodeId, nodeIdForApi, nodeId.replace(/-/g, ':')];
    for (const variant of nodeIdVariants) {
      if (nodeDataResponse.nodes && nodeDataResponse.nodes[variant]) {
        nodeDataFromApi = nodeDataResponse.nodes[variant];
        break;
      }
    }
  } catch (e) {
    console.warn('Не удалось получить данные ноды через API:', e);
  }
  
  // Всегда проверяем корневой элемент (целевой фрейм) на наличие fills
  const rootNode = findNodeById(fileData.document, nodeId);
  const nodeToCheck = nodeDataFromApi?.document || nodeDataFromApi || rootNode;
  
  if (nodeToCheck) {
    elements.bg = {
      id: nodeToCheck.id || rootNode.id,
      bounds: parsed.originalSize,
      color: null,
      gradient: null,
      image: null
    };
    
    // Ищем fills для фона в корневой ноде
    // Проверяем fills в разных местах структуры
    let fillsToCheck = null;
    if (nodeToCheck.fills && Array.isArray(nodeToCheck.fills)) {
      fillsToCheck = nodeToCheck.fills;
    } else if (nodeToCheck.document && nodeToCheck.document.fills && Array.isArray(nodeToCheck.document.fills)) {
      fillsToCheck = nodeToCheck.document.fills;
    } else if (rootNode.fills && Array.isArray(rootNode.fills)) {
      fillsToCheck = rootNode.fills;
    } else if (rootNode.document && rootNode.document.fills && Array.isArray(rootNode.document.fills)) {
      fillsToCheck = rootNode.document.fills;
    }
    
    if (fillsToCheck) {
      // Фильтруем только видимые fills
      const visibleFills = fillsToCheck.filter(f => f.visible !== false);
      
      if (visibleFills.length > 0) {
        console.log('Найдены fills для фона:', visibleFills.map(f => f.type));
        
        // Проверяем градиенты (они имеют приоритет над solid)
        const gradientFill = visibleFills.find(f => 
          f.type === 'GRADIENT_LINEAR' || 
          f.type === 'GRADIENT_RADIAL' || 
          f.type === 'GRADIENT_ANGULAR' || 
          f.type === 'GRADIENT_DIAMOND'
        );
        if (gradientFill) {
          elements.bg.gradient = extractGradient(gradientFill);
          console.log('Применен градиент фона:', elements.bg.gradient);
        }
        
        // Проверяем solid fill (если нет градиента)
        if (!elements.bg.gradient) {
          const solidFill = visibleFills.find(f => f.type === 'SOLID');
          if (solidFill) {
            elements.bg.color = extractColor(solidFill);
            console.log('Применен цвет фона:', elements.bg.color);
          }
        }
        
        // Проверяем изображение (оно рисуется поверх цвета/градиента)
        const imageFill = visibleFills.find(f => f.type === 'IMAGE');
        if (imageFill) {
          // Экспортируем изображение фона
          try {
            const imagesResponse = await fetchFigmaImages(fileKey, [nodeId], token, 2, 'png');
            const nodeIdForExport = nodeId.replace(/-/g, ':');
            const nodeIdVariants = [nodeIdForExport, nodeId, nodeId.replace(/-/g, ':')];
            
            for (const variant of nodeIdVariants) {
              if (imagesResponse.images && imagesResponse.images[variant]) {
                const img = await loadFigmaImage(imagesResponse.images[variant]);
                elements.bg.image = img;
                console.log('Применено фоновое изображение');
                break;
              }
            }
          } catch (e) {
            console.warn('Не удалось загрузить фоновое изображение:', e);
          }
        }
      } else {
        console.log('Нет видимых fills в корневом элементе');
      }
    } else {
      console.log('Нет fills в корневом элементе (проверено rootNode.fills и rootNode.document?.fills)');
    }
    
    // Если у корневого элемента нет fills, но есть дочерний элемент с именем [bg] или [background],
    // проверяем его fills
    if (!elements.bg.color && !elements.bg.gradient && !elements.bg.image) {
      if (rootNode.children && Array.isArray(rootNode.children)) {
        for (const child of rootNode.children) {
          const childName = (child.name || '').toLowerCase();
          if (childName.includes('[bg]') || childName.includes('[background]') || 
              childName.includes('bg') || childName.includes('background') ||
              childName.includes('фон')) {
            if (child.fills && Array.isArray(child.fills)) {
              const visibleFills = child.fills.filter(f => f.visible !== false);
              
              const gradientFill = visibleFills.find(f => 
                f.type === 'GRADIENT_LINEAR' || 
                f.type === 'GRADIENT_RADIAL' || 
                f.type === 'GRADIENT_ANGULAR' || 
                f.type === 'GRADIENT_DIAMOND'
              );
              if (gradientFill) {
                elements.bg.gradient = extractGradient(gradientFill);
              }
              
              if (!elements.bg.gradient) {
                const solidFill = visibleFills.find(f => f.type === 'SOLID');
                if (solidFill) {
                  elements.bg.color = extractColor(solidFill);
                }
              }
              
              const imageFill = visibleFills.find(f => f.type === 'IMAGE');
              if (imageFill) {
                try {
                  const imagesResponse = await fetchFigmaImages(fileKey, [child.id], token, 2, 'png');
                  const nodeIdForExport = child.id.replace(/-/g, ':');
                  const nodeIdVariants = [nodeIdForExport, child.id, child.id.replace(/-/g, ':')];
                  
                  for (const variant of nodeIdVariants) {
                    if (imagesResponse.images && imagesResponse.images[variant]) {
                      const img = await loadFigmaImage(imagesResponse.images[variant]);
                      elements.bg.image = img;
                      break;
                    }
                  }
                } catch (e) {
                  console.warn('Не удалось загрузить фоновое изображение из дочернего элемента:', e);
                }
              }
              
              // Если нашли фон в дочернем элементе, выходим из цикла
              if (elements.bg.color || elements.bg.gradient || elements.bg.image) {
                break;
              }
            }
          }
        }
      }
    }
  }
  
  // Извлекаем логотип
  if (parsed.elements.logo) {
    const logoNode = parsed.elements.logo;
    elements.logo = {
      id: logoNode.id,
      bounds: logoNode.bounds,
      image: null
    };
    
    // Экспортируем логотип
    try {
      const nodeIdForExport = logoNode.id.replace(/-/g, ':');
      const imagesResponse = await fetchFigmaImages(fileKey, [logoNode.id], token, 2, 'png');
      const nodeIdVariants = [nodeIdForExport, logoNode.id, logoNode.id.replace(/-/g, ':')];
      
      for (const variant of nodeIdVariants) {
        if (imagesResponse.images && imagesResponse.images[variant]) {
          const img = await loadFigmaImage(imagesResponse.images[variant]);
          elements.logo.image = img;
          break;
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить логотип:', e);
    }
  }
  
  // Извлекаем текстовые элементы
  if (parsed.elements.title) {
    const titleNode = parsed.elements.title;
    elements.title = {
      id: titleNode.id,
      bounds: titleNode.bounds,
      text: titleNode.text || '',
      styles: titleNode.styles || {}
    };
  }
  
  if (parsed.elements.subtitle) {
    const subtitleNode = parsed.elements.subtitle;
    elements.subtitle = {
      id: subtitleNode.id,
      bounds: subtitleNode.bounds,
      text: subtitleNode.text || '',
      styles: subtitleNode.styles || {}
    };
  }
  
  if (parsed.elements.legal) {
    const legalNode = parsed.elements.legal;
    elements.legal = {
      id: legalNode.id,
      bounds: legalNode.bounds,
      text: legalNode.text || '',
      styles: legalNode.styles || {}
    };
  }
  
  if (parsed.elements.age) {
    const ageNode = parsed.elements.age;
    elements.age = {
      id: ageNode.id,
      bounds: ageNode.bounds,
      text: ageNode.text || '',
      styles: ageNode.styles || {}
    };
  }
  
  // Извлекаем визуал (KV)
  if (parsed.elements.kv) {
    const kvNode = parsed.elements.kv;
    elements.kv = {
      id: kvNode.id,
      bounds: kvNode.bounds,
      image: null
    };
    
    // Экспортируем визуал
    try {
      const nodeIdForExport = kvNode.id.replace(/-/g, ':');
      const imagesResponse = await fetchFigmaImages(fileKey, [kvNode.id], token, 2, 'png');
      const nodeIdVariants = [nodeIdForExport, kvNode.id, kvNode.id.replace(/-/g, ':')];
      
      for (const variant of nodeIdVariants) {
        if (imagesResponse.images && imagesResponse.images[variant]) {
          const img = await loadFigmaImage(imagesResponse.images[variant]);
          elements.kv.image = img;
          break;
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить визуал:', e);
    }
  }
  
  return elements;
};

/**
 * Конвертирует элементы Figma в состояние конструктора
 * @param {Object} figmaElements - Элементы из Figma
 * @param {Object} originalSize - Исходный размер макета
 * @param {Object} targetSize - Целевой размер
 * @param {Object} baseState - Базовое состояние конструктора
 * @returns {Object} - Состояние для рендеринга
 */
export const convertFigmaToState = (figmaElements, originalSize, targetSize, baseState) => {
  const scaleX = targetSize.width / originalSize.width;
  const scaleY = targetSize.height / originalSize.height;
  const scale = Math.min(scaleX, scaleY); // Используем минимальный масштаб для сохранения пропорций
  
  const state = { ...baseState };
  
  // Фон - применяем fill из Figma
  if (figmaElements.bg) {
    if (figmaElements.bg.gradient) {
      state.bgGradient = figmaElements.bg.gradient;
      // Устанавливаем угол градиента отдельно для совместимости
      state.bgGradientAngle = figmaElements.bg.gradient.angle || 0;
      state.bgColor = null; // Градиент имеет приоритет
    } else if (figmaElements.bg.color) {
      // Применяем цвет фона из fill
      state.bgColor = figmaElements.bg.color;
      state.bgGradient = null;
      state.bgGradientAngle = 0;
    }
    if (figmaElements.bg.image) {
      // Фоновое изображение из Figma
      state.bgImage = figmaElements.bg.image;
      state.bgImageSelected = figmaElements.bg.image;
    }
  }
  
  // Логотип - используем дефолтные значения из конструктора
  if (figmaElements.logo && figmaElements.logo.image) {
    state.logo = figmaElements.logo.image;
    state.showLogo = true;
    
    // Используем дефолтные значения из конструктора (не перезаписываем)
    // Размер и позиция остаются как в конструкторе
    if (baseState.logoSize !== undefined) {
      state.logoSize = baseState.logoSize;
    }
    if (baseState.logoPos !== undefined) {
      state.logoPos = baseState.logoPos;
    }
  }
  
  // Заголовок - используем дефолтные значения из конструктора, только текст берем из Figma
  if (figmaElements.title) {
    const titleText = figmaElements.title.text || '';
    if (titleText) {
      // Обновляем заголовок в активной паре
      if (state.titleSubtitlePairs && state.titleSubtitlePairs.length > 0) {
        const activeIndex = state.activePairIndex || 0;
        if (state.titleSubtitlePairs[activeIndex]) {
          state.titleSubtitlePairs[activeIndex].title = titleText;
        } else {
          // Если пары нет, создаем новую
          state.titleSubtitlePairs[activeIndex] = {
            title: titleText,
            subtitle: state.titleSubtitlePairs[activeIndex]?.subtitle || ''
          };
        }
      } else {
        // Если пар нет, создаем первую пару
        state.titleSubtitlePairs = [{
          title: titleText,
          subtitle: ''
        }];
        state.activePairIndex = 0;
      }
      // Также обновляем общий заголовок для обратной совместимости
      state.title = titleText;
    }
    
    // Используем дефолтные значения из конструктора для всех стилей
    // Не перезаписываем размер, цвет, шрифт и другие параметры
  }
  
  // Подзаголовок
  if (figmaElements.subtitle) {
    state.subtitle = figmaElements.subtitle.text || '';
    // Обновляем активную пару подзаголовков
    if (state.titleSubtitlePairs && state.titleSubtitlePairs[0]) {
      state.titleSubtitlePairs[0].subtitle = figmaElements.subtitle.text || '';
    }
    
    if (figmaElements.subtitle.styles) {
      const styles = figmaElements.subtitle.styles;
      if (styles.color) state.subtitleColor = styles.color;
      if (styles.fontSize) {
        // Масштабируем к размеру по умолчанию
        const defaultSubtitleSize = baseState.subtitleSize || 4;
        const minOriginalSide = Math.min(originalSize.width, originalSize.height);
        const subtitleSizePercent = (styles.fontSize / minOriginalSide) * 100;
        
        // Если размер близок к дефолтному, используем дефолтный
        if (Math.abs(subtitleSizePercent - defaultSubtitleSize) < 1) {
          state.subtitleSize = defaultSubtitleSize;
        } else {
          // Масштабируем пропорционально к дефолтному размеру
          const scaleFactor = defaultSubtitleSize / (subtitleSizePercent || 1);
          state.subtitleSize = Math.max(2, Math.min(15, subtitleSizePercent * scaleFactor));
        }
      } else {
        // Если размера нет, используем дефолтный
        state.subtitleSize = baseState.subtitleSize || 4;
      }
      if (styles.fontFamily) state.subtitleFontFamily = styles.fontFamily;
      if (styles.fontWeight) {
        const weightMap = {
          100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
          500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'Heavy', 900: 'Black'
        };
        state.subtitleWeight = weightMap[styles.fontWeight] || 'Regular';
      }
      if (styles.textAlign) {
        const alignMap = { 'left': 'left', 'center': 'center', 'right': 'right' };
        state.subtitleAlign = alignMap[styles.textAlign] || 'left';
      }
      if (styles.lineHeight) state.subtitleLineHeight = styles.lineHeight;
    }
    
    // Используем дефолтное расстояние между заголовком и подзаголовком из конструктора
    // Не перезаписываем subtitleGap
  }
  
  // Лигал - только если есть в Figma
  if (figmaElements.legal) {
    state.legal = figmaElements.legal.text || '';
    state.showLegal = true;
    
    if (figmaElements.legal.styles) {
      const styles = figmaElements.legal.styles;
      if (styles.color) state.legalColor = styles.color;
      if (styles.fontSize) {
        // Масштабируем к размеру по умолчанию
        const defaultLegalSize = baseState.legalSize || 2.5;
        const minOriginalSide = Math.min(originalSize.width, originalSize.height);
        const legalSizePercent = (styles.fontSize / minOriginalSide) * 100;
        
        // Если размер близок к дефолтному, используем дефолтный
        if (Math.abs(legalSizePercent - defaultLegalSize) < 0.5) {
          state.legalSize = defaultLegalSize;
        } else {
          // Масштабируем пропорционально к дефолтному размеру
          const scaleFactor = defaultLegalSize / (legalSizePercent || 1);
          state.legalSize = Math.max(1.5, Math.min(8, legalSizePercent * scaleFactor));
        }
      } else {
        // Если размера нет, используем дефолтный
        state.legalSize = baseState.legalSize || 2.5;
      }
      if (styles.fontFamily) state.legalFontFamily = styles.fontFamily;
      if (styles.fontWeight) {
        const weightMap = {
          100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
          500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'Heavy', 900: 'Black'
        };
        state.legalWeight = weightMap[styles.fontWeight] || 'Regular';
      }
    }
  } else {
    // Если legal нет в Figma, скрываем его
    state.showLegal = false;
  }
  
  // Возраст - только если есть в Figma
  if (figmaElements.age) {
    state.age = figmaElements.age.text || '';
    state.showAge = true;
    
    if (figmaElements.age.styles) {
      const styles = figmaElements.age.styles;
      if (styles.fontSize) {
        const minOriginalSide = Math.min(originalSize.width, originalSize.height);
        state.ageSize = (styles.fontSize / minOriginalSide) * 100;
      }
    }
  } else {
    // Если age нет в Figma, скрываем его
    state.showAge = false;
  }
  
  // Визуал (KV)
  if (figmaElements.kv && figmaElements.kv.image) {
    state.kv = figmaElements.kv.image;
    state.kvSelected = 'figma-kv'; // Маркер, что это из Figma
    state.showKV = true;
    
    // Определяем позицию визуала
    const kvCenterX = figmaElements.kv.bounds.x + figmaElements.kv.bounds.width / 2;
    const frameCenterX = originalSize.width / 2;
    
    if (Math.abs(kvCenterX - frameCenterX) < 50) {
      state.kvPosition = 'center';
    } else if (kvCenterX < frameCenterX) {
      state.kvPosition = 'left';
    } else {
      state.kvPosition = 'right';
    }
  }
  
  return state;
};

/**
 * Ресайзит макет Figma с применением логики конструктора
 * @param {string} fileKey - File key
 * @param {string} nodeId - Node ID
 * @param {Array} sizes - Массив размеров для ресайза
 * @param {string} token - Personal Access Token
 * @param {Function} onProgress - Callback прогресса
 * @returns {Promise<Array>} - Массив Canvas элементов
 */
export const smartResizeFigmaLayout = async (fileKey, nodeId, sizes, token, onProgress = null) => {
  // Получаем структуру файла
  const fileData = await fetchFigmaFile(fileKey, token);
  
  // Получаем данные ноды
  // API возвращает ноды с ключами в формате с дефисом (1-2)
  const nodeIdForApi = nodeId.replace(/:/g, '-');
  const nodeData = await fetchFigmaNode(fileKey, nodeId, token);
  
  // Пробуем найти ноду в разных форматах
  const targetNode = nodeData.nodes[nodeId] || 
                     nodeData.nodes[nodeIdForApi] || 
                     nodeData.nodes[nodeId.replace(/-/g, ':')];
  
  if (!targetNode) {
    // Пробуем найти любую доступную ноду для отладки
    const availableIds = Object.keys(nodeData.nodes || {});
    const errorMsg = availableIds.length > 0 
      ? `Нода с ID ${nodeId} не найдена. Доступные ID: ${availableIds.slice(0, 5).join(', ')}...`
      : `Нода с ID ${nodeId} не найдена. Ответ API не содержит нод.`;
    throw new Error(errorMsg);
  }
  
  // Извлекаем элементы
  const figmaElements = await extractFigmaElements(fileData, fileKey, nodeId, token);
  const originalSize = figmaElements.originalSize;
  
  // Получаем базовое состояние конструктора
  const { getState } = await import('../state/store.js');
  const baseState = getState();
  
  // Ресайзим на все размеры
  const results = [];
  const total = sizes.length;
  
  for (let i = 0; i < total; i++) {
    const size = sizes[i];
    const targetSize = {
      width: size.width,
      height: size.height
    };
    
    // Конвертируем элементы Figma в состояние конструктора
    const renderState = convertFigmaToState(figmaElements, originalSize, targetSize, baseState);
    
    // Рендерим через конструктор
    const canvas = document.createElement('canvas');
    // Получаем renderToCanvas из renderer
    const { renderer } = await import('../renderer.js');
    const { renderToCanvas } = renderer.__unsafe_getRenderToCanvas();
    renderToCanvas(canvas, targetSize.width, targetSize.height, renderState);
    
    results.push({
      canvas: canvas,
      size: targetSize,
      platform: size.platform || 'unknown',
      originalSize: originalSize
    });
    
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }
  
  return results;
};

// Вспомогательные функции
function findNodeById(node, nodeId) {
  if (!node || !nodeId) return null;
  if (node.id === nodeId) return node;
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

function extractColor(fill) {
  if (!fill) return null;
  
  // SOLID fill
  if (fill.type === 'SOLID') {
    const { r, g, b, a } = fill.color || {};
    if (r === undefined || g === undefined || b === undefined) return null;
    const toHex = (value) => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    if (a !== undefined && a < 1) {
      const alphaHex = Math.round(a * 255).toString(16);
      return hex + (alphaHex.length === 1 ? '0' + alphaHex : alphaHex);
    }
    return hex;
  }
  
  // GRADIENT fills
  if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_ANGULAR' || fill.type === 'GRADIENT_DIAMOND') {
    return extractGradient(fill);
  }
  
  return null;
}

/**
 * Извлекает градиент из fill
 * @param {Object} fill - Fill объект Figma с градиентом
 * @returns {Object|null} - Объект градиента или null
 */
function extractGradient(fill) {
  if (!fill || !fill.gradientStops || !Array.isArray(fill.gradientStops)) {
    return null;
  }
  
  const stops = fill.gradientStops.map(stop => {
    const { r, g, b, a } = stop.color || {};
    const toHex = (value) => {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    const alpha = a !== undefined ? a : 1;
    return {
      color: hex,
      position: stop.position || 0,
      alpha: alpha
    };
  });
  
  // Извлекаем направление градиента
  let angle = 0;
  if (fill.gradientHandlePositions && fill.gradientHandlePositions.length >= 2) {
    const start = fill.gradientHandlePositions[0];
    const end = fill.gradientHandlePositions[1];
    // Вычисляем угол в градусах (от 0 до 360)
    let calculatedAngle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
    // Нормализуем угол к диапазону 0-360
    angle = calculatedAngle < 0 ? calculatedAngle + 360 : calculatedAngle;
  }
  
  return {
    type: fill.type === 'GRADIENT_LINEAR' ? 'linear' : 
          fill.type === 'GRADIENT_RADIAL' ? 'radial' :
          fill.type === 'GRADIENT_ANGULAR' ? 'angular' : 'diamond',
    stops: stops,
    angle: Math.round(angle) // Округляем угол до целого числа
  };
}

