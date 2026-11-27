---
description: "Lista de tarefas da spec 021 — Back-office de gestão"
---

# Tasks: Back-office de gestão

**Input**: documentos de `specs/021-backoffice-gestao/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 020 concluídas. O domínio `services/backoffice/` já existe desde a 004.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes antes do código. São portões de merge:
- a matriz por tela e ação;
- o teste de arquitetura (sem acesso direto a schema de tenant);
- "o automático nunca bloqueia nem suspende".

**Organization**: por história de usuário (US1–US6). P1: US1, US3, US4 e US5. P2: US2 e US6. O controle de segunda pessoa e o mascaramento ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar as pastas `services/backoffice/src/{overview,tenants,reveal,onboarding,grants,fraud,chargebacks,refunds,dual-control,queues}/` e os pacotes `packages/domain/fraud-rules/` e `packages/platform/pii-mask/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/backoffice.openapi.yaml` e `packages/contracts/asyncapi/backoffice-gestao-events.asyncapi.yaml` (fonte: `specs/021-backoffice-gestao/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir em `packages/contracts/rbac/permissions.yaml` uma célula por tela e ação do back-office, com perfis Suporte, Comercial/Growth, Fin/Ops e SRE, revelação de PII `sensitive` e `audit_category = management`. Declarar a flag `backoffice.console_v1` em `packages/contracts/flags/flags.yaml`.
- [ ] T004 [P] Confirmar na configuração da borda (Cloudflare Access, MFA e lista de IPs) que só `admin.koovela.com` dá acesso ao console, em `infra/cloudflare/access-admin.tf` (REQ-BKO-052).

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, mascaramento, revelação auditada, controle de segunda pessoa e a regra de arquitetura.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste de arquitetura (portão de merge) em `tools/arch-check/__tests__/backoffice-no-tenant-schema.test.ts`: `services/backoffice` não usa `db.forTenant()` e só lê por contratos e projeções (REQ-BKO-053).
- [ ] T006 [P] Teste de `packages/platform/pii-mask` em `packages/platform/pii-mask/src/mask.test.ts`: e-mail, celular e CPF/CNPJ mascarados nos formatos do research R2.
- [ ] T007 [P] Teste do controle de segunda pessoa em `services/backoffice/src/dual-control/dual-control.int.test.ts`: a ação fica pendente; a mesma pessoa só aprova com justificativa extra, e a aprovação é marcada `no_second_person` (`data-model.md` `bko_dual_control.no_second_person`, `bko_dual_control.extra_justification`; REQ-BKO-054).

### Implementação da fundação

- [ ] T008 Criar a migração `services/backoffice/migrations/0101_gestao.ts` em `koovela_platform` com:
  - `bko_tenant_note` e `bko_reveal_log`;
  - `bko_grant` (CHECK em `data-model.md` `bko_grant.kind` e `bko_grant.state`) e `bko_grant_limits`;
  - `bko_fraud_rule_version` (CHECK em `bko_fraud_rule_version.auto_action`);
  - `bko_alert` (CHECK em `bko_alert.target_kind` e `bko_alert.state`);
  - `bko_action` (CHECK em `bko_action.kind`);
  - `bko_consumer_block` (CHECK em `bko_consumer_block.state`);
  - `bko_chargeback_case` (CHECK em `bko_chargeback_case.state`);
  - `bko_dual_control` (CHECK em `bko_dual_control.kind` e `bko_dual_control.state`);
  - `bko_platform_kpi` e `bko_cnpj_cache`;
  - `bko_settings` (versionado; `data-model.md` `bko_settings.onboarding_stall_days`, `bko_settings.kyc_stall_business_days`, `bko_settings.auto_hold_max_hours` com CHECK ≤ 72, `bko_settings.block_review_business_days`, `bko_settings.complement_lead_days`, `bko_settings.defense_alert_days`, `bko_settings.alert_group_hours`, `bko_settings.refund_dual_control_limit_cents`, `bko_settings.kpi_refresh_minutes`), com seed dos valores iniciais e da regra de chargeback de 1% em `bko_fraud_rule_version`.
