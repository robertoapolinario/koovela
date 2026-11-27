import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { add, allocate, applyBasisPoints, compare, format, money, subtract, sum, type Money } from './index.ts';

const cents = fc.bigInt({ min: -(10n ** 15n), max: 10n ** 15n });
const m = cents.map((c) => money(c));

describe('Money (propriedades)', () => {
  it('soma é comutativa e associativa, sem perda', () => {
    fc.assert(fc.property(m, m, m, (a, b, c) => {
      expect(add(a, b).cents).toBe(add(b, a).cents);
      expect(add(add(a, b), c).cents).toBe(add(a, add(b, c)).cents);
      expect(subtract(add(a, b), b).cents).toBe(a.cents);
    }));
  });

  it('comparação é consistente com a subtração', () => {
    fc.assert(fc.property(m, m, (a, b) => {
      const d = subtract(a, b).cents;
      expect(compare(a, b)).toBe(d < 0n ? -1 : d > 0n ? 1 : 0);
    }));
  });

  it('allocate não perde centavos', () => {
    fc.assert(fc.property(m, fc.integer({ min: 1, max: 50 }), (a, n) => {
      expect(sum(allocate(a, n)).cents).toBe(a.cents);
    }));
  });

  it('rejeita number em tempo de execução e no tipo', () => {
    // @ts-expect-error number não é aceito
    expect(() => money(10)).toThrow(TypeError);
    // @ts-expect-error objeto solto não é Money
    const _x: Money = { cents: 1n, currency: 'BRL' };
  });

  it('aplica pontos-base com arredondamento meio para cima', () => {
    expect(applyBasisPoints(money(1000n), 250n).cents).toBe(25n);
    expect(applyBasisPoints(money(5n), 1000n).cents).toBe(1n); // 0,5 → 1
    expect(applyBasisPoints(money(4n), 1000n).cents).toBe(0n);
  });

  it('formata em pt-BR', () => {
    expect(format(money(123456n))).toBe('R$ 1.234,56');
    expect(format(money(-5n))).toBe('-R$ 0,05');
  });
});
