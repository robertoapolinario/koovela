# Implementation Plan: Séries recorrentes

**Branch**: `013-series-recorrentes` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-series-recorrentes/spec.md`

## Summary

Criar o submódulo `series` do `scheduling`:

- **regra de recorrência pura** em hora local (semanal, a cada 2/3/4 semanas, mensal por posição do dia da semana), com fim por N, por data ou sem fim;
- **materialização idempotente de sempre 4 ocorrências futuras** (PEN-12), cada uma um agendamento da 009 com lock e células da 008 e versões congeladas na materialização;
- **conflitos** com até 3 alternativas e pulo sem custo;
- **alcance explícito das mudanças**, com nova versão da regra e preservação de horários próprios, e teste de propriedade da invariante 6;
- **pagamento das ocorrências**: sinal automático no cartão salvo ou sessão de pacote;
- **pausa** até 90 dias, pausa por faltas seguidas, aguardando pagamento e encerramento;
- **limite** de 3 séries por consumidor e negócio.

O contrato é reaproveitado pelas aulas recorrentes (034). Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `@js-temporal/polyfill`, módulos de ocupação (008) e agendamento (009), contratos da 012 (cobrança e saldos), fast-check.

**Storage**: schema do tenant (`scheduling_series*`); RabbitMQ `scheduling.events`.

**Testing**: propriedades da expansão (fusos, horário de verão, "última terça") e do alcance (invariante 6) como portão; idempotência da materialização (2× = mesmo resultado); conflitos e prazo de 24 h; pagamento por ocorrência e por pacote; isolamento; axe em C14, W16, P06.

**Target Platform**: `core` (APIs), `workers` (materializador diário e por evento, prazos de conflito, retomada de pausa), apps e painel.

**Project Type**: submódulo de domínio + telas no consumidor, no painel e no colaborador.

**Performance Goals**: criação de série (com 4 ocorrências) ≤ 2 s p95; materializador diário para 500 tenants ≤ 15 min.

**Constraints**: nenhuma mudança sem alcance explícito; ocorrências passadas imutáveis; versões congeladas por ocorrência; mesmas proteções contra reserva dupla da 008.

**Scale/Scope**: estimativa de ~20% dos agendamentos vindo de séries.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock, constraint, ocorrências | Cada ocorrência pela 008 (lock + células); alteração de uma ocorrência nunca altera outras sem comando explícito (teste de propriedade) | ✅ |
| G-II | Isolamento | Schema do tenant; contratos na suíte | ✅ |
| G-III | Dinheiro e versão congelada | Versões congeladas na materialização; sinal e pacote pela 012 com idempotência | ✅ |
| G-IV | Dados pessoais | Sem dado novo; consentimento de cobrança automática registrado | ✅ |
| G-V | Permissões e auditoria | Mudanças registradas com ator e alcance | ✅ |
| G-VI | Rastreabilidade | PEN-12 decidido | ✅ |
| G-VII | Contratos | [series.openapi.yaml](./contracts/series.openapi.yaml), [series-events.asyncapi.yaml](./contracts/series-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes, invariantes | Invariante 6 por propriedade; expansão por propriedade | ✅ |
| G-IX | Outbox | Eventos pelo outbox; materialização idempotente por (série, sequência) | ✅ |
| G-X | Observabilidade | Métricas de aderência, conflitos, pulos | ✅ |
| G-XI | Figma, a11y | C14, C08, C12, W16, P06, P03, K01, KD1; alcance e alternativas a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Regra própria e mínima em vez de RRULE completa | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/013-series-recorrentes/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── series.openapi.yaml
    └── series-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/scheduling/src/series/   # criação, materializador, conflitos, alcance, pagamento, ciclo de vida
packages/domain/recurrence/       # expand() pura
apps/consumer-mobile · consumer-web   # C14 · W16 · "repetir" em C08/C12
apps/tenant-web/src/routes/series     # P06 + marca na agenda (P03)
apps/pro-mobile · tenant-web/pro      # marca "série" e numeração (K01, KD1)
```

**Structure Decision**: submódulo do `scheduling`, reaproveitando ocupação e agendamento no mesmo processo; expansão em `packages/domain/recurrence`.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas a conferir**: escolha de alcance e alternativas de conflito podem não existir no Figma.
- **Cobrança automática do sinal** depende do PSP escolhido na 012 aceitar cobrança com cartão salvo sem o consumidor presente.
