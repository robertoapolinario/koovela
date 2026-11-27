import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, expectScreen } from '@koovela/testing/a11y';
import { navItems } from '@koovela/ui-web';

/** Painel do cliente (menu lateral P01…P26 com seletor de filial) e modo desktop /pro (KD1/KD3/KD4/KD5). */
const tenant = navItems('tenant-web', { homeKey: 'home' });
const pro = navItems('pro-desktop', { basePath: '/pro', homeKey: 'agenda' });

for (const item of [...tenant, ...pro]) {
  test(`${item.screen} ${item.path}`, async ({ page }) => {
    await expectScreen(page, item.path, item.screen);
    await expectNoA11yViolations(page);
  });
}

test('seletor de filial no cabeçalho do painel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Filial' })).toBeVisible();
});

test('onboarding O01–O05 fora do menu', async ({ page }) => {
  for (const code of ['O01', 'O02', 'O03', 'O04', 'O05']) {
    await expectScreen(page, `/onboarding/${code.toLowerCase()}`, code);
  }
  await page.goto('/');
  await expect(page.getByRole('navigation').getByRole('link', { name: /onboarding/i })).toHaveCount(0);
  await expectNoA11yViolations(page);
});
