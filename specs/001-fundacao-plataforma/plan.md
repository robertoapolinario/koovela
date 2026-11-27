# Implementation Plan: Fundação da plataforma Koovela

**Branch**: `001-fundacao-plataforma` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-fundacao-plataforma/spec.md`

## Summary

Entregar a base única sobre a qual as specs 002 a 038 são construídas, testadas, publicadas e operadas:

- monorepo `pnpm` + Turborepo com um comando de ambiente local em macOS Intel;
- portões obrigatórios de PR no GitHub (repositório público, decisão de 2026-11-25);
- build nativo `linux/arm64` com imagens assinadas no GHCR, deploy por pull em staging (OCI, conta separada) e promoção aprovada para produção, com rollback em um comando;
- borda Cloudflare para todos os endereços de koovela.com, com Tunnel, Access e cabeçalhos;
- observabilidade auto-hospedada (OpenTelemetry, Prometheus, Loki, Tempo, Grafana, Alertmanager + ntfy), status externo (Upptime) e backup cifrado com cópia no Cloudflare R2;
- design tokens únicos (Figma), cinco shells navegáveis, contratos OpenAPI/AsyncAPI gerando o SDK, segredos no OCI Vault e links universais.

Tudo com custo R$ 0 fora das VMs da OCI (REQ-FND-048). Decisões e alternativas em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS; Python 3.13 apenas no CI (Schemathesis); shell POSIX para scripts de host.

**Primary Dependencies**:
- Backend: Fastify 5, Zod, `fastify-type-provider-zod`, Kysely, `mysql2`, `ioredis`, `amqplib`, pino, OpenTelemetry SDK, Sentry SDK.
- Web: React 19, Vite 7, React Router 7, TanStack Query, i18next, Radix Primitives.
- Mobile: React Native via Expo SDK (CNG), Expo Router, i18next.
- Contratos: OpenAPI 3.1, AsyncAPI 3.0, orval, oasdiff, AsyncAPI CLI.
- Tokens: Style Dictionary 4 (DTCG).
- Monorepo e qualidade: pnpm 10, Turborepo 2, ESLint 9 + typescript-eslint, Prettier, dependency-cruiser, lefthook, commitlint, gitleaks, Trivy, Syft, cosign.

**Storage**: MySQL 8.4 LTS (InnoDB, `utf8mb4_0900_ai_ci`, UTC, binlog ROW + GTID); Redis 7; RabbitMQ 4; OCI Object Storage (estado do OpenTofu e cópia local de backup); Cloudflare R2 (cópia externa de backup).

**Testing**: Vitest (unidade), Vitest + Testcontainers com MySQL, Redis e RabbitMQ reais (integração), Schemathesis (contrato de provedor), oasdiff e `asyncapi diff` (quebra de contrato), Playwright + `@axe-core/playwright` (shells web e a11y), Jest + React Native Testing Library (shells nativos), testes de PII do logger, testes de propriedade com fast-check (envelope de evento).

**Target Platform**:
- Produção e staging: Ubuntu 24.04 ARM64 (Ampere, OCI), Docker Engine + Compose v2, dois hosts por ambiente.
- Desenvolvimento: macOS Intel (x86_64) com Colima.
- Clientes: navegadores modernos, Android (teste interno do Google Play), iOS em simulador.

**Project Type**: monorepo com serviços web, três webs, dois apps nativos, infraestrutura como código e BI (só o endereço nesta spec).

**Performance Goals**: pipeline de PR ≤ 15 min (p90); merge → staging ≤ 20 min; rollback ≤ 10 min; alerta crítico ≤ 5 min; LCP < 2,5 s em 4G nas páginas públicas esqueleto; ambiente local ≤ 15 min (primeira vez) e ≤ 3 min (seguintes).

**Constraints**: custo R$ 0 fora das VMs da OCI; imagens de produção só do pipeline e só ARM64; nenhuma porta de entrada aberta na OCI (só Cloudflare Tunnel); banco sem rota pública; nenhum segredo, dado real ou documento de negócio no repositório público; specs só locais; capacidade Always Free da OCI (por conta: 4 OCPU e 24 GB divididos entre os dois hosts).

**Scale/Scope**: 5 shells, 2 apps nativos, 3 processos implantáveis (`gateway`, `core`, `workers`), 4 hosts (2 produção + 2 staging), 14 endereços canônicos, 1 contrato HTTP e 1 conjunto de eventos de exemplo. Dimensionado para a escala inicial da CONST 6 (500 tenants) sem reescrita.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação nesta spec | Resultado |
|---|---|---|---|
| G-I | Lock e constraint na escrita de agenda | Não há escrita de agenda. A base entrega Redis e o pacote `packages/platform` preparado para o lock da spec 008 | ✅ N/A |
| G-II | Isolamento de tenant | Sem dados de tenant. O logger, os eventos e as chaves já reservam `tenant_id`; a resolução de tenant é da 002/003 | ✅ N/A (mecanismo preparado) |
| G-III | Dinheiro, ledger, idempotência | Sem dinheiro. O pacote `money` nasce com o tipo `Money` (centavos `bigint` + `BRL`) e a regra de lint que proíbe `number` em dinheiro | ✅ |
| G-IV | Dados pessoais, sem PII em log | Mascaramento automático por campo e por padrão no logger e no Sentry, teste de PII no CI, IP truncado nos logs de aplicação, retenção de 30/90 dias | ✅ |
| G-V | Permissões e auditoria | Sem RBAC de aplicação. Aprovação de produção registrada no *environment*; `admin` e `bi` atrás do Access com MFA | ✅ |
| G-VI | Rastreabilidade, sem pendência bloqueante | Todos os REQ-FND com origem; nenhuma pendência bloqueante. O lint de spec roda como hook local obrigatório (pre-commit e antes de cada `/speckit-plan`), conforme a emenda 1.1.0 da constituição | ✅ |
| G-VII | Contratos antes do código | [gateway.openapi.yaml](./contracts/gateway.openapi.yaml), [platform-events.asyncapi.yaml](./contracts/platform-events.asyncapi.yaml) e [problem-details.schema.json](./contracts/problem-details.schema.json) escritos neste plano; dependency-cruiser bloqueia import entre domínios | ✅ |
| G-VIII | Testes antes da implementação | Portões de PR definidos como critério; os testes de cada história entram antes do código em `tasks.md` | ✅ |
| G-IX | Outbox, idempotência, DLQ | O evento de exemplo usa outbox, consumidor idempotente e DLQ `platform.example.dlq` com alerta | ✅ |
| G-X | ARM64, migração reversível, observabilidade | Build nativo ARM64, imagens por digest e assinadas; executor de migração único (multi-schema na 002); logs, métricas, traces, erros e healthchecks | ✅ |
| G-XI | Figma, tokens, a11y, superfícies | Navegação extraída do Figma ([shell-navigation.json](./contracts/shell-navigation.json)); tokens do Figma; axe nos shells; todas as superfícies declaradas | ✅ |
| G-XII | Nenhuma complexidade sem justificativa | Pilha de observabilidade e Upptime justificados abaixo | ✅ com justificativa |

**Reavaliação pós-design (Phase 1)**: mantida. O design não acrescentou domínio, processo ou ferramenta além dos listados. As justificativas de G-XII são as únicas; a exceção de G-VI foi encerrada pela emenda 1.1.0 (2026-11-25).

## Project Structure

### Documentation (this feature, local only)

```text
specs/001-fundacao-plataforma/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1 (copiados para packages/contracts na implementação)
│   ├── gateway.openapi.yaml
│   ├── platform-events.asyncapi.yaml
│   ├── problem-details.schema.json
│   └── shell-navigation.json
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root, público)

