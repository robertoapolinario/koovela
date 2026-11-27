# Implementation Plan: Vitrine e busca

**Branch**: `024-vitrine-busca` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/024-vitrine-busca/spec.md`

## Summary

Criar o domínio `discovery` (fase 2):

- **Índice de busca** em Meilisearch (self-hosted) alimentado só por eventos públicos de 002, 005, 006, 007, 008, 016 e 019, atualizado em ≤ 15 min; nunca consulta schema de tenant.
- **Busca** com sugestões, tolerância a erros, sinônimos, filtros, mapa e "perto de mim" sem guardar a localização; p95 ≤ 1 s com 10 mil estabelecimentos e 100 buscas/s.
- **Ordenação orgânica** por fórmula versionada no back-office (PEN-26), sem resultado pago, explicada ao consumidor, com desempate estável e rotativo e proteção de novos por 60 dias.
- **Saúde** sem preço e sem avaliações (PEN-06).
- **Participação opt-in** com requisitos, prévia, pausa automática e saída em ≤ 15 min; **regiões** com base mínima configurável abertas pela Gestão.
- **Agendamento em uma tela** reutilizando 008/009/010/012 com origem `discovery`.
- **Páginas de cidade e categoria** pré-renderizadas e indexáveis, LCP < 2,5 s, WCAG AA, 3G.
- **Privacidade**: política revista publicada antes de abrir (022); histórico de buscas só com opção; cookies só necessários; denúncia e moderação.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; Meilisearch (servidor `linux/arm64`) + cliente `meilisearch`; React Router 7 (SSR e pré-renderização no `consumer-web`); MapLibre GL com tiles OpenStreetMap (servidor de tiles gratuito com atribuição ou tiles vetoriais self-hosted se o volume exigir); base IBGE de municípios e bairros.

**Storage**: `koovela_discovery` (`discovery_*`); índice Meilisearch (`listings`); Redis (cache por célula geográfica); RabbitMQ `discovery.events`.

**Testing**: contrato (saúde sem preço/avaliação; nenhum campo privado); privacidade (coordenada nunca persistida ou logada); ordenação (desempate, novos, explicação); frescor ≤ 15 min; carga (100/s, p95 ≤ 1 s); Lighthouse (LCP) e axe AA; isolamento (projeção, sem acesso a schemas); `HolderDataPort` do histórico.

**Target Platform**: `core` (`discovery`), `workers` (projeção, regiões, pausas automáticas, pré-renderização), `consumer-mobile` (aba Início), `consumer-web` (home, resultados, mapa, páginas de cidade/categoria), painel, back-office.

**Project Type**: domínio de leitura global + busca + telas públicas e de gestão.

**Performance Goals**: busca p95 ≤ 1 s (10 mil, 100/s); filtros ≤ 1 s; índice ≤ 15 min; LCP < 2,5 s em 4G.

**Constraints**: custo zero (self-hosted); nenhum dado privado no índice; lista sem pago; localização efêmera; vitrine só com a política revista publicada.

**Scale/Scope**: 10 mil filiais; 100 buscas/s de pico.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Agendamento pelos contratos de 008/009 (lock e célula) | ✅ |
| G-II | Isolamento | Agregação entre tenants só por projeção de eventos (CONST 4.1); nenhum campo privado | ✅ |
| G-III | Dinheiro | Preço "a partir de" em centavos; sem taxa extra (019) | ✅ |
| G-IV | Dados pessoais | Localização efêmera; histórico opcional com port da 022; cookies mínimos; política revista antes de abrir; Koovela controladora | ✅ |
| G-V | Permissões e auditoria | Opt-in só do Proprietário; regiões, ranking e retirada pela Gestão, auditados | ✅ |
| G-VI | Rastreabilidade | PEN-26, PEN-06 e opt-in decididos | ✅ |
| G-VII | Contratos | [discovery.openapi.yaml](./contracts/discovery.openapi.yaml), [discovery-events.asyncapi.yaml](./contracts/discovery-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Contrato, privacidade, carga, LCP | ✅ |
| G-IX | Outbox, idempotência | Projeção idempotente por `branch_id` + versão do evento | ✅ |
| G-X | Observabilidade | Frescor do índice, latência de busca, buscas sem resultado | ✅ |
| G-XI | Figma, a11y | C00 e telas da DF 9.10 a conferir; painel e back-office novos; WCAG AA | ✅ com pendência de protótipo |
| G-XII | Complexidade | Meilisearch justificado abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/024-vitrine-busca/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── discovery.openapi.yaml
    └── discovery-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/discovery/src/{projection,search,ranking,regions,participation,taxonomy,history,reports,seo}/
infra/compose/db-host.yml                 # + meilisearch (limite de memória)
apps/consumer-mobile/src/app/(tabs)/inicio     # C00 atrás da flag discovery.home_tab
apps/consumer-web/src/routes/{index,busca,$cidade,$cidade.$categoria}
apps/tenant-web/src/routes/discovery      # participação e desempenho
apps/admin-web/src/routes/discovery       # regiões, ranking, taxonomia, moderação
```

**Structure Decision**: domínio `discovery` no `core` com dados globais em `koovela_discovery` e índice Meilisearch no host de dados.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Meilisearch (novo serviço) | Tolerância a erros, sinônimos, facetas e geobusca com p95 ≤ 1 s a 100/s | MySQL FULLTEXT + espacial (sem tolerância a erros, sinônimos fracos, lento com filtros combinados) |
| Ranking em duas etapas | Fórmula versionada e explicável (PEN-26, CDC) que o motor não expressa sozinho | Ordenação nativa do motor (pesos fixos, sem prior bayesiano nem rotação de empates) |

## Riscos e pendências

- **Política de privacidade revista** (022) é bloqueante para abrir a vitrine.
- **Telas da DF 9.10** a conferir no Figma; painel e back-office novos.
- **Tiles de mapa**: o servidor público do OpenStreetMap tem política de uso; com volume, migrar para tiles vetoriais self-hosted (custo zero, mais disco).
- **Memória do host de dados**: Meilisearch + ClickHouse (023) + MySQL; acompanhar no staging.
