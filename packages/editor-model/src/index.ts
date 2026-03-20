type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown, fallback: string) =>
  typeof value === 'string' ? value : fallback;

const readNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const readEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;

const slugifyIdentifier = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'template';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends RecordValue
      ? DeepPartial<T[K]>
      : T[K];
};

export type EditorSnapshotPair = {
  title: string;
  subtitle: string;
  bgColor: string;
  bgImageSelected: string;
  kvSelected?: string;
};

export type EditorSnapshot = {
  [key: string]: unknown;
  brandName: string;
  logoSelected: string;
  kvSelected: string;
  title: string;
  subtitle: string;
  bgColor: string;
  bgImageSelected: string;
  projectMode: 'layouts' | 'rsya';
  paddingPercent: number;
  showLogo: boolean;
  showKV: boolean;
  showSubtitle?: boolean;
  showLegal?: boolean;
  showAge?: boolean;
  layoutMode?: 'auto' | 'horizontal' | 'vertical';
  titleColor?: string;
  subtitleColor?: string;
  legalColor?: string;
  titleAlign?: 'left' | 'center' | 'right';
  titleVPos?: 'top' | 'center' | 'bottom';
  titleSize?: number;
  subtitleSize?: number;
  titleWeight?: string;
  subtitleWeight?: string;
  titleLineHeight?: number;
  subtitleLineHeight?: number;
  titleLetterSpacing?: number;
  subtitleLetterSpacing?: number;
  titleFontFamily?: string;
  subtitleFontFamily?: string;
  logoSize?: number;
  logoPos?: 'left' | 'center' | 'right';
  kvPosition?: 'left' | 'center' | 'right';
  bgSize?: 'cover' | 'contain' | 'fill' | 'tile';
  bgPosition?: 'left' | 'center' | 'right';
  bgVPosition?: 'top' | 'center' | 'bottom';
  bgImageSize?: number;
  legal?: string;
  age?: string;
  ageSize?: number;
  legalSize?: number;
  titleSubtitlePairs: EditorSnapshotPair[];
  activePairIndex: number;
};

export type EditorAssetTarget = 'background' | 'logo' | 'kv';

export type EditorSnapshotPreview = {
  title: string;
  subtitle: string;
  backgroundColor: string;
  backgroundImage: string;
  logo: string;
};

export type ProjectMode = EditorSnapshot['projectMode'];
export type LayoutVariant = 'hero-left' | 'hero-centered' | 'split';
export type LayoutDensity = 'compact' | 'default';
export type LayoutAlignment = 'left' | 'center';
export type BackgroundFit = 'cover' | 'contain' | 'fill' | 'tile';
export type HorizontalPosition = 'left' | 'center' | 'right';
export type VerticalPosition = 'top' | 'center' | 'bottom';
export type SurfaceMode = 'auto' | 'horizontal' | 'vertical';

export type AssetBindings = {
  logo?: string;
  background?: string;
  kv?: string;
};

export type BrandTheme = {
  id: string;
  name: string;
  colors: {
    background: string;
    headline: string;
    subheadline: string;
    legal: string;
  };
};

export type Typography = {
  titleSize: number;
  subtitleSize: number;
  legalSize: number;
  ageSize: number;
  titleWeight: string;
  subtitleWeight: string;
  titleFontFamily: string;
  subtitleFontFamily: string;
  titleLineHeight: number;
  subtitleLineHeight: number;
  titleLetterSpacing: number;
  subtitleLetterSpacing: number;
};

export type LegalBlock = {
  body: string;
  ageMark: string;
  enabled: boolean;
  color: string;
};

export type LayoutRules = {
  projectMode: ProjectMode;
  variant: LayoutVariant;
  density: LayoutDensity;
  alignment: LayoutAlignment;
  paddingPercent: number;
  surfaceMode: SurfaceMode;
  textPositionY: VerticalPosition;
  logoPosition: HorizontalPosition;
  kvPosition: HorizontalPosition;
  backgroundFit: BackgroundFit;
  backgroundPositionX: HorizontalPosition;
  backgroundPositionY: VerticalPosition;
  backgroundScalePercent: number;
  logoSize: number;
  showLogo: boolean;
  showKV: boolean;
  showSubtitle: boolean;
};

