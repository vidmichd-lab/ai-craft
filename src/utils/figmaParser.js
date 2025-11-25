/**
 * Модуль для парсинга структуры макета из Figma
 * Определяет элементы и их свойства
 */

/**
 * Рекурсивно ищет ноду по ID в структуре файла
 * @param {Object} node - Текущая нода
 * @param {string} nodeId - ID искомой ноды (может быть в формате "1:2" или "1-2")
 * @returns {Object|null} - Найденная нода или null
 */
const findNodeById = (node, nodeId) => {
  if (!node || !nodeId) return null;
  
  // В структуре файла Figma ID хранятся в формате с двоеточием (1:2)
  // Пробуем оба формата для совместимости
  const nodeIdWithColon = nodeId.replace(/-/g, ':');
  const nodeIdWithDash = nodeId.replace(/:/g, '-');
  
  // Проверяем текущую ноду
  if (node.id === nodeId || node.id === nodeIdWithColon || node.id === nodeIdWithDash) {
    return node;
  }
  
  // Ищем в дочерних элементах
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  
  return null;
};

/**
 * Извлекает текст из ноды
 * @param {Object} node - Нода Figma
 * @returns {string} - Текст
 */
const extractText = (node) => {
  if (node.type === 'TEXT' && node.characters) {
    return node.characters;
  }
  if (node.children && Array.isArray(node.children)) {
    return node.children
      .map(child => extractText(child))
      .filter(text => text)
      .join(' ');
  }
  return '';
};

/**
 * Определяет тип элемента по имени и структуре
 * @param {Object} node - Нода Figma
 * @returns {string|null} - Тип элемента (logo, title, subtitle, legal, kv, bg, age) или null
 */
const identifyElementType = (node) => {
  if (!node || !node.name) return null;
  
  const name = node.name.toLowerCase();
  
  // Проверяем префиксы в квадратных скобках
  const prefixMatch = name.match(/^\[([^\]]+)\]/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].toLowerCase();
    const typeMap = {
      'logo': 'logo',
      'title': 'title',
      'subtitle': 'subtitle',
      'legal': 'legal',
      'kv': 'kv',
      'bg': 'bg',
      'background': 'bg',
      'age': 'age'
    };
    if (typeMap[prefix]) {
      return typeMap[prefix];
    }
  }
  
  // Автоматическое определение по ключевым словам
  if (name.includes('logo') || name.includes('логотип')) {
    return 'logo';
  }
  if (name.includes('title') || name.includes('заголовок') || name.includes('heading')) {
    return 'title';
  }
  if (name.includes('subtitle') || name.includes('подзаголовок') || name.includes('subheading')) {
    return 'subtitle';
  }
  if (name.includes('legal') || name.includes('лигал') || name.includes('disclaimer')) {
    return 'legal';
  }
  if (name.includes('kv') || name.includes('visual') || name.includes('визуал') || name.includes('image')) {
    return 'kv';
  }
  if (name.includes('bg') || name.includes('background') || name.includes('фон')) {
    return 'bg';
  }
  if (name.includes('age') || name.includes('возраст') || /^\d+\+$/.test(name.trim())) {
    return 'age';
  }
  
  return null;
};

/**
 * Извлекает цвет из fill
 * @param {Object} fill - Fill объект Figma
 * @returns {string|null} - HEX цвет или null
 */
const extractColor = (fill) => {
  if (!fill || fill.type !== 'SOLID') return null;
  
  const { r, g, b, a } = fill.color || {};
  if (r === undefined || g === undefined || b === undefined) return null;
  
  const toHex = (value) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  
  // Если альфа-канал не 1, добавляем его
  if (a !== undefined && a < 1) {
    const alphaHex = Math.round(a * 255).toString(16);
    return hex + (alphaHex.length === 1 ? '0' + alphaHex : alphaHex);
  }
  
  return hex;
};

/**
 * Извлекает стили текста из ноды
 * @param {Object} node - Текстовая нода
 * @returns {Object} - Стили текста
 */
