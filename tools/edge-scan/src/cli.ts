#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { checkEmailSecurity } from './checks/email-security.ts';
import { scan } from './scan.ts';
import type { Env } from './surfaces.ts';

/** pnpm ops:edge-scan --env staging|production [--metrics <arquivo .prom>] */
const args = process.argv.slice(2);
const env = args[args.indexOf('--env') + 1] as Env;
if (env !== 'staging' && env !== 'production') {
  console.error('uso: edge-scan --env staging|production [--metrics arquivo.prom]');
  process.exit(2);
}
const metricsFile = args.includes('--metrics') ? args[args.indexOf('--metrics') + 1] : undefined;
const { results, metrics } = await scan(env);
if (env === 'production') {
  const email = await checkEmailSecurity();
  results.push(...email.results);
  Object.assign(metrics, email.metrics);
}
for (const r of results) console.log(`${r.ok ? '✔' : '✖'} ${r.check.padEnd(20)} ${r.target}  ${r.detail}`);
if (metricsFile) {
  const lines = Object.entries(metrics).map(([k, v]) => `${k} ${v}`);
  lines.push(`koovela_edge_scan_failures{env="${env}"} ${results.filter((r) => !r.ok).length}`);
  writeFileSync(metricsFile, `${lines.join('\n')}\n`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`\n✖ edge-scan ${env}: ${failed.length} falha(s)`);
  process.exit(1);
}
console.log(`\n✔ edge-scan ${env}: ${results.length} verificações`);
