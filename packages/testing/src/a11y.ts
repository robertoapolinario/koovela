import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Zero violações WCAG 2.1 A/AA (REQ-FND-065). */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

/** Cada destino do contrato abre a tela vazia com o código do protótipo (REQ-FND-063). */
export async function expectScreen(page: Page, path: string, code: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('[data-screen-code]')).toHaveAttribute('data-screen-code', code);
  await expect(page.locator('main#conteudo')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
}
