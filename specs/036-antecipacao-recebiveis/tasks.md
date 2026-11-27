---
description: "Lista de tarefas da spec 036 — Antecipação de recebíveis"
---

# Tasks: Antecipação de recebíveis

**Input**: documentos de `specs/036-antecipacao-recebiveis/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 035 concluídas, especialmente 012 (livro e recebedores) e 018 (fechamento).

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- propriedade do livro: soma zero e saldo de cada recebedor igual ao do parceiro em sequências aleatórias de antecipação, estorno, chargeback, liquidação e repasse (REQ-ANT-031, SC-002);
- idempotência: uma confirmação gera exatamente uma operação (SC-001);
- nenhuma comissão em rascunho ou contestada é antecipada (SC-005);
- a flag não liga em `prod` sem contrato e parecer (REQ-ANT-001).

**Organization**: por história de usuário. P1: US1 (estabelecimento) e US2 (comissão do colaborador). P2: US3 (estornos) e US4 (back-office). A porta do parceiro, o cálculo do CET, as contas do livro e o interruptor de produção ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US4).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/finance/` (`package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS`, `src/advances/{schedule,eligibility,quotes,requests,commission,clawback,debt,reconciliation,config,http}/`, `migrations/`), os pacotes `packages/platform/advances/` e `packages/domain/advances/`, e as pastas `services/workers/src/finance/{schedule-sync,status-recheck,reconcile-daily,clawback}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/advances.openapi.yaml` e `packages/contracts/asyncapi/advances-events.asyncapi.yaml` (fonte: `specs/036-antecipacao-recebiveis/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - antecipar pelo Proprietário, com 2FA e `audit_category`;
  - `allow_commission_advance` só pelo Proprietário;
  - antecipar a própria comissão pelo colaborador `self`, com 2FA;
  - o Proprietário vê o total antecipado pelo colaborador, sem as taxas;
  - configuração com aprovação dupla e leitura financeira pelo Fin/Ops, auditada.

  Declarar as flags `finance.advances` (por grupo de negócios) e `finance.advances.commission` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: porta do parceiro com sandbox, CET como função pura, contas e lançamentos no livro, configuração versionada e interruptor de produção.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de propriedade do livro (portão de merge) em `services/finance/src/advances/__tests__/ledger-balance.property.test.ts`: sequências aleatórias de antecipação, cessão, liquidação, estorno, chargeback, dívida, quitação e repasse da 018 mantêm cada lançamento com soma zero e o saldo do recebedor igual ao do parceiro sandbox (SC-002).
- [ ] T005 [P] Teste do CET em `packages/domain/advances/src/__tests__/cet.property.test.ts`: TIR mensal por Newton-Raphson com bisseção de segurança, em centavos e dias corridos, bate com casos de referência e converge para todos os fluxos válidos; o CET anual é derivado do mensal.
- [ ] T006 [P] Teste do interruptor (portão de merge) em `services/finance/src/advances/config/switch.int.test.ts`:
  - em `prod`, a flag não liga sem `data-model.md` `finance_advance_config_version.partner_contract_ref` e `finance_advance_config_version.regulatory_opinion_ref` numa versão `approved`;
  - a parte do colaborador só libera o tipo de vínculo coberto por `finance_advance_config_version.opinion_scope`;
  - sem versão vigente, a função não abre (nenhum valor de taxa no código).

### Implementação da fundação

- [ ] T007 Criar a migração de tenant `services/finance/migrations/tenant/0001_advances.ts` com:
  - `finance_settings`, com `data-model.md` `finance_settings.allow_commission_advance` padrão `false`;
  - `finance_receivable`: CHECK em `finance_receivable.state` e `finance_receivable.source`;
  - `finance_advance_quote`: CHECK em `finance_advance_quote.requester_kind`;
  - `finance_advance`: UNIQUE `finance_advance.quote_id` e CHECK em `finance_advance.state`;
  - `finance_advance_item`;
  - `finance_clawback`: CHECK em `finance_clawback.origin_kind`;
  - `finance_advance_debt`: CHECK em `finance_advance_debt.state`;
  - `finance_reconciliation_issue`: CHECK em `finance_reconciliation_issue.kind` e `finance_reconciliation_issue.state`;
  - `finance_partner_notice_ack`.
- [ ] T008 [P] Criar a migração `services/finance/migrations/0001_platform.ts` em `koovela_platform`, com `finance_advance_config_version` (CHECK em `data-model.md` `finance_advance_config_version.state`, `finance_advance_config_version.koovela_fee_bps` > 0, e `finance_advance_config_version.opinion_scope`) e `finance_koovela_fee_ledger`.
- [ ] T009 Implementar a porta `AdvanceProvider` (`getSchedule`, `quote`, `request`, `status`, `statement`, webhook assinado) e o adaptador `sandbox` determinístico (aprovação, recusa, tempo esgotado, crédito parcial, divergência) em `packages/platform/advances/src/{port,sandbox}.ts`.
- [ ] T010 [P] Implementar `cet()`, a seleção de recebíveis (por valor, das datas mais próximas, ou por datas) e o cálculo de descontos em `packages/domain/advances/src/{cet,selection,discounts}.ts`.
- [ ] T011 Incluir no livro da 012 as contas por recebedor (`receivable_free`, `receivable_ceded`, `partner_payable`, `advance_cost_partner`, `advance_cost_koovela`, `recipient_bank_inflow`, `advance_debt`, `clawback_offset`) e os modelos de lançamento da R9 em `services/payments/src/ledger/advance-postings.ts`. O `finance` escreve só pela API do livro.
- [ ] T012 Implementar a configuração versionada com o `dual_control` da 021 (`kind = advance_config`; `data-model.md` `finance_advance_config_version.quote_ttl_minutes`, `finance_advance_config_version.bank_change_block_hours`) e a checagem do interruptor no serviço de flags em `services/finance/src/advances/config/config.ts` e `services/finance/src/advances/config/switch.ts`.

**Checkpoint**: livro sempre equilibrado e nada liga em produção sem parceiro e parecer.

---

## Phase 3: User Story 1 - Estabelecimento antecipa recebíveis (Priority: P1) 🎯 MVP

**Goal**: agenda de recebíveis dos pagamentos pela Koovela. Simulação de 10 minutos com bruto, taxas, líquido, CET e data do crédito. Confirmação com 2FA e idempotência. Elegibilidade com motivo e nenhum padrão enganoso.

**Independent Test**: com o parceiro sandbox, simular R$ 1.000,00, confirmar e ver o crédito e os lançamentos (quickstart §1 e §2).

### Tests for User Story 1 ⚠️

- [ ] T013 [P] [US1] Teste de contrato de `getBusinessAdvanceOverview`, `quoteBusinessAdvance`, `listBusinessAdvances`, `confirmBusinessAdvance` e `advancePartnerWebhook` em `services/finance/src/advances/http/business.contract.test.ts`.
- [ ] T014 [P] [US1] Teste de idempotência (portão de merge) em `services/finance/src/advances/requests/idempotency.int.test.ts`:
  - toque duplo ou repetição da mesma `Idempotency-Key` → exatamente uma operação (SC-001);
  - tempo esgotado → `requested` e reconsulta por `status`, nunca reenvio com chave nova;
  - simulação vencida (`data-model.md` `finance_advance_quote.expires_at`) ou sem 2FA nos últimos 5 minutos → recusa.
  - parceiro fora do ar → simulação "indisponível no momento", sem operação pela metade.
- [ ] T015 [P] [US1] Teste de integração em `services/finance/src/advances/eligibility/eligibility.int.test.ts`:
  - recebedor não verificado, fatura em atraso, dívida aberta, vertical excluída, troca de conta há menos de 72 h, limite diário atingido ou flag desligada → motivo exibido;
  - pagamentos no local nunca entram na agenda;
  - aprovada, os recebíveis ficam `ceded`, com `finance_receivable.advance_id` e `finance_receivable.partner_ref`;
  - creditada, gera os lançamentos da R9;
  - recusada, mostra o motivo (`finance_advance.decline_reason`) e não lança nada.
  - com `bank_change_block_hours` ou `quote_ttl_minutes` alterados na configuração, valem os novos prazos;
  - negócio suspenso ou em encerramento (002, 019) → sem novas antecipações; as já feitas seguem o contrato.
- [ ] T016 [P] [US1] Teste de componente em `apps/tenant-web/src/routes/financeiro/antecipacao/__tests__/no-dark-patterns.test.tsx`:
  - o valor começa vazio, sem o máximo pré-selecionado e sem contagem regressiva;
  - a validade aparece em texto neutro;
  - CET, taxas e líquido aparecem antes do botão de confirmar (SC-004).

### Implementation for User Story 1

- [ ] T017 [US1] Implementar a projeção da agenda (parceiro + livro, só pagamentos pela Koovela, sincronizada a cada hora e na abertura) em `services/finance/src/advances/schedule/schedule.ts` e `services/workers/src/finance/schedule-sync/sync.ts`.
- [ ] T018 [US1] Implementar a elegibilidade em `services/finance/src/advances/eligibility/eligibility.ts`, usando os contratos de 012 (recebedor e troca de conta, com o bloqueio de `finance_advance_config_version.bank_change_block_hours`), 019/002 (fatura e suspensão) e 004 (flag).
- [ ] T019 [US1] Implementar a simulação (`data-model.md` `finance_advance_quote.gross_cents`, `finance_advance_quote.partner_fee_cents`, `finance_advance_quote.koovela_fee_cents`, `finance_advance_quote.net_cents`, `finance_advance_quote.cet_month_bps`, `finance_advance_quote.cet_year_bps`, `finance_advance_quote.credit_on`, `finance_advance_quote.expires_at` = agora + `finance_advance_config_version.quote_ttl_minutes`) em `services/finance/src/advances/quotes/quotes.ts`.
- [ ] T020 [US1] Implementar a confirmação idempotente e o ciclo de estados (valores congelados da simulação, cessão, crédito, lançamentos, aviso pela 011 e trilha pela 004) em `services/finance/src/advances/requests/requests.ts`, a reconsulta de status em `services/workers/src/finance/status-recheck/recheck.ts` e o webhook do parceiro, publicando `finance.advance.*.v1`.
- [ ] T021 [US1] Implementar o aviso de compartilhamento com o parceiro (`data-model.md` `finance_partner_notice_ack.notice_version`), aceito antes da primeira operação, e as rotas do estabelecimento em `services/finance/src/advances/http/business.ts`.
- [ ] T022 [P] [US1] Implementar a tela de antecipação (agenda, simulação, confirmação com 2FA e histórico), simulando e confirmando em até 2 minutos (SC-003), em `apps/tenant-web/src/routes/financeiro/antecipacao/`.

**Checkpoint**: o estabelecimento antecipa sob demanda, com custo claro.

---

## Phase 4: User Story 2 - Colaborador antecipa a própria comissão (Priority: P1)

**Goal**: só comissão aprovada no fechamento e não paga, na parte do split com liquidação futura, quando o negócio permitir e o parecer cobrir o vínculo. Confirmação com 2FA e aviso ao Proprietário. No repasse, a parte antecipada vai ao parceiro, e ajustes negativos vão para o futuro.

**Independent Test**: num negócio que permite, com fechamento aprovado, antecipar 50% da comissão e conferir crédito, aviso e repasse (quickstart §3).

### Tests for User Story 2 ⚠️

- [ ] T023 [P] [US2] Teste de contrato de `setFinanceSettings`, `listProfessionalAdvancesForOwner`, `getCommissionAdvanceOverview`, `quoteCommissionAdvance` e `confirmCommissionAdvance` em `services/finance/src/advances/http/commission.contract.test.ts`.
- [ ] T024 [P] [US2] Teste de integração (portão de merge) em `services/finance/src/advances/commission/commission.int.test.ts`:
  - extrato em rascunho ou contestado nunca é antecipado, só `approved` (SC-005);
  - a parte manual aparece como "não antecipável";
  - sem `data-model.md` `finance_settings.allow_commission_advance`, ou com vínculo fora do `opinion_scope`, é recusado;
  - o Proprietário recebe o aviso e vê o total, sem as taxas (restrição por campo);
  - o extrato da 018 ganha `settlement_statement.advanced_cents`;
  - a parte antecipada é liquidada pelo PSP ao parceiro (PEN-14) e a conferência do split da 018 não gera diferença;
  - ajuste negativo posterior vai para o período futuro;
  - vínculo encerrado não bloqueia o que já foi aprovado; colaborador que saiu só antecipa comissão já aprovada.

### Implementation for User Story 2

- [ ] T025 [US2] Implementar a configuração `allow_commission_advance`, auditada, em `services/finance/src/advances/config/settings.ts`.
- [ ] T026 [US2] Implementar a visão, a simulação e a confirmação de comissão sobre o recebedor do colaborador (012), lendo a 018 por contrato e checando o tipo de vínculo da 007, em `services/finance/src/advances/commission/commission.ts`, com as rotas em `services/finance/src/advances/http/commission.ts`.
- [ ] T027 [US2] Ajustar o fechamento da 018 em `services/payments/src/settlement/payouts/advanced-part.ts`: com o split (PEN-14), a parte cedida é liquidada pelo PSP ao parceiro; a 018 não paga nada ao parceiro, só preenche `settlement_statement.advanced_cents` e conta as partes `ceded` como repassadas, sem gerar ajuste `split_reconciliation` (018 T048).
- [ ] T028 [P] [US2] Implementar "Antecipar comissão" no app do colaborador e no `/pro` em `apps/pro-mobile/app/antecipar-comissao/` e `apps/tenant-web/src/routes/pro/antecipar-comissao/`, e a opção "permitir antecipação de comissão" nas configurações do negócio em `apps/tenant-web/src/routes/financeiro/antecipacao/CommissionSetting.tsx`.

**Checkpoint**: o colaborador recebe antes, sem atropelar o fechamento.

---

## Phase 5: User Story 3 - Estornos depois da antecipação (Priority: P2)

**Goal**: estorno ou chargeback de pagamento antecipado é descontado dos próximos recebíveis, com aviso. O que não couber vira saldo devedor, que bloqueia novas antecipações até a quitação.

**Independent Test**: antecipar um recebível e estornar o pagamento; conferir o desconto no próximo recebível e o livro equilibrado (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T029 [P] [US3] Teste de integração em `services/finance/src/advances/clawback/clawback.int.test.ts`:
  - o estorno de um pagamento com recebível `ceded` gera `finance_clawback` com `data-model.md` `finance_clawback.applied_cents` sobre os próximos recebíveis livres;
  - o resto abre `finance_advance_debt` com `finance_advance_debt.amount_cents`, que bloqueia novas antecipações;
  - a quitação por recebíveis futuros ou pelo PSP leva a dívida a `settled` (`finance_advance_debt.settled_cents`);
  - estorno de pagamento ligado a comissão antecipada vira ajuste negativo no período seguinte da 018;
  - o livro permanece equilibrado.

### Implementation for User Story 3

- [ ] T030 [US3] Implementar o consumidor de estornos e chargebacks da 012 e o desconto no `workers` em `services/finance/src/advances/clawback/clawback.ts` e `services/workers/src/finance/clawback/clawback.ts`, publicando `finance.advance.clawback_applied.v1`.
- [ ] T031 [US3] Implementar a dívida e a quitação em `services/finance/src/advances/debt/debt.ts`, publicando `finance.advance.debt_opened.v1` e `finance.advance.debt_settled.v1`, com aviso ao Proprietário pela 011.
- [ ] T032 [P] [US3] Mostrar descontos e dívida aberta na tela de antecipação em `apps/tenant-web/src/routes/financeiro/antecipacao/Debt.tsx`.

**Checkpoint**: estornos não quebram o livro nem criam surpresas.

---

## Phase 6: User Story 4 - Parceiro, taxas e acompanhamento no back-office (Priority: P2)

**Goal**: taxa da Koovela, limites e verticais excluídas versionados, com aprovação dupla. Ligar por grupo de negócios. Painel diário de volume, receita, recusas, dívidas e divergências. Conciliação diária com alerta no mesmo dia.

**Independent Test**: definir a taxa, ativar para um grupo de teste e conferir o relatório depois de duas operações (quickstart §1 e §5).

### Tests for User Story 4 ⚠️

- [ ] T033 [P] [US4] Teste de contrato de `listAdvanceConfig`, `proposeAdvanceConfig`, `approveAdvanceConfig`, `getAdvanceDashboard` e `resolveReconciliationIssue` em `services/finance/src/advances/http/admin.contract.test.ts`.
- [ ] T034 [P] [US4] Teste da conciliação em `services/finance/src/advances/reconciliation/reconciliation.int.test.ts`:
  - os cenários de divergência do sandbox geram `finance_reconciliation_issue` com `data-model.md` `finance_reconciliation_issue.delta_cents` e alerta no mesmo dia ao Fin/Ops (`finance_reconciliation_issue.alerted_at`; SC-006), entrando na fila de divergências da 012/021;
  - a resolução exige `finance_reconciliation_issue.justification`;
  - a receita da Koovela recebida concilia com `finance_koovela_fee_ledger`.

### Implementation for User Story 4

- [ ] T035 [US4] Implementar a conciliação diária no `workers` em `services/finance/src/advances/reconciliation/reconciliation.ts` e `services/workers/src/finance/reconcile-daily/reconcile.ts`, publicando `finance.advance.reconciliation_mismatch.v1`.
- [ ] T036 [US4] Implementar o painel diário e as rotas admin (com toda leitura financeira auditada) em `services/finance/src/advances/http/admin.ts`.
- [ ] T037 [P] [US4] Implementar a tela de antecipação no back-office (configuração com aprovação, grupos da flag, painel diário, divergências) em `apps/admin-web/src/routes/finance/antecipacao/`, e os mapas de ingestão do BI em `bi/ingest/mappings/advances.yaml`.

**Checkpoint**: a Gestão controla o produto e enxerga divergências no mesmo dia.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T038 Implementar o `HolderDataPort` do `finance`, com retenção de 5 anos depois da última operação por obrigação legal (prioridade sobre a eliminação), em `services/finance/src/holder-data/port.ts`, registrado em `packages/contracts/privacy/holder-ports.yaml`, com a categoria `finance_advances` (5 anos depois da última operação) na tabela da 022 e `applyRetention`.
- [ ] T039 [P] Caso de isolamento em `tests/isolation/cases/advances.ts`.
- [ ] T040 [P] Testes com as flags `finance.advances` e `finance.advances.commission` por grupo, ligadas e desligadas, em `services/finance/src/advances/__tests__/flags.int.test.ts`, e axe nas telas em `apps/tenant-web/e2e/advances-a11y.spec.ts`.
- [ ] T041 [P] Painel Grafana "Antecipação" (operações por estado, tempo até o crédito, reconsultas pendentes, divergências abertas) em `infra/observability/dashboards/advances.json`.
- [ ] T042 Registrar as pendências em `docs/ops/decisions/antecipacao.md`:
  - a escolha do parceiro e o parecer regulatório (PEN-28), que bloqueiam a produção, com atenção especial ao colaborador CLT;
  - o repasse da taxa da Koovela pelo parceiro, com a alternativa de cobrar como item de uso na fatura da 019;
  - a multa do fornecedor de eventos (035).

  Registrar as telas a conferir em `docs/design/telas-sem-prototipo-036.md`.
- [ ] T043 Executar o [quickstart.md](./quickstart.md) inteiro em staging com o parceiro sandbox e registrar em `docs/ops/decisions/validacao-036.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (simulação, confirmação e idempotência).
- **US3** depende de US1.
- **US4** depende da fase 2 e pode correr em paralelo com US1. A conciliação precisa de operações de US1.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 a T006, T008 e T010.
- Depois de US1: US2 e US3 em paralelo.

---

## Parallel Example: Foundational

```bash
Task: "T004 equilíbrio do livro"
Task: "T005 CET"
Task: "T006 interruptor de produção"
Task: "T010 domínio puro"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1 (estabelecimento) com o parceiro sandbox.
3. **Parar e validar** com o quickstart §1 e §2. Produção só com parceiro contratado e parecer.

### Incremental Delivery

1. US3 (estornos), necessária antes de qualquer piloto real.
2. US4 (back-office e conciliação).
3. US2 (comissão), liberada só se o parecer cobrir o tipo de vínculo.
4. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US3 → US4 → US2 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-ANT que atende. Campos com restrição citam `data-model.md` e o campo.
- A Koovela não empresta nem compra recebíveis; a operação é do parceiro, atrás da porta `AdvanceProvider`.
- Sem taxa no código; sem versão de configuração aprovada, a função não abre.
- Commit por tarefa ou grupo lógico, em branch `036-antecipacao-recebiveis`, por PR.
- Análise de 2026-11-27: prazos da simulação e da troca de conta na configuração (CONST 8); `dual_control` da 021; fechamento da 018 só registra a parte cedida (T027 corrigida); retenção pela 022 (T038); casos de borda. Nas specs donas: 011 T082 (avisos), 018 T048 (`advanced_cents`), 019 T049 (taxa e nota da Koovela); modelo da 012 com as contas novas.