export type ProjectDocument = {
  version: 2;
  templateId?: string;
  themeId?: string;
  brand: {
    name: string;
  };
  content: {
    headline: string;
    subheadline: string;
  };
  assets: AssetBindings;
  theme: BrandTheme;
  typography: Typography;
  legal: LegalBlock;
  layout: LayoutRules;
  metadata: {
    source: 'manual' | 'legacy-import' | 'template';
    activePairIndex: number;
    pairCount: number;
  };
};

export type EditorDocument = ProjectDocument;

export type TemplateSlotDefinition = {
  required: boolean;
  maxLength?: number;
};

export type TemplateAssetDefinition = {
  required: boolean;
};

export type TemplateDefinition = {
  version: 1;
  id: string;
  name: string;
  category: 'banner' | 'landing' | 'email';
  recipe: LayoutVariant;
  document: ProjectDocument;
  slots: {
    headline: TemplateSlotDefinition;
    subheadline: TemplateSlotDefinition;
    legal: TemplateSlotDefinition;
  };
  assets: {
    logo: TemplateAssetDefinition;
    background: TemplateAssetDefinition;
    kv: TemplateAssetDefinition;
  };
  constraints: {
    densities: LayoutDensity[];
    alignments: LayoutAlignment[];
    variants: LayoutVariant[];
  };
  defaults: Record<string, unknown>;
};

export type StoredTemplateState = {
  kind: 'template-definition';
  version: 2;
  definition: TemplateDefinition;
  legacySnapshot: EditorSnapshot;
};

export const createDefaultEditorSnapshot = (): EditorSnapshot => ({
  brandName: 'Практикума',
  logoSelected: '',
  kvSelected: 'assets/3d/logos/40.webp',
  title: 'Курс «Frontend-разработчик» от Практикума',
  subtitle: 'Научитесь писать код для сайтов и веб-сервисов — с нуля за 10 месяцев',
  bgColor: '#1e1e1e',
  bgImageSelected: '',
  projectMode: 'rsya',
  paddingPercent: 5,
  showLogo: true,
  showKV: true,
  showSubtitle: true,
  showLegal: true,
  showAge: true,
  showBlocks: false,
  showGuides: false,
  titleColor: '#ffffff',
  subtitleColor: '#e0e0e0',
  titleAlign: 'left',
  titleVPos: 'top',
  titleSize: 8,
  subtitleSize: 4,
  titleWeight: 'Regular',
  subtitleWeight: 'Regular',
  titleLineHeight: 1.1,
  subtitleLineHeight: 1.2,
  titleLetterSpacing: 0,
  subtitleLetterSpacing: 0,
  titleFontFamily: 'YS Text',
  subtitleFontFamily: 'YS Text',
  logoSize: 40,
  logoPos: 'left',
  kvPosition: 'center',
  layoutMode: 'auto',
  bgSize: 'cover',
  bgPosition: 'center',
  bgVPosition: 'center',
  bgImageSize: 100,
  legalColor: '#ffffff',
  legalSize: 2,
  ageSize: 4,
  legal:
    'Рекламодатель АНО ДПО «Образовательные технологии Яндекса», действующая на основании лицензии N° ЛО35-01298-77/00185314 от 24 марта 2015 года.',
  age: '18+',
  titleSubtitlePairs: [
    {
      title: 'Курс «Frontend-разработчик» от Практикума',
      subtitle: 'Научитесь писать код для сайтов и веб-сервисов — с нуля за 10 месяцев',
      bgColor: '#1e1e1e',
      bgImageSelected: '',
      kvSelected: 'assets/3d/logos/40.webp'
    }
  ],
  activePairIndex: 0
});

