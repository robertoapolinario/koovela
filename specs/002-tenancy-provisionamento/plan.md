# Implementation Plan: Tenancy e provisionamento de schema

**Branch**: `002-tenancy-provisionamento` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-tenancy-provisionamento/spec.md`

## Summary

Criar o domínio `tenancy` e o executor único de migrações:

- schema `t_<uuidv7>` por tenant, compartilhado pelos domínios, com tabelas prefixadas pelo domínio dono e grants por tabela via roles (decisão do clarify);
- espaços globais `koovela_platform`, `koovela_identity` e `koovela_projections`;
- provisionamento idempotente em < 2 min com baselines por domínio;
- migração em todos os schemas com canário, falha isolada, reprocessamento, rollback e DDL online (expandir → migrar → contrair);
- resolvedor de schema em `packages/platform/tenancy`, sem tenant padrão, com gating por estado e prefixo de tenant automático em cache, lock, fila, storage e log;
- suíte de isolamento como portão de merge;
- tela **G03** no back-office e restauração de um único tenant.

Decisões e alternativas em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS (herdado da 001).

**Primary Dependencies**: Fastify 5, Zod, Kysely + `mysql2`, `ioredis`, `amqplib`, pino, OpenTelemetry; MySQL Shell e `mysqlbinlog` (restauração); fast-check (testes de propriedade).

**Storage**: MySQL 8.4 — schemas `t_<hex32>` por tenant, `koovela_platform`, `koovela_identity`, `koovela_projections`; Redis (cache de estado e travas); RabbitMQ (`tenancy.events`).

**Testing**: Vitest + Testcontainers (MySQL, Redis, RabbitMQ reais), suíte de isolamento (`packages/testing/isolation`), teste de equivalência baseline × migrações do zero, migração + rollback em 3 schemas no PR e 50 em staging, testes de propriedade da máquina de estados, Playwright + axe na tela G03.

**Target Platform**: processos `core` (domínio `tenancy`) e `workers` (relay de outbox e tarefas de migração e verificação) da 001; CLI `pnpm koovela` no host e localmente; `admin-web`.

**Project Type**: domínio de serviço + biblioteca de plataforma + CLI + tela de back-office.

**Performance Goals**: provisionamento p95 < 2 min; migração típica em 500 tenants ≤ 30 min (paralelo de 8, canário de 5%); zero erros de requisição durante migração; restauração de um tenant ≤ 4 h.

**Constraints**: um executor só; nenhum comando apaga o espaço em uso; DDL só com `ALGORITHM=INSTANT` ou `INPLACE, LOCK=NONE` fora da fase `migrate`; mensagens de erro sem valores de linha; limite operacional inicial de 1.000 tenants por instância (alerta em 80%).

**Scale/Scope**: 500 tenants iniciais; limite operacional de 1.000 schemas por instância (`TENANT_SCHEMA_LIMIT`, aviso em 80%; research R11, confirmado pelo teste de carga T086), ~150 tabelas por schema no fim da v1.0 (≈ 75 mil grants por tabela); 3 tenants locais, 3 no CI, 50 em staging.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock e constraint em escrita de agenda | Sem agenda. Travas de provisionamento e de execução usam `GET_LOCK` + índice único (mesmo padrão "trava + constraint") | ✅ N/A |
| G-II | Isolamento de tenant | Schema por tenant, resolvedor único, sem tenant padrão, grants por domínio, prefixos automáticos, suíte de isolamento com 404 | ✅ |
| G-III | Dinheiro, ledger, idempotência | Sem dinheiro. Provisionamento e ações aceitam `Idempotency-Key` | ✅ |
| G-IV | Dados pessoais, sem PII em log | Registro sem nome, documento ou contato; erros sem valores de linha; ator por id técnico; IP só no registro de ação | ✅ |
| G-V | Permissões e ações auditadas | Tela só para SRE (Access + MFA até a 003); toda ação com justificativa em `ops_action_log` append-only | ✅ |
| G-VI | Rastreabilidade, sem bloqueante | Todos os REQ-TEN com origem; bloqueante do REQ-TEN-001 resolvido no clarify; lint de spec local (CONST 1.1.0) | ✅ |
| G-VII | Contratos antes do código, sem tabela de outro domínio | [tenancy.openapi.yaml](./contracts/tenancy.openapi.yaml) e [tenancy-events.asyncapi.yaml](./contracts/tenancy-events.asyncapi.yaml); executor recusa migração que toque outro prefixo | ✅ |
| G-VIII | Testes antes, invariantes | Invariante 3 (isolamento) e máquina de estados com teste de propriedade; migração + rollback multi-schema como portão | ✅ |
| G-IX | Outbox, idempotência, DLQ | Eventos de estado gravados no outbox na mesma transação; consumidores com DLQ | ✅ |
| G-X | ARM64, migração multi-schema reversível, observabilidade | É o objeto desta spec; métricas e alertas de REQ-TEN-053 | ✅ |
| G-XI | Figma, tokens, a11y, superfícies | Tela **G03 · Provisionamento e migração de schema**, item "Schemas" do `admin-web`; axe | ✅ |
| G-XII | Complexidade justificada | Baselines e grants por tabela justificados abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida; o design não acrescentou processo, domínio ou ferramenta além do listado.

## Project Structure

### Documentation (this feature, local only)

```text
specs/002-tenancy-provisionamento/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/
│   ├── tenancy.openapi.yaml
│   └── tenancy-events.asyncapi.yaml
└── checklists/requirements.md
```

### Source Code (repository root)

```text
services/
└── tenancy/
    ├── src/
    │   ├── provisioning/        # pedido, passos idempotentes, retentativa, baseline
    │   ├── lifecycle/           # máquina de estados, transições, gating
    │   ├── migration-runs/      # orquestra o executor, canário, reprocessamento, rollback
    │   ├── restore/             # restauração de um tenant
    │   ├── verify/              # verificação diária de estrutura e grants
    │   ├── http/internal.ts     # /v1/internal/tenancy
    │   └── http/admin.ts        # /v1/admin/tenancy
    └── migrations/              # tabelas de koovela_platform do tenancy
