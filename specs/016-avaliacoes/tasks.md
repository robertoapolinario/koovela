---
description: "Lista de tarefas da spec 016 — Avaliações"
---

# Tasks: Avaliações

**Input**: documentos de `specs/016-avaliacoes/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 015 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes antes do código. Em cada história, as tarefas de teste vêm primeiro e DEVEM falhar antes da implementação.

**Organization**: por história de usuário (US1–US5). P1: US1, US2 e US3. P2: US4 e US5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/engagement/`, se ainda não existir: `package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS` e as pastas `src/reviews/{submit,publish,screening,replies,reports,projections,antifraud}` e `migrations/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/reviews.openapi.yaml` e `packages/contracts/asyncapi/reviews-events.asyncapi.yaml` (fonte: `specs/016-avaliacoes/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações de avaliação em `packages/contracts/rbac/permissions.yaml`, nestes termos:
  - o consumidor avalia (`self`);
  - respondem o Proprietário, o Gerente da filial e o Colaborador do atendimento;
  - o estabelecimento não tem nenhuma ação de editar ou remover avaliação, e isso é verificado por teste de célula (REQ-AVA-022);
  - a moderação fica com a Gestão (Suporte), com `audit_category`.

  Declarar também a flag `engagement.reviews_v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, eventos sem texto e projeções.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste de contrato dos eventos em `services/engagement/src/reviews/events.contract.test.ts`: nenhum evento `engagement.review.*` contém o comentário ou dados do autor; os eventos levam só identificadores e a nota (REQ-AVA-051).

### Implementação da fundação

- [ ] T005 Criar a migração `services/engagement/migrations/0001_reviews.ts` no schema do tenant, com:
  - `reviews_review`: UNIQUE `appointment_id`; CHECK em `data-model.md` `reviews_review.rating`, `reviews_review.state`, `reviews_review.hold_reason` e `reviews_review.removed_by`; `reviews_review.comment` com até 1.000 caracteres;
  - `reviews_reply`: CHECK em `data-model.md` `reviews_reply.author_role`; `reviews_reply.body` com até 1.000 caracteres;
  - `reviews_report`: CHECK em `data-model.md` `reviews_report.reason` e `reviews_report.state`;
  - `reviews_rating_projection`, `reviews_settings`, `engagement_audit_outbox` e `engagement_outbox`.

  Criar também as migrações globais `koovela_platform.engagement_rating_summary` e `koovela_platform.review_moderation_terms` em `services/engagement/migrations/0002_globals.ts`.
- [ ] T006 Implementar o outbox (`engagement.review.changed`, `engagement.review_reply.posted.v1`, `engagement.review_report.changed`) em `services/engagement/src/reviews/events.ts`.

**Checkpoint**: modelo e eventos prontos.

---

## Phase 3: User Story 1 - Consumidor avalia depois do atendimento (Priority: P1) 🎯 MVP

**Goal**: pedido 2 h depois da conclusão, com lembrete no 3º dia. Nota, marcações e comentário. Uma avaliação por atendimento concluído, dentro do prazo de 14 dias. Edição e remoção pelo consumidor. Série recorrente a cada 5 ocorrências. Pré-cadastro com OTP. Nenhuma recompensa por avaliar.

**Independent Test**: concluir um atendimento, receber o pedido, avaliar com 4 estrelas e conferir no painel (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T007 [P] [US1] Teste de contrato de `createReview`, `editReview` e `removeReview` em `services/engagement/src/reviews/http/consumer.contract.test.ts`.
- [ ] T008 [P] [US1] Teste de integração em `services/engagement/src/reviews/submit/submit.int.test.ts`:
  - agendamento não concluído → `review.not_completed`, e uma segunda avaliação → `review.already_reviewed` (REQ-AVA-001, SC-002);
  - depois de 14 dias → `review.window_closed` (`data-model.md` `reviews_review.editable_until`);
  - marcações válidas (`data-model.md` `reviews_review.tags`);
  - pré-cadastro exige OTP (REQ-AVA-043);
  - em série, o pedido sai a cada 5 ocorrências (REQ-AVA-005);
  - remoção pelo consumidor grava `removed_by = consumer`;
  - nenhum vínculo com a fidelidade (REQ-AVA-042);
  - o agendamento original `REAGENDADO` não pode ser avaliado; só o final concluído (edge case).
- [ ] T009 [P] [US1] Teste E2E em `apps/consumer-web/e2e/review.spec.ts` e RNTL em `apps/consumer-mobile/__tests__/review.test.tsx`: avaliar em até 20 s a partir do pedido (SC-001), com axe.

### Implementation for User Story 1

- [ ] T010 [US1] Implementar o envio, a edição e a remoção em `services/engagement/src/reviews/submit/submit.ts`, gerando `data-model.md` `reviews_review.author_display` ("Nome I.") e `reviews_review.service_month`, copiando do atendimento `reviews_review.branch_id`, `reviews_review.item_id` e `reviews_review.professional_id`, e gravando `reviews_review.edited_at` na edição e `reviews_review.removed_at` na remoção.
- [ ] T011 [US1] Implementar os pedidos (2 h depois da conclusão, lembrete no 3º dia e regra da série), consumindo `scheduling.appointment.state_changed` e enviando pela 011, em `services/engagement/src/reviews/submit/requests.ts` (REQ-AVA-002).
- [ ] T012 [US1] Implementar as rotas `/v1/consumer/appointments/{id}/review` em `services/engagement/src/reviews/http/consumer.ts`.
- [ ] T013 [P] [US1] Implementar a tela de avaliação pós-atendimento C13 em `apps/consumer-mobile/app/review/[appointmentId].tsx` e W15 em `apps/consumer-web/app/routes/avaliar.$appointmentId.tsx`, com o aviso, antes de enviar, de que a avaliação pode ficar pública e de como o nome aparece ("Ana S.").
- [ ] T014 [US1] Adicionar ao `tools/contracts-check/` uma regra que proíbe ligar a fidelidade (015) a eventos de avaliação (REQ-AVA-042).

**Checkpoint**: consumidores avaliam.

---

## Phase 4: User Story 2 - Avaliações visíveis para quem vai agendar (Priority: P1)

**Goal**:
- publicação 48 h depois do envio;
- visibilidade conforme a configuração do negócio;
- saúde sempre privada;
- média de 12 meses com uma casa decimal, só a partir de 5 avaliações;
- autor anonimizado;
- projeções para a página e para a vitrine.

**Independent Test**: com 10 avaliações, conferir a média, a contagem e os comentários na página e no perfil do profissional (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T015 [P] [US2] Teste de contrato de `listPublicReviews` e `getRatingSummaries` em `services/engagement/src/reviews/http/public.contract.test.ts`, incluindo negócio despublicado ou tenant suspenso, que não devolve avaliações (edge case).
- [ ] T016 [P] [US2] Teste de integração em `services/engagement/src/reviews/publish/publish.int.test.ts`:
  - publicação em 48 h, com ou sem resposta (`data-model.md` `reviews_review.publish_at`);
  - com 4 avaliações aparece "novo" e com 5 aparece a média (REQ-AVA-013);
  - a média de 12 meses tem uma casa decimal (`data-model.md` `reviews_rating_projection.sum_12m`, `reviews_rating_projection.count_12m`);
  - `show_reviews_on_page` desligado → nada na página nem na vitrine (`data-model.md` `reviews_settings.show_reviews_on_page`; REQ-AVA-010);
  - saúde → sempre `private` e fora da vitrine (REQ-AVA-011);
  - a projeção aparece em ≤ 5 min (SC-007);
  - nota sem comentário conta na média e não aparece na lista de comentários (edge case);
  - profissional que saiu do negócio deixa de ter avaliações no perfil público dele ali, e elas continuam na média do estabelecimento (edge case).

### Implementation for User Story 2

- [ ] T017 [US2] Implementar a publicação em `services/engagement/src/reviews/publish/publish.ts`, com o job no `workers` que publica as avaliações vencidas.
- [ ] T018 [US2] Implementar as projeções em `services/engagement/src/reviews/projections/`:
  - `reviews_rating_projection` com recálculo incremental e reconstrução noturna, por `data-model.md` `reviews_rating_projection.scope`;
  - consumidor de `workforce.engagement.ended.v1` (007) que tira o profissional da projeção pública dele no negócio;
  - `koovela_platform.engagement_rating_summary`, só com negócios públicos e fora da saúde (`data-model.md` `rating_summary.average_x10`, `rating_summary.scope` e `rating_summary.count_12m`).
- [ ] T019 [US2] Implementar `GET /v1/public/businesses/{slug}/reviews` (≤ 300 ms p95, com cursor) e `GET /v1/internal/ratings` (para a 024) em `services/engagement/src/reviews/http/public.ts` (REQ-AVA-012/015). A lista mostra "editada" quando `reviews_review.edited_at` é posterior à resposta.
- [ ] T020 [P] [US2] Mostrar a média, a contagem e os comentários na página do estabelecimento e na escolha de profissional: C04/C06 em `apps/consumer-mobile/app/business/[slug]/reviews.tsx` e W05 em `apps/consumer-web/app/routes/$slug.avaliacoes.tsx`.

**Checkpoint**: avaliações públicas conforme a regra.

---

## Phase 5: User Story 3 - Estabelecimento acompanha e responde (Priority: P1)

**Goal**: lista de avaliações no painel, avisos de notas baixas, resposta única editável em 24 h e a configuração de mostrar as avaliações na página.

**Independent Test**: receber 2 estrelas, conferir os avisos, responder e ver a resposta na página (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T021 [P] [US3] Teste de contrato de `listTenantReviews`, `replyToReview` e `setReviewSettings` em `services/engagement/src/reviews/http/tenant.contract.test.ts`.
- [ ] T022 [P] [US3] Teste de integração em `services/engagement/src/reviews/replies/replies.int.test.ts`:
  - nota 1 ou 2 avisa o Proprietário, o Gerente da filial e o Colaborador (REQ-AVA-021);
  - a resposta é única, e editar depois de 24 h gera `review.reply_locked` (`data-model.md` `reviews_reply.editable_until`; REQ-AVA-020);
  - a resposta avisa o consumidor;
  - o estabelecimento não consegue editar nem remover avaliações (REQ-AVA-022);
  - avaliação editada depois da resposta mantém a resposta e mostra "editada" (edge case).

### Implementation for User Story 3

- [ ] T023 [US3] Implementar as respostas e os avisos em `services/engagement/src/reviews/replies/replies.ts` (`data-model.md` `reviews_reply.author_id`, exibido publicamente só como "estabelecimento").
- [ ] T024 [US3] Implementar as rotas `/v1/tenant/reviews*` em `services/engagement/src/reviews/http/tenant.ts`, com o escopo da filial.
- [ ] T025 [P] [US3] Implementar a P24 (Avaliações e respostas) em `apps/tenant-web/src/routes/reviews/` e as avaliações próprias com resposta em K05 (`apps/pro-mobile/app/profile/reviews.tsx`).

**Checkpoint**: estabelecimento responde.

---

## Phase 6: User Story 4 - Moderação e denúncia (Priority: P2)

**Goal**:
- triagem automática sem serviço externo, com retenção e aviso;
- denúncia com motivo da lista, mantendo a avaliação visível até a decisão;
- decisão em até 3 dias úteis, registrada e comunicada;
- nota baixa nunca é motivo para remover.

**Independent Test**: enviar uma avaliação com xingamento e telefone e outra legítima denunciada; conferir a retenção e a manutenção (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T026 [P] [US4] Teste de contrato de `reportReview`, `listModerationQueue` e `decideModeration` em `services/engagement/src/reviews/http/moderation.contract.test.ts`.
- [ ] T027 [P] [US4] Teste de integração em `services/engagement/src/reviews/screening/screening.int.test.ts`:
  - celular, e-mail, CPF (com dígito verificador), termos ofensivos e termos de saúde → `held`, com aviso (REQ-AVA-031);
  - a denúncia exige motivo da lista e a avaliação continua visível até a decisão (`data-model.md` `reviews_report.reason`, `reviews_report.due_at`; REQ-AVA-032);
  - denúncia só por nota baixa → rejeitada (SC-005);
  - remoção pela moderação tira a avaliação da média e da página, mas ela continua guardada (REQ-AVA-034);
  - a decisão vai para a trilha e os dois lados são avisados (REQ-AVA-033).

### Implementation for User Story 4

- [ ] T028 [US4] Implementar a triagem em `services/engagement/src/reviews/screening/screening.ts`, usando os termos versionados de `koovela_platform.review_moderation_terms`.
- [ ] T029 [US4] Implementar a denúncia e a decisão de moderação em `services/engagement/src/reviews/reports/reports.ts`, com o SLA de 3 dias úteis e alerta de atraso (SC-004); `data-model.md` `reviews_report.reporter_id`, `reviews_report.moderator_id` e `reviews_report.decision_note` obrigatórios na decisão.
- [ ] T030 [US4] Implementar as rotas `/v1/tenant/reviews/{id}/report` e `/v1/admin/reviews/*` em `services/engagement/src/reviews/http/moderation.ts`.
- [ ] T031 [P] [US4] Implementar a fila de moderação, que é tela nova, em `apps/admin-web/src/routes/moderation/`, a edição dos termos e a denúncia na P24.
- [ ] T032 [US4] Publicar os critérios de moderação nos termos de uso, com a versão nova do documento da 005, em `docs/legal/termos-moderacao-avaliacoes.md` (REQ-AVA-030).

**Checkpoint**: moderação justa e registrada.

---

## Phase 7: User Story 5 - Proteção contra avaliações falsas (Priority: P2)

**Goal**: membro da equipe não avalia o próprio negócio, e um pico de avaliações vindas de agendamentos manuais pagos no local fica retido com alerta.

**Independent Test**: tentar avaliar com conta ligada a um membro da equipe e gerar um pico de 5 estrelas (quickstart §1 e §5).

### Tests for User Story 5 ⚠️

- [ ] T033 [P] [US5] Teste de integração em `services/engagement/src/reviews/antifraud/antifraud.int.test.ts`:
  - pessoa que é membro da equipe do negócio → `review.staff_member` (REQ-AVA-040, SC-006);
  - volume maior que 3 vezes a média diária vindo de agendamentos manuais pagos no local → `held` com `hold_reason = volume_spike` e alerta à Gestão (REQ-AVA-041).

### Implementation for User Story 5

- [ ] T034 [US5] Implementar a checagem de equipe (contratos da 003 e da 007) no envio e a detecção de pico em `services/engagement/src/reviews/antifraud/antifraud.ts`.

**Checkpoint**: avaliações confiáveis.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T035 [P] Registrar os casos de isolamento em `services/engagement/src/reviews/isolation.cases.ts`: avaliações, respostas e denúncias de outro tenant → 404.
- [ ] T036 [P] Testes com a flag `engagement.reviews_v1` ligada e desligada em `services/engagement/src/reviews/__tests__/flags.int.test.ts`.
- [ ] T037 [P] Painel Grafana "Avaliações" em `infra/observability/dashboards/reviews.json`: taxa de avaliação (SC-003), retidas, denúncias e SLA.
- [ ] T038 Registrar a tela de denúncia e a fila de moderação (sem protótipo) em `docs/design/telas-sem-prototipo-016.md`.
- [ ] T039 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-016.md`.
- [ ] T040 [P] Implementar a anonimização na exclusão de conta e a retenção em `services/engagement/src/reviews/privacy/{on-consumer-deactivated,retention}.ts`: o consumidor de `identity.consumer.deactivated.v1` (003) troca `data-model.md` `reviews_review.author_display` por "cliente Koovela" em todas as avaliações do consumidor, nos tenants em que ele avaliou, mantendo a nota na média; o job diário apaga avaliações removidas e denúncias decididas há mais de 5 anos (`reviews_review.removed_at`). Testes em `services/engagement/src/reviews/privacy/privacy.int.test.ts` (edge case "consumidor exclui a conta"; CONST IV).
  - Prazos e ação ao vencer lidos da tabela de retenção da 022 (`getRetentionRules`, com cache; categorias registradas em `packages/contracts/privacy/holder-ports.yaml`); os números desta tarefa são só os valores iniciais do seed da 022. O job roda pelo `applyRetention` do `HolderDataPort` do domínio, disparado pela 022 (T040 da 022), e nenhum prazo fica no código (CONST 8; análise da 022, 2026-11-27).
- [ ] T041 [P] Consumir `backoffice.fraud_action.changed` (021) em `services/reviews/src/moderation/on-fraud-action.ts`: `hold_reviews` põe as avaliações do alvo em `held` (fora da nota e da página); `reverted` e `expired` voltam ao estado anterior. Teste em `services/reviews/src/moderation/on-fraud-action.int.test.ts`.
- [ ] T042 [P] Publicar `engagement.rating_summary.changed.v1` (`branch_id`, `average_x10`, `count_12m`; só negócios públicos e fora da saúde) a cada atualização de `koovela_platform.engagement_rating_summary`, em `services/engagement/src/reviews/projection/rating-summary-events.ts`, para a vitrine (024). Teste: negócio de saúde ou com avaliações desligadas publica nota nula.
- [ ] T043 [P] Criar `reviews_vendor_flag` (`tenant_id`, `business_id`, `reason` = `vendor_cancelled_event`, `source_id`, `created_at`) no `data-model.md` e em `services/engagement/src/reviews/vendor-flags/flags.ts`, alimentada por `quotes.contract.cancelled.v1` com `by = vendor` (035); visível só à Gestão e usada como sinal pelo antifraude da 021; nunca aparece ao consumidor nem altera a nota pública. Teste em `services/engagement/src/reviews/vendor-flags/flags.int.test.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2 e da 009.
- **US2** depende de US1.
- **US3** depende de US1 e pode correr em paralelo com US2.
- **US4** depende de US1.
- **US5** depende de US1.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Depois de US1: US2, US3, US4 e US5 em paralelo.

---

## Parallel Example: User Story 2

```bash
# Testes primeiro, juntos:
Task: "T015 contrato em services/engagement/src/reviews/http/public.contract.test.ts"
Task: "T016 publicação e média em services/engagement/src/reviews/publish/publish.int.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: avaliações recebidas.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US2 → US3 (públicas e respondidas).
2. US4 → US5 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish.

---

## Notes

- T040 foi acrescentada pelo `/speckit-analyze` de 2026-11-27: anonimização na exclusão de conta e retenção de 5 anos.
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-AVA que atende. Campos com restrição citam `data-model.md` e o campo.
- O texto e o autor nunca vão para eventos nem para a vitrine. Em saúde, nada é público.
- O estabelecimento nunca edita nem remove avaliações, e não há recompensa por avaliar.
- Commit por tarefa ou grupo lógico, em branch `016-avaliacoes`, por PR.
- T043 acrescentada na análise da 035 (2026-11-27): marca interna de cancelamento pelo fornecedor.
- T042 acrescentada na análise da 024 (2026-11-27): a nota agregada sai por evento; a tabela passou para `koovela_platform`.
- T041 acrescentada na análise da 021 (2026-11-27): retenção de avaliações pelo antifraude.
