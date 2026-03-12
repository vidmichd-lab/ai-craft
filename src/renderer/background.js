/**
 * Модуль для работы с фоном (цвет и изображение)
 */

/**
 * Рисует фон на canvas
 */
export const drawBackground = (ctx, width, height, state) => {
  // Рисуем фон (градиент или цвет)
  if (state.bgGradient && state.bgGradient.stops && state.bgGradient.stops.length > 0) {
    // Рисуем градиент
    drawGradient(ctx, width, height, state.bgGradient);
  } else {
    // Рисуем цветной фон
    const bgColor = state.bgColor || '#1e1e1e';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }
  
  // Логируем только первый раз
  if (!drawBackground._logged) {
    console.log('Фон нарисован:', { 
      bgColor: state.bgColor, 
      hasGradient: !!state.bgGradient, 
      width, 
      height, 
      hasBgImage: !!state.bgImage 
    });
    drawBackground._logged = true;
  }
  
  // Если есть изображение фона, рисуем его
  if (state.bgImage) {
    const img = state.bgImage;
    // Проверяем, что это объект Image, а не строка (путь)
    if (typeof img === 'string') {
      // Это строка (путь), изображение еще не загружено - не рисуем
      return;
    }
    // Проверяем, что изображение загружено
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.warn('Фоновое изображение не загружено или невалидно');
      return;
    }
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    const imgAspect = imgWidth / imgHeight;
    const canvasAspect = width / height;
    
    const bgSize = state.bgSize || 'cover';
    const bgPosition = state.bgPosition || 'center';
    const bgOffsetX = Number(state.bgOffsetX) || 0;
    const bgOffsetY = Number(state.bgOffsetY) || 0;
    const bgImageSize = state.bgImageSize || 100; // Размер изображения в процентах
    
    // Базовый размер изображения с учетом процента масштабирования
    const baseImgWidth = imgWidth * (bgImageSize / 100);
    const baseImgHeight = imgHeight * (bgImageSize / 100);
    const baseImgAspect = baseImgWidth / baseImgHeight;
    
    let drawWidth = width;
    let drawHeight = height;
    let drawX = 0;
    let drawY = 0;
    
    // Определяем размер изображения в зависимости от типа размещения
    if (bgSize === 'fill') {
      // Fill: растягиваем изображение на весь canvas, игнорируя пропорции
      drawWidth = width;
      drawHeight = height;
    } else if (bgSize === 'tile') {
      // Tile: мозаика - используем базовый размер изображения
      drawWidth = baseImgWidth;
      drawHeight = baseImgHeight;
    } else if (bgSize === 'contain') {
      // Contain: изображение полностью помещается в canvas, сохраняя пропорции
      if (baseImgAspect > canvasAspect) {
        // Изображение шире - подгоняем по ширине
        drawWidth = width;
        drawHeight = width / baseImgAspect;
      } else {
        // Изображение выше - подгоняем по высоте
        drawHeight = height;
        drawWidth = height * baseImgAspect;
      }
    } else {
      // Cover (по умолчанию): изображение заполняет весь canvas, сохраняя пропорции
      // Сначала вычисляем размер, который покрывает canvas
      let coverWidth, coverHeight;
      if (baseImgAspect > canvasAspect) {
        // Изображение шире - подгоняем по высоте
        coverHeight = height;
        coverWidth = height * baseImgAspect;
      } else {
        // Изображение выше - подгоняем по ширине
        coverWidth = width;
        coverHeight = width / baseImgAspect;
      }
      
      // Применяем масштабирование bgImageSize к размеру, который покрывает canvas
      drawWidth = coverWidth * (bgImageSize / 100);
      drawHeight = coverHeight * (bgImageSize / 100);
    }
    
    // Для tile рисуем мозаику
    if (bgSize === 'tile') {
      const bgVPosition = state.bgVPosition || 'center';
      let startX = 0;
      let startY = 0;
      
      // Определяем начальную позицию для мозаики
      if (bgPosition === 'right') {
        startX = width % drawWidth;
      } else if (bgPosition === 'center') {
        startX = (width % drawWidth) / 2;
      }
      
      if (bgVPosition === 'bottom') {
        startY = height % drawHeight;
      } else if (bgVPosition === 'center') {
        startY = (height % drawHeight) / 2;
      }

      // Смещение тайлов вручную.
      if (drawWidth > 0) {
        startX = ((startX + bgOffsetX) % drawWidth + drawWidth) % drawWidth;
      }
      if (drawHeight > 0) {
        startY = ((startY + bgOffsetY) % drawHeight + drawHeight) % drawHeight;
      }
      
      // Рисуем мозаику
      for (let y = -startY; y < height; y += drawHeight) {
        for (let x = -startX; x < width; x += drawWidth) {
          ctx.drawImage(img, x, y, drawWidth, drawHeight);
        }
      }
    } else {
      // Для остальных типов размещения - обычное позиционирование
      const bgVPosition = state.bgVPosition || 'center';
      
      // Горизонтальное позиционирование
      if (bgPosition === 'left') {
        drawX = 0;
      } else if (bgPosition === 'right') {
        drawX = width - drawWidth;
      } else {
        // center (по умолчанию)
        drawX = (width - drawWidth) / 2;
      }
      
      // Вертикальное позиционирование
      if (bgVPosition === 'top') {
        drawY = 0;
      } else if (bgVPosition === 'bottom') {
        drawY = height - drawHeight;
      } else {
        // center (по умолчанию)
        drawY = (height - drawHeight) / 2;
      }

      // Смещение фона вручную.
      drawX += bgOffsetX;
      drawY += bgOffsetY;
      
      // Рисуем изображение один раз с учетом размера и позиции
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
  }
};

