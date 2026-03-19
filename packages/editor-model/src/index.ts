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
  titleSubtitlePairs: Array<{
    title: string;
    subtitle: string;
    bgColor: string;
    bgImageSelected: string;
    kvSelected?: string;
  }>;
  activePairIndex: number;
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
  bgSize: 'cover',
  bgPosition: 'center',
  bgVPosition: 'center',
  bgImageSize: 100,
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

export const normalizeEditorSnapshot = (value: Record<string, unknown> | null | undefined): EditorSnapshot => {
  const fallback = createDefaultEditorSnapshot();
  const pairs = Array.isArray(value?.titleSubtitlePairs) ? value.titleSubtitlePairs : [];
  const activeIndex = Number.isInteger(value?.activePairIndex) ? Number(value?.activePairIndex) : 0;
  const activePair = (pairs[activeIndex] || pairs[0] || {}) as Record<string, unknown>;
  const title = String(activePair.title || value?.title || fallback.title);
  const subtitle = String(activePair.subtitle || value?.subtitle || fallback.subtitle);
  const bgColor = String(activePair.bgColor || value?.bgColor || fallback.bgColor);
  const bgImageSelected = String(activePair.bgImageSelected || value?.bgImageSelected || value?.bgImage || '');
  const kvSelected = String(activePair.kvSelected || value?.kvSelected || fallback.kvSelected);

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