export const normalizeEditorSnapshot = (value: RecordValue | null | undefined): EditorSnapshot => {
  const fallback = createDefaultEditorSnapshot();
  const pairs = Array.isArray(value?.titleSubtitlePairs) ? value.titleSubtitlePairs : [];
  const activeIndex = Number.isInteger(value?.activePairIndex) ? Number(value?.activePairIndex) : 0;
  const activePair = (pairs[activeIndex] || pairs[0] || {}) as RecordValue;
  const hasOwnField = (field: string) => Boolean(value) && Object.prototype.hasOwnProperty.call(value, field);
  const title = String(hasOwnField('title') ? value?.title : (activePair.title || fallback.title));
  const subtitle = String(hasOwnField('subtitle') ? value?.subtitle : (activePair.subtitle || fallback.subtitle));
  const bgColor = String(hasOwnField('bgColor') ? value?.bgColor : (activePair.bgColor || fallback.bgColor));
  const bgImageSelected = String(
    hasOwnField('bgImageSelected')
      ? value?.bgImageSelected
      : (activePair.bgImageSelected || value?.bgImage || '')
  );
  const kvSelected = String(hasOwnField('kvSelected') ? value?.kvSelected : (activePair.kvSelected || fallback.kvSelected));

  return {
    ...fallback,
    ...(value || {}),
    brandName: String(value?.brandName || fallback.brandName),
    logoSelected: String(value?.logoSelected || fallback.logoSelected),
    kvSelected,
    title,
    subtitle,
    bgColor,
    bgImageSelected,
    projectMode: value?.projectMode === 'layouts' ? 'layouts' : fallback.projectMode,
    paddingPercent: Number.isFinite(Number(value?.paddingPercent)) ? Number(value?.paddingPercent) : fallback.paddingPercent,
    showLogo: value?.showLogo !== undefined ? Boolean(value.showLogo) : fallback.showLogo,
    showKV: value?.showKV !== undefined ? Boolean(value.showKV) : fallback.showKV,
    showSubtitle: value?.showSubtitle !== undefined ? Boolean(value.showSubtitle) : Boolean(fallback.showSubtitle),
    showLegal: value?.showLegal !== undefined ? Boolean(value.showLegal) : Boolean(fallback.showLegal),
    titleSubtitlePairs: [
      {
        title,
        subtitle,
        bgColor,
        bgImageSelected,
        kvSelected
      }
    ],
    activePairIndex: 0
  };
};

const inferLayoutVariant = (snapshot: EditorSnapshot): LayoutVariant => {
  if (snapshot.titleAlign === 'center') {
    return 'hero-centered';
  }

  if (snapshot.kvPosition === 'left' || snapshot.kvPosition === 'right') {
    return 'split';
  }

  return 'hero-left';
};

export const createDefaultProjectDocument = (): ProjectDocument => {
  const fallback = createDefaultEditorSnapshot();

  return {
    version: 2,
    themeId: 'praktikum-default',
    brand: {
      name: fallback.brandName
    },
    content: {
      headline: fallback.title,
      subheadline: fallback.subtitle
    },
    assets: {
      logo: fallback.logoSelected,
      background: fallback.bgImageSelected,
      kv: fallback.kvSelected
    },
    theme: {
      id: 'praktikum-default',
      name: fallback.brandName,
      colors: {
        background: fallback.bgColor,
        headline: String(fallback.titleColor || '#ffffff'),
        subheadline: String(fallback.subtitleColor || '#e0e0e0'),
        legal: String(fallback.legalColor || '#ffffff')
      }
    },
    typography: {
      titleSize: Number(fallback.titleSize || 8),
      subtitleSize: Number(fallback.subtitleSize || 4),
      legalSize: Number(fallback.legalSize || 2),
      ageSize: Number(fallback.ageSize || 4),
      titleWeight: String(fallback.titleWeight || 'Regular'),
      subtitleWeight: String(fallback.subtitleWeight || 'Regular'),
      titleFontFamily: String(fallback.titleFontFamily || 'YS Text'),
      subtitleFontFamily: String(fallback.subtitleFontFamily || 'YS Text'),
      titleLineHeight: Number(fallback.titleLineHeight || 1.1),
      subtitleLineHeight: Number(fallback.subtitleLineHeight || 1.2),
      titleLetterSpacing: Number(fallback.titleLetterSpacing || 0),
      subtitleLetterSpacing: Number(fallback.subtitleLetterSpacing || 0)
    },
    legal: {
      body: String(fallback.legal || ''),
      ageMark: String(fallback.age || '18+'),
      enabled: Boolean(fallback.showLegal),
      color: String(fallback.legalColor || '#ffffff')
    },
    layout: {
      projectMode: fallback.projectMode,
      variant: inferLayoutVariant(fallback),
      density: fallback.paddingPercent <= 4 ? 'compact' : 'default',
      alignment: fallback.titleAlign === 'center' ? 'center' : 'left',
      paddingPercent: fallback.paddingPercent,
      surfaceMode: fallback.layoutMode || 'auto',
      textPositionY: fallback.titleVPos || 'top',
      logoPosition: fallback.logoPos || 'left',
      kvPosition: fallback.kvPosition || 'center',
      backgroundFit: fallback.bgSize || 'cover',
      backgroundPositionX: fallback.bgPosition || 'center',
      backgroundPositionY: fallback.bgVPosition || 'center',
      backgroundScalePercent: Number(fallback.bgImageSize || 100),
      logoSize: Number(fallback.logoSize || 40),
      showLogo: fallback.showLogo,
      showKV: fallback.showKV,
      showSubtitle: Boolean(fallback.showSubtitle)
    },
    metadata: {
      source: 'manual',
      activePairIndex: 0,
      pairCount: 1
    }
  };
};

