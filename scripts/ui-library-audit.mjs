import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const baseUrl = process.env.WORKSPACE_AUDIT_BASE_URL || 'https://ai-craft.website.yandexcloud.net';
const email = process.env.WORKSPACE_AUDIT_EMAIL || '';
const password = process.env.WORKSPACE_AUDIT_PASSWORD || '';
const outDir = path.resolve('output/playwright/ui-library-audit');
const screenshotsDir = path.join(outDir, 'screens');
const reportPath = path.join(outDir, 'report.json');

if (!email || !password) {
  throw new Error('WORKSPACE_AUDIT_EMAIL and WORKSPACE_AUDIT_PASSWORD are required');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1728, height: 1117 },
  deviceScaleFactor: 1
});
const page = await context.newPage();

const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  counts: {
    buttonsMissing: 0,
    textInputsMissing: 0,
    selectsMissing: 0,
    textareasMissing: 0,
    rangesMissing: 0,
    colorsMissing: 0,
    choicesMissing: 0,
    togglesMissing: 0,
    navItemsMissing: 0,
    customSelectTriggersMissing: 0
  },
  samples: {
    buttons: [],
    textInputs: [],
    selects: [],
    textareas: [],
    ranges: [],
    colors: [],
    choices: [],
    toggles: [],
    navItems: [],
    customSelectTriggers: []
  },
  states: [],
  consoleErrors: [],
  pageErrors: [],
  requestFailures: []
};

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    report.consoleErrors.push(msg.text());
  }
});

page.on('pageerror', (error) => {
  report.pageErrors.push(error.message);
});

