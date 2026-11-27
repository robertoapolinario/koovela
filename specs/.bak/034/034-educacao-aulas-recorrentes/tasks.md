---
description: "Lista de tarefas da spec 034 — Educação: aulas avulsas recorrentes"
---

# Tasks: Educação — aulas avulsas recorrentes

**Input**: documentos de `specs/034-educacao-aulas-recorrentes/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 033 concluídas, especialmente 013 (séries), 025 (atendidos) e 026 (turmas).

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- propriedade "sem reposição": nenhuma falta ou cancelamento do aluno aumenta ocorrências futuras ou saldo de créditos (REQ-EDU-020, SC-001);
- aula cancelada pela escola ou por recesso nunca é cobrada (SC-003);
- todo `createLessonSeries` sem aceite do aviso é recusado (SC-004);
- registro de aula de menor só visível ao responsável, ao instrutor autor e ao Proprietário (SC-005).

**Organization**: por história de usuário. P1: US1 (oferecer), US2 (reservar a série) e US3 (faltas, cancelamentos, escola e recesso). P2: US4 (presença e registro). Nenhum motor novo: as extensões aditivas da 013 e da 026 ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US4).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o submódulo `services/scheduling/src/lessons/{settings,series-adapter,class-seat-adapter,recess,records,offer-other-time,http}/` e as pastas `services/workers/src/scheduling/{lesson-charge-at-window-end,recess-apply}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/lessons.openapi.yaml` e `packages/contracts/asyncapi/lessons-events.asyncapi.yaml` (fonte: `specs/034-educacao-aulas-recorrentes/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - configuração e recesso pelo Proprietário e pelo Gerente, com `audit_category`;
  - criar série pelo aluno adulto ou pelo responsável (025);
  - presença pelo instrutor e pela Recepção;
  - registro de aula escrito pelo instrutor e pelo Gerente e lido só pelo aluno ou responsável, pelo instrutor autor e pelo Proprietário, seguindo a tabela da spec (o Gerente não lê depois de salvo; ver T036).

  Declarar a flag `scheduling.lessons` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: extensões aditivas da 013 e da 026, configuração versionada, aviso versionado e o teste de propriedade "sem reposição".

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de propriedade (portão de merge) em `services/scheduling/src/lessons/__tests__/no-makeup.property.test.ts`, cobrindo cancelamento dentro e fora da janela e no-show × por aula e pacote × individual e turma:
  - o número de ocorrências futuras e o saldo de créditos nunca aumentam;
  - não existe o motivo `makeup` no livro de saldos (SC-001).
- [ ] T005 [P] Teste de compatibilidade em `services/scheduling/src/series/__tests__/lesson-extensions.int.test.ts`:
  - séries da v1.0 continuam com `kind = standard` e `subject_id = self`;
  - o limite e a sobreposição da 013 passam a contar por `(consumer_id, subject_id)`, permitindo dois filhos no mesmo horário (REQ-EDU-014);
  - a ocorrência tem exatamente um entre `data-model.md` `scheduling_series_occurrence.appointment_id` e `scheduling_series_occurrence.enrollment_id`.

### Implementação da fundação

- [ ] T006 Criar a migração de tenant `services/scheduling/migrations/tenant/0034_lessons.ts` com:
  - em `scheduling_series`: `data-model.md` `scheduling_series.kind`, `scheduling_series.subject_id`, `payment_mode` com `charge_per_lesson`, e `scheduling_series.lesson_terms_version` e `scheduling_series.lesson_terms_accepted_at` obrigatórios quando `kind = lesson`;
  - em `scheduling_series_rule_version`: `item_kind` com `class_group`;
  - em `scheduling_series_occurrence`: `enrollment_id`, CHECK de exatamente um preenchido, e `skip_reason` com `recess`;
  - `scheduling_branch_recess`: CHECK em `scheduling_branch_recess.state`, com `scheduling_branch_recess.ends_on` inclusivo;
  - `lessons_settings_version`: CHECK em `lessons_settings_version.target_kind`, `lessons_settings_version.frequencies` e `lessons_settings_version.payment_modes` com ao menos um, e schema fechado (sem campo de matrícula, taxa, período mínimo ou multa; REQ-EDU-004);
  - `lessons_record`: UNIQUE no alvo, CHECK em `lessons_record.state`, `lessons_record.body` cifrado e `lessons_record.key_ref`.