- [ ] T009 Implementar `packages/platform/pii-mask/src/mask.ts` e a revelação por campo em `services/backoffice/src/reveal/reveal.ts`. A revelação exige justificativa, registra na trilha (004) e em `bko_reveal_log` e responde com `Cache-Control: no-store` (`data-model.md` `bko_reveal_log.justification`, `bko_reveal_log.actor_id`, `bko_reveal_log.field_ref`, `bko_reveal_log.ticket_ref`; REQ-BKO-003).
- [ ] T010 Implementar o componente `dual_control` em `services/backoffice/src/dual-control/dual-control.ts` e a rota `/v1/admin/dual-control/{id}/approve` (`data-model.md` `bko_dual_control.ref`, `bko_dual_control.requested_by`, `bko_dual_control.approved_by`). O mesmo componente é usado pelos planos da 019 (`kind = plan_change`, T037 da 019). Publicação versionada de `bko_settings` pelo Fin/Ops, auditada, em `services/backoffice/src/settings/settings.ts`.
- [ ] T011 Implementar os clientes dos contratos das specs donas (002, 003, 005, 012, 015, 016, 019), com timeout por parte e indicação de "parte indisponível", em `services/backoffice/src/clients/`.

**Checkpoint**: base segura do console.

---

## Phase 3: User Story 1 - Encontrar um tenant e entender a situação dele em segundos (Priority: P1) 🎯 MVP

**Goal**: buscar por nome, slug, CNPJ completo ou e-mail completo. O detalhe é montado a partir das specs donas, com PII mascarada, revelação auditada, observações internas e abertura de sessão de suporte.

**Independent Test**: buscar por nome, CNPJ e slug, abrir o detalhe e conferir os blocos com PII mascarada (quickstart §2).

### Tests for User Story 1 ⚠️

- [ ] T012 [P] [US1] Teste de contrato de `searchTenants`, `tenantDetail`, `revealField` e `addTenantNote` em `services/backoffice/src/http/tenants.contract.test.ts`.
- [ ] T013 [P] [US1] Teste de integração em `services/backoffice/src/tenants/tenants.int.test.ts`:
  - a busca por prefixo de e-mail não retorna resultado e a busca por e-mail completo, via hash, encontra (REQ-BKO-001);
  - o detalhe vem composto e as partes indisponíveis aparecem indicadas;
  - a revelação fica auditada;
  - a observação interna é visível só à Gestão (REQ-BKO-005);
  - a sessão de suporte abre com justificativa (REQ-BKO-004);
  - o Suporte vê e trata só alertas de conta e de avaliação.
- [ ] T014 [P] [US1] Teste E2E em `apps/admin-web/e2e/tenants.spec.ts`: encontrar e entender um tenant em até 30 s (SC-001), com axe.

### Implementation for User Story 1

- [ ] T015 [US1] Implementar a busca em `services/backoffice/src/tenants/search.ts` (≤ 500 ms) e o detalhe composto em `services/backoffice/src/tenants/detail.ts` (≤ 2 s) (REQ-BKO-002), com as observações internas (`data-model.md` `bko_tenant_note.author_id`, `bko_tenant_note.body`).
- [ ] T016 [US1] Implementar as rotas `/v1/admin/tenants*` em `services/backoffice/src/http/tenants.ts`.
- [ ] T017 [P] [US1] Implementar a G02 (Tenants) em `apps/admin-web/src/routes/tenants/`, com o botão "ver completo" pedindo justificativa e o atalho para a G05 (sessão de suporte).

**Checkpoint**: Suporte entende um tenant em segundos.

---

## Phase 4: User Story 3 - Acompanhar onboarding e KYC (Priority: P1)

**Goal**:
- funil de onboarding, com tenants parados há mais de 7 dias na fila do Comercial;
- recebedores recusados ou em análise há mais de 3 dias úteis na fila do Fin/Ops, com pedido de documento;
- bloqueio e desbloqueio do recebedor;
- situação do CNPJ por consulta pública gratuita.

