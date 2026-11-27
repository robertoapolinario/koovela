import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from '@koovela/platform-logger';
import { keys, loadConfig, toSafeObject } from '../src/index.ts';

/** Nenhuma variável de ambiente nem chave secreta aparece nos logs de inicialização (REQ-FND-081). */
const SECRET_VALUES = {
  RABBITMQ_URL: 'amqp://koovela:S3gredo-Rabbit@rabbitmq:5672',
  REDIS_URL: 'redis://:S3gredo-Redis@redis:6379',
  MYSQL_MIGRATOR_PASSWORD: 'S3gredo-Mysql-Root',
  SENTRY_DSN: 'https://abc123segredo@o1.ingest.sentry.io/1',
  ALERTMANAGER_WEBHOOK_TOKEN: 'S3gredo-Webhook-Token-0123456789',
};
const env = {
  KOOVELA_ENV: 'staging',
  KOOVELA_PROCESS: 'core',
  KOOVELA_DOMAINS: 'platform',
  MYSQL_HOST: 'db',
  CORS_ALLOWED_ORIGINS: 'https://app.staging.koovela.com',
  ...SECRET_VALUES,
};
const secretKeys = Object.entries(keys).filter(([, s]) => 'secret' in s && s.secret).map(([k]) => k);

describe('inicialização sem vazamento', () => {
  it('logar a configuração (como os processos fazem ao subir) não expõe segredo', () => {
    let out = '';
    const log = createLogger({ service: 't', secretKeys, destination: new Writable({ write: (c, _e, cb) => ((out += String(c)), cb()) }) });
    const cfg = loadConfig(env, { secretsDir: '/nonexistent' });
    log.info({ config: toSafeObject(cfg) }, 'configuração carregada');
    log.info({ ...cfg }, 'objeto cru (erro de programação)');
    log.info({ env: process.env }, 'process.env inteiro (erro de programação)');
    for (const v of Object.values(SECRET_VALUES)) expect(out).not.toContain(v);
    expect(out).toContain('"MYSQL_HOST":"db"');
  });

  it('o erro de configuração cita só o nome das chaves', () => {
    const { MYSQL_HOST: _h, ...rest } = env;
    try {
      loadConfig({ ...rest, KOOVELA_ENV: 'invalido' }, { secretsDir: '/nonexistent' });
      expect.unreachable();
    } catch (e) {
      const msg = String((e as Error).message);
      expect(msg).toMatch(/MYSQL_HOST/);
      for (const v of Object.values(SECRET_VALUES)) expect(msg).not.toContain(v);
    }
  });
});
