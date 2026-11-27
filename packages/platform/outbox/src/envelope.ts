import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';

/** Envelope comum de eventos (CONST IX; platform-events.asyncapi.yaml#/Envelope). */
export const EVENT_TYPE = /^[a-z_]+\.[a-z_]+\.[a-z_]+\.v[0-9]+$/;

export const envelopeSchema = z.strictObject({
  event_id: z.uuid(),
  event_type: z.string().regex(EVENT_TYPE),
  version: z.number().int().min(1),
  tenant_id: z.uuid().nullable().optional(),
  occurred_at: z.iso.datetime(),
  actor: z.strictObject({
    type: z.enum(['system', 'pipeline', 'sre', 'user']),
    id: z.string().min(1).refine((s) => !s.includes('@'), 'actor.id não pode ser e-mail'),
  }),
  correlation_id: z.uuid(),
  data: z.record(z.string(), z.unknown()),
});

export type Envelope<D extends Record<string, unknown> = Record<string, unknown>> = Omit<
  z.infer<typeof envelopeSchema>,
  'data'
> & { data: D };

export interface NewEvent<D extends Record<string, unknown>> {
  readonly event_type: string;
  readonly data: D;
  readonly correlation_id: string;
  readonly actor: Envelope['actor'];
  readonly tenant_id?: string | null;
  readonly occurred_at?: Date;
}

export function createEnvelope<D extends Record<string, unknown>>(e: NewEvent<D>): Envelope<D> {
  const match = /\.v(\d+)$/.exec(e.event_type);
  const env = {
    event_id: uuidv7(),
    event_type: e.event_type,
    version: match ? Number(match[1]) : 0,
    tenant_id: e.tenant_id ?? null,
    occurred_at: (e.occurred_at ?? new Date()).toISOString(),
    actor: e.actor,
    correlation_id: e.correlation_id,
    data: e.data,
  };
  return envelopeSchema.parse(env) as Envelope<D>;
}

export const newId = (): string => uuidv7();
