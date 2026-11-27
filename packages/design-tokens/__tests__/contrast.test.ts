import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Contraste AA de todos os pares texto/fundo dos tokens (REQ-FND-060/065, WCAG 2.1 1.4.3 e 1.4.11). */
const load = (f: string) => JSON.parse(readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')) as Record<string, unknown>;
const tree = { ...load('color.json'), ...load('state.json') } as Record<string, unknown>;
const pairs = load('pairs.json') as { text: [string, string][]; nonText: [string, string][] };

function resolve(path: string, depth = 0): string {
  if (depth > 10) throw new Error(`referência circular: ${path}`);
  let node: unknown = tree;
  for (const seg of path.split('.')) node = (node as Record<string, unknown>)[seg];
  if (node && typeof node === 'object' && 'DEFAULT' in node) node = (node as Record<string, unknown>).DEFAULT;
  const v = (node as { $value?: unknown })?.$value;
  if (typeof v !== 'string') throw new Error(`token sem valor: ${path}`);
  const ref = /^\{(.+)\}$/.exec(v);
  return ref ? resolve(ref[1] as string, depth + 1) : v;
}

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
};
export const contrast = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
};

describe('contraste AA', () => {
  it.each(pairs.text)('texto %s sobre %s ≥ 4,5:1', (fg, bg) => {
    const ratio = contrast(resolve(fg), resolve(bg));
    expect(ratio, `${resolve(fg)} / ${resolve(bg)} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  });
  it.each(pairs.nonText)('não texto %s sobre %s ≥ 3:1', (fg, bg) => {
    expect(contrast(resolve(fg), resolve(bg))).toBeGreaterThanOrEqual(3);
  });
  it('as cores de marca são as do protótipo', () => {
    expect(resolve('color.brand.terracota')).toBe('#B5532F');
    expect(resolve('color.brand.oliveira')).toBe('#3F4A2E');
    expect(resolve('color.brand.creme')).toBe('#F7EEDC');
  });
});
