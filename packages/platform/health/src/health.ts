/** Liveness e readiness com verificação por componente (contrato gateway.openapi.yaml#/Health). */
export type DependencyName = 'mysql' | 'redis' | 'rabbitmq' | 'core';

export interface DependencyCheck {
  readonly name: DependencyName;
  readonly status: 'ok' | 'down';
  readonly latency_ms?: number;
}

export interface Health {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly version: string;
  readonly checked_at: string;
  readonly checks: readonly DependencyCheck[];
}

export interface Probe {
  readonly name: DependencyName;
  /** Obrigatória: se cair, o estado é `down` (503). Opcional: `degraded` (200). */
  readonly required: boolean;
  readonly check: () => Promise<void>;
  readonly timeoutMs?: number;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e: unknown) => (clearTimeout(timer), reject(e instanceof Error ? e : new Error(String(e)))),
    );
  });
}

export async function readiness(probes: readonly Probe[], version: string, now: () => Date = () => new Date()): Promise<Health> {
  const checks = await Promise.all(
    probes.map(async (p): Promise<DependencyCheck & { required: boolean }> => {
      const start = performance.now();
      try {
        await withTimeout(p.check(), p.timeoutMs ?? 2000);
        return { name: p.name, status: 'ok', latency_ms: Math.round(performance.now() - start), required: p.required };
      } catch {
        return { name: p.name, status: 'down', required: p.required };
      }
    }),
  );
  const requiredDown = checks.some((c) => c.required && c.status === 'down');
  const anyDown = checks.some((c) => c.status === 'down');
  return {
    status: requiredDown ? 'down' : anyDown ? 'degraded' : 'ok',
    version,
    checked_at: now().toISOString(),
    checks: checks.map(({ required: _r, ...c }) => c),
  };
}

export const liveness = (): { status: 'ok' } => ({ status: 'ok' });
