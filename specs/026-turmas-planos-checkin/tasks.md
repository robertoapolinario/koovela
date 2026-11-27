---
description: "Lista de tarefas da spec 026 — Turmas, planos e check-in"
---

# Tasks: Turmas, planos e check-in

**Input**: documentos de `specs/026-turmas-planos-checkin/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 025 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- concorrência da última vaga: exatamente uma inscrição aceita (REQ-TUR-015, SC-001);
- saldos de crédito nunca negativos (SC-004);
- nenhuma cobrança depois do cancelamento fora do ciclo pago (SC-006).

**Organization**: por história de usuário. P1: US1 (grade), US2 (inscrição sem dupla reserva) e US3 (check-in). P2: US4 (pacotes) e US5 (plano mensal).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar os submódulos `services/scheduling/src/classes/{groups,sessions,seats,enrollments,checkin,walk-ins,no-shows}/`, `services/payments/src/memberships/{subscriptions,charges,dunning,usage-limits}/` e `services/catalog/src/{class-packages,class-plans}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/classes.openapi.yaml` e `packages/contracts/asyncapi/classes-events.asyncapi.yaml` (fonte: `specs/026-turmas-planos-checkin/contracts/`). Incluir as operações que faltam no contrato:
  - `/v1/tenant/class-packages` e `/v1/tenant/class-plans` (definições versionadas);
  - `/v1/consumer/class-packages/{package_id}/purchase` (compra do pacote).

  Rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - grade pelo Proprietário e pelo Gerente da filial; pacotes e planos só pelo Proprietário;
  - cancelar aula e trocar instrutor pelo Proprietário, com `audit_category`;
  - check-in e aluno de última hora pelo instrutor da aula;
  - aluno `self` e responsável pelo menor (025).

  Declarar a flag `classes.v1` em `packages/contracts/flags/flags.yaml`.
- [ ] T004 [P] Criar a vertical bem-estar e fitness (spa, massoterapia, yoga, pilates, personal 1:1) em `packages/contracts/catalog/verticals.yaml` (REQ-TUR-051).

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, extensão do livro de saldos e ocupação do instrutor por aula.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste de schema em `services/scheduling/src/classes/__tests__/schema.int.test.ts`:
  - a PK `(session_id, seat_no)` de `data-model.md` `classes_seat` e o UNIQUE `(session_id, subject_id)` de `classes_enrollment` recusam duplicação;
  - `classes_group.capacity` fora de 2–100 é recusado.
- [ ] T006 [P] Teste do livro de saldos em `services/payments/src/balances/class-products.int.test.ts`: `class_package` e `class_plan_usage` (`data-model.md` `payments_balance_account.product_kind`) seguem a reserva, o consumo e a devolução da 012 sem ficar negativos (SC-004).

### Implementação da fundação

- [ ] T007 Criar a migração de tenant `services/scheduling/migrations/tenant/0026_classes.ts` com:
  - `classes_group`: CHECK em `data-model.md` `classes_group.capacity`, `classes_group.commission_mode` e `classes_group.commission_base`, mais `classes_group.checkin_modes` e `classes_group.version`;
  - `classes_session`: CHECK em `classes_session.state`;
  - `classes_seat`: PK composta;
  - `classes_enrollment`: CHECK em `classes_enrollment.pay_mode`, `classes_enrollment.state` e `classes_enrollment.cancel_kind`, e UNIQUE `(session_id, subject_id)`.
- [ ] T008 [P] Criar a migração de tenant `services/catalog/migrations/tenant/0026_class_products.ts` com `catalog_class_package_version` (CHECK em `data-model.md` `catalog_class_package_version.classes_count` e `catalog_class_package_version.validity_days`) e `catalog_class_plan_version` (CHECK em `catalog_class_plan_version.limit_kind`; `catalog_class_plan_version.min_commitment_months` com padrão 0).
- [ ] T009 [P] Criar a migração de tenant `services/payments/migrations/tenant/0026_memberships.ts` com `memberships_subscription` (CHECK em `data-model.md` `memberships_subscription.state`), `memberships_charge` (UNIQUE `(membership_id, cycle, attempt)`) e a extensão de `payments_balance_account.product_kind`.
- [ ] T010 Implementar no livro de saldos da 012 os produtos `class_package` e `class_plan_usage` em `services/payments/src/balances/class-products.ts`.
- [ ] T011 Registrar na 008 a ocupação do instrutor por aula em `services/scheduling/src/availability/occupancy/class-occupancy.ts`, com `scheduling_occupancy.capacity_unit` = capacidade da aula e o instrutor protegido pela 008 (atualizar o `data-model.md` da 008).

**Checkpoint**: estrutura de vagas, créditos e ocupação pronta.

---

## Phase 3: User Story 1 - Montar a grade de turmas (Priority: P1) 🎯 MVP

**Goal**: turma com modalidade, instrutor, sala (só nome), dias, horário e capacidade. Aulas geradas até o horizonte e ocupando o instrutor. Mudanças valem para o futuro. Cancelar aula ou trocar instrutor avisa os inscritos e devolve créditos.

**Independent Test**: criar "Pilates iniciante, seg e qua 7h, 8 vagas, Ana, sala 1" e ver as aulas das próximas semanas (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T012 [P] [US1] Teste de contrato de `createClassGroup`, `updateClassGroup`, `sessionAction` e `listClassSessions` em `services/scheduling/src/classes/http/groups.contract.test.ts`.
- [ ] T013 [P] [US1] Teste de integração em `services/scheduling/src/classes/groups/groups.int.test.ts`:
  - aulas geradas até o horizonte, com o instrutor ocupado pela 008;
  - sala sobreposta gera aviso sem bloqueio (PEN-23);
  - reduzir a capacidade abaixo dos inscritos → `classes.capacity_below_enrolled` (`data-model.md` `classes_session.capacity`);
  - mudar a turma só afeta aulas futuras;
  - cancelar aula → aviso (011), devolução de créditos, devolução do uso do plano dentro do limite semanal e estorno de avulsos (012) (REQ-TUR-003).

### Implementation for User Story 1

- [ ] T014 [US1] Implementar a turma versionada em `services/scheduling/src/classes/groups/groups.ts` (`data-model.md` `classes_group.service_id`, `classes_group.level`, `classes_group.instructor_id`, `classes_group.branch_id`, `classes_group.room_name`, `classes_group.weekdays`, `classes_group.local_time`, `classes_group.duration_min`, `classes_group.single_price_cents`, `classes_group.starts_on`, `classes_group.ends_on`).
- [ ] T015 [US1] Implementar a geração diária de aulas com `expand()` da 013 (`packages/domain/recurrence`) em `services/scheduling/src/classes/sessions/generate.ts`, gravando `data-model.md` `classes_session.occupancy_id`, `classes_session.starts_at`, `classes_session.ends_at` e `classes_session.instructor_id`.
- [ ] T016 [US1] Implementar cancelamento de aula e troca de instrutor em `services/scheduling/src/classes/sessions/actions.ts`, publicando `scheduling.class_session.changed`.
- [ ] T017 [US1] Implementar as rotas `/v1/tenant/class-groups*`, `/v1/tenant/class-sessions/{id}/{action}` e `/v1/public/businesses/{slug}/classes` em `services/scheduling/src/classes/http/groups.ts`.
- [ ] T018 [P] [US1] Implementar a tela de grade e capacidade em `apps/tenant-web/src/routes/classes/`, para montar 10 turmas em até 15 min (SC-007).

**Checkpoint**: o estúdio publica a grade.

---

## Phase 4: User Story 2 - Aluno se inscreve sem risco de pegar vaga ocupada (Priority: P1)

**Goal**: inscrição com lock por aula e assento por PK. Sem fila de espera, com as próximas aulas sugeridas quando lota. Pagamento avulso, por crédito ou por plano. Menor inscrito pelo responsável e cancelamento pela política (010).

**Independent Test**: 3 inscrições simultâneas para a última de 8 vagas; só uma é aceita (quickstart §2 e §3).

### Tests for User Story 2 ⚠️

- [ ] T019 [P] [US2] Teste de concorrência (portão de merge) em `services/scheduling/src/classes/seats/last-seat.concurrency.test.ts`: 20 inscrições simultâneas na última vaga → exatamente 1 aceita, e as outras recebem `classes.full` com `next_sessions` (SC-001). Incluir no filtro `pnpm test:concurrency --filter class-last-seat`.
- [ ] T020 [P] [US2] Teste de contrato de `enroll` e `cancelEnrollment` em `services/scheduling/src/classes/http/enrollments.contract.test.ts`.
- [ ] T021 [P] [US2] Teste de integração em `services/scheduling/src/classes/enrollments/enrollments.int.test.ts`:
  - avulso cobra com split;
  - `credit` e `plan` reservam na inscrição (`data-model.md` `classes_enrollment.balance_entry_id`, `classes_enrollment.membership_id`);
  - menor inscrito pelo responsável, com `classes_enrollment.payer_consumer_id` = responsável (REQ-TUR-013);
  - cancelamento dentro da política devolve, e fora consome (`classes_enrollment.cancel_kind`);
  - aluno com plano e pacote: o padrão é o plano, e ele pode escolher o pacote;
  - crédito que vence antes da data da aula não pode ser reservado nela;
  - o QR do menor fica no app do responsável.

### Implementation for User Story 2

- [ ] T022 [US2] Implementar a reserva de vaga (lock Redis `lock:class:{session_id}`, `FOR UPDATE` na aula, menor `seat_no` livre; `data-model.md` `classes_seat.enrollment_id`) em `services/scheduling/src/classes/seats/seats.ts`.
- [ ] T023 [US2] Implementar a inscrição nas três formas de pagamento e as sugestões quando lota em `services/scheduling/src/classes/enrollments/enroll.ts`, (`data-model.md` `classes_enrollment.session_id`, `classes_enrollment.subject_id`, `classes_enrollment.payment_id`), publicando `scheduling.class_enrollment.changed` para "Meus agendamentos" (009 T063), a nota (017 T048) e os avisos (011 T073).
- [ ] T024 [US2] Implementar o cancelamento pela política da 010 em `services/scheduling/src/classes/enrollments/cancel.ts`.
- [ ] T025 [US2] Implementar as rotas `/v1/consumer/class-sessions/{id}/enrollments` e `/v1/consumer/class-enrollments/{id}/cancel` em `services/scheduling/src/classes/http/enrollments.ts`.
- [ ] T026 [P] [US2] Implementar as telas de turmas e inscrição (até 3 toques a partir da grade, SC-002) em `apps/consumer-mobile/src/app/negocio/[slug]/turmas/` e `apps/consumer-web/src/routes/$slug.turmas.tsx`.

**Checkpoint**: a vaga de cada aluno está garantida.

---

## Phase 5: User Story 3 - Check-in por QR ou pela lista do instrutor (Priority: P1)

**Goal**: QR do aluno, QR rotativo do estúdio ou check-in manual, na janela de −30 a +15 min. A presença consome crédito ou uso. Faltas são marcadas no fim da aula. O instrutor pode adicionar um aluno de última hora e fazer check-in sem rede.

**Independent Test**: 5 inscritos: 2 por QR, 2 pela lista e 1 ausente; conferir presenças, consumo e falta (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T027 [P] [US3] Teste de contrato de `getStudentQr`, `studioQrCheckin`, `getRoster`, `instructorCheckins` e `addWalkIn` em `services/scheduling/src/classes/http/checkin.contract.test.ts`.
- [ ] T028 [P] [US3] Teste de integração em `services/scheduling/src/classes/checkin/checkin.int.test.ts`:
  - fora da janela da `classes_policy` (ou do ajuste do negócio dentro de `checkin_bounds`) é recusado; com a janela alterada no back-office, vale a nova;
  - o QR do estúdio gira a cada 30 s (`data-model.md` `classes_session.studio_qr_secret`);
  - check-ins offline enviados ao reconectar não duplicam e são validados pelo horário registrado (`classes_enrollment.checkin_recorded_offline`);
  - a presença consome crédito ou uso;
  - no fim da aula, os ausentes viram `no_show` com a consequência da política;
  - o aluno de última hora (`classes_enrollment.walk_in`) tem inscrição, pagamento e presença numa operação só.

### Implementation for User Story 3

- [ ] T029 [US3] Implementar os tokens de QR (`jose`, sem PII, curta duração) e o check-in nos três modos em `services/scheduling/src/classes/checkin/checkin.ts`, com `data-model.md` `classes_enrollment.checked_in_at` e `classes_enrollment.checkin_mode`, e a janela lida da `classes_policy` (com `classes_group.checkin_before_min`/`checkin_after_min` do negócio).
- [ ] T030 [US3] Implementar a marcação de faltas no fim da aula no `workers` em `services/scheduling/src/classes/no-shows/no-shows.ts`.
- [ ] T031 [US3] Implementar o aluno de última hora em `services/scheduling/src/classes/walk-ins/walk-ins.ts`.
- [ ] T032 [US3] Implementar as rotas `/v1/consumer/class-enrollments/{id}/qr`, `/v1/consumer/class-sessions/{id}/checkin` e `/v1/pro/class-sessions/{id}/*` em `services/scheduling/src/classes/http/checkin.ts`.
- [ ] T033 [P] [US3] Implementar no app do colaborador a lista, a leitura de QR e o modo offline (SQLite do Expo), registrando uma turma de 10 em até 1 min (SC-003), em `apps/pro-mobile/src/app/class-checkin/`. O QR do aluno vai em `apps/consumer-mobile/src/app/turmas/qr.tsx` e o QR do estúdio em `apps/tenant-web/src/routes/classes/StudioQr.tsx`.

**Checkpoint**: presença registrada e créditos consumidos.

---

## Phase 6: User Story 4 - Pacotes de aulas (Priority: P2)

**Goal**: pacote com número de aulas, modalidades, preço, validade e regra de devolução, comprado como saldo no livro da 012. O aluno vê disponível, reservado, usado e validade, e é avisado 7 dias antes de vencer.

**Independent Test**: pacote de 10 aulas e 60 dias; comprar, inscrever-se em 3, ir em 2, faltar em 1 e conferir o saldo (quickstart §3 e §6).

### Tests for User Story 4 ⚠️

- [ ] T034 [P] [US4] Teste de integração em `services/catalog/src/class-packages/packages.int.test.ts`:
  - `data-model.md` `catalog_class_package_version.refund_rule` não fica abaixo da REQ-CAT-044;
  - a compra cria saldo `class_package` com a validade da versão;
  - o extrato mostra disponível, reservado, usado e validade (`listClassCredits`);
  - aviso `classes_policy.credit_expiry_notice_days` antes de vencer;
  - créditos vencidos não são usados.

### Implementation for User Story 4

- [ ] T035 [US4] Implementar a definição versionada do pacote (`data-model.md` `catalog_class_package_version.service_ids`, `catalog_class_package_version.price_cents`) e as rotas `/v1/tenant/class-packages` em `services/catalog/src/class-packages/packages.ts`.
- [ ] T036 [US4] Implementar a compra (cobrança com split e nota) e `listClassCredits` em `services/payments/src/balances/class-package-purchase.ts`, mais o aviso de vencimento no `workers` em `services/payments/src/balances/expiry-notice.ts`, com o prazo de `classes_policy.credit_expiry_notice_days`. A venda do pacote é adiantamento, sem nota; a nota sai a cada presença (017).
- [ ] T037 [P] [US4] Implementar a tela de pacotes no painel em `apps/tenant-web/src/routes/classes/packages/` e a tela de saldo de créditos do aluno em `apps/consumer-mobile/src/app/perfil/creditos.tsx`.

**Checkpoint**: o estúdio vende pacotes.

---

## Phase 7: User Story 5 - Plano mensal recorrente (Priority: P2)

**Goal**: plano com limite por período, cobrado no ato e mensalmente no cartão salvo, com split e nota. Régua nos dias 1, 3 e 5 e suspensão no dia 7. Cancelamento no fim do ciclo, fidelidade só se aceita, aviso de 30 dias para mudança de preço e pausa quando o tenant é suspenso.

**Independent Test**: plano "2 por semana, R$ 200": assinar, inscrever-se em 2 (aceito) e numa terceira (recusado), e simular falha de cobrança (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T038 [P] [US5] Teste de contrato de `subscribePlan`, `listMyMemberships` e `membershipAction` em `services/payments/src/memberships/http/memberships.contract.test.ts`.
- [ ] T039 [P] [US5] Teste com relógio simulado em `services/payments/src/memberships/subscriptions/lifecycle.int.test.ts`:
  - cobrança no ato e no mesmo dia todo mês (`data-model.md` `memberships_subscription.anchor_day`), com split e nota (SC-005);
  - o limite conta por semana de segunda a domingo, na data local, ou por ciclo; acima → `classes.plan_limit_reached` (`catalog_class_plan_version.limit_kind`, `catalog_class_plan_version.limit_value`);
  - régua pelos dias da `classes_policy` (valores iniciais 1/3/5 e suspensão no dia 7), com as inscrições já feitas mantidas (REQ-TUR-043); com a política alterada, valem os novos dias;
  - revogar o consentimento do cartão (012) ou em "Meus consentimentos" (022) leva a `cancel_scheduled` sem nova cobrança e avisa o aluno;
  - o cancelamento vale no fim do ciclo, sem cobrança depois (SC-006);
  - a fidelidade só vale com `memberships_subscription.commitment_accepted_at`;
  - o preço novo só vale no ciclo seguinte a 30 dias de aviso (`memberships_subscription.price_change_effective_at`);
  - tenant suspenso → `paused_tenant_suspended`, com aviso aos alunos.

### Implementation for User Story 5

- [ ] T040 [US5] Implementar a definição versionada do plano e as rotas `/v1/tenant/class-plans` em `services/catalog/src/class-plans/plans.ts`, (`data-model.md` `catalog_class_plan_version.name`, `catalog_class_plan_version.service_ids`, `catalog_class_plan_version.monthly_price_cents`, `catalog_class_plan_version.effective_from`), com aviso aos assinantes quando o preço muda, no prazo de `classes_policy.price_change_notice_days`.
- [ ] T041 [US5] Implementar a assinatura (consentimento de cobrança recorrente em `data-model.md` `memberships_subscription.consent_recurring_at`, cartão salvo, fidelidade; `memberships_subscription.consumer_id`, `memberships_subscription.plan_version_id`, `memberships_subscription.saved_card_id`, `memberships_subscription.commitment_until`, `memberships_subscription.current_cycle_start`, `memberships_subscription.pending_price_version_id`) em `services/payments/src/memberships/subscriptions/subscriptions.ts`. Registrar o consentimento no registro central da 022 (tipo `class_plan_recurring`) e consumir `payments.card_consent.revoked.v1` e `privacy.consent.revoke.v1`, levando a assinatura a `cancel_scheduled` sem nova cobrança.
- [ ] T042 [US5] Implementar as cobranças recorrentes idempotentes pelo `PaymentProvider` (split e nota da 017) em `services/payments/src/memberships/charges/charges.ts`, (`data-model.md` `memberships_charge.cycle`, `memberships_charge.payment_id`, `memberships_charge.attempt`, `memberships_charge.outcome`, `memberships_charge.fiscal_invoice_ref`; nota com `source_kind = membership_charge` na 017), e a régua em `services/payments/src/memberships/dunning/dunning.ts`, com os dias lidos da `classes_policy`.
- [ ] T043 [US5] Implementar a contagem de uso por período (`data-model.md` `memberships_subscription.usage_in_period`) em `services/payments/src/memberships/usage-limits/usage.ts`, consultada pela inscrição.
- [ ] T044 [US5] Implementar o consumidor da suspensão do tenant (019) em `services/payments/src/memberships/subscriptions/tenant-suspension.ts` e as rotas `/v1/consumer/memberships*` em `services/payments/src/memberships/http/memberships.ts`.
- [ ] T045 [P] [US5] Implementar a tela de planos no painel em `apps/tenant-web/src/routes/classes/plans/` e a gestão da assinatura pelo aluno em `apps/consumer-mobile/src/app/perfil/assinaturas.tsx` e `apps/consumer-web/src/routes/perfil.assinaturas.tsx`.

**Checkpoint**: receita recorrente do estúdio.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T046 Implementar a comissão por turma pelo contrato da 007, com versão congelada na aula e base `plan_usage` calculada no fechamento do ciclo do aluno (`data-model.md` `classes_group.commission_base`, `classes_group.commission_value`), em `services/workforce/src/commission/class-commission.ts`, entrando no fechamento da 018 (REQ-TUR-050).
- [ ] T047 [P] Teste da comissão em `services/workforce/src/commission/class-commission.int.test.ts`: 40% por presença sobre o preço por aula do pacote (quickstart §6).
- [ ] T048 [P] Caso de isolamento em `tests/isolation/cases/classes.ts`.
- [ ] T049 [P] Testes com a flag `classes.v1` ligada e desligada em `services/scheduling/src/classes/__tests__/flags.int.test.ts`, e axe nas telas em `apps/consumer-web/e2e/classes-a11y.spec.ts`.
- [ ] T050 [P] Painel Grafana "Turmas" (ocupação, faltas, inadimplência de planos, check-ins offline) em `infra/observability/dashboards/classes.json`, e mapas de ingestão do BI em `bi/ingest/mappings/classes.yaml`.
- [ ] T051 Registrar as telas a conferir na DF 9.10 (gestão da assinatura e saldo de créditos) em `docs/design/telas-sem-prototipo-026.md` e o risco de cobrança recorrente sem o cliente presente (PSP da 012) em `docs/ops/decisions/cobranca-recorrente-planos.md`.
- [ ] T052 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-026.md`.
- [ ] T053 [P] Criar a `classes_policy` versionada em `koovela_platform` (migração `services/platform/migrations/0026_classes_policy.ts`, seed dos valores iniciais), a tela no back-office em `apps/admin-web/src/routes/classes-policy/` (Fin/Ops, auditada) e o leitor com cache em `packages/domain/classes/src/policy.ts` (`data-model.md` `classes_policy.retry_days`, `classes_policy.suspend_day`, `classes_policy.checkin_before_min`, `classes_policy.checkin_after_min`, `classes_policy.checkin_bounds`, `classes_policy.credit_expiry_notice_days`, `classes_policy.price_change_notice_days`; CONST 8).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (aulas). Nessa fase só o pagamento avulso fica completo; `credit` e `plan` dependem de US4 e US5.
- **US3** depende de US2.
- **US4** e **US5** dependem da fase 2 e podem correr em paralelo depois de US2.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Fundação: T005, T006, T008 e T009.
- Depois de US2: US3, US4 e US5 em paralelo.

---

## Parallel Example: User Story 2

```bash
Task: "T019 concorrência da última vaga"
Task: "T020 contrato da inscrição"
Task: "T021 formas de pagamento"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fases 1 e 2.
2. US1 (grade), US2 (inscrição avulsa) e US3 (check-in).
3. **Parar e validar** com o quickstart §1, §2 e §4.

### Incremental Delivery

1. US4 (pacotes) → US5 (planos recorrentes).
2. Polish (comissão, isolamento e observabilidade).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-TUR que atende. Campos com restrição citam `data-model.md` e o campo.
- A capacidade é garantida no banco (PK de assento); turma lotada não tem fila de espera.
- Créditos e usos só se movem por lançamentos no livro de saldos da 012.
- Commit por tarefa ou grupo lógico, em branch `026-turmas-planos-checkin`, por PR.
- Análise de 2026-11-27: `classes_policy` versionada (CONST 8; T053 acrescentada); revogação do consentimento recorrente; campos citados; casos de borda; pacotes e planos só pelo Proprietário; retenção pela 022. Nas specs donas: 009 T063 (inscrições em "Meus agendamentos"), 011 T073 (avisos), 017 T048 (nota de aula e de plano), 018 T044 (comissão por aula no fechamento), 022 (ports e consentimento `class_plan_recurring`).
