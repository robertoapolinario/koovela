---
description: "Lista de tarefas da spec 035 — Eventos: propostas, contratos e sinal"
---

# Tasks: Eventos — propostas, contratos e sinal

**Input**: documentos de `specs/035-eventos-propostas-contratos/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 034 concluídas, especialmente 033 (`quotes`).

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- concorrência da pré-reserva: nunca mais pré-reservas ou confirmações que a capacidade, e evento de vários dias reserva tudo ou nada (SC-001);
- 100% dos contratos confirmados com PDF e evidências do aceite (SC-003);
- cancelamento em até 7 dias do aceite devolve 100% (SC-004);
- Σ parcelas = total e Σ estornos ≤ Σ pago.

**Organization**: por história de usuário. P1: US1 (configurar o fornecedor), US2 (proposta com pré-reserva) e US3 (aceite, contrato e sinal). P2: US4 (saldo, cancelamento e realização). A reserva de datas e os pacotes de documentos e assinatura ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US4).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar as pastas `services/quotes/src/events/{settings,blocks,availability}/`, `services/quotes/src/{proposals,date-holds,contracts,amendments,installments,cancellations}/`, `services/workers/src/quotes/{expiry,reminders,render-pdf,auto-fulfill}/`, `packages/platform/signature/` e `packages/platform/documents/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/events.openapi.yaml` e `packages/contracts/asyncapi/events-events.asyncapi.yaml` (fonte: `specs/035-eventos-propostas-contratos/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - configuração, modelo de contrato, bloqueios e propostas pelo Proprietário e pelo Gerente;
  - cancelamento pelo fornecedor e aditivos só pelo Proprietário, com `audit_category`;
  - aceite, pagamento e cancelamento pelo consumidor `self`, maior de 18 anos;
  - revisão jurídica do modelo base pela Gestão.

  Declarar as flags `quotes.events` (só liga com um modelo base revisado) e `quotes.advanced_signature` (desligada até a escolha do provedor) em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: migrações, reserva de datas com garantia no banco, gerador de PDF e porta de assinatura.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de concorrência (portão de merge) em `services/quotes/src/date-holds/date-holds.concurrency.test.ts`:
  - propostas simultâneas para a última vaga → exatamente 1 pré-reserva, pela PK de `data-model.md` `quotes_date_slot` (`slot_no` de 1 a `quotes_event_settings_version.capacity`);
  - evento de vários dias reserva tudo ou nada (SC-001);
  - para profissional, as células do período são ocupadas na 008 (`quotes_date_hold.occupancy_id`).
- [ ] T005 [P] Teste do gerador de documentos em `packages/platform/documents/src/__tests__/render.test.ts`: Markdown restrito → HTML → PDF é determinístico (mesmo `sha256` para a mesma entrada), sem HTML arbitrário, e os campos automáticos são preenchidos.

### Implementação da fundação

- [ ] T006 Criar a migração de tenant `services/quotes/migrations/tenant/0002_events.ts` com:
  - `quotes_event_settings_version`: CHECK em `data-model.md` `quotes_event_settings_version.unit`, `quotes_event_settings_version.capacity` ≥ 1, `quotes_event_settings_version.deposit_kind`, `quotes_event_settings_version.deposit_bps`, `quotes_event_settings_version.balance_max_installments` e `quotes_event_settings_version.validity_days`;
  - `quotes_date_block`;
  - a extensão de `quotes_request` para `kind = event`, com `event_location` cifrado e `description` até 2.000;
  - `quotes_proposal` (CHECK em `quotes_proposal.state`) e `quotes_proposal_version` (imutável);
  - `quotes_date_slot` (PK composta) e `quotes_date_hold` (CHECK em `quotes_date_hold.state` e `quotes_date_hold.release_reason`);
  - `quotes_contract_template_version`;
  - `quotes_contract`: CHECK em `quotes_contract.state` e `quotes_contract.signature_mode`, com `consumer_full_name` e `consumer_cpf` cifrados;
  - `quotes_contract_acceptance` (append-only, sem UPDATE nem DELETE);
  - `quotes_contract_amendment`: CHECK em `quotes_contract_amendment.state`;
  - `quotes_installment`: CHECK em `quotes_installment.kind` e `quotes_installment.state`;
  - `quotes_cancellation`.
