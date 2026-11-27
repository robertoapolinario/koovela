/**
 * Lint de especificação (CONST VI, CONST 9.2, REQ-FND-012). Roda localmente sobre `specs/`
 * (fora do repositório público): pre-commit (lefthook) e antes de cada `/speckit-plan`.
 */
export interface Finding {
  readonly rule: string;
  readonly line: number;
  readonly message: string;
}

const REQUIRED: readonly { rule: string; re: RegExp; name: string }[] = [
  { rule: 'section-context', re: /^## Contexto/m, name: 'Contexto e problema' },
  { rule: 'phase', re: /^\*\*Fase\*\*:\s*\S/m, name: '**Fase**' },
  { rule: 'surfaces', re: /^\*\*Superfícies[^*]*\*\*:\s*\S/m, name: '**Superfícies**' },
  { rule: 'section-stories', re: /^## (User Scenarios|Histórias)/m, name: 'Histórias de usuário' },
  { rule: 'section-requirements', re: /^## (Requirements|Requisitos)/m, name: 'Requisitos' },
  { rule: 'section-screens', re: /^## Telas do protótipo/m, name: 'Telas do protótipo cobertas' },
  { rule: 'section-rules', re: /^## Regras/m, name: 'Regras de negócio e estados' },
  { rule: 'section-personal-data', re: /^## Dados pessoais/m, name: 'Dados pessoais' },
  { rule: 'section-permissions', re: /^## Permiss/m, name: 'Permissões' },
  { rule: 'section-events', re: /^## Eventos/m, name: 'Eventos e métricas' },
  { rule: 'section-pending', re: /^## Pendências e conflitos/m, name: 'Pendências e conflitos' },
  { rule: 'section-pending-blocking', re: /^### Bloqueantes/m, name: 'Pendências: Bloqueantes' },
  { rule: 'section-pending-assumed', re: /^### Assumidos/m, name: 'Pendências: Assumidos' },
  { rule: 'section-out-of-scope', re: /^## Fora do escopo/m, name: 'Fora do escopo' },
];

const UNDECIDED = new Set(['', '—', '-', '–', 'pendente', 'aberta', 'aberto', 'a decidir', 'tbd']);

export function lintSpec(text: string): Finding[] {
  const lines = text.split('\n');
  const out: Finding[] = [];

  for (const r of REQUIRED) {
    if (!r.re.test(text)) out.push({ rule: r.rule, line: 1, message: `seção obrigatória ausente: ${r.name} (CONST 9.2)` });
  }

  if (!/\b(Dado|Given)\b/.test(text)) {
    out.push({ rule: 'acceptance', line: 1, message: 'nenhum critério de aceite Dado/Quando/Então' });
  }

  let inBlocking = false;
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const n = i + 1;
    if (/^\*\*Input\*\*/.test(line)) return; // descrição original do /speckit-specify
    if (/NEEDS CLARIFICATION/.test(line)) {
      out.push({ rule: 'needs-clarification', line: n, message: 'marcador [NEEDS CLARIFICATION] ainda presente' });
    }
    const req = /^\s*[-*]\s+\*\*(REQ-[A-Z]+-\d{3})\*\*/.exec(line);
    if (req && !/\(origem:\s*[^)]+\)/.test(line)) {
      out.push({ rule: 'requirement-origin', line: n, message: `${req[1]} sem origem` });
    }
    if (/^#{2,3}\s/.test(line)) inBlocking = /^### Bloqueantes/.test(line);
    if (inBlocking && /PEN-\d+/.test(line)) {
      const pen = /PEN-\d+/.exec(line)?.[0] ?? 'PEN';
      if (line.startsWith('|')) {
        const cells = line.split('|').slice(1, -1).map((c) => c.trim().toLowerCase());
        if (cells.length < 2 || UNDECIDED.has(cells[cells.length - 1] ?? '')) {
          out.push({ rule: 'blocking-pen-undecided', line: n, message: `${pen} bloqueante sem decisão` });
        }
      } else if (!/decidid[ao]|decisão:|não bloquei|nenhuma\b/i.test(line)) {
        out.push({ rule: 'blocking-pen-undecided', line: n, message: `${pen} bloqueante sem decisão` });
      }
    }
  });
  return out;
}
