# Implementation Plan: Fila de espera e horário ocioso

**Branch**: `014-fila-espera-horario-ocioso` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-fila-espera-horario-ocioso/spec.md`

## Summary

Criar os submódulos `waitlist` e `idle` do `scheduling`:

- **Fila de espera:**
  - até 30 dias, com no máximo 3 entradas por consumidor e negócio;
  - detecção de vaga pelos eventos de liberação, com oferta em ≤ 1 min a lotes de 3 e prazo de 15 ou 5 min;
  - **primeiro aceite vence**, garantido pela célula da 008;
  - fluxo normal da 009 depois do aceite;
  - encaixe manual pela Recepção.
- **Horário ocioso:**
  - regra por negócio dentro dos limites do back-office (PEN-18), inexistente em saúde (PEN-06);
  - *scanner* da janela de antecedência, com prioridade para a fila;
  - oferta só com opt-in por estabelecimento e canal;
  - preço com desconto congelado e taxa da Koovela no split ou na fatura (PEN-09);
  - painel de resultado.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; módulos de ocupação (008) e agendamento (009); contrato de avisos da 011; split da 012; fast-check.

**Storage**: schema do tenant (`scheduling_waitlist_*`, `scheduling_slot_offer`, `scheduling_idle_rule_version`, `scheduling_offer_optin`); `koovela_platform.idle_platform_limits`; RabbitMQ `scheduling.events`.

**Testing**: concorrência do aceite (N → 1); idempotência da oferta (horário + consumidor); prazos e rodadas; limites do back-office; opt-in obrigatório para horário ocioso; arredondamento do desconto; isolamento; axe em C17, W19, P07, P08.

**Target Platform**: `workers` (detector de vaga, *scanner* de horário ocioso, rodadas), `core` (APIs), apps e painel.

**Project Type**: submódulos de domínio + telas no consumidor, no painel e no back-office.

**Performance Goals**: oferta ≤ 1 min após a liberação; *scanner* a cada 15 min para 500 tenants ≤ 2 min.

**Constraints**: avisos da fila transacionais; ofertas de horário ocioso só com opt-in; silêncio respeitado; desconto em centavos arredondado para baixo e congelado; sem desconto em saúde.

**Scale/Scope**: dezenas de liberações por tenant por dia.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock, constraint | Aceite pela 008 (lock + célula); primeiro aceite vence; teste de concorrência | ✅ |
| G-II | Isolamento | Schema do tenant; opt-in nunca visível a outro tenant | ✅ |
| G-III | Dinheiro | Desconto em centavos, congelado; taxa versionada pela 012 | ✅ |
| G-IV | Dados pessoais e opt-in | Opt-in explícito por estabelecimento e canal com versão do texto; descadastro em um clique (CONST IV, D32) | ✅ |
| G-V | Permissões e auditoria | Limites só pela Gestão (auditados); regra pelo Proprietário | ✅ |
| G-VI | Rastreabilidade | PEN-18 decidido | ✅ |
| G-VII | Contratos | [waitlist-idle.openapi.yaml](./contracts/waitlist-idle.openapi.yaml), [waitlist-idle-events.asyncapi.yaml](./contracts/waitlist-idle-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Concorrência do aceite, idempotência, limites | ✅ |
| G-IX | Outbox, idempotência | Ofertas idempotentes por horário + consumidor; consumidores com DLQ | ✅ |
| G-X | Observabilidade | Tempo até a oferta, taxa de aceite, receita recuperada | ✅ |
| G-XI | Figma, a11y | C17, W19, C12, C18, W14, W20, P07, P08; oferta ao consumidor e resultado a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/014-fila-espera-horario-ocioso/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── waitlist-idle.openapi.yaml
    └── waitlist-idle-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/scheduling/src/{waitlist,idle,offers}/
apps/consumer-mobile · consumer-web      # C17 · W19 · opt-in em C12/W14 · C18/W20
apps/tenant-web/src/routes/{waitlist,idle-rule}   # P07 · P08 + resultado
apps/admin-web/src/routes/idle-limits    # limites e taxa (nova)
```

**Structure Decision**: submódulos do `scheduling` (vivem da disponibilidade e do agendamento); envio pela 011 e taxa pela 012.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas a conferir**: oferta de horário ocioso para o consumidor e painel de resultado da regra; tela do back-office de limites e taxa é nova.
- **Taxa de horário ocioso**: valor no back-office (sem padrão no código, CONST 8).