export const projectDocumentFromLegacySnapshot = (
  value: RecordValue | null | undefined
): ProjectDocument => {
  const snapshot = normalizeEditorSnapshot(value);
  const fallback = createDefaultProjectDocument();
  const pairCount = Array.isArray(value?.titleSubtitlePairs) && value.titleSubtitlePairs.length
    ? value.titleSubtitlePairs.length
    : 1;

  return {
    ...fallback,
    brand: {
      name: snapshot.brandName
    },
    content: {
      headline: snapshot.title,
      subheadline: snapshot.subtitle
    },
    assets: {
      logo: snapshot.logoSelected || '',
      background: snapshot.bgImageSelected || '',
      kv: snapshot.kvSelected || ''
    },
    theme: {
      ...fallback.theme,
      name: snapshot.brandName,
      colors: {
        background: snapshot.bgColor,
        headline: String(snapshot.titleColor || fallback.theme.colors.headline),
        subheadline: String(snapshot.subtitleColor || fallback.theme.colors.subheadline),
        legal: String(snapshot.legalColor || fallback.theme.colors.legal)
      }
    },
    typography: {
      titleSize: Number(snapshot.titleSize || fallback.typography.titleSize),
      subtitleSize: Number(snapshot.subtitleSize || fallback.typography.subtitleSize),
      legalSize: Number(snapshot.legalSize || fallback.typography.legalSize),
      ageSize: Number(snapshot.ageSize || fallback.typography.ageSize),
      titleWeight: String(snapshot.titleWeight || fallback.typography.titleWeight),
      subtitleWeight: String(snapshot.subtitleWeight || fallback.typography.subtitleWeight),
      titleFontFamily: String(snapshot.titleFontFamily || fallback.typography.titleFontFamily),
      subtitleFontFamily: String(snapshot.subtitleFontFamily || fallback.typography.subtitleFontFamily),
      titleLineHeight: Number(snapshot.titleLineHeight || fallback.typography.titleLineHeight),
      subtitleLineHeight: Number(snapshot.subtitleLineHeight || fallback.typography.subtitleLineHeight),
      titleLetterSpacing: Number(snapshot.titleLetterSpacing || fallback.typography.titleLetterSpacing),
      subtitleLetterSpacing: Number(snapshot.subtitleLetterSpacing || fallback.typography.subtitleLetterSpacing)
    },
    legal: {
      body: String(snapshot.legal || fallback.legal.body),
      ageMark: String(snapshot.age || fallback.legal.ageMark),
      enabled: Boolean(snapshot.showLegal ?? fallback.legal.enabled),
      color: String(snapshot.legalColor || fallback.legal.color)
    },
    layout: {
      projectMode: snapshot.projectMode,
      variant: inferLayoutVariant(snapshot),
      density: snapshot.paddingPercent <= 4 ? 'compact' : 'default',
      alignment: snapshot.titleAlign === 'center' ? 'center' : 'left',
      paddingPercent: Number(snapshot.paddingPercent || fallback.layout.paddingPercent),
      surfaceMode: readEnum(snapshot.layoutMode, ['auto', 'horizontal', 'vertical'], fallback.layout.surfaceMode),
      textPositionY: readEnum(snapshot.titleVPos, ['top', 'center', 'bottom'], fallback.layout.textPositionY),
      logoPosition: readEnum(snapshot.logoPos, ['left', 'center', 'right'], fallback.layout.logoPosition),
      kvPosition: readEnum(snapshot.kvPosition, ['left', 'center', 'right'], fallback.layout.kvPosition),
      backgroundFit: readEnum(snapshot.bgSize, ['cover', 'contain', 'fill', 'tile'], fallback.layout.backgroundFit),
      backgroundPositionX: readEnum(snapshot.bgPosition, ['left', 'center', 'right'], fallback.layout.backgroundPositionX),
      backgroundPositionY: readEnum(snapshot.bgVPosition, ['top', 'center', 'bottom'], fallback.layout.backgroundPositionY),
      backgroundScalePercent: Number(snapshot.bgImageSize || fallback.layout.backgroundScalePercent),
      logoSize: Number(snapshot.logoSize || fallback.layout.logoSize),
      showLogo: Boolean(snapshot.showLogo),
      showKV: Boolean(snapshot.showKV),
      showSubtitle: Boolean(snapshot.showSubtitle ?? fallback.layout.showSubtitle)
    },
    metadata: {
      source: 'legacy-import',
      activePairIndex: Number(snapshot.activePairIndex || 0),
      pairCount
    }
  };
};

