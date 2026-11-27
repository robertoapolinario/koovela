import { createServer } from 'node:http';
import { keys, loadConfig } from '@koovela/platform-config';
import { initSentry } from '@koovela/platform-errors';
import { createLogger } from '@koovela/platform-logger';
import { startOtel } from '@koovela/platform-otel';
import { amqpPublisher, assertTopology, connect, consume, relayOnce } from '@koovela/platform-outbox';
import { domainDb, selectDomains } from '@koovela/platform-runtime';
import { currentContext, runWithContext } from '@koovela/platform-tenant-context';
import { registry } from './registry.ts';

/** Processo `workers` (D44): relay da outbox de cada domínio + consumidores com DLQ. */
const cfg = loadConfig();
startOtel({ service: 'workers', version: cfg.KOOVELA_VERSION, endpoint: cfg.OTEL_EXPORTER_OTLP_ENDPOINT });
initSentry({ dsn: cfg.SENTRY_DSN, service: 'workers', version: cfg.KOOVELA_VERSION, env: cfg.KOOVELA_ENV });
const secretKeys = Object.entries(keys).filter(([, s]) => 'secret' in s && s.secret).map(([k]) => k);
const log = createLogger({ service: 'workers', level: cfg.LOG_LEVEL, secretKeys, context: currentContext });

const domains = await selectDomains(registry, cfg.KOOVELA_DOMAINS);
const conn = await connect(cfg.RABBITMQ_URL);
const ch = await conn.createConfirmChannel();
await ch.prefetch(20);
const publisher = amqpPublisher(ch);
let stopping = false;

for (const d of domains) {
  const db = domainDb(d.name, cfg.MYSQL_HOST, cfg.MYSQL_PORT);
  for (const c of d.consumers ?? []) {
    await assertTopology(ch, c.topology);
    await consume(
      ch,
      c.topology,
      (env) => runWithContext({ request_id: env.event_id, correlation_id: env.correlation_id }, () => c.handle(db, env).then(() => undefined)),
      { onError: (err, env, attempt) => log.warn({ err, event_id: env?.event_id, event_type: env?.event_type, attempt }, 'falha no consumidor') },
    );
  }
  if (d.hasOutbox) {
    void (async () => {
      while (!stopping) {
        try {
          const n = await relayOnce(db, d.name, publisher);
          if (n === 0) await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          log.error({ err, domain: d.name }, 'falha no relay da outbox');
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    })();
  }
}

// Liveness do contêiner.
createServer((_req, res) => {
  res.writeHead(stopping ? 503 : 200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: stopping ? 'stopping' : 'ok' }));
}).listen(cfg.HTTP_PORT);

process.on('SIGTERM', () => {
  stopping = true;
  void ch.close().then(() => conn.close()).finally(() => process.exit(0));
});
log.info({ domains: cfg.KOOVELA_DOMAINS }, 'workers no ar');
