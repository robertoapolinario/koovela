# Data Model: Privacidade e direitos do titular (022)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `privacy`; schema `koovela_platform`. Os dados pessoais continuam nos domínios donos.

---

## `privacy_request`

| Coluna | Regra |
|---|---|
| `request_id` | PK |
| `kind` | `access` \| `export` \| `erasure` \| `partial_erasure` \| `correction` \| `tenant_export` |
| `holder_consumer_id` / `tenant_id` | Titular ou tenant (exportação do tenant) |
| `scope` | Tudo ou lista de estabelecimentos |
| `channel` | `app` \| `web` \| `email` |
| `state` | `received` → `verified` → `processing` → `awaiting_business` → `completed` \| `partially_completed` \| `refused` |
| `due_at` | Prazo de `privacy_settings` (valores iniciais: 7 dias para exportação; 15 dias corridos para eliminação e correção) |
| `artifact_ref`, `artifact_expires_at` | Pacote cifrado (7 dias) |
| `receipt_ref` | Comprovante |

## `privacy_request_step` (saga)
`request_id`, `domain`, `tenant_id`, `op` (`describe` \| `export` \| `erase` \| `restrictions` \| `external_cleanup` \| `apply_retention` \| `tenant_purge`), `state` (`pending` → `done` \| `failed` → `retrying`), `result_ref`, `attempts`.

## `privacy_business_task`
`task_id`, `request_id`, `tenant_id`, `kind` (`erasure` \| `correction` \| `retention_expiry`), `due_at`, `state` (`open` → `erased` \| `retained` \| `auto_erased`), `retention_basis`, `retention_until`, `decided_by`.

## `privacy_consent_registry`
`consent_ref`, `holder_consumer_id`, `tenant_id`, `domain`, `kind` (`communication` \| `saved_card_purchase` \| `saved_card_fee` \| `offers` \| `care_notes` \| `legal_guardian_minor` \| `adult_authorization` \| `class_plan_recurring` \| …), `text_version`, `granted_at`, `revoked_at`.

## `privacy_retention_rule` (versionada)
`category`, `period` (ISO 8601 ou `until_erasure`), `legal_basis`, `on_expiry` (`delete` \| `anonymize` \| `bulk_delete`), `tenant_can_extend`, `min_legal_period`, `version`, `author_id`.

`privacy_retention_extension`: `tenant_id`, `category`, `period`, `basis`, `decided_by`.

## `privacy_settings` (versionado; CONST 8)
`version_id`, `export_due_days` (7), `erasure_due_days` (15), `business_answer_business_days` (5), `business_reminder_days` (3), `retention_notice_days` (30), `tenant_purge_notice_days` (30), `free_exports_per_month` (1), `effective_from`, `approved_by`. Valores entre parênteses só no seed.

## `privacy_tenant_purge`
`tenant_id`, `scheduled_for` (= `reactivable_until` da 019), `notice_sent_at`, `purge_requested_at`, `dual_control_id`, `completed_at`.

## `privacy_erasure_ledger` (sem PII; espelhado no R2)
`entry_id`, `holder_hash`, `scope`, `domains`, `executed_at`.

## `privacy_incident`
`incident_id`, `occurred_at`, `detected_at`, `nature`, `data_categories`, `affected_count`, `affected_list_ref`, `measures`, `risk` (`low` \| `relevant`), `notification_due_at`, `drafts_ref`, `state`.

## `privacy_policy_version`
`version`, `published_at`, `relevant_change`, `url`.

## Invariantes

1. Nenhum domínio com PII sem `HolderDataPort` (portão de CI).
2. Depois da eliminação, nenhum dado sem guarda legal resta (teste de ponta a ponta).
3. Toda eliminação entra no ledger e é reaplicada após restauração.
4. Pedidos têm prazo visível e alerta antes de vencer.
5. `HolderDataPort` tem `applyRetention(category, cutoff, on_expiry)`; nenhum domínio tem prazo de retenção no código.
6. O espaço de dados do tenant só é apagado pelo `purge` da 002, pedido pela 022 em `reactivable_until`.
