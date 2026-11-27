---
description: "Lista de tarefas da spec 027 — Colaborador em vários negócios"
---

# Tasks: Colaborador em vários negócios

**Input**: documentos de `specs/027-colaborador-multinegocio/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 026 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- detecção de conflito entre dois tenants sintéticos em criação, remarcação, cancelamento e fim de vínculo (REQ-MUL-026);
- nenhuma rota ou aviso de tenant revela outro vínculo, negócio, consumidor ou serviço (REQ-MUL-002, SC-002);
- nenhum texto diz que um conflito foi "resolvido" sem ação de uma pessoa (SC-005).

**Organization**: por história de usuário. P1: US1 (segundo negócio), US2 (agenda unificada) e US3 (conflito). P2: US4 (bloqueio opcional) e US5 (comissões, perfil e reputação). As projeções do colaborador e a fronteira de isolamento ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o submódulo `services/workforce/src/multi-engagement/{projection,conflicts,cross-block,time-off-all,commissions-summary,profile}/` e a pasta `services/scheduling/src/occupancy/external-block/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/multi-engagement.openapi.yaml` e `packages/contracts/asyncapi/multi-engagement-events.asyncapi.yaml` (fonte: `specs/027-colaborador-multinegocio/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - rotas `/v1/pro/*` só como a própria pessoa (`self`);
  - `cross_block_enabled` só pela pessoa, sem nenhuma célula para tenant;
  - `externalCommitments` para Recepção, Gerente e Proprietário do tenant.

  Declarar a flag `workforce.multi_engagement` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, projeções do colaborador e a fronteira que impede um tenant de saber de outro.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de isolamento (portão de merge) em `tests/isolation/cases/multi-engagement.ts`: como tenant A, nenhuma rota, evento ou aviso devolve o id do tenant B, o nome do negócio, o consumidor ou o serviço (`data-model.md` `scheduling_occupancy.source_occupancy_ref` opaco; SC-002). Incluir no filtro `pnpm test:isolation --filter multi-engagement`.
- [ ] T005 [P] Teste da projeção em `services/workforce/src/multi-engagement/projection/projection.int.test.ts`: eventos de 008, 009, 013 e 026 com `person_id` alimentam `pro_unified_agenda` sem contato do consumidor (`data-model.md` `pro_unified_agenda.subject_label`, `pro_unified_agenda.item_kind`), de forma idempotente.

### Implementação da fundação

- [ ] T006 Criar a migração `services/identity/migrations/0027_pro_preferences.ts` com `pro_preferences` (`data-model.md` `pro_preferences.person_id`, `pro_preferences.cross_block_enabled` com padrão `false`, `pro_preferences.tenant_colors`, `pro_preferences.global_profile`, `pro_preferences.min_gap_between_businesses_min`, `pro_preferences.updated_at`).
- [ ] T007 [P] Criar a migração `services/workforce/migrations/projections/0027_pro_projections.ts` em `koovela_projections`, com `pro_unified_agenda` (CHECK em `data-model.md` `pro_unified_agenda.item_kind`) e `pro_conflict` (CHECK em `pro_conflict.state` e `pro_conflict.closed_by_kind`).
- [ ] T008 [P] Criar a migração de tenant `services/scheduling/migrations/tenant/0027_external.ts` com `scheduling_external_conflict_flag` (CHECK em `data-model.md` `scheduling_external_conflict_flag.state`), o tipo `external_block` em `scheduling_occupancy.kind` e as colunas `scheduling_occupancy.source_person_id` e `scheduling_occupancy.source_occupancy_ref`. Criar também `workforce_profile_override` (`data-model.md` `workforce_profile_override.engagement_id`) em `services/workforce/migrations/tenant/0027_profile_override.ts`, e citar `scheduling_external_conflict_flag.appointment_id`.
- [ ] T009 Implementar os consumidores da projeção em `services/workforce/src/multi-engagement/projection/handlers.ts` (`data-model.md` `pro_unified_agenda.person_id`, `pro_unified_agenda.tenant_id`, `pro_unified_agenda.business_display`, `pro_unified_agenda.color`, `pro_unified_agenda.item_id`, `pro_unified_agenda.starts_at`, `pro_unified_agenda.ends_at`, `pro_unified_agenda.service_name`, `pro_unified_agenda.state`), com cor e nome do negócio aplicados só na leitura pela própria pessoa. Tenant suspenso: itens marcados "negócio indisponível". Implementar o `HolderDataPort` das projeções (exportação e eliminação da pessoa; eliminação de consumidor tira o nome dele) com `applyRetention` para `pro_unified_agenda` e `pro_conflicts`, registrado em `packages/contracts/privacy/holder-ports.yaml` (022).
- [ ] T010 Implementar o guarda das rotas `/v1/pro/*` (o token da pessoa só lê as próprias projeções) em `services/workforce/src/multi-engagement/projection/guard.ts`.

