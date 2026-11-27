---
description: "Lista de tarefas da spec 032 — Destaque pago na vitrine"
---

# Tasks: Destaque pago na vitrine

**Input**: documentos de `specs/032-destaque-pago/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 031 concluídas, com a vitrine (024) aberta.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- lista orgânica idêntica, byte a byte, com e sem destaques ativos (REQ-DST-011, SC-001);
- lint de fronteira: `search/` e `ranking/` não importam `sponsored/`;
- concorrência do último espaço: exatamente uma compra aceita (SC-003);
- 100% dos itens da faixa com o selo, e nenhum preço em saúde (SC-002).

**Organization**: por história de usuário. P1: US1 (comprar) e US2 (faixa separada e identificada). P2: US3 (resultado) e US4 (inventário e preços no back-office). A versão de oferta, o inventário com reserva atômica e a fatura avulsa do `billing` ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US4).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o submódulo `services/discovery/src/sponsored/{offers,inventory,purchase,lifecycle,band,metrics,attribution,http}/`, a pasta `services/billing/src/one-off/` e a pasta `services/workers/src/discovery/sponsored/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/sponsored.openapi.yaml` e `packages/contracts/asyncapi/sponsored-events.asyncapi.yaml` (fonte: `specs/032-destaque-pago/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - compra e cancelamento pelo Proprietário, com reautenticação 2FA e `audit_category`;
  - proposta de oferta pelo Comercial/Growth com aprovação do Fin/Ops pelo `dual_control` da 021 (`kind = sponsored_offer`);
  - publicação direta e reembolso fora da regra só pelo Fin/Ops.

  Declarar a flag `discovery.sponsored` em `packages/contracts/flags/flags.yaml`.
