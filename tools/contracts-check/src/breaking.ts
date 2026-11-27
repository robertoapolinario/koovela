#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { checkAsyncapi, verdict, type ContractVerdict } from './asyncapi.ts';

/**
 * pnpm contracts:breaking [--base origin/main]
 * Compara packages/contracts com a base: OpenAPI pelo oasdiff (`breaking`), AsyncAPI pelo @asyncapi/diff.
 * Falha se houver mudança incompatível sem aumentar a versão maior do contrato (REQ-FND-071).
 */
const OASDIFF = 'tufin/oasdiff@sha256:cb7cd2acde680a724c9d08c27bc687c83628c02c5869ead033b857935fb4e9f4'; // v1.41.0
const root = fileURLToPath(new URL('../../../', import.meta.url));
const args = process.argv.slice(2);
const base = args.includes('--base') ? (args[args.indexOf('--base') + 1] as string) : 'origin/main';
const DIR = 'packages/contracts';

const tmp = mkdtempSync(join(tmpdir(), 'contracts-base-'));
try {
  const archive = spawnSync('git', ['archive', base, DIR], { cwd: root, maxBuffer: 1 << 26 });
  if (archive.status !== 0) {
    console.log(`contracts:breaking: ${base} não tem ${DIR}; nada a comparar`);
    process.exit(0);
  }
  execFileSync('tar', ['-x', '-C', tmp], { input: archive.stdout });

  const results: ContractVerdict[] = [];
  for (const f of readdirSync(join(root, DIR, 'openapi')).filter((x) => /\.ya?ml$/.test(x))) {
    const oldPath = join(tmp, DIR, 'openapi', f);
    if (!existsSync(oldPath)) continue;
    const ver = (p: string) => String((parse(readFileSync(p, 'utf8')) as { info: { version: string } }).info.version);
    const local = spawnSync('oasdiff', ['--version']).status === 0;
    const run = local
      ? spawnSync('oasdiff', ['breaking', oldPath, join(root, DIR, 'openapi', f), '--format', 'text'], { encoding: 'utf8' })
      : spawnSync('docker', ['run', '--rm', '-v', `${tmp}:/old:ro`, '-v', `${root}:/new:ro`, OASDIFF, 'breaking', `/old/${DIR}/openapi/${f}`, `/new/${DIR}/openapi/${f}`, '--format', 'text'], { encoding: 'utf8' });
    if (run.status !== 0 && !run.stdout) throw new Error(`oasdiff falhou em ${f}: ${run.stderr}`);
    const lines = run.stdout.split('\n').filter((l) => /^\s*error\s/i.test(l) || /\berror\b.*\[/.test(l));
    results.push(verdict(`openapi/${f}`, lines, ver(oldPath), ver(join(root, DIR, 'openapi', f))));
  }
  for (const f of readdirSync(join(root, DIR, 'asyncapi')).filter((x) => /\.ya?ml$/.test(x))) {
    const oldPath = join(tmp, DIR, 'asyncapi', f);
    if (!existsSync(oldPath)) continue;
    results.push(await checkAsyncapi(`asyncapi/${f}`, readFileSync(oldPath, 'utf8'), readFileSync(join(root, DIR, 'asyncapi', f), 'utf8')));
  }

  let failed = false;
  for (const r of results) {
    if (r.breaking.length === 0) console.log(`✔ ${r.file}: sem mudança incompatível`);
    else if (r.ok) console.log(`✔ ${r.file}: ${r.breaking.length} mudança(s) incompatível(is) com versão nova (${r.oldVersion} → ${r.newVersion})`);
    else {
      failed = true;
      console.error(`✖ ${r.file}: mudança incompatível sem nova versão (${r.oldVersion} → ${r.newVersion}):`);
      for (const b of r.breaking) console.error(`    ${b.trim()}`);
    }
  }
  process.exit(failed ? 1 : 0);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
