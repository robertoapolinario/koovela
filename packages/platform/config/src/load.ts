import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { keys, type Config, type KeyName, type KeySpec } from './schema.ts';

const specs = Object.entries(keys) as [KeyName, KeySpec][];
const specOf = (k: string): KeySpec | undefined => (keys as Record<string, KeySpec>)[k];

export class ConfigError extends Error {
  readonly problems: readonly { key: string; issue: string }[];
  constructor(problems: readonly { key: string; issue: string }[]) {
    // A mensagem cita só o nome das chaves, nunca valores (REQ-FND-081).
    super(`Configuração inválida: ${problems.map((p) => `${p.key} (${p.issue})`).join(', ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export interface LoadOptions {
  /** Pasta dos Docker secrets (um arquivo por chave, em minúsculas). */
  readonly secretsDir?: string;
}

type Env = Readonly<Record<string, string | undefined>>;

function readRaw(env: Env, key: string, secretsDir: string): string | undefined {
  const fromFile = env[`${key}_FILE`];
  if (fromFile && existsSync(fromFile)) return readFileSync(fromFile, 'utf8').trim();
  const secretPath = join(secretsDir, key.toLowerCase());
  if (existsSync(secretPath)) return readFileSync(secretPath, 'utf8').trim();
  const v = env[key];
  return v === '' ? undefined : v;
}

/** Lê e valida toda a configuração. Falha listando as chaves com problema. */
export function loadConfig(env: Env = process.env, options: LoadOptions = {}): Config {
  const secretsDir = options.secretsDir ?? '/run/secrets';
  const out: Record<string, unknown> = {};
  const problems: { key: string; issue: string }[] = [];
  for (const [key, spec] of specs) {
    const raw = readRaw(env, key, secretsDir);
    const parsed = spec.schema.safeParse(raw);
    if (parsed.success) out[key] = parsed.data;
    else problems.push({ key, issue: raw === undefined ? 'ausente' : 'inválida' });
  }
  if (problems.length > 0) throw new ConfigError(problems);
  return out as Config;
}

/** Lê só as chaves pedidas (processos auxiliares, como o executor de migrações). */
export function loadKeys<K extends KeyName>(names: readonly K[], env: Env = process.env, options: LoadOptions = {}): Pick<Config, K> {
  const secretsDir = options.secretsDir ?? '/run/secrets';
  const out: Record<string, unknown> = {};
  const problems: { key: string; issue: string }[] = [];
  for (const key of names) {
    const parsed = (keys[key] as KeySpec).schema.safeParse(readRaw(env, key, secretsDir));
    if (parsed.success) out[key] = parsed.data;
    else problems.push({ key, issue: 'ausente ou inválida' });
  }
  if (problems.length > 0) throw new ConfigError(problems);
  return out as Pick<Config, K>;
}

/** Cópia da configuração segura para log: chaves secretas trocadas por `[secret]`. */
export function toSafeObject(config: Partial<Config>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    safe[key] = specOf(key)?.secret ? '[secret]' : value;
  }
  return safe;
}

export function isSecretKey(key: string): boolean {
  if (/^MYSQL_PASSWORD_/.test(key)) return true;
  return Boolean(specOf(key)?.secret);
}

/** Credencial de banco própria de cada domínio (REQ-FND-028). */
export function domainDbCredentials(
  domain: string,
  env: Env = process.env,
  options: LoadOptions = {},
): { user: string; password: string } {
  const suffix = domain.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const secretsDir = options.secretsDir ?? '/run/secrets';
  const user = readRaw(env, `MYSQL_USER_${suffix}`, secretsDir);
  const password = readRaw(env, `MYSQL_PASSWORD_${suffix}`, secretsDir);
  const problems = [
    ...(user ? [] : [{ key: `MYSQL_USER_${suffix}`, issue: 'ausente' }]),
    ...(password ? [] : [{ key: `MYSQL_PASSWORD_${suffix}`, issue: 'ausente' }]),
  ];
  if (problems.length > 0) throw new ConfigError(problems);
  return { user: user as string, password: password as string };
}

/** Conteúdo do `.env.example`: todas as chaves, valores secretos vazios. */
export function renderEnvExample(domains: readonly string[] = ['platform', 'gateway']): string {
  const lines = ['# Gerado por `pnpm env:generate` a partir de packages/platform/config. Não edite à mão.', ''];
  let group = '';
  for (const [key, spec] of specs) {
    if (spec.group !== group) {
      group = spec.group;
      lines.push(`# --- ${group} ---`);
    }
    lines.push(`# ${spec.description}${spec.secret ? ' (secreto)' : ''}`);
    lines.push(`${key}=${spec.secret ? '' : (spec.example ?? '')}`);
  }
  lines.push('# --- database (credencial por domínio, REQ-FND-028) ---');
  for (const d of domains) {
    const s = d.toUpperCase();
    lines.push(`MYSQL_USER_${s}=koovela_${d}`, `MYSQL_PASSWORD_${s}=`);
  }
  return `${lines.join('\n')}\n`;
}
