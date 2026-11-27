import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cruise } from 'dependency-cruiser';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const config = require('../../../.dependency-cruiser.cjs') as { forbidden: unknown[]; options: Record<string, unknown> };
const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url));

async function violations(paths: string[]) {
  const result = await cruise(paths, {
    validate: true,
    ruleSet: { forbidden: config.forbidden } as never,
    baseDir: fixtures,
    tsPreCompilationDeps: true,
  });
  const out = result.output as { summary: { violations: { rule: { name: string }; from: string; to: string }[] } };
  return out.summary.violations;
}

describe('fronteiras de domínio', { timeout: 60_000 }, () => {
  it('import entre services/* falha', async () => {
    const v = await violations(['services/beta']);
    expect(v.map((x) => x.rule.name)).toContain('no-cross-domain');
    expect(v.find((x) => x.rule.name === 'no-cross-domain')?.from).toBe('services/beta/src/index.ts');
  });

  it('import interno do próprio domínio passa', async () => {
    const v = await violations(['services/alpha']);
    expect(v.filter((x) => x.rule.name === 'no-cross-domain')).toEqual([]);
  });
});
