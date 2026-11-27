---
description: "Lista de tarefas da spec 029 — Vale-presente e pacotes"
---

# Tasks: Vale-presente e pacotes

**Input**: documentos de `specs/029-vale-presente-pacotes/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 028 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- propriedade dos abatimentos: oferta → fidelidade → vale → pagamento, sem valor negativo e com soma igual ao preço;
- concorrência do saldo: nunca negativo (SC-003);
- segurança do código: 80 bits, guardado só como HMAC, nada em log;
- uso só na filial da compra (SC-004).

**Organization**: por história de usuário. P1: US1 (comprar), US2 (resgatar e usar) e US3 (reembolso e validade). P2: US4 (configuração, venda no balcão e painel). O livro de saldos, o código e os abatimentos ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US4).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o submódulo `services/payments/src/gift-cards/{purchase,delivery,codes,redeem,apply,refund,expiry,settings,wallet-projection,http}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/gift-cards.openapi.yaml` e `packages/contracts/asyncapi/gift-cards-events.asyncapi.yaml` (fonte: `specs/029-vale-presente-pacotes/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - comprador e presenteado `self`;
  - configuração por filial pelo Proprietário;
  - venda e aplicação no balcão pela Recepção;
  - reembolso fora da regra e cancelamento pelo Proprietário, com `audit_category`.

  Declarar a flag `gift_cards.v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, conta no livro de saldos, código seguro e função pura de abatimentos.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de propriedade (portão de merge) em `packages/domain/pricing/src/__tests__/deductions.property.test.ts`:
  - a ordem é desconto (oferta de campanha ou resgate de fidelidade) → vale → pagamento do restante;
  - nenhum valor fica negativo e a soma é igual ao preço;
  - oferta e fidelidade juntas são recusadas, e o vale combina com qualquer uma delas (REQ-VAL-052).

  Incluir no filtro `pnpm test:property --filter deductions`.
- [ ] T005 [P] Teste de segurança do código (portão de merge) em `services/payments/src/gift-cards/codes/codes.security.test.ts`:
  - 16 caracteres Crockford Base32 com 80 bits (CSPRNG) e dígito de verificação;
  - só `data-model.md` `gift_card.code_hmac` e `gift_card.code_last4` são persistidos;
  - o código nunca aparece em log, trace nem evento.

  Incluir no filtro `pnpm test:security --filter gift-card-code`.
- [ ] T006 [P] Teste de concorrência (portão de merge) em `services/payments/src/gift-cards/apply/balance.concurrency.test.ts`: usos e reprocessamentos simultâneos nunca deixam o saldo negativo (SC-003). Incluir no filtro `pnpm test:concurrency --filter gift-card-balance`.

### Implementação da fundação

- [ ] T007 Criar a migração de tenant `services/payments/migrations/tenant/0029_gift_cards.ts` com:
  - `gift_card`: CHECK em `data-model.md` `gift_card.kind`, `gift_card.delivery_channel` e `gift_card.state`, `gift_card.recipient_phone` e `gift_card.recipient_email` cifrados, e índice único em `gift_card.code_hmac`;
  - `gift_card_settings`: CHECK em `gift_card_settings.amount_mode` e `gift_card_settings.validity_months` ≥ 6, com padrão 12;
  - `gift_card_redemption_attempt`;
  - a extensão de `payments_balance_account.product_kind` com `gift_card_amount` e `gift_card_item`.
- [ ] T008 [P] Criar a migração `services/payments/migrations/projections/0029_consumer_wallet.ts` com `koovela_projections.consumer_wallet` (`data-model.md` `consumer_wallet.consumer_id`, `consumer_wallet.tenant_id`, `consumer_wallet.branch_id`, `consumer_wallet.gift_card_id`, `consumer_wallet.kind`, `consumer_wallet.balance_display`, `consumer_wallet.expires_at`, `consumer_wallet.state`), e a `gift_card_policy` em `services/platform/migrations/0029_gift_card_policy.ts` (seed; tela no back-office para o Fin/Ops em `apps/admin-web/src/routes/gift-cards/policy/`; `data-model.md` `gift_card_policy.expiry_notice_days`, `gift_card_policy.code_attempts_per_hour`).
- [ ] T009 Implementar `applyDeductions()` em `packages/domain/pricing/src/deductions.ts`.
- [ ] T010 Implementar a geração, o HMAC e a verificação do código em `services/payments/src/gift-cards/codes/codes.ts`, mais o limite de tentativas por hora por conta e aparelho lido da `gift_card_policy` (valor inicial 5; Redis, com `data-model.md` `gift_card_redemption_attempt.device_fingerprint`, `gift_card_redemption_attempt.consumer_id`, `gift_card_redemption_attempt.at`, `gift_card_redemption_attempt.success`) e o alerta à 021 em excesso, em `services/payments/src/gift-cards/codes/attempts.ts`.
- [ ] T011 Implementar os produtos `gift_card_amount` (centavos) e `gift_card_item` (unidade) no livro de saldos da 012, com os lançamentos `credit`, `reserve`, `consume`, `release`, `expire`, `refund` e `adjust`, em `services/payments/src/balances/gift-card-products.ts`.
- [ ] T012 Implementar a projeção da carteira (eventos `payments.gift_card.changed`, sem código nem contato) em `services/payments/src/gift-cards/wallet-projection/wallet.ts`.

**Checkpoint**: saldo, código e abatimentos seguros.

---

## Phase 3: User Story 1 - Comprar um vale-presente para alguém (Priority: P1) 🎯 MVP

**Goal**: vale por valor ou por serviço, combo ou pacote, com preço congelado, comprado com Pix ou cartão e split para a filial. A venda é registrada como adiantamento, sem NFS-e. A entrega é por aviso agendado ou só por código, com um reenvio antes do resgate.

**Independent Test**: comprar R$ 150 com entrega na semana seguinte e "corte + escova" com envio na hora (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T013 [P] [US1] Teste de contrato de `giftCardOptions`, `buyGiftCard`, `listMyGiftCards` e `resendGiftCard` em `services/payments/src/gift-cards/http/consumer.contract.test.ts`.
- [ ] T014 [P] [US1] Teste de integração em `services/payments/src/gift-cards/purchase/purchase.int.test.ts`:
  - o split vai para a filial, retendo só a taxa do PSP e o take rate (a taxa por agendamento fica para o uso);
  - a venda gera `data-model.md` `gift_card.advance_journal_id` sem NFS-e;
  - o preço fica congelado em `gift_card.catalog_version_id`, e o vale continua cobrindo depois de um aumento;
  - a entrega acontece em `gift_card.deliver_at` (SC-002);
  - um segundo reenvio → `gift_card.already_resent` (`gift_card.resent_once`);
  - compra e envio levam até 3 minutos (SC-001);
  - no reenvio a outro destinatário, o contato anterior é apagado.

### Implementation for User Story 1

- [ ] T015 [US1] Implementar a compra pelo checkout da 012 (Pix ou cartão, idempotente, split), com o adiantamento no livro financeiro, em `services/payments/src/gift-cards/purchase/purchase.ts` (`data-model.md` `gift_card.buyer_consumer_id`, `gift_card.recipient_name`, `gift_card.item_id`, `gift_card.paid_cents`, `gift_card.balance_account_id`, `gift_card.message`, `gift_card.art_id`, `gift_card.payment_id`).
- [ ] T016 [US1] Implementar a entrega agendada ou imediata (011, T076; `data-model.md` `gift_card.deliver_at`), só por código e o reenvio único no `workers` em `services/payments/src/gift-cards/delivery/delivery.ts`; no reenvio, o contato anterior é apagado.
- [ ] T017 [US1] Implementar as rotas `/v1/public/businesses/{slug}/gift-cards/options` e `/v1/consumer/gift-cards*` (compra, lista, reenvio) em `services/payments/src/gift-cards/http/consumer.ts`.
- [ ] T018 [P] [US1] Implementar a tela "Comprar vale-presente" no app e na web em `apps/consumer-mobile/src/app/negocio/[slug]/vale-presente/` e `apps/consumer-web/src/routes/$slug.vale-presente.tsx`.

**Checkpoint**: dá para presentear alguém.

---

## Phase 4: User Story 2 - Presenteado resgata e usa o vale (Priority: P1)

**Goal**: resgate pelo link ou código para a carteira. Uso só na filial da compra, no resumo do agendamento: reserva na confirmação, consumo na conclusão e devolução no cancelamento. Vale de pacote vira pacote do presenteado. No balcão, a confirmação é no celular dele. Estorno volta ao saldo. NFS-e, comissão e pontos acontecem no uso.

**Independent Test**: resgatar R$ 150, usar R$ 90 e depois R$ 60, e ter o uso recusado em outra filial (quickstart §2, §3 e §5).

### Tests for User Story 2 ⚠️

- [ ] T019 [P] [US2] Teste de contrato de `redeemGiftCard`, `applyGiftCard` e `applyAtCounter` em `services/payments/src/gift-cards/http/redeem.contract.test.ts`.
- [ ] T020 [P] [US2] Teste de integração em `services/payments/src/gift-cards/apply/apply.int.test.ts`:
  - o resgate grava `data-model.md` `gift_card.recipient_consumer_id` e aparece na carteira;
  - outra filial → `gift_card.wrong_branch` (`gift_card.branch_id`; SC-004);
  - uso parcial com reserva, consumo e devolução no cancelamento dentro da política (010);
  - vale de pacote vira pacote do presenteado (006);
  - o balcão exige confirmação no celular (mecanismo da 015);
  - o estorno volta ao saldo, nunca em dinheiro (REQ-VAL-053);
  - resgatar e agendar leva até 3 minutos (SC-006);
  - serviço do vale arquivado: o valor pago vira saldo para outros serviços da filial;
  - com oferta de campanha, a oferta reduz o preço antes do vale;
  - o agendamento grava `scheduling_appointment.gift_card_applied_cents` e `gift_card_id` (009 T065).
- [ ] T021 [P] [US2] Teste de integração em `services/payments/src/gift-cards/apply/side-effects.int.test.ts`:
  - na conclusão, a NFS-e sai pelo valor coberto (017);
  - a comissão é calculada sobre o valor coberto (007, D17) e entra no fechamento da 018 com `payment_route = gift_card` (018 T045);
  - o presenteado ganha pontos e o comprador não (015);
  - a taxa por agendamento da Koovela é cobrada no uso, como item `booking_fee_gift_card` na fatura da 019 (019 T048).

### Implementation for User Story 2

- [ ] T022 [US2] Implementar o resgate em `services/payments/src/gift-cards/redeem/redeem.ts`, incluindo a conversão de vale de pacote em pacote do presenteado e o saldo em valor quando o serviço do vale foi arquivado.
- [ ] T023 [US2] Implementar a aplicação no resumo do agendamento (009), com reserva, consumo e devolução pelos estados do agendamento, e a confirmação no balcão em `services/payments/src/gift-cards/apply/apply.ts` e `services/payments/src/gift-cards/apply/counter.ts`.
- [ ] T024 [US2] Publicar `payments.gift_card.used.v1` com o valor coberto, e ajustar os consumidores da 017 (`services/fiscal/src/triggers/gift-card-use.ts`, com `source_kind = gift_card_use` no `data-model.md` da 017), da 007 (`services/workforce/src/commission/gift-card-base.ts`) e da 015 (`services/loyalty/src/earn/gift-card.ts`).
- [ ] T025 [US2] Implementar as rotas de resgate e aplicação em `services/payments/src/gift-cards/http/redeem.ts`.
- [ ] T026 [P] [US2] Implementar a página de resgate, a carteira de vales e o uso no resumo do agendamento em `apps/consumer-web/src/routes/vale.$token.tsx`, `apps/consumer-mobile/src/app/perfil/carteira.tsx` e `apps/consumer-mobile/src/app/agendar/resumo/GiftCard.tsx`.

**Checkpoint**: o presente vira atendimento.

---

## Phase 5: User Story 3 - Reembolso e validade (Priority: P1)

**Goal**: reembolso integral em até 7 dias sem uso, pelo mesmo meio. Fora disso, só por decisão auditada. Validade por filial com avisos de 30 e 7 dias. Suspensão estende a validade; encerramento da filial oferece alternativa.

**Independent Test**: reembolso no 5º dia aceito, com uso recusado, e um vale vencido conferido (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T027 [P] [US3] Teste de contrato de `refundGiftCard` e `businessGiftCardAction` em `services/payments/src/gift-cards/http/refund.contract.test.ts`.
- [ ] T028 [P] [US3] Teste com relógio simulado em `services/payments/src/gift-cards/refund/refund.int.test.ts`:
  - dia 5 sem uso → reembolso integral pelo mesmo meio, sem ação manual (SC-005);
  - dia 8 → `gift_card.refund_window_closed`;
  - com uso → recusado;
  - o reembolso fora da regra pelo estabelecimento vai para a trilha;
  - vale com nota emitida na venda segue o cancelamento da 017 (REQ-VAL-031);
  - avisos 30 e 7 dias antes e expiração em `data-model.md` `gift_card.expires_at`;
  - tenant suspenso 10 dias → `gift_card.suspension_extension_days` += 10;
  - filial encerrada → oferta da filial mais próxima ou reembolso do saldo.

### Implementation for User Story 3

- [ ] T029 [US3] Implementar o reembolso (pelo estorno da 012) e o reembolso fora da regra auditado em `services/payments/src/gift-cards/refund/refund.ts`.
- [ ] T030 [US3] Implementar no `workers` os avisos de validade (prazos de `gift_card_policy.expiry_notice_days`; avisos pela 011, T076), a expiração (lançamento `expire`), a extensão por suspensão (consumidor da 019) e o tratamento do encerramento de filial (consumidor da 005) em `services/payments/src/gift-cards/expiry/expiry.ts`.
- [ ] T031 [US3] Implementar as rotas de reembolso e `/v1/tenant/gift-cards/{id}/{action}` em `services/payments/src/gift-cards/http/refund.ts`.
- [ ] T032 [P] [US3] Implementar o pedido de reembolso na carteira do comprador em `apps/consumer-mobile/src/app/perfil/vales-comprados.tsx`.

**Checkpoint**: direitos do consumidor garantidos.

---

## Phase 6: User Story 4 - Estabelecimento configura, vende e acompanha (Priority: P2)

**Goal**: configuração por filial (ligar, faixa ou valores fixos, itens presenteáveis, artes, validade). Lista e totais do mês. Venda e aplicação no balcão pela Recepção.

**Independent Test**: faixa de R$ 50 a R$ 500, dois serviços presenteáveis e 12 meses; vender três vales e conferir a lista (quickstart §5).

### Tests for User Story 4 ⚠️

- [ ] T033 [P] [US4] Teste de contrato de `setGiftCardSettings`, `listBranchGiftCards` e `sellAtCounter` em `services/payments/src/gift-cards/http/tenant.contract.test.ts`.
- [ ] T034 [P] [US4] Teste de integração em `services/payments/src/gift-cards/settings/settings.int.test.ts`:
  - a validade abaixo de 6 meses é recusada;
  - valor fora de `data-model.md` `gift_card_settings.amount_min_cents`/`gift_card_settings.amount_max_cents`, ou fora de `gift_card_settings.fixed_amounts_cents`, é recusado;
  - só `gift_card_settings.giftable_item_ids` são oferecidos;
  - os totais do mês (vendido, usado, a vencer, vencido, reembolsado) batem (SC-007).

### Implementation for User Story 4

- [ ] T035 [US4] Implementar a configuração por filial (com `data-model.md` `gift_card_settings.enabled`, `gift_card_settings.art_ids`, catálogo da Koovela e upload) em `services/payments/src/gift-cards/settings/settings.ts`.
- [ ] T036 [US4] Implementar a lista, os totais e a venda no balcão em `services/payments/src/gift-cards/http/tenant.ts`.
- [ ] T037 [P] [US4] Implementar a tela "Vale-presente e pacotes vendidos", a configuração e a venda no balcão em `apps/tenant-web/src/routes/gift-cards/`.

**Checkpoint**: o estabelecimento vende e acompanha vales.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T038 Implementar o `HolderDataPort` de vales comprados e recebidos em `services/payments/src/gift-cards/holder-data/port.ts` e registrá-lo em `packages/contracts/privacy/holder-ports.yaml` (REQ-VAL-061), com `applyRetention` para as categorias `gift_cards` (5 anos) e `gift_card_recipient_contact` (até o resgate ou a validade + 30 dias), prazos lidos da tabela da 022.
- [ ] T039 [P] Teste de privacidade em `services/payments/src/gift-cards/holder-data/port.int.test.ts`: o contato do destinatário some no resgate ou na validade + 30 dias; `applyRetention` remove o vencido.
- [ ] T040 [P] Caso de isolamento em `tests/isolation/cases/gift-cards.ts`.
- [ ] T041 [P] Testes com a flag `gift_cards.v1` ligada e desligada em `services/payments/src/gift-cards/__tests__/flags.int.test.ts`, e axe nas telas em `apps/consumer-web/e2e/gift-cards-a11y.spec.ts`.
- [ ] T042 [P] Teste de carga de pico em data comemorativa (10× o normal; compra ≤ 1,5 s e resgate ≤ 500 ms p95) em `tests/load/gift-cards.k6.ts`.
- [ ] T043 [P] Métricas (tentativas de código, vencimentos, reembolsos) no painel `infra/observability/dashboards/gift-cards.json` e mapas de ingestão do BI em `bi/ingest/mappings/gift-cards.yaml`.
- [ ] T044 Registrar em `docs/ops/decisions/nfse-vale-e-pacote.md` a decisão de 2026-11-27: a 017 tem `per_session` como padrão para pacotes (configurável) e o vale emite no uso (`fiscal_invoice.source_kind = gift_card_use`), conforme a PEN-24; falta o parecer do contador. Registrar também as telas a conferir (resgate, carteira, balcão) em `docs/design/telas-sem-prototipo-029.md`.
- [ ] T045 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-029.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** e **US3** dependem de US1 e podem correr em paralelo.
- **US4** depende da fase 2. A venda no balcão depende de US1, e a aplicação no balcão, de US2.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 a T006 e T008.
- Depois de US1: US2 e US3 em paralelo. A configuração da US4 pode começar junto com US1.

---

## Parallel Example: Foundational

```bash
Task: "T004 propriedade dos abatimentos"
Task: "T005 segurança do código"
Task: "T006 concorrência do saldo"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fases 1 e 2.
2. US1 (compra), US2 (resgate e uso) e US3 (reembolso e validade). O reembolso em 7 dias é exigência do CDC desde a primeira venda.
3. **Parar e validar** com o quickstart §1 a §4.

### Incremental Delivery

1. US4 (configuração, balcão e painel).
2. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-VAL que atende. Campos com restrição citam `data-model.md` e o campo.
- O saldo só se move por lançamentos no livro da 012; o código nunca é guardado em claro.
- NFS-e no uso (PEN-24): validar com contador antes de ligar a flag em produção.
- Commit por tarefa ou grupo lógico, em branch `029-vale-presente-pacotes`, por PR.
- Análise de 2026-11-27: `gift_card_policy` versionada (CONST 8, T008); ordem dos descontos alinhada (spec, modelo e T004); retenção pela 022 (T038); campos citados; casos de borda. Nas specs donas: 009 T065 (vale aplicado no agendamento), 011 T076 (avisos), 018 T045 (comissão com `payment_route = gift_card`), 019 T048 (taxa `booking_fee_gift_card`).
