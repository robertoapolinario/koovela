import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, generate, syntheticFaker } from '../src/index.ts';

describe('semente determinística (reset duas vezes → mesmos dados)', () => {
  const reset = () =>
    generate(50, (f, i) => ({ id: f.string.uuid(), name: f.person.fullName(), at: f.date.past().toISOString(), i }));

  it('duas execuções independentes geram exatamente os mesmos registros', () => {
    expect(reset()).toEqual(reset());
  });

  it('a semente fixa não depende do relógio', () => {
    const a = syntheticFaker(DEFAULT_SEED).date.recent().toISOString();
    const b = syntheticFaker(DEFAULT_SEED).date.recent().toISOString();
    expect(a).toBe(b);
  });

  it('todo registro sai marcado como sintético', () => {
    expect(reset().every((r) => r.synthetic)).toBe(true);
  });
});
