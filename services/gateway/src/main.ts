import { Redis } from 'ioredis';
import { domainDbCredentials, keys, loadConfig } from '@koovela/platform-config';
import { initSentry } from '@koovela/platform-errors';
import { createLogger } from '@koovela/platform-logger';
import { startOtel } from '@koovela/platform-otel';
import { currentContext } from '@koovela/platform-tenant-context';
import { buildGateway } from './app.ts';
import { coreProbe, mysqlProbe, rabbitProbe, redisProbe } from './probes.ts';

const cfg = loadConfig();
startOtel({ service: 'gateway', version: cfg.KOOVELA_VERSION, endpoint: cfg.OTEL_EXPORTER_OTLP_ENDPOINT });
initSentry({ dsn: cfg.SENTRY_DSN, service: 'gateway', version: cfg.KOOVELA_VERSION, env: cfg.KOOVELA_ENV });
const secretKeys = Object.entries(keys).filter(([, s]) => 'secret' in s && s.secret).map(([k]) => k);
const logger = createLogger({ service: 'gateway', level: cfg.LOG_LEVEL, secretKeys, context: currentContext });
const redis = new Redis(cfg.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2, enableOfflineQueue: false });
const db = domainDbCredentials('gateway');

const app = await buildGateway({
  env: cfg.KOOVELA_ENV,
  version: cfg.KOOVELA_VERSION,
  corsAllowedOrigins: cfg.CORS_ALLOWED_ORIGINS,
  rateLimit: { max: cfg.RATE_LIMIT_MAX, windowSeconds: cfg.RATE_LIMIT_WINDOW_SECONDS, redis },
  probes: [
    mysqlProbe({ host: cfg.MYSQL_HOST, port: cfg.MYSQL_PORT, ...db }),
    redisProbe(redis),
    rabbitProbe(cfg.RABBITMQ_URL),
    coreProbe(cfg.CORE_URL),
  ],
  logger,
});

const shutdown = async () => {
  await app.close();
  redis.disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
await app.listen({ host: '0.0.0.0', port: cfg.HTTP_PORT });