**Independent Test**: tenants em passos diferentes e um recebedor recusado; pedir documento e acompanhar (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T018 [P] [US3] Teste de contrato de `onboardingBoard`, `payeeAction` e `tenantPendingRequests` em `services/backoffice/src/http/onboarding.contract.test.ts`.
- [ ] T019 [P] [US3] Teste de integração em `services/backoffice/src/onboarding/onboarding.int.test.ts`:
  - parado há mais de `bko_settings.onboarding_stall_days` entra na fila do Comercial (REQ-BKO-010); com o valor alterado, a fila segue o novo prazo;
  - recusado entra na fila do Fin/Ops com o motivo do PSP (REQ-BKO-011);
  - o pedido de documento aparece no painel do tenant;
  - bloquear o recebedor pela 012 avisa o Proprietário (REQ-BKO-012);
  - a BrasilAPI fora do ar devolve "indisponível", sem erro, usando o cache de 7 dias (`data-model.md` `bko_cnpj_cache.fetched_at`; REQ-BKO-013).

### Implementation for User Story 3

- [ ] T020 [US3] Implementar o quadro de onboarding e as filas (eventos de 002, 005 e 012) em `services/backoffice/src/onboarding/board.ts`, com os prazos de `data-model.md` `bko_settings.onboarding_stall_days` e `bko_settings.kyc_stall_business_days`.
- [ ] T021 [US3] Implementar as ações sobre o recebedor (pedir documento, reenviar, bloquear, desbloquear) pela 012 e a consulta de CNPJ com cache em `services/backoffice/src/onboarding/{payee-actions,cnpj}.ts` (`data-model.md` `bko_cnpj_cache.cnpj_hash`, `bko_cnpj_cache.status`, `bko_cnpj_cache.legal_name`). Só o CNPJ do negócio sai para fora. Pedidos ao tenant publicam `backoffice.tenant_request.changed` (avisado pela 011, T069).
- [ ] T022 [P] [US3] Implementar a G04 (Onboarding e KYC) em `apps/admin-web/src/routes/onboarding/` e os pedidos de documento no painel em `apps/tenant-web/src/routes/backoffice-requests/`.

**Checkpoint**: ativação acompanhada.

---

## Phase 5: User Story 4 - Conceder degustação e desconto (Priority: P1)

**Goal**: concessões com tipo, valor, duração e motivo, dentro dos limites do perfil; acima disso, aprovação do Fin/Ops. A 019 aplica, o Proprietário vê a data de fim e há um painel de conversão.

**Independent Test**: conceder 30 dias, conferir o `trialing` na 019 e tentar passar do limite (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T023 [P] [US4] Teste de contrato de `listGrants`, `createGrant` e `grantAction` em `services/backoffice/src/http/grants.contract.test.ts`.
- [ ] T024 [P] [US4] Teste de integração em `services/backoffice/src/grants/grants.int.test.ts`:
  - dentro do limite fica `active`; acima do limite, segunda degustação ou tenant inadimplente fica `awaiting_approval` (`data-model.md` `bko_grant_limits.max_trial_days`, `bko_grant_limits.max_discount_pct`, `bko_grant_limits.max_discount_cycles`, `bko_grant_limits.max_credit_cents`; REQ-BKO-021);
  - o evento `backoffice.grant.activated.v1` é aplicado pela 019 em até 2 min (SC-006);
  - a 019 avisa 7 dias antes do fim (REQ-BKO-022);
  - todas as ações ficam na trilha (REQ-BKO-024).

### Implementation for User Story 4

- [ ] T025 [US4] Implementar as concessões e os limites versionados em `services/backoffice/src/grants/grants.ts`, usando o `dual_control` acima do limite (`data-model.md` `bko_grant.kind`, `bko_grant.value`, `bko_grant.duration`, `bko_grant.reason`, `bko_grant.author_id`, `bko_grant.approved_by`, `bko_grant.no_second_person`, `bko_grant.requested_at`, `bko_grant.activated_at`, `bko_grant.starts_at`, `bko_grant.ends_at`). A 019 aplica pelo evento `backoffice.grant.changed` (T047 da 019).
- [ ] T026 [US4] Implementar o painel de concessões (quantidade, valor, tempo entre pedido e vigência, conversão por autor) em `services/backoffice/src/grants/metrics.ts` (REQ-BKO-023).
- [ ] T027 [P] [US4] Implementar a G06 (Concessões) em `apps/admin-web/src/routes/grants/` e o aviso de concessão com data de fim no painel do tenant.

**Checkpoint**: concessões controladas.

---

## Phase 6: User Story 5 - Antifraude: alertas, investigação e ação (Priority: P1)

**Goal**:
- motor declarativo de regras versionadas com sinais de 003, 008, 009, 012, 015 e 016;
- alertas agrupados por 24 h;
- o automático só retém, por no máximo 72 h;
- bloqueio e suspensão só por decisão humana, com motivo;
- revisão por outra pessoa;
- ação sobre colaborador só no vínculo;
- nenhuma anotação exposta.

**Independent Test**: gerar sinais sintéticos e conferir alertas, investigação, ação e revisão (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T028 [P] [US5] Teste (portão de merge) em `services/backoffice/src/fraud/no-auto-block.int.test.ts`:
  - nenhuma regra automática bloqueia consumidor nem suspende tenant (SC-003);
  - a retenção automática dura no máximo `bko_settings.auto_hold_max_hours` (nunca acima de 72 h) e, ao vencer sem decisão, cai e a severidade sobe (`data-model.md` `bko_alert.auto_hold_until`; REQ-BKO-032).
- [ ] T029 [P] [US5] Teste do motor em `packages/domain/fraud-rules/src/engine.property.test.ts`: as regras declarativas avaliam sinais com janela, limite e severidade de forma determinística (`data-model.md` `bko_fraud_rule_version.condition`, `bko_fraud_rule_version.window`, `bko_fraud_rule_version.threshold`), e alertas iguais em 24 h são agrupados (`data-model.md` `bko_alert.group_key`, `bko_alert.group_count`; REQ-BKO-038).
- [ ] T030 [P] [US5] Teste de contrato de `upsertFraudRule`, `listAlerts`, `takeAction`, `revertAction`, `reviewConsumerBlock`, `myBlockStatus` e `requestBlockReview` em `services/backoffice/src/http/fraud.contract.test.ts`.
- [ ] T031 [P] [US5] Teste de integração em `services/backoffice/src/fraud/actions.int.test.ts`:
  - toda ação tem motivo e fica na trilha (REQ-BKO-031);
  - o consumidor bloqueado vê o motivo genérico e pede revisão; a revisão é feita por outra pessoa em até 5 dias úteis (`data-model.md` `bko_consumer_block.reviewer_id`, `bko_consumer_block.review_due_at`; REQ-BKO-034, SC-005);
  - ação sobre o vínculo não afeta a pessoa em outro tenant (REQ-BKO-035);
  - chargeback acima de 1% gera severidade alta (REQ-BKO-036);
  - nenhuma resposta traz anotação ou alerta de cuidado (REQ-BKO-037, SC-007);
  - consumidor bloqueado mantém os agendamentos futuros, salvo cancelamento explícito, com aviso aos estabelecimentos;
  - tenant suspenso por fraude e por inadimplência: pagar a fatura não reativa enquanto houver o motivo `fraud` (002 T089).

### Implementation for User Story 5

- [ ] T032 [US5] Implementar o motor declarativo em `packages/domain/fraud-rules/src/engine.ts` e os consumidores de sinais no `workers` em `services/backoffice/src/fraud/signals.ts` (`data-model.md` `bko_fraud_rule_version.signal`, `bko_fraud_rule_version.severity`, `bko_fraud_rule_version.enabled`, `bko_fraud_rule_version.auto_action`; `bko_alert.rule_version`, `bko_alert.kind`, `bko_alert.severity`, `bko_alert.target_kind`, `bko_alert.target_id`, `bko_alert.evidence_refs`), agrupando em `bko_settings.alert_group_hours`. Meta: alerta em ≤ 1 min.
- [ ] T033 [US5] Implementar as ações humanas em `services/backoffice/src/fraud/actions.ts`: falso positivo, reter pontos ou avaliações, bloquear meio de pagamento, reter repasses, bloqueio temporário do consumidor e suspender o tenant pela 002. Implementar também a expiração das retenções automáticas (`data-model.md` `bko_action.reason`, `bko_action.actor_id`, `bko_action.expires_at`, `bko_action.reverted_at`). Cada ação publica `backoffice.fraud_action.changed`, executado pela spec dona (002 T089, 012 T067, 015 T051, 016 T041); suspensão por fraude usa o motivo `fraud` no conjunto de motivos da 002.
- [ ] T034 [US5] Implementar o bloqueio do consumidor e a revisão por outra pessoa (com `dual_control`) em `services/backoffice/src/fraud/consumer-block.ts` (`data-model.md` `bko_consumer_block.generic_reason_code`, `bko_consumer_block.review_requested_at`, `bko_consumer_block.review_due_at` por `bko_settings.block_review_business_days`). A 003 aplica o bloqueio (T092) e a 009 mantém os agendamentos futuros (T062), salvo decisão explícita de cancelar, com aviso aos estabelecimentos.
- [ ] T035 [US5] Implementar as rotas `/v1/admin/fraud/*`, `/v1/admin/consumer-blocks/*` e `/v1/consumer/account-block` em `services/backoffice/src/http/fraud.ts`.
- [ ] T036 [P] [US5] Implementar a G08 (alertas e investigação) em `apps/admin-web/src/routes/antifraud/` e o aviso de bloqueio com pedido de revisão no app e na web (`apps/consumer-mobile/app/conta/bloqueio.tsx`, `apps/consumer-web/app/routes/conta.bloqueio.tsx`).

**Checkpoint**: antifraude com decisão humana.

---

## Phase 7: User Story 2 - Visão geral da plataforma (Priority: P2)

**Goal**: KPIs agregados por perfil, atualizados a cada 15 min, e filas reunidas das outras specs, cada uma com dono e prazo.

**Independent Test**: abrir a visão geral com cada perfil e conferir os números e as filas (quickstart §2 e §7).

### Tests for User Story 2 ⚠️

- [ ] T037 [P] [US2] Teste de contrato de `platformOverview` e `aggregatedQueues` em `services/backoffice/src/http/overview.contract.test.ts`.
- [ ] T038 [P] [US2] Teste de integração em `services/backoffice/src/overview/overview.int.test.ts`:
  - a projeção `bko_platform_kpi` é atualizada em ≤ 15 min (`data-model.md` `bko_platform_kpi.north_star`, `bko_platform_kpi.gmv_cents`, `bko_platform_kpi.past_due_cents`);
  - os números e as filas variam conforme o perfil;
  - as filas trazem itens de 016, 003, 005, 012, 019, 002, 004, 015 e 017 (REQ-BKO-050).

### Implementation for User Story 2

- [ ] T039 [US2] Implementar a projeção de KPIs no `workers` em `services/backoffice/src/overview/kpi.ts` (REQ-BKO-006; `data-model.md` `bko_platform_kpi.at`, `bko_platform_kpi.active_tenants`, `bko_platform_kpi.activated_tenants`, `bko_platform_kpi.trialing`, `bko_platform_kpi.open_chargebacks`, `bko_platform_kpi.open_alerts`, `bko_platform_kpi.tech_health`), a cada `bko_settings.kpi_refresh_minutes`.
- [ ] T040 [US2] Implementar as filas reunidas por contrato em `services/backoffice/src/queues/queues.ts`. Exportação de listas: só agregados, ou listas com dados pessoais com justificativa e registro na trilha.
- [ ] T041 [P] [US2] Implementar a G01 (Visão geral) em `apps/admin-web/src/routes/overview/` e a tela nova de filas em `apps/admin-web/src/routes/queues/`.

**Checkpoint**: visão consolidada da operação.

---

## Phase 8: User Story 6 - Defesa de chargebacks e estornos manuais (Priority: P2)

**Goal**: fila com prazo e dossiê; complemento enviado pelo tenant até 3 dias antes do prazo; defesa pelo PSP; alerta a 2 dias do prazo; estorno acima do limite com segunda pessoa.

**Independent Test**: chargeback simulado com dossiê, complemento, defesa e resultado (quickstart §6).

### Tests for User Story 6 ⚠️

- [ ] T042 [P] [US6] Teste de contrato de `listChargebacks`, `chargebackAction`, `submitChargebackComplement` e `requestManualRefund` em `services/backoffice/src/http/chargebacks.contract.test.ts`.
- [ ] T043 [P] [US6] Teste de integração em `services/backoffice/src/chargebacks/chargebacks.int.test.ts`:
  - o complemento é aceito até `complement_due_at` (`data-model.md` `bko_chargeback_case.complement_due_at`; REQ-BKO-041);
  - a 2 dias do prazo sem defesa sai alerta (REQ-BKO-042);
  - 100% dos chargebacks têm defesa ou decisão registrada no prazo (SC-004);
  - estorno acima de `bko_settings.refund_dual_control_limit_cents` aguarda a segunda pessoa (REQ-BKO-043); com o limite alterado, vale o novo;
  - complemento e alerta seguem `bko_settings.complement_lead_days` e `bko_settings.defense_alert_days`.

### Implementation for User Story 6

- [ ] T044 [US6] Implementar o caso de chargeback, o pedido de complemento, o envio da defesa pelo `PaymentProvider` e os prazos (de `bko_settings`) em `services/backoffice/src/chargebacks/chargebacks.ts` (`data-model.md` `bko_chargeback_case.tenant_attachments`, `bko_chargeback_case.tenant_note`, `bko_chargeback_case.defense_sent_at`).
- [ ] T045 [US6] Implementar o pedido de estorno manual com `dual_control` acima do limite, chamando a 012, em `services/backoffice/src/refunds/refunds.ts`.
- [ ] T046 [P] [US6] Implementar a fila de chargebacks na G08 e o envio do complemento pelo painel em `apps/tenant-web/src/routes/backoffice-requests/ChargebackComplement.tsx`.

**Checkpoint**: disputas defendidas no prazo.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T047 [P] Testes gerados da matriz (portão de merge) em `packages/platform/authz/src/generated/__tests__/backoffice.test.ts`: uma célula por tela e ação (REQ-BKO-051).
- [ ] T048 [P] Testes com a flag `backoffice.console_v1` ligada e desligada em `services/backoffice/src/__tests__/console-flags.int.test.ts`.
- [ ] T049 [P] Painel Grafana "Gestão" em `infra/observability/dashboards/backoffice-gestao.json`: revelações, concessões, alertas por severidade, aprovações "sem segunda pessoa" e prazos.
- [ ] T050 Registrar as telas sem protótipo (filas reunidas, pedido de documento, complemento de chargeback e aviso de bloqueio) em `docs/design/telas-sem-prototipo-021.md`.
- [ ] T051 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-021.md`.
- [ ] T052 [P] Implementar a retenção da seção "Dados pessoais" em `services/backoffice/src/retention/purge.ts` (job no `workers`): alertas, evidências e ações 5 anos após o encerramento; bloqueios e revisões 5 anos; observações internas relação + 2 anos; `bko_reveal_log` 5 anos (invariante 7 do `data-model.md`; CONST IV). Teste em `services/backoffice/src/retention/purge.int.test.ts`.
  - Prazos e ação ao vencer lidos da tabela de retenção da 022 (`getRetentionRules`, com cache; categorias registradas em `packages/contracts/privacy/holder-ports.yaml`); os números desta tarefa são só os valores iniciais do seed da 022. O job roda pelo `applyRetention` do `HolderDataPort` do domínio, disparado pela 022 (T040 da 022), e nenhum prazo fica no código (CONST 8; análise da 022, 2026-11-27).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US3** depende da fase 2 e da 012.
- **US4** depende da fase 2 e da 019.
- **US5** depende da fase 2 e dos sinais de 003, 008, 009, 012, 015 e 016.
- **US2** depende de US1. Ela reúne as filas, que vêm das outras histórias e specs.
- **US6** depende de US5 (G08) e da 012.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Fundação: T005, T006 e T007.
- Depois da fase 2: US1, US3, US4 e US5 em paralelo.

---

## Parallel Example: User Story 5

```bash
# Testes primeiro, juntos:
Task: "T028 sem bloqueio automático em services/backoffice/src/fraud/no-auto-block.int.test.ts"
Task: "T029 motor em packages/domain/fraud-rules/src/engine.property.test.ts"
Task: "T030 contrato em services/backoffice/src/http/fraud.contract.test.ts"
Task: "T031 ações em services/backoffice/src/fraud/actions.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: encontrar e entender um tenant.
3. **Parar e validar** com o quickstart §1 e §2.

### Incremental Delivery

1. US3 → US4 → US5 (ativação, concessões, antifraude).
2. US2 → US6 (visão geral e chargebacks).
3. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US3 → US4 → US5 → US2 → US6 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-BKO que atende. Campos com restrição citam `data-model.md` e o campo.
- O back-office nunca lê o schema de um tenant; usa só contratos e projeções. A PII é mascarada por padrão.
- Decisão automatizada é limitada (LGPD art. 20): bloqueio e suspensão só com decisão humana.
- Commit por tarefa ou grupo lógico, em branch `021-backoffice-gestao`, por PR.
- Análise de 2026-11-27: `bko_settings` versionado (CONST 8; 72 h como teto); campos citados; eventos alinhados ao contrato (mais `defense_submitted`, `personal_data.revealed`, `tenant_request.changed`); T052 acrescentada (retenção). Executores nas specs donas: 002 T089 (motivos de suspensão), 003 T092 (bloqueio), 009 T062 (agendamentos do bloqueado), 012 T067 (repasses e meio de pagamento), 015 T051 (pontos), 016 T041 (avaliações), 019 T047 (concessões), 011 T069 (avisos).