- [ ] T007 [P] Criar a migração `services/platform/migrations/0035_contract_base.ts` com `quotes_contract_base_version` (`data-model.md` `quotes_contract_base_version.legal_reviewed_by`, `quotes_contract_base_version.legal_reviewed_at`), e a projeção `consumer_events_index` em `services/quotes/migrations/projections/0002_consumer_events_index.ts`.
- [ ] T008 Implementar a reserva de datas (slots por unidade em ordem fixa numa transação, ocupação na 008 para profissional, liberação idempotente) em `services/quotes/src/date-holds/date-holds.ts`, publicando `quotes.date_hold.*.v1`.
- [ ] T009 [P] Extrair o gerador de documentos (Markdown restrito → HTML → PDF pelo Chromium headless) da 018 para `packages/platform/documents/src/render.ts` e atualizar o uso na 018.
- [ ] T010 [P] Implementar a porta `SignatureProvider` com adaptador `fake` em `packages/platform/signature/src/index.ts`, atrás da flag `quotes.advanced_signature`.

**Checkpoint**: datas nunca vendidas em dobro e documentos reprodutíveis.

---

## Phase 3: User Story 1 - Configurar o fornecedor de eventos (Priority: P1) 🎯 MVP

**Goal**: unidade (dia inteiro ou períodos) e capacidade por filial ou profissional, sinal, parcelas do saldo, faixas de cancelamento, modelo de contrato a partir do modelo base, e bloqueio de datas.

