# Data Model: Vitrine e busca (024)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono `discovery`; schema global `koovela_discovery` (só dados públicos de negócios) + índice Meilisearch. Dinheiro em centavos.

---

## `discovery_participation`
`tenant_id`, `business_id`, `branch_id`, `state` (`not_participating` → `invited` → `pending` → `active` ↔ `paused`; `active` → `left` \| `removed`), `pause_reason` (`unpublished` \| `suspended` \| `no_slots_30d`), `missing_requirements` (lista), `opted_in_by`, `opted_in_at`, `left_at`, `removed_reason`.

## `discovery_listing` (projeção que gera o documento do índice)

| Coluna | Regra |
|---|---|
| `branch_id` | PK |
| `tenant_id`, `business_id`, `slug` | — |
| `name`, `cover_media_url`, `categories`, `service_names` | Públicos |
| `geo_lat`, `geo_lng`, `geo_precision` | `exact` \| `approximate` (autônomo com endereço oculto) |
| `min_price_cents` | NULL em saúde |
| `rating_avg_x10`, `rating_count_12m` | NULL em saúde ou com avaliações desligadas; da projeção da 016 |
| `next_free_slot_at`, `available_today`, `available_tomorrow`, `slots_next_7d` | Da 008 |
| `accepts_online_payment`, `accessibility` | `accepts_online_payment` do recebedor `active` (`payments.payee.changed`, 012); `accessibility` de `tenancy_branch.accessibility` (005) |
| `next_free_slot_at`, `available_today`, `available_tomorrow`, `slots_next_7d` (fonte) | `scheduling.availability_summary.changed.v1` da 008 (a cada 15 min e na mudança de ocupação) |
| `rating_avg_x10`, `rating_count_12m` (fonte) | `engagement.rating_summary.changed.v1` da 016 |
| `is_health`, `home_service` (fase 3, oculto) | — |
| `new_until` | Ativação + 60 dias |
| `updated_at` | Frescor ≤ 15 min |

## `discovery_ranking_version` (back-office)
`version_id`, `weights` (`text`, `distance`, `availability_7d`, `rating`), `rating_prior` por categoria, `new_business_days` (60), `region_min_total` (15), `region_radius_m` (3000), `region_min_per_category` (5), `explanation_text`, `effective_from`, `author_id`.

## `discovery_region`
`region_id`, `city_ibge`, `neighborhood`, `polygon`, `state` (`candidate` → `open` ↔ `closed`), `counts_by_category`, `meets_minimum`, `decided_by`, `decided_at`.

## `discovery_region_waitlist`
`consumer_id` (obrigatório; sem e-mail solto), `region_id`, `created_at`, `revoked_at`.

## `discovery_taxonomy` (versionada)
`vertical`, `category`, `synonyms`, `home_order`, `reserved_slugs`.

## `discovery_search_history` (só com "lembrar minhas buscas")
`consumer_id`, `query_text`, `filters`, `searched_at` — sem localização; `HolderDataPort` (022).

## `discovery_report` (denúncia)
`report_id`, `branch_id`, `reporter_consumer_id`, `reason`, `state` (`open` → `kept` \| `removed`), `moderator_id`.

## `discovery_blocked_terms` (versionada; compartilhada com a 016)

## Invariantes

1. Nenhum campo privado de tenant no índice; preço e avaliação ausentes em saúde.
2. Lista principal sem resultado pago.
3. Localização do consumidor nunca persistida.
4. Mudança de participação refletida no índice em ≤ 15 min.
5. Retenção pela tabela da 022: `discovery_search_history` (12 meses ou até desligar) e `discovery_region_waitlist` (abertura da região + 30 dias), aplicadas pelo `applyRetention` do port.
6. O `discovery` não lê tabelas de outros domínios; a nota agregada chega por evento da 016.
