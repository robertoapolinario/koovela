---
description: "Lista de tarefas da spec 019 — Assinatura Koovela e cobrança"
---

# Tasks: Assinatura Koovela e cobrança

**Input**: documentos de `specs/019-assinatura-koovela-cobranca/`, locais e fora do repositório público.

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 018 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes antes do código. São portões de merge:
- a propriedade do total da fatura;
- a idempotência da cobrança;
- o lint de preços fixos no código.

**Organization**: por história de usuário (US1–US5). P1: US1, US2 e US3. P2: US4 e US5.

O modelo de planos versionados fica na fundação, porque a escolha de plano (US1) depende dele. A gestão de planos no back-office fica na US5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/billing/`:
  - `package.json` e `tsconfig.json`;
  - plugin Fastify em `KOOVELA_DOMAINS`;
  - pastas `src/{plans,subscriptions,invoices,usage,charging,dunning,entitlements,admin,http}` e `migrations/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/billing.openapi.yaml` e `packages/contracts/asyncapi/billing-events.asyncapi.yaml` (fonte: `specs/019-assinatura-koovela-cobranca/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações de cobrança em `packages/contracts/rbac/permissions.yaml`:
  - assinatura e forma de pagamento só para o Proprietário, com `sensitive`;
  - planos: Comercial/Growth propõe e Fin/Ops aprova;
  - régua: só Fin/Ops;
  - `audit_category = financial`.

  Declarar a flag `billing.v1` em `packages/contracts/flags/flags.yaml`.
- [ ] T004 [P] Criar a regra de lint `no-hardcoded-prices` em `packages/eslint-config/rules/no-hardcoded-prices.ts`: proíbe literais de preço e taxa em `services/billing/**` e nos demais domínios de dinheiro. Expor como `pnpm lint:no-hardcoded-prices` (REQ-ASS-002, SC-007).
- [ ] T005 [P] Implementar `pnpm koovela clock set` (relógio controlável em dev e teste) em `tools/koovela-cli/src/commands/clock.ts` e `packages/platform/clock/`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, planos versionados, entitlements e idempotência da cobrança.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T006 [P] Teste de propriedade (portão de merge) em `services/billing/src/invoices/totals.property.test.ts`:
  - o total da fatura é igual à soma dos itens cobráveis, em centavos;
  - os itens informativos não entram no total (`data-model.md` `billing_invoice.total_cents`, `billing_invoice_item.amount_cents`, `billing_invoice_item.kind`).

  Requisitos: REQ-ASS-020, SC-002.
- [ ] T007 [P] Teste de idempotência em `services/billing/src/charging/idempotency.int.test.ts`:
  - um item por fonte (`data-model.md` `billing_invoice_item.source_id` + `billing_invoice_item.kind`);
  - a cobrança usa `Idempotency-Key = invoice_id:attempt`, e um reenvio não cobra em duplicidade (`data-model.md` `billing_charge_attempt.idempotency_key`).

  Requisitos: REQ-ASS-022, SC-003.

### Implementação da fundação

- [ ] T008 Criar a migração `services/billing/migrations/0001_billing.ts` em `koovela_platform`, com:
  - `billing_plan` e `billing_plan_version` (imutável; CHECK em `data-model.md` `billing_plan.state` e `billing_plan_version.booking_fee_kind`);
  - `billing_subscription` (UNIQUE `tenant_id`; CHECK em `billing_subscription.state` e `billing_subscription.payment_method`);
  - `billing_invoice` (CHECK em `billing_invoice.state`);
  - `billing_invoice_item` (imutável; CHECK em `data-model.md` `billing_invoice_item.kind`, incluindo `whatsapp_overage` e `one_off`; UNIQUE `(kind, source_id)`);
  - `billing_charge_attempt`;
  - `billing_dunning_policy` (versionada; `data-model.md` `billing_dunning_policy.retry_days`, `billing_dunning_policy.restricted_day`, `billing_dunning_policy.suspended_day`, `billing_dunning_policy.end_warning_day`, `billing_dunning_policy.ended_day`, `billing_dunning_policy.pix_lead_days`, `billing_dunning_policy.card_expiry_notice_days`, `billing_dunning_policy.trial_end_notice_days`, `billing_dunning_policy.price_increase_notice_days`), com seed só dos valores iniciais;
  - `billing_dunning_step` (CHECK em `data-model.md` `billing_dunning_step.step`; UNIQUE `(invoice_id, step, retry_no)`);
  - `billing_usage_counter`, `billing_audit_outbox` e `billing_outbox`.
