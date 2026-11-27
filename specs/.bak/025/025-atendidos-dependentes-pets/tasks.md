---
description: "Lista de tarefas da spec 025 — Atendidos: dependentes e pets"
---

# Tasks: Atendidos — dependentes e pets

**Input**: documentos de `specs/025-atendidos-dependentes-pets/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 024 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- nenhum menor sem consentimento do responsável, com nome e nascimento cifrados (SC-004);
- pet sem campo clínico (SC-006);
- o estabelecimento só recebe o snapshot permitido por tipo (SC-005);
- nenhum evento leva nome ou nascimento de menor.

**Organization**: por história de usuário. P1: US1 (cadastrar), US2 (agendar para quem) e US3 (serviços por atendido e regra de duração). P2: US4 (ficha no estabelecimento). P3: US5 (corresponsáveis). Maioridade, assunção do histórico e privacidade ficam no Polish, porque atravessam as histórias.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o submódulo `services/identity/src/subjects/{registry,guardians,declarations,coming-of-age,claim,holder-data}/` e as pastas `services/catalog/src/{accepted-subjects,duration-rules}/` e `services/scheduling/src/appointments/subject-snapshot/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/subjects.openapi.yaml` e `packages/contracts/asyncapi/subjects-events.asyncapi.yaml` (fonte: `specs/025-atendidos-dependentes-pets/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - titular e corresponsável `self` sobre os próprios atendidos;
  - tipos aceitos e regra de duração pelo Proprietário e pelo Gerente;
  - ficha do atendido conforme a ficha do cliente.

  Declarar a flag `subjects.v1` em `packages/contracts/flags/flags.yaml`.
- [ ] T004 [P] Criar a vertical pet (banho e tosa e adestramento, sem veterinário) na taxonomia em `packages/contracts/catalog/verticals.yaml` e o vocabulário "tutor" e "pet" em `packages/i18n/pt-BR/vertical-pet.json` (REQ-ATD-022).

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, cifragem, schema sem campos clínicos e snapshot congelado.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste do schema em `services/identity/src/subjects/registry/schema.test.ts`: o schema Zod do pet tem `additionalProperties: false`, e "vacinas" ou qualquer campo clínico gera `subject.clinical_fields_not_allowed` (`data-model.md` `service_subject_pet.handling_notes`; SC-006).
- [ ] T006 [P] Teste de cifragem em `services/identity/src/subjects/registry/crypto.int.test.ts`: em menor, `data-model.md` `service_subject.display_name` e `service_subject.birth_date` ficam cifrados no banco (envelope), e em pet e adulto ficam em claro.
- [ ] T007 [P] Teste de contrato dos eventos em `services/identity/src/subjects/__tests__/events.contract.test.ts`: `identity.subject.changed` e `identity.subject_guardian.changed` não levam nome nem nascimento de menor.

### Implementação da fundação

- [ ] T008 Criar a migração `services/identity/migrations/0025_subjects.ts` em `koovela_identity`, com:
  - `service_subject`: CHECK em `data-model.md` `service_subject.kind`, `service_subject.state` e `service_subject.archived_reason`, e `service_subject.phone_e164` só em `adult_dependent`;
  - `service_subject_pet`: CHECK em `service_subject_pet.species`, `service_subject_pet.size` e `service_subject_pet.coat`;
  - `service_subject_guardian`: CHECK em `service_subject_guardian.role`;
  - `service_subject_declaration`: CHECK em `service_subject_declaration.kind`.
