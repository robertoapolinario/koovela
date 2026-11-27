# Data Model: Turmas, planos e check-in (026)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Donos: `scheduling` (`classes`), `catalog` (definições), `payments` (`memberships`, livro de saldos). Schema do tenant. Centavos.

---

## `classes_group` (turma)
`group_id`, `service_id` (modalidade), `level`, `instructor_id`, `branch_id`, `room_name`, `weekdays`, `local_time`, `duration_min`, `capacity` (2–100), `starts_on`, `ends_on`, `single_price_cents`, `commission_mode` (`fixed_per_class` \| `percent_per_attendance`), `commission_value`, `commission_base` (`single_price` \| `package_unit` \| `plan_usage`), `checkin_modes` (`student_qr`, `studio_qr`, `manual`), `version`.

## `classes_session` (aula)
`session_id`, `group_id`, `starts_at`, `ends_at`, `instructor_id`, `capacity`, `state` (`scheduled` → `in_progress` → `finished` \| `cancelled`), `occupancy_id` (008), `studio_qr_secret`.

## `classes_seat`
PK `(session_id, seat_no)`; `enrollment_id`.

## `classes_enrollment`

| Coluna | Regra |
|---|---|
| `enrollment_id` | PK |
| `session_id`, `subject_id` | UNIQUE (session, subject) |
| `payer_consumer_id` | Responsável (menor) ou o próprio |
| `pay_mode` | `single` \| `credit` \| `plan` |
| `payment_id` / `balance_entry_id` / `membership_id` | Conforme o modo |
| `state` | `enrolled` → `present` \| `no_show` \| `cancelled` |
| `cancel_kind` | `in_policy` \| `late` \| `studio_cancelled` |
| `checked_in_at`, `checkin_mode`, `checkin_recorded_offline` | — |
| `walk_in` | Adicionado pelo instrutor |

## Catálogo — `catalog_class_package_version`
`package_id`, `classes_count` (2–100), `service_ids`, `price_cents`, `validity_days` (7–365), `refund_rule` (≥ REQ-CAT-044).

## Catálogo — `catalog_class_plan_version`
`plan_id`, `name`, `service_ids`, `limit_kind` (`per_week` \| `per_month` \| `unlimited`), `limit_value`, `monthly_price_cents`, `min_commitment_months` (padrão 0), `effective_from`.

## Pagamentos — `memberships_subscription`
`membership_id`, `consumer_id`, `plan_version_id`, `saved_card_id`, `consent_recurring_at`, `anchor_day`, `state` (`active` → `past_due` → `suspended` → `active`; `active` → `cancel_scheduled` → `ended`; `paused_tenant_suspended`), `commitment_until`, `commitment_accepted_at`, `current_cycle_start`, `usage_in_period`, `pending_price_version_id`, `price_change_effective_at`.

`memberships_charge`: `charge_id`, `membership_id`, `cycle`, `payment_id`, `attempt`, `outcome`, `fiscal_invoice_ref`.

## Livro de saldos (012) — extensão
`payments_balance_account.product_kind` += `class_package`, `class_plan_usage`.

## Invariantes

1. Inscritos de uma aula ≤ capacidade (PK de assento); sem inscrição dupla.
2. Créditos nunca negativos.
3. Capacidade nunca abaixo dos inscritos.
4. Uso do plano dentro do limite do período.
5. Mudança de preço do plano só depois de 30 dias de aviso e no ciclo seguinte.
