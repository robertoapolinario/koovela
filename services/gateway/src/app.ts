import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { t } from '@koovela/i18n';
import { AppError, PlatformErrors, toProblem } from '@koovela/platform-errors';
import { readiness, type Probe } from '@koovela/platform-health';
import { CORRELATION_HEADER, fastifyMetrics } from '@koovela/platform-otel';
import { newId } from '@koovela/platform-outbox';
import { runWithContext } from '@koovela/platform-tenant-context';
import { assertCorsOrigins, securityPlugin, type KoovelaEnv } from './plugins/security.ts';

export interface GatewayOptions {
  readonly env?: KoovelaEnv;
  readonly version: string;
  readonly corsAllowedOrigins: readonly string[];
  readonly probes: readonly Probe[];
  readonly rateLimit: { readonly max: number; readonly windowSeconds: number; readonly redis?: Redis };
  readonly logger?: FastifyServerOptions['loggerInstance'];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const healthSchema = z.strictObject({
  status: z.enum(['ok', 'degraded', 'down']),
  version: z.string(),
  checked_at: z.string(),
  checks: z.array(
    z.strictObject({
      name: z.enum(['mysql', 'redis', 'rabbitmq', 'core']),
      status: z.enum(['ok', 'down']),
      latency_ms: z.number().int().min(0).optional(),
    }),
  ),
});

const problemSchema = z.looseObject({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  request_id: z.string(),
});

/** Gateway (REQ-FND-036/072/073): /v1/health, CORS canônico, correlation_id, rate limit, Problem Details. */
export async function buildGateway(opts: GatewayOptions): Promise<FastifyInstance> {
  const app = Fastify({
    ...(opts.logger ? { loggerInstance: opts.logger } : { logger: false }),
    genReqId: () => newId(),
    requestIdHeader: false,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const env = opts.env ?? 'test';
  if (env !== 'test') assertCorsOrigins(env, opts.corsAllowedOrigins);
  const allowed = new Set(opts.corsAllowedOrigins);
  securityPlugin(app, env);
  fastifyMetrics(app);

  app.addHook('onRequest', (req, reply, done) => {
    const incoming = req.headers[CORRELATION_HEADER];
    const correlationId = typeof incoming === 'string' && UUID.test(incoming) ? incoming : newId();
    reply.header('X-Request-Id', req.id);
    reply.header('X-Correlation-Id', correlationId);
    runWithContext({ request_id: req.id, correlation_id: correlationId }, done);
  });

  // Origem fora da lista: 403 em Problem Details (o preflight também).
  app.addHook('onRequest', async (req) => {
    const origin = req.headers.origin;
    if (origin && !allowed.has(origin)) throw PlatformErrors.originNotAllowed();
  });

  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'X-Correlation-Id', 'Retry-After'],
  });

  await app.register(rateLimit, {
    max: opts.rateLimit.max,
    timeWindow: opts.rateLimit.windowSeconds * 1000,
    ...(opts.rateLimit.redis ? { redis: opts.rateLimit.redis, nameSpace: 'koovela:rl:gateway:' } : {}),
    keyGenerator: (req) => req.ip,
    // Redis fora do ar não derruba o gateway: sem contador, a requisição passa (a borda ainda limita)
    // e o /v1/health informa a dependência caída como 503.
    skipOnError: true,
    errorResponseBuilder: (_req, ctx) => PlatformErrors.rateLimited(Math.ceil(ctx.ttl / 1000)),
  });

  const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
  /** Caminho existe com outro método → 405 com Allow (RFC 9110). */
  const allowedFor = (method: string, path: string) =>
    METHODS.filter((m) => m !== method && app.hasRoute({ method: m, url: path }));

  app.setErrorHandler((err, req, reply) => {
    const path = req.url.split('?')[0] ?? '/';
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    let appErr: AppError;
    if (err instanceof AppError) appErr = err;
    else if (!req.routeOptions.url && allowedFor(req.method, path).length > 0) appErr = PlatformErrors.methodNotAllowed();
    else if ((err as { validation?: unknown }).validation) appErr = PlatformErrors.validation([]);
    else if (status === 404) appErr = PlatformErrors.notFound();
    else if (status >= 400 && status < 500) appErr = PlatformErrors.clientError(status);
    else appErr = PlatformErrors.internal();
    if (appErr.status >= 500) req.log.error({ err }, 'erro no gateway');
    if (appErr.code === 'platform.rate_limited') reply.header('Retry-After', String(appErr.vars.retryAfter ?? 1));
    if (appErr.status === 405) reply.header('allow', allowedFor(req.method, path).join(', '));
    void reply.status(appErr.status).type('application/problem+json').send(toProblem(appErr, req.id, t, path));
  });

  app.setNotFoundHandler((req, reply) => {
    const path = req.url.split('?')[0] ?? '/';
    const allowed = allowedFor(req.method, path);
    if (allowed.length > 0) {
      void reply.status(405).header('allow', allowed.join(', ')).type('application/problem+json').send(toProblem(PlatformErrors.methodNotAllowed(), req.id, t, path));
      return;
    }
    void reply.status(404).type('application/problem+json').send(toProblem(PlatformErrors.notFound(), req.id, t, path));
  });

  app.get('/v1/health', { schema: { response: { 200: healthSchema, 503: problemSchema } } }, async (req, reply) => {
    const health = await readiness(opts.probes, opts.version);
    if (health.status === 'down') {
      const down = health.checks.find((c) => c.status === 'down')?.name ?? 'unknown';
      return reply
        .status(503)
        .type('application/problem+json')
        .send({ ...toProblem(PlatformErrors.dependencyUnavailable(down), req.id, t, '/v1/health') });
    }
    return { ...health, checks: [...health.checks] };
  });

  // Liveness do contêiner (sem dependências, fora do contrato público).
  app.get('/livez', { config: { rateLimit: false }, logLevel: 'silent' }, async () => ({ status: 'ok' }));

  return app;
}
