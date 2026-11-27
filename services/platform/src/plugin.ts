import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import { loadKeys } from '@koovela/platform-config';
import { requireContext } from '@koovela/platform-tenant-context';
import { ping, type PlatformDb } from './domain.ts';
import { incidentsRoutes, type IncidentsDb } from './incidents/incidents.ts';

/** Plugin do domínio carregado pelo runtime `core` (D44). Rotas internas, fora de /v1. */
export const platformPlugin = fp(
  async (app: FastifyInstance, opts: { db: Kysely<PlatformDb>; alertmanagerToken?: string }) => {
    incidentsRoutes(app, opts.db as unknown as Kysely<IncidentsDb>, opts.alertmanagerToken ?? loadKeys(['ALERTMANAGER_WEBHOOK_TOKEN']).ALERTMANAGER_WEBHOOK_TOKEN, () => requireContext().correlation_id);
    app.get('/internal/platform/health', async () => {
      await opts.db.selectFrom('platform_pings').select('ping_id').limit(1).execute();
      return { status: 'ok' };
    });
    // Ping de teste (interno, fora de /v1): valida o caminho HTTP → outbox → fila → consumidor.
    app.post('/internal/platform/ping', async (_req, reply) => {
      const env = await ping(opts.db, { label: 'ping de teste', correlation_id: requireContext().correlation_id });
      return reply.status(202).send({ event_id: env.event_id, ping_id: env.data.ping_id });
    });
  },
  { name: 'koovela-platform', fastify: '5.x' },
);
