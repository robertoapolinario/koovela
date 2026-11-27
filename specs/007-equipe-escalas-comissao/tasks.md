---
description: "Lista de tarefas da spec 007 — Equipe, escalas e comissão"
---

# Tasks: Equipe, escalas e comissão

**Input**: documentos de `specs/007-equipe-escalas-comissao/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 006 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. Em cada história, as tarefas de teste vêm primeiro e DEVEM falhar antes da implementação.

**Organization**: por história de usuário (US1–US8). P1: US1, US2, US3, US5. P2: US4, US6. P3: US7, US8.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US8).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/workforce/`: `package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS`, pastas `src/{professionals,engagements,services,schedules,time-off,swaps,commission,portfolio,public,internal,http}` e `migrations/`.
- [ ] T002 [P] Criar o pacote `packages/domain/commission/` (`package.json`, `tsconfig.json`, `src/index.ts`, sem dependência de I/O) e adicionar `@js-temporal/polyfill` ao `workforce`.
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/workforce.openapi.yaml` e `packages/contracts/asyncapi/workforce-events.asyncapi.yaml` (fonte: `specs/007-equipe-escalas-comissao/contracts/`), acrescentar ao AsyncAPI o evento `workforce.professional.availability_set.v1` (research R10) e rodar `pnpm contracts:generate`.
- [ ] T004 [P] Incluir as ações do `workforce` em `packages/contracts/rbac/permissions.yaml`, com:
  - `allow_scoped` para o Gerente da filial;
  - `self` para o Colaborador (comissão, folgas, perfil);
  - `audit_category` nas regras de comissão.

  Declarar a flag `workforce.v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, projeção do horário da filial, conversão de fuso e eventos.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste de conversão hora local → UTC por data e fuso IANA em `services/workforce/src/schedules/tz.test.ts`, incluindo datas com horário de verão histórico e `America/Manaus` (SC-008).

### Implementação da fundação

- [ ] T006 Criar a migração `services/workforce/migrations/0001_workforce.ts` no schema do tenant, com estas tabelas e restrições (campos de `data-model.md`):
  - `workforce_professional`: CHECK em `workforce_professional.state`; `workforce_professional.bio` com até 500 caracteres;
  - `workforce_engagement`: CHECK em `workforce_engagement.kind` e `workforce_engagement.state`;
  - `workforce_professional_service`: CHECK em `workforce_professional_service.item_kind`;
  - `workforce_professional_service_override_version`, `workforce_schedule`, `workforce_schedule_interval`, `workforce_schedule_exception`;
  - `workforce_branch_hours_view`;
  - `workforce_time_off`: CHECK em `workforce_time_off.kind`, `workforce_time_off.origin` e `workforce_time_off.state`; `workforce_time_off.reason` com até 200 caracteres;
  - `workforce_shift_swap`: CHECK em `workforce_shift_swap.state`; índice único parcial que impede duas trocas pendentes (`proposed` ou `accepted_by_peer`) para o mesmo colaborador e a mesma data;
  - `workforce_commission_settings_version`;
  - `workforce_commission_rule`: UNIQUE por (nível, chaves);
  - `workforce_commission_rule_version`: CHECK 0–10000 em `workforce_commission_rule_version.rate_bps` e `workforce_commission_rule_version.owner_share_bps`;
  - `workforce_commission_entry`, `workforce_portfolio_photo`, `workforce_audit_outbox`, `workforce_outbox`.
- [ ] T007 Implementar a projeção do horário da filial, consumidora de `tenancy.branch.hours_changed.v1` (spec 005), em `services/workforce/src/schedules/branch-hours-view.ts` (`data-model.md` `workforce_branch_hours_view.version`).
- [ ] T008 Implementar a conversão local ↔ UTC por data com `Temporal` em `services/workforce/src/schedules/tz.ts`.
- [ ] T009 Implementar o outbox de eventos e a auditoria em `services/workforce/src/events.ts`.

**Checkpoint**: tabelas, projeção do horário e fuso prontos.

---

## Phase 3: User Story 1 - Cadastrar a equipe e o que cada um faz (Priority: P1) 🎯 MVP

**Goal**: colaboradores ligados à pessoa global, com vínculo, serviços e combos executados, preço e duração próprios versionados, convite opcional para o app, colaborador do autônomo pelo evento, e exibição pública.

