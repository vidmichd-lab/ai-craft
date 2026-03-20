import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baselinePath = resolve(__dirname, './fixtures/renderer-regression-baselines.json');
const defaultRenderStatePath = resolve(__dirname, '../packages/editor-renderer/src/default-render-state.json');
const shouldUpdateBaselines = process.env.AI_CRAFT_UPDATE_RENDERER_BASELINES === '1';
const defaultRenderState = JSON.parse(readFileSync(defaultRenderStatePath, 'utf8'));

const readBaselines = () => {
  if (!existsSync(baselinePath)) return {};
  return JSON.parse(readFileSync(baselinePath, 'utf8'));
};

const writeBaselines = (payload) => {
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
};

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

  const results = await page.evaluate(async ({ renderCases, defaultRenderState }) => {
    const { configureLegacyRendererRuntime } = await import('/packages/editor-renderer/src/legacy/runtime-config.js');
    const { renderToCanvas } = await import('/packages/editor-renderer/src/legacy/render-to-canvas.js');

    configureLegacyRendererRuntime({
      getCheckedSizes: () => [],
      createStateSnapshot: () => structuredClone(defaultRenderState)
    });

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
        ...structuredClone(defaultRenderState),
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
        hasAge: Boolean(meta?.elementsBounds?.age),
        imageDataUrl: canvas.toDataURL('image/png')
      };
    });
  }, { renderCases: RENDER_CASES, defaultRenderState });

  const baselinePayload = Object.fromEntries(
    results.map((result) => [
      result.label,
      createHash('sha256').update(result.imageDataUrl).digest('hex')
    ])
  );

  if (shouldUpdateBaselines) {
    writeBaselines(baselinePayload);
  }

  const baselines = readBaselines();
  expect(Object.keys(baselines).length, 'renderer baselines are missing; run npm run test:renderer:update').toBeGreaterThan(0);

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
    expect(
      createHash('sha256').update(result.imageDataUrl).digest('hex'),
      `${result.label}: renderer snapshot hash changed`
    ).toBe(baselines[result.label]);
  }
});
