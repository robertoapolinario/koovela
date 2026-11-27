import { Writable } from 'node:stream';
import { trace } from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';
import type { ErrorEvent } from '@sentry/node';
import { describe, expect, it } from 'vitest';
// Caminho relativo (sem dependência de pacote) para não criar ciclo logger ↔ otel/errors no grafo do turbo.
import { sentryBeforeSend } from '../../errors/src/sentry.ts';
import { RedactingSpanExporter } from '../../otel/src/redacting-exporter.ts';
import { createLogger } from '../src/index.ts';

/** `pnpm test:pii` — nenhum dado pessoal em claro em log, trace ou Sentry (REQ-FND-041/044, G-IV). */
const PII = [
  '123.456.789-09', // CPF
  '98765432100', // CPF sem máscara
  '(11) 98765-4321', // telefone
  '+55 21 99876 5432',
  'ana.souza@exemplo.com.br', // e-mail
  '5500 0000 0000 0004', // cartão
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0ZSJ9.c2lnbmF0dXJlLXRlc3RlLTEyMzQ1', // JWT
  'Senha#Forte2026', // senha (por campo)
];
const assertClean = (out: string) => {
  for (const v of PII) expect(out, `vazou: ${v}`).not.toContain(v);
};

describe('PII ponta a ponta', () => {
  it('logs', () => {
    let out = '';
    const destination = new Writable({ write: (c, _e, cb) => ((out += String(c)), cb()) });
    const log = createLogger({ service: 'pii', destination });
    log.info({ cpf: PII[0], senha: PII[7], obs: `ligar ${PII[2]} ou ${PII[3]}`, nested: { email: PII[4] } }, `cartão ${PII[5]} cpf ${PII[1]}`);
    log.error({ err: new Error(`token ${PII[6]}`) }, 'falha');
    assertClean(out);
  });

  it('traces (atributos, eventos e status)', async () => {
    const memory = new InMemorySpanExporter();
    const provider = new TracerProvider({ spanProcessors: [new SimpleSpanProcessor({ exporter: new RedactingSpanExporter(memory) })] });
    trace.setGlobalTracerProvider(provider);
    const span = provider.getTracer('pii').startSpan('op', { attributes: { 'user.email': PII[4], 'http.url': `/v1/x?cpf=${PII[1]}` } });
    span.addEvent('contato', { phone: PII[2], note: `cartão ${PII[5]}` });
    span.setStatus({ code: 2, message: `falha para ${PII[4]}` });
    span.end();
    await provider.forceFlush();
    const out = JSON.stringify(memory.getFinishedSpans().map((s) => ({ a: s.attributes, e: s.events, st: s.status })));
    expect(memory.getFinishedSpans()).toHaveLength(1);
    assertClean(out);
  });

  it('Sentry beforeSend', () => {
    const event = {
      type: undefined,
      message: `erro para ${PII[4]}`,
      user: { id: 'u-1', email: PII[4], ip_address: '203.0.113.7' },
      request: { headers: { authorization: `Bearer ${PII[6]}`, cookie: 'sid=1', 'user-agent': 'x' }, cookies: { sid: '1' }, data: { cpf: PII[0] } },
      exception: { values: [{ type: 'Error', value: `cpf ${PII[1]} tel ${PII[2]}` }] },
      extra: { cartao: PII[5], senha: PII[7] },
    } as unknown as ErrorEvent;
    const out = JSON.stringify(sentryBeforeSend(event));
    assertClean(out);
    expect(out).not.toContain('203.0.113.7');
  });
});
