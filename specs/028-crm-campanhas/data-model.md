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

## `crm_policy` (plataforma, `koovela_platform`; versionada no back-office; CONST 8)
`version_id`, `per_consumer_limit` (2), `per_consumer_window_days` (7), `attribution_window_days` (7), `reactivation_days` (60), `pause_unsubscribe_bps` (200), `pause_bounce_bps` (500), `effective_from`, `approved_by`. Valores entre parênteses só no seed.

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
6. Nenhum limite, janela ou gatilho de pausa no código: tudo vem de `crm_policy`.
7. Desconto da campanha gravado em `scheduling_appointment.campaign_discount_cents` (009) e tratado no split e na comissão como desconto do estabelecimento (012, [D17]).
8. Retenção pela tabela da 022: `crm_sends` (12 meses) e `marketing_consents` (válido + 5 anos); quem pede eliminação nunca entra em segmento.
9. Abertura de e-mail medida pelo `notification` em `news.koovela.com`, sem terceiros, sem guardar IP, só agregada por campanha.
10. Cota do CRM separada da cota transacional da 019.
