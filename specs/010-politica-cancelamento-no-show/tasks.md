---
description: "Lista de tarefas da spec 010 — Política de cancelamento e não comparecimento"
---

# Tasks: Política de cancelamento e não comparecimento

**Input**: documentos de `specs/010-politica-cancelamento-no-show/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 009 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. As propriedades do cálculo são portão de merge.

**Organization**: por história de usuário (US1–US6). P1: US1, US2, US3, US4. P2: US5, US6. O versionamento, base da US6, fica na fundação porque toda política já nasce versionada.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar `services/scheduling/src/policy/` e o pacote puro `packages/domain/policy/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/policy.openapi.yaml` e `packages/contracts/asyncapi/policy-events.asyncapi.yaml` (fonte: `specs/010-politica-cancelamento-no-show/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações da política em `packages/contracts/rbac/permissions.yaml`:
  - configurar: Proprietário e Gerente, conforme a DF 7;
  - abonar: Recepção, Gerente e Proprietário;
  - decidir contestação: equipe da filial.

  Marcar `audit_category` nas mudanças de política e no abono, e declarar a flag `scheduling.policy_v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, avaliação pura, versionamento e formas de multa permitidas.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de propriedade (portão de merge) em `packages/domain/policy/src/evaluate.property.test.ts`:
  - retido + devolvido = sinal pago;
  - multa ≤ preço congelado e nunca negativa;
  - `floor` sobre o mínimo no "a partir de" e sobre o preço do combo;
  - cancelamento pelo estabelecimento nunca gera multa;
  - pacote: a falta consome a sessão;
  - com `fee_form = retain_deposit`, a multa maior que o sinal fica limitada ao valor do sinal;
  - em saúde, a consequência é só reter a taxa de agendamento, sem multa percentual.

  Requisitos: REQ-POL-021/023/024/025/026.
- [ ] T005 [P] Teste do versionamento em `services/scheduling/src/policy/versions.test.ts`: vigência imediata ou futura; a versão congelada nunca muda (`data-model.md` `scheduling_policy_version.valid_from`, `scheduling_policy_version.status`; REQ-POL-010, SC-004).

### Implementação da fundação

- [ ] T006 Criar a migração `services/scheduling/migrations/0201_policy.ts` no schema do tenant, com as tabelas e restrições abaixo (campos de `data-model.md`):
  - `scheduling_policy` (UNIQUE `business_id`);
  - `scheduling_policy_version`, com CHECK em:
    - `scheduling_policy_version.free_cancel_hours`, `scheduling_policy_version.free_reschedule_hours` e `scheduling_policy_version.reschedule_limit`;
    - `scheduling_policy_version.late_cancel_fee_pct`, `scheduling_policy_version.no_show_fee_pct` e `scheduling_policy_version.grace_minutes`;
    - `scheduling_policy_version.fee_form`, `scheduling_policy_version.deposit_kind`, `scheduling_policy_version.deposit_value`, `scheduling_policy_version.deposit_payment_minutes` e `scheduling_policy_version.require_deposit_after_no_shows`;
  - `scheduling_policy_service_deposit_mode` (CHECK em `scheduling_policy_service_deposit_mode.mode`);
  - `scheduling_policy_exception` (CHECK em `scheduling_policy_exception.target_kind` e `scheduling_policy_exception.scope`);
  - `scheduling_policy_acceptance` (append-only; CHECK em `scheduling_policy_acceptance.channel`);
  - `scheduling_policy_fee` (CHECK em `scheduling_policy_fee.kind` e `scheduling_policy_fee.state`);
  - `scheduling_no_show_counter`;
  - `scheduling_policy_dispute` (CHECK em `scheduling_policy_dispute.kind` e `scheduling_policy_dispute.state`; `scheduling_policy_dispute.text` com até 500 caracteres).
- [ ] T007 Implementar `evaluatePolicy(policyVersion, appointment, now, consumerHistory)` em `packages/domain/policy/src/evaluate.ts`, devolvendo `can_cancel`, `can_reschedule`, `reschedules_left`, `consequence` e `deadline_free_at` (research R4).
- [ ] T008 Implementar o versionamento em `services/scheduling/src/policy/versions.ts`, com auditoria (REQ-POL-013) e o evento `scheduling.policy.changed.v1`.
- [ ] T009 [P] Semear `platform_setting.no_show_fee_forms` e a tela do back-office em `apps/admin-web/src/routes/settings/no-show-fee-forms/` (research R2, PEN-13).

**Checkpoint**: a avaliação e as versões testadas.

---

## Phase 3: User Story 1 - Configurar a política do negócio (Priority: P1) 🎯 MVP

**Goal**: política por negócio, partindo do modelo da vertical, com janelas, limites, multas, tolerância, forma de multa permitida, sinal por serviço, exceções, "sinal após N faltas" e prévia do texto com exemplo em reais.

**Independent Test**: configurar 24 h grátis, 50% tardio e 100% falta, e conferir a prévia (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Teste de contrato de `getPolicy`, `savePolicy` e `previewPolicy` em `services/scheduling/src/http/policy.contract.test.ts`.
- [ ] T011 [P] [US1] Teste de integração em `services/scheduling/src/policy/configure.int.test.ts`:
  - modelo da vertical ativo no negócio novo (REQ-POL-002);
  - a forma de multa só aceita as permitidas pelo back-office (REQ-POL-022);
  - sinal por serviço com os 3 modos e prazo limitado pela reserva temporária (`data-model.md` `scheduling_policy_version.deposit_payment_minutes`; REQ-POL-003/004);
  - exceções por serviço e consumidor (REQ-POL-005);
  - em saúde, os modos de sinal são ignorados e vale a taxa de agendamento (research R3); multa percentual e `retain_deposit_and_charge_card` não podem ser escolhidas (REQ-POL-022).
- [ ] T012 [P] [US1] Teste E2E em `apps/tenant-web/e2e/policy.spec.ts`: P19 com prévia, salvamento e axe; tempo de configuração ≤ 3 min a partir do modelo (SC-001).

### Implementation for User Story 1

- [ ] T013 [US1] Semear os modelos por vertical em `services/scheduling/seeds/policy-templates.ts` e criar a política a partir do modelo no evento `tenancy.business.changed` (negócio criado), em `services/scheduling/src/policy/on-business-created.ts`.
- [ ] T014 [US1] Implementar a configuração e as exceções em `services/scheduling/src/policy/configure.ts`, gerando o texto com `data-model.md` `scheduling_policy_version.display_text` e `scheduling_policy_version.display_text_sha256` a partir do modelo renderizado (REQ-POL-007).
- [ ] T015 [US1] Implementar `/v1/tenant/policy` e `/v1/tenant/policy/preview` em `services/scheduling/src/http/policy.ts`.
- [ ] T016 [P] [US1] Implementar a tela P19 (Política de no-show) em `apps/tenant-web/src/routes/policy/`, com exemplo em reais e o texto que o consumidor verá.

**Checkpoint**: política configurada e versionada.

---

## Phase 4: User Story 2 - Consumidor vê e aceita a política antes de agendar (Priority: P1)

**Goal**: o resumo mostra a política com datas e valores calculados; a confirmação registra o aceite com hash; o sinal é exigido conforme o modo; no agendamento manual, aviso e "informei a política".

**Independent Test**: agendar pela web, conferir o texto calculado no resumo, confirmar e verificar o aceite (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T017 [P] [US2] Teste de integração em `services/scheduling/src/policy/acceptance.int.test.ts`:
  - o aceite grava versão, SHA-256 do texto exibido, IP, aparelho e horário (`data-model.md` `scheduling_policy_acceptance.text_sha256`; REQ-POL-011, SC-002);
  - modo `new_or_recent_no_show` exige sinal do consumidor novo ou com falta em 90 dias;
  - "sinal após N faltas" usa o contador (REQ-POL-006);
  - no manual, sem aceite nem `staff_informed`, a forma vira `record_only` (`data-model.md` `scheduling_policy_acceptance.channel`; REQ-POL-012).
- [ ] T018 [P] [US2] Teste E2E em `apps/consumer-web/e2e/policy-summary.spec.ts`: o resumo W11 mostra datas e valores; em saúde, nenhum preço de serviço; axe.

### Implementation for User Story 2

- [ ] T019 [US2] Implementar o resumo calculado (texto com datas e valores) e a exigência de sinal ou taxa de saúde em `services/scheduling/src/policy/summary.ts`, consumido pela confirmação da 009 para decidir `PENDENTE_PAGAMENTO`.
- [ ] T020 [US2] Implementar o registro do aceite na confirmação da 009 e a marcação "informei a política" no agendamento manual em `services/scheduling/src/policy/acceptance.ts`. O aviso do manual leva a política pela 011. Campos de `data-model.md` `scheduling_policy_acceptance.ip` (completo, só aqui, com a retenção do data-model), `scheduling_policy_acceptance.device`, `scheduling_policy_acceptance.accepted_at` (hora do servidor) e `scheduling_policy_acceptance.staff_id` (obrigatório quando `channel = staff_informed`).
- [ ] T021 [P] [US2] Atualizar as telas C08 e W11 (resumo) em `apps/consumer-mobile/app/booking/summary.tsx` e `apps/consumer-web/app/routes/agendar/resumo.tsx`, e o P05 com a caixa "informei a política" em `apps/tenant-web/src/routes/agenda/new/`.

**Checkpoint**: todo agendamento confirmado tem aceite.

---

## Phase 5: User Story 3 - Cancelamento e remarcação seguem a política congelada (Priority: P1)

**Goal**: contrato de consequência usado pela 009 antes de cada ação, a consequência mostrada igual à aplicada, limite de remarcações, bloqueio de cancelamento pelo app fora da janela e evento de horário liberado tarde.

**Independent Test**: cancelar com 30 h (sem multa) e com 3 h (50%), e remarcar além do limite (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T022 [P] [US3] Teste de contrato de `evaluatePolicy` em `services/scheduling/src/http/policy-internal.contract.test.ts`.
- [ ] T023 [P] [US3] Teste de integração em `services/scheduling/src/policy/consequence.int.test.ts`:
  - a consequência exibida antes é igual à aplicada depois (SC-003);
  - `reschedule_limit` é respeitado (`data-model.md` `scheduling_policy_version.reschedule_limit`);
  - com `block_app_cancel_outside_window`, o app não cancela fora da janela (`data-model.md` `scheduling_policy_version.block_app_cancel_outside_window`);
  - a remarcação herda a versão;
  - cancelamento tardio de horário futuro publica `scheduling.policy.slot_freed_late.v1` (REQ-POL-028);
  - filial em `America/Manaus` e data com horário de verão histórico: a data-limite é calculada no fuso da filial e exibida com data e hora exatas (edge case).

### Implementation for User Story 3

- [ ] T024 [US3] Implementar `POST /v1/internal/scheduling/policy/evaluate` em `services/scheduling/src/http/policy-internal.ts` e trocar o stub da 009 pela chamada real em `services/scheduling/src/appointments/{cancel,reschedule}.ts`.
- [ ] T025 [US3] Implementar a aplicação da multa de cancelamento tardio em `services/scheduling/src/policy/fees.ts`:
  - cria `scheduling_policy_fee` com `data-model.md` `scheduling_policy_fee.amount_cents` e `scheduling_policy_fee.form` congelados;
  - `data-model.md` `scheduling_policy_fee.currency` = `BRL`;
  - sem cartão salvo quando a forma exige cobrança no cartão, a multa fica `applied` sem cobrança e conta para `require_deposit_after_no_shows` (edge case);
  - emite `scheduling.policy_fee.changed` para a 012 executar.
- [ ] T026 [US3] Publicar `scheduling.policy.slot_freed_late.v1` em `services/scheduling/src/policy/slot-freed-late.ts`.
- [ ] T027 [P] [US3] Atualizar as telas C13 e W15 para mostrar a consequência vinda do contrato, em `apps/consumer-mobile/app/booking/manage.tsx` e `apps/consumer-web/app/routes/agendamento.$id.gerenciar.tsx`.

**Checkpoint**: ações do consumidor seguem a política congelada.

---

## Phase 6: User Story 4 - Não comparecimento com multa automática e comunicação (Priority: P1)

**Goal**: ao marcar `NO_SHOW`, aplicar a multa ou consumir a sessão, atualizar o contador, avisar o consumidor, e reverter tudo na correção de 48 h.

**Independent Test**: marcar falta com multa de 100% e conferir multa, aviso e contador (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T028 [P] [US4] Teste de integração em `services/scheduling/src/policy/no-show.int.test.ts`:
  - `NO_SHOW` aplica a multa conforme `fee_form`, ou consome a sessão no pacote;
  - o contador sobe e só a equipe do negócio o vê (`data-model.md` `scheduling_no_show_counter.count`; REQ-POL-029);
  - o aviso ao consumidor sai pela 011 em ≤ 5 min (REQ-POL-027, SC-005);
  - a correção reverte multa e contador (REQ-POL-033);
  - consumidor ou serviço isento nunca recebe multa (SC-006);
  - consumidor sem cartão salvo: multa pendente, contada para a regra de sinal;
  - em saúde, a falta só retém a taxa de agendamento.

### Implementation for User Story 4

- [ ] T029 [US4] Implementar o consumidor de `scheduling.appointment.state_changed` (para `NO_SHOW` e a correção) em `services/scheduling/src/policy/on-no-show.ts`, com contador e multa; o contador grava as datas em `data-model.md` `scheduling_no_show_counter.last_dates`, usadas pela regra "falta nos últimos 90 dias" (REQ-POL-003) e por "sinal após N faltas" (REQ-POL-006).
- [ ] T030 [US4] Implementar a consulta do contador para a equipe no detalhe do agendamento em `services/scheduling/src/http/policy.ts`, mais o bloco na P03 em `apps/tenant-web/src/routes/agenda/NoShowInfo.tsx`.

**Checkpoint**: falta tratada de ponta a ponta.

---

## Phase 7: User Story 5 - Abonar e contestar (Priority: P2)

**Goal**: abono com motivo e auditoria; contestação em até 7 dias (multa) ou 48 h ("não fui atendido"); fila da filial; aceite automático em 7 dias; multa suspensa enquanto pendente.

**Independent Test**: abonar pela Recepção e conferir o estorno; contestar pelo app e ver a fila no painel (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T031 [P] [US5] Teste de contrato de `waiveFee`, `listDisputes`, `decideDispute` e `openDispute` em `services/scheduling/src/http/disputes.contract.test.ts`.
- [ ] T032 [P] [US5] Teste de integração em `services/scheduling/src/policy/disputes.int.test.ts`:
  - abono → `waived` com auditoria e evento para estorno (REQ-POL-030);
  - abono e reversão geram aviso ao consumidor pela 011, com valor e motivo (REQ-POL-027);
  - "o estabelecimento não me atendeu" (`kind = not_served`) só até 48 h depois do horário, e impede a multa daquele agendamento (edge case);
  - contestação depois do prazo → `policy.dispute_window_closed`;
  - multa não cobrada fica `suspended` enquanto a contestação está aberta (`data-model.md` `scheduling_policy_fee.state`);
  - sem decisão em 7 dias → `auto_accepted` (`data-model.md` `scheduling_policy_dispute.due_at`, `scheduling_policy_dispute.state`; REQ-POL-031/032, SC-007).

### Implementation for User Story 5

- [ ] T033 [US5] Implementar o abono e a contestação em `services/scheduling/src/policy/disputes.ts` e o job de aceite automático no `workers` em `services/scheduling/src/policy/auto-accept.ts`. Grava `data-model.md` `scheduling_policy_fee.reason`, `scheduling_policy_fee.decided_by` e `scheduling_policy_fee.decided_at` no abono e na reversão, e `scheduling_policy_dispute.response` e `scheduling_policy_dispute.decided_by` na decisão.
- [ ] T034 [US5] Implementar as rotas `/v1/tenant/fees/{id}/waive`, `/v1/tenant/disputes*` e `/v1/consumer/appointments/{id}/disputes` em `services/scheduling/src/http/disputes.ts`.
- [ ] T035 [P] [US5] Implementar as telas novas: "Contestar multa" no app e na web (`apps/consumer-mobile/app/booking/dispute.tsx`, `apps/consumer-web/app/routes/agendamento.$id.contestar.tsx`) e "Fila de contestações" no painel (`apps/tenant-web/src/routes/disputes/`). As duas ainda não têm protótipo.

**Checkpoint**: abono e contestação com prazos.

---

## Phase 8: User Story 6 - Política versionada e transparente (Priority: P2)

**Goal**: versões com vigência imediata ou futura, histórico visível e agendamentos antigos mantendo a versão deles.

**Independent Test**: agendamentos na versão 1, publicar a versão 2 com multa maior e conferir que os antigos mantêm a 1 (quickstart §1 e §3).

### Tests for User Story 6 ⚠️

- [ ] T036 [P] [US6] Teste de integração em `services/scheduling/src/policy/frozen.int.test.ts`: agendamento criado na versão 1 avaliado depois da publicação da versão 2 usa a 1; agendamentos novos usam a 2 (SC-004).

### Implementation for User Story 6

- [ ] T037 [US6] Implementar o histórico de versões com quem e quando mudou em `services/scheduling/src/policy/history.ts`, com a rota em `services/scheduling/src/http/policy.ts`.
- [ ] T038 [P] [US6] Mostrar o histórico e a vigência futura na P19 em `apps/tenant-web/src/routes/policy/History.tsx`.

**Checkpoint**: versões transparentes.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T039 [P] Registrar os casos de isolamento em `services/scheduling/src/policy/isolation.cases.ts`: política, multas, contador e contestações de outro tenant respondem 404, e o contador nunca é visível a outro negócio.
- [ ] T040 [P] Testes com a flag `scheduling.policy_v1` ligada e desligada em `services/scheduling/src/policy/__tests__/flags.int.test.ts`.
- [ ] T041 [P] Métrica e painel em `infra/observability/dashboards/policy.json`: taxa de não comparecimento por tenant com e sem multa ou sinal (SC-008), multas aplicadas, abonadas e contestadas.
- [ ] T042 Registrar as telas sem protótipo (contestar e fila) em `docs/design/telas-sem-prototipo-010.md`.
- [ ] T043 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-010.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 e da 009.
- **US3** depende de US1.
- **US4** depende de US3, porque reusa o fluxo de multa (`fees.ts`).
- **US5** depende de US3 e US4.
- **US6** depende de US1.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004, T005 e T009.
- Depois de US1: US2, US3 e US6 em paralelo; depois US4 e US5.

---

## Parallel Example: User Story 5

```bash
# Testes primeiro, juntos:
Task: "T031 contrato em services/scheduling/src/http/disputes.contract.test.ts"
Task: "T032 integração em services/scheduling/src/policy/disputes.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: política configurada.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US1 → US2 → US3 → US4 (política aplicada de ponta a ponta com a 009).
2. US5 → US6 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → US6 → Polish.

---

## Notes

- Correções do `/speckit-analyze` de 2026-11-26 aplicadas sem tarefa nova. Saúde: só retenção da taxa de agendamento, sem multa percentual (spec alinhada ao PEN-06).
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-POL que atende. Campos com restrição citam `data-model.md` e o campo.
- A execução do dinheiro (reter, cobrar, devolver) é da 012, acionada por eventos. Esta spec decide e registra.
- Em saúde, a taxa de agendamento substitui o sinal e nenhum preço de serviço aparece no texto.
- Commit por tarefa ou grupo lógico, em branch `010-politica-cancelamento-no-show`, por PR.
