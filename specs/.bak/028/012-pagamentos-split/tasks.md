---
description: "Lista de tarefas da spec 012 — Pagamentos e split"
---

# Tasks: Pagamentos e split

**Input**: documentos de `specs/012-pagamentos-split/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md). Specs 001 a 011 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- a propriedade do split (REQ-PAG-045);
- a concorrência dos saldos (REQ-PAG-061);
- o reprocessamento de webhooks.

As telas de pagamento têm E2E com axe (CONST VIII).

**Organization**: por história de usuário (US1–US8). P1: US1 a US5. P2: US6 a US8. A ordem de execução põe o split (US3) antes do checkout (US2), porque o pagamento aprovado precisa do split calculado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US8).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/payments/`: `package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS`, pastas `src/{checkout,payees,split,refunds,chargebacks,fees,balances,ledger,on-site,finance,reconciliation,webhooks,http}` e `migrations/`.
- [ ] T002 [P] Criar os pacotes `packages/platform/payments/` (interface `PaymentProvider` e adaptadores) e `packages/domain/split/` (puro), e adicionar `exceljs` ao `payments`.
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/payments.openapi.yaml` e `packages/contracts/asyncapi/payments-events.asyncapi.yaml` (fonte: `specs/012-pagamentos-split/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T004 [P] Incluir as ações de pagamento em `packages/contracts/rbac/permissions.yaml`:
  - estorno manual e troca de conta como `sensitive`;
  - anulação no local pela equipe em até 24 h, depois só pelo Proprietário;
  - financeiro do Gerente como `allow_if_granted` (PEN-03);
  - `audit_category = financial` em todas as ações financeiras.

  Declarar as flags `payments.v1` e `payments.checkout_kill` (`kill_switch`) em `packages/contracts/flags/flags.yaml`.
- [ ] T005 [P] Adicionar ao esquema de `packages/platform/config/` as chaves `PSP_PROVIDER` (`sandbox`, `fake` ou o PSP escolhido), `PSP_API_KEY` e `PSP_WEBHOOK_SECRET` (`secret: true`), e atualizar o `.env.example`. Permitir só o domínio do PSP no CSP do `consumer-web` em `apps/consumer-web/app/security/csp.ts` (REQ-PAG-003).

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: porta do PSP, idempotência, webhooks, livro financeiro de dupla entrada, tabelas e configuração de taxas.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T006 [P] Teste do livro financeiro em `services/payments/src/ledger/journal.test.ts`: a soma das partidas de cada lançamento é zero e nada é alterado nem apagado (`data-model.md` `payments_posting.amount_cents`; REQ-PAG-055).
- [ ] T007 [P] Teste de idempotência e reprocessamento de webhook em `services/payments/src/webhooks/idempotency.int.test.ts`: o mesmo webhook enviado 3 vezes produz um único efeito (`data-model.md` `payments_psp_event.psp_event_id`), e a mesma `Idempotency-Key` devolve o mesmo resultado (`data-model.md` `payments_idempotency.key`; REQ-PAG-004, SC-003); evento fora de ordem não volta o estado: vale o mais recente pela data do PSP (`approved` que chega depois de `refunded` não reabre o pagamento; edge case).
- [ ] T008 [P] Varredura de dados de cartão em `services/payments/src/__tests__/no-card-data.int.test.ts`: nenhum PAN, CVV ou dado de cartão em banco, log ou evento (REQ-PAG-003/082, SC-007).

### Implementação da fundação

