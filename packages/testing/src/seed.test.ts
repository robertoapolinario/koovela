import { describe, expect, it } from 'vitest';
import { generate } from './index.ts';

describe('semente sintética', () => {
  it('é determinística e marca todo registro', () => {
    const make = () => generate(10, (f) => ({ name: f.person.fullName(), city: f.location.city() }));
    expect(make()).toEqual(make());
    expect(make().every((r) => r.synthetic === true)).toBe(true);
  });
});
