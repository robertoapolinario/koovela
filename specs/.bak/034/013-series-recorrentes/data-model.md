# Data Model: Séries recorrentes (013)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `scheduling` (submódulo `series`); schema do tenant.

---

## `scheduling_series`

| Coluna | Regra |
|---|---|
| `series_id` | PK |
| `business_id`, `branch_id`, `consumer_id` | — |
| `origin_appointment_id` | Agendamento que virou série |
| `payment_mode` | `deposit_per_occurrence` \| `package` \| `on_site` |
| `package_account_id` | Quando `package` |
| `card_authorization_ref` | Consentimento de cobrança automática (012) |
| `state` | `active` \| `paused` \| `paused_for_no_shows` \| `awaiting_payment` \| `ended` |
| `paused_until` | ≤ 90 dias |
| `consecutive_no_shows` | Para a pausa por faltas |
| `end_reason` | `finished` \| `manual` \| `professional_left` \| `consumer_deleted` |
| `created_by`, `created_at` | Consumidor ou equipe |

## `scheduling_series_rule_version` (imutável; nova a cada "esta e as próximas")

`rule_version_id`, `series_id`, `valid_from_sequence`, `item_kind`, `item_id`, `professional_id`, `local_time`, `weekday`, `frequency` (`weekly` \| `every_2_weeks` \| `every_3_weeks` \| `every_4_weeks` \| `monthly_by_weekday_position`), `month_position` (1–4 \| `last`), `ends` (`after_n` \| `on_date` \| `never`), `end_value`, `timezone`.

## `scheduling_series_occurrence`

| Coluna | Regra |
|---|---|
| `series_id` + `sequence` | PK (idempotência da materialização) |
| `rule_version_id` | Regra que a gerou |
| `planned_start` | Instante planejado (UTC) |
| `state` | `planned` → `materialized` \| `in_conflict` → `materialized` \| `skipped` |
| `appointment_id` | Quando materializada (segue a 009) |
| `has_own_time` | `true` depois de mudança "só esta" |
| `conflict_alternatives` | JSON (até 3) |
| `conflict_deadline` | 24 h antes do planejado |
| `skip_reason` | `pause` \| `conflict_unresolved` \| `no_show_pause` |

## `scheduling_series_change` (append-only)

`change_id`, `series_id`, `actor`, `scope` (`this` \| `this_and_following` \| `whole_series`), `from_sequence`, `previous_rule_version_id`, `new_rule_version_id`, `kind` (`reschedule` \| `cancel` \| `pause` \| `resume` \| `transfer_professional` \| `end`), `at`.

## Invariantes (testadas)

1. Sempre 4 ocorrências futuras materializadas para série `active` (salvo fim antes disso).
2. `(series_id, sequence)` único: materialização idempotente.
3. Mudança `this` nunca altera outra ocorrência (invariante 6 da DF).
4. Ocorrências passadas nunca mudam.
5. ≤ 3 séries ativas por consumidor e negócio, sem sobreposição de horário.