- [ ] T009 Implementar os planos versionados em `services/billing/src/plans/plans.ts`:
  - preço, faixas, taxa e base, funções, cota de SMS, excedente e política do autônomo (`data-model.md` `billing_plan_version.monthly_price_cents`, `billing_plan_version.tiers`, `billing_plan_version.booking_fee_value`, `billing_plan_version.fee_base`, `billing_plan_version.included_features`, `billing_plan_version.sms_quota`, `billing_plan_version.sms_overage_cents`, `billing_plan_version.whatsapp_quota`, `billing_plan_version.whatsapp_overage_cents`, `billing_plan_version.booking_fee_kind`, `billing_plan_version.solo_policy`);
  - nenhum valor padrão no código;
  - o seed de planos fictícios vale só em dev, em `services/billing/seeds/dev-plans.ts`.
- [ ] T010 Implementar os entitlements com cache Redis invalidado por evento, em ≤ 20 ms p95, em `services/billing/src/entitlements/entitlements.ts`.
  - Dados: plano vigente, faixas, funções incluídas e estado (REQ-ASS-003/051/052).
  - Rota: `GET /v1/internal/billing/entitlements` em `services/billing/src/http/internal.ts`.
- [ ] T011 Implementar o outbox (`billing.subscription.changed`, `billing.invoice.changed`, `billing.plan_version.changed`) em `services/billing/src/events.ts`.

**Checkpoint**: planos e entitlements prontos para as outras specs.

---

## Phase 3: User Story 1 - Escolher o plano e cadastrar o pagamento (Priority: P1) 🎯 MVP

**Goal**: comparar e escolher um plano no onboarding ou no painel; cadastrar cartão recorrente (tokenizado pela 012) ou Pix por fatura, com reautenticação; assinatura ativa ou em degustação; atender a pendência de "assinatura ativa para publicar" da 005.

**Independent Test**: escolher o plano, cadastrar o cartão de teste e conferir a assinatura ativa e a próxima fatura (quickstart §2).

### Tests for User Story 1 ⚠️

- [ ] T012 [P] [US1] Teste de contrato de `getMySubscription`, `listAvailablePlans`, `simulateCost` e `setPaymentMethod` em `services/billing/src/http/subscription.contract.test.ts`.
- [ ] T013 [P] [US1] Teste de integração em `services/billing/src/subscriptions/create.int.test.ts`:
  - forma de pagamento com reautenticação e auditoria (REQ-ASS-011);
  - nenhum dado de cartão fora do PSP (`data-model.md` `billing_subscription.psp_card_token`);
  - ciclo ancorado na ativação (`data-model.md` `billing_subscription.cycle_anchor_day`);
  - degustação em `trialing` com aviso no prazo de `data-model.md` `billing_dunning_policy.trial_end_notice_days` (`billing_subscription.trial_ends_at`; REQ-ASS-015);
  - degustação que termina sem forma de pagamento segue a régua a partir do primeiro vencimento;
  - cartão a vencer antes do próximo vencimento gera `billing.subscription.card_expiring.v1` no prazo de `billing_dunning_policy.card_expiry_notice_days`;
  - o Gerente não vê nada da assinatura (403); o Suporte só lê em sessão de suporte.
