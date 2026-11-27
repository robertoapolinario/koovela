# Data Model: Fila de espera e horário ocioso (014)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `scheduling` (submódulos `waitlist` e `idle`); schema do tenant. Desconto em pontos-base; dinheiro em centavos.

---

## `scheduling_waitlist_entry`

`entry_id`, `business_id`, `branch_id`, `consumer_id`, `item_kind`, `item_id`, `professional_id` (NULL = qualquer), `period_from`, `period_to` (≤ 30 dias), `day_window` (faixa ou horário específico), `queued_at` (ordem), `state` (`active` → `offered` → `fulfilled` \| `cancelled` \| `expired` \| `closed_auto`).

Limite: ≤ 3 `active` por consumidor e negócio.

## `scheduling_slot_offer`

| Coluna | Regra |
|---|---|
| `offer_id` | PK |
| `kind` | `waitlist` \| `idle` |
| `branch_id`, `professional_id`, `start_at`, `item_kind`, `item_id` | Horário ofertado |
| `consumer_id`, `entry_id` | Destinatário |
| `round` | Rodada (3 por vez) |
| `expires_at` | 15 min (5 min se < 2 h do início) |
| `discount_bps`, `price_cents` | Só `idle` |
| `offer_group_id` | Agrupa as ofertas do mesmo consumidor e da mesma entrada na mesma rodada (até 3 horários num aviso só); aceitar uma marca as outras do grupo como `declined` |
| `state` | `sent` → `accepted` \| `lost` (já preenchido) \| `expired` \| `declined` |
| UNIQUE | `(branch_id, professional_id, start_at, consumer_id)` |

## `scheduling_idle_rule_version` (por negócio, imutável)

`version_id`, `business_id`, `enabled`, `service_ids`, `professional_ids`, `weekdays`, `time_windows`, `lead_min_hours`, `lead_max_hours`, `discount_bps`, `eligible_since_days`, `max_offers_per_consumer_week`, `valid_from`, `author_id`. Validada contra os limites do back-office (`koovela_platform.idle_platform_limits`).

## `scheduling_offer_optin`

`consumer_id`, `business_id`, `channel` (`push` \| `sms` \| `email`; **nunca `whatsapp`**, proibido para promoções pela CONST 5 e REQ-NOT-005), `text_version`, `device`, `opted_in_at`, `opted_out_at`. Padrão: sem linha = sem opt-in.

**Provisória**: a spec 028 substitui esta tabela por `engagement_marketing_consent` (expandir → migrar → contrair, T005 da 028). O scanner e as rotas leem o consentimento só pela interface `OfferConsent`, para que a troca não os afete.

## `scheduling_waitlist_settings`

`business_id`, `auto_offer_enabled` (padrão `true`).

## Global — `koovela_platform.idle_platform_limits` (versionado)

`max_discount_bps`, `lead_min_hours`, `lead_max_hours`, `max_offers_per_week`, `eligible_since_days`, `disabled_verticals`. Valores iniciais (5000 bps, 2 h, 48 h, 2 por semana, 180 dias, saúde) entram como **seed versionado no back-office**, não como constantes no código (CONST 8).

## Invariantes

1. Nunca duas ofertas do mesmo horário para a mesma pessoa.
2. Só um aceite vence por horário (garantido pela célula da 008).
3. Oferta `idle` só para quem tem opt-in naquele estabelecimento e canal.
4. Sem regra `idle` em saúde.
