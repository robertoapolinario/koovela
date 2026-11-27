---
description: "Lista de tarefas da spec 030 — Combo com troca de profissional"
---

# Tasks: Combo com troca de profissional

**Input**: documentos de `specs/030-combo-troca-profissional/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 029 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- concorrência e falha injetada: N pedidos disputando uma etapa resultam em exatamente um aceito, e falha na última etapa deixa nada ocupado (REQ-CTR-022, SC-001);
- propriedade: toda sequência oferecida é viável (SC-004);
- rateio do desconto: Σ = desconto do combo.

**Organization**: por história de usuário. P1: US1 (configurar), US2 (sequência sugerida e trocas) e US3 (reserva atômica). P2: US4 (mudanças, atrasos e cancelamento). A busca de sequências é uma função pura, na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US4).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o pacote puro `packages/domain/combo-sequencing/` (`package.json`, `tsconfig.json`, fast-check) e as pastas `services/catalog/src/combos/per-step/`, `services/scheduling/src/availability/combo-per-step/`, `services/scheduling/src/appointments/steps/` e `services/scheduling/src/appointments/step-delays/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/combo-sequencing.openapi.yaml` e `packages/contracts/asyncapi/combo-sequencing-events.asyncapi.yaml` (fonte: `specs/030-combo-troca-profissional/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - configuração pelo Proprietário e pelo Gerente;
  - troca de etapa e decisão sobre atraso só pela Recepção, Gerente ou Proprietário, com `audit_category`.

  Declarar a flag `catalog.combo_per_step` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas e a busca de sequências como função pura testada por propriedade.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de propriedade (portão de merge) em `packages/domain/combo-sequencing/src/__tests__/find-sequences.property.test.ts`: toda sequência devolvida respeita a ordem, as durações, o preparo e a limpeza, o intervalo máximo (`data-model.md` `catalog_combo_version.max_interval_min` ou `catalog_combo_step.max_interval_after_min`) e o tempo livre (SC-004). Incluir no filtro `pnpm test:property --filter combo-sequencing`.
- [ ] T005 [P] Teste de propriedade do rateio em `packages/domain/combo-sequencing/src/__tests__/discount-split.property.test.ts`: o rateio é proporcional ao preço avulso (`data-model.md` `catalog_combo_step.standalone_price_cents`), arredondado para baixo, com o resto na última etapa e Σ `scheduling_appointment_step.discount_share_cents` = desconto.

### Implementação da fundação

- [ ] T006 Criar a migração de tenant `services/catalog/migrations/tenant/0030_combo_per_step.ts` com:
  - em `catalog_combo_version`: `combo_rule` aceita `per_step`, e CHECK em `data-model.md` `catalog_combo_version.suggestion_rule`, `catalog_combo_version.interval_mode` e `catalog_combo_version.max_interval_min`;
  - `catalog_combo_step`: CHECK em `catalog_combo_step.position` e `catalog_combo_step.eligible_mode`, com `catalog_combo_step.eligible_professional_ids`;
  - `catalog_combo_branch_availability`, com `catalog_combo_branch_availability.missing_steps`.
- [ ] T007 [P] Criar a migração de tenant `services/scheduling/migrations/tenant/0030_appointment_steps.ts` com `scheduling_appointment_step` (CHECK em `data-model.md` `scheduling_appointment_step.state`, `scheduling_appointment_step.commission_rule_version_id`) e `scheduling_step_delay_alert` (CHECK em `scheduling_step_delay_alert.state`).
- [ ] T008 Implementar `findSequences()` (busca em profundidade pelas etapas na grade de 5 min, parando na primeira sequência para listar o início e enumerando até 20 sequências para o horário escolhido), `suggest()` (menor espera, empate pelo profissional menos ocupado, sem trocar de profissional sem necessidade) e `alternatives()` (motivos `busy`, `breaks_interval` e `not_in_branch`) em `packages/domain/combo-sequencing/src/index.ts`.
- [ ] T009 Implementar `splitDiscount()` em `packages/domain/combo-sequencing/src/discount-split.ts`.

**Checkpoint**: a busca é correta por construção.

---

## Phase 3: User Story 1 - Configurar um combo com troca de profissional (Priority: P1) 🎯 MVP

**Goal**: 2 a 5 etapas com profissionais possíveis e intervalo de 0 a 15 min, versionados. Combo indisponível na filial quando uma etapa fica sem profissional.

