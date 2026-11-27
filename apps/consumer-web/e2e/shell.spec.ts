import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, expectScreen } from '@koovela/testing/a11y';
import { navItems } from '@koovela/ui-web';

/** Web do consumidor (REQ-FND-062/063/065): barra superior W06/W16/W17/W20 e página pública W07. */
const items = navItems('consumer-web');

for (const item of items) {
  test(`${item.screen} ${item.path}: tela, navegação e acessibilidade`, async ({ page }) => {
    await expectScreen(page, item.path, item.screen);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: item.label })).toHaveAttribute('aria-current', 'page');
    await expectNoA11yViolations(page);
  });
}

test('W07 koovela.com/{slug}: SSR, acessível', async ({ page }) => {
  const res = await page.goto('http://koovela.localhost:4170/salao-agata');
  expect(res?.status()).toBe(200);
  await expect(page.locator('[data-screen-code]')).toHaveAttribute('data-screen-code', 'W07');
  await expectNoA11yViolations(page);
});

test('navegação por teclado: pular para o conteúdo', async ({ page }) => {
  await page.goto('/appointments');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
});
