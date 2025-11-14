import { getState, getCheckedSizes, setKey } from './state/store.js';

const TITLE_SUBTITLE_RATIO = 1 / 2;
const LEGAL_DESCENT_FACTOR = 0.2;

let previewCanvas = null;
let currentPreviewIndex = 0;
let rafId = null;
let lastRenderMeta = null;

const textMeasurementCache = new Map();

const cacheKey = (ctx, text) => {
  const font = ctx.font;
  return `${font}__${text}`;
};

const measureLineWidth = (ctx, text) => {
  if (!text) return 0;
  const key = cacheKey(ctx, text);
  if (textMeasurementCache.has(key)) {
    return textMeasurementCache.get(key);
  }
  const width = ctx.measureText(text).width;
  textMeasurementCache.set(key, width);
  return width;
};

const drawTextWithSpacing = (ctx, text, x, y, letterSpacing, align) => {
  ctx.textAlign = align;

  if (!letterSpacing) {
    ctx.fillText(text, x, y);
    return;
  }

  const characters = Array.from(text);
  const widths = characters.map((char) => measureLineWidth(ctx, char));
  const totalWidth = widths.reduce((acc, width) => acc + width, 0) + letterSpacing * (characters.length - 1);

  let startX = x;
  if (align === 'center') {
    startX = x - totalWidth / 2;
  } else if (align === 'right') {
    startX = x - totalWidth;
  }

  let currentX = startX;
  characters.forEach((char, index) => {
    ctx.fillText(char, currentX, y);
    currentX += widths[index] + letterSpacing;
  });
};

const wrapText = (ctx, text, maxWidth, fontSize, fontWeight, lineHeight) => {
  if (!text) return [];

  const lines = [];
  const paragraphs = text.split(/\n+/);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/\s+/);
    let currentLine = '';

    words.forEach((word) => {
      if (!word) return;
      const tentativeLine = currentLine ? `${currentLine} ${word}` : word;
      const tentativeWidth = measureLineWidth(ctx, tentativeLine);

      if (tentativeWidth <= maxWidth || !currentLine) {
        currentLine = tentativeLine;
        return;
      }

      // handle words longer than max width by breaking by characters
      if (!currentLine) {
        const chars = Array.from(word);
        let chunk = '';
        chars.forEach((char) => {
          const possible = chunk + char;
          if (measureLineWidth(ctx, possible) <= maxWidth || !chunk) {
            chunk = possible;
          } else {
            if (chunk) lines.push(chunk);
            chunk = char;
          }
        });
        if (chunk) {
          currentLine = chunk;
        }
        return;
      }

      lines.push(currentLine);
      currentLine = word;
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push('');
    }
  });

  return lines;
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
};

const getAlignedX = (align, canvasWidth, paddingPx) => {
  if (align === 'left') return paddingPx;
  if (align === 'center') return canvasWidth / 2;
  if (align === 'right') return canvasWidth - paddingPx;
  return paddingPx;
};

const getAlignedXWithinArea = (align, area) => {
  if (align === 'center') return (area.left + area.right) / 2;
  if (align === 'right') return area.right;
  return area.left;
};

const rectanglesOverlap = (r1, r2, margin = 10) => {
  return !(
    r1.x + r1.width + margin < r2.x ||
    r2.x + r2.width + margin < r1.x ||
    r1.y + r1.height + margin < r2.y ||
    r2.y + r2.height + margin < r1.y
  );
};

const mergeBounds = (...bounds) =>
  bounds
    .filter(Boolean)
    .reduce((acc, bound) => {
      if (!acc) return { ...bound };
      const minX = Math.min(acc.x, bound.x);
      const minY = Math.min(acc.y, bound.y);
      const maxX = Math.max(acc.x + acc.width, bound.x + bound.width);
      const maxY = Math.max(acc.y + acc.height, bound.y + bound.height);
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }, null);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getTextBlockBounds = (ctx, lines, baselineX, baselineY, fontSize, lineHeight, align, maxWidth) => {
  if (!lines.length) return null;

  let maxLineWidth = 0;
  lines.forEach((line) => {
    const width = measureLineWidth(ctx, line || ' ');
    if (width > maxLineWidth) {
      maxLineWidth = width;
    }
  });

  let leftX = baselineX;
  if (align === 'center') {
    leftX = baselineX - maxLineWidth / 2;
  } else if (align === 'right') {
    leftX = baselineX - maxLineWidth;
  }

  const topY = baselineY - fontSize;
  const height = fontSize + (lines.length - 1) * fontSize * lineHeight;

  return {
    x: leftX,
    y: topY,
    width: Math.min(maxWidth, maxLineWidth),
    height
  };
};

