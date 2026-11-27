# Implementation Plan: Auditoria e feature flags

**Branch**: `004-auditoria-flags` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-auditoria-flags/spec.md`

## Summary

Criar no domínio `backoffice`:

- **trilha de auditoria append-only e encadeada**:
  - cada domínio grava o registro num outbox próprio, na mesma transação da ação (atômico, sem cruzar fronteira de domínio);
  - um ingestor único copia para a trilha central com `seq` e cadeia SHA-256;
  - um selo diário vai para o Cloudflare R2 com bucket lock (fora do banco e da OCI);
  - pesquisa no back-office (**G10**) e no painel do Proprietário, com recorte por perfil e exportação com prova de integridade;
  - um teste de cobertura gerado a partir da matriz RBAC;
- **feature flags**:
  - definição versionada no repositório (`packages/contracts/flags/flags.yaml`), regras por tenant, vertical e porcentagem no back-office (**G09**);
  - avaliação determinística compatível com OpenFeature, propagação em até 60 s sem deploy e último valor conhecido em caso de falha;
  - mudança só por SRE com justificativa, step-up, versão e "voltar num passo";
  - higiene semanal e verificação no CI.

Decisões e alternativas em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; `canonicalize` (JSON canônico RFC 8785); `node:crypto` (SHA-256, Merkle); `@openfeature/server-sdk` e `@openfeature/web-sdk` / React Native com provedor próprio; cliente S3 para R2 (bucket lock); `ioredis`; MMKV no app.

**Storage**: MySQL 8.4 `koovela_platform` (`backoffice_audit_log` particionada por mês, `backoffice_audit_seal`, `backoffice_audit_subject`, `backoffice_audit_query`, `backoffice_feature_flag`, `backoffice_feature_flag_version`); `<domínio>_audit_outbox` em cada domínio; Redis (`flags:snapshot:<env>`); Cloudflare R2 (selos e exportações); RabbitMQ (`backoffice.events`).

**Testing**: Vitest + Testcontainers; teste gerado de cobertura de auditoria (um por ação com `audit_category`); teste de adulteração da cadeia (alterar, apagar, reordenar → detectado); teste de atomicidade (falha no outbox desfaz a ação); teste de idempotência; testes de propriedade da precedência e do bucket de porcentagem; teste de propagação ≤ 60 s; Playwright + axe em G09, G10 e na trilha do painel.

**Target Platform**: `core` (APIs do `backoffice`), `workers` (ingestor, verificação e selo diário, consultas assíncronas, higiene de flags), `gateway` (`/v1/flags`), `admin-web`, `tenant-web`, apps (SDK de flags).

**Project Type**: domínio de serviço + bibliotecas de plataforma (`audit`, `flags`) + telas no back-office e no painel.

**Performance Goals**: gravação do registro ≤ 50 ms p95 na ação (um `INSERT` local); trilha central ≤ 30 s atrás (p95); pesquisa de 90 dias ≤ 5 s p95; propagação de flag ≤ 60 s; avaliação de flag no servidor ≤ 1 ms (memória).

**Constraints**: nenhum usuário de aplicação com `UPDATE`/`DELETE` na trilha; trilha sem nome, e-mail, celular ou conteúdo de negócio; tenant da avaliação de flag nunca vindo do cliente; retenção de 5 anos; R$ 0 (R2 gratuito até 10 GB).

**Scale/Scope**: ~10 milhões de registros/ano na escala inicial; ~150 ações auditáveis; dezenas de flags ativas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Sem agenda | ✅ N/A |
| G-II | Isolamento | `tenant_id` indexado na trilha; visão do Proprietário e avaliação de flag com o tenant da borda; outbox de auditoria dentro do schema de cada tenant, lido pelo resolvedor | ✅ |
| G-III | Dinheiro, idempotência | Registro deduplicado pela chave de idempotência; ações financeiras auditadas atomicamente | ✅ |
| G-IV | Dados pessoais | Trilha só com identificadores; nomes em tabela apagável; IP truncado fora do SRE; retenção de 5 anos | ✅ |
| G-V | Auditoria e permissões | Objeto desta spec: append-only, cadeia, selo externo, recorte por perfil, consulta auditada; flags só SRE com step-up | ✅ |
| G-VI | Rastreabilidade | REQ-AUD e REQ-FLG com origem; REQ-AUD-027 decidido no clarify | ✅ |
| G-VII | Contratos antes do código | [backoffice-audit-flags.openapi.yaml](./contracts/backoffice-audit-flags.openapi.yaml), [backoffice-events.asyncapi.yaml](./contracts/backoffice-events.asyncapi.yaml), [audit-record.schema.json](./contracts/audit-record.schema.json), [flags.schema.json](./contracts/flags.schema.json); outbox por domínio evita escrever em tabela de outro domínio | ✅ |
| G-VIII | Testes antes, invariantes | Cobertura de auditoria gerada, adulteração, atomicidade, precedência e porcentagem por propriedade | ✅ |
| G-IX | Outbox, idempotência, DLQ | Eventos do `backoffice` pelo outbox; ingestor idempotente por `audit_id` | ✅ |
| G-X | ARM64, migrações, observabilidade | Migrações pelo executor da 002; alertas de cadeia quebrada, selo atrasado, relógio > 1 s | ✅ |
| G-XI | Figma, a11y, superfícies | **G09** e **G10**; trilha do painel sem código no Figma (ver Riscos) | ✅ com pendência de protótipo |
| G-XII | Complexidade | Sem serviço externo de flags; outbox por domínio justificado abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/004-auditoria-flags/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── backoffice-audit-flags.openapi.yaml
    ├── backoffice-events.asyncapi.yaml
    ├── audit-record.schema.json
    └── flags.schema.json
```