- [ ] T014 [P] [US1] Teste E2E em `apps/tenant-web/e2e/plan-choice.spec.ts`: escolher o plano e cadastrar o cartão em até 3 min (SC-001), com axe.

### Implementation for User Story 1

- [ ] T015 [US1] Implementar a criação da assinatura e a troca de forma de pagamento em `services/billing/src/subscriptions/subscriptions.ts`, com tokenização pela 012 (REQ-ASS-010/011; `data-model.md` `billing_subscription.plan_version_id`, `billing_subscription.current_cycle_start`, `billing_subscription.current_cycle_end`). Job diário de cartão a vencer e de fim de degustação, com os prazos de `billing_dunning_policy`.
- [ ] T016 [US1] Implementar as rotas `/v1/tenant/billing/subscription`, `/plans` e `/payment-method` em `services/billing/src/http/subscription.ts`.
- [ ] T017 [P] [US1] Implementar a escolha de plano no onboarding em `apps/tenant-web/src/routes/onboarding/plan/` e a tela "Assinatura Koovela e faturas" em `apps/tenant-web/src/routes/settings/billing/`. Pelo menos plano, simulação de custo (`simulateCost`: assinatura + taxas estimadas com os agendamentos do último mês ou um número informado), cotas de SMS e WhatsApp, política do autônomo (`data-model.md` `billing_plan_version.solo_policy`) e forma de pagamento.

**Checkpoint**: tenant com assinatura ativa.

---

## Phase 4: User Story 2 - Fatura mensal clara e paga sem esforço (Priority: P1)

**Goal**: fatura do ciclo montada por eventos. Ela inclui:
- assinatura e proporcional;
- taxa por agendamento no local (cobrada) e retida no split (informativa);
- excedente de SMS;
- descontos e créditos;
- itens de uso extensíveis.

A cobrança é idempotente: cartão no vencimento e Pix 5 dias antes. A fatura paga gera a nota da Koovela, e o estorno depois do fechamento vira crédito.

**Independent Test**: fechar o ciclo e conferir itens, total, cobrança, nota e aviso (quickstart §3).

### Tests for User Story 2 ⚠️

- [ ] T018 [P] [US2] Teste de contrato de `listMyInvoices`, `getMyInvoice` e `payInvoiceNow` em `services/billing/src/http/invoices.contract.test.ts`.
- [ ] T019 [P] [US2] Teste de integração em `services/billing/src/invoices/cycle.int.test.ts`:
  - taxas: no local cobradas; retidas no split como informativas, com zero no total (REQ-ASS-021);
  - excedentes de SMS e de WhatsApp transacionais a partir de `notification` (`data-model.md` `billing_usage_counter.count`, `billing_usage_counter.metric`); SMS de OTP nunca conta;
  - fatura de valor zero (degustação, concessão total) é gerada sem cobrança e sem nota;
  - estorno de pagamento com taxa retida no split: a 012 devolve a taxa e a fatura não gera crédito em dobro;
  - descontos e concessões da 021 entram como itens `discount` e `concession`;
  - reprocessar os eventos não duplica itens;
  - estorno depois do fechamento gera crédito na fatura seguinte (REQ-ASS-025);
  - cartão cobrado no vencimento; Pix enviado 5 dias antes (`data-model.md` `billing_invoice.pix_sent_at`);
  - fatura paga e maior que zero gera nota da Koovela pelo `FiscalProvider` da 017 (`data-model.md` `billing_invoice.fiscal_invoice_ref`; REQ-ASS-023);
  - item `usage:<code>` aceito sem migração (REQ-ASS-026).

### Implementation for User Story 2

