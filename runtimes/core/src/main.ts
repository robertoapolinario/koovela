import { keys, loadConfig } from '@koovela/platform-config';
import { initSentry } from '@koovela/platform-errors';
import { createLogger } from '@koovela/platform-logger';
import { startOtel } from '@koovela/platform-otel';
import { domainDb, selectDomains } from '@koovela/platform-runtime';
import { currentContext } from '@koovela/platform-tenant-context';
import { buildCore } from './app.ts';
import { registry } from './registry.ts';

const cfg = loadConfig();
startOtel({ service: 'core', version: cfg.KOOVELA_VERSION, endpoint: cfg.OTEL_EXPORTER_OTLP_ENDPOINT });
initSentry({ dsn: cfg.SENTRY_DSN, service: 'core', version: cfg.KOOVELA_VERSION, env: cfg.KOOVELA_ENV });
const secretKeys = Object.entries(keys).filter(([, s]) => 'secret' in s && s.secret).map(([k]) => k);
const logger = createLogger({ service: 'core', level: cfg.LOG_LEVEL, secretKeys, context: currentContext });
const domains = await selectDomains(registry, cfg.KOOVELA_DOMAINS);
const app = await buildCore(domains, (d) => domainDb(d, cfg.MYSQL_HOST, cfg.MYSQL_PORT), logger);
process.on('SIGTERM', () => void app.close().then(() => process.exit(0)));
await app.listen({ host: '0.0.0.0', port: cfg.HTTP_PORT });
logger.info({ domains: cfg.KOOVELA_DOMAINS }, 'core no ar');
