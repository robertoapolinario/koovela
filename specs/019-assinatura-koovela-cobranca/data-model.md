# Data Model: Assinatura Koovela e cobrança (019)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `billing`; schema `koovela_platform`, ligado a `tenant_id`. Centavos e pontos-base.

---

## `billing_plan` / `billing_plan_version` (imutável)
`plan_id`, `name`, `state` (`draft` \| `active` \| `retired`); versão: `version_id`, `monthly_price_cents`, `tiers` (máx. colaboradores, filiais), `booking_fee_kind` (`fixed` \| `percent`), `booking_fee_value`, `fee_base` (`completed_paid` …), `included_features` (lista), `sms_quota`, `sms_overage_cents`, `whatsapp_quota`, `whatsapp_overage_cents`, `solo_policy` (JSON), `effective_from`, `approved_by`, `requested_by`.

## `billing_subscription`

| Coluna | Regra |
|---|---|
| `subscription_id`, `tenant_id` | UNIQUE tenant |
| `plan_version_id`, `pending_plan_version_id` | Descida no próximo ciclo |
| `payment_method` | `card_recurring` \| `pix_invoice`; `psp_card_token` |
| `cycle_anchor_day`, `current_cycle_start`, `current_cycle_end` | — |
| `state` | `trialing` \| `active` \| `past_due` \| `restricted` \| `suspended` \| `cancel_scheduled` \| `ended` |
| `trial_ends_at`, `dunning_paused_until`, `dunning_pause_reason` | — |
| `cancel_effective_at`, `reactivable_until` | `reactivable_until` = encerramento + 90 dias (prazo da política) |
| `dunning_policy_version_id` | Versão da régua congelada na abertura do atraso |

## `billing_invoice`
`invoice_id`, `tenant_id`, `kind` (`cycle` \| `one_off` — fatura avulsa da 032, com item `usage:sponsored_slot` e `source_kind = sponsorship`), `cycle_start`, `cycle_end`, `state` (`open` → `issued` → `paid` \| `past_due` → `paid` \| `cancelled`; `paid` → `credited`), `total_cents`, `due_on`, `pix_sent_at`, `paid_at`, `fiscal_invoice_ref`, `receipt_ref`.

## `billing_invoice_item` (imutável)
`item_id`, `invoice_id`, `kind` (`subscription` \| `proration` \| `booking_fee_on_site` \| `booking_fee_gift_card` (agendamento pago com vale, 029) \| `booking_fee_split_info` \| `advance_fee_info` (taxa da Koovela nas antecipações do mês, 036; informativa, com nota) \| `sms_overage` \| `whatsapp_overage` \| `discount` \| `concession` \| `credit` \| `one_off` \| `usage:<code>`), `source_kind`, `source_id` (UNIQUE com kind), `quantity`, `amount_cents` (informativos = 0 no total, valor em `info_amount_cents`), `description`. `one_off`: fatura avulsa fora do ciclo (ex.: destaque pago da 032), com `cycle_start = cycle_end` = data da compra.

## `billing_charge_attempt`
`attempt_id`, `invoice_id`, `n`, `at`, `method`, `psp_ref`, `outcome`, `idempotency_key`.

## `billing_dunning_policy` (versionada, back-office; CONST 8)
`version_id`, `retry_days` (lista de dias após o vencimento), `restricted_day`, `suspended_day`, `end_warning_day`, `ended_day`, `pix_lead_days`, `card_expiry_notice_days`, `trial_end_notice_days`, `price_increase_notice_days`, `effective_from`, `approved_by`. Valores iniciais (1, 3, 5; 7; 15; 75; 90; 5; 10; 7; 30) só no seed, nunca no código.

## `billing_dunning_step`
`subscription_id`, `invoice_id`, `step` (`retry` \| `restricted` \| `suspended` \| `end_warning` \| `ended`), `retry_no` (só em `retry`), `executed_at` — UNIQUE (invoice, step, retry_no).

## `billing_usage_counter`
`tenant_id`, `cycle_start`, `metric` (`sms_transactional` \| `whatsapp_transactional` …), `count`.

## Invariantes

1. Total da fatura = Σ itens cobráveis (centavos).
2. Item idempotente por fonte.
3. Mudança de preço nunca altera o ciclo em curso; aumento com ≥ 30 dias.
4. Nenhuma etapa da régua apaga dados.
5. Tenant só vê as próprias faturas.
6. Fatura de valor zero é gerada para registro, sem cobrança e sem nota.
7. Nenhum prazo da régua ou de aviso fica no código: tudo vem de `billing_dunning_policy`.
8. Retenção: faturas, itens, tentativas, etapas e uso por 5 anos; `psp_card_token` apagado na troca ou no fim do contrato.