- [ ] T009 Criar as migrações em `services/payments/migrations/`:
  - `0001_tenant.ts` (schema do tenant):
    - `payments_payee`: CHECK em `data-model.md` `payments_payee.level` e `payments_payee.state`;
    - `payments_payment`: CHECK em `payments_payment.kind`, `payments_payment.method` e `payments_payment.state`; UNIQUE em `payments_payment.idempotency_key`;
    - `payments_split` e `payments_split_part`: CHECK em `payments_split_part.party` e `payments_split_part.status`;
    - `payments_refund`: CHECK em `payments_refund.origin` e `payments_refund.state`;
    - `payments_chargeback`: CHECK em `payments_chargeback.state`;
    - livro financeiro: `payments_journal` e `payments_posting`;
    - saldos: `payments_balance_account` (`CHECK balance ≥ 0`) e `payments_balance_entry`;
    - controle: `payments_idempotency`, `payments_psp_event` (UNIQUE `psp_event_id`), `payments_reconciliation_run` e `payments_reconciliation_issue`;
    - outboxes: `payments_audit_outbox` e `payments_outbox`.
  - `0002_identity.ts`: `koovela_identity.payments_saved_card`.
  - `0003_platform.ts`: `koovela_platform.payments_fee_config_version`.
- [ ] T010 Implementar `PaymentProvider` em `packages/platform/payments/src/provider.ts`, com o adaptador `sandbox` do PSP e o adaptador `fake` determinístico para testes. O SDK do PSP só pode ser importado dentro do adaptador, com regra no dependency-cruiser (REQ-PAG-001).
- [ ] T011 Implementar a idempotência (`payments_idempotency`) e o receptor de webhooks em `services/payments/src/webhooks/receiver.ts`:
  - assinatura verificada;
  - deduplicação por `psp_event_id`;
  - processamento no `workers` pelo outbox.

  A rota é `/v1/webhooks/psp/{provider}`.
- [ ] T012 Implementar o livro financeiro de dupla entrada em `services/payments/src/ledger/journal.ts`. É a única forma de registrar movimento financeiro (`data-model.md` `payments_journal.kind` e `payments_posting.account_code`).
- [ ] T013 Implementar a configuração versionada de taxas da Koovela, sem padrão no código e com aprovação dupla pela 004 (`data-model.md` `payments_fee_config_version.take_rate_bps`, `payments_fee_config_version.booking_fee_cents`, `payments_fee_config_version.idle_fee_bps`, `payments_fee_config_version.valid_from`), em `services/payments/src/fees/config.ts`. A rota é `/v1/admin/payments/fee-config` e a tela fica em `apps/admin-web/src/routes/payments/fee-config/` (REQ-PAG-044).
- [ ] T014 Implementar o outbox de eventos sem PII em `services/payments/src/events.ts` (REQ-PAG-082).

**Checkpoint**: PSP atrás da porta, webhooks idempotentes e livro financeiro equilibrado.

---

## Phase 3: User Story 1 - Estabelecimento habilita o recebimento (Priority: P1) 🎯 MVP

**Goal**: recebedor do negócio (PF ou PJ) e dos colaboradores, com verificação pelo PSP e estados acompanhados. A troca de conta exige reautenticação e nova verificação. Sem recebedor ativo, o negócio só aceita pagamento no local.

**Independent Test**: no sandbox do PSP, cadastrar um recebedor PF e um PJ e acompanhar os estados até aprovado e recusado com motivo (quickstart §1 e §2).

### Tests for User Story 1 ⚠️

- [ ] T015 [P] [US1] Teste de contrato de `registerPayee` e `changeBankAccount` em `services/payments/src/http/payees.contract.test.ts`.
- [ ] T016 [P] [US1] Teste de integração em `services/payments/src/payees/payees.int.test.ts`:
  - estados `under_review` → `active` | `rejected` | `blocked`, com motivo, pelos webhooks (`data-model.md` `payments_payee.state`, `payments_payee.reject_reason`);
  - documento e conta cifrados (`data-model.md` `payments_payee.holder_document`, `payments_payee.bank_account`);
  - troca de conta com reautenticação, nova verificação, auditoria e aviso (REQ-PAG-012);
  - sem recebedor ativo, só pagamento no local (REQ-PAG-013);
  - recebedor `blocked` pelo PSP suspende os pagamentos online do negócio (o checkout só oferece pagamento no local) e avisa o Proprietário e a Gestão (edge case).

### Implementation for User Story 1

