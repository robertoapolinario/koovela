# Data Model: Fechamento financeiro e repasses (018)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Dono `payments` (submódulo `settlement`); schema do tenant. Centavos inteiros.

---

## `settlement_settings`
`business_id`, `period_kind` (`weekly` \| `biweekly` \| `monthly`), `dispute_window_days` (1–10, padrão 3), `approval_delegated_to_branch_manager` (bool).

## `settlement_period`
`period_id`, `business_id`, `starts_on`, `ends_on`, `state` (`open` → `generated` → `closed`), `closed_by`, `closed_at`.

## `settlement_statement` (por colaborador e período)

| Coluna | Regra |
|---|---|
| `statement_id` | PK |
| `period_id`, `professional_id`, `branch_id` | UNIQUE (period, professional) |
| `state` | `draft` → `in_review` → `reviewed` (Gerente) → `approved` → `paid_partial` \| `paid`; a partir de `approved`, valores imutáveis e só o estado de pagamento avança |
| `lines_total_cents`, `adjustments_total_cents`, `total_cents` | total = linhas + ajustes |
| `paid_via_split_cents` | Repassado pelo split no período: só partes `settled` da 012 (inclui as liberadas no período) |
| `held_pending_recipient_cents` | Comissão retida (`pending_professional` da 012) por falta de recebedor verificado; não gera ajuste de diferença |
| `manual_due_cents`, `manual_paid_cents` | Saldo fora do split: `manual_due_cents` = Σ `commission_cents` das linhas `on_site` + Σ ajustes; se negativo, é saldo negativo do colaborador (mostrado, sem cobrança automática) e `manual_due_cents` = 0 |
| `negative_balance_cents` | Saldo negativo levado ao próximo período |
| `dispute_until` | Aviso + janela |
| `approved_by`, `approved_at`, `approval_note` | Registro da decisão |

## `settlement_line` (imutável)
`line_id`, `statement_id`, `source_kind` (`appointment` \| `class_session`, 026), `source_id` (agendamento ou aula), `appointment_id` (NULL em aula), `payment_ids`, `service_date`, `item_id`, `paid_cents`, `base_cents`, `commission_rule_version_id`, `commission_cents`, `payment_route` (`split` \| `on_site`).

## `settlement_pending_line`
`statement_id`, `appointment_id`, `reason` (`missing_record` \| `missing_payment`) — fora do total.

## `settlement_adjustment` (imutável)
`adjustment_id`, `statement_id`, `kind` (`bonus` \| `deduction` \| `advance` \| `chair_fee` \| `refund` \| `chargeback` \| `prior_correction` \| `split_reconciliation` \| `other`), `amount_cents` (com sinal), `reason`, `ref` (original), `actor_id`.

## `settlement_dispute`
`dispute_id`, `statement_id`, `target` (`line` \| `adjustment`), `target_id`, `reason`, `state` (`open` → `answered`), `answer`, `answer_adjustment_id`, `answered_by`.

## `settlement_payout` (manual)
`payout_id`, `statement_id`, `paid_on`, `method` (`pix` \| `transfer` \| `cash` \| `other`), `amount_cents`, `actor_id`, `professional_ack` (`confirmed` \| `diverged` \| NULL), `ack_note`.

## Invariantes (testadas)

1. `total_cents = Σ commission_cents + Σ amount_cents` (propriedade).
2. Aprovado nunca muda; correções só como ajuste de período futuro.
3. Resumo do período bate com o livro financeiro (012) e as notas (017).
4. `manual_paid_cents ≤ manual_due_cents`; parcial deixa saldo.
5. `paid_via_split_cents + held_pending_recipient_cents` = Σ partes `professional` do split da 012 no período.
6. Fechamentos, linhas, ajustes, contestações e repasses são anonimizados após 5 anos, mantendo os valores.
