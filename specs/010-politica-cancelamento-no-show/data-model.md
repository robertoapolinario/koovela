# Data Model: Política de cancelamento e não comparecimento (010)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `scheduling` (submódulo `policy`); schema do tenant. Dinheiro em centavos; percentuais inteiros 0–100.

---

## `scheduling_policy`
`policy_id`, `business_id` (UNIQUE), `created_at`.

## `scheduling_policy_version` (imutável)

| Coluna | Regra |
|---|---|
| `policy_version_id`, `policy_id`, `number` | — |
| `free_cancel_hours`, `free_reschedule_hours` | 0–168 |
| `reschedule_limit` | 0–5 ou NULL (sem limite) |
| `late_cancel_fee_pct`, `no_show_fee_pct` | 0–100 |
| `grace_minutes` | 5–60 (padrão 15) |
| `block_app_cancel_outside_window` | bool |
| `fee_form` | `retain_deposit` \| `retain_deposit_and_charge_card` \| `record_only` (entre as permitidas no back-office) |
| `deposit_kind` | `percent` \| `fixed` |
| `deposit_value` | % (10–100) ou centavos |
| `deposit_payment_minutes` | 5–30 |
| `require_deposit_after_no_shows` | 1–5 ou NULL |
| `display_text`, `display_text_sha256` | Texto modelo mostrado ao consumidor |
| `valid_from`, `status`, `author_id` | — |

## `scheduling_policy_service_deposit_mode`
`policy_version_id`, `service_id`, `mode` (`none` \| `all` \| `new_or_recent_no_show`). Em saúde ignorado: vale a taxa de agendamento (005).

## `scheduling_policy_exception`
`policy_version_id`, `target_kind` (`service` \| `consumer`), `target_id`, `scope` (`fee` \| `deposit` \| `both`).

## `scheduling_policy_acceptance` (append-only)
`appointment_id`, `policy_version_id`, `text_sha256`, `ip`, `device`, `accepted_at`, `channel` (`consumer` \| `staff_informed`), `staff_id`.

`ip` é guardado completo como prova do aceite (CDC), só nesta tabela; retenção: enquanto durar o agendamento, mais o prazo de contestação e a guarda fiscal (CONST IV), depois anonimizado.

## `scheduling_policy_fee`

| Coluna | Regra |
|---|---|
| `fee_id`, `appointment_id` | — |
| `kind` | `late_cancel` \| `no_show` |
| `amount_cents`, `currency` | Calculada pela versão congelada |
| `form` | Congelada da versão |
| `state` | `applied` → `suspended` → `charged` \| `reverted` \| `waived` |
| `reason`, `decided_by`, `decided_at` | Abono e reversão |

## `scheduling_no_show_counter`
`business_id` + `consumer_id` (PK), `count`, `last_dates` (JSON), `updated_at`.

## `scheduling_policy_dispute`
`dispute_id`, `fee_id` (ou `appointment_id` em "não fui atendido"), `kind` (`fee` \| `not_served`), `text` (até 500), `opened_at`, `due_at` (+7 dias), `state` (`open` → `accepted` \| `rejected` \| `auto_accepted`), `response`, `decided_by`.

## Invariantes

1. Retido + devolvido = sinal pago.
2. Multa ≤ preço congelado; nunca negativa.
3. Cancelamento pelo estabelecimento nunca gera `scheduling_policy_fee`.
4. Sem aceite nem `staff_informed`, `form = record_only`.
