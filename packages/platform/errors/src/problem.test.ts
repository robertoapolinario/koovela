import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { t } from '@koovela/i18n';
import { AppError, PlatformErrors, toProblem } from './index.ts';

const schemaPath = fileURLToPath(new URL('../../../contracts/schemas/problem-details.schema.json', import.meta.url));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats.default(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));
const RID = '0190a3e2-5b7c-7d2e-9f1a-1b2c3d4e5f60';

describe('Problem Details', () => {
  it.each([
    PlatformErrors.internal(),
    PlatformErrors.notFound(),
    PlatformErrors.rateLimited(30),
    PlatformErrors.dependencyUnavailable('mysql'),
    PlatformErrors.validation([{ pointer: '/name', code: 'required', detail: 'Obrigatório' }]),
  ])('$code segue o esquema do contrato', (err) => {
    const p = toProblem(err, RID, t, '/v1/health');
    expect(validate(p), JSON.stringify(validate.errors)).toBe(true);
    expect(p.title).not.toMatch(/^errors\./);
  });

  it('título e detalhe em pt-BR', () => {
    const p = toProblem(PlatformErrors.rateLimited(30), RID, t);
    expect(p.title).toBe('Muitas requisições');
    expect(p.detail).toContain('30');
  });

  it('rejeita código fora do padrão', () => {
    expect(() => new AppError('Bad-Code', 400)).toThrow();
    expect(() => new AppError('platform.ok', 200)).toThrow();
  });
});