- [ ] T017 [US1] Implementar o recebedor do negócio e o do colaborador em `services/payments/src/payees/payees.ts`:
  - nível `business` por padrão;
  - `branch` aceito no modelo (PEN-11);
  - `professional` (PEN-14);
  - `data-model.md` `payments_payee.owner_ref` (business_id, branch_id ou professional_id conforme o nível), `payments_payee.psp_recipient_ref` e `payments_payee.verified_at`;
  - `blocked` suspende os pagamentos online do negócio, com aviso;
  - evento `payments.payee.changed` consumido pela 007 (estado na tela) e pela 005 (prontidão).
- [ ] T018 [US1] Implementar as rotas `/v1/tenant/payees*` em `services/payments/src/http/payees.ts`.
- [ ] T019 [P] [US1] Implementar a tela O05 (Recebedor, KYC) em `apps/tenant-web/src/routes/onboarding/payee/` e o cadastro de recebedor do colaborador, que é tela nova, em `apps/pro-mobile/app/profile/payee.tsx` e `apps/tenant-web/src/routes/pro/profile/payee.tsx`.

**Checkpoint**: recebimento habilitado.

---

## Phase 4: User Story 3 - Split exato a cada pagamento (Priority: P1)

**Goal**: split determinístico em que o líquido é igual à soma das partes, com arredondamento para baixo e o resto para o estabelecimento. Partes da Koovela pela versão de taxas. Comissão pelo contrato da 007, com a versão congelada. Comissão pendente quando o colaborador não tem recebedor. Saúde só com taxa de agendamento. Falha fechada quando as partes passam do líquido.

**Independent Test**: teste de propriedade com milhares de combinações (quickstart §2).

### Tests for User Story 3 ⚠️

- [ ] T020 [P] [US3] Teste de propriedade (portão de merge) em `packages/domain/split/src/split.property.test.ts`: para qualquer combinação de partes, descontos, taxas e estornos, a soma das partes é igual ao líquido, nenhuma parte é negativa e o resto vai para o estabelecimento (REQ-PAG-040/045, SC-001).
- [ ] T021 [P] [US3] Teste de integração em `services/payments/src/split/split.int.test.ts`:
  - colaborador sem recebedor → parte `pending_professional` (`data-model.md` `payments_split_part.status`), transferida quando ele for verificado;
  - Koovela + comissão maiores que o líquido → falha fechada e alerta;
  - saúde → só Koovela e estabelecimento (REQ-PAG-046);
  - taxa por agendamento no split quando o pagamento passa pela Koovela (REQ-PAG-042);
  - valor zero (serviço gratuito) não gera cobrança nem split e o atendimento conta como pago com valor zero (edge case);
  - o split usa a taxa efetiva informada pelo PSP, não a prevista (edge case).

### Implementation for User Story 3

- [ ] T022 [US3] Implementar `computeSplit` em `packages/domain/split/src/split.ts` (research R5).
- [ ] T023 [US3] Implementar a montagem do split em `services/payments/src/split/build.ts`:
  - versão das taxas e `commission_rule_version_id` congelado no agendamento;
  - chamada ao contrato `quoteCommission` da 007 com o desconto do resgate (`scheduling_appointment.loyalty_discount_cents` da 009), para a comissão seguir a base da [D17]; "serviço grátis" (desconto igual ao preço) vira pagamento zero sem split, e o valor da recompensa fica como custo do programa (REQ-FID-024 da 015);
  - gravação de `payments_split` (`data-model.md` `payments_split.config_version_id`, `payments_split.commission_rule_version_id`);
  - partes em `data-model.md` `payments_split_part.amount_cents` e `payments_split_part.payee_id`;
  - taxa do PSP efetiva, vinda do webhook (`data-model.md` `payments_payment.psp_fee_cents`);
  - valor zero: sem split;
  - lançamentos no livro financeiro.
- [ ] T024 [US3] Implementar a transferência das partes `pending_professional` quando o recebedor do colaborador fica `active`, em `services/payments/src/split/release-pending.ts` (REQ-PAG-043).

**Checkpoint**: split provado por propriedade.

---

## Phase 5: User Story 2 - Consumidor paga com Pix ou cartão no checkout (Priority: P1)