**Independent Test**: cadastrar dois colaboradores, marcar serviços, convidar um e ver os dois na página pública (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Teste de contrato de `listProfessionals`, `createProfessional`, `setProfessionalServices` e `listPublicProfessionals` em `services/workforce/src/http/professionals.contract.test.ts`.
- [ ] T011 [P] [US1] Teste de integração em `services/workforce/src/professionals/professionals.int.test.ts`:
  - colaborador sem conta continua agendável (REQ-EQP-005);
  - combo só é aceito se o colaborador executa todas as etapas (REQ-EQP-012);
  - em saúde, sem conselho, registro e UF o colaborador não é exibido publicamente (`data-model.md` `workforce_professional.council`, `workforce_professional.registration_number`, `workforce_professional.registration_uf`; REQ-EQP-004);
  - o override versionado prevalece sobre o serviço (`data-model.md` `workforce_professional_service_override_version.duration_min`, `workforce_professional_service_override_version.amount_cents`; REQ-EQP-011);
  - o evento `tenancy.client.onboarded.v1` com `path=solo` cria colaborador e vínculo `owner_operator` com escala (REQ-EQP-006);
  - colaborador sem nenhum serviço marcado não aparece na listagem pública nem nos intervalos entregues à 008 (edge case);
  - a listagem pública nunca traz vínculo, tipo de vínculo, regra ou valor de comissão (REQ-EQP-070).

### Implementation for User Story 1

- [ ] T012 [US1] Implementar colaboradores e vínculos em `services/workforce/src/professionals/professionals.ts` e `services/workforce/src/engagements/engagements.ts`:
  - pessoa global pelo contrato do `identity`;
  - tipo de vínculo conforme `data-model.md` `workforce_engagement.kind`;
  - nome, apresentação e especialidades (`data-model.md` `workforce_professional.specialties` em JSON) e foto via `packages/platform/media` (`data-model.md` `workforce_professional.photo_media_id`, sem metadados);
  - convite pelo contrato da 003 com o papel Colaborador.
- [ ] T013 [US1] Implementar os serviços do colaborador e os overrides versionados em `services/workforce/src/services/professional-services.ts`, revalidando os combos quando a lista muda; versões de override com `data-model.md` `workforce_professional_service_override_version.currency` (`BRL`, NULL junto com o valor), `workforce_professional_service_override_version.valid_from` e `workforce_professional_service_override_version.status`.
- [ ] T014 [US1] Implementar o consumidor de onboarding solo em `services/workforce/src/professionals/on-client-onboarded.ts`.
- [ ] T015 [US1] Implementar as rotas `/v1/tenant/professionals*` em `services/workforce/src/http/professionals.ts` e `GET /v1/public/businesses/{slug}/professionals` em `services/workforce/src/public/professionals.ts` (REQ-EQP-070).
- [ ] T016 [P] [US1] Implementar a tela O04 (parte equipe) em `apps/tenant-web/src/routes/onboarding/team/` e a P15 (Colaboradores) em `apps/tenant-web/src/routes/team/`. Medir o cadastro com serviços e escala em ≤ 3 min (SC-001) num roteiro E2E em `apps/tenant-web/e2e/team.spec.ts`.
- [ ] T017 [P] [US1] Implementar a escolha de profissional (C06/W09) em `apps/consumer-mobile/app/business/[slug]/professionals.tsx` e `apps/consumer-web/app/routes/$slug.profissionais.tsx`.

**Checkpoint**: equipe cadastrada e visível.

---

## Phase 4: User Story 2 - Escala de trabalho (Priority: P1)

**Goal**: escala por colaborador e filial, por dia da semana, com intervalos em hora local e vigência; sem sobreposição entre filiais; contrato de intervalos de trabalho em UTC para a 008; aviso de afetados sem cancelar nada.

**Independent Test**: definir terça a sábado das 9h às 18h com almoço, com uma nova escala a partir do mês seguinte, e consultar o contrato (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T018 [P] [US2] Teste de contrato de `createSchedule` e `getWorkIntervals` em `services/workforce/src/http/schedules.contract.test.ts`.
- [ ] T019 [P] [US2] Teste de integração em `services/workforce/src/schedules/schedules.int.test.ts`:
  - sobreposição na mesma data em filiais diferentes → `workforce.schedule_overlap` (`data-model.md` `workforce_schedule_interval.start_local`, `workforce_schedule_interval.end_local`; REQ-EQP-002);
  - escala além do horário da filial gera aviso (REQ-EQP-021);
  - vigência futura passa a `current` (`data-model.md` `workforce_schedule.status`, `workforce_schedule.valid_from`);
  - mudança publica `workforce.availability.changed.v1` e não cancela nada (REQ-EQP-022);
  - intervalo que atravessa a meia-noite (20h às 2h) é aceito e dividido entre os dois dias no cálculo (edge case).
- [ ] T020 [P] [US2] Teste de casos dos intervalos de trabalho em `services/workforce/src/internal/work-intervals.cases.test.ts`: escala ∩ horário da filial − folgas − bloqueios, com exceções de troca, fusos diferentes e intervalo que atravessa a meia-noite, em 100% dos casos (REQ-EQP-023, SC-008).

### Implementation for User Story 2

- [ ] T021 [US2] Implementar as escalas e a validação de sobreposição em `services/workforce/src/schedules/schedules.ts`.
- [ ] T022 [US2] Implementar o cálculo dos intervalos de trabalho em `services/workforce/src/internal/work-intervals.ts`, com cache por (colaborador, mês) invalidado pelos eventos, e a rota `GET /v1/internal/workforce/professionals/{id}/work-intervals` em `services/workforce/src/http/internal.ts`. Meta: ≤ 30 ms p95.
- [ ] T023 [US2] Implementar a consulta de afetados pelo contrato da 009 (retorna "verificação indisponível" até ela existir) em `services/workforce/src/schedules/affected.ts`.
- [ ] T024 [US2] Emitir `workforce.professional.availability_set.v1` quando surge o primeiro colaborador ativo com serviço e escala vigente, para a prontidão da 005, em `services/workforce/src/professionals/readiness.ts`.
- [ ] T025 [P] [US2] Implementar a escala na P17 (Escalas, folgas e bloqueios) em `apps/tenant-web/src/routes/schedules/`.

**Checkpoint**: a 008 já pode pedir os intervalos de trabalho.

---

## Phase 5: User Story 3 - Folgas, bloqueios e aprovação (Priority: P1)

**Goal**: pedidos de folga pelo app sem dado de saúde, aprovação ou recusa, expiração, lançamento direto pela gestão e afetados listados.

**Independent Test**: pedir folga num dia com dois agendamentos, aprovar e conferir os afetados e o dia sem horários (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T026 [P] [US3] Teste de contrato de `createTimeOff` e `decideTimeOff` em `services/workforce/src/http/time-off.contract.test.ts`.
- [ ] T027 [P] [US3] Teste de integração em `services/workforce/src/time-off/time-off.int.test.ts`:
  - transições de `data-model.md` `workforce_time_off.state`;
  - pedido sem decisão até o início → `expired` com aviso (REQ-EQP-031);
  - recusa exige motivo e avisa o Colaborador (REQ-EQP-031);
  - folga aprovada num dia que já tinha troca aprovada: vale a folga, a troca é desfeita e os dois colaboradores são avisados (edge case);
  - `direct` vale na hora (REQ-EQP-032);
  - motivo sem anexo (REQ-EQP-034);
  - aprovar remove o dia dos intervalos de trabalho e publica `workforce.time_off.decided.v1` (SC-005).

### Implementation for User Story 3

- [ ] T028 [US3] Implementar as folgas e os bloqueios em `services/workforce/src/time-off/time-off.ts`, com o job de expiração no `workers` em `services/workforce/src/time-off/expire-job.ts`. Campos de `data-model.md` `workforce_time_off.starts_at` e `workforce_time_off.ends_at` em UTC (convertidos pela T008) e `workforce_time_off.branch_id` NULL = todas as filiais; a aprovação desfaz troca aprovada no mesmo dia (`workforce_shift_swap.state` → `cancelled`) com aviso.
- [ ] T029 [US3] Implementar as rotas `/v1/tenant/time-off*` em `services/workforce/src/http/time-off.ts`.
- [ ] T030 [P] [US3] Implementar o pedido de folga (K04) em `apps/pro-mobile/app/time-off/` e (KD4) em `apps/tenant-web/src/routes/pro/time-off/`, com aviso de não informar dado de saúde, e a aprovação na P17.

**Checkpoint**: folgas com aprovação refletidas na agenda.

---

## Phase 6: User Story 5 - Regras de comissão com a escolha da [D17] (Priority: P1)

**Goal**: regras versionadas por nível e precedência; base cheia ou com desconto, explicada com exemplo; taxas descontadas ou não; arrendatário pela cota; cálculo puro sem erro de centavo; contrato de cálculo; simulador; recebedor via split.

**Independent Test**: 40% padrão, 50% para um colaborador e 30% para um serviço, com base "valor com desconto"; simular e conferir (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T031 [P] [US5] Teste de propriedade em `packages/domain/commission/src/commission.property.test.ts`:
  - comissão + parte do estabelecimento = base;
  - nunca negativo;
  - piso ≤ comissão ≤ teto;
  - determinístico;
  - `floor` com resto para o estabelecimento;
  - arrendatário = 10000 − cota.

  Campos: `data-model.md` `workforce_commission_rule_version.floor_cents`, `workforce_commission_rule_version.cap_cents`. Requisitos: REQ-EQP-043/044, SC-002.
- [ ] T032 [P] [US5] Teste de precedência em `packages/domain/commission/src/precedence.test.ts`: colaborador+serviço > serviço > colaborador > padrão (`data-model.md` `workforce_commission_rule.level`; REQ-EQP-040).
- [ ] T033 [P] [US5] Teste de contrato de `setCommissionSettings`, `upsertCommissionRule`, `simulateCommission` e `quoteCommission` em `services/workforce/src/http/commission.contract.test.ts`.
- [ ] T034 [P] [US5] Teste de integração em `services/workforce/src/commission/commission.int.test.ts`:
  - `quote` com a versão congelada devolve o mesmo valor depois de uma mudança de regra (SC-003);
  - combo usa o rateio da 006;
  - pacote divide `floor(total/N)` com o resto na última sessão;
  - mudança de regra é auditada (REQ-EQP-045/049);
  - vínculo `owner_operator` (autônomo) não gera comissão: 100% fica com o negócio (edge case).

### Implementation for User Story 5

- [ ] T035 [US5] Implementar o cálculo puro em `packages/domain/commission/src/{calculate,precedence}.ts` (research R6).
- [ ] T036 [US5] Implementar as regras e configurações versionadas em `services/workforce/src/commission/rules.ts` (versões de regra com `data-model.md` `workforce_commission_rule_version.currency` = `BRL`, `workforce_commission_rule_version.valid_from` e `workforce_commission_rule_version.status`; `owner_operator` fica fora do cálculo): base `full`/`discounted` e `deduct_payment_fees` (`data-model.md` `workforce_commission_settings_version.base`, `workforce_commission_settings_version.deduct_payment_fees`; REQ-EQP-041/042).
- [ ] T037 [US5] Implementar `POST /v1/internal/workforce/commission/quote` e `POST /v1/tenant/commission/simulate` em `services/workforce/src/http/commission.ts`, mais as rotas de regras e configurações (REQ-EQP-046/047).
- [ ] T038 [US5] Mostrar o estado do recebedor do colaborador (via spec 012), com atalho para concluir o cadastro, em `services/workforce/src/professionals/payee-status.ts` (`data-model.md` `workforce_professional.payee_ref`; REQ-EQP-048).
- [ ] T039 [P] [US5] Implementar a tela P16 (Regras de comissão) em `apps/tenant-web/src/routes/commission/`, com explicação da [D17], exemplo numérico antes de salvar e simulador; aviso ao salvar quando o piso passa do valor de algum serviço coberto (o piso é limitado ao valor-base); tela escondida no caminho autônomo até existir um segundo colaborador (edge case).
- [ ] T040 [US5] Roteiro de teste de entendimento com 5 donos de estabelecimento, registrado em `docs/research/d17-entendimento.md` (SC-007).

**Checkpoint**: comissão calculável e congelável pela 009.

---

## Phase 7: User Story 4 - Troca de escala entre colaboradores (Priority: P2)

**Goal**: troca de dias entre dois colegas da mesma filial, com aceite e aprovação, só quando os agendamentos estão resolvidos.

**Independent Test**: trocar um sábado por uma terça com aceite e aprovação e ver as escalas invertidas (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T041 [P] [US4] Teste de contrato de `proposeSwap` e `progressSwap` em `services/workforce/src/http/swaps.contract.test.ts`.
- [ ] T042 [P] [US4] Teste de integração em `services/workforce/src/swaps/swaps.int.test.ts`:
  - transições de `data-model.md` `workforce_shift_swap.state`;
  - aprovação gera exceções para os dois (`data-model.md` `workforce_schedule_exception.source`, `workforce_schedule_exception.swap_id`);
  - com agendamentos não resolvidos → `workforce.swap_unresolved_appointments` (REQ-EQP-033);
  - segunda proposta para o mesmo dia enquanto a primeira está pendente é recusada (edge case).

### Implementation for User Story 4

- [ ] T043 [US4] Implementar as trocas em `services/workforce/src/swaps/swaps.ts`, com evento `workforce.swap.approved.v1` e o aceite do colega registrado em `data-model.md` `workforce_shift_swap.peer_accepted_at`.
- [ ] T044 [US4] Implementar as rotas `/v1/tenant/shift-swaps*` em `services/workforce/src/http/swaps.ts`.
- [ ] T045 [P] [US4] Implementar a troca em K04/KD4 (`apps/pro-mobile/app/time-off/swap.tsx`, `apps/tenant-web/src/routes/pro/time-off/swap.tsx`) e a aprovação na P17.

**Checkpoint**: trocas aprovadas refletidas na agenda.

---

## Phase 8: User Story 6 - Colaborador acompanha a própria comissão (Priority: P2)

**Goal**: projeção de lançamentos alimentada por eventos de agendamento e pagamento, ajustes como linhas novas, totais da semana e do mês, e só os próprios lançamentos visíveis.

**Independent Test**: com atendimentos concluídos sintéticos, abrir "Comissões" e conferir o total e o detalhe (quickstart §6).

### Tests for User Story 6 ⚠️

- [ ] T046 [P] [US6] Teste de contrato de `getMyCommissions` em `services/workforce/src/http/pro.contract.test.ts`.
- [ ] T047 [P] [US6] Teste de integração em `services/workforce/src/commission/entries.int.test.ts`:
  - estorno gera um `adjustment` com `ref_entry_id`, sem editar o original (`data-model.md` `workforce_commission_entry.kind`, `workforce_commission_entry.ref_entry_id`; REQ-EQP-051);
  - outra colaboradora recebe 404 (REQ-EQP-052);
  - o processamento é idempotente por evento.

### Implementation for User Story 6

- [ ] T048 [US6] Implementar a projeção `workforce_commission_entry`, consumidora de `scheduling.appointment.completed.v1` (009) e dos eventos de estorno e pagamento (012), em `services/workforce/src/commission/entries.ts`.
- [ ] T049 [US6] Implementar `GET /v1/pro/commissions` em `services/workforce/src/http/pro.ts`.
- [ ] T050 [P] [US6] Implementar as telas K03 em `apps/pro-mobile/app/commissions/` e KD3 em `apps/tenant-web/src/routes/pro/commissions/`, com o total do mês e o detalhe em até 2 toques (SC-006).

**Checkpoint**: colaborador vê a própria comissão.

---

## Phase 9: User Story 7 - Perfil e portfólio do colaborador (Priority: P3)

**Goal**: o colaborador edita o perfil e envia até 30 fotos com autorização de imagem e metadados removidos; as fotos passam por aprovação antes de aparecer na página pública.

**Independent Test**: atualizar a apresentação, enviar 3 fotos e vê-las na página depois da aprovação (quickstart §7).

### Tests for User Story 7 ⚠️

- [ ] T051 [P] [US7] Teste de contrato de `uploadPortfolioPhoto` em `services/workforce/src/http/portfolio.contract.test.ts`.
- [ ] T052 [P] [US7] Teste de integração em `services/workforce/src/portfolio/portfolio.int.test.ts`:
  - sem a declaração de uso de imagem → recusado (`data-model.md` `workforce_portfolio_photo.consent_text_version`, `workforce_portfolio_photo.consented_at`);
  - EXIF e geolocalização removidos (REQ-EQP-061);
  - limite de 30 fotos;
  - `pending` até a aprovação (`data-model.md` `workforce_portfolio_photo.state`; REQ-EQP-060).

### Implementation for User Story 7

- [ ] T053 [US7] Implementar o perfil e o portfólio, com a aprovação pelo Proprietário ou Gerente, em `services/workforce/src/portfolio/portfolio.ts`.
- [ ] T054 [US7] Implementar as rotas `/v1/pro/portfolio` e de aprovação em `services/workforce/src/http/portfolio.ts`.
- [ ] T055 [P] [US7] Implementar as telas K05 em `apps/pro-mobile/app/profile/` e KD5 em `apps/tenant-web/src/routes/pro/profile/`, mais a fila de aprovação na P15.

**Checkpoint**: portfólio aprovado na página pública.

---

## Phase 10: User Story 8 - Encerrar o vínculo (Priority: P3)

**Goal**: encerramento que exige resolver os agendamentos futuros, remove o papel na data, tira o colaborador da página pública e preserva o histórico; recontratação gera um novo vínculo.

**Independent Test**: encerrar o vínculo com agendamentos futuros, conferir a exigência, a queda do acesso e o histórico preservado (quickstart §7).

### Tests for User Story 8 ⚠️

- [ ] T056 [P] [US8] Teste de contrato de `endEngagement` em `services/workforce/src/http/engagements.contract.test.ts`.
- [ ] T057 [P] [US8] Teste de integração em `services/workforce/src/engagements/end.int.test.ts`:
  - com agendamentos depois da data de fim → `workforce.unresolved_future_appointments`;
  - na data: `ended`, papel Colaborador removido (003) e saída da página pública (`data-model.md` `workforce_engagement.state`, `workforce_engagement.end_date`; REQ-EQP-062);
  - recontratação cria um novo vínculo para o mesmo `person_id` (REQ-EQP-063).

### Implementation for User Story 8

- [ ] T058 [US8] Implementar o encerramento (`ending` → `ended` por job na data) e a recontratação em `services/workforce/src/engagements/end.ts`. Quando o encerrado era o último colaborador ativo de uma filial, publica `workforce.branch.no_active_professionals.v1` e o painel avisa; a página pública mostra "sem horários disponíveis" (edge case).
- [ ] T059 [US8] Implementar `POST /v1/tenant/professionals/{id}/end` em `services/workforce/src/http/engagements.ts`, mais a ação de encerrar na P15.

**Checkpoint**: vínculo encerrado com segurança.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T060 [P] Registrar os casos de isolamento do `workforce` em `services/workforce/src/isolation.cases.ts` (colaborador, escala, folga, regra e comissão de outro tenant → 404).
- [ ] T061 [P] Testes com a flag `workforce.v1` ligada e desligada em `services/workforce/src/__tests__/flags.int.test.ts`.
- [ ] T062 [P] Teste de propagação em `services/workforce/src/internal/propagation.int.test.ts`: mudança de escala invalida o cache da 008 em ≤ 10 s.
- [ ] T063 [P] Painel Grafana "Equipe" em `infra/observability/dashboards/workforce.json`, com folgas pendentes, tempo de decisão (SC-004) e latência dos intervalos de trabalho.
- [ ] T064 Registrar o risco de enquadramento do CLT no split em `docs/ops/decisions/riscos-007.md` (research R7).
- [ ] T065 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-007.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1.
- **US3** depende de US2 (intervalos de trabalho).
- **US5** depende de US1 e pode correr em paralelo com US2 e US3.
- **US4** depende de US2.
- **US6** depende de US5.
- **US7** depende de US1.
- **US8** depende de US1 e US2.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002, T003 e T004.
- Depois de US1: US2 e US5 em paralelo, e depois US3, US4 e US6. US7 pode correr junto.
- As telas de app e de web marcadas com [P] rodam em paralelo.

---

## Parallel Example: User Story 5

```bash
# Testes primeiro, juntos:
Task: "T031 propriedades em packages/domain/commission/src/commission.property.test.ts"
Task: "T032 precedência em packages/domain/commission/src/precedence.test.ts"
Task: "T033 contrato em services/workforce/src/http/commission.contract.test.ts"
Task: "T034 integração em services/workforce/src/commission/commission.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: equipe cadastrada e colaborador do autônomo.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US1 → US2 → US3 (agenda de trabalho pronta para a 008).
2. US5 (comissão pronta para a 009).
3. US4 → US6.
4. US7 → US8 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US5 → US4 → US6 → US7 → US8 → Polish.

---

## Notes

- Correções do `/speckit-analyze` de 2026-11-26 aplicadas sem tarefa nova. A REQ-NEG-021 da 005 já foi corrigida (clonagem não copia comissão), por isso T064 ficou só com o risco do CLT.
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-EQP que atende. Campos com restrição citam `data-model.md` e o campo.
- Percentuais em pontos-base inteiros e dinheiro em centavos; o cálculo fica em `packages/domain/commission`, sem I/O.
- Folga nunca pede dado de saúde; escala, folga e bloqueio nunca cancelam agendamento.
- Commit por tarefa ou grupo lógico, em branch `007-equipe-escalas-comissao`, por PR.
