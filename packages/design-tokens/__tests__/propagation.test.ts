import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * SC-010: trocar color.brand.terracota muda os cinco shells (3 webs + 2 apps) sem alterar nenhum arquivo
 * fora de packages/design-tokens/. As webs leem var(--…) de tokens.css (via ui-web); os apps leem tokens.ts
 * (via ui-native). O "snapshot" de cada shell é a cor resolvida da superfície de marca.
 */
const pkg = fileURLToPath(new URL('../', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const OLD = '#B5532F';
const NEW = '#0A7F6E';
const SHELLS = ['apps/consumer-web', 'apps/tenant-web', 'apps/admin-web', 'apps/consumer-mobile', 'apps/pro-mobile'];
const UI = ['packages/ui-web', 'packages/ui-native'];

function* files(dir: string): Generator<string> {
  for (const n of readdirSync(dir)) {
    if (['node_modules', 'build', '.react-router', '.expo', 'android', 'ios', 'test-results', 'dist'].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|css|json)$/.test(n)) yield p;
  }
}

/** Resolve var(--x) recursivamente num tokens.css. */
function resolveCss(css: string, name: string, depth = 0): string {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!m || depth > 10) throw new Error(`var ausente: --${name}`);
  const v = (m[1] as string).trim();
  const ref = /^var\(--([a-z0-9-]+)\)$/.exec(v);
  return ref ? resolveCss(css, ref[1] as string, depth + 1) : v.toUpperCase();
}

function build(srcDir: string, outDir: string) {
  execFileSync(process.execPath, ['style-dictionary.config.ts'], { cwd: pkg, env: { ...process.env, TOKENS_SRC: srcDir, TOKENS_OUT: outDir } });
}

describe('propagação de token (SC-010)', () => {
  it('nenhum shell nem pacote de UI fixa a cor de marca', () => {
    const offenders = [...SHELLS, ...UI].flatMap((d) => [...files(join(root, d))]).filter((f) => readFileSync(f, 'utf8').toUpperCase().includes(OLD));
    expect(offenders.map((f) => relative(root, f))).toEqual([]);
  });

  it('a troca do valor chega às webs (tokens.css) e aos apps (tokens.ts)', { timeout: 60_000 }, async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'tokens-'));
    cpSync(join(pkg, 'src'), join(tmp, 'src'), { recursive: true });
    const colorFile = join(tmp, 'src/color.json');
    writeFileSync(colorFile, readFileSync(colorFile, 'utf8').replace(OLD, NEW));
    build(join(tmp, 'src'), join(tmp, 'before-is-original'));
    build(join(pkg, 'src'), join(tmp, 'original'));
    build(join(tmp, 'src'), join(tmp, 'changed'));

    const before = readFileSync(join(tmp, 'original/tokens.css'), 'utf8');
    const after = readFileSync(join(tmp, 'changed/tokens.css'), 'utf8');
    // webs: a cor da superfície de marca usada pelo .kv-button do ui-web
    const uiCss = readFileSync(join(root, 'packages/ui-web/src/styles.css'), 'utf8');
    expect(uiCss).toContain('var(--color-surface-brand)');
    expect(resolveCss(before, 'color-surface-brand')).toBe(OLD);
    expect(resolveCss(after, 'color-surface-brand')).toBe(NEW);

    // apps: ui-native lê tokens.color.surface.brand
    const nativeSrc = readFileSync(join(root, 'packages/ui-native/src/index.tsx'), 'utf8');
    expect(nativeSrc).toContain('c.surface.brand');
    const mod = (await import(pathToFileURL(join(tmp, 'changed/tokens.ts')).href)) as { tokens: { color: { surface: { brand: string } } } };
    expect(mod.tokens.color.surface.brand).toBe(NEW);

    // Cinco shells: as webs importam o CSS do ui-web; os apps usam o ui-native.
    for (const s of SHELLS) {
      const deps = Object.keys((JSON.parse(readFileSync(join(root, s, 'package.json'), 'utf8')) as { dependencies: Record<string, string> }).dependencies);
      expect(deps.some((d) => d === '@koovela/ui-web' || d === '@koovela/ui-native'), s).toBe(true);
    }
  });
});
