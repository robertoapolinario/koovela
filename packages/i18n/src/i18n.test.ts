import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allKeys, t } from './index.ts';

const nav = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../contracts/ui/shell-navigation.json', import.meta.url)), 'utf8'),
) as { shells: Record<string, { items: { label_i18n: string }[] }> };

describe('i18n pt-BR', () => {
  it('cobre todas as chaves de navegação do contrato', () => {
    const keys = new Set(allKeys());
    const missing = Object.values(nav.shells).flatMap((s) => s.items.map((i) => i.label_i18n)).filter((k) => !keys.has(k));
    expect(missing).toEqual([]);
  });
  it('interpola', () => {
    expect(t('shell.empty_screen', { code: 'C03' })).toBe('Tela C03');
  });
});
