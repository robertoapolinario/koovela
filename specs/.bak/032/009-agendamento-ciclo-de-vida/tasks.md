---
description: "Lista de tarefas da spec 009 — Agendamento e ciclo de vida"
---

# Tasks: Agendamento e ciclo de vida

**Input**: documentos de `specs/009-agendamento-ciclo-de-vida/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 008 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. O teste de propriedade da máquina de estados é portão de merge (REQ-AGE-004). A jornada J1 tem testes E2E com axe (CONST VIII item 7).

**Organization**: por história de usuário (US1–US7). P1: US1 a US5. P2: US6 e US7.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US7).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar as pastas `services/scheduling/src/{appointments,projections,agenda,manual}/` e o pacote puro `packages/domain/appointment-state/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/appointments.openapi.yaml` e `packages/contracts/asyncapi/appointment-events.asyncapi.yaml` (fonte: `specs/009-agendamento-ciclo-de-vida/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações de agendamento em `packages/contracts/rbac/permissions.yaml`:
  - consumidor `self`;
  - equipe com escopo de filial;
  - Colaborador só nos próprios atendimentos;
  - ações permitidas em sessão de suporte (agendar, ver, cancelar, remarcar).

  Declarar também a flag `scheduling.appointments_v1` em `packages/contracts/flags/flags.yaml`.
- [ ] T004 [P] Adicionar as dependências fixadas `ics` (no `scheduling`) e `expo-sqlite` (no `pro-mobile`).

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: máquina de estados, tabelas, versões congeladas e eventos.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste de propriedade (portão de merge) em `packages/domain/appointment-state/src/state.property.test.ts`: nenhuma sequência de comandos gera transição fora da tabela do research R2, e `CONCLUIDO` não tem transição de saída para exclusão (`data-model.md` `scheduling_appointment.state`; REQ-AGE-001/003/004, SC-005/006).

### Implementação da fundação

- [ ] T006 Implementar a máquina de estados pura em `packages/domain/appointment-state/src/state.ts`: tabela de transições com o ator permitido por transição (research R2).
- [ ] T007 Criar a migração `services/scheduling/migrations/0101_appointments.ts` no schema do tenant, com:
  - `scheduling_appointment`:
    - CHECK em `data-model.md` `scheduling_appointment.state`, `scheduling_appointment.origin`, `scheduling_appointment.channel` e `scheduling_appointment.item_kind`;
    - `scheduling_appointment.note` cifrada;
    - índices `(branch_id, start_at)`, `(professional_id, start_at)` e `(consumer_id, start_at)`.
  - `scheduling_appointment_step`;
  - `scheduling_appointment_transition` (append-only; CHECK em `scheduling_appointment_transition.actor_type`);
  - `scheduling_consumer_future_counter`, `scheduling_client_link`, `scheduling_pending_record` e `scheduling_affected_appointment`.
- [ ] T008 Implementar o serviço de transição em `services/scheduling/src/appointments/transition.ts`: aplica a máquina, grava `scheduling_appointment_transition` e o evento `scheduling.appointment.state_changed` (só identificadores, REQ-AGE-071) na mesma transação (REQ-AGE-002).
- [ ] T009 Implementar o congelamento das versões em `services/scheduling/src/appointments/freeze.ts`. Ele lê pelos contratos as versões vigentes de serviço e preço da filial (006), *override* do profissional, regra e configurações de comissão (007), política (010) e regra de fidelidade (015), e grava `data-model.md` `scheduling_appointment.frozen` e `scheduling_appointment.price_snapshot_cents`. Enquanto 010 e 015 não existem, grava `NULL` (REQ-AGE-015).

**Checkpoint**: estados testados e versões congeláveis.

---

## Phase 3: User Story 1 - Consumidor agenda do link à confirmação (Priority: P1) 🎯 MVP

**Goal**: jornada J1. Escolher o horário cria um `RASCUNHO` com *hold*. O cadastro é pedido só quando necessário. O resumo mostra a política. A confirmação passa por `PENDENTE_PAGAMENTO` quando há pagamento. A tela de confirmação traz endereço, mapa e `.ics`. Há limite de 5 agendamentos futuros e a origem é registrada.

