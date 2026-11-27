# Data Model: Educação — aulas avulsas recorrentes (034)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono: `scheduling` (submódulo `lessons`, mais extensões de `series` e `classes`), no schema do tenant. Dinheiro em centavos. 🔒 = cifrado por envelope.

---

## `lessons_settings_version` (imutável)

| Coluna | Regra |
|---|---|
| `version_id` | PK |
| `target_kind`, `target_id` | `service` (individual) ou `class_group` (turma) |
| `enabled` | — |
| `frequencies` | Subconjunto de `weekly` (padrão) e `every_2_weeks` |
| `ends_on` | Opcional |
| `payment_modes` | Subconjunto de `charge_per_lesson` e `package`; ao menos um |
| `effective_from`, `author_id` | — |

Schema fechado: não existe campo de matrícula, taxa, período mínimo nem multa de saída. Só vale em negócio da vertical educação.

## `scheduling_series` (013), extensões
- `kind`: `standard` (v1.0) ou `lesson`.
- `subject_id`: atendido (025); `self` na v1.0. O limite e a sobreposição passam a ser por `(consumer_id, subject_id)`.
- `payment_mode`: ganha o valor `charge_per_lesson`.
- `lesson_terms_version`, `lesson_terms_accepted_at`: obrigatórios quando `kind = lesson`.

## `scheduling_series_rule_version` (013), extensões
- `item_kind`: ganha o valor `class_group`, com `item_id = group_id`.

## `scheduling_series_occurrence` (013), extensões
- `enrollment_id`: alternativa a `appointment_id` quando `item_kind = class_group`. Exatamente um dos dois é preenchido na materialização.
- `skip_reason`: ganha o valor `recess`.

## `scheduling_branch_recess`
`recess_id`, `branch_id`, `starts_on`, `ends_on` (inclusivo), `reason`, `declared_by`, `declared_at`, `state` (`active` ou `revoked`). Revogar não recria ocorrências já puladas: a materialização seguinte volta a incluir as datas futuras.

## `lessons_record`

| Coluna | Regra |
|---|---|
| `record_id` | PK |
| `appointment_id` ou `enrollment_id` | Exatamente um dos dois; UNIQUE |
| `series_id`, `subject_id`, `holder_consumer_id` | Leitor do lado do consumidor: o próprio ou o responsável |
| `instructor_id`, `branch_id` | — |
| `body` 🔒 | Até 1.000 caracteres, sem anexos |
| `state` | `saved` → `closed` (24 h) |
| `editable_until`, `key_ref` | Crypto-shredding (020/022) |
| `created_at`, `updated_at` | — |

## `lessons_terms_version` (global, `koovela_platform`)
`version`, `text` ("sem matrícula; falta não tem reposição" e detalhes), `effective_from`.

## Invariantes

1. Nenhuma falta ou cancelamento do aluno cria ocorrência, agendamento ou crédito.
2. Aula cancelada pela escola ou por recesso não é cobrada: o estorno é integral ou a reserva de crédito é revertida. Isso não conta como falta.
3. Toda série `lesson` tem aceite do aviso gravado com a versão.
4. Vaga em turma nunca excede a capacidade (PK de assento da 026).
5. Limite e sobreposição de séries contados por atendido.
6. O registro de aula de um aluno só é lido pelo próprio aluno ou responsável, pelo instrutor autor e pelo Proprietário.
7. Sempre 4 ocorrências futuras materializadas para série ativa (013).