export const normalizeProjectDocument = (value: RecordValue | null | undefined): ProjectDocument => {
  const fallback = createDefaultProjectDocument();
  if (!value) {
    return fallback;
  }

  if (isRecord(value.document)) {
    return normalizeProjectDocument(value.document);
  }

  const looksLikeStructuredDocument =
    isRecord(value.brand) ||
    isRecord(value.content) ||
    isRecord(value.assets) ||
    isRecord(value.layout);

  if (!looksLikeStructuredDocument) {
    return projectDocumentFromLegacySnapshot(value);
  }

  const brand = isRecord(value.brand) ? value.brand : {};
  const content = isRecord(value.content) ? value.content : {};
  const assets = isRecord(value.assets) ? value.assets : {};
  const theme = isRecord(value.theme) ? value.theme : {};
  const themeColors = isRecord(theme.colors) ? theme.colors : {};
  const typography = isRecord(value.typography) ? value.typography : {};
  const legal = isRecord(value.legal) ? value.legal : {};
  const layout = isRecord(value.layout) ? value.layout : {};
  const metadata = isRecord(value.metadata) ? value.metadata : {};

  return {
    version: 2,
    templateId: readString(value.templateId, fallback.templateId || ''),
    themeId: readString(value.themeId, fallback.themeId || fallback.theme.id),
    brand: {
      name: readString(brand.name, fallback.brand.name)
    },
    content: {
      headline: readString(content.headline, fallback.content.headline),
      subheadline: readString(content.subheadline, fallback.content.subheadline)
    },
    assets: {
      logo: readString(assets.logo, fallback.assets.logo || ''),
      background: readString(assets.background, fallback.assets.background || ''),
      kv: readString(assets.kv, fallback.assets.kv || '')
    },
    theme: {
      id: readString(theme.id, fallback.theme.id),
      name: readString(theme.name, readString(brand.name, fallback.theme.name)),
      colors: {
        background: readString(themeColors.background, fallback.theme.colors.background),
        headline: readString(themeColors.headline, fallback.theme.colors.headline),
        subheadline: readString(themeColors.subheadline, fallback.theme.colors.subheadline),
        legal: readString(themeColors.legal, fallback.theme.colors.legal)
      }
    },
    typography: {
      titleSize: readNumber(typography.titleSize, fallback.typography.titleSize),
      subtitleSize: readNumber(typography.subtitleSize, fallback.typography.subtitleSize),
      legalSize: readNumber(typography.legalSize, fallback.typography.legalSize),
      ageSize: readNumber(typography.ageSize, fallback.typography.ageSize),
      titleWeight: readString(typography.titleWeight, fallback.typography.titleWeight),
      subtitleWeight: readString(typography.subtitleWeight, fallback.typography.subtitleWeight),
      titleFontFamily: readString(typography.titleFontFamily, fallback.typography.titleFontFamily),
      subtitleFontFamily: readString(typography.subtitleFontFamily, fallback.typography.subtitleFontFamily),
      titleLineHeight: readNumber(typography.titleLineHeight, fallback.typography.titleLineHeight),
      subtitleLineHeight: readNumber(typography.subtitleLineHeight, fallback.typography.subtitleLineHeight),
      titleLetterSpacing: readNumber(typography.titleLetterSpacing, fallback.typography.titleLetterSpacing),
      subtitleLetterSpacing: readNumber(typography.subtitleLetterSpacing, fallback.typography.subtitleLetterSpacing)
    },
    legal: {
      body: readString(legal.body, fallback.legal.body),
      ageMark: readString(legal.ageMark, fallback.legal.ageMark),
      enabled: readBoolean(legal.enabled, fallback.legal.enabled),
      color: readString(legal.color, fallback.legal.color)
    },
    layout: {
      projectMode: readEnum(layout.projectMode, ['layouts', 'rsya'], fallback.layout.projectMode),
      variant: readEnum(layout.variant, ['hero-left', 'hero-centered', 'split'], fallback.layout.variant),
      density: readEnum(layout.density, ['compact', 'default'], fallback.layout.density),
      alignment: readEnum(layout.alignment, ['left', 'center'], fallback.layout.alignment),
      paddingPercent: readNumber(layout.paddingPercent, fallback.layout.paddingPercent),
      surfaceMode: readEnum(layout.surfaceMode, ['auto', 'horizontal', 'vertical'], fallback.layout.surfaceMode),
      textPositionY: readEnum(layout.textPositionY, ['top', 'center', 'bottom'], fallback.layout.textPositionY),
      logoPosition: readEnum(layout.logoPosition, ['left', 'center', 'right'], fallback.layout.logoPosition),
      kvPosition: readEnum(layout.kvPosition, ['left', 'center', 'right'], fallback.layout.kvPosition),
      backgroundFit: readEnum(layout.backgroundFit, ['cover', 'contain', 'fill', 'tile'], fallback.layout.backgroundFit),
      backgroundPositionX: readEnum(layout.backgroundPositionX, ['left', 'center', 'right'], fallback.layout.backgroundPositionX),
      backgroundPositionY: readEnum(layout.backgroundPositionY, ['top', 'center', 'bottom'], fallback.layout.backgroundPositionY),
      backgroundScalePercent: readNumber(layout.backgroundScalePercent, fallback.layout.backgroundScalePercent),
      logoSize: readNumber(layout.logoSize, fallback.layout.logoSize),
      showLogo: readBoolean(layout.showLogo, fallback.layout.showLogo),
      showKV: readBoolean(layout.showKV, fallback.layout.showKV),
      showSubtitle: readBoolean(layout.showSubtitle, fallback.layout.showSubtitle)
    },
    metadata: {
      source: readEnum(metadata.source, ['manual', 'legacy-import', 'template'], fallback.metadata.source),
      activePairIndex: readNumber(metadata.activePairIndex, fallback.metadata.activePairIndex),
      pairCount: readNumber(metadata.pairCount, fallback.metadata.pairCount)
    }
  };
};

