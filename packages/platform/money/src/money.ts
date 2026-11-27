/**
 * Dinheiro em centavos `bigint` com moeda (CONST III, G-III). `number` é rejeitado no tipo.
 */
export type Currency = 'BRL';

declare const moneyBrand: unique symbol;
export interface Money {
  readonly cents: bigint;
  readonly currency: Currency;
  readonly [moneyBrand]: true;
}

export class CurrencyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`moedas diferentes: ${a} e ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

export function money(cents: bigint, currency: Currency = 'BRL'): Money {
  if (typeof cents !== 'bigint') throw new TypeError('Money exige centavos em bigint');
  return Object.freeze({ cents, currency }) as Money;
}

export const zero = (currency: Currency = 'BRL'): Money => money(0n, currency);

function same(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
}

export const add = (a: Money, b: Money): Money => (same(a, b), money(a.cents + b.cents, a.currency));
export const subtract = (a: Money, b: Money): Money => (same(a, b), money(a.cents - b.cents, a.currency));
export const compare = (a: Money, b: Money): -1 | 0 | 1 => (same(a, b), a.cents < b.cents ? -1 : a.cents > b.cents ? 1 : 0);
export const equals = (a: Money, b: Money): boolean => a.currency === b.currency && a.cents === b.cents;
export const sum = (items: readonly Money[], currency: Currency = 'BRL'): Money => items.reduce(add, zero(currency));
export const isNegative = (a: Money): boolean => a.cents < 0n;

/**
 * Aplica uma taxa em pontos-base (1 bp = 0,01%), arredondando meio para cima (para longe do zero).
 */
export function applyBasisPoints(a: Money, bp: bigint): Money {
  const num = a.cents * bp;
  const q = num / 10_000n;
  const r = num % 10_000n;
  const abs = r < 0n ? -r : r;
  const rounded = abs * 2n >= 10_000n ? q + (num < 0n ? -1n : 1n) : q;
  return money(rounded, a.currency);
}

/** Divide em `n` partes sem perda: as primeiras recebem o centavo restante. */
export function allocate(a: Money, n: number): Money[] {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError('n deve ser inteiro positivo');
  const parts = BigInt(n);
  const base = a.cents / parts;
  let rest = a.cents - base * parts;
  const step = rest < 0n ? -1n : 1n;
  return Array.from({ length: n }, () => {
    if (rest !== 0n) {
      rest -= step;
      return money(base + step, a.currency);
    }
    return money(base, a.currency);
  });
}

/** Formatação pt-BR: R$ 1.234,56 (sem perda de precisão para valores grandes). */
export function format(a: Money): string {
  const neg = a.cents < 0n;
  const abs = neg ? -a.cents : a.cents;
  const reais = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = (abs % 100n).toString().padStart(2, '0');
  return `${neg ? '-' : ''}R$\u00a0${reais},${cents}`;
}