infra/migrations/                # @koovela/migrator: núcleo do executor + CLI
packages/platform/tenancy/       # TenantContext, db.forTenant(), redisKey, lockKey, gating
packages/testing/isolation/      # harness da suíte de isolamento
packages/testing/tenants/        # gerador determinístico de tenants sintéticos
apps/admin-web/src/routes/schemas/   # tela G03
tools/koovela-cli/               # subcomandos tenant e migrate
infra/observability/alerts/tenancy.yml
```

**Structure Decision**: domínio `tenancy` em `services/tenancy`, carregado pelo processo `core`; tarefas longas (migração, verificação, restauração) rodam no `workers`. O executor fica em `infra/migrations` por ser compartilhado por todos os domínios (CONST 4.2).

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Baseline de DDL por domínio, regenerada a cada release | Manter o provisionamento abaixo de 2 min com o histórico de migrações crescendo | Replay de todas as migrações (tempo cresce sem limite) |
| Grants por tabela via roles por domínio | O MySQL não aceita curinga por tabela; é a única forma de "permissão só nas próprias tabelas" num schema compartilhado | Grant no schema inteiro (quebra REQ-TEN-004) |
| MySQL temporário na restauração de um tenant | Restaurar um tenant num ponto no tempo sem tocar nos demais | Restaurar a instância inteira (derruba 500 tenants) |

## Riscos

- Volume de grants (`mysql.tables_priv`) e cache de tabelas com 1.000 tenants: medido em staging com 1.000 tenants sintéticos (T086); o limite operacional é ajustado pelo resultado.
- DDL online: algumas mudanças (por exemplo, mudar tipo de coluna) não aceitam `INSTANT`/`INPLACE`; exigem o caminho expandir (coluna nova) → migrar (cópia em lotes) → contrair.
