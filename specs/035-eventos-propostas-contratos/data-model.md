# Data Model: Eventos — propostas, contratos e sinal (035)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono: `quotes` (submódulos `events`, `proposals`, `contracts` e `date-holds`), no schema do tenant. Pagamentos em `payments` (012). Dinheiro em centavos e percentuais em pontos-base. 🔒 = cifrado por envelope.

---

## `quotes_event_settings_version` (imutável)

| Coluna | Regra |
|---|---|
| `version_id`, `scope_kind`, `scope_id` | `branch` ou `professional` |
| `unit` | `full_day` ou `periods` |
| `periods` | Até 6, `{code, name, start_local, end_local}` |
| `capacity` | ≥ 1 (padrão 1); vale sempre 1 quando `scope_kind = professional` |
| `deposit_kind`, `deposit_bps`, `deposit_fixed_cents` | `percent` (de 1.000 a 5.000; padrão 3.000) ou `fixed` |
| `balance_max_installments` | De 1 a 3 |
| `balance_due_days_before` | Padrão 7 |
| `cancel_tiers` | Lista `{min_days_before, refund_deposit_pct, refund_balance_pct}` |
| `advanced_signature_above_cents` | Opcional |
| `validity_days` | Dentro dos limites (de 1 a 15; padrão 7) |
| `accepts_short_notice` | Padrão `false` |
| `effective_from`, `author_id` | — |

## `koovela_platform.quotes_events_policy` (versionada no back-office; CONST 8)
`version_id`, `deposit_bps_min` (1.000), `deposit_bps_max` (5.000), `max_installments` (3), `default_balance_due_days_before` (7), `validity_days_min` (1), `validity_days_max` (15), `deposit_window_hours` (24), `expiry_notice_hours` (24), `installment_notice_days` (3), `auto_fulfill_hours` (24), `effective_from`, `approved_by`. Valores entre parênteses só no seed. Os 7 dias de arrependimento (CDC art. 49) são regra legal, fixa. A configuração do fornecedor só aceita valores dentro destes limites.

## `quotes_date_block`
`block_id`, `scope_kind`, `scope_id`, `date`, `period_code` (NULL = dia inteiro), `reason`, `author_id`.

## `quotes_request` (033), extensões para `kind = event`
`event_type`, `date_options` (até 3 `{date, period_code}`), `guests`, 🔒 `event_location` (quando o fornecedor vai até o evento) e `description` de até 2.000 caracteres. Fotos e retenção seguem a 033.

## `quotes_proposal` e `quotes_proposal_version` (imutável)

| Coluna | Regra |
|---|---|
| `proposal_id`, `request_id`, `current_version` | — |
| `state` | `draft` → `sent` → `accepted` → `contracted`, ou `superseded`, `declined`, `expired` |
| versão: `items` | `{description, quantity, unit_cents}` |
| `total_cents` | = Σ itens |
| `deposit_cents` | Dentro da faixa da regra congelada |
| `installments` | Até 3 `{due_on, amount_cents}`; Σ = total − sinal |
| `dates` | Lista `{date, period_code}`, com dias seguidos permitidos |
| `professional_id` | Quando a capacidade é por profissional |
| `settings_version_id`, `template_version_id` | Congelados |
| `valid_until` | Congelado |
| `sent_by`, `sent_at` | — |

## `quotes_date_slot` (a garantia)
PK `(scope_kind, scope_id, date, period_code, slot_no)`; `hold_id`. `slot_no` vai de 1 até `capacity`.

## `quotes_date_hold`
`hold_id`, `proposal_id`, `scope_kind`, `scope_id`, `dates`, `state` (`held` → `confirmed` → `fulfilled`; `held` ou `confirmed` → `released`), `held_until`, `occupancy_id` (008, só para profissional), `release_reason` (`expired`, `declined`, `superseded_date`, `cancelled`).

## `koovela_platform.quotes_contract_base_version`
`version`, `body_md`, `legal_reviewed_by`, `legal_reviewed_at`, `effective_from`. Sem revisão jurídica, a versão não pode ser usada.

