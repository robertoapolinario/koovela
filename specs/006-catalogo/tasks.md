---
description: "Lista de tarefas da spec 006 — Catálogo"
---

# Tasks: Catálogo

**Input**: documentos de `specs/006-catalogo/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 005 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige os testes antes do código. Em cada história, as tarefas de teste vêm primeiro e DEVEM falhar antes da implementação.

**Organization**: por história de usuário (US1–US6), na ordem de prioridade da spec. US1, US2 e US3 são P1; US4 e US5 são P2; US6 é P3. O versionamento (base da US3) fica na fundação, porque todo serviço já nasce com versão.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, conforme a estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/catalog/`: `package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS` e pastas `src/{services,versions,branches,combos,packages,suggestions,public,internal,http}` e `migrations/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/catalog.openapi.yaml` e `packages/contracts/asyncapi/catalog-events.asyncapi.yaml` (fonte: `specs/006-catalogo/contracts/`). Acrescentar ao AsyncAPI o evento `catalog.service.published.v1` (research R11), rodar `pnpm contracts:generate` e incluir as ações do catálogo em `packages/contracts/rbac/permissions.yaml`, com `allow_scoped` do Gerente (research R6) e `audit_category` nas mudanças de preço e composição.
- [ ] T003 [P] Declarar a flag de liberação `catalog.v1` em `packages/contracts/flags/flags.yaml`, com `remove_by` definido (REQ-FLG-012).

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, versionamento imutável, dinheiro e eventos.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste do versionamento em `services/catalog/src/versions/versioning.test.ts`:
  - versão `scheduled` passa a `current` na data;
  - duas mudanças com a mesma vigência deixam a primeira como `replaced`;
  - "versão vigente em T" resolve passado, presente e futuro;
  - versão por id nunca muda.

  Campos: `data-model.md` `catalog_service_version.status`, `catalog_service_version.valid_from`. Requisitos: REQ-CAT-020/021, SC-003.
- [ ] T005 [P] Teste de dinheiro em `services/catalog/src/services/money.test.ts`: fração de centavo é recusada, a moeda é `BRL` e não há `number` em dinheiro (lint) (`data-model.md` `catalog_service_version.amount_cents`, `catalog_service_version.currency`; REQ-CAT-002).

### Implementação da fundação

- [ ] T006 Criar a migração `services/catalog/migrations/0001_catalog.ts` no schema do tenant:
  - `catalog_service_group`;
  - `catalog_service`, com CHECK em `data-model.md` `catalog_service.visibility`, `catalog_service.state`, `catalog_service.service_location_mode`, `catalog_service.quote_mode` e `catalog_service.accepted_subject`;
  - `catalog_service_version`, com UNIQUE `(service_id, number)`, CHECK em `catalog_service_version.duration_min` (múltiplo de 5, 5–720), `catalog_service_version.prep_min` e `catalog_service_version.cleanup_min` (múltiplos de 5, 0–120) e `catalog_service_version.price_kind`;
  - `catalog_service_branch`, `catalog_branch_price_version`;
  - `catalog_combo`, `catalog_combo_version`, `catalog_combo_step`, `catalog_combo_step_candidate`;
  - `catalog_package`, `catalog_package_version`;
  - `catalog_audit_outbox`, `catalog_outbox`.
- [ ] T007 Criar a migração global `services/catalog/migrations/0002_suggestions.ts` com `koovela_platform.catalog_service_suggestion`. Semear as sugestões por categoria da DF 4.1 (nome, descrição curta e duração típica, sem preço) em `services/catalog/seeds/suggestions.ts` (REQ-CAT-004).
- [ ] T008 Implementar o motor de versões genérico em `services/catalog/src/versions/versions.ts`: criar versão, agendar, substituir antes de valer, resolver "vigente em T" pelo `data-model.md` `catalog_service_version.valid_from` (instante UTC; o mesmo campo nas versões de preço por filial, combo e pacote) e buscar por id. Serve a serviço, preço por filial, combo e pacote.
- [ ] T009 Implementar a ativação de versões agendadas no `workers` em `services/catalog/src/versions/activate-job.ts` (minuto a minuto, idempotente), emitindo `catalog.item.changed`.
- [ ] T010 Implementar o outbox de eventos e a auditoria (`audit.record`) das mudanças de preço e de composição em `services/catalog/src/events.ts` (REQ-CAT-022).

