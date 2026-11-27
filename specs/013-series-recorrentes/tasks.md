---
description: "Lista de tarefas da spec 013 — Séries recorrentes"
---

# Tasks: Séries recorrentes

**Input**: documentos de `specs/013-series-recorrentes/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 012 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- a propriedade da expansão da regra;
- a propriedade do alcance das mudanças (invariante 6, REQ-SER-035).

**Organization**: por história de usuário (US1–US5). P1: US1, US2 e US3. P2: US4 e US5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar `services/scheduling/src/series/` e o pacote puro `packages/domain/recurrence/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/series.openapi.yaml` e `packages/contracts/asyncapi/series-events.asyncapi.yaml` (fonte: `specs/013-series-recorrentes/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações de série em `packages/contracts/rbac/permissions.yaml`:
  - consumidor `self`;
  - equipe com escopo de filial;
  - configuração de N faltas pelo Proprietário.

  Declarar a flag `scheduling.series_v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: expansão pura da regra, tabelas e materializador idempotente.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de propriedade (portão de merge) em `packages/domain/recurrence/src/expand.property.test.ts`:
  - `expand(rule, from, count)` em hora local da filial;
  - cada frequência de `data-model.md` `scheduling_series_rule_version.frequency`;
  - posição mensal (`data-model.md` `scheduling_series_rule_version.month_position`), com as posições 1 a 4 e `last`, que existem em todo mês;
  - fim por N, por data ou nunca (`data-model.md` `scheduling_series_rule_version.ends`);
  - conversão para UTC por data, incluindo horário de verão histórico.
- [ ] T005 [P] Teste de idempotência do materializador em `services/scheduling/src/series/materializer.int.test.ts`: rodar 2 vezes não cria nenhuma duplicada (`data-model.md` `scheduling_series_occurrence.series_id` + `scheduling_series_occurrence.sequence` como PK) e mantém sempre 4 futuras, mesmo além do horizonte do negócio (REQ-SER-010/012, SC-005); tenant fora do estado ativo e consumidor desativado não recebem novas ocorrências (edge cases); combo reserva todas as etapas de cada ocorrência de forma atômica, ou nenhuma.

### Implementação da fundação

- [ ] T006 Implementar `expand()` em `packages/domain/recurrence/src/expand.ts` (research R2).
- [ ] T007 Criar a migração `services/scheduling/migrations/0301_series.ts` no schema do tenant, com:
  - `scheduling_series`:
    - CHECK em `data-model.md` `scheduling_series.state`, `scheduling_series.payment_mode` e `scheduling_series.end_reason`;
    - `scheduling_series.paused_until` limitado a 90 dias;
  - `scheduling_series_rule_version` (imutável);
  - `scheduling_series_occurrence`:
    - PK `(series_id, sequence)`;
    - CHECK em `scheduling_series_occurrence.state` e `scheduling_series_occurrence.skip_reason`;
  - `scheduling_series_change` (append-only; CHECK em `scheduling_series_change.scope` e `scheduling_series_change.kind`).
- [ ] T008 Implementar o materializador em `services/scheduling/src/series/materializer.ts`:
  - cada ocorrência vira um agendamento da 009 (`origin = series`), protegido pela 008, na mesma transação, com `data-model.md` `scheduling_series_occurrence.rule_version_id`, `scheduling_series_occurrence.planned_start` (UTC, da hora local da filial) e `scheduling_series_occurrence.appointment_id`;
  - pula séries de tenant fora do estado ativo (002) e de consumidor desativado (003);
  - congela as versões vigentes na materialização (REQ-SER-011/013);
  - roda como job diário no `workers` e também é disparado a cada ocorrência concluída, cancelada ou pulada.
- [ ] T009 Implementar o outbox (`scheduling.series.changed`, `scheduling.series_occurrence.changed`) e o registro de mudanças em `services/scheduling/src/series/events.ts` (`data-model.md` `scheduling_series_change.actor`, `scheduling_series_change.from_sequence`, `scheduling_series_change.previous_rule_version_id` e `scheduling_series_change.new_rule_version_id`; REQ-SER-034).

**Checkpoint**: expansão e materialização testadas.

---

## Phase 3: User Story 1 - Criar uma série (Priority: P1) 🎯 MVP

**Goal**: criar uma série a partir de um agendamento (consumidor) ou pela equipe, com a frequência, o fim e a forma de pagamento (sinal autorizado no cartão, pacote ou no local), respeitando os limites.

**Independent Test**: criar uma série semanal de 10 ocorrências pelo app e uma quinzenal sem fim pelo painel e conferir as ocorrências (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Teste de contrato de `createSeriesFromAppointment`, `createSeriesByStaff` e `listMySeries` em `services/scheduling/src/http/series.contract.test.ts`.
- [ ] T011 [P] [US1] Teste de integração em `services/scheduling/src/series/create.int.test.ts`:
  - 4 ocorrências materializadas, numeradas e ligadas à série;
  - o negócio pode proibir a criação pelo consumidor (REQ-SER-002);
  - com sinal exigido, é obrigatória a autorização de cobrança automática, que é o consentimento recorrente do cartão na 012 (`payments_saved_card.consent_recurring_at`), referenciado em `data-model.md` `scheduling_series.card_authorization_ref` (REQ-SER-003); sem ele, a série não é criada; revogado depois, a série vai a `awaiting_payment`;
  - a 4ª série ativa no mesmo negócio gera `series.limit_reached`, e duas séries no mesmo horário são recusadas; as ocorrências não contam no limite de 5 futuros (REQ-SER-005); dois pedidos simultâneos da 4ª série resultam em um só aceito.
- [ ] T012 [P] [US1] Teste E2E em `apps/consumer-web/e2e/series-create.spec.ts`: "repetir" a partir da confirmação em até 3 toques (SC-001), com axe.

### Implementation for User Story 1

- [ ] T013 [US1] Implementar a criação em `services/scheduling/src/series/create.ts`: regra versionada (`data-model.md` `scheduling_series_rule_version.item_kind`, `scheduling_series_rule_version.professional_id`, `scheduling_series_rule_version.local_time`, `scheduling_series_rule_version.weekday`), `scheduling_series.origin_appointment_id`, `payment_mode` (`data-model.md` `scheduling_series.payment_mode`), autorização de cobrança recorrente pela 012 (`consent_recurring_at`), contagem de séries ativas com `FOR UPDATE`, limites e as primeiras 4 materializações.
- [ ] T014 [US1] Implementar o pagamento das ocorrências em `services/scheduling/src/series/payment.ts`, conforme o research R6:
  - sinal cobrado no cartão salvo na materialização; falha deixa a ocorrência em `PENDENTE_PAGAMENTO` e gera aviso;
  - pacote reserva uma sessão por ocorrência pelo livro de saldos da 012 (`data-model.md` `scheduling_series.package_account_id`; REQ-SER-004).
- [ ] T015 [US1] Implementar as rotas `/v1/consumer/appointments/{id}/series`, `/v1/consumer/series` e `/v1/tenant/series` em `services/scheduling/src/http/series.ts`.
- [ ] T016 [P] [US1] Implementar o botão "repetir" em C08/C12 e W14 e a tela C14/W16 ("Minhas séries", só a regra) em `apps/consumer-mobile/app/series/` e `apps/consumer-web/app/routes/minhas-series.tsx`, mais a criação pela equipe em `apps/tenant-web/src/routes/series/new/`.

**Checkpoint**: séries criadas, com 4 ocorrências.

---

## Phase 4: User Story 2 - Ocorrências que caem em feriado, folga ou horário ocupado (Priority: P1)

**Goal**: ocorrência em conflito não ocupa a agenda, recebe até 3 alternativas e, sem escolha até 24 h antes, é pulada sem custo e com aviso. Afetados posteriores entram na lista da 009 com a marca "série".

**Independent Test**: uma série que passa por um feriado e por uma folga aprovada (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T017 [P] [US2] Teste de integração em `services/scheduling/src/series/conflicts.int.test.ts`:
  - ocorrência em feriado, folga, bloqueio ou horário ocupado fica `in_conflict` com até 3 alternativas calculadas pela 008 (`data-model.md` `scheduling_series_occurrence.conflict_alternatives`; REQ-SER-020/021);
  - sem escolha até `conflict_deadline` → `skipped` com `skip_reason = conflict_unresolved` (`data-model.md` `scheduling_series_occurrence.conflict_deadline`; REQ-SER-022);
  - nenhuma ocorrência ocupa horário proibido (SC-002);
  - aviso com alternativas ao consumidor e à Recepção (SC-004).

### Implementation for User Story 2

- [ ] T018 [US2] Implementar a detecção de conflito e as alternativas na materialização em `services/scheduling/src/series/conflicts.ts`, com aviso pela 011.
- [ ] T019 [US2] Implementar o job de prazo de conflito (24 h antes) no `workers` em `services/scheduling/src/series/conflict-deadline.ts`.
- [ ] T020 [US2] Marcar com "série" as ocorrências materializadas afetadas por eventos posteriores, na lista de afetados da 009, em `services/scheduling/src/series/on-affected.ts` (REQ-SER-023).
- [ ] T021 [US2] Implementar a ação "escolher alternativa" pela rota `/v1/series/{id}/occurrences/{seq}/{action}` em `services/scheduling/src/http/series.ts`.

**Checkpoint**: conflitos sem ocupar a agenda.

---

## Phase 5: User Story 3 - Mudar uma ocorrência, as próximas ou a série inteira (Priority: P1)

**Goal**: alcance explícito (`this` | `this_and_following` | `whole_series`); nova versão da regra; nova reserva protegida; horário próprio preservado; multas mostradas antes; passado imutável.

**Independent Test**: numa série de 8, mudar a 3ª "só esta" e a partir da 5ª "esta e as próximas" (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T022 [P] [US3] Teste de propriedade (portão de merge) em `services/scheduling/src/series/scope.property.test.ts`: nenhuma sequência de mudanças `this` altera outra ocorrência, e ocorrências passadas nunca mudam (REQ-SER-035, SC-003).
- [ ] T023 [P] [US3] Teste de integração em `services/scheduling/src/series/scope.int.test.ts`:
  - `this_and_following` cria nova `scheduling_series_rule_version` a partir da sequência (`data-model.md` `scheduling_series_rule_version.valid_from_sequence`) e reserva de novo pela 008; as que não couberem ficam `in_conflict` (REQ-SER-031);
  - ocorrência com `has_own_time` é preservada, salvo escolha explícita (`data-model.md` `scheduling_series_occurrence.has_own_time`; REQ-SER-033);
  - cancelar com alcance maior mostra antes o total de multas pela política congelada de cada ocorrência (REQ-SER-032);
  - toda mudança entra em `scheduling_series_change` (`data-model.md` `scheduling_series_change.scope`);
  - ocorrência desmarcada pelo estabelecimento segue o cancelamento pelo estabelecimento, sem multa, e a série continua (edge case).

### Implementation for User Story 3

- [ ] T024 [US3] Implementar as mudanças por alcance (remarcar e cancelar) em `services/scheduling/src/series/scope.ts`, usando a remarcação e o cancelamento da 009 e a avaliação da 010 (research R5).
- [ ] T025 [US3] Expor o alcance obrigatório na rota `changeOccurrence` em `services/scheduling/src/http/series.ts` e no gerenciamento de agendamento da 009 quando o agendamento pertence a uma série.
- [ ] T026 [P] [US3] Implementar o seletor de alcance ("só esta", "esta e as próximas", "a série inteira") nas telas C13/W15 e no detalhe da agenda P03, em `apps/consumer-mobile/app/booking/manage.tsx`, `apps/consumer-web/app/routes/agendamento.$id.gerenciar.tsx` e `apps/tenant-web/src/routes/agenda/SeriesScopeDialog.tsx`.

**Checkpoint**: invariante 6 garantida.

---

## Phase 6: User Story 4 - Pausar e encerrar (Priority: P2)

**Goal**: pausa de até 90 dias com retomada automática; pausa por faltas seguidas; espera de pagamento quando o pacote acaba; troca de profissional quando o vínculo termina; encerramento com convite para uma nova série.

**Independent Test**: pausar por 3 semanas e marcar 2 faltas seguidas (quickstart §5).

### Tests for User Story 4 ⚠️

- [ ] T027 [P] [US4] Teste de integração em `services/scheduling/src/series/lifecycle.int.test.ts`:
  - pausa: as ocorrências do período ficam `skipped` e a série retoma sozinha (`data-model.md` `scheduling_series.paused_until`; REQ-SER-040);
  - N faltas seguidas (configurável de 1 a 5) levam a `paused_for_no_shows` e liberam as futuras (`data-model.md` `scheduling_series.consecutive_no_shows`; REQ-SER-043);
  - saldo do pacote no fim leva a `awaiting_payment` (REQ-SER-044);
  - vínculo encerrado oferece passar a série a outro profissional a partir de uma data (REQ-SER-042);
  - a última ocorrência leva a `ended` com convite para nova série (REQ-SER-041);
  - consumidor que exclui a conta tem as séries encerradas com `end_reason = consumer_deleted` antes de a 009 cancelar as ocorrências futuras, e o materializador não cria novas (edge case);
  - revogação do consentimento recorrente do cartão leva a série a `awaiting_payment`.

### Implementation for User Story 4

- [ ] T028 [US4] Implementar a pausa, a retomada e o encerramento em `services/scheduling/src/series/lifecycle.ts`, com o job de retomada no `workers`.
- [ ] T029 [US4] Implementar os consumidores de não comparecimento (009), saldo esgotado e revogação do consentimento recorrente (012), fim de vínculo (007) e desativação de conta (`identity.consumer.deactivated.v1`, 003, que encerra as séries com `data-model.md` `scheduling_series.end_reason = consumer_deleted`) em `services/scheduling/src/series/on-events.ts`, incluindo a troca de profissional a partir de uma data (`transfer_professional`).
- [ ] T030 [US4] Implementar o `seriesCommand` (`pause`, `resume`, `end`, `transfer_professional`) em `services/scheduling/src/http/series.ts`.

**Checkpoint**: ciclo de vida completo.

---

## Phase 7: User Story 5 - Ver e gerir as séries (Priority: P2)

**Goal**: "Minhas séries" com regra, próximas ocorrências, conflitos e ações; gestão de séries da filial com filtros e resolução rápida de conflitos; marca "série" na agenda; contrato reaproveitável pela 034; projeção "Meus agendamentos".

**Independent Test**: com 3 séries (ativa, com conflito e pausada), conferir as telas do consumidor e do painel (quickstart §1 a §5).

### Tests for User Story 5 ⚠️

- [ ] T031 [P] [US5] Teste de contrato de `listBranchSeries` e `seriesCommand` em `services/scheduling/src/http/series-staff.contract.test.ts`.
- [ ] T032 [P] [US5] Teste E2E em `apps/tenant-web/e2e/series-management.spec.ts`: P06 com filtros por profissional e conflito; resolver um conflito em ≤ 30 s (SC-007); axe.

### Implementation for User Story 5

- [ ] T033 [US5] Implementar as consultas de séries por filial e por consumidor (com próximas ocorrências e conflitos) em `services/scheduling/src/series/queries.ts`. As ocorrências chegam à projeção "Meus agendamentos" pelos eventos da 009 (REQ-SER-053).
- [ ] T034 [P] [US5] Completar C14/W16 com próximas ocorrências, conflitos e ações (REQ-SER-050).
- [ ] T035 [P] [US5] Implementar a P06 (Gestão de séries recorrentes) em `apps/tenant-web/src/routes/series/` e a marca "série n/N" na agenda P03, K01 e KD1 (REQ-SER-051).
- [ ] T036 [US5] Documentar o contrato de série para reaproveitamento pela 034 (`kind`, `item_kind`, `subject_id` como extensões futuras) em `docs/dev/contratos-cruzados.md` (REQ-SER-052).

**Checkpoint**: séries visíveis e gerenciáveis.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T037 [P] Registrar os casos de isolamento em `services/scheduling/src/series/isolation.cases.ts` (séries e ocorrências de outro tenant → 404).
- [ ] T038 [P] Testes com a flag `scheduling.series_v1` ligada e desligada em `services/scheduling/src/series/__tests__/flags.int.test.ts`.
- [ ] T039 [P] Teste de desempenho em `services/scheduling/bench/series.load.ts`: criação ≤ 2 s p95; materializador diário de 500 tenants ≤ 15 min.
- [ ] T040 [P] Aviso de mudança de preço ou política antes da próxima materialização, pela 011, em `services/scheduling/src/series/price-change-notice.ts` (REQ-SER-013, SC-006). O aviso traz a ação "encerrar a série sem custo": o encerramento por esse motivo não aplica multa nas ocorrências já materializadas que forem canceladas.
- [ ] T041 Painel Grafana "Séries" em `infra/observability/dashboards/series.json`, com séries ativas, conflitos abertos, puladas e a duração do materializador.
- [ ] T042 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-013.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1.
- **US3** depende de US1 e pode correr em paralelo com US2.
- **US4** depende de US1.
- **US5** depende de US1, US2 e US3.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 e T005.
- Depois de US1: US2, US3 e US4 em paralelo.

---

## Parallel Example: User Story 3

```bash
# Testes primeiro, juntos:
Task: "T022 propriedade do alcance em services/scheduling/src/series/scope.property.test.ts"
Task: "T023 integração em services/scheduling/src/series/scope.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: séries criadas e materializadas.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US2 → US3 (conflitos e alcance, que garantem o Princípio I e a invariante 6).
2. US4 → US5 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish.

---

## Notes

- Correções do `/speckit-analyze` de 2026-11-27 aplicadas sem tarefa nova. A cobrança automática depende do consentimento recorrente criado na 012 (`consent_recurring_at`, T030 da 012).
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-SER que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhuma mudança é feita sem alcance explícito. Ocorrências passadas são imutáveis. As versões são congeladas por ocorrência.
- Commit por tarefa ou grupo lógico, em branch `013-series-recorrentes`, por PR.
