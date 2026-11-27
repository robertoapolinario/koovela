# Implementation Plan: Fidelidade

**Branch**: `015-fidelidade` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-fidelidade/spec.md`

## Summary

Criar o domínio `loyalty`:

- **Programa versionado por negócio**, desligado por padrão:
  - mecânica "pontos por real" ou "cartão de selos", à escolha do negócio (PEN-16);
  - até 4 tiers, com subida imediata e queda só na revisão anual;
  - catálogo de recompensas (em saúde, sem desconto em dinheiro, PEN-06);
  - validade, teto de custo obrigatório e saldo único ou por filial (PEN-17).
- **Simulador obrigatório** antes de publicar.
- **Livro-razão de pontos** imutável com saldo ≥ 0 sob concorrência, crédito idempotente por atendimento, dívida em estorno e expiração FIFO.
- **Resgate**:
  - pelo consumidor, no resumo (reserva → consumo → devolução);
  - no balcão, com confirmação no celular do consumidor;
  - desconto no split e na comissão pela [D17].
- **Painel e proteção**: painel com custo e receita incremental, detecção de abuso e ajustes auditados.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/money`, `packages/platform/audit`; contratos da 009 e da 012; fast-check.

**Storage**: schema do tenant (`loyalty_*`); RabbitMQ `loyalty.events`.

**Testing**:
- concorrência de resgate (saldo nunca negativo);
- idempotência do crédito;
- propriedades: acúmulo (arredondamento, multiplicador), FIFO de expiração, dívida no estorno;
- teto e pausa do catálogo;
- isolamento entre negócios;
- axe em C15, W17, P20.

**Target Platform**: `core` (`loyalty`), `workers` (consumidores, expiração, revisão de tier, simulador, detecção de abuso), apps, painel e `/pro`.

**Project Type**: domínio de serviço + telas no consumidor, no painel e no colaborador.

**Performance Goals**: crédito ≤ 1 min após a conclusão paga; simulação de 6 meses ≤ 10 s; tela de fidelidade ≤ 300 ms p95.

**Constraints**: pontos nunca convertidos em dinheiro nem transferidos; pontos de um negócio nunca em outro; versão congelada no agendamento; limites da plataforma no back-office.

**Scale/Scope**: até ~50 mil créditos/mês na escala inicial.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Sem escrita de agenda | ✅ N/A |
| G-II | Isolamento | Schema do tenant, por negócio; pontos nunca atravessam negócios | ✅ |
| G-III | Dinheiro, ledger, idempotência, versão congelada | Livro-razão imutável com saldo ≥ 0 (invariante 4); crédito idempotente; desconto no split pela [D17]; versão congelada | ✅ |
| G-IV | Dados pessoais | Sem dado novo; encerramento na exclusão da conta | ✅ |
| G-V | Permissões e auditoria | Gerente da própria filial (PEN-03); ajustes com motivo, step-up acima de 1.000 pontos e auditoria | ✅ |
| G-VI | Rastreabilidade | PEN-16, PEN-17, PEN-03, PEN-06 decididos | ✅ |
| G-VII | Contratos | [loyalty.openapi.yaml](./contracts/loyalty.openapi.yaml), [loyalty-events.asyncapi.yaml](./contracts/loyalty-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes, invariantes | Concorrência e propriedades | ✅ |
| G-IX | Outbox | Eventos pelo outbox; consumidores idempotentes | ✅ |
| G-X | Observabilidade | Teto, custo, abuso | ✅ |
| G-XI | Figma, a11y | C15, C08, W17, W11, P20, K02, KD2; confirmação no celular a conferir; back-office novo | ✅ com pendência de protótipo |
| G-XII | Complexidade | Livro próprio justificado abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/015-fidelidade/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── loyalty.openapi.yaml
    └── loyalty-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/loyalty/
├── src/{program,simulator,accrual,ledger,redemption,tiers,expiry,results,abuse}/
└── migrations/
apps/consumer-mobile · consumer-web     # C15 · W17 · resgate em C08/W11 · confirmação do balcão
apps/tenant-web/src/routes/loyalty      # P20
apps/pro-mobile · tenant-web/pro        # K02 · KD2 (resgate no check-out)
apps/admin-web/src/routes/loyalty       # limites e alertas (nova)
```

**Structure Decision**: domínio `loyalty` no `core` (CONST 4.4), com o livro-razão de pontos próprio.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Livro-razão de pontos no `loyalty` (além dos livros da 012) | A CONST 4.4 coloca pontos no `loyalty`; pontos têm expiração FIFO, tiers e dívida, regras diferentes de sessões e dinheiro | Reaproveitar o livro de saldos da 012 (cruzaria fronteira de domínio) |

## Riscos e pendências

- **Telas**: confirmação do resgate no celular do consumidor a conferir; limites e alertas do back-office são novos.
- **Simulador**: depende do histórico de 6 meses; negócio novo usa médias da vertical (aviso na tela).