```text
koovela/
├── .github/
│   ├── workflows/            # pr.yml, deliver.yml, promote.yml, rollback.yml, mobile.yml, nightly.yml
│   ├── dependabot.yml
│   └── CODEOWNERS
├── apps/
│   ├── consumer-mobile/      # Expo · com.koovela.app
│   ├── pro-mobile/           # Expo · com.koovela.pro
│   ├── consumer-web/         # React Router 7 (SSR): app.koovela.com + koovela.com/{slug} + /.well-known
│   ├── tenant-web/           # React Router 7 (SPA): painel.koovela.com (+ /pro)
│   ├── admin-web/            # React Router 7 (SPA): admin.koovela.com
│   └── partner-web/          # vazio, reservado (fase 3)
├── services/
│   ├── gateway/              # Fastify: /v1/health, CORS, rate limit fino, correlation_id
│   └── platform/             # domínio de exemplo: evento platform.example.pinged.v1 (outbox + consumidor)
├── runtimes/
│   ├── core/                 # processo que carrega os domínios listados em KOOVELA_DOMAINS
│   └── workers/              # processo de relay de outbox e consumidores
├── packages/
│   ├── contracts/            # openapi/, asyncapi/, schemas/
│   ├── sdk/                  # gerado pelo orval (web + native)
│   ├── design-tokens/        # Style Dictionary → CSS vars + TS
│   ├── i18n/                 # pt-BR
│   ├── ui-web/  ui-native/
│   ├── platform/             # config, logger (mascaramento), errors (RFC 9457), money, health, otel, outbox (mínimo)
│   ├── eslint-config/        # inclui no-raw-design-values e proibição de number em Money
│   └── testing/              # contêineres e semente sintética
├── tools/
│   ├── koovela-cli/          # pnpm koovela up|reset|down|doctor
│   ├── spec-lint/            # lint de spec (roda local, sobre specs/ não versionado)
│   ├── env-check/            # chaves usadas × .env.example
│   └── edge-scan/            # varredura de borda (História 4)
├── infra/
│   ├── compose/              # dev.yml, app-host.yml, db-host.yml
│   ├── tofu/                 # modules/, envs/staging, envs/production (OCI + Cloudflare)
│   ├── host/                 # koovela-deploy, cloud-init, systemd units, backup (restic)
│   ├── observability/        # otel-collector, prometheus, alerts/, loki, tempo, grafana dashboards, alertmanager
│   └── migrations/           # executor único (multi-schema na 002)
├── docs/
│   └── ops/                  # runbooks/, restore-tests/, secret-rotations/, decisions de operação
├── bi/                       # reservado (spec 023)
├── .env.example
├── .nvmrc  package.json  pnpm-workspace.yaml  turbo.json  lefthook.yml
└── .gitignore                # inclui specs/, .specify/, .claude/, bkp/
```

