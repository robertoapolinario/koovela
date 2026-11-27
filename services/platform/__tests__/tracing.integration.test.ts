import { fileURLToPath } from 'node:url';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import type { Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db as connect, migrateTarget, provisionDomain, schemaFor } from '@koovela/migrations';
import { amqpPublisher, assertTopology, connect as amqpConnect, consume, newId, relayOnce } from '@koovela/platform-outbox';
import { startMysql, startRabbit, type StartedMySqlContainer, type StartedRabbitMQContainer } from '@koovela/testing/containers';
import { buildGateway } from '../../gateway/src/app.ts';
import { buildCore } from '../../../runtimes/core/src/app.ts';
import { DOMAIN, TOPOLOGY, domainModule, onPinged, type PlatformDb } from '../src/index.ts';

/**
 * correlation_id de ponta a ponta (REQ-FND-042): gateway → core (HTTP) → outbox → RabbitMQ → consumidor,
 * e também na DLQ quando o consumidor falha.
 */
let mysql: StartedMySqlContainer;
let rabbit: StartedRabbitMQContainer;
let app: Kysely<PlatformDb>;
let conn: ChannelModel;
let ch: ConfirmChannel;

beforeAll(async () => {
  [mysql, rabbit] = await Promise.all([startMysql(), startRabbit()]);
  const admin = { host: mysql.getHost(), port: mysql.getPort(), user: 'root', password: 'test-root' };
  const a = connect(admin);
  await provisionDomain(a, DOMAIN, 'koovela_platform', 'pw');
  await a.destroy();
  await migrateTarget(admin, { domain: DOMAIN, schema: schemaFor(DOMAIN), dir: fileURLToPath(new URL('../migrations/', import.meta.url)) });
  app = connect({ ...admin, user: 'koovela_platform', password: 'pw' }, schemaFor(DOMAIN)) as Kysely<PlatformDb>;
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

const waitFor = async (fn: () => Promise<boolean> | boolean, ms = 10_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timeout');
};

describe('propagação do correlation_id', () => {
  it('do gateway ao consumidor e à DLQ', async () => {
    // 1. O gateway gera o correlation_id na borda.
    const gw = await buildGateway({ version: 'v', corsAllowedOrigins: [], probes: [], rateLimit: { max: 100, windowSeconds: 60 } });
    const correlationId = (await gw.inject('/v1/health')).headers['x-correlation-id'] as string;
    expect(correlationId).toMatch(/^[0-9a-f-]{36}$/);

    // 2. O core recebe o cabeçalho e grava o evento na outbox com o mesmo id.
    const core = await buildCore([domainModule], () => app);
    const res = await core.inject({ method: 'POST', url: '/internal/platform/ping', headers: { 'x-correlation-id': correlationId } });
    expect(res.statusCode).toBe(202);
    expect(res.headers['x-correlation-id']).toBe(correlationId);

    // 3. Fila → consumidor.
    const seen: { env: string; header: unknown; traceparent: unknown }[] = [];
    const tag = await consume(ch, TOPOLOGY, async (e, h) => {
      seen.push({ env: e.correlation_id, header: h['x-correlation-id'], traceparent: h.traceparent });
      await onPinged(app, e);
    });
    await relayOnce(app, DOMAIN, amqpPublisher(ch));
    await waitFor(() => seen.length === 1);
    expect(seen[0]).toMatchObject({ env: correlationId, header: correlationId });
    await ch.cancel(tag);

    // 4. Falha esgotada: a mensagem na DLQ mantém o correlation_id.
    const failTag = await consume(ch, TOPOLOGY, async () => { throw new Error('falha simulada'); }, { maxAttempts: 1 });
    const corr2 = newId();
    await core.inject({ method: 'POST', url: '/internal/platform/ping', headers: { 'x-correlation-id': corr2 } });
    await relayOnce(app, DOMAIN, amqpPublisher(ch));
    await waitFor(async () => (await ch.checkQueue(TOPOLOGY.dlq)).messageCount === 1);
    await ch.cancel(failTag);
    const dead = await ch.get(TOPOLOGY.dlq, { noAck: true });
    expect(dead && dead.properties.headers?.['x-correlation-id']).toBe(corr2);
    expect(dead && JSON.parse(dead.content.toString()).correlation_id).toBe(corr2);
  });
});
