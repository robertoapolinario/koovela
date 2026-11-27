import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SKIP = new Set(['node_modules', 'dist', 'coverage', '.turbo', '.git', 'specs', 'bkp', '.specify', '.claude', 'fixtures']);

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* files(p);
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

/** Chaves lidas pelo código: `process.env.X`, `process.env['X']`, `loadKeys(['X'])`, `domainDbCredentials('d')`. */
export function usedKeys(root: string, dirs: readonly string[]): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const add = (k: string, where: string) => found.set(k, [...(found.get(k) ?? []), where]);
  for (const d of dirs) {
    let walker: Generator<string>;
    try {
      walker = files(join(root, d));
    } catch {
      continue;
    }
    for (const f of walker) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const rel = relative(root, f);
      for (const m of src.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[['"]([A-Z][A-Z0-9_]*)['"]\])/g)) add((m[1] ?? m[2]) as string, rel);
      for (const m of src.matchAll(/loadKeys\(\s*\[([^\]]*)\]/g)) {
        for (const k of (m[1] ?? '').matchAll(/['"]([A-Z][A-Z0-9_]*)['"]/g)) add(k[1] as string, rel);
      }
      for (const m of src.matchAll(/domainDbCredentials\(\s*['"]([a-z0-9_]+)['"]/g)) {
        const s = (m[1] as string).toUpperCase();
        add(`MYSQL_USER_${s}`, rel);
        add(`MYSQL_PASSWORD_${s}`, rel);
      }
    }
  }
  return found;
}

export function exampleKeys(text: string): Set<string> {
  return new Set([...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1] as string));
}

import allowed from '../allowed.json' with { type: 'json' };

/** Variáveis que não são configuração da aplicação, cada uma com o motivo em tools/env-check/allowed.json. */
export const RUNTIME_ALLOWED = new Set(Object.keys(allowed).filter((k) => !k.startsWith('$')));
