import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startMysql, type StartedMySqlContainer } from '@koovela/testing/containers';
import { db, migrateTarget, provisionDomain, schemaFor } from './index.ts';

let mysql: StartedMySqlContainer;
beforeAll(async () => { mysql = await startMysql(); });
afterAll(async () => { await mysql?.stop(); });

describe('executor de migrações', () => {
  it('aplica, é reversível e isola credenciais por domínio', async () => {
    const admin = { host: mysql.getHost(), port: mysql.getPort(), user: 'root', password: 'test-root' };
    const dir = mkdtempSync(join(tmpdir(), 'mig-'));
    writeFileSync(join(dir, '0001_a.ts'), `export async function up(db){await db.schema.createTable('t').addColumn('id','integer').execute()}\nexport async function down(db){await db.schema.dropTable('t').execute()}\n`);
    const a = db(admin);
    await provisionDomain(a, 'alpha', 'koovela_alpha', 'pa');
    await provisionDomain(a, 'beta', 'koovela_beta', 'pb');
    await a.destroy();
    const up = await migrateTarget(admin, { domain: 'alpha', schema: schemaFor('alpha'), dir });
    expect(up.results?.[0]?.status).toBe('Success');
    // beta não enxerga alpha (REQ-FND-028)
    const beta = db({ ...admin, user: 'koovela_beta', password: 'pb' }, schemaFor('beta'));
    await expect(sql`SELECT * FROM koovela_alpha.t`.execute(beta)).rejects.toThrow(/denied/i);
    await beta.destroy();
    const down = await migrateTarget(admin, { domain: 'alpha', schema: schemaFor('alpha'), dir }, 'down');
    expect(down.results?.[0]?.direction).toBe('Down');
  });
});
