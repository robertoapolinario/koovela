# Data Model: Negócio, filiais e onboarding (005)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono: `tenancy`. Tabelas no schema do tenant `t_<hex32>` com prefixo `tenancy_`, salvo indicação. UUIDv7 em `BINARY(16)`; instantes `DATETIME(6)` UTC; dinheiro em centavos `BIGINT` + `currency CHAR(3)`. 🔒 cifrado por campo, 🔎 com HMAC de busca.

---

## 1. Schema do tenant

### `tenancy_client_profile` (uma linha por tenant)

| Coluna | Regra |
|---|---|
| `tenant_id` | PK |
| `person_type` | `individual` \| `company` |
| `document` | 🔒 🔎 CPF ou CNPJ, dígito verificador |
| `legal_name`, `trade_name` | Razão social ou nome; nome fantasia |
| `fiscal_address` | 🔒 JSON (CEP, rua, número, complemento, bairro, cidade, UF) |
| `onboarding_path` | `solo` \| `network` |
| `acquisition_channel` | `organic` \| `qr_link` \| `partner` \| `sales` \| `paid_ads` \| `other`; `acquisition_ref` (UTM ou código de parceiro da 038), gravado no cadastro (análise da 023) |
| `created_at`, `updated_at` | — |

### `tenancy_business`

| Coluna | Regra |
|---|---|
| `business_id` | PK |
| `name` | 1 a 80 caracteres |
| `vertical_code` | FK lógica para `tenancy_vertical` (global) |
| `slug` | Cópia do slug ativo (fonte da verdade no registro global) |
| `description` | Até 1.000 caracteres |
| `logo_media_id`, `cover_media_id` | Mídia em `cdn.koovela.com` |
| `geo_point` | `POINT SRID 4326` (principal) |
| `price_display` | `public` \| `never` (copiado da vertical) |
| `booking_fee_cents`, `booking_fee_currency` | Só saúde; dentro da faixa do back-office |
| `payee_level` | `business` (padrão) \| `branch` (futuro, PEN-11) |
| `state` | `draft` → `published` ↔ `unpublished` |
| `published_at` | — |

### `tenancy_branch`

| Coluna | Regra |
|---|---|
| `branch_id` | PK |
| `business_id` | FK |
| `name` | — |
| `address` | 🔒 JSON |
| `geo_point` | Real; `public_geo_point` = centróide do bairro quando oculto |
| `address_visibility` | `full` \| `neighborhood` |
| `accessibility` | Lista declarada (`step_free_access` \| `accessible_restroom` \| `parking` \| `elevator`), vai no evento da filial para a vitrine (024) |
| `contact_phone` | 🔒 |
| `timezone` | IANA, padrão `America/Sao_Paulo` |
| `slug` | Opcional; UNIQUE dentro do negócio |
| `state` | `draft` → `active` ↔ `paused` · `active`/`paused` → `closed` (sem agendamentos futuros) |
| `cloned_from_branch_id` | NULL ou origem |

### `tenancy_opening_hours`

`branch_id`, `weekday` (1–7), `start_local` (`TIME`), `end_local` (`TIME`); PK `(branch_id, weekday, start_local)`; intervalos sem sobreposição no mesmo dia.

### `tenancy_hours_exception`

`exception_id`, `branch_id`, `date` (local), `kind` (`closed` \| `special_hours`), `intervals` (JSON de pares locais), `source` (`suggested_holiday` \| `manual`), `holiday_code`, `confirmed` (bool).

### `tenancy_terms_acceptance` (append-only)

`acceptance_id`, `document_type` (`terms` \| `privacy`), `version`, `document_sha256`, `person_id`, `ip`, `device`, `accepted_at`.

### `tenancy_onboarding_progress`

`tenant_id`, `path`, `steps` (JSON: `{ account, business, branches, services, hours_team, payee_kyc_nfse } → done | pending | optional`), `current_step`, `updated_at`.

### `tenancy_publication_readiness`

`business_id` (PK), `terms_ok`, `has_published_service`, `has_professional_with_hours`, `kyc_approved`, `subscription_state`, `updated_at`. Publicar exige os três primeiros.

### `tenancy_page_visit_daily`

`business_id`, `branch_id` (NULL = página do negócio), `source` (`link` \| `qr` \| `direct`), `date`, `visits`. PK com os quatro primeiros + `date`.

### `tenancy_audit_outbox`

Conforme a spec 004.

## 2. Espaço global `koovela_platform` (dono `tenancy`)

### `tenancy_slug_registry`

| Coluna | Regra |
|---|---|
| `slug` | PK (UNIQUE global) |
| `kind` | `business` (filial é única só dentro do negócio e não usa este registro) |
| `tenant_id`, `business_id` | — |
| `state` | `reserved` \| `active` \| `redirect` \| `blocked` |
| `redirect_to` | Slug atual quando `redirect` |
| `changed_by`, `change_reason`, `changed_at` | Troca pelo Suporte |

Um slug com estado `redirect` ou `blocked` nunca volta a `reserved` para outro negócio (REQ-NEG-042).

### `tenancy_reserved_term`

`term` (PK), `kind` (`route` \| `offensive` \| `trademark`), `added_by`, `added_at`.

### `tenancy_vertical`

`vertical_code` (PK), `cluster` (`A` \| `B` \| fases 2 e 3), `category`, `vocabulary` (JSON: `customer_label`, `appointment_label`…), `default_fields` (JSON), `price_display` (`public` \| `never`), `health_restrictions` (bool), `phase`, `enabled`.

### `tenancy_terms_document`

`document_type`, `version`, `url`, `sha256`, `effective_at`; PK `(document_type, version)`.

### `platform_setting` (chave `health_booking_fee`)

`{ default_cents, min_cents, max_cents, currency }`, versionado, editado no back-office.

## 3. `koovela_projections.business_slug` (dono `tenancy`, alimentada por evento)

`slug` (PK), `tenant_id`, `business_id`, `state`, `redirect_to`, `updated_at`. Lida pelo gateway (cache Redis `slug:{slug}`, TTL 5 min, invalidado por evento).

## 4. Estados

| Entidade | Transições |
|---|---|
| Negócio | `draft` → `published` (exige prontidão) · `published` ↔ `unpublished` · encerrar a última filial ativa → `unpublished` |
| Filial | `draft` → `active` ↔ `paused` · `active`/`paused` → `closed` (sem agendamentos futuros; link redireciona para o negócio) |
| Slug | `reserved` → `active` → `redirect` · qualquer → `blocked` |
