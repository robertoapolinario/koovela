# Implementation Plan: Favoritos

**Branch**: `031-favoritos` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/031-favoritos/spec.md`

## Summary

Criar o submódulo `favorites` do `discovery` (fase 3, D36): o consumidor favorita estabelecimentos (filiais) e profissionais no contexto de uma filial, na conta global (Koovela controladora, nunca no tenant), até 200; a lista mostra dados públicos da vitrine (024) com próximo horário e agendamento pré-selecionado, itens indisponíveis sem link, offline e reflexo em ≤ 1 s. Favoritar não habilita comunicação (028); o estabelecimento vê só contagens com supressão abaixo de 5; exportação e eliminação pela 022.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; contratos de 022, 023, 024; TanStack Query; Expo SQLite (offline).

**Storage**: `koovela_discovery` (`discovery_favorite*`); RabbitMQ `discovery.events` (só agregados).

**Testing**: isolamento (nada no tenant; sem `consumer_id` fora do domínio); limite de 200; estado indisponível; supressão < 5; privacidade (export/erase); reflexo ≤ 1 s; offline; axe na tela.

**Target Platform**: `core` (`discovery`), app e web do consumidor, painel (contagens).

**Project Type**: submódulo pequeno de domínio + telas.

**Performance Goals**: favoritar ≤ 300 ms p95; lista ≤ 500 ms p95.

**Constraints**: favoritos globais; nenhuma identidade exposta ao estabelecimento; localização não guardada.

**Scale/Scope**: até 200 favoritos por consumidor.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Agendamento pelo fluxo da 024/009 | ✅ N/A |
| G-II | Isolamento | Global em `koovela_discovery`; profissional por referência opaca | ✅ |
| G-III | Dinheiro | — | ✅ N/A |
| G-IV | Dados pessoais | Koovela controladora; só agregados ao tenant com supressão; port da 022; localização efêmera | ✅ |
| G-V | Permissões e auditoria | Contagens só pela permissão da vitrine | ✅ |
| G-VI | Rastreabilidade | D36 | ✅ |
| G-VII | Contratos | [favorites.openapi.yaml](./contracts/favorites.openapi.yaml), [favorites-events.asyncapi.yaml](./contracts/favorites-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Isolamento, privacidade | ✅ |
| G-IX | Outbox | Agregados por evento, idempotentes | ✅ |
| G-X | Observabilidade | Uso de favoritos | ✅ |
| G-XI | Figma, a11y | Tela da DF 9.11 a conferir; web sem tela própria | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/031-favoritos/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── favorites.openapi.yaml
    └── favorites-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/discovery/src/favorites/{store,list,aggregates,holder-data}/
apps/consumer-mobile/src/app/favoritos
apps/consumer-web/src/routes/favoritos
apps/tenant-web/src/routes/discovery   # contagens no desempenho da vitrine
```

**Structure Decision**: submódulo do `discovery`, lendo as listagens públicas da 024.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas**: Favoritos (DF 9.11) a conferir; web sem tela própria.
- **Dependência da vitrine (024)**: favoritos só fazem sentido com a vitrine aberta na região.
