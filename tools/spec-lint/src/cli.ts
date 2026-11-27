#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintSpec } from './lint.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const argv = process.argv.slice(2);
const specArg = argv.indexOf('--spec');
const specsDir = join(root, 'specs');

let dirs: string[];
if (specArg >= 0) {
  const d = argv[specArg + 1];
  if (!d) {
    console.error('uso: spec-lint [--spec <dir>]');
    process.exit(2);
  }
  dirs = [d.startsWith('/') ? d : join(root, d)];
} else if (!existsSync(specsDir)) {
  // CI e clones sem specs locais: nada a verificar.
  console.log('spec-lint: pasta specs/ ausente; nada a verificar');
  process.exit(0);
} else {
  dirs = readdirSync(specsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{3}-/.test(e.name))
    .map((e) => join(specsDir, e.name));
}

let errors = 0;
for (const dir of dirs) {
  const file = join(dir, 'spec.md');
  if (!existsSync(file)) {
    console.error(`${relative(root, dir)}: spec.md ausente`);
    errors += 1;
    continue;
  }
  for (const f of lintSpec(readFileSync(file, 'utf8'))) {
    console.error(`${relative(root, file)}:${f.line}  ${f.rule}  ${f.message}`);
    errors += 1;
  }
}
if (errors > 0) {
  console.error(`\n✖ spec-lint: ${errors} problema(s)`);
  process.exit(1);
}
console.log(`✔ spec-lint: ${dirs.length} spec(s)`);
