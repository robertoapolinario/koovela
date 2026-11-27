# Data Model: BI e painéis (023)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Cópia analítica em ClickHouse (fora do transacional). Nenhum dado pessoal: pessoas só por pseudônimo; valores em centavos (`Int64`).

---

## `raw_events` (ReplacingMergeTree por `event_id`)
`event_id`, `event_type`, `occurred_at`, `ingested_at`, `tenant_id`, `branch_id`, `subject_pseudo` (consumidor), `staff_pseudo` (colaborador), `dims` (Map: vertical, categoria, cidade, plano, canal, origem), `amount_cents`, `currency`, `state`, `refs` (Map de ids não pessoais: serviço, plano, release; nunca agendamento, pagamento ou consumidor — quando indispensável, só `hmac(salt_bi, id)`, com o sal por titular descartado na eliminação). Campos permitidos definidos por tipo em `bi/ingest/mappings/*.yaml`.

## Dimensões
- `dim_tenant`: `tenant_id`, `vertical`, `city`, `plan_id`, `acquisition_channel`, `activated_month` (1º atendimento concluído e pago), `is_solo`.
- `dim_branch`: `branch_id`, `tenant_id`, `city`.
- `dim_date`.

## Marts (exemplos)
- `mart_tenant_daily`: `tenant_id`, `branch_id`, `day`, `appointments`, `completed`, `no_shows`, `late_cancels`, `new_consumers`, `revenue_platform_cents`, `revenue_on_site_cents`, `occupancy_bps`, `avg_rating_x10`, `origin_counts`.
- `mart_staff_occupancy_daily`: `tenant_id`, `branch_id`, `staff_pseudo`, `day`, `booked_min`, `available_min`.
- `mart_platform_monthly`: `month`, North Star, ativados, `%_first_booking_7d`, instalação do app, web → app, no-show com/sem lembrete, incidentes de reserva dupla, MTTR, custo de infra por tenant, falhas de migração.
- `mart_finance_monthly` (congelado no fechamento): GMV por meio, receita Koovela por fonte (assinatura, taxa no split, taxa na fatura, horário ocioso, SMS), take rate, ARPA, NRR, inadimplência e recuperação, chargebacks, perda por fraude, margem por tenant, CAC por canal.
- `mart_cohort_tenant` e `mart_cohort_consumer` (recompra 30/60/90 no estabelecimento e na plataforma).

## Insumos manuais (MySQL `koovela_platform`, versionados e auditados; copiados ao ClickHouse)
- `bi_channel_spend`: `month`, `channel`, `amount_cents`, `author_id`.
- `bi_infra_cost`: `month`, `kind` (`infra` \| `messaging`), `amount_cents`, `author_id`.

## Definições de métrica
`bi/metrics/<metric>.yml`: `name`, `version`, `effective_from`, `counts`, `excludes`, `source_events`, `owner`, `requires_feature` (fase 2/3).

## Pseudônimos (fora do BI — `koovela_platform.pseudonym_map`)
`real_id`, `kind` (`consumer` \| `staff`), `pseudo_id` (UUID v4). Eliminação do titular apaga a linha.

## Invariantes

1. Nenhum campo de PII no ClickHouse (teste de mapeamento + varredura periódica).
2. Toda consulta do `bi-api` filtrada pelo tenant do gateway.
3. Células < 5 nunca exibidas.
4. Mês fechado bate ao centavo com 012 e 019.
5. Retenção pela tabela da 022: `bi_financial_facts` (5 anos: `mart_finance_monthly` e fatos de pagamento e fatura) e `bi_other_facts` (3 anos), removidos por partição mensal.
6. Nenhum id que leve a uma pessoa em `raw_events.refs`.
