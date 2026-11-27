import { describe, expect, it } from 'vitest';
import type { DomainModule } from '@koovela/platform-runtime';
import { selectDomains } from '@koovela/platform-runtime';
import { buildCore } from '../src/app.ts';

const fake = (name: string): DomainModule => ({
  name,
  hasOutbox: false,
  plugin: async (app) => {
    app.get(`/internal/${name}/hello`, async () => ({ name }));
  },
});

describe('runtime core', () => {
  it('carrega só os domínios listados', async () => {
    const registry = { a: async () => fake('a'), b: async () => fake('b') };
    const app = await buildCore(await selectDomains(registry, ['a']), () => ({}) as never);
    expect((await app.inject('/internal/a/hello')).statusCode).toBe(200);
    expect((await app.inject('/internal/b/hello')).statusCode).toBe(404);
    expect((await app.inject('/livez')).json()).toEqual({ status: 'ok', domains: ['a'] });
  });

  it('falha com domínio desconhecido', async () => {
    await expect(selectDomains({}, ['x'])).rejects.toThrow(/x/);
  });
});
