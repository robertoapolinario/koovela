import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Sobe o ambiente local de verdade (lento: vários minutos na primeira vez).
 * Roda só com KOOVELA_E2E=1 — no CI roda no job noturno, não no PR.
 */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const cli = (...args: string[]) =>
  spawnSync('node', ['tools/koovela-cli/src/cli.ts', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 900_000 });
const compose = (...args: string[]) =>
  spawnSync('docker', ['compose', '-f', 'infra/compose/dev.yml', '--env-file', '.env', ...args], { cwd: ROOT, encoding: 'utf8' });

describe.runIf(process.env.KOOVELA_E2E === '1')('pnpm koovela up', () => {
  it('sobe e espera a saúde de todos os componentes', () => {
    const r = cli('up', '--no-web');
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/Ambiente no ar em \d+ min/);
  }, 900_000);

  it('falha citando o componente quando o mysql está parado', () => {
    compose('stop', 'mysql');
    try {
      const r = cli('doctor');
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/sem saúde: .*mysql/);
    } finally {
      compose('start', 'mysql');
    }
  }, 120_000);
});