export const patchProjectDocument = (
  current: ProjectDocument | RecordValue | null | undefined,
  patch: DeepPartial<ProjectDocument>
): ProjectDocument => {
  const base = normalizeProjectDocument(current as RecordValue | null | undefined);

  return normalizeProjectDocument({
    ...base,
    ...patch,
    brand: {
      ...base.brand,
      ...(patch.brand || {})
    },
    content: {
      ...base.content,
      ...(patch.content || {})
    },
    assets: {
      ...base.assets,
      ...(patch.assets || {})
    },
    theme: {
      ...base.theme,
      ...(patch.theme || {}),
      colors: {
        ...base.theme.colors,
        ...(patch.theme?.colors || {})
      }
    },
    typography: {
      ...base.typography,
      ...(patch.typography || {})
    },
    legal: {
      ...base.legal,
      ...(patch.legal || {})
    },
    layout: {
      ...base.layout,
      ...(patch.layout || {})
    },
    metadata: {
      ...base.metadata,
      ...(patch.metadata || {})
    }
  });
};

export const projectDocumentToLegacySnapshot = (
  value: ProjectDocument | RecordValue | null | undefined
): EditorSnapshot => {
  const document = normalizeProjectDocument(value as RecordValue | null | undefined);
  const fallback = createDefaultEditorSnapshot();
  const titleAlign: EditorSnapshot['titleAlign'] =
    document.layout.alignment === 'center' ? 'center' : 'left';

  return normalizeEditorSnapshot({
    ...fallback,
    brandName: document.brand.name,
    logoSelected: document.assets.logo || '',
    kvSelected: document.assets.kv || '',
    title: document.content.headline,
    subtitle: document.content.subheadline,
    bgColor: document.theme.colors.background,
    bgImageSelected: document.assets.background || '',
    projectMode: document.layout.projectMode,
    paddingPercent: document.layout.paddingPercent,
    showLogo: document.layout.showLogo,
    showKV: document.layout.showKV,
    showSubtitle: document.layout.showSubtitle,
    showLegal: document.legal.enabled,
    titleColor: document.theme.colors.headline,
    subtitleColor: document.theme.colors.subheadline,
    legalColor: document.legal.color,
    titleAlign,
    titleVPos: document.layout.textPositionY,
    titleSize: document.typography.titleSize,
    subtitleSize: document.typography.subtitleSize,
    titleWeight: document.typography.titleWeight,
    subtitleWeight: document.typography.subtitleWeight,
    titleLineHeight: document.typography.titleLineHeight,
    subtitleLineHeight: document.typography.subtitleLineHeight,
    titleLetterSpacing: document.typography.titleLetterSpacing,
    subtitleLetterSpacing: document.typography.subtitleLetterSpacing,
    titleFontFamily: document.typography.titleFontFamily,
    subtitleFontFamily: document.typography.subtitleFontFamily,
    logoSize: document.layout.logoSize,
    logoPos: document.layout.logoPosition,
    kvPosition: document.layout.kvPosition,
    layoutMode: document.layout.surfaceMode,
    bgSize: document.layout.backgroundFit,
    bgPosition: document.layout.backgroundPositionX,
    bgVPosition: document.layout.backgroundPositionY,
    bgImageSize: document.layout.backgroundScalePercent,
    legal: document.legal.body,
    age: document.legal.ageMark,
    ageSize: document.typography.ageSize,
    legalSize: document.typography.legalSize,
    titleSubtitlePairs: [
      {
        title: document.content.headline,
        subtitle: document.content.subheadline,
        bgColor: document.theme.colors.background,
        bgImageSelected: document.assets.background || '',
        kvSelected: document.assets.kv || ''
      }
    ],
    activePairIndex: 0
  });
};