**Goal**: Pix com QR e copia-e-cola que expira junto com a reserva, e cartão tokenizado no PSP. O pagamento aprovado confirma o agendamento em ≤ 10 s. Pagamento que chega depois da expiração é estornado automaticamente. Também há cartões salvos com consentimentos separados e limite de recusas.

**Independent Test**: agendar com sinal, pagar com Pix de teste, repetir com cartão e deixar um Pix expirar (quickstart §1).

### Tests for User Story 2 ⚠️

- [ ] T025 [P] [US2] Teste de contrato de `payAppointment`, `listSavedCards` e `removeSavedCard` em `services/payments/src/http/checkout.contract.test.ts`.
- [ ] T026 [P] [US2] Teste de integração em `services/payments/src/checkout/checkout.int.test.ts`:
  - expiração do Pix igual ao restante da reserva, no máximo 30 min (`data-model.md` `payments_payment.pix_expires_at`; REQ-PAG-021);
  - aprovado → `payments.payment.approved.v1` → 009 `CONFIRMADO` em ≤ 10 s (REQ-PAG-022, SC-002);
  - pagamento depois da expiração → estorno automático em ≤ 1 dia útil, com aviso (REQ-PAG-023);
  - 6ª recusa em 1 h → `payments.card_attempts_limited` (REQ-PAG-025).
- [ ] T027 [P] [US2] Testes E2E com axe em `apps/consumer-web/e2e/checkout.spec.ts` e `apps/consumer-mobile/e2e/checkout.e2e.ts`: a requisição à Koovela leva só o token do cartão.

### Implementation for User Story 2

- [ ] T028 [US2] Implementar o checkout Pix e cartão em `services/payments/src/checkout/checkout.ts`: cobrança com split no PSP, `Idempotency-Key` e checkout ≤ 1,5 s p95 (`data-model.md` `payments_payment.amount_cents` e `payments_payment.currency` = `BRL`). Valor zero não chama o PSP. Tempo esgotado na resposta segue a T066.
- [ ] T029 [US2] Implementar a confirmação por webhook e o estorno de pagamento tardio no `workers` em `services/payments/src/checkout/{on-approved,late-payment}.ts`.
- [ ] T030 [US2] Implementar os cartões salvos com consentimentos de compra, de multa e de cobrança recorrente de série (`data-model.md` `payments_saved_card.consent_purchase_at`, `payments_saved_card.consent_fee_at`, `payments_saved_card.consent_recurring_at`; a revogação grava `consent_recurring_revoked_at` e publica `payments.card_consent.revoked.v1` para a 013; cobrança sem o consentimento correspondente é recusada) (`data-model.md` `payments_saved_card.psp_token` e `payments_saved_card.last4`, nunca o número; `payments_saved_card.removed_at` com o token apagado no PSP; cartão vencido pelo `exp_month`/`exp_year` marcado e avisado na próxima compra) e o limite de recusas, com evento para a 021, em `services/payments/src/checkout/{cards,attempt-limit}.ts` (REQ-PAG-024/025).
- [ ] T031 [US2] Implementar as rotas `/v1/consumer/appointments/{id}/payments` e `/v1/consumer/cards*` em `services/payments/src/http/checkout.ts`.
- [ ] T032 [P] [US2] Implementar as telas C10 e C11 em `apps/consumer-mobile/app/booking/payment/` (SDK nativo do PSP) e W13 em `apps/consumer-web/app/routes/agendar/pagamento.tsx` (campos hospedados; meio e Pix numa página, REQ-PAG-020), com o aviso de cartão salvo vencido e a mensagem "pagamento indisponível no momento" (com oferta de pagar no local quando o negócio permitir) vinda da T066.
- [ ] T066 [US2] Implementar o pagamento em estado desconhecido e o PSP fora do ar em `services/payments/src/checkout/unknown-state.ts`: tempo esgotado na resposta deixa `data-model.md` `payments_payment.state = unknown`; um job no `workers` consulta o PSP com *backoff* até ter estado final; nenhuma nova tentativa de cobrança do mesmo agendamento enquanto houver pagamento `unknown`; alerta se passar de 15 min; com o PSP fora do ar (circuito aberto pela taxa de falha), o checkout responde `payments.psp_unavailable` e oferece pagamento no local quando o negócio permitir. Teste em `services/payments/src/checkout/unknown-state.int.test.ts` com tempo esgotado e queda injetados no adaptador `fake`: nenhuma cobrança dupla e nenhum agendamento confirmado sem pagamento (CONST III).
- [ ] T067 [P] Consumir `backoffice.fraud_action.changed` (021) em `services/payments/src/fraud/on-fraud-action.ts`: `hold_payouts` põe o recebedor do negócio em `payouts_held` (recebe pagamentos, mas não transfere ao recebedor até a liberação; `data-model.md` `payments_payee.state` ganha `payouts_held`); `block_payment_method` bloqueia o token do meio de pagamento do consumidor na plataforma; `reverted` e `expired` desfazem. Teste em `services/payments/src/fraud/on-fraud-action.int.test.ts`.

