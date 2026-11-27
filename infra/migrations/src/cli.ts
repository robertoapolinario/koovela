#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { domainDbCredentials, loadKeys } from '@koovela/platform-config';
import { db, migrateTarget, provisionDomain, targetsFor } from './runner.ts';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const direction = process.argv[2] === 'down' ? 'down' : 'up';
const cfg = loadKeys(['MYSQL_HOST', 'MYSQL_PORT', 'KOOVELA_DOMAINS', 'MYSQL_MIGRATOR_USER', 'MYSQL_MIGRATOR_PASSWORD']);
const access = { host: cfg.MYSQL_HOST, port: cfg.MYSQL_PORT, user: cfg.MYSQL_MIGRATOR_USER ?? 'root', password: cfg.MYSQL_MIGRATOR_PASSWORD ?? '' };

const admin = db(access);
let failed = false;
try {
  for (const target of targetsFor(repoRoot, cfg.KOOVELA_DOMAINS)) {
    const cred = domainDbCredentials(target.domain);
    await provisionDomain(admin, target.domain, cred.user, cred.password);
    if (!existsSync(target.dir)) {
      console.log(`[${target.schema}] sem migrações (só credencial)`);
      continue;
    }
    const { error, results } = await migrateTarget(access, target, direction);
    for (const r of results ?? []) console.log(`[${target.schema}] ${r.migrationName}: ${r.status}`);
    if (error) {
      failed = true;
      console.error(`[${target.schema}] falhou: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} finally {
  await admin.destroy();
}
process.exit(failed ? 1 : 0);
