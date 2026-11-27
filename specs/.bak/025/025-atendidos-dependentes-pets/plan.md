# Implementation Plan: Atendidos — dependentes e pets

**Branch**: `025-atendidos-dependentes-pets` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/025-atendidos-dependentes-pets/spec.md`

## Summary

Criar o submódulo `subjects` na identidade global (fase 2):

- **Atendidos** (menor, adulto dependente, pet) ligados ao titular, com corresponsáveis por convite e OTP; limite de 10 pessoas e 10 pets.
- **Consentimentos**: menor com declaração de responsabilidade e consentimento específico (LGPD art. 14), nome e nascimento cifrados; adulto por declaração do titular com aviso e recusa pelo próprio adulto.
- **Pet** sem dado clínico, com duração base(porte) + acréscimo(pelagem) e preço por porte versionados no catálogo; vertical pet (banho e tosa, adestramento).
- **Agendamento "para quem"** no fluxo da 009 com filtro por tipo aceito; snapshot mínimo congelado no tenant; quem agendou paga e acumula pontos; pacote do titular usado pelos atendidos (PEN-07); saúde aceita dependentes (C2).
- **Maioridade**: aviso, passagem a adulto e assunção do histórico com conta própria.
- **Privacidade**: anotações por atendido (020) e `HolderDataPort` (022).

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/crypto` (envelope); contratos de 003, 006, 008, 009, 011, 012, 015, 020, 022.

**Storage**: `koovela_identity` (`service_subject*`); tenant (`appointment_subject_snapshot`, extensões do catálogo); RabbitMQ `identity.events`.

**Testing**: cifragem de dados de menor; ausência de campos clínicos (schema `additionalProperties: false`); snapshot congelado; cálculo de duração (propriedade: sempre múltiplo de 5 e ≥ base); filtro de serviços por tipo e idade; pagador e pontos; maioridade (relógio simulado); privacidade (export/erase); isolamento; axe nas telas novas.

**Target Platform**: `core` (`identity`, `catalog`, `scheduling`), `workers` (maioridade, avisos), apps e web do consumidor, painel, `/pro`.

**Project Type**: extensão de domínios existentes + telas.

**Performance Goals**: passo "para quem" sem latência perceptível (≤ 200 ms p95).

**Constraints**: estabelecimento só recebe o snapshot permitido; nada clínico de pet; consentimento do responsável para menor.

**Scale/Scope**: até 20 atendidos por titular.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Duração do pet calculada antes do hold da 008 | ✅ |
| G-II | Isolamento | Cadastro global; tenant só com snapshot do agendamento | ✅ |
| G-III | Versão congelada | Porte, pelagem, duração e preço por porte congelados | ✅ |
| G-IV | Dados pessoais | Menor (LGPD art. 14) com consentimento específico e cifragem; adulto com recusa; pet sem clínico; port da 022 | ✅ |
| G-V | Permissões e auditoria | Corresponsáveis por OTP; declarações registradas | ✅ |
| G-VI | Rastreabilidade | D28, D29, PEN-07, PEN-05/10 decididos; C2 parcialmente resolvido | ✅ |
| G-VII | Contratos | [subjects.openapi.yaml](./contracts/subjects.openapi.yaml), [subjects-events.asyncapi.yaml](./contracts/subjects-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Cifragem, snapshot, duração | ✅ |
| G-IX | Outbox | Eventos sem dados de menor | ✅ |
| G-X | Observabilidade | Recusas de vínculo, maioridade | ✅ |
| G-XI | Figma, a11y | Telas da DF 9.10 a conferir; convite, maioridade e recusa novas | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/025-atendidos-dependentes-pets/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── subjects.openapi.yaml
    └── subjects-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/identity/src/subjects/{registry,guardians,declarations,coming-of-age,claim,holder-data}/
services/catalog/src/{accepted-subjects,duration-rules}/
services/scheduling/src/appointments/subject-snapshot/
apps/consumer-mobile · consumer-web     # para quem, atendidos, cadastro do pet
apps/tenant-web/src/routes/{clients/subject,catalog}   # ficha do pet · tipos e regra de duração
apps/pro-mobile · tenant-web/pro        # atendido no detalhe
```

**Structure Decision**: submódulo da identidade global, com extensões no catálogo e no agendamento.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas** da DF 9.10 a conferir; convite a corresponsável, aviso de maioridade e recusa do vínculo são novas.
- **Texto das declarações** (menor e adulto) precisa de revisão jurídica.
