# Data Model: Motor de agenda e disponibilidade (008)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `scheduling`; tabelas no schema do tenant. Instantes em UTC; janelas em `[start, end)`.

---

## `scheduling_settings` (por negócio, versionada)

`business_id`, `version`, `slot_grid_min` (5 \| 10 \| 15 \| 20 \| 30 \| 60; padrão 15), `min_lead_min` (0–4320; padrão 120), `horizon_days` (7–365; padrão 60), `consumer_picks_professional` (padrão `true`), `any_professional_rule` (`least_busy_day`), `valid_from`.

## `scheduling_occupancy`

| Coluna | Regra |
|---|---|
| `occupancy_id` | PK |
| `parent_occupancy_id` | Etapa de combo → ocupação-mãe |
| `branch_id` | — |
| `professional_id` | — |
| `resource_id` | NULL na v1.0 (`[C2]`) |
| `protected_start`, `protected_end` | Com preparo e limpeza, arredondados para fora a 5 min |
| `shown_start`, `shown_end` | O que o consumidor e a equipe veem |
| `kind` | `hold` \| `definitive` \| `external_block` (spec 027) |
| `expires_at` | Só `hold`; ≤ 30 min do início do *hold* |
| `extended` | `hold` estendido uma vez |
| `origin` | `consumer_app` \| `consumer_web` \| `staff_panel` \| `pro_app` \| `series` \| `waitlist` \| `idle_offer` \| `class` \| `combo_swap` \| `lesson` \| `event_hold` \| `discovery` (024) |
| `appointment_id`, `step_index` | Preenchidos pela spec 009 |
| `consumer_id` | Para o limite de *holds* |
| `override_reason`, `created_by` | Encaixe fora do horário (REQ-AGD-041) |
| `capacity_unit` | 1 na v1.0; na aula de turma (026), igual à capacidade da aula — o instrutor continua ocupado uma vez só |
| `granularity` | `cells` na v1.0 (`day_period`, spec 035) |
| `created_at`, `confirmed_at`, `released_at` | — |

## `scheduling_occupancy_cell` (a garantia)

| Coluna | Regra |
|---|---|
| `professional_id` + `cell_start` | **PRIMARY KEY** — impede sobreposição |
| `occupancy_id` | Indexada, sem FK (o MySQL não aceita FK em tabela particionada); apagada explicitamente na liberação, com verificação diária de órfãs |

Uma linha por célula de 5 min da janela protegida. Particionada por mês de `cell_start`.

## `scheduling_resource_cell` (latente)

`resource_id` + `cell_start` (PK), `occupancy_id`.

## `scheduling_consumer_hold_counter`

`business_id` + `consumer_id` (PK), `active_holds` (0–2), travada `FOR UPDATE` na criação e na liberação de *hold*.

## Cache em Redis (não é fonte da verdade)

`t:{tenant}:free:{professional_id}:{date}` → lista de intervalos livres em UTC + versão dos insumos; invalidada por evento.

## Global (`koovela_projections`, dono `scheduling`)

`person_occupancy_index` — `person_id`, `tenant_id`, `occupancy_id`, `protected_start`, `protected_end`; usado só para detectar conflito entre negócios (C6).

## Estados da ocupação

```
(nova) ──▶ hold ──confirmar──▶ definitive ──liberar (009)──▶ released
             │ └─estender (1×)─┘
             └─venceu / liberar──▶ released
```

Invariantes (testadas):
1. Nunca duas células iguais para o mesmo profissional (e recurso).
2. Combo: todas as etapas na mesma transação ou nenhuma.
3. `hold` nunca passa de 30 minutos no total.
4. No máximo 2 `hold` ativos por consumidor e negócio.
