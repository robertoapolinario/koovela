import { sql, type Kysely } from 'kysely';

/** Incidentes críticos para o MTTR (T130). Só ids, nomes técnicos e tempos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('platform_incident')
    .addColumn('incident_id', 'char(36)', (c) => c.primaryKey())
    .addColumn('fingerprint', 'varchar(64)', (c) => c.notNull())
    .addColumn('alertname', 'varchar(120)', (c) => c.notNull())
    .addColumn('severity', 'varchar(16)', (c) => c.notNull())
    .addColumn('service', 'varchar(120)')
    .addColumn('started_at', sql`datetime(3)`, (c) => c.notNull())
    .addColumn('resolved_at', sql`datetime(3)`)
    .execute();
  // Um incidente aberto por alerta (fingerprint); reabre como novo depois de resolvido.
  await sql`CREATE UNIQUE INDEX platform_incident_open ON platform_incident (fingerprint, (IF(resolved_at IS NULL, 1, NULL)))`.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('platform_incident').ifExists().execute();
}
