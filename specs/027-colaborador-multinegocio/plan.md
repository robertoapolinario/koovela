# Implementation Plan: Colaborador em vários negócios

**Branch**: `027-colaborador-multinegocio` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/027-colaborador-multinegocio/spec.md`

## Summary

Permitir que uma pessoa trabalhe em vários negócios com a mesma conta (fase 2, D31):

- **Vínculos independentes** por tenant (convite e aceite da 003); encerrar um não afeta os outros; nenhum tenant sabe dos outros.
- **Agenda unificada** no app e no `/pro` por projeção do colaborador (`koovela_projections`), legível offline por 7 dias; ações sempre no contexto do tenant dono.
- **Conflitos (C6)**: detecção da 008 em criação e mudanças; colaborador vê os dois atendimentos, cada tenant só "compromisso fora deste negócio"; aviso no agendamento manual; encerramento só por ação humana ou fim de vínculo; teste de contrato com dois tenants como portão.
- **Bloqueio opcional entre negócios**, ligado só pelo colaborador, criando `external_block` pela mesma proteção da 008.
- **Folga em todos** (pedidos separados), **comissões** por negócio e total, **perfil** global com ajuste por negócio.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; contratos de 003, 007, 008, 009, 011, 013, 016, 018, 026; Expo SQLite + SecureStore (offline cifrado).

**Storage**: `koovela_projections` (`pro_unified_agenda`, `pro_conflict`); `koovela_identity.pro_preferences`; tenant (`workforce_profile_override`, `scheduling_external_conflict_flag`, ocupações `external_block`); RabbitMQ `workforce.events`.

**Testing**: contrato de conflito entre dois tenants (portão); isolamento (nenhuma revelação de vínculos); bloqueio externo com a proteção da 008 (concorrência); offline 7 dias; fim de vínculo; axe em K01/KD1 unificados e P03.

**Target Platform**: `core`, `workers` (projeção, bloqueios externos, avisos), app e `/pro` do colaborador, painel.

**Project Type**: projeções e extensões de domínios existentes + telas.

**Performance Goals**: agenda unificada ≤ 500 ms p95; conflito visível ≤ 1 min após a causa; bloqueio externo ≤ 1 min.

**Constraints**: nenhum dado de outro tenant exposto; bloqueio só por escolha do colaborador; ações no contexto do dono.

**Scale/Scope**: até 5 vínculos por pessoa.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock, constraint, conflitos | Detecção obrigatória (008) com teste de contrato como portão; `external_block` pelas células da 008; nunca "resolvido automaticamente" | ✅ |
| G-II | Isolamento | Projeção servida só à pessoa; tenant vê só a janela; teste de isolamento | ✅ |
| G-III | Dinheiro | Comissões só lidas da 018 | ✅ N/A |
| G-IV | Dados pessoais | Projeção sem contato do consumidor; offline cifrado | ✅ |
| G-V | Permissões e auditoria | Bloqueio só pela pessoa; ações com permissões do tenant dono | ✅ |
| G-VI | Rastreabilidade | D31, C5, C6 decididos | ✅ |
| G-VII | Contratos | [multi-engagement.openapi.yaml](./contracts/multi-engagement.openapi.yaml), [multi-engagement-events.asyncapi.yaml](./contracts/multi-engagement-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Contrato de conflito, isolamento | ✅ |
| G-IX | Outbox, idempotência | Bloqueios idempotentes por `source_occupancy_ref` | ✅ |
| G-X | Observabilidade | Conflitos abertos, tempo até encerramento | ✅ |
| G-XI | Figma, a11y | K01/KD1 unificados e P03; aviso ao colaborador e "folga em todos" a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova (projeção prevista na 008) | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/027-colaborador-multinegocio/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── multi-engagement.openapi.yaml
    └── multi-engagement-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/workforce/src/multi-engagement/{projection,conflicts,cross-block,time-off-all,commissions-summary,profile}/
services/scheduling/src/occupancy/external-block/
apps/pro-mobile/src/app/agenda           # modo unificado + offline
apps/tenant-web/src/routes/pro/agenda    # KD1 unificado
apps/tenant-web/src/routes/agenda        # marca de conflito e aviso no agendamento manual (P03)
```

**Structure Decision**: projeções no `workforce`, detecção e bloqueio no `scheduling`, como já previsto na 008.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas** a conferir: aviso de conflito ao colaborador e "pedir folga em todos".
- **Privacidade da cor/nome do negócio** na agenda unificada: só para a pessoa (nunca em telas de tenant).