export const createDefaultEditorDocument = createDefaultProjectDocument;
export const normalizeEditorDocument = normalizeProjectDocument;
export const patchEditorDocument = patchProjectDocument;

export const legacySnapshotAdapter = {
  fromDocument: projectDocumentToLegacySnapshot,
  toDocument: projectDocumentFromLegacySnapshot
};

export const createTemplateDefinition = (
  name: string,
  document: ProjectDocument | RecordValue | null | undefined
): TemplateDefinition => {
  const normalizedDocument = patchProjectDocument(document, {
    metadata: {
      source: 'template'
    }
  });

  return {
    version: 1,
    id: slugifyIdentifier(name),
    name: name.trim() || 'Template',
    category: 'banner',
    recipe: normalizedDocument.layout.variant,
    document: normalizedDocument,
    slots: {
      headline: { required: true, maxLength: 80 },
      subheadline: { required: false, maxLength: 180 },
      legal: { required: false, maxLength: 320 }
    },
    assets: {
      logo: { required: false },
      background: { required: false },
      kv: { required: false }
    },
    constraints: {
      densities: ['compact', 'default'],
      alignments: ['left', 'center'],
      variants: ['hero-left', 'hero-centered', 'split']
    },
    defaults: {
      themeId: normalizedDocument.themeId || normalizedDocument.theme.id,
      density: normalizedDocument.layout.density,
      alignment: normalizedDocument.layout.alignment
    }
  };
};

export const normalizeTemplateDefinition = (
  value: RecordValue | null | undefined,
  fallbackName = 'Template'
): TemplateDefinition => {
  const fallbackDocument = createDefaultProjectDocument();
  const base = createTemplateDefinition(fallbackName, fallbackDocument);

  if (!value) {
    return base;
  }

  const document = normalizeProjectDocument(isRecord(value.document) ? value.document : value);
  const slots = isRecord(value.slots) ? value.slots : {};
  const assets = isRecord(value.assets) ? value.assets : {};
  const constraints = isRecord(value.constraints) ? value.constraints : {};

  const readSlot = (slotKey: string, fallback: TemplateSlotDefinition): TemplateSlotDefinition => {
    const slot = isRecord(slots[slotKey]) ? slots[slotKey] : {};
    return {
      required: readBoolean(slot.required, fallback.required),
      maxLength: readNumber(slot.maxLength, fallback.maxLength || 0) || undefined
    };
  };

  const readAsset = (assetKey: string, fallback: TemplateAssetDefinition): TemplateAssetDefinition => {
    const asset = isRecord(assets[assetKey]) ? assets[assetKey] : {};
    return {
      required: readBoolean(asset.required, fallback.required)
    };
  };

  const readStringList = <T extends string>(items: unknown, fallback: T[]): T[] => {
    if (!Array.isArray(items)) {
      return fallback;
    }

    const next = items.filter((item): item is T => typeof item === 'string') as T[];
    return next.length ? next : fallback;
  };

  return {
    version: 1,
    id: readString(value.id, slugifyIdentifier(readString(value.name, fallbackName))),
    name: readString(value.name, fallbackName),
    category: readEnum(value.category, ['banner', 'landing', 'email'], 'banner'),
    recipe: readEnum(value.recipe, ['hero-left', 'hero-centered', 'split'], document.layout.variant),
    document,
    slots: {
      headline: readSlot('headline', base.slots.headline),
      subheadline: readSlot('subheadline', base.slots.subheadline),
      legal: readSlot('legal', base.slots.legal)
    },
    assets: {
      logo: readAsset('logo', base.assets.logo),
      background: readAsset('background', base.assets.background),
      kv: readAsset('kv', base.assets.kv)
    },
    constraints: {
      densities: readStringList<LayoutDensity>(constraints.densities, base.constraints.densities),
      alignments: readStringList<LayoutAlignment>(constraints.alignments, base.constraints.alignments),
      variants: readStringList<LayoutVariant>(constraints.variants, base.constraints.variants)
    },
    defaults: isRecord(value.defaults) ? value.defaults : base.defaults
  };
};

