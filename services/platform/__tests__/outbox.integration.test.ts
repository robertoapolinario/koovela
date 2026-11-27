import { fileURLToPath } from 'node:url';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import type { Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db as connect, migrateTarget, provisionDomain, schemaFor } from '@koovela/migrations';
import { amqpPublisher, assertTopology, connect as amqpConnect, consume, newId, relayOnce, type Envelope } from '@koovela/platform-outbox';
import { startMysql, startRabbit, type StartedMySqlContainer, type StartedRabbitMQContainer } from '@koovela/testing/containers';
import { DOMAIN, TOPOLOGY, onPinged, ping, type PlatformDb } from '../src/index.ts';

let mysql: StartedMySqlContainer;
let rabbit: StartedRabbitMQContainer;
let app: Kysely<PlatformDb>;
let conn: ChannelModel;
let ch: ConfirmChannel;

const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));

beforeAll(async () => {
  [mysql, rabbit] = await Promise.all([startMysql(), startRabbit()]);
  const admin = { host: mysql.getHost(), port: mysql.getPort(), user: 'root', password: 'test-root' };
  const adminDb = connect(admin);
  await provisionDomain(adminDb, DOMAIN, 'koovela_platform', 'app-pass');
  await adminDb.destroy();
  const res = await migrateTarget(admin, { domain: DOMAIN, schema: schemaFor(DOMAIN), dir: migrationsDir });
  expect(res.error).toBeUndefined();
  app = connect({ ...admin, user: 'koovela_platform', password: 'app-pass' }, schemaFor(DOMAIN)) as Kysely<PlatformDb>;
  conn = await amqpConnect(rabbit.getAmqpUrl());
  ch = await conn.createConfirmChannel();
  await assertTopology(ch, TOPOLOGY);
});

afterAll(async () => {
  await ch?.close();
  await conn?.close();
  await app?.destroy();
  await Promise.all([mysql?.stop(), rabbit?.stop()]);
});

const waitFor = async (fn: () => Promise<boolean>, ms = 10_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timeout');
};

describe('platform.example.pinged.v1 (outbox → fila → consumidor)', () => {
  it('a credencial do domínio não cria tabelas (só DML)', async () => {
    await expect(app.schema.createTable('x').addColumn('a', 'integer').execute()).rejects.toThrow(/denied/i);
  });

  it('entrega uma vez, com correlation_id, e o consumidor é idempotente', async () => {
    const correlation_id = newId();
    const env = await ping(app, { label: 'teste', correlation_id });
    const seen: { env: Envelope; headers: Record<string, unknown> }[] = [];
    const tag = await consume(ch, TOPOLOGY, async (e, headers) => {
      seen.push({ env: e, headers });
      await onPinged(app, e);
    });
    expect(await relayOnce(app, DOMAIN, amqpPublisher(ch))).toBe(1);
    expect(await relayOnce(app, DOMAIN, amqpPublisher(ch))).toBe(0);
    await waitFor(async () => seen.length === 1);
    expect(seen[0]?.env.event_id).toBe(env.event_id);
    expect(seen[0]?.headers['x-correlation-id']).toBe(correlation_id);
    // Reentrega da mesma mensagem: não aplica de novo.
    expect(await onPinged(app, env)).toBe(false);
    const row = await app.selectFrom('platform_pings').selectAll().where('ping_id', '=', env.data.ping_id).executeTakeFirstOrThrow();
    expect(row.received_at).not.toBeNull();
    await ch.cancel(tag);
  });

  it('falha esgotada vai para platform.example.dlq', async () => {
    const tag = await consume(ch, TOPOLOGY, async () => {
      throw new Error('falha simulada');
    }, { maxAttempts: 2 });
    await ping(app, { label: 'vai falhar', correlation_id: newId() });
    await relayOnce(app, DOMAIN, amqpPublisher(ch));
    await waitFor(async () => (await ch.checkQueue(TOPOLOGY.dlq)).messageCount === 1);
    await ch.cancel(tag);
  });
});