**Checkpoint**: o consumidor paga e o agendamento confirma.

---

## Phase 6: User Story 4 - Pagamento no local e restante no check-out (Priority: P1)

**Goal**: registrar pagamento no local (sem PSP e sem split, mas no livro), anulação com regra de tempo e cobrança do restante e da diferença do "a partir de" pelo app.

**Independent Test**: três atendimentos (dinheiro no local, sinal online com restante no local, restante cobrado pelo app) (quickstart §6).

### Tests for User Story 4 ⚠️

- [ ] T033 [P] [US4] Teste de contrato de `recordOnSitePayment`, `voidOnSitePayment`, `createPaymentRequest` e `getPaymentRequest` em `services/payments/src/http/on-site.contract.test.ts`.
- [ ] T034 [P] [US4] Teste de integração em `services/payments/src/on-site/on-site.int.test.ts`:
  - pagamento no local gera lançamento na conta "fora da plataforma" (REQ-PAG-030);
  - anulação pela equipe até 24 h; depois só pelo Proprietário, com auditoria (`data-model.md` `payments_payment.voided_at`, `payments_payment.voided_by`; REQ-PAG-031);
  - pedido de pagamento do restante enviado pela 011 (REQ-PAG-026).

### Implementation for User Story 4

- [ ] T035 [US4] Implementar o pagamento no local e a anulação em `services/payments/src/on-site/on-site.ts` (`data-model.md` `payments_payment.method` `on_site_*`, `payments_payment.amount_cents`, `payments_payment.voided_at` e `payments_payment.voided_by`).
- [ ] T036 [US4] Implementar o pedido de pagamento do restante e da diferença em `services/payments/src/checkout/payment-request.ts`, com o link pela 011.
- [ ] T037 [US4] Implementar as rotas `/v1/tenant/appointments/{id}/on-site-payments`, `/v1/tenant/payments/{id}/void`, `/v1/tenant/payment-requests` e `/v1/consumer/payment-requests/{id}` em `services/payments/src/http/on-site.ts`.
- [ ] T038 [P] [US4] Implementar o registro no check-out em K02/KD2 (`apps/pro-mobile/app/agenda/payment.tsx`, `apps/tenant-web/src/routes/pro/agenda/Payment.tsx`). Meta: ≤ 15 s (SC-008).

**Checkpoint**: todo atendimento tem o pagamento registrado.

---

## Phase 7: User Story 5 - Sinal, multa e devolução seguem a política (Priority: P1)

**Goal**: executar a forma de multa congelada (reter o sinal, reter e cobrar no cartão salvo, ou só registrar). Devolver automaticamente o que a política manda, desfazendo o split na mesma proporção.

**Independent Test**: com sinal de 30% e multa de 50%, cancelar dentro da janela, cancelar fora da janela e marcar falta (quickstart §3).

### Tests for User Story 5 ⚠️

