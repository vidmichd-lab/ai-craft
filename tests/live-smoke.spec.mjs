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

  await page.goto(PROD_URL, { waitUntil: 'networkidle' });
  const loginButton = page.getByRole('button', { name: 'Войти' });
  await expect(loginButton).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).pressSequentially(LOGIN.email, { delay: 20 });
  await page.getByRole('textbox', { name: 'Пароль', exact: true }).pressSequentially(LOGIN.password, { delay: 20 });
  await expect(loginButton).toBeEnabled({ timeout: 10000 });
  await loginButton.click();

  await expect(page.getByText('AI-Craft Studio')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Основная рабочая сцена')).toBeVisible();
  await expect(page.getByText('Яндекс Практикум')).toBeVisible();

  await page.getByRole('button', { name: 'Шаблоны' }).click();
  await expect(page.getByText('Библиотека шаблонов')).toBeVisible();

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
