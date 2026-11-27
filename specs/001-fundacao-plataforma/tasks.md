---
description: "Lista de tarefas da spec 001 — Fundação da plataforma Koovela"
---

# Tasks: Fundação da plataforma Koovela

**Input**: documentos de `specs/001-fundacao-plataforma/` (local, fora do repositório público)

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: incluídos. O Princípio VIII da constituição (portão G-VIII) exige testes escritos antes da implementação; em cada história, as tarefas de teste vêm primeiro e DEVEM falhar antes do código.

**Organization**: por história de usuário (US1–US10), na ordem de prioridade da spec (P1 → P2 → P3) ajustada pelas dependências técnicas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história de usuário (US1…US10)
- Caminhos relativos à raiz do repositório de código `koovela/` (estrutura do plan.md)

---

## Phase 1: Setup (infraestrutura compartilhada)

**Purpose**: inicializar o monorepo e o toolchain.

- [X] T001 Criar o esqueleto de diretórios da estrutura do plan.md (`apps/`, `services/`, `runtimes/`, `packages/`, `tools/`, `infra/`, `docs/ops/`, `bi/`) com um `README.md` curto em cada um
- [X] T002 Criar `package.json` raiz com `packageManager: pnpm@10.x` fixado, `engines.node` 24, scripts `koovela`, `build`, `lint`, `typecheck`, `test`, `spec:lint`, `env:check`, `secrets:scan`, `contracts:generate`, `contracts:breaking`, e o `.nvmrc` com a versão exata do Node 24 LTS
- [X] T003 Criar `pnpm-workspace.yaml` (apps/*, services/*, runtimes/*, packages/*, tools/*) e `turbo.json` com as tarefas `build`, `lint`, `typecheck`, `test`, `test:integration` e cache por entrada
- [X] T004 [P] Criar `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e referências de projeto
- [X] T005 [P] Criar `packages/eslint-config/` (ESLint 9 flat config + typescript-eslint + Prettier) e `.prettierrc`
- [X] T006 [P] Criar `.gitignore` com `specs/`, `.specify/`, `.claude/`, `bkp/`, `.env`, `.env.*` (exceto `.env.example`), `node_modules/`, `.turbo/`, `dist/`, `coverage/`
- [X] T007 [P] Configurar `lefthook.yml` (pre-commit: gitleaks, lint dos arquivos alterados, `spec:lint`; commit-msg: commitlint) e `commitlint.config.ts` (Conventional Commits)
- [X] T008 [P] Criar `.github/CODEOWNERS` e `.github/dependabot.yml` (npm, docker, github-actions; agrupado semanalmente) — REQ-FND-014
- [X] T009 [P] Criar `.editorconfig` e `.gitattributes` (LF, UTF-8)

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: pacotes de plataforma, contratos e o gateway mínimo usados por todas as histórias.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro, devem falhar)

- [X] T010 [P] Teste de unidade do esquema de configuração (chave ausente falha, `secret: true` nunca serializada) em `packages/platform/config/src/config.test.ts`
- [X] T011 [P] Teste de PII do logger (CPF, telefone, e-mail, cartão, JWT, senha por nome de campo e por padrão de conteúdo; IP truncado) em `packages/platform/logger/src/redaction.test.ts` — REQ-FND-041
- [X] T012 [P] Teste do formato Problem Details contra `packages/contracts/schemas/problem-details.schema.json` em `packages/platform/errors/src/problem.test.ts` — REQ-FND-073
- [X] T013 [P] Teste de propriedade do tipo `Money` (centavos `bigint` + `BRL`, soma e comparação sem perda; `number` rejeitado no tipo) com fast-check em `packages/platform/money/src/money.test.ts`
- [X] T014 [P] Teste da regra de lint "sem `number` em Money" e da regra `no-raw-design-values` em `packages/eslint-config/rules/__tests__/rules.test.ts` — REQ-FND-061
- [X] T015 [P] Teste do dependency-cruiser (import entre `services/*` falha) com dois domínios fictícios em `tools/arch-check/__tests__/boundaries.test.ts` — REQ-FND-005

### Implementação da fundação

- [X] T016 Copiar os contratos do plano para `packages/contracts/openapi/gateway.openapi.yaml`, `packages/contracts/asyncapi/platform-events.asyncapi.yaml`, `packages/contracts/schemas/problem-details.schema.json` e `packages/contracts/ui/shell-navigation.json` (fonte: `specs/001-fundacao-plataforma/contracts/`)
- [X] T017 [P] Implementar `packages/platform/config/` (esquema Zod único com grupos Processo, Banco, Fila e cache, Observabilidade, Borda; marca `secret`; leitura de Docker secrets em `/run/secrets`) conforme `data-model.md` §2
- [X] T018 [P] Implementar `packages/platform/logger/` (pino com `service`, `request_id`, `correlation_id`, `tenant_id` opcional; *redact* por campo + serializador por padrão; nunca imprime env nem chaves `secret`) — REQ-FND-040/041/081
- [X] T019 [P] Implementar `packages/platform/errors/` (Problem Details RFC 9457, `code` estável, `detail` pt-BR via `packages/i18n`)
- [X] T020 [P] Implementar `packages/platform/money/` (tipo `Money`, operações, formatação pt-BR)
- [X] T021 [P] Implementar `packages/platform/health/` (liveness e readiness com verificação de dependências por componente)
- [X] T022 [P] Implementar `packages/platform/otel/` (SDK OpenTelemetry: traces, métricas, propagação W3C + `correlation_id` em HTTP e AMQP)
- [X] T023 [P] Implementar `packages/platform/tenant-context/` (AsyncLocalStorage com `tenant_id` reservado; resolução fica para 002/003) — REQ-FND-006
- [X] T024 [P] Implementar as regras `no-raw-design-values` e `no-number-money` em `packages/eslint-config/rules/` e ligá-las na config base; ligar também `i18next/no-literal-string` nas apps (texto de interface só por i18n) — REQ-FND-061/064
- [X] T025 [P] Configurar `.dependency-cruiser.cjs` (proíbe `services/* → services/*`; permite `packages/*`) e o script `pnpm arch:check` em `tools/arch-check/`
- [X] T026 [P] Criar `packages/i18n/` (i18next, `pt-BR` com chaves de navegação de `shell-navigation.json` e mensagens de erro)
- [X] T027 Criar o executor único de migrações em `infra/migrations/` (Kysely migrator, um schema por domínio nesta spec; ponto de extensão para multi-schema da 002) e a credencial por domínio — REQ-FND-028
- [X] T028 Criar `services/gateway/` (Fastify 5 + `fastify-type-provider-zod`): `GET /v1/health` conforme `gateway.openapi.yaml`, CORS só com `CORS_ALLOWED_ORIGINS`, `correlation_id`, rate limit fino em Redis, erros em Problem Details — REQ-FND-036/072/073
- [X] T029 Criar `services/platform/` (domínio de exemplo: outbox mínimo `platform_outbox`, evento `platform.example.pinged.v1` conforme `platform-events.asyncapi.yaml`, consumidor idempotente e DLQ `platform.example.dlq`)
- [X] T030 Criar `runtimes/core/` (carrega os plugins Fastify da lista `KOOVELA_DOMAINS`) e `runtimes/workers/` (relay de outbox + consumidores) — D44
- [X] T031 [P] Criar `packages/testing/` (Testcontainers para MySQL 8.4, Redis 7, RabbitMQ 4; semente sintética com `@faker-js/faker` pt_BR, semente fixa, todo registro `synthetic = true`) — REQ-FND-003

**Checkpoint**: pacotes de plataforma testados, gateway e domínio de exemplo compilando.

---

## Phase 3: User Story 1 - Ambiente local completo com um comando (Priority: P1) 🎯 MVP

**Goal**: `pnpm koovela up` sobe banco, fila, cache, gateway, `core`, `workers` e as webs em macOS Intel, com endereços `*.koovela.localhost` e dados sintéticos.

**Independent Test**: em macOS Intel recém-preparado, clonar, copiar `.env.example` e rodar `pnpm koovela up`; todos os componentes saudáveis (quickstart §1).

### Testes da US1

- [X] T032 [P] [US1] Teste de integração do `koovela up` (sobe, espera healthchecks, falha citando o componente quando `mysql` está parado) em `tools/koovela-cli/__tests__/up.integration.test.ts`
- [X] T033 [P] [US1] Teste de determinismo da semente (`reset` duas vezes → mesmos dados) em `packages/testing/__tests__/seed.determinism.test.ts`

### Implementação da US1

- [X] T034 [US1] Criar `infra/compose/dev.yml` (MySQL 8.4, Redis 7, RabbitMQ 4, Traefik, gateway, core, workers, consumer-web, tenant-web, admin-web; imagens base por digest, nunca `latest`) — REQ-FND-002/004
- [X] T035 [P] [US1] Configurar o Traefik local em `infra/compose/traefik/dev.yml` para `koovela.localhost`, `app.`, `painel.`, `admin.`, `api.koovela.localhost`
- [X] T036 [US1] Implementar `tools/koovela-cli/` com `up` (pré-requisitos, ≥ 8 GB de RAM livre, ≥ 20 GB de disco, migrações, semente, espera de saúde, erro nomeando o componente; imprime a duração total e grava em `~/.koovela/up-times.jsonl` para medir a SC-001: ≤ 15 min na primeira vez, ≤ 3 min nas seguintes), `reset`, `down` e `doctor`
- [X] T037 [P] [US1] Gerar `.env.example` a partir do esquema de `packages/platform/config` (script `pnpm env:generate`) — REQ-FND-080
- [X] T038 [US1] Escrever a seção "Ambiente local" do `README.md` raiz (pré-requisitos e comando único, sem conteúdo de negócio)

**Checkpoint**: US1 validada pelo quickstart §1.

---

## Phase 4: User Story 2 - Portões obrigatórios no PR (Priority: P1)

**Goal**: todo PR roda lint, tipos, unidade, integração com contêineres reais, contrato, segredos, dependências, a11y e mensagens; merge bloqueado sem exceção.

**Independent Test**: PRs que violam cada portão são bloqueados com a mensagem do portão; PR limpo passa em ≤ 15 min (quickstart §2).

### Testes da US2

- [X] T039 [P] [US2] Fixtures de PRs-violação (um por portão) descritas em `.github/test-fixtures/gates/README.md` e roteiro de verificação em `docs/ops/runbooks/validar-portoes.md`
- [X] T040 [P] [US2] Teste do validador de nome de branch `NNN-nome` em `tools/branch-check/__tests__/branch.test.ts` — REQ-FND-013
- [X] T041 [P] [US2] Teste do `spec-lint` (falha citando a linha para: spec sem fase, sem superfícies, sem alguma seção obrigatória da CONST 9.2, requisito sem origem, PEN marcada como bloqueante e sem decisão, ou com `NEEDS CLARIFICATION`; uma fixture por regra) em `tools/spec-lint/__tests__/lint.test.ts` — REQ-FND-012

### Implementação da US2

- [X] T042 [US2] Criar `.github/workflows/pr.yml` em `ubuntu-24.04-arm`: install com cache, `turbo run lint typecheck test --filter=...[origin/main]`, `test:integration` com Testcontainers, `arch:check`, `env:check`, gitleaks, Trivy (dependências), commitlint, branch-check, `contracts:breaking`, a11y, build `docker buildx build --platform linux/arm64` de cada imagem sem publicar (o erro de dependência nativa sem ARM64 aparece no PR) e Trivy nessas imagens; só eventos `pull_request` (nunca `pull_request_target`) — REQ-FND-010/015
- [X] T043 [P] [US2] Implementar `tools/branch-check/` (regex `^\d{3}-[a-z0-9-]+$`, exceções `dependabot/*`)
- [X] T044 [P] [US2] Implementar `tools/spec-lint/` (lê `specs/` local se existir; sai 0 quando não há pasta; regras de fase, superfícies, seções obrigatórias da CONST 9.2, origem por requisito, PEN bloqueante sem decisão e marcadores; aceita `--spec <dir>` para checar uma spec só) e ligá-lo no `lefthook.yml` — REQ-FND-012
- [X] T126 [US2] Ligar o `spec-lint` antes de cada `/speckit-plan` (CONST VI): criar a skill local `.claude/skills/speckit-spec-lint/SKILL.md` (roda `pnpm spec:lint --spec <feature_directory de .specify/feature.json>` e para em erro) e registrá-la em `.specify/extensions.yml` como `hooks.before_plan` com `optional: false`; ambos são locais (fora do repositório público) e o passo a passo fica em `docs/ops/runbooks/spec-lint-local.md` — REQ-FND-012
- [X] T045 [P] [US2] Implementar `tools/env-check/` (varre `getConfig('…')` e o esquema; falha se a chave não estiver em `.env.example`) — REQ-FND-080
- [X] T046 [US2] Descrever os *rulesets* da `main` em `infra/tofu/modules/github/` (PR obrigatório, checks obrigatórios de `pr.yml`, sem bypass para admin, histórico linear) ou, se o provider não cobrir, em `docs/ops/runbooks/github-rulesets.md` com o JSON exportado em `infra/github/rulesets/main.json` — REQ-FND-011
- [ ] T047 [US2] Medir o p90 do pipeline em 10 PRs de um domínio e registrar em `docs/ops/decisions/pipeline-p90.md` (meta ≤ 15 min); depois de US3, medir também o tempo do merge até staging saudável em 10 merges (meta ≤ 20 min, SC-005) no mesmo arquivo

**Checkpoint**: US2 validada pelo quickstart §2.

---

## Phase 5: User Story 3 - Build ARM64, deploy em staging, promoção e rollback (Priority: P1)

**Goal**: merge na `main` gera imagens `linux/arm64` assinadas no GHCR; staging recebe por pull; produção por promoção aprovada com os mesmos digests; rollback em um comando.

**Independent Test**: merge visível → staging; promover com aprovação; reverter com um comando; cada passo registrado (quickstart §3).

### Testes da US3

- [X] T048 [P] [US3] Teste do validador de `release.json` (formato de `data-model.md` §1.1 `release.json.version`, `release.json.images[].digest` obrigatório e plataforma `linux/arm64`, `release.json.sbom` obrigatório) em `infra/host/koovela-deploy/__tests__/manifest.test.ts`
- [X] T049 [P] [US3] Teste do `koovela-deploy` (recusa imagem sem assinatura do workflow da `main`; falha de readiness volta ao manifest anterior; segundo deploy concorrente é recusado pela invariante de `data-model.md` §1.2 `deploy.status`) em `infra/host/koovela-deploy/__tests__/deploy.test.sh` (bats)

### Implementação da US3

- [X] T050 [P] [US3] Criar `Dockerfile` multi-stage por processo (`services/gateway/Dockerfile`, `runtimes/core/Dockerfile`, `runtimes/workers/Dockerfile`, `apps/consumer-web/Dockerfile`, `apps/tenant-web/Dockerfile`, `apps/admin-web/Dockerfile`) com base por digest, usuário não root e `HEALTHCHECK`
- [X] T051 [US3] Criar `.github/workflows/deliver.yml` (push na `main`, `ubuntu-24.04-arm`): buildx nativo, push no GHCR com `sha-<commit>`, Syft (SBOM CycloneDX), Trivy de imagem, cosign keyless, gera e publica `release.json` no GitHub Release (campos de `data-model.md` §1.1: `release.json.version`, `release.json.commit`, `release.json.built_at`, `release.json.images[].digest`, `release.json.sbom`, `release.json.signature` = identidade do `deliver.yml` da `main`) — REQ-FND-014/020
- [X] T052 [US3] Implementar `infra/host/koovela-deploy/koovela-deploy` (shell POSIX): verifica assinatura cosign com identidade do `deliver.yml`, `docker compose pull` por digest, `up -d` por processo, espera readiness, rollback automático e alerta, trava em arquivo, grava `/var/lib/koovela/deploys.jsonl` com os campos de `data-model.md` §1.2 (`deploy.deploy_id`, `deploy.environment`, `deploy.version`, `deploy.previous_version`, `deploy.kind`, `deploy.approved_by`, `deploy.status`) — REQ-FND-021/022/026
- [X] T053 [US3] Adicionar `--rollback` ao `koovela-deploy` (volta ao `deploy.previous_version` guardado; meta ≤ 10 min) e `.github/workflows/rollback.yml` — REQ-FND-025
- [X] T054 [US3] Criar o job de deploy em staging em `deliver.yml` (environment `staging`, `cloudflared access ssh` com token de serviço, `concurrency` por ambiente)
- [X] T055 [US3] Criar `.github/workflows/promote.yml` (`workflow_dispatch` com a versão; environment `production` com *required reviewers*; reutiliza o mesmo `release.json`, sem build; grava `deploy.approved_by`) — REQ-FND-024
- [X] T056 [P] [US3] Criar `infra/compose/app-host.yml` (Traefik, gateway, core, workers, webs, `cloudflared`) e `infra/compose/db-host.yml` (MySQL, Redis, RabbitMQ, observabilidade, backup) com limites de memória por contêiner — REQ-FND-029
- [X] T057 [P] [US3] Criar módulos OpenTofu em `infra/tofu/modules/{network,compute,vault,object-storage}/` (VCN, sub-rede privada do banco sem rota pública, security lists só intra-VCN, instâncias ARM Always Free) — REQ-FND-027
- [X] T058 [US3] Criar `infra/tofu/envs/staging/` e `infra/tofu/envs/production/` (contas OCI separadas, estado no Object Storage de cada conta; `app-stg-01`/`db-stg-01` e `app-prod-01`/`db-worker-01`) — REQ-FND-023/029
- [X] T059 [P] [US3] Criar `infra/host/cloud-init/{app,db}.yaml` (Docker Engine, Compose v2, `cloudflared`, cosign, usuário `koovela`, unidades systemd em `infra/host/systemd/`)
- [X] T060 [US3] Escrever `docs/ops/runbooks/deploy-promocao-rollback.md`

**Checkpoint**: US3 validada pelo quickstart §3.

---

## Phase 6: User Story 4 - Endereços koovela.com protegidos na borda (Priority: P2)

**Goal**: os 14 endereços canônicos (e `*.staging`) com TLS, HSTS preload, cabeçalhos, `www` → apex, Tunnel como única entrada, Access + MFA em `admin` e `bi`, `noindex` em staging.

**Independent Test**: `pnpm ops:edge-scan --env staging` e `--env production` verdes (quickstart §4).

### Testes da US4

- [X] T061 [P] [US4] Implementar as verificações do `tools/edge-scan/` como testes (resolução, TLS, HSTS, CSP por superfície, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, 301 de `www`, `noindex` em staging, `admin`/`bi` exigindo Access, origem recusando acesso direto) em `tools/edge-scan/src/checks/*.ts` — REQ-FND-030 a 036; inclui a validade do certificado de origem e o `Expires` do `security.txt`, publicados como métrica (`koovela_edge_cert_expiry_days`, `koovela_security_txt_expiry_days`) pelo job noturno

### Implementação da US4

- [X] T062 [US4] Criar `infra/tofu/modules/cloudflare-edge/` (zona, registros DNS, proxy, HSTS preload, WAF gerenciado, a regra única de rate limit em `api.koovela.com`, *Transform Rules* de cabeçalhos por superfície, *Redirect Rule* `www` → apex, `X-Robots-Tag: noindex` e `robots.txt` de bloqueio total em `admin.koovela.com` em todos os ambientes) — REQ-FND-031/032/034
- [X] T063 [US4] Criar `infra/tofu/modules/cloudflare-tunnel/` (túnel por host de aplicação e rotas por endereço; nenhuma porta de entrada aberta na OCI) — REQ-FND-033
- [X] T064 [US4] Criar `infra/tofu/modules/cloudflare-access/` (aplicações `admin`, `bi`, `grafana`; IdP GitHub com MFA; regra de IP no `admin`; token de serviço para deploy) — REQ-FND-034
- [X] T127 [US4] Servir `bi.koovela.com` (e `bi.staging`) com página esqueleto com a identidade visual em `apps/bi-placeholder/` (estático no Traefik do host de aplicação), atrás do Access com MFA (T064) e com rota no túnel (T063) e serviço em `infra/compose/app-host.yml`; a spec 023 substitui pelo BI — REQ-FND-030/034
- [X] T065 [P] [US4] Configurar cookies escopados ao subdomínio (`Secure`, `HttpOnly`, `SameSite=Lax`) e CORS por ambiente em `services/gateway/src/plugins/security.ts` — REQ-FND-036
- [X] T066 [P] [US4] Adicionar cabeçalho `X-Robots-Tag: noindex` em staging nas *Transform Rules* do ambiente em `infra/tofu/envs/staging/edge.tf` — REQ-FND-035
- [X] T067 [P] [US4] Criar o comando `pnpm ops:edge-scan` em `tools/edge-scan/src/cli.ts` e o job noturno em `.github/workflows/nightly.yml`

**Checkpoint**: US4 validada pelo quickstart §4.

---

## Phase 7: User Story 5 - Observabilidade, alertas e página de status (Priority: P2)

**Goal**: logs, métricas, traces e erros com `correlation_id` de ponta a ponta, alertas com runbook, push crítico 24x7 e página de status fora da OCI.

**Independent Test**: requisição de teste atravessa gateway, serviço e fila e é encontrada pelo `correlation_id`; falha provocada gera alerta e aparece no status (quickstart §5).

### Testes da US5

- [X] T068 [P] [US5] Teste de ponta a ponta de propagação (`correlation_id` do gateway ao consumidor de `platform.example.pinged.v1`, incluindo DLQ) em `services/platform/__tests__/tracing.integration.test.ts` — REQ-FND-042
- [X] T069 [P] [US5] Teste `pnpm test:pii` cobrindo logs, traces (atributos) e Sentry `beforeSend` em `packages/platform/logger/__tests__/pii.e2e.test.ts` — REQ-FND-041/044
- [X] T070 [P] [US5] Teste das regras de alerta com `promtool test rules` em `infra/observability/alerts/__tests__/alerts.test.yml` (campos de `data-model.md` §1.6 `alert.severity` ∈ `critical`/`warning`, `alert.environment`, `alert.runbook` obrigatórios)

### Implementação da US5

- [X] T071 [P] [US5] Configurar `infra/observability/otel-collector.yaml` (receivers OTLP; processador de mascaramento de segunda linha; exporters Prometheus, Loki, Tempo)
- [X] T072 [P] [US5] Configurar `infra/observability/prometheus.yml` (retenção 30 dias; scrape de gateway, core, workers, RabbitMQ, MySQL, Redis, node-exporter) e métricas RED + filas em `packages/platform/otel/src/metrics.ts` — REQ-FND-043
- [X] T073 [P] [US5] Configurar `infra/observability/loki.yaml` (30 dias aplicação; 90 dias trilha de borda) e `infra/observability/tempo.yaml` (7 dias)
- [X] T074 [US5] Escrever as regras em `infra/observability/alerts/*.yml` (serviço sem saúde, taxa de erro, latência acima da CONST 6, DLQ crescendo, disco > 80%, falha de backup, falha de deploy, uso de plano gratuito ≥ 80%, certificado de origem ou `security.txt` a 30 dias de expirar) com os campos de `data-model.md` §1.6 — REQ-FND-045/048
- [X] T075 [US5] Configurar `infra/observability/alertmanager.yml` com o roteamento da tabela de `data-model.md` §1.6 (crítico em produção → ntfy + e-mail 24x7, reenvio 15 min; warning → e-mail seg–sex 9h–18h `America/Sao_Paulo`)
- [X] T076 [P] [US5] Criar os painéis Grafana em `infra/observability/grafana/dashboards/{services,queues,hosts,free-tier-usage}.json`
- [X] T077 [P] [US5] Integrar o Sentry com `beforeSend` usando o mascaramento do logger em `packages/platform/errors/src/sentry.ts` — REQ-FND-044
- [X] T078 [P] [US5] Escrever um runbook por alerta em `docs/ops/runbooks/alertas/<nome>.md` — REQ-FND-047
- [ ] T079 [US5] Criar o repositório separado `koovela-status` (Upptime: superfícies públicas a cada 5 min, push via ntfy, GitHub Pages em `status.koovela.com`; janelas de manutenção declaradas por issue com o label `maintenance` e passo a passo no runbook) e registrar a configuração em `docs/ops/runbooks/status-page.md` — REQ-FND-046
- [X] T128 [US5] Criar a varredura mensal de PII nos logs (`pnpm ops:pii-sweep` em `tools/ops/pii-sweep.ts`: consulta o Loki dos últimos 30 dias com os padrões do logger — CPF, telefone, e-mail, cartão, JWT — e falha com o total por serviço, sem imprimir os valores) e o job mensal em `.github/workflows/nightly.yml`; resultado em `docs/ops/decisions/pii-sweep-AAAA-MM.md` — SC-008

**Checkpoint**: US5 validada pelo quickstart §5.

---

## Phase 8: User Story 6 - Backup com restauração testada (Priority: P2)

**Goal**: dump diário + binlogs a cada 15 min, cifrados com restic na OCI e no R2, retenção 35 + 12, restauração mensal automatizada registrada.

**Independent Test**: `pnpm ops:restore-test --env staging --point <instante>` restaura a partir do R2 dentro do RTO e registra o resultado (quickstart §6).

### Testes da US6

- [X] T080 [P] [US6] Teste do validador do cabeçalho de teste de restauração (campos de `data-model.md` §1.4 `restore_test.date`, `restore_test.environment` = `staging`, `restore_test.restored_point`, `restore_test.source`, `restore_test.duration_minutes`, `restore_test.executor`, `restore_test.checks`, `restore_test.result`) em `tools/ops/__tests__/restore-record.test.ts`
- [X] T081 [P] [US6] Teste do alerta "último teste de restauração com mais de 35 dias" em `infra/observability/alerts/__tests__/backup.test.yml`

### Implementação da US6

- [X] T082 [US6] Criar `infra/host/backup/backup-daily.sh` (MySQL Shell `util.dumpInstance` + restic para OCI Object Storage e R2; tags com `backup.kind`; status `completed` só com a cópia externa concluída, conforme `data-model.md` §1.3 `backup.destinations` e `backup.status`) e o timer systemd — REQ-FND-050/051
- [X] T083 [US6] Criar `infra/host/backup/binlog-ship.sh` (envio a cada 15 min) e o timer — RPO 1 h
- [X] T084 [US6] Configurar a retenção restic 35 diários + 12 mensais (`forget --prune`) conforme `data-model.md` §1.3 em `infra/host/backup/retention.sh` — REQ-FND-053
- [X] T085 [US6] Implementar `tools/ops/restore-test.ts` (`pnpm ops:restore-test`: restaura dump + binlogs até o instante, confere contagens e somas, mede a duração, escreve `docs/ops/restore-tests/AAAA-MM.md` com o cabeçalho de §1.4) e o job mensal em `.github/workflows/nightly.yml` — REQ-FND-052
- [X] T086 [P] [US6] Exportar métricas de backup (último sucesso, tamanho, uso do R2 com aviso em 80%) em `infra/host/backup/metrics.sh` para o node-exporter textfile
- [X] T087 [P] [US6] Escrever `docs/ops/runbooks/restauracao.md` (inclui o passo de replay de eliminações da spec 022 como placeholder)

**Checkpoint**: US6 validada pelo quickstart §6.

---

## Phase 9: User Story 7 - Design tokens únicos e shells navegáveis (Priority: P2)

**Goal**: tokens do Figma num pacote único; cinco shells (consumidor app, colaborador app, web do consumidor, painel com `/pro`, back-office) com a navegação do protótipo, i18n pt-BR e a11y AA.

**Independent Test**: trocar `color.brand.terracota` e ver a mudança em todos os shells, web e nativos, sem outro arquivo alterado (quickstart §7).

### Testes da US7

- [X] T088 [P] [US7] Teste de contraste AA de todos os pares texto/fundo dos tokens em `packages/design-tokens/__tests__/contrast.test.ts`
- [X] T089 [P] [US7] Testes Playwright + axe dos shells web (cada destino de `shell-navigation.json` renderiza o código da tela; zero violações AA) em `apps/{consumer-web,tenant-web,admin-web}/e2e/shell.spec.ts` — REQ-FND-063/065
- [X] T090 [P] [US7] Testes Jest + RNTL dos shells nativos (abas e códigos de tela; cada aba e destino com `accessibilityRole` e `accessibilityLabel` e alvo de toque ≥ 44 pt) em `apps/{consumer-mobile,pro-mobile}/__tests__/navigation.test.tsx`

### Implementação da US7

- [ ] T091 [US7] Criar `packages/design-tokens/src/{color,typography,state}.json` (DTCG) com os valores de `data-model.md` §3.1 e §3.2; conferir pesos, alturas de linha e estados com `get_design_context` no Figma — REQ-FND-060
- [X] T092 [US7] Configurar Style Dictionary 4 em `packages/design-tokens/style-dictionary.config.ts` (saídas `dist/tokens.css` e `dist/tokens.ts`)
- [X] T129 [US7] Teste de propagação de token em `packages/design-tokens/__tests__/propagation.test.ts`: troca `color.brand.terracota` numa cópia temporária, gera os tokens e confere que os snapshots dos cinco shells mudam sem nenhum arquivo alterado fora de `packages/design-tokens/` — SC-010
- [X] T130 [P] Registrar incidentes para o MTTR em `services/platform/src/incidents/incidents.ts`: webhook do Alertmanager (alertas críticos) abre `platform_incident` (`started_at`, `severity`, `service`) e fecha na resolução (`resolved_at`), publicando `platform.incident.resolved.v1` só com ids e tempos, para o BI (023). Teste em `services/platform/src/incidents/incidents.int.test.ts`.
- [X] T093 [P] [US7] Criar `packages/ui-web/` (Radix Primitives + tokens: Botão, Campo, Chip, layout de menu lateral e barra superior)
- [X] T094 [P] [US7] Criar `packages/ui-native/` (componentes equivalentes para React Native + abas)
- [X] T095 [P] [US7] Criar `apps/consumer-web/` (React Router 7 com SSR: `app.koovela.com` com barra superior W06/W16/W17/W20 e `koovela.com/{slug}` esqueleto W07, normalização do slug — minúsculas, sem acento — com 301 para a forma canônica, 404 para slug inexistente) — REQ-FND-092
- [X] T096 [P] [US7] Criar `apps/tenant-web/` (SPA: menu lateral P01…P26 com seletor de filial; `/pro` com KD1/KD3/KD4/KD5; onboarding O01–O05 fora do menu)
- [X] T097 [P] [US7] Criar `apps/admin-web/` (SPA: menu G01…G10 + B01 abrindo `bi.koovela.com`)
- [X] T098 [P] [US7] Criar `apps/consumer-mobile/` (Expo CNG, `com.koovela.app`, Expo Router com abas C03/C14/C15/C18; C00 atrás de flag)
- [X] T099 [P] [US7] Criar `apps/pro-mobile/` (Expo CNG, `com.koovela.pro`, abas K01/K03/K04/K05)
- [X] T100 [US7] Medir LCP < 2,5 s em 4G das páginas públicas esqueleto com Lighthouse CI em `.github/workflows/pr.yml` (job `lighthouse`) — REQ-FND-093
- [X] T101 [US7] Adicionar o job `test:a11y` e os testes de shell ao `pr.yml` — REQ-FND-065

**Checkpoint**: US7 validada pelo quickstart §7.

---

## Phase 10: User Story 9 - Segredos, e-mail autenticado e security.txt (Priority: P2)

**Goal**: nenhum segredo no repositório (histórico inteiro), segredos do OCI Vault como Docker secrets, rotação documentada, SPF/DKIM/DMARC, caixas de suporte, privacidade e segurança, `security.txt`.

**Independent Test**: `pnpm secrets:scan --history` zero achados; `env:check` falha com chave nova não documentada; DNS de e-mail e `security.txt` publicados (quickstart §9).

### Testes da US9

- [X] T102 [P] [US9] Teste de que nenhuma variável de ambiente nem chave `secret` aparece nos logs de inicialização em `packages/platform/config/__tests__/no-env-logging.test.ts` — REQ-FND-081
- [X] T103 [P] [US9] Verificações de SPF, DKIM, DMARC `p=quarantine` e `security.txt` (contato e expiração) em `tools/edge-scan/src/checks/email-security.ts` — REQ-FND-084/085

### Implementação da US9

- [X] T104 [US9] Criar `pnpm secrets:scan` (gitleaks com `.gitleaks.toml`; `--history` varre todos os commits) — REQ-FND-082
- [X] T105 [US9] Implementar a leitura de segredos do OCI Vault por *instance principal* no `koovela-deploy` e a entrega como Docker secrets em `tmpfs` em `infra/host/koovela-deploy/secrets.sh` — REQ-FND-081
- [X] T106 [P] [US9] Criar o módulo OpenTofu `infra/tofu/modules/email-dns/` (SPF, DKIM, DMARC de `mail.` e `news.koovela.com`; Cloudflare Email Routing para `suporte@`, `privacidade@`, `seguranca@`) — REQ-FND-084
- [X] T107 [P] [US9] Publicar `apps/consumer-web/public/.well-known/security.txt` (contato `seguranca@koovela.com`, `Expires` gerado no build) — REQ-FND-085
- [X] T108 [P] [US9] Escrever `docs/ops/runbooks/rotacao-de-segredos.md` e o modelo `docs/ops/secret-rotations/_modelo.md` com o cabeçalho de `data-model.md` §1.5 (`secret_rotation.date`, `secret_rotation.reason`, `secret_rotation.secrets` só nomes, `secret_rotation.environments`, `secret_rotation.executor`) — REQ-FND-083

**Checkpoint**: US9 validada pelo quickstart §9.

---

## Phase 11: User Story 8 - Contratos como fonte dos clientes (Priority: P3)

**Goal**: OpenAPI e AsyncAPI em `packages/contracts` geram o SDK (orval); mudança incompatível sem nova versão falha no PR; teste de provedor contra o gateway.

**Independent Test**: remover campo obrigatório de `Health` sem nova versão → `contracts:breaking` falha; mudança compatível regenera o SDK (quickstart §8).

### Testes da US8

- [X] T109 [P] [US8] Teste de provedor com Schemathesis contra o gateway em contêiner em `.github/workflows/pr.yml` (job `contract-provider`) usando `packages/contracts/openapi/gateway.openapi.yaml`
- [X] T110 [P] [US8] Teste de lint que proíbe `fetch`/URL montada à mão nas apps em `packages/eslint-config/rules/__tests__/no-raw-fetch.test.ts` — REQ-FND-070

### Implementação da US8

- [X] T111 [US8] Configurar orval em `packages/sdk/orval.config.ts` (Zod para serviços; cliente `fetch` + hooks TanStack Query para web e React Native) e `pnpm contracts:generate`
- [X] T112 [US8] Implementar `pnpm contracts:breaking` (oasdiff `breaking` e `asyncapi diff` contra `origin/main`) em `tools/contracts-check/` — REQ-FND-071
- [X] T113 [P] [US8] Implementar a regra `no-raw-fetch` em `packages/eslint-config/rules/no-raw-fetch.ts`
- [X] T114 [US8] Fazer as três webs e os dois apps consumirem `GET /v1/health` pelo SDK gerado (indicador de status no rodapé dos shells)

**Checkpoint**: US8 validada pelo quickstart §8.

---

## Phase 12: User Story 10 - Links universais de koovela.com (Priority: P3)

**Goal**: `koovela.com/{slug}` e `app.koovela.com/*` abrem o app `com.koovela.app` quando instalado e a web quando não; Android pelo teste interno do Google Play; iOS no simulador.

**Independent Test**: em Android com o app do teste interno, abrir link de slug de teste; repetir sem o app; validar o formato do AASA e o shell iOS em simulador (quickstart §10).

### Testes da US10

- [X] T115 [P] [US10] Teste do formato de `assetlinks.json` (fingerprint SHA-256 da chave do Play) e de `apple-app-site-association` (paths `/{slug}` e `/*` de `app.`) em `apps/consumer-web/__tests__/well-known.test.ts` — REQ-FND-090
- [X] T116 [P] [US10] Teste e2e de fallback web (link sem app → web do consumidor sem bloqueio de instalação; `/Salao-Ágata` → 301 para `/salao-agata`) em `apps/consumer-web/e2e/universal-links.spec.ts` — REQ-FND-091

### Implementação da US10

- [X] T117 [US10] Servir `apps/consumer-web/public/.well-known/assetlinks.json` e `apple-app-site-association` (sem extensão, `Content-Type: application/json`)
- [X] T118 [US10] Configurar intent filters e associated domains em `apps/consumer-mobile/app.config.ts`
- [X] T119 [US10] Criar `.github/workflows/mobile.yml`: Android (`expo prebuild`, Gradle release assinado com a chave de upload do environment, `fastlane supply` para o teste interno) para `com.koovela.app` e `com.koovela.pro`; iOS (`macos-latest`, build para simulador) — REQ-FND-094
- [X] T120 [US10] Registrar em `docs/ops/runbooks/apple-pendente.md` a pendência de assinatura iOS, TestFlight e iPhone real até existir a conta Apple Developer (REQ-FND-094)

**Checkpoint**: US10 validada pelo quickstart §10.

---

## Phase 13: Polish & Cross-Cutting Concerns

- [X] T121 [P] Verificar REQ-FND-048 (custo R$ 0): inventário de serviços de terceiros, plano gratuito de cada um e métrica de uso com aviso em 80% em `docs/ops/decisions/servicos-gratuitos.md`
- [X] T122 [P] Verificar REQ-FND-004: nenhuma imagem `latest`, nenhuma faixa de versão flutuante (script `tools/pin-check/` no `pr.yml`)
- [x] T123 Atualizar a linha G-VI do `specs/001-fundacao-plataforma/plan.md` (local): a exceção foi resolvida pela emenda 1.1.0 da constituição (lint de spec local) — remover do *Complexity Tracking* (feito em 2026-11-26)
- [ ] T124 Antes de tornar o repositório público: reescrever autor dos commits para o e-mail `noreply` do GitHub, rodar `pnpm secrets:scan --history` e confirmar `bkp/`, `specs/`, `.specify/`, `.claude/` fora do índice (`git ls-files`)
- [ ] T125 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-001.md`, incluindo os tempos de SC-001 (de `~/.koovela/up-times.jsonl`) e SC-005 (T047)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** (ambiente local) depende só da fase 2.
- **US2** (portões) depende da fase 2; usa o compose de US1 nos testes de integração (Testcontainers não depende dele, então pode correr em paralelo com US1).
- **US3** (entrega) depende de US2 (pipeline base) e cria os hosts usados por US4, US5 e US6.
- **US4** (borda), **US5** (observabilidade) e **US6** (backup) dependem de US3 (hosts e compose de host); entre si são independentes.
- **US7** (tokens e shells) depende só da fase 2; pode correr em paralelo com US2–US6.
- **US9** (segredos, e-mail) depende de US3 (Vault e deploy) e de US4 (zona Cloudflare) para o DNS de e-mail.
- **US8** (contratos) depende da fase 2 e de US7 (apps que consomem o SDK).
- **US10** (links universais) depende de US7 (`consumer-web`, `consumer-mobile`) e de US4 (borda de `koovela.com`).
- **Polish** depois de todas.

### Within Each User Story

- Testes primeiro (falhando) → configuração/infra → implementação → integração no pipeline → runbook.

### Parallel Opportunities

- Fase 1: T004–T009 em paralelo.
- Fase 2: testes T010–T015 em paralelo; pacotes T017–T026 em paralelo.
- Depois da fase 2: US1, US2 e US7 em paralelo; depois de US3: US4, US5 e US6 em paralelo.
- Dentro de US7: as cinco apps (T095–T099) em paralelo.

---

## Parallel Example: User Story 7

```bash
# Testes primeiro, juntos:
Task: "T088 contraste AA em packages/design-tokens/__tests__/contrast.test.ts"
Task: "T089 Playwright + axe em apps/*/e2e/shell.spec.ts"
Task: "T090 Jest + RNTL em apps/*-mobile/__tests__/navigation.test.tsx"

# Depois dos tokens (T091–T092), os shells juntos:
Task: "T095 apps/consumer-web"
Task: "T096 apps/tenant-web"
Task: "T097 apps/admin-web"
Task: "T098 apps/consumer-mobile"
Task: "T099 apps/pro-mobile"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1 → `pnpm koovela up` funcionando em macOS Intel.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US1 → US2 (portões; a partir daqui todo trabalho entra por PR) → US3 (staging e produção).
2. US4, US5, US6 em paralelo (borda, observabilidade, backup) → a plataforma fica operável.
3. US7 (pode começar junto com US2) → US9 → US8 → US10.
4. Polish e abertura do repositório público.

### Observação para um desenvolvedor

A ordem sugerida é: Fase 1 → Fase 2 → US1 → US2 → US7 → US3 → US4 → US5 → US6 → US9 → US8 → US10 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- T126–T129 foram acrescentadas pelo `/speckit-analyze` de 2026-11-26 e ficam na fase indicada (T126 em US2, T127 em US4, T128 em US5, T129 em US7); a numeração não foi refeita para não quebrar referências.
- Cada tarefa cita o REQ-FND que atende; campos com restrição citam `data-model.md` e o campo.
- Nenhuma tarefa coloca segredo, dado real ou texto de negócio no repositório público.
- Commit por tarefa ou grupo lógico, sempre em branch `NNN-nome` e por PR depois de US2.
- T130 acrescentada na análise da 023 (2026-11-27): incidentes para o MTTR do BI.