**Checkpoint**: a pessoa tem uma visão própria e nenhum tenant enxerga além do dele.

---

## Phase 3: User Story 1 - Entrar no segundo negócio com a mesma conta (Priority: P1) 🎯 MVP

**Goal**: convite e aceite pela 003 em cada tenant, com vínculos independentes. Encerrar um não afeta os outros.

**Independent Test**: o tenant B convida uma colaboradora de A; ela aceita com a conta existente; nenhum dos dois vê o outro (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Teste de contrato de `listMyEngagements` em `services/workforce/src/multi-engagement/http/engagements.contract.test.ts`.
- [ ] T012 [P] [US1] Teste de integração em `services/workforce/src/multi-engagement/engagements.int.test.ts`:
  - o convite para um celular já cadastrado reaproveita a pessoa da 003, sem cadastro novo (SC-004);
  - papel, filial, serviços, escala e comissão ficam por tenant;
  - encerrar o vínculo com A deixa B intacto e retira as janelas de A do índice da 008 (REQ-MUL-003);
  - dois negócios no mesmo tenant não usam o fluxo multinegócio: vale a proteção completa da 008.

### Implementation for User Story 1

- [ ] T013 [US1] Ajustar o aceite do convite da 007 para pessoa já existente em `services/workforce/src/engagements/accept.ts`, e o encerramento de vínculo para notificar a projeção e a 008 em `services/workforce/src/engagements/end.ts`. Publicar `workforce.employment.linked_existing_person.v1` quando o aceite reaproveita a pessoa.
- [ ] T014 [US1] Implementar `listMyEngagements` em `services/workforce/src/multi-engagement/http/engagements.ts`.
- [ ] T015 [P] [US1] Implementar o seletor de negócio ativo e a lista de vínculos no app do colaborador em `apps/pro-mobile/src/app/perfil/negocios.tsx`.

**Checkpoint**: uma conta, vários negócios.

---

## Phase 4: User Story 2 - Agenda unificada só para o colaborador (Priority: P1)

**Goal**: dia e semana com todos os vínculos, com cor e nome escolhidos pela pessoa, no app e no `/pro`. As ações acontecem no contexto do tenant dono. Os próximos 7 dias ficam legíveis sem rede. A agenda avisa escalas sobrepostas e permite pedir folga em todos os negócios.

**Independent Test**: com atendimentos em dois tenants, abrir a agenda unificada e conferir que nenhum tenant vê os do outro (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T016 [P] [US2] Teste de contrato de `unifiedAgenda`, `setProPreferences` (cores) e `requestTimeOffEverywhere` em `services/workforce/src/multi-engagement/http/agenda.contract.test.ts`.
- [ ] T017 [P] [US2] Teste de integração em `services/workforce/src/multi-engagement/agenda.int.test.ts`:
  - a agenda traz todos os vínculos em ≤ 500 ms p95;
  - o check-in num item de B troca o tenant ativo e executa com as permissões de B (REQ-MUL-012);
  - escalas sobrepostas geram aviso com atalho "pedir ajuste" (REQ-MUL-025);
  - "folga em todos" cria pedidos separados, aprovados pelas regras de cada tenant (REQ-MUL-030);
  - com `pro_preferences.min_gap_between_businesses_min`, atendimentos em negócios diferentes com intervalo menor geram só aviso na agenda unificada;
  - itens de tenant suspenso aparecem como "negócio indisponível".
- [ ] T018 [P] [US2] Teste offline em `apps/pro-mobile/e2e/unified-agenda-offline.e2e.ts`: no modo avião, os próximos 7 dias continuam legíveis, com o armazenamento cifrado (SC-006).

### Implementation for User Story 2

- [ ] T019 [US2] Implementar a leitura da agenda unificada e as cores (`data-model.md` `pro_preferences.tenant_colors`) em `services/workforce/src/multi-engagement/projection/agenda.ts`, mais o aviso de escalas sobrepostas.
- [ ] T020 [US2] Implementar "pedir folga em todos" em `services/workforce/src/multi-engagement/time-off-all/time-off-all.ts`, que cria um pedido da 007 por tenant.
- [ ] T021 [US2] Implementar as rotas `/v1/pro/agenda`, `/v1/pro/preferences` e `/v1/pro/time-off/all` em `services/workforce/src/multi-engagement/http/agenda.ts`.
- [ ] T022 [P] [US2] Implementar o modo unificado de K01 com cache offline (Expo SQLite cifrado, chave no SecureStore, atualizado a cada abertura e por push silencioso; itens de um tenant apagados do aparelho quando o vínculo termina ou a pessoa sai da conta) e troca de contexto nas ações, em `apps/pro-mobile/src/app/agenda/` (até 2 toques, SC-003).
- [ ] T023 [P] [US2] Implementar o modo unificado de KD1 em `apps/tenant-web/src/routes/pro/agenda/` e a tela de "pedir folga em todos" em `apps/pro-mobile/src/app/folga/todos.tsx`.

**Checkpoint**: o colaborador enxerga o dia inteiro num lugar só.

---

## Phase 5: User Story 3 - Conflito detectado e avisado a todos (Priority: P1)

**Goal**: sobreposição detectada na criação e em toda mudança. O colaborador vê os dois atendimentos; cada tenant vê só "compromisso fora deste negócio". A Recepção é avisada antes de confirmar um agendamento manual. O conflito só fecha por ação humana ou fim de vínculo.

**Independent Test**: agendar em B um horário já ocupado em A; o agendamento é aceito e o aviso chega aos três (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Teste de contrato entre dois tenants (portão de merge) em `services/scheduling/src/occupancy/__tests__/cross-tenant-conflict.contract.test.ts`:
  - criação, remarcação, cancelamento e fim de vínculo abrem e fecham `pro_conflict` com `data-model.md` `pro_conflict.closed_by_kind`;
  - o aviso chega em ≤ 1 min (SC-001);
  - cada tenant recebe só `scheduling_external_conflict_flag.overlap_from` e `scheduling_external_conflict_flag.overlap_to`;
  - colaborador sem conta no app: o conflito é detectado pela pessoa global e os avisos vão só aos tenants.

  Incluir no filtro `pnpm test:contract --filter cross-tenant-conflict`.
- [ ] T025 [P] [US3] Teste de textos em `packages/i18n/__tests__/no-auto-resolved.test.ts`: nenhuma chave de tela ou template diz "resolvido automaticamente" ou equivalente (SC-005).
- [ ] T026 [P] [US3] Teste de contrato de `listMyConflicts` e `externalCommitments` em `services/workforce/src/multi-engagement/http/conflicts.contract.test.ts`: a resposta ao tenant não traz o tenant de origem; `externalCommitments` só aceita um horário candidato e responde sim ou não; consultas em série acima do limite recebem 429 e ficam na trilha (teste de enumeração).

### Implementation for User Story 3

- [ ] T027 [US3] Implementar o ciclo de vida do conflito a partir de `scheduling.cross_tenant_conflict.detected.v1` (008) em `services/workforce/src/multi-engagement/conflicts/conflicts.ts`, com `data-model.md` `pro_conflict.conflict_id`, `pro_conflict.person_id`, `pro_conflict.a_tenant_id`, `pro_conflict.a_item_id`, `pro_conflict.b_tenant_id`, `pro_conflict.b_item_id`, `pro_conflict.overlap_from`, `pro_conflict.overlap_to` e `pro_conflict.closed_at`, publicando `workforce.pro_conflict.changed`. O encerramento vem de `scheduling.occupancy.changed` (liberação ou mudança, 008) e de `workforce.engagement.ended` (007), recalculando a sobreposição; só ação de pessoa ou fim de vínculo fecham, gravando `pro_conflict.closed_by_kind`.
- [ ] T028 [US3] Implementar a marca por tenant (`data-model.md` `scheduling_external_conflict_flag.appointment_id`) e os avisos (011, T074) ao colaborador e aos dois tenants em `services/scheduling/src/occupancy/external-block/conflict-flag.ts`.
- [ ] T029 [US3] Implementar `externalCommitments` (consulta ao `person_occupancy_index` da 008 por `person_id` para um único horário candidato — início e fim —, resposta só sim ou não, sem devolver a origem; limite por usuário e por pessoa; cada consulta na trilha da 004; nunca listagem de período; REQ-MUL-002) em `services/scheduling/src/occupancy/external-block/external-commitments.ts`, e as rotas em `services/workforce/src/multi-engagement/http/conflicts.ts`.
- [ ] T030 [P] [US3] Implementar a marca de conflito e o aviso no agendamento manual em P03, em `apps/tenant-web/src/routes/agenda/ExternalCommitmentWarning.tsx`, e a tela de conflito do colaborador em `apps/pro-mobile/src/app/agenda/conflitos.tsx`.

**Checkpoint**: ninguém é surpreendido por um conflito entre negócios.

---

## Phase 6: User Story 4 - Colaborador protege a própria agenda (Priority: P2)

**Goal**: bloqueio entre negócios ligado só pela pessoa. Cada ocupação definitiva cria "indisponível" nos outros tenants, com a mesma proteção da 008. Desligar remove os bloqueios futuros.

**Independent Test**: com a proteção ligada, um consumidor tenta agendar em B um horário ocupado em A (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T031 [P] [US4] Teste de integração e concorrência em `services/scheduling/src/occupancy/external-block/external-block.int.test.ts`:
  - com `data-model.md` `pro_preferences.cross_block_enabled` ligado, um agendamento em A cria `external_block` em B, sem detalhes, em ≤ 1 min;
  - se a célula em B já estiver ocupada, o bloqueio não é criado e o conflito segue o fluxo de aviso;
  - criação simultânea de bloqueio e agendamento em B → só um vence, pela proteção da 008;
  - cancelar ou remarcar na origem atualiza o bloqueio, de forma idempotente por `scheduling_occupancy.source_occupancy_ref`;
  - desligar remove os futuros;
  - nenhum tenant consegue ligar pela pessoa.

### Implementation for User Story 4

- [ ] T032 [US4] Implementar o emissor de `workforce.cross_block.command.v1` a partir das ocupações da pessoa em `services/workforce/src/multi-engagement/cross-block/emitter.ts`.
- [ ] T033 [US4] Implementar o consumidor no tenant de destino, que cria, atualiza e remove o `external_block` pelas células e pelo lock da 008, em `services/scheduling/src/occupancy/external-block/external-block.ts`.
- [ ] T034 [P] [US4] Implementar a opção "bloquear nos outros negócios" nas preferências do colaborador em `apps/pro-mobile/src/app/perfil/protecao.tsx`.

**Checkpoint**: a pessoa decide proteger a própria agenda.

---

## Phase 7: User Story 5 - Comissões e reputação por negócio (Priority: P2)

**Goal**: comissões previstas, a receber e recebidas por negócio e no total. Perfil global com ajuste por negócio. Portfólio e avaliações ficam por negócio.

**Independent Test**: com fechamentos em dois tenants, conferir os valores por negócio e o total, e as avaliações de cada negócio (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T035 [P] [US5] Teste de contrato de `commissionsSummary`, `setGlobalProfile` e `setProPreferences` (perfil) em `services/workforce/src/multi-engagement/http/profile.contract.test.ts`.
- [ ] T036 [P] [US5] Teste de integração em `services/workforce/src/multi-engagement/commissions-summary/summary.int.test.ts`:
  - a soma por negócio e o total batem com a 018 de cada tenant (REQ-MUL-031);
  - `data-model.md` `workforce_profile_override.display_name`, `workforce_profile_override.bio` e `workforce_profile_override.photo_media_id` sobrepõem o perfil global só naquele negócio;
  - portfólio e avaliações de A não aparecem em B (REQ-MUL-033).

### Implementation for User Story 5

- [ ] T037 [US5] Implementar o resumo de comissões (chamando `/v1/pro/settlement/*` de cada tenant) em `services/workforce/src/multi-engagement/commissions-summary/summary.ts`.
- [ ] T038 [US5] Implementar o perfil global e a sobreposição por negócio em `services/workforce/src/multi-engagement/profile/profile.ts`, com as rotas em `services/workforce/src/multi-engagement/http/profile.ts`.
- [ ] T039 [P] [US5] Implementar as telas "Comissões" (por negócio e total) e "Perfil por negócio" em `apps/pro-mobile/src/app/comissoes/index.tsx` e `apps/pro-mobile/src/app/perfil/perfil-por-negocio.tsx`.

**Checkpoint**: o colaborador acompanha ganhos e reputação em cada lugar.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T040 [P] Testes com a flag `workforce.multi_engagement` ligada e desligada em `services/workforce/src/multi-engagement/__tests__/flags.int.test.ts`, e axe em K01/KD1 unificados e P03 em `apps/tenant-web/e2e/multi-engagement-a11y.spec.ts`.
- [ ] T041 [P] Métricas de conflitos abertos e tempo até o encerramento em `services/workforce/src/multi-engagement/metrics.ts`, no painel `infra/observability/dashboards/workforce.json`.
- [ ] T042 Registrar as telas a conferir (aviso de conflito ao colaborador, "pedir folga em todos") em `docs/design/telas-sem-prototipo-027.md`, e a regra de que cor e nome de negócio aparecem só para a pessoa em `docs/ops/decisions/agenda-unificada-privacidade.md`, incluindo que o primeiro nome de atendido menor (025) aparece só para quem o atende.
- [ ] T043 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-027.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** e **US3** dependem de US1 e podem correr em paralelo.
- **US4** depende de US3 (fluxo de aviso quando o bloqueio não é criado).
- **US5** depende de US1.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004, T005, T007 e T008.
- Depois de US1: US2, US3 e US5 em paralelo.

---

## Parallel Example: depois de US1

```bash
Task: "T016 contrato da agenda unificada"
Task: "T024 conflito entre dois tenants"
Task: "T035 contrato de comissões e perfil"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fases 1 e 2.
2. US1 (vínculos), US2 (agenda unificada) e US3 (conflitos). O conflito é obrigatório desde o primeiro dia com dois vínculos (C6).
3. **Parar e validar** com o quickstart §1 a §3.

### Incremental Delivery

1. US4 (bloqueio opcional).
2. US5 (comissões e perfil).
3. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-MUL que atende. Campos com restrição citam `data-model.md` e o campo.
- As projeções do colaborador são servidas só à própria pessoa; tenants veem só a janela de sobreposição.
- O bloqueio entre negócios só existe com a escolha da pessoa e usa a mesma proteção da 008.
- Commit por tarefa ou grupo lógico, em branch `027-colaborador-multinegocio`, por PR.
- Análise de 2026-11-27: REQ-MUL-002 alinhada ao [C6] e `externalCommitments` limitada (um horário, sim/não, limite e trilha); port e retenção das projeções pela 022 (T009); encerramento do conflito pela 008 e pela 007 (T027); intervalo mínimo entre negócios só como aviso; casos de borda; cache offline apagado no fim do vínculo; campos citados; eventos alinhados. Avisos na 011 (T074). Sem tarefas novas nesta spec.