- [ ] T039 [P] [US5] Teste de integração em `services/payments/src/fees/policy-execution.int.test.ts`:
  - cancelamento gratuito ou pelo estabelecimento → devolução integral pelo mesmo meio, sem ação manual (REQ-PAG-050, SC-006);
  - multa menor que o sinal → retém a multa e devolve o resto (REQ-PAG-051);
  - `retain_deposit_and_charge_card` sem consentimento de multa → não cobra (REQ-PAG-027);
  - abono ou contestação aceita → devolve e desfaz o split.

### Implementation for User Story 5

- [ ] T040 [US5] Implementar o consumidor de `scheduling.policy_fee.changed` (010) que executa a forma congelada em `services/payments/src/fees/execute.ts`.
- [ ] T041 [US5] Implementar a devolução proporcional, que desfaz as partes do split, em `services/payments/src/refunds/policy-refund.ts`, com os lançamentos e o evento `payments.refund.changed`.

**Checkpoint**: política executada sem ação manual.

---

## Phase 8: User Story 6 - Estorno e chargeback (Priority: P2)

**Goal**: estorno manual total ou parcial (com reautenticação e motivo), nunca acima do estornável. Estorno de valor já repassado vira débito no próximo repasse. Chargeback com prazo e provas reunidas automaticamente.

**Independent Test**: estornar parcialmente um pagamento com split e simular um chargeback (quickstart §4).

### Tests for User Story 6 ⚠️

- [ ] T042 [P] [US6] Teste de contrato de `manualRefund` em `services/payments/src/http/refunds.contract.test.ts`.
- [ ] T043 [P] [US6] Teste de integração em `services/payments/src/refunds/refunds.int.test.ts`:
  - estorno parcial devolve a fração de cada parte;
  - acima do estornável → recusado (`data-model.md` `payments_refund.amount_cents`);
  - valor já repassado → débito no próximo repasse (REQ-PAG-053);
  - chargeback simulado → registro com prazo e pacote de provas (check-in, aceite da política, avisos entregues), mais aviso (`data-model.md` `payments_chargeback.evidence`, `payments_chargeback.due_at`; REQ-PAG-054).

### Implementation for User Story 6

- [ ] T044 [US6] Implementar o estorno manual (Proprietário ou Fin/Ops, com reautenticação, motivo e auditoria) em `services/payments/src/refunds/manual.ts` e a rota `/v1/tenant/payments/{id}/refunds` (`data-model.md` `payments_refund.reason` e `payments_refund.actor_id` obrigatórios; REQ-PAG-052).
- [ ] T045 [US6] Implementar o chargeback e o pacote de provas em `services/payments/src/chargebacks/chargebacks.ts`, com evento `payments.chargeback.changed`.
- [ ] T046 [P] [US6] Implementar o registro de estornos e chargebacks na G08 em `apps/admin-web/src/routes/antifraud/` e a ação de estorno no detalhe do pagamento da P21.

**Checkpoint**: estornos e disputas tratados.

---

## Phase 9: User Story 7 - Financeiro do estabelecimento e conciliação diária (Priority: P2)

**Goal**: tela financeira por período, meio e filial, com detalhe do split e exportação. Escopo do Gerente. Conciliação diária com fila de divergências. Métricas mensais para 018, 019 e 023.

**Independent Test**: conferir os totais de dois dias e criar uma divergência proposital (quickstart §6 e §7).

### Tests for User Story 7 ⚠️

- [ ] T047 [P] [US7] Teste de contrato de `financeSummary`, `monthlyMetrics`, `listReconciliationIssues` e `closeReconciliationIssue` em `services/payments/src/http/finance.contract.test.ts`.
- [ ] T048 [P] [US7] Teste de integração em `services/payments/src/reconciliation/reconciliation.int.test.ts`:
  - divergência injetada → alerta no mesmo dia e item na fila;
  - a divergência só fecha com justificativa (`data-model.md` `payments_reconciliation_issue.state`; REQ-PAG-072, SC-005);
  - o Gerente vê só a própria filial (REQ-PAG-071).

### Implementation for User Story 7

