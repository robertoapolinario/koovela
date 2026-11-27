# Data Model: Parceiros indicadores (038)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono: `partners`, no schema global `koovela_platform`. Centavos. 🔒 = cifrado por envelope. 🔎 = HMAC para busca.

---

## `partners_partner` (`referral_partner`)

| Coluna | Regra |
|---|---|
| `partner_id` | PK |
| `cnpj` 🔒 🔎 | UNIQUE pelo HMAC; dígito validado |
| `legal_name`, `kind` | `kind`: `administrator`, `franchisor`, `accountant`, `association` ou `other` |
| `contact_name`, `contact_email`, `contact_phone` | — |
| `bank_account` 🔒 | — |
| `terms_version`, `terms_accepted_at` | — |
| `state` | `requested` → `approved` ou `rejected`; `approved` ↔ `suspended`; `approved` → `closed` |
| `reject_reason`, `suspend_reason`, `decided_by`, `decided_at` | — |
| `referral_code` | UNIQUE, 8 caracteres |

## `koovela_platform.partners_policy` (versionada no back-office; CONST 8)
`version_id`, `attribution_window_days` (90), `activation_window_days` (90), `reversal_window_days` (30), `dispute_window_days` (7), `statement_expiry_months` (12), `batch_max_rows` (500), `invite_cooldown_days` (90), `effective_from`, `approved_by`. Valores entre parênteses só no seed.

## `partners_member`
`partner_id`, `person_id` (003, `kind = partner`), `role` (`admin` ou `member`), `cpf_hmac` (para a autoindicação), `invited_at`, `joined_at`, `removed_at`.

## `partners_rate_default_version` e `partners_rate_version`
Padrão: `version_id`, `amount_cents` (> 0), `effective_from`, `requested_by`, `approved_by`. Do parceiro: `partner_id`, `amount_cents`, `source` (`default` ou `contract`), `contract_ref`, `effective_from`, `approved_by`.

## `partners_invite_batch`
`batch_id`, `partner_id`, `rows_total`, `rows_valid`, `rows_skipped`, `authorization_declaration_version`, `declared_by`, `state` (`preview` → `sending` → `done`), `created_at`.

## `partners_invite`
`invite_id`, `batch_id`, `partner_id`, `business_name`, `contact_name`, 🔒 `contact`, `contact_hmac`, `channel` (`email`; `sms` só atrás da flag `partners.sms_invites`, desligada — custo zero), `token`, `state` (`queued`, `sent`, `bounced`, `unsubscribed` ou `skipped`), `skip_reason` (`duplicate`, `cooldown_90d`, `suppressed` ou `sms_cap`), `sent_at`, `purge_after` (prazo da categoria `partner_invite_contacts` da 022, valor inicial 90 dias). UNIQUE parcial `(partner_id, contact_hmac)` para os últimos `partners_policy.invite_cooldown_days`, checado na aplicação.

## `partners_invite_suppression`
`contact_hmac` (PK), `at`. Global: vale para qualquer parceiro.

## `partners_touch`
`touch_id`, `partner_id`, `source` (`link`, `code` ou `invite`), `invite_id`, `touched_at`, `ref_token_hash`.

## `partners_attribution`

| Coluna | Regra |
|---|---|
| `attribution_id` | PK |
| `tenant_id` | UNIQUE (um parceiro por tenant) |
| `partner_id`, `touch_id`, `source` | Toque válido mais antigo |
| `tenant_created_at` | — |
| `state` | `valid` → `disputed` → `valid` ou `voided` |
| `dispute_until` | Criação + 7 dias |
| `dispute_reason`, `decided_by`, `decision_reason` | — |
| `superseded_touches` | Toques registrados sem efeito |

## `partners_activation`
`activation_id`, `tenant_id` (UNIQUE), `attribution_id`, `state` (`in_progress` → `achieved` ou `expired`; `achieved` → `reversed`), `deadline_at` (criação + 90 dias), `invoice_id` (019), `achieved_at`, `amount_cents` (congelado), `rate_version_id`, `reversed_at`, `reverse_reason` (`refund_30d` ou `attribution_voided`).

## `partners_statement`
`statement_id`, `partner_id`, `month`, `activations_cents`, `reversals_cents`, `carried_cents`, `total_cents`, `state` (`open` → `closed` → `awaiting_invoice` → `paid`; `awaiting_invoice` → `expired`), `expires_at` (fechamento + 12 meses). UNIQUE `(partner_id, month)`.

## `partners_statement_invoice`
`statement_id`, `nfse_xml_key`, `nfse_pdf_key`, `nfse_number`, `issuer_cnpj_hmac`, `amount_cents`, `auto_check` (`ok` ou lista de falhas), `checked_by`, `checked_at`, `state` (`submitted` → `approved` ou `rejected`).

## `partners_payout`
`payout_id`, `statement_id` (UNIQUE), `paid_on`, `amount_cents`, `receipt_key`, `actor_id`.

## `partners_ledger_entry` e `partners_ledger_posting`
Lançamento: `entry_id`, `idempotency_key` (UNIQUE: `activation:{tenant}`, `reversal:{tenant}`, `payout:{statement}`), `occurred_at`. Partidas: `account` (`partner_acquisition_expense`, `partner_payable` ou `cash_bank`), `partner_id`, `amount_cents` (com sinal). Σ = 0 por lançamento.

## `partners_material`
`material_id`, `title`, `object_key`, `approved_by`, `published_at`, `retired_at`.

## `partners_referral_view` (projeção para o portal)
`partner_id`, `tenant_id` (interno, não exposto), `business_name`, `city`, `signed_up_at`, `stage` (`signed_up`, `activated`, `expired`, `reversed` ou `voided`), `days_left`.

## Extensões
- **003**: `kind` ganha o valor `partner`.
- **005**: campo `referral_code` no onboarding; aviso "indicado por" com contestação.
- **011**: modelo de convite de parceiro com descadastro (e-mail de `news.koovela.com`) e avisos do ciclo do parceiro (T083 da 011).
- **005**: `tenancy_client_profile.acquisition_channel = partner` e `acquisition_ref = referral_code`, gravados na atribuição.

## Invariantes

1. Um tenant tem no máximo uma atribuição, uma ativação e um lançamento de ativação.
2. Não há atribuição para tenant que já existia nem para autoindicação (documento do parceiro ou dos usuários).
3. O valor da ativação é congelado na data da ativação.
4. Um extrato só vira `paid` com nota `approved` e pagamento registrado.
5. Cada lançamento do livro soma zero.
6. O portal só expõe nome, cidade, etapa e prazo dos indicados.
7. No máximo um convite por contato por parceiro a cada `partners_policy.invite_cooldown_days`; um contato suprimido nunca recebe.
8. Nenhum cookie de atribuição sem o consentimento de medição (024); o token vai na URL e é gravado no servidor no cadastro.
9. Nenhum prazo ou limite no código: tudo vem de `partners_policy`.
10. Retenção pela tabela da 022: `partner_invite_contacts` (90 dias), `partner_members` (parceria + 5 anos), `invite_suppression` (sem prazo; só o HMAC).
