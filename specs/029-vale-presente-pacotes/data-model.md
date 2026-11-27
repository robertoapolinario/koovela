# Data Model: Vale-presente e pacotes (029)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono `payments` (submódulo `gift_cards`); schema do tenant; saldo no livro de saldos da 012. Centavos.

---

## `gift_card`

| Coluna | Regra |
|---|---|
| `gift_card_id` | PK |
| `branch_id` | Uso só nesta filial |
| `buyer_consumer_id` | Comprador |
| `recipient_name`, `recipient_phone` 🔒, `recipient_email` 🔒 | Destinatário |
| `recipient_consumer_id` | Após o resgate |
| `kind` | `amount` \| `service` \| `combo` \| `package` |
| `item_id`, `catalog_version_id` | Preço congelado (tipos não `amount`) |
| `paid_cents` | — |
| `balance_account_id` | Conta no livro de saldos |
| `message`, `art_id` | — |
| `code_hmac`, `code_last4` | Código nunca em claro |
| `deliver_at`, `delivery_channel` (`sms` \| `email` \| `code_only`) | — |
| `expires_at`, `suspension_extension_days` | Validade |
| `resent_once` | Reenvio único antes do resgate |
| `state` | `paid` → `delivered` → `redeemed` → `in_use` → `depleted` \| `expired`; `paid`/`delivered` → `refunded`; qualquer → `cancelled` |
| `payment_id`, `advance_journal_id` | Venda como adiantamento |

## `gift_card_settings` (por filial)
`branch_id`, `enabled`, `amount_mode` (`range` \| `fixed`), `amount_min_cents`, `amount_max_cents`, `fixed_amounts_cents`, `giftable_item_ids`, `art_ids`, `validity_months` (≥ 6, padrão 12).

## `gift_card_policy` (plataforma, `koovela_platform`; versionada no back-office; CONST 8)
`version_id`, `expiry_notice_days` (30, 7), `code_attempts_per_hour` (5), `effective_from`, `approved_by`. Valores entre parênteses só no seed. Mínimo de 6 meses de validade e janela de 7 dias de reembolso (CDC) são regras legais, fixas.

## `gift_card_redemption_attempt`
`consumer_id`, `device_fingerprint`, `at`, `success` — limite 5/h.

## Livro de saldos (012) — extensão
`product_kind` += `gift_card_amount`, `gift_card_item`.

## Projeção global — `koovela_projections.consumer_wallet`
`consumer_id`, `tenant_id`, `branch_id`, `gift_card_id`, `kind`, `balance_display`, `expires_at`, `state`.

## Invariantes

1. Saldo nunca negativo; consumo só na filial do vale.
2. Código impossível de adivinhar; guardado só como HMAC.
3. Estorno volta ao saldo do vale, nunca em dinheiro.
4. NFS-e no uso, pelo valor coberto.
5. Ordem: desconto (oferta **ou** fidelidade) → vale (forma de pagamento) → pagamento do restante; oferta e fidelidade não acumulam entre si.
6. No uso: a 009 grava `gift_card_applied_cents`/`gift_card_id`; a comissão da parte coberta vai ao fechamento da 018 com `payment_route = gift_card`; a taxa por agendamento vai à fatura da 019 (`booking_fee_gift_card`).
7. Retenção pela tabela da 022: `gift_cards` (5 anos) e `gift_card_recipient_contact` (até o resgate ou a validade + 30 dias); no reenvio, o contato anterior é apagado.
