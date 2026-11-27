import { sql, type Kysely } from 'kysely';
import { createOutboxTables, dropOutboxTables } from '@koovela/platform-outbox';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('platform_pings')
    .addColumn('ping_id', 'char(36)', (c) => c.primaryKey())
    .addColumn('label', 'varchar(120)', (c) => c.notNull())
    .addColumn('synthetic', 'boolean', (c) => c.notNull().defaultTo(false))
    .addColumn('created_at', sql`datetime(3)`, (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP(3)`))
    .addColumn('received_at', sql`datetime(3)`)
    .execute();
  await createOutboxTables(db, 'platform');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await dropOutboxTables(db, 'platform');
  await db.schema.dropTable('platform_pings').ifExists().execute();
}
