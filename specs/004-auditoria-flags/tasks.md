---
description: "Lista de tarefas da spec 004 — Auditoria e feature flags"
---

# Tasks: Auditoria e feature flags

**Input**: documentos de `specs/004-auditoria-flags/`, locais e fora do repositório público.

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001, 002 e 003 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige que os testes venham primeiro. Em cada história, as tarefas de teste vêm antes e DEVEM falhar antes do código.

**Organization**: por história de usuário (US1–US6), na ordem de prioridade da spec: US1, US2 e US4 são P1; US3 e US5 são P2; US6 é P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/backoffice/`: `package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS` e as pastas `src/{audit,flags,http}` e `migrations/`.
- [ ] T002 [P] Criar os pacotes `packages/platform/audit/` e `packages/platform/flags/` e a ferramenta `tools/flags-check/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T003 [P] Adicionar as dependências fixadas: `canonicalize`, `@openfeature/server-sdk`, `@openfeature/web-sdk`, cliente S3 (`@aws-sdk/client-s3`) e `react-native-mmkv` nos apps.
- [ ] T004 [P] Copiar os contratos para `packages/contracts/openapi/backoffice-audit-flags.openapi.yaml`, `packages/contracts/asyncapi/backoffice-events.asyncapi.yaml`, `packages/contracts/schemas/audit-record.schema.json` e `packages/contracts/flags/flags.schema.json` (fonte: `specs/004-auditoria-flags/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T005 [P] Adicionar ao esquema de `packages/platform/config/` as chaves `AUDIT_SEAL_BUCKET`, `AUDIT_SEAL_ENDPOINT`, `AUDIT_SEAL_KEY_ID` e `AUDIT_SEAL_SECRET` (`secret: true`), `FLAGS_POLL_MS` (padrão 30000) e `AUDIT_SYNC_QUERY_MAX_DAYS` (padrão 90), e atualizar `.env.example`.
- [ ] T006 [P] Adicionar o MinIO local como substituto do R2 com object lock em `infra/compose/dev.yml`, e o `chrony` com alerta de deriva acima de 1 s em `infra/hosts/` e `infra/observability/alerts/clock.yml` (research R13).

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas `backoffice_*`, a biblioteca de gravação no outbox e a extensão da matriz.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T007 [P] Teste da biblioteca em `packages/platform/audit/src/record.test.ts`:
  - `audit.record(tx, …)` grava no `<domínio>_audit_outbox` da mesma transação;
  - o payload é validado pelo `audit-record.schema.json`;
  - `audit_id` é UUIDv5 da chave de idempotência quando houver (`data-model.md` `<domínio>_audit_outbox.audit_id`);
  - campos pessoais (nome, e-mail, celular) são recusados (REQ-AUD-014).

### Implementação da fundação

- [ ] T008 Criar a migração `services/backoffice/migrations/0001_audit_flags.ts` em `koovela_platform` com:
  - `backoffice_audit_log`: particionada por mês; PK `seq`; UNIQUE `audit_id`; índices `(tenant_id, occurred_at)`, `(actor_id, occurred_at)`, `(action, occurred_at)`, `correlation_id` e `support_session_id`; CHECK em `data-model.md` `backoffice_audit_log.category` e `backoffice_audit_log.result`; `backoffice_audit_log.justification` `VARCHAR(500)`; `backoffice_audit_log.ip` `VARBINARY(16)` completo; `backoffice_audit_log.actor_id` e `backoffice_audit_log.actor_profile` só identificador e perfil;
  - `backoffice_audit_seal`, `backoffice_audit_subject`, `backoffice_audit_query`, `backoffice_feature_flag` e `backoffice_feature_flag_version`.
- [ ] T009 Configurar os grants em `infra/migrations/src/grants.ts`: `svc_backoffice_audit` só com `INSERT`/`SELECT` em `backoffice_audit_log` e com `SELECT, UPDATE(ingested_at)` nos `*_audit_outbox`; nenhum usuário de aplicação com `UPDATE`/`DELETE` na trilha (REQ-AUD-010).
- [ ] T010 Implementar `packages/platform/audit/src/record.ts`, com `audit.record(tx, entry)` e `audit.recordDenied(entry)`, e o gerador de migração do outbox por domínio em `packages/platform/audit/src/outbox-migration.ts` (`data-model.md` §1; `<domínio>_audit_outbox.audit_id` = UUIDv5 da chave de idempotência quando houver, senão UUIDv7).
- [ ] T011 Estender `packages/contracts/rbac/permissions.schema.json` e `packages/contracts/rbac/permissions.yaml` com `audit_category` (`management` | `financial` | `support` | `tenant_admin`) e `justification_required` por ação (a categoria `audit_access` de `backoffice_audit_log.category` não vai na matriz: é gerada só pelas consultas e exportações, REQ-AUD-024), mais a ação `audit.dpo_temporary_access` (concessão por prazo fixo feita pelo SRE, REQ-AUD-023), e atualizar o gerador de `packages/platform/authz` (research R6).
- [ ] T012 [P] Implementar o JSON canônico (RFC 8785) e o encadeamento `hash = SHA-256(prev_hash ‖ JCS(registro))` em `packages/platform/audit/src/chain.ts` (`data-model.md` `backoffice_audit_log.prev_hash`, `backoffice_audit_log.hash`).

**Checkpoint**: tabelas e biblioteca prontas; matriz com categoria de auditoria.

---

## Phase 3: User Story 1 - Toda ação obrigatória vira registro, sem exceção (Priority: P1) 🎯 MVP

**Goal**: 100% das ações obrigatórias geram exatamente um registro, atômico com a ação. Tentativas negadas também viram registro, e repetições não duplicam. Os registros provisórios de 002 e 003 são migrados para a trilha.

**Independent Test**: executar cada ação obrigatória e conferir um registro por ação; com falha forçada no outbox, a ação não acontece (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T013 [P] [US1] Gerador de testes de cobertura em `packages/platform/audit/src/coverage-generator.ts`, com saída em `services/*/src/__generated__/audit-coverage.int.test.ts`. Gera um teste por ação com `audit_category`: exatamente um registro, mais o registro da tentativa negada (REQ-AUD-001/005/006, SC-001); ações em lote geram um registro por alvo com o mesmo `correlation_id` (edge case "ação em lote", testado com a suspensão de 20 tenants); ignora `audit_access`, que não é ação da matriz.
- [ ] T014 [P] [US1] Teste de atomicidade em `packages/platform/audit/src/atomicity.int.test.ts`: falha injetada no outbox desfaz a ação (REQ-AUD-003).
- [ ] T015 [P] [US1] Teste de idempotência e deduplicação em `services/backoffice/src/audit/ingest.int.test.ts`: a mesma chave de idempotência gera um só `audit_id`, e o ingestor nunca duplica (REQ-AUD-004).
- [ ] T016 [P] [US1] Teste de latência em `packages/platform/audit/src/latency.int.test.ts`: a gravação acrescenta ≤ 50 ms p95 à ação (REQ-AUD-028).

### Implementation for User Story 1

- [ ] T017 [US1] Implementar o ingestor único no `workers` em `services/backoffice/src/audit/ingest.ts`:
  - lê os `*_audit_outbox` de cada tenant pelo resolvedor da 002 e os globais;
  - deduplica por `audit_id`;
  - atribui `seq` contínuo e o encadeamento (T012);
  - marca `ingested_at`;
  - copia sem transformar os campos de `data-model.md` `backoffice_audit_log.actor_id`, `backoffice_audit_log.actor_profile`, `backoffice_audit_log.ip` e `backoffice_audit_log.details` (recusa `details` com conteúdo de negócio pelo `audit-record.schema.json`);
  - meta de atraso ≤ 30 s p95 (`data-model.md` `backoffice_audit_log.seq`, `backoffice_audit_log.ingested_at`).
- [ ] T018 [US1] Criar a migração `<domínio>_audit_outbox` em `services/tenancy/migrations/` e `services/identity/migrations/`. Trocar as gravações em `ops_action_log` e `privileged_action_log` por `audit.record()` em `services/tenancy/src/ops-log.ts`, no plugin `authz` do gateway (`services/gateway/src/plugins/authz.ts`) e em `services/identity/src/support-sessions/`.
- [ ] T019 [US1] Implementar a migração dos provisórios (fase `migrate`) em `services/backoffice/migrations/0002_import_provisional_logs.ts`: lê `ops_action_log` (002) e `privileged_action_log` (003) por `occurred_at`, mantém a ordem, marca `source_domain` e deixa as tabelas antigas só leitura até o `contract` (REQ-AUD-007, SC-008).
- [ ] T020 [US1] Implementar a tabela `backoffice_audit_subject` para nomes e e-mails de exibição, cifrados e apagáveis pela 022 sem tocar na cadeia, em `services/backoffice/src/audit/subjects.ts` (`data-model.md` `backoffice_audit_subject.display_name`, `backoffice_audit_subject.email`, ambos cifrados pelo `packages/platform/crypto` da 003, e `backoffice_audit_subject.anonymized_at`).
- [ ] T021 [US1] Adicionar o portão `pnpm test --filter audit-coverage` ao `.github/workflows/pr.yml` e a métrica `audit_ingest_lag_seconds` com alerta acima de 120 s em `infra/observability/alerts/audit.yml`.

**Checkpoint**: toda ação obrigatória auditada e migração feita.

---

## Phase 4: User Story 2 - A trilha não pode ser alterada sem que se perceba (Priority: P1)

**Goal**: trilha só de inclusão, encadeada, com verificação diária e selo fora do banco e fora da OCI, e alerta crítico quando a cadeia quebra.

**Independent Test**: alterar um registro como root e conferir que a verificação aponta exatamente aquele `seq` (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T022 [P] [US2] Teste de adulteração em `services/backoffice/src/audit/verify.int.test.ts`: alterar, remover e reordenar registros é detectado, apontando o primeiro `seq` inconsistente (REQ-AUD-011, SC-002).
- [ ] T023 [P] [US2] Teste de permissões em `services/backoffice/src/audit/grants.int.test.ts`: `UPDATE` e `DELETE` como `svc_backoffice_audit` e como qualquer `svc_*` são recusados (REQ-AUD-010).
- [ ] T024 [P] [US2] Teste do selo em `services/backoffice/src/audit/seal.int.test.ts`: selo gravado no bucket com object lock (MinIO); falha → nova tentativa por hora e alerta depois de 24 h (`data-model.md` `backoffice_audit_seal.status`, `backoffice_audit_seal.attempts`).

### Implementation for User Story 2

- [ ] T025 [US2] Implementar a verificação diária em `services/backoffice/src/audit/verify.ts`: recalcula a cadeia do dia e a raiz de Merkle e grava `backoffice_audit_seal` (`data-model.md` `backoffice_audit_seal.merkle_root`, `backoffice_audit_seal.last_hash`).
- [ ] T026 [US2] Implementar a escrita do selo no Cloudflare R2 com bucket lock de 5 anos em `services/backoffice/src/audit/seal-writer.ts` (`data-model.md` `backoffice_audit_seal.external_uri`; REQ-AUD-012). Antes, confirmar que o plano gratuito do R2 oferece bucket lock e registrar em `docs/ops/decisions/r2-bucket-lock.md`; se não houver, gravar o selo também como asset de release de um repositório público dedicado (sem custo). O uso do R2 por selos e exportações entra na métrica de cota da 001 (T086 da 001).
- [ ] T027 [US2] Implementar `pnpm koovela audit verify --date` em `tools/koovela-cli/src/commands/audit.ts` e o alerta crítico `audit_chain_broken` em `infra/observability/alerts/audit.yml`.
- [ ] T028 [US2] Incluir `backoffice_audit_*` no backup e na cópia fora da OCI da 001 em `infra/backup/` (REQ-AUD-013) e criar o bucket R2 com object lock em `infra/cloudflare/r2-audit.tf`.

**Checkpoint**: adulteração detectável e selo diário fora da OCI.

---

## Phase 5: User Story 4 - Ligar e desligar funções por tenant sem deploy (Priority: P1)

**Goal**: cadastro de flags no repositório, regras no back-office, avaliação determinística por tenant com precedência fixa, propagação em até 60 s e falha segura.

**Independent Test**: ligar uma flag de exemplo para um tenant sintético e vê-la só para ele, na web e no app, em até 60 s; desligar e ver sumir (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T029 [P] [US4] Teste de propriedade em `packages/platform/flags/src/evaluate.property.test.ts`: a precedência de `data-model.md` §3 vale para qualquer combinação; o bucket `SHA-256(flag_key ‖ salt ‖ tenant_id) mod 10000` é estável enquanto o `salt` não muda (`data-model.md` `backoffice_feature_flag_version.config`; REQ-FLG-002/003).
- [ ] T030 [P] [US4] Teste do contexto em `services/gateway/src/routes/flags.test.ts`: `GET /v1/flags` avalia pelo tenant da credencial ou do slug; sem tenant, usa a regra global; `tenant_id` enviado pelo cliente é ignorado; `ETag` funciona (REQ-FLG-004).
- [ ] T031 [P] [US4] Teste de propagação em `packages/platform/flags/src/propagation.int.test.ts`: uma mudança chega aos serviços (evento e polling de 30 s) e aos clientes (polling de 60 s) em ≤ 60 s (REQ-FLG-005, SC-004/005).
- [ ] T032 [P] [US4] Teste de falha em `packages/platform/flags/src/fallback.test.ts`: sem Redis e sem `core`, vale o último valor conhecido; sem ele, o `safe_value` (REQ-FLG-006).

### Implementation for User Story 4

- [ ] T033 [US4] Criar `packages/contracts/flags/flags.yaml` com a flag de exemplo `platform.example_banner` (`release`) e o interruptor `payments.checkout_kill` (`kill_switch`), validado pelo `flags.schema.json`, e o gerador de tipos (`flags.isEnabled` só aceita chaves existentes) em `packages/platform/flags/src/generated/`.
- [ ] T034 [US4] Implementar a avaliação (precedência e bucket) e o provedor OpenFeature de servidor, com snapshot em memória, assinatura de `backoffice.feature_flag.changed.v1` e polling de `flags:snapshot:<env>`, em `packages/platform/flags/src/{evaluate,server-provider}.ts`.
- [ ] T035 [US4] Implementar a sincronização da definição no deploy em `services/backoffice/src/flags/sync.ts`: chave nova entra desligada; chave removida do código vira `removed` (`data-model.md` `backoffice_feature_flag.state`).
- [ ] T036 [US4] Implementar `GET /v1/flags` no gateway em `services/gateway/src/routes/flags.ts`, com flags já avaliadas para o contexto e `ETag`.
- [ ] T037 [P] [US4] Implementar o provedor de cliente web (polling de 60 s e ao voltar ao foco; último valor no `localStorage`) em `packages/platform/flags/src/web-provider.ts` e ligá-lo em `apps/{consumer-web,tenant-web,admin-web}`.
- [ ] T038 [P] [US4] Implementar o provedor de cliente React Native (polling de 60 s e ao voltar ao primeiro plano; MMKV; atualização antes da primeira escrita ao reconectar) em `packages/platform/flags/src/rn-provider.ts` e ligá-lo em `apps/{consumer-mobile,pro-mobile}`.
- [ ] T039 [US4] Implementar a faixa de exemplo atrás de `platform.example_banner` nos shells (`apps/tenant-web/src/components/ExampleBanner.tsx`, `apps/consumer-mobile/src/components/ExampleBanner.tsx`) e o helper `withFlag(key, [true, false])` em `packages/testing/src/with-flag.ts` (REQ-FLG-013).
- [ ] T040 [US4] Implementar `pnpm koovela flags simulate <key> --tenants N` em `tools/koovela-cli/src/commands/flags.ts`.

**Checkpoint**: flag ligada para um tenant aparece só para ele em ≤ 60 s.

---

## Phase 6: User Story 3 - Pesquisar a trilha no back-office (Priority: P2)

**Goal**: pesquisa e exportação na tela G10 com recorte por perfil, a consulta auditada e a visão do Proprietário com a trilha do próprio tenant.

**Independent Test**: pesquisar com cada perfil e conferir o recorte e o tempo-alvo (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T041 [P] [US3] Teste de contrato de `searchAudit`, `exportAudit`, `listSeals` e `searchTenantAudit` em `services/backoffice/src/http/audit.contract.test.ts`.
- [ ] T042 [P] [US3] Teste de recorte em `services/backoffice/src/audit/search-scope.int.test.ts`: SRE vê tudo; Fin/Ops só as categorias financeiras; Suporte só os próprios registros e os das sessões em que esteve; IP truncado fora do SRE; tenant só vê o próprio tenant; cada consulta e exportação gera registro `audit_access` (REQ-AUD-015/023/024/026); o DPO só consulta com concessão `audit.dpo_temporary_access` vigente, que expira no prazo e fica registrada na trilha (REQ-AUD-023).
- [ ] T043 [P] [US3] Teste de desempenho em `services/backoffice/src/audit/search.perf.int.test.ts`: 90 dias em ≤ 5 s p95, com 10 milhões de registros sintéticos (REQ-AUD-022, SC-003).
- [ ] T044 [P] [US3] Teste E2E em `apps/admin-web/e2e/audit.spec.ts` e `apps/tenant-web/e2e/tenant-audit.spec.ts`, com filtros, paginação, exportação e axe.

### Implementation for User Story 3

- [ ] T045 [US3] Implementar a pesquisa em `services/backoffice/src/audit/search.ts`: filtros de REQ-AUD-021, paginação por `seq`, síncrona até 90 dias e assíncrona acima disso, com job no `workers` (`data-model.md` `backoffice_audit_query.kind`, `backoffice_audit_query.status`); a resposta trunca `backoffice_audit_log.ip` para quem não é SRE (REQ-AUD-026).
- [ ] T046 [US3] Implementar a exportação em `services/backoffice/src/audit/export.ts`: CSV mais JSON de prova (hashes e selos do intervalo), link assinado do R2 que expira em 24 h e justificativa obrigatória (`data-model.md` `backoffice_audit_query.justification`, `backoffice_audit_query.expires_at`; REQ-AUD-025). O arquivo é cifrado antes do envio (chave por exportação, guardada só no banco), vai para um bucket de exportações separado do bucket de selos, com regra de ciclo de vida que apaga o objeto em 24 h, e `backoffice_audit_query.result_uri` é limpo na expiração (CONST IV).
- [ ] T047 [US3] Implementar as rotas `/v1/admin/audit/*` e `/v1/tenant/audit/records` em `services/backoffice/src/http/audit.ts`, com o tenant sempre da credencial (REQ-AUD-027).
- [ ] T048 [P] [US3] Implementar a tela G10 (Trilha de auditoria) em `apps/admin-web/src/routes/audit/`, com "atualizado até HH:MM:SS".
- [ ] T049 [P] [US3] Implementar a trilha do próprio tenant em `apps/tenant-web/src/routes/settings/audit/`, com filtros por pessoa, ação, filial e período, a partir de Configurações (P26). É tela nova, sem protótipo: registrar em `docs/design/telas-sem-prototipo-004.md` para desenho antes da revisão final da interface (CONST XI).
- [ ] T066 [US3] Registrar os casos de isolamento do `backoffice` em `services/backoffice/src/isolation.cases.ts` (REQ-TEN-044): `GET /v1/tenant/audit/records` com credencial do tenant B não alcança registro do tenant A (404 por recurso, lista vazia por filtro); `GET /v1/flags` avalia só pelo tenant da credencial ou do slug; o ingestor nunca grava registro do outbox de A com o `tenant_id` de B (REQ-AUD-015, REQ-FLG-004).

**Checkpoint**: pesquisa por perfil e visão do Proprietário.

---

## Phase 7: User Story 5 - Toda mudança de flag é controlada e reversível (Priority: P2)

**Goal**: só SRE muda flags. Em produção, a mudança exige justificativa, reautenticação recente e prévia dos tenants afetados. Há concorrência otimista, histórico, reversão em um passo e auditoria com valor anterior e novo.

**Independent Test**: mudar uma flag três vezes, conferir o histórico e reverter para a primeira versão num passo (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T050 [P] [US5] Teste de contrato de `listFlags`, `changeFlag`, `revertFlag` e `evaluateFlagsForClient` em `services/backoffice/src/http/flags.contract.test.ts`.
- [ ] T051 [P] [US5] Teste de integração em `services/backoffice/src/flags/change.int.test.ts`:
  - perfil diferente de SRE → 403 (REQ-FLG-007);
  - produção sem justificativa ou sem reautenticação recente → recusado;
  - `dry_run` devolve os tenants afetados (REQ-FLG-008);
  - `If-Match` antigo → 409 (`data-model.md` `backoffice_feature_flag.version`; REQ-FLG-010);
  - reversão cria uma versão com `reverted_from` (`data-model.md` `backoffice_feature_flag_version.reverted_from`; REQ-FLG-009);
  - registro na trilha com valor anterior e novo (SC-006).

### Implementation for User Story 5

- [ ] T052 [US5] Implementar a mudança e a reversão em `services/backoffice/src/flags/change.ts`: versões imutáveis, contagem de tenants afetados, `audit.record()` com `details` antes e depois, e evento `backoffice.feature_flag.changed.v1`. Acionar o interruptor gera uma anotação no Grafana.
- [ ] T053 [US5] Implementar as rotas `/v1/admin/flags*` em `services/backoffice/src/http/flags.ts`, com ação `flag.change` na matriz, `sensitive: true` e `justification_required`.
- [ ] T054 [P] [US5] Implementar a tela G09 (Feature flags) em `apps/admin-web/src/routes/flags/`: lista com tipo, estado por ambiente, regras, tenants afetados, responsável, data de remoção e último uso; edição com prévia, justificativa e reautenticação; histórico e reverter (REQ-FLG-011).
- [ ] T055 [P] [US5] Teste E2E em `apps/admin-web/e2e/flags.spec.ts`: criar, alterar, reverter e acionar o interruptor, com axe.

**Checkpoint**: mudança de flag controlada, auditada e reversível.

---

## Phase 8: User Story 6 - Flags não viram dívida (Priority: P3)

**Goal**: verificação semanal de flags vencidas e sem uso, e CI que bloqueia o código de flag de liberação vencida e a divergência entre código e cadastro.

**Independent Test**: criar uma flag com data de remoção no passado e outra sem uso há 30 dias e conferir os avisos (quickstart §6).

### Tests for User Story 6 ⚠️

- [ ] T056 [P] [US6] Teste do `flags-check` em `tools/flags-check/__tests__/check.test.ts`: chave usada no código e ausente do `flags.yaml` falha; chave do cadastro sem uso no código avisa; PR que toca código de flag `release` vencida há mais de 30 dias falha (REQ-FLG-014, SC-007); flag `release` sem teste com `withFlag(key, [true, false])` falha (REQ-FLG-013).
- [ ] T057 [P] [US6] Teste da higiene em `services/backoffice/src/flags/hygiene.int.test.ts`: marca `expired` e `unused` e avisa o responsável (`data-model.md` `backoffice_feature_flag.state`, `backoffice_feature_flag.last_evaluated_at`).

### Implementation for User Story 6

- [ ] T058 [US6] Implementar `tools/flags-check/src/check.ts` (busca de `flags.isEnabled('…')` no diff e no código, e de `withFlag` nos testes de cada flag `release`) e o script `pnpm flags:check`, como portão no `.github/workflows/pr.yml`.
- [ ] T059 [US6] Implementar a tarefa semanal de higiene no `workers` em `services/backoffice/src/flags/hygiene.ts`, com `last_evaluated_at` vindo da métrica `flags_evaluations_total`, e o comando `pnpm koovela flags hygiene`.

**Checkpoint**: flags com data de validade fiscalizada.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T060 [P] Implementar a remoção em bloco de partições com mais de 5 anos, preservando os selos e com registro, em `services/backoffice/src/audit/retention.ts` (REQ-AUD-020), mais o runbook `docs/ops/runbooks/retencao-trilha.md`.
- [ ] T061 [P] Painel Grafana "Auditoria e flags" em `infra/observability/dashboards/backoffice.json`: atraso do ingestor, selos, verificações, avaliações de flags e interruptores.
- [ ] T062 [P] Escrever os runbooks `docs/ops/runbooks/{cadeia-auditoria-quebrada,interruptor-de-emergencia}.md`.
- [ ] T063 Registrar no plano de cada spec seguinte a regra "funcionalidade nova visível = flag `release` desligada por padrão" em `docs/dev/flags.md` (REQ-FLG-012/015).
- [ ] T064 Executar a fase `contract` que remove as tabelas provisórias `ops_action_log` e `privileged_action_log` depois de 100% migrado, em `services/backoffice/migrations/0003_contract_provisional_logs.ts`.
- [ ] T065 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-004.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** (registro) depende da fase 2.
- **US2** (integridade) depende de US1, que precisa do ingestor e da cadeia em uso.
- **US4** (flags) depende só da fase 2 e pode correr em paralelo com US1 e US2.
- **US3** (pesquisa) depende de US1 e US2.
- **US5** (mudança controlada) depende de US4 e de US1 (auditoria da mudança).
- **US6** (higiene) depende de US4.
- **Polish**: T064 depende de T019; as demais vêm depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → biblioteca e domínio → rotas → telas → CI e alertas.

### Parallel Opportunities

- Fase 1: T002–T006.
- Depois da fase 2: US1 e US4 em paralelo; depois de US1, US2. Depois de US4, US5 e US6 em paralelo.
- Provedores web e RN (T037, T038) e as telas (T048, T049, T054) em paralelo.

---

## Parallel Example: User Story 4

```bash
# Testes primeiro, juntos:
Task: "T029 precedência e bucket em packages/platform/flags/src/evaluate.property.test.ts"
Task: "T030 contexto em services/gateway/src/routes/flags.test.ts"
Task: "T031 propagação em packages/platform/flags/src/propagation.int.test.ts"
Task: "T032 falha em packages/platform/flags/src/fallback.test.ts"

# Provedores de cliente juntos:
Task: "T037 web-provider"
Task: "T038 rn-provider"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: toda ação obrigatória auditada; provisórios migrados.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US1 → US2 (trilha confiável).
2. US4 (flags por tenant; a partir daqui toda função nova entra atrás de flag).
3. US3 e US5 (telas G10 e G09).
4. US6 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US4 → US3 → US5 → US6 → Polish.

---

## Notes

- T066 foi acrescentada pelo `/speckit-analyze` de 2026-11-26 (US3); a numeração não foi refeita.
- O ingestor (T017) deve ser medido com 1.000 tenants no teste de carga de staging da 002 (T086 da 002).
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-AUD ou REQ-FLG que atende. Campos com restrição citam `data-model.md` e o campo.
- A trilha nunca guarda nome, e-mail, celular ou conteúdo de negócio.
- Flags são operacionais. Funções por plano são da 019, e concessões da 021 (REQ-FLG-015).
- Commit por tarefa ou grupo lógico, em branch `004-auditoria-flags`, por PR.