- [ ] T020 [US2] Implementar o acúmulo de itens por evento em `services/billing/src/usage/accumulate.ts`. Fontes: `payments.payment.*`, `scheduling.appointment.state_changed` e `notification.delivery.*` (só SMS e WhatsApp transacionais faturáveis; OTP fora), gravando em `data-model.md` `billing_usage_counter.metric` e `billing_usage_counter.cycle_start`.
- [ ] T021 [US2] Implementar o fechamento do ciclo (`open` → `issued`, para 500 tenants em ≤ 5 min) e os créditos em `services/billing/src/invoices/cycle.ts` (`data-model.md` `billing_invoice.cycle_start`, `billing_invoice.cycle_end`, `billing_invoice.due_on`, `billing_invoice.paid_at`, `billing_invoice.receipt_ref`; `billing_invoice_item.source_kind`, `billing_invoice_item.quantity`, `billing_invoice_item.info_amount_cents`, `billing_invoice_item.description`). Fatura zero fica `paid` sem cobrança nem nota. Excedentes de SMS e WhatsApp acima de `billing_plan_version.sms_quota` e `billing_plan_version.whatsapp_quota`. No primeiro ciclo que começa a partir de `billing_plan_version.effective_from`, a assinatura passa à versão nova.
- [ ] T022 [US2] Implementar a cobrança pelo `PaymentProvider` (cartão no vencimento e Pix `billing_dunning_policy.pix_lead_days` antes, com link pela 011; `data-model.md` `billing_charge_attempt.n`, `billing_charge_attempt.at`, `billing_charge_attempt.method`, `billing_charge_attempt.psp_ref`, `billing_charge_attempt.outcome`) e a emissão da nota pelo `FiscalProvider`, tendo a Koovela como emitente e perfil fiscal próprio no `koovela_platform`, em `services/billing/src/charging/{charge,koovela-invoice}.ts`.
- [ ] T023 [US2] Implementar as rotas `/v1/tenant/billing/invoices*` e `/pay` em `services/billing/src/http/invoices.ts`.
- [ ] T024 [P] [US2] Completar a tela "Assinatura Koovela e faturas" em `apps/tenant-web/src/routes/settings/billing/Invoices.tsx`. Ela mostra o uso do ciclo atual com estimativa, as faturas com estado, a nota e o comprovante, e o detalhe por agendamento tarifado (REQ-ASS-024).

**Checkpoint**: fatura mensal cobrada e com nota.

---

## Phase 5: User Story 3 - Inadimplência com régua clara e suspensão sem surpresa (Priority: P1)

**Goal**:
- novas tentativas nos dias 1, 3 e 5;
- modo restrito no dia 7;
- suspensão pela 002 no dia 15;
- aviso no dia 75 e arquivamento no dia 90;
- reativação em ≤ 5 min ao pagar;
- pausa da régua pelo Fin/Ops;
- nenhum dado apagado.

