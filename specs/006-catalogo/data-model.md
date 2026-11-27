# Data Model: Catálogo (006)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `catalog`; tabelas `catalog_*` no schema do tenant. UUIDv7 `BINARY(16)`; instantes UTC; dinheiro `amount_cents BIGINT` + `currency CHAR(3)`.

---

## Serviço

### `catalog_service_group`
`group_id`, `business_id`, `name`, `position`.

### `catalog_service`

| Coluna | Regra |
|---|---|
| `service_id` | PK |
| `business_id` | — |
| `group_id`, `position` | — |
| `name`, `description` | Nome 1–80; descrição até 1.000 |
| `visibility` | `public` \| `internal` |
| `all_branches` | Padrão `true` |
| `state` | `active` \| `inactive` \| `archived` (apagar só se nunca usado) |
| `photo_media_ids` | Até 5 |
| `service_location_mode` | `on_premises` na v1.0 (latente: `at_customer`, `both`, D40) |
| `quote_mode` | `none` na v1.0 (latente, D40) |
| `duration_rule` | NULL na v1.0 (latente, D29) |
| `accepted_subject` | `self` na v1.0 (latente: `dependent`, `pet`, D28) |
| `used` | `true` após primeiro agendamento, venda de pacote ou uso em combo (bloqueia exclusão) |

### `catalog_service_version` (imutável)

| Coluna | Regra |
|---|---|
| `service_version_id` | PK |
| `service_id`, `number` | UNIQUE (serviço, número) |
| `duration_min` | Múltiplo de 5, 5–720 |
| `prep_min`, `cleanup_min` | Múltiplo de 5, 0–120 |
| `price_kind` | `fixed` \| `from` |
| `amount_cents`, `currency` | ≥ 0; em `from` é o mínimo |
| `valid_from` | Instante UTC (imediato ou futuro) |
| `status` | `scheduled` \| `current` \| `superseded` \| `replaced` (substituída antes de valer) |
| `author_id`, `created_at` | — |

### `catalog_service_branch`
`service_id`, `branch_id` (PK composta), `available` (bool).

### `catalog_branch_price_version` (imutável)
`version_id`, `service_id`, `branch_id`, `amount_cents`, `currency`, `valid_from`, `status`, `author_id`.

## Combo

### `catalog_combo`
`combo_id`, `business_id`, `name`, `visibility` (herda `internal` se alguma etapa for interna), `professional_rule` (`same_for_all` na v1.0; `per_step` latente, D34), `state` (`active` \| `inactive` \| `archived`; desativado automaticamente se uma etapa ficar indisponível).

### `catalog_combo_version` (imutável)
`combo_version_id`, `combo_id`, `number`, `amount_cents`, `currency`, `gap_min` (0–15), `valid_from`, `status`, `sum_single_cents` (soma dos avulsos na data), `discount_cents`.

Validação: `amount_cents ≤ sum_single_cents`; 2 a 5 etapas.

### `catalog_combo_step`
`combo_version_id`, `position` (1–5), `service_id`, `service_version_id` (congelada na versão do combo), `discount_share_cents` (rateio; resto na última).

### `catalog_combo_step_candidate` (latente, fase 2)
`combo_version_id`, `position`, `professional_id`. Vazia na v1.0.

## Pacote de sessões

### `catalog_package`
`package_id`, `business_id`, `name`, `item_kind` (`service` \| `combo`), `item_id`, `visibility`, `sell_channel` (`online_and_on_site` \| `on_site_only`; forçado `on_site_only` em saúde), `state`.

### `catalog_package_version` (imutável)
`package_version_id`, `package_id`, `number`, `sessions` (2–50), `amount_cents`, `currency`, `validity_days` (30–730), `scope` (`purchase_branch` \| `all_branches`), `refund_rule` (`none` \| `proportional_unused` \| `proportional_minus_fee`), `refund_fee_cents`, `valid_from`, `status`.

O saldo (compra, reserva, consumo, devolução, expiração, estorno) é um livro-razão do `payments` (spec 012) que referencia `package_version_id`.

## Global (`koovela_platform`)

### `catalog_service_suggestion`
`suggestion_id`, `vertical_code`, `name`, `short_description`, `typical_duration_min`, `position`, `enabled`.

## Auditoria e eventos

`catalog_audit_outbox` (spec 004) para mudanças de preço e composição; `catalog_outbox` para eventos.

## Estados

| Entidade | Transições |
|---|---|
| Serviço | `active` ↔ `inactive` → `archived`; exclusão física só se `used = false` |
| Versão | `scheduled` → `current` → `superseded`; `scheduled` → `replaced` |
| Combo | `active` ↔ `inactive` (automático quando uma etapa sai) → `archived` |
| Pacote | `active` ↔ `inactive` → `archived` (saldos vendidos continuam válidos) |