- [ ] T007 [P] Criar a migração `services/platform/migrations/0034_lessons_terms.ts` com `lessons_terms_version` (`data-model.md` `lessons_terms_version.version`, `lessons_terms_version.effective_from`) e a primeira versão do texto "sem matrícula; falta não tem reposição".
- [ ] T008 Implementar as extensões aditivas da 013 (chave por atendido, `charge_per_lesson`, `item_kind = class_group`, consulta de recessos como exceção na `expand`) em `services/scheduling/src/series/lesson-extensions.ts`.

**Checkpoint**: séries da v1.0 intactas; série de aula possível sem motor novo.

---

## Phase 3: User Story 1 - Oferecer aulas recorrentes sem matrícula (Priority: P1) 🎯 MVP

**Goal**: ativar "aula recorrente" em serviço individual ou turma de negócio da vertical educação, com frequências, fim opcional e formas de pagamento. Sem matrícula, taxa, período mínimo ou multa.

**Independent Test**: ativar para "violão individual" e para a turma "violão em grupo — sábado 10h" e conferir as duas ofertas no app (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T009 [P] [US1] Teste de contrato de `listLessonSettings`, `setLessonSettings` e `listLessonOffers` em `services/scheduling/src/lessons/http/settings.contract.test.ts`.
- [ ] T010 [P] [US1] Teste de integração em `services/scheduling/src/lessons/settings/settings.int.test.ts`:
  - só vale em negócio da vertical educação;
  - `data-model.md` `lessons_settings_version.frequencies` aceita só `weekly` e `every_2_weeks`;
  - nova versão (`lessons_settings_version.effective_from`) não altera séries existentes;
  - qualquer campo de matrícula ou multa é recusado pelo schema fechado.

### Implementation for User Story 1

- [ ] T011 [US1] Implementar a configuração versionada (`data-model.md` `lessons_settings_version.ends_on`, `lessons_settings_version.enabled`) e as ofertas públicas em `services/scheduling/src/lessons/settings/settings.ts`, com as rotas em `services/scheduling/src/lessons/http/settings.ts`.
- [ ] T012 [P] [US1] Implementar a configuração de aula recorrente nos serviços e nas turmas do painel em `apps/tenant-web/src/routes/series/LessonSettings.tsx` e `apps/tenant-web/src/routes/classes/LessonSettings.tsx`.

**Checkpoint**: a escola oferece aulas recorrentes sem amarrar o aluno.

---

## Phase 4: User Story 2 - Aluno reserva a série de aulas (Priority: P1)

**Goal**: o aluno, ou o responsável pelo menor, escolhe dia, horário, instrutor e frequência, vê a prévia com conflitos, aceita o aviso e paga por aula ou por pacote. Em turma, a vaga é reservada em cada ocorrência.

**Independent Test**: o responsável reserva "violão individual, terças 18h" para um filho de 10 anos, com cobrança por aula (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T013 [P] [US2] Teste de contrato de `previewLessonSeries` e `createLessonSeries` em `services/scheduling/src/lessons/http/series.contract.test.ts`; sem aceite → `lessons.terms_not_accepted` (portão de merge, SC-004).
- [ ] T014 [P] [US2] Teste de integração em `services/scheduling/src/lessons/series-adapter/series.int.test.ts`:
  - a prévia usa a `expand` da 013 e marca feriado, exceção do instrutor, recesso e horário ocupado;
  - as 4 primeiras ocorrências viram agendamentos da 009 com `origin = lesson`;
  - o menor tem `subject_id` do dependente, e o responsável recebe os avisos e paga (REQ-EDU-012);
  - por aula, a cobrança acontece no fim da janela gratuita (010) e, se falhar, a aula fica `PENDENTE_PAGAMENTO`;
  - por pacote, cada aula reserva um crédito na materialização e, sem saldo, a série vai para `awaiting_payment`;
  - a reserva leva até 2 minutos (SC-002).
- [ ] T015 [P] [US2] Teste de turma em `services/scheduling/src/lessons/class-seat-adapter/class-seat.int.test.ts`:
  - a série `class_group` materializa inscrições da 026 nas próximas 4 aulas, protegidas pela PK de assento;
  - aula lotada fica `in_conflict` com até 3 alternativas da mesma modalidade na semana;
  - frequência incompatível com os dias da turma é recusada.

### Implementation for User Story 2

- [ ] T016 [US2] Implementar o adaptador da série individual (prévia, criação com aceite gravado e materialização com `origin = lesson`) em `services/scheduling/src/lessons/series-adapter/series.ts`.
- [ ] T017 [US2] Implementar o adaptador da vaga em turma (materialização como `classes_enrollment`, conflitos e alternativas) em `services/scheduling/src/lessons/class-seat-adapter/class-seat.ts`.
- [ ] T018 [US2] Implementar a cobrança no fim da janela gratuita, para individual e para turma (`pay_mode = single`), no `workers` em `services/workers/src/scheduling/lesson-charge-at-window-end/charge.ts`.
- [ ] T019 [US2] Implementar as rotas `previewLessonSeries` e `createLessonSeries` em `services/scheduling/src/lessons/http/series.ts`.
- [ ] T020 [P] [US2] Implementar "Aulas avulsas recorrentes" (escolha, prévia, aviso com aceite) e "Minhas séries" em `apps/consumer-mobile/src/app/aulas/` e `apps/consumer-web/src/routes/aulas.tsx`.

**Checkpoint**: o aluno garante o horário toda semana.

---

## Phase 5: User Story 3 - Faltas sem reposição e cancelamentos (Priority: P1)

**Goal**: cancelamento dentro da janela sem custo, tardio pela política e no-show pela 010, sem reposição. Faltas seguidas pausam a série. Aula cancelada pela escola não é cobrada e pode ganhar outro horário na semana. Recesso pula as ocorrências sem custo. Encerrar a série não tem multa.

**Independent Test**: cancelar dentro e fora da janela e faltar uma vez, e conferir que nada gera reposição (quickstart §3 e §4).

### Tests for User Story 3 ⚠️

- [ ] T021 [P] [US3] Teste de contrato de `listRecesses`, `declareRecess` e `offerOtherTime` em `services/scheduling/src/lessons/http/school.contract.test.ts`.
- [ ] T022 [P] [US3] Teste de integração (portão de merge) em `services/scheduling/src/lessons/recess/school-cancel.int.test.ts`:
  - cancelamento pela escola (`CANCELADO_ESTABELECIMENTO` ou `studio_cancelled`) não é cobrado, estorna se já foi cobrado e reverte a reserva de crédito, sem contar como falta (SC-003);
  - `offerOtherTime` envia um link de agendamento avulso restrito à semana, pago normalmente e sem `series_id`;
  - duas faltas seguidas → `paused_for_no_shows` com aviso (REQ-EDU-022);
  - encerrar a série cancela as futuras sem multa, e as que já estão na janela tardia seguem a 010.
- [ ] T023 [P] [US3] Teste do recesso em `services/scheduling/src/lessons/recess/recess.int.test.ts`:
  - as ocorrências do período ficam `skipped` com `data-model.md` `scheduling_series_occurrence.skip_reason` = `recess`;
  - agendamentos materializados e aulas das turmas no período são cancelados sem cobrança;
  - os avisos saem pela 011;
  - a materialização futura pula o período;
  - revogar (`scheduling_branch_recess.state` = `revoked`) não recria ocorrências já puladas.

### Implementation for User Story 3

- [ ] T024 [US3] Implementar o consumidor de cancelamento pela escola (009 e 026), com estorno ou reversão, em `services/scheduling/src/lessons/recess/school-cancel.ts`, e `offerOtherTime` em `services/scheduling/src/lessons/offer-other-time/offer.ts`.
- [ ] T025 [US3] Implementar a declaração e a revogação do recesso (`data-model.md` `scheduling_branch_recess.declared_by`, `scheduling_branch_recess.reason`) em `services/scheduling/src/lessons/recess/recess.ts`, e a aplicação em lote no `workers` em `services/workers/src/scheduling/recess-apply/apply.ts`, publicando `scheduling.branch.recess_declared.v1`.
- [ ] T026 [US3] Implementar as rotas da escola em `services/scheduling/src/lessons/http/school.ts`.
- [ ] T027 [P] [US3] Implementar a tela de recesso em `apps/tenant-web/src/routes/lessons/recesso/` e a ação "oferecer outro horário nesta semana" no painel e no `/pro` em `apps/tenant-web/src/routes/pro/aulas/OfferOtherTime.tsx`.

**Checkpoint**: falta é falta; a escola não cobra o que não deu.

---

## Phase 6: User Story 4 - Instrutor faz a chamada e registra a aula (Priority: P2)

**Goal**: presença pelo app do colaborador e pelo `/pro`. Registro do conteúdo da aula (até 1.000 caracteres), cifrado, editável por 24 h e visível ao aluno adulto ou ao responsável.

**Independent Test**: marcar presença, escrever o conteúdo e conferir que o responsável vê o registro no app (quickstart §5).

### Tests for User Story 4 ⚠️

- [ ] T028 [P] [US4] Teste de contrato de `upsertLessonRecord`, `applyRecordToAll`, `readLessonRecord` e `listMyLessonRecords` em `services/scheduling/src/lessons/http/records.contract.test.ts`.
- [ ] T029 [P] [US4] Teste de autorização (portão de merge) em `services/scheduling/src/lessons/records/records-authz.int.test.ts`:
  - para cada papel, só leem o aluno adulto ou o responsável (`data-model.md` `lessons_record.holder_consumer_id`), o instrutor autor e o Proprietário (SC-005);
  - o Gerente escreve e não lê depois de salvo;
  - "aplicar a todos" cria um registro por aluno, e nenhum aluno vê o de outro;
  - depois de `lessons_record.editable_until` (24 h), o estado é `closed` e a edição é recusada;
  - `scheduling.lesson.recorded.v1` não leva o conteúdo.

### Implementation for User Story 4

- [ ] T030 [US4] Implementar o registro cifrado por envelope com a chave do tenant e `data-model.md` `lessons_record.key_ref` para crypto-shredding (020/022), mais "aplicar a todos", em `services/scheduling/src/lessons/records/records.ts`, com as rotas em `services/scheduling/src/lessons/http/records.ts`.
- [ ] T031 [P] [US4] Implementar a presença e o registro no app do colaborador em `apps/pro-mobile/app/aulas/` e no `/pro` em `apps/tenant-web/src/routes/pro/aulas/`, e a leitura em "Minhas séries" em `apps/consumer-mobile/src/app/aulas/registros.tsx`.

**Checkpoint**: o responsável acompanha o que foi ensinado.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T032 Incluir os registros de aula no `HolderDataPort` (022), exercido pelo responsável no caso do menor, em `services/scheduling/src/holder-data/port.ts`.
- [ ] T033 [P] Caso de isolamento em `tests/isolation/cases/lessons.ts`.
- [ ] T034 [P] Testes com a flag `scheduling.lessons` ligada e desligada em `services/scheduling/src/lessons/__tests__/flags.int.test.ts`, e axe nas telas novas em `apps/consumer-web/e2e/lessons-a11y.spec.ts`.
- [ ] T035 [P] Métricas (séries ativas, pausas por faltas, recessos, cobranças falhas no fim da janela) no painel `infra/observability/dashboards/lessons.json`, e mapas de ingestão do BI em `bi/ingest/mappings/lessons.yaml`.
- [ ] T036 Registrar as telas a conferir (DF 9.11) e as telas novas (recesso, registro) em `docs/design/telas-sem-prototipo-034.md`. Registrar também, em `docs/ops/decisions/registro-aula-gerente.md`, a inconsistência de permissão do Gerente (escreve mas não lê) para confirmar no próximo clarify.
- [ ] T037 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-034.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1.
- **US3** depende de US2.
- **US4** depende de US2 (aulas materializadas) e pode correr em paralelo com US3.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004, T005 e T007.
- Depois de US2: US3 e US4 em paralelo.

---

## Parallel Example: User Story 2

```bash
Task: "T013 contrato e aceite"
Task: "T014 série individual"
Task: "T015 vaga em turma"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fases 1 e 2.
2. US1 (oferecer), US2 (reservar) e US3 (faltas, escola e recesso). A regra "sem reposição" e o "não cobrar o que a escola cancelou" são o centro da D41.
3. **Parar e validar** com o quickstart §1 a §4.

### Incremental Delivery

1. US4 (chamada e registro).
2. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-EDU que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhum motor novo: o `lessons` é um adaptador fino sobre `series` (013) e `classes` (026), e as extensões são aditivas.
- Não existe ação de "repor"; o motivo `makeup` não existe no livro de saldos.
- Commit por tarefa ou grupo lógico, em branch `034-educacao-aulas-recorrentes`, por PR.
