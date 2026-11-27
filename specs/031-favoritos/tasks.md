---
description: "Lista de tarefas da spec 031 — Favoritos"
---

# Tasks: Favoritos

**Input**: documentos de `specs/031-favoritos/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 030 concluídas, com a vitrine (024) aberta na região.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- nada no schema do tenant e nenhum evento com `consumer_id` fora do `discovery` (REQ-FAV-002, SC-003);
- o estabelecimento vê só contagens, com supressão abaixo de 5 (REQ-FAV-007).

**Organization**: por história de usuário. P1: US1 (favoritar) e US2 (agendar de novo pelos favoritos). P3: US3 (contagens para o estabelecimento).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US3).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o submódulo `services/discovery/src/favorites/{store,list,aggregates,holder-data,http}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/favorites.openapi.yaml` e `packages/contracts/asyncapi/favorites-events.asyncapi.yaml` (fonte: `specs/031-favoritos/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir em `packages/contracts/rbac/permissions.yaml` as ações do consumidor `self` e `favoritesSummary` com a mesma permissão do desempenho da vitrine (024). Declarar a flag `discovery.favorites` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas globais e a fronteira de isolamento.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [ ] T004 [P] Teste de isolamento (portão de merge) em `tests/isolation/cases/favorites.ts`: nenhuma tabela de favoritos existe em schema de tenant, e nenhum evento ou resposta a tenant leva `consumer_id` (SC-003). Incluir no filtro `pnpm test:isolation --filter favorites`.
- [ ] T005 Criar a migração `services/discovery/migrations/0031_favorites.ts` em `koovela_discovery`, com:
  - `discovery_favorite`: CHECK em `data-model.md` `discovery_favorite.target_kind`, `discovery_favorite.professional_ref` obrigatório só quando `professional`, e UNIQUE `(consumer_id, target_kind, branch_id, professional_ref)`;
  - `discovery_favorite_counter`, com CHECK em `discovery_favorite_counter.count` ≤ 200;
  - `discovery_favorite_aggregate`.

**Checkpoint**: favoritos ficam só na conta global.

---

## Phase 3: User Story 1 - Favoritar estabelecimentos e profissionais (Priority: P1) 🎯 MVP

**Goal**: favoritar e desfavoritar estabelecimentos e profissionais (no contexto de uma filial) pela vitrine, pela página do estabelecimento e pelo perfil do profissional, até 200, com reflexo em ≤ 1 s.

