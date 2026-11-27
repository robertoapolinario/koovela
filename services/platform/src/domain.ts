import type { Kysely } from 'kysely';
import { injectContext } from '@koovela/platform-otel';
import { createEnvelope, enqueue, newId, processOnce, type Envelope, type Topology } from '@koovela/platform-outbox';

export const DOMAIN = 'platform';
export const EVENT_PINGED = 'platform.example.pinged.v1';

export const TOPOLOGY: Topology = {
  exchange: 'platform.example',
  queue: 'platform.example.pinged.v1.platform',
  bindings: [EVENT_PINGED],
  dlq: 'platform.example.dlq',
};

export interface PlatformDb {
  platform_pings: {
    ping_id: string;
    label: string;
    synthetic: boolean | number;
    created_at?: Date;
    received_at: Date | null;
  };
}

/** Cria um ping e grava o evento na outbox na mesma transação. */
export async function ping(
  db: Kysely<PlatformDb>,
  input: { label: string; correlation_id: string; synthetic?: boolean },
): Promise<Envelope<{ ping_id: string }>> {
  const ping_id = newId();
  const env = createEnvelope({
    event_type: EVENT_PINGED,
    data: { ping_id },
    correlation_id: input.correlation_id,
    actor: { type: 'system', id: 'platform' },
  });
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('platform_pings')
      .values({ ping_id, label: input.label, synthetic: input.synthetic ?? false, received_at: null })
      .execute();
    // traceparent + baggage + x-correlation-id seguem com a mensagem (REQ-FND-042).
    const headers: Record<string, unknown> = {};
    injectContext(headers, input.correlation_id);
    await enqueue(trx, DOMAIN, TOPOLOGY.exchange, env, headers);
  });
  return env;
}

/** Consumidor idempotente: marca o ping como recebido uma única vez. */
export async function onPinged(db: Kysely<PlatformDb>, env: Envelope): Promise<boolean> {
  const pingId = (env.data as { ping_id?: unknown }).ping_id;
  if (typeof pingId !== 'string') throw new Error('ping_id ausente');
  return processOnce(db, DOMAIN, 'platform.on_pinged', env.event_id, async (trx) => {
    const t = trx as unknown as Kysely<PlatformDb>;
    const res = await t
      .updateTable('platform_pings')
      .set({ received_at: new Date() })
      .where('ping_id', '=', pingId)
      .where('received_at', 'is', null)
      .executeTakeFirst();
    if (Number(res.numUpdatedRows) === 0) throw new Error(`ping ${pingId} inexistente ou já recebido`);
  });
}