- [ ] T009 Criar a migração de tenant `services/scheduling/migrations/tenant/0025_appointment_subject_snapshot.ts` com `appointment_subject_snapshot` (`data-model.md` `appointment_subject_snapshot.birth_date` só preenchido em saúde, `appointment_subject_snapshot.paid_by_consumer_id` obrigatório) e `appointments.subject_id` anulável (NULL = `self`).
- [ ] T010 Implementar o repositório e os schemas em `services/identity/src/subjects/registry/repo.ts` e `services/identity/src/subjects/registry/schemas.ts`, com cifragem por envelope (`packages/platform/crypto`) para menor e o "próprio consumidor" como sujeito implícito `self`, sem linha nova.
- [ ] T011 Implementar a montagem do snapshot por tipo em `services/scheduling/src/appointments/subject-snapshot/snapshot.ts`, com só os campos permitidos e congelado na criação (REQ-ATD-006/031).

**Checkpoint**: cadastro seguro e snapshot mínimo prontos.

---

## Phase 3: User Story 1 - Cadastrar quem eu agendo (Priority: P1) 🎯 MVP

**Goal**: cadastrar menor (com declaração e consentimento específico), adulto dependente (com aviso e recusa pelo próprio adulto) e pet (sem dado clínico), dentro do limite de 10 pessoas e 10 pets.

