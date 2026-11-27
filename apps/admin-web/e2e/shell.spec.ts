import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, expectScreen } from '@koovela/testing/a11y';
import { navItems } from '@koovela/ui-web';

/** Back-office: menu G01…G10 (tema escuro) e B01 abrindo bi.<ambiente>.koovela.com. */
const items = navItems('admin-web', { homeKey: 'overview' });

for (const item of items.filter((i) => !i.externalHost)) {
  test(`${item.screen} ${item.path}`, async ({ page }) => {
    await expectScreen(page, item.path, item.screen);
    await expectNoA11yViolations(page);
  });
}

test('B01 aponta para o BI do mesmo ambiente', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'BI' })).toHaveAttribute('href', 'https://bi.koovela.localhost');
});
