---
description: "Lista de tarefas da spec 024 — Vitrine e busca"
---

# Tasks: Vitrine e busca

**Input**: documentos de `specs/024-vitrine-busca/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 023 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- nenhuma resposta da vitrine leva preço ou avaliação de saúde, nem campo privado de tenant (REQ-VIT-003/054);
- a localização do aparelho nunca é persistida nem registrada em log (REQ-VIT-002, SC-005);
- a lista principal não tem resultado pago (REQ-VIT-005, SC-004).

**Organization**: por história de usuário, na ordem de prioridade. P1: US1 (buscar), US2 (filtrar e mapa), US3 (agendar em uma tela) e US6 (privacidade). P2: US4 (participação) e US5 (regiões e páginas). A projeção, o índice, a máquina de estados da participação e a versão do ranking ficam na fundação, porque a busca depende deles.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/discovery/` com `package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS`, as pastas `src/{projection,search,ranking,regions,participation,taxonomy,history,reports,seo,http}` e `migrations/`.
- [ ] T002 [P] Incluir o Meilisearch (`linux/arm64`, limite de memória, volume próprio, chave mestra pelo cofre da 001) em `infra/compose/db-host.yml` e o cliente `meilisearch` em `services/discovery/package.json`.
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/discovery.openapi.yaml` e `packages/contracts/asyncapi/discovery-events.asyncapi.yaml` (fonte: `specs/024-vitrine-busca/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T004 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - busca pública e denúncia sem login;
  - opt-in só pelo Proprietário, com `audit_category`;
  - regiões, ranking, taxonomia e retirada só pela Gestão, auditadas.

  Declarar as flags `discovery.search` e `discovery.home_tab` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: schema global, projeção por eventos, índice, máquina de estados da participação e fórmula de ranking versionada.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste de contrato (portão de merge) em `services/discovery/src/__tests__/listing-contract.test.ts`:
  - documento de saúde não tem `data-model.md` `discovery_listing.min_price_cents`, `discovery_listing.rating_avg_x10` nem `discovery_listing.rating_count_12m` (`discovery_listing.is_health`; PEN-06);
  - nenhum campo fora da lista pública entra no índice (REQ-VIT-054).
- [ ] T006 [P] Teste da projeção em `services/discovery/src/projection/projection.int.test.ts`:
  - eventos de 002, 005, 006, 007, 008, 012, 016 e 019 atualizam `discovery_listing` de forma idempotente por `branch_id` e versão do evento, incluindo `scheduling.availability_summary.changed.v1` (008 T059), `engagement.rating_summary.changed.v1` (016 T042), `payments.payee.changed` (012) e a acessibilidade da filial (005 T073);
  - o índice reflete a mudança em ≤ 15 min (`data-model.md` `discovery_listing.updated_at`; REQ-VIT-033);
  - o `discovery` não tem credencial em schema de tenant (registrar o caso em `tests/isolation/cases/discovery.ts`).
- [ ] T007 [P] Teste da máquina de estados em `services/discovery/src/participation/state.test.ts`, cobrindo todas as transições de `data-model.md` `discovery_participation.state` e as razões de `discovery_participation.pause_reason`.

### Implementação da fundação

- [ ] T008 Criar a migração `services/discovery/migrations/0001_discovery.ts` em `koovela_discovery`, com:
  - `discovery_participation`: CHECK em `data-model.md` `discovery_participation.state` e `discovery_participation.pause_reason`;
  - `discovery_listing`: PK em `discovery_listing.branch_id`, CHECK em `discovery_listing.geo_precision` e `discovery_listing.min_price_cents` em centavos;
  - `discovery_ranking_version`, `discovery_region` (CHECK em `discovery_region.state`), `discovery_region_waitlist` e `discovery_taxonomy`;
  - `discovery_search_history`, sem coluna de localização (`discovery_search_history.filters` não pode ter coordenada);
  - `discovery_report` (CHECK em `discovery_report.state`) e `discovery_blocked_terms`.
