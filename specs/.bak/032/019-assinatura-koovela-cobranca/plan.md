# Implementation Plan: Assinatura Koovela e cobrança

**Branch**: `019-assinatura-koovela-cobranca` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/019-assinatura-koovela-cobranca/spec.md`

## Summary

Criar o domínio `billing` no `koovela_platform`:

- **Planos versionados e totalmente configuráveis** no back-office (PEN-08): preço, faixas, taxa e base, funções, cota de SMS e excedente, política do autônomo; sem valores no código; aumento com 30 dias de aviso; aprovação do Financeiro/Ops.
- **Assinatura por tenant** com cartão recorrente ou Pix, subida imediata com proporcional, descida no próximo ciclo, bloqueio só de crescimento acima da faixa, cancelamento até o fim do ciclo, degustação e concessões.
- **Fatura do ciclo** idempotente: assinatura, taxa por agendamento dos pagamentos no local (PEN-09), taxas do split como informativas, excedente de SMS, créditos e itens de uso extensíveis.
- **Cobrança** pelo `PaymentProvider` (012) e **nota da Koovela** ao tenant pelo `FiscalProvider` (017).
- **Régua de inadimplência** (1/3/5 → restrito no 7 → suspensão no 15 → arquivamento no 90) usando os comandos da 002, sem apagar dados, reativação em ≤ 5 min e pausa auditada.
- **Contrato de entitlements** para 005, 014, 021 e 028.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/money`, `packages/platform/payments` (012), `packages/platform/fiscal` (017), `packages/platform/audit`; Redis (cache de entitlements).

**Storage**: `koovela_platform` (`billing_*`); RabbitMQ `billing.events`.

**Testing**: propriedade do total da fatura; idempotência dos itens e da cobrança; régua com relógio simulado (cada dia uma vez, pausa respeitada); reativação ≤ 5 min; matriz (tenant só as próprias; aprovação dupla); lint sem preços fixos; axe na tela de assinatura.

**Target Platform**: `core` (APIs, entitlements), `workers` (acúmulo de itens, fechamento do ciclo, cobrança, régua, Pix 5 dias antes), painel, back-office.

**Project Type**: domínio da plataforma + telas no painel e no back-office.

**Performance Goals**: entitlements ≤ 20 ms p95 (cache); fechamento de ciclo de 500 tenants ≤ 5 min; reativação ≤ 5 min.

**Constraints**: nenhum número de preço no código (CONST 8); régua nunca apaga dados; consumidor só afetado na suspensão; tenant resolvido no gateway.

**Scale/Scope**: 500 tenants no 1º ano.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Suspensão pela 002 (confirmados honrados) | ✅ N/A |
| G-II | Isolamento | `koovela_platform` com filtro pelo tenant do gateway; teste de leitura cruzada | ✅ |
| G-III | Dinheiro, idempotência, versão congelada | Centavos; itens e cobrança idempotentes; versão do plano congelada por ciclo; créditos em vez de edição | ✅ |
| G-IV | Dados pessoais | Cartão só por token; nada novo | ✅ |
| G-V | Permissões e auditoria | Troca de forma de pagamento com step-up; aprovação dupla de planos; pausa da régua auditada | ✅ |
| G-VI | Rastreabilidade | PEN-08 e PEN-09 decididos; SMS pelo tenant | ✅ |
| G-VII | Contratos | [billing.openapi.yaml](./contracts/billing.openapi.yaml), [billing-events.asyncapi.yaml](./contracts/billing-events.asyncapi.yaml); entitlements para 005/014/021/028 | ✅ |
| G-VIII | Testes antes | Propriedade, régua com relógio simulado | ✅ |
| G-IX | Outbox, idempotência | Etapas da régua únicas por fatura; consumidores idempotentes | ✅ |
| G-X | Observabilidade | Inadimplência por etapa; falhas de cobrança; tempo de reativação | ✅ |
| G-XI | Figma, a11y | G07; tela do painel e etapa do onboarding a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida. A nota da Koovela aqui é sobre o serviço da própria Koovela (assinatura), sem conflito com a CONST 5.

## Project Structure

### Documentation (this feature, local only)

```text
specs/019-assinatura-koovela-cobranca/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── billing.openapi.yaml
    └── billing-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/billing/src/{plans,subscriptions,invoices,usage,charging,dunning,entitlements,admin}/
apps/tenant-web/src/routes/{settings/billing,onboarding/plan}   # assinatura e faturas · escolha de plano
apps/admin-web/src/routes/billing                              # G07
```

**Structure Decision**: domínio `billing` no `core` (CONST 4.4), dados em `koovela_platform`, reaproveitando os adaptadores de pagamento e fiscal.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Perfil fiscal e certificado da Koovela** precisam existir antes da primeira fatura paga.
- **Telas a conferir**: código da tela de assinatura no painel e a etapa do onboarding com escolha de plano.
- **Valores dos planos**: definidos pela Gestão no back-office antes do lançamento (sem padrão no código).
