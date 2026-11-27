import { parse, stringify } from 'yaml';

/** Cabeçalho de docs/ops/restore-tests/AAAA-MM.md (data-model §1.4). */
export interface RestoreRecord {
  date: string;
  environment: 'staging';
  restored_point: string;
  source: 'cloudflare-r2' | 'own-equipment';
  duration_minutes: number;
  executor: string;
  checks: { name: string; result: 'ok' | 'failed'; detail?: string }[];
  result: 'success' | 'failure';
}

export function renderRestoreRecord(r: RestoreRecord, body: string): string {
  return `---\n${stringify(r).trimEnd()}\n---\n\n# Teste de restauração — ${r.date}\n\n${body}\n`;
}

export function validateRestoreRecord(text: string): string[] {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return ['cabeçalho YAML ausente'];
  const h = parse(m[1] ?? '') as Partial<RestoreRecord> & Record<string, unknown>;
  const e: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(h.date ?? ''))) e.push('date: AAAA-MM-DD');
  if (h.environment !== 'staging') e.push('environment: sempre staging');
  if (Number.isNaN(Date.parse(String(h.restored_point ?? ''))) || !/T/.test(String(h.restored_point ?? ''))) e.push('restored_point: ISO-8601');
  if (h.source !== 'cloudflare-r2' && h.source !== 'own-equipment') e.push('source: cloudflare-r2 ou own-equipment');
  if (typeof h.duration_minutes !== 'number' || h.duration_minutes < 0) e.push('duration_minutes: número ≥ 0');
  if (typeof h.executor !== 'string' || h.executor.trim() === '') e.push('executor: obrigatório');
  if (!Array.isArray(h.checks) || h.checks.length === 0) e.push('checks: ao menos uma verificação');
  else if (h.checks.some((c) => !c || typeof c.name !== 'string' || (c.result !== 'ok' && c.result !== 'failed'))) e.push('checks: name e result (ok|failed)');
  if (h.result !== 'success' && h.result !== 'failure') e.push('result: success ou failure');
  if (h.result === 'success' && Array.isArray(h.checks) && h.checks.some((c) => c?.result === 'failed')) e.push('result: success com verificação falha');
  return e;
}
