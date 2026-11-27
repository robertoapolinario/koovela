import { z } from 'zod';

export type ConfigGroup = 'process' | 'database' | 'queue_cache' | 'observability' | 'edge';

export interface KeySpec {
  readonly schema: z.ZodType;
  readonly group: ConfigGroup;
  readonly description: string;
  /** Chave secreta: vem do Docker secret ou do cofre em staging e produção e nunca é logada. */
  readonly secret?: boolean;
  readonly example?: string;
}

const csv = z
  .string()
  .optional()
  .transform((s) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean));

/**
 * Esquema único de configuração (data-model §2). Nenhuma chave é lida fora daqui (REQ-FND-080).
 * As credenciais de banco por domínio (`MYSQL_USER_<DOMINIO>`, `MYSQL_PASSWORD_<DOMINIO>`) são
 * resolvidas por `domainDbCredentials`.
 */
export const keys = {
  KOOVELA_ENV: {
    schema: z.enum(['local', 'test', 'staging', 'production']),
    group: 'process',
    description: 'Ambiente em execução',
    example: 'local',
  },
  KOOVELA_PROCESS: {
    schema: z.enum(['gateway', 'core', 'workers']),
    group: 'process',
    description: 'Processo implantável (D44)',
    example: 'core',
  },
  KOOVELA_DOMAINS: {
    schema: csv,
    group: 'process',
    description: 'Domínios carregados pelo processo, separados por vírgula',
    example: 'platform',
  },
  KOOVELA_VERSION: {
    schema: z.string().default('0.0.0-local'),
    group: 'process',
    description: 'Versão de release em execução (AAAA.MM.DD-sha7)',
    example: '0.0.0-local',
  },
  LOG_LEVEL: {
    schema: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    group: 'process',
    description: 'Nível de log',
    example: 'info',
  },
  HTTP_PORT: {
    schema: z.coerce.number().int().min(1).max(65535).default(8080),
    group: 'process',
    description: 'Porta HTTP do processo',
    example: '8080',
  },
  MYSQL_HOST: { schema: z.string().min(1), group: 'database', description: 'Host do MySQL', example: 'mysql' },
  MYSQL_PORT: {
    schema: z.coerce.number().int().default(3306),
    group: 'database',
    description: 'Porta do MySQL',
    example: '3306',
  },
  MYSQL_MIGRATOR_USER: {
    schema: z.string().optional(),
    group: 'database',
    description: 'Usuário administrativo usado só pelo executor de migrações',
    example: 'root',
  },
  MYSQL_MIGRATOR_PASSWORD: {
    schema: z.string().optional(),
    group: 'database',
    description: 'Senha do usuário de migrações',
    secret: true,
  },
  RABBITMQ_URL: {
    schema: z.string().url(),
    group: 'queue_cache',
    description: 'URL do RabbitMQ',
    secret: true,
    example: 'amqp://koovela:koovela@rabbitmq:5672',
  },
  REDIS_URL: {
    schema: z.string().url(),
    group: 'queue_cache',
    description: 'URL do Redis',
    secret: true,
    example: 'redis://redis:6379',
  },
  OTEL_EXPORTER_OTLP_ENDPOINT: {
    schema: z.string().url().optional(),
    group: 'observability',
    description: 'Endpoint OTLP do OpenTelemetry Collector (vazio desliga a exportação)',
    example: '',
  },
  SENTRY_DSN: {
    schema: z.string().url().optional(),
    group: 'observability',
    description: 'DSN do Sentry (opcional)',
    secret: true,
    example: '',
  },
  CORE_URL: {
    schema: z.string().url().default('http://core:8080'),
    group: 'edge',
    description: 'Endereço interno do processo core (o gateway verifica a saúde dele)',
    example: 'http://core:8080',
  },
  RATE_LIMIT_MAX: {
    schema: z.coerce.number().int().min(1).default(300),
    group: 'edge',
    description: 'Requisições por janela e por IP no gateway (rate limit fino, além da regra da Cloudflare)',
    example: '300',
  },
  RATE_LIMIT_WINDOW_SECONDS: {
    schema: z.coerce.number().int().min(1).default(60),
    group: 'edge',
    description: 'Janela do rate limit do gateway, em segundos',
    example: '60',
  },
  ALERTMANAGER_WEBHOOK_TOKEN: {
    schema: z.string().min(24).optional(),
    group: 'observability',
    description: 'Token do webhook do Alertmanager para o registro de incidentes (core)',
    secret: true,
  },
  CORS_ALLOWED_ORIGINS: {
    schema: csv,
    group: 'edge',
    description: 'Origens canônicas aceitas pelo CORS do gateway, separadas por vírgula',
    example: 'http://koovela.localhost,http://app.koovela.localhost,http://painel.koovela.localhost,http://admin.koovela.localhost',
  },
} as const satisfies Record<string, KeySpec>;

export type KeyName = keyof typeof keys;
export type Config = { [K in KeyName]: z.output<(typeof keys)[K]['schema']> };
