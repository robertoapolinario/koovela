# Implementation Plan: Política de cancelamento e não comparecimento

**Branch**: `010-politica-cancelamento-no-show` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-politica-cancelamento-no-show/spec.md`

## Summary

Criar o submódulo `policy` do domínio `scheduling`:

- **política versionada por negócio**, com modelos por vertical, janelas, limites, multas, tolerância, exceções e regra de "sinal após N faltas";
- **sinal opcional por serviço** (PEN-15) e **forma da multa** escolhida pelo estabelecimento entre as permitidas pelo back-office (PEN-13);
- **saúde**: taxa de agendamento fixa no lugar do sinal (PEN-06);
- **avaliação pura e determinística** da consequência, em centavos, usada pela 009 antes de cada ação;
- **aceite com hash do texto**;
- **multas, contador de faltas, abono e contestação** com aceite automático em 7 dias;
- **execução financeira delegada ao `payments`** (012) por eventos.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/money`, `packages/platform/audit`, fast-check.

**Storage**: schema do tenant (`scheduling_policy*`, `scheduling_no_show_counter`, `scheduling_policy_dispute`); `koovela_platform.platform_setting` (`no_show_fee_forms`); RabbitMQ `scheduling.events`.

**Testing**: propriedades do cálculo (retido + devolvido = sinal; multa ≤ preço; nunca negativo); congelamento da versão; aceite com hash; prazos de contestação e aceite automático; isolamento; axe em P19, C08, C13, W11, W15.

**Target Platform**: `core` (`scheduling.policy`), `workers` (aceite automático de contestação, prazos), `tenant-web`, `consumer-mobile`, `consumer-web`.

**Project Type**: submódulo de domínio + telas no painel e no consumidor.

**Performance Goals**: avaliação ≤ 5 ms (pura; chamada no resumo e em cada ação).

**Constraints**: multa em centavos arredondada para baixo sobre o preço congelado; versão congelada e herdada na remarcação; contador visível só ao próprio negócio; em saúde, nenhum preço de serviço no texto.

**Scale/Scope**: uma política por negócio; avaliações na escala dos agendamentos (50 mil/mês).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Política decide o permitido; escrita continua na 008/009 | ✅ N/A |
| G-II | Isolamento | Tudo no schema do tenant; contador nunca visível a outro negócio | ✅ |
| G-III | Dinheiro e versão congelada | Centavos, arredondamento para baixo, versão congelada, propriedades; execução no `payments` com idempotência | ✅ |
| G-IV | Dados pessoais | Aceite com IP e aparelho (base: exercício de direitos); contestação sem dado de saúde | ✅ |
| G-V | Permissões e auditoria | Mudança de política e abono auditados; abono por Recepção, Gerente e Proprietário | ✅ |
| G-VI | Rastreabilidade | PEN-13 e PEN-15 decididos no clarify | ✅ |
| G-VII | Contratos | [policy.openapi.yaml](./contracts/policy.openapi.yaml), [policy-events.asyncapi.yaml](./contracts/policy-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Propriedades do cálculo e dos prazos | ✅ |
| G-IX | Outbox | Eventos de multa e contestação pelo outbox; a 012 consome de forma idempotente | ✅ |
| G-X | Migrações, observabilidade | Executor da 002; métricas de multa, abono, contestação | ✅ |
| G-XI | Figma, a11y | P19, P03, C08, C13, W11, W15; contestação sem código (ver Riscos) | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/010-politica-cancelamento-no-show/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── policy.openapi.yaml
    └── policy-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/scheduling/src/policy/   # versões, modelos por vertical, aceite, multas, contador, abono, contestação
packages/domain/policy/           # evaluatePolicy() pura
apps/tenant-web/src/routes/policy · agenda (detalhe) · disputes   # P19 · P03 · fila nova
apps/consumer-mobile · consumer-web                               # C08 C13 · W11 W15 · contestar (nova)
```

**Structure Decision**: submódulo do `scheduling` (a política só existe em função do agendamento); a avaliação em `packages/domain/policy` por ser lógica pura.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas sem código no Figma**: contestação pelo consumidor e fila de contestações no painel.
- **Execução financeira** (reter, cobrar no cartão, devolver) depende da spec 012; até lá, as multas ficam registradas.
- **Saúde**: multa percentual não se aplica (não há preço exibido); a consequência é só a retenção da taxa de agendamento.