- [ ] T049 [US7] Implementar o resumo financeiro e a exportação em planilha em `services/payments/src/finance/summary.ts`, mais a rota `/v1/tenant/finance/summary`.
- [ ] T050 [US7] Implementar as métricas mensais (GMV, take rate efetivo, taxas do PSP, atendimentos concluídos e pagos) em `services/payments/src/finance/metrics.ts`, mais a rota `/v1/internal/payments/metrics` (REQ-PAG-073).
- [ ] T051 [US7] Implementar a conciliação diária no `workers` em `services/payments/src/reconciliation/run.ts` e a fila em `/v1/admin/payments/reconciliation/*`. Inclui a divergência `fee_mismatch` (taxa efetiva do PSP diferente da prevista) e o fechamento só com `data-model.md` `payments_reconciliation_issue.justification`.
- [ ] T052 [P] [US7] Implementar a tela P21 (Financeiro: recebimentos e split) em `apps/tenant-web/src/routes/finance/`. Meta: o total do mês por meio e filial em ≤ 30 s (SC-009). Implementar também a fila de divergências (tela nova) em `apps/admin-web/src/routes/reconciliation/`.

**Checkpoint**: financeiro e conciliação no ar.

---

## Phase 10: User Story 8 - Livro-razão de saldos (Priority: P2)

**Goal**: saldos de sessões de pacote em livro-razão, nunca negativos sob concorrência, com contratos de reservar, consumir e devolver para a 009, compra do pacote e tela de saldo do consumidor.

**Independent Test**: comprar 5 sessões, fazer 5 reservas simultâneas mais uma (a sexta é recusada), cancelar uma e conferir a devolução (quickstart §5).

### Tests for User Story 8 ⚠️

- [ ] T053 [P] [US8] Teste de concorrência (portão de merge) em `services/payments/src/balances/concurrency.int.test.ts`: com saldo 1, 20 reservas simultâneas dão 1 sucesso; o saldo nunca fica negativo, inclusive no reprocessamento (`data-model.md` `payments_balance_account.balance`, `payments_balance_account.reserved`; REQ-PAG-061, SC-004).
- [ ] T054 [P] [US8] Teste de contrato de `balanceOperation` e `listMyBalances` em `services/payments/src/http/balances.contract.test.ts`.

### Implementation for User Story 8

- [ ] T055 [US8] Implementar o livro de saldos em `services/payments/src/balances/ledger.ts`: lançamentos com a conta travada `FOR UPDATE` e saldo materializado na mesma transação (`data-model.md` `payments_balance_entry.type`, `payments_balance_account.product_kind` = `session_package` na v1.0, `payments_balance_account.scope_branch_id` e `payments_balance_account.expires_at`; research R6).
- [ ] T056 [US8] Implementar a compra de pacote (`payments_payment.kind = package`, versão congelada) e os contratos `reserve`, `consume`, `release`, `expire` e `refund` para a 009 (com `scope = all_branches`, o saldo continua utilizável nas demais filiais quando uma filial é encerrada; caso de teste incluído, edge case da 006) em `services/payments/src/balances/{purchase,operations}.ts`, com a rota `/v1/internal/payments/balances/{account_id}/{op}` (REQ-PAG-060/062).
- [ ] T057 [US8] Trocar a reserva e o consumo de sessão do agendamento (009) pelos contratos reais em `services/scheduling/src/appointments/package-sessions.ts`.
- [ ] T058 [P] [US8] Implementar a tela de saldo de sessões do consumidor (nova) em `apps/consumer-mobile/app/perfil/pacotes.tsx` e `apps/consumer-web/app/routes/perfil.pacotes.tsx`.
- [ ] T065 [US8] Implementar o aviso de sessões a vencer em `services/payments/src/balances/expiring-soon-job.ts` (job diário no `workers`): para cada conta de saldo com sessões restantes que vencem em 7 dias, emite uma vez `payments.balance.expiring_soon.v1` (`account_id`, `consumer_id`, `remaining`, `expires_at`) pelo outbox, idempotente por conta e data de vencimento; teste em `services/payments/src/balances/expiring-soon.int.test.ts`, incluindo que sessões vencidas não são reservadas (REQ-CAT-046 da 006).

