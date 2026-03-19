/**
 * Модуль для отрисовки градиентной подложки под текстом и лигалом
 */

import { hexToRgb } from './utils.js';

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
  
  // Получаем прозрачность подложки для центрированного текста (по умолчанию 20%)
  const centerOverlayOpacity = Math.max(0, Math.min(100, state.centerTextOverlayOpacity ?? 20)) / 100;
  
  // Цвет градиента берем из цвета фона
  const bgColor = state.bgColor || '#1e1e1e';
  const gradientColor = hexToRgb(bgColor);
  
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
    
    // Проверяем, находятся ли логотип и текст в разных местах
    const logoArea = logoBounds ? {
      x: logoBounds.x,
      y: logoBounds.y,
      width: logoBounds.totalWidth || logoBounds.width,
      height: logoBounds.height
    } : null;
    
    const textArea = (titleBounds || subtitleBounds) ? {
      minX: titleBounds ? titleBounds.x : subtitleBounds.x,
      minY: titleBounds ? titleBounds.y : subtitleBounds.y,
      maxX: Math.max(
        titleBounds ? titleBounds.x + titleBounds.width : 0,
        subtitleBounds ? subtitleBounds.x + subtitleBounds.width : 0
      ),
      maxY: Math.max(
        titleBounds ? titleBounds.y + titleBounds.height : 0,
        subtitleBounds ? subtitleBounds.y + subtitleBounds.height : 0
      )
    } : null;
    
    // Определяем, находятся ли логотип и текст отдельно (с зазором между ними)
    const logoAndTextSeparate = logoArea && textArea && (
      logoArea.x + logoArea.width + paddingPx < textArea.minX || // Логотип слева от текста
      textArea.maxX + paddingPx < logoArea.x || // Текст слева от логотипа
      logoArea.y + logoArea.height + paddingPx < textArea.minY || // Логотип выше текста
      textArea.maxY + paddingPx < logoArea.y // Текст выше логотипа
    );
    
    // Проверяем, находится ли текст по центру
    const isTextCentered = titleVPos === 'center' && !isWideFormat;
    const textCenterY = (minY + maxY) / 2;
    const isActuallyCentered = isTextCentered && Math.abs(textCenterY - height / 2) < height * 0.1; // Текст в пределах 10% от центра
    
    if (isActuallyCentered) {
      // Для центрированного текста рисуем однородную подложку на весь макет
      // Но только если opacity > 0 (если textGradientOpacity = 0, не рисуем вообще)
      if (opacity > 0) {
        const overlayColor = `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${centerOverlayOpacity * opacity})`;
        ctx.save();
        ctx.fillStyle = overlayColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    } else if (isWideFormat) {
      // Для широких форматов градиент идет слева направо
      const textWidth = maxX - minX;
      const padding = Math.max(textWidth * 1.0, paddingPx * 3); // Увеличиваем отступ до 100% или минимум 3*paddingPx
      const gradientStartX = Math.max(0, minX - padding); // Начинаем значительно левее текста
      // Увеличиваем длину градиента - заканчиваем значительно дальше конца текста
      const gradientEndX = Math.min(width, maxX + padding); // Заканчиваем значительно правее текста
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
      
      // Если логотип отдельно от текста, рисуем отдельную подложку для логотипа
      if (logoAndTextSeparate && logoArea) {
        const logoPadding = Math.max(logoArea.width * 1.0, paddingPx * 3); // Увеличиваем отступ до 100% или минимум 3*paddingPx
        const logoGradientStartX = Math.max(0, logoArea.x - logoPadding);
        const logoGradientEndX = Math.min(width, logoArea.x + logoArea.width + logoPadding);
        const logoGradientWidth = Math.abs(logoGradientEndX - logoGradientStartX);
        
        const logoGradient = ctx.createLinearGradient(
          logoGradientStartX, 0,
          logoGradientEndX, 0
        );
        
        logoGradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity})`);
        logoGradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${endOpacity})`);
        
        ctx.save();
        ctx.fillStyle = logoGradient;
        ctx.fillRect(logoGradientStartX, 0, logoGradientWidth, height);
        ctx.restore();
      }
    } else {
      // Для вертикальных форматов градиент идет сверху вниз или снизу вверх
      // Определяем направление по titleVPos
      const isTextAtTop = titleVPos === 'top' || (titleVPos === 'center' && (minY + maxY) / 2 < height / 2);
      
      // Проверяем, есть ли только логотип (без заголовка и подзаголовка)
      const hasOnlyLogo = logoBounds && !titleBounds && !subtitleBounds;
      
      // Когда текст снизу и есть логотип, нужно разделить градиент: для логотипа отдельно, для текста отдельно
      const hasLogoAndTextAtBottom = !isTextAtTop && logoBounds && (titleBounds || subtitleBounds);
      
      // Создаем область подложки от самого края canvas до конца текста
      // Увеличиваем область градиента - добавляем больший отступ сверху и снизу от текста
      const textHeight = maxY - minY;
      // Для текста внизу увеличиваем отступ до 200% высоты текста для лучшей читаемости
      // Для текста сверху: если только логотип, уменьшаем отступ, иначе используем стандартный
      const padding = isTextAtTop 
        ? (hasOnlyLogo 
          ? Math.max(textHeight * 0.3, paddingPx * 1.5) // Меньший отступ для одного логотипа
          : Math.max(textHeight * 1.0, paddingPx * 3)) // Стандартный отступ для текста
        : Math.max(textHeight * 2.0, paddingPx * 5); // Больше отступ снизу
      
      let gradientStartY, gradientEndY;
      if (isTextAtTop) {
        // Для текста сверху: градиент от верха canvas до конца текста
        gradientStartY = Math.max(0, minY - padding); // Начинаем значительно выше текста
        gradientEndY = Math.min(height, maxY + padding); // Заканчиваем значительно ниже текста
      } else {
        // Для текста внизу: градиент от самого низа canvas до начала текста
        // Если есть логотип и текст, градиент только для текста (логотип обработаем отдельно)
        if (hasLogoAndTextAtBottom) {
          // Градиент только для текста, начинаем от низа до начала текста
          const textMinY = Math.min(
            titleBounds ? titleBounds.y : height,
            subtitleBounds ? subtitleBounds.y : height
          );
          gradientStartY = height; // Начинаем от самого низа canvas
          gradientEndY = Math.max(0, textMinY - padding); // Заканчиваем выше начала текста с отступом
        } else {
          // Нет логотипа или только логотип - стандартный градиент
          gradientStartY = height; // Начинаем от самого низа canvas
          gradientEndY = Math.max(0, minY - padding); // Заканчиваем выше начала текста с отступом
        }
        // Убеждаемся, что градиент не идет выше начала текста
        if (gradientEndY > minY) {
          gradientEndY = minY;
        }
      }
      const gradientHeight = Math.abs(gradientStartY - gradientEndY);
      
      // Создаем вертикальный линейный градиент
      const gradient = ctx.createLinearGradient(
        0, gradientStartY,
        0, gradientEndY
      );
      
      // Для текста внизу увеличиваем непрозрачность до 95% для лучшей читаемости
      const startOpacity = isTextAtTop ? 0.8 * opacity : 0.95 * opacity;
      const endOpacity = 0 * opacity;
      
      if (isTextAtTop) {
        // Градиент сверху вниз: 80% вверху, 0% внизу
        gradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity})`);
        gradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${endOpacity})`);
      } else {
        // Градиент снизу вверх: 95% внизу, 0% вверху (увеличена непрозрачность для лучшей читаемости)
        // Добавляем промежуточные точки для более плавного перехода
        gradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${endOpacity})`);
        gradient.addColorStop(0.2, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity * 0.4})`);
        gradient.addColorStop(0.5, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity * 0.7})`);
        gradient.addColorStop(0.8, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity * 0.9})`);
        gradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${startOpacity})`);
      }
      
      // Рисуем градиент на всю ширину canvas
      ctx.save();
      ctx.fillStyle = gradient;
      // Используем минимальную Y координату для начала прямоугольника
      const rectY = Math.min(gradientStartY, gradientEndY);
      ctx.fillRect(0, rectY, width, gradientHeight);
      ctx.restore();
      
      // Если текст снизу и есть логотип, рисуем отдельный легкий градиент для логотипа
      // Но только если логотип и текст не разделены (иначе обработаем в блоке logoAndTextSeparate)
      if (hasLogoAndTextAtBottom && logoArea && !logoAndTextSeparate) {
        const logoPadding = Math.max(logoArea.height * 0.2, paddingPx * 0.5); // Минимальный отступ
        const logoOpacity = 0.8 * opacity * 0.3; // Очень легкое затемнение (30% от стандартного)
        
        const logoGradientStartY = Math.max(0, logoArea.y - logoPadding);
        const logoGradientEndY = Math.min(height, logoArea.y + logoArea.height + logoPadding);
        const logoGradientHeight = Math.abs(logoGradientEndY - logoGradientStartY);
        
        const logoGradient = ctx.createLinearGradient(
          0, logoGradientStartY,
          0, logoGradientEndY
        );
        
        // Легкий градиент сверху вниз для логотипа
        logoGradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${logoOpacity})`);
        logoGradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, 0)`);
        
        ctx.save();
        ctx.fillStyle = logoGradient;
        ctx.fillRect(0, logoGradientStartY, width, logoGradientHeight);
        ctx.restore();
      }
      
      // Если логотип отдельно от текста, рисуем отдельную подложку для логотипа
      // Важно: когда текст снизу, градиент для логотипа должен быть только под логотипом (сверху), а не на весь макет
      if (logoAndTextSeparate && logoArea) {
        // Если есть только логотип (без текста), уменьшаем отступ
        const hasOnlyLogoForSeparate = !titleBounds && !subtitleBounds;
        
        // Когда текст снизу, значительно уменьшаем отступ и непрозрачность для логотипа
        let logoPadding, logoOpacity;
        if (isTextAtTop) {
          logoPadding = hasOnlyLogoForSeparate
            ? Math.max(logoArea.height * 0.3, paddingPx * 1.5) // Меньший отступ для одного логотипа
            : Math.max(logoArea.height * 0.5, paddingPx * 2); // Стандартный отступ
          logoOpacity = startOpacity; // Стандартная непрозрачность
        } else {
          // Текст снизу - значительно уменьшаем отступ и непрозрачность
          logoPadding = hasOnlyLogoForSeparate
            ? Math.max(logoArea.height * 0.2, paddingPx * 0.5) // Минимальный отступ
            : Math.max(logoArea.height * 0.3, paddingPx * 1); // Уменьшенный отступ
          logoOpacity = startOpacity * 0.4; // Уменьшаем непрозрачность до 40% от стандартной
        }
        
        // Когда текст снизу, градиент для логотипа должен быть только под логотипом (сверху)
        // Не растягиваем градиент на весь макет
        let logoGradientStartY, logoGradientEndY;
        if (isTextAtTop) {
          // Текст сверху - градиент для логотипа идет от верха до конца логотипа
          logoGradientStartY = Math.max(0, logoArea.y - logoPadding);
          logoGradientEndY = Math.min(height, logoArea.y + logoArea.height + logoPadding);
        } else {
          // Текст снизу - градиент для логотипа только под логотипом (сверху), не на весь макет
          logoGradientStartY = Math.max(0, logoArea.y - logoPadding);
          // Ограничиваем градиент только областью логотипа + небольшой отступ
          logoGradientEndY = Math.min(height, logoArea.y + logoArea.height + logoPadding);
          // Не растягиваем градиент ниже, если текст внизу
        }
        
        const logoGradientHeight = Math.abs(logoGradientEndY - logoGradientStartY);
        
        const logoGradient = ctx.createLinearGradient(
          0, logoGradientStartY,
          0, logoGradientEndY
        );
        
        // Определяем направление градиента для логотипа (обычно сверху вниз)
        const isLogoAtTop = logoArea.y < height / 2;
        if (isLogoAtTop) {
          logoGradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${logoOpacity})`);
          logoGradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${endOpacity})`);
        } else {
          logoGradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${endOpacity})`);
          logoGradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${logoOpacity})`);
        }
        
        ctx.save();
        ctx.fillStyle = logoGradient;
        ctx.fillRect(0, logoGradientStartY, width, logoGradientHeight);
        ctx.restore();
      }
    }
  }
  
  // Отдельная подложка для лигала снизу
  if (legalTextBounds || legalContentBounds) {
    const legalBounds = legalTextBounds || legalContentBounds;
    
    // Увеличиваем область градиента для лигала - добавляем больший отступ сверху от текста лигала
    // Когда текст внизу, нужно давать больше градиента снизу для читаемости
    const legalHeight = legalBounds.height || 0;
    // Увеличиваем отступ до 200% высоты текста или минимум 5*paddingPx для лучшей читаемости
    const legalPadding = Math.max(legalHeight * 2.0, paddingPx * 5);
    
    // Градиент для лигала всегда снизу вверх (от самого края снизу до начала лигала с отступом)
    const legalGradientStartY = height; // Начинаем от самого края снизу
    const legalGradientEndY = Math.max(0, legalBounds.y - legalPadding); // Заканчиваем выше начала лигала с отступом
    const legalGradientHeight = Math.abs(legalGradientEndY - legalGradientStartY);
    
    if (legalGradientHeight > 0) {
      const legalGradient = ctx.createLinearGradient(
        0, legalGradientStartY,
        0, legalGradientEndY
      );
      
      // Градиент снизу вверх: увеличиваем непрозрачность внизу до 90% для лучшей читаемости
      // и делаем более плавный переход
      const legalStartOpacity = 0.9 * opacity; // Увеличиваем с 80% до 90%
      const legalEndOpacity = 0 * opacity;
      
      // Добавляем промежуточную точку для более плавного перехода
      legalGradient.addColorStop(0, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${legalStartOpacity})`);
      legalGradient.addColorStop(0.3, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${legalStartOpacity * 0.7})`);
      legalGradient.addColorStop(0.7, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${legalStartOpacity * 0.3})`);
      legalGradient.addColorStop(1, `rgba(${gradientColor.r}, ${gradientColor.g}, ${gradientColor.b}, ${legalEndOpacity})`);
      
      // Рисуем градиент на всю ширину canvas
      ctx.save();
      ctx.fillStyle = legalGradient;
      ctx.fillRect(0, legalGradientEndY, width, legalGradientHeight);
      ctx.restore();
    }
  }
};

