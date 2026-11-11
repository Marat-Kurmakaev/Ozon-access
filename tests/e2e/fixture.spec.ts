import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('собранное расширение улучшает сохранённый DOM без ошибок', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const fixture = readFileSync(resolve('tests/fixtures/ozon-minimal.html'), 'utf8');
  await page.setContent(fixture);
  await page.evaluate(() => {
    const activations: boolean[] = [];
    (window as typeof window & { fixtureLoginActivations?: boolean[] }).fixtureLoginActivations = activations;
    document.querySelector('.fixture-profile-handler')?.addEventListener('click', (event) => activations.push(event.isTrusted));
  });
  await page.addScriptTag({ path: resolve('dist/content.js') });

  await expect(page.locator('[role="main"]')).toHaveCount(1);
  await expect(page.locator('[role="main"] footer')).toHaveCount(0);
  await expect(page.locator('a[href*="/product/"]:not([aria-label])').filter({ has: page.locator('img') })).toHaveCount(0);
  await expect(page.locator('[role="heading"][aria-level="2"]')).toHaveCount(2);
  const profile = page.locator('[data-widget="profileMenuAnonymous"]');
  const profileButton = profile.locator('button[data-ozon-access-profile-button]');
  await expect(profileButton).toHaveAttribute('aria-label', 'Войти');
  await expect(profile).not.toHaveAttribute('role', 'button');
  await expect(profile).not.toHaveAttribute('tabindex', '0');
  await profileButton.click();
  await profileButton.press('Enter');
  await profileButton.press('Space');
  await expect.poll(() => page.evaluate(() => (window as typeof window & { fixtureLoginActivations?: boolean[] }).fixtureLoginActivations)).toEqual([true, true, true]);
  expect(errors).toEqual([]);

  const axe = await new AxeBuilder({ page }).withRules(['landmark-one-main', 'landmark-contentinfo-is-top-level']).analyze();
  expect(axe.violations).toEqual([]);
});