**Checkpoint**: saldos confiáveis.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T059 [P] Registrar os casos de isolamento em `services/payments/src/isolation.cases.ts`: pagamentos, recebedores, saldos e financeiro de outro tenant respondem 404 (REQ-PAG-080).
- [ ] T060 [P] Testes com as flags `payments.v1` e `payments.checkout_kill` ligadas e desligadas em `services/payments/src/__tests__/flags.int.test.ts`.
- [ ] T061 [P] Criar o painel Grafana "Pagamentos" em `infra/observability/dashboards/payments.json` (aprovação, latência de confirmação, falhas de split, divergências, chargebacks) e os alertas em `infra/observability/alerts/payments.yml`.
- [ ] T062 Registrar a escolha do PSP (critérios do REQ-PAG-002, que precisa aceitar recebedor PF para colaborador CLT) em `docs/ops/decisions/escolha-psp.md`, as telas sem protótipo em `docs/design/telas-sem-prototipo-012.md` e o runbook `docs/ops/runbooks/divergencia-conciliacao.md`.
- [ ] T063 Executar o [quickstart.md](./quickstart.md) inteiro em staging (sandbox do PSP) e registrar em `docs/ops/decisions/validacao-012.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **Decisão do PSP** (T062) vem antes da US1; até ela, só o adaptador `fake` (T010).
- **US1** (recebedor) depende da fase 2.
- **US3** (split) depende da fase 2 e da 007. Pode correr em paralelo com US1.
- **US2** (checkout) depende de US1 e US3.
- **US4** (no local) depende da fase 2. Pode correr em paralelo com US2.
- **US5** (política) depende de US2 e da 010.
- **US6** (estorno e chargeback) depende de US2.
- **US7** (financeiro) depende de US2 e US4.
- **US8** (saldos) depende da fase 2. A compra de pacote depende de US2.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas → alertas.

### Parallel Opportunities

- Setup: T002 a T005.
- Fundação: T006, T007 e T008.
- Depois da fase 2: US1, US3, US4 e US8 (livro) em paralelo. Depois de US2: US5, US6 e US7.

---

## Parallel Example: User Story 2

```bash
# Testes primeiro, juntos:
Task: "T025 contrato em services/payments/src/http/checkout.contract.test.ts"
Task: "T026 integração em services/payments/src/checkout/checkout.int.test.ts"
Task: "T027 E2E em apps/consumer-web/e2e/checkout.spec.ts e apps/consumer-mobile/e2e/checkout.e2e.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US3 + US2)

1. Fases 1 e 2.
2. US1 (recebedor) → US3 (split) → US2 (checkout). Juntas, formam o primeiro pagamento ponta a ponta.
3. **Parar e validar** com o quickstart §1 e §2.

### Incremental Delivery

1. US4 → US5 (pagamento no local e política).
2. US6 → US7 (estornos e financeiro).
3. US8 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US3 → US2 → US4 → US5 → US8 → US6 → US7 → Polish.

---

## Notes

- T023 ampliada pelo `/speckit-analyze` da 015 (2026-11-27): desconto de fidelidade no split e na comissão.
- T030 ampliada pelo `/speckit-analyze` da 013 (2026-11-27): consentimento de cobrança recorrente para séries.
- T066 foi acrescentada pelo `/speckit-analyze` de 2026-11-27 (US2): estado desconhecido no PSP e PSP fora do ar.
- T065 foi acrescentada pelo `/speckit-analyze` da 006 (2026-11-26); a numeração não foi refeita.
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-PAG que atende. Campos com restrição citam `data-model.md` e o campo.
- Centavos e pontos-base. Lançamentos imutáveis. Saldo ≥ 0. O cartão nunca passa pela Koovela.
- Taxas da Koovela configuráveis e versionadas, sem valor no código.
- Commit por tarefa ou grupo lógico, em branch `012-pagamentos-split`, por PR.
- T067 acrescentada na análise da 021 (2026-11-27): retenção de repasses e bloqueio de meio de pagamento.
