import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createEnvelope, envelopeSchema, newId } from './index.ts';

const eventType = fc
  .tuple(...[0, 1, 2].map(() => fc.stringMatching(/^[a-z_]{1,12}$/)), fc.integer({ min: 1, max: 99 }))
  .map(([a, b, c, v]) => `${a}.${b}.${c}.v${v}`);

describe('envelope (propriedades)', () => {
  it('todo envelope criado é válido, tem UUIDv7 e versão igual ao sufixo', () => {
    fc.assert(
      fc.property(eventType, fc.dictionary(fc.string().filter((k) => k !== '__proto__'), fc.jsonValue()), (type, data) => {
        const env = createEnvelope({ event_type: type, data, correlation_id: newId(), actor: { type: 'system', id: 'test' } });
        expect(envelopeSchema.safeParse(env).success).toBe(true);
        expect(env.event_id[14]).toBe('7');
        expect(env.version).toBe(Number(/\.v(\d+)$/.exec(type)?.[1]));
        const json = JSON.stringify(env);
        expect(JSON.stringify(JSON.parse(json))).toBe(json);
      }),
    );
  });

  it('rejeita event_type fora do padrão e actor com e-mail', () => {
    const base = { data: {}, correlation_id: newId(), actor: { type: 'system' as const, id: 'x' } };
    expect(() => createEnvelope({ ...base, event_type: 'Platform.Ping' })).toThrow();
    expect(() => createEnvelope({ ...base, event_type: 'a.b.c.v1', actor: { type: 'user', id: 'a@b.com' } })).toThrow();
  });

  it('ids são ordenáveis no tempo', () => {
    const ids = Array.from({ length: 50 }, () => newId());
    expect([...ids].sort()).toEqual(ids);
  });
});