page.on('requestfailed', (request) => {
  report.requestFailures.push({
    url: request.url(),
    error: request.failure()?.errorText || 'unknown'
  });
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const dedupe = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.kind}:${item.selector}:${item.text}:${item.classes}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const mergeCategory = (reportKey, stateItems) => {
  report.samples[reportKey] = dedupe([...report.samples[reportKey], ...stateItems]).slice(0, 20);
};

const addCounts = (counts) => {
  Object.entries(counts).forEach(([key, value]) => {
    report.counts[key] += value;
  });
};

const collectState = async (name, screenshotTarget = null) => {
  const screenshotPath = path.join(screenshotsDir, `${name}.png`);
  if (screenshotTarget) {
    const locator = page.locator(screenshotTarget).first();
    if (await locator.count()) {
      await locator.screenshot({ path: screenshotPath });
    } else {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  } else {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }

  const state = await page.evaluate((stateName) => {
    const TEXT_INPUT_TYPES = new Set(['text', 'number', 'email', 'password', 'search', 'url', 'tel']);

    const isVisible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim().slice(0, 140);

    const getSelector = (node) => {
      if (!(node instanceof Element)) return '';
      const parts = [node.tagName.toLowerCase()];
      if (node.id) {
        parts.push(`#${node.id}`);
      }
      const classes = Array.from(node.classList || []).slice(0, 4);
      if (classes.length) {
        parts.push(`.${classes.join('.')}`);
      }
      return parts.join('');
    };

    const describe = (node, kind) => ({
      state: stateName,
      kind,
      selector: getSelector(node),
      text: normalizeText(node.textContent),
      placeholder: node.getAttribute?.('placeholder') || '',
      type: node.getAttribute?.('type') || '',
      classes: Array.from(node.classList || []).join(' '),
      ariaLabel: node.getAttribute?.('aria-label') || '',
      role: node.getAttribute?.('role') || ''
    });

    const visibleButtons = Array.from(document.querySelectorAll('button')).filter(isVisible);
    const visibleInputs = Array.from(document.querySelectorAll('input')).filter(isVisible);
    const visibleSelects = Array.from(document.querySelectorAll('select')).filter(isVisible);
    const visibleTextareas = Array.from(document.querySelectorAll('textarea')).filter(isVisible);
    const visibleToggles = Array.from(document.querySelectorAll('.toggle-switch-option')).filter(isVisible);
    const visibleNav = Array.from(document.querySelectorAll('.tab,[data-scroll-target],.workspace-settings-nav-item')).filter(isVisible);
    const visibleCustomSelects = Array.from(document.querySelectorAll('.custom-select-button,.select-btn')).filter(isVisible);

    const buttonsMissing = visibleButtons
      .filter((node) => !node.classList.contains('ui-button') && !node.classList.contains('ui-navigation-button') && !node.classList.contains('ui-tab') && !node.classList.contains('ui-tag-toggle'))
      .map((node) => describe(node, 'button'));

    const textInputsMissing = visibleInputs
      .filter((node) => TEXT_INPUT_TYPES.has(String(node.type || 'text').toLowerCase()))
      .filter((node) => !node.classList.contains('ui-input'))
      .map((node) => describe(node, 'text-input'));

    const selectsMissing = visibleSelects
      .filter((node) => !node.classList.contains('ui-select'))
      .map((node) => describe(node, 'select'));

    const textareasMissing = visibleTextareas
      .filter((node) => !node.classList.contains('ui-textarea'))
      .map((node) => describe(node, 'textarea'));

    const rangesMissing = visibleInputs
      .filter((node) => String(node.type || '').toLowerCase() === 'range')
      .filter((node) => !node.classList.contains('ui-slider'))
      .map((node) => describe(node, 'range'));

    const colorsMissing = visibleInputs
      .filter((node) => String(node.type || '').toLowerCase() === 'color')
      .filter((node) => !node.classList.contains('ui-color-input'))
      .map((node) => describe(node, 'color'));

    const choicesMissing = visibleInputs
      .filter((node) => {
        const type = String(node.type || '').toLowerCase();
        return type === 'checkbox' || type === 'radio';
      })
      .filter((node) => !node.classList.contains('ui-choice-native') && !node.classList.contains('ui-choice-input'))
      .map((node) => describe(node, 'choice'));

    const togglesMissing = visibleToggles
      .filter((node) => !node.classList.contains('ui-tab'))
      .map((node) => describe(node, 'toggle'));

    const navItemsMissing = visibleNav
      .filter((node) => !node.classList.contains('ui-navigation-button') && !node.classList.contains('ui-button') && !node.classList.contains('ui-tag-toggle'))
      .map((node) => describe(node, 'nav-item'));

    const customSelectTriggersMissing = visibleCustomSelects
      .filter((node) => !node.classList.contains('ui-button'))
      .map((node) => describe(node, 'custom-select-trigger'));

    return {
      name: stateName,
      counts: {
        buttonsMissing: buttonsMissing.length,
        textInputsMissing: textInputsMissing.length,
        selectsMissing: selectsMissing.length,
        textareasMissing: textareasMissing.length,
        rangesMissing: rangesMissing.length,
        colorsMissing: colorsMissing.length,
        choicesMissing: choicesMissing.length,
        togglesMissing: togglesMissing.length,
        navItemsMissing: navItemsMissing.length,
        customSelectTriggersMissing: customSelectTriggersMissing.length
      },
      samples: {
        buttons: buttonsMissing.slice(0, 12),
        textInputs: textInputsMissing.slice(0, 12),
        selects: selectsMissing.slice(0, 12),
        textareas: textareasMissing.slice(0, 12),
        ranges: rangesMissing.slice(0, 12),
        colors: colorsMissing.slice(0, 12),
        choices: choicesMissing.slice(0, 12),
        toggles: togglesMissing.slice(0, 12),
        navItems: navItemsMissing.slice(0, 12),
        customSelectTriggers: customSelectTriggersMissing.slice(0, 12)
      }
    };
  }, name);

  addCounts(state.counts);
  mergeCategory('buttons', state.samples.buttons);
  mergeCategory('textInputs', state.samples.textInputs);
  mergeCategory('selects', state.samples.selects);
  mergeCategory('textareas', state.samples.textareas);
  mergeCategory('ranges', state.samples.ranges);
  mergeCategory('colors', state.samples.colors);
  mergeCategory('choices', state.samples.choices);
  mergeCategory('toggles', state.samples.toggles);
  mergeCategory('navItems', state.samples.navItems);
  mergeCategory('customSelectTriggers', state.samples.customSelectTriggers);

  report.states.push({
    name: state.name,
    counts: state.counts,
    screenshot: screenshotPath
  });
};

const clickIfVisible = async (selector) => {
  const locator = page.locator(selector).first();
  if (await locator.count() && await locator.isVisible()) {
    try {
      await locator.click({ timeout: 5000 });
      await sleep(700);
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

const openModalSection = async (triggerSelector, stateName, screenshotTarget = '#workspaceModalOverlay') => {
  if (!await clickIfVisible(triggerSelector)) {
    return false;
  }
  await page.waitForSelector('#workspaceModalBody', { timeout: 10000 });
  await collectState(stateName, screenshotTarget);
  return true;
};

await fs.mkdir(screenshotsDir, { recursive: true });

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(1500);
await collectState('login', '#workspaceAuthOverlay');

const authFormVisible = await page.locator('#workspaceAuthForm').isVisible().catch(() => false);
if (authFormVisible) {
  await page.fill('#workspaceAuthEmail', email);
  await page.fill('#workspaceAuthPassword', password);
  await page.locator('#workspaceAuthForm button[type="submit"]').click();
}

await page.waitForSelector('#workspaceControls', { timeout: 20000 });
await page.waitForTimeout(1500);

const modalVisibleAfterLogin = await page.locator('#workspaceModalOverlay').isVisible().catch(() => false);
if (modalVisibleAfterLogin) {
  await collectState('post-login-modal', '#workspaceModalOverlay');
  await clickIfVisible('#workspaceModalCloseBtn');
  await page.waitForTimeout(500);
}

await collectState('editor-main');

for (const section of ['layout', 'logo', 'title', 'subtitle', 'legal', 'kv']) {
  const clicked = await clickIfVisible(`.tabs-panel .tab[data-section="${section}"]`);
  if (clicked) {
    await collectState(`editor-${section}`);
  }
}

if (await openModalSection('#workspaceProjectsBtn', 'templates-modal')) {
  await clickIfVisible('#workspaceModalCloseBtn');
}

if (await openModalSection('#workspaceAccountBtn', 'account-modal')) {
  if (await clickIfVisible('[data-settings-view="account"]')) {
    await collectState('account-modal-account', '#workspaceModalOverlay');
  }
  if (await clickIfVisible('[data-settings-view="team"]')) {
    await collectState('account-modal-team', '#workspaceModalOverlay');
  }
  await clickIfVisible('#workspaceModalCloseBtn');
}

if (await openModalSection('#workspaceTeamBtn', 'team-modal')) {
  if (await page.locator('#workspaceEmbeddedMediaManager').count()) {
    await page.locator('#workspaceEmbeddedMediaManager').scrollIntoViewIfNeeded().catch(() => {});
    await sleep(500);
    await collectState('team-modal-media', '#workspaceModalOverlay');
  }

  const openDefaultsButton = page.locator('[data-workspace-action="open-team-defaults"]').first();
  if (await openDefaultsButton.count()) {
    await openDefaultsButton.click();
    await page.waitForSelector('#sizesAdminModal', { timeout: 15000 });
    await collectState('sizes-admin-overview', '#sizesAdminModal');

    for (const target of ['adminSectionSizes', 'adminSectionMultipliers', 'adminSectionBrand', 'adminSectionValues', 'adminSectionBackgrounds']) {
      const clicked = await clickIfVisible(`[data-scroll-target="${target}"]`);
      if (clicked) {
        await collectState(`sizes-${target}`, '#sizesAdminModal');
      }
    }

    await clickIfVisible('#sizesAdminClose');
    await page.waitForTimeout(500);
  }

  await clickIfVisible('#workspaceModalCloseBtn');
}

report.finishedAt = new Date().toISOString();

await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ reportPath, counts: report.counts, states: report.states.length }, null, 2));

await context.close();
await browser.close();
