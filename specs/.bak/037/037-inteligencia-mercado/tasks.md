---
description: "Lista de tarefas da spec 037 — Inteligência de mercado"
---

# Tasks: Inteligência de mercado

**Input**: documentos de `specs/037-inteligencia-mercado/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 036 concluídas, especialmente 023 (BI) e 024 (regiões e taxonomia).

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- regras de publicação: nenhum número para recorte abaixo do mínimo ou com estabelecimento dominante (REQ-INT-010/011, SC-001);
- reidentificação: nenhum ataque por diferença, interseção ou variação temporal isola um estabelecimento (REQ-INT-012, SC-002);
- nenhum dado sai além do PDF da própria comparação (REQ-INT-020, SC-005);
- nenhum dado pessoal nos modelos `insights` (REQ-INT-015).

**Organization**: por história de usuário. P1: US1 (benchmark). P2: US2 (mapa de procura) e US3 (recortes e proteção no back-office). P3: US4 (sair da base). O pipeline de cálculo semanal, o verificador de publicação e a configuração ficam na fundação, porque nada pode ser exibido sem eles.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US4).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar as pastas `bi/models/insights/`, `bi/metrics/insights/`, `bi/insights/rules/` (e `bi/insights/publish.py`, `rounding.py`, `levels.py`), `bi/tests/insights/` e o serviço TypeScript `services/insights-config/` (`package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS`, `src/`, `migrations/`).
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/insights.openapi.yaml` e `packages/contracts/asyncapi/insights-events.asyncapi.yaml` (fonte: `specs/037-inteligencia-mercado/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - benchmark e mapa de procura pelo Gerente da própria filial e pelo Proprietário;
  - participação só pelo Proprietário, com `audit_category`;
  - configuração com aprovação dupla (004) e acesso a recortes não publicados pela Gestão de Dados, auditado.

  Declarar a flag `insights.benchmark` em `packages/contracts/flags/flags.yaml` e a função `insights.benchmark` nas funções de plano da 019 em `packages/contracts/billing/entitlements.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: configuração e participação, valores por filial, verificador de publicação e ciclo semanal com publicação atômica.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste das regras de publicação (portão de merge) em `bi/tests/insights/test_publication_rules.py`:
  - bairro com 4 estabelecimentos → `blocked` (`below_minimum`);
  - um estabelecimento com mais de 30% do peso → `blocked` (`dominance`; `data-model.md` `insights_cut.max_weight_share`);
  - pai e filho publicados com complemento abaixo do mínimo → filho suprimido (`complementary`);
  - mudança de 1 a `min − 1` contribuintes com variação acima do arredondamento → `temporal`;
  - nenhum `insights_benchmark_value` existe para recorte não `published` (SC-001).
- [ ] T005 [P] Teste de reidentificação (portão de merge) em `bi/tests/insights/test_reidentification.py`: o atacante simulado conhece os recortes publicados de vários níveis, categorias e semanas e não recupera nenhum valor individual dentro da tolerância do arredondamento (SC-002). O teste roda no CI e em toda mudança de configuração.
- [ ] T006 [P] Teste de configuração em `services/insights-config/src/__tests__/config.int.test.ts`:
  - `data-model.md` `insights_config_version.min_establishments` < 5 é recusado;
  - os níveis nunca passam de `city` (`insights_config_version.region_levels`);
  - mudanças exigem aprovação dupla (`insights_config_version.requested_by`, `insights_config_version.approved_by`) e disparam o teste de reidentificação.

### Implementação da fundação

- [ ] T007 Criar a migração `services/insights-config/migrations/0001_insights.ts` em `koovela_platform`, com `insights_config_version` (CHECK em `data-model.md` `insights_config_version.min_establishments` ≥ 5 e `insights_config_version.state`; `insights_config_version.dominance_pct`, `insights_config_version.zones`, `insights_config_version.active_metrics`, `insights_config_version.excluded_verticals_by_metric`, `insights_config_version.rounding`, `insights_config_version.opportunity_thresholds`, `insights_config_version.plans_with_access`, `insights_config_version.period_options_days` e `insights_config_version.lag_days`) e `insights_participation` (CHECK em `insights_participation.state`, padrão `on`).
- [ ] T008 Implementar a configuração com aprovação dupla e a participação (`proposeInsightsConfig`, `approveInsightsConfig`, `listInsightsConfig`) em `services/insights-config/src/config.ts`, com a extração periódica para o ClickHouse em `bi/ingest/extract/insights_config.py`.
- [ ] T009 Criar os modelos dbt dos valores por filial (`insights_contributor_value`, só interno e nunca lido pelo `bi-api`) para as oito métricas da R4, a partir dos marts da 023, em `bi/models/insights/contributor_values.sql`, e as definições versionadas em `bi/metrics/insights/*.yml`. Saúde fica sem preço, e negócios com menos de 30 dias não contribuem.
- [ ] T010 Implementar os níveis de região (bairro → zona → cidade, pelo ponto real da filial da 005), o período móvel com defasagem (`data-model.md` `insights_cut.period_end` = data do cálculo − `lag_days`) e os recortes em `bi/insights/levels.py` e `bi/models/insights/cuts.sql`, com `insights_cut.contributors_band` e `insights_cut.contributors_count`.
- [ ] T011 Implementar o verificador (regras 1 a 4, arredondamento por métrica e faixa de contribuintes) em `bi/insights/rules/*.py`, `bi/insights/rounding.py` e `bi/insights/publish.py`, gravando `data-model.md` `insights_cut.state` e `insights_cut.block_reason` e publicando `insights.benchmark.cut_blocked.v1`.
- [ ] T012 Implementar o ciclo semanal (segunda às 03:00 em America/Sao_Paulo: dbt build → verificação → teste de reidentificação → publicação atômica pela troca da versão publicada → `insights.benchmark.calculated.v1`) em `bi/insights/run.py`, com `data-model.md` `insights_run.state` e `insights_run.reid_test_passed`.

**Checkpoint**: só sai número que passou em todas as regras.

---

## Phase 3: User Story 1 - Comparar o meu negócio com a região (Priority: P1) 🎯 MVP

**Goal**: por filial, categoria e período, o valor do negócio, a mediana e a faixa central da região, com definição, nível de região e faixa de estabelecimentos visíveis. A região sobe até atingir o mínimo; sem mínimo, "dados insuficientes". Acesso pelo plano e PDF da própria comparação.

**Independent Test**: com 30 estabelecimentos sintéticos numa cidade, conferir a posição de um deles em cada métrica e as faixas (quickstart §1 e §2).

### Tests for User Story 1 ⚠️

- [ ] T013 [P] [US1] Teste de contrato de `getBenchmark` e `exportOwnComparisonPdf` em `bi/tests/insights/test_benchmark_contract.py`.
- [ ] T014 [P] [US1] Teste de saída de dados (portão de merge) em `bi/tests/insights/test_no_data_egress.py`:
  - o `bi-api` só responde pelo gateway com o `tenant_id` resolvido;
  - nenhuma rota devolve dados brutos, contagem exata ou recortes fora das filiais do tenant;
  - não há CSV nem chave de API;
  - o PDF tem marca d'água (SC-005).

  Incluir os modelos `insights` na varredura de PII da 023 em `bi/checks/scan_pii.py`.
- [ ] T015 [P] [US1] Teste de integração em `bi/tests/insights/test_positions.py`:
  - `data-model.md` `insights_branch_position.level_used` é o menor nível publicado;
  - `insights_branch_position.status` é `forming` para negócio novo e `insufficient_data` sem mínimo na cidade;
  - o percentil aproximado bate;
  - sem a função `insights.benchmark` no plano, o painel mostra o que o plano não inclui;
  - toda métrica mostrada traz definição, nível e faixa (SC-004).

### Implementation for User Story 1

- [ ] T016 [US1] Implementar o modelo dbt dos quantis (P25, mediana e P75 por interpolação tipo 7, arredondados) em `bi/models/insights/benchmark_values.sql` e o das posições por filial em `bi/models/insights/branch_positions.sql`.
- [ ] T017 [US1] Implementar as rotas `/insights/benchmark` e `/insights/benchmark/pdf` no `bi-api`, com limite de requisições e checagem da função do plano (019, `getEntitlements`), em `bi/api/routes/insights.py`, e o encaminhamento no gateway em `services/gateway/src/routes/insights.ts`.
- [ ] T018 [US1] Implementar o PDF da própria comparação (nome do negócio, data e marca d'água "uso interno do estabelecimento") pelo `packages/platform/documents` (035) no `workers` em `services/workers/src/insights/comparison-pdf.ts`.
- [ ] T019 [P] [US1] Implementar a tela "Inteligência de mercado" (benchmark por filial, "como é calculado", "dados de DD/MM a DD/MM", posição em até 3 toques, SC-003) em `apps/tenant-web/src/routes/inteligencia/`.

**Checkpoint**: o negócio se compara sem expor ninguém.

---

## Phase 4: User Story 2 - Ver a procura da região por dia e horário (Priority: P2)

**Goal**: índice relativo de 0 a 100 por dia e faixa de hora na região, ao lado da ocupação da filial, com oportunidades destacadas e atalhos para a escala e para os horários ociosos.

**Independent Test**: com buscas e agendamentos sintéticos, conferir os horários de pico da região e da filial lado a lado (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T020 [P] [US2] Teste de contrato e integração de `getDemandMap` em `bi/tests/insights/test_demand_map.py`:
  - `data-model.md` `insights_demand_index.index` vai de 0 a 100, em múltiplos de 5, ou NULL ("—") com volume pequeno;
  - as regras de mínimo e dominância valem por recorte;
  - oportunidade = índice da região ≥ `opportunity_thresholds.region_index_min` e ocupação da filial ≤ `opportunity_thresholds.occupancy_max_pct`;
  - nenhum valor absoluto é exposto.

### Implementation for User Story 2

- [ ] T021 [US2] Implementar o modelo dbt da procura (agendamentos criados da 009 + buscas com intenção de horário da 024, agregadas e com peso configurável) em `bi/models/insights/demand_index.sql`.
- [ ] T022 [US2] Implementar a rota `/insights/demand` com a ocupação da filial vinda dos marts do tenant (023) em `bi/api/routes/insights_demand.py`.
- [ ] T023 [P] [US2] Implementar o mapa de procura com atalhos para a escala (007) e para os horários ociosos da **014** em `apps/tenant-web/src/routes/inteligencia/Demand.tsx`.

**Checkpoint**: o negócio enxerga onde há procura sem ocupação.

---

## Phase 5: User Story 3 - Recortes e proteção no back-office (Priority: P2)

**Goal**: configuração versionada com aprovação dupla. Cobertura por categoria e cidade, recortes bloqueados por motivo e uso do painel. Acessos da Gestão de Dados auditados.

**Independent Test**: rodar a verificação de um mês sintético com um bairro de 4 estabelecimentos e um com dominante, e conferir que nenhum é publicado (quickstart §1 e §5).

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Teste em `bi/tests/insights/test_coverage.py`:
  - a página de cobertura mostra os recortes bloqueados por `data-model.md` `insights_cut.block_reason` e as contagens de `insights_run.blocked_count`;
  - todo acesso da Gestão de Dados a recorte não publicado vai para a trilha (REQ-INT-032).

### Implementation for User Story 3

- [ ] T025 [US3] Implementar a página de cobertura e bloqueios no Dash (`bi.koovela.com`, Gestão de Dados), com registro de acesso, em `bi/web/pages/insights_coverage.py`.
- [ ] T026 [P] [US3] Implementar a configuração no back-office (mínimo, dominância, zonas compartilhadas com a 024, métricas, verticais excluídas, limiares, planos com acesso, arredondamentos, com proposta e aprovação) em `apps/admin-web/src/routes/insights/`.

**Checkpoint**: a Gestão controla as regras e vê o que foi bloqueado.

---

## Phase 6: User Story 4 - Sair da base do benchmark (Priority: P3)

**Goal**: participação ligada por padrão, conforme os termos. Só o Proprietário desliga, com aviso de reciprocidade. Quem sai some dos cálculos seguintes e perde o acesso na hora; ao religar, volta no próximo cálculo.

**Independent Test**: desligar a participação e conferir que o negócio some do cálculo seguinte e perde o painel (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T027 [P] [US4] Teste de contrato e integração de `getParticipation` e `setParticipation` em `services/insights-config/src/__tests__/participation.int.test.ts`:
  - com `data-model.md` `insights_participation.state` = `off`, o negócio não contribui no cálculo seguinte e o painel é bloqueado na hora;
  - os números já publicados não são refeitos;
  - ao religar, o negócio volta no próximo cálculo;
  - `insights.benchmark.participation_changed.v1` e a trilha (004) são gerados (`insights_participation.changed_by`).

### Implementation for User Story 4

- [ ] T028 [US4] Implementar a participação e as rotas `/v1/tenant/insights/participation` em `services/insights-config/src/participation.ts`, e o filtro de participantes nos modelos dbt em `bi/models/insights/contributors.sql`.
- [ ] T029 [P] [US4] Implementar a opção de saída, com o aviso de reciprocidade, em `apps/tenant-web/src/routes/inteligencia/Participation.tsx`.

**Checkpoint**: participar é padrão, sair é simples.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T030 [P] Caso de isolamento em `tests/isolation/cases/insights.ts`: o tenant A não obtém a posição nem recortes das filiais do tenant B.
- [ ] T031 [P] Testes com a flag `insights.benchmark` ligada e desligada em `bi/tests/insights/test_flags.py`, e axe na tela em `apps/tenant-web/e2e/insights-a11y.spec.ts`.
- [ ] T032 [P] Métricas do ciclo semanal (duração, recortes bloqueados, falhas, uso do painel) e alertas em `infra/observability/dashboards/insights.json` e `infra/observability/alerts/insights.yml`.
- [ ] T033 Registrar as pendências em `docs/ops/decisions/inteligencia-mercado.md`:
  - a correção da referência "spec 017" para **014** na spec, a aplicar no próximo ajuste;
  - a cláusula de participação por padrão nos termos de uso (005/019), que precisa de revisão jurídica antes de ligar a flag;
  - a privacidade diferencial como evolução, caso o teste de reidentificação aponte risco com dados reais.

  Registrar as telas a conferir (mapa de procura, saída e back-office) em `docs/design/telas-sem-prototipo-037.md`.
- [ ] T034 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-037.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende da fase 2 e pode correr em paralelo com US1.
- **US3** depende da fase 2 e pode correr em paralelo com US1.
- **US4** depende da fase 2. O bloqueio do painel depende de US1.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → modelos → API → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 a T006.
- Depois da fase 2: US1, US2 e US3 em paralelo.

---

## Parallel Example: depois da fundação

```bash
Task: "T013 contrato do benchmark"
Task: "T020 mapa de procura"
Task: "T024 cobertura e bloqueios"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2 (com os dois portões de proteção).
2. US1 (benchmark e PDF).
3. **Parar e validar** com o quickstart §1 e §2. A flag só liga depois da revisão jurídica dos termos.

### Incremental Delivery

1. US3 (cobertura e configuração), para acompanhar o início com poucos negócios por bairro.
2. US2 (mapa de procura).
3. US4 (saída) → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US3 → US2 → US4 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-INT que atende. Campos com restrição citam `data-model.md` e o campo.
- O cálculo lê só a cópia analítica (023); valores individuais nunca saem do ClickHouse.
- Nada é vendido, exportado em bruto ou oferecido por API; só o PDF da própria comparação.
- Commit por tarefa ou grupo lógico, em branch `037-inteligencia-mercado`, por PR.
