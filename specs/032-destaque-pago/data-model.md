# Data Model: Destaque pago na vitrine (032)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono `discovery` (submódulo `sponsored`); schema global `koovela_discovery`. Cobrança em `billing` (`koovela_platform`, 019). Dinheiro em centavos; dias em America/Sao_Paulo.

---

## `discovery_sponsored_offer_version` (imutável; PEN-30)

| Coluna | Regra |
|---|---|
| `version_id` | PK |
| `scope_kind`, `region_id`, `city_ibge`, `category` | `region_category` \| `city_category` \| `category` \| `all`; resolve do mais específico ao mais geral |
| `capacity` | Espaços simultâneos (padrão inicial de configuração 3; nenhum valor no código) |
| `packages` | Lista `{ package_code, duration_days, price_cents }` (> 0) |
| `visible_items` | `{ web, app }` (ASSUMIDO 3 e 2) |
| `free_cancel_hours` | Prazo de cancelamento com reembolso integral (valor inicial de configuração 48; nenhum valor no código) |
| `effective_from` | Vale para compras a partir daí |
| `state` | `proposed` → `approved` \| `rejected`; `approved` → `superseded` |
| `requested_by`, `approved_by` | Aprovação pelo `dual_control` da 021 (`kind = sponsored_offer`) quando proposto pelo Comercial/Growth |

## `discovery_sponsored_inventory_day`
`region_id`, `category`, `day` — PK composta; `sold` (≥ 0). Invariante: `sold ≤ capacity` da versão vigente no momento de cada venda.

## `discovery_sponsorship` (destaque comprado)

| Coluna | Regra |
|---|---|
| `sponsorship_id` | PK; chave de idempotência da cobrança |
| `tenant_id`, `business_id`, `branch_id` | Por filial |
| `region_id`, `category` | Bairro e categoria |
| `offer_version_id`, `package_code`, `duration_days`, `free_cancel_hours` | Congelados na compra |
| `price_cents_paid` | Congelado (REQ-DST-032) |
| `starts_on`, `ends_on` | `ends_on = starts_on + duration_days - 1`; pode ser estendido por compensação |
| `state` | ver abaixo |
| `pause_reason` | `left_showcase` \| `unpublished` \| `no_slots` \| `subscription_suspended` \| `moderation` |
| `paused_days` | Dias acumulados em pausa |
| `billing_invoice_id`, `refunded_cents` | Ligação com 019 |
| `purchased_by`, `purchased_at`, `cancelled_at`, `hold_expires_at` | — |

**Estados**: `pending_payment` (técnico, 15 min) → `reserved` \| `expired` · `reserved` → `active` \| `cancelled` · `active` ↔ `paused` · `active`/`paused` → `ended` · `active` → `partially_refunded` (região fechada; terminal).

## `discovery_sponsorship_transition` (auditoria)
`sponsorship_id`, `from_state`, `to_state`, `reason`, `actor_type` (`owner` \| `admin` \| `system`), `actor_id`, `occurred_at`.

## `discovery_sponsored_daily_stats` (agregado)
`sponsorship_id`, `day`, `impressions`, `clicks`, `visits`, `bookings`, `completed_revenue_cents` — PK `(sponsorship_id, day)`. Sem identificador de consumidor.

## `discovery_sponsored_attribution`
`appointment_id` (PK), `sponsorship_id`, `tenant_id`, `day`, `state`, `amount_cents` — só referência do agendamento, sem consumidor; idempotente por `appointment_id`.

## Extensões em outras specs (aditivas)

- **009** `scheduling_appointment.origin`: valor `discovery` (já previsto na 024) + `scheduling_appointment.origin_ref` opcional (`sponsored:<sponsorship_id>`), registrado no `data-model.md` da 009.
- **019** `billing_invoice.kind`: `cycle` (existente) \| `one_off`; item `usage:sponsored_slot` com `source_kind = sponsorship`, `source_id = sponsorship_id`.
- **024** resposta de busca/home: campo `sponsored` separado de `results`.

## Invariantes

1. A lista orgânica (`results`) é idêntica com ou sem destaques; o pipeline orgânico não lê tabelas `sponsored`.
2. Por região, categoria e dia: `sold ≤ capacity`.
3. Preço pago nunca muda após a compra.
4. 100% dos itens da faixa com `sponsored: true` e selo; nenhum preço em saúde.
5. Estatísticas e atribuições nunca identificam consumidores.
6. Toda transição, mudança de inventário e de preço é auditada.
7. Token de atribuição só na navegação, sem cookie nem armazenamento no aparelho.
8. Retenção pela tabela da 022: `sponsored_attribution` (5 anos, como fatos financeiros), aplicada pelo port do `discovery`.
