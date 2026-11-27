import { writeFileSync } from 'node:fs';
import { PII_PATTERNS } from '@koovela/platform-logger';

/**
 * Varredura mensal de PII nos logs (SC-008): conta, por serviço, linhas dos últimos 30 dias no Loki que
 * casam com os padrões do logger. Nunca imprime as linhas nem os valores — só os totais.
 */
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const KINDS: Record<string, string> = { '[jwt]': 'jwt', '[email]': 'email', '[cpf]': 'cpf', '[card]': 'card', '[phone]': 'phone' };

/** RE2 (LogQL) não tem lookbehind; os padrões do logger já são compatíveis (só \b, classes e quantificadores). */
export function logqlFor(re: RegExp, range = '30d'): string {
  const src = re.source.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `sum by (service_name) (count_over_time({service_name=~".+"} |~ "${src}" [${range}]))`;
}

export interface SweepResult {
  readonly kind: string;
  readonly service: string;
  readonly count: number;
}

export async function sweep(lokiQueryUrl: string, headers: Record<string, string>, fetchFn: Fetch = fetch): Promise<SweepResult[]> {
  const out: SweepResult[] = [];
  for (const [re, label] of PII_PATTERNS) {
    const kind = KINDS[label];
    if (!kind) continue;
    const url = `${lokiQueryUrl}?query=${encodeURIComponent(logqlFor(re))}`;
    const res = await fetchFn(url, { headers });
    if (!res.ok) throw new Error(`Loki respondeu ${res.status} para ${kind}`);
    const body = (await res.json()) as { data: { result: { metric: { service_name?: string }; value: [number, string] }[] } };
    for (const r of body.data.result) {
      const count = Number(r.value[1]);
      if (count > 0) out.push({ kind, service: r.metric.service_name ?? 'desconhecido', count });
    }
  }
  return out;
}

export function report(month: string, results: readonly SweepResult[]): string {
  const total = results.reduce((a, r) => a + r.count, 0);
  const rows = results.map((r) => `| ${r.service} | ${r.kind} | ${r.count} |`).join('\n');
  return `---\nmonth: ${month}\nresult: ${total === 0 ? 'clean' : 'found'}\ntotal: ${total}\n---\n\n# Varredura de PII nos logs — ${month}\n\nPadrões: CPF, telefone, e-mail, cartão, JWT (os mesmos do logger). Janela: 30 dias.\n\n| Serviço | Tipo | Linhas |\n|---|---|---|\n${rows || '| — | — | 0 |'}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const base = process.env.LOKI_QUERY_URL;
  if (!base) {
    console.error('LOKI_QUERY_URL ausente (ex.: https://grafana.koovela.com/api/datasources/proxy/uid/loki/loki/api/v1/query)');
    process.exit(2);
  }
  const headers: Record<string, string> = {};
  if (process.env.GRAFANA_TOKEN) headers.authorization = `Bearer ${process.env.GRAFANA_TOKEN}`;
  if (process.env.CF_ACCESS_CLIENT_ID) headers['cf-access-client-id'] = process.env.CF_ACCESS_CLIENT_ID;
  if (process.env.CF_ACCESS_CLIENT_SECRET) headers['cf-access-client-secret'] = process.env.CF_ACCESS_CLIENT_SECRET;
  const results = await sweep(base, headers);
  const month = new Date().toISOString().slice(0, 7);
  const out = process.argv[2];
  if (out) writeFileSync(out, report(month, results));
  for (const r of results) console.error(`✖ ${r.service}: ${r.count} linha(s) com ${r.kind}`);
  if (results.length > 0) process.exit(1);
  console.log('✔ nenhuma PII encontrada nos logs dos últimos 30 dias');
}
