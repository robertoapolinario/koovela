---
description: "Lista de tarefas da spec 022 — Privacidade e direitos do titular"
---

# Tasks: Privacidade e direitos do titular

**Input**: documentos de `specs/022-privacidade-direitos-titular/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 021 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- todo domínio com coluna `x-pii` tem `HolderDataPort`;
- o teste de ponta a ponta prova que nada sem guarda legal sobra depois de uma eliminação (REQ-PRI-070).

**Organization**: por história de usuário (US1–US6). P1: US1 e US2. P2: US3, US4 e US5. P3: US6. O contrato `HolderDataPort`, a implementação dele em cada domínio e o motor da saga ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/privacy/` com `package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS` e as pastas `src/{requests,saga,consents,retention,business-tasks,tenant-export,erasure-ledger,incidents,policy,dpo,http}` e `migrations/`.
- [ ] T002 [P] Criar `packages/contracts/privacy/` com a interface `HolderDataPort` (`describe`, `export`, `erase(mode: delete | anonymize | block)`, `restrictions`, `applyRetention(category, cutoff, on_expiry)`) e o registro `holder-ports.yaml`, que lista também as categorias de retenção de cada domínio. Criar também `tools/privacy-replay/`.
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/privacy.openapi.yaml` e `packages/contracts/asyncapi/privacy-events.asyncapi.yaml` (fonte: `specs/022-privacidade-direitos-titular/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T004 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - consumidor `self`, com OTP;
  - exportação do tenant só pelo Proprietário, `sensitive`;
  - Encarregado com acesso temporário concedido pela 004;
  - `audit_category` nas exportações.

  Declarar a flag `privacy.v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, portão de CI dos ports, implementação do port em cada domínio e motor da saga.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Portão de CI em `tools/privacy-check/__tests__/holder-ports.test.ts`: falha quando uma coluna `x-pii` de uma migração pertence a um domínio sem entrada em `holder-ports.yaml` (REQ-PRI-005), quando uma categoria de retenção usada não está em `privacy_retention_rule`, ou quando um domínio tem prazo de retenção literal no código (CONST 8).
- [ ] T006 [P] Teste do motor da saga em `services/privacy/src/saga/saga.int.test.ts`: passos idempotentes por domínio e tenant, com novas tentativas e estado de `data-model.md` `privacy_request_step.state`.

### Implementação da fundação

- [ ] T007 Criar a migração `services/privacy/migrations/0001_privacy.ts` em `koovela_platform`, com:
  - `privacy_request`: CHECK em `data-model.md` `privacy_request.kind`, `privacy_request.channel` e `privacy_request.state`;
  - `privacy_request_step`: CHECK em `privacy_request_step.op`;
  - `privacy_business_task`: CHECK em `privacy_business_task.kind` e `privacy_business_task.state`;
  - `privacy_consent_registry`, `privacy_retention_rule` e `privacy_retention_extension`;
  - `privacy_erasure_ledger`, sem PII;
  - `privacy_incident`: CHECK em `privacy_incident.risk`;
  - `privacy_policy_version`;
  - `privacy_settings` e `privacy_tenant_purge` (`data-model.md` `privacy_tenant_purge.scheduled_for`, `privacy_tenant_purge.dual_control_id`), com seed da tabela de retenção completa (todas as categorias de "Regras e estados" da spec) e de `privacy_settings`.
- [ ] T008 Implementar o motor da saga em `services/privacy/src/saga/saga.ts`. Ele envia comandos aos domínios por `privacy.holder.command.v1`, recebe `privacy.step.completed.v1` e nunca acessa tabelas de outros domínios (`data-model.md` `privacy_request_step.domain`, `privacy_request_step.tenant_id`, `privacy_request_step.op`, `privacy_request_step.result_ref`, `privacy_request_step.attempts`).
- [ ] T009 Implementar o portão `pnpm privacy:check` em `tools/privacy-check/src/check.ts`, como portão em `.github/workflows/pr.yml`.
- [ ] T010 [P] Implementar o `HolderDataPort` de `identity` (003) em `services/identity/src/holder-data/port.ts`.
- [ ] T011 [P] Implementar o `HolderDataPort` de `tenancy` (005) em `services/tenancy/src/holder-data/port.ts`.
- [ ] T012 [P] Implementar o `HolderDataPort` de `workforce` (007) em `services/workforce/src/holder-data/port.ts`.
- [ ] T013 [P] Implementar o `HolderDataPort` de `scheduling` (009, 010, 013 e 014) em `services/scheduling/src/holder-data/port.ts`, cobrindo agendamentos, política, séries, fila e opt-ins.
- [ ] T014 [P] Implementar o `HolderDataPort` de `notification` (011) em `services/notification/src/holder-data/port.ts`.
- [ ] T015 [P] Implementar o `HolderDataPort` de `payments` (012 e 018) em `services/payments/src/holder-data/port.ts`. O `restrictions` cobre pagamentos e repasses com guarda legal de 5 anos.
- [ ] T016 [P] Implementar o `HolderDataPort` de `loyalty` (015) em `services/loyalty/src/holder-data/port.ts`.
- [ ] T017 [P] Implementar o `HolderDataPort` de `engagement.reviews` (016) em `services/engagement/src/reviews/holder-data/port.ts`. O port de `care-notes` (020) já existe e só precisa ser registrado.
- [ ] T018 [P] Implementar o `HolderDataPort` de `fiscal` (017) em `services/fiscal/src/holder-data/port.ts`, com guarda legal de 5 anos, e o da trilha (004) em `services/backoffice/src/audit/holder-data/port.ts`. A trilha apaga os dados de exibição em `backoffice_audit_subject` e mantém a cadeia (REQ-PRI-013). Implementar também os ports de `backoffice` (021: alertas, evidências, bloqueios de consumidor) em `services/backoffice/src/holder-data/port.ts` e de `billing` (019: dados de cobrança do Proprietário autônomo) em `services/billing/src/holder-data/port.ts`. Todos os ports implementam `applyRetention`.

**Checkpoint**: todo domínio com dado pessoal tem o port registrado.

---

## Phase 3: User Story 1 - Consumidor vê e leva os próprios dados (Priority: P1) 🎯 MVP

**Goal**: confirmação, categorias e estabelecimentos aparecem na hora. A exportação sai em até 24 h (prazo máximo de 7 dias) num pacote cifrado com JSON e PDF, baixado com OTP, que expira em 7 dias. O consumidor vê também com quem os dados são compartilhados.

**Independent Test**: um consumidor com dados em dois tenants pede a exportação pelo app e confere todas as categorias (quickstart §2).

### Tests for User Story 1 ⚠️

- [ ] T019 [P] [US1] Teste de contrato de `privacyOverview`, `createPrivacyRequest` (export), `listMyPrivacyRequests` e `downloadExport` em `services/privacy/src/http/consumer.contract.test.ts`.
- [ ] T020 [P] [US1] Teste de ponta a ponta da exportação em `services/privacy/src/__tests__/export.e2e.test.ts`:
  - o pacote cobre todos os domínios registrados;
  - o pedido e o download exigem OTP;
  - depois de 7 dias, o link retorna `privacy.export_expired` (`data-model.md` `privacy_request.artifact_expires_at`; REQ-PRI-002/003);
  - a entrega acontece em até 24 h na maioria dos casos (SC-002);
  - segundo pedido no mesmo mês sem mudança devolve o mesmo arquivo (`privacy_settings.free_exports_per_month`);
  - pedido de terceiro só entra pelo Encarregado, com documento de representação.

### Implementation for User Story 1

- [ ] T021 [US1] Implementar a visão "meus dados" (≤ 1 s) a partir do índice de vínculos da 003 e do `describe`, mais os compartilhamentos com link para a política, em `services/privacy/src/requests/overview.ts` (REQ-PRI-001/004).
- [ ] T022 [US1] Implementar a exportação em `services/privacy/src/requests/export.ts`: saga de `export`, pacote `.zip` com JSON (esquema publicado) e PDF (Chromium headless), cifrado no Object Storage, com `data-model.md` `privacy_request.artifact_ref`, `privacy_request.holder_consumer_id`, `privacy_request.scope` e `privacy_request.due_at` (de `privacy_settings.export_due_days`). Exportação repetida no mês sem mudança reaproveita o arquivo.
- [ ] T023 [US1] Implementar as rotas do consumidor em `services/privacy/src/http/consumer.ts`.
- [ ] T024 [P] [US1] Implementar as telas "Meus dados" e "Pedidos de privacidade" dentro de Perfil (C18/W20) em `apps/consumer-mobile/app/perfil/privacidade/` e `apps/consumer-web/app/routes/perfil.privacidade.tsx`, com acesso em até 3 toques (SC-001).

**Checkpoint**: o titular acessa e leva os próprios dados.

---

## Phase 4: User Story 2 - Consumidor pede a eliminação dos dados (Priority: P1)

**Goal**: prévia do que será apagado e do que fica guardado, confirmação por OTP e conclusão em até 15 dias. Fazem parte da eliminação:
- itens para os estabelecimentos, com justificativa de guarda ou eliminação automática no prazo;
- limpeza nos provedores externos;
- trilha de auditoria pseudonimizada;
- livro de eliminações espelhado no R2;
- comprovante ao titular;
- eliminação parcial por estabelecimento.

**Independent Test**: pedir a exclusão e conferir, ao fim do prazo, o que sumiu, o que ficou bloqueado e o comprovante (quickstart §3).

### Tests for User Story 2 ⚠️

- [ ] T025 [P] [US2] Teste de contrato de `erasurePreview` e `createPrivacyRequest` (erasure e partial_erasure) em `services/privacy/src/http/erasure.contract.test.ts`.
- [ ] T026 [P] [US2] Teste de ponta a ponta da eliminação (portão de merge) em `services/privacy/src/__tests__/erasure.e2e.test.ts`:
  - nenhum dado sem guarda legal sobra em nenhum domínio (SC-003);
  - dados com guarda ficam bloqueados e não são usados para outra finalidade (SC-004);
  - o estabelecimento que não responde em 15 dias tem os dados eliminados com `auto_erased` (`data-model.md` `privacy_business_task.state`; REQ-PRI-012);
  - os provedores externos confirmam a remoção (REQ-PRI-014);
  - o comprovante é gerado (`data-model.md` `privacy_request.receipt_ref`; REQ-PRI-017) e enviado antes de apagar o último contato;
  - com chargeback aberto, os dados ligados a ele ficam bloqueados até a conclusão;
  - pré-cadastro nunca verificado (009/003) pede eliminação pelo link de um aviso, com OTP;
  - sem resposta do estabelecimento em `privacy_settings.business_answer_business_days`, a eliminação segue; tudo conclui em `privacy_settings.erasure_due_days`.

### Implementation for User Story 2

- [ ] T027 [US2] Implementar a prévia, com os `restrictions` de cada domínio e os efeitos, em `services/privacy/src/requests/erasure-preview.ts` (REQ-PRI-010): cada agendamento futuro com o efeito pela política congelada de cada estabelecimento (multa ou estorno, contrato da 010, executado pela T061 da 009), pontos perdidos e a opção de pedir o reembolso do pacote (regra da 006) antes de confirmar.
- [ ] T028 [US2] Implementar a saga de eliminação em `services/privacy/src/requests/erasure.ts`, com `delete`, `anonymize` ou `block` por domínio, eliminação parcial por estabelecimento (REQ-PRI-016; `data-model.md` `privacy_request.scope`) e eliminação da conta global. Dados ligados a chargeback aberto ficam bloqueados até a conclusão.
- [ ] T029 [US2] Implementar os itens para os estabelecimentos, com prazo de 15 dias e eliminação automática quando o prazo vence, em `services/privacy/src/business-tasks/tasks.ts` (`data-model.md` `privacy_business_task.kind`, `privacy_business_task.due_at`, `privacy_business_task.retention_basis`, `privacy_business_task.retention_until`, `privacy_business_task.decided_by`), com os prazos de `privacy_settings`.
- [ ] T030 [US2] Implementar a limpeza nos provedores externos (cliente e token no PSP pela 012; contatos no provedor de mensagens pela 011) em `services/privacy/src/saga/external-cleanup.ts`.
- [ ] T031 [US2] Implementar o livro de eliminações (`data-model.md` `privacy_erasure_ledger.holder_hash`, `privacy_erasure_ledger.scope`, `privacy_erasure_ledger.domains`, `privacy_erasure_ledger.executed_at`) com espelho no R2, junto da selagem da 004, em `services/privacy/src/erasure-ledger/ledger.ts`.
- [ ] T032 [P] [US2] Implementar a tela de eliminação com prévia, OTP e comprovante no app e na web, em `apps/consumer-mobile/app/perfil/privacidade/excluir.tsx` e `apps/consumer-web/app/routes/perfil.privacidade.excluir.tsx`.

**Checkpoint**: eliminação completa e comprovada.

---

## Phase 5: User Story 3 - Consumidor corrige dados e gere consentimentos (Priority: P2)

**Goal**: correção da conta global, que vale em todos os estabelecimentos. Correção de dado de um estabelecimento, que vira item para ele com prazo. Registro central de consentimentos, com "Meus consentimentos" e revogação com efeito em até 1 minuto.

**Independent Test**: revogar um consentimento de cada tipo e conferir o efeito em cada domínio (quickstart §5).

### Tests for User Story 3 ⚠️

- [ ] T033 [P] [US3] Teste de contrato de `listMyConsents` e `revokeConsent` em `services/privacy/src/http/consents.contract.test.ts`.
- [ ] T034 [P] [US3] Teste de integração em `services/privacy/src/consents/consents.int.test.ts`:
  - o registro é alimentado pelos eventos de 011, 012, 014 e 020 (`data-model.md` `privacy_consent_registry.kind`, `privacy_consent_registry.text_version`; REQ-PRI-022);
  - a revogação chega ao domínio dono por `privacy.consent.revoke.v1` e tem efeito em ≤ 1 min (SC-005);
  - a correção de dado global vale em todos os estabelecimentos; a de dado do estabelecimento vira item com prazo de 15 dias (REQ-PRI-020).

### Implementation for User Story 3

- [ ] T035 [US3] Implementar o registro central e a revogação em `services/privacy/src/consents/consents.ts`, mais o envio dos eventos de consentimento em cada domínio que coleta (011, 012, 014, 020) e o consumo de `privacy.consent.revoke.v1` em cada um deles (`data-model.md` `privacy_consent_registry.consent_ref`, `privacy_consent_registry.holder_consumer_id`, `privacy_consent_registry.tenant_id`, `privacy_consent_registry.domain`, `privacy_consent_registry.granted_at`, `privacy_consent_registry.revoked_at`).
- [ ] T036 [US3] Implementar a correção, global pela 003 ou como item para o estabelecimento, em `services/privacy/src/requests/correction.ts`.
- [ ] T037 [P] [US3] Implementar a tela "Meus consentimentos" em `apps/consumer-mobile/app/perfil/privacidade/consentimentos.tsx` e `apps/consumer-web/app/routes/perfil.privacidade.consentimentos.tsx`.

**Checkpoint**: consentimentos sob controle do titular.

---

## Phase 6: User Story 4 - Estabelecimento responde aos pedidos e cumpre a retenção (Priority: P2)

**Goal**: "Pedidos de titulares" no painel, com prazos e avisos. Justificativa de guarda registrada. Tabela de retenção aplicada todo dia, com extensão permitida só nas categorias autorizadas e aviso 30 dias antes do vencimento.

**Independent Test**: responder a pedidos de correção e de eliminação com base legal e conferir prazos e registros (quickstart §6).

### Tests for User Story 4 ⚠️

- [ ] T038 [P] [US4] Teste de contrato de `listBusinessTasks`, `decideBusinessTask` e `extendRetention` em `services/privacy/src/http/business.contract.test.ts`.
- [ ] T039 [P] [US4] Teste de integração em `services/privacy/src/retention/retention.int.test.ts`:
  - a tarefa diária aplica a tabela em todos os domínios (REQ-PRI-031);
  - categoria não extensível gera `privacy.category_not_extendable`, e nenhuma extensão fica abaixo de `data-model.md` `privacy_retention_rule.min_legal_period` (`privacy_retention_rule.tenant_can_extend`; REQ-PRI-032);
  - aviso 3 dias antes do vencimento ao Proprietário e, depois de vencido, ao Encarregado (REQ-PRI-040);
  - aviso de vencimento da retenção 30 dias antes.

### Implementation for User Story 4

- [ ] T040 [US4] Implementar a retenção diária no `workers` em `services/privacy/src/retention/retention.ts`: para cada categoria de `data-model.md` `privacy_retention_rule` (`privacy_retention_rule.category`, `privacy_retention_rule.period`, `privacy_retention_rule.legal_basis`, `privacy_retention_rule.on_expiry`, `privacy_retention_rule.version`, `privacy_retention_rule.author_id`), chama `applyRetention` no port de cada domínio registrado. Categorias com decisão do estabelecimento (anotações, 020) abrem `privacy_business_task.kind = retention_expiry` 30 dias antes. Expor `getRetentionRules` (com cache) aos domínios. Extensões em `services/privacy/src/retention/extensions.ts` (`privacy_retention_extension.tenant_id`, `privacy_retention_extension.category`, `privacy_retention_extension.period`, `privacy_retention_extension.basis`, `privacy_retention_extension.decided_by`).
- [ ] T041 [US4] Implementar as decisões do estabelecimento (eliminar ou guardar com base e prazo) e os avisos de prazo em `services/privacy/src/business-tasks/decide.ts` (REQ-PRI-041).
- [ ] T042 [US4] Implementar as rotas `/v1/tenant/privacy/requests*` e `/retention` em `services/privacy/src/http/business.ts`.
- [ ] T043 [P] [US4] Implementar a tela nova "Pedidos de titulares" em Configurações (P26) em `apps/tenant-web/src/routes/settings/privacy/`.

**Checkpoint**: o estabelecimento cumpre prazos e retenção.

---

## Phase 7: User Story 5 - O estabelecimento leva a própria base se sair (Priority: P2)

**Goal**: exportação completa do tenant (com histórico e anotações) só pelo Proprietário, com reautenticação e auditoria. Disponível por 90 dias depois do cancelamento ou da suspensão. No arquivamento, eliminação conforme a tabela, com aviso 30 dias antes.

**Independent Test**: exportar pelo painel, cancelar a assinatura e conferir que a exportação continua disponível no período (quickstart §6).

### Tests for User Story 5 ⚠️

- [ ] T044 [P] [US5] Teste de contrato de `requestTenantExport` em `services/privacy/src/http/tenant-export.contract.test.ts`.
- [ ] T045 [P] [US5] Teste de integração em `services/privacy/src/tenant-export/tenant-export.int.test.ts`:
  - só o Proprietário exporta, com reautenticação, e a exportação vai para a trilha (REQ-PRI-052);
  - o pacote inclui base e histórico com anotações, cifrado, com link de uso único e OTP;
  - tenant cancelado, suspenso ou arquivado exporta até `reactivable_until` da 019 (REQ-PRI-051, SC-006);
  - aviso 30 dias antes de `reactivable_until`; nessa data, o `purge` da 002 é pedido com aprovação dupla; dados fiscais e de pagamento ficam bloqueados por 5 anos; a conta global dos consumidores é mantida;
  - tenant reativado antes da data cancela o `purge` agendado.

### Implementation for User Story 5

- [ ] T046 [US5] Implementar a exportação do tenant pelos `export(scope = tenant)` de cada domínio em `services/privacy/src/tenant-export/tenant-export.ts`.
- [ ] T047 [US5] Implementar o consumidor dos estados do tenant (002 e 019) em `services/privacy/src/tenant-export/lifecycle.ts`: agenda `privacy_tenant_purge.scheduled_for` = `reactivable_until` da 019, avisa `privacy_settings.tenant_purge_notice_days` antes, pede o `purge` da 002 (T090 da 002) com o `dual_control` da 021 e cancela o agendamento se o tenant for reativado.
- [ ] T048 [P] [US5] Implementar a tela nova "Exportação completa" em `apps/tenant-web/src/routes/settings/privacy/Export.tsx`, que também fica disponível no modo suspenso da 019.

**Checkpoint**: o estabelecimento leva os próprios dados.

---

## Phase 8: User Story 6 - Encarregado de dados e incidentes (Priority: P3)

**Goal**: fila única do Encarregado, com pedidos por e-mail verificados por OTP e acesso temporário registrado. Registro de incidentes com risco, lista de afetados e rascunhos de comunicação. Política de privacidade versionada.

**Independent Test**: fila com pedidos em vários estados e um incidente sintético com lista de afetados e rascunhos (quickstart §7).

### Tests for User Story 6 ⚠️

- [ ] T049 [P] [US6] Teste de contrato de `dpoQueue`, `registerEmailRequest`, `updateRetentionRules` e `registerIncident` em `services/privacy/src/http/dpo.contract.test.ts`.
- [ ] T050 [P] [US6] Teste de integração em `services/privacy/src/incidents/incidents.int.test.ts`:
  - pedido por e-mail é verificado por OTP no celular cadastrado e entra na mesma fila (REQ-PRI-060, SC-007);
  - o acesso do Encarregado é temporário e registrado (REQ-PRI-062);
  - incidente com `risk = relevant` gera a lista de afetados pelo `describe` e os rascunhos para a ANPD, os tenants e os titulares, com `data-model.md` `privacy_incident.notification_due_at` (REQ-PRI-061).

### Implementation for User Story 6

- [ ] T051 [US6] Implementar a fila do Encarregado e o registro de pedidos por e-mail em `services/privacy/src/dpo/queue.ts`, incluindo pedidos de terceiro com documento de representação e, na fase 2, do responsável por menor (`[D28]`).
- [ ] T052 [US6] Implementar o registro de incidentes, a lista de afetados e os rascunhos em `services/privacy/src/incidents/incidents.ts` (`data-model.md` `privacy_incident.occurred_at`, `privacy_incident.detected_at`, `privacy_incident.nature`, `privacy_incident.data_categories`, `privacy_incident.affected_count`, `privacy_incident.affected_list_ref`, `privacy_incident.measures`, `privacy_incident.drafts_ref`, `privacy_incident.state`).
- [ ] T053 [US6] Implementar a política versionada (`data-model.md` `privacy_policy_version.relevant_change`, `privacy_policy_version.published_at`, `privacy_policy_version.url`), com aviso aos titulares pela 011 numa versão relevante, em `services/privacy/src/policy/policy.ts`, e as páginas `koovela.com/privacidade/v{n}` em `apps/consumer-web/app/routes/privacidade.$version.tsx` (REQ-PRI-063).
- [ ] T054 [P] [US6] Implementar as telas novas do back-office (fila do Encarregado, tabela de retenção e incidentes) em `apps/admin-web/src/routes/privacy/`.

**Checkpoint**: governança de privacidade em funcionamento.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T055 Implementar `pnpm koovela privacy replay-erasures --since <data>` em `tools/privacy-replay/src/replay.ts` e incluí-lo no runbook de restauração da 001, em `docs/ops/runbooks/restaurar-backup.md`, mais o teste de DR mensal (REQ-PRI-015).
- [ ] T056 [P] Teste do replay em `tools/privacy-replay/__tests__/replay.int.test.ts`: depois de restaurar um backup anterior à eliminação, o titular não reaparece e as anotações continuam ilegíveis (chave destruída).
- [ ] T057 [P] Alertas de prazo em `services/privacy/src/requests/deadlines.ts`: todo pedido tem prazo visível e alerta antes de vencer (REQ-PRI-071).
- [ ] T058 [P] Testes com a flag `privacy.v1` ligada e desligada em `services/privacy/src/__tests__/flags.int.test.ts`.
- [ ] T059 [P] Painel Grafana "Privacidade" em `infra/observability/dashboards/privacy.json`: pedidos por estado, tempo até concluir, itens vencidos e incidentes.
- [ ] T060 Registrar as telas novas (consumidor, painel, back-office e site) em `docs/design/telas-sem-prototipo-022.md` e marcar a revisão da política para a vitrine (D26) como pré-requisito da fase 2, em `docs/ops/decisions/politica-vitrine.md`.
- [ ] T061 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-022.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (saga e pacote) e de todos os ports.
- **US3** depende da fase 2 e pode correr em paralelo com US1 e US2.
- **US4** depende de US2 (itens do estabelecimento).
- **US5** depende da fase 2 e de US1 (pacote).
- **US6** depende de US1 e US2.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Fundação: os ports dos domínios (T010 a T018) em paralelo.
- Depois da fase 2: US1 e US3 em paralelo. Depois de US1, US2 e US5 em paralelo.

---

## Parallel Example: Foundational

```bash
# Ports por domínio, juntos:
Task: "T010 identity"
Task: "T011 tenancy"
Task: "T012 workforce"
Task: "T013 scheduling"
Task: "T014 notification"
Task: "T015 payments"
Task: "T016 loyalty"
Task: "T017 engagement.reviews"
Task: "T018 fiscal e trilha"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2 (todos os ports).
2. US1 (acesso e exportação) e US2 (eliminação).
3. **Parar e validar** com o quickstart §1 a §3.

### Incremental Delivery

1. US3 → US4 (consentimentos e estabelecimento).
2. US5 → US6 (saída do tenant e Encarregado).
3. Polish (replay depois de restauração).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → US6 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-PRI que atende. Campos com restrição citam `data-model.md` e o campo.
- O `privacy` orquestra e nunca acessa tabelas de outros domínios; cada domínio implementa o próprio port.
- Os pacotes são cifrados e têm vida curta. O livro de eliminações não tem PII e é reaplicado depois de qualquer restauração.
- Commit por tarefa ou grupo lógico, em branch `022-privacidade-direitos-titular`, por PR.
- Análise de 2026-11-27: `applyRetention` no `HolderDataPort` e tabela de retenção completa (as tarefas de retenção de 003 T090, 011 T065, 016 T040, 018 T043, 019 T046, 020 T039 e 021 T052 passam a ler os prazos daqui); `privacy_settings` versionado; linha do tempo única do fim do tenant com `purge` na 002 (T090) em `reactivable_until` da 019; prévia pela política congelada (alinhada com a 009 T061); ports da 019 e 021; casos de borda nos testes. Avisos na 011 (T070). Sem tarefas novas nesta spec.