- [ ] T009 Implementar a máquina de estados em `services/discovery/src/participation/state.ts` (`data-model.md` `discovery_participation.tenant_id`, `discovery_participation.business_id`, `discovery_participation.branch_id`, `discovery_participation.opted_in_at`, `discovery_participation.left_at`, `discovery_participation.removed_reason`), publicando `discovery.participation.*.v1` pelo outbox.
- [ ] T010 Implementar os consumidores da projeção em `services/discovery/src/projection/handlers/*.ts` e o gravador de `discovery_listing` em `services/discovery/src/projection/listing.ts`, com:
  - `data-model.md` `discovery_listing.geo_precision` = `approximate` (centroide) para autônomo com endereço oculto;
  - `discovery_listing.new_until` = ativação + `discovery_ranking_version.new_business_days`;
  - `discovery_listing.home_service` gravado e nunca exposto como filtro (REQ-VIT-012);
  - campos públicos `discovery_listing.slug`, `discovery_listing.name`, `discovery_listing.cover_media_url`, `discovery_listing.categories`, `discovery_listing.service_names`, `discovery_listing.geo_lat`, `discovery_listing.geo_lng`;
  - disponibilidade (`discovery_listing.next_free_slot_at`, `discovery_listing.available_today`, `discovery_listing.available_tomorrow`, `discovery_listing.slots_next_7d`) só do resumo da 008, nunca calculada aqui;
  - `discovery_listing.accepts_online_payment` (recebedor `active` da 012) e `discovery_listing.accessibility` (005).
- [ ] T011 Implementar a sincronização com o Meilisearch em `services/discovery/src/search/index-sync.ts`: um documento por filial com participação `active`, atributos filtráveis e geoponto, e sinônimos vindos de `discovery_taxonomy`.
- [ ] T012 Implementar a versão do ranking em `services/discovery/src/ranking/version.ts`, com os pesos de `data-model.md` `discovery_ranking_version.weights`, `discovery_ranking_version.rating_prior`, `discovery_ranking_version.region_min_total`, `discovery_ranking_version.region_radius_m`, `discovery_ranking_version.region_min_per_category`, `discovery_ranking_version.new_business_days`, `discovery_ranking_version.explanation_text`, `discovery_ranking_version.author_id` e `discovery_ranking_version.effective_from`. Nova versão proposta pelo Comercial/Growth exige aprovação pelo `dual_control` da 021 (`kind = ranking_change`). Nenhum valor fica fixo no código; os valores iniciais vão na semente (REQ-VIT-004).
- [ ] T013 [P] Implementar a taxonomia versionada (`data-model.md` `discovery_taxonomy.vertical`, `discovery_taxonomy.category`, `discovery_taxonomy.synonyms`, `discovery_taxonomy.home_order` e `discovery_taxonomy.reserved_slugs`) em `services/discovery/src/taxonomy/taxonomy.ts`, publicando os slugs reservados para a verificação de colisão da 005.
- [ ] T014 [P] Implementar o gerador de dados sintéticos `pnpm koovela seed:discovery` (10 mil filiais em 3 cidades) em `tools/seed-discovery/src/seed.ts`.

**Checkpoint**: o índice tem só filiais ativas, com dados públicos e frescor ≤ 15 min.

---

## Phase 3: User Story 1 - Buscar e encontrar perto de mim (Priority: P1) 🎯 MVP

**Goal**: busca por serviço, categoria e nome, com sugestões, tolerância a erros e sinônimos. Ordenação orgânica explicada, com desempate rotativo e proteção de negócios novos. Alternativas quando não há resultado. p95 ≤ 1 s.

**Independent Test**: numa região aberta com 30 estabelecimentos sintéticos, buscar por serviço, categoria e nome, com e sem localização (quickstart §1 e §2).

### Tests for User Story 1 ⚠️

- [ ] T015 [P] [US1] Teste de contrato de `search`, `suggest` e `home` em `services/discovery/src/http/public.contract.test.ts`.
- [ ] T016 [P] [US1] Teste do ranking em `services/discovery/src/ranking/ranking.test.ts`:
  - empates são estáveis no mesmo dia e alternam entre dias (REQ-VIT-006);
  - negócio novo sem avaliações não cai ao fundo antes de `data-model.md` `discovery_listing.new_until`;
  - saúde entra com o prior neutro no lugar da avaliação;
  - nenhum resultado pago na lista principal (SC-004);
  - a explicação vem de `discovery_ranking_version.explanation_text`.
