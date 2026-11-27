import { context, trace, TraceFlags } from '@opentelemetry/api';
import { describe, expect, it } from 'vitest';
import { extractContext, injectContext, startOtel } from './index.ts';

describe('propagação W3C + correlation_id', () => {
  it('ida e volta em cabeçalhos', () => {
    startOtel({ service: 't', version: 'v' });
    const spanCtx = { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331', traceFlags: TraceFlags.SAMPLED };
    const ctx = trace.setSpanContext(context.active(), spanCtx);
    const headers: Record<string, unknown> = {};
    injectContext(headers, 'corr-1', ctx);
    expect(headers.traceparent).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
    const { ctx: out, correlationId } = extractContext(headers);
    expect(correlationId).toBe('corr-1');
    expect(trace.getSpanContext(out)?.traceId).toBe(spanCtx.traceId);
  });
});
