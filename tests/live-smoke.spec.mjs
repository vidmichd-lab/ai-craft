import { expect, test } from '@playwright/test';

const PROD_URL = 'https://aicrafter.ru/';
const WWW_URL = 'https://www.aicrafter.ru/';
const LOGIN = {
  email: 'vidmichd@ya.ru',
  password: 'vidmich-2026-login'
};

test.use({
  serviceWorkers: 'allow'
});

test('www redirects to apex', async ({ page }) => {
  await page.goto(WWW_URL, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(PROD_URL);
});

test('prod login opens the workspace dashboard on the custom domain', async ({ page }) => {
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
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();

  await page.locator('input[type="email"]').fill(LOGIN.email);
  await page.locator('input[type="password"]').fill(LOGIN.password);
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByText('Рабочие разделы')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Яндекс Практикум')).toBeVisible();

  await page.getByRole('button', { name: 'Шаблоны' }).click();
  await expect(page.getByText('Библиотека шаблонов')).toBeVisible();

  await page.getByRole('button', { name: 'Медиатека' }).click();
  await expect(page.getByText('Командная медиатека')).toBeVisible();

  const healthResponse = await page.request.get(`${PROD_URL}api/health`);
  const healthPayload = await healthResponse.json();

  expect(healthResponse.ok()).toBe(true);
  expect(healthPayload).toEqual({
    ok: true,
    service: 'ai-craft-web',
    environment: 'production'
  });
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
