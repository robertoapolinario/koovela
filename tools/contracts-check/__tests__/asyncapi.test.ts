import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkAsyncapi } from '../src/asyncapi.ts';

const v1 = readFileSync(new URL('./fixtures/v1.yaml', import.meta.url), 'utf8');

describe('contracts:breaking (AsyncAPI)', () => {
  it('mudança compatível (campo opcional novo) passa', async () => {
    const v = await checkAsyncapi('f', v1, v1.replace('b: { type: integer }', 'b: { type: integer }\n          c: { type: string }'));
    expect(v.ok).toBe(true);
  });
  it('remover campo sem nova versão falha', async () => {
    const changed = v1.replace('          b: { type: integer }\n', '').replace('required: [a, b]', 'required: [a]');
    const v = await checkAsyncapi('f', v1, changed);
    expect(v.breaking.length).toBeGreaterThan(0);
    expect(v.ok).toBe(false);
  });
  it('tipo alterado e enum ampliado falham', async () => {
    const changed = v1.replace('a: { type: string }', 'a: { type: integer }').replace('enum: [x, y]', 'enum: [x, y, z]');
    const v = await checkAsyncapi('f', v1, changed);
    expect(v.breaking).toEqual(['x.y.z.v1.a: tipo "string" → "integer"', 'x.y.z.v1.s: valor novo no enum ("z")']);
  });
  it('a mesma remoção com versão maior nova passa', async () => {
    const changed = v1.replace('          b: { type: integer }\n', '').replace('required: [a, b]', 'required: [a]').replace('version: 1.0.0', 'version: 2.0.0');
    expect((await checkAsyncapi('f', v1, changed)).ok).toBe(true);
  });
});
