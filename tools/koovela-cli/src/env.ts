import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Valores só para o ambiente local. Nunca vão para staging ou produção (lá os segredos vêm do
 * OCI Vault como Docker secrets — REQ-FND-081).
 */
export function localDefaults(): Record<string, string> {
  const pw = () => randomBytes(18).toString('base64url');
  return {
    RABBITMQ_URL: 'amqp://koovela:koovela-dev@rabbitmq:5672',
    REDIS_URL: 'redis://redis:6379',
    MYSQL_MIGRATOR_PASSWORD: pw(),
    MYSQL_PASSWORD_PLATFORM: pw(),
    MYSQL_PASSWORD_GATEWAY: pw(),
  };
}

/** Cria o `.env` a partir do `.env.example`, preenchendo os segredos locais vazios. */
export function ensureEnv(examplePath: string, envPath: string): { created: boolean; filled: string[] } {
  const example = readFileSync(examplePath, 'utf8');
  const current = existsSync(envPath) ? readFileSync(envPath, 'utf8') : example;
  const defaults = localDefaults();
  const filled: string[] = [];
  const present = new Set(current.split('\n').map((l) => l.split('=')[0]));
  let out = current
    .split('\n')
    .map((line) => {
      const m = /^([A-Z0-9_]+)=$/.exec(line);
      const key = m?.[1];
      if (key && defaults[key]) {
        filled.push(key);
        return `${key}=${defaults[key]}`;
      }
      return line;
    })
    .join('\n');
  // chaves novas do .env.example que ainda não estão no .env
  for (const line of example.split('\n')) {
    const key = /^([A-Z0-9_]+)=/.exec(line)?.[1];
    if (key && !present.has(key)) {
      const value = defaults[key] ?? line.slice(key.length + 1);
      out += `\n${key}=${value}`;
      filled.push(key);
    }
  }
  writeFileSync(envPath, out.endsWith('\n') ? out : `${out}\n`, { mode: 0o600 });
  return { created: !existsSync(envPath), filled };
}
