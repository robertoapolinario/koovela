import { expect, test } from '@playwright/test';

const H = { host: 'koovela.localhost:4170' };

/** Sem o app instalado, o link cai na web do consumidor, sem bloqueio pedindo instalação (REQ-FND-091). */
test('link de slug abre a web, sem interstício de instalação', async ({ page }) => {
  const res = await page.goto('http://koovela.localhost:4170/salao-agata');
  expect(res?.status()).toBe(200);
  await expect(page.locator('[data-screen-code="W07"]')).toBeVisible();
  await expect(page.getByText(/instal(e|ar) o app|baixe o app/i)).toHaveCount(0);
});

test('/Salao-Ágata → 301 para /salao-agata', async ({ request }) => {
  const res = await request.get('http://127.0.0.1:4170/Salao-%C3%81gata', { maxRedirects: 0, headers: H });
  expect(res.status()).toBe(301);
  expect(res.headers().location).toBe('/salao-agata');
});

test('AASA sem extensão, como application/json', async ({ request }) => {
  const res = await request.get('http://127.0.0.1:4170/.well-known/apple-app-site-association', { headers: H });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  const links = await request.get('http://127.0.0.1:4170/.well-known/assetlinks.json', { headers: H });
  expect(links.status()).toBe(200);
});
