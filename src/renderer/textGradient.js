/**
 * Модуль для отрисовки градиентной подложки под текстом и лигалом
 */

/**
 * Рисует градиентную подложку под текстом и лигалом, когда есть фоновое изображение
 * Подложка идет от края (сверху или снизу) до конца области текста
 */
export const drawTextGradient = (ctx, width, height, state, logoBounds, titleBounds, subtitleBounds, legalTextBounds, legalContentBounds, ageBoundsRect, paddingPx, titleVPos, isHorizontalLayout, isUltraWide, isSuperWide) => {
  // Рисуем градиент только если есть фоновое изображение
  if (!state.bgImage) return;
  
  // Получаем прозрачность градиента (по умолчанию 100%)
  const opacity = Math.max(0, Math.min(100, state.textGradientOpacity || 100)) / 100;
  
  // Если прозрачность 0, не рисуем градиент
  if (opacity <= 0) return;
  
  // Цвет градиента #1e1e1e
  const gradientColor = { r: 30, g: 30, b: 30 };
  
  // Собираем все области текста (логотип, заголовок, подзаголовок) для объединения
  const textAreas = [];
  
  // Добавляем область логотипа
  if (logoBounds) {
    const logoDisplayWidth = logoBounds.totalWidth || logoBounds.width;
    textAreas.push({
      x: logoBounds.x,
      y: logoBounds.y,
      width: logoDisplayWidth,
      height: logoBounds.height
    });
  }
  
  // Добавляем область заголовка
  if (titleBounds) {
    textAreas.push({
      x: titleBounds.x,
      y: titleBounds.y,
      width: titleBounds.width,
      height: titleBounds.height
    });
  }
  
  // Добавляем область подзаголовка
  if (subtitleBounds) {
    textAreas.push({
      x: subtitleBounds.x,
      y: subtitleBounds.y,
      width: subtitleBounds.width,
      height: subtitleBounds.height
    });
  }
  
  // Если есть области текста, объединяем их в одну общую область
  if (textAreas.length > 0) {
    // Находим общие границы всех областей текста
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    
    textAreas.forEach(area => {
      minX = Math.min(minX, area.x);
      minY = Math.min(minY, area.y);
      maxX = Math.max(maxX, area.x + area.width);
      maxY = Math.max(maxY, area.y + area.height);
    });
    
    // Определяем направление градиента на основе типа макета
    const isWideFormat = isHorizontalLayout || isUltraWide || isSuperWide;
    
    if (isWideFormat) {
      // Для широких форматов градиент идет слева направо
      const textWidth = maxX - minX;
      const padding = textWidth * 0.2; // Добавляем 20% отступ с обеих сторон
      const gradientStartX = Math.max(0, minX - padding); // Начинаем немного левее текста
      // Увеличиваем длину градиента - заканчиваем чуть дальше конца текста
      const gradientEndX = Math.min(width, maxX + padding); // Заканчиваем немного правее текста
      const gradientWidth = Math.abs(gradientEndX - gradientStartX);
      
      // Создаем горизонтальный линейный градиент
      const gradient = ctx.createLinearGradient(
        gradientStartX, 0,
        gradientEndX, 0
      );
      
      // Градиент слева направо: 80% слева, 0% справа
      const startOpacity = 0.8 * opacity;
      const endOpacity = 0 * opacity;
      
      gradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity})`);
      gradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${endOpacity})`);
      
      // Рисуем градиент на всю высоту canvas, но с учетом расширенной области
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(gradientStartX, 0, gradientWidth, height);
      ctx.restore();
    } else {
      // Для вертикальных форматов градиент идет сверху вниз или снизу вверх
      // Определяем направление по titleVPos
      const isTextAtTop = titleVPos === 'top' || (titleVPos === 'center' && (minY + maxY) / 2 < height / 2);
      
      // Создаем область подложки от самого края canvas до конца текста
      // Увеличиваем область градиента - добавляем отступ сверху и снизу от текста
      const textHeight = maxY - minY;
      const padding = textHeight * 0.2; // Добавляем 20% отступ сверху и снизу
      const gradientStartY = isTextAtTop ? Math.max(0, minY - padding) : maxY; // Начинаем немного выше текста
      const gradientEndY = isTextAtTop ? Math.min(height, maxY + padding) : height; // Заканчиваем немного ниже текста
      const gradientHeight = Math.abs(gradientEndY - gradientStartY);
      
      // Создаем вертикальный линейный градиент
      const gradient = ctx.createLinearGradient(
        0, gradientStartY,
        0, gradientEndY
      );
      
      // Градиент от #1e1e1e 80% на краю до #1e1e1e 0% в конце области текста
      const startOpacity = 0.8 * opacity;
      const endOpacity = 0 * opacity;
      
      if (isTextAtTop) {
        // Градиент сверху вниз: 80% вверху, 0% внизу
        gradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity})`);
        gradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${endOpacity})`);
      } else {
        // Градиент снизу вверх: 80% внизу, 0% вверху
        gradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${endOpacity})`);
        gradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity})`);
      }
      
      // Рисуем градиент на всю ширину canvas
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(0, gradientStartY, width, gradientHeight);
      ctx.restore();
    }
  }
  
  // Отдельная подложка для лигала снизу
  if (legalTextBounds || legalContentBounds) {
    const legalBounds = legalTextBounds || legalContentBounds;
    
    // Градиент для лигала всегда снизу вверх (от самого края снизу до начала лигала)
    const legalGradientStartY = height; // Начинаем от самого края снизу
    const legalGradientEndY = legalBounds.y; // Заканчиваем в начале лигала
    const legalGradientHeight = Math.abs(legalGradientEndY - legalGradientStartY);
    
    if (legalGradientHeight > 0) {
      const legalGradient = ctx.createLinearGradient(
        0, legalGradientStartY,
        0, legalGradientEndY
      );
      
      // Градиент снизу вверх: 80% внизу (у края), 0% вверху (у начала лигала)
      const legalStartOpacity = 0.8 * opacity;
      const legalEndOpacity = 0 * opacity;
      
      legalGradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${legalStartOpacity})`);
      legalGradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${legalEndOpacity})`);
      
      // Рисуем градиент на всю ширину canvas
      ctx.save();
      ctx.fillStyle = legalGradient;
      ctx.fillRect(0, legalGradientEndY, width, legalGradientHeight);
      ctx.restore();
    }
  }
};