const renderToCanvas = (canvas, width, height, state) => {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const paddingPx = (state.paddingPercent / 100) * Math.min(width, height);
  const minDimension = Math.min(width, height);
  const aspectRatio = width / height;
  const layoutMode = state.layoutMode || 'auto';
  const horizontalThreshold = 1.35;
  const isHorizontalLayout = layoutMode === 'horizontal' || (layoutMode === 'auto' && aspectRatio >= horizontalThreshold);
  const isUltraWide = width >= height * 8;

  let logoSizePercent = state.logoSize;
  let titleSizeMultiplier = 1;
  let legalMultiplier = 1;
  let ageMultiplier = 1;

  if (height >= width * 1.5) {
    logoSizePercent *= 2;
  } else if (width >= height * 3) {
    logoSizePercent *= 0.75;
    titleSizeMultiplier = 2;
    legalMultiplier = 2;
    ageMultiplier = 2;
  }

  let leftSectionWidth;
  let rightSectionWidth;
  let maxTextWidth;
  let textArea = {
    left: paddingPx,
    right: width - paddingPx
  };
  if (isUltraWide) {
    leftSectionWidth = width;
    rightSectionWidth = 0;
    maxTextWidth = width - paddingPx * 2;
  } else if (isHorizontalLayout) {
    leftSectionWidth = width * 0.55;
    rightSectionWidth = width - leftSectionWidth - paddingPx;
    maxTextWidth = leftSectionWidth - paddingPx * 2;
    textArea.right = textArea.left + maxTextWidth;
  } else {
    maxTextWidth = width - paddingPx * 2;
    leftSectionWidth = width;
    rightSectionWidth = 0;
  }

  if (state.bgImage) {
    ctx.drawImage(state.bgImage, 0, 0, width, height);
  } else {
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  let legalLines = [];
  let legalSize = 0;
  let ageSizePx = 0;
  let ageTextWidth = 0;
  let legalTextBounds = null;
  let ageBoundsRect = null;
  if (state.showAge && state.age) {
    ageSizePx = (state.ageSize / 100) * minDimension * ageMultiplier;
    ctx.font = `${state.legalWeight} ${ageSizePx}px ${state.fontFamily}`;
    ageTextWidth = measureLineWidth(ctx, state.age || '');
  }

  // Calculate preliminary legalBlockHeight for positioning title/subtitle
  // This will be refined after positioning legal and age
  let preliminaryLegalBlockHeight = 0;
  
  // First, calculate age position to know how much space to reserve
  const ageGapPx = width * (state.ageGapPercent / 100);
  let ageReservedWidth = 0;
  if (state.showAge && state.age && ageTextWidth > 0) {
    ageReservedWidth = ageTextWidth + ageGapPx;
    preliminaryLegalBlockHeight = Math.max(preliminaryLegalBlockHeight, ageSizePx * 1.5);
  }
  
  if (state.showLegal && state.legal) {
    legalSize = (state.legalSize / 100) * minDimension * legalMultiplier;
    ctx.font = `${state.legalWeight} ${legalSize}px ${state.fontFamily}`;
    // Calculate available width for legal text (reserve space for age on the right)
    const availableWidth = isUltraWide || !isHorizontalLayout
      ? Math.max(0, width - paddingPx * 2)
      : Math.max(0, leftSectionWidth - paddingPx * 2);
    const legalMaxWidth = Math.max(50, availableWidth - ageReservedWidth);
    legalLines = wrapText(ctx, state.legal, legalMaxWidth, legalSize, state.legalWeight, state.legalLineHeight);
    preliminaryLegalBlockHeight = Math.max(preliminaryLegalBlockHeight, legalLines.length * legalSize * state.legalLineHeight);
  }
  
  // Use preliminary value for now
  let legalBlockHeight = preliminaryLegalBlockHeight;

  let legalContentBounds = null;
  let legalBounds = null;

  let logoBounds = null;
  let logoHeight = 0;
  if (state.logo) {
    let logoWidth = (width * logoSizePercent) / 100;
    let logoScale = logoWidth / state.logo.width;
    logoHeight = state.logo.height * logoScale;

    if (isUltraWide) {
      const availableHeight = Math.max(0, height - paddingPx * 2);
      logoHeight = Math.min(availableHeight * 0.3, state.logo.height * logoScale);
      logoScale = logoHeight / state.logo.height;
      logoWidth = state.logo.width * logoScale;
      logoBounds = {
        x: paddingPx,
        y: paddingPx + (availableHeight - logoHeight) / 2,
        width: logoWidth,
        height: logoHeight
      };
    } else if (isHorizontalLayout) {
      logoBounds = { x: paddingPx, y: paddingPx, width: logoWidth, height: logoHeight };
    } else {
      let logoX;
      let logoY;
      if (state.titleVPos === 'top') {
        if (state.logoPos === 'left') {
          logoX = paddingPx;
          logoY = paddingPx;
        } else if (state.logoPos === 'center') {
          logoX = (width - logoWidth) / 2;
          logoY = paddingPx;
        } else {
          logoX = paddingPx;
          logoY = paddingPx;
        }
      } else if (state.titleVPos === 'center') {
        if (state.logoPos === 'center') {
          logoX = (width - logoWidth) / 2;
          logoY = paddingPx;
        } else if (state.logoPos === 'left') {
          logoX = paddingPx;
          logoY = paddingPx;
        } else {
          logoX = (width - logoWidth) / 2;
          logoY = paddingPx;
        }
      } else {
        if (state.logoPos === 'left') {
          logoX = paddingPx;
          logoY = paddingPx;
        } else if (state.logoPos === 'center') {
          logoX = (width - logoWidth) / 2;
          logoY = paddingPx;
        } else {
          logoX = paddingPx;
          logoY = paddingPx;
        }
      }
      logoBounds = { x: logoX, y: logoY, width: logoWidth, height: logoHeight };
    }
  }

  let kvPlannedMeta = null;

  if (isUltraWide && state.showKV && state.kv) {
    const availableHeight = Math.max(0, height - paddingPx * 2);
    let kvScale = availableHeight > 0 ? (availableHeight * 0.75) / state.kv.height : 0;
    let kvW = state.kv.width * kvScale;
    let kvH = state.kv.height * kvScale;
    const maxKvWidth = Math.max(50, width * 0.25);
    if (kvW > maxKvWidth) {
      kvScale = maxKvWidth / state.kv.width;
      kvW = maxKvWidth;
      kvH = state.kv.height * kvScale;
    }
    const kvX = width / 2 - kvW / 2;
    const kvY = paddingPx + Math.max(0, (availableHeight - kvH) / 2);
    kvPlannedMeta = { kvX, kvY, kvW, kvH, kvScale, paddingPx };

    const textStart = kvX + kvW + Math.max(paddingPx, width * 0.02);
    textArea.left = Math.min(width - paddingPx - 200, Math.max(textStart, paddingPx));
    textArea.right = width - paddingPx;
    if (textArea.right - textArea.left < 200) {
      textArea.left = Math.max(paddingPx, textArea.right - 200);
    }
  } else if (isUltraWide) {
    const logoRight = logoBounds ? logoBounds.x + logoBounds.width : paddingPx;
    textArea.left = logoRight + paddingPx;
    textArea.right = width - paddingPx;
  } else if (isHorizontalLayout && state.showKV && state.kv) {
    const minTextRatio = width >= height * 3 ? 0.68 : 0.5;
    const widthAfterPadding = Math.max(0, width - paddingPx * 2);
    const minTextWidth = Math.max(widthAfterPadding * minTextRatio, 200);
    const gap = Math.max(paddingPx, width * 0.02);
    const availableHeight = Math.max(0, height - paddingPx * 2);

    let kvMeta = null;
    let textWidth = widthAfterPadding;

    const maxKvWidth = Math.max(0, widthAfterPadding - minTextWidth - gap);
    if (maxKvWidth > 10) {
      const scaleByHeight = availableHeight > 0 ? availableHeight / state.kv.height : 0;
      let kvW = state.kv.width * scaleByHeight;
      let kvH = availableHeight;
      if (kvW > maxKvWidth) {
        const scaleByWidth = maxKvWidth / state.kv.width;
        kvW = maxKvWidth;
        kvH = state.kv.height * scaleByWidth;
      }

      if (kvW > 10 && kvH > 10) {
        const kvScale = kvW / state.kv.width;
        const kvX = width - paddingPx - kvW;
        const kvY = paddingPx + Math.max(0, (availableHeight - kvH) / 2);
        kvMeta = { kvX, kvY, kvW, kvH, kvScale, paddingPx };
        textWidth = Math.max(minTextWidth, widthAfterPadding - kvW - gap);
      }
    }

    textWidth = Math.max(minTextWidth, Math.min(textWidth, widthAfterPadding));
    textArea.left = paddingPx;
    textArea.right = paddingPx + textWidth;

    if (kvMeta) {
      kvPlannedMeta = kvMeta;
    }
  }

  if (textArea.right <= textArea.left) {
    textArea.right = width - paddingPx;
    textArea.left = paddingPx;
  }
  maxTextWidth = Math.max(50, textArea.right - textArea.left);

  // Common baseline for legal and age - both should be on the same line at the bottom
  // Age is always at the bottom right, legal text takes remaining space on the left
  const commonBaselineY = height - paddingPx;
  
  if ((state.showLegal && legalLines.length > 0) || (state.showAge && state.age)) {
    // Calculate available width for legal text (leave space for age on the right if it exists)
    const availableWidth = width - paddingPx * 2;
    const ageWidth = (state.showAge && state.age && ageTextWidth > 0) ? ageTextWidth + ageGapPx : 0;
    let legalMaxWidthForFlex = Math.max(0, availableWidth - ageWidth);
    
    // Calculate legal text block - last line should be at commonBaselineY
    if (state.showLegal && legalLines.length > 0) {
      // Position legal text so that its last line baseline is at commonBaselineY
      // Last line is at index (legalLines.length - 1)
      // Baseline for last line = commonBaselineY
      // Baseline for first line = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight
      const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
      
      // Calculate bounds based on first line baseline
      legalTextBounds = getTextBlockBounds(ctx, legalLines, paddingPx, firstLineBaselineY, legalSize, state.legalLineHeight, 'left', legalMaxWidthForFlex);
      
      if (legalTextBounds) {
        // Verify that last line is at commonBaselineY (or adjust if needed)
        const calculatedLastBaseline = legalTextBounds.y + legalTextBounds.height - (legalTextBounds.height - legalSize);
        const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
        const legalTop = commonBaselineY - legalHeight;
        
        legalContentBounds = {
          x: paddingPx,
          y: Math.max(paddingPx, legalTop),
          width: legalMaxWidthForFlex,
          height: legalHeight
        };
        
        // Update legalTextBounds with correct position
        legalTextBounds = {
          x: paddingPx,
          y: legalContentBounds.y,
          width: legalMaxWidthForFlex,
          height: legalHeight
        };
      } else {
        const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
        const legalTop = commonBaselineY - legalHeight;
        legalContentBounds = {
          x: paddingPx,
          y: Math.max(paddingPx, legalTop),
          width: legalMaxWidthForFlex,
          height: legalHeight
        };
        legalTextBounds = { ...legalContentBounds };
      }
      
      legalBounds = { ...legalContentBounds };
    }

    // Position age at the same baseline as legal's last line (commonBaselineY)
    if (state.showAge && state.age && ageTextWidth > 0) {
      const ageBaseline = commonBaselineY;
      const ageY = ageBaseline - ageSizePx;
      const ageXRight = width - paddingPx;
      
      ageBoundsRect = {
        x: ageXRight - ageTextWidth,
        y: ageY,
        width: ageTextWidth,
        height: ageSizePx
      };
      
      // Always recalculate legal width to ensure it doesn't overlap with age
      // Calculate maximum allowed width for legal text to not overlap with age
      const maxLegalWidth = Math.max(50, ageBoundsRect.x - ageGapPx - paddingPx);
      
      // Update legalMaxWidthForFlex to ensure no overlap
      if (legalMaxWidthForFlex > maxLegalWidth) {
        legalMaxWidthForFlex = maxLegalWidth;
      }
      
      // Always recalculate legal text wrapping with the correct width to ensure no overlap
      if (state.showLegal && state.legal) {
        legalLines = wrapText(ctx, state.legal, legalMaxWidthForFlex, legalSize, state.legalWeight, state.legalLineHeight);
        
        // Recalculate legal bounds with adjusted width
        if (legalLines.length > 0) {
          const legalHeight = legalLines.length * legalSize * state.legalLineHeight;
          const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
          legalTextBounds = getTextBlockBounds(ctx, legalLines, paddingPx, firstLineBaselineY, legalSize, state.legalLineHeight, 'left', legalMaxWidthForFlex);
          
          if (legalTextBounds) {
            const legalTop = commonBaselineY - legalHeight;
            legalContentBounds = {
              x: paddingPx,
              y: Math.max(paddingPx, legalTop),
              width: legalMaxWidthForFlex,
              height: legalHeight
            };
            legalTextBounds = {
              x: paddingPx,
              y: legalContentBounds.y,
              width: legalMaxWidthForFlex,
              height: legalHeight
            };
          } else {
            const legalTop = commonBaselineY - legalHeight;
            legalContentBounds = {
              x: paddingPx,
              y: Math.max(paddingPx, legalTop),
              width: legalMaxWidthForFlex,
              height: legalHeight
            };
            legalTextBounds = { ...legalContentBounds };
          }
          legalBounds = { ...legalContentBounds };
        }
      }
    }
  }

  // Refine legalBlockHeight based on actual positions
  // Legal and age are on the same baseline at the bottom, so calculate height from top of legal to bottom
  if (legalTextBounds || legalContentBounds) {
    const legalTop = legalTextBounds ? legalTextBounds.y : (legalContentBounds ? legalContentBounds.y : height - paddingPx);
    const legalHeight = legalTextBounds ? legalTextBounds.height : (legalContentBounds ? legalContentBounds.height : 0);
    // Legal block extends from its top to the bottom (commonBaselineY)
    const commonBaselineY = height - paddingPx;
    legalBlockHeight = Math.max(legalBlockHeight, commonBaselineY - legalTop + paddingPx * 0.5);
  } else if (state.showLegal && legalLines.length > 0) {
    // Fallback: use calculated height
    legalBlockHeight = Math.max(legalBlockHeight, legalLines.length * legalSize * state.legalLineHeight + paddingPx * 0.5);
  }
  if (ageBoundsRect && ageSizePx > 0) {
    // Ensure we have enough space for age
    legalBlockHeight = Math.max(legalBlockHeight, ageSizePx + paddingPx * 0.5);
  }

  const baseTitleSize = (state.titleSize / 100) * minDimension;
  const titleSize = baseTitleSize * titleSizeMultiplier;
  const baseSubtitleSize = (state.subtitleSize / 100) * minDimension;
  const subtitleSize = baseSubtitleSize * titleSizeMultiplier;

  ctx.font = `${state.titleWeight} ${titleSize}px ${state.fontFamily}`;
  const titleLines = wrapText(ctx, state.title, maxTextWidth, titleSize, state.titleWeight, state.titleLineHeight);
  const titleBlockHeight = titleLines.length * titleSize * state.titleLineHeight;

  let subtitleBlockHeight = 0;
  let subtitleLines = [];
  if (state.showSubtitle && state.subtitle && height >= 150) {
    ctx.font = `${state.subtitleWeight} ${subtitleSize}px ${state.fontFamily}`;
    subtitleLines = wrapText(ctx, state.subtitle, maxTextWidth, subtitleSize, state.subtitleWeight, state.subtitleLineHeight);
    subtitleBlockHeight = subtitleLines.length * subtitleSize * state.subtitleLineHeight + (state.subtitleGap / 100) * height;
  }

  const totalTextHeight = titleBlockHeight + subtitleBlockHeight;

  let startY;

  if (isUltraWide) {
    const availableHeight = Math.max(0, height - paddingPx * 2);
    startY = paddingPx + (availableHeight - totalTextHeight) / 2 + titleSize;
  } else if (isHorizontalLayout) {
    startY = paddingPx + titleSize;
    if (legalBlockHeight > 0) {
      const bottomPadding = paddingPx + legalBlockHeight + paddingPx * 0.5;
      startY = Math.min(startY, height - bottomPadding - totalTextHeight + titleSize);
    }
    if (state.logo && logoBounds) {
      const logoBottom = logoBounds.y + logoBounds.height;
      const logoStart = logoBottom + paddingPx + titleSize;
      startY = Math.max(startY, logoStart);
    }
    startY = Math.max(paddingPx + titleSize, startY);
  } else {
    if (state.titleVPos === 'top') {
      if (state.logo && logoBounds) {
        startY = logoBounds.y + logoBounds.height + paddingPx + titleSize;
      } else {
        startY = paddingPx + titleSize;
      }
      const minStart = logoBounds ? logoBounds.y + logoBounds.height + titleSize : paddingPx + titleSize;
      startY = Math.max(minStart, startY);
    } else if (state.titleVPos === 'center') {
      const availableHeight = height - legalBlockHeight - paddingPx * 2;
      startY = (availableHeight - totalTextHeight) / 2 + paddingPx + titleSize;
    } else {
      const legalTop = height - paddingPx - legalBlockHeight;
      const subtitleGapPx = (state.subtitleGap / 100) * height;
      const gapFromSubtitle = subtitleLines.length > 0 ? Math.max(subtitleGapPx, subtitleSize * state.subtitleLineHeight * 0.3) : titleSize * state.titleLineHeight * 0.3;
      const safetyGap = Math.max(paddingPx * 0.5, gapFromSubtitle, legalSize * state.legalLineHeight * 0.5);
      const textBottom = legalTop - safetyGap;
      startY = textBottom - totalTextHeight + titleSize;
      if (startY < paddingPx + titleSize) {
        startY = paddingPx + titleSize;
      }
    }
  }

  const effectiveTitleAlign = state.titleAlign || 'left';
  const titleX = getAlignedXWithinArea(effectiveTitleAlign, textArea);
  ctx.font = `${state.titleWeight} ${titleSize}px ${state.fontFamily}`;
  ctx.fillStyle = state.titleColor;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = effectiveTitleAlign;

  const computeTextBounds = (baseY) => {
    const titleBoundsLocal = getTextBlockBounds(
      ctx,
      titleLines,
      titleX,
      baseY,
      titleSize,
      state.titleLineHeight,
      effectiveTitleAlign,
      maxTextWidth
    );

    let subtitleYLocal = baseY + titleBlockHeight + (state.subtitleGap / 100) * height;
    let subtitleBoundsLocal = null;

    if (state.showSubtitle && subtitleLines.length > 0) {
      subtitleBoundsLocal = getTextBlockBounds(
        ctx,
        subtitleLines,
        getAlignedXWithinArea(effectiveTitleAlign, textArea),
        subtitleYLocal,
        subtitleSize,
        state.subtitleLineHeight,
        effectiveTitleAlign,
        maxTextWidth
      );
    } else {
      subtitleYLocal = null;
    }

    return { titleBounds: titleBoundsLocal, subtitleBounds: subtitleBoundsLocal, subtitleY: subtitleYLocal };
  };

  let { titleBounds, subtitleBounds, subtitleY } = computeTextBounds(startY);

    if (!isHorizontalLayout && legalBlockHeight > 0) {
      const legalTop = height - paddingPx - legalBlockHeight;
      const subtitleGapPx = (state.subtitleGap / 100) * height;
      const desiredGap = Math.max(
        paddingPx * 0.5,
        state.showSubtitle && subtitleLines.length > 0 ? Math.max(subtitleGapPx, subtitleSize * state.subtitleLineHeight * 0.3) : titleSize * state.titleLineHeight * 0.3,
        legalSize * state.legalLineHeight * 0.4
      );
      const textBottom = Math.max(
        titleBounds ? titleBounds.y + titleBounds.height : -Infinity,
        subtitleBounds ? subtitleBounds.y + subtitleBounds.height : -Infinity
      );
      const allowedBottom = legalTop - desiredGap;
      if (textBottom > allowedBottom) {
        const shift = textBottom - allowedBottom;
        const minStart = paddingPx + titleSize;
        startY = Math.max(minStart, startY - shift);
        ({ titleBounds, subtitleBounds, subtitleY } = computeTextBounds(startY));
      }
    }

  titleLines.forEach((line, index) => {
    const lineY = startY + index * titleSize * state.titleLineHeight;
    if (state.titleLetterSpacing) {
      drawTextWithSpacing(ctx, line, titleX, lineY, state.titleLetterSpacing, effectiveTitleAlign);
    } else {
      ctx.fillText(line, titleX, lineY);
    }
  });

  if (state.showSubtitle && subtitleLines.length > 0 && subtitleY !== null) {
    const subtitleX = getAlignedXWithinArea(effectiveTitleAlign, textArea);
    const effectiveSubtitleAlign = effectiveTitleAlign;
    ctx.font = `${state.subtitleWeight} ${subtitleSize}px ${state.fontFamily}`;
    const { r, g, b } = hexToRgb(state.subtitleColor);
    const opacity = Math.max(0, Math.min(100, state.subtitleOpacity || 100)) / 100;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = effectiveSubtitleAlign;

    subtitleLines.forEach((line, index) => {
      const lineY = subtitleY + index * subtitleSize * state.subtitleLineHeight;
      if (state.subtitleLetterSpacing) {
        drawTextWithSpacing(ctx, line, subtitleX, lineY, state.subtitleLetterSpacing, effectiveSubtitleAlign);
      } else {
        ctx.fillText(line, subtitleX, lineY);
      }
    });
  }

  const textBlockBottom = Math.max(
    titleBounds ? titleBounds.y + titleBounds.height : startY,
    subtitleBounds ? subtitleBounds.y + subtitleBounds.height : 0
  );

  if (state.showKV && state.kv && !kvPlannedMeta) {
    if (!isUltraWide && !isHorizontalLayout) {
      const safeGapY = paddingPx * 0.5;
      const availableWidth = Math.max(0, width - paddingPx * 2);
      const textTop = titleBounds ? titleBounds.y : paddingPx;
      const logoBottom = logoBounds ? logoBounds.y + logoBounds.height : paddingPx;
      const topAreaStart = Math.max(paddingPx, logoBottom + safeGapY);
      const topAreaEnd = Math.max(topAreaStart, textTop - safeGapY);
      const topAreaHeight = Math.max(0, topAreaEnd - topAreaStart);

      const legalReserved = (state.showLegal && legalLines.length > 0) || (state.showAge && state.age) ? legalBlockHeight : 0;
      const bottomAreaStart = textBlockBottom + safeGapY;
      const bottomAreaEnd = Math.max(bottomAreaStart, height - paddingPx - legalReserved - safeGapY);
      const bottomAreaHeight = Math.max(0, bottomAreaEnd - bottomAreaStart);

      const computeFit = (availHeight) => {
        if (availableWidth <= 0 || availHeight <= 0) return null;
        const scale = Math.min(availableWidth / state.kv.width, availHeight / state.kv.height);
        if (!(scale > 0) || !Number.isFinite(scale)) return null;
        return {
          kvW: state.kv.width * scale,
          kvH: state.kv.height * scale,
          kvScale: scale
        };
      };

      const topFit = computeFit(topAreaHeight);
      const bottomFit = computeFit(bottomAreaHeight);
      const areaTop = topFit ? topFit.kvW * topFit.kvH : 0;
      const areaBottom = bottomFit ? bottomFit.kvW * bottomFit.kvH : 0;

      let placement = null;
      if (bottomFit && (areaBottom >= areaTop || !topFit)) {
        const kvX = paddingPx + Math.max(0, (availableWidth - bottomFit.kvW) / 2);
        const kvY = bottomAreaStart + Math.max(0, (bottomAreaHeight - bottomFit.kvH) / 2);
        placement = { ...bottomFit, kvX, kvY };
      } else if (topFit) {
        const kvX = paddingPx + Math.max(0, (availableWidth - topFit.kvW) / 2);
        const kvY = topAreaStart + Math.max(0, (topAreaHeight - topFit.kvH) / 2);
        placement = { ...topFit, kvX, kvY };
      }

      if (!placement) {
        const fullHeight = Math.max(0, height - paddingPx * 2 - legalReserved);
        const scale = Math.min(
          availableWidth / state.kv.width,
          fullHeight / state.kv.height
        );
        if (scale > 0 && Number.isFinite(scale)) {
          const kvW = state.kv.width * scale;
          const kvH = state.kv.height * scale;
          const kvX = paddingPx + Math.max(0, (availableWidth - kvW) / 2);
          const kvY = paddingPx + Math.max(0, (fullHeight - kvH) / 2);
          placement = { kvW, kvH, kvScale: scale, kvX, kvY };
        }
      }

      if (placement) {
        kvPlannedMeta = { ...placement, paddingPx };
      }
    }
  }

  if (state.showLegal && legalLines.length > 0) {
    ctx.font = `${state.legalWeight} ${legalSize}px ${state.fontFamily}`;
    const { r, g, b } = hexToRgb(state.legalColor);
    const opacity = Math.max(0, Math.min(100, state.legalOpacity || 100)) / 100;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = 'left';

    // Draw legal text - last line should be at commonBaselineY (height - paddingPx)
    const commonBaselineY = height - paddingPx;
    const firstLineBaselineY = commonBaselineY - (legalLines.length - 1) * legalSize * state.legalLineHeight;
    const drawX = paddingPx;
    
    // Get the maximum allowed width for legal text (to prevent overlap with age)
    const maxLegalWidth = legalTextBounds ? legalTextBounds.width : (width - paddingPx * 2);
    
    // Use clipping to ensure text doesn't go beyond the allowed area
    ctx.save();
    ctx.beginPath();
    ctx.rect(drawX, 0, maxLegalWidth, height);
    ctx.clip();
    
    legalLines.forEach((line, index) => {
      const lineY = firstLineBaselineY + index * legalSize * state.legalLineHeight;
      // Measure line width to ensure it doesn't exceed maxLegalWidth
      const lineWidth = measureLineWidth(ctx, line);
      if (lineWidth > maxLegalWidth) {
        // If line is too long, truncate it (shouldn't happen if wrapText works correctly)
        let truncatedLine = line;
        while (measureLineWidth(ctx, truncatedLine + '...') > maxLegalWidth && truncatedLine.length > 0) {
          truncatedLine = truncatedLine.slice(0, -1);
        }
        ctx.fillText(truncatedLine + '...', drawX, lineY);
      } else {
        ctx.fillText(line, drawX, lineY);
      }
    });
    
    ctx.restore();
  }

  if (state.showAge && state.age && ageBoundsRect) {
    ctx.font = `${state.legalWeight} ${ageSizePx}px ${state.fontFamily}`;
    const { r, g, b } = hexToRgb(state.legalColor);
    const opacity = Math.max(0, Math.min(100, state.legalOpacity || 100)) / 100;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    ctx.textAlign = 'left';
    // Draw age at the same baseline as legal's last line
    const commonBaselineY = height - paddingPx;
    ctx.fillText(state.age, ageBoundsRect.x, commonBaselineY);
  }

  let kvRenderMeta = null;
  if (kvPlannedMeta) {
    // Final check for KV intersection with legal text/age for all layout modes
    if (legalTextBounds || legalContentBounds || ageBoundsRect) {
      const kvBottom = kvPlannedMeta.kvY + kvPlannedMeta.kvH;
      const legalTop = legalTextBounds ? legalTextBounds.y : (legalContentBounds ? legalContentBounds.y : height);
      const ageTop = ageBoundsRect ? ageBoundsRect.y : height;
      const minLegalTop = Math.min(legalTop, ageTop);
      const safeGap = paddingPx * 0.5;
      
      // If KV overlaps with legal/age, adjust its position
      if (kvBottom + safeGap > minLegalTop) {
        const maxAllowedBottom = minLegalTop - safeGap;
        if (maxAllowedBottom >= kvPlannedMeta.kvY + kvPlannedMeta.kvH * 0.5) {
          // Move KV up if there's enough space
          kvPlannedMeta.kvY = Math.max(paddingPx, maxAllowedBottom - kvPlannedMeta.kvH);
        } else {
          // Reduce KV size to fit if moving up is not enough
          const availableHeight = Math.max(0, maxAllowedBottom - paddingPx - safeGap);
          if (availableHeight > 10) {
            const availableWidthForKV = Math.max(0, width - paddingPx * 2);
            const newScale = Math.min(
              kvPlannedMeta.kvScale || 1,
              availableHeight / state.kv.height,
              availableWidthForKV / state.kv.width
            );
            kvPlannedMeta.kvW = state.kv.width * newScale;
            kvPlannedMeta.kvH = state.kv.height * newScale;
            kvPlannedMeta.kvScale = newScale;
            kvPlannedMeta.kvX = paddingPx + Math.max(0, (availableWidthForKV - kvPlannedMeta.kvW) / 2);
            kvPlannedMeta.kvY = Math.max(paddingPx, maxAllowedBottom - kvPlannedMeta.kvH);
          }
        }
      }
    }
    
    ctx.drawImage(state.kv, kvPlannedMeta.kvX, kvPlannedMeta.kvY, kvPlannedMeta.kvW, kvPlannedMeta.kvH);
    kvRenderMeta = kvPlannedMeta;
  }

  if (state.logo && logoBounds) {
    ctx.drawImage(state.logo, logoBounds.x, logoBounds.y, logoBounds.width, logoBounds.height);
  }

  if (state.showGuides) {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(paddingPx, paddingPx, width - paddingPx * 2, height - paddingPx * 2);
  }

  if (state.showBlocks) {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#74c0fc';
    if (titleBounds) {
      ctx.fillRect(titleBounds.x, titleBounds.y, titleBounds.width, titleBounds.height);
    }
    if (subtitleBounds) {
      ctx.fillStyle = '#ffa94d';
      ctx.fillRect(subtitleBounds.x, subtitleBounds.y, subtitleBounds.width, subtitleBounds.height);
    }
    if (logoBounds) {
      ctx.fillStyle = '#9775fa';
      ctx.fillRect(logoBounds.x, logoBounds.y, logoBounds.width, logoBounds.height);
    }
    if (kvRenderMeta) {
      ctx.fillStyle = '#51cf66';
      ctx.fillRect(kvRenderMeta.kvX, kvRenderMeta.kvY, kvRenderMeta.kvW, kvRenderMeta.kvH);
    }
    if (legalTextBounds) {
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(
        legalTextBounds.x,
        legalTextBounds.y,
        isHorizontalLayout ? maxTextWidth : legalTextBounds.width,
        legalTextBounds.height
      );
    }
    if (ageBoundsRect) {
      ctx.fillStyle = '#ff922b';
      ctx.fillRect(ageBoundsRect.x, ageBoundsRect.y, ageBoundsRect.width, ageBoundsRect.height);
    } else if (!legalTextBounds && legalContentBounds) {
      ctx.fillStyle = '#ffd43b';
      ctx.fillRect(legalContentBounds.x, legalContentBounds.y, legalContentBounds.width, legalContentBounds.height);
    }
    ctx.globalAlpha = 1.0;
  }

  return {
    kvRenderMeta,
    canvasWidth: width,
    canvasHeight: height
  };
};

const doRender = () => {
  if (!previewCanvas) return;
  const sizes = getCheckedSizes();
  if (!sizes.length) return;

  if (currentPreviewIndex >= sizes.length) {
    currentPreviewIndex = 0;
  }

  const size = sizes[currentPreviewIndex];
  const state = getState();
  lastRenderMeta = renderToCanvas(previewCanvas, size.width, size.height, state);

  setKey('kvCanvasWidth', size.width);
  setKey('kvCanvasHeight', size.height);
};

export const renderer = {
  initialize(canvas) {
    previewCanvas = canvas;
  },
  render() {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(doRender);
  },
  getCurrentIndex() {
    return currentPreviewIndex;
  },
  setCurrentIndex(index) {
    currentPreviewIndex = Number(index) || 0;
    this.render();
  },
  getCheckedSizes() {
    return getCheckedSizes();
  },
  getRenderMeta() {
    return lastRenderMeta;
  }
};

renderer.__unsafe_getRenderToCanvas = () => ({ renderToCanvas });

export const clearTextMeasurementCache = () => textMeasurementCache.clear();


