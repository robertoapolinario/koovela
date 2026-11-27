# Implementation Plan: Combo com troca de profissional

**Branch**: `030-combo-troca-profissional` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/030-combo-troca-profissional/spec.md`

## Summary

Ativar o modo `per_step` de combo, já previsto na v1.0 (fase 2, D34):

- **Configuração** versionada no catálogo: 2 a 5 etapas com profissionais possíveis e intervalo de 0 a 15 min (único ou por transição); combo indisponível na filial quando uma etapa fica sem profissional.
- **Busca de sequências** (função pura) que só oferece inícios com sequência completa viável, sugere pela regra do negócio (menor espera), permite trocar profissionais por etapa com motivos para opções inviáveis e oferece "mesmo profissional"; p95 ≤ 1 s.
- **Reserva atômica** pelo caminho de combo da 008 (locks em ordem lexicográfica + células numa transação), com próxima sequência viável na falha e teste de concorrência e falha injetada como portão.
- **Depois de reservado**: troca de uma etapa pela Recepção, remarcação atômica, cancelamento só do combo inteiro, aviso de etapa atrasada, afetados com sugestão e comissão por etapa com rateio do desconto.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `ioredis`; `packages/domain/combo-sequencing` (nova, pura); contratos de 006, 007, 008, 009, 010, 011, 018; fast-check.

**Storage**: extensões no schema do tenant (`catalog_combo_*`, `scheduling_appointment_step`, `scheduling_step_delay_alert`); RabbitMQ `scheduling.events`.

**Testing**: propriedade da busca; concorrência e falha injetada (portão); remarcação atômica; rateio do desconto (Σ = desconto); carga (p95 ≤ 1 s); axe nas telas.

**Target Platform**: `core` (`scheduling`, `catalog`), `workers` (atrasos, afetados), app e web do consumidor, painel, colaborador.

**Project Type**: extensão de domínios existentes + telas.

**Performance Goals**: inícios e sequências ≤ 1 s p95; reserva ≤ 2 s (teto do lock).

**Constraints**: todas as etapas ou nenhuma; cancelamento só do combo; trocas de etapa só pela Recepção depois de reservado.

**Scale/Scope**: combos de até 5 etapas e até ~10 profissionais possíveis por etapa.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock e constraint, combo atômico | Locks de todas as etapas em ordem + células numa transação (008); teste de concorrência e falha injetada como portão | ✅ |
| G-II | Isolamento | Schema do tenant | ✅ |
| G-III | Dinheiro e versão congelada | Versão do combo congelada; rateio do desconto com soma exata | ✅ |
| G-IV | Dados pessoais | Nada novo | ✅ N/A |
| G-V | Permissões e auditoria | Trocas e remarcação de etapa só pela Recepção, registradas | ✅ |
| G-VI | Rastreabilidade | D34, D19 aplicados | ✅ |
| G-VII | Contratos | [combo-sequencing.openapi.yaml](./contracts/combo-sequencing.openapi.yaml), [combo-sequencing-events.asyncapi.yaml](./contracts/combo-sequencing-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Propriedade, concorrência, falha injetada | ✅ |
| G-IX | Outbox | Eventos por etapa pelo outbox | ✅ |
| G-X | Observabilidade | Tempo de busca, falhas de reserva, atrasos | ✅ |
| G-XI | Figma, a11y | Telas da DF 9.10 a conferir; aviso de atraso a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova (modelo previsto na 008) | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/030-combo-troca-profissional/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── combo-sequencing.openapi.yaml
    └── combo-sequencing-events.asyncapi.yaml
```

### Source Code (repository root)

```text
packages/domain/combo-sequencing/            # findSequences(), suggest(), alternatives()
services/catalog/src/combos/per-step/
services/scheduling/src/{availability/combo-per-step,appointments/steps,appointments/step-delays}/
apps/consumer-mobile · consumer-web          # escolha de sequência e trocas por etapa
apps/tenant-web/src/routes/{catalog/combos,agenda}   # configuração · troca de etapa · aviso de atraso
apps/pro-mobile · tenant-web/pro             # etapa do combo na agenda
```

**Structure Decision**: sem domínio novo; busca de sequências em pacote puro, reserva no caminho atômico existente da 008.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas** da DF 9.10 a conferir; aviso de etapa atrasada para a Recepção pode ser novo.
- **Busca combinatória**: com muitos profissionais por etapa, limitar a 20 sequências enumeradas por horário (já no design).
