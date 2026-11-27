# Data Model: Combo com troca de profissional (030)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Extensões do `catalog` (006) e do `scheduling` (008/009); schema do tenant. Centavos.

---

## Catálogo — `catalog_combo_version` (extensão)
`combo_rule` = `per_step` (além de `same_for_all`), `suggestion_rule` (`least_wait` padrão), `interval_mode` (`single` \| `per_transition`), `max_interval_min` (0–15).

## Catálogo — `catalog_combo_step` (por versão)
`version_id`, `position` (1–5), `service_id`, `eligible_mode` (`all_who_perform` \| `list`), `eligible_professional_ids`, `max_interval_after_min` (quando `per_transition`), `standalone_price_cents` (base do rateio).

## Catálogo — `catalog_combo_branch_availability` (projeção)
`combo_id`, `branch_id`, `available`, `missing_steps`.

## Agenda — `scheduling_occupancy` (008) — uso
Ocupação-mãe (`kind = combo_parent`) + uma por etapa (`parent_occupancy_id`, `step_position`, `professional_id`).

## Agendamento — `scheduling_appointment_step` (009, extensão)
`appointment_id`, `step_position`, `service_id`, `professional_id`, `starts_at`, `ends_at`, `occupancy_id`, `discount_share_cents`, `commission_rule_version_id`, `state` (`scheduled` \| `in_progress` \| `done` \| `delayed`).

## Agendamento — `scheduling_step_delay_alert`
`appointment_id`, `step_position`, `expected_start`, `projected_start`, `state` (`open` → `waited` \| `professional_changed` \| `step_rescheduled`), `decided_by`.

## Invariantes

1. Sequência oferecida sempre viável (ordem, durações, preparo/limpeza, intervalo máximo, tempo livre).
2. Reserva e remarcação atômicas: todas as etapas ou nenhuma.
3. Cancelamento sempre do combo inteiro.
4. Σ `discount_share_cents` = desconto do combo.
