# Implementation Plan: Fechamento financeiro e repasses

**Branch**: `018-fechamento-financeiro-repasses` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/018-fechamento-financeiro-repasses/spec.md`

## Summary

Criar o submódulo `settlement` do `payments`:

- **Período configurável** (semanal, quinzenal, mensal) na data local da filial, gerando um rascunho por colaborador com linhas calculadas **só pelo contrato da 007** e pendentes fora do total.
- **Ajustes** auditados; estornos, chargebacks e correções como ajustes do período atual; **aprovado imutável**; total verificado por teste de propriedade.
- **Conferência e contestação** pelo colaborador (janela de 1 a 10 dias), resposta da gestão, aprovação pelo Proprietário delegável ao Gerente.
- **Repasse pelo split a todos** (PEN-14): o fechamento confere repassado × calculado e lança a diferença; comissão de pagamentos no local vira saldo a pagar registrado manualmente, com lembrete e confirmação do colaborador.
- **Resumo do período** que bate com o livro financeiro e as notas, lista de verificação, exportação com o fiscal e demonstrativo em PDF.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/money`, `packages/platform/audit`; contratos da 007, 012 e 017; `exceljs`; Chromium headless (PDF); fast-check.

**Storage**: schema do tenant (`settlement_*`); RabbitMQ `payments.events`.

**Testing**: propriedade do total; reconciliação do resumo com o ledger e as notas; imutabilidade do aprovado; janela de contestação; repasse parcial; matriz (Gerente só da filial; aprovação delegável); isolamento; axe em P21 e K03.

**Target Platform**: `workers` (geração, conferência do split, lembretes, PDF, exportação), `core` (APIs), painel, app e desktop do colaborador, back-office.

**Project Type**: submódulo financeiro + telas no painel e no colaborador.

**Performance Goals**: geração do período para 50 colaboradores ≤ 1 min; resumo do período ≤ 2 s.

**Constraints**: nenhuma regra de comissão, split ou nota recalculada aqui; centavos inteiros; eventos sem dados bancários.

**Scale/Scope**: até ~5 mil fechamentos por período na escala inicial.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Sem escrita de agenda | ✅ N/A |
| G-II | Isolamento | Schema do tenant; Financeiro/Ops só lê, auditado | ✅ |
| G-III | Dinheiro, ledger, versão congelada | Centavos; total por propriedade; aprovado imutável; comissão pela versão congelada da 007; resumo reconciliado com o ledger | ✅ |
| G-IV | Dados pessoais | Eventos sem dados bancários | ✅ |
| G-V | Permissões e auditoria | Aprovação do Proprietário delegável; Gerente da filial (PEN-03); ajustes e repasses auditados | ✅ |
| G-VI | Rastreabilidade | PEN-14, PEN-09, PEN-03 decididos | ✅ |
| G-VII | Contratos | [settlement.openapi.yaml](./contracts/settlement.openapi.yaml), [settlement-events.asyncapi.yaml](./contracts/settlement-events.asyncapi.yaml); só contratos de 007, 012, 017 | ✅ |
| G-VIII | Testes antes | Propriedade, reconciliação, imutabilidade | ✅ |
| G-IX | Outbox, idempotência | Geração idempotente por (período, colaborador); ajustes e repasses com Idempotency-Key | ✅ |
| G-X | Observabilidade | Lembretes de repasse, contestações abertas, divergência split × calculado | ✅ |
| G-XI | Figma, a11y | P21, K03, KD3; contestação e lista de verificação a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/018-fechamento-financeiro-repasses/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── settlement.openapi.yaml
    └── settlement-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/payments/src/settlement/{periods,statements,adjustments,disputes,payouts,summary,checklist,exports}/
apps/tenant-web/src/routes/finance/settlement   # P21 (repasses, resumo, verificação)
apps/pro-mobile · tenant-web/pro                # K03 · KD3
apps/admin-web/src/routes/settlement            # consulta Financeiro/Ops
```

**Structure Decision**: submódulo do `payments` (CONST 4.4: repasses), lendo o ledger da 012 no mesmo processo e a 007 e a 017 por contrato.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Split para CLT** (PEN-14): validar com contador e jurídico.
- **Telas a conferir**: contestação pelo colaborador e lista de verificação; consulta do back-office sem código próprio.