- [ ] T004 [P] Incluir a regra de fronteira de módulo (`search/` e `ranking/` não podem importar `sponsored/`) em `tools/lint/boundaries.config.ts` e no alvo `pnpm lint:boundaries` de `.github/workflows/pr.yml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, resolução da oferta vigente, inventário com reserva atômica e fatura avulsa no `billing`.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste de concorrência (portão de merge) em `services/discovery/src/sponsored/inventory/inventory.concurrency.test.ts`:
  - 20 compras paralelas pelo último espaço → exatamente 1 aceita (`data-model.md` `discovery_sponsored_inventory_day.sold` ≤ `discovery_sponsored_offer_version.capacity`; SC-003);
  - compras sobrepostas não entram em deadlock, porque os dias são reservados em ordem crescente;
  - capacidade reduzida abaixo do vendido não afeta destaques existentes.

  Incluir no filtro `pnpm test:concurrency --filter sponsored`.
- [ ] T006 [P] Teste da resolução de oferta em `services/discovery/src/sponsored/offers/resolve.test.ts`: `data-model.md` `discovery_sponsored_offer_version.scope_kind` resolve do mais específico para o mais geral; sem versão `approved` vigente (`discovery_sponsored_offer_version.effective_from`), o destaque não é oferecido; nenhum valor de preço existe no código.
- [ ] T007 [P] Teste da cobrança avulsa em `services/billing/src/one-off/one-off.int.test.ts`: `createOneOffCharge` é idempotente pelo `sponsorship_id`, cria `billing_invoice.kind = one_off` com item `usage:sponsored_slot`, cobra no cartão recorrente ou gera Pix, emite a nota da Koovela (017) e `refundOneOffCharge` estorna e cancela ou credita a nota.

### Implementação da fundação

- [ ] T008 Criar a migração `services/discovery/migrations/0032_sponsored.ts` em `koovela_discovery`, com:
  - `discovery_sponsored_offer_version`: CHECK em `data-model.md` `discovery_sponsored_offer_version.scope_kind` e `discovery_sponsored_offer_version.state`, e `discovery_sponsored_offer_version.packages` com `price_cents` > 0;
  - `discovery_sponsored_inventory_day`: PK composta e CHECK `sold ≥ 0`;
  - `discovery_sponsorship`: CHECK em `discovery_sponsorship.state` e `discovery_sponsorship.pause_reason`, com `discovery_sponsorship.price_cents_paid` congelado;
  - `discovery_sponsorship_transition`: CHECK em `discovery_sponsorship_transition.actor_type`;
  - `discovery_sponsored_daily_stats` e `discovery_sponsored_attribution`, sem nenhuma coluna de consumidor.
- [ ] T009 [P] Criar a migração `services/billing/migrations/0032_one_off.ts` com `billing_invoice.kind` (`cycle` \| `one_off`) e os itens com `source_kind` e `source_id`, conforme o `data-model.md` da 019 (`billing_invoice.kind`, item `usage:sponsored_slot`).
- [ ] T010 Implementar a resolução da oferta vigente (`data-model.md` `discovery_sponsored_offer_version.version_id`, `discovery_sponsored_offer_version.region_id`, `discovery_sponsored_offer_version.city_ibge`, `discovery_sponsored_offer_version.category`, `discovery_sponsored_offer_version.free_cancel_hours`) em `services/discovery/src/sponsored/offers/resolve.ts`, mais uma semente com versões fictícias só para o ambiente local em `tools/seed-discovery/src/sponsored-offers.ts`.
- [ ] T011 Implementar a reserva e a liberação do inventário dia a dia (`UPDATE … WHERE sold < capacity` com `INSERT … ON DUPLICATE KEY`, em ordem crescente de data, numa transação) e a disponibilidade dos próximos 90 dias em `services/discovery/src/sponsored/inventory/inventory.ts`.
- [ ] T012 Implementar a fatura avulsa, a cobrança e o estorno (`/internal/billing/one-off-charges*`) pelo `PaymentProvider` (012) e pelo `FiscalProvider` (017) em `services/billing/src/one-off/one-off.ts`, publicando `billing.sponsored_slot.charged.v1` e `billing.sponsored_slot.refunded.v1`.

**Checkpoint**: o inventário nunca é vendido além da capacidade e a cobrança é idempotente.

---

## Phase 3: User Story 1 - Comprar um destaque para o bairro e a categoria (Priority: P1) 🎯 MVP

**Goal**: por filial, escolher bairro, categoria, pacote e início, dentro do inventário. Só negócios elegíveis compram. A cobrança é na hora, com 2FA e nota da Koovela. Pix tem reserva de 15 min. Cancelamento até 48 h antes tem reembolso integral.

**Independent Test**: comprar 7 dias em "manicure, Pinheiros" começando na semana seguinte e conferir a reserva e a cobrança (quickstart §2 e §5).

### Tests for User Story 1 ⚠️

- [ ] T013 [P] [US1] Teste de contrato de `getSponsoredOptions`, `getSponsoredAvailability`, `listSponsorships`, `purchaseSponsorship` e `cancelSponsorship` em `services/discovery/src/sponsored/http/tenant.contract.test.ts`.
- [ ] T014 [P] [US1] Teste da saga em `services/discovery/src/sponsored/purchase/purchase.int.test.ts`:
  - a elegibilidade exige participação `active`, perfil completo, assinatura fora de `past_due`/`restricted`/`suspended`/`ended`, filial dentro da região e da categoria, e oferta vigente, com o código do motivo quando falha (REQ-DST-004);
  - sem 2FA, a compra é recusada;
  - cartão → `reserved`, com `data-model.md` `discovery_sponsorship.billing_invoice_id`;
  - Pix expirado (`discovery_sponsorship.hold_expires_at`) ou falha → `expired` e inventário liberado;
  - a compra leva ≤ 2 min (SC-004).
- [ ] T015 [P] [US1] Teste do cancelamento em `services/discovery/src/sponsored/lifecycle/cancel.int.test.ts`: até `discovery_sponsorship.free_cancel_hours` antes do início (00:00 em America/Sao_Paulo; valor inicial 48) → `cancelled`, estorno integral, inventário liberado e `discovery_sponsorship.refunded_cents`; depois → `sponsored.cancel_window_closed`; com uma versão de oferta de 24 h, vale o prazo congelado na compra.

### Implementation for User Story 1

- [ ] T016 [US1] Implementar a elegibilidade em `services/discovery/src/sponsored/purchase/eligibility.ts`, usando os contratos de 024 (participação e região) e 019 (`getEntitlements`).
- [ ] T017 [US1] Implementar a saga de compra pelo outbox (validar → reservar → `pending_payment` → cobrar → `reserved` | `expired`) em `services/discovery/src/sponsored/purchase/purchase.ts`, com `data-model.md` `discovery_sponsorship.offer_version_id`, `discovery_sponsorship.package_code`, `discovery_sponsorship.duration_days`, `discovery_sponsorship.free_cancel_hours`, `discovery_sponsorship.starts_on`, `discovery_sponsorship.ends_on`, `discovery_sponsorship.tenant_id`, `discovery_sponsorship.business_id`, `discovery_sponsorship.branch_id`, `discovery_sponsorship.region_id`, `discovery_sponsorship.category`, `discovery_sponsorship.purchased_by` e `discovery_sponsorship.purchased_at`.
- [ ] T018 [US1] Implementar o cancelamento em `services/discovery/src/sponsored/lifecycle/cancel.ts`, com o prazo congelado em `data-model.md` `discovery_sponsorship.free_cancel_hours` e `discovery_sponsorship.cancelled_at`, registrando cada transição em `discovery_sponsorship_transition` (`discovery_sponsorship_transition.from_state`, `discovery_sponsorship_transition.to_state`, `discovery_sponsorship_transition.reason`, `discovery_sponsorship_transition.actor_id`, `discovery_sponsorship_transition.occurred_at`) e na trilha (004) (REQ-DST-034).
- [ ] T019 [US1] Implementar as rotas `/v1/tenant/discovery/sponsored*` em `services/discovery/src/sponsored/http/tenant.ts`.
- [ ] T020 [P] [US1] Implementar a tela "Destaque na vitrine" (opções, calendário, compra com 2FA e QR do Pix, cancelamento) em `apps/tenant-web/src/routes/discovery/destaque/`.

**Checkpoint**: o negócio compra destaque sem estourar o inventário.

---

## Phase 4: User Story 2 - Consumidor vê o destaque separado e identificado (Priority: P1)

**Goal**: faixa "Patrocinado" separada de `results`, com selo e explicação, os mesmos filtros da busca e rotação justa. A lista orgânica não muda. O ciclo de vida diário ativa, pausa e encerra os destaques; região fechada gera reembolso proporcional e moderação tem compensação.

**Independent Test**: busca com dois destaques ativos mostra a faixa marcada, e a lista orgânica é idêntica à da busca sem destaques (quickstart §3 e §5).

### Tests for User Story 2 ⚠️

- [ ] T021 [P] [US2] Teste de invariância orgânica (portão de merge) em `services/discovery/src/search/__tests__/organic-invariance.property.test.ts`: o mesmo conjunto de buscas, com e sem destaques ativos, devolve `results` idênticos byte a byte (SC-001). Incluir no filtro `pnpm test:organic-invariance --filter discovery`.
- [ ] T022 [P] [US2] Teste de contrato da faixa (portão de merge) em `services/discovery/src/sponsored/band/band.contract.test.ts`:
  - 100% dos itens têm `sponsored: true` e o selo;
  - item de saúde vem sem preço e sem nota (PEN-06);
  - busca fora da região ou com categoria ambígua → faixa vazia e não renderizada;
  - os filtros da busca restringem a faixa (REQ-DST-013);
  - com 5 destaques e 3 visíveis, cada um aparece em cerca de 60% das exibições (REQ-DST-012).
- [ ] T023 [P] [US2] Teste do ciclo de vida com relógio simulado em `services/discovery/src/sponsored/lifecycle/lifecycle.int.test.ts`:
  - à 00:00 em America/Sao_Paulo, `reserved` → `active` e, depois do último dia, → `ended`;
  - saída da vitrine, despublicação, `slots_next_7d = 0` ou assinatura suspensa → `paused` com `data-model.md` `discovery_sponsorship.pause_reason`, sem reembolso nem extensão, e volta → `active` (REQ-DST-014);
  - região fechada → `partially_refunded` com estorno proporcional, arredondado a favor do estabelecimento;
  - moderação → `paused` (`moderation`); improcedente → `discovery_sponsorship.ends_on` estendido pelos `discovery_sponsorship.paused_days`, ou crédito na próxima fatura sem inventário contíguo (REQ-DST-033).

### Implementation for User Story 2

- [ ] T024 [US2] Implementar a montagem da faixa (região e categoria da busca, destaques `active` com cache Redis de 60 s invalidado por evento, filtro Meilisearch `branch_id IN [...] AND <filtros>`, rotação por contador Redis por região e categoria, quantidade visível por superfície de `data-model.md` `discovery_sponsored_offer_version.visible_items`) em `services/discovery/src/sponsored/band/band.ts`.
- [ ] T025 [US2] Anexar o campo `sponsored` às respostas de `search` e `home` da 024 depois do pipeline orgânico, sem que `search/` importe `sponsored/` (a composição fica na camada HTTP), em `services/discovery/src/http/public-compose.ts`, somando ≤ 50 ms ao p95.
- [ ] T026 [US2] Implementar o ciclo diário no `workers` e os consumidores de `discovery.participation.changed`, `billing.subscription.changed`, `discovery.region.changed` e das decisões de moderação em `services/workers/src/discovery/sponsored/lifecycle.ts` e `services/discovery/src/sponsored/lifecycle/lifecycle.ts`, publicando `discovery.sponsored_slot.*.v1` (avisados ao Proprietário pela 011, T078).
- [ ] T027 [P] [US2] Implementar o componente `SponsoredBand` (selo com texto e `aria-label` "Patrocinado", região nomeada, "Por que estou vendo isto?") em `apps/consumer-mobile/src/components/SponsoredBand/` e `apps/consumer-web/src/components/SponsoredBand/`.

**Checkpoint**: o destaque aparece separado e sem mexer na lista orgânica.

---

## Phase 5: User Story 3 - Resultado do destaque (Priority: P2)

**Goal**: por dia, exibições, toques, visitas, agendamentos de origem destaque e receita, com atribuição só na mesma sessão e nenhum dado de consumidor. Renovar a partir do dia seguinte ao fim.

**Independent Test**: com eventos sintéticos, conferir exibições, toques, agendamentos e receita (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T028 [P] [US3] Teste de contrato de `registerSponsoredClick`, `confirmSponsoredImpressions` e `getSponsorshipResults` em `services/discovery/src/sponsored/http/metrics.contract.test.ts`.
- [ ] T029 [P] [US3] Teste de integração em `services/discovery/src/sponsored/attribution/attribution.int.test.ts`:
  - o toque devolve um token assinado sem identidade;
  - agendamento na mesma sessão grava `origin_ref = sponsored:<id>` (009), e em sessão nova não conta (REQ-DST-021);
  - `data-model.md` `discovery_sponsored_daily_stats.impressions`, `discovery_sponsored_daily_stats.clicks`, `discovery_sponsored_daily_stats.visits`, `discovery_sponsored_daily_stats.bookings` e `discovery_sponsored_daily_stats.completed_revenue_cents` batem;
  - `discovery_sponsored_attribution` é idempotente por `appointment_id`;
  - nenhum agregado ou evento identifica consumidor;
  - robôs conhecidos são filtrados;
  - o token de toque só passa pela navegação e não fica em cookie nem no armazenamento do aparelho.

### Implementation for User Story 3

- [ ] T030 [US3] Implementar os contadores Redis de exibição e toque (cookieless, beacon em lote no app), o token de atribuição e a descarga por minuto para `discovery_sponsored_daily_stats` em `services/discovery/src/sponsored/metrics/counters.ts` e `services/workers/src/discovery/sponsored/flush.ts`, publicando os eventos agregados.
- [ ] T031 [US3] Incluir o campo opcional `origin_ref` no agendamento da 009 em `services/scheduling/src/appointments/origin.ts`, e implementar o consumidor de atribuição em `services/discovery/src/sponsored/attribution/attribution.ts` (`data-model.md` `discovery_sponsored_attribution.appointment_id`, `discovery_sponsored_attribution.sponsorship_id`, `discovery_sponsored_attribution.tenant_id`, `discovery_sponsored_attribution.day`, `discovery_sponsored_attribution.state`, `discovery_sponsored_attribution.amount_cents`). Registrar a categoria `sponsored_attribution` (5 anos) na tabela da 022 e aplicá-la pelo `applyRetention` do port do `discovery` (T031 da 024).
- [ ] T032 [US3] Implementar `getSponsorshipResults` e as rotas públicas de toque e exibição em `services/discovery/src/sponsored/http/metrics.ts`.
- [ ] T033 [P] [US3] Implementar o resultado diário e "Renovar" (em até 2 toques, SC-005) em `apps/tenant-web/src/routes/discovery/destaque/Results.tsx`, e o envio do token pela faixa até o agendamento em uma tela (024) em `apps/consumer-web/src/lib/sponsored-token.ts`, só no estado da rota ou na URL, sem cookie nem armazenamento local.

**Checkpoint**: o negócio vê o retorno do destaque.

---

## Phase 6: User Story 4 - Inventário e preços no back-office (Priority: P2)

**Goal**: versões de oferta por região e categoria com aprovação dupla e sem valor no código. Ocupação por dia, taxa de ocupação e receita. Reembolso fora da regra pelo Fin/Ops.

**Independent Test**: 3 espaços para "manicure, Pinheiros" com pacotes de 7 e 30 dias; conferir a ocupação depois de duas compras (quickstart §1).

### Tests for User Story 4 ⚠️

- [ ] T034 [P] [US4] Teste de contrato de `listSponsoredOffers`, `proposeSponsoredOffer`, `approveSponsoredOffer`, `getSponsoredOccupancy` e `refundSponsorshipOutsideRule` em `services/discovery/src/sponsored/http/admin.contract.test.ts`.
- [ ] T035 [P] [US4] Teste de integração em `services/discovery/src/sponsored/offers/offers.int.test.ts`:
  - a proposta do Comercial/Growth fica `proposed` até a aprovação do Fin/Ops (`data-model.md` `discovery_sponsored_offer_version.requested_by`, `discovery_sponsored_offer_version.approved_by`);
  - a aprovação torna a versão anterior `superseded`;
  - mudança de preço não altera `discovery_sponsorship.price_cents_paid` (REQ-DST-032);
  - a ocupação (`Σ sold / Σ capacity`) e a receita (faturas avulsas pagas menos estornos) batem;
  - o reembolso fora da regra só pelo Fin/Ops, auditado.

### Implementation for User Story 4

- [ ] T036 [US4] Implementar proposta, aprovação pelo `dual_control` da 021 (`kind = sponsored_offer`) e publicação direta pelo Fin/Ops em `services/discovery/src/sponsored/offers/offers.ts`.
- [ ] T037 [US4] Implementar a ocupação, a receita e o reembolso fora da regra em `services/discovery/src/sponsored/http/admin.ts`.
- [ ] T038 [P] [US4] Implementar a parte de inventário da tela "Parceiros e inventário de destaques" (versões, capacidade, itens visíveis, heatmap de ocupação, receita, lista com reembolso) em `apps/admin-web/src/routes/discovery/destaques/`.

**Checkpoint**: a Gestão controla oferta, preço e ocupação.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T039 [P] Caso de isolamento em `tests/isolation/cases/sponsored.ts`: um tenant não vê destaques nem resultados de outro.
- [ ] T040 [P] Testes com a flag `discovery.sponsored` ligada e desligada (desligada → nenhuma faixa e nenhuma oferta) em `services/discovery/src/sponsored/__tests__/flags.int.test.ts`, e axe AA da faixa em `apps/consumer-web/e2e/sponsored-band-a11y.spec.ts`.
- [ ] T041 [P] Painel Grafana "Destaques" (ocupação, receita, falhas de cobrança, latência da faixa, cliques em ≤ 100 ms p95) em `infra/observability/dashboards/sponsored.json`, e mapas de ingestão do BI (receita e renovação) em `bi/ingest/mappings/sponsored.yaml`.
- [ ] T042 Registrar as telas a conferir na DF 9.11 em `docs/design/telas-sem-prototipo-032.md`, e a regra de nota no estorno (cancelamento dentro do prazo do município, nota de crédito ou abatimento fora dele) e a dependência da PEN-30 (venda só começa com a primeira oferta publicada) em `docs/ops/decisions/destaque-pago.md`.
- [ ] T043 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-032.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2. Para testar, usa a semente de ofertas da T010.
- **US2** depende de US1 (destaques comprados).
- **US3** depende de US2 (faixa exibida).
- **US4** depende da fase 2 e pode correr em paralelo com US1.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Fundação: T005 a T007 e T009.
- US1 e US4 em paralelo depois da fase 2.

---

## Parallel Example: User Story 2

```bash
Task: "T021 invariância orgânica"
Task: "T022 contrato da faixa"
Task: "T023 ciclo de vida"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (compra) e US2 (faixa e ciclo de vida). Comprar sem exibir não entrega valor.
3. **Parar e validar** com o quickstart §2, §3 e §5.

### Incremental Delivery

1. US4 (ofertas reais no back-office), que é a condição para a venda começar (PEN-30).
2. US3 (resultado).
3. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US4 → US3 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-DST que atende. Campos com restrição citam `data-model.md` e o campo.
- A lista orgânica não sabe da faixa: separação de código (lint) e teste de invariância.
- Nenhum preço no código; sem versão de oferta aprovada, o destaque não é vendido.
- Commit por tarefa ou grupo lógico, em branch `032-destaque-pago`, por PR.
- Análise de 2026-11-27: `free_cancel_hours` na versão da oferta (CONST 8); campos citados; aprovação pelo `dual_control` da 021; token de atribuição só na navegação; retenção da atribuição pela 022; modelos da 019 (`billing_invoice.kind`) e da 009 (`origin_ref`) atualizados. Avisos na 011 (T078). Sem tarefas novas nesta spec.
