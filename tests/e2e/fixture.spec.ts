import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('собранное расширение улучшает сохранённый DOM без ошибок', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const fixture = readFileSync(resolve('ozon-dom.html'), 'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  await page.setContent(fixture);
  await page.addScriptTag({ path: resolve('dist/content.js') });

  await expect(page.locator('[role="main"]')).toHaveCount(1);
  await expect(page.locator('[role="main"] footer')).toHaveCount(0);
  await expect(page.locator('a[href*="/product/"]:not([aria-label])').filter({ has: page.locator('img') })).toHaveCount(0);
  await expect(page.locator('[role="heading"][aria-level="2"]')).toHaveCount(70);
  await expect(page.locator('[data-widget="profileMenuAnonymous"]')).toHaveAttribute('role', 'button');
  await expect(page.locator('[data-widget="profileMenuAnonymous"]')).toHaveAttribute('aria-label', 'Войти');
  expect(errors).toEqual([]);

  const axe = await new AxeBuilder({ page }).withRules(['landmark-one-main', 'landmark-contentinfo-is-top-level']).analyze();
  expect(axe.violations).toEqual([]);
});
