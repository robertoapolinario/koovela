import { Faker, pt_BR, base } from '@faker-js/faker';

/** Semente padrão: os mesmos dados em toda máquina (REQ-FND-003). */
export const DEFAULT_SEED = 20261125;

/** Faker pt-BR com semente fixa e data de referência fixa. */
export function syntheticFaker(seed = DEFAULT_SEED): Faker {
  const f = new Faker({ locale: [pt_BR, base] });
  f.seed(seed);
  f.setDefaultRefDate(new Date('2026-01-01T00:00:00Z'));
  return f;
}

/** Marca obrigatória de todo registro sintético. */
export const SYNTHETIC = { synthetic: true } as const;

export interface SeedRecord {
  readonly synthetic: true;
}

/** Gera `n` registros sintéticos determinísticos com a fábrica dada. */
export function generate<T extends object>(n: number, factory: (f: Faker, i: number) => T, seed = DEFAULT_SEED): (T & SeedRecord)[] {
  const f = syntheticFaker(seed);
  return Array.from({ length: n }, (_, i) => ({ ...factory(f, i), ...SYNTHETIC }));
}