**Checkpoint**: versões imutáveis e ativação agendada funcionando.

---

## Phase 3: User Story 1 - Cadastrar serviços com duração e preço (Priority: P1) 🎯 MVP

**Goal**: serviços com grupo, duração, preparo, limpeza, preço fixo ou "a partir de", visibilidade e fotos; sugestões por vertical no onboarding; arquivamento em vez de exclusão quando o serviço já foi usado; saúde sem preço exibido.

**Independent Test**: aceitar 3 sugestões numa barbearia, ajustar preço e duração, criar 1 serviço do zero e ver os 4 na página pública (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Teste de contrato de `listServices`, `createService`, `updateService`, `deleteService`, `listServiceVersions` e `listSuggestions` em `services/catalog/src/http/services.contract.test.ts`.
- [ ] T012 [P] [US1] Teste de integração em `services/catalog/src/services/services.int.test.ts`:
  - duração 62 é recusada, e preparo/limpeza fora de 0–120 ou fora de múltiplos de 5 (por exemplo, 7) também (REQ-CAT-003);
  - serviço usado não é apagado, só arquivado (`data-model.md` `catalog_service.used`; REQ-CAT-008);
  - campos latentes ficam fixos nos valores da v1.0 (REQ-CAT-007);
  - publicar o primeiro serviço público ativo emite `catalog.service.published.v1` (research R11);
  - preço zero é aceito, aparece como "gratuito" e não gera cobrança (edge case);
  - nome repetido no mesmo negócio é aceito com aviso (edge case).
- [ ] T013 [P] [US1] Teste E2E em `apps/tenant-web/e2e/catalog-services.spec.ts`: O03 com sugestões e P12 com criação, edição, ordenação e fotos, com axe; cronometrar o passo "Serviços e preços" (SC-001).

### Implementation for User Story 1

- [ ] T014 [US1] Implementar os serviços e grupos em `services/catalog/src/services/services.ts`:
  - nome e descrição (`data-model.md` `catalog_service.name`, `catalog_service.description`);
  - até 5 fotos via `packages/platform/media` (`data-model.md` `catalog_service.photo_media_ids`; REQ-CAT-053), que remove EXIF e localização do aparelho (regra da 005, T015 da 005);
  - `data-model.md` `catalog_service.duration_rule` sempre NULL na v1.0 (latente, D29);
  - aviso, sem bloqueio, para nome repetido no negócio;
  - "a partir de" com mínimo (`data-model.md` `catalog_service_version.price_kind`; REQ-CAT-005);
  - marcação `used` e arquivamento.
- [ ] T015 [US1] Implementar as sugestões e a importação de outro negócio do mesmo Cliente (cópias independentes) em `services/catalog/src/suggestions/suggestions.ts` (research R10).
- [ ] T016 [US1] Implementar as rotas `/v1/tenant/catalog/services*` e `/v1/tenant/catalog/suggestions` em `services/catalog/src/http/services.ts`.
- [ ] T017 [P] [US1] Implementar a tela O03 em `apps/tenant-web/src/routes/onboarding/services/` e a P12 (Serviços e preços) em `apps/tenant-web/src/routes/catalog/services/`. Em saúde, o painel avisa que o preço é só interno (REQ-CAT-006).
- [ ] T018 [US1] Tela de sugestões no back-office (Gestão) em `apps/admin-web/src/routes/catalog/suggestions/`.

**Checkpoint**: serviços cadastrados e publicação liberada para a 005.

---

## Phase 4: User Story 2 - Preço e disponibilidade por filial (Priority: P1)

**Goal**: disponibilidade por filial e preço próprio versionado; o Gerente atua só na própria filial; clonagem de filial copia disponibilidade e preços.

**Independent Test**: com 2 filiais, sobrescrever o preço na B, desativar na C clonada e conferir as três páginas (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T019 [P] [US2] Teste de contrato de `setBranchAvailability` em `services/catalog/src/http/branches.contract.test.ts`.
- [ ] T020 [P] [US2] Teste de integração em `services/catalog/src/branches/branches.int.test.ts`:
  - `all_branches` inclui filiais criadas depois (`data-model.md` `catalog_service.all_branches`);
  - preço próprio versionado (`data-model.md` `catalog_branch_price_version.status`);
  - o Gerente altera só a própria filial e não altera o preço padrão; nas outras recebe 404/403 (REQ-CAT-012);
  - a clonagem é idempotente por `(source, target)` e a filial nova oferece exatamente os mesmos serviços e preços (REQ-CAT-011, SC-005).

### Implementation for User Story 2

- [ ] T021 [US2] Implementar a disponibilidade e o preço por filial em `services/catalog/src/branches/branches.ts`, com o preço resolvido como "preço próprio vigente, senão padrão vigente" (`data-model.md` `catalog_branch_price_version.amount_cents` ≥ 0 e `catalog_branch_price_version.currency` = `BRL`) e o evento `catalog.branch_availability.changed.v1`.
- [ ] T022 [US2] Implementar o consumidor de `tenancy.branch.cloned.v1` em `services/catalog/src/branches/on-branch-cloned.ts` (research R7).
- [ ] T023 [US2] Implementar a rota `/v1/tenant/catalog/services/{id}/branches/{branch_id}` em `services/catalog/src/http/branches.ts`.
- [ ] T024 [P] [US2] Acrescentar à P12 a grade de disponibilidade e preço por filial, com o escopo do Gerente, em `apps/tenant-web/src/routes/catalog/services/BranchPricing.tsx`.

**Checkpoint**: preço e disponibilidade por filial.

---

## Phase 5: User Story 3 - Preço versionado e congelado no agendamento (Priority: P1)

**Goal**: contratos internos de "versão vigente em T" e "versão por id", rápidos, para a 009 congelar a versão; histórico visível; mudança com vigência futura.

**Independent Test**: agendar (contrato), mudar o preço e confirmar que o agendamento existente mantém o preço antigo e o novo usa o novo (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T025 [P] [US3] Teste de contrato de `getServiceVersionAt` e `getVersionById` em `services/catalog/src/http/internal.contract.test.ts`.
- [ ] T026 [P] [US3] Teste de congelamento em `services/catalog/src/internal/freeze.int.test.ts`: o agendamento simulado guarda o id da versão; mudar o preço, com vigência imediata ou futura, não altera a versão referenciada; novos pedidos usam a nova (SC-002).
- [ ] T027 [P] [US3] Teste de desempenho em `services/catalog/src/internal/version-at.perf.test.ts`: "versão vigente em T" ≤ 10 ms p95.

### Implementation for User Story 3

- [ ] T028 [US3] Implementar `GET /v1/internal/catalog/services/{id}/version?branch_id=&at=` e `GET /v1/internal/catalog/versions/{id}` em `services/catalog/src/http/internal.ts`, com cache Redis por versão imutável e credencial de serviço.
- [ ] T029 [P] [US3] Implementar no P12 o histórico de versões e a mudança com vigência futura em `apps/tenant-web/src/routes/catalog/services/VersionHistory.tsx`.

**Checkpoint**: preço congelável pela 009.

---

## Phase 6: User Story 4 - Combo com o mesmo profissional (Priority: P2)

**Goal**: combo de 2 a 5 etapas, desconto rateado sem erro de centavo, plano entregue ao motor de agenda, desativação automática e modelo pronto para a troca de profissional.

**Independent Test**: criar "corte + barba", ver duração total e economia, e conferir o plano pelo contrato (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T030 [P] [US4] Teste de propriedade em `services/catalog/src/combos/discount.property.test.ts`: para qualquer combinação, a soma dos rateios é igual ao desconto, cada rateio é ≥ 0 e o resto fica na última etapa (`data-model.md` `catalog_combo_step.discount_share_cents`; REQ-CAT-034, SC-004).
- [ ] T031 [P] [US4] Teste de contrato de `createCombo` e `getComboPlan` em `services/catalog/src/http/combos.contract.test.ts`.
- [ ] T032 [P] [US4] Teste de integração em `services/catalog/src/combos/combos.int.test.ts`:
  - de 2 a 5 etapas, ativas e do mesmo negócio;
  - preço acima da soma é recusado (`data-model.md` `catalog_combo_version.amount_cents`, `catalog_combo_version.sum_single_cents`);
  - `gap_min` fora de 0–15 é recusado (`data-model.md` `catalog_combo_version.gap_min`);
  - preparo só antes da 1ª etapa e limpeza só depois da última (REQ-CAT-031);
  - combo disponível numa filial só se todas as etapas estiverem; desativar uma etapa desativa o combo com aviso (REQ-CAT-033);
  - visibilidade herdada como `internal` (`data-model.md` `catalog_combo.visibility`).

### Implementation for User Story 4

- [ ] T033 [US4] Implementar combos e versões em `services/catalog/src/combos/combos.ts`, com etapas congelando o `service_version_id` e ordenadas por `data-model.md` `catalog_combo_step.position` (1 a 5, sem buraco), e `professional_rule = same_for_all` (`data-model.md` `catalog_combo.professional_rule`; latente `per_step`, REQ-CAT-035).
- [ ] T034 [US4] Implementar o rateio em `services/catalog/src/combos/discount.ts` (research R4).
- [ ] T035 [US4] Implementar o plano `GET /v1/internal/catalog/combos/{id}/plan` em `services/catalog/src/http/internal.ts` (REQ-CAT-032) e a desativação automática no consumidor de mudança de etapa em `services/catalog/src/combos/on-step-changed.ts` (`data-model.md` `catalog_combo.state` → `inactive` com aviso ao Proprietário).
- [ ] T036 [US4] Implementar a rota `/v1/tenant/catalog/combos` em `services/catalog/src/http/combos.ts`.
- [ ] T037 [P] [US4] Implementar a tela P13 (Combos) em `apps/tenant-web/src/routes/catalog/combos/`, com duração total e economia.

**Checkpoint**: combo pronto para a agenda.

---

## Phase 7: User Story 5 - Pacote de sessões (Priority: P2)

**Goal**: definição de pacote versionada (sessões, validade, abrangência, regra de devolução com o mínimo legal), canal de venda forçado a presencial em saúde e contrato para 012 e 009.

**Independent Test**: criar um pacote de 10 sessões de fisioterapia com validade de 90 dias e conferir a página e o contrato (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T038 [P] [US5] Teste de contrato de `createPackage` em `services/catalog/src/http/packages.contract.test.ts`.
- [ ] T039 [P] [US5] Teste de integração em `services/catalog/src/packages/packages.int.test.ts`:
  - limites de `data-model.md` `catalog_package_version.sessions` e `catalog_package_version.validity_days`;
  - `scope` e `refund_rule` válidos (`data-model.md` `catalog_package_version.scope`, `catalog_package_version.refund_rule`);
  - em saúde, `sell_channel` é forçado a `on_site_only` (`data-model.md` `catalog_package.sell_channel`; research R8);
  - o mínimo legal de devolução (7 dias, sem sessão usada) está sempre presente (REQ-CAT-044);
  - a compra congela a versão (REQ-CAT-043);
  - desativar o serviço (ou combo) do pacote tira o pacote da venda (`catalog_package.state = inactive`) sem alterar nenhum saldo vendido (edge case).

### Implementation for User Story 5

- [ ] T040 [US5] Implementar pacotes e versões em `services/catalog/src/packages/packages.ts`, com `data-model.md` `catalog_package.item_kind` (`service` \| `combo`) e a regra de devolução com `catalog_package_version.refund_fee_cents` (≥ 0, só em `proportional_minus_fee`); consumidor de `catalog.item.changed` que coloca o pacote `inactive` quando o item sai.
- [ ] T041 [US5] Expor no contrato interno a versão do pacote para a 012 (venda) e a 009 (reserva e consumo de sessão) em `services/catalog/src/http/internal.ts`. O saldo fica com a 012 (REQ-CAT-042/045). Dependências na 012: o aviso de sessões a vencer em 7 dias (REQ-CAT-046) é emitido pela T065 da 012 e enviado pela T064 da 011; com `scope = all_branches`, o saldo continua utilizável nas demais filiais quando uma filial é encerrada (teste na T056 da 012).
- [ ] T042 [US5] Implementar a rota `/v1/tenant/catalog/packages` em `services/catalog/src/http/packages.ts`.
- [ ] T043 [P] [US5] Implementar a tela P14 (Pacotes de sessões) em `apps/tenant-web/src/routes/catalog/packages/`.

**Checkpoint**: pacote definido para venda (012) e consumo (009).

---

## Phase 8: User Story 6 - Consumidor entende o serviço antes de agendar (Priority: P3)

**Goal**: catálogo público por filial (grupos, serviços, combos e pacotes) com economia; nenhum campo de preço em saúde; detalhe com fotos; rápido em 3G e acessível.

**Independent Test**: abrir a página no app e na web e tocar num serviço, num combo e num pacote (quickstart §6).

### Tests for User Story 6 ⚠️

- [ ] T044 [P] [US6] Teste de contrato de `getPublicCatalog` em `services/catalog/src/http/public.contract.test.ts`: em negócio com `price_display = never`, o JSON não tem nenhum campo de preço (REQ-CAT-006).
- [ ] T045 [P] [US6] Teste E2E em `apps/consumer-web/e2e/catalog-public.spec.ts`: lista e detalhe (W07/W08), com 3G simulado (textos em ≤ 3 s, fotos `lazy`) e axe AA (REQ-CAT-052, SC-006); serviço de preço zero mostrado como "gratuito"; preço por sessão do pacote arredondado para baixo ao centavo, só na exibição (edge case).
- [ ] T046 [P] [US6] Teste RNTL do detalhe C05 em `apps/consumer-mobile/__tests__/service-detail.test.tsx`.

### Implementation for User Story 6

- [ ] T047 [US6] Implementar `GET /v1/public/businesses/{slug}/catalog?branch_id=` em `services/catalog/src/public/catalog.ts`: só itens públicos disponíveis na filial, economia de combo e pacote, fotos com `srcset`, cache na Cloudflare e purge em `catalog.*.changed` (REQ-CAT-050/051).
- [ ] T048 [P] [US6] Implementar a lista na página pública e o detalhe W08 em `apps/consumer-web/app/routes/$slug.tsx` (seção de serviços) e `apps/consumer-web/app/routes/$slug.servico.$id.tsx`.
- [ ] T049 [P] [US6] Implementar a lista em C04 e o detalhe C05 em `apps/consumer-mobile/app/business/[slug]/service/[id].tsx`. Em saúde, o pacote aparece só como saldo do que o consumidor já comprou.

**Checkpoint**: catálogo visível ao consumidor.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T050 [P] Registrar os casos de isolamento do catálogo em `services/catalog/src/isolation.cases.ts`: serviço, combo, pacote e versão de outro tenant respondem 404.
- [ ] T051 [P] Testes com a flag `catalog.v1` ligada e desligada em `services/catalog/src/__tests__/flags.int.test.ts` (REQ-FLG-013).
- [ ] T052 [P] Teste de desempenho do catálogo público em `services/catalog/src/public/catalog.perf.test.ts`: ≤ 150 ms p95 com cache.
- [ ] T053 [P] Painel Grafana "Catálogo" em `infra/observability/dashboards/catalog.json`: versões agendadas ativadas, latência de "versão em T" e purges.
- [ ] T054 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-006.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** (serviços) depende da fase 2.
- **US2** (por filial) depende de US1.
- **US3** (congelamento) depende de US1; pode correr em paralelo com US2.
- **US4** (combo) depende de US1 e US2 (disponibilidade por filial).
- **US5** (pacote) depende de US1 (e de US4 para pacote de combo).
- **US6** (consumidor) depende de US1 e US2; mostra combos e pacotes quando US4 e US5 existirem.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 e T005.
- Depois de US1: US2 e US3 em paralelo; depois US4 e US5 em paralelo.
- Telas marcadas com [P] em paralelo em cada história.

---

## Parallel Example: User Story 4

```bash
# Testes primeiro, juntos:
Task: "T030 propriedade do rateio em services/catalog/src/combos/discount.property.test.ts"
Task: "T031 contrato em services/catalog/src/http/combos.contract.test.ts"
Task: "T032 integração em services/catalog/src/combos/combos.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: serviços cadastrados e o evento que libera a publicação da 005.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US1 → US2 → US3 (catálogo pronto para a agenda e o agendamento).
2. US4 → US5 (combo e pacote).
3. US6 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US3 → US2 → US4 → US5 → US6 → Polish.

---

## Notes

- REQ-CAT-003 ajustada pelo `/speckit-analyze` da 008 (2026-11-26): preparo e limpeza só em múltiplos de 5.
- Correções do `/speckit-analyze` de 2026-11-26 aplicadas sem tarefa nova; dependências criadas na 005 (T009/T015), na 011 (T064) e na 012 (T065).
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-CAT que atende. Campos com restrição citam `data-model.md` e o campo.
- Dinheiro sempre com `Money` em centavos; versões nunca são alteradas.
- O saldo de sessões é da 012; o catálogo só define o pacote.
- Commit por tarefa ou grupo lógico, em branch `006-catalogo`, por PR.
