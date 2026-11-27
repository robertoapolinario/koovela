---
description: "Lista de tarefas da spec 023 — BI e painéis"
---

# Tasks: BI e painéis

**Input**: documentos de `specs/023-bi-paineis/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 022 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- nenhum mapa de ingestão inclui campo `x-pii` (REQ-BI-003);
- todo acesso do `bi-api` é filtrado pelo tenant do gateway (REQ-BI-023);
- o mês fechado bate ao centavo com 012 e 019 (REQ-BI-016).

**Organization**: por história de usuário (US1–US5). P1: US1, US2 e US3 (painéis da Gestão). P2: US4 (dashboards do estabelecimento) e US5 (confiança nos números). Ingestão sem PII, pseudônimos, camada de consulta com supressão e o app Dash ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o projeto Python `bi/` com `bi/pyproject.toml` e `bi/uv.lock` (Python 3.13; `clickhouse-connect`, `aio-pika`, `dbt-core`, `dbt-clickhouse`, `dash`, `plotly`, `gunicorn`, `fastapi`, `uvicorn`, `pydantic`, `pytest`), as pastas `bi/{ingest,models,metrics,api,web,checks,tests}` e o `bi/Makefile` com os alvos `scan-pii`, `test-isolation`, `reconcile` e `load-test`.
- [ ] T002 [P] Criar `infra/compose/bi.yml` com `clickhouse` (`linux/arm64`, limite de memória, volume próprio), `bi-ingest`, `bi-api` e `bi-web`, nas redes de staging e produção. O usuário do BI não recebe credencial do MySQL transacional (REQ-BI-001).
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/bi-api.openapi.yaml` e `packages/contracts/schemas/bi-ingest-mapping.schema.json` (fonte: `specs/023-bi-paineis/contracts/`) e rodar `pnpm contracts:generate`. Incluir o job `bi` (uv, pytest, `dbt build`) em `.github/workflows/pr.yml`.
- [ ] T004 [P] Incluir em `packages/contracts/rbac/permissions.yaml` uma célula por painel e dashboard, conforme a tabela de permissões da spec:
  - `bi.dashboard.branch` (Gerente da filial, Proprietário);
  - `bi.dashboard.network` (Proprietário);
  - `bi.panel.operational`, `bi.panel.financial` (Comercial/Growth sem margem por tenant) e `bi.panel.cohort`;
  - `bi.input.channel_spend` (Comercial/Growth) e `bi.input.infra_cost` (Fin/Ops, SRE), com `audit_category`;
  - Suporte só em sessão de suporte.

  Declarar a flag `bi.v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: armazenamento analítico, ingestão sem PII, pseudônimos, camada de consulta com supressão e casca do app da Gestão.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Portão de CI em `bi/tests/test_mappings.py`: todo `bi/ingest/mappings/*.yaml` valida contra `bi-ingest-mapping.schema.json` e o teste falha se algum `from` apontar para um campo `x-pii` no AsyncAPI de `source_contract` (REQ-BI-003) ou se `refs` receber id de agendamento, pagamento ou consumidor sem `hmac` (invariante 6 do `data-model.md`).
- [ ] T006 [P] Teste do consumidor em `bi/tests/test_ingest.py`:
  - campos não mapeados são descartados;
  - o mesmo `event_id` gravado duas vezes conta uma vez (`data-model.md` `raw_events.event_id`);
  - consumidor e colaborador saem como pseudônimo (`raw_events.subject_pseudo`, `raw_events.staff_pseudo`), nunca como id real;
  - mensagem inválida vai para a DLQ.
- [ ] T007 [P] Teste da camada de consulta em `bi/tests/test_query_layer.py`: célula com menos de 5 tenants ou consumidores retorna `null` e a interface mostra "—" ou "poucos dados" (REQ-BI-014, SC-007); consulta de tenant sem filtro de tenant é recusada.

### Implementação da fundação

- [ ] T008 Criar o DDL do ClickHouse em `bi/ingest/schema/0001_raw_events.sql`: `raw_events` como ReplacingMergeTree por `data-model.md` `raw_events.event_id`, particionada por mês de `raw_events.occurred_at` (com `raw_events.event_type`, `raw_events.tenant_id`, `raw_events.branch_id`, `raw_events.currency`, `raw_events.state`), com `raw_events.dims` e `raw_events.refs` como Map e `raw_events.amount_cents` como `Int64`. Criar também os bancos `staging` e `marts`.
- [ ] T009 Criar a migração `services/platform/migrations/0023_bi_platform.ts` em `koovela_platform`, com:
  - `pseudonym_map`: CHECK em `data-model.md` `pseudonym_map.kind`, `pseudonym_map.pseudo_id` como UUID v4 e índice único em (`pseudonym_map.real_id`, `pseudonym_map.kind`);
  - `bi_channel_spend` e `bi_infra_cost`: CHECK em `bi_infra_cost.kind`, e `bi_channel_spend.amount_cents` e `bi_infra_cost.amount_cents` em centavos.
- [ ] T010 Implementar o serviço de pseudônimos em `services/platform/src/pseudonym/pseudonym.ts`, com rota interna `/v1/internal/pseudonym`. Ele gera um UUID v4 aleatório na primeira consulta e é o único caminho entre id real e pseudônimo. O BI nunca lê `pseudonym_map`.
- [ ] T011 Implementar o consumidor `bi-ingest` em `bi/ingest/consumer.py`, com fila própria e DLQ, aplicação dos mapas, `transform` de pseudonimização pelo serviço da T010, gravação em lote (a cada 30 s ou 5 mil eventos) e `data-model.md` `raw_events.ingested_at` (REQ-BI-002). Referências a pessoa em `raw_events.refs` só como `hmac` com o sal do BI.
- [ ] T012 [P] Escrever os mapas de ingestão dos eventos de agenda, atendimento e origem (009, 010, 013, 014) em `bi/ingest/mappings/scheduling.yaml`.
- [ ] T013 [P] Escrever os mapas dos eventos de pagamentos, conciliação, repasses e fiscal (012, 017, 018) em `bi/ingest/mappings/payments.yaml`.
- [ ] T014 [P] Escrever os mapas dos eventos de tenant, plano, assinatura e faturas (002, 005, 019) em `bi/ingest/mappings/tenancy.yaml`.
- [ ] T015 [P] Escrever os mapas dos eventos de identidade, instalação do app, notificações, fidelidade, avaliações e back-office (003, 011, 015, 016, 021) em `bi/ingest/mappings/engagement.yaml`, incluindo `identity.consumer.app_first_seen.v1` (003 T093), `scheduling.double_booking.detected.v1` (008 T058), `platform.incident.resolved.v1` (001 T130) e o `acquisition_channel` do tenant (005 T072). A extração periódica da escala (007) vai para a ocupação em `bi/ingest/extract/staff_availability.py`.
- [ ] T016 Criar o projeto dbt em `bi/models/dbt_project.yml`, com as camadas `staging/` e as dimensões `bi/models/marts/dim_tenant.sql` (`data-model.md` `dim_tenant.activated_month`, `dim_tenant.is_solo`, `dim_tenant.vertical`, `dim_tenant.city`, `dim_tenant.plan_id`, `dim_tenant.acquisition_channel`), `dim_branch.sql` (`dim_branch.branch_id`, `dim_branch.tenant_id`, `dim_branch.city`) e `dim_date.sql`. Tenant suspenso ou arquivado sai dos ativos e continua no histórico; dia pela data local da filial.
- [ ] T017 Implementar a camada única de consulta em `bi/query/query.py`, com filtro obrigatório por tenant nas consultas de tenant, supressão de células com menos de 5 entidades e retorno do máximo de `data-model.md` `raw_events.ingested_at` dos marts usados, para mostrar o frescor.
- [ ] T018 Implementar o carregador de definições de métrica em `bi/metrics/loader.py`. Ele valida `bi/metrics/*.yml` (`data-model.md` `metric.name`, `metric.version`, `metric.effective_from`, `metric.counts`, `metric.excludes`, `metric.source_events`, `metric.owner`, `metric.requires_feature`) e publica `platform.bi_metric_definition.published.v1` a cada nova versão. Métrica com `requires_feature` só aparece quando a flag existe (REQ-BI-005/040).
- [ ] T019 Implementar a casca do app Dash em `bi/web/app.py`, servida por Gunicorn atrás do Cloudflare Access com MFA (`bi.koovela.com` pelo Tunnel), com mapeamento do perfil do token do Access para as células da T004, componente de definição da métrica ao passar o cursor ou tocar (SC-006) e componente de frescor (REQ-BI-017).
- [ ] T020 [P] Teste de acesso em `bi/tests/test_web_access.py`: sem Access e MFA, bloqueado; cada perfil vê só os painéis da matriz; o Suporte não abre os painéis da Gestão (em sessão de suporte, só os dashboards do tenant atendido, testado na T036).

**Checkpoint**: eventos entram sem PII, consultas respeitam tenant e supressão, e o app da Gestão abre com controle de acesso.

---

## Phase 3: User Story 1 - Painel operacional da Gestão (Priority: P1) 🎯 MVP

**Goal**: North Star, ativação, engajamento, qualidade e operação por mês, com filtros e definição visível.

**Independent Test**: com 20 tenants sintéticos e 3 meses de dados, cada métrica bate com a contagem direta nos eventos de origem (quickstart §4).

### Tests for User Story 1 ⚠️

- [ ] T021 [P] [US1] Testes dbt em `bi/models/marts/mart_platform_monthly.yml` e teste de comparação em `bi/tests/test_operational.py`: a North Star (concluídos e pagos), os ativados (primeiro atendimento concluído e pago), o % de primeiro agendamento em 7 dias, a instalação do app, web → app, ocupação, agendamentos por tenant ativo, no-show com e sem lembrete, avaliação média e reserva dupla batem com a contagem nos eventos (SC-001); tenant suspenso ou arquivado fora dos ativos e no histórico; virada de dia pela data local da filial; métrica com `requires_feature` ausente não aparece.

### Implementation for User Story 1

- [ ] T022 [P] [US1] Escrever as definições das métricas operacionais em `bi/metrics/operational/*.yml` (North Star conforme a DF 14, `activated`, `first_booking_7d`, `app_install`, `web_to_app`, `occupancy`, `no_show_reminder`, `double_booking`, `mttr`, `infra_cost_per_tenant`, `migration_failures`).
- [ ] T023 [US1] Implementar `bi/models/marts/mart_tenant_daily.sql` (`data-model.md` `mart_tenant_daily.occupancy_bps`, `mart_tenant_daily.avg_rating_x10`, `mart_tenant_daily.revenue_platform_cents`, `mart_tenant_daily.revenue_on_site_cents`, `mart_tenant_daily.appointments`, `mart_tenant_daily.completed`, `mart_tenant_daily.no_shows`, `mart_tenant_daily.late_cancels`, `mart_tenant_daily.new_consumers`, `mart_tenant_daily.origin_counts`), `bi/models/marts/mart_staff_occupancy_daily.sql` (`mart_staff_occupancy_daily.booked_min`, `mart_staff_occupancy_daily.available_min`) e `bi/models/marts/mart_platform_monthly.sql`.
- [ ] T024 [US1] Implementar o painel B01 em `bi/web/panels/operational.py`, com a camada de operação (MTTR, custo de infra por tenant a partir de `bi_infra_cost`, falhas de migração da 002) e os filtros de período, vertical, categoria, cidade, plano, canal e coorte de ativação em `bi/web/components/filters.py` (REQ-BI-010/013).

**Checkpoint**: a Gestão mede se o produto funciona.

---

## Phase 4: User Story 2 - Painel financeiro da Gestão (Priority: P1)

**Goal**: GMV, receita por fonte, take rate, ARPA, NRR, inadimplência, chargebacks, margem por tenant e CAC por canal, com mês fechado batendo ao centavo.

**Independent Test**: com um mês sintético de pagamentos e faturas, os totais batem ao centavo com 012 e 019 (quickstart §5).

### Tests for User Story 2 ⚠️

- [ ] T025 [P] [US2] Teste de reconciliação (portão de merge) em `bi/tests/test_reconcile.py`:
  - o mês fechado bate ao centavo com a conciliação da 012 e as faturas da 019 (SC-002);
  - estorno em novembro de atendimento de outubro aparece em novembro (REQ-BI-016);
  - Comercial/Growth não vê a margem por tenant;
  - pagamento no local entra no GMV separado e fica fora do take rate.
- [ ] T026 [P] [US2] Teste de contrato de `setManualInput` em `bi/tests/test_manual_inputs.py`: cada insumo é versionado e auditado, e só o perfil da célula informa cada tipo (REQ-BI-015).

### Implementation for User Story 2

- [ ] T027 [P] [US2] Escrever as definições financeiras em `bi/metrics/financial/*.yml` (GMV por meio, receita por fonte com a taxa no split e na fatura da PEN-09, take rate efetivo, ARPA, NRR, inadimplência e recuperação, chargebacks, perda por fraude, margem por tenant com o método, CAC).
- [ ] T028 [US2] Implementar `bi/models/marts/mart_finance_monthly.sql`, congelado no fechamento a partir do contrato de exportação de fechamento da 012 e da 019 (rotas internas; nunca conexão ao MySQL transacional, REQ-BI-001), em `bi/ingest/extract/month_close.py`.
- [ ] T029 [US2] Implementar a rota `setManualInput` (`/v1/admin/bi/inputs/{kind}`) em `services/platform/src/bi-inputs/inputs.ts`, que grava em `bi_channel_spend` e `bi_infra_cost` com `data-model.md` `bi_channel_spend.month`, `bi_channel_spend.channel`, `bi_channel_spend.author_id`, `bi_infra_cost.month` e `bi_infra_cost.author_id`, audita pela 004 e copia ao ClickHouse em `bi/ingest/extract/manual_inputs.py`.
- [ ] T030 [US2] Implementar o painel B02 em `bi/web/panels/financial.py` e a tela nova de insumos manuais em `bi/web/panels/manual_inputs.py`.

**Checkpoint**: números financeiros confiáveis para decisões de preço.

---

## Phase 5: User Story 3 - Painel de coorte e retenção (Priority: P1)

**Goal**: retenção e NRR de tenants por mês de ativação; recompra de consumidores em 30, 60 e 90 dias, no estabelecimento e na plataforma.

**Independent Test**: coortes sintéticas conferidas contra cálculo direto nos eventos (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T031 [P] [US3] Testes em `bi/tests/test_cohort.py`: matriz de retenção e NRR por coorte e curva de recompra batem com o cálculo direto; filtros com e sem fidelidade e com e sem app recalculam; célula com menos de 5 mostra "poucos dados".

### Implementation for User Story 3

- [ ] T032 [P] [US3] Escrever as definições em `bi/metrics/cohort/*.yml` (`tenant_retention`, `cohort_nrr`, `consumer_repurchase_30_60_90`).
- [ ] T033 [US3] Implementar `bi/models/marts/mart_cohort_tenant.sql` e `bi/models/marts/mart_cohort_consumer.sql`.
- [ ] T034 [US3] Implementar o painel B03 em `bi/web/panels/cohort.py` (REQ-BI-012).

**Checkpoint**: a Gestão vê se o produto segura quem entra.

---

## Phase 6: User Story 4 - Dashboard da filial e da rede (Priority: P2)

**Goal**: P01 (filial) e P02 (rede, só para o Proprietário) pelo `bi-api` atrás do gateway, com Gerente restrito à própria filial e sem comparações para autônomos.

**Independent Test**: tenant com duas filiais e um mês de dados, aberto como Gerente e como Proprietário (quickstart §3).

### Tests for User Story 4 ⚠️

- [ ] T035 [P] [US4] Teste de contrato de `branchDashboard` e `networkDashboard` em `bi/tests/test_bi_api_contract.py`.
- [ ] T036 [P] [US4] Teste de isolamento e permissões (portão de merge) em `bi/tests/test_bi_api_isolation.py`:
  - o `tenant_id` vem só do gateway e um id enviado pelo cliente é ignorado (REQ-BI-023);
  - Gerente da filial B recebe `bi.branch_forbidden` e vê a receita só da própria filial (PEN-03);
  - Recepção e Colaborador não têm acesso (REQ-BI-022);
  - o autônomo (`data-model.md` `dim_tenant.is_solo`) não recebe comparações (REQ-BI-024);
  - Suporte em sessão de suporte vê P01/P02 do tenant atendido e nada de outro tenant.

  Registrar o caso em `tests/isolation/cases/bi.ts`.

### Implementation for User Story 4

- [ ] T037 [US4] Implementar as visões materializadas por tenant e filial (recompra 30/60/90, top serviços e profissionais, origem) em `bi/models/marts/mv_tenant_dashboard.sql`, com atraso ≤ 15 min.
- [ ] T038 [US4] Implementar o `bi-api` (FastAPI) em `bi/api/main.py` e `bi/api/dashboards.py`, usando a camada de consulta da T017.
- [ ] T039 [US4] Expor as rotas `/v1/tenant/dashboards/*` no gateway, encaminhando para o `bi-api` com o tenant resolvido, em `services/gateway/src/routes/bi.ts`.
- [ ] T040 [P] [US4] Implementar P01 e P02 em `apps/tenant-web/src/routes/home/`, com os agendamentos de hoje vindos do contrato da 009 (tempo real), hora da última atualização e definição de cada métrica (SC-004).

**Checkpoint**: o estabelecimento vê os próprios números ao abrir o painel.

---

## Phase 7: User Story 5 - Confiar nos números (Priority: P2)

**Goal**: frescor visível, avisos de atraso, verificação diária com alerta e definições versionadas com aviso de mudança.

**Independent Test**: parar a ingestão e conferir aviso e alerta; criar uma divergência e conferir o alerta (quickstart §2 e §5).

### Tests for User Story 5 ⚠️

- [ ] T041 [P] [US5] Testes em `bi/tests/test_quality.py`:
  - atraso acima de 2 h (Gestão) ou 30 min (estabelecimento) gera aviso no painel e alerta em até 15 min (REQ-BI-030, SC-005);
  - divergência acima de 0,5%, ou qualquer divergência financeira de mês fechado, gera `platform.bi_data_quality.check_failed.v1` (REQ-BI-031);
  - mudar a definição gera nova versão, com data, e indicação no painel.

### Implementation for User Story 5

- [ ] T042 [US5] Implementar a verificação diária em `bi/checks/daily_check.py` (`dbt test` + comparação com as fontes) e `make -C bi reconcile` em `bi/checks/reconcile.py`.
- [ ] T043 [US5] Implementar o exportador Prometheus de frescor, divergência e tempo de consulta em `bi/checks/metrics_exporter.py`, e as regras de alerta em `infra/observability/alerts/bi.yml`.
- [ ] T044 [US5] Implementar o indicador "definição alterada em <data>" em `bi/web/components/metric_definition.py`.

**Checkpoint**: falhas nos dados ficam visíveis sem investigação.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T045 Implementar o `HolderDataPort` do BI (`biErase`, `/v1/internal/bi/holder/{holder_consumer_id}/erase`) em `services/platform/src/pseudonym/holder-data/port.ts`: apaga a linha de `data-model.md` `pseudonym_map.real_id` e o sal de `hmac` do titular, mantém as contagens e não deixa caminho de volta. Implementar também `applyRetention`: remove as partições mensais anteriores ao prazo das categorias `bi_financial_facts` (5 anos) e `bi_other_facts` (3 anos), lido da tabela da 022. Registrar o port e as duas categorias em `packages/contracts/privacy/holder-ports.yaml` (REQ-BI-004; tabela de retenção da 022).
- [ ] T046 [P] Teste da eliminação e da retenção em `bi/tests/test_erasure.py` (quickstart §6): depois da eliminação, nenhum id em `refs` leva ao titular; `applyRetention` remove só as partições vencidas.
- [ ] T047 [P] Implementar a varredura periódica de PII (padrões de celular, e-mail e CPF; zero resultados) em `bi/checks/scan_pii.py`, agendada no `bi-ingest` (SC-003).
- [ ] T048 [P] Implementar o gerador de carga sintética (`pnpm koovela seed:bi`) em `tools/seed-bi/src/seed.ts` e o teste de carga 1× e 10× em `bi/tests/load/test_load.py` (Gestão ≤ 5 e 15 s; dashboards ≤ 3 e 5 s p95; REQ-BI-032).
- [ ] T049 [P] Configurar o backup diário do ClickHouse por `clickhouse-backup` para o Object Storage em `infra/compose/bi-backup.yml`.
- [ ] T050 [P] Testes com a flag `bi.v1` ligada e desligada em `bi/tests/test_flags.py`, e testes axe de P01 e P02 em `apps/tenant-web/src/routes/home/__tests__/a11y.test.tsx`.
- [ ] T051 [P] Painel Grafana "BI" em `infra/observability/dashboards/bi.json`: frescor, DLQ, divergências e tempo de consulta.
- [ ] T052 Registrar a tela nova de insumos manuais em `docs/design/telas-sem-prototipo-023.md` e as definições a confirmar com a DF 14 (North Star e demais) em `docs/ops/decisions/metricas-bi.md`.
- [ ] T053 Executar o [quickstart.md](./quickstart.md) inteiro em staging, acompanhar a memória do ClickHouse nas VMs ARM e registrar em `docs/ops/decisions/validacao-023.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1**, **US2** e **US3** dependem só da fase 2 e podem correr em paralelo. A US2 reaproveita os filtros da US1 (T024).
- **US4** depende da fase 2 e do `mart_tenant_daily` (T023).
- **US5** depende de US2 (fechamento) e de US4 (frescor do estabelecimento).
- **Polish** vem depois das histórias. T045 também pode vir logo depois da fase 2.

### Within Each User Story

- Testes primeiro (falhando) → definições → marts → API → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Fundação: os mapas de ingestão (T012 a T015) em paralelo.
- Depois da fase 2: US1, US2 e US3 em paralelo.

---

## Parallel Example: Foundational

```bash
# Mapas de ingestão, juntos:
Task: "T012 scheduling.yaml"
Task: "T013 payments.yaml"
Task: "T014 tenancy.yaml"
Task: "T015 engagement.yaml"
```

## Parallel Example: User Story 2

```bash
Task: "T025 teste de reconciliação"
Task: "T026 teste dos insumos manuais"
Task: "T027 definições financeiras"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2 (ingestão sem PII, pseudônimos, consulta com supressão).
2. US1 (painel operacional com a North Star).
3. **Parar e validar** com o quickstart §1, §2 e §4.

### Incremental Delivery

1. US2 → US3 (financeiro e coortes).
2. US4 (dashboards do estabelecimento).
3. US5 → Polish (confiança, eliminação e carga).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-BI que atende. Campos com restrição citam `data-model.md` e o campo.
- O BI nunca lê o transacional nem `pseudonym_map`; só eventos, extrações por contrato e insumos copiados.
- Valores em centavos (`Int64`); percentuais em bps.
- Commit por tarefa ou grupo lógico, em branch `023-bi-paineis`, por PR.
- Análise de 2026-11-27: retenção pelas categorias `bi_financial_facts` e `bi_other_facts` da 022 (T045/T046); campos citados; `refs` sem ids pessoais (só `hmac`); Suporte alinhado; casos de borda em T016/T021/T025; extração de fechamento só por contrato. Eventos de origem acrescentados nas specs donas: 001 T130 (incidentes e MTTR), 003 T093 (primeiro acesso pelo app), 005 T072 (canal de aquisição), 008 T058 (reserva dupla detectada). Sem tarefas novas nesta spec.
