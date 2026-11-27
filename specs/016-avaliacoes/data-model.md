# Data Model: Avaliações (016)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `engagement` (submódulo `reviews`); schema do tenant, salvo a projeção da vitrine.

---

## `reviews_review`

| Coluna | Regra |
|---|---|
| `review_id` | PK |
| `appointment_id` | UNIQUE (uma por atendimento) |
| `consumer_id`, `business_id`, `branch_id`, `item_id`, `professional_id` | Do atendimento; em combo com troca (030), `professional_id` é NULL e a nota por profissional vai a cada profissional das etapas (uma entrada por etapa em `rating_summary` com `scope = professional`) |
| `rating` | 1–5 |
| `tags` | Subconjunto de `punctuality`, `service`, `result`, `ambience` |
| `comment` | ≤ 1.000 caracteres |
| `author_display` | "Ana S." (gerado); vira "cliente Koovela" quando o consumidor exclui a conta |
| `service_month` | AAAA-MM |
| `state` | `submitted` → `held` → `scheduled` → `published` \| `private` \| `removed` |
| `publish_at` | Envio + 48 h |
| `editable_until` | Conclusão + 14 dias |
| `hold_reason` | `offensive` \| `personal_data` \| `health_terms` \| `volume_spike` |
| `removed_by` | `consumer` \| `moderation` |
| `edited_at` | Última edição pelo consumidor; com resposta já publicada, a avaliação mostra "editada" |
| `removed_at` | Remoção; retenção de 5 anos depois dela, para auditoria |

## `reviews_reply`
`review_id` (PK, uma por avaliação), `author_id`, `author_role` (`owner` \| `branch_manager` \| `professional`), `body` (≤ 1.000), `editable_until` (+24 h).

## `reviews_report` (denúncia)
`report_id`, `review_id`, `reporter_id`, `reason` (`offensive` \| `personal_data` \| `health_data` \| `unrelated` \| `conflict_of_interest` \| `spam`), `due_at` (3 dias úteis), `state` (`open` → `upheld` (removida) \| `rejected`), `moderator_id`, `decision_note`.

## `reviews_rating_projection` (tenant)
`scope` (`business` \| `branch` \| `professional`), `scope_id`, `sum_12m`, `count_12m`, `updated_at`.

## `reviews_settings`
`business_id`, `show_reviews_on_page` (padrão `true`; ignorado em saúde).

## Global — `koovela_platform.engagement_rating_summary`
`tenant_id`, `scope`, `scope_id`, `average_x10`, `count_12m` — sem texto nem autor; só negócios com página pública ligada e fora da saúde.

## Global — `koovela_platform.review_moderation_terms` (versionado)
Lista de termos ofensivos e de saúde, editada no back-office.

## Invariantes

1. Uma avaliação por atendimento concluído.
2. Saúde nunca pública nem na vitrine.
3. Média só com ≥ 5 avaliações em 12 meses.
4. Eventos sem texto nem autor.
5. Estabelecimento nunca edita nem remove.

## `reviews_vendor_flag` (análise da 035)
`tenant_id`, `business_id`, `reason` (`vendor_cancelled_event`), `source_id`, `created_at`. Só para a Gestão e o antifraude (021); não afeta a nota pública.
