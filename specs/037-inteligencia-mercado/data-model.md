# Data Model: Inteligência de mercado (037)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono: `insights`, no componente `bi/`. Os cálculos ficam no ClickHouse (cópia analítica da 023); a configuração e a participação, em `koovela_platform`. Nenhum dado pessoal.

---

## `koovela_platform.insights_config_version` (imutável)

| Coluna | Regra |
|---|---|
| `version_id` | PK |
| `min_establishments` | ≥ 5 (CHECK); padrão 5 |
| `dominance_pct` | Padrão 30 |
| `region_levels` | `neighborhood`, `zone`, `city` (ordem fixa; nunca acima de `city`) |
| `zones` | Não guardadas aqui: lidas de `discovery_zone` da 024 (fonte única) |
| `active_metrics` | Lista de códigos com versão |
| `excluded_verticals_by_metric` | Ex.: `price_typical: [health]` |
| `rounding` | Por métrica, com regra para n < 10 |
| `opportunity_thresholds` | `{region_index_min: 70, occupancy_max_pct: 40}` |
| `plans_with_access` | Função `insights.benchmark` (019) |
| `period_options_days`, `lag_days` | `[30, 90, 180]`, `30` |
| `forming_days` | Dias mínimos de dados para mostrar a posição (valor inicial 30); antes disso, `forming` |
| `state`, `requested_by`, `approved_by`, `effective_from` | Aprovação pelo `dual_control` da 021 (`kind = insights_config`) |

## `koovela_platform.insights_participation`
`business_id` (PK), `state` (`on` (padrão) ou `off`), `changed_by`, `changed_at`.

## ClickHouse, `insights` (gerados por dbt)

### `insights_contributor_value`
`run_id`, `cut_key`, `metric_code`, `metric_version`, `branch_ref`, `value`, `weight`. Só existe internamente: nunca é lido pelo `bi-api`.

### `insights_cut`

| Coluna | Regra |
|---|---|
| `run_id`, `cut_key` | `cut_key = (level, region_id, category, period_days, metric_code@version)` |
| `contributors_count` | Interno |
| `contributors_band` | `5–9`, `10–19`, `20–49`, `50–99` ou `100+` (o único valor exposto) |
| `max_weight_share` | Para a dominância |
| `state` | `calculated` → `published` ou `blocked` |
| `block_reason` | `below_minimum`, `dominance`, `complementary` ou `temporal` |
| `period_start`, `period_end` | `period_end = run_date − lag_days` |

### `insights_benchmark_value` (só de recortes `published`)
`run_id`, `cut_key`, `p25`, `median`, `p75` (arredondados), `unit`.

### `insights_branch_position`
`run_id`, `tenant_id`, `branch_id`, `metric_code`, `cut_key_used`, `level_used`, `own_value`, `percentile_approx`, `status` (`ok`, `forming` ou `insufficient_data`).

### `insights_demand_index`
`run_id`, `cut_key` (sem métrica), `weekday` (1–7), `hour` (0–23), `index` (0–100, múltiplo de 5, ou NULL = "—").

### `insights_run`
`run_id`, `config_version_id`, `run_date`, `state` (`running`, `verified`, `published` ou `failed`), `published_at`, `blocked_count`, `reid_test_passed`.

## Invariantes

1. Nenhum `insights_benchmark_value` existe para um recorte não `published`.
2. Recorte publicado: contribuintes ≥ mínimo (≥ 5) e maior peso ≤ dominância.
3. Pai e filho publicados implicam complemento que passa nas regras 1 e 2.
4. Nenhum valor individual (`insights_contributor_value`) sai do ClickHouse.
5. A quantidade de estabelecimentos só é exposta em faixa.
6. Não há preço em verticais excluídas (saúde).
7. Participação `off` não contribui no cálculo seguinte e não acessa o painel.
8. O período termina pelo menos 30 dias antes do cálculo.
