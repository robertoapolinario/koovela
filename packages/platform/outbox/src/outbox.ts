import { sql, type Kysely, type Transaction } from 'kysely';
import type { Envelope } from './envelope.ts';

/** Tabela de outbox de um domínio (G-IX). O nome segue `<domínio>_outbox`. */
export interface OutboxRow {
  event_id: string;
  event_type: string;
  exchange: string;
  payload: string;
  headers: string;
  created_at: Date;
  published_at: Date | null;
  attempts: number;
}

/** Tabela de mensagens já processadas por um consumidor (idempotência). */
export interface InboxRow {
  consumer: string;
  event_id: string;
  processed_at: Date;
}

// Kysely precisa de um tipo de banco; cada domínio declara o seu com estas tabelas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = Kysely<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTrx = Transaction<any> | Kysely<any>;

export async function createOutboxTables(db: AnyDb, domain: string): Promise<void> {
  await db.schema
    .createTable(`${domain}_outbox`)
    .addColumn('event_id', 'char(36)', (c) => c.primaryKey())
    .addColumn('event_type', 'varchar(120)', (c) => c.notNull())
    .addColumn('exchange', 'varchar(120)', (c) => c.notNull())
    .addColumn('payload', 'json', (c) => c.notNull())
    .addColumn('headers', 'json', (c) => c.notNull())
    .addColumn('created_at', sql`datetime(3)`, (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP(3)`))
    .addColumn('published_at', sql`datetime(3)`)
    .addColumn('attempts', 'integer', (c) => c.notNull().defaultTo(0))
    .execute();
  await db.schema.createIndex(`${domain}_outbox_pending`).on(`${domain}_outbox`).columns(['published_at', 'created_at']).execute();
  await db.schema
    .createTable(`${domain}_inbox`)
    .addColumn('consumer', 'varchar(120)', (c) => c.notNull())
    .addColumn('event_id', 'char(36)', (c) => c.notNull())
    .addColumn('processed_at', sql`datetime(3)`, (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP(3)`))
    .addPrimaryKeyConstraint(`${domain}_inbox_pk`, ['consumer', 'event_id'])
    .execute();
}

export async function dropOutboxTables(db: AnyDb, domain: string): Promise<void> {
  await db.schema.dropTable(`${domain}_inbox`).ifExists().execute();
  await db.schema.dropTable(`${domain}_outbox`).ifExists().execute();
}

/** Grava o evento na mesma transação da mudança de estado. */
export async function enqueue(trx: AnyTrx, domain: string, exchange: string, env: Envelope, headers: Record<string, unknown> = {}): Promise<void> {
  await trx
    .insertInto(`${domain}_outbox`)
    .values({
      event_id: env.event_id,
      event_type: env.event_type,
      exchange,
      payload: JSON.stringify(env),
      headers: JSON.stringify(headers),
    })
    .execute();
}

export interface Publisher {
  publish(exchange: string, routingKey: string, body: Buffer, headers: Record<string, unknown>, messageId: string): Promise<void>;
}

/** Publica um lote de eventos pendentes. Devolve quantos foram publicados. */
export async function relayOnce(db: AnyDb, domain: string, publisher: Publisher, batch = 100): Promise<number> {
  return db.transaction().execute(async (trx) => {
    const rows = (await trx
      .selectFrom(`${domain}_outbox`)
      .selectAll()
      .where('published_at', 'is', null)
      .orderBy('created_at')
      .limit(batch)
      .forUpdate()
      .skipLocked()
      .execute()) as OutboxRow[];
    let published = 0;
    for (const row of rows) {
      const payload = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
      const headers = (typeof row.headers === 'string' ? JSON.parse(row.headers) : row.headers) as Record<string, unknown>;
      try {
        await publisher.publish(row.exchange, row.event_type, Buffer.from(payload), headers, row.event_id);
        await trx.updateTable(`${domain}_outbox`).set({ published_at: new Date() }).where('event_id', '=', row.event_id).execute();
        published += 1;
      } catch {
        await trx.updateTable(`${domain}_outbox`).set({ attempts: sql`attempts + 1` }).where('event_id', '=', row.event_id).execute();
        break; // mantém a ordem: tenta de novo no próximo ciclo
      }
    }
    return published;
  });
}

/**
 * Processa uma vez: registra o `event_id` no inbox e executa o efeito na mesma transação.
 * Devolve `false` quando a mensagem já tinha sido processada.
 */
export async function processOnce(
  db: AnyDb,
  domain: string,
  consumer: string,
  eventId: string,
  effect: (trx: Transaction<unknown>) => Promise<void>,
): Promise<boolean> {
  return db.transaction().execute(async (trx) => {
    const res = await sql`INSERT IGNORE INTO ${sql.table(`${domain}_inbox`)} (consumer, event_id) VALUES (${consumer}, ${eventId})`.execute(trx);
    if (Number(res.numAffectedRows ?? 0n) === 0) return false;
    await effect(trx as Transaction<unknown>);
    return true;
  });
}
