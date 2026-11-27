import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exampleKeys, usedKeys } from '../src/scan.ts';

describe('env-check', () => {
  it('encontra chaves usadas pelo código', () => {
    const root = mkdtempSync(join(tmpdir(), 'envc-'));
    mkdirSync(join(root, 'services/x/src'), { recursive: true });
    writeFileSync(join(root, 'services/x/src/a.ts'), "process.env.FOO_BAR; loadKeys(['MYSQL_HOST']); domainDbCredentials('x');");
    const used = usedKeys(root, ['services']);
    expect([...used.keys()].sort()).toEqual(['FOO_BAR', 'MYSQL_HOST', 'MYSQL_PASSWORD_X', 'MYSQL_USER_X']);
    expect(exampleKeys('A=1\n# B=2\nC=\n')).toEqual(new Set(['A', 'C']));
  });
});