- [ ] T017 [P] [US1] Teste de busca em `services/discovery/src/search/search.int.test.ts`: "escova" e "escva" dão o mesmo resultado; o sinônimo "progressiva" encontra "alisamento"; sem resultado, vêm alternativas (REQ-VIT-008); termo bloqueado não gera resultado nem sugestão (REQ-VIT-055); bairro ou cidade digitados viram o centroide da base IBGE local, sem chamada externa.

### Implementation for User Story 1

- [ ] T018 [US1] Implementar a busca em duas etapas em `services/discovery/src/search/search.ts` (recuperação de até 200 candidatos no Meilisearch) e `services/discovery/src/ranking/rank.ts` (reordenação pela versão vigente, prior bayesiano e semente diária), com cache Redis de 60 s por geohash 6.
- [ ] T019 [US1] Implementar sugestões e alternativas sem resultado (categoria parecida, raio maior) em `services/discovery/src/search/suggest.ts`, com o filtro de `discovery_blocked_terms`.
- [ ] T020 [US1] Implementar as rotas públicas `/v1/public/discovery/{search,suggest,home}` em `services/discovery/src/http/public.ts`.
- [ ] T021 [P] [US1] Implementar a aba Início (C00) atrás da flag `discovery.home_tab` em `apps/consumer-mobile/src/app/(tabs)/inicio/`, e a home e os resultados da web em `apps/consumer-web/src/routes/index.tsx` e `apps/consumer-web/src/routes/busca.tsx`. O cartão mostra os campos de REQ-VIT-003 e há um link "como ordenamos".

**Checkpoint**: o consumidor encontra negócios perto dele.

---

## Phase 4: User Story 2 - Filtrar, comparar e ver no mapa (Priority: P1)

**Goal**: filtros de hoje, amanhã, preço, nota, distância, categoria, pagamento online e acessibilidade, com lista e mapa em ≤ 1 s. Mapa da área visível, com área aproximada para endereço oculto.

