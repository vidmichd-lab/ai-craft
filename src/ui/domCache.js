const ELEMENT_IDS = [
  'paddingPercent',
  'paddingValue',
  'title',
  'titleColor',
  'titleColorHex',
  'titleSize',
  'titleWeight',
  'titleLetterSpacing',
  'titleLineHeight',
  'subtitle',
  'subtitleColor',
  'subtitleColorHex',
  'subtitleOpacity',
  'subtitleOpacityValue',
  'subtitleSize',
  'subtitleWeight',
  'subtitleLetterSpacing',
  'subtitleLineHeight',
  'subtitleGap',
  'legal',
  'legalColor',
  'legalColorHex',
  'legalOpacity',
  'legalOpacityValue',
  'legalSize',
  'legalWeight',
  'legalLetterSpacing',
  'legalLineHeight',
  'legalAlign',
  'age',
  'ageSize',
  'ageGapPercent',
  'showSubtitle',
  'showLegal',
  'showAge',
  'showKV',
  'showBlocks',
  'showGuides',
  'logoSelect',
  'logoSize',
  'logoSizeValue',
  'logoPreview',
  'logoActions',
  'logoThumb',
  'kvPreview',
  'kvActions',
  'kvThumb',
  'kvUpload',
  'bgColor',
  'bgColorHex',
  'bgPreview',
  'bgActions',
  'bgThumb',
  'bgUpload',
  'fontFamily',
  'previewCanvas',
  'previewSizeSelect',
  'presetSizesList',
  'sizesSummary',
  'namePrefix'
];

const dom = {};

export const cacheDom = () => {
  ELEMENT_IDS.forEach((id) => {
    dom[id] = document.getElementById(id);
  });
  return dom;
};

export const getDom = () => dom;


