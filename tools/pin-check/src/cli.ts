#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkImages, checkPackageJson, checkTofu, checkWorkflow, type Issue } from './rules.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const SKIP = new Set(['node_modules', '.git', 'specs', 'bkp', '.specify', '.claude', 'build', 'dist', '.turbo', '.terraform', '.expo', 'android', 'ios', '__tests__']);

function* walk(dir: string): Generator<string> {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const issues: Issue[] = [];
for (const f of walk(root)) {
  const rel = relative(root, f);
  const name = rel.split('/').pop() ?? '';
  if (name === 'package.json') issues.push(...checkPackageJson(rel, readFileSync(f, 'utf8')));
  else if (name === 'Dockerfile' || /^infra\/compose\/.*\.ya?ml$/.test(rel) && !rel.includes('/traefik/')) issues.push(...checkImages(rel, readFileSync(f, 'utf8')));
  else if (/^\.github\/workflows\/.*\.ya?ml$/.test(rel)) issues.push(...checkWorkflow(rel, readFileSync(f, 'utf8')));
  else if (rel.endsWith('.tf')) issues.push(...checkTofu(rel, readFileSync(f, 'utf8')));
}
for (const i of issues) console.error(`${i.file}:${i.line}  ${i.message}`);
if (issues.length) {
  console.error(`\n✖ pin-check: ${issues.length} problema(s) (REQ-FND-004)`);
  process.exit(1);
}
console.log('✔ pin-check: imagens por digest, dependências exatas, actions por SHA');
