# Quickstart de validação: BI e painéis (023)

Pré-requisitos: specs 001–022 no ar; ClickHouse, `bi-ingest`, `bi-api` e o app Dash no compose; 3 meses sintéticos de eventos (`pnpm koovela seed:bi`). Contratos em [contracts/](./contracts/).

## 1. Sem PII e sem transacional

```bash
pnpm test:bi --filter mappings    # nenhum campo x-pii nos mapas de ingestão
make -C bi scan-pii               # varredura do ClickHouse por padrões de celular, e-mail, CPF: zero
make -C bi test-isolation         # bi-api sempre filtra pelo tenant do gateway
```

O usuário do BI não tem credencial no MySQL transacional (teste de conexão falha).

## 2. Ingestão e frescor

Concluir um atendimento → aparece no mart do estabelecimento em ≤ 15 min. Parar o `bi-ingest` 40 min → dashboard mostra "desatualizado" e alerta ao SRE.

## 3. Dashboards do estabelecimento (P01/P02)

Gerente da filial A: só A, com receita de A; tentar filial B → `bi.branch_forbidden`. Recepção → sem acesso. Proprietário → consolidado por filial. Autônomo → sem comparações. Definição de cada métrica visível.

## 4. Painéis da Gestão (bi.koovela.com)

Acesso sem Access/MFA → bloqueado. Painel operacional, financeiro e de coorte com filtros; célula com 3 tenants → "—". Insumo de gasto por canal → CAC calculado.

## 5. Reconciliação

```bash
make -C bi reconcile MONTH=2026-10   # totais do mês fechado = conciliação 012 e faturas 019, ao centavo
```

Estorno em novembro de atendimento de outubro → aparece em novembro.

## 6. Eliminação

Pedir eliminação (022) → mapeamento do pseudônimo apagado; contagens mantidas; nenhum caminho de volta ao titular.

## 7. Desempenho

```bash
make -C bi load-test SCALE=10   # Gestão ≤ 15 s e dashboards ≤ 5 s p95 com 10× o volume
```
