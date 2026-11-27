# Data Model: Equipe, escalas e comissão (007)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `workforce`; tabelas `workforce_*` no schema do tenant. UUIDv7; instantes UTC; horas de escala em hora local + fuso da filial; dinheiro em centavos; percentuais em pontos-base (inteiro 0–10000).

---

## Colaborador e vínculo

### `workforce_professional`
`professional_id`, `person_id` (global, `koovela_identity`), `display_name`, `photo_media_id`, `bio` (até 500), `specialties` (JSON), `council` + `registration_number` + `registration_uf` (obrigatórios em saúde para exibição pública), `payee_ref` (spec 012, NULL até cadastrar), `state` (`active` \| `inactive` \| `ended`).

### `workforce_engagement` (vínculo)
`engagement_id`, `professional_id`, `business_id`, `kind` (`clt` \| `pj` \| `commissioned` \| `station_lessee` \| `owner_operator`), `start_date`, `end_date` (NULL), `state` (`active` → `ending` (com data futura) → `ended`).

Recontratação cria novo vínculo para o mesmo `professional_id` / `person_id` (REQ-EQP-063).

## Serviços do colaborador

### `workforce_professional_service`
`professional_id`, `item_kind` (`service` \| `combo`), `item_id`, `active`. Combo só se todas as etapas estiverem na lista (REQ-EQP-012, validado na inclusão e quando a lista muda).

### `workforce_professional_service_override_version` (imutável)
`version_id`, `professional_id`, `service_id`, `duration_min` (NULL = do serviço), `amount_cents` + `currency` (NULL = do serviço/filial), `valid_from`, `status`.

## Escala

### `workforce_schedule`
`schedule_id`, `professional_id`, `branch_id`, `valid_from` (data), `valid_to` (NULL), `status` (`scheduled` \| `current` \| `superseded`).

### `workforce_schedule_interval`
`schedule_id`, `weekday`, `start_local`, `end_local`. Validação: sem sobreposição com outras escalas do mesmo colaborador vigentes na mesma data, em qualquer filial (PEN-04).

### `workforce_schedule_exception`
`exception_id`, `professional_id`, `branch_id`, `date`, `intervals` (JSON local; vazio = não trabalha), `source` (`swap` \| `manual`), `swap_id`.

### `workforce_branch_hours_view` (projeção de `tenancy.branch.hours_changed.v1`)
`branch_id`, `timezone`, `weekly` (JSON), `exceptions` (JSON), `version`.

## Folgas, bloqueios e trocas

### `workforce_time_off`
`time_off_id`, `professional_id`, `branch_id` (NULL = todas), `starts_at`, `ends_at` (UTC), `all_day`, `kind` (`vacation` \| `day_off` \| `absence` \| `block` \| `other`), `reason` (até 200, sem dado de saúde), `origin` (`request` \| `direct`), `state` (`requested` → `approved` \| `rejected` \| `expired`; `direct` já nasce `approved`), `decided_by`, `decided_at`, `decision_reason`.

### `workforce_shift_swap`
`swap_id`, `branch_id`, `proposer_id`, `peer_id`, `date_a`, `date_b`, `state` (`proposed` → `accepted_by_peer` → `approved` \| `rejected` \| `cancelled`), `peer_accepted_at`, `decided_by`.

## Comissão

### `workforce_commission_settings_version` (por negócio, imutável)
`version_id`, `business_id`, `base` (`full` \| `discounted`), `deduct_payment_fees` (bool), `valid_from`, `author_id`.

### `workforce_commission_rule`
`rule_id`, `business_id`, `level` (`business` \| `professional` \| `service` \| `professional_service`), `professional_id`, `service_id`. Única por (nível, chaves).

### `workforce_commission_rule_version` (imutável)
`version_id`, `rule_id`, `rate_bps` (comissão) ou `owner_share_bps` (arrendatário; comissão = 10000 − cota), `floor_cents`, `cap_cents`, `currency`, `valid_from`, `status`, `author_id`.

### `workforce_commission_entry` (projeção para a prévia; lançamentos nunca editados)
`entry_id`, `professional_id`, `appointment_id`, `occurred_on`, `service_id`, `base_cents`, `commission_cents`, `rule_version_id`, `kind` (`accrued` \| `adjustment` \| `transferred`), `ref_entry_id` (ajuste aponta o original).

## Perfil e portfólio

### `workforce_portfolio_photo`
`photo_id`, `professional_id`, `media_id`, `consent_text_version`, `consented_at`, `state` (`pending` \| `approved` \| `rejected`), `decided_by`.

## Estados

| Entidade | Transições |
|---|---|
| Vínculo | `active` → `ending` → `ended` (exige agendamentos posteriores resolvidos; remove o papel na data) |
| Folga | `requested` → `approved` \| `rejected` \| `expired`; `direct` = `approved` |
| Troca | `proposed` → `accepted_by_peer` → `approved` \| `rejected`; qualquer → `cancelled` |
| Escala | `scheduled` → `current` → `superseded` |
