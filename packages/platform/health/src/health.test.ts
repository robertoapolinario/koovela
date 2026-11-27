import { describe, expect, it } from 'vitest';
import { readiness } from './index.ts';

const ok = async () => {};
const fail = async () => { throw new Error('down'); };

describe('readiness', () => {
  it('ok quando tudo responde', async () => {
    const h = await readiness([{ name: 'mysql', required: true, check: ok }], '2026.11.27-abc1234');
    expect(h.status).toBe('ok');
    expect(h.checks[0]).toMatchObject({ name: 'mysql', status: 'ok' });
  });
  it('down quando dependência obrigatória cai; degraded quando opcional', async () => {
    expect((await readiness([{ name: 'mysql', required: true, check: fail }], 'v')).status).toBe('down');
    expect((await readiness([{ name: 'mysql', required: true, check: ok }, { name: 'core', required: false, check: fail }], 'v')).status).toBe('degraded');
  });
  it('timeout conta como down', async () => {
    const slow = () => new Promise<void>((r) => setTimeout(r, 200));
    const h = await readiness([{ name: 'redis', required: true, check: slow, timeoutMs: 10 }], 'v');
    expect(h.checks[0]?.status).toBe('down');
  });
});