**Independent Test**: aplicar cada filtro e alternar entre lista e mapa sem perder a busca (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T022 [P] [US2] Teste de filtros em `services/discovery/src/search/filters.int.test.ts`:
  - cada filtro de REQ-VIT-010 restringe corretamente;
  - com faixa de preço ou nota mínima ativa, negócios de saúde saem da lista e vem o aviso "saúde não mostra preço nem nota";
  - a busca por área visível (`_geoBoundingBox`) devolve `data-model.md` `discovery_listing.geo_precision` `approximate` com centroide, nunca o endereço;
  - "atende em domicílio" não é aceito como filtro.

### Implementation for User Story 2

- [ ] T023 [US2] Implementar os filtros e a busca por área visível em `services/discovery/src/search/filters.ts`, com a exclusão de saúde e o aviso quando houver filtro de preço ou nota.
- [ ] T024 [P] [US2] Implementar o mapa (MapLibre GL com tiles OpenStreetMap e atribuição) e o painel de filtros em `apps/consumer-web/src/routes/busca.mapa.tsx` e `apps/consumer-mobile/src/app/(tabs)/inicio/mapa.tsx`, com alternância entre lista e mapa que mantém a busca.

**Checkpoint**: o consumidor compara e escolhe.

---

## Phase 5: User Story 3 - Agendar em uma tela (Priority: P1)

**Goal**: serviço, profissional, horário e resumo numa tela só, pelo fluxo de 008/009/010/012 com origem `discovery` e sem taxa extra ao tenant.

**Independent Test**: agendar a partir de um resultado e conferir política, pagamento, confirmação e origem (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T025 [P] [US3] Teste de ponta a ponta em `apps/consumer-web/e2e/discovery-booking.spec.ts`:
  - o agendamento é criado pela 009 com `origin = discovery`, com política (010) e pagamento (012);
  - não há taxa além da taxa por agendamento do plano (019; REQ-VIT-022);
  - a mediana da busca à confirmação fica em até 2 minutos (SC-002).

### Implementation for User Story 3

- [ ] T026 [US3] Incluir `discovery` na lista de origens aceitas em `services/scheduling/src/appointments/origin.ts` (009), com migração expandir → migrar no CHECK de `scheduling_appointment.origin` (009) e de `scheduling_occupancy.origin` (008), e na contagem de origem do BI em `bi/ingest/mappings/scheduling.yaml` (023).
- [ ] T027 [US3] Implementar a tela única de agendamento, que chama os contratos de 008 (disponibilidade e hold), 009, 010 e 012 sem reimplementar regras, em `apps/consumer-web/src/routes/busca.$branchId.agendar.tsx` e `apps/consumer-mobile/src/app/(tabs)/inicio/agendar.tsx` (REQ-VIT-020/021).

**Checkpoint**: da busca ao agendamento sem trocar de tela.

---

## Phase 6: User Story 6 - Privacidade de quem chega pela busca (Priority: P1)

**Goal**: localização só ao tocar e nunca guardada. Histórico só com "lembrar minhas buscas", que entra na exportação e na eliminação. Cookies só os necessários, e a vitrine só abre com a política revista publicada.

**Independent Test**: buscar com e sem login e conferir logs, banco e exportação da 022 (quickstart §1 e §7).

### Tests for User Story 6 ⚠️

- [ ] T028 [P] [US6] Teste de privacidade (portão de merge) em `services/discovery/src/__tests__/location-privacy.int.test.ts`: depois de buscas com "perto de mim", nenhuma coordenada aparece em logs, traces, banco, cache nem `discovery_search_history` (SC-005).
- [ ] T029 [P] [US6] Teste em `services/discovery/src/history/history.int.test.ts`:
  - "lembrar minhas buscas" vem desligado; ligado, o histórico entra na exportação e sai na eliminação pelo `HolderDataPort` (REQ-VIT-052);
  - ligar `discovery.search` ou `discovery.home_tab` sem a política revista publicada (`privacy_policy_version` da 022) é recusado (REQ-VIT-051);
  - `applyRetention` remove histórico com mais de 12 meses e pedidos de aviso 30 dias depois da abertura da região.

### Implementation for User Story 6

- [ ] T030 [US6] Arredondar a coordenada a ~100 m na consulta e redigir o campo no logger e nos traces da 001, em `services/discovery/src/search/location.ts` e `packages/platform/logging/src/redact.ts`. Converter bairro ou cidade digitados em centroide pela base IBGE local (`tools/seed-ibge`), sem enviar o texto a serviço externo.
- [ ] T031 [US6] Implementar o histórico e a preferência (`setDiscoveryPreferences`) em `services/discovery/src/history/history.ts`, (`data-model.md` `discovery_search_history.consumer_id`, `discovery_search_history.query_text`, `discovery_search_history.searched_at`), mais o `HolderDataPort` em `services/discovery/src/holder-data/port.ts` com `applyRetention` para as categorias `discovery_search_history` e `discovery_region_waitlist` (prazos lidos da tabela da 022), registrado em `packages/contracts/privacy/holder-ports.yaml`.
- [ ] T032 [US6] Implementar a checagem da política revista ao ligar as flags da vitrine em `services/discovery/src/flags/guard.ts`.
- [ ] T033 [P] [US6] Implementar o banner de medição, com "Recusar" tão visível quanto "Aceitar", e a medição agregada sem cookie em `apps/consumer-web/src/components/ConsentBanner.tsx` e `services/discovery/src/seo/counters.ts` (REQ-VIT-053).

**Checkpoint**: a vitrine abre dentro da LGPD.

---

## Phase 7: User Story 4 - Estabelecimento escolhe aparecer e acompanha o resultado (Priority: P2)

**Goal**: opt-in do Proprietário com lista do que falta e prévia do cartão. Pausa automática e saída em ≤ 15 min, com link e QR funcionando. Painel mensal de resultados.

**Independent Test**: completar os requisitos, entrar, sair e voltar, e ver o painel com agendamentos de origem `discovery` (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T034 [P] [US4] Teste de contrato de `getParticipation` e `setParticipation` em `services/discovery/src/http/tenant.contract.test.ts`.
- [ ] T035 [P] [US4] Teste de integração em `services/discovery/src/participation/participation.int.test.ts`:
  - com requisitos faltando, o estado é `pending` com `data-model.md` `discovery_participation.missing_requirements`; completos, vira `active` (REQ-VIT-031);
  - despublicar, ficar sem horários por 30 dias ou ser suspenso (002/019) leva a `paused`;
  - a saída tira o negócio do índice em ≤ 15 min, e link e QR continuam (SC-006);
  - só o Proprietário faz o opt-in (`discovery_participation.opted_in_by`), com auditoria;
  - o Gerente vê a participação e o desempenho da própria filial, só leitura; o Suporte, só em sessão de suporte.

### Implementation for User Story 4

- [ ] T036 [US4] Implementar a verificação de requisitos pelos contratos de 005, 006 e 007 e a prévia do cartão em `services/discovery/src/participation/requirements.ts`.
- [ ] T037 [US4] Implementar as pausas automáticas (tarefa diária de 30 dias sem horários e consumidores de despublicação e suspensão) em `services/discovery/src/participation/auto-pause.ts`.
- [ ] T038 [US4] Implementar as rotas `/v1/tenant/discovery/participation` em `services/discovery/src/http/tenant.ts`, com o desempenho mensal (aparições, visitas, agendamentos `discovery` e novos consumidores únicos) vindo do `bi-api` da 023 (REQ-VIT-032).
- [ ] T039 [P] [US4] Incluir o mart de desempenho da vitrine em `bi/models/marts/mart_discovery_monthly.sql`.
- [ ] T040 [P] [US4] Implementar a tela nova "Vitrine" (participação e desempenho, em até 2 toques) em `apps/tenant-web/src/routes/discovery/` (SC-008).

**Checkpoint**: o estabelecimento controla a própria presença.

---

## Phase 8: User Story 5 - Regiões, verticais e páginas de categoria (Priority: P2)

**Goal**: regiões candidatas com contagem por categoria, abertura e fechamento pela Gestão, convites e "avise-me". Taxonomia mantida no back-office. Páginas `koovela.com/{cidade}/{categoria}` pré-renderizadas, indexáveis e rápidas. Denúncia e moderação.

**Independent Test**: abrir uma região no back-office e conferir as páginas geradas e indexáveis (quickstart §5 e §6).

### Tests for User Story 5 ⚠️

- [ ] T041 [P] [US5] Teste de contrato de `listRegions`, `regionAction`, `setRankingVersion`, `setTaxonomy`, `removeListing`, `reportListing` e `subscribeRegionAlert` em `services/discovery/src/http/admin.contract.test.ts`.
- [ ] T042 [P] [US5] Teste de integração em `services/discovery/src/regions/regions.int.test.ts`:
  - 12 participantes não atingem a base; 15 em 3 km atingem (`data-model.md` `discovery_region.meets_minimum`, `discovery_region.counts_by_category`);
  - abrir sem a base mínima é recusado (SC-003);
  - abrir dispara convites e avisos aos inscritos pela 011 (T071) (`discovery_region_waitlist.revoked_at` respeitado); pedido de aviso exige conta;
  - nova versão de ranking pelo Comercial/Growth fica pendente até a aprovação (`dual_control`);
  - fora de região aberta, a busca mostra os mais próximos e oferece "avise-me" (REQ-VIT-041);
  - denúncia → fila → retirada com aviso e trilha (`discovery_report.state`; REQ-VIT-050).
- [ ] T043 [P] [US5] Lighthouse CI e axe em `apps/consumer-web/lighthouserc.json` e `apps/consumer-web/e2e/discovery-a11y.spec.ts`: LCP < 2,5 s em 4G, WCAG 2.1 AA, texto antes das imagens em 3G (REQ-VIT-043/044, SC-007).

### Implementation for User Story 5

- [ ] T044 [US5] Implementar a tarefa diária de contagem e a abertura e fechamento auditados (`data-model.md` `discovery_region.decided_by`, `discovery_region.decided_at`, `discovery_region.city_ibge`, `discovery_region.neighborhood`, `discovery_region.polygon`; `discovery_region_waitlist.consumer_id`, `discovery_region_waitlist.region_id`, `discovery_region_waitlist.created_at`) em `services/discovery/src/regions/regions.ts`, com a base IBGE de municípios e bairros carregada por `tools/seed-ibge/src/load.ts`.
- [ ] T045 [US5] Implementar a denúncia e a moderação em `services/discovery/src/reports/reports.ts` (`data-model.md` `discovery_report.branch_id`, `discovery_report.reporter_consumer_id`, `discovery_report.reason`, `discovery_report.moderator_id`), integrando a fila do back-office (021).
- [ ] T046 [US5] Implementar as rotas admin e de consumidor (`region-alerts`) em `services/discovery/src/http/admin.ts` e `services/discovery/src/http/consumer.ts`.
- [ ] T047 [US5] Implementar as páginas pré-renderizadas `koovela.com/{cidade}` e `koovela.com/{cidade}/{categoria}`, regeneradas a cada 1 h e por `discovery.region.*`, com sitemap, em `apps/consumer-web/src/routes/$cidade.tsx`, `apps/consumer-web/src/routes/$cidade.$categoria.tsx` e `services/discovery/src/seo/sitemap.ts`.
- [ ] T048 [US5] Incluir os nomes de cidade e categoria na verificação de slugs reservados da 005 em `services/tenancy/src/business/slug-reserved.ts`.
- [ ] T049 [P] [US5] Implementar as telas novas do back-office (regiões, ranking, taxonomia e sinônimos, moderação) em `apps/admin-web/src/routes/discovery/`.

**Checkpoint**: a vitrine cresce por região, com páginas indexáveis.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T050 [P] Teste de carga (100 buscas/s com 10 mil filiais; p95 ≤ 1 s, filtros ≤ 1 s) em `tests/load/discovery.k6.ts` (REQ-VIT-007, SC-001).
- [ ] T051 [P] Testes com as flags `discovery.search` e `discovery.home_tab` ligadas e desligadas em `services/discovery/src/__tests__/flags.int.test.ts`.
- [ ] T052 [P] Painel Grafana "Vitrine" em `infra/observability/dashboards/discovery.json` (frescor do índice, latência de busca, buscas sem resultado, memória do Meilisearch) e alertas em `infra/observability/alerts/discovery.yml`.
- [ ] T053 Registrar as telas a conferir na DF 9.10 e as telas novas (painel e back-office) em `docs/design/telas-sem-prototipo-024.md`, e o plano de migração para tiles vetoriais self-hosted em `docs/ops/decisions/tiles-mapa.md`.
- [ ] T054 Executar o [quickstart.md](./quickstart.md) inteiro em staging, acompanhar a memória do host de dados (Meilisearch, ClickHouse e MySQL) e registrar em `docs/ops/decisions/validacao-024.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (busca).
- **US3** depende de US1 (resultado).
- **US6** depende de US1 e pode correr em paralelo com US2 e US3. Ela bloqueia a abertura pública.
- **US4** depende da fase 2 e da 023 (desempenho) e pode começar junto com US1.
- **US5** depende de US1 e US4 (contagem de participantes).
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Fundação: T005 a T007 (testes), T013 e T014.
- Depois de US1: US2, US3 e US6 em paralelo.

---

## Parallel Example: User Story 1

```bash
Task: "T015 contrato público"
Task: "T016 ranking"
Task: "T017 busca"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1 (busca com ranking explicado).
3. **Parar e validar** com o quickstart §1 e §2. Não abrir ao público antes de US6.

### Incremental Delivery

1. US2 → US3 → US6 (filtros, agendamento e privacidade): vitrine pronta para abrir.
2. US4 → US5 (participação, regiões e páginas de SEO).
3. Polish (carga e observabilidade).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US6 → US4 → US5 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-VIT que atende. Campos com restrição citam `data-model.md` e o campo.
- O `discovery` só lê eventos públicos e nunca acessa schemas de tenant.
- A política de privacidade revista (022) é pré-requisito para ligar as flags.
- Commit por tarefa ou grupo lógico, em branch `024-vitrine-busca`, por PR.
- Análise de 2026-11-27: fontes do índice definidas nas specs donas (008 T059 resumo de disponibilidade, 005 T073 acessibilidade, 016 T042 nota agregada por evento, 012 `payments.payee.changed`); retenção pela 022 no port (T031); campos citados; origem `discovery` no CHECK da 008 e da 009 (T026); bairro e cidade pela base IBGE local (endereço completo depois); saúde fora da lista com filtro de preço ou nota; aviso de região só com conta; aprovação do ranking pelo `dual_control` da 021. Avisos na 011 (T071). Sem tarefas novas nesta spec.
