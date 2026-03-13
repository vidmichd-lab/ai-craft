import { expect, test } from '@playwright/test';

const PROD_URL = 'https://ai-craft.website.yandexcloud.net/';

test.use({
  serviceWorkers: 'allow'
});

test('prod loads with remote media and active service worker', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  await expect(page.locator('body')).toContainText('AI-Craft');

  const liveChecks = await page.evaluate(async () => {
    const configResponse = await fetch('/config.json', { cache: 'no-store' });
    const config = await configResponse.json();
    const manifestUrl = config?.mediaSources?.remote?.manifestUrl || '';

    const manifestResponse = await fetch(manifestUrl, { cache: 'no-store' });
    const manifest = await manifestResponse.json();
    const assets = manifest?.assets || {};
    const manifestRoots = Object.keys(assets).sort();
    const manifestCount = manifestRoots.reduce((total, root) => {
      const level1 = assets[root];
      if (!level1 || typeof level1 !== 'object') return total;
      return total + Object.values(level1).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
    }, 0);

    const assetScanner = await import(`/src/utils/assetScanner.js?v=${encodeURIComponent(window.APP_VERSION || 'dev')}`);
    const [kvStructure, logoStructure, fonts] = await Promise.all([
      assetScanner.scanKV(),
      assetScanner.scanLogos(),
      assetScanner.scanFonts()
    ]);

    const countNested = (node) => {
      if (Array.isArray(node)) return node.length;
      if (!node || typeof node !== 'object') return 0;
      return Object.values(node).reduce((sum, value) => sum + countNested(value), 0);
    };

    const registration = await navigator.serviceWorker.getRegistration();
    const serviceWorkerReady = await navigator.serviceWorker.ready.then(() => true).catch(() => false);

    return {
      appVersion: window.APP_VERSION || '',
      manifestUrl,
      manifestRoots,
      manifestCount,
      kvCount: countNested(kvStructure),
      logoCount: countNested(logoStructure),
      fontCount: Array.isArray(fonts) ? fonts.length : 0,
      hasServiceWorkerRegistration: Boolean(registration),
      hasActiveServiceWorker: Boolean(registration?.active),
      serviceWorkerReady
    };
  });

  expect(liveChecks.appVersion).toBeTruthy();
  expect(liveChecks.manifestUrl).toContain('/media/manifest');
  expect(liveChecks.manifestRoots).toEqual(['3d', 'font', 'logo', 'pro']);
  expect(liveChecks.manifestCount).toBeGreaterThan(400);
  expect(liveChecks.kvCount).toBeGreaterThan(300);
  expect(liveChecks.logoCount).toBeGreaterThan(20);
  expect(liveChecks.fontCount).toBeGreaterThan(20);
  expect(liveChecks.hasServiceWorkerRegistration).toBe(true);
  expect(liveChecks.hasActiveServiceWorker).toBe(true);
  expect(liveChecks.serviceWorkerReady).toBe(true);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
