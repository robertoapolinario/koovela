# Data Model: Atendidos — dependentes e pets (025)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono `identity` (submódulo `subjects`), schema global `koovela_identity`; snapshot por agendamento no tenant. 🔒 = cifrado por envelope.

---

## `service_subject`

| Coluna | Regra |
|---|---|
| `subject_id` | PK |
| `holder_consumer_id` | Titular |
| `kind` | `minor` \| `adult_dependent` \| `pet` |
| `state` | `active` → `archived`; `minor` → `adult_dependent` (18 anos) → `independent` |
| `display_name` 🔒 (menor) / claro (pet, adulto) | — |
| `birth_date` 🔒 (menor) / `birth_month` (pet) | — |
| `phone_e164` | Só adulto dependente, opcional |
| `linked_consumer_id` | Quando assume conta própria |
| `archived_reason` | `deceased` \| `rehomed` \| `unlinked` \| `refused_by_adult` |

Limite: ≤ 10 pessoas e ≤ 10 pets `active` por titular.

## `service_subject_pet`
`subject_id`, `species` (`dog` \| `cat`), `breed`, `size` (`P` \| `M` \| `G` \| `GG`), `coat` (`short` \| `medium` \| `long` \| `double`), `photo_media_id`, `handling_notes` (≤ 300; sem dado clínico).

## `service_subject_guardian`
`subject_id`, `consumer_id`, `role` (`holder` \| `co_guardian`), `invited_at`, `accepted_at` (OTP), `removed_at`.

## `service_subject_declaration`
`subject_id`, `kind` (`legal_guardian_minor` \| `adult_authorization`), `text_version`, `declared_at`, `device`, `ip`, `consent_ref` (registro central da 022).

## Tenant — `appointment_subject_snapshot`
`appointment_id`, `subject_id`, `kind`, `display_name`, `age_years`, `birth_date` (só saúde), `guardian_name`, `guardian_phone`, `pet_species`, `pet_breed`, `pet_size`, `pet_coat`, `handling_notes`, `paid_by_consumer_id`.

## Catálogo (006) — extensões
`catalog_service.accepted_subjects` (`self`, `minor{min_age,max_age}`, `adult_dependent`, `pet{species}`); `catalog_duration_rule_version` (`base_by_size`, `extra_by_coat`, `price_by_size_cents`).

## Invariantes

1. Pet sem campos clínicos.
2. Estabelecimento recebe só o snapshot permitido por tipo.
3. Snapshot congelado: mudanças no atendido não alteram agendamentos passados.
4. Quem agendou paga e acumula pontos.
5. Duração do pet = base(porte) + acréscimo(pelagem), arredondada a 5 min acima.
