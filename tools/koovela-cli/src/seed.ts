import { domainDbCredentials, loadKeys } from '@koovela/platform-config';
import { db } from '@koovela/migrations';
import { seedPlatform, type PlatformDb } from '@koovela/svc-platform';
import type { Kysely } from 'kysely';

/** Aplica as sementes sintéticas de cada domínio (roda no contêiner `seed` do dev.yml). */
const cfg = loadKeys(['MYSQL_HOST', 'MYSQL_PORT', 'KOOVELA_ENV']);
if (cfg.KOOVELA_ENV === 'production') {
  console.error('semente sintética nunca roda em produção');
  process.exit(1);
}
const cred = domainDbCredentials('platform');
const k = db({ host: cfg.MYSQL_HOST, port: cfg.MYSQL_PORT, ...cred }, 'koovela_platform') as Kysely<PlatformDb>;
try {
  console.log(`[platform] ${await seedPlatform(k)} registros sintéticos`);
} finally {
  await k.destroy();
}
