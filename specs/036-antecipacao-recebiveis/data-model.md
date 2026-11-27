# Data Model: Antecipação de recebíveis (036)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md)

Dono: `finance` (submódulo `advances`). A operação fica no schema do tenant e a configuração e a receita da Koovela no `koovela_platform`. Centavos e pontos-base. Dados bancários e documentos ficam só no recebedor da 012 (cifrados).

---

## `koovela_platform.finance_advance_config_version` (imutável)

| Coluna | Regra |
|---|---|
| `version_id`, `partner_code` | `sandbox` ou o parceiro real |
| `koovela_fee_bps` | > 0; sem padrão no código |
| `quote_ttl_minutes`, `bank_change_block_hours` | Validade da simulação e bloqueio depois da troca de conta (valores iniciais de configuração 10 e 72; nenhum valor no código) |
| `daily_limit_business_cents`, `daily_limit_professional_cents` | — |
| `excluded_verticals` | Ex.: `health` |
| `partner_contract_ref`, `regulatory_opinion_ref` | Obrigatórios para ligar em `prod` |
| `opinion_scope` | Subconjunto de `business`, `professional_pj` e `professional_clt` |
| `state` | `proposed` → `approved` (`dual_control` da 021, `kind = advance_config`) → `superseded` |
| `effective_from`, `requested_by`, `approved_by` | — |

## `finance_settings` (por negócio)
`business_id`, `allow_commission_advance` (padrão `false`; só o Proprietário altera), `updated_by`, `updated_at`.

## `finance_receivable` (projeção)
`receivable_id`, `payee_id`, `payment_id`, `split_part_id`, `settles_on`, `amount_cents`, `state` (`free` → `ceded` → `settled`; `free` → `clawback_reserved`), `advance_id`, `partner_ref`, `source` (`business_split` ou `professional_split`), `synced_at`.

## `finance_advance_quote`
`quote_id`, `payee_id`, `requester_kind` (`business` ou `professional`), `statement_id` (comissão), `selection` (valor ou datas), `gross_cents`, `partner_fee_cents`, `koovela_fee_cents`, `net_cents`, `cet_month_bps`, `cet_year_bps`, `credit_on`, `partner_quote_ref`, `config_version_id`, `expires_at` (+10 min), `created_by`.

## `finance_advance`

| Coluna | Regra |
|---|---|
| `advance_id` | PK; chave enviada ao parceiro |
| `quote_id` | UNIQUE (um pedido por simulação) |
| `payee_id`, `requester_kind`, `requested_by` | — |
| `gross_cents`, `partner_fee_cents`, `koovela_fee_cents`, `net_cents` | Congelados da simulação |
| `state` | `requested` → `approved` → `credited`; `requested` → `declined` ou `failed` |
| `partner_ref`, `decline_reason` | — |
| `requested_at`, `credited_at`, `auth_time` | — |

## `finance_advance_item`
`advance_id`, `receivable_id`, `amount_cents`. Σ = bruto.

## `finance_clawback`
`clawback_id`, `advance_id`, `origin_kind` (`refund` ou `chargeback`), `origin_id`, `amount_cents`, `applied_cents`, `debt_id`.

## `finance_advance_debt`
`debt_id`, `payee_id`, `amount_cents`, `settled_cents`, `state` (`open` → `settled`), `opened_at`, `settled_at`. Uma dívida aberta bloqueia novas antecipações do recebedor.

## `finance_reconciliation_issue`
`issue_id`, `date`, `kind` (`missing_in_partner`, `missing_in_ledger`, `amount_mismatch` ou `fee_mismatch`), `refs`, `delta_cents`, `state` (`open` → `resolved`), `justification`, `resolved_by`, `alerted_at`.

## `finance_partner_notice_ack`
`payee_id`, `notice_version`, `acked_by`, `acked_at`.

## Extensões
- **012**, livro: contas `receivable_free`, `receivable_ceded`, `partner_payable`, `advance_cost_partner`, `advance_cost_koovela`, `recipient_bank_inflow`, `advance_debt`, `clawback_offset`, por recebedor.
- **018**: `settlement_statement.advanced_cents` (informativo), registrado no `data-model.md` da 018; partes cedidas contam como repassadas na conferência do split.
- **019**: item informativo `advance_fee_info` na fatura do ciclo, com a nota da Koovela sobre a taxa do mês.
- **`koovela_platform.finance_koovela_fee_ledger`**: `advance_ref` (tenant e id), `fee_cents`, `received_on`, `reconciled`.

## Invariantes

1. Cada lançamento no livro soma zero; o saldo do recebedor bate com o do parceiro depois da conciliação.
2. Uma simulação gera no máximo uma antecipação, e uma `Idempotency-Key` gera uma só resposta.
3. Só são antecipáveis recebíveis `free` de pagamentos pela Koovela. Pagamentos no local nunca entram.
4. Comissão antecipável = parte do split com liquidação futura de um extrato `approved`.
5. Uma dívida aberta, uma troca de conta há menos de 72 h ou o limite diário atingido bloqueiam novas antecipações.
6. Ajuste negativo depois de antecipação de comissão vai para o período futuro (018).
7. Em `prod`, a flag não liga sem contrato e parecer na configuração aprovada.
8. Validade da simulação e bloqueio por troca de conta vêm da configuração vigente, nunca do código.
9. Retenção pela tabela da 022: `finance_advances` (5 anos depois da última operação, guarda legal), aplicada pelo `applyRetention` do port.