## `quotes_contract_template_version`
`template_version_id`, `base_version`, `extra_clauses_md`, `author_id`, `created_at`.

## `quotes_contract`

| Coluna | Regra |
|---|---|
| `contract_id`, `proposal_id`, `proposal_version` | — |
| `consumer_id`, 🔒 `consumer_full_name`, 🔒 `consumer_cpf` | Snapshot |
| `state` | `awaiting_deposit` → `active` → `amended` → `fulfilled`, `cancelled_by_consumer` ou `cancelled_by_vendor`; `awaiting_deposit` → `void` (sinal não pago) |
| `deposit_due_at` | = min(aceite + `quotes_events_policy.deposit_window_hours`, validade) |
| `signature_mode` | `simple` ou `advanced_govbr` (assinatura gov.br, gratuita) |
| `govbr_signed_object_key`, `govbr_signer_cpf_hash`, `govbr_validated_at`, `govbr_validation_report_ref` | Só em `advanced_govbr`: arquivo assinado, CPF do assinante (HMAC) conferido com o do contrato, data e relatório do validador do ITI |
| `pdf_object_key`, `pdf_sha256` | Retenção de 5 anos com bloqueio |
| `signed_at`, `cancelled_at`, `fulfilled_at` | — |
| `vendor_penalty_cents` | Registrada e liquidada fora da Koovela |

## `quotes_contract_acceptance` (append-only)
`acceptance_id`, `contract_id` ou `amendment_id`, `document_sha256`, `base_version`, `template_version_id`, `proposal_version`, `accepted_at` (servidor), `consumer_id`, `auth_time`, `device_fingerprint`, `ip`, `user_agent`, `button_text`, `signature_envelope_ref` (avançada).

## `quotes_contract_amendment`
`amendment_id`, `contract_id`, `changes` (`guests`, `items`, `dates`, `installments`), `delta_cents`, `state` (`proposed` → `accepted`, `rejected` ou `expired`), `proposed_by`, `pdf_object_key`, `pdf_sha256`.

## `quotes_installment`
`installment_id`, `contract_id`, `kind` (`deposit` ou `balance`), `seq`, `due_on`, `amount_cents`, `state` (`due` → `paid`, `overdue` → `paid`; `paid` → `refunded`), `payment_id` (012), `refunded_cents`.

## `quotes_cancellation`
`contract_id`, `by` (`consumer` ou `vendor`), `within_withdrawal` (7 dias), `tier_applied`, `refund_cents`, `refund_ids`, `simulated_at`, `confirmed_at`.

## `koovela_projections.consumer_events_index`
`consumer_id`, `tenant_id`, `contract_id` ou `proposal_id`, `business_name`, `dates`, `state`, `next_installment_due`, `amount_open_cents`. Não guarda CPF, local nem evidências.

## Invariantes

1. Por unidade (escopo, data e período): vagas `held` + `confirmed` ≤ capacidade, garantido pela PK. Evento de vários dias reserva tudo ou nada.
2. Profissional em evento tem as células do período ocupadas na 008.
3. Proposta e contrato congelam as versões da configuração, do modelo e da proposta.
4. Contrato `active` é imutável e só muda por aditivo aceito.
5. Só o sinal pago confirma a data.
6. Cancelamento em até 7 dias do aceite devolve 100% do que foi pago.
7. Σ parcelas = total; Σ estornos ≤ Σ pago.
8. Toda aceitação tem evidência com o hash do documento exibido.
9. Em `advanced_govbr`, o contrato só fica `active` com a assinatura válida no validador do ITI, o hash do conteúdo igual a `pdf_sha256` e o CPF do assinante igual ao do contrato.
10. Nenhum prazo ou limite no código: tudo vem de `quotes_events_policy` (exceto os 7 dias do CDC).
11. Retenção pela tabela da 022: `event_contracts` (5 anos depois do evento, com bloqueio; cobre CPF, local, evidências e o arquivo gov.br); pedidos que não viraram contrato pela `quote_photos_text` da 033.
