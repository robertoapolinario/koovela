# Implementation Plan: Pagamentos e split

**Branch**: `012-pagamentos-split` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-pagamentos-split/spec.md`

## Summary

Criar o domínio `payments`:

- **PSP atrás de `PaymentProvider`**, com adaptadores sandbox e *fake*. A escolha do PSP é comercial, por cotação, e o provedor precisa aceitar recebedor pessoa física para colaborador.
- **Checkout Pix e cartão à vista** com tokenização no cliente: o cartão nunca passa pela Koovela.
- **Idempotência** em toda operação e **webhooks deduplicados**.
- **Split determinístico** em centavos, com o resto para o estabelecimento e teste de propriedade como portão:
  - partes da Koovela (take rate e taxa por agendamento, PEN-09);
  - comissão de todos os colaboradores (PEN-14), retida como pendente até o recebedor ser verificado;
  - em saúde, só a taxa de agendamento (PEN-06).
- **Multas executadas pela forma congelada** (PEN-13); devoluções pelo mesmo meio; estorno manual com step-up.
- **Chargeback** com pacote de provas.
- **Dois livros imutáveis**: financeiro de dupla entrada e de saldos de sessões, nunca negativos sob concorrência.
- **Pagamento no local**, conciliação diária e o financeiro do painel.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/money`, SDK do PSP só dentro do adaptador, `exceljs` (exportação), fast-check.

**Storage**: schema do tenant (`payments_*`); `koovela_identity.payments_saved_card`; `koovela_platform.payments_fee_config_version`; RabbitMQ `payments.events` com DLQ.

**Testing**: propriedade do split (portão); concorrência dos saldos; reprocessamento de webhook (3× → 1 efeito); Σ partidas = 0; estorno ≤ estornável; isolamento; contrato com o sandbox do PSP; axe em C10, C11, W13 (agendamento e pagamento obrigatórios, CONST VIII).

**Target Platform**: `core` (APIs), `workers` (webhooks, multas, devoluções, conciliação, expiração de Pix), `consumer-mobile`, `consumer-web`, `tenant-web`, `pro-mobile`, `admin-web`.

**Project Type**: domínio financeiro com integração externa + telas em todas as superfícies.

**Performance Goals**: confirmação após aprovação ≤ 10 s p95; checkout (criação do Pix) ≤ 1,5 s p95.

**Constraints**: centavos e pontos-base; lançamentos imutáveis; saldo ≥ 0; cartão nunca na Koovela; taxas configuráveis e versionadas; tudo no tenant, exceto cartões e configuração de taxas.

**Scale/Scope**: GMV de 50 mil agendamentos/mês; pico de ~50 pagamentos por minuto.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Pagamento confirma o agendamento por evento; a vaga continua na 008 | ✅ N/A |
| G-II | Isolamento | Tudo no tenant; cartões globais por consumidor; isolamento estendido | ✅ |
| G-III | Dinheiro, ledger, idempotência, versão congelada | Centavos; split com propriedade; livros imutáveis com saldo ≥ 0; idempotência e webhook único; versões de taxas e de comissão gravadas no split | ✅ |
| G-IV | Dados pessoais | Cartão só por token; dados bancários e documento cifrados; eventos sem PII | ✅ |
| G-V | Permissões e auditoria | Estorno, troca de conta, anulação e encerramento de divergência com step-up e auditoria; financeiro pela matriz (Gerente da própria filial) | ✅ |
| G-VI | Rastreabilidade | PEN-09, PEN-11, PEN-13, PEN-14 e PEN-06 decididos | ✅ |
| G-VII | Contratos | [payments.openapi.yaml](./contracts/payments.openapi.yaml), [payments-events.asyncapi.yaml](./contracts/payments-events.asyncapi.yaml); comissão pelo contrato da 007 | ✅ |
| G-VIII | Testes antes, invariantes | Invariantes 2 (split) e 4 (saldo) da DF como portão | ✅ |
| G-IX | Outbox, idempotência, DLQ | Outbox; webhooks e eventos com deduplicação; DLQ | ✅ |
| G-X | Observabilidade | Conciliação diária com alerta; métricas de aprovação, recusa, chargeback | ✅ |
| G-XI | Figma, a11y | C10, C11, W13, O05, P21, K02, KD2, G08; telas novas (ver Riscos) | ✅ com pendência de protótipo |
| G-XII | Complexidade | Dois livros justificados abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/012-pagamentos-split/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── payments.openapi.yaml
    └── payments-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/payments/
├── src/{checkout,payees,split,refunds,chargebacks,fees,balances,ledger,on-site,finance,reconciliation,webhooks}/
└── migrations/
packages/platform/payments/          # PaymentProvider + adaptadores (PSP, sandbox, fake)
packages/domain/split/               # computeSplit() puro
apps/consumer-mobile · consumer-web  # C10 C11 · W13 · saldos (nova)
apps/tenant-web/src/routes/{onboarding/payee,finance}   # O05 · P21
apps/pro-mobile · tenant-web/pro     # K02 · KD2 (registro no check-out) · recebedor do colaborador (nova)
apps/admin-web/src/routes/{antifraud,reconciliation}    # G08 · divergências (nova)
```

**Structure Decision**: domínio `payments` com o adaptador do PSP em `packages/platform/payments` (D07) e o cálculo do split em `packages/domain/split`.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Dois livros (financeiro em dupla entrada + saldos em unidades) | Dinheiro e unidades (sessões, depois vale-presente e créditos) têm regras diferentes; ambos precisam ser imutáveis e nunca negativos (CONST III) | Um livro só em centavos (sessões não são dinheiro) |

## Riscos e pendências

- **Escolha do PSP**: por cotação; precisa de split com subcontas, KYC de pessoa física (colaborador CLT, PEN-14), Pix com expiração e extrato para conciliação.
- **Split para CLT**: validar com contador e jurídico (risco do PEN-14).
- **Telas sem código no Figma**: saldo de sessões do consumidor, fila de divergências e cadastro de recebedor do colaborador.
