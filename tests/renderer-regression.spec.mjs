import { expect, test } from 'playwright/test';

const RENDER_CASES = [
  {
    label: '1920x720 without KV',
    width: 1920,
    height: 720,
    overrides: { showKV: false, kv: null }
  },
  {
    label: '1920x720 with stale KV flag',
    width: 1920,
    height: 720,
    overrides: { showKV: true, kv: null }
  },
  {
    label: '320x50 without KV',
    width: 320,
    height: 50,
    overrides: { showKV: false, kv: null }
  },
  {
    label: '320x50 with stale KV flag',
    width: 320,
    height: 50,
    overrides: { showKV: true, kv: null }
  }
];

test('keeps logo, legal and age visible when wide layouts render without KV', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  const results = await page.evaluate(async (renderCases) => {
    const { getState } = await import('/src/state/store.js');
    const { renderer } = await import('/src/renderer.js');
    const { renderToCanvas } = renderer.__unsafe_getRenderToCanvas();

    const loadImage = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });

    const logo = await loadImage('/logo/white/ru/main.svg');

    return renderCases.map((renderCase) => {
      const canvas = document.createElement('canvas');
      const renderState = {
        ...getState(),
        platform: 'Regression',
        bgColor: '#1e1e1e',
        logo,
        showLogo: true,
        showLegal: true,
        showAge: true,
        legal: 'Тестовый legal-блок для проверки wide-рендера без KV.',
        age: '18+',
        ...renderCase.overrides
      };

      const meta = renderToCanvas(canvas, renderCase.width, renderCase.height, renderState);

      return {
        label: renderCase.label,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        hasMeta: Boolean(meta),
        hasLogo: Boolean(meta?.elementsBounds?.logo),
        hasLegal: Boolean(meta?.elementsBounds?.legal),
        hasAge: Boolean(meta?.elementsBounds?.age)
      };
    });
  }, RENDER_CASES);

  for (const result of results) {
    expect(result.hasMeta, `${result.label}: renderToCanvas returned no meta`).toBe(true);
    expect(
      [result.canvasWidth, result.canvasHeight],
      `${result.label}: canvas dimensions were not applied`
    ).toEqual([
      RENDER_CASES.find((renderCase) => renderCase.label === result.label).width,
      RENDER_CASES.find((renderCase) => renderCase.label === result.label).height
    ]);
    expect(result.hasLogo, `${result.label}: logo disappeared`).toBe(true);
    expect(result.hasLegal, `${result.label}: legal disappeared`).toBe(true);
    expect(result.hasAge, `${result.label}: 18+ disappeared`).toBe(true);
  }
});