export const createStoredTemplateState = (
  name: string,
  document: ProjectDocument | RecordValue | null | undefined
): StoredTemplateState => {
  const definition = createTemplateDefinition(name, document);
  return {
    kind: 'template-definition',
    version: 2,
    definition,
    legacySnapshot: projectDocumentToLegacySnapshot(definition.document)
  };
};

export const normalizeStoredTemplateState = (
  value: RecordValue | null | undefined,
  fallbackName = 'Template'
): StoredTemplateState => {
  if (value?.kind === 'template-definition' && isRecord(value.definition)) {
    const definition = normalizeTemplateDefinition(value.definition, fallbackName);
    return {
      kind: 'template-definition',
      version: 2,
      definition,
      legacySnapshot: isRecord(value.legacySnapshot)
        ? normalizeEditorSnapshot(value.legacySnapshot)
        : projectDocumentToLegacySnapshot(definition.document)
    };
  }

  const definition = createTemplateDefinition(fallbackName, normalizeProjectDocument(value));
  return {
    kind: 'template-definition',
    version: 2,
    definition,
    legacySnapshot: projectDocumentToLegacySnapshot(definition.document)
  };
};

export const getEditorActivePair = (
  snapshot: RecordValue | null | undefined
): EditorSnapshotPair => {
  const normalized = normalizeEditorSnapshot(snapshot);
  return normalized.titleSubtitlePairs[normalized.activePairIndex] || normalized.titleSubtitlePairs[0];
};

export const patchEditorSnapshot = (
  current: RecordValue | null | undefined,
  patch: Partial<EditorSnapshot>
): EditorSnapshot => {
  const next = normalizeEditorSnapshot({
    ...(current || {}),
    ...patch
  });

  return {
    ...next,
    titleSubtitlePairs: [
      {
        title: next.title,
        subtitle: next.subtitle,
        bgColor: next.bgColor,
        bgImageSelected: next.bgImageSelected,
        kvSelected: next.kvSelected
      }
    ],
    activePairIndex: 0
  };
};

export const applyEditorAsset = (
  current: RecordValue | null | undefined,
  target: EditorAssetTarget,
  value: string
): EditorSnapshot => {
  if (target === 'background') {
    return patchEditorSnapshot(current, { bgImageSelected: value });
  }
  if (target === 'kv') {
    return patchEditorSnapshot(current, { kvSelected: value });
  }
  return patchEditorSnapshot(current, { logoSelected: value });
};

export const applyProjectAsset = (
  current: ProjectDocument | RecordValue | null | undefined,
  target: EditorAssetTarget,
  value: string
): ProjectDocument => {
  if (target === 'background') {
    return patchProjectDocument(current, { assets: { background: value } });
  }
  if (target === 'kv') {
    return patchProjectDocument(current, { assets: { kv: value } });
  }
  return patchProjectDocument(current, { assets: { logo: value } });
};

export const getProjectDocumentPreview = (
  value: ProjectDocument | RecordValue | null | undefined
): EditorSnapshotPreview => {
  const document = normalizeProjectDocument(value as RecordValue | null | undefined);

  return {
    title: document.content.headline || document.brand.name || 'AI-Craft',
    subtitle: document.layout.showSubtitle ? document.content.subheadline || '' : '',
    backgroundColor: document.theme.colors.background || '#111111',
    backgroundImage: document.assets.background || document.assets.kv || '',
    logo: document.layout.showLogo ? document.assets.logo || '' : ''
  };
};

export const getEditorSnapshotPreview = (
  snapshot: RecordValue | null | undefined
): EditorSnapshotPreview => getProjectDocumentPreview(projectDocumentFromLegacySnapshot(snapshot));
