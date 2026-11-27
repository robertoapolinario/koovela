import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

/** Todo alerta declara severity (critical|warning), environment e runbook existente (data-model §1.6). */
const dir = fileURLToPath(new URL('../', import.meta.url));
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const rules = readdirSync(dir)
  .filter((f) => f.endsWith('.yml'))
  .flatMap((f) =>
    (parse(readFileSync(dir + f, 'utf8')) as { groups: { rules: { alert: string; labels?: Record<string, string>; annotations?: Record<string, string> }[] }[] }).groups.flatMap(
      (g) => g.rules.map((r) => ({ file: f, ...r })),
    ),
  );

describe('regras de alerta', () => {
  it('existem as obrigatórias da REQ-FND-045', () => {
    const names = rules.map((r) => r.alert);
    for (const n of ['ServiceUnhealthy', 'HighErrorRate', 'BackupFailed', 'DiskAbove80', 'DeployFailed']) expect(names).toContain(n);
  });
  it.each(rules.map((r) => [r.alert, r] as const))('%s: severity, environment e runbook', (_n, r) => {
    expect(['critical', 'warning']).toContain(r.labels?.severity);
    expect(r.labels?.environment).toBeTruthy();
    expect(r.annotations?.runbook).toMatch(/^docs\/ops\/runbooks\/alertas\/.+\.md$/);
    expect(existsSync(root + (r.annotations?.runbook ?? '')), `runbook ausente: ${r.annotations?.runbook}`).toBe(true);
  });
});