**Independent Test**: períodos "tarde" e "noite", capacidade 1, sinal de 30% e um modelo de contrato; conferir a pré-visualização com campos preenchidos (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Teste de contrato de `listEventSettings`, `setEventSettings`, `blockDate`, `getContractTemplate`, `saveContractTemplate` e `previewContract` em `services/quotes/src/events/settings/settings.contract.test.ts`.
- [ ] T012 [P] [US1] Teste de integração em `services/quotes/src/events/settings/settings.int.test.ts`:
  - até 6 `data-model.md` `quotes_event_settings_version.periods`;
  - com `scope_kind = professional`, a capacidade é sempre 1;
  - sinal percentual entre 1.000 e 5.000 bps;
  - faixas de cancelamento que contrariem o REQ-EVT-032 são recusadas;
  - modelo base sem revisão jurídica não pode ser usado;
  - nova versão não altera propostas enviadas.

### Implementation for User Story 1

- [ ] T013 [US1] Implementar a configuração versionada (`data-model.md` `quotes_event_settings_version.cancel_tiers`, `quotes_event_settings_version.advanced_signature_above_cents`, `quotes_event_settings_version.accepts_short_notice`, `quotes_event_settings_version.balance_due_days_before`) e os bloqueios em `services/quotes/src/events/settings/settings.ts` e `services/quotes/src/events/blocks/blocks.ts`.
- [ ] T014 [US1] Implementar o modelo de contrato do fornecedor (`data-model.md` `quotes_contract_template_version.extra_clauses_md` sobre `quotes_contract_template_version.base_version`) e a pré-visualização em `services/quotes/src/contracts/template.ts`.
- [ ] T015 [US1] Implementar as rotas de configuração em `services/quotes/src/events/settings/http.ts`.
- [ ] T016 [P] [US1] Implementar as telas de configuração, modelo de contrato e calendário de bloqueios em `apps/tenant-web/src/routes/eventos/configuracao/`, `apps/tenant-web/src/routes/eventos/modelo/` e `apps/tenant-web/src/routes/eventos/calendario/`.

**Checkpoint**: o fornecedor está pronto para receber pedidos.

---

## Phase 4: User Story 2 - Pedir proposta e receber com a data pré-reservada (Priority: P1)

**Goal**: o consumidor vê a disponibilidade (livre, em negociação, ocupada) e pede pela `quote_request` da 033. A proposta com itens, sinal, parcelas e validade pré-reserva a data. Nova versão substitui a anterior, e a pré-reserva cai ao vencer, com aviso 24 h antes.

**Independent Test**: pedido para sábado à noite, proposta com 3 itens e sinal de 30%; um segundo pedido vê a data "em negociação" (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T017 [P] [US2] Teste de contrato de `getEventAvailability`, `sendProposal`, `withdrawProposal`, `getEventCalendar`, `getMyProposal`, `requestProposalChanges` e `declineProposal` em `services/quotes/src/proposals/proposals.contract.test.ts`.
- [ ] T018 [P] [US2] Teste de integração em `services/quotes/src/proposals/proposals.int.test.ts`:
  - a disponibilidade nunca revela quem ocupa;
  - o pedido usa `quotes_request` com até 3 `date_options`;
  - `data-model.md` `quotes_proposal_version.total_cents` = Σ itens, e Σ `quotes_proposal_version.installments` = total − `quotes_proposal_version.deposit_cents`;
  - o sinal fica dentro da regra congelada (`quotes_proposal_version.settings_version_id`);
  - nova versão leva a anterior a `superseded`, mantém a pré-reserva se a data não mudou e libera com `superseded_date` se mudou;
  - aviso 24 h antes de `quotes_proposal_version.valid_until` e liberação com `expired`;
  - montar e enviar uma proposta de 5 itens leva até 5 minutos (SC-005).

### Implementation for User Story 2

- [ ] T019 [US2] Implementar a disponibilidade e a extensão do pedido da 033 para `kind = event` em `services/quotes/src/events/availability/availability.ts` e `services/quotes/src/requests/event-request.ts`.
- [ ] T020 [US2] Implementar a proposta versionada com pré-reserva, retirada, pedido de mudança e recusa em `services/quotes/src/proposals/proposals.ts`, publicando `quotes.proposal.*.v1`.
- [ ] T021 [US2] Implementar a expiração e os avisos de 24 h no `workers` em `services/workers/src/quotes/expiry/proposals.ts` e `services/workers/src/quotes/reminders/proposals.ts`.
- [ ] T022 [P] [US2] Implementar o pedido de evento e a leitura da proposta no app e na web em `apps/consumer-mobile/src/app/eventos/` e `apps/consumer-web/src/routes/eventos.tsx`, e a montagem da proposta no painel em `apps/tenant-web/src/routes/eventos/propostas/`.

**Checkpoint**: a data fica segura enquanto o consumidor decide.

---

## Phase 5: User Story 3 - Aceitar a proposta, o contrato e pagar o sinal (Priority: P1)

**Goal**: aceite eletrônico simples com reautenticação e evidências, ou avançado acima do valor configurado. Só maiores de 18 com nome completo e CPF. Só o sinal pago confirma a data; sem pagamento em 24 h, o aceite perde efeito. PDF imutável para as duas partes. Sinal com split.

**Independent Test**: aceitar, assinar e pagar o sinal; a data fica confirmada e as duas partes recebem o PDF (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T023 [P] [US3] Teste de contrato de `acceptProposal`, `getMyContract`, `getAcceptanceEvidence` e `signatureWebhook` em `services/quotes/src/contracts/contracts.contract.test.ts`.
- [ ] T024 [P] [US3] Teste de integração (portão de merge) em `services/quotes/src/contracts/contracts.int.test.ts`:
  - sem reautenticação, ou menor de 18, o aceite é recusado;
  - cada aceite grava `data-model.md` `quotes_contract_acceptance.document_sha256`, `quotes_contract_acceptance.auth_time`, `quotes_contract_acceptance.device_fingerprint`, `quotes_contract_acceptance.ip` e `quotes_contract_acceptance.button_text`;
  - `quotes_contract.deposit_due_at` = min(aceite + 24 h, validade); sem pagamento → `void` e pré-reserva liberada;
  - o sinal pago pela 012 com split leva a `active` e a pré-reserva a `confirmed`;
  - `quotes_contract.pdf_sha256` bate com o documento exibido e o PDF vai às duas partes (SC-003);
  - acima de `advanced_signature_above_cents`, o modo é `advanced` pelo `SignatureProvider`;
  - aceitar, assinar e pagar leva até 5 minutos (SC-002).

### Implementation for User Story 3

- [ ] T025 [US3] Implementar o aceite (snapshot de nome e CPF cifrados, evidências append-only, modo de assinatura) e o contrato em `services/quotes/src/contracts/accept.ts`, publicando `quotes.contract.signed.v1`.
- [ ] T026 [US3] Implementar as parcelas (sinal e saldo) e o pagamento do sinal pela 012 com split em `services/quotes/src/installments/installments.ts`, publicando `payments.event_installment.*.v1`, e a anulação por sinal não pago no `workers` em `services/workers/src/quotes/expiry/deposits.ts`.
- [ ] T027 [US3] Implementar a geração do PDF do contrato com as evidências, guardado com retenção de 5 anos e bloqueio, no `workers` em `services/workers/src/quotes/render-pdf/contract.ts`.
- [ ] T028 [US3] Implementar as rotas de aceite, leitura, evidências e webhook de assinatura em `services/quotes/src/contracts/http.ts`, e a projeção `consumer_events_index` ("Meus eventos") em `services/quotes/src/contracts/index-projection.ts`.
- [ ] T029 [P] [US3] Implementar o aceite com reautenticação, o contrato e o pagamento do sinal em `apps/consumer-mobile/src/app/eventos/contrato.tsx` e `apps/consumer-web/src/routes/eventos.contrato.tsx`, e a lista de contratos no painel em `apps/tenant-web/src/routes/eventos/contratos/`.

**Checkpoint**: data confirmada com contrato válido.

---

## Phase 6: User Story 4 - Saldo, cancelamento e realização do evento (Priority: P2)

**Goal**: parcelas pagas pelo app com aviso 3 dias antes. Simulação antes do cancelamento pelo consumidor, com devolução integral em 7 dias. Cancelamento pelo fornecedor com devolução total e marca na reputação. Aditivos. Realização pelo fornecedor ou automática em 24 h, com convite para avaliação.

**Independent Test**: pagar a primeira parcela e cancelar a 60 dias do evento, conferindo a devolução pela faixa (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T030 [P] [US4] Teste de contrato de `payInstallment`, `simulateConsumerCancel`, `consumerCancel`, `proposeAmendment`, `acceptAmendment`, `vendorCancel` e `markFulfilled` em `services/quotes/src/cancellations/cancellations.contract.test.ts`.
- [ ] T031 [P] [US4] Teste de integração (portão de merge) em `services/quotes/src/cancellations/cancellations.int.test.ts`:
  - em até 7 dias do aceite, devolve 100% do pago (`data-model.md` `quotes_cancellation.within_withdrawal`; SC-004);
  - depois disso, aplica a faixa (`quotes_cancellation.tier_applied`), com a simulação igual ao valor devolvido;
  - Σ `quotes_installment.refunded_cents` ≤ Σ pago;
  - o fornecedor devolve tudo, mais `quotes_contract.vendor_penalty_cents` registrada (liquidada fora da Koovela), com marca na reputação interna (016);
  - toda devolução vai pelo meio do pagamento (012) e para a trilha.
- [ ] T032 [P] [US4] Teste de integração em `services/quotes/src/amendments/amendments.int.test.ts`:
  - contrato `active` só muda por aditivo aceito, com novo PDF e evidência (`data-model.md` `quotes_contract_amendment.pdf_sha256`, `quotes_contract_amendment.delta_cents`);
  - mudança de data no aditivo reserva a nova antes de liberar a antiga;
  - aviso 3 dias antes de cada parcela, e atraso avisa o fornecedor (`quotes_installment.state` = `overdue`);
  - sem marcação, o evento vira `fulfilled` 24 h depois, com convite para avaliação (016).

### Implementation for User Story 4

- [ ] T033 [US4] Implementar o pagamento das parcelas e os avisos de vencimento e atraso em `services/quotes/src/installments/balance.ts` e `services/workers/src/quotes/reminders/installments.ts`.
- [ ] T034 [US4] Implementar a simulação e os cancelamentos pelo consumidor e pelo fornecedor, com estornos idempotentes pela 012 e a marca de reputação (016), em `services/quotes/src/cancellations/cancellations.ts`.
- [ ] T035 [US4] Implementar os aditivos (proposta, aceite com evidência, novo PDF e troca de data) em `services/quotes/src/amendments/amendments.ts`.
- [ ] T036 [US4] Implementar a realização manual e a automática no `workers` em `services/quotes/src/contracts/fulfill.ts` e `services/workers/src/quotes/auto-fulfill/auto-fulfill.ts`, publicando `quotes.contract.fulfilled.v1`.
- [ ] T037 [P] [US4] Implementar as telas de parcelas, simulação, cancelamento e aditivo no app e na web em `apps/consumer-mobile/src/app/eventos/pagamentos.tsx` e `apps/consumer-web/src/routes/eventos.pagamentos.tsx`, e as ações do fornecedor em `apps/tenant-web/src/routes/eventos/contratos/Actions.tsx`.

**Checkpoint**: o ciclo do evento fecha com dinheiro e direitos em ordem.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T038 Atualizar o `HolderDataPort` (022) para pedidos de evento, propostas, contratos e evidências, respeitando a retenção legal de 5 anos dos contratos, em `services/quotes/src/holder-data/port.ts`.
- [ ] T039 [P] Caso de isolamento em `tests/isolation/cases/events.ts`.
- [ ] T040 [P] Testes com as flags `quotes.events` e `quotes.advanced_signature` ligadas e desligadas (`quotes.events` não liga sem modelo base revisado) em `services/quotes/src/events/__tests__/flags.int.test.ts`, e axe nas telas em `apps/consumer-web/e2e/events-a11y.spec.ts`.
- [ ] T041 [P] Métricas (pré-reservas ativas, sinais não pagos, cancelamentos por faixa, atrasos) no painel `infra/observability/dashboards/events.json`, e mapas de ingestão do BI em `bi/ingest/mappings/events.yaml`.
- [ ] T042 Registrar as pendências em `docs/ops/decisions/eventos-contratos.md`:
  - a revisão jurídica do modelo base, que bloqueia o lançamento;
  - a escolha do provedor de assinatura avançada;
  - a multa do fornecedor não cobrada pela Koovela nesta fase, a avaliar com a 036.

  Registrar as telas a conferir (editor de modelo, aditivos, simulação) em `docs/design/telas-sem-prototipo-035.md`.
- [ ] T043 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-035.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1.
- **US3** depende de US2.
- **US4** depende de US3.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004, T005, T007, T009 e T010.
- Dentro de cada história, os testes [P] e as telas [P].

---

## Parallel Example: Foundational

```bash
Task: "T004 concorrência da pré-reserva"
Task: "T005 PDF determinístico"
Task: "T009 pacote de documentos"
Task: "T010 porta de assinatura"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fases 1 e 2.
2. US1 (configuração), US2 (proposta com pré-reserva) e US3 (contrato e sinal). Sem o sinal pago, nenhuma data é confirmada.
3. **Parar e validar** com o quickstart §1 a §3. A flag `quotes.events` só liga com o modelo base revisado.

### Incremental Delivery

1. US4 (saldo, cancelamento, aditivos e realização).
2. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-EVT que atende. Campos com restrição citam `data-model.md` e o campo.
- A lógica de eventos fica no `quotes`; a 008 só é tocada para profissional, pela API de ocupação.
- Contrato `active` é imutável; mudanças só por aditivo aceito com evidência.
- Commit por tarefa ou grupo lógico, em branch `035-eventos-propostas-contratos`, por PR.
