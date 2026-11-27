import { fileURLToPath } from 'node:url';
import type { Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db as connect, migrateTarget, provisionDomain, schemaFor } from '@koovela/migrations';
import { startMysql, type StartedMySqlContainer } from '@koovela/testing/containers';
import { buildCore } from '../../../../runtimes/core/src/app.ts';
import { domainModule } from '../index.ts';
import type { IncidentsDb } from './incidents.ts';

let mysql: StartedMySqlContainer;
let db: Kysely<IncidentsDb & { platform_outbox: { event_type: string; payload: string } }>;
const TOKEN = 'token-de-teste-com-mais-de-24-caracteres';

beforeAll(async () => {
  mysql = await startMysql();
  const admin = { host: mysql.getHost(), port: mysql.getPort(), user: 'root', password: 'test-root' };
  const a = connect(admin);
  await provisionDomain(a, 'platform', 'koovela_platform', 'pw');
  await a.destroy();
  const r = await migrateTarget(admin, { domain: 'platform', schema: schemaFor('platform'), dir: fileURLToPath(new URL('../../migrations/', import.meta.url)) });
  expect(r.error).toBeUndefined();
  db = connect({ ...admin, user: 'koovela_platform', password: 'pw' }, schemaFor('platform')) as typeof db;
  process.env.ALERTMANAGER_WEBHOOK_TOKEN = TOKEN;
});
afterAll(async () => {
  await db?.destroy();
  await mysql?.stop();
});

const alert = (status: 'firing' | 'resolved', severity = 'critical', endsAt?: string) => ({
  status,
  labels: { alertname: 'ServiceUnhealthy', severity, service: 'gateway' },
  startsAt: '2026-11-27T10:00:00Z',
  ...(endsAt ? { endsAt } : {}),
  fingerprint: 'fp-gateway-1',
});

describe('incidentes (MTTR)', () => {
  it('abre no firing, ignora repetição e warning, fecha no resolved e publica só ids e tempos', async () => {
    const core = await buildCore([domainModule], () => db);
    const post = (alerts: unknown[], token = TOKEN) =>
      core.inject({ method: 'POST', url: '/internal/platform/alertmanager', headers: { authorization: `Bearer ${token}` }, payload: { alerts } });

    expect((await post([alert('firing')], 'errado')).statusCode).toBe(401);
    expect((await post([alert('firing'), alert('firing', 'warning')])).json()).toEqual({ opened: 1, resolved: 0 });
    expect((await post([alert('firing')])).json()).toEqual({ opened: 0, resolved: 0 }); // repetição do Alertmanager
    expect((await post([alert('resolved', 'critical', '2026-11-27T10:12:30Z')])).json()).toEqual({ opened: 0, resolved: 1 });

    const inc = await db.selectFrom('platform_incident').selectAll().executeTakeFirstOrThrow();
    expect(inc.resolved_at?.toISOString()).toBe('2026-11-27T10:12:30.000Z');
    const out = await db.selectFrom('platform_outbox').select(['event_type', 'payload']).where('event_type', '=', 'platform.incident.resolved.v1').executeTakeFirstOrThrow();
    const env = (typeof out.payload === 'string' ? JSON.parse(out.payload) : out.payload) as { data: Record<string, unknown> };
    expect(env.data).toEqual({
      incident_id: inc.incident_id,
      severity: 'critical',
      service: 'gateway',
      started_at: '2026-11-27T10:00:00.000Z',
      resolved_at: '2026-11-27T10:12:30.000Z',
      duration_seconds: 750,
    });

    // Novo firing depois de resolvido abre outro incidente.
    expect((await post([alert('firing')])).json()).toEqual({ opened: 1, resolved: 0 });
  });
});
