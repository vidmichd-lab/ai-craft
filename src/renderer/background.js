/**
 * Модуль для работы с фоном (цвет и изображение)
 */

/**
 * Рисует фон на canvas
 */
export const drawBackground = (ctx, width, height, state) => {
  // Рисуем цветной фон
  const bgColor = state.bgColor || '#1e1e1e';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  
  // Логируем только первый раз
  if (!drawBackground._logged) {
    console.log('Фон нарисован:', { bgColor, width, height, hasBgImage: !!state.bgImage });
    drawBackground._logged = true;
  }
  
  // Если есть изображение фона, рисуем его
  if (state.bgImage) {
    const img = state.bgImage;
    // Проверяем, что изображение загружено
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.warn('Фоновое изображение не загружено или невалидно');
      return;
    }
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    const imgAspect = imgWidth / imgHeight;
    const canvasAspect = width / height;
    
    // Всегда используем cover
    let drawWidth = width;
    let drawHeight = height;
    let drawX = 0;
    let drawY = 0;
    
    const bgPosition = state.bgPosition || 'center';
    
    // Cover: изображение заполняет весь canvas, сохраняя пропорции
    if (imgAspect > canvasAspect) {
      // Изображение шире - подгоняем по высоте
      drawHeight = height;
      drawWidth = height * imgAspect;
    } else {
      // Изображение выше - подгоняем по ширине
      drawWidth = width;
      drawHeight = width / imgAspect;
    }
    
    // Позиционирование (горизонтальное и вертикальное)
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
    
    // Рисуем изображение один раз с учетом размера и позиции
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }
};

