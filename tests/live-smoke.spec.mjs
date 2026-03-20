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

    const countNested = (node) => {
      if (Array.isArray(node)) return node.length;
      if (!node || typeof node !== 'object') return 0;

      return Object.entries(node).reduce((sum, [key, value]) => {
        if (key === '__files' && Array.isArray(value)) {
          return sum + value.length;
        }
        return sum + countNested(value);
      }, 0);
    };

    const manifestCount = countNested(assets);

    const kvCount = countNested(assets?.['3d'] || {});
    const logoCount = countNested(assets?.logo || {});
    const fontNode = assets?.font || {};
    const fontCount = countNested(fontNode);

    const registration = await navigator.serviceWorker.getRegistration();
    const serviceWorkerReady = await navigator.serviceWorker.ready.then(() => true).catch(() => false);

    return {
      appVersion: window.APP_VERSION || '',
      manifestUrl,
      manifestRoots,
      manifestCount,
      kvCount,
      logoCount,
      fontCount,
      hasServiceWorkerRegistration: Boolean(registration),
      hasActiveServiceWorker: Boolean(registration?.active),
      serviceWorkerReady
    };
  });

  expect(liveChecks.appVersion).toBeTruthy();
  expect(liveChecks.manifestUrl).toContain('/media/manifest');
  expect(liveChecks.manifestRoots).toEqual(['3d', 'font', 'logo', 'pro']);
  expect(liveChecks.manifestCount).toBeGreaterThan(400);
  expect(liveChecks.kvCount).toBeGreaterThan(250);
  expect(liveChecks.logoCount).toBeGreaterThan(20);
  expect(liveChecks.fontCount).toBeGreaterThan(20);
  expect(liveChecks.hasServiceWorkerRegistration).toBe(true);
  expect(liveChecks.hasActiveServiceWorker).toBe(true);
  expect(liveChecks.serviceWorkerReady).toBe(true);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
