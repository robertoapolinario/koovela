---
description: "Lista de tarefas da spec 014 — Fila de espera e horário ocioso"
---

# Tasks: Fila de espera e horário ocioso

**Input**: documentos de `specs/014-fila-espera-horario-ocioso/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 013 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes antes do código. O teste de concorrência do aceite é portão de merge.

**Organization**: por história de usuário (US1–US6). P1: US1, US2, US3. P2: US4, US5. P3: US6.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar as pastas `services/scheduling/src/{waitlist,idle,offers}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/waitlist-idle.openapi.yaml` e `packages/contracts/asyncapi/waitlist-idle-events.asyncapi.yaml` (fonte: `specs/014-fila-espera-horario-ocioso/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - fila: consumidor `self` e equipe com escopo de filial;
  - regra de horário ocioso: Proprietário;
  - limites no back-office: Comercial/Growth com aprovação do Fin/Ops.

  Declarar as flags `scheduling.waitlist_v1` e `scheduling.idle_v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, ofertas idempotentes e aceite protegido pela 008.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de concorrência (portão de merge) em `services/scheduling/src/offers/accept-concurrency.int.test.ts`: N aceites simultâneos da mesma oferta → 1 vence pelo hold da 008; os demais recebem "a vaga já foi preenchida" (REQ-FIL-013, SC-002).
- [ ] T005 [P] Teste de idempotência em `services/scheduling/src/offers/idempotency.int.test.ts`: nunca duas ofertas do mesmo horário para a mesma pessoa (UNIQUE de `data-model.md` `scheduling_slot_offer`; REQ-FIL-061).

### Implementação da fundação

- [ ] T006 Criar a migração `services/scheduling/migrations/0401_waitlist_idle.ts` no schema do tenant, com:
  - `scheduling_waitlist_entry`: CHECK em `data-model.md` `scheduling_waitlist_entry.state`;
  - `scheduling_slot_offer`: CHECK em `data-model.md` `scheduling_slot_offer.kind` e `scheduling_slot_offer.state`; UNIQUE `(branch_id, professional_id, start_at, consumer_id)`;
  - `scheduling_idle_rule_version`, `scheduling_offer_optin` (CHECK em `data-model.md` `scheduling_offer_optin.channel` só `push`, `sms` e `email`, nunca `whatsapp`; coluna `device`) e `scheduling_waitlist_settings`.

  Criar também a migração global `koovela_platform.idle_platform_limits` em `services/scheduling/migrations/0402_idle_platform_limits.ts`.
- [ ] T007 Implementar o aceite de oferta em `services/scheduling/src/offers/accept.ts`:
  - `createHold` da 008 com `origin = waitlist` ou `idle_offer`;
  - fluxo normal da 009 (política, pagamento quando exigido, confirmação);
  - estados de `data-model.md` `scheduling_slot_offer.state`, com `scheduling_slot_offer.start_at`, `scheduling_slot_offer.consumer_id` e `scheduling_slot_offer.entry_id`;
  - aceitar uma oferta marca as outras do mesmo `data-model.md` `scheduling_slot_offer.offer_group_id` como `declined`.
- [ ] T008 Implementar o outbox (`scheduling.slot_offer.changed`, `scheduling.waitlist_entry.changed`) em `services/scheduling/src/offers/events.ts`.

**Checkpoint**: aceite seguro e ofertas idempotentes.

---

## Phase 3: User Story 1 - Entrar na fila de espera (Priority: P1) 🎯 MVP

**Goal**: entrar na fila por serviço, profissional (ou qualquer), filial e período de até 30 dias, com limite de entradas, saída a qualquer momento e encerramento automático.

**Independent Test**: com a agenda cheia, entrar na fila e receber o aviso quando um agendamento compatível é cancelado (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T009 [P] [US1] Teste de contrato de `joinWaitlist`, `listMyWaitlist` e `leaveWaitlist` em `services/scheduling/src/http/waitlist.contract.test.ts`.
- [ ] T010 [P] [US1] Teste de integração em `services/scheduling/src/waitlist/entry.int.test.ts`:
  - período de até 30 dias (`data-model.md` `scheduling_waitlist_entry.period_from`, `scheduling_waitlist_entry.period_to`; REQ-FIL-002);
  - a 4ª entrada ativa gera `waitlist.limit_reached` (REQ-FIL-003);
  - a entrada é encerrada quando o consumidor agenda o mesmo serviço no período por outro caminho (`closed_auto`; REQ-FIL-004).

### Implementation for User Story 1

- [ ] T011 [US1] Implementar a entrada, a saída e a expiração na fila em `services/scheduling/src/waitlist/entry.ts`, incluindo o consumidor de `scheduling.appointment.state_changed` que faz o encerramento automático (`data-model.md` `scheduling_waitlist_entry.day_window`, `scheduling_waitlist_entry.queued_at`, `scheduling_waitlist_entry.professional_id` NULL = qualquer profissional).
- [ ] T012 [US1] Implementar as rotas `/v1/consumer/businesses/{slug}/waitlist` e `/v1/consumer/waitlist*` em `services/scheduling/src/http/waitlist.ts`.
- [ ] T013 [P] [US1] Implementar as telas C17 em `apps/consumer-mobile/app/waitlist/` e W19 em `apps/consumer-web/app/routes/fila.tsx`, oferecidas quando não há horário livre.

**Checkpoint**: consumidores entram na fila.

---

## Phase 4: User Story 2 - Vaga oferecida à fila e agendada em minutos (Priority: P1)

**Goal**: detectar a vaga liberada e oferecer às 3 primeiras entradas compatíveis com prazo. O primeiro aceite vence. Rodadas seguintes até acabar a fila. O consumidor que cancelou não recebe. O aviso é transacional, e o Proprietário pode desligar a oferta automática.

**Independent Test**: com 5 na fila, cancelar e conferir a oferta aos 3 primeiros e o primeiro aceite (quickstart §1).

### Tests for User Story 2 ⚠️

- [ ] T014 [P] [US2] Teste de contrato de `acceptOffer` em `services/scheduling/src/http/offers.contract.test.ts`.
- [ ] T015 [P] [US2] Teste de integração em `services/scheduling/src/waitlist/detector.int.test.ts`:
  - liberação, reserva vencida, cancelamento tardio e mudança de disponibilidade geram oferta em ≤ 1 min (REQ-FIL-010/062, SC-001);
  - só entradas compatíveis, em que o serviço cabe inteiro com preparo e limpeza (REQ-FIL-011);
  - 3 por rodada, com prazo de 15 min, ou de 5 min se o horário começa em menos de 2 h (`data-model.md` `scheduling_slot_offer.round`, `scheduling_slot_offer.expires_at`; REQ-FIL-012);
  - quem cancelou não recebe (REQ-FIL-015);
  - oferta automática desligada → nada é enviado (`data-model.md` `scheduling_waitlist_settings.auto_offer_enabled`; REQ-FIL-016);
  - vários horários livres para a mesma entrada saem num aviso só, com até 3 opções do mesmo `offer_group_id`; aceitar uma fecha as outras (edge case);
  - oferta aceita e reserva vencida sem pagamento → o horário volta à rodada seguinte (edge case);
  - consumidor no limite de agendamentos futuros não recebe oferta (edge case);
  - tenant suspenso ou filial pausada: nenhuma oferta sai (edge case);
  - aviso de vaga com horário em menos de 3 h sai marcado como urgente e pode sair no horário de silêncio (edge case).
- [ ] T016 [P] [US2] Teste E2E em `apps/consumer-web/e2e/waitlist-offer.spec.ts`: aceitar e chegar à confirmação em até 2 min (SC-004), com axe.

### Implementation for User Story 2

- [ ] T017 [US2] Implementar o detector de vaga no `workers` em `services/scheduling/src/waitlist/detector.ts`, consumindo `scheduling.occupancy.*`, `scheduling.policy.slot_freed_late.v1` e `workforce.availability.changed.v1`. Filtra tenant fora do estado ativo, filial pausada, consumidor no limite de futuros e quem cancelou o horário.
- [ ] T018 [US2] Implementar as rodadas e o vencimento no `workers` em `services/scheduling/src/offers/rounds.ts`, com aviso transacional pela 011: agrupa num `offer_group_id` as ofertas do mesmo consumidor e entrada na rodada (um aviso com até 3 horários); marca urgente o horário em menos de 3 h; consome o vencimento da reserva temporária (008) para devolver o horário à rodada seguinte; inclui a consequência da política (sinal exigido por faltas, spec 010).
- [ ] T019 [US2] Implementar a rota `/v1/consumer/offers/{id}/accept` em `services/scheduling/src/http/offers.ts`.
- [ ] T020 [P] [US2] Implementar a tela de aviso e de aceite de vaga no app e na web (C17/W19, estado "vaga disponível") em `apps/consumer-mobile/app/waitlist/offer/[id].tsx` e `apps/consumer-web/app/routes/oferta.$id.tsx`, com as até 3 opções do grupo e o aviso de sinal quando a política exigir.

**Checkpoint**: vaga liberada preenchida pela fila.

---

## Phase 5: User Story 3 - Recepção encaixa pela fila (Priority: P1)

**Goal**: tela de horários livres com as entradas compatíveis em ordem. O encaixe manual tem origem "fila de espera", encerra a entrada e bloqueia a oferta automática para aquele horário.

**Independent Test**: agendar manualmente uma entrada e conferir que nenhuma oferta automática é enviada (quickstart §2).

### Tests for User Story 3 ⚠️

- [ ] T021 [P] [US3] Teste de contrato de `listBranchWaitlist`, `bookFromWaitlist` e `setWaitlistSettings` em `services/scheduling/src/http/waitlist-staff.contract.test.ts`.
- [ ] T022 [P] [US3] Teste de integração em `services/scheduling/src/waitlist/manual-book.int.test.ts`: o encaixe cria um agendamento manual (009) com origem `waitlist`, encerra a entrada e não gera oferta para aquele horário (REQ-FIL-021).
- [ ] T023 [P] [US3] Teste E2E em `apps/tenant-web/e2e/waitlist-fit.spec.ts`: encaixe em ≤ 30 s (SC-005), com axe.

### Implementation for User Story 3

- [ ] T024 [US3] Implementar a consulta de horários livres com entradas compatíveis e o encaixe em `services/scheduling/src/waitlist/staff.ts`, mais as rotas `/v1/tenant/waitlist*` em `services/scheduling/src/http/waitlist.ts`.
- [ ] T025 [P] [US3] Implementar a tela P07 (Fila de espera e encaixe) em `apps/tenant-web/src/routes/waitlist/`, com a opção de desligar a oferta automática.

**Checkpoint**: a Recepção usa a fila.

---

## Phase 6: User Story 4 - Regra de horário ocioso (Priority: P2)

**Goal**: regra por negócio dentro dos limites do back-office (inexistente em saúde). Um scanner gera ofertas com desconto em centavos congelado, só para quem tem opt-in. A fila tem prioridade, e silêncio, pacote e limites são respeitados.

**Independent Test**: regra de terça a quinta, 20%, para quem foi atendido nos últimos 90 dias; conferir as ofertas geradas (quickstart §3).

### Tests for User Story 4 ⚠️

- [ ] T026 [P] [US4] Teste de contrato de `saveIdleRule` e `setIdlePlatformLimits` em `services/scheduling/src/http/idle.contract.test.ts`.
- [ ] T027 [P] [US4] Teste de integração em `services/scheduling/src/idle/scanner.int.test.ts`:
  - desconto acima do limite é recusado (`data-model.md` `idle_platform_limits.max_discount_bps`; REQ-FIL-031);
  - em saúde não há regra (`data-model.md` `idle_platform_limits.disabled_verticals`);
  - oferta só a quem tem opt-in naquele estabelecimento e canal (SC-003); nunca por WhatsApp (CONST 5);
  - tenant suspenso ou filial pausada: nenhuma oferta;
  - desconto em combo rateado por etapa (REQ-CAT-034);
  - respeita `max_offers_per_consumer_week`, o horário de silêncio, o pacote e o limite de futuros (REQ-FIL-035);
  - a fila daquele horário tem prioridade (REQ-FIL-032);
  - preço = `floor(preço × (10000 − desconto_bps) / 10000)`, congelado (`data-model.md` `scheduling_slot_offer.discount_bps`, `scheduling_slot_offer.price_cents`; REQ-FIL-033).

### Implementation for User Story 4

- [ ] T028 [US4] Implementar a regra versionada e a validação contra os limites em `services/scheduling/src/idle/rule.ts` (`data-model.md` `scheduling_idle_rule_version.discount_bps`, `scheduling_idle_rule_version.lead_min_hours`, `scheduling_idle_rule_version.lead_max_hours`, `scheduling_idle_rule_version.max_offers_per_consumer_week`, `scheduling_idle_rule_version.enabled`, `scheduling_idle_rule_version.service_ids`, `scheduling_idle_rule_version.professional_ids`, `scheduling_idle_rule_version.weekdays`, `scheduling_idle_rule_version.time_windows`, `scheduling_idle_rule_version.eligible_since_days`, `scheduling_idle_rule_version.valid_from`), validada contra `data-model.md` `idle_platform_limits.lead_min_hours`, `idle_platform_limits.lead_max_hours`, `idle_platform_limits.max_offers_per_week` e `idle_platform_limits.eligible_since_days` (seed versionado no back-office, sem constante no código).
- [ ] T029 [US4] Implementar o scanner no `workers` (a cada 15 min, 500 tenants em ≤ 2 min) em `services/scheduling/src/idle/scanner.ts`, lendo o consentimento só pela interface `OfferConsent` e pulando tenant suspenso e filial pausada.
- [ ] T030 [US4] Implementar o preço com desconto congelado no aceite (009) em `services/scheduling/src/idle/pricing.ts`. A comissão usa a base da [D17]. Em combo, o desconto é rateado por etapa pelo rateio da 006 (REQ-CAT-034).
- [ ] T031 [US4] Implementar as rotas `/v1/tenant/idle-rule` e `/v1/admin/idle-limits` em `services/scheduling/src/http/idle.ts`.
- [ ] T032 [P] [US4] Implementar a tela P08 (Regra de horário ocioso) em `apps/tenant-web/src/routes/idle-rule/`, com a taxa e um exemplo do líquido (REQ-FIL-034), e a tela nova de limites e taxa em `apps/admin-web/src/routes/idle-limits/`.

**Checkpoint**: horário ocioso vira oferta controlada.

---

## Phase 7: User Story 5 - Consumidor escolhe receber ofertas (Priority: P2)

**Goal**: opt-in explícito por estabelecimento e canal, oferecido na confirmação, gerido no perfil, com descadastro em um clique e registro da versão do texto.

**Independent Test**: aceitar ofertas por push depois de um agendamento, receber uma oferta, desligar e não receber mais (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T033 [P] [US5] Teste de contrato de `setOfferOptins` em `services/scheduling/src/http/optins.contract.test.ts`.
- [ ] T034 [P] [US5] Teste de integração em `services/scheduling/src/idle/optin.int.test.ts`:
  - o padrão é sem opt-in;
  - o registro guarda estabelecimento, canal, versão do texto e horário (`data-model.md` `scheduling_offer_optin.text_version`, `scheduling_offer_optin.opted_in_at`; REQ-FIL-042);
  - o descadastro em um clique grava `data-model.md` `scheduling_offer_optin.opted_out_at`;
  - canal `whatsapp` é recusado (CONST 5);
  - a preferência aparece no perfil global sem que um tenant veja a de outro (REQ-FIL-060).

### Implementation for User Story 5

- [ ] T035 [US5] Implementar o opt-in e o espelho nas preferências da 011 em `services/scheduling/src/idle/optin.ts`, mais a rota `/v1/consumer/offer-optins`. Atrás da interface `OfferConsent` (provisória até a 028 migrar para `engagement_marketing_consent`); grava `data-model.md` `scheduling_offer_optin.device` e `scheduling_offer_optin.opted_out_at`; canais só `push`, `sms` e `email`.
- [ ] T036 [P] [US5] Acrescentar a pergunta de opt-in na confirmação (C12/W14) e a seção "ofertas" em Perfil e notificações (C18/W20) nos apps.

**Checkpoint**: ofertas só com consentimento.

---

## Phase 8: User Story 6 - Taxa de horário ocioso e resultado (Priority: P3)

**Goal**: taxa da Koovela sobre o que vem de horário ocioso, concluído e pago. Nenhuma taxa nem desconto no que vem só da fila. Painel de resultado da regra.

**Independent Test**: com agendamentos vindos da regra, conferir receita, descontos, taxa e comparação no painel (quickstart §4).

### Tests for User Story 6 ⚠️

- [ ] T037 [P] [US6] Teste de contrato de `idleResults` em `services/scheduling/src/http/idle-results.contract.test.ts`.
- [ ] T038 [P] [US6] Teste de integração em `services/scheduling/src/idle/fee.int.test.ts`:
  - `idle_offer` concluído e pago gera `koovela_idle_fee` no split da 012, ou na fatura quando o pagamento é no local (REQ-FIL-050);
  - origem `waitlist` sem oferta da regra não tem desconto nem taxa (REQ-FIL-051, SC-006).

### Implementation for User Story 6

- [ ] T039 [US6] Marcar a origem `idle_offer` no agendamento e repassá-la à 012 para a parte `koovela_idle_fee`, em `services/scheduling/src/idle/fee.ts`.
- [ ] T040 [US6] Implementar o resultado da regra (ofertas enviadas e aceitas, concluídos, receita, descontos e taxa por período) em `services/scheduling/src/idle/results.ts`, com a rota `/v1/tenant/idle-rule/results` (REQ-FIL-052).
- [ ] T041 [P] [US6] Implementar o painel de resultado na P08, com o mês em até 2 toques (SC-007), em `apps/tenant-web/src/routes/idle-rule/Results.tsx`.

**Checkpoint**: resultado e taxa visíveis.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T042 [P] Registrar os casos de isolamento em `services/scheduling/src/waitlist/isolation.cases.ts`: fila, ofertas, regra e opt-ins de outro tenant → 404.
- [ ] T043 [P] Testes com as flags `scheduling.waitlist_v1` e `scheduling.idle_v1` ligadas e desligadas em `services/scheduling/src/waitlist/__tests__/flags.int.test.ts`.
- [ ] T044 [P] Painel Grafana "Fila e horário ocioso" em `infra/observability/dashboards/waitlist-idle.json`: tempo até a oferta, aceite por rodada, ofertas de horário ocioso e conversão.
- [ ] T045 Registrar as telas a conferir ou desenhar (oferta de horário ocioso ao consumidor, painel de resultado, limites no back-office) em `docs/design/telas-sem-prototipo-014.md`.
- [ ] T046 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-014.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1.
- **US3** depende de US1 e pode correr em paralelo com US2.
- **US5** depende da fase 2 e pode correr em paralelo.
- **US4** depende de US5 (opt-in) e de US2 (prioridade da fila).
- **US6** depende de US4 e da 012.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 e T005.
- Depois de US1: US2, US3 e US5 em paralelo.

---

## Parallel Example: User Story 2

```bash
# Testes primeiro, juntos:
Task: "T014 contrato em services/scheduling/src/http/offers.contract.test.ts"
Task: "T015 detector em services/scheduling/src/waitlist/detector.int.test.ts"
Task: "T016 E2E em apps/consumer-web/e2e/waitlist-offer.spec.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (entrar na fila) e US2 (vaga oferecida): é o ciclo mínimo de valor.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US3 (encaixe pela Recepção).
2. US5 → US4 (opt-in antes de ligar as ofertas com desconto).
3. US6 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US5 → US4 → US6 → Polish.

---

## Notes

- Correções do `/speckit-analyze` de 2026-11-27 aplicadas sem tarefa nova. Achado extra na aplicação: o opt-in de ofertas aceitava `whatsapp`, proibido para promoções pela CONST 5; removido.
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-FIL que atende. Campos com restrição citam `data-model.md` e o campo.
- Os avisos da fila são transacionais; as ofertas de horário ocioso exigem opt-in. Em saúde não há desconto.
- Commit por tarefa ou grupo lógico, em branch `014-fila-espera-horario-ocioso`, por PR.
