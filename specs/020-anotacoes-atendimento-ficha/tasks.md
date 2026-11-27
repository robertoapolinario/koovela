---
description: "Lista de tarefas da spec 020 — Anotações de atendimento e ficha do consumidor"
---

# Tasks: Anotações de atendimento e ficha do consumidor

**Input**: documentos de `specs/020-anotacoes-atendimento-ficha/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 019 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes antes do código. São portões de merge:
- os testes da matriz por célula, incluindo sessão de suporte;
- a varredura de conteúdo sensível.

**Organization**: por história de usuário (US1–US6). P1: US1, US2, US3, US4. P2: US5, US6. A cifra e a política de acesso ficam na fundação porque toda leitura e escrita depende delas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar as pastas `services/engagement/src/care-notes/{consent,notes,addenda,photos,alerts,access,retention,holder-data}/` e `services/engagement/src/records/{base,record,profile,projection,export}/`, mais a regra do dependency-cruiser que impede qualquer módulo fora de `care-notes` de ler as tabelas `care_*`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/care-records.openapi.yaml` e `packages/contracts/asyncapi/care-records-events.asyncapi.yaml` (fonte: `specs/020-anotacoes-atendimento-ficha/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir em `packages/contracts/rbac/permissions.yaml`:
  - as células `care_note.read_own`, `care_note.read_others`, `care_note.write`, `care_alert.read_content`, `care_alert.read_flag` e `care_note.export`;
  - a liberação `manager.care_note.read` (`allow_if_granted`);
  - Suporte e SRE sempre `deny`, inclusive em sessão de suporte;
  - exportação da base só pelo Proprietário, `sensitive`;
  - `audit_category` em toda leitura de anotação.

  Declarar a flag `engagement.care_notes_v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, cifra por envelope, política de acesso com auditoria e eventos sem conteúdo.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Varredura de segurança (portão de merge) em `services/engagement/src/care-notes/__tests__/no-plaintext.int.test.ts`: o conteúdo de anotação, adendo e alerta nunca aparece em claro no banco, em log, em evento, em notificação, em exportação ou em índice de busca, e não existe índice de texto nas tabelas `care_*`. Campos: `data-model.md` `care_note.body`, `care_note_addendum.body`, `care_alert.body`. Requisitos: REQ-ANO-012/052, SC-004.
- [ ] T005 [P] Teste da política de acesso em `services/engagement/src/care-notes/access/access.test.ts`:
  - "atende o cliente" = agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses (decidido em 2026-11-27); o Colaborador sem nenhum dos dois é negado, e quem atendeu há 13 meses também;
  - vínculo encerrado nunca lê (REQ-ANO-033);
  - Gerente só com a liberação (`data-model.md` `care_settings.branch_manager_can_read`; REQ-ANO-031).

### Implementação da fundação

- [ ] T006 Criar a migração `services/engagement/migrations/0101_care_records.ts` no schema do tenant, com:
  - `care_settings`;
  - `care_consent`: CHECK em `data-model.md` `care_consent.state` e `care_consent.channel`;
  - `care_note`: CHECK em `care_note.state`; `care_note.body` cifrado com até 5.000 caracteres;
  - `care_note_version`, `care_note_addendum`;
  - `care_note_photo`: `care_note_photo.position` de 1 a 5;
  - `care_alert`: CHECK em `care_alert.state`; `care_alert.body` cifrado com até 140 caracteres;
  - `records_consumer_profile`: `records_consumer_profile.operational_note` com até 500 caracteres;
  - `records_consumer_summary`.

  Nenhum índice de texto.
- [ ] T007 Implementar a cifra por envelope com chave por registro, para permitir crypto-shredding (`data-model.md` `care_note.key_ref`), em `services/engagement/src/care-notes/crypto.ts` sobre `packages/platform/crypto`. As fotos são cifradas no servidor antes do Object Storage e servidas por URL assinada de curta duração.
- [ ] T008 Implementar a política de acesso `canReadCareNote` / `canReadAlertContent` em `services/engagement/src/care-notes/access/access.ts`. Ela consulta o `scheduling` com cache de 5 min e a matriz, e grava cada leitura na trilha (`audit.record`), sem conteúdo (REQ-ANO-032).
- [ ] T009 Implementar o outbox (`engagement.care_consent.changed`, `engagement.care_note.changed`, `engagement.care_alert.changed`, `engagement.customer_base.exported.v1`) só com identificadores em `services/engagement/src/care-notes/events.ts`.

**Checkpoint**: dados sensíveis protegidos por construção.

---

## Phase 3: User Story 1 - Consumidor consente com o registro de anotações (Priority: P1) 🎯 MVP

**Goal**: consentimento destacado por negócio, dado só pelo consumidor no próprio aparelho (app, web, link do aviso ou OTP no balcão), com evidência. Sem consentimento, nada é gravado. A revogação bloqueia novas anotações. Anotações ficam ligadas por padrão em saúde e desligadas em beleza.

**Independent Test**: num negócio de saúde, um consumidor aceita e outro recusa; conferir o registro e o bloqueio (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Teste de contrato de `listMyCareConsents`, `decideCareConsent`, `requestCareConsent` e `confirmCounterOtp` em `services/engagement/src/care-notes/http/consent.contract.test.ts`.
- [ ] T011 [P] [US1] Teste de integração em `services/engagement/src/care-notes/consent/consent.int.test.ts`:
  - consentimento registra versão do texto, horário, aparelho e IP (`data-model.md` `care_consent.text_version`, `care_consent.device_fingerprint`, `care_consent.ip`; REQ-ANO-002);
  - OTP enviado ao celular do consumidor, com o balcão só digitando;
  - sem `granted`, anotação e alerta recebem `care.consent_required` (REQ-ANO-003, SC-001);
  - revogação bloqueia novas anotações e avisa o estabelecimento;
  - padrão `notes_enabled` por vertical (`data-model.md` `care_settings.notes_enabled`; REQ-ANO-010);
  - revogar e consentir de novo vale a partir da nova data, com o histórico guardado;
  - novo texto sem ampliação mantém os consentimentos; com `care_consent_text.broadens_use`, pede de novo.

### Implementation for User Story 1

- [ ] T012 [US1] Implementar o consentimento (pedido pela 011 com token de uso único — T068 da 011 —, OTP no balcão, aceite, recusa e revogação) em `services/engagement/src/care-notes/consent/consent.ts`, ligado ao titular (REQ-ANO-050; `data-model.md` `care_consent.holder_consumer_id`, `care_consent.business_id`, `care_consent.granted_at`, `care_consent.revoked_at`). Cada pedido cria um registro novo. Publicação de `care_consent_text` versionado: texto com `care_consent_text.broadens_use` pede novo consentimento a quem já deu.
- [ ] T013 [US1] Implementar as rotas de consentimento do consumidor e do tenant em `services/engagement/src/care-notes/http/consent.ts`.
- [ ] T014 [P] [US1] Implementar a tela de pedido de consentimento (nova) no app e na web, em `apps/consumer-mobile/app/care-consent/[businessId].tsx` e `apps/consumer-web/app/routes/consentimento.$businessId.tsx`, e o pedido por OTP no painel em `apps/tenant-web/src/routes/clients/ConsentRequest.tsx`.

**Checkpoint**: consentimento obrigatório e evidenciado.

---

## Phase 4: User Story 2 - Profissional registra a anotação do atendimento (Priority: P1)

**Goal**: o Colaborador do atendimento escreve em `EM_ATENDIMENTO` ou até 7 dias depois de `CONCLUIDO`, com modelo opcional, até 5 fotos, edição por 24 h com versões e adendos depois. A tela avisa que a anotação não substitui o prontuário. O consumidor lê as próprias anotações.

**Independent Test**: no app do colaborador, anotar com o modelo da vertical e abrir o histórico (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T015 [P] [US2] Teste de contrato de `createCareNote`, `editCareNote`, `addAddendum`, `listConsumerCareNotes` e `listMyCareNotes` em `services/engagement/src/care-notes/http/notes.contract.test.ts`.
- [ ] T016 [P] [US2] Teste de integração em `services/engagement/src/care-notes/notes/notes.int.test.ts`:
  - 8 dias depois da conclusão gera `care.window_closed` (REQ-ANO-011);
  - edição em até 24 h cria versão; depois gera `care.note_closed` e só aceita adendo (`data-model.md` `care_note.editable_until`, `care_note.state`; REQ-ANO-013);
  - até 5 fotos cifradas;
  - o consumidor lê as anotações sobre ele;
  - agendamento cancelado ou com falta recebe `care.appointment_not_eligible`;
  - depois de 7 dias, só adendo à última anotação;
  - combo com o mesmo profissional: uma anotação por agendamento;
  - fotos sem metadados de localização (EXIF removido).
- [ ] T017 [P] [US2] Teste de tempo em `apps/pro-mobile/__tests__/care-note.test.tsx`: anotar em até 2 min (SC-005), com axe.

### Implementation for User Story 2

- [ ] T018 [US2] Implementar notas, versões, adendos e fotos em `services/engagement/src/care-notes/{notes,addenda,photos}/`, com os modelos por vertical versionados (`data-model.md` `care_note.template_id`, `care_settings.template_set_id`; `care_note.subject_person_id`, `care_note.holder_consumer_id`, `care_note.appointment_id`, `care_note.author_professional_id`, `care_note.branch_id`; `care_note_addendum.author_id`, `care_note_addendum.at`; `care_note_photo.object_ref`). As fotos têm o EXIF removido antes da cifra (como na 005).
- [ ] T019 [US2] Implementar as rotas de anotação do tenant e do consumidor em `services/engagement/src/care-notes/http/notes.ts`, com toda leitura passando por `access.ts`.
- [ ] T020 [P] [US2] Implementar a anotação no K02 (`apps/pro-mobile/app/agenda/care-note.tsx`) e no KD2 (`apps/tenant-web/src/routes/pro/agenda/CareNote.tsx`), com o aviso fixo (REQ-ANO-014), e as anotações no histórico do consumidor (`apps/consumer-mobile/app/historico/anotacoes.tsx`).

**Checkpoint**: anotação registrada com segurança.

---

## Phase 5: User Story 3 - Alerta de cuidado visível a quem vai atender (Priority: P1)

**Goal**: alerta de até 140 caracteres, cifrado. Quem tem agendamento com o consumidor vê o conteúdo; a Recepção vê só que existe um alerta. Desativação com histórico.

**Independent Test**: A cria o alerta; B, com agendamento do mesmo consumidor, vê o alerta mas não as anotações de A (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T021 [P] [US3] Teste de contrato de `listCareAlerts`, `createCareAlert` e `deactivateCareAlert` em `services/engagement/src/care-notes/http/alerts.contract.test.ts`.
- [ ] T022 [P] [US3] Teste de integração em `services/engagement/src/care-notes/alerts/alerts.int.test.ts`:
  - profissional com agendamento vê o conteúdo em 100% dos casos (SC-006); profissional sem agendamento nem atendimento em 12 meses não vê;
  - a Recepção vê só `has_alert` (REQ-ANO-021);
  - o autor ou o Proprietário desativa e o histórico é mantido (`data-model.md` `care_alert.deactivated_by`, `care_alert.deactivated_at`; REQ-ANO-022);
  - sem consentimento, não há alerta.

### Implementation for User Story 3

- [ ] T023 [US3] Implementar os alertas (`data-model.md` `care_alert.consumer_id`, `care_alert.author_id`, `care_alert.body`) em `services/engagement/src/care-notes/alerts/alerts.ts` e as rotas em `services/engagement/src/care-notes/http/alerts.ts`.
- [ ] T024 [P] [US3] Mostrar o alerta no atendimento (K02/KD2) e o indicativo "há alerta" na agenda da Recepção (P03), em `apps/tenant-web/src/routes/agenda/CareAlertFlag.tsx`.

**Checkpoint**: alertas no momento do atendimento.

---

## Phase 6: User Story 4 - Acesso segregado e registrado (Priority: P1)

**Goal**: leem só o autor, o consumidor, os profissionais que atendem o cliente (agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses) e o Proprietário; o Gerente lê só se liberado. Recepção, outros colaboradores, Suporte (inclusive em sessão) e SRE nunca leem. Toda leitura é registrada.

**Independent Test**: tentar ler com cada papel e conferir as negações e o registro (quickstart §3).

### Tests for User Story 4 ⚠️

- [ ] T025 [P] [US4] Testes gerados da matriz (portão de merge) em `packages/platform/authz/src/generated/__tests__/care.test.ts`: uma célula por papel, incluindo Suporte e SRE em sessão de suporte (sempre negados) (REQ-ANO-034, SC-002).
- [ ] T026 [P] [US4] Teste de auditoria em `services/engagement/src/care-notes/access/audit.int.test.ts`:
  - 100% das leituras, criações, adendos e exportações geram registro sem conteúdo (SC-003);
  - colaborador com vínculo encerrado perde o acesso.

### Implementation for User Story 4

- [ ] T027 [US4] Implementar a liberação do Gerente pelo Proprietário (`care_settings.branch_manager_can_read`) e a revogação de acesso no fim do vínculo (consumidor de `workforce.professional.changed`) em `services/engagement/src/care-notes/access/grants.ts`.
- [ ] T028 [P] [US4] Acrescentar a opção de liberar o Gerente nas configurações do painel em `apps/tenant-web/src/routes/settings/care-notes/`.

**Checkpoint**: acesso estrito e auditado.

---

## Phase 7: User Story 5 - Ficha do consumidor ou paciente (Priority: P2)

**Goal**: ficha por projeção com histórico, faltas, séries, saldos, pontos, avaliações e indicativo de alerta. Preferências não sensíveis com aviso. Visibilidade conforme o papel.

**Independent Test**: abrir a ficha e conferir cada bloco, e que a Recepção não vê anotações nem dados financeiros que o papel não permite (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T029 [P] [US5] Teste de contrato de `getConsumerRecord` e `updateConsumerProfile` em `services/engagement/src/records/http/record.contract.test.ts`.
- [ ] T030 [P] [US5] Teste de integração em `services/engagement/src/records/projection/projection.int.test.ts`:
  - a projeção é alimentada pelos eventos de 009, 012, 013, 015 e 016 (`data-model.md` `records_consumer_summary.visits_12m`, `records_consumer_summary.spend_12m_cents`, `records_consumer_summary.has_active_alert`);
  - mostra só dados do próprio negócio (REQ-ANO-042);
  - a Recepção não vê anotações e o gasto segue a PEN-03;
  - Recepção e Gerente veem celular e e-mail da filial; o Suporte em sessão vê mascarados;
  - preferências com aviso de não registrar saúde (REQ-ANO-041).

### Implementation for User Story 5

- [ ] T031 [US5] Implementar a projeção `records_consumer_summary` no `workers` em `services/engagement/src/records/projection/projection.ts` (`data-model.md` `records_consumer_summary.last_visit_at`, `records_consumer_summary.no_shows_12m`, `records_consumer_summary.active_series`, `records_consumer_summary.package_balances`, `records_consumer_summary.loyalty_points`, `records_consumer_summary.loyalty_tier`, `records_consumer_summary.reviews_count`, `records_consumer_summary.last_visit_any_branch_at`).
- [ ] T032 [US5] Implementar a ficha e as preferências (`data-model.md` `records_consumer_profile.preferred_name`, `records_consumer_profile.preferred_professional_id`, `records_consumer_profile.tags`) em `services/engagement/src/records/{record,profile}/` e as rotas em `services/engagement/src/records/http/record.ts`.
- [ ] T033 [P] [US5] Implementar a ficha no painel em `apps/tenant-web/src/routes/clients/$consumerId.tsx`, com os blocos por papel.

**Checkpoint**: ficha completa por papel.

---

## Phase 8: User Story 6 - Base de consumidores (Priority: P2)

**Goal**: base com filtros e busca por nome ou celular completo (nunca por texto de anotação), Gerente restrito à própria filial e exportação só pelo Proprietário com reautenticação, sem anotações nem alertas.

**Independent Test**: com 200 consumidores, filtrar e exportar como Proprietário (quickstart §5).

### Tests for User Story 6 ⚠️

- [ ] T034 [P] [US6] Teste de contrato de `listConsumerBase` e `exportConsumerBase` em `services/engagement/src/records/http/base.contract.test.ts`.
- [ ] T035 [P] [US6] Teste de integração e desempenho em `services/engagement/src/records/base/base.int.test.ts`:
  - filtros em ≤ 2 s para 10 mil registros;
  - busca por nome com prefixo ou por celular completo via hash, em ≤ 5 s ponta a ponta (SC-007);
  - exportação: o Gerente é negado; o Proprietário exporta com reautenticação, sem anotações nem alertas, e a ação vai para a trilha (REQ-ANO-044);
  - o Gerente vê só a própria filial (REQ-ANO-045).

### Implementation for User Story 6

- [ ] T036 [US6] Implementar a base, os filtros e a busca em `services/engagement/src/records/base/base.ts`.
- [ ] T037 [US6] Implementar a exportação em `services/engagement/src/records/export/export.ts` e as rotas em `services/engagement/src/records/http/base.ts`.
- [ ] T038 [P] [US6] Implementar a P11 (Clientes) em `apps/tenant-web/src/routes/clients/`.

**Checkpoint**: base consultável e exportável com controle.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T039 [P] Implementar a retenção mensal no `workers` em `services/engagement/src/care-notes/retention/retention.ts` (`[C4]`, CONST IV):
  - quando o último atendimento no negócio passa de 5 anos (ou do prazo maior que o estabelecimento definiu na 022) (`data-model.md` `records_consumer_summary.last_visit_any_branch_at`), abre uma decisão para o Proprietário na fila de retenção da 022: eliminar, ou manter com justificativa e novo prazo;
  - sem resposta em 30 dias (prazo no back-office), faz crypto-shredding da chave (`care_note.key_ref`) e remove as fotos, com registro na trilha;
  - alertas seguem a anotação; consentimentos ficam até 5 anos depois da última anotação ou alerta; a ficha segue a 022;
  - pedido de eliminação do titular continua pela 022 (T040), obrigatório em 15 dias;
  - teste em `services/engagement/src/care-notes/retention/retention.int.test.ts` (REQ-ANO-010).
  - Prazos e ação ao vencer lidos da tabela de retenção da 022 (`getRetentionRules`, com cache; categorias registradas em `packages/contracts/privacy/holder-ports.yaml`); os números desta tarefa são só os valores iniciais do seed da 022. O job roda pelo `applyRetention` do `HolderDataPort` do domínio, disparado pela 022 (T040 da 022), e nenhum prazo fica no código (CONST 8; análise da 022, 2026-11-27).
- [ ] T040 [P] Implementar o `HolderDataPort` (export e erase) para a 022 em `services/engagement/src/care-notes/holder-data/holder-data.ts`, com a rota `/v1/internal/care/holders/{id}/{op}` e o evento `engagement.care_holder_data.done.v1` (REQ-ANO-051).
- [ ] T041 [P] Registrar os casos de isolamento em `services/engagement/src/care-notes/isolation.cases.ts`.
- [ ] T042 [P] Testes com a flag `engagement.care_notes_v1` ligada e desligada em `services/engagement/src/care-notes/__tests__/flags.int.test.ts`.
- [ ] T043 Registrar as telas sem protótipo (pedido de consentimento e anotações no histórico do consumidor) em `docs/design/telas-sem-prototipo-020.md`.
- [ ] T044 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-020.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2 e da 011.
- **US2** depende de US1 (consentimento).
- **US3** depende de US1. Pode correr em paralelo com US2.
- **US4** depende de US2 e US3.
- **US5** depende da fase 2 e dos eventos das specs 009 a 016. Pode correr em paralelo com as outras.
- **US6** depende de US5.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004 e T005.
- Depois de US1: US2 e US3 em paralelo. US5 pode correr junto desde a fase 2.

---

## Parallel Example: User Story 2

```bash
# Testes primeiro, juntos:
Task: "T015 contrato em services/engagement/src/care-notes/http/notes.contract.test.ts"
Task: "T016 integração em services/engagement/src/care-notes/notes/notes.int.test.ts"
Task: "T017 tempo em apps/pro-mobile/__tests__/care-note.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (consentimento) e US2 (anotação).
3. **Parar e validar** com o quickstart §1 e §2.

### Incremental Delivery

1. US3 → US4 (alertas e acesso auditado).
2. US5 → US6 (ficha e base).
3. Polish (retenção e titular).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → US6 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-ANO que atende. Campos com restrição citam `data-model.md` e o campo.
- O conteúdo de anotação e de alerta nunca vai para evento, log, índice ou exportação. Suporte e SRE nunca leem.
- Só o serviço `care-notes` acessa as tabelas `care_*`.
- Commit por tarefa ou grupo lógico, em branch `020-anotacoes-atendimento-ficha`, por PR.
- Análise de 2026-11-27: "atende o cliente" = agendamento futuro confirmado ou atendimento nos últimos 12 meses (opção a), com spec, SC-002 e matriz alinhados; retenção vencida decidida pelo Proprietário (`[C4]`) em T039; `care_consent_text` versionado; campos citados em T012/T018/T023/T031; casos de borda em T011/T016/T022; EXIF removido das fotos. Avisos de consentimento na 011 (T068). Sem tarefas novas nesta spec.
