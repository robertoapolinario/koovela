#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { isValidBranch } from './branch.ts';

const name =
  process.argv[2] ??
  process.env.GITHUB_HEAD_REF ??
  execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
if (!isValidBranch(name)) {
  console.error(`✖ branch "${name}" fora do padrão NNN-nome (ex.: 008-motor-agenda)`);
  process.exit(1);
}
console.log(`✔ branch ${name}`);
