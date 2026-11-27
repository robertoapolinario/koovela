import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Kysely, MysqlDialect, sql } from 'kysely';
import { Migrator, type Migration, type MigrationProvider, type MigrationResultSet } from 'kysely/migration';
import { createPool } from 'mysql2';

/**
 * Executor único de migrações (REQ-FND-028, R7). Nesta spec: um schema por domínio
 * (`koovela_<domínio>`), cada um com o próprio histórico. Ponto de extensão da 002:
 * `targets()` devolve um alvo por schema de tenant.
 */
export interface MigrationTarget {
  readonly domain: string;
  readonly schema: string;
  readonly dir: string;
}

export interface DbAccess {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
}

export const schemaFor = (domain: string): string => `koovela_${domain.replace(/[^a-z0-9_]/g, '_')}`;

export function db(access: DbAccess, database?: string): Kysely<unknown> {
  return new Kysely({
    dialect: new MysqlDialect({
      pool: createPool({
        host: access.host,
        port: access.port,
        user: access.user,
        password: access.password,
        ...(database ? { database } : {}),
        timezone: 'Z',
        connectionLimit: 2,
        multipleStatements: false,
      }),
    }),
  });
}

class DirProvider implements MigrationProvider {
  private readonly dir: string;
  constructor(dir: string) {
    this.dir = dir;
  }
  async getMigrations(): Promise<Record<string, Migration>> {
    const files = (await readdir(this.dir)).filter((f) => /^\d{4}.*\.ts$/.test(f) && !f.endsWith('.test.ts')).sort();
    const out: Record<string, Migration> = {};
    for (const f of files) {
      out[f.replace(/\.ts$/, '')] = (await import(pathToFileURL(join(this.dir, f)).href)) as Migration;
    }
    return out;
  }
}

/**
 * Cria o schema e a credencial própria do domínio com permissão só sobre os próprios objetos.
 * Roda com a credencial administrativa de migração.
 */
export async function provisionDomain(admin: Kysely<unknown>, domain: string, appUser: string, appPassword: string): Promise<void> {
  const schema = schemaFor(domain);
  await sql`CREATE DATABASE IF NOT EXISTS ${sql.id(schema)} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`.execute(admin);
  await sql`CREATE USER IF NOT EXISTS ${sql.lit(appUser)}@'%' IDENTIFIED BY ${sql.lit(appPassword)}`.execute(admin);
  await sql`ALTER USER ${sql.lit(appUser)}@'%' IDENTIFIED BY ${sql.lit(appPassword)}`.execute(admin);
  await sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${schema}\`.* TO '${appUser.replace(/'/g, "''")}'@'%'`).execute(admin);
}

export async function migrateTarget(access: DbAccess, target: MigrationTarget, direction: 'up' | 'down' = 'up'): Promise<MigrationResultSet> {
  const k = db(access, target.schema);
  try {
    const migrator = new Migrator({
      db: k,
      provider: new DirProvider(target.dir),
      migrationTableName: 'kysely_migration',
      migrationLockTableName: 'kysely_migration_lock',
    });
    return direction === 'up' ? await migrator.migrateToLatest() : await migrator.migrateDown();
  } finally {
    await k.destroy();
  }
}

export function targetsFor(repoRoot: string, domains: readonly string[]): MigrationTarget[] {
  return domains.map((d) => ({ domain: d, schema: schemaFor(d), dir: join(repoRoot, 'services', d, 'migrations') }));
}
