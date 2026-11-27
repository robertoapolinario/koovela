# Data Model: Fidelidade (015)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `loyalty`; schema do tenant. Pontos e selos são inteiros; dinheiro em centavos; multiplicadores em centésimos.

---

## `loyalty_program`
`program_id`, `business_id` (UNIQUE), `state` (`off` \| `active` \| `winding_down` (resgate por 90 dias) \| `ended`), `wind_down_until`.

## `loyalty_program_version` (imutável)

| Coluna | Regra |
|---|---|
| `version_id`, `program_id`, `number`, `valid_from` | — |
| `mechanic` | `points_per_real` \| `stamps` |
| `rate_tenths_per_real` | Pontos ×10 por real (padrão 10) |
| `per_visit_bonus_points` | Opcional |
| `stamps_per_reward` | Só `stamps` |
| `expiry_months` | Padrão 12 |
| `monthly_cost_cap_cents` | Obrigatório |
| `balance_mode` | `business` \| `branch` |
| `allow_on_site_payments` | bool |
| `simulated_at`, `simulation_ref` | Simulador obrigatório |

## `loyalty_tier` (por versão)
`version_id`, `position` (1–4), `name`, `entry_points_12m`, `multiplier_pct` (100–200), `perk_text`.

## `loyalty_reward` (por versão)
`reward_id`, `version_id`, `kind` (`free_service` \| `discount_cents` \| `discount_pct` \| `gift`; em saúde só `free_service` e `gift`), `service_ids`, `cost_points`, `business_value_cents`, `min_tier`, `monthly_stock`, `valid_until`.

## `loyalty_account`
`account_id`, `consumer_id` (titular pagante), `business_id`, `branch_id` (só em modo `branch`), `available` (`CHECK ≥ 0`), `reserved`, `debt_points`, `tier_position`, `tier_review_on`, `joined_at`.

## `loyalty_entry` (imutável)
`entry_id`, `account_id`, `type` (`credit` \| `bonus` \| `reserve` \| `consume` \| `release` \| `expire` \| `reversal` \| `adjust`), `points`, `appointment_id`, `reward_id`, `credit_lot_id` (FIFO de expiração), `expires_at` (créditos), `state` (`posted` \| `pending_review`), `reason`, `actor_id`, `occurred_at`. UNIQUE `(appointment_id, type)` para idempotência.

## `loyalty_redemption`
`redemption_id`, `account_id`, `reward_id`, `appointment_id`, `state` (`reserved` → `consumed` \| `released`), `consumer_confirmation` (`app_push` \| `otp` no balcão; `self_checkout` quando o próprio consumidor resgata no resumo do app ou da web), `confirmed_at`, `discount_cents` (valor do desconto em centavos, 0 em `gift`; em `free_service`, o preço congelado do serviço), `program_cost_cents` (custo para o programa, base do teto).

## `loyalty_monthly_cost`
`business_id`, `month`, `cost_cents`, `cap_cents`, `catalog_paused`.

## `loyalty_abuse_alert`
`alert_id`, `account_id`, `rule` (`repeated_on_site` \| `weekly_spike` \| `redeem_without_service`), `entry_ids`, `state` (`open` → `cleared` \| `confirmed`), `decided_by`.

## Invariantes

1. `available ≥ 0` sempre; soma dos lançamentos = saldo.
2. Pontos de um negócio nunca em outro.
3. Crédito idempotente por agendamento.
4. Custo do mês ≤ teto (catálogo pausa ao atingir).