### Source Code (repository root)

```text
services/backoffice/
├── src/audit/               # ingestor, cadeia, selo, pesquisa, exportação, visão do tenant
├── src/flags/               # versões, regras, sincronização da definição, higiene
├── src/http/                # rotas do OpenAPI
└── migrations/              # tabelas backoffice_* em koovela_platform
packages/platform/audit/     # audit.record(tx, …) → <domínio>_audit_outbox; migração do outbox por domínio
packages/platform/flags/     # provedor OpenFeature (servidor e cliente), bucket, precedência, cache
packages/contracts/flags/flags.yaml
packages/contracts/rbac/permissions.yaml   # + audit_category e justification_required por ação
services/tenancy · services/identity       # passam a gravar no próprio *_audit_outbox
apps/admin-web/src/routes/audit · flags    # G10 · G09
apps/tenant-web/src/routes/settings/audit  # trilha do próprio tenant
tools/flags-check/                         # CI: código × definição, vencidas
```

**Structure Decision**: domínio `backoffice` no `core`; tarefas longas e o ingestor no `workers`; as bibliotecas `audit` e `flags` em `packages/platform`, como manda o Princípio XII (peças compartilhadas, não reimplementadas por serviço).

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Outbox de auditoria em cada domínio + ingestor | Atomicidade com a ação (REQ-AUD-003) sem um domínio escrever na tabela de outro (Princípio VII) | Gravar direto na trilha central de dentro de cada transação (cruza fronteira de domínio) |
| Selo diário em R2 com bucket lock | Detectar reescrita da cadeia inteira por quem tem acesso ao banco (REQ-AUD-012) | Só a cadeia no banco (reescrevível por um DBA) |

## Riscos e pendências

- **Trilha do painel sem tela no Figma**: desenhar no protótipo antes da interface (CONST XI).
- **R2 com bucket lock**: confirmar disponibilidade no plano gratuito na T026, com registro em `docs/ops/decisions/r2-bucket-lock.md`; selos e exportações (apagadas em 24 h) entram na cota de 10 GB compartilhada com o backup da 001; se não houver, o selo vai também para um segundo destino imutável gratuito (por exemplo, *release* de um repositório público dedicado), sem custo.
- **Atraso da trilha central** (≤ 30 s): a tela mostra "atualizado até"; para investigação imediata, o SRE consulta o outbox do domínio pela CLI.
- **Ajustes feitos na spec**: códigos de tela (G09, G10) e a linha de permissão do Proprietário, atualizados conforme o clarify.
