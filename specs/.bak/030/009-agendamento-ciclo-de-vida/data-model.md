# Data Model: Agendamento e ciclo de vida (009)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `scheduling`; schema do tenant. UUIDv7; instantes UTC + fuso da filial; dinheiro em centavos.

---

## `scheduling_appointment`

| Coluna | Regra |
|---|---|
| `appointment_id` | PK |
| `business_id`, `branch_id` | — |
| `consumer_id` | Identidade global (003) |
| `subject_id` | NULL = o próprio consumidor; senão, atendido da 025 (menor, adulto dependente ou pet) |
| `professional_id` | — |
| `item_kind`, `item_id` | `service` \| `combo` |
| `start_at`, `end_at`, `timezone` | Janela exibida |
| `state` | `RASCUNHO` \| `PENDENTE_PAGAMENTO` \| `CONFIRMADO` \| `EM_ATENDIMENTO` \| `CONCLUIDO` \| `CANCELADO_USUARIO` \| `CANCELADO_ESTABELECIMENTO` \| `NO_SHOW` \| `REAGENDADO` \| `EXPIRADO` (CHECK) |
| `origin` | `link` \| `qr` \| `direct` \| `manual` \| `series` \| `waitlist` \| `idle_offer` \| `discovery` (vitrine, 024) \| `campaign` (028) (a lista cresce por expandir → migrar nas specs 026, 030, 034 e 035, alinhada a `scheduling_occupancy.origin` da 008) |
| `channel` | `consumer_app` \| `consumer_web` \| `staff_panel` \| `pro_app` |
| `consumer_chose_professional` | bool (para REQ-AGE-034) |
| `note` | 🔒 até 300 caracteres |
| `occupancy_id` | Ocupação (008); combo → ocupação-mãe |
| `rescheduled_from_id` | Original quando remarcado |
| `price_snapshot_cents`, `currency` | Preço congelado |
| `gift_card_applied_cents`, `gift_card_id` | Valor coberto pelo vale-presente (029), gravado na reserva e zerado na devolução; 0/NULL sem vale |
| `campaign_discount_cents`, `campaign_id` | Desconto da oferta de campanha (028), congelado na criação pelo link; 0/NULL sem campanha; não acumula com fidelidade |
| `loyalty_discount_cents`, `loyalty_redemption_id` | Desconto do resgate de fidelidade (015), gravado pelo evento `loyalty.points.reserved.v1` e zerado no `released`; 0/NULL sem resgate |
| `final_amount_cents` | Valor final no check-out ("a partir de") |
| `frozen` | JSON com ids de versão: `service_version_id`, `branch_price_version_id`, `professional_override_version_id`, `commission_rule_version_id`, `commission_settings_version_id`, `policy_version_id`, `loyalty_rule_version_id` |
| `checked_in_at`, `checked_out_at`, `recorded_offline` | — |
| `created_by`, `created_at`, `updated_at` | — |

Índices: `(branch_id, start_at)`, `(professional_id, start_at)`, `(consumer_id, start_at)`.

## `scheduling_appointment_step`

`appointment_id`, `step_index`, `service_id`, `service_version_id`, `start_at`, `end_at`, `occupancy_id`.

## `scheduling_appointment_transition` (append-only)

`transition_id`, `appointment_id`, `from_state`, `to_state`, `actor_type` (`consumer` \| `staff` \| `system` \| `payments`), `actor_id`, `origin`, `reason`, `occurred_at`, `correlation_id`.

## `scheduling_consumer_future_counter`

`business_id` + `consumer_id` (PK), `future_count` (≤ 5 por app e web), travado na transação.

## `scheduling_client_link`

`consumer_id` (PK), `first_appointment_at`, `display_name_cache` (nome de exibição, para busca da Recepção), `pre_registered` (bool).

## `scheduling_pending_record`

`appointment_id` (PK), `local_date`, `resolution` (`checked_in_late` \| `no_show` \| `cancelled` \| NULL), `resolved_by`, `resolved_at`.

## `scheduling_affected_appointment`

`appointment_id`, `cause` (`schedule` \| `time_off` \| `block` \| `swap` \| `branch_hours`), `detected_at`, `resolution` (`rescheduled` \| `professional_changed` \| `cancelled` \| `kept` \| NULL).

## Global: `koovela_projections.consumer_appointments_index` (dono `scheduling`)

`consumer_id`, `tenant_id`, `appointment_id` (PK composta), `business_name`, `business_slug`, `branch_name`, `service_name`, `professional_display_name`, `start_at`, `timezone`, `state`, `allowed_actions` (JSON), `updated_at`. Alimentada por eventos; sem nenhuma PII do consumidor.

## Invariantes (testadas)

1. Só as transições da tabela do research acontecem.
2. `CONCLUIDO` nunca é apagado.
3. Remarcação: nova ocupação e liberação da antiga na mesma transação; o original fica `REAGENDADO` e aponta para o novo.
4. Versões congeladas nunca mudam depois da criação.
5. No máximo 5 futuros por consumidor e estabelecimento pelos canais do consumidor.
