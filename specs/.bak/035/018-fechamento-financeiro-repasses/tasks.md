---
description: "Lista de tarefas da spec 018 — Fechamento financeiro e repasses"
---

# Tasks: Fechamento financeiro e repasses

**Input**: documentos de `specs/018-fechamento-financeiro-repasses/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 017 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- a propriedade do total (REQ-FEC-006);
- a reconciliação do resumo com o livro financeiro (012) e as notas (017).

**Organization**: por história de usuário (US1–US5). P1: US1, US2, US3. P2: US4. P3: US5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar `services/payments/src/settlement/{periods,statements,adjustments,disputes,payouts,summary,checklist,exports}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/settlement.openapi.yaml` e `packages/contracts/asyncapi/settlement-events.asyncapi.yaml` (fonte: `specs/018-fechamento-financeiro-repasses/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações de fechamento em `packages/contracts/rbac/permissions.yaml`:
  - aprovação pelo Proprietário, delegável ao Gerente da filial (`settlement.approve` com `allow_if_granted`);
  - Gerente restrito à própria filial (PEN-03);
  - Colaborador com `self`;
  - Fin/Ops com consulta no back-office;
  - `audit_category = financial` nos ajustes e repasses.

  Declarar a flag `payments.settlement_v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas e regras de imutabilidade e de total.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de propriedade (portão de merge) em `services/payments/src/settlement/statements/totals.property.test.ts`: `total_cents = Σ commission_cents + Σ amount_cents` para qualquer combinação de linhas e ajustes (`data-model.md` `settlement_statement.total_cents`, `settlement_statement.lines_total_cents`, `settlement_statement.adjustments_total_cents`; REQ-FEC-006, SC-002). Incluir a propriedade de `settlement_statement.manual_due_cents` e `settlement_statement.negative_balance_cents` (nunca negativo o devido; o excesso vira saldo negativo) e a invariante 5 (`paid_via_split_cents + held_pending_recipient_cents` = partes `professional` da 012).
- [ ] T005 [P] Teste de imutabilidade em `services/payments/src/settlement/statements/immutable.int.test.ts`: um extrato `approved`, `paid_partial` ou `paid` não aceita alteração de linhas, ajustes ou totais, e qualquer tentativa responde `settlement.statement_approved`; só o estado de pagamento avança (`data-model.md` `settlement_statement.state`; SC-003).

### Implementação da fundação

- [ ] T006 Criar a migração `services/payments/migrations/0101_settlement.ts` no schema do tenant, com estas tabelas e restrições (todas em `data-model.md`):
  - `settlement_settings`: CHECK em `settlement_settings.period_kind` e `settlement_settings.dispute_window_days` (1–10).
  - `settlement_period`: CHECK em `settlement_period.state`.
  - `settlement_statement`: UNIQUE `(period_id, professional_id)` e CHECK em `settlement_statement.state` (inclui `reviewed`, `paid_partial`, `paid`); colunas `settlement_statement.held_pending_recipient_cents` e `settlement_statement.negative_balance_cents`.
  - `settlement_line`: imutável; CHECK em `settlement_line.payment_route`.
  - `settlement_pending_line`: CHECK em `settlement_pending_line.reason`.
  - `settlement_adjustment`: imutável; CHECK em `settlement_adjustment.kind`.
  - `settlement_dispute`: CHECK em `settlement_dispute.target` e `settlement_dispute.state`.
  - `settlement_payout`: CHECK em `settlement_payout.method` e `settlement_payout.professional_ack`.
- [ ] T007 Implementar o modelo de extrato e de ajuste em `services/payments/src/settlement/statements/statement.ts`:
  - recálculo do total só em `draft` e `in_review`;
  - aprovado imutável;
  - ajustes sempre como linhas novas.
- [ ] T008 Implementar o outbox de eventos sem dados bancários (`payments.settlement_statement.changed` com `drafted`, `reviewed`, `approved`, `paid` e `payout_overdue`; `payments.settlement_dispute.changed`; `payments.settlement_payout.recorded.v1`; `payments.settlement_payout.acknowledged.v1`; `payments.settlement_period.closed.v1`) em `services/payments/src/settlement/events.ts` (REQ-FEC-042).

**Checkpoint**: modelo de fechamento seguro.

---

## Phase 3: User Story 1 - Fechamento do período por colaborador (Priority: P1) 🎯 MVP

**Goal**: período configurável e rascunho por colaborador, com as linhas iguais ao contrato da 007. Estornos e correções de períodos anteriores entram como ajustes. Há ajustes manuais auditados e uma seção de pendentes fora do total.

**Independent Test**: com um mês de dados, gerar o fechamento e conferir cada linha (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T009 [P] [US1] Teste de contrato de `setSettlementSettings`, `listStatements`, `getStatement` e `addAdjustment` em `services/payments/src/settlement/http/statements.contract.test.ts`; `addAdjustment` repetido com a mesma `Idempotency-Key` não duplica.
- [ ] T010 [P] [US1] Teste de integração em `services/payments/src/settlement/periods/generate.int.test.ts`:
  - um rascunho por colaborador ativo, fechado à meia-noite local da filial (REQ-FEC-001/002);
  - cada `settlement_line.commission_cents` igual ao contrato da 007 com `data-model.md` `settlement_line.commission_rule_version_id` congelado (REQ-FEC-041);
  - estorno ou chargeback de período aprovado vira ajuste do período atual com `data-model.md` `settlement_adjustment.ref` (REQ-FEC-003);
  - atendimentos sem registro ou sem pagamento ficam em `settlement_pending_line`, fora do total (REQ-FEC-005);
  - ajuste manual exige motivo e é auditado (`data-model.md` `settlement_adjustment.reason`; REQ-FEC-004);
  - geração de 50 colaboradores em ≤ 1 min;
  - colaborador que saiu no meio do período tem fechamento até o fim do vínculo, e ajustes posteriores entram num fechamento final extra;
  - estorno sem atendimentos seguintes gera `settlement_statement.negative_balance_cents`, mostrado ao Proprietário, sem cobrança;
  - período sem atendimentos só gera fechamento se houver ajustes;
  - atendimento concluído num período e pago no seguinte entra no período em que ficou concluído e pago;
  - arrendatário: linha com a cota-parte do estabelecimento e o valor do colaborador (REQ-EQP-043), taxa de estação como ajuste `chair_fee`;
  - consumidor aparece nas linhas só pelo primeiro nome.

### Implementation for User Story 1

- [ ] T011 [US1] Implementar as configurações e os períodos em `services/payments/src/settlement/periods/periods.ts`, com o job de fechamento no `workers` no fuso da filial (`data-model.md` `settlement_period.starts_on`, `settlement_period.ends_on`). Uma mudança de período vale só a partir do próximo.
- [ ] T012 [US1] Implementar a geração das linhas em `services/payments/src/settlement/periods/generate.ts`, lendo atendimentos concluídos e pagos e o livro da 012 e chamando `quoteCommission` da 007 com a versão congelada (`data-model.md` `settlement_line.payment_ids`, `settlement_line.service_date`, `settlement_line.item_id`, `settlement_line.paid_cents`, `settlement_line.base_cents`, `settlement_line.payment_route`; `settlement_statement.branch_id`). Tratar os casos de borda da T010 (fim de vínculo com fechamento final extra, período sem atendimentos, período de conclusão e pagamento, arrendatário).
- [ ] T013 [US1] Implementar os ajustes manuais e automáticos (estorno e chargeback vindos da 012) em `services/payments/src/settlement/adjustments/adjustments.ts` (`data-model.md` `settlement_adjustment.amount_cents` com sinal, `settlement_adjustment.actor_id`, `settlement_adjustment.ref`), com `Idempotency-Key` obrigatório. Saldo negativo vai para `settlement_statement.negative_balance_cents` do próximo período, sem cobrança.
- [ ] T014 [US1] Implementar as rotas `/v1/tenant/settlement/settings` e `/v1/tenant/settlement/statements*` em `services/payments/src/settlement/http/statements.ts`.
- [ ] T015 [P] [US1] Implementar a tela de repasses ao colaborador na P21 em `apps/tenant-web/src/routes/finance/settlement/`, com as linhas (consumidor só pelo primeiro nome), os ajustes, o saldo negativo e a seção de pendentes.

**Checkpoint**: rascunho correto por colaborador.

---

## Phase 4: User Story 2 - Colaborador confere antes da aprovação (Priority: P1)

**Goal**: aviso ao colaborador, janela de contestação, resposta com ajuste ou explicação, aprovação com contestação aberta registrada e aprovação delegável.

**Independent Test**: contestar uma linha pelo app, responder pelo painel e aprovar (quickstart §2 e §3).

### Tests for User Story 2 ⚠️

- [ ] T016 [P] [US2] Teste de contrato de `openDispute`, `answerDispute`, `approveStatement` e `listMyStatements` em `services/payments/src/settlement/http/disputes.contract.test.ts`.
- [ ] T017 [P] [US2] Teste de integração em `services/payments/src/settlement/disputes/disputes.int.test.ts`:
  - depois da janela, a contestação recebe `settlement.dispute_window_closed` (`data-model.md` `settlement_statement.dispute_until`; REQ-FEC-010);
  - a resposta com ajuste aponta `data-model.md` `settlement_dispute.answer_adjustment_id` e avisa o colaborador (REQ-FEC-011);
  - aprovar com contestação aberta exige nota (`data-model.md` `settlement_statement.approval_note`; REQ-FEC-012);
  - a aprovação delegada ao Gerente só vale na filial dele (REQ-FEC-013).

### Implementation for User Story 2

- [ ] T018 [US2] Implementar o aviso do rascunho (011), a janela, as contestações e as respostas em `services/payments/src/settlement/disputes/disputes.ts` (`data-model.md` `settlement_dispute.target_id`, `settlement_dispute.reason`, `settlement_dispute.answer`, `settlement_dispute.answered_by`). Ajuste ou resposta do Gerente passa o fechamento a `reviewed` (`settlement_statement.state`).
- [ ] T019 [US2] Implementar a aprovação (Proprietário ou Gerente delegado por `data-model.md` `settlement_settings.approval_delegated_to_branch_manager`) em `services/payments/src/settlement/statements/approve.ts`, gravando `settlement_statement.approved_by`, `settlement_statement.approved_at` e `settlement_statement.approval_note`.
- [ ] T020 [US2] Implementar as rotas `/v1/pro/settlement/statements*` e `/v1/tenant/settlement/statements/{id}/disputes/*` e `/approve` em `services/payments/src/settlement/http/disputes.ts`.
- [ ] T021 [P] [US2] Implementar a conferência e a contestação no K03 (`apps/pro-mobile/app/commissions/statement/[id].tsx`) e no KD3 (`apps/tenant-web/src/routes/pro/commissions/Statement.tsx`), mais a resposta e a aprovação na P21.

**Checkpoint**: fechamento conferido e aprovado.

---

## Phase 5: User Story 3 - Registrar e acompanhar o repasse (Priority: P1)

**Goal**:
- conferir o repassado pelo split contra o calculado, lançando a diferença no próximo período;
- registrar o saldo pago fora da plataforma, inclusive parcial;
- lembrar o Proprietário depois de 10 dias;
- o colaborador confirma o recebimento ou aponta divergência;
- o app mostra previsto, a receber e recebido.

**Independent Test**: registrar um Pix fora da plataforma e conferir "pago" no painel e "recebido" no app (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T022 [P] [US3] Teste de contrato de `recordPayout` e `ackPayout` em `services/payments/src/settlement/http/payouts.contract.test.ts`; `recordPayout` repetido com a mesma `Idempotency-Key` não duplica.
- [ ] T023 [P] [US3] Teste de integração em `services/payments/src/settlement/payouts/payouts.int.test.ts`:
  - o repassado pelo split (`data-model.md` `settlement_statement.paid_via_split_cents`) comparado ao calculado gera, na diferença, um ajuste `split_reconciliation` no próximo período (REQ-FEC-023);
  - pagamento manual parcial deixa saldo (`data-model.md` `settlement_statement.manual_due_cents`, `settlement_statement.manual_paid_cents`; REQ-FEC-021);
  - aprovado com saldo há mais de 10 dias gera lembrete (REQ-FEC-025);
  - o colaborador confirma ou aponta divergência (`data-model.md` `settlement_payout.professional_ack`; REQ-FEC-022);
  - colaboradora com recebedor pendente: a comissão retida vai para `settlement_statement.held_pending_recipient_cents`, não gera `split_reconciliation`; liberada pela 012 (T024 da 012), entra em `paid_via_split_cents` do período da liberação;
  - estado passa a `paid_partial` e depois `paid` conforme `manual_paid_cents` alcança `manual_due_cents`.

### Implementation for User Story 3

- [ ] T024 [US3] Implementar a conferência do split contra o calculado em `services/payments/src/settlement/payouts/split-check.ts`, lendo as partes `professional` da 012 (`payments_split_part.status`): `settled` soma em `settlement_statement.paid_via_split_cents`; `pending_professional` soma em `settlement_statement.held_pending_recipient_cents` e não gera diferença.
- [ ] T025 [US3] Implementar o registro de repasse manual, a confirmação e o lembrete (job no `workers`) em `services/payments/src/settlement/payouts/payouts.ts`, com as rotas `/v1/tenant/settlement/statements/{id}/payouts` (com `Idempotency-Key`) e `/v1/pro/settlement/payouts/{id}/ack` (`data-model.md` `settlement_payout.paid_on`, `settlement_payout.amount_cents`, `settlement_payout.actor_id`, `settlement_payout.ack_note`). Atualizar `settlement_statement.state` para `paid_partial` ou `paid`.
- [ ] T026 [P] [US3] Atualizar o K03 e o KD3 com previsto, a receber e recebido por período, em até 2 toques (REQ-FEC-024, SC-004), mostrando à parte a comissão retida até a verificação do recebedor, e incluir o registro de repasse na P21.

**Checkpoint**: repasse registrado e confirmado.

---

## Phase 6: User Story 4 - Fechamento do negócio e exportação para o contador (Priority: P2)

**Goal**: resumo do período por filial e total, batendo com o financeiro (012) e com as notas (017); lista de verificação; conclusão do fechamento; exportação financeira junto com a fiscal; demonstrativo em PDF.

**Independent Test**: conferir os totais contra a tela "Financeiro" e o histórico de notas, e exportar (quickstart §5).

### Tests for User Story 4 ⚠️

- [ ] T027 [P] [US4] Teste de contrato de `getPeriodSummary`, `closePeriod`, `exportPeriod` e `downloadMyStatement` em `services/payments/src/settlement/http/period.contract.test.ts`.
- [ ] T028 [P] [US4] Teste de reconciliação (portão de merge) em `services/payments/src/settlement/summary/reconcile.int.test.ts`: os totais do resumo batem com o livro financeiro da 012 e as notas da 017 no mesmo período (REQ-FEC-030, SC-005).
- [ ] T029 [P] [US4] Teste de integração em `services/payments/src/settlement/checklist/checklist.int.test.ts`:
  - a lista de verificação inclui sem registro, notas pendentes, divergências, contestações e repasses não registrados (REQ-FEC-031);
  - concluir registra a data e o ator e leva as pendências ao próximo período (`data-model.md` `settlement_period.closed_by`, `settlement_period.closed_at`; REQ-FEC-032).

### Implementation for User Story 4

- [ ] T030 [US4] Implementar o resumo do período (≤ 2 s) em `services/payments/src/settlement/summary/summary.ts`, com o Gerente vendo só a própria filial.
- [ ] T031 [US4] Implementar a lista de verificação e a conclusão em `services/payments/src/settlement/checklist/checklist.ts`.
- [ ] T032 [US4] Implementar a exportação (planilha com `exceljs`, empacotada com a exportação fiscal da 017) e o demonstrativo em PDF por Chromium headless no `workers` (consumidor só pelo primeiro nome), em `services/payments/src/settlement/exports/{export,statement-pdf}.ts` (REQ-FEC-033/034, SC-006).
- [ ] T033 [US4] Implementar as rotas `/v1/tenant/settlement/periods/*` e `/v1/pro/settlement/statements/{id}/pdf` em `services/payments/src/settlement/http/period.ts`.
- [ ] T034 [P] [US4] Implementar o resumo, a lista de verificação e a exportação na P21 em `apps/tenant-web/src/routes/finance/settlement/Period.tsx`. Meta: aprovar 5 colaboradores em até 15 min (SC-001).

**Checkpoint**: mês fechado e exportado.

---

## Phase 7: User Story 5 - Gerente prepara o fechamento da filial (Priority: P3)

**Goal**: o Gerente revisa os fechamentos da própria filial, inclui ajustes e responde contestações. Ele não vê outras filiais e só aprova se o Proprietário tiver delegado.

**Independent Test**: o Gerente da filial A revisa e ajusta, não vê a B, e o Proprietário aprova (spec, História 5).

### Tests for User Story 5 ⚠️

- [ ] T035 [P] [US5] Teste de autorização em `services/payments/src/settlement/http/manager-scope.int.test.ts`:
  - o Gerente da A vê, ajusta e responde só na A;
  - a filial B responde 404;
  - aprovar sem delegação responde 403;
  - o Proprietário aprova (REQ-FEC-013, PEN-03);
  - o Suporte em sessão de suporte não aprova nem registra repasse (REQ-IDN-063).

### Implementation for User Story 5

- [ ] T036 [US5] Aplicar o escopo de filial do Gerente nas consultas e nos comandos em `services/payments/src/settlement/scope.ts`, e mostrar a opção de delegação na P21 em `apps/tenant-web/src/routes/finance/settlement/Delegation.tsx`.

**Checkpoint**: preparação descentralizada.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T037 [P] Registrar os casos de isolamento em `services/payments/src/settlement/isolation.cases.ts` (fechamentos e repasses de outro tenant → 404).
- [ ] T038 [P] Testes com a flag `payments.settlement_v1` ligada e desligada em `services/payments/src/settlement/__tests__/flags.int.test.ts`.
- [ ] T039 [P] Implementar a consulta de fechamentos pelo Fin/Ops no back-office em `apps/admin-web/src/routes/settlement/` e a rota `/v1/admin/settlement/statements`.
- [ ] T040 [P] Criar o painel Grafana "Fechamentos" em `infra/observability/dashboards/settlement.json`: tempo até concluir (SC-007), contestações abertas, saldos a pagar e diferenças do split.
- [ ] T041 Registrar as telas a conferir (contestação do colaborador e lista de verificação) em `docs/design/telas-sem-prototipo-018.md`.
- [ ] T042 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-018.md`.
- [ ] T043 [P] Implementar a retenção da seção "Dados pessoais" em `services/payments/src/settlement/retention/anonymize.ts` (job no `workers`, em lotes): fechamentos, linhas, ajustes, contestações e repasses com mais de 5 anos são anonimizados ("colaborador removido"; motivos e respostas apagados), mantendo valores e totais (invariante 6 do `data-model.md`). Pedido de eliminação do colaborador antes disso é atendido só nos campos fora da guarda legal, com a base registrada ([C4]). Teste em `services/payments/src/settlement/retention/anonymize.int.test.ts` (CONST IV).
  - Prazos e ação ao vencer lidos da tabela de retenção da 022 (`getRetentionRules`, com cache; categorias registradas em `packages/contracts/privacy/holder-ports.yaml`); os números desta tarefa são só os valores iniciais do seed da 022. O job roda pelo `applyRetention` do `HolderDataPort` do domínio, disparado pela 022 (T040 da 022), e nenhum prazo fica no código (CONST 8; análise da 022, 2026-11-27).
- [ ] T044 [P] Gerar linhas do fechamento para aulas de turma (026) em `services/payments/src/settlement/periods/class-lines.ts`: uma linha por aula dada pelo instrutor (`data-model.md` `settlement_line.source_kind` = `class_session`, `settlement_line.source_id`), com a comissão calculada pelo contrato da 007 (fixo por aula ou percentual por presença; base `plan_usage` fechada no ciclo do aluno). Teste em `services/payments/src/settlement/periods/class-lines.int.test.ts`.
- [ ] T045 [P] Tratar as linhas cobertas por vale-presente (029) em `services/payments/src/settlement/periods/gift-card-lines.ts`: com `payments.gift_card.used.v1`, a linha do atendimento recebe `settlement_line.payment_route = gift_card` pela parte coberta, e a comissão dessa parte soma em `settlement_statement.manual_due_cents` (sem split no uso). Teste em `services/payments/src/settlement/periods/gift-card-lines.int.test.ts`.
- [ ] T046 [P] Gerar uma linha do fechamento por etapa em combos com troca (030) em `services/payments/src/settlement/periods/combo-step-lines.ts`: cada profissional recebe só a linha da própria etapa (`data-model.md` `settlement_line.step_position`), com a base da etapa (preço avulso menos `scheduling_appointment_step.discount_share_cents`) e o `commission_rule_version_id` da etapa. Teste em `services/payments/src/settlement/periods/combo-step-lines.int.test.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2, da 007 e da 012.
- **US2** depende de US1.
- **US3** depende de US2 (aprovado).
- **US4** depende de US1 e da 017; pode correr em paralelo com US2 e US3.
- **US5** depende de US2.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 e T005.
- Depois de US1: US2 e US4 em paralelo; depois de US2, US3 e US5.

---

## Parallel Example: User Story 4

```bash
# Testes primeiro, juntos:
Task: "T027 contrato em services/payments/src/settlement/http/period.contract.test.ts"
Task: "T028 reconciliação em services/payments/src/settlement/summary/reconcile.int.test.ts"
Task: "T029 lista de verificação em services/payments/src/settlement/checklist/checklist.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (gerar) e US2 (conferir e aprovar).
3. **Parar e validar** com o quickstart §1 a §3.

### Incremental Delivery

1. US3 (repasse).
2. US4 (resumo e exportação).
3. US5 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-FEC que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhuma regra de comissão, split ou nota é recalculada aqui. Tudo vem dos contratos da 007, 012 e 017.
- Um fechamento aprovado nunca muda; correções entram como ajustes do período seguinte.
- Commit por tarefa ou grupo lógico, em branch `018-fechamento-financeiro-repasses`, por PR.
- T046 acrescentada na análise da 030 (2026-11-27): linha de fechamento por etapa de combo.
- T045 acrescentada na análise da 029 (2026-11-27): comissão de atendimento pago com vale.
- T044 acrescentada na análise da 026 (2026-11-27): comissão por aula no fechamento.
- Análise de 2026-11-27: estados `reviewed`, `paid_partial` e `paid`; comissão retida da 012 em `held_pending_recipient_cents`; regra de `manual_due_cents` e saldo negativo; nomes de eventos alinhados ao contrato (mais `payout.acknowledged`); casos de borda em T010/T012; `Idempotency-Key` em T009/T013/T022/T025; Suporte em T035. T043 acrescentada (retenção). Avisos da equipe na 011 (T066).
