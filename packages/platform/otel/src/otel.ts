import { context, propagation, trace, type Context } from '@opentelemetry/api';
import { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } from '@opentelemetry/core';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { RedactingSpanExporter } from './redacting-exporter.ts';

export const CORRELATION_HEADER = 'x-correlation-id';
const BAGGAGE_KEY = 'correlation_id';

let sdk: NodeSDK | undefined;

/** Liga traces e métricas OTLP (só quando há endpoint). Propagação W3C sempre ativa. */
export function startOtel(opts: { service: string; version: string; endpoint?: string | undefined }): void {
  propagation.setGlobalPropagator(
    new CompositePropagator({ propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()] }),
  );
  if (!opts.endpoint || sdk) return;
  sdk = new NodeSDK({
    resource: resourceFromAttributes({ 'service.name': opts.service, 'service.version': opts.version }),
    traceExporter: new RedactingSpanExporter(new OTLPTraceExporter({ url: `${opts.endpoint}/v1/traces` })),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${opts.endpoint}/v1/metrics` }),
      }),
    ],
  });
  sdk.start();
}

export async function stopOtel(): Promise<void> {
  await sdk?.shutdown();
  sdk = undefined;
}

/** Injeta traceparent, baggage e correlation_id em cabeçalhos HTTP ou AMQP. */
export function injectContext(carrier: Record<string, unknown>, correlationId: string, ctx: Context = context.active()): void {
  const withBaggage = propagation.setBaggage(
    ctx,
    (propagation.getBaggage(ctx) ?? propagation.createBaggage()).setEntry(BAGGAGE_KEY, { value: correlationId }),
  );
  propagation.inject(withBaggage, carrier);
  carrier[CORRELATION_HEADER] = correlationId;
}

/** Extrai o contexto e o correlation_id de cabeçalhos HTTP ou AMQP. */
export function extractContext(carrier: Record<string, unknown>): { ctx: Context; correlationId: string | undefined } {
  const ctx = propagation.extract(context.active(), carrier);
  const header = carrier[CORRELATION_HEADER];
  const correlationId =
    (typeof header === 'string' ? header : undefined) ?? propagation.getBaggage(ctx)?.getEntry(BAGGAGE_KEY)?.value;
  return { ctx, correlationId };
}

export const tracer = (name: string) => trace.getTracer(name);
