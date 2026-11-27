---
description: "Lista de tarefas da spec 002 — Tenancy e provisionamento de schema"
---

# Tasks: Tenancy e provisionamento de schema

**Input**: documentos de `specs/002-tenancy-provisionamento/`, locais e fora do repositório público.

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); spec 001 concluída.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes antes. Em cada história, as tarefas de teste vêm primeiro e DEVEM falhar antes do código. Os testes de integração usam MySQL real com vários schemas (REQ-TEN-061).

**Organization**: por história de usuário (US1–US7). A ordem segue a prioridade da spec, ajustada pelas dependências técnicas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US7).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

**Purpose**: criar o domínio `tenancy` e os pacotes novos no monorepo da 001.

- [ ] T001 Criar o pacote do domínio `services/tenancy/`: `package.json`, `tsconfig.json` e plugin Fastify vazio registrado em `KOOVELA_DOMAINS` do `runtimes/core`, com as pastas `src/{provisioning,lifecycle,migration-runs,restore,verify,http}` e `migrations/`.
- [ ] T002 [P] Criar os pacotes `packages/platform/tenancy/`, `packages/testing/isolation/` e `packages/testing/tenants/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/tenancy.openapi.yaml` e `packages/contracts/asyncapi/tenancy-events.asyncapi.yaml` (fonte: `specs/002-tenancy-provisionamento/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T004 [P] Adicionar ao esquema de `packages/platform/config/` as chaves `MIGRATOR_DB_USER` e `MIGRATOR_DB_PASSWORD` (com `secret: true`), `MIGRATION_PARALLELISM` (padrão 8), `MIGRATION_TENANT_TIMEOUT_MS` (padrão 300000), `MIGRATION_CANARY_PCT` (padrão 5) e `TENANT_SCHEMA_LIMIT` (padrão 1000), e atualizar `.env.example`.
- [ ] T005 [P] Ajustar `infra/compose/` (MySQL 8.4): usuário `koovela_migrator` criado no init, `table_open_cache`, `table_definition_cache` e `innodb_open_files` dimensionados para 1.000 tenants (research R11) e binlog ligado em formato ROW.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: o núcleo do executor, o resolvedor de schema, as tabelas de registro e o gerador de tenants sintéticos, usados por todas as histórias.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T006 [P] Teste do nome do schema: `t_<hex32>` derivado só do UUIDv7, sem slug ou nome e ≤ 64 caracteres (`data-model.md` `tenant.schema_name`; REQ-TEN-002), em `packages/platform/tenancy/src/schema-name.test.ts`.
- [ ] T007 [P] Teste do `TenantContext` e de `db.forTenant()` em `packages/platform/tenancy/src/resolver.test.ts`:
  - sem contexto → `tenancy.context_missing` (REQ-TEN-041);
  - com contexto → Kysely com `withSchema('t_…')` e pool por domínio;
  - propagação por chamada entre domínios e por mensagem AMQP (REQ-TEN-042).
- [ ] T008 [P] Teste dos helpers `redisKey`, `lockKey`, cabeçalho AMQP, chave de objeto e logger, todos com o tenant aplicado automaticamente (REQ-TEN-043), em `packages/platform/tenancy/src/prefixes.test.ts`.
- [ ] T009 [P] Teste das regras de lint em `packages/eslint-config/rules/__tests__/tenancy-rules.test.ts`: importar `mysql2`, o driver `kysely` ou usar `withSchema`/`sql.raw` com nome de schema fora de `packages/platform` falha; chamar o cliente Redis ou o publicador sem helper falha (REQ-TEN-040/043).
- [ ] T010 [P] Teste do núcleo do executor em `infra/migrations/src/__tests__/migration-shape.test.ts`:
  - migração sem `down` é rejeitada (REQ-TEN-031);
  - `phase` fora de `expand`/`migrate`/`contract` é rejeitada;
  - checksum alterado é detectado;
  - SQL de um domínio que toca tabela de outro prefixo é rejeitado (research R2; REQ-TEN-003).
- [ ] T011 [P] Teste do gerador de tenants sintéticos em `packages/testing/tenants/src/generator.test.ts`: semente fixa gera os mesmos `tenant_id`, e todos têm `synthetic = true` (`data-model.md` `tenant.synthetic`; REQ-TEN-060).

### Implementação da fundação

- [ ] T012 Implementar `packages/platform/tenancy/src/schema-name.ts` (`schemaNameFor(tenantId)` e `parseSchemaName`) conforme `data-model.md` `tenant.schema_name`.
- [ ] T013 Implementar o `TenantContext` em `packages/platform/tenancy/src/context.ts`, sobre o AsyncLocalStorage reservado em `packages/platform/tenant-context`, com `runWithTenant`, `currentTenant` e propagação em headers HTTP internos e no envelope AMQP.
- [ ] T014 Implementar `db.forTenant()` e `db.global(space)` em `packages/platform/tenancy/src/resolver.ts`: um pool por domínio com a credencial `svc_<domínio>`, `withSchema` aplicado só aqui e erro `tenancy.context_missing`.
- [ ] T015 [P] Implementar os helpers em `packages/platform/tenancy/src/prefixes.ts` e ligá-los no logger (`packages/platform/logger`) e no publicador da 001: `redisKey` → `t:{tenant_id}:…`, `lockKey`, cabeçalho AMQP `x-tenant-id` e objetos `tenants/{tenant_id}/…`.
- [ ] T016 [P] Implementar as regras `no-raw-db-connection`, `no-schema-literal` e `no-unprefixed-cache` em `packages/eslint-config/rules/` e ligá-las na config base, com exceção só para `packages/platform/**`.
- [ ] T017 Implementar o núcleo de `@koovela/migrator` em `infra/migrations/src/`: carga de `services/*/migrations/NNNN_*.ts` com `phase`/`up`/`down`/`checksum` (`phase` ∈ `expand`/`migrate`/`contract`, gravada em `data-model.md` `tenant_domain_version.phase`), validação de forma, verificação estática de prefixo de tabela, tabela `_migrations` por schema (`data-model.md` §2 `_migrations`) e aplicação com o usuário `koovela_migrator`.
- [ ] T018 Implementar a verificação de DDL em `infra/migrations/src/ddl-guard.ts`: em `expand` e `contract`, aceitar só `ALGORITHM=INSTANT` ou `INPLACE, LOCK=NONE`; cópia de dados só em `migrate`, em lotes (REQ-TEN-032).
- [ ] T019 Criar as migrações de `koovela_platform` do `tenancy` em `services/tenancy/migrations/0001_platform_registry.ts`:
  - `tenant`, com o CHECK de `data-model.md` `tenant.state`;
  - `tenant_domain_version`;
  - `tenant_state_transition` (append-only);
  - `provisioning_request`, com UNIQUE em `data-model.md` `provisioning_request.idempotency_key`;
  - `migration_run`, com índice único parcial para uma `running` por ambiente (`data-model.md` `migration_run.status`);
  - `migration_tenant_result`, `global_space`, `tenant_restore`, `ops_action_log` (append-only) e `outbox`.
- [ ] T020 Implementar o gerador de grants em `infra/migrations/src/grants.ts`: roles `r_<domínio>`, DML por tabela em cada `t_x` e só `INSERT`/`SELECT` nas tabelas append-only, conforme `data-model.md` §4 e research R3 (REQ-TEN-004).
- [ ] T021 Implementar a máquina de estados em `services/tenancy/src/lifecycle/state-machine.ts`:
  - tabela de transições permitidas de `data-model.md` §3;
  - `transition()` que grava `tenant_state_transition` e o evento no outbox na mesma transação (REQ-TEN-011/012);
  - erro `tenancy.transition_not_allowed`.
- [ ] T022 [P] Implementar o gerador determinístico em `packages/testing/tenants/src/generator.ts`, com semente fixa, `synthetic = true` e helper `seedTenants(n)` que provisiona pelo executor (REQ-TEN-060).
- [ ] T023 Criar os subcomandos base `tenant` e `migrate` no CLI em `tools/koovela-cli/src/commands/{tenant,migrate}.ts`, com `--help` e conexão ao `core` por credencial de serviço.

**Checkpoint**: resolvedor e executor testados; registro criado; tenants sintéticos podem ser gerados.

---

## Phase 3: User Story 1 - Provisionar um tenant novo em menos de 2 minutos (Priority: P1) 🎯 MVP

**Goal**: o pedido de provisionamento deixa o tenant `active` com todas as estruturas e grants em menos de 2 minutos (p95). O pedido é idempotente, seguro para repetir e com uma única execução por tenant.

**Independent Test**: provisionar um tenant de teste, medir o tempo até `active`, repetir o pedido e conferir que nada é duplicado (quickstart §2).

### Tests for User Story 1 ⚠️

- [ ] T024 [P] [US1] Teste de contrato de `provisionTenant` e `getTenantStatus` contra `packages/contracts/openapi/tenancy.openapi.yaml` em `services/tenancy/src/http/internal.contract.test.ts`.
- [ ] T025 [P] [US1] Teste de integração da idempotência em `services/tenancy/src/provisioning/idempotency.int.test.ts`: a mesma `idempotency_key` devolve o mesmo `request_id` sem novo schema; dois pedidos simultâneos geram uma só execução (REQ-TEN-021/022).
- [ ] T026 [P] [US1] Teste de integração da retomada em `services/tenancy/src/provisioning/resume.int.test.ts`: derrubar a conexão no meio e repetir termina `active`; 3 falhas injetadas → `provisioning_failed` e alerta (`data-model.md` `provisioning_request.attempts`; REQ-TEN-024).
- [ ] T027 [P] [US1] Teste de equivalência no CI em `infra/migrations/src/__tests__/baseline-equivalence.int.test.ts`: aplicar a baseline e aplicar todas as migrações do zero produzem estrutura idêntica (research R5).
- [ ] T028 [P] [US1] Teste de desempenho em `services/tenancy/src/provisioning/latency.int.test.ts`: 20 provisionamentos com p95 < 2 min, registrado a partir de `data-model.md` `provisioning_request.started_at`/`finished_at` (REQ-TEN-020, SC-001).
- [ ] T029 [P] [US1] Teste de que nenhum comando apaga um schema de tenant em `services/tenancy/src/no-drop.test.ts`: varre o código e as migrações procurando `DROP DATABASE`/`DROP SCHEMA`/`DROP TABLE` sobre `t_*`; o único `DROP` aceito é o da limpeza (T078) e só sobre os prefixos `r_` e `o_` (REQ-TEN-013, SC-007).

### Implementation for User Story 1

- [ ] T030 [US1] Implementar a geração da baseline por domínio em `infra/migrations/src/baseline.ts`, com DDL consolidado da versão atual e checksum, e o passo do release que a gera (research R5).
- [ ] T031 [US1] Implementar o fluxo de provisionamento em `services/tenancy/src/provisioning/provision.ts`:
  1. `CREATE DATABASE IF NOT EXISTS`;
  2. baselines;
  3. registro em `tenant_domain_version`;
  4. grants (T020);
  5. verificação de estrutura;
  6. transição `provisioning → active`;
  7. evento.

  Usa trava `GET_LOCK('koovela:provision:<tenant_id>')`, passos idempotentes e retentativa com backoff (`data-model.md` `provisioning_request.status`, `provisioning_request.last_error_code`).
- [ ] T032 [US1] Implementar `POST /v1/internal/tenancy/tenants` e `GET /v1/internal/tenancy/tenants/{tenant_id}` em `services/tenancy/src/http/internal.ts`, só com credencial de serviço (research R12; REQ-TEN-023).
- [ ] T033 [US1] Implementar o job de provisionamento no `workers` em `services/tenancy/src/provisioning/job.ts`, consumindo o pedido e emitindo o evento `tenancy.tenant.lifecycle` (`provisioned`/`provisioning_failed`) conforme `tenancy-events.asyncapi.yaml`.
- [ ] T034 [US1] Implementar `pnpm koovela tenant provision --tenant-id --key [--time] [--inject-failure N]` em `tools/koovela-cli/src/commands/tenant.ts`, só no perfil SRE (REQ-TEN-023).
- [ ] T035 [US1] Adicionar a métrica `tenancy_provisioning_duration_seconds` (histograma) e o alerta de falha de provisionamento em `infra/observability/alerts/tenancy.yml` (REQ-TEN-053).

**Checkpoint**: provisionamento idempotente em < 2 min, validado pelo quickstart §2.

---

## Phase 4: User Story 2 - Migrar todos os schemas sem indisponibilidade (Priority: P1)

**Goal**: um único executor aplica migrações a todos os schemas: canário, paralelismo, falha isolada, reprocessamento, rollback, uma execução por ambiente e expandir → migrar → contrair sem indisponibilidade.

**Independent Test**: 50 tenants sintéticos sob carga. Aplicar uma migração de teste com um tenant forçado a falhar: nenhuma requisição falha, e só o tenant forçado fica `migration_pending` (quickstart §3).

### Tests for User Story 2 ⚠️

- [ ] T036 [P] [US2] Teste de integração do canário em `infra/migrations/src/__tests__/canary.int.test.ts`: 5% (mínimo 1) primeiro; falha no canário → `canary_failed` e nada nos demais (`data-model.md` `migration_run.canary_size`, `migration_run.status`; REQ-TEN-034).
- [ ] T037 [P] [US2] Teste de integração da falha isolada em `infra/migrations/src/__tests__/isolated-failure.int.test.ts`: o tenant injetado fica `migration_pending`, o erro fica em `migration_tenant_result` sem valores de linha (`data-model.md` `migration_tenant_result.error_detail`), os outros 49 migram, e o reprocessamento migra só o pendente (REQ-TEN-033, SC-003).
- [ ] T038 [P] [US2] Teste da trava por ambiente em `infra/migrations/src/__tests__/single-run.int.test.ts`: uma segunda execução é recusada com `tenancy.migration_run_in_progress` (REQ-TEN-035).
- [ ] T039 [P] [US2] Teste de rollback em `infra/migrations/src/__tests__/rollback.int.test.ts`: reverte em ordem inversa; rollback de `contract` aplicada é recusado; `contract` com algum tenant fora da versão nova é recusada (REQ-TEN-036).
- [ ] T040 [P] [US2] Teste de disponibilidade em `infra/migrations/src/__tests__/zero-downtime.int.test.ts`: um gerador de carga de leitura e escrita durante a migração termina com zero erros (REQ-TEN-032).
- [ ] T041 [P] [US2] Teste de compatibilidade N/N-1 em `infra/migrations/src/__tests__/version-compat.int.test.ts`: o código da versão atual funciona contra schemas na versão anterior de cada domínio (REQ-TEN-036).

### Implementation for User Story 2

- [ ] T042 [US2] Implementar o orquestrador em `services/tenancy/src/migration-runs/orchestrator.ts`:
  - trava `GET_LOCK('koovela:migration:<env>')` mais linha `migration_run` `running`;
  - ordem globais → canário → demais;
  - paralelismo `MIGRATION_PARALLELISM`;
  - tempo limite por tenant;
  - contadores e `heartbeat_at` (`data-model.md` `migration_run.succeeded`/`failed`/`pending`/`heartbeat_at`).
- [ ] T043 [US2] Implementar o resultado por tenant e a transição `active → migration_pending` com `state_reason`, e a volta a `active` no sucesso, em `services/tenancy/src/migration-runs/tenant-result.ts` (`data-model.md` `migration_tenant_result.result`, `migration_tenant_result.error_code` e `migration_tenant_result.error_detail` só com estrutura, código e posição, `tenant.state_reason`).
- [ ] T044 [US2] Implementar o reprocessamento (`kind = reprocess`, só pendentes) e o rollback (`kind = rollback`, ordem inversa, recusa de `contract`) em `services/tenancy/src/migration-runs/{reprocess,rollback}.ts` (`data-model.md` `migration_run.kind`).
- [ ] T045 [US2] Implementar o portão da fase `contract` (100% dos tenants na versão nova) em `services/tenancy/src/migration-runs/contract-gate.ts` (REQ-TEN-036).
- [ ] T046 [US2] Implementar a suspensão automática de tenant com mais de uma versão de atraso, com `state_reason = version_lag` e alerta crítico, em `services/tenancy/src/lifecycle/version-lag.ts` (REQ-TEN-037).
- [ ] T047 [US2] Implementar `pnpm koovela migrate [--globals] [--domain X] [--plan] [--reprocess <run_id>] [--rollback <run_id>] [--inject-failure-tenant <id>]` em `tools/koovela-cli/src/commands/migrate.ts`.
- [ ] T048 [US2] Adicionar ao pipeline de PR (`.github/workflows/pr.yml`) o job que aplica toda migração nova e o rollback dela sobre 3 schemas sintéticos, como portão de merge, e o job de staging com 50 tenants (REQ-TEN-039).
- [ ] T049 [US2] Adicionar o passo de migração ao deploy da 001 em `infra/deploy/release.sh` (globais → canário → demais → troca de versão dos processos) (research R4).
- [ ] T050 [US2] Adicionar ao `infra/observability/alerts/tenancy.yml` os alertas de `migration_pending`, canário com falha, versão atrasada e execução parada há mais de 15 min (REQ-TEN-053).
- [ ] T051 [US2] Teste de carga em staging, com 500 tenants sintéticos, migração típica em ≤ 30 min e zero erros, registrado em `docs/ops/decisions/carga-migracao-002.md` (REQ-TEN-038, SC-002).

**Checkpoint**: migração multi-schema com canário e falha isolada, validada pelo quickstart §3.

---

## Phase 5: User Story 3 - Isolamento de tenant por construção (Priority: P1)

**Goal**: suíte de isolamento como portão de merge, recusa de requisição sem contexto e gating por estado com Problem Details estável.

**Independent Test**: `pnpm test:isolation` com os tenants A e B: todo acesso de A a recurso de B responde 404 (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T052 [P] [US3] Teste do harness em `packages/testing/isolation/src/harness.test.ts`: um caso registrado que vaza dado de B faz a suíte falhar.
- [ ] T053 [P] [US3] Teste do gating em `packages/platform/tenancy/src/gating.test.ts`: cada estado de `data-model.md` `tenant.state` gera o `code` da tabela de gating de `data-model.md` §3; `migration_pending` passa só com atraso ≤ 1 versão (REQ-TEN-045).

### Implementation for User Story 3

- [ ] T054 [US3] Implementar o harness em `packages/testing/isolation/src/harness.ts`: cria os tenants A e B pelo gerador (T022) e expõe `registerIsolationCase({ endpoint | consumer | cacheRead })` e a matriz "contexto A → recurso B = 404" (REQ-TEN-044).
- [ ] T055 [US3] Implementar o gating no resolvedor em `packages/platform/tenancy/src/gating.ts`, com cache Redis `t:{tenant_id}:state` (TTL 30 s) invalidado pelos eventos de estado e Problem Details `tenancy.tenant_*` (research R6).
- [ ] T056 [US3] Registrar os casos de isolamento do `tenancy` e do resolvedor em `services/tenancy/src/isolation.cases.ts`: internal API, cache, lock, mensagem e objeto.
- [ ] T057 [US3] Adicionar `pnpm test:isolation` ao `package.json` raiz e torná-lo portão obrigatório no `.github/workflows/pr.yml` (REQ-TEN-044, SC-004).
- [ ] T058 [US3] Documentar em `docs/dev/isolamento.md` como cada spec futura registra os seus casos de isolamento.

**Checkpoint**: isolamento como portão de merge.

---

## Phase 6: User Story 5 - Ciclo de vida do tenant (Priority: P2)

**Goal**: todas as transições permitidas por comando e contrato interno, as proibidas recusadas, e cada transição com registro e evento.

**Independent Test**: conduzir um tenant por todas as transições permitidas e confirmar que as proibidas são recusadas (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T059 [P] [US5] Teste de propriedade (fast-check) em `services/tenancy/src/lifecycle/state-machine.property.test.ts`: sequências aleatórias de comandos só produzem as transições de `data-model.md` §3 e cada uma gera uma linha em `tenant_state_transition` e um evento (REQ-TEN-011/012).
- [ ] T060 [US5] Teste de contrato de `transitionTenant` em `services/tenancy/src/http/internal.contract.test.ts` (mesmo arquivo de T024; não paralelizar com T024).

### Implementation for User Story 5

- [ ] T061 [US5] Implementar `POST /v1/internal/tenancy/tenants/{tenant_id}/transitions` em `services/tenancy/src/http/internal.ts`, com ator, motivo sem PII e `correlation_id` (`data-model.md` `tenant_state_transition.actor_type`, `tenant_state_transition.actor_id`, `tenant_state_transition.reason`).
- [ ] T062 [US5] Implementar `pnpm koovela tenant transition <id> --to <estado> --reason` em `tools/koovela-cli/src/commands/tenant.ts`.
- [ ] T063 [US5] Publicar o evento `tenancy.tenant.lifecycle` em cada transição pelo outbox e invalidar o cache de estado (T055) em `services/tenancy/src/lifecycle/events.ts`.

**Checkpoint**: ciclo de vida completo e testado por propriedade.

---

## Phase 7: User Story 6 - Espaços de dados globais (Priority: P2)

**Goal**: `koovela_identity`, `koovela_platform` e `koovela_projections` criados e migrados pelo mesmo executor, com dono e versão registrados.

**Independent Test**: num ambiente do zero, `pnpm koovela migrate --globals` cria os três espaços versionados (quickstart §1).

### Tests for User Story 6 ⚠️

- [ ] T064 [P] [US6] Teste de integração em `infra/migrations/src/__tests__/globals.int.test.ts`: ambiente vazio → três espaços com `data-model.md` `global_space.owner_domain` e `global_space.version`; repetir é idempotente; migração global segue as mesmas regras de forma e reversão (REQ-TEN-005).

### Implementation for User Story 6

- [ ] T065 [US6] Implementar o alvo "globais" no executor em `infra/migrations/src/globals.ts`: criação de `koovela_platform`, `koovela_identity` e `koovela_projections`, registro em `global_space` e grants por dono de tabela (research R1).
- [ ] T066 [US6] Implementar o comando `--globals` e a ordem "globais primeiro" do orquestrador (T042) em `tools/koovela-cli/src/commands/migrate.ts`.
- [ ] T067 [US6] Implementar `pnpm koovela tenant seed --count N` e `pnpm koovela tenant list` em `tools/koovela-cli/src/commands/tenant.ts`, com 3 tenants no local e no CI e 50 em staging (REQ-TEN-060).

**Checkpoint**: ambiente do zero com globais e tenants sintéticos em um comando.

---

## Phase 8: User Story 4 - Acompanhar tenants e migrações no back-office (Priority: P2)

**Goal**: tela G03 em `admin-web` com tenants, versão por domínio, falhas, andamento da execução e ações com justificativa e registro.

**Independent Test**: com tenants em vários estados, abrir `/schemas`, conferir os números contra o registro e reprocessar um tenant pela tela (quickstart §6).

### Tests for User Story 4 ⚠️

- [ ] T068 [P] [US4] Teste de contrato de `listTenantsForOps`, `runOpsAction`, `listMigrationRuns` e `listMigrationFailures` em `services/tenancy/src/http/admin.contract.test.ts`.
- [ ] T069 [P] [US4] Teste de integração em `services/tenancy/src/http/admin.int.test.ts`: ação sem justificativa é recusada; ação registrada em `ops_action_log` com ator, ação, alvo, justificativa, IP, `request_id` e horário (`data-model.md` `ops_action_log`; REQ-TEN-051); a mesma ação repetida com a mesma `Idempotency-Key` não gera segunda execução nem segunda linha; acesso sem JWT do Cloudflare Access do grupo SRE → 403 (REQ-TEN-052).
- [ ] T070 [P] [US4] Teste E2E em `apps/admin-web/e2e/schemas.spec.ts` (Playwright e axe): filtros por estado e versão, detalhe de falha sem dado de negócio, reprocessamento com confirmação e acessibilidade WCAG AA.

### Implementation for User Story 4

- [ ] T071 [US4] Implementar `/v1/admin/tenancy/*` em `services/tenancy/src/http/admin.ts` (lista com filtros, execuções, falhas, ações `provision`/`reprocess`/`rollback`/`suspend`/`reactivate`/`archive`, todas com `Idempotency-Key` obrigatória), com validação do `Cf-Access-Jwt-Assertion` do grupo SRE no gateway (`services/gateway/src/plugins/cf-access.ts`).
- [ ] T072 [US4] Implementar o registro de ações append-only em `services/tenancy/src/ops-log.ts` (`data-model.md` `ops_action_log.action`, `ops_action_log.ip`), com exportação compatível com a trilha da spec 004.
- [ ] T073 [US4] Implementar a tela G03 em `apps/admin-web/src/routes/schemas/` (lista, andamento com atualização a cada 5 s, detalhe de falha, diálogo de ação com justificativa e confirmação), no item "Schemas" da navegação de `packages/contracts/ui/shell-navigation.json`.
- [ ] T074 [US4] Conferir a tela contra o Figma G03 (página "05 · Back-office Gestão + BI") e registrar diferenças em `docs/design/g03-diferencas.md`.

**Checkpoint**: o SRE responde "em que versão está cada tenant e quais falharam?" em menos de 1 minuto (SC-005).

---

## Phase 9: User Story 7 - Restaurar um único tenant (Priority: P3)

**Goal**: restaurar um tenant para um instante escolhido num espaço separado e trocá-lo pelo espaço em uso com aprovação, em até 4 horas, sem afetar outros tenants.

**Independent Test**: em staging, apagar dados de um tenant sintético, restaurar num espaço separado, conferir e trocar (quickstart §7).

### Tests for User Story 7 ⚠️

- [ ] T075 [P] [US7] Teste de integração em `services/tenancy/src/restore/restore.int.test.ts`:
  - dump mais binlog até o instante gera `r_<hex32>_<ts>`;
  - outros tenants não são tocados;
  - troca sem `approved_by` é recusada (`data-model.md` `tenant_restore.approved_by`, `tenant_restore.status`);
  - limpeza remove só `o_*` e `r_*`, nunca `t_*` (REQ-TEN-013/055).

### Implementation for User Story 7

- [ ] T076 [US7] Implementar a restauração em `services/tenancy/src/restore/restore.ts` (MySQL temporário, dump `includeSchemas`, `mysqlbinlog --database --stop-datetime`, cópia para o schema de `data-model.md` `tenant_restore.temp_schema` no formato `r_<hex32>_<ts>`), executada no `workers` (research R10); lê, da tag do snapshot, as versões por domínio do tenant no instante da cópia (T088) e aplica as migrações que faltam até a versão atual antes de liberar para revisão.
- [ ] T077 [US7] Implementar a aprovação e a troca em `services/tenancy/src/restore/swap.ts`: suspender o tenant, fazer `RENAME TABLE` atômico (`t_x.a → o_<hex32>_<ts>.a`, `r_….a → t_x.a`), reaplicar os grants, reativar e registrar em `ops_action_log` (`restore_approve`).
- [ ] T078 [US7] Implementar a limpeza das cópias em até 7 dias em `services/tenancy/src/restore/cleanup.ts` (`data-model.md` `tenant_restore.cleanup_due_at`).
- [ ] T079 [US7] Implementar `pnpm koovela tenant restore <id> --point` e `restore approve <restore_id> --justification` em `tools/koovela-cli/src/commands/tenant.ts`.
- [ ] T080 [US7] Escrever o runbook `docs/ops/runbooks/restaurar-tenant.md` e registrar o ensaio em staging, com tempo total ≤ 4 h (SC-006).

**Checkpoint**: restauração de um tenant ensaiada em staging.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T081 Implementar a verificação diária em `services/tenancy/src/verify/verify.ts` (job no `workers`): estrutura de cada `t_x` contra a versão registrada, `t_x._migrations` contra `tenant_domain_version` e `information_schema.TABLE_PRIVILEGES` contra os grants esperados, com registro e correção dos desvios (REQ-TEN-054). Comando `pnpm koovela tenant verify`.
- [ ] T082 [P] Teste de integração da verificação em `services/tenancy/src/verify/verify.int.test.ts`: grant revogado à mão → desvio registrado e corrigido.
- [ ] T083 [P] Adicionar o alerta de quantidade de schemas acima de 80% de `TENANT_SCHEMA_LIMIT` e a regra de teste `pnpm ops:alert-test --rule tenancy.*` em `infra/observability/alerts/tenancy.yml` (REQ-TEN-053).
- [ ] T084 [P] Painel Grafana "Tenancy" em `infra/observability/dashboards/tenancy.json`: estados, p95 de provisionamento, execuções, pendentes e desvios.
- [ ] T085 [P] Escrever os runbooks `docs/ops/runbooks/{provisionamento-falhou,migracao-pendente,canario-falhou}.md`.
- [ ] T086 Teste de carga dos schemas em staging com 1.000 tenants sintéticos, confirmando o limite operacional, registrado em `docs/ops/decisions/limite-schemas-002.md` (research R11).
- [ ] T087 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-002.md`, incluindo o tempo para o SRE responder "em que versão está cada tenant e quais falharam?" pela G03 (meta < 1 min, SC-005).
- [ ] T088 [P] Gravar a versão de cada tenant no backup: o `infra/host/backup/backup-daily.sh` da 001 exporta `koovela_platform.tenant_domain_version` no mesmo instante do dump e anexa como tag/arquivo do snapshot restic; teste em `infra/host/backup/__tests__/tenant-versions.test.sh` (bats) confere que o snapshot traz as versões e que um backup durante uma migração não a interrompe (edge case "backup durante migração").
- [ ] T089 [P] Guardar os motivos de suspensão como conjunto (`data-model.md` `tenant_suspension.reason`, `tenant_suspension.source`, `tenant_suspension.started_at`, `tenant_suspension.ended_at`) em `services/tenancy/src/lifecycle/suspension.ts`: `suspend(reason, source)` abre um motivo; `reactivate(reason, source)` fecha só o próprio; o tenant só volta a `active` sem nenhum motivo aberto; `tenant.state_reason` mostra o principal. Consumir `backoffice.fraud_action.changed` (021) para `suspend_tenant` com o motivo `fraud`. Teste em `services/tenancy/src/lifecycle/suspension.int.test.ts`: suspenso por `billing_overdue` e `fraud`, o pagamento (019) não reativa até a 021 reverter.
- [ ] T090 [P] Implementar o comando `purge` em `services/tenancy/src/lifecycle/purge.ts`, só para tenant `archived`, pedido pela 022 (`privacy.holder.command.v1` com `op = tenant_purge`) depois de `reactivable_until` da 019 e com o `dual_control` aprovado (021): exporta para o cofre fiscal os dados sob guarda de 5 anos (pagamentos e notas, bloqueados), apaga o schema `t_<hex32>` e as cópias `o_`/`r_` do tenant, grava o resultado em `ops_action_log` e no livro de eliminações da 022 e publica `tenancy.tenant.purged.v1`. Teste em `services/tenancy/src/lifecycle/purge.int.test.ts`: tenant não arquivado, antes da data ou sem aprovação é recusado (REQ-TEN-013).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** (provisionamento) depende só da fase 2.
- **US2** (migração) depende da fase 2 e de US1 (baseline e grants no provisionamento) para os testes com tenants provisionados.
- **US3** (isolamento) depende da fase 2 e do gerador (T022); pode correr em paralelo com US1 e US2.
- **US5** (ciclo de vida) depende da fase 2 (T021); usa o gating de US3 para invalidar o cache.
- **US6** (globais) depende da fase 2 (T017, T019); T066 depende de T042 (US2).
- **US4** (back-office) depende de US1, US2 e US5, que geram as ações e os dados da tela.
- **US7** (restauração) depende de US5 (suspender e reativar) e do backup da 001.
- **Polish** depois das histórias. T081 depende de T020 e T042.

### Within Each User Story

- Testes primeiro (falhando) → executor e domínio → HTTP e CLI → pipeline e alertas → runbook.

### Parallel Opportunities

- Fase 1: T002–T005.
- Fase 2: testes T006–T011; implementação T015, T016 e T022 junto com T017–T021.
- Depois da fase 2: US1 e US3 em paralelo; depois de US1, US2 e US5 em paralelo.
- Testes de cada história marcados com [P] em paralelo.

---

## Parallel Example: User Story 2

```bash
# Testes primeiro, juntos:
Task: "T036 canário em infra/migrations/src/__tests__/canary.int.test.ts"
Task: "T037 falha isolada em infra/migrations/src/__tests__/isolated-failure.int.test.ts"
Task: "T038 trava por ambiente em infra/migrations/src/__tests__/single-run.int.test.ts"
Task: "T039 rollback em infra/migrations/src/__tests__/rollback.int.test.ts"
Task: "T040 sem indisponibilidade em infra/migrations/src/__tests__/zero-downtime.int.test.ts"
Task: "T041 compatibilidade N/N-1 em infra/migrations/src/__tests__/version-compat.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: provisionamento idempotente em < 2 min.
3. **Parar e validar** com o quickstart §2.

### Incremental Delivery

1. US1 → US3 (isolamento vira portão de merge cedo) → US2 (migração multi-schema; a partir daqui toda spec usa o executor).
2. US5 e US6 → US4 (tela G03) → US7 (restauração).
3. Polish: verificação diária, alertas, carga e validação.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US3 → US2 → US5 → US6 → US4 → US7 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-TEN que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhum comando apaga um schema de tenant em uso (T029). Só as cópias `r_*` e `o_*` são removidas.
- T088 foi acrescentada pelo `/speckit-analyze` de 2026-11-26 (Polish); a numeração não foi refeita.
- T089 acrescentada na análise da 021 (2026-11-27): motivos de suspensão como conjunto.
- Commit por tarefa ou grupo lógico, em branch `002-tenancy-provisionamento`, por PR.
- T090 acrescentada na análise da 022 (2026-11-27): comando `purge` do tenant, só pela 022.
