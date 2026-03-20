import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.CHECK_PREVIEW_BASE_URL || 'https://ai-craft.website.yandexcloud.net';
const email = process.env.CHECK_PREVIEW_EMAIL || '';
const password = process.env.CHECK_PREVIEW_PASSWORD || '';
const outputPath = path.resolve('output/playwright/performance-preview-check.json');
const screenshotPath = path.resolve('output/playwright/performance-preview-check.png');

if (!email || !password) {
  throw new Error('CHECK_PREVIEW_EMAIL and CHECK_PREVIEW_PASSWORD are required');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1728, height: 1117 } });
const logs = [];

page.on('console', (msg) => logs.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', (error) => logs.push({ type: 'pageerror', text: error.message }));

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#workspaceAuthForm', { timeout: 20000 });
await page.fill('#workspaceAuthEmail', email);
await page.fill('#workspaceAuthPassword', password);
await page.click('#workspaceAuthForm button[type="submit"]');
await page.waitForTimeout(4000);

const workspaceControls = page.locator('#workspaceControls');
const controlsVisible = await workspaceControls.isVisible().catch(() => false);
if (!controlsVisible) {
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const authState = await page.evaluate(() => ({
    authOverlayDisplay: document.getElementById('workspaceAuthOverlay')?.style.display || null,
    authErrorText: document.getElementById('workspaceAuthError')?.textContent?.trim() || '',
    controlsDisplay: document.getElementById('workspaceControls') ? window.getComputedStyle(document.getElementById('workspaceControls')).display : null,
    bodyClasses: document.body.className,
    htmlClasses: document.documentElement.className
  }));
  throw new Error(`Workspace controls did not become visible after login: ${JSON.stringify(authState)}`);
}

const modal = page.locator('#workspaceModalOverlay');
if (await modal.isVisible().catch(() => false)) {
  const close = page.locator('#workspaceModalCloseBtn');
  if (await close.count()) {
    await close.click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

await page.click('.toggle-switch-option[data-value="layouts"]');
await page.waitForTimeout(1500);
await page.screenshot({ path: screenshotPath, fullPage: true });

const result = await page.evaluate(() => {
  const readCanvas = (id) => {
    const canvas = document.getElementById(id);
    if (!(canvas instanceof HTMLCanvasElement)) return null;

    const rect = canvas.getBoundingClientRect();
    let sample = null;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      const x = Math.max(0, Math.floor(canvas.width / 2));
      const y = Math.max(0, Math.floor(canvas.height / 2));
      sample = Array.from(ctx.getImageData(x, y, 1, 1).data);
    }

    return {
      id,
      width: canvas.width,
      height: canvas.height,
      styleDisplay: canvas.style.display,
      styleOpacity: canvas.style.opacity,
      rect: { width: rect.width, height: rect.height },
      sample
    };
  };

  return {
    projectMode: document.getElementById('projectModeToggle')?.getAttribute('data-value') || null,
    appClass: document.querySelector('.app')?.className || '',
    selectors: {
      narrow: document.getElementById('previewSizeSelectNarrowText')?.textContent?.trim() || '',
      square: document.getElementById('previewSizeSelectSquareText')?.textContent?.trim() || '',
      wide: document.getElementById('previewSizeSelectWideText')?.textContent?.trim() || ''
    },
    canvases: ['previewCanvasNarrow', 'previewCanvasSquare', 'previewCanvasWide'].map(readCanvas)
  };
});

const payload = { baseUrl, result, logs, screenshotPath };
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));

await browser.close();
