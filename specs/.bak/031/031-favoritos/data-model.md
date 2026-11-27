# Data Model: Favoritos (031)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono `discovery` (submódulo `favorites`); schema global `koovela_discovery`.

---

## `discovery_favorite`
`favorite_id`, `consumer_id`, `target_kind` (`branch` \| `professional`), `branch_id`, `professional_ref` (opaco, da listagem; só quando `professional`), `created_at`. UNIQUE `(consumer_id, target_kind, branch_id, professional_ref)`.

## `discovery_favorite_counter`
`consumer_id` (PK), `count` (≤ 200).

## `discovery_favorite_aggregate` (projeção para o painel)
`tenant_id`, `branch_id`, `professional_ref`, `count` — exibido como "menos de 5" abaixo do limiar.

## Estado derivado (não armazenado)
`active` \| `unavailable` a partir de `discovery_participation.state` e da presença do profissional em `discovery_listing`.

## Invariantes

1. Favoritos nunca no schema de um tenant.
2. ≤ 200 por consumidor.
3. Estabelecimento só vê contagens (supressão abaixo de 5).
4. Favorito não gera consentimento de comunicação.
