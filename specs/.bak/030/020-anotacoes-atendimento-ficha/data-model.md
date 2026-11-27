# Data Model: Anotações de atendimento e ficha do consumidor (020)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `engagement` (submódulos `care_notes` e `records`); schema do tenant. 🔒 = cifrado por envelope.

---

## `care_settings`
`business_id`, `notes_enabled` (padrão: saúde `true`, beleza `false`), `template_set_id`, `branch_manager_can_read` (liberação do Proprietário, padrão `false`).

## `care_consent_text` (versionado)
`text_version`, `business_vertical`, `body`, `broadens_use` (bool: amplia o uso e exige novo consentimento de quem já deu), `published_at`.

## `care_consent`
Cada pedido gera um registro novo; revogar e consentir de novo cria outro, e o histórico fica guardado.
`consent_id`, `holder_consumer_id`, `business_id`, `text_version`, `state` (`requested` → `granted` \| `refused` \| `no_answer`; `granted` → `revoked`), `granted_at`, `channel` (`app` \| `web` \| `notice_link` \| `counter_otp`), `device_fingerprint`, `ip`, `revoked_at`.

## `care_note`

| Coluna | Regra |
|---|---|
| `note_id` | PK |
| `subject_person_id` | Atendido (v1.0 = consumidor) |
| `holder_consumer_id` | Titular do consentimento |
| `appointment_id`, `author_professional_id`, `branch_id` | — |
| `template_id` | Opcional |
| `body` 🔒 | ≤ 5.000 caracteres |
| `state` | `draft` → `saved` → `closed` (24 h) |
| `editable_until` | `saved_at + 24 h` |
| `key_ref` | Chave do registro (crypto-shredding) |

`care_note_version` (histórico das edições em 24 h, 🔒) · `care_note_addendum` (`addendum_id`, `note_id`, `author_id`, `body` 🔒, `at`) · `care_note_photo` (`photo_id`, `note_id`, `object_ref` (cifrado), `position` 1–5).

## `care_alert`
`alert_id`, `consumer_id`, `business_id`, `author_id`, `body` 🔒 (≤ 140), `state` (`active` → `deactivated`), `deactivated_by`, `deactivated_at`.

## `records_consumer_profile` (ficha, não sensível)
`consumer_id`, `business_id`, `preferred_name`, `preferred_professional_id`, `operational_note` (≤ 500), `tags`.

## `records_consumer_summary` (projeção por filial)
`consumer_id`, `branch_id`, `last_visit_at`, `visits_12m`, `spend_12m_cents`, `no_shows_12m`, `active_series`, `package_balances`, `loyalty_points`, `loyalty_tier`, `reviews_count`, `has_active_alert`, `last_visit_any_branch_at` (retenção).

## Invariantes

1. Sem `care_consent.granted` → nenhuma anotação ou alerta gravado.
2. Conteúdo nunca em claro no banco, em log, em evento ou em índice de busca.
3. Toda leitura de anotação gera registro na trilha (sem conteúdo).
4. `closed` nunca muda; só adendos.
5. Retenção de 5 anos após o último atendimento no negócio (ou o prazo maior definido pelo estabelecimento, 022); ao vencer, o Proprietário decide (eliminar ou manter com justificativa, `[C4]`); sem resposta em 30 dias, crypto-shredding.
6. Alertas seguem a anotação; consentimentos ficam até 5 anos depois da última anotação ou alerta.
7. "Atende o cliente" = agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses com o consumidor, no negócio.
