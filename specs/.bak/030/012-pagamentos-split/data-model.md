# Data Model: Pagamentos e split (012)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `payments`. Dinheiro em centavos (`BIGINT`) + `currency`; taxas em pontos-base. Lançamentos nunca alterados ou apagados.

---

## Schema do tenant

### `payments_payee` (recebedor)
`payee_id`, `level` (`business` \| `branch` \| `professional`), `owner_ref` (business_id, branch_id ou professional_id), `holder_document` 🔒, `bank_account` 🔒, `psp_recipient_ref`, `state` (`under_review` → `active` \| `rejected` \| `blocked`; `active` ↔ `payouts_held` — retenção de repasses pelo antifraude da 021: recebe, não transfere), `reject_reason`, `verified_at`.

### `payments_payment`

| Coluna | Regra |
|---|---|
| `payment_id` | PK |
| `kind` | `deposit` \| `full` \| `remainder` \| `difference` \| `package` \| `fee` \| `booking_fee` |
| `appointment_id` / `purchase_ref` | Origem |
| `consumer_id` | Global |
| `method` | `pix` \| `card` \| `on_site_cash` \| `on_site_card_terminal` \| `on_site_pix` \| `on_site_other` |
| `amount_cents`, `psp_fee_cents`, `currency` | — |
| `state` | `pending` → `approved` → `partially_refunded` \| `refunded` \| `charged_back`; `pending` → `expired` \| `failed`; `pending` → `unknown` (tempo esgotado na resposta do PSP) → estado final consultado no PSP |
| `psp_ref`, `pix_expires_at` | — |
| `idempotency_key` | UNIQUE |
| `voided_at`, `voided_by` | Só pagamento no local |

### `payments_split` / `payments_split_part`
`split_id`, `payment_id`, `config_version_id` (taxas da Koovela), `commission_rule_version_id`; partes: `party` (`business` \| `koovela_take` \| `koovela_booking_fee` \| `koovela_idle_fee` \| `professional`), `payee_id`, `amount_cents`, `status` (`settled` \| `pending_professional`). Invariante: Σ partes = líquido.

### `payments_refund`
`refund_id`, `payment_id`, `amount_cents`, `reason`, `origin` (`policy` \| `manual` \| `expiry` \| `dispute`), `actor_id`, `state` (`requested` → `succeeded` \| `failed`), `idempotency_key`.

### `payments_chargeback`
`chargeback_id`, `payment_id`, `reason_code`, `due_at`, `evidence` (JSON com referências), `state` (`opened` → `evidence_submitted` → `won` \| `lost`).

### Livro financeiro: `payments_journal` + `payments_posting`
Lançamento (`journal_id`, `kind`, `ref`, `occurred_at`) com partidas (`account_code`, `amount_cents` com sinal); Σ partidas = 0 por lançamento.

### Livro de saldos: `payments_balance_account` + `payments_balance_entry`
Conta: `account_id`, `consumer_id`, `product_kind` (`session_package` na v1.0), `package_version_id`, `scope_branch_id`, `expires_at`, `balance` (`CHECK ≥ 0`), `reserved`. Lançamento: `entry_id`, `account_id`, `type` (`credit` \| `reserve` \| `consume` \| `release` \| `expire` \| `refund` \| `adjust`), `quantity`, `appointment_id`, `occurred_at`, `reason`.

### Outros
- `payments_idempotency` (`key`, `operation`, `response_hash`, `created_at`).
- `payments_psp_event` (`psp_event_id` UNIQUE, `type`, `received_at`, `processed_at`).
- `payments_reconciliation_run` e `payments_reconciliation_issue` (`issue_id`, `kind`, `refs`, `state` `open` → `closed` com `justification`).
- `payments_audit_outbox` (spec 004).

## Global

### `koovela_identity.payments_saved_card`
`card_id`, `consumer_id`, `psp_token`, `brand`, `last4`, `exp_month`, `exp_year`, `consent_purchase_at`, `consent_fee_at`, `consent_recurring_at` (cobrança automática de série, spec 013: texto, valor por ocorrência e série guardados no aceite; revogável a qualquer momento), `consent_recurring_revoked_at`, `removed_at`.

Retenção: na remoção, o token é apagado no PSP; 30 dias depois de `removed_at`, a linha é anonimizada (sem `psp_token`, `last4` nem validade) (CONST IV).

### `koovela_platform.payments_fee_config_version`
`version_id`, `take_rate_bps`, `booking_fee_cents`, `idle_fee_bps`, `valid_from`, `author_id` — sem valor padrão no código (CONST 8).

## Invariantes (testadas)

1. Σ partes do split = líquido; nenhuma parte negativa.
2. Saldo nunca negativo, mesmo sob concorrência.
3. Σ partidas de cada lançamento financeiro = 0.
4. Estorno ≤ estornável.
5. Webhook processado uma única vez.
