import { describe, expect, it } from 'vitest';
import { isValidBranch } from '../src/branch.ts';

describe('branch-check', () => {
  it.each(['001-fundacao-plataforma', '008-motor-agenda', '123-a', 'dependabot/npm_and_yarn/x-1.2'])('aceita %s', (b) => {
    expect(isValidBranch(b)).toBe(true);
  });
  it.each(['feature/x', '1-x', '001_fundacao', '001-Fundacao', '001-', 'fix-bug', '001--x'])('recusa %s', (b) => {
    expect(isValidBranch(b)).toBe(false);
  });
});
