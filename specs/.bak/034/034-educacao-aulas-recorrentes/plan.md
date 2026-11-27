# Implementation Plan: Educação — aulas avulsas recorrentes

**Branch**: `034-educacao-aulas-recorrentes` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/034-educacao-aulas-recorrentes/spec.md`

## Summary

Configurar a série recorrente da 013 para a vertical educação (D41), sem motor novo e sem estados novos. A série ganha `kind = lesson` e cobre:

- **aula individual em série**: as ocorrências são agendamentos da 009 com `origin = lesson`;
- **vaga fixa recorrente em turma**: as ocorrências são inscrições da 026, com a proteção de assento.

O aluno ou responsável reserva no app e na web vendo a prévia e os conflitos. O aceite do aviso "sem matrícula; falta não tem reposição" é versionado e obrigatório. Limites e sobreposição são contados por atendido (025).

- **Pagamento**: por aula, no cartão salvo, cobrada quando termina a janela gratuita, ou por pacote, com reserva e consumo de crédito.
- **Nenhum caminho de reposição**: a falta segue o no-show (010), e as faltas seguidas pausam a série. Aula cancelada pela escola não é cobrada e permite oferecer um horário avulso.
- **Recesso por filial**: pula ocorrências e cancela as aulas de turma sem custo.
- **Registro da aula**: um por aluno, cifrado, visível ao aluno ou responsável, ao instrutor e ao Proprietário.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**:
- Fastify 5, Zod (schemas fechados), Kysely, `packages/platform/crypto` e `packages/domain/recurrence` (013).
- Contratos de 005, 008, 009, 010, 011, 012, 013, 022, 025 e 026.
- TanStack Query.

**Storage**:
- Schema do tenant: `lessons_settings_version`, `lessons_record`, `scheduling_branch_recess` e extensões de `scheduling_series*` e `classes_enrollment`.
- `koovela_platform`: `lessons_terms_version`.
- RabbitMQ `scheduling.events`.

**Testing**:
- Propriedade "sem reposição": todas as combinações de cancelamento, falta e pagamento.
- Contrato: aviso aceito; schema fechado sem matrícula.
- Integração: cancelamento pela escola e recesso (estorno e reversão de crédito); momento da cobrança no fim da janela gratuita.
- Concorrência de assento na materialização da turma; limites por atendido.
- Autorização e privacidade do registro; axe AA.

**Target Platform**: `core` (`scheduling`), `workers` (materialização da 013, cobrança no fim da janela, aplicação do recesso), `consumer-mobile`, `consumer-web`, `tenant-web` (+ `/pro`), `pro-mobile`.

**Project Type**: configuração de domínio existente com pequenas extensões e telas.

**Performance Goals**:
- Prévia da série ≤ 500 ms p95.
- Criação com 4 materializações ≤ 1 s p95.
- Recesso de até 1.000 ocorrências processado em ≤ 2 min, em segundo plano.

**Constraints**:
- Sem matrícula, taxa, período mínimo ou multa de saída.
- Sem reposição.
- Plano mensal fora (026).
- Registro sem anexos.

**Scale/Scope**: até cerca de 500 séries ativas por escola; turmas de até 100 vagas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Materialização da 013 sobre a ocupação da 008 e assentos da 026; nada de reserva paralela | ✅ |
| G-II | Isolamento | Tudo no schema do tenant; atendido por referência (025) | ✅ |
| G-III | Dinheiro | Cobrança no fim da janela gratuita; estorno integral ou reversão de crédito no cancelamento pela escola; centavos | ✅ |
| G-IV | Dados pessoais | Registro cifrado com crypto-shredding; menor visível só ao responsável, instrutor e Proprietário; `HolderDataPort` | ✅ |
| G-V | Permissões e auditoria | Tabela da spec; recesso e configurações auditados | ✅ com pendência (Gerente, ver Riscos) |
| G-VI | Rastreabilidade | D41, D18, D30, PEN-12 | ✅ |
| G-VII | Contratos | [lessons.openapi.yaml](./contracts/lessons.openapi.yaml), [lessons-events.asyncapi.yaml](./contracts/lessons-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Propriedade "sem reposição", autorização do registro | ✅ |
| G-IX | Outbox e idempotência | Materialização por `(series_id, sequence)`; recesso idempotente por `recess_id` | ✅ |
| G-X | Observabilidade | Aderência, faltas por aluno, duração das séries | ✅ |
| G-XI | Figma e a11y | Tela da DF 9.11 a conferir; recesso e registro a conferir; WCAG AA | ✅ com pendência de protótipo |
| G-XII | Complexidade | Reusa 013 e 026; sem motor novo | ✅ |

**Reavaliação pós-design**: mantida. As extensões em 013 (`kind`, `subject_id`, `charge_per_lesson`, `class_group`, `recess`) e 026 (inscrição ligada à ocorrência) são aditivas.

## Project Structure

### Documentation (this feature, local only)

```text
specs/034-educacao-aulas-recorrentes/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── lessons.openapi.yaml
    └── lessons-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/scheduling/src/lessons/{settings,series-adapter,class-seat-adapter,recess,records,offer-other-time}/
services/scheduling/src/series/            # extensões: kind, subject_id, charge_per_lesson, class_group
services/scheduling/src/classes/           # inscrição materializada pela série
services/workers/src/scheduling/{lesson-charge-at-window-end,recess-apply}/
apps/consumer-mobile/src/app/aulas         # Aulas avulsas recorrentes · Minhas séries
apps/consumer-web/src/routes/aulas
apps/tenant-web/src/routes/{series,classes,lessons/recesso}
apps/tenant-web/src/routes/pro/aulas
apps/pro-mobile/app/aulas                  # presença e registro
```

**Structure Decision**: submódulo `lessons` do `scheduling`, que fica como adaptador fino sobre `series` (013) e `classes` (026).

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Permissão do Gerente no registro**: a tabela da spec deixa o Gerente registrar a aula, mas não ver o registro. O plano segue a tabela: ele escreve e não lê depois de salvo. Convém confirmar no próximo clarify ou ajustar a tabela.
- **Telas**: "Aulas avulsas recorrentes" (DF 9.11) a conferir. O recesso e o registro da aula não estão no protótipo.
- **Cobrança no fim da janela gratuita**: com janela de 0 h, a cobrança coincide com o início da aula. Falha de cobrança nesse caso deixa a aula `PENDENTE_PAGAMENTO` já em curso, e a equipe resolve no local, como na 013.
- **Compatibilidade de frequência com a turma**: série a cada 2 semanas numa turma semanal ocupa uma semana sim, outra não, e libera a vaga nas outras semanas.
