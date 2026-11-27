# Implementation Plan: BI e painéis

**Branch**: `023-bi-paineis` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/023-bi-paineis/spec.md`

## Summary

Criar o BI em Python (D25) sobre uma **cópia analítica em ClickHouse**, separada do transacional:

- **Ingestão por eventos** de todas as specs, com mapas por tipo que **só deixam passar campos permitidos** (sem PII), pessoas por pseudônimo aleatório cujo mapeamento fica fora do BI e é apagado na eliminação (022).
- **Métricas versionadas** em dbt, com definição visível no painel e espaço para as métricas da fase 2 e o benchmark da fase 3.
- **Painéis da Gestão** (Dash em `bi.koovela.com`, Access + MFA, matriz por painel): operacional, financeiro e coorte, com filtros, supressão de células < 5 e insumos manuais de CAC e custos.
- **Dashboards do estabelecimento** (P01/P02) por `bi-api` atrás do gateway: filial e rede, Gerente da própria filial (PEN-03), sem acesso para Recepção e Colaborador, sem comparações para autônomos.
- **Fechamento financeiro** batendo ao centavo com 012 e 019, verificação diária, aviso de atraso e metas de desempenho com 10× o volume.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: Python 3.13 (`bi/`) — D25; o gateway segue em TypeScript.

**Primary Dependencies**: ClickHouse (servidor, `linux/arm64`), `clickhouse-connect`, `aio-pika` (consumidor RabbitMQ), dbt-core + dbt-clickhouse, Dash/Plotly + Gunicorn, FastAPI + Uvicorn, Pydantic, pytest, `uv` (gerência de pacotes).

**Storage**: ClickHouse (`raw_events`, `staging`, `marts`); insumos manuais em `koovela_platform`; mapeamento de pseudônimos em `koovela_platform.pseudonym_map`; backup diário para o Object Storage.

**Testing**: mapas sem PII; varredura de PII no ClickHouse; isolamento do `bi-api`; supressão < 5; `dbt test` das métricas; reconciliação de mês fechado; frescor e alertas; carga 1× e 10×; matriz por painel e dashboard; axe em P01/P02.

**Target Platform**: containers `bi-ingest`, `bi-api`, `bi-web` (Dash) e `clickhouse` nas VMs ARM (staging e produção); `bi.koovela.com` pelo Cloudflare Tunnel + Access.

**Project Type**: pipeline analítico + duas superfícies (Gestão e painel do cliente).

**Performance Goals**: Gestão ≤ 5 s e dashboards ≤ 3 s p95 (1×); ≤ 15 s e ≤ 5 s (10×); frescor ≤ 15 min (estabelecimento) e ≤ 1 h (Gestão).

**Constraints**: nunca ler o transacional; nenhuma PII nem texto livre; tenant sempre do gateway; custo zero (tudo self-hosted).

**Scale/Scope**: 500 tenants, ~50 mil agendamentos/mês no início (CONST 6); 10× para teste.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Só leitura; "hoje" vem do contrato da 009 | ✅ N/A |
| G-II | Isolamento | Agregações entre tenants só na cópia analítica (CONST 4.1); `bi-api` filtra pelo tenant do gateway | ✅ |
| G-III | Dinheiro | Centavos `Int64`; mês fechado bate ao centavo | ✅ |
| G-IV | Dados pessoais | Sem PII (mapas + varredura); pseudônimos com mapeamento fora do BI; eliminação pelo port da 022; supressão < 5 | ✅ |
| G-V | Permissões e auditoria | Matriz por painel e dashboard; insumos manuais auditados; Access + MFA | ✅ |
| G-VI | Rastreabilidade | D25, PEN-03, PEN-09 e "ativado" decididos | ✅ |
| G-VII | Contratos | [bi-api.openapi.yaml](./contracts/bi-api.openapi.yaml), [bi-ingest-mapping.schema.json](./contracts/bi-ingest-mapping.schema.json); consome só AsyncAPIs publicados | ✅ |
| G-VIII | Testes antes | PII, isolamento, reconciliação, métricas | ✅ |
| G-IX | Outbox, idempotência | Consumidor idempotente por `event_id`; DLQ | ✅ |
| G-X | Observabilidade | Frescor, divergência, tempo de consulta | ✅ |
| G-XI | Figma, a11y | B01, B02, B03, P01, P02; insumos manuais novos | ✅ com pendência de protótipo |
| G-XII | Complexidade | ClickHouse e segunda linguagem justificados abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/023-bi-paineis/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── bi-api.openapi.yaml
    └── bi-ingest-mapping.schema.json
```

### Source Code (repository root)

```text
bi/
├── pyproject.toml · uv.lock
├── ingest/            # consumidor RabbitMQ + mappings/*.yaml
├── models/            # dbt (staging, marts)
├── metrics/           # definições versionadas
├── api/               # FastAPI (bi-api)
├── web/               # Dash (bi.koovela.com)
├── checks/            # reconciliação, frescor, varredura de PII
└── tests/
infra/compose/bi.yml   # clickhouse, bi-ingest, bi-api, bi-web
apps/tenant-web/src/routes/home   # P01/P02 consumindo bi-api via gateway
```

**Structure Decision**: pasta `bi/` em Python (CONST 4.2 prevê `bi/`), containers próprios; o painel do cliente consome o `bi-api` pelo gateway.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| ClickHouse (novo armazenamento) | Consultas analíticas e de coorte com concorrência dos dashboards, 10× o volume, sem tocar o transacional (CONST 4.1) | Réplica MySQL (lenta para análise e com PII); DuckDB (um escritor, sem servidor) |
| Segunda linguagem (Python) | Decidido em D25 (CONST: BI em Python) | — |

## Riscos e pendências

- **Recursos das VMs ARM**: ClickHouse com limites de memória configurados; acompanhar no staging.
- **Tela nova**: insumos manuais do BI.
- **North Star e demais definições**: confirmar textos das métricas com a DF 14 ao escrever os `.yml`.