**Independent Test**: "coloração + escova" com Ana ou Bia na etapa 1 e qualquer profissional de escova na etapa 2, com intervalo de 10 min (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Teste de integração em `services/catalog/src/combos/per-step/per-step.int.test.ts`:
  - menos de 2 ou mais de 5 etapas é recusado, assim como intervalo fora de 0–15;
  - nova versão não muda agendamentos já criados (REQ-CTR-004);
  - `workforce.engagement.ended.v1` retira o profissional das etapas, avisa e, se a etapa ficar vazia, deixa `data-model.md` `catalog_combo_branch_availability.available` = false com `catalog.combo_availability.changed.v1`;
  - configurar 3 etapas leva até 3 min (SC-005).

### Implementation for User Story 1

- [ ] T011 [US1] Implementar a configuração versionada do combo `per_step` em `services/catalog/src/combos/per-step/per-step.ts`.
- [ ] T012 [US1] Implementar a projeção de disponibilidade por filial e o consumidor de fim de vínculo em `services/catalog/src/combos/per-step/branch-availability.ts`.
- [ ] T013 [P] [US1] Implementar a configuração do combo com troca na tela P12 em `apps/tenant-web/src/routes/catalog/combos/PerStep.tsx`.

**Checkpoint**: o negócio monta combos com vários profissionais.

---

## Phase 4: User Story 2 - Consumidor recebe a sequência sugerida e ajusta (Priority: P1)

**Goal**: inícios só com sequência completa viável. Sequência sugerida pela regra do negócio. O consumidor troca o profissional de qualquer etapa, com motivos para as opções inviáveis, e pode escolher "mesmo profissional". p95 ≤ 1 s.

**Independent Test**: com 3 profissionais, pedir os horários de um combo de 2 etapas, trocar a profissional da etapa 1 e ver o ajuste (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T014 [P] [US2] Teste de contrato de `comboStarts` e `comboSequences` em `services/scheduling/src/availability/combo-per-step/sequences.contract.test.ts`.
- [ ] T015 [P] [US2] Teste de integração em `services/scheduling/src/availability/combo-per-step/sequences.int.test.ts`:
  - os inícios listados têm sequência completa;
  - a sugestão segue `data-model.md` `catalog_combo_version.suggestion_rule`;
  - trocar a etapa 1 recalcula as seguintes;
  - opções inviáveis vêm com o motivo;
  - "mesmo profissional" aparece só quando alguém executa todas as etapas (D19).

### Implementation for User Story 2

- [ ] T016 [US2] Implementar o adaptador que lê o tempo livre do cache Redis da 008 e chama `findSequences()`, mais as rotas `comboStarts` e `comboSequences`, em `services/scheduling/src/availability/combo-per-step/sequences.ts`.
- [ ] T017 [P] [US2] Implementar a escolha de sequência e as trocas por etapa (em até 3 toques depois do dia, SC-003) em `apps/consumer-mobile/src/app/agendar/combo/sequencia.tsx` e `apps/consumer-web/src/routes/agendar.combo.sequencia.tsx`.

**Checkpoint**: o consumidor vê e ajusta a sequência.

---

## Phase 5: User Story 3 - Reservar todas as etapas de uma vez (Priority: P1)

**Goal**: locks de todas as etapas em ordem lexicográfica e células numa transação só. Se alguma falhar, nada fica reservado e a resposta traz a próxima sequência viável.

**Independent Test**: reservar 3 etapas e, em outro teste, ocupar a etapa 3 no instante da reserva (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T018 [P] [US3] Teste de concorrência e falha injetada (portão de merge) em `services/scheduling/src/availability/combo-per-step/hold.concurrency.test.ts`:
  - N pedidos disputando o profissional de uma etapa → exatamente 1 aceito;
  - falha injetada na última etapa → nenhuma ocupação, nem a mãe nem as das etapas (SC-001).

  Incluir no filtro `pnpm test:concurrency --filter combo-per-step`.
- [ ] T019 [P] [US3] Teste de contrato de `holdComboSequence` em `services/scheduling/src/availability/combo-per-step/hold.contract.test.ts`: o conflito devolve `scheduling.slot_taken` com a próxima sequência viável, recalculada depois da falha.

### Implementation for User Story 3

- [ ] T020 [US3] Implementar o hold `per_step` no caminho de combo atômico da 008 (ocupação-mãe `combo_parent` e uma por etapa com `data-model.md` `scheduling_occupancy.parent_occupancy_id` e `scheduling_occupancy.step_position`) em `services/scheduling/src/availability/combo-per-step/hold.ts`.
- [ ] T021 [US3] Na confirmação do agendamento (009), gravar as linhas de `scheduling_appointment_step` com `data-model.md` `scheduling_appointment_step.occupancy_id` e o rateio da T009, em `services/scheduling/src/appointments/steps/steps.ts`.
- [ ] T022 [P] [US3] Mostrar a etapa do combo na agenda do colaborador (K01/KD1) em `apps/pro-mobile/src/app/agenda/ComboStep.tsx` e `apps/tenant-web/src/routes/pro/agenda/ComboStep.tsx`.

**Checkpoint**: todas as etapas ou nenhuma.

---

## Phase 6: User Story 4 - Mudanças, atrasos e cancelamento de etapas (Priority: P2)

**Goal**: a Recepção troca o profissional de uma etapa. A remarcação é atômica e o cancelamento vale só para o combo inteiro. Etapa atrasada gera aviso, e combos afetados recebem sugestão. A comissão é por etapa.

**Independent Test**: trocar o profissional da etapa 2 e registrar 20 min de atraso na etapa 1 (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T023 [P] [US4] Teste de contrato de `changeStepProfessional` e `decideStepDelay` em `services/scheduling/src/appointments/steps/steps.contract.test.ts`.
- [ ] T024 [P] [US4] Teste de integração em `services/scheduling/src/appointments/steps/changes.int.test.ts`:
  - trocar a etapa muda só aquela ocupação, na mesma transação, e avisa o consumidor;
  - a remarcação reserva todas as novas etapas e libera as antigas juntas;
  - o consumidor não cancela uma etapa isolada e a política vale para o combo;
  - folga aprovada leva o combo à lista de afetados (009) com sugestão (REQ-CTR-034).
- [ ] T025 [P] [US4] Teste de atraso em `services/scheduling/src/appointments/step-delays/delays.int.test.ts`:
  - check-out tardio, ou ausência de check-out no horário, que passe do intervalo abre o alerta com `data-model.md` `scheduling_step_delay_alert.expected_start` e `scheduling_step_delay_alert.projected_start`;
  - o aviso vai ao profissional seguinte e à Recepção (SC-006);
  - a decisão só pela Recepção grava `scheduling_step_delay_alert.decided_by`.

### Implementation for User Story 4

- [ ] T026 [US4] Implementar a troca de profissional de uma etapa e a remarcação atômica em `services/scheduling/src/appointments/steps/changes.ts`, publicando `scheduling.appointment_step.changed`.
- [ ] T027 [US4] Implementar no `workers` a detecção de atraso, os avisos (011) e a decisão (aguardar, trocar ou remarcar a etapa) em `services/scheduling/src/appointments/step-delays/delays.ts`, publicando `scheduling.appointment_step.delayed.v1`.
- [ ] T028 [US4] Ajustar o cancelamento (010) para o combo inteiro em `services/scheduling/src/appointments/cancel.ts` e a lista de afetados (009) com sugestão por etapa em `services/scheduling/src/appointments/affected/combo-steps.ts`.
- [ ] T029 [US4] Implementar a comissão por etapa com o desconto rateado pelo contrato da 007 em `services/workforce/src/commission/combo-step.ts`, entrando no fechamento da 018.
- [ ] T030 [P] [US4] Implementar a troca de etapa e o aviso de etapa atrasada para a Recepção na agenda (P03) em `apps/tenant-web/src/routes/agenda/ComboStepActions.tsx` e `apps/tenant-web/src/routes/agenda/StepDelayAlert.tsx`.

**Checkpoint**: o combo continua de pé quando algo muda no dia.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T031 [P] Teste de carga de `comboStarts` e `comboSequences` (p95 ≤ 1 s, até 5 etapas × 10 profissionais) em `tests/load/combo-starts.k6.ts` (SC-002).
- [ ] T032 [P] Testes com a flag `catalog.combo_per_step` ligada e desligada em `services/scheduling/src/availability/combo-per-step/__tests__/flags.int.test.ts`, e axe nas telas em `apps/consumer-web/e2e/combo-per-step-a11y.spec.ts`.
- [ ] T033 [P] Métricas de tempo de busca, falhas de reserva e atrasos em `services/scheduling/src/availability/combo-per-step/metrics.ts`, no painel `infra/observability/dashboards/scheduling.json`.
- [ ] T034 Registrar as telas a conferir (DF 9.10 e o aviso de etapa atrasada) em `docs/design/telas-sem-prototipo-030.md`.
- [ ] T035 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-030.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (configuração).
- **US3** depende de US2 (sequência escolhida).
- **US4** depende de US3 (agendamento com etapas).
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004, T005 e T007.
- Dentro de cada história, os testes [P] e as telas [P].

---

## Parallel Example: Foundational

```bash
Task: "T004 propriedade da busca"
Task: "T005 propriedade do rateio"
Task: "T007 migração das etapas"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fases 1 e 2.
2. US1 (configurar), US2 (sequência) e US3 (reserva atômica). Sem a reserva, a sequência não serve.
3. **Parar e validar** com o quickstart §1 a §3.

### Incremental Delivery

1. US4 (mudanças, atrasos e comissão).
2. Polish (carga e observabilidade).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-CTR que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhum domínio novo: a reserva usa o caminho de combo atômico que a 008 já tem.
- A busca é limitada a 20 sequências enumeradas por horário.
- Commit por tarefa ou grupo lógico, em branch `030-combo-troca-profissional`, por PR.
