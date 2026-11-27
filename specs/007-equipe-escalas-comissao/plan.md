# Implementation Plan: Equipe, escalas e comissão

**Branch**: `007-equipe-escalas-comissao` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-equipe-escalas-comissao/spec.md`

## Summary

Criar o domínio `workforce`:

- **Colaboradores e serviços**: colaborador ligado à pessoa global, com um vínculo por negócio e várias filiais pelas escalas (PEN-04); o mesmo horário em duas filiais é impedido. Serviços e combos por colaborador, com duração e preço próprios versionados.
- **Disponibilidade para a agenda**: escalas em hora local, folgas, bloqueios e trocas com aprovação. Um contrato entrega à spec 008 os intervalos de trabalho em UTC, e eventos invalidam o cache.
- **Comissão**: regras versionadas com precedência, piso, teto e a escolha da [D17]. O cálculo é puro, determinístico e em centavos, com o resto para o estabelecimento. É o mesmo contrato para 009, 012, 018 e o simulador.
- **Prévia e repasse**: prévia no app do colaborador como lançamentos imutáveis. Recebedor por colaborador para o split a todos (PEN-14), com o risco do CLT registrado.
- **Perfil e encerramento**: portfólio com consentimento de imagem e encerramento de vínculo sem perda de histórico.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/money`, `packages/platform/media`, `packages/platform/audit`, `Temporal` (polyfill `@js-temporal/polyfill`) para hora local × UTC por fuso, fast-check.

**Storage**: schema do tenant (`workforce_*`), incluindo a projeção `workforce_branch_hours_view`; RabbitMQ `workforce.events`.

**Testing**: Vitest + Testcontainers; propriedades da comissão; conversão de fuso (incluindo datas históricas de horário de verão); sobreposição de escalas entre filiais; máquinas de estado de folga, troca e vínculo; isolamento; contratos; Playwright + axe em O04, P15, P16, P17, KD3–KD5; React Native Testing Library em K03–K05.

**Target Platform**: `core` (`workforce`), `workers` (expiração de pedidos, projeções), `tenant-web` (+ `/pro`), `pro-mobile`, consumidor (C06/W09).

**Project Type**: domínio de serviço + telas no painel, no app do colaborador e no consumidor.

**Performance Goals**: intervalos de trabalho de um colaborador num mês ≤ 30 ms p95; cálculo de comissão ≤ 1 ms (puro); propagação de mudança de escala ao cache da 008 ≤ 10 s.

**Constraints**: dinheiro em centavos e percentuais em pontos-base inteiros; versões imutáveis congeladas pela 009; nenhuma folga com dado de saúde; comissão visível só ao próprio colaborador, Gerente (filial) e Proprietário; UTC no banco, hora local nas escalas.

**Scale/Scope**: 2.000 colaboradores na escala inicial (CONST 6); ~4 por negócio.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Mudanças de escala, folga e bloqueio nunca cancelam; o mesmo horário em duas filiais é impedido na escala e, na reserva, pelo lock por profissional da 008 | ✅ |
| G-II | Isolamento | Tudo no schema do tenant; pessoa global; isolamento estendido | ✅ |
| G-III | Dinheiro e versão congelada | Centavos e pontos-base; resto para o estabelecimento; regras e configuração versionadas e congeladas na 009; testes de propriedade | ✅ |
| G-IV | Dados pessoais | Folga sem dado de saúde; portfólio sem metadados e com consentimento; registro profissional só o necessário | ✅ |
| G-V | Permissões e auditoria | Matriz: Gerente da própria filial aprova; Colaborador só a própria comissão; regras de comissão auditadas | ✅ |
| G-VI | Rastreabilidade | REQ-EQP com origem; PEN-04 e PEN-14 decididos | ✅ |
| G-VII | Contratos antes do código | [workforce.openapi.yaml](./contracts/workforce.openapi.yaml), [workforce-events.asyncapi.yaml](./contracts/workforce-events.asyncapi.yaml); horário da filial por projeção de evento | ✅ |
| G-VIII | Testes antes | Propriedades da comissão, fuso, sobreposição, estados | ✅ |
| G-IX | Outbox | Eventos pelo outbox; consumidores de onboarding e horário idempotentes | ✅ |
| G-X | Migrações, observabilidade | Executor da 002 | ✅ |
| G-XI | Figma, a11y | O04, P15, P16, P17, K03–K05, KD3–KD5, C06, W09 | ✅ |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/007-equipe-escalas-comissao/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── workforce.openapi.yaml
    └── workforce-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/workforce/
├── src/{professionals,engagements,services,schedules,time-off,swaps,commission,portfolio,public,internal}/
└── migrations/
packages/domain/commission/      # cálculo puro (sem I/O), usado pelo workforce
apps/tenant-web/src/routes/{onboarding/team,team,commission,schedules}/   # O04 · P15 · P16 · P17
apps/tenant-web/src/routes/pro/{commissions,time-off,profile}/            # KD3 · KD4 · KD5
apps/pro-mobile/app/{commissions,time-off,profile}/                       # K03 · K04 · K05
apps/consumer-web · consumer-mobile                                       # W09 · C06
```

**Structure Decision**: domínio `workforce` no `core`; o cálculo de comissão vai para `packages/domain/commission` por ser lógica pura e muito testada, mas continua sendo do `workforce` (os outros domínios usam o contrato, não o pacote).

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Split para CLT** (PEN-14): validar com contador e jurídico antes do lançamento.
- **Lista de agendamentos afetados** e prévia de comissão dependem dos eventos e contratos da 009 e da 012; até lá, *stubs*.
- **Ajuste anotado**: as regras de comissão valem por negócio, então a clonagem de filial (REQ-NEG-021) não precisa copiá-las.
