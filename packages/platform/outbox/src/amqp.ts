import amqp, { type ChannelModel, type ConfirmChannel, type ConsumeMessage } from 'amqplib';
import { context } from '@opentelemetry/api';
import { extractContext, recordMessage } from '@koovela/platform-otel';
import { envelopeSchema, type Envelope } from './envelope.ts';
import type { Publisher } from './outbox.ts';

export interface Topology {
  /** Exchange do domínio (ex.: `platform.example`). */
  readonly exchange: string;
  /** Fila do consumidor. */
  readonly queue: string;
  /** Chaves de roteamento (event_type) assinadas. */
  readonly bindings: readonly string[];
  /** Fila morta (ex.: `platform.example.dlq`). */
  readonly dlq: string;
}

export async function connect(url: string): Promise<ChannelModel> {
  return amqp.connect(url);
}

export async function assertTopology(ch: ConfirmChannel, t: Topology): Promise<void> {
  const dlx = `${t.exchange}.dlx`;
  await ch.assertExchange(t.exchange, 'topic', { durable: true });
  await ch.assertExchange(dlx, 'fanout', { durable: true });
  await ch.assertQueue(t.dlq, { durable: true, arguments: { 'x-queue-type': 'quorum' } });
  await ch.bindQueue(t.dlq, dlx, '');
  await ch.assertQueue(t.queue, {
    durable: true,
    arguments: { 'x-queue-type': 'quorum', 'x-dead-letter-exchange': dlx },
  });
  for (const key of t.bindings) await ch.bindQueue(t.queue, t.exchange, key);
}

export function amqpPublisher(ch: ConfirmChannel): Publisher {
  return {
    async publish(exchange, routingKey, body, headers, messageId) {
      await ch.assertExchange(exchange, 'topic', { durable: true });
      await new Promise<void>((resolve, reject) => {
        ch.publish(
          exchange,
          routingKey,
          body,
          { persistent: true, contentType: 'application/json', messageId, headers },
          (err) => (err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve()),
        );
      });
    },
  };
}

export interface ConsumeOptions {
  /** Tentativas antes de mandar para a DLQ. */
  readonly maxAttempts?: number;
  readonly onError?: (err: unknown, env: Envelope | undefined, attempt: number) => void;
}

const ATTEMPT_HEADER = 'x-koovela-attempt';

/**
 * Consome mensagens validando o envelope. Falha → republica com tentativa + 1; ao esgotar,
 * rejeita sem requeue e a mensagem cai na DLQ. Mensagem inválida vai direto para a DLQ.
 */
export async function consume(
  ch: ConfirmChannel,
  t: Topology,
  handler: (env: Envelope, headers: Record<string, unknown>) => Promise<void>,
  options: ConsumeOptions = {},
): Promise<string> {
  const max = options.maxAttempts ?? 3;
  const { consumerTag } = await ch.consume(t.queue, (msg: ConsumeMessage | null) => {
    if (!msg) return;
    const headers = (msg.properties.headers ?? {}) as Record<string, unknown>;
    const attempt = Number(headers[ATTEMPT_HEADER] ?? 1);
    let env: Envelope | undefined;
    void (async () => {
      try {
        env = envelopeSchema.parse(JSON.parse(msg.content.toString('utf8'))) as Envelope;
      } catch (err) {
        options.onError?.(err, undefined, attempt);
        ch.reject(msg, false);
        return;
      }
      const { ctx } = extractContext(headers);
      try {
        await context.with(ctx, () => handler(env as Envelope, headers));
        ch.ack(msg);
        recordMessage(t.queue, 'ok');
      } catch (err) {
        options.onError?.(err, env, attempt);
        if (attempt >= max) {
          ch.reject(msg, false);
          recordMessage(t.queue, 'dead');
        } else {
          ch.publish(msg.fields.exchange, msg.fields.routingKey, msg.content, {
            ...msg.properties,
            headers: { ...headers, [ATTEMPT_HEADER]: attempt + 1 },
          });
          ch.ack(msg);
          recordMessage(t.queue, 'retry');
        }
      }
    })();
  });
  return consumerTag;
}
