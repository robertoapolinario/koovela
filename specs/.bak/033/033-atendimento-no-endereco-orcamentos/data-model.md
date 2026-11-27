# Data Model: Atendimento no endereço e orçamentos (033)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

🔒 = cifrado por envelope. O que fica no schema do tenant usa a chave do tenant; o que fica na conta global usa a chave da `identity`. Dinheiro em centavos.

---

## Catálogo (006), extensões em `catalog_service_version`
- `location`: `on_premises` (padrão) ou `customer_address`.
- `quote_mode`: `none` (padrão), `accepts` ou `requires`. Com `requires`, não há preço público.
- `accepted_subjects`: passa a aceitar `vehicle{types}`.
- `catalog_duration_rule_version` ganha `base_by_vehicle_size` (S, M e L) e `price_by_vehicle_size_cents`.
- Regra: todas as etapas de um combo têm o mesmo `location`.

## Scheduling (008/009), no tenant

### `scheduling_service_area` (versionada por filial)
`branch_id`, `version`, `mode` (`radius` ou `neighborhoods`), `radius_km` (de 1 a 100; padrão 10), `neighborhoods` (lista `{city_ibge, name_normalized}`), `travel_min` (de 0 a 180, múltiplo de 5; padrão 30), `valid_from`, `author_id`.

### `scheduling_occupancy`, extensões
- `kind` passa a aceitar `travel`, sempre com `parent_occupancy_id` do atendimento e células próprias.
- `address_key`: HMAC-SHA256 do endereço normalizado com a chave do tenant, preenchido só em atendimentos no endereço.

### `appointment_address_snapshot`
`appointment_id` (PK), 🔒 `street`, 🔒 `number`, 🔒 `complement`, 🔒 `reference_point`, `neighborhood`, `city_ibge`, `cep`, `address_key`, `source_address_id`, `changed_at`.

### `scheduling_field_event`
`appointment_id`, `kind` (`arrived`, `running_late` ou `absent`), `estimate_min`, `actor_id`, `occurred_at`, `client_op_id` (idempotência offline).

### `scheduling_address_access_log`
`appointment_id`, `viewer_id`, `viewer_role`, `at`. Registra cada leitura de endereço.

## Quotes (novo domínio), no tenant

### `quotes_settings` (por negócio, versionada)
`response_hours` e `validity_days`, sempre dentro de `quotes_limits`.

### `quotes_request`

| Coluna | Regra |
|---|---|
| `request_id` | PK |
| `consumer_id`, `branch_id`, `service_id`, `service_version_id` | — |
| 🔒 `description` | Até 1.000 caracteres |
| `address_snapshot` 🔒 | Só se `location = customer_address` (mesmos campos do snapshot do agendamento) |
| `subject_snapshot` | Veículo ou outro atendido (025) |
| `date_preferences` | Até 3 faixas `{from, to}` |
| `response_due_at` | Calculado a partir de `response_hours`, congelado |
| `state` | `sent` → `answered`, `declined`, `info_requested` (→ `sent`) ou `expired` |
| `decline_reason`, `final_at` | — |

### `quotes_message`
`request_id`, `author_side` (`business` ou `consumer`), 🔒 `body` (até 1.000), `created_at`. No máximo 3 por lado.

### `quotes_photo`
`photo_id`, `request_id`, `object_key` 🔒 (no Object Storage, sem EXIF), `thumb_key`, `state` (`uploading`, `ready`, `rejected` ou `purged`), `purge_after`.

### `quotes_quote`
`quote_id`, `request_id` (UNIQUE), `price_cents` (> 0), `duration_min` (múltiplo de 5), 🔒 `notes`, `valid_until` (congelado), `state` (`valid` → `accepted`, `rejected_by_consumer` ou `expired`), `appointment_id` (quando aceito), `answered_by`.

## Global

### `koovela_platform.quotes_limits` (back-office)
`response_hours_min`, `response_hours_max`, `validity_days_min`, `validity_days_max`, `effective_from`, `author_id`.

### `koovela_identity.identity_consumer_address`
`address_id`, `consumer_id`, `label`, `cep`, `city_ibge`, `neighborhood_normalized`, 🔒 `street`, 🔒 `number`, 🔒 `complement`, 🔒 `reference_point`, `state` (`active` ou `removed`). No máximo 10 por consumidor.

### `koovela_identity.service_subject_vehicle`
`subject_id`, `vehicle_type` (`car`, `motorcycle` ou `utility`), `make`, `model`, `color`, `size` (`S`, `M` ou `L`), 🔒 `plate`.

### `koovela_platform.geo_cep_cache`
`cep`, `city_ibge`, `neighborhood_normalized`, `lat`, `lng`, `source`, `fetched_at`. Não é dado pessoal.

### `koovela_projections.consumer_quotes_index`
`consumer_id`, `tenant_id`, `request_id`, `business_name`, `service_name`, `state`, `quote_valid_until`, `updated_at`. Não guarda descrição nem fotos.

## Extensões em outras specs
- **008**: parâmetro `address_ref` na disponibilidade e no hold, e segmento `travel`.
- **009**: `frozen.quote_id`; o check-in também pode vir de "cheguei".
- **024**: `discovery_listing.service_area`.
- **025**: `kind = vehicle`.

## Invariantes

1. Sem taxa de deslocamento: o preço é o do serviço ou o do orçamento.
2. Os segmentos `travel` usam a PK de células e nunca se sobrepõem. Atendimentos seguidos no mesmo endereço não têm segmento entre si.
3. O colaborador só lê o endereço de atendimentos atribuídos a ele, do dia e não encerrados, e cada leitura é registrada.
4. Agendamento vindo de orçamento tem `price_snapshot_cents` igual a `quotes_quote.price_cents`.
5. Orçamento fora de `valid` não pode ser aceito.
6. As fotos não guardam EXIF e são apagadas 90 dias depois do fim do pedido, salvo se ele virou agendamento.
7. Todas as etapas de um combo têm o mesmo local.