**Independent Test**: no app e na web, do link ao "Meus agendamentos" e à agenda do colaborador (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Teste de contrato de `createDraftAppointment`, `confirmMyAppointment`, `getMyAppointment` e `getIcs` em `services/scheduling/src/http/consumer.contract.test.ts`.
- [ ] T011 [P] [US1] Teste de integração em `services/scheduling/src/appointments/create-confirm.int.test.ts`:
  - `RASCUNHO` com *hold* da 008; o *hold* vencido leva a `EXPIRADO` (REQ-AGE-011);
  - sem pagamento: `CONFIRMADO` direto; com pagamento: `PENDENTE_PAGAMENTO` e depois `CONFIRMADO` com o evento simulado da 012 (REQ-AGE-013);
  - a origem vem do cookie de visita (`data-model.md` `scheduling_appointment.origin`; REQ-AGE-016);
  - o 6º agendamento futuro gera `scheduling.future_limit_reached` (`data-model.md` `scheduling_consumer_future_counter.future_count`; REQ-AGE-017);
  - a observação tem até 300 caracteres e fica cifrada (REQ-AGE-018);
  - a observação só aparece para a equipe da filial do agendamento: equipe de outra filial e Colaborador de outra filial não a recebem (REQ-AGE-018).
- [ ] T012 [P] [US1] E2E da J1 com axe em `apps/consumer-web/e2e/j1-booking.spec.ts` (Playwright) e `apps/consumer-mobile/e2e/j1-booking.e2e.ts` (Detox): fluxo completo em até 3 min e tela de confirmação em 100% dos casos (SC-001/002).
- [ ] T013 [P] [US1] Teste de desempenho em `services/scheduling/bench/confirm.load.ts`: confirmação em ≤ 2 s p95, sem o tempo de pagamento (REQ-AGE-072).

### Implementation for User Story 1

- [ ] T014 [US1] Implementar a criação do rascunho em `services/scheduling/src/appointments/create.ts`:
  - *hold* pelo módulo de ocupação da 008, na mesma transação;
  - janela em `data-model.md` `scheduling_appointment.start_at`, `scheduling_appointment.end_at` e `scheduling_appointment.timezone` (fuso da filial), preço em `scheduling_appointment.price_snapshot_cents` com `scheduling_appointment.currency` = `BRL`, e `scheduling_appointment.occupancy_id` (no combo, a ocupação-mãe);
  - etapas de combo (`data-model.md` `scheduling_appointment_step.step_index`, `scheduling_appointment_step.service_version_id`, `scheduling_appointment_step.start_at`, `scheduling_appointment_step.end_at`, `scheduling_appointment_step.occupancy_id`);
  - congelamento (T009);
  - contador de futuros com `FOR UPDATE`;
  - `scheduling_client_link`.
- [ ] T015 [US1] Implementar a confirmação em `services/scheduling/src/appointments/confirm.ts`:
  - decide `PENDENTE_PAGAMENTO` ou `CONFIRMADO` pelo contrato da 010/012;
  - estende o *hold* uma vez quando falta etapa de cadastro (REQ-AGE-012);
  - consumidor de `payments.payment.approved.v1` confirma;
  - converte o *hold* em definitivo;
  - consumidor de `loyalty.points.{reserved,released}.v1` (015) que grava ou zera `data-model.md` `scheduling_appointment.loyalty_discount_cents` e `scheduling_appointment.loyalty_redemption_id`; o valor a cobrar é `price_snapshot_cents − loyalty_discount_cents` (mínimo 0).
- [ ] T016 [US1] Implementar o job de expiração de rascunhos no `workers`, ligado ao `hold_expired` da 008, em `services/scheduling/src/appointments/expire.ts`.
- [ ] T017 [US1] Implementar as rotas `/v1/consumer/businesses/{slug}/appointments`, `/v1/consumer/appointments/{id}`, `/confirm` e `/ics` em `services/scheduling/src/http/consumer.ts`. O tenant vem do slug. O `.ics` é gerado com `ics` e o endereço completo aparece só depois da confirmação (REQ-AGE-014).
- [ ] T018 [P] [US1] Implementar as telas C07, C08 e C12 em `apps/consumer-mobile/app/booking/` e W10, W11 e W14 em `apps/consumer-web/app/routes/agendar/`, com pedido de etapa 1/2 (003) sem perder o horário; em verticais de saúde, o campo de observação avisa o que não escrever (REQ-AGE-018).

**Checkpoint**: o consumidor agenda do link à confirmação.

---

## Phase 4: User Story 2 - "Meus agendamentos" em todos os estabelecimentos (Priority: P1)

**Goal**: projeção global sem PII alimentada por eventos, lida só pelo próprio consumidor, com ações roteadas ao tenant certo e "agendar de novo".

**Independent Test**: com o mesmo consumidor em dois tenants, ver os dois agendamentos sem que um tenant veja o outro (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T019 [US2] Teste de contrato de `listMyAppointments` em `services/scheduling/src/http/consumer.contract.test.ts` (mesmo arquivo de T010; não paralelizar com T010).
- [ ] T020 [P] [US2] Teste de integração em `services/scheduling/src/projections/consumer-index.int.test.ts`:
  - a projeção de dois tenants aparece para o consumidor;
  - um tenant não consegue ler a projeção (REQ-AGE-021);
  - as ações usam o `tenant_id` da linha da projeção, nunca o do cliente;
  - não há PII (`data-model.md` `consumer_appointments_index`);
  - os dados ficam atualizados em ≤ 5 s (SC-003, SC-009).

### Implementation for User Story 2

- [ ] T021 [US2] Criar a migração global da projeção `koovela_projections.consumer_appointments_index` em `services/scheduling/migrations/0102_consumer_appointments_index.ts` (colunas de `data-model.md` `consumer_appointments_index`: `state`, `start_at`, `timezone` e `allowed_actions` calculadas a partir do estado e da política congelada; mais `establishment_unavailable` marcada pelo evento de suspensão do tenant da 002) e o consumidor de eventos no `workers` em `services/scheduling/src/projections/consumer-index.ts` (REQ-AGE-020).
- [ ] T022 [US2] Implementar `GET /v1/consumer/appointments` (≤ 300 ms p95) e o roteamento das ações ao tenant da linha da projeção em `services/scheduling/src/http/consumer.ts`. Estabelecimento suspenso: o agendamento continua listado com o aviso "estabelecimento indisponível; entre em contato" e as ações ficam bloqueadas (edge case).
- [ ] T023 [P] [US2] Implementar as telas C03 (`apps/consumer-mobile/app/(tabs)/agendamentos.tsx`) e W06 (`apps/consumer-web/app/routes/meus-agendamentos.tsx`) com "agendar de novo" (REQ-AGE-022).

**Checkpoint**: lista única entre tenants.

---

## Phase 5: User Story 3 - Remarcar e cancelar sem telefonema (Priority: P1)

**Goal**: remarcação atômica (o original vai a `REAGENDADO`, o novo nasce `CONFIRMADO` com as mesmas versões e o mesmo pagamento), cancelamento com a consequência mostrada antes, e cancelamento pelo estabelecimento com motivo e aviso.

**Independent Test**: remarcar e conferir o vínculo; cancelar o novo e conferir o estado, o evento e a liberação (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Teste de contrato de `rescheduleMyAppointment` e `cancelMyAppointment` em `services/scheduling/src/http/consumer-actions.contract.test.ts`.
- [ ] T025 [P] [US3] Teste de corrida e falha injetada em `services/scheduling/src/appointments/reschedule.int.test.ts`: nova ocupação e liberação da antiga na mesma transação; nenhuma remarcação deixa o consumidor sem horário ou com dois horários, inclusive de combo, em que todas as etapas são reservadas de novo ou nenhuma (`data-model.md` `scheduling_appointment.rescheduled_from_id`; REQ-AGE-030, SC-004).
- [ ] T026 [P] [US3] Teste de integração em `services/scheduling/src/appointments/cancel.int.test.ts`:
  - consumidor → `CANCELADO_USUARIO` com motivo opcional;
  - estabelecimento → `CANCELADO_ESTABELECIMENTO` com motivo obrigatório e aviso;
  - ação proibida pela política é recusada com a consequência explicada (stub da 010) (REQ-AGE-031/032);
  - dois cancelamentos simultâneos (consumidor e estabelecimento): vale o primeiro gravado, com trava na linha do agendamento, e o segundo recebe o estado atual (edge case).

### Implementation for User Story 3

- [ ] T027 [US3] Implementar a remarcação em `services/scheduling/src/appointments/reschedule.ts`, copiando `frozen`, preço e pagamento.
- [ ] T028 [US3] Implementar o cancelamento em `services/scheduling/src/appointments/cancel.ts`. Ele libera a ocupação na 008 e consulta a consequência pela política congelada (contrato da 010; stub até ela existir). No cancelamento pelo estabelecimento, pede a devolução integral pelo contrato da 012 (stub até ela existir) (REQ-AGE-032).
- [ ] T029 [US3] Implementar as rotas `/reschedule` e `/cancel` do consumidor em `services/scheduling/src/http/consumer.ts`.
- [ ] T030 [P] [US3] Implementar as telas C13 (`apps/consumer-mobile/app/booking/manage.tsx`) e W15 (`apps/consumer-web/app/routes/agendamento.$id.gerenciar.tsx`), mostrando a consequência antes de confirmar.

**Checkpoint**: autosserviço de remarcar e cancelar.

---

## Phase 6: User Story 4 - Equipe opera a agenda (Priority: P1)

**Goal**: agenda do dia e da semana em tempo real (SSE), agendamento manual com busca e pré-cadastro, troca de profissional com aviso, e lista de afetados com resolução em lote.

**Independent Test**: agenda de 3 colaboradores, agendamento manual para um consumidor novo, mudança de profissional e atualização em outra aba (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T031 [P] [US4] Teste de contrato de `getAgenda`, `streamAgenda`, `createManualAppointment`, `staffAppointmentCommand`, `listAffected`, `appointmentsInWindow` e `preRegisterConsumer` em `services/scheduling/src/http/staff.contract.test.ts`.
- [ ] T032 [P] [US4] Teste de integração em `services/scheduling/src/manual/manual.int.test.ts`:
  - busca por celular (HMAC via `identity`) e por nome em `scheduling_client_link`;
  - consumidor novo vira pré-cadastro visível só neste tenant (`data-model.md` `scheduling_client_link.pre_registered`; REQ-AGE-041/042);
  - a equipe pode passar do limite de futuros com confirmação.
- [ ] T033 [P] [US4] Teste de integração em `services/scheduling/src/agenda/affected.int.test.ts`:
  - os eventos `workforce.availability.changed.v1` e `tenancy.branch.hours_changed.v1` marcam afetados (`data-model.md` `scheduling_affected_appointment.cause`);
  - a resolução pode ser feita um a um ou em lote (`data-model.md` `scheduling_affected_appointment.resolution`; REQ-AGE-033);
  - a troca de profissional avisa o consumidor e permite cancelar sem custo quando ele tinha escolhido o profissional (`data-model.md` `scheduling_appointment.consumer_chose_professional`; REQ-AGE-034).
- [ ] T034 [P] [US4] Teste E2E em `apps/tenant-web/e2e/agenda.spec.ts`: P03/P04 com atualização via SSE em ≤ 5 s em outra aba; P05 com agendamento manual para consumidor novo em ≤ 1 min; axe (REQ-AGE-043, SC-008).

### Implementation for User Story 4

- [ ] T035 [US4] Integrar o agendamento manual ao contrato de pré-cadastro da 003 (`POST /v1/internal/identity/consumers/pre-register`, implementado na T091 da 003) em `services/scheduling/src/manual/pre-register-client.ts`: o pré-cadastro fica visível só ao tenant de origem (`scheduling_client_link.pre_registered`) até a verificação do OTP, e o consumidor é avisado do agendamento pela 011 (REQ-AGE-041/042).
- [ ] T036 [US4] Implementar o agendamento manual e a busca de cliente em `services/scheduling/src/manual/{manual,search}.ts`, usando o encaixe da 008 quando houver motivo; o nome para busca da Recepção fica em `data-model.md` `scheduling_client_link.display_name_cache`, só no tenant, e o consumidor novo é criado pelo contrato de pré-cadastro da 003 (T091 da 003).
- [ ] T037 [US4] Implementar a agenda do dia e da semana em `services/scheduling/src/agenda/agenda.ts` (ocupações, livres, folgas e bloqueios, no escopo da filial) e o SSE com `Last-Event-ID` e fan-out em Redis em `services/gateway/src/routes/agenda-stream.ts`.
- [ ] T038 [US4] Implementar os comandos da equipe (trocar profissional, cancelar pelo estabelecimento, remarcar) e a lista de afetados em `services/scheduling/src/agenda/{commands,affected}.ts`, e o contrato `appointmentsInWindow` para 005 e 007 em `services/scheduling/src/http/internal.ts`.
- [ ] T039 [US4] Implementar as rotas `/v1/tenant/agenda*`, `/v1/tenant/appointments*` em `services/scheduling/src/http/staff.ts`.
- [ ] T040 [P] [US4] Implementar as telas P03 e P04 em `apps/tenant-web/src/routes/agenda/` e P05 em `apps/tenant-web/src/routes/agenda/new/`, mais a tela de afetados.

**Checkpoint**: equipe opera a agenda em tempo real.

---

## Phase 7: User Story 5 - Colaborador vê a agenda e registra o atendimento (Priority: P1)

**Goal**: agenda do colaborador, check-in a partir de 30 min antes, check-out com valor final "a partir de", evento de conclusão e modo offline de 7 dias com fila idempotente.

**Independent Test**: no app, ler a agenda sem rede, fazer check-in e check-out sem rede e ver os estados chegarem ao reconectar (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T041 [P] [US5] Teste de contrato de `getMyAgenda` em `services/scheduling/src/http/pro.contract.test.ts`.
- [ ] T042 [P] [US5] Teste de integração em `services/scheduling/src/appointments/attendance.int.test.ts`:
  - check-in antes de 30 min é recusado (REQ-AGE-050);
  - check-out leva a `CONCLUIDO` e publica o evento para 012, 015, 016 e 017 (REQ-AGE-053);
  - valor final abaixo do mínimo é recusado (`data-model.md` `scheduling_appointment.final_amount_cents`; REQ-AGE-051);
  - comandos offline com `Idempotency-Key` são aplicados uma vez, com `data-model.md` `scheduling_appointment.recorded_offline` (REQ-AGE-052).
- [ ] T043 [P] [US5] Teste do modo offline do app em `apps/pro-mobile/__tests__/offline-agenda.test.tsx`: 7 dias legíveis com "sincronizado às…" e fila enviada ao reconectar, com o estado do servidor prevalecendo (SC-007).

### Implementation for User Story 5

- [ ] T044 [US5] Implementar check-in e check-out em `services/scheduling/src/appointments/attendance.ts`, com aviso ao consumidor antes de cobrar a diferença do "a partir de"; grava `data-model.md` `scheduling_appointment.checked_in_at` e `scheduling_appointment.checked_out_at` com a hora do servidor.
- [ ] T045 [US5] Implementar `GET /v1/pro/agenda` e os comandos do Colaborador nos próprios atendimentos em `services/scheduling/src/http/pro.ts`.
- [ ] T046 [P] [US5] Implementar K01 e K02 com cache SQLite de 7 dias e fila local em `apps/pro-mobile/app/agenda/` e `apps/pro-mobile/src/offline/queue.ts`.
- [ ] T047 [P] [US5] Implementar KD1 e KD2 em `apps/tenant-web/src/routes/pro/agenda/`.

**Checkpoint**: atendimento registrado, inclusive sem rede.

---

## Phase 8: User Story 6 - Não comparecimento e expiração (Priority: P2)

**Goal**: `NO_SHOW` só depois da tolerância, correção em até 48 h com registro, e lista de pendentes no fim do dia sem mudança automática de estado.

**Independent Test**: marcar não comparecimento depois da tolerância e confirmar que antes dela a ação não aparece (quickstart §6).

### Tests for User Story 6 ⚠️

- [ ] T048 [P] [US6] Teste de integração em `services/scheduling/src/appointments/no-show.int.test.ts`:
  - `NO_SHOW` só depois da tolerância da política congelada (padrão 15 min) (REQ-AGE-060);
  - correção em até 48 h com registro (REQ-AGE-062);
  - fim do dia local da filial: `CONFIRMADO` sem check-in entra em `scheduling_pending_record` sem mudar de estado (`data-model.md` `scheduling_pending_record.resolution`; REQ-AGE-061).

### Implementation for User Story 6

- [ ] T049 [US6] Implementar a marcação e a correção de `NO_SHOW` em `services/scheduling/src/appointments/no-show.ts`, com o evento para a 010 reverter consequências.
- [ ] T050 [US6] Implementar o job de pendências por fuso da filial no `workers` (`data-model.md` `scheduling_pending_record.local_date` = data local da filial) em `services/scheduling/src/agenda/pending-records.ts` e a rota `listPendingRecords` em `services/scheduling/src/http/staff.ts`.
- [ ] T051 [P] [US6] Implementar as ações de não comparecimento e a lista de pendências em P03 e K02, em `apps/tenant-web/src/routes/agenda/PendingRecords.tsx` e `apps/pro-mobile/app/agenda/no-show.tsx`.
- [ ] T061 [US6] Implementar o cancelamento por exclusão de conta em `services/scheduling/src/appointments/on-consumer-deactivated.ts`: consome `identity.consumer.deactivated.v1` (003), encontra os agendamentos futuros do consumidor em todos os tenants pela projeção, e em cada tenant leva a `CANCELADO_USUARIO` com motivo `account_deleted`, aplicando a política congelada de cada um (contrato da 010) e avisando o estabelecimento; idempotente por evento. Teste em `services/scheduling/src/appointments/on-consumer-deactivated.int.test.ts` com dois tenants (edge case; REQ-IDN-070 da 003).
- [ ] T062 [P] Consumir `backoffice.consumer_block.changed` (021) em `services/scheduling/src/blocks/on-consumer-block.ts`: consumidor bloqueado não cria agendamento novo (`scheduling.consumer_blocked`), mas os futuros continuam válidos; só uma decisão explícita da 021 (`cancel_future = true`) cancela, sem multa, com aviso aos estabelecimentos pela 011. Teste em `services/scheduling/src/blocks/on-consumer-block.int.test.ts`.
- [ ] T063 [P] Consumir `scheduling.class_enrollment.changed` (026) em `services/scheduling/src/my-appointments/class-enrollments.ts`: a inscrição aparece em "Meus agendamentos" com aula, horário, estúdio, QR de check-in e "cancelar" pela política da 010. Teste em `services/scheduling/src/my-appointments/class-enrollments.int.test.ts`.
- [ ] T064 [P] Aceitar o token do link de campanha (028) na criação do agendamento em `services/scheduling/src/appointments/campaign-offer.ts`: valida a validade e os serviços da oferta, grava `scheduling_appointment.campaign_discount_cents`, `scheduling_appointment.campaign_id` e a origem `campaign` (com o CHECK atualizado por expandir → migrar, também em `scheduling_occupancy.origin` da 008), e recusa somar com resgate de fidelidade. Teste em `services/scheduling/src/appointments/campaign-offer.int.test.ts`.
- [ ] T065 [P] Gravar o vale aplicado no agendamento em `services/scheduling/src/appointments/gift-card.ts`: `scheduling_appointment.gift_card_applied_cents` e `scheduling_appointment.gift_card_id` vindos da reserva da 029, zerados na devolução; o resumo mostra desconto (oferta ou fidelidade) → vale → restante. Teste em `services/scheduling/src/appointments/gift-card.int.test.ts`.
- [ ] T066 [P] Implementar check-in e check-out por etapa em combos com troca (030) em `services/scheduling/src/appointments/steps/check-in-out.ts`: cada colaborador marca a própria etapa (`scheduling_appointment_step.state` `in_progress` → `done`), publicando `scheduling.appointment_step.changed`; o agendamento só passa a `CONCLUIDO` quando todas as etapas estão `done`. Teste em `services/scheduling/src/appointments/steps/check-in-out.int.test.ts`.

**Checkpoint**: faltas tratadas com segurança.

---

## Phase 9: User Story 7 - Regras congeladas e histórico completo (Priority: P2)

**Goal**: versões congeladas imutáveis, histórico de transições consultável e `CONCLUIDO` nunca apagado.

**Independent Test**: mudar preço, comissão e política depois de agendar e conferir que o agendamento mantém as versões; consultar o histórico (quickstart §7).

### Tests for User Story 7 ⚠️

- [ ] T052 [P] [US7] Teste de integração em `services/scheduling/src/appointments/frozen.int.test.ts`: mudanças posteriores em 006, 007 e 010 não alteram `frozen` nem `price_snapshot_cents`; a tentativa de apagar um `CONCLUIDO` falha (REQ-AGE-003/015).

### Implementation for User Story 7

- [ ] T053 [US7] Implementar a consulta do histórico de transições (equipe) em `services/scheduling/src/appointments/history.ts` e expô-la no detalhe do agendamento em `services/scheduling/src/http/staff.ts`.
- [ ] T054 [US7] Bloquear a exclusão física de `CONCLUIDO` com regra no domínio e um trigger de defesa `BEFORE DELETE` em `services/scheduling/migrations/0103_protect_concluded.ts`.
- [ ] T055 [P] [US7] Mostrar o histórico no detalhe do agendamento do painel em `apps/tenant-web/src/routes/agenda/AppointmentHistory.tsx`.

**Checkpoint**: histórico completo e regras congeladas.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T056 [P] Registrar os casos de isolamento dos contratos desta spec em `services/scheduling/src/isolation.cases.ts` (REQ-AGE-070).
- [ ] T057 [P] Testes com a flag `scheduling.appointments_v1` ligada e desligada em `services/scheduling/src/__tests__/appointments-flags.int.test.ts`.
- [ ] T058 [P] Painel Grafana "Agendamentos" em `infra/observability/dashboards/appointments.json`: conversão da J1, tempo de confirmação, expirados, cancelamentos, no-show, pendências e atraso do SSE.
- [ ] T059 Escrever o runbook `docs/ops/runbooks/agenda-nao-atualiza.md`.
- [ ] T060 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-009.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (eventos de agendamento).
- **US3** depende de US1.
- **US4** depende de US1.
- **US5** depende de US1. Pode correr em paralelo com US3 e US4.
- **US6** depende de US5 (check-in).
- **US7** depende de US1.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Depois de US1: US2, US3, US4, US5 e US7 em paralelo; US6 depois de US5.
- Telas de app e web marcadas com [P] em paralelo dentro de cada história.

---

## Parallel Example: User Story 4

```bash
# Testes primeiro, juntos:
Task: "T031 contrato em services/scheduling/src/http/staff.contract.test.ts"
Task: "T032 manual em services/scheduling/src/manual/manual.int.test.ts"
Task: "T033 afetados em services/scheduling/src/agenda/affected.int.test.ts"
Task: "T034 E2E em apps/tenant-web/e2e/agenda.spec.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: J1 do link à confirmação.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US1 → US2 → US3 (consumidor completo).
2. US4 → US5 (equipe e colaborador).
3. US6 → US7 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → US6 → US7 → Polish.

---

## Notes

- T015 ampliada pelo `/speckit-analyze` da 015 (2026-11-27): desconto de fidelidade no agendamento.
- T061 foi acrescentada pelo `/speckit-analyze` de 2026-11-26 (US6). O contrato de pré-cadastro passou para a spec 003 (T091 da 003), por isso T059 ficou só com o runbook.
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-AGE que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhuma transição fora da tabela; `CONCLUIDO` nunca apagado; versões congeladas imutáveis.
- A projeção global não tem PII e nunca é lida por tenant.
- Commit por tarefa ou grupo lógico, em branch `009-agendamento-ciclo-de-vida`, por PR.
- T066 acrescentada na análise da 030 (2026-11-27): check-in e check-out por etapa.
- T065 acrescentada na análise da 029 (2026-11-27): vale aplicado no agendamento.
- T064 acrescentada na análise da 028 (2026-11-27): desconto e origem de campanha.
- T063 acrescentada na análise da 026 (2026-11-27): inscrições em turma em "Meus agendamentos".
- T062 acrescentada na análise da 021 (2026-11-27): agendamentos de consumidor bloqueado.
