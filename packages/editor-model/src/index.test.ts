import { describe, expect, it } from 'vitest';
import {
  applyEditorAsset,
  applyProjectAsset,
  createStoredTemplateState,
  getEditorSnapshotPreview,
  normalizeProjectDocument,
  normalizeStoredTemplateState,
  patchEditorSnapshot,
  patchProjectDocument,
  projectDocumentToLegacySnapshot
} from './index';

describe('editor-model', () => {
  it('patchEditorSnapshot keeps the primary pair in sync', () => {
    const next = patchEditorSnapshot(null, {
      title: 'Новый заголовок',
      subtitle: 'Новый подзаголовок',
      bgColor: '#000000',
      bgImageSelected: '/bg.png',
      kvSelected: '/kv.png'
    });

    expect(next.title).toBe('Новый заголовок');
    expect(next.titleSubtitlePairs).toHaveLength(1);
    expect(next.titleSubtitlePairs[0]).toMatchObject({
      title: 'Новый заголовок',
      subtitle: 'Новый подзаголовок',
      bgColor: '#000000',
      bgImageSelected: '/bg.png',
      kvSelected: '/kv.png'
    });
    expect(next.activePairIndex).toBe(0);
  });

  it('normalizeProjectDocument converts a legacy snapshot into domain sections', () => {
    const document = normalizeProjectDocument({
      brandName: 'AI-Craft',
      title: 'Hero',
      subtitle: 'Structured copy',
      bgColor: '#101010',
      bgImageSelected: '/bg.webp',
      logoSelected: '/logo.svg',
      kvSelected: '/kv.webp',
      titleAlign: 'center',
      showKV: false
    });

    expect(document.brand.name).toBe('AI-Craft');
    expect(document.content).toEqual({
      headline: 'Hero',
      subheadline: 'Structured copy'
    });
    expect(document.assets).toEqual({
      logo: '/logo.svg',
      background: '/bg.webp',
      kv: '/kv.webp'
    });
    expect(document.layout.variant).toBe('hero-centered');
    expect(document.layout.showKV).toBe(false);
  });

  it('projectDocumentToLegacySnapshot keeps preview-compatible legacy fields', () => {
    const document = patchProjectDocument(null, {
      brand: { name: 'Brand' },
      content: { headline: 'Title', subheadline: 'Subtitle' },
      assets: { background: '/bg.webp', logo: '/logo.svg', kv: '/kv.webp' },
      layout: { alignment: 'center', showLogo: true, showSubtitle: true },
      theme: {
        colors: {
          background: '#202020',
          headline: '#ffffff',
          subheadline: '#dddddd',
          legal: '#cccccc'
        }
      }
    });

    const snapshot = projectDocumentToLegacySnapshot(document);

    expect(snapshot.brandName).toBe('Brand');
    expect(snapshot.title).toBe('Title');
    expect(snapshot.subtitle).toBe('Subtitle');
    expect(snapshot.bgImageSelected).toBe('/bg.webp');
    expect(snapshot.logoSelected).toBe('/logo.svg');
    expect(snapshot.kvSelected).toBe('/kv.webp');
    expect(snapshot.titleAlign).toBe('center');
  });

  it('applyEditorAsset and applyProjectAsset update the matching asset target', () => {
    const withBackground = applyEditorAsset(null, 'background', '/media/bg.webp');
    const withKv = applyEditorAsset(withBackground, 'kv', '/media/kv.webp');
    const withLogo = applyEditorAsset(withKv, 'logo', '/media/logo.svg');

    expect(withLogo.bgImageSelected).toBe('/media/bg.webp');
    expect(withLogo.kvSelected).toBe('/media/kv.webp');
    expect(withLogo.logoSelected).toBe('/media/logo.svg');

    const document = applyProjectAsset(null, 'background', '/doc/bg.webp');
    expect(document.assets.background).toBe('/doc/bg.webp');
    expect(applyProjectAsset(document, 'logo', '/doc/logo.svg').assets.logo).toBe('/doc/logo.svg');
  });

  it('getEditorSnapshotPreview derives preview fields from the active pair', () => {
    const preview = getEditorSnapshotPreview({
      brandName: 'AI-Craft',
      titleSubtitlePairs: [
        {
          title: 'Шаблон',
          subtitle: 'Описание',
          bgColor: '#101010',
          bgImageSelected: '/bg.webp',
          kvSelected: '/kv.webp'
        }
      ],
      logoSelected: '/logo.svg'
    });

    expect(preview).toEqual({
      title: 'Шаблон',
      subtitle: 'Описание',
      backgroundColor: '#101010',
      backgroundImage: '/bg.webp',
      logo: '/logo.svg'
    });
  });

  it('createStoredTemplateState produces a structured template contract', () => {
    const document = patchProjectDocument(null, {
      content: { headline: 'Template title' },
      layout: { variant: 'split' }
    });

    const stored = createStoredTemplateState('Brand banner', document);

    expect(stored.kind).toBe('template-definition');
    expect(stored.definition.name).toBe('Brand banner');
    expect(stored.definition.recipe).toBe('split');
    expect(stored.definition.document.metadata.source).toBe('template');
    expect(stored.legacySnapshot.title).toBe('Template title');
  });

  it('normalizeStoredTemplateState supports both structured and legacy saved payloads', () => {
    const structured = normalizeStoredTemplateState({
      kind: 'template-definition',
      version: 2,
      definition: {
        name: 'Structured',
        recipe: 'hero-centered',
        document: {
          brand: { name: 'Structured brand' },
          content: { headline: 'Structured title', subheadline: 'Structured subtitle' },
          layout: { alignment: 'center' }
        }
      }
    });

    expect(structured.definition.name).toBe('Structured');
    expect(structured.definition.document.brand.name).toBe('Structured brand');
    expect(structured.legacySnapshot.titleAlign).toBe('center');

    const legacy = normalizeStoredTemplateState({
      brandName: 'Legacy brand',
      title: 'Legacy title',
      subtitle: 'Legacy subtitle'
    }, 'Legacy');

    expect(legacy.definition.name).toBe('Legacy');
    expect(legacy.definition.document.brand.name).toBe('Legacy brand');
    expect(legacy.legacySnapshot.title).toBe('Legacy title');
  });

  it('drops legacy relative asset paths from old snapshots and templates', () => {
    const document = normalizeProjectDocument({
      assets: {
        logo: 'logo/white/ru/main.svg',
        background: 'assets/3d/logos/40.webp',
        kv: 'assets/3d/logos/40.webp'
      }
    });

    expect(document.assets).toEqual({
      logo: '',
      background: '',
      kv: ''
    });

    const legacy = normalizeStoredTemplateState({
      title: 'Legacy title',
      logoSelected: 'logo/white/ru/main.svg',
      kvSelected: 'assets/3d/logos/40.webp',
      bgImageSelected: 'assets/3d/logos/40.webp'
    }, 'Legacy');

    expect(legacy.legacySnapshot.logoSelected).toBe('');
    expect(legacy.legacySnapshot.kvSelected).toBe('');
    expect(legacy.legacySnapshot.bgImageSelected).toBe('');
  });
});