/**
 * Рисует градиент на canvas
 * @param {CanvasRenderingContext2D} ctx - Контекст canvas
 * @param {number} width - Ширина canvas
 * @param {number} height - Высота canvas
 * @param {Object} gradient - Объект градиента { type, stops, angle }
 */
function drawGradient(ctx, width, height, gradient) {
  const { type, stops, angle = 0 } = gradient;
  
  if (!stops || stops.length === 0) {
    return;
  }
  
  let canvasGradient;
  
  if (type === 'linear') {
    // Линейный градиент
    const angleRad = (angle * Math.PI) / 180;
    const centerX = width / 2;
    const centerY = height / 2;
    const length = Math.sqrt(width * width + height * height);
    const x1 = centerX - (length / 2) * Math.cos(angleRad);
    const y1 = centerY - (length / 2) * Math.sin(angleRad);
    const x2 = centerX + (length / 2) * Math.cos(angleRad);
    const y2 = centerY + (length / 2) * Math.sin(angleRad);
    
    canvasGradient = ctx.createLinearGradient(x1, y1, x2, y2);
  } else if (type === 'radial') {
    // Радиальный градиент
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) / 2;
    canvasGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  } else if (type === 'angular') {
    // Угловой градиент (конический) - используем радиальный как приближение
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) / 2;
    canvasGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  } else {
    // Diamond - используем линейный как приближение
    const centerX = width / 2;
    const centerY = height / 2;
    const length = Math.sqrt(width * width + height * height);
    canvasGradient = ctx.createLinearGradient(centerX - length / 2, centerY - length / 2, centerX + length / 2, centerY + length / 2);
  }
  
  // Добавляем остановки градиента
  stops.forEach(stop => {
    const color = stop.color || '#000000';
    const position = stop.position !== undefined ? stop.position : 0;
    const alpha = stop.alpha !== undefined ? stop.alpha : 1;
    
    // Конвертируем цвет с альфа-каналом
    let rgbaColor = color;
    if (alpha < 1) {
      // Если цвет в формате HEX, конвертируем в RGBA
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        rgbaColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    
    canvasGradient.addColorStop(position, rgbaColor);
  });
  
  ctx.fillStyle = canvasGradient;
  ctx.fillRect(0, 0, width, height);
}
