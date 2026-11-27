import { metrics, type Histogram, type Counter } from '@opentelemetry/api';
import type { FastifyInstance } from 'fastify';

/**
 * Métricas RED (taxa, erros, duração) e de filas (REQ-FND-043), com nomes das convenções semânticas
 * do OpenTelemetry: viram `http_server_request_duration_seconds_*` no Prometheus.
 * Nunca usam rótulo de alta cardinalidade nem dado pessoal: a rota é o *template* (`/v1/x/:id`).
 */
let httpDuration: Histogram | undefined;
let consumed: Counter | undefined;
let failed: Counter | undefined;

const meter = () => metrics.getMeter('koovela');

export function recordHttp(route: string, method: string, status: number, seconds: number): void {
  httpDuration ??= meter().createHistogram('http.server.request.duration', {
    unit: 's',
    description: 'Duração das requisições HTTP',
    advice: { explicitBucketBoundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.3, 0.5, 1, 2.5, 5] },
  });
  httpDuration.record(seconds, { 'http.route': route, 'http.request.method': method, 'http.response.status_code': status });
}

export function recordMessage(queue: string, outcome: 'ok' | 'retry' | 'dead'): void {
  consumed ??= meter().createCounter('messaging.client.consumed.messages', { description: 'Mensagens consumidas' });
  failed ??= meter().createCounter('koovela.messaging.failures', { description: 'Falhas de consumidor por desfecho' });
  consumed.add(1, { 'messaging.destination.name': queue });
  if (outcome !== 'ok') failed.add(1, { 'messaging.destination.name': queue, outcome });
}

/** Hook Fastify: registra cada resposta com a rota template. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fastifyMetrics(app: FastifyInstance<any, any, any, any, any>): void {
  app.addHook('onResponse', async (req, reply) => {
    recordHttp(req.routeOptions.url ?? 'desconhecida', req.method, reply.statusCode, reply.elapsedTime / 1000);
  });
}
