# Data Model: Fiscal — NFS-e (017)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `fiscal`; schema do tenant. Valores em centavos; alíquotas em pontos-base.

---

## `fiscal_settings`
`business_id`, `issuer_mode` (`own` \| `koovela` — este só com a flag `fiscal.koovela_issuer`), `auto_emit` (padrão `true` com perfil completo), `package_emission` (`per_session` — padrão, PEN-24 \| `on_sale`).

## `fiscal_issuer`
`issuer_id`, `kind` (`company` \| `mei` \| `individual_no_cnpj`), `document` 🔒, `municipal_registration`, `tax_regime`, `municipality_ibge`, `address`, `provider` (`sp_paulistana` \| `national` \| `unsupported`), `rps_series`, `next_rps_number`, `state` (`incomplete` \| `ready` \| `blocked`).

`fiscal_branch_issuer`: `branch_id` → `issuer_id`.

## `fiscal_certificate`
`certificate_id`, `issuer_id`, `pfx_ciphertext`, `password_ciphertext`, `wrapped_data_key`, `subject_document`, `not_after`, `state` (`active` \| `expiring` \| `expired` \| `removed`), `uploaded_by`.

## `fiscal_service_tax`
`item_id`, `municipal_code`, `national_code`, `iss_rate_bps`, `iss_withheld`, `suggested_from_category`.

## `fiscal_invoice`

| Coluna | Regra |
|---|---|
| `invoice_id` | PK |
| `source_kind`, `source_id` | `appointment` \| `package_sale` \| `package_session` \| `gift_card_use` (029) |
| `source_part` | Índice da nota dentro da fonte (0 quando única; um por código de serviço no combo); UNIQUE `(source_kind, source_id, source_part)` para nota válida |
| `issuer_id`, `branch_id`, `payment_id` | — |
| `rps_number` | Atribuído uma vez |
| `amount_cents`, `iss_cents`, `iss_rate_bps`, `service_code` | Congelados na emissão; a reemissão usa os da nota original |
| `consumer_cpf` 🔒 | Só com "CPF na nota" |
| `state` | `requested` → `sending` → `authorized` \| `rejected` \| `retrying` → `failed_permanent`; `authorized` → `cancelled` \| `fiscal_pending` |
| `municipal_number`, `verification_code`, `public_url` | Retorno da prefeitura |
| `xml_ref`, `pdf_ref` | Object Storage, retenção 5 anos |
| `rejection_code`, `rejection_hint` | Linguagem simples |
| `issued_by` | `auto` ou ator |

## `fiscal_attempt`
`invoice_id`, `attempt_no`, `at`, `outcome`, `provider_code`, `next_retry_at`.

## `fiscal_pending_item`
`pending_id`, `invoice_id`, `kind` (`partial_refund` \| `cancel_window_passed` \| `missing_service_tax` \| `unsupported_municipality` \| `certificate_expired`), `state` (`open` → `resolved`), `resolution`.

## Global — `koovela_platform.fiscal_service_suggestion` (versionado)
`vertical_category`, `municipal_code`, `national_code`, `iss_rate_bps`.

## Invariantes

1. Uma nota válida por fonte e parte; RPS nunca reutilizado.
2. Sem nota para valor zero, multa e sinal não convertido.
3. Senha e certificado nunca em claro no banco nem em log.
4. XML e PDF guardados por 5 anos.
