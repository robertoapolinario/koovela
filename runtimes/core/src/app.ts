import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { Kysely } from 'kysely';
import { CORRELATION_HEADER, fastifyMetrics } from '@koovela/platform-otel';
import { newId } from '@koovela/platform-outbox';
import type { DomainModule } from '@koovela/platform-runtime';
import { runWithContext } from '@koovela/platform-tenant-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Processo `core`: registra o plugin de cada domínio com a conexão própria dele. */
export async function buildCore(
  domains: readonly DomainModule[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbFor: (domain: string) => Kysely<any>,
  logger?: FastifyServerOptions['loggerInstance'],
): Promise<FastifyInstance> {
  const app = Fastify({ ...(logger ? { loggerInstance: logger } : { logger: false }), genReqId: () => newId() });
  fastifyMetrics(app);
  // Contexto por requisição: o correlation_id que veio do gateway segue para logs, outbox e fila.
  app.addHook('onRequest', (req, reply, done) => {
    const h = req.headers[CORRELATION_HEADER];
    const correlationId = typeof h === 'string' && UUID.test(h) ? h : newId();
    reply.header('X-Correlation-Id', correlationId);
    runWithContext({ request_id: req.id, correlation_id: correlationId }, done);
  });
  app.get('/livez', { logLevel: 'silent' }, async () => ({ status: 'ok', domains: domains.map((d) => d.name) }));
  for (const d of domains) {
    if (d.plugin) await app.register(d.plugin, { db: dbFor(d.name) });
  }
  return app;
}
