import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { existsSync } from 'node:fs';

export interface RunResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export function run(cmd: string, args: readonly string[], opts: SpawnSyncOptions & { quiet?: boolean } = {}): RunResult {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: opts.quiet ? 'pipe' : ['ignore', 'inherit', 'inherit'], ...opts });
  return { status: r.status ?? 1, stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') };
}

export interface ServiceState {
  readonly Service: string;
  readonly State: string;
  readonly Health: string;
}

export function compose(file: string, args: readonly string[], quiet = false, envFile?: string): RunResult {
  return run('docker', ['compose', '-f', file, ...(envFile ? ['--env-file', envFile] : []), ...args], { quiet });
}

export function services(file: string): ServiceState[] {
  const r = compose(file, ['ps', '--all', '--format', 'json'], true, envFileFor(file));
  return r.stdout
    .split('\n')
    .filter((l) => l.trim().startsWith('{'))
    .map((l) => JSON.parse(l) as ServiceState);
}

/** Componentes que não estão saudáveis (nomeados no erro — REQ-FND-001). */
export function unhealthy(states: readonly ServiceState[], expected: readonly string[]): string[] {
  return expected.filter((name) => {
    const s = states.find((x) => x.Service === name);
    return !s || s.State !== 'running' || (s.Health !== '' && s.Health !== 'healthy');
  });
}

/** O `.env` fica na raiz do repositório (dois níveis acima de infra/compose). */
export function envFileFor(file: string): string | undefined {
  const p = file.replace(/infra\/compose\/[^/]+$/, '.env');
  return existsSync(p) ? p : undefined;
}
