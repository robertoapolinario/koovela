import type { ExportResult } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace';
import { redactValue } from '@koovela/platform-logger';

/**
 * Exporter que mascara atributos e eventos dos spans antes de sair do processo (REQ-FND-041).
 * O Collector tem um segundo mascaramento (infra/observability/otel-collector.yaml).
 */
export class RedactingSpanExporter implements SpanExporter {
  private readonly inner: SpanExporter;
  constructor(inner: SpanExporter) {
    this.inner = inner;
  }

  export(spans: ReadableSpan[], done: (r: ExportResult) => void): void {
    const masked = spans.map((s) => {
      const attributes = redactValue({ ...s.attributes }) as ReadableSpan['attributes'];
      const events = s.events.map((e) => ({ ...e, ...(e.attributes ? { attributes: redactValue({ ...e.attributes }) as typeof e.attributes } : {}) }));
      const status = s.status.message ? { ...s.status, message: redactValue(s.status.message) as string } : s.status;
      return Object.assign(Object.create(Object.getPrototypeOf(s) as object) as ReadableSpan, s, { attributes, events, status });
    });
    this.inner.export(masked, done);
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush?.() ?? Promise.resolve();
  }
}
