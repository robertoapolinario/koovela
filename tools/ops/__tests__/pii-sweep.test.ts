import { describe, expect, it } from 'vitest';
import { logqlFor, report, sweep, type Fetch } from '../src/pii-sweep.ts';

describe('pii-sweep', () => {
  it('monta LogQL com o padrão escapado', () => {
    expect(logqlFor(/\b\d{3}\.?\d{3}\b/)).toBe('sum by (service_name) (count_over_time({service_name=~".+"} |~ "\\\\b\\\\d{3}\\\\.?\\\\d{3}\\\\b" [30d]))');
  });

  it('soma por serviço sem expor valores e gera o relatório', async () => {
    const calls: string[] = [];
    const fetchFn: Fetch = async (url) => {
      calls.push(url);
      const hit = decodeURIComponent(url).includes('@');
      return new Response(JSON.stringify({ data: { result: hit ? [{ metric: { service_name: 'gateway' }, value: [0, '3'] }] : [] } }));
    };
    const r = await sweep('https://loki/q', {}, fetchFn);
    expect(calls).toHaveLength(5);
    expect(r).toEqual([{ kind: 'email', service: 'gateway', count: 3 }]);
    const md = report('2026-11', r);
    expect(md).toContain('result: found');
    expect(md).toContain('| gateway | email | 3 |');
  });

  it('relatório limpo', () => {
    expect(report('2026-11', [])).toContain('result: clean');
  });
});
