---
description: "Lista de tarefas da spec 008 — Motor de agenda e disponibilidade"
---

# Tasks: Motor de agenda e disponibilidade

**Input**: documentos de `specs/008-motor-agenda-disponibilidade/`, locais e fora do repositório público.

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 007 concluídas.

**Tests**: incluídos. O Princípio I (sem reserva dupla) e o Princípio VIII (portão G-VIII) exigem testes escritos antes do código. Os testes de concorrência e de propriedade são portões de merge (REQ-AGD-071/072).

**Organization**: por história de usuário (US1–US7). P1: US1, US2, US3, US4. P2: US5, US6. P3: US7.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US7).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar a estrutura do domínio `scheduling` em `services/scheduling/`:
  - `package.json`, `tsconfig.json` e plugin Fastify em `KOOVELA_DOMAINS`;
  - pastas `src/{availability,occupancy,cache,cross-tenant,http}` e `migrations/`.
- [ ] T002 [P] Criar o pacote puro `packages/domain/time-grid/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/availability.openapi.yaml` e `packages/contracts/asyncapi/scheduling-occupancy-events.asyncapi.yaml` (fonte: `specs/008-motor-agenda-disponibilidade/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T004 [P] Incluir as ações de disponibilidade e encaixe em `packages/contracts/rbac/permissions.yaml`, com `audit_category` no encaixe fora da escala. Declarar a flag `scheduling.engine_v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas de ocupação e células, configurações do negócio, funções puras de intervalos e clientes dos contratos de 006 e 007.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste de propriedade das funções de intervalos em `packages/domain/time-grid/src/intervals.property.test.ts`: interseção, subtração e união de intervalos `[start, end)`, e discretização em células de 5 min arredondada para fora (`data-model.md` `scheduling_occupancy.protected_start`, `scheduling_occupancy.protected_end`; research R2).
- [ ] T006 [P] Teste da grade em `packages/domain/time-grid/src/grid.test.ts`:
  - inícios alinhados ao início de cada intervalo de trabalho, com passo de `data-model.md` `scheduling_settings.slot_grid_min` (REQ-AGD-002);
  - horas inexistentes ou repetidas no horário de verão histórico são tratadas (REQ-AGD-006).

### Implementação da fundação

- [ ] T007 Criar a migração `services/scheduling/migrations/0001_occupancy.ts` no schema do tenant:
  - `scheduling_settings` (versionada), com CHECK em `data-model.md` `scheduling_settings.slot_grid_min`, `scheduling_settings.min_lead_min` e `scheduling_settings.horizon_days`;
  - `scheduling_occupancy`, com CHECK em `data-model.md` `scheduling_occupancy.kind`, `scheduling_occupancy.origin` e `scheduling_occupancy.granularity`, e as colunas latentes `resource_id`, `capacity_unit` e `parent_occupancy_id`;
  - `scheduling_occupancy_cell`, com PRIMARY KEY `data-model.md` `scheduling_occupancy_cell.professional_id` + `scheduling_occupancy_cell.cell_start`, coluna `occupancy_id` indexada **sem chave estrangeira** (o MySQL não aceita FK em tabela particionada) e partição por mês de `cell_start`;
  - `scheduling_resource_cell`, com PRIMARY KEY `data-model.md` `scheduling_resource_cell.resource_id` + `scheduling_resource_cell.cell_start` e `occupancy_id` indexada, também sem FK;
  - `scheduling_consumer_hold_counter`, com CHECK em `data-model.md` `scheduling_consumer_hold_counter.active_holds`;
  - `scheduling_audit_outbox` e `scheduling_outbox`.
- [ ] T008 Implementar as funções puras em `packages/domain/time-grid/src/{intervals,cells,grid}.ts`.
- [ ] T009 [P] Implementar os clientes internos em `services/scheduling/src/clients/{workforce,catalog,tenancy}.ts`:
  - intervalos de trabalho em UTC (007);
  - versão vigente de serviço e plano de combo (006);
  - estado da filial e do negócio (005), com tratamento de indisponibilidade.
- [ ] T010 Implementar as configurações do negócio em `services/scheduling/src/availability/settings.ts`, com padrões de grade, antecedência, horizonte e escolha de profissional (`data-model.md` `scheduling_settings.consumer_picks_professional`, `scheduling_settings.any_professional_rule`; REQ-AGD-003/005), e a rota de edição em `services/scheduling/src/http/settings.ts`.
- [ ] T011 Implementar o outbox de eventos (`scheduling.occupancy.changed`) e a auditoria em `services/scheduling/src/events.ts`.

**Checkpoint**: modelo de ocupação e funções de tempo prontos.

---

## Phase 3: User Story 1 - Consumidor vê os horários livres de verdade (Priority: P1) 🎯 MVP

**Goal**: calcular os inícios livres de um serviço ou combo por filial, profissional ou "qualquer profissional" e intervalo de datas. Respeita grade, antecedência e horizonte, preparo e limpeza, fusos, próximo dia livre e estado da filial e do negócio.

**Independent Test**: com dois profissionais, uma folga e um agendamento existente, consultar um serviço de 45 min e ver só horários em que o atendimento inteiro cabe (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T012 [P] [US1] Teste de contrato de `getConsumerAvailability` em `services/scheduling/src/http/availability.contract.test.ts`.
- [ ] T013 [P] [US1] Teste de propriedade em `services/scheduling/src/availability/free-slots.property.test.ts`:
  - nenhum início oferecido sobrepõe ocupação, folga ou bloqueio;
  - todo início cabe inteiro, com a janela protegida, no tempo de trabalho;
  - vale também em fusos diferentes e datas com horário de verão histórico (REQ-AGD-072, SC-006).
- [ ] T014 [P] [US1] Teste de integração em `services/scheduling/src/availability/consumer.int.test.ts`:
  - antecedência mínima e horizonte respeitados (REQ-AGD-003);
  - "qualquer profissional" é a união dos horários; com a escolha desligada, o consumidor só vê "qualquer" (REQ-AGD-004/005);
  - sem horário no período, devolve `next_available_date` (REQ-AGD-008);
  - filial pausada, negócio despublicado ou tenant inativo devolvem lista vazia (REQ-AGD-009);
  - na reserva com "qualquer profissional", o profissional atribuído é o menos ocupado no dia, com empate decidido por `professional_id`; se ele perder a corrida, tenta o seguinte da mesma ordem (REQ-AGD-004).

### Implementation for User Story 1

- [ ] T015 [US1] Implementar o tempo livre por profissional e data em `services/scheduling/src/availability/free-time.ts` (intervalos de trabalho − células ocupadas).
- [ ] T016 [US1] Implementar os inícios por serviço ou combo em `services/scheduling/src/availability/free-slots.ts`:
  - duração própria do profissional (007) + preparo + limpeza;
  - combos somados pelo plano da 006;
  - grade alinhada;
  - "qualquer profissional" como união;
  - serviço sem nenhum início possível em nenhum dia da semana (mais longo que qualquer intervalo de trabalho) gera aviso ao Proprietário no painel (`scheduling.service_never_fits.v1`, edge case);
  - próximo dia livre (research R6).
- [ ] T017 [US1] Implementar `GET /v1/public/businesses/{slug}/availability` em `services/scheduling/src/http/public.ts`, com o tenant resolvido pelo slug e exibição no fuso da filial; a resposta traz o `timezone` da filial para a tela da 009 avisar quando o fuso do aparelho for diferente (REQ-AGD-001/006). A consulta nunca é garantia (REQ-AGD-022).

**Checkpoint**: horários de verdade calculados a partir das fontes.

---

## Phase 4: User Story 2 - Ninguém consegue ocupar o mesmo horário duas vezes (Priority: P1)

**Goal**: ocupação definitiva protegida por lock distribuído com marca de posse e por células com PRIMARY KEY no banco; recusa com alternativas; a proteção vale para toda origem.

**Independent Test**: N pedidos simultâneos para a mesma janela, pela web, pelo app e pelo painel, resultam em exatamente 1 aceito; os demais recebem alternativas (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T018 [P] [US2] Teste de concorrência (portão de merge) em `services/scheduling/src/occupancy/concurrency.int.test.ts`: 50 pedidos simultâneos para a mesma janela resultam em exatamente 1 sucesso, contra MySQL e Redis reais, para serviço avulso (REQ-AGD-071, SC-001).
- [ ] T019 [P] [US2] Teste sem Redis em `services/scheduling/src/occupancy/no-redis.int.test.ts`: com o lock fora, a PK das células ainda impede a sobreposição (REQ-AGD-021).
- [ ] T020 [P] [US2] Teste de contrato de `createDefinitive`, `releaseOccupancy` e `listOccupancies` em `services/scheduling/src/http/internal.contract.test.ts`, incluindo escrita em tenant suspenso recusada pelo bloqueio por estado da 002 (edge case).
- [ ] T021 [P] [US2] Teste das alternativas em `services/scheduling/src/occupancy/alternatives.int.test.ts`: a recusa `scheduling.slot_taken` traz até 3 inícios próximos do mesmo profissional e o mesmo horário com outro profissional, quando houver (REQ-AGD-025).

### Implementation for User Story 2

- [ ] T022 [US2] Implementar o lock em `services/scheduling/src/occupancy/lock.ts`:
  - `SET t:{tenant}:lock:prof:{id}:{data} <token> NX PX 5000`;
  - liberação por script Lua que confere o token;
  - chaves de combo e recurso adquiridas em ordem lexicográfica, com limite total de 2 s (research R3; REQ-AGD-020);
  - janela que atravessa a meia-noite (no fuso da filial) pega os locks das duas datas, na mesma ordem lexicográfica.
- [ ] T023 [US2] Implementar a escrita da ocupação em `services/scheduling/src/occupancy/write.ts`:
  - transação que insere a ocupação e uma linha por célula da janela protegida (REQ-AGD-023);
  - conflito de PK vira `scheduling.slot_taken`;
  - `origin` conforme `data-model.md` `scheduling_occupancy.origin` (REQ-AGD-026);
  - grava `data-model.md` `scheduling_occupancy.shown_start`/`shown_end` (o que o consumidor vê) separados de `protected_start`/`protected_end`, `scheduling_occupancy.capacity_unit` = 1 e `scheduling_occupancy.appointment_id` vindo da 009;
  - com "qualquer profissional", escolhe o profissional pela `data-model.md` `scheduling_settings.any_professional_rule` (padrão: menos ocupado no dia; empate por `professional_id`) e tenta o próximo da lista se a célula já estiver tomada (REQ-AGD-004).
- [ ] T024 [US2] Implementar a liberação (comando da 009), que apaga as células explicitamente na mesma transação (não há cascata), grava `data-model.md` `scheduling_occupancy.released_at` e publica o evento, em `services/scheduling/src/occupancy/release.ts` (REQ-AGD-035).
- [ ] T025 [US2] Implementar o cálculo das alternativas em `services/scheduling/src/occupancy/alternatives.ts`.
- [ ] T026 [US2] Implementar as rotas `POST /v1/internal/scheduling/occupancies`, `/release` e `GET /occupancies` em `services/scheduling/src/http/internal.ts`, só com credencial de serviço.
- [ ] T027 [US2] Adicionar `pnpm test:concurrency --filter scheduling` como portão obrigatório em `.github/workflows/pr.yml`.

**Checkpoint**: reserva dupla impossível por construção.

---

## Phase 5: User Story 3 - Segurar o horário enquanto o consumidor paga (Priority: P1)

**Goal**: reserva temporária de 10 min com uma extensão até 30 min, confirmação sem janela aberta, liberação do vencido em ≤ 1 min e no máximo 2 reservas temporárias por consumidor e negócio.

**Independent Test**: escolher um horário, ver que ele some para outro consumidor, deixar vencer e vê-lo voltar (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T028 [US3] Teste de contrato de `createHold`, `extendHold` e `confirmOccupancy` em `services/scheduling/src/http/internal.contract.test.ts`, no mesmo arquivo de T020 (não paralelizar com T020).
- [ ] T029 [P] [US3] Teste de integração em `services/scheduling/src/occupancy/hold.int.test.ts`:
  - `expires_at` de 10 min;
  - uma extensão até 30 min no total, e a segunda é recusada (`data-model.md` `scheduling_occupancy.expires_at`, `scheduling_occupancy.extended`; REQ-AGD-031);
  - a 3ª reserva temporária do mesmo consumidor gera `scheduling.hold_limit_reached` (REQ-AGD-033);
  - o vencido é liberado em ≤ 1 min com `scheduling.occupancy.hold_expired.v1` (REQ-AGD-032, SC-007).
- [ ] T030 [P] [US3] Teste de corrida na confirmação em `services/scheduling/src/occupancy/confirm-race.int.test.ts`: confirmar uma reserva temporária já vencida e tomada por outro é recusado com `scheduling.slot_taken` e alternativas (edge case); nenhuma outra escrita ocupa a janela entre a reserva temporária e a definitiva (REQ-AGD-034).

### Implementation for User Story 3

- [ ] T031 [US3] Implementar a reserva temporária, a extensão e a confirmação em `services/scheduling/src/occupancy/hold.ts`:
  - `kind = hold` com as células já inseridas;
  - a confirmação é um `UPDATE` de `kind` na mesma linha, com `data-model.md` `scheduling_occupancy.confirmed_at`;
  - o limite de 2 reservas temporárias conta por `data-model.md` `scheduling_occupancy.consumer_id` e negócio;
  - contador `FOR UPDATE` em `scheduling_consumer_hold_counter` (research R4).
- [ ] T032 [US3] Implementar o job de expiração (a cada 30 s) no `workers` em `services/scheduling/src/occupancy/expire-holds.ts`.
- [ ] T033 [US3] Implementar as rotas `/holds`, `/{id}/extend` e `/{id}/confirm` em `services/scheduling/src/http/internal.ts`.

**Checkpoint**: reserva temporária pronta para o fluxo de pagamento da 009 e da 012.

---

## Phase 6: User Story 4 - Combo reservado de uma vez (Priority: P1)

**Goal**: reserva atômica de todas as etapas do combo (ocupação-mãe e etapas), com preparo só antes da primeira etapa e limpeza só depois da última.

**Independent Test**: reservar um combo de duas etapas com falha injetada na segunda; a primeira também não fica ocupada (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T034 [P] [US4] Teste de concorrência e atomicidade do combo em `services/scheduling/src/occupancy/combo.int.test.ts`:
  - 50 pedidos com uma etapa em conflito resultam em exatamente 1 sucesso;
  - com falha injetada, nenhuma etapa fica ocupada (`data-model.md` `scheduling_occupancy.parent_occupancy_id`, `scheduling_occupancy.step_index`; REQ-AGD-024, SC-008).

### Implementation for User Story 4

- [ ] T035 [US4] Implementar a reserva de combo em `services/scheduling/src/occupancy/combo.ts`: a partir do plano da 006, uma transação com a ocupação-mãe e as filhas por etapa, `same_for_all` na v1.0 e o modelo aceitando `per_step` (research R5).
- [ ] T036 [US4] Aceitar `item_kind = combo` nas rotas de reserva temporária e definitiva em `services/scheduling/src/http/internal.ts`.

**Checkpoint**: combo atômico.

---

## Phase 7: User Story 5 - Equipe agenda pelo painel, com encaixe controlado (Priority: P2)

**Goal**: visão de equipe sem antecedência e com serviços internos; encaixe fora da escala com motivo e auditoria; folga sempre impede; sobreposição impossível para qualquer perfil.

**Independent Test**: pelo painel, agendar fora da escala (aceito com confirmação) e por cima de outro agendamento (sempre recusado) (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T037 [P] [US5] Teste de contrato de `getStaffAvailability` em `services/scheduling/src/http/staff.contract.test.ts`.
- [ ] T038 [P] [US5] Teste de integração em `services/scheduling/src/occupancy/override.int.test.ts`:
  - o encaixe fora da escala exige `override.reason` e grava `data-model.md` `scheduling_occupancy.override_reason` e `scheduling_occupancy.created_by`, com auditoria (REQ-AGD-041);
  - folga aprovada gera `scheduling.time_off_conflict` (REQ-AGD-043);
  - sobreposição é recusada para todos os perfis (REQ-AGD-042);
  - com a filial pausada ou o negócio despublicado, a equipe vê os horários e agenda com aviso (edge case).

### Implementation for User Story 5

- [ ] T039 [US5] Implementar a visão de equipe em `services/scheduling/src/availability/staff.ts`, sem antecedência e com serviços `internal` (REQ-AGD-040); filial pausada ou negócio despublicado não escondem os horários da equipe, só mostram o aviso.
- [ ] T040 [US5] Implementar o encaixe com motivo e a checagem de folga pelo contrato da 007 em `services/scheduling/src/occupancy/override.ts`.
- [ ] T041 [US5] Implementar `GET /v1/tenant/availability` em `services/scheduling/src/http/staff.ts`, com escopo de filial pela matriz.

**Checkpoint**: agendamento manual seguro pela equipe.

---

## Phase 8: User Story 6 - Horários sempre coerentes com a realidade (Priority: P2)

**Goal**: cache do tempo livre em Redis, invalidado por evento em ≤ 5 s, com fallback às fontes sem nunca mostrar horário ocupado e meta de desempenho de 500 ms p95.

**Independent Test**: cancelar um agendamento e ver o horário aparecer; aprovar uma folga e ver os horários sumirem (quickstart §6).

### Tests for User Story 6 ⚠️

- [ ] T042 [P] [US6] Teste de propagação em `services/scheduling/src/cache/invalidation.int.test.ts`: os eventos `scheduling.occupancy.*`, `workforce.availability.changed.v1`, `tenancy.branch.hours_changed.v1` e `catalog.*.changed` aparecem nos horários em ≤ 5 s p95 (REQ-AGD-051, SC-004).
- [ ] T043 [P] [US6] Teste de fallback em `services/scheduling/src/cache/fallback.int.test.ts`: com o Redis fora, a consulta continua correta e nunca mostra horário ocupado, em folga ou bloqueado (REQ-AGD-052).
- [ ] T044 [P] [US6] Teste de carga em `services/scheduling/bench/availability.load.ts`: 50 req/s por filial, 7 dias, p95 ≤ 500 ms (REQ-AGD-007, SC-003).

### Implementation for User Story 6

- [ ] T045 [US6] Implementar o cache `t:{tenant}:free:{professional_id}:{date}` com a versão dos insumos em `services/scheduling/src/cache/free-time-cache.ts` (REQ-AGD-050/053).
- [ ] T046 [US6] Implementar os consumidores de invalidação no `workers` em `services/scheduling/src/cache/invalidate.ts`.
- [ ] T047 [US6] Medir a taxa de recusa "horário que a tela mostrava como livre" com a métrica `scheduling_slot_taken_after_display_total` e o alerta acima de 2% em `infra/observability/alerts/scheduling.yml` (SC-005).

**Checkpoint**: horários coerentes e rápidos.

---

## Phase 9: User Story 7 - Recurso compartilhado latente e conflito entre negócios detectável (Priority: P3)

**Goal**: proteção por recurso pelas células irmãs, sem interface na v1.0, e detecção de sobreposição da mesma pessoa em tenants diferentes com aviso, sem bloquear.

**Independent Test**: duas ocupações com o mesmo recurso, onde a segunda é recusada; ocupações da mesma pessoa em dois tenants geram o evento de conflito (quickstart §7).

### Tests for User Story 7 ⚠️

- [ ] T048 [P] [US7] Teste de concorrência do recurso em `services/scheduling/src/occupancy/resource.int.test.ts`: 50 pedidos de profissionais diferentes no mesmo `resource_id` resultam em exatamente 1 sucesso (`data-model.md` `scheduling_occupancy.resource_id`; REQ-AGD-060).
- [ ] T049 [P] [US7] Teste de contrato em `services/scheduling/src/cross-tenant/detect.int.test.ts`: mesma pessoa em dois tenants sintéticos na mesma janela gera `scheduling.cross_tenant_conflict.detected.v1`, sem bloqueio (REQ-AGD-061).

### Implementation for User Story 7

- [ ] T050 [US7] Inserir células em `data-model.md` `scheduling_resource_cell` quando houver `scheduling_occupancy.resource_id`, na mesma transação (e apagá-las na liberação), em `services/scheduling/src/occupancy/write.ts`.
- [ ] T051 [US7] Implementar o índice `koovela_projections.person_occupancy_index` (`data-model.md`: `person_id`, `tenant_id`, `occupancy_id`, `protected_start`, `protected_end`; só para detecção, nunca lido por tela) e a detecção no `workers` em `services/scheduling/src/cross-tenant/{index,detect}.ts`, com a migração global em `services/scheduling/migrations/0002_person_occupancy_index.ts` (research R9).

**Checkpoint**: latentes prontos para 026, 027 e 035.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T052 [P] Registrar os casos de isolamento das rotas desta spec em `services/scheduling/src/isolation.cases.ts` (REQ-AGD-073).
- [ ] T053 [P] Testes com a flag `scheduling.engine_v1` ligada e desligada em `services/scheduling/src/__tests__/flags.int.test.ts`.
- [ ] T054 [P] Painel Grafana "Motor de agenda" em `infra/observability/dashboards/scheduling-engine.json`: latência de consulta e escrita, `slot_taken`, reservas temporárias vencidas, acertos do cache e atraso de invalidação.
- [ ] T055 [P] Particionamento mensal automático de `scheduling_occupancy_cell`, com criação da partição futura e remoção das antigas (só de ocupações liberadas), em `services/scheduling/src/maintenance/partitions.ts`. Inclui a verificação diária de órfãs (célula sem ocupação ou ocupação liberada com célula), que alerta e corrige, já que não há FK; teste em `services/scheduling/src/maintenance/orphans.int.test.ts`.
- [ ] T056 Escrever o runbook `docs/ops/runbooks/reserva-dupla-suspeita.md`.
- [ ] T057 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-008.md`.
- [ ] T058 [P] Publicar `scheduling.double_booking.detected.v1` (só ids e horário) quando a verificação de invariantes encontrar ocupações sobrepostas para o mesmo recurso, em `services/scheduling/src/invariants/double-booking-check.ts` (job no `workers`), com alerta crítico ao SRE; o BI (023) conta os incidentes. Teste com sobreposição forçada em banco de teste.
- [ ] T059 [P] Publicar `scheduling.availability_summary.changed.v1` por filial em `services/scheduling/src/availability/summary.ts` (job no `workers` a cada 15 min e na mudança de ocupação, só para filiais com participação na vitrine): `next_free_slot_at`, `available_today`, `available_tomorrow`, `slots_next_7d`, calculados pelo próprio motor de disponibilidade, só com ids e horários. Teste em `services/scheduling/src/availability/summary.int.test.ts`.
- [ ] T060 [P] Aceitar `subject_id` em `getConsumerAvailability`, `getStaffAvailability` e `createHold` em `services/scheduling/src/availability/subject-duration.ts`: para pet, obter porte e pelagem pela identidade (025) e a duração pela regra versionada da 006 (`packages/domain/catalog/src/pet-duration.ts`), devolvendo `duration_rule_version_id` para congelar no agendamento; sem `subject_id`, duração do serviço. Teste: cão G de pelagem longa recebe a duração somada e só os horários que cabem nela.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** (consulta) depende da fase 2.
- **US2** (escrita protegida) depende da fase 2 e pode correr em paralelo com US1.
- **US3** (reserva temporária) depende de US2.
- **US4** (combo) depende de US2.
- **US5** (equipe) depende de US1 e US2.
- **US6** (cache) depende de US1.
- **US7** (latentes) depende de US2.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → portões de CI e alertas.

### Parallel Opportunities

- Setup: T002, T003 e T004.
- Fundação: T005 e T006; T009 em paralelo com T008.
- Depois da fase 2: US1 e US2 em paralelo. Depois de US2: US3, US4 e US7 em paralelo. Depois de US1: US6.

---

## Parallel Example: User Story 2

```bash
# Testes primeiro, juntos:
Task: "T018 concorrência em services/scheduling/src/occupancy/concurrency.int.test.ts"
Task: "T019 sem Redis em services/scheduling/src/occupancy/no-redis.int.test.ts"
Task: "T020 contrato em services/scheduling/src/http/internal.contract.test.ts"
Task: "T021 alternativas em services/scheduling/src/occupancy/alternatives.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (horários corretos) e US2 (sem reserva dupla). Os dois formam a garantia mínima do Princípio I.
3. **Parar e validar** com o quickstart §1 e §2.

### Incremental Delivery

1. US3 → US4 (reserva temporária e combo prontos para a 009).
2. US5 → US6 (equipe e desempenho).
3. US7 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US6 → US5 → US7 → Polish.

---

## Notes

- Correções do `/speckit-analyze` de 2026-11-26 aplicadas sem tarefa nova. A regra "preparo e limpeza em múltiplos de 5" já foi levada à 006 (REQ-CAT-003).
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-AGD que atende. Campos com restrição citam `data-model.md` e o campo.
- A consulta nunca é garantia; a garantia é a célula com PRIMARY KEY no banco (com o lock como primeira barreira).
- UTC no banco e hora local por data; chaves Redis com prefixo de tenant.
- Esta spec não tem tela própria; as telas de horário e agenda são da 009.
- Commit por tarefa ou grupo lógico, em branch `008-motor-agenda-disponibilidade`, por PR.
- T060 acrescentada na análise da 025 (2026-11-27): duração do pet na disponibilidade e no hold.
- T059 acrescentada na análise da 024 (2026-11-27): resumo de disponibilidade para a vitrine.
- T058 acrescentada na análise da 023 (2026-11-27): evento de reserva dupla detectada.
