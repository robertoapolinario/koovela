import { describe, expect, it } from 'vitest';
import { renderRestoreRecord, validateRestoreRecord, type RestoreRecord } from '../src/restore-record.ts';

const rec: RestoreRecord = {
  date: '2026-11-27',
  environment: 'staging',
  restored_point: '2026-11-27T03:00:00Z',
  source: 'cloudflare-r2',
  duration_minutes: 42,
  executor: 'nightly.yml',
  checks: [
    { name: 'schemas presentes', result: 'ok' },
    { name: 'contagens iguais ao manifesto do dump', result: 'ok' },
  ],
  result: 'success',
};

describe('registro de teste de restauração (data-model §1.4)', () => {
  it('o registro gerado é válido', () => {
    expect(validateRestoreRecord(renderRestoreRecord(rec, 'Notas.'))).toEqual([]);
  });

  it.each([
    ['date', { date: '27/11/2026' }],
    ['environment', { environment: 'production' }],
    ['restored_point', { restored_point: 'ontem' }],
    ['source', { source: 'oci-object-storage' }],
    ['duration_minutes', { duration_minutes: -1 }],
    ['executor', { executor: '' }],
    ['checks', { checks: [] }],
    ['result', { result: 'ok' }],
  ])('recusa %s inválido', (field, patch) => {
    const errors = validateRestoreRecord(renderRestoreRecord({ ...rec, ...patch } as RestoreRecord, ''));
    expect(errors.some((e) => e.startsWith(field))).toBe(true);
  });

  it('recusa arquivo sem cabeçalho YAML', () => {
    expect(validateRestoreRecord('# sem cabeçalho')).toEqual(['cabeçalho YAML ausente']);
  });

  it('sucesso exige todas as verificações ok', () => {
    const bad = { ...rec, checks: [{ name: 'x', result: 'failed' as const }] };
    expect(validateRestoreRecord(renderRestoreRecord(bad, ''))).toContain('result: success com verificação falha');
  });
});
