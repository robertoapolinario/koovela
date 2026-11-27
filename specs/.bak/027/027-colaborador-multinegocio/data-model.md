# Data Model: Colaborador em vários negócios (027)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Vínculos por tenant (007). Projeções do colaborador em `koovela_projections` (servidas só à própria pessoa).

---

## `koovela_identity.pro_preferences` (por pessoa)
`person_id`, `cross_block_enabled` (padrão `false`; só a pessoa altera), `tenant_colors` (map tenant → cor), `global_profile` (nome profissional, bio, foto), `updated_at`.

## Tenant — `workforce_profile_override`
`engagement_id`, `display_name`, `bio`, `photo_media_id` (sobrepõem o perfil global naquele negócio).

## `koovela_projections.pro_unified_agenda`
`person_id`, `tenant_id`, `business_display`, `color`, `item_kind` (`appointment` \| `class_session` \| `external_block` \| `time_off`), `item_id`, `starts_at`, `ends_at`, `service_name`, `subject_label` (primeiro nome ou "pet"), `state`, `updated_at`. Sem contato do consumidor.

## `koovela_projections.pro_conflict`
`conflict_id`, `person_id`, `a_tenant_id`, `a_item_id`, `b_tenant_id`, `b_item_id`, `overlap_from`, `overlap_to`, `state` (`open` → `closed`), `closed_by_kind` (`rescheduled` \| `professional_changed` \| `cancelled` \| `engagement_ended`), `closed_at`.

## Tenant — `scheduling_occupancy` (008) — uso
`kind = external_block`, `source_person_id`, `source_occupancy_ref` (opaco, sem tenant de origem), sem detalhes.

## Tenant — `scheduling_external_conflict_flag`
`appointment_id`, `overlap_from`, `overlap_to`, `state` (`open` \| `closed`) — o que o tenant vê ("compromisso fora deste negócio").

## Invariantes

1. Um tenant nunca recebe o id de outro tenant nem detalhes de outro vínculo.
2. Conflito só fecha por ação de uma pessoa ou fim de vínculo.
3. `external_block` só existe com `cross_block_enabled = true` da pessoa.
4. Ações em atendimento sempre no contexto do tenant dono.
