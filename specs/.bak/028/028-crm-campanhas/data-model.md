# Data Model: CRM e campanhas (028)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono `engagement` (submódulo `crm`); schema do tenant. Envio pelo `notification` (011).

---

## `engagement_marketing_consent` (substitui `scheduling_offer_optin` da 014)
`consumer_id`, `business_id`, `channel` (`push` \| `email` \| `sms`), `text_version`, `granted_at`, `device`, `origin` (`confirmation` \| `profile` \| `offer`), `revoked_at`, `consent_ref` (registro central da 022). Só titulares com conta.

## `crm_segment`
`segment_id`, `name`, `rules` (JSON: `days_since_last`, `visits`, `spend_12m_cents`, `service_ids`, `professional_id`, `branch_id`, `tags`, `tier`, `no_shows`, `birthday_this_month`), `suggested_key`, `branch_scope` (Gerente), `created_by`.

## `crm_campaign`

| Coluna | Regra |
|---|---|
| `campaign_id`, `name`, `segment_id` | — |
| `channels` | `push` \| `email` \| `sms` (WhatsApp proibido) |
| `content` | Texto por canal com variáveis; `email_image_media_id` |
| `offer` | `{service_ids, discount_bps \| discount_cents, valid_until}` opcional |
| `schedule_at` | NULL = imediato |
| `state` | `draft` → `scheduled` → `sending` → `sent` \| `paused` → `sending` \| `cancelled` |
| `blocked_reason` | Conteúdo bloqueado / saúde com preço |
| `overage_confirmed` | bool |
| `audience_snapshot` | Contagens no envio |

## `crm_send` (por consumidor e canal)
`send_id`, `campaign_id` \| `automation_id`, `consumer_id`, `channel`, `notification_request_id`, `state` (`queued` \| `skipped_quiet` \| `skipped_limit` \| `skipped_quota` \| `sent` \| `delivered` \| `bounced` \| `opened` \| `clicked` \| `unsubscribed` \| `complained`), `link_token_id`. UNIQUE `(campaign_id, consumer_id, channel)`.

## `crm_attribution`
`appointment_id`, `campaign_id`, `send_id`, `kind` (`link` \| `window`), `revenue_cents`, `discount_cents`, `reactivation` (bool).

## `crm_automation`
`automation_id`, `kind` (`lapsed` \| `birthday` \| `no_return_after_first`), `n_days`, `channels`, `content`, `offer`, `monthly_limit`, `enabled`. `crm_automation_fire`: UNIQUE `(automation_id, consumer_id, cycle_key)`.

## `crm_tenant_health`
`tenant_id`, `paused_for_review`, `reason`, `reviewed_by`, `reviewed_at`.

## Plataforma — `billing_plan_version` (019) — extensão
`crm_quota` (por canal), `crm_overage_cents` (por canal).

## Invariantes

1. Nenhum envio sem consentimento vigente no momento do envio.
2. Menores e atendidos nunca recebem.
3. Sem WhatsApp em campanhas.
4. Em saúde, nenhum preço, desconto ou promoção de preço.
5. Automação: uma vez por ciclo por consumidor.