Fora do repositório de código: `koovela-status` (repositório público separado, Upptime → `status.koovela.com`).

**Structure Decision**: estrutura da CONST 4.2 com três ajustes: `runtimes/` para os processos implantáveis de D44 (os domínios continuam em `services/`), `tools/` para os utilitários de desenvolvimento, e `specs/` + `docs/fundamental/` fora do repositório (decisão de 2026-11-25).

## Complexity Tracking

| Violação ou complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Pilha de observabilidade auto-hospedada (Collector, Prometheus, Loki, Tempo, Grafana, Alertmanager) no host de dados | R$ 0 com logs de 30 dias (o plano gratuito do Grafana Cloud guarda 14) | Grafana Cloud Free (retenção insuficiente); só logs em arquivo (sem alerta nem busca) |
| Upptime em repositório separado | Status e alerta precisam funcionar com a OCI inteira fora do ar (REQ-FND-046) | Página de status na OCI (cai junto) |
| Assinatura cosign e verificação no host | Garantir que só imagem do pipeline vai para staging e produção, mesmo com GHCR público (REQ-FND-021) | Confiar só na tag (qualquer um com acesso de escrita publicaria) |
| Diretório `runtimes/` | Implementar D44 sem misturar processo e domínio | Um processo por domínio (19+ contêineres em 2 hosts) |

## Riscos e pendências do plano

- **Repositório público**: antes de abrir, rodar gitleaks no histórico inteiro, reescrever autor dos commits para o e-mail `noreply` do GitHub (`bkp/` já está no `.gitignore`).
- **Capacidade Always Free**: Prometheus + Loki + Tempo + Grafana + MySQL + Redis + RabbitMQ no mesmo host de 12 GB; limites de memória por contêiner e plano B com VictoriaMetrics/VictoriaLogs (research R11).
- **Planos gratuitos com limite** (REQ-FND-048): Cloudflare (1 regra de rate limit), Access (50 usuários), R2 (10 GB), Sentry (5 mil erros/mês), Resend (100 e-mails/dia), ntfy (limite por tópico). Cada um tem métrica de uso e aviso em 80%.
- **Registrar no Documento Fundamental**: D44 e a nova D45 (repositório público, specs locais).