const extractTextStyles = (node) => {
  if (node.type !== 'TEXT') return null;
  
  const styles = {
    color: null,
    fontSize: node.style?.fontSize || null,
    fontFamily: node.style?.fontFamily || null,
    fontWeight: node.style?.fontWeight || null,
    textAlign: node.style?.textAlignHorizontal?.toLowerCase() || 'left',
    lineHeight: node.style?.lineHeightPx ? 
      node.style.lineHeightPx / (node.style.fontSize || 1) : null
  };
  
  // Извлекаем цвет из fills
  if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
    styles.color = extractColor(node.fills[0]);
  }
  
  return styles;
};

/**
 * Парсит структуру макета из Figma
 * @param {Object} fileData - Данные файла из Figma API
 * @param {string} nodeId - ID целевой ноды
 * @returns {Object} - Парсированная структура макета
 */
export const parseFigmaStructure = (fileData, nodeId) => {
  if (!fileData || !fileData.document) {
    throw new Error('Некорректные данные файла');
  }
  
  // Находим целевую ноду
  const targetNode = findNodeById(fileData.document, nodeId);
  if (!targetNode) {
    throw new Error(`Нода с ID ${nodeId} не найдена`);
  }
  
  const result = {
    originalSize: {
      width: targetNode.absoluteBoundingBox?.width || targetNode.width || 0,
      height: targetNode.absoluteBoundingBox?.height || targetNode.height || 0
    },
    elements: {
      logo: null,
      title: null,
      subtitle: null,
      legal: null,
      kv: null,
      bg: null,
      age: null
    },
    allNodes: [] // Все ноды для экспорта
  };
  
  // Рекурсивно обходим структуру
  const traverse = (node, depth = 0) => {
    if (!node) return;
    
    const elementType = identifyElementType(node);
    const nodeInfo = {
      id: node.id,
      name: node.name,
      type: node.type,
      elementType: elementType,
      bounds: node.absoluteBoundingBox || {
        x: 0,
        y: 0,
        width: node.width || 0,
        height: node.height || 0
      },
      styles: null,
      text: null
    };
    
    // Если это текстовый элемент, извлекаем текст и стили
    if (node.type === 'TEXT') {
      nodeInfo.text = extractText(node);
      nodeInfo.styles = extractTextStyles(node);
    }
    
    // Если это изображение или компонент с изображением
    if (node.type === 'RECTANGLE' || node.type === 'VECTOR' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      // Проверяем, есть ли fills с изображениями
      if (node.fills && Array.isArray(node.fills)) {
        const imageFill = node.fills.find(fill => fill.type === 'IMAGE');
        if (imageFill) {
          nodeInfo.hasImage = true;
        }
      }
    }
    
    // Сохраняем элемент, если определен его тип
    if (elementType && result.elements[elementType] === null) {
      result.elements[elementType] = nodeInfo;
    }
    
    // Добавляем в список всех нод
    result.allNodes.push(nodeInfo);
    
    // Рекурсивно обрабатываем дочерние элементы
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
  };
  
  traverse(targetNode);
  
  // Если фон не найден, используем сам корневой элемент
  // Также проверяем, есть ли у корневого элемента fills (цвет или градиент)
  if (!result.elements.bg) {
    result.elements.bg = {
      id: targetNode.id,
      name: targetNode.name,
      type: targetNode.type,
      bounds: result.originalSize,
      hasFills: !!(targetNode.fills && Array.isArray(targetNode.fills) && targetNode.fills.length > 0)
    };
  }
  
  return result;
};

/**
 * Получает упрощенную структуру для экспорта
 * @param {Object} parsedStructure - Парсированная структура
 * @returns {Object} - Упрощенная структура
 */
export const simplifyStructure = (parsedStructure) => {
  return {
    originalSize: parsedStructure.originalSize,
    elements: Object.entries(parsedStructure.elements)
      .filter(([_, value]) => value !== null)
      .reduce((acc, [key, value]) => {
        acc[key] = {
          id: value.id,
          name: value.name,
          type: value.type
        };
        return acc;
      }, {})
  };
};

