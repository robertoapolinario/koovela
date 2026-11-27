import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError, domainDbCredentials, isSecretKey, loadConfig, renderEnvExample, toSafeObject } from './index.ts';

const base = {
  KOOVELA_ENV: 'test',
  KOOVELA_PROCESS: 'core',
  KOOVELA_DOMAINS: 'platform, scheduling',
  MYSQL_HOST: 'mysql',
  RABBITMQ_URL: 'amqp://u:p@rabbitmq:5672',
  REDIS_URL: 'redis://redis:6379',
  CORS_ALLOWED_ORIGINS: 'http://app.koovela.localhost',
};
const noSecrets = { secretsDir: '/nonexistent' };

describe('loadConfig', () => {
  it('lê e converte as chaves', () => {
    const c = loadConfig(base, noSecrets);
    expect(c.KOOVELA_DOMAINS).toEqual(['platform', 'scheduling']);
    expect(c.HTTP_PORT).toBe(8080);
    expect(c.LOG_LEVEL).toBe('info');
  });

  it('falha citando a chave ausente, sem valores', () => {
    const { MYSQL_HOST: _omit, ...rest } = base;
    try {
      loadConfig({ ...rest, REDIS_URL: 'redis://user:supersecret@redis:6379' }, noSecrets);
      expect.fail('deveria falhar');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as Error).message).toContain('MYSQL_HOST');
      expect((e as Error).message).not.toContain('supersecret');
    }
  });

  it('lê segredo de arquivo do Docker secret', () => {
    const dir = mkdtempSync(join(tmpdir(), 'secrets-'));
    writeFileSync(join(dir, 'redis_url'), 'redis://from-secret:6379\n');
    const { REDIS_URL: _r, ...rest } = base;
    expect(loadConfig(rest, { secretsDir: dir }).REDIS_URL).toBe('redis://from-secret:6379');
  });
});

describe('segredos nunca serializados', () => {
  it('toSafeObject troca chaves secretas', () => {
    const safe = toSafeObject(loadConfig(base, noSecrets));
    expect(safe.RABBITMQ_URL).toBe('[secret]');
    expect(safe.REDIS_URL).toBe('[secret]');
    expect(JSON.stringify(safe)).not.toContain('u:p@');
    expect(safe.MYSQL_HOST).toBe('mysql');
  });

  it('isSecretKey cobre a senha por domínio', () => {
    expect(isSecretKey('MYSQL_PASSWORD_PLATFORM')).toBe(true);
    expect(isSecretKey('MYSQL_HOST')).toBe(false);
  });

  it('.env.example não traz valor de segredo', () => {
    const example = renderEnvExample(['platform']);
    expect(example).toMatch(/^RABBITMQ_URL=$/m);
    expect(example).toMatch(/^MYSQL_PASSWORD_PLATFORM=$/m);
    expect(example).toMatch(/^MYSQL_HOST=mysql$/m);
  });
});

describe('domainDbCredentials', () => {
  it('exige usuário e senha do domínio', () => {
    expect(() => domainDbCredentials('platform', {}, noSecrets)).toThrow(/MYSQL_USER_PLATFORM/);
    expect(
      domainDbCredentials('platform', { MYSQL_USER_PLATFORM: 'u', MYSQL_PASSWORD_PLATFORM: 'p' }, noSecrets),
    ).toEqual({ user: 'u', password: 'p' });
  });
});
