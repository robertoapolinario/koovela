---
description: "Lista de tarefas da spec 015 — Fidelidade"
---

# Tasks: Fidelidade

**Input**: documentos de `specs/015-fidelidade/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 014 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes antes do código. O teste de concorrência do resgate (saldo nunca negativo) é portão de merge.

**Organization**: por história de usuário (US1–US6). P1: US1, US2, US3. P2: US4, US5. P3: US6. O livro-razão de pontos fica na fundação porque acúmulo e resgate dependem dele.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/loyalty/`:
  - `package.json` e `tsconfig.json`;
  - plugin Fastify em `KOOVELA_DOMAINS`;
  - pastas `src/{program,simulator,accrual,ledger,redemption,tiers,expiry,results,abuse,http}` e `migrations/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/loyalty.openapi.yaml` e `packages/contracts/asyncapi/loyalty-events.asyncapi.yaml` (fonte: `specs/015-fidelidade/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações de fidelidade em `packages/contracts/rbac/permissions.yaml`:
  - configuração pelo Proprietário;
  - Gerente da própria filial com `allow_if_granted` (`manager.loyalty.configure`, PEN-03);
  - resgate no balcão pela Recepção e pelo Colaborador;
  - ajuste manual com `audit_category` e `sensitive` acima de 1.000 pontos.

  Declarar a flag `loyalty.v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, versões do programa e livro-razão de pontos com saldo nunca negativo.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de concorrência (portão de merge) em `services/loyalty/src/ledger/concurrency.int.test.ts`. Com saldo de 300, 10 resgates simultâneos de 300 resultam em 1 sucesso. O saldo nunca fica negativo, inclusive no reprocessamento (`data-model.md` `loyalty_account.available`, `loyalty_account.reserved`; REQ-FID-023, SC-002).
- [ ] T005 [P] Teste de propriedade em `services/loyalty/src/ledger/ledger.property.test.ts`:
  - a soma dos lançamentos é igual ao saldo;
  - expiração FIFO por lote (`data-model.md` `loyalty_entry.credit_lot_id`, `loyalty_entry.expires_at`);
  - estorno de pontos já usados vira `debt_points` e o disponível exibido nunca é negativo (`data-model.md` `loyalty_account.debt_points`; REQ-FID-013/014).

### Implementação da fundação

- [ ] T006 Criar a migração `services/loyalty/migrations/0001_loyalty.ts` no schema do tenant com as tabelas e regras abaixo (campos de `data-model.md`):
  - `loyalty_program`: CHECK em `loyalty_program.state`;
  - `loyalty_program_version`: CHECK em `loyalty_program_version.mechanic` e `loyalty_program_version.balance_mode`; `loyalty_program_version.monthly_cost_cap_cents` obrigatório;
  - `loyalty_tier`: `loyalty_tier.position` de 1 a 4; `loyalty_tier.multiplier_pct` de 100 a 200;
  - `loyalty_reward`: CHECK em `loyalty_reward.kind`;
  - `loyalty_account`: `CHECK available ≥ 0`;
  - `loyalty_entry`: CHECK em `loyalty_entry.type` e `loyalty_entry.state`; UNIQUE `(appointment_id, type)`;
  - `loyalty_redemption`: CHECK em `loyalty_redemption.state` e `loyalty_redemption.consumer_confirmation`;
  - `loyalty_monthly_cost`;
  - `loyalty_abuse_alert`: CHECK em `loyalty_abuse_alert.rule` e `loyalty_abuse_alert.state`;
  - `loyalty_audit_outbox` e `loyalty_outbox`.
- [ ] T007 Implementar o livro-razão em `services/loyalty/src/ledger/ledger.ts`:
  - lançamentos imutáveis;
  - conta travada com `FOR UPDATE`;
  - saldo materializado na mesma transação;
  - contas por negócio ou por filial conforme `balance_mode` (REQ-FID-030/031);
  - lançamento com `data-model.md` `loyalty_entry.points` (inteiro), `loyalty_entry.appointment_id`, `loyalty_entry.reward_id`, `loyalty_entry.reason` e `loyalty_entry.actor_id` (obrigatórios em `adjust`).
- [ ] T008 Implementar as versões do programa em `services/loyalty/src/program/versions.ts`, com os limites da plataforma vindos do back-office (sem número no código) e auditoria (`data-model.md` `loyalty_program_version.valid_from`). Mudança que reduz benefício de tier não rebaixa ninguém na hora: vale na próxima revisão anual de cada consumidor, com aviso 30 dias antes (edge case).
- [ ] T009 Implementar o outbox de eventos em `services/loyalty/src/events.ts`: `loyalty.points.changed`, `loyalty.tier.changed.v1` e `loyalty.program.changed`.

**Checkpoint**: livro-razão confiável.

---

## Phase 3: User Story 1 - Configurar o programa e simular antes de ativar (Priority: P1) 🎯 MVP

**Goal**: programa por negócio, desligado por padrão, com:
- mecânica por real ou por visita;
- até 4 tiers;
- catálogo de recompensas;
- validade e teto obrigatório.

O simulador é obrigatório antes de ativar. Em saúde, não há recompensa em dinheiro.

**Independent Test**: configurar, simular com o histórico e conferir que "ativar" só libera depois da simulação (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Teste de contrato de `getProgram`, `saveProgramDraft`, `simulateProgram`, `publishProgram` e `disableProgram` em `services/loyalty/src/http/program.contract.test.ts`.
- [ ] T011 [P] [US1] Teste de integração em `services/loyalty/src/program/program.int.test.ts`:
  - publicar sem simular a configuração atual gera `loyalty.simulation_required` (`data-model.md` `loyalty_program_version.simulated_at`; REQ-FID-005, SC-001);
  - o teto é obrigatório;
  - em saúde, recompensa em dinheiro gera `loyalty.cash_reward_in_health` (REQ-FID-008);
  - "cartão de selos" com `stamps_per_reward` (`data-model.md` `loyalty_program_version.stamps_per_reward`; REQ-FID-002).
- [ ] T012 [P] [US1] Teste E2E em `apps/tenant-web/e2e/loyalty-setup.spec.ts`: configurar e simular em até 10 min (SC-008), com axe.

### Implementation for User Story 1

- [ ] T013 [US1] Implementar a configuração em `services/loyalty/src/program/configure.ts`:
  - mecânica (`data-model.md` `loyalty_program_version.rate_tenths_per_real`, `loyalty_program_version.per_visit_bonus_points`);
  - tiers (`data-model.md` `loyalty_tier.name`, `loyalty_tier.perk_text`);
  - catálogo (`data-model.md` `loyalty_reward.cost_points`, `loyalty_reward.business_value_cents`, `loyalty_reward.min_tier`, `loyalty_reward.monthly_stock`, `loyalty_reward.service_ids`, `loyalty_reward.valid_until`; em saúde só `free_service` e `gift`);
  - validade (`data-model.md` `loyalty_program_version.expiry_months`).
- [ ] T014 [US1] Implementar o simulador no `workers` em `services/loyalty/src/simulator/simulator.ts`:
  - usa os últimos 6 meses de eventos da 009 e da 012;
  - estima pontos emitidos, custo, valor em aberto e receita incremental para empatar;
  - leva ≤ 10 s;
  - grava `data-model.md` `loyalty_program_version.simulated_at` e `loyalty_program_version.simulation_ref` da configuração simulada.
- [ ] T015 [US1] Implementar as rotas `/v1/tenant/loyalty/program*` em `services/loyalty/src/http/program.ts`.
- [ ] T016 [P] [US1] Implementar a tela P20 (regra, tiers, catálogo e simulador) em `apps/tenant-web/src/routes/loyalty/`. O botão "ativar" fica bloqueado até a simulação.

**Checkpoint**: programa configurado e simulado.

---

## Phase 4: User Story 2 - Consumidor acumula pontos ao ser atendido e pagar (Priority: P1)

**Goal**: crédito pela regra congelada e pelo multiplicador do tier, sobre o valor pago sem a parte do resgate. Selos por visita. Pagamento no local conforme a regra. Pacote gera pontos na compra. Estorno retira os pontos. Subida de tier é imediata. Tela de fidelidade e avisos.

**Independent Test**: atendimento de R$ 80 com 1 pt/R$ gera 80 pontos; estornar retira os pontos (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T017 [P] [US2] Teste de contrato de `listMyLoyalty` em `services/loyalty/src/http/consumer.contract.test.ts`.
- [ ] T018 [P] [US2] Teste de integração em `services/loyalty/src/accrual/accrual.int.test.ts`:
  - `floor(valor_pago_sem_resgate × taxa × multiplicador)`: R$ 170 com tier 1,2 gera 204;
  - evento repetido não duplica (UNIQUE `(appointment_id, type)`);
  - pagamento no local só gera pontos se `data-model.md` `loyalty_program_version.allow_on_site_payments` permitir (REQ-FID-011);
  - pacote gera pontos na compra e as sessões não geram (REQ-FID-012);
  - estorno retira os pontos (REQ-FID-013);
  - lançamento ligado ao titular pagante (REQ-FID-032);
  - crédito em ≤ 1 min (SC-003);
  - combo gera pontos sobre o valor pago do combo, "a partir de" sobre o valor final pago, e atendimento de valor zero não gera pontos (edge cases).

### Implementation for User Story 2

- [ ] T019 [US2] Implementar o acúmulo em `services/loyalty/src/accrual/accrual.ts`:
  - consumidor de `scheduling.appointment.state_changed` (concluído) e `payments.payment.changed` (aprovado, estornado);
  - versão do programa congelada no agendamento (`frozen.loyalty_rule_version_id`; REQ-FID-007);
  - valor zero não gera lançamento.
- [ ] T020 [US2] Implementar a subida imediata de tier em `services/loyalty/src/tiers/upgrade.ts` (`data-model.md` `loyalty_tier.entry_points_12m`, `loyalty_account.tier_position`; REQ-FID-003).
- [ ] T021 [US2] Implementar `GET /v1/consumer/loyalty` (saldo, tier, progresso, pontos a vencer em 30 dias, catálogo e histórico por negócio) em `services/loyalty/src/http/consumer.ts`, com resposta ≤ 300 ms p95.
- [ ] T022 [US2] Enviar pela 011 os avisos de crédito, subida de tier, resgate e expiração em `services/loyalty/src/events-notify.ts` (REQ-FID-041).
- [ ] T023 [P] [US2] Implementar as telas C15 em `apps/consumer-mobile/app/fidelidade/` e W17 em `apps/consumer-web/app/routes/fidelidade.tsx`.

**Checkpoint**: pontos acumulados e visíveis.

---

## Phase 5: User Story 3 - Resgatar recompensa no checkout ou no balcão (Priority: P1)

**Goal**: resgate no resumo, com reserva na confirmação, consumo na conclusão e devolução no cancelamento ou no não comparecimento. Resgate no balcão com confirmação no celular do consumidor. Desconto no split pela [D17]. Multa sobre o preço cheio.

**Independent Test**: com 500 pontos, resgatar "R$ 20 off" (300) e conferir a reserva, o preço e o consumo; cancelar e conferir a devolução (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Teste de contrato de `redeemOnSummary`, `counterRedemption` e `confirmCounterRedemption` em `services/loyalty/src/http/redemption.contract.test.ts`.
- [ ] T025 [P] [US3] Teste de integração em `services/loyalty/src/redemption/redemption.int.test.ts`:
  - transições `reserved` → `consumed` | `released` (`data-model.md` `loyalty_redemption.state`; REQ-FID-021);
  - no balcão, sem confirmação no celular, não há resgate (`data-model.md` `loyalty_redemption.consumer_confirmation`; REQ-FID-022, SC-007);
  - o desconto vai para o split como desconto do estabelecimento; "serviço grátis" registra pago zero e o custo do programa (REQ-FID-024);
  - a multa da 010 é calculada sobre o preço cheio (REQ-FID-025);
  - recompensa removida do catálogo e catálogo pausado pelo teto não afetam resgates já reservados (edge case, REQ-FID-006);
  - o evento `loyalty.points.reserved.v1` leva `discount_cents` e `reward_kind`, e a 009 grava o desconto no agendamento.

### Implementation for User Story 3

- [ ] T026 [US3] Implementar o resgate em `services/loyalty/src/redemption/redemption.ts`, ligado à confirmação, à conclusão e ao cancelamento da 009 por eventos. O desconto vai pelo evento `loyalty.points.reserved.v1` com `reward_kind` e `discount_cents` (`data-model.md` `loyalty_redemption.discount_cents` e `loyalty_redemption.program_cost_cents`): a 009 grava em `scheduling_appointment.loyalty_discount_cents` (T015 da 009) e a 012 usa no split e na comissão (T023 da 012). Liberação e consumo publicam o mesmo valor para a 009 desfazer ou manter.
- [ ] T027 [US3] Implementar a confirmação no celular do consumidor (push com aprovação ou OTP pela 003) em `services/loyalty/src/redemption/counter-confirmation.ts`, gravando `data-model.md` `loyalty_redemption.confirmed_at`.
- [ ] T028 [US3] Implementar as rotas de resgate do consumidor e do balcão em `services/loyalty/src/http/redemption.ts`.
- [ ] T029 [P] [US3] Implementar o seletor de recompensa no resumo C08/W11 (preço e saldo antes de confirmar, em até 2 toques; SC-004) e a tela de confirmação do resgate no balcão no app (`apps/consumer-mobile/app/fidelidade/confirmar/[id].tsx`).
- [ ] T030 [P] [US3] Implementar o resgate no check-out em K02/KD2 (`apps/pro-mobile/app/agenda/redeem.tsx`, `apps/tenant-web/src/routes/pro/agenda/Redeem.tsx`).

**Checkpoint**: resgate seguro de ponta a ponta.

---

## Phase 6: User Story 4 - Painel de resultado: custo contra receita incremental (Priority: P2)

**Goal**: painel mensal com emitidos, resgatados, expirados, custo, valor em aberto, participantes e uso do teto. Razão custo/receita incremental com o método explicado. Teto com aviso em 80% e pausa em 100%.

**Independent Test**: com 3 meses de dados, conferir as métricas e a razão (quickstart §5).

### Tests for User Story 4 ⚠️

- [ ] T031 [P] [US4] Teste de contrato de `getResults` em `services/loyalty/src/http/results.contract.test.ts`.
- [ ] T032 [P] [US4] Teste de integração em `services/loyalty/src/results/cap.int.test.ts`:
  - custo a 80% dispara `loyalty.cost_cap.threshold.v1` com aviso;
  - custo a 100% pausa o catálogo para resgates novos até o mês seguinte, sem afetar os já reservados (`data-model.md` `loyalty_monthly_cost.catalog_paused`; REQ-FID-006, SC-005);
  - a receita incremental compara participantes e não participantes do mesmo negócio, ou o período anterior (REQ-FID-051).

### Implementation for User Story 4

- [ ] T033 [US4] Implementar o custo mensal e o teto em `services/loyalty/src/results/cost-cap.ts` (`data-model.md` `loyalty_monthly_cost.cost_cents`, `loyalty_monthly_cost.cap_cents`).
- [ ] T034 [US4] Implementar o resultado e a receita incremental em `services/loyalty/src/results/results.ts`, com a rota `/v1/tenant/loyalty/results`. O Gerente vê só a própria filial (PEN-03).
- [ ] T035 [P] [US4] Implementar o painel de resultado na P20, com a razão e o método em até 2 toques (SC-006), em `apps/tenant-web/src/routes/loyalty/Results.tsx`.

**Checkpoint**: o Proprietário enxerga o retorno.

---

## Phase 7: User Story 5 - Saldo em rede com várias filiais (Priority: P2)

**Goal**: o Proprietário escolhe entre saldo único no negócio (custo atribuído à filial do resgate) e saldo por filial. A troca de modo vale só para pontos novos.

**Independent Test**: com 2 filiais, acumular na A e tentar resgatar na B (quickstart §6).

### Tests for User Story 5 ⚠️

- [ ] T036 [P] [US5] Teste de integração em `services/loyalty/src/ledger/balance-mode.int.test.ts`:
  - em modo `business`, o saldo é único e o custo vai para a filial do resgate;
  - em modo `branch`, o saldo é separado (`data-model.md` `loyalty_account.branch_id`);
  - a troca de modo vale só para pontos ganhos depois (REQ-FID-031);
  - pontos de um negócio nunca aparecem em outro (REQ-FID-033).

### Implementation for User Story 5

- [ ] T037 [US5] Implementar a resolução da conta por modo e a atribuição do custo à filial em `services/loyalty/src/ledger/accounts.ts` (`data-model.md` `loyalty_account.consumer_id` = titular pagante e `loyalty_account.joined_at`).
- [ ] T038 [P] [US5] Acrescentar a escolha do modo, com a explicação do efeito, na P20 em `apps/tenant-web/src/routes/loyalty/BalanceMode.tsx`.

**Checkpoint**: rede atendida.

---

## Phase 8: User Story 6 - Ajustes e proteção contra abuso (Priority: P3)

**Goal**:
- ajustes manuais com motivo, auditoria e step-up acima de 1.000 pontos;
- detecção de abuso com pontos em revisão;
- sem conversão nem transferência;
- revisão anual de tier;
- expiração com aviso;
- desligamento com 90 dias para resgatar.

**Independent Test**: fazer um ajuste com motivo e lançar pagamentos repetidos no local para disparar o alerta (quickstart §4 a §6).

### Tests for User Story 6 ⚠️

- [ ] T039 [P] [US6] Teste de contrato de `adjustPoints` em `services/loyalty/src/http/adjust.contract.test.ts`.
- [ ] T040 [P] [US6] Teste de integração em `services/loyalty/src/abuse/abuse.int.test.ts`:
  - ajuste acima de 1.000 pontos exige step-up e auditoria (REQ-FID-052);
  - as 3 regras de abuso geram alerta e pontos `pending_review` (`data-model.md` `loyalty_entry.state`; REQ-FID-053);
  - na exclusão da conta, os pontos são encerrados (REQ-FID-054);
  - desligar o programa leva a `winding_down` com resgate por 90 dias (`data-model.md` `loyalty_program.wind_down_until`; REQ-FID-055);
  - a queda de tier só acontece na revisão anual (`data-model.md` `loyalty_account.tier_review_on`);
  - versão nova que reduz benefício de tier: ninguém é rebaixado antes da própria revisão, e o aviso sai 30 dias antes.

### Implementation for User Story 6

- [ ] T041 [US6] Implementar os ajustes manuais em `services/loyalty/src/ledger/adjust.ts` e a rota `/v1/tenant/loyalty/accounts/{id}/adjust`.
- [ ] T042 [US6] Implementar a detecção de abuso no `workers` em `services/loyalty/src/abuse/detect.ts`, com o evento `loyalty.abuse.detected.v1` (`data-model.md` `loyalty_abuse_alert.entry_ids` e `loyalty_abuse_alert.decided_by` na decisão).
- [ ] T043 [US6] Implementar os jobs diários de expiração FIFO (com aviso 30 dias antes) e de revisão anual de tier em `services/loyalty/src/{expiry/expire.ts,tiers/review.ts}`; a revisão aplica a regra de tier da versão vigente e avisa 30 dias antes quando a mudança reduz benefício.
- [ ] T044 [US6] Implementar o desligamento com 90 dias e o encerramento na exclusão de conta (consumidor do evento da 003/022) em `services/loyalty/src/program/wind-down.ts`.
- [ ] T045 [P] [US6] Implementar a tela nova no back-office com limites da plataforma e alertas de abuso em `apps/admin-web/src/routes/loyalty/`.

**Checkpoint**: programa protegido.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T046 [P] Registrar os casos de isolamento em `services/loyalty/src/isolation.cases.ts`: programa, contas e lançamentos de outro tenant ou negócio → 404.
- [ ] T047 [P] Testes com a flag `loyalty.v1` ligada e desligada em `services/loyalty/src/__tests__/flags.int.test.ts`.
- [ ] T048 [P] Painel Grafana "Fidelidade" em `infra/observability/dashboards/loyalty.json`: créditos, resgates, uso do teto e alertas de abuso.
- [ ] T049 Registrar a tela a conferir (confirmação do resgate no celular) e a tela nova do back-office em `docs/design/telas-sem-prototipo-015.md`.
- [ ] T050 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-015.md`.
- [ ] T051 [P] Consumir `backoffice.fraud_action.changed` (021) em `services/loyalty/src/abuse/on-fraud-action.ts`: `hold_points` põe os pontos do alvo em `pending_review` (sem resgate); `reverted` e `expired` liberam; ação sobre colaborador vale só no vínculo do tenant. Teste em `services/loyalty/src/abuse/on-fraud-action.int.test.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (programa ativo), da 009 e da 012.
- **US3** depende de US2 (saldo).
- **US4** depende de US2 e US3.
- **US5** depende de US2.
- **US6** depende de US2.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 e T005.
- Depois de US2: US3, US5 e US6 em paralelo; US4 depois de US3.

---

## Parallel Example: User Story 3

```bash
# Testes primeiro, juntos:
Task: "T024 contrato em services/loyalty/src/http/redemption.contract.test.ts"
Task: "T025 integração em services/loyalty/src/redemption/redemption.int.test.ts"

# Telas juntas:
Task: "T029 resumo e confirmação no consumidor"
Task: "T030 resgate no check-out (K02/KD2)"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (configurar e simular) e US2 (acumular).
3. **Parar e validar** com o quickstart §1 e §2.

### Incremental Delivery

1. US3 (resgate) → US4 (resultado e teto).
2. US5 → US6 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → US6 → Polish.

---

## Notes

- Correções do `/speckit-analyze` de 2026-11-27 aplicadas sem tarefa nova. O desconto do resgate agora chega à 009 (`loyalty_discount_cents`) e à 012 (split e comissão).
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-FID que atende. Campos com restrição citam `data-model.md` e o campo.
- Pontos nunca viram dinheiro e nunca são transferidos. Os pontos de um negócio nunca valem em outro.
- Em saúde, não há recompensa em dinheiro nem preço exibido.
- Commit por tarefa ou grupo lógico, em branch `015-fidelidade`, por PR.
- T051 acrescentada na análise da 021 (2026-11-27): retenção de pontos pelo antifraude.
