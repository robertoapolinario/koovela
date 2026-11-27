import type { FastifyPluginAsync } from 'fastify';
import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';
import { domainDbCredentials } from '@koovela/platform-config';
import type { Envelope, Topology } from '@koovela/platform-outbox';

/**
 * Contrato entre um domínio (services/*) e os processos implantáveis (D44).
 * `core` registra `plugin`; `workers` roda o relay da outbox e os `consumers`.
 */
export interface DomainModule {
  readonly name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly plugin?: FastifyPluginAsync<{ db: Kysely<any> }>;
  readonly hasOutbox: boolean;
  readonly consumers?: readonly {
    readonly topology: Topology;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly handle: (db: Kysely<any>, env: Envelope) => Promise<unknown>;
  }[];
}

/** Conexão do domínio com a credencial própria e o schema `koovela_<domínio>` (REQ-FND-028). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function domainDb(domain: string, host: string, port: number): Kysely<any> {
  const { user, password } = domainDbCredentials(domain);
  return new Kysely({
    dialect: new MysqlDialect({
      pool: createPool({ host, port, user, password, database: `koovela_${domain}`, timezone: 'Z', connectionLimit: 5 }),
    }),
  });
}

export async function selectDomains(registry: Readonly<Record<string, () => Promise<DomainModule>>>, names: readonly string[]): Promise<DomainModule[]> {
  const unknown = names.filter((n) => !(n in registry));
  if (unknown.length > 0) throw new Error(`domínios desconhecidos em KOOVELA_DOMAINS: ${unknown.join(', ')}`);
  return Promise.all(names.map((n) => (registry[n] as () => Promise<DomainModule>)()));
}
