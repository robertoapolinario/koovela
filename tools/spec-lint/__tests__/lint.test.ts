import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lintSpec } from '../src/lint.ts';

const valid = readFileSync(new URL('./fixtures/valid.md', import.meta.url), 'utf8');
const lineOf = (text: string, needle: string) => text.split('\n').findIndex((l) => l.includes(needle)) + 1;

describe('spec-lint', () => {
  it('spec válida passa (o Input original pode citar o marcador)', () => {
    expect(lintSpec(valid)).toEqual([]);
  });

  it('falha sem fase', () => {
    const f = lintSpec(valid.replace('**Fase**: v1.0\n', ''));
    expect(f.map((x) => x.rule)).toContain('phase');
  });

  it('falha sem superfícies', () => {
    expect(lintSpec(valid.replace(/\*\*Superfícies afetadas\*\*.*\n/, '')).map((x) => x.rule)).toContain('surfaces');
  });

  it.each([
    ['## Contexto e problema', 'section-context'],
    ['## Telas do protótipo cobertas', 'section-screens'],
    ['## Dados pessoais', 'section-personal-data'],
    ['## Permissões', 'section-permissions'],
    ['## Eventos e métricas', 'section-events'],
    ['## Fora do escopo desta especificação', 'section-out-of-scope'],
    ['### Assumidos', 'section-pending-assumed'],
  ])('falha sem a seção %s', (heading, rule) => {
    expect(lintSpec(valid.replace(heading, '## Outra')).map((x) => x.rule)).toContain(rule);
  });

  it('falha com requisito sem origem, citando a linha', () => {
    const text = valid.replace('- **REQ-EXE-001** (origem: CONST 3): O', '- **REQ-EXE-001**: O');
    const f = lintSpec(text).find((x) => x.rule === 'requirement-origin');
    expect(f?.line).toBe(lineOf(text, 'REQ-EXE-001'));
  });

  it('falha com PEN bloqueante sem decisão (tabela e texto)', () => {
    const table = valid.replace('| Decidido: A |', '| — |');
    expect(lintSpec(table).find((x) => x.rule === 'blocking-pen-undecided')?.line).toBe(lineOf(table, '**PEN-01**'));
    const prose = valid.replace(/\| Item[\s\S]*?Decidido: A \|/, '- PEN-07 aguardando o jurídico');
    expect(lintSpec(prose).map((x) => x.rule)).toContain('blocking-pen-undecided');
    const none = valid.replace(/\| Item[\s\S]*?Decidido: A \|/, 'Nenhuma. O valor (`[PEN-30]`) é configurável e não bloqueia a spec.');
    expect(lintSpec(none)).toEqual([]);
  });

  it('falha com NEEDS CLARIFICATION no corpo, citando a linha', () => {
    const text = valid.replace('- regra', '- regra [NEEDS CLARIFICATION: qual prazo?]');
    expect(lintSpec(text).find((x) => x.rule === 'needs-clarification')?.line).toBe(lineOf(text, 'qual prazo'));
  });
});
