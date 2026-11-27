# Data Model: Notificações multicanal (011)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `notification`. Instantes UTC.

---

## Global — `koovela_platform`

| Tabela | Campos principais |
|---|---|
| `notification_type` | `code` (PK), `source_event`, `recipients` (`consumer` \| `professional` \| `reception` \| `owner`), `group` (`essential` \| `reminders` \| `post_service` \| `staff` \| `security`), `urgent`, `allowed_channels` |
| `notification_template_version` | `code`, `channel`, `locale`, `version`, `body` (MJML/texto), `variables` (schema), `whatsapp_template_name`, `valid_from` |
| `notification_channel_policy` | `scope` (tipo ou grupo), `order` (JSON), `fallback_rules`, `version` |
| `notification_limit` | `scope` (`global` \| `tenant`), `channel`, `daily_max` |

## Global — `koovela_identity` (tabelas do `notification`)

| Tabela | Campos principais |
|---|---|
| `notification_preference` | `subject_kind` (`consumer` \| `staff`), `subject_id`, `group`, `channels` (JSON); essenciais nunca vazios |
| `notification_destination` | `subject_id`, `channel`, `address_ref` (token de push, endpoint Web Push; e-mail e celular são referências à conta da 003), `state` (`valid` \| `suspended`), `suspend_reason` |
| `notification_inbox_item` | `consumer_id`, `tenant_id`, `type_code`, `title`, `body` (sem dado sensível), `link`, `created_at`, `read_at` |
| `notification_unsubscribe` | `subject_id`, `group`, `channel`, `at` |

## Schema do tenant

| Tabela | Campos principais |
|---|---|
| `notification_settings` (por negócio) | `reminders` (até 3, 30 min–72 h; padrão 24 h e 2 h), `quiet_start`, `quiet_end` (padrão 21h–8h), `short_note` (≤ 140), `discreet_service_ids`, `owner_daily_digest` |
| `notification_message` | `message_id`, `type_code`, `recipient_kind`, `recipient_id`, `appointment_id`, `source_event_id`, `idempotency_key` (UNIQUE: evento + destinatário + canal), `rendered_ref` |
| `notification_delivery` | `delivery_id`, `message_id`, `channel`, `provider`, `state` (`scheduled` → `sent` → `delivered` \| `failed` \| `opened`), `failure_reason`, `at_*` |
| `notification_scheduled_reminder` | `reminder_id`, `appointment_id`, `due_at`, `state` (`scheduled` \| `sent` \| `cancelled`), `index` (1–3) |
| `notification_manage_link` | `token_hash` (PK), `appointment_id`, `expires_at` (+24 h do horário), `revoked_at`, `uses` |
| `notification_attendance_confirmation` | `appointment_id` (PK), `confirmed_at`, `channel` |
| `notification_usage_daily` | `date`, `channel`, `sent`, `billable` (para a fatura da 019) |

## Estados

- Entrega: `scheduled` → `sent` → `delivered` \| `failed` (→ próximo canal da política) \| `opened`.
- Lembrete: `scheduled` → `sent` \| `cancelled` (cancelamento, remarcação, troca).
- Destino: `valid` ↔ `suspended` (bounce, spam, número inválido).