**Independent Test**: cadastrar um filho de 8 anos, a mãe de 75 e um cachorro, conferir os consentimentos e ver os três na lista (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T012 [P] [US1] Teste de contrato de `listMySubjects`, `createSubject`, `updateSubject`, `archiveSubject` e `refuseDependentLink` em `services/identity/src/subjects/http/subjects.contract.test.ts`.
- [ ] T013 [P] [US1] Teste de integração em `services/identity/src/subjects/registry/registry.int.test.ts`:
  - menor sem declaração → `subject.declaration_required`; com declaração, o consentimento vai ao registro central da 022 (`data-model.md` `service_subject_declaration.consent_ref`, `service_subject_declaration.text_version`; SC-004);
  - adulto com celular recebe SMS com "recusar"; a recusa arquiva com `service_subject.archived_reason` = `refused_by_adult` e avisa o titular (REQ-ATD-003);
  - o 11º pet → `subject.limit_reached` (REQ-ATD-005);
  - mudar o porte não altera agendamentos passados (REQ-ATD-006).

### Implementation for User Story 1

- [ ] T014 [US1] Implementar as declarações (`data-model.md` `service_subject_declaration.declared_at`, `service_subject_declaration.device`, `service_subject_declaration.ip`) e o envio ao registro de consentimentos da 022 em `services/identity/src/subjects/declarations/declarations.ts`.
- [ ] T015 [US1] Implementar o cadastro, a edição, o arquivamento e o limite em `services/identity/src/subjects/registry/registry.ts`, e o link de recusa do adulto por SMS (011) em `services/identity/src/subjects/declarations/refuse-link.ts`.
- [ ] T016 [US1] Implementar as rotas `/v1/consumer/subjects*` e `/v1/public/subject-links/{token}/refuse` em `services/identity/src/subjects/http/subjects.ts`.
- [ ] T017 [P] [US1] Implementar as telas "Para quem eu agendo" e "Cadastro do pet" no app em `apps/consumer-mobile/src/app/perfil/atendidos/`, e a gestão de atendidos na web em `apps/consumer-web/src/routes/perfil.atendidos.tsx`, com o cadastro em até 1 minuto (SC-001), mais a tela nova de recusa do vínculo em `apps/consumer-web/src/routes/vinculo.$token.recusar.tsx`.

**Checkpoint**: o titular cadastra quem ele agenda.

---

## Phase 4: User Story 3 - Estabelecimento configura serviços por atendido e regras de duração (Priority: P1)

**Goal**: tipos de atendido aceitos por serviço (padrão `self`) e regra de duração do pet (base por porte + acréscimo por pelagem) com preço por porte, versionados.

**Independent Test**: configurar o banho com base de 30/45/60/90 e acréscimo de 0/10/20/30 e conferir os valores de 4 pets (US3 da spec).

> Esta fase vem antes da US2 porque o agendamento "para quem" depende do filtro por tipo e da duração calculada.

### Tests for User Story 3 ⚠️

- [ ] T018 [P] [US3] Teste de propriedade em `services/catalog/src/duration-rules/duration.property.test.ts`: para qualquer porte e pelagem, a duração é múltiplo de 5 e ≥ a base do porte, e o arredondamento é para cima (invariante 5; SC-003).
- [ ] T019 [P] [US3] Teste de integração em `services/catalog/src/accepted-subjects/accepted.int.test.ts`:
  - sem configuração, só `self` (`data-model.md` `catalog_service.accepted_subjects`);
  - menor com faixa de idade, adulto e pet por espécie filtram em `listServicesForSubject`;
  - saúde aceita menor e adulto dependente (REQ-ATD-015);
  - nova versão da regra não altera agendamentos já criados.

### Implementation for User Story 3

- [ ] T020 [US3] Criar a migração de tenant `services/catalog/migrations/tenant/0025_subjects.ts` com `catalog_service.accepted_subjects` e `catalog_duration_rule_version` (`data-model.md` `catalog_duration_rule_version.base_by_size`, `catalog_duration_rule_version.extra_by_coat`, `catalog_duration_rule_version.price_by_size_cents`).
- [ ] T021 [US3] Implementar o cálculo de duração e preço em `packages/domain/catalog/src/pet-duration.ts` e a regra versionada em `services/catalog/src/duration-rules/rules.ts`.
- [ ] T022 [US3] Implementar os tipos aceitos e o filtro `listServicesForSubject` (`/v1/public/businesses/{slug}/services`) em `services/catalog/src/accepted-subjects/accepted.ts`.
- [ ] T023 [P] [US3] Incluir, na tela de Serviços (P12), os tipos de atendido e a regra de duração com prévia por porte e pelagem, em `apps/tenant-web/src/routes/catalog/ServiceSubjects.tsx`.

**Checkpoint**: o estabelecimento define quem atende e quanto tempo reserva.

---

## Phase 5: User Story 2 - Agendar para outra pessoa ou para o pet (Priority: P1)

**Goal**: passo "para quem" no fluxo da 009, com cadastro rápido, serviços filtrados, duração do pet antes do hold e preço congelado. Quem agendou paga e acumula pontos, e o pacote do titular pode ser usado pelo atendido. "Para quem" aparece nos agendamentos, avisos e agenda.

**Independent Test**: agendar para o filho no dentista, para a mãe na fisioterapia e para um cão G de pelagem longa no banho e tosa (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T024 [P] [US2] Teste de integração em `services/scheduling/src/appointments/subject-snapshot/booking.int.test.ts`:
  - o hold da 008 usa a duração calculada para o pet (SC-003);
  - o preço por porte é congelado no agendamento;
  - `data-model.md` `appointment_subject_snapshot.paid_by_consumer_id` é quem agendou, e os pontos (015) vão para ele (SC-007);
  - a sessão do pacote do titular (012) é consumida com `subject_id` registrado (PEN-07);
  - o snapshot de menor tem só nome, idade e responsável, com nascimento só em saúde (SC-005).
- [ ] T025 [P] [US2] Teste de ponta a ponta em `apps/consumer-mobile/e2e/book-for-subject.e2e.ts`: o passo "para quem" aparece só para quem tem atendidos, o cadastro rápido não sai do fluxo e não há passo a mais além da escolha (SC-002).

### Implementation for User Story 2

- [ ] T026 [US2] Incluir `subject_id` na criação de agendamento da 009 em `services/scheduling/src/appointments/create.ts`, validando o vínculo do agendador (titular ou corresponsável) pela identidade e chamando a T011 e o cálculo da T021 antes do hold.
- [ ] T027 [US2] Ajustar o pagador e os pontos em `services/payments/src/charges/payer.ts` (012) e `services/loyalty/src/earn/earn.ts` (015), e o consumo de sessão de pacote por atendido em `services/payments/src/packages/consume.ts`.
- [ ] T028 [US2] Incluir "para quem" nos templates de aviso em `services/notification/src/templates/appointment/*.ts` (011) e no payload da agenda em `services/scheduling/src/agenda/views.ts` (REQ-ATD-014).
- [ ] T029 [P] [US2] Implementar o passo "para quem" e o cadastro rápido no app e na web em `apps/consumer-mobile/src/app/agendar/para-quem.tsx` e `apps/consumer-web/src/routes/agendar.para-quem.tsx`, e mostrar o atendido em "Meus agendamentos".

**Checkpoint**: o titular agenda para quem quiser.

---

## Phase 6: User Story 4 - Ficha do pet e do dependente no estabelecimento (Priority: P2)

**Goal**: ficha do pet com cadastro, tutor e histórico no negócio. Ficha do menor só com o mínimo. Anotações (020) ligadas ao atendido, com consentimento do responsável.

**Independent Test**: abrir a ficha de um pet e a de um menor no painel e conferir os campos (quickstart §3).

### Tests for User Story 4 ⚠️

- [ ] T030 [P] [US4] Teste de contrato e permissão de `getSubjectRecord` em `services/scheduling/src/appointments/subject-snapshot/record.contract.test.ts`:
  - o estabelecimento só vê atendidos com agendamento no próprio tenant;
  - o menor nunca leva documentos;
  - a anotação (020) é gravada com `subject_person_id` e exige o consentimento do responsável (REQ-ATD-032).

### Implementation for User Story 4

- [ ] T031 [US4] Implementar a ficha a partir dos snapshots do tenant (último snapshot e histórico no negócio) em `services/scheduling/src/appointments/subject-snapshot/record.ts`, com a rota `/v1/tenant/subjects/{subject_id}`.
- [ ] T032 [US4] Ligar as anotações e os alertas da 020 ao atendido em `services/engagement/src/care-notes/subject-link.ts`.
- [ ] T033 [P] [US4] Implementar a ficha do pet e do dependente (P11) em `apps/tenant-web/src/routes/clients/subject/` e o atendido no detalhe do colaborador (K02/KD2) em `apps/pro-mobile/src/app/agenda/[id]/subject.tsx`.

**Checkpoint**: o estabelecimento atende com o mínimo de dados.

---

## Phase 7: User Story 5 - Compartilhar um dependente ou um pet com outro responsável (Priority: P3)

**Goal**: convite por celular, aceite com OTP e remoção pelo titular. O corresponsável agenda, paga e acumula os pontos dos próprios agendamentos.

**Independent Test**: A convida B para o filho; B aceita, agenda e paga; A vê os agendamentos dos dois (quickstart §4).

### Tests for User Story 5 ⚠️

- [ ] T034 [P] [US5] Teste de integração em `services/identity/src/subjects/guardians/guardians.int.test.ts`:
  - aceite só com OTP (`data-model.md` `service_subject_guardian.accepted_at`);
  - B agenda e paga com pontos próprios;
  - A vê os agendamentos de todos para o atendido;
  - a remoção (`service_subject_guardian.removed_at`) corta o acesso na hora;
  - só o titular (`service_subject_guardian.role` = `holder`) convida e remove.

### Implementation for User Story 5

- [ ] T035 [US5] Implementar convite, aceite e remoção (`inviteCoGuardian`, `acceptCoGuardianInvite`) em `services/identity/src/subjects/guardians/guardians.ts`, com o OTP da 003 e o aviso pela 011.
- [ ] T036 [P] [US5] Implementar a tela nova de convite e aceite de corresponsável em `apps/consumer-mobile/src/app/perfil/atendidos/corresponsaveis.tsx`.

**Checkpoint**: cuidado compartilhado entre responsáveis.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T037 [P] Teste da maioridade com relógio simulado em `services/identity/src/subjects/coming-of-age/coming-of-age.int.test.ts`: aviso 30 dias antes ao titular e ao jovem; aos 18, `minor` → `adult_dependent` (`data-model.md` `service_subject.state`), com nome e nascimento decifrados e regravados como adulto (REQ-ATD-041).
- [ ] T038 Implementar a tarefa diária de maioridade no `workers` em `services/identity/src/subjects/coming-of-age/coming-of-age.ts`.
- [ ] T039 [P] Teste da assunção do histórico em `services/identity/src/subjects/claim/claim.int.test.ts`: com conta própria (`data-model.md` `service_subject.linked_consumer_id`), os agendamentos passam ao novo titular; o antigo titular vê só os passados, sem anotações (REQ-ATD-042).
- [ ] T040 Implementar `claimOwnHistory` em `services/identity/src/subjects/claim/claim.ts`, mais a tela nova de aviso de maioridade em `apps/consumer-mobile/src/app/perfil/atendidos/maioridade.tsx`.
- [ ] T041 Implementar o `HolderDataPort` dos atendidos em `services/identity/src/subjects/holder-data/port.ts`, exercido pelo responsável (menor e pet) ou pelo próprio adulto, e registrá-lo em `packages/contracts/privacy/holder-ports.yaml` (REQ-ATD-043).
- [ ] T042 [P] Teste de privacidade em `services/identity/src/subjects/holder-data/port.int.test.ts`: exportação e eliminação cobrem os atendidos pelo responsável certo (quickstart §5).
- [ ] T043 [P] Caso de isolamento em `tests/isolation/cases/subjects.ts`: o tenant A não lê snapshot nem ficha de atendido do tenant B.
- [ ] T044 [P] Testes com a flag `subjects.v1` ligada e desligada em `services/identity/src/subjects/__tests__/flags.int.test.ts`, e axe nas telas novas em `apps/consumer-web/e2e/subjects-a11y.spec.ts`.
- [ ] T045 [P] Métricas de recusas de vínculo e de maioridade em `services/identity/src/subjects/metrics.ts`, incluídas em `infra/observability/dashboards/identity.json`.
- [ ] T046 Registrar as telas a conferir na DF 9.10 e as telas novas (convite, maioridade, recusa) em `docs/design/telas-sem-prototipo-025.md`, e o texto das declarações de menor e adulto para revisão jurídica em `docs/ops/decisions/declaracoes-atendidos.md`.
- [ ] T047 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-025.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** e **US3** dependem só da fase 2 e podem correr em paralelo.
- **US2** depende de US1 (atendidos) e US3 (filtro e duração).
- **US4** depende de US2 (snapshots).
- **US5** depende de US1. Ela fica mais completa com US2, para agendar e pagar.
- **Polish**: maioridade e assunção do histórico dependem de US1 e US2; o port depende de US1.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Fundação: T005 a T007.
- Depois da fase 2: US1 e US3 em paralelo.

---

## Parallel Example: depois da fundação

```bash
Task: "T012 contrato dos atendidos"
Task: "T013 registro"
Task: "T018 propriedade da duração"
Task: "T019 tipos aceitos"
```

---

## Implementation Strategy

### MVP First (US1 + US3 + US2)

1. Fases 1 e 2.
2. US1 (cadastro) e US3 (configuração), depois US2 (agendar para quem).
3. **Parar e validar** com o quickstart §1 e §2.

### Incremental Delivery

1. US4 (ficha no estabelecimento).
2. US5 (corresponsáveis).
3. Polish (maioridade, privacidade e isolamento).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US3 → US2 → US4 → US5 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-ATD que atende. Campos com restrição citam `data-model.md` e o campo.
- O cadastro fica na identidade global; o tenant só recebe o snapshot do agendamento.
- O texto das declarações precisa de revisão jurídica antes de ligar a flag.
- Commit por tarefa ou grupo lógico, em branch `025-atendidos-dependentes-pets`, por PR.