**Independent Test**: simular uma fatura não paga e avançar o relógio pela régua (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T025 [P] [US3] Teste de integração com relógio simulado em `services/billing/src/dunning/dunning.int.test.ts`:
  - cada etapa roda uma vez e fica registrada (`data-model.md` `billing_dunning_step.step`, `billing_dunning_step.retry_no`, `billing_dunning_step.executed_at`);
  - com uma régua alterada no back-office (ex.: tentativas 2 e 4, restrito no dia 10), os dias seguem a versão nova para atrasos abertos depois dela (`billing_subscription.dunning_policy_version_id`); nenhum prazo vem do código (SC-007);
  - modo restrito bloqueia novas filiais, convites e funções, sem afetar o consumidor (REQ-ASS-031);
  - suspensão pelo comando da 002, mantendo os confirmados (REQ-ASS-032, SC-004);
  - pagamento reativa em ≤ 5 min (REQ-ASS-033, SC-005);
  - pausa respeitada (`data-model.md` `billing_subscription.dunning_paused_until`, `billing_subscription.dunning_pause_reason`; REQ-ASS-034);
  - nenhum dado apagado (REQ-ASS-035, SC-006).

### Implementation for User Story 3

- [ ] T026 [US3] Implementar a régua como máquina de estados diária no `workers` em `services/billing/src/dunning/dunning.ts`, com os dias lidos de `data-model.md` `billing_dunning_policy` (versão congelada em `billing_subscription.dunning_policy_version_id` na abertura do atraso). Usa os comandos de transição da 002 (`suspended`, `archived`), grava `billing_subscription.reactivable_until` = encerramento + 90 dias e publica os eventos que a 011 transforma em avisos (T067 da 011).
- [ ] T027 [US3] Implementar a reativação, que consome o pagamento aprovado e chama `reactivate` da 002 com o motivo `billing_overdue` (só fecha esse motivo; com `fraud` aberto, o tenant continua suspenso — 002 T089), em `services/billing/src/dunning/reactivate.ts`.
- [ ] T028 [US3] Implementar no gateway o bloqueio do modo restrito para criar filial, convidar e ativar função, a partir dos entitlements, em `services/gateway/src/plugins/billing-restriction.ts`.
- [ ] T029 [P] [US3] Implementar os avisos de restrito e suspensão no painel (faixa permanente; em suspensão, só pagar, exportar e suporte) em `apps/tenant-web/src/components/BillingBanner.tsx`.

**Checkpoint**: inadimplência tratada sem surpresa.

---

## Phase 6: User Story 4 - Mudar de plano, de faixa ou cancelar (Priority: P2)

**Goal**:
- subir de plano vale na hora, com proporcional;
- descer vale no próximo ciclo, se o uso couber;
- ultrapassar a faixa bloqueia só o crescimento;
- cancelar vale até o fim do ciclo pago, com suspensão, arquivamento e reativação em até 90 dias.

**Independent Test**: subir no meio do ciclo, tentar exceder a faixa, descer e cancelar (quickstart §2 e §5).

### Tests for User Story 4 ⚠️

- [ ] T030 [P] [US4] Teste de contrato de `changePlan`, `cancelSubscription` e `reactivateSubscription` em `services/billing/src/http/plan-change.contract.test.ts`.
- [ ] T031 [P] [US4] Teste de integração em `services/billing/src/subscriptions/plan-change.int.test.ts`:
  - subir vale na hora, com proporcional na próxima fatura;
  - descer com uso acima da faixa → `billing.usage_exceeds_target_tier`, e descer válido fica em `data-model.md` `billing_subscription.pending_plan_version_id` (REQ-ASS-012);
  - exceder a faixa bloqueia convites e filiais pelos contratos da 005 e da 007 (REQ-ASS-013), contando colaboradores e filiais de todos os negócios do tenant;
  - reativar depois de `reactivable_until` responde erro; antes, recupera tudo;
  - cancelar leva a `cancel_scheduled` até o fim, depois suspensão e arquivamento em 90 dias, com reativação possível (`data-model.md` `billing_subscription.cancel_effective_at`, `billing_subscription.reactivable_until`; REQ-ASS-014).

### Implementation for User Story 4

- [ ] T032 [US4] Implementar a troca de plano e o cancelamento em `services/billing/src/subscriptions/{change,cancel}.ts`, com oferta de exportação pela 022 (`data-model.md` `billing_subscription.plan_version_id`, `billing_subscription.pending_plan_version_id`, `billing_subscription.cancel_effective_at`). As faixas somam todos os negócios do tenant.
- [ ] T033 [US4] Implementar as rotas `/change-plan`, `/cancel` e `/reactivate` em `services/billing/src/http/plan-change.ts`.
- [ ] T034 [P] [US4] Acrescentar à tela de assinatura a troca de plano (com proporcional estimado) e o cancelamento em `apps/tenant-web/src/routes/settings/billing/ChangePlan.tsx`.

**Checkpoint**: autosserviço do plano.

---

## Phase 7: User Story 5 - Gestão de planos e inadimplência no back-office (Priority: P2)

**Goal**: criar e versionar planos com aprovação dupla (aumento com 30 dias de aviso); acompanhar a inadimplência por atraso e valor; acionar pausa, acordo e nova cobrança.

**Independent Test**: criar um plano com vigência futura sem afetar os tenants atuais e pausar a régua de um inadimplente (quickstart §1 e §4).

### Tests for User Story 5 ⚠️

- [ ] T035 [P] [US5] Teste de contrato de `proposePlanVersion`, `approvePlanVersion`, `listDelinquency` e `dunningAction` em `services/billing/src/http/admin.contract.test.ts`.
- [ ] T036 [P] [US5] Teste de integração em `services/billing/src/admin/plans.int.test.ts`:
  - proposta pelo Comercial/Growth exige aprovação do Fin/Ops (REQ-ASS-041);
  - aumento com menos de 30 dias → `billing.increase_notice_too_short` (`data-model.md` `billing_plan_version.effective_from`; REQ-ASS-004);
  - o ciclo em curso não muda;
  - acordo leva a fatura a `cancelled` e cria uma nova;
  - tenants passam à versão nova no primeiro ciclo a partir de `effective_from`, com aviso `billing.plan_version.approved.v1` enviado pela 011;
  - `publishDunningPolicy` só pelo Fin/Ops, auditado; prazo de aviso de aumento lido de `billing_dunning_policy.price_increase_notice_days`.

### Implementation for User Story 5

- [ ] T037 [US5] Implementar a proposta, a aprovação e a vigência de versões de plano em `services/billing/src/admin/plans.ts`, com o `dual_control` da 021 (`kind = plan_change`) (`data-model.md` `billing_plan_version.requested_by`, `billing_plan_version.approved_by`, `billing_plan_version.effective_from`).
- [ ] T038 [US5] Implementar a lista de inadimplência e as ações (pausar, acordo, nova cobrança) em `services/billing/src/admin/delinquency.ts`, e a publicação de versões de `data-model.md` `billing_dunning_policy` (rota `publishDunningPolicy`) em `services/billing/src/admin/dunning-policy.ts`.
- [ ] T039 [US5] Implementar as rotas `/v1/admin/billing/*` em `services/billing/src/http/admin.ts`.
- [ ] T040 [P] [US5] Implementar a G07 (Planos, cobrança e inadimplência) em `apps/admin-web/src/routes/billing/` (REQ-ASS-040).

**Checkpoint**: Gestão controla planos e inadimplência.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T041 [P] Registrar os casos de isolamento em `services/billing/src/isolation.cases.ts`: um tenant nunca lê a assinatura nem as faturas de outro (REQ-ASS-050).
- [ ] T042 [P] Testes com a flag `billing.v1` ligada e desligada em `services/billing/src/__tests__/flags.int.test.ts`.
- [ ] T043 [P] Criar o painel Grafana "Cobrança" em `infra/observability/dashboards/billing.json`, com MRR, faturas por estado, inadimplência por etapa, falhas de cobrança e tempo de reativação.
- [ ] T044 Documentar no contrato o item `usage:<code>` e a fatura avulsa (`kind = one_off`, usada pela 032) como extensões previstas em `docs/dev/contratos-cruzados.md` (REQ-ASS-026).
- [ ] T045 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-019.md`.
- [ ] T046 [P] Implementar a retenção da seção "Dados pessoais" em `services/billing/src/retention/purge.ts` (job no `workers`): `billing_subscription.psp_card_token` apagado na troca e no fim do contrato (com pedido de remoção ao PSP); faturas, itens, tentativas, etapas da régua e uso guardados por 5 anos e depois apagados; dados de cobrança do tenant por contrato + 5 anos (invariante 8 do `data-model.md`; CONST IV, [C4]). Teste em `services/billing/src/retention/purge.int.test.ts`.
  - Prazos e ação ao vencer lidos da tabela de retenção da 022 (`getRetentionRules`, com cache; categorias registradas em `packages/contracts/privacy/holder-ports.yaml`); os números desta tarefa são só os valores iniciais do seed da 022. O job roda pelo `applyRetention` do `HolderDataPort` do domínio, disparado pela 022 (T040 da 022), e nenhum prazo fica no código (CONST 8; análise da 022, 2026-11-27).
- [ ] T047 [P] Consumir `backoffice.grant.changed` (021) em `services/billing/src/subscriptions/grants.ts`, em ≤ 2 min (SC-006 da 021): `trial_days` → estado `trialing` e `billing_subscription.trial_ends_at`; `subscription_discount_pct`/`_cents` → item `discount` por N ciclos; `booking_fee_waiver_days` → taxa por agendamento zerada no período; `one_off_credit` → item `credit`; `ended` e `cancelled` param de aplicar. Teste em `services/billing/src/subscriptions/grants.int.test.ts`.
- [ ] T048 [P] Consumir `payments.gift_card.used.v1` (029) em `services/billing/src/usage/gift-card-fee.ts`: o agendamento concluído pago com vale gera o item `booking_fee_gift_card` na fatura do ciclo, idempotente por agendamento; se parte foi paga pela plataforma e já reteve a taxa no split, não cobra de novo. Teste em `services/billing/src/usage/gift-card-fee.int.test.ts`.
- [ ] T049 [P] Consumir `finance.advance.credited.v1` (036) em `services/billing/src/usage/advance-fee.ts`: soma a taxa da Koovela do mês por tenant em `finance_koovela_fee_ledger`, mostra o item informativo `advance_fee_info` na fatura do ciclo (zero no total, já retida na operação) e emite a nota da Koovela sobre o total do mês pelo `FiscalProvider` (017). Validar com contador quem é o tomador quando a antecipação é do colaborador. Teste em `services/billing/src/usage/advance-fee.int.test.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2 e da 012.
- **US2** depende de US1, da 012, da 017 e da 011.
- **US3** depende de US2 e da 002.
- **US4** depende de US1 e pode correr em paralelo com US2.
- **US5** depende da fase 2 e pode correr em paralelo desde cedo.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T005.
- Fundação: T006 e T007.
- Depois da fase 2: US1 e US5 em paralelo; depois de US1, US2 e US4.

---

## Parallel Example: User Story 2

```bash
# Testes primeiro, juntos:
Task: "T018 contrato em services/billing/src/http/invoices.contract.test.ts"
Task: "T019 ciclo em services/billing/src/invoices/cycle.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (assinatura) e US2 (fatura cobrada).
3. **Parar e validar** com o quickstart §2 e §3.

### Incremental Delivery

1. US3 (régua).
2. US4 → US5 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish. A US5 pode adiantar a proposta de planos para alimentar o seed.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-ASS que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhum preço, taxa ou prazo fica no código: o lint e o teste de configuração garantem isso.
- A régua nunca apaga dados, e o consumidor só é afetado na suspensão.
- Commit por tarefa ou grupo lógico, em branch `019-assinatura-koovela-cobranca`, por PR.
- T049 acrescentada na análise da 036 (2026-11-27): taxa e nota da Koovela nas antecipações.
- T048 acrescentada na análise da 029 (2026-11-27): taxa por agendamento pago com vale.
- T047 acrescentada na análise da 021 (2026-11-27): aplicação das concessões.
- Análise de 2026-11-27: `billing_dunning_policy` versionada no back-office (CONST 8) com etapas genéricas; WhatsApp transacional com cota e excedente (decisão da análise da 011); `simulateCost` e `publishDunningPolicy` no contrato; `one_off` e `whatsapp_overage` nos itens; reativação até encerramento + 90 dias; troca de versão no primeiro ciclo após a vigência; campos citados; casos de borda em T013/T019/T031. T046 acrescentada (retenção). Avisos da cobrança na 011 (T067).
