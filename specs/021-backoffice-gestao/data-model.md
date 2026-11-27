# Data Model: Back-office de gestão (021)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `backoffice`; schema `koovela_platform`. Nada lido diretamente dos schemas de tenant.

---

## `bko_tenant_note`
`note_id`, `tenant_id`, `author_id`, `body` (não sensível), `at`.

## `bko_reveal_log` (espelho operacional; a prova fica na trilha 004)
`reveal_id`, `actor_id`, `tenant_id`, `field_ref`, `justification`, `ticket_ref`, `at`.

## `bko_grant`

| Coluna | Regra |
|---|---|
| `grant_id`, `tenant_id` | — |
| `kind` | `trial_days` \| `subscription_discount_pct` \| `subscription_discount_cents` \| `booking_fee_waiver_days` \| `one_off_credit` |
| `value`, `duration` | Dias ou ciclos |
| `reason`, `author_id` | — |
| `state` | `draft` → `awaiting_approval` → `active` → `ended`; `active` → `cancelled` |
| `approved_by`, `no_second_person` | Controle duplo |
| `starts_at`, `ends_at`, `requested_at`, `activated_at` | Métricas |

`bko_grant_limits` (versionado por perfil): `role`, `max_trial_days`, `max_discount_pct`, `max_discount_cycles`, `max_credit_cents`.

## `bko_fraud_rule_version`
`rule_id`, `version`, `signal`, `condition` (JSON declarativo), `window`, `threshold`, `severity`, `auto_action` (`none` \| `hold_points` \| `hold_reviews` \| `limit_attempts`), `enabled`.

## `bko_alert`
`alert_id`, `rule_id`, `rule_version`, `kind`, `severity`, `target_kind` (`consumer` \| `tenant` \| `engagement` (vínculo) \| `payment_method`), `target_id`, `tenant_id`, `evidence_refs`, `group_key` + `group_count` (24 h), `state` (`open` → `investigating` → `action_taken` \| `false_positive`; `action_taken` → `reverted`), `auto_hold_until` (≤ 72 h).

## `bko_action`
`action_id`, `alert_id`, `kind` (`false_positive` \| `hold_points` \| `hold_reviews` \| `block_payment_method` \| `hold_payouts` \| `block_consumer_temp` \| `suspend_tenant`), `reason`, `actor_id`, `expires_at`, `reverted_at`.

## `bko_consumer_block`
`block_id`, `consumer_id`, `generic_reason_code`, `state` (`blocked` → `under_review` → `kept` \| `unblocked`), `review_requested_at`, `review_due_at` (5 dias úteis), `reviewer_id` (≠ quem bloqueou, salvo `no_second_person`).

## `bko_chargeback_case` (complementa 012)
`chargeback_id`, `state` (`opened` → `awaiting_tenant` → `in_defense` → `won` \| `lost`), `tenant_attachments`, `tenant_note`, `complement_due_at` (prazo − 3 dias), `defense_sent_at`.

## `bko_dual_control`
`request_id`, `kind` (`refund_over_limit` \| `consumer_block_review` \| `grant_over_limit` \| `plan_change`), `ref`, `requested_by`, `approved_by`, `no_second_person`, `extra_justification`, `state`.

## `bko_platform_kpi` (projeção, 15 min)
`at`, `active_tenants`, `activated_tenants`, `trialing`, `north_star`, `gmv_cents`, `past_due_cents`, `open_chargebacks`, `open_alerts`, `tech_health`.

## `bko_settings` (versionado; CONST 8)
`version_id`, `onboarding_stall_days` (7), `kyc_stall_business_days` (3), `auto_hold_max_hours` (72; teto fixo — o back-office só reduz, LGPD art. 20), `block_review_business_days` (5), `complement_lead_days` (3), `defense_alert_days` (2), `alert_group_hours` (24), `refund_dual_control_limit_cents` (50000), `kpi_refresh_minutes` (15), `effective_from`, `approved_by`. Valores entre parênteses só no seed. O alerta de chargeback acima de 1% é uma regra semeada em `bko_fraud_rule_version` (`threshold` em pontos-base).

## `bko_settings` (versionado; CONST 8)
`version_id`, `onboarding_stall_days` (7), `kyc_stall_business_days` (3), `auto_hold_max_hours` (72; teto fixo — o back-office só reduz, LGPD art. 20), `block_review_business_days` (5), `complement_lead_days` (3), `defense_alert_days` (2), `alert_group_hours` (24), `refund_dual_control_limit_cents` (50000), `kpi_refresh_minutes` (15), `effective_from`, `approved_by`. Valores entre parênteses só no seed. O alerta de chargeback acima de 1% é uma regra semeada em `bko_fraud_rule_version` (`threshold` em pontos-base).

## `bko_cnpj_cache`
`cnpj_hash`, `status`, `legal_name`, `fetched_at` (7 dias).

## Invariantes

1. Ação automática nunca bloqueia consumidor nem suspende tenant; retenção ≤ 72 h.
2. Toda decisão tem motivo e registro na trilha.
3. Revisão de bloqueio e estorno acima do limite por segunda pessoa (ou marcado).
4. Nenhum acesso a anotações ou alertas de cuidado.
5. Ação sobre colaborador limitada ao vínculo no tenant.
6. Nenhum prazo ou limite no código: tudo vem de `bko_settings`, `bko_grant_limits` ou `bko_fraud_rule_version`.
7. Retenção: alertas, evidências e ações por 5 anos após o encerramento; bloqueios e revisões por 5 anos; observações internas por relação + 2 anos; `bko_reveal_log` por 5 anos.
6. Nenhum prazo ou limite no código: tudo vem de `bko_settings`, `bko_grant_limits` ou `bko_fraud_rule_version`.
7. Retenção: alertas, evidências e ações por 5 anos após o encerramento; bloqueios e revisões por 5 anos; observações internas por relação + 2 anos; `bko_reveal_log` por 5 anos.