**Independent Test**: favoritar dois estabelecimentos e um profissional, desfavoritar um e conferir a lista no app e na web (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T006 [P] [US1] Teste de contrato de `addFavorite`, `removeFavorite` e `favoriteIds` em `services/discovery/src/favorites/http/favorites.contract.test.ts`.
- [ ] T007 [P] [US1] Teste de integração em `services/discovery/src/favorites/store/store.int.test.ts`:
  - o 201º favorito → `favorite.limit_reached`, com o contador travado na transação (`data-model.md` `discovery_favorite_counter.count`);
  - favoritar de novo é idempotente;
  - o profissional é guardado só por `discovery_favorite.professional_ref` (opaco, sem `person_id`);
  - favoritar leva ≤ 300 ms p95.

### Implementation for User Story 1

- [ ] T008 [US1] Implementar favoritar, desfavoritar e o conjunto de ids em `services/discovery/src/favorites/store/store.ts` (`data-model.md` `discovery_favorite.favorite_id`, `discovery_favorite.consumer_id`, `discovery_favorite.branch_id`, `discovery_favorite.created_at`), oferecendo favoritar só em negócios com página pública e tirando `professional_ref` de `discovery_listing_professional` (024 T055).
- [ ] T009 [US1] Implementar as rotas `/v1/consumer/favorites` (POST), `/v1/consumer/favorites/ids` e `/v1/consumer/favorites/{id}` em `services/discovery/src/favorites/http/favorites.ts`.
- [ ] T010 [P] [US1] Implementar o botão de favoritar (atualização otimista, chave `favorites` do TanStack Query, ids carregados uma vez por sessão) nos cartões da vitrine, na página do estabelecimento e no perfil do profissional, em `packages/ui/src/FavoriteButton.tsx`, com reflexo em ≤ 1 s em todas as telas (SC-001).

**Checkpoint**: o consumidor guarda os lugares e profissionais que gosta.

---

## Phase 4: User Story 2 - Usar os favoritos para agendar de novo (Priority: P1)

**Goal**: a lista mostra foto, nome, categoria, nota (sem nota em saúde), distância só com localização naquele momento e próximo horário. Agendar já abre com estabelecimento e profissional preenchidos. Itens indisponíveis aparecem sem link. A lista funciona offline.

**Independent Test**: abrir "Favoritos", ver o próximo horário e agendar a partir de um profissional favorito (quickstart §2 e §4).

### Tests for User Story 2 ⚠️

- [ ] T011 [P] [US2] Teste de contrato de `listFavorites` em `services/discovery/src/favorites/http/list.contract.test.ts`.
- [ ] T012 [P] [US2] Teste de integração em `services/discovery/src/favorites/list/list.int.test.ts`:
  - os dados vêm de `discovery_listing` (024), sem nota em saúde;
  - a distância só aparece com coordenada na chamada, e a coordenada não é guardada nem registrada em log;
  - negócio despublicado (005) ou suspenso (002), ou profissional que saiu (`discovery_listing_professional`, 024) → `unavailable` sem link, voltando a `active` sozinho (REQ-FAV-005); negócio só fora da vitrine continua `active`, com o próximo horário pela consulta da 008;
  - a lista leva ≤ 500 ms p95.
- [ ] T013 [P] [US2] Teste de ponta a ponta em `apps/consumer-mobile/e2e/favorites.e2e.ts`:
  - o agendamento a partir de um favorito abre com estabelecimento e profissional preenchidos, em até 3 toques até o horário (SC-002);
  - no modo avião, a última lista continua visível.

### Implementation for User Story 2

- [ ] T014 [US2] Implementar a leitura composta e o estado derivado (publicação da 005, suspensão da 002, profissionais da 024; próximo horário pelo resumo da 008 ou pela consulta de disponibilidade da 008 para filiais fora da vitrine) em `services/discovery/src/favorites/list/list.ts`, com a rota `GET /v1/consumer/favorites` em `services/discovery/src/favorites/http/list.ts`.
- [ ] T015 [P] [US2] Implementar a tela "Favoritos" (DF 9.11) com cache offline no SQLite do Expo em `apps/consumer-mobile/src/app/favoritos/`, e a versão web, seguindo o app, em `apps/consumer-web/src/routes/favoritos.tsx`. "Agendar" a partir do favorito abre o fluxo com origem `favorite` (009).

**Checkpoint**: voltar a agendar com quem já conhece fica a poucos toques.

---

## Phase 5: User Story 3 - Estabelecimento sabe quantos o favoritaram (Priority: P3)

**Goal**: contagens por negócio, filial e profissional no desempenho da vitrine, com "menos de 5" abaixo do limiar e nenhuma identidade.

**Independent Test**: com favoritos sintéticos, abrir o painel da vitrine e conferir as contagens sem nomes (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T016 [P] [US3] Teste de contrato e supressão (portão de merge) em `services/discovery/src/favorites/aggregates/aggregates.int.test.ts`:
  - `favoritesSummary` traz `data-model.md` `discovery_favorite_aggregate.count` por filial e profissional, com "menos de 5" abaixo do limiar;
  - nenhuma identidade é exposta;
  - `discovery.favorite_aggregate.changed.v1` não leva `consumer_id`;
  - ser favoritado não habilita envio do `crm` (028) sem opt-in (REQ-FAV-006);
  - o Gerente vê só as contagens da própria filial.

### Implementation for User Story 3

- [ ] T017 [US3] Implementar a projeção de agregados (idempotente, publicada por evento, `data-model.md` `discovery_favorite_aggregate.tenant_id`, `discovery_favorite_aggregate.branch_id`, `discovery_favorite_aggregate.professional_ref`) e `favoritesSummary` em `services/discovery/src/favorites/aggregates/aggregates.ts`, servida pelo `bi-api` (023) em `bi/api/favorites.py`.
- [ ] T018 [P] [US3] Incluir as contagens na tela de desempenho da vitrine em `apps/tenant-web/src/routes/discovery/FavoritesSummary.tsx`.

**Checkpoint**: o estabelecimento mede o interesse sem saber quem.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T019 Implementar o `HolderDataPort` de favoritos em `services/discovery/src/favorites/holder-data/port.ts` e registrá-lo em `packages/contracts/privacy/holder-ports.yaml` (REQ-FAV-008), com a categoria `discovery_favorites` (até a eliminação) na tabela da 022.
- [ ] T020 [P] Teste de privacidade em `services/discovery/src/favorites/holder-data/port.int.test.ts`: 100% dos favoritos saem na exportação e são apagados na eliminação (SC-004). Incluir no filtro `pnpm test:privacy --filter favorites`.
- [ ] T021 [P] Testes com a flag `discovery.favorites` ligada e desligada em `services/discovery/src/favorites/__tests__/flags.int.test.ts`, e axe na tela em `apps/consumer-web/e2e/favorites-a11y.spec.ts`.
- [ ] T022 [P] Métrica de uso de favoritos em `services/discovery/src/favorites/metrics.ts`, no painel `infra/observability/dashboards/discovery.json`.
- [ ] T023 Registrar a tela Favoritos (DF 9.11) a conferir em `docs/design/telas-sem-prototipo-031.md`.
- [ ] T024 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-031.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1.
- **US3** depende de US1 e pode correr em paralelo com US2.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Depois de US1: US2 e US3 em paralelo.

---

## Parallel Example: depois de US1

```bash
Task: "T011 contrato da lista"
Task: "T012 estado derivado"
Task: "T016 agregados com supressão"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (favoritar) e US2 (lista e agendar de novo).
3. **Parar e validar** com o quickstart §1, §2 e §4.

### Incremental Delivery

1. US3 (contagens para o estabelecimento).
2. Polish (privacidade e flag).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-FAV que atende. Campos com restrição citam `data-model.md` e o campo.
- Favoritos ficam só em `koovela_discovery`, com a Koovela como controladora; o profissional é guardado por referência opaca.
- Favoritar não cria consentimento de comunicação.
- Commit por tarefa ou grupo lógico, em branch `031-favoritos`, por PR.
- Análise de 2026-11-27: profissionais no índice da 024 (T055 da 024); favorito indisponível só por despublicação, suspensão ou saída do profissional, nunca por estar fora da vitrine; próximo horário pela 008; origem `favorite` na 009 e na 008; evento só com contagens; retenção registrada na 022; campos citados. Sem tarefas novas nesta spec.
