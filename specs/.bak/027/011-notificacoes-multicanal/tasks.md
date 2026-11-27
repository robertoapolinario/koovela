---
description: "Lista de tarefas da spec 011 — Notificações multicanal"
---

# Tasks: Notificações multicanal

**Input**: documentos de `specs/011-notificacoes-multicanal/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md). Specs 001 a 010 concluídas. Os adaptadores `SmsProvider` e `EmailSender` já existem desde a 003.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes antes do código. Em cada história, as tarefas de teste vêm primeiro e DEVEM falhar antes da implementação.

**Organization**: por história de usuário (US1–US6). P1: US1, US2, US3. P2: US4, US5, US6. O núcleo de despacho (catálogo, política de canais, idempotência) fica na fundação porque toda história envia avisos.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/notification/`: `package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS`, pastas `src/{catalog,policy,dispatch,reminders,manage-link,preferences,inbox,delivery,usage,templates,http}` e `migrations/`.
- [ ] T002 [P] Criar os pacotes `packages/platform/push/` (Expo Push e Web Push) e `packages/platform/whatsapp/` (`WhatsAppProvider`), e adicionar as dependências fixadas `expo-server-sdk`, `web-push` e `mjml`.
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/notification.openapi.yaml` e `packages/contracts/asyncapi/notification-events.asyncapi.yaml` (fonte: `specs/011-notificacoes-multicanal/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T004 [P] Incluir as ações do domínio em `packages/contracts/rbac/permissions.yaml`, com `audit_category` nas edições de modelo, política e limite pela Gestão. Declarar em `packages/contracts/flags/flags.yaml` as flags `notification.v1` e `notification.whatsapp` (`kill_switch`, desligada).
- [ ] T005 [P] Adicionar ao esquema de `packages/platform/config/` as chaves `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (`secret: true`), `EXPO_ACCESS_TOKEN` (`secret: true`), `WHATSAPP_TOKEN` (`secret: true`) e `MANAGE_LINK_BASE_URL`, e atualizar o `.env.example`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, catálogo, política de canais, despacho idempotente, modelos e registro de entrega.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T006 [P] Teste de idempotência e de eventos fora de ordem em `services/notification/src/dispatch/idempotency.int.test.ts`:
  - o mesmo evento reenviado não duplica o aviso (`data-model.md` `notification_message.idempotency_key`; REQ-NOT-031, SC-004);
  - "confirmado" que chega depois de "cancelado" não é enviado (confere o estado pelo contrato da 009).
- [ ] T007 [P] Teste da política de canais em `services/notification/src/policy/policy.test.ts`:
  - padrão: push se há app → SMS → e-mail verificado → WhatsApp, sempre com a central (REQ-NOT-003);
  - nenhum aviso de agendamento depende só de push;
  - WhatsApp nunca é usado no grupo promocional (REQ-NOT-005).
- [ ] T008 [P] Teste dos modelos em `services/notification/src/templates/privacy.test.ts`:
  - nenhum modelo contém observação, anotação ou dado de saúde;
  - serviço discreto aparece como "seu atendimento em {estabelecimento}";
  - saúde aparece sem preço (REQ-NOT-033, SC-007).

### Implementação da fundação

- [ ] T009 Criar as migrações em `services/notification/migrations/`:
  - `0001_platform.ts` em `koovela_platform`: `notification_type` (CHECK em `data-model.md` `notification_type.group` e `notification_type.recipients`; `notification_type.urgent` e `notification_type.allowed_channels`), `notification_template_version` (UNIQUE `code`+`channel`+`locale`+`version`), `notification_channel_policy` (`data-model.md` `notification_channel_policy.order` e `notification_channel_policy.version`) e `notification_limit` (CHECK em `data-model.md` `notification_limit.scope`);
  - `0002_identity.ts` em `koovela_identity`: `notification_preference`, `notification_destination` (CHECK em `notification_destination.state`), `notification_inbox_item` e `notification_unsubscribe`;
  - `0003_tenant.ts` no schema do tenant: `notification_settings`, `notification_message` (UNIQUE `notification_message.idempotency_key`), `notification_delivery` (CHECK em `notification_delivery.state`), `notification_scheduled_reminder`, `notification_manage_link`, `notification_attendance_confirmation`, `notification_usage_daily` e `notification_outbox`.
- [ ] T010 Semear o catálogo de tipos (confirmação, lembrete, cancelamento, remarcação, troca de profissional, multa e abono, pagamento, avisos à equipe e segurança) e a política padrão em `services/notification/seeds/catalog.ts` (REQ-NOT-030), incluindo o tipo `pre_registered_first_notice`: primeiro aviso a um consumidor pré-cadastrado pela Recepção (003 T091), que apresenta a Koovela, identifica o estabelecimento e oferece o descadastro além do link de gestão (edge case).
- [ ] T011 Implementar os modelos em `services/notification/src/templates/render.ts`:
  - i18n pt-BR com variáveis validadas por Zod;
  - MJML para e-mail;
  - texto curto com limite de caracteres para SMS e WhatsApp;
  - nota do tenant (`data-model.md` `notification_settings.short_note`);
  - serviço discreto pela lista `data-model.md` `notification_settings.discreet_service_ids` (REQ-NOT-032/033).
- [ ] T012 Implementar a política de canais e o despacho em `services/notification/src/{policy/select.ts,dispatch/dispatch.ts}`:
  - seleção do canal pela política e pelas preferências;
  - chave idempotente `(evento, destinatário, canal)`;
  - checagem do estado atual antes de enviar;
  - filas de envio por canal com DLQ;
  - item na central de avisos sempre.
- [ ] T013 [P] Implementar `packages/platform/push/src/{expo,webpush}.ts` (recibos do Expo) e `packages/platform/whatsapp/src/cloud-api.ts` (só modelos de utilidade aprovados, atrás da flag `notification.whatsapp`), cada um com adaptador `fake` para dev e CI.
- [ ] T014 Implementar o registro de entrega e os webhooks dos provedores em `services/notification/src/delivery/{record,webhooks}.ts` (`data-model.md` `notification_delivery.failure_reason`) e a rota `/v1/webhooks/notification/{provider}` em `services/notification/src/http/webhooks.ts`, com assinatura verificada (REQ-NOT-060). Token de push recusado pelo provedor → `notification_destination.state = suspended` com `suspend_reason = invalid_token`, nunca reutilizado, e o próximo canal da política é usado (edge case).
- [ ] T015 Implementar `POST /v1/internal/notifications` (pedido de aviso por outros domínios) em `services/notification/src/http/internal.ts` (REQ-NOT-071).

**Checkpoint**: despacho idempotente com política de canais.

---

## Phase 3: User Story 1 - Consumidor recebe confirmação e lembrete, com ou sem o app (Priority: P1) 🎯 MVP

**Goal**: confirmação e até 3 lembretes por agendamento pelos canais da política, com horário de silêncio, reprogramação, troca de canal quando o push não é entregue e metas de tempo.

**Independent Test**: três consumidores (com app, só celular, só e-mail) recebem a confirmação e o lembrete pelo canal certo (quickstart §1 e §2).

### Tests for User Story 1 ⚠️

- [ ] T016 [P] [US1] Teste de integração em `services/notification/src/reminders/reminders.int.test.ts`:
  - lembretes criados no `confirmed`, reprogramados na remarcação ou troca e cancelados no cancelamento (REQ-NOT-014, SC-003);
  - silêncio de 21h às 8h no fuso da filial antecipa os não urgentes; o lembrete de até 3 h antes ignora o silêncio (`data-model.md` `notification_settings.quiet_start`, `notification_settings.quiet_end`; REQ-NOT-013);
  - agendamento feito com menos de 2 h de antecedência só recebe a confirmação; lembretes que já passaram não são criados (edge case);
  - mudança na política de lembretes do negócio reprograma os lembretes futuros já criados (edge case);
  - troca de número do consumidor (evento da 003) faz os lembretes programados irem para o número novo (edge case).
- [ ] T017 [P] [US1] Teste de troca de canal em `services/notification/src/dispatch/fallback.int.test.ts`: push sem recibo em 10 min passa ao próximo canal (REQ-NOT-006); sem nenhum canal externo, o aviso fica na central (SC-001); token de push recusado é suspenso e não volta a ser usado; consumidor com o app em dois aparelhos recebe o push nos dois, e ler num marca como lido no outro (edge case).
- [ ] T018 [P] [US1] Teste de desempenho em `services/notification/bench/latency.load.ts`: confirmação em ≤ 1 min p95 e lembrete em ≤ 2 min p95 do horário (REQ-NOT-072, SC-002).

### Implementation for User Story 1

- [ ] T019 [US1] Implementar os consumidores de `scheduling.appointment.state_changed` para confirmação, cancelamento, remarcação e troca em `services/notification/src/dispatch/on-appointment.ts`. Com o tenant suspenso, os avisos sobre agendamentos existentes continuam (edge case, com caso de teste).
- [ ] T020 [US1] Implementar os lembretes programados e o *poller* (`FOR UPDATE SKIP LOCKED`, a cada 30 s) em `services/notification/src/reminders/{schedule,poller}.ts`, com até 3 lembretes de 30 min a 72 h (`data-model.md` `notification_settings.reminders`, `notification_scheduled_reminder.index`, `notification_scheduled_reminder.due_at` e `notification_scheduled_reminder.state`; REQ-NOT-010/011). Reprograma os futuros quando a configuração de lembretes muda e consome `identity.consumer.phone_changed.v1` (003) para refazer os destinos.
- [ ] T021 [US1] Implementar `POST /v1/consumer/devices` (registro de push e Web Push) e `GET /v1/consumer/inbox` em `services/notification/src/http/consumer.ts` (`data-model.md` `notification_inbox_item.body` sem dado sensível e `notification_inbox_item.read_at`, que vale para todos os aparelhos).
- [ ] T022 [US1] Implementar `PUT /v1/tenant/notification-settings` em `services/notification/src/http/tenant.ts` e a tela P26 (lembretes, nota e serviços discretos) em `apps/tenant-web/src/routes/settings/notifications/`.
- [ ] T023 [P] [US1] Implementar o registro do push e a central de avisos no app (`apps/consumer-mobile/src/notifications/` e `apps/consumer-mobile/app/(tabs)/avisos.tsx`) e na web (`apps/consumer-web/app/routes/avisos.tsx` e service worker do Web Push).
- [ ] T024 [US1] Marcar no agendamento os lembretes entregues e emitir o evento para o BI medir o não comparecimento com e sem lembrete, em `services/notification/src/delivery/reminder-delivered.ts` (REQ-NOT-064, SC-006).

**Checkpoint**: confirmação e lembretes chegam por pelo menos um canal.

---

## Phase 4: User Story 2 - Gerir o agendamento pelo link da mensagem (Priority: P1)

**Goal**: link de gestão sem login, restrito ao agendamento: confirmar presença sem OTP; remarcar e cancelar com OTP; limite por IP; link universal para o app.

**Independent Test**: abrir o link do SMS sem sessão, confirmar a presença e depois cancelar com OTP (quickstart §3).

### Tests for User Story 2 ⚠️

- [ ] T025 [P] [US2] Teste de contrato de `getManagedAppointment`, `confirmAttendance` e `manageWithOtp` em `services/notification/src/http/manage-link.contract.test.ts`.
- [ ] T026 [P] [US2] Teste de integração em `services/notification/src/manage-link/manage-link.int.test.ts`:
  - token de 128 bits guardado só como hash (`data-model.md` `notification_manage_link.token_hash`);
  - expira 24 h depois do horário (`data-model.md` `notification_manage_link.expires_at`);
  - revogável;
  - link de outro agendamento ou vencido → 404;
  - 50 tentativas por IP → 429;
  - remarcar e cancelar exigem OTP (REQ-NOT-020/021/023).
- [ ] T027 [P] [US2] Teste E2E em `apps/consumer-web/e2e/manage-link.spec.ts`: confirmar, remarcar e cancelar em até 3 toques, sem instalar nada (SC-005), com axe.

### Implementation for User Story 2

- [ ] T028 [US2] Implementar a emissão e a validação do link em `services/notification/src/manage-link/manage-link.ts`, mais o limite por IP no gateway em `services/gateway/src/plugins/manage-link-rate.ts` (`data-model.md` `notification_manage_link.revoked_at` e `notification_manage_link.uses`).
- [ ] T029 [US2] Implementar a confirmação de presença (`data-model.md` `notification_attendance_confirmation.channel`), com o evento `notification.attendance.confirmed.v1` consumido pela agenda da 009, e as ações com OTP pelos fluxos da 003 e os comandos da 009, em `services/notification/src/manage-link/actions.ts` (REQ-NOT-012).
- [ ] T030 [US2] Implementar as rotas `/v1/a/{token}*` em `services/notification/src/http/manage-link.ts`.
- [ ] T031 [P] [US2] Implementar a página do link em `apps/consumer-web/app/routes/a.$token.tsx` (tela nova, sem protótipo) e o deep link no app em `apps/consumer-mobile/app/a/[token].tsx` (REQ-NOT-022).

**Checkpoint**: autosserviço pelo link da mensagem.

---

## Phase 5: User Story 3 - Catálogo de avisos transacionais (Priority: P1)

**Goal**: todo evento do catálogo gera exatamente um aviso por destinatário, com o modelo e os dados certos; agrupamento de não urgentes; modelos mantidos pela Gestão.

**Independent Test**: percorrer o catálogo em ambiente de teste e reenviar um evento sem duplicar (quickstart §4).

### Tests for User Story 3 ⚠️

- [ ] T032 [P] [US3] Teste gerado por tipo do catálogo em `services/notification/src/catalog/catalog-coverage.int.test.ts`: cada tipo gera exatamente um aviso por destinatário e canal, com as variáveis válidas; o primeiro aviso a um pré-cadastrado usa o modelo `pre_registered_first_notice`, com o descadastro.
- [ ] T033 [P] [US3] Teste de agrupamento em `services/notification/src/dispatch/grouping.int.test.ts`: três avisos não urgentes para o mesmo destinatário em menos de 10 min viram um só (REQ-NOT-034).

### Implementation for User Story 3

- [ ] T034 [US3] Implementar os consumidores dos demais eventos do catálogo (multa e abono da 010; pagamento da 012 quando existir) em `services/notification/src/dispatch/on-events.ts`.
- [ ] T035 [US3] Implementar o agrupamento em `services/notification/src/dispatch/grouping.ts`.
- [ ] T036 [US3] Implementar a edição de modelos e da política de canais pela Gestão, versionada e auditada, nas rotas `/v1/admin/notification/*` em `services/notification/src/http/admin.ts` (`data-model.md` `notification_template_version.version`, `notification_template_version.valid_from` e `notification_template_version.variables`, validadas antes de publicar).
- [ ] T037 [P] [US3] Implementar as telas novas do back-office (modelos e política de canais) em `apps/admin-web/src/routes/notifications/`.
- [ ] T064 [US3] Consumir `payments.balance.expiring_soon.v1` (012) e enviar o aviso "Sessões do pacote a vencer" ao consumidor (tipo do catálogo de avisos, não urgente, com o número de sessões restantes e a data), em `services/notification/src/dispatch/on-balance-expiring.ts`, com o tipo incluído no teste gerado T032 (REQ-CAT-046 da 006).
  - Cobre também os créditos de pacote de aulas (`product_kind = class_package`, 026), com o texto "aulas do pacote a vencer" (análise da 026).
- [ ] T066 [US3] Consumir os eventos do fechamento da 018 e enviar os avisos à equipe (push no app do colaborador ou `/pro`, e central de avisos do painel; tipos do catálogo, não urgentes, só com identificadores e valores, sem dado bancário), em `services/notification/src/dispatch/on-settlement.ts`: `payments.settlement_statement.drafted.v1` → colaborador ("Fechamento pronto para conferir", com o prazo); `payments.settlement_dispute.opened.v1` → Proprietário e Gerente da filial; `payments.settlement_dispute.answered.v1` → colaborador; `payments.settlement_statement.payout_overdue.v1` → Proprietário. Tipos incluídos no teste gerado T032 (REQ-FEC-010/011/025 da 018).
- [ ] T067 [US3] Consumir os eventos da cobrança da 019 e avisar o Proprietário (e-mail e central de avisos do painel; push como reforço, nunca sozinho), em `services/notification/src/dispatch/on-billing.ts`: `billing.invoice.pix_sent.v1` (QR e link do Pix), `billing.invoice.issued.v1`, `billing.invoice.paid.v1` (com a nota), `billing.subscription.{past_due,retry_failed,restricted,suspended,end_warning,ended,reactivated,trial_ending,card_expiring}.v1` e `billing.plan_version.approved.v1` com aumento (aviso de 30 dias aos tenants afetados). Avisos de cobrança são transacionais e não contam na cota de SMS/WhatsApp do tenant. Tipos incluídos no teste gerado T032 (REQ-ASS-022/030 da 019).
- [ ] T068 [US3] Consumir `engagement.care_consent.changed` (020) em `services/notification/src/dispatch/on-care-consent.ts`: `requested` → pedido de consentimento ao consumidor (push, central de avisos e SMS/e-mail pela ordem de canais), com link de uso único para a tela de consentimento e nenhum conteúdo de saúde no texto; `revoked` → aviso ao Proprietário e aos profissionais que atendem o cliente (central de avisos e push). Tipos incluídos no teste gerado T032 (REQ-ANO-001/003 da 020).
- [ ] T069 [US3] Consumir os eventos do back-office da 021 em `services/notification/src/dispatch/on-backoffice.ts`: `backoffice.tenant_request.changed` → Proprietário (painel e e-mail) para pedido de documento de KYC, recebedor bloqueado ou desbloqueado e pedido de complemento de chargeback (com o prazo); `backoffice.consumer_block.changed` → consumidor (`blocked` com o motivo genérico e o canal de revisão; `kept` e `unblocked` com a decisão). Tipos incluídos no teste gerado T032 (REQ-BKO-011/012/034/041 da 021).
- [ ] T070 [US3] Consumir `privacy.events` (022) em `services/notification/src/dispatch/on-privacy.ts`: exportação pronta (link com OTP); comprovante de eliminação (montado antes de apagar o contato, enviado por e-mail ou SMS e sem nada guardado depois); pedido de titular ao Proprietário, aviso 3 dias antes do prazo e vencido ao Encarregado; vencimento de retenção 30 dias antes; eliminação do tenant 30 dias antes; nova versão relevante da política aos titulares. Tipos incluídos no teste gerado T032 (REQ-PRI-017/040/051/063 da 022).
- [ ] T071 [US3] Consumir `discovery.events` (024) em `services/notification/src/dispatch/on-discovery.ts`: região aberta → convite ao Proprietário dos negócios publicados da região e aviso aos inscritos no "avise-me"; retirada pela moderação → aviso ao Proprietário com o motivo; pausa automática (despublicado, suspenso, sem horários por 30 dias) → aviso ao Proprietário. Tipos incluídos no teste gerado T032 (REQ-VIT-030/033/041/050 da 024).
- [ ] T072 [US3] Consumir `identity.subject.changed` e `identity.subject_guardian.changed` (025) em `services/notification/src/dispatch/on-subject.ts`: SMS ao adulto dependente com link de recusa do vínculo (sem dado de menor nem de saúde); convite ao corresponsável com link de aceite por OTP; aviso de maioridade 30 dias antes ao titular e ao jovem (se houver celular); aviso ao titular quando o adulto recusa o vínculo ou o atendido assume o próprio histórico. Tipos incluídos no teste gerado T032 (REQ-ATD-003/040/041/042 da 025).
- [ ] T073 [US3] Consumir `scheduling.class_session.changed`, `scheduling.class_enrollment.changed` e os eventos de assinatura do aluno (026) em `services/notification/src/dispatch/on-classes.ts`: aula cancelada ou troca de instrutor → inscritos; inscrição confirmada → aluno, com link do QR; cada etapa da régua e a suspensão do plano → aluno; mudança de preço do plano → assinantes, no prazo da `classes_policy`; plano pausado por suspensão do tenant → aluno; menor → o responsável. Tipos incluídos no teste gerado T032 (REQ-TUR-003/032/043/045/046 da 026).

**Checkpoint**: catálogo completo e mantido pela Gestão.

---

## Phase 6: User Story 4 - Preferências do consumidor (Priority: P2)

**Goal**: canais por grupo, essenciais nunca sem canal, descadastro em um clique sem login e modelo pronto para o opt-in de campanhas da 028.

**Independent Test**: desligar o push de avaliação, manter os lembretes por SMS e conferir (quickstart §5).

### Tests for User Story 4 ⚠️

- [ ] T038 [P] [US4] Teste de contrato de `getMyPreferences`, `setMyPreferences` e `oneClickUnsubscribe` em `services/notification/src/http/preferences.contract.test.ts`.
- [ ] T039 [P] [US4] Teste de integração em `services/notification/src/preferences/preferences.int.test.ts`:
  - essenciais sem canal → recusado; a central é o mínimo (`data-model.md` `notification_preference.channels`; REQ-NOT-040);
  - descadastro por link assinado sem login, com `List-Unsubscribe` no e-mail (`data-model.md` `notification_unsubscribe.group`; REQ-NOT-041);
  - nenhuma promoção sai por esta spec (REQ-NOT-042).

### Implementation for User Story 4

- [ ] T040 [US4] Implementar as preferências e o descadastro em `services/notification/src/preferences/{preferences,unsubscribe}.ts` e as rotas em `services/notification/src/http/preferences.ts`.
- [ ] T041 [P] [US4] Implementar as telas C18 em `apps/consumer-mobile/app/perfil/notificacoes.tsx` e W20 em `apps/consumer-web/app/routes/perfil.notificacoes.tsx`.

**Checkpoint**: o consumidor controla os canais.

---

## Phase 7: User Story 5 - Equipe recebe os avisos da operação (Priority: P2)

**Goal**: push ao colaborador e aviso em tempo real no painel para novo, cancelado, remarcado, troca e presença confirmada; preferências da equipe; resumo diário ao Proprietário.

**Independent Test**: criar e cancelar pelo consumidor e conferir o push no colaborador e o aviso no painel (quickstart §6).

### Tests for User Story 5 ⚠️

- [ ] T042 [P] [US5] Teste de integração em `services/notification/src/dispatch/staff.int.test.ts`:
  - o colaborador do atendimento e a Recepção e o Gerente da filial recebem em ≤ 1 min (REQ-NOT-050/051);
  - os avisos de segurança não podem ser desligados (REQ-NOT-043);
  - o resumo diário só sai se o Proprietário ligou a opção (`data-model.md` `notification_settings.owner_daily_digest`; REQ-NOT-052).

### Implementation for User Story 5

- [ ] T043 [US5] Implementar os avisos à equipe (push no `pro-mobile` e repasse pelo SSE da 009 ao painel) em `services/notification/src/dispatch/staff.ts`.
- [ ] T044 [US5] Implementar o e-mail diário ao Proprietário (job por fuso da filial) em `services/notification/src/dispatch/owner-digest.ts`.
- [ ] T045 [P] [US5] Implementar as preferências da equipe em K05/KD5 (`apps/pro-mobile/app/profile/notifications.tsx`, `apps/tenant-web/src/routes/pro/profile/notifications.tsx`) e o centro de avisos no painel em `apps/tenant-web/src/components/NotificationCenter.tsx`.

**Checkpoint**: a equipe acompanha a operação em tempo real.

---

## Phase 8: User Story 6 - Controle de entrega, custo e limites (Priority: P2)

**Goal**: troca automática de provedor, limites diários de SMS, medição de uso para a fatura (019) com aviso em 80% e suspensão de destino inválido.

**Independent Test**: simular falhas, conferir os estados, a troca de provedor e o painel de custo (quickstart §7).

### Tests for User Story 6 ⚠️

- [ ] T046 [P] [US6] Teste de contrato de `getUsage` em `services/notification/src/http/usage.contract.test.ts`.
- [ ] T047 [P] [US6] Teste de integração em `services/notification/src/delivery/limits.int.test.ts`:
  - falha acima de 10% em 5 min → provedor alternativo e alerta (REQ-NOT-061);
  - limite diário de SMS → não urgentes adiados ou trocados de canal, com alerta (`data-model.md` `notification_limit.daily_max`; REQ-NOT-062, SC-008);
  - 80% da cota → `notification.quota.threshold_reached.v1` (REQ-NOT-063);
  - bounce, spam ou número inválido → destino suspenso com aviso no perfil (`data-model.md` `notification_destination.suspend_reason`; REQ-NOT-065).

### Implementation for User Story 6

- [ ] T048 [US6] Implementar a troca automática de provedor por taxa de falha em `services/notification/src/delivery/provider-failover.ts`.
- [ ] T049 [US6] Implementar os limites e a medição de uso diário por tenant e canal (`data-model.md` `notification_usage_daily.billable`) em `services/notification/src/usage/usage.ts` e a rota `GET /v1/tenant/notification-usage`.
- [ ] T050 [US6] Implementar a suspensão de destinos pelos webhooks em `services/notification/src/delivery/suspend.ts`.
- [ ] T051 [P] [US6] Implementar a tela de limites e custos no back-office em `apps/admin-web/src/routes/notifications/limits/` e o consumo do mês na P26.

**Checkpoint**: entrega observável e custo sob controle.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T052 [P] Registrar os casos de isolamento em `services/notification/src/isolation.cases.ts`: avisos, entregas e links de outro tenant respondem 404 (REQ-NOT-070).
- [ ] T053 [P] Testes com as flags `notification.v1` e `notification.whatsapp` ligadas e desligadas em `services/notification/src/__tests__/flags.int.test.ts`.
- [ ] T054 [P] Painel Grafana "Notificações" em `infra/observability/dashboards/notification.json`, com latência por canal, taxa de entrega, troca de provedor, uso de SMS e da cota de e-mail (alerta em 80% da cota do Resend) e alertas em `infra/observability/alerts/notification.yml`.
- [ ] T055 Registrar a revisão da `[D10]` no registro de decisões em `docs/ops/decisions/d10-politica-canais.md` e as telas sem protótipo (link de gestão, central de avisos, back-office) em `docs/design/telas-sem-prototipo-011.md`.
- [ ] T056 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-011.md`.
- [ ] T065 [P] Implementar a retenção da seção "Dados pessoais" da spec em `services/notification/src/retention/purge.ts` (job diário no `workers`, em lotes): tokens de push inválidos apagados em 30 dias; conteúdo dos avisos (`notification_inbox_item`, `rendered_ref`) apagado em 90 dias; `notification_delivery` em 12 meses; registro de uso do link de gestão em 90 dias após o atendimento. Teste em `services/notification/src/retention/purge.int.test.ts` e métrica de linhas apagadas (CONST IV).
  - Prazos e ação ao vencer lidos da tabela de retenção da 022 (`getRetentionRules`, com cache; categorias registradas em `packages/contracts/privacy/holder-ports.yaml`); os números desta tarefa são só os valores iniciais do seed da 022. O job roda pelo `applyRetention` do `HolderDataPort` do domínio, disparado pela 022 (T040 da 022), e nenhum prazo fica no código (CONST 8; análise da 022, 2026-11-27).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2 e dos eventos da 009.
- **US2** depende de US1 (link nos avisos).
- **US3** depende da fase 2; pode correr em paralelo com US1.
- **US4** depende da fase 2; pode correr em paralelo.
- **US5** depende de US1.
- **US6** depende de US1.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas → alertas.

### Parallel Opportunities

- Setup: T002 a T005.
- Fundação: T006, T007 e T008; T013 em paralelo com T011 e T012.
- Depois da fase 2: US1, US3 e US4 em paralelo; depois de US1, US2, US5 e US6.

---

## Parallel Example: User Story 2

```bash
# Testes primeiro, juntos:
Task: "T025 contrato em services/notification/src/http/manage-link.contract.test.ts"
Task: "T026 integração em services/notification/src/manage-link/manage-link.int.test.ts"
Task: "T027 E2E em apps/consumer-web/e2e/manage-link.spec.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: confirmação e lembretes pelos canais da política.
3. **Parar e validar** com o quickstart §1 e §2.

### Incremental Delivery

1. US1 → US2 → US3 (avisos completos para o consumidor).
2. US4 → US5 (preferências e equipe).
3. US6 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → US6 → Polish.

---

## Notes

- T065 foi acrescentada pelo `/speckit-analyze` de 2026-11-26 (retenção). Decisão de custo do mesmo dia: SMS e WhatsApp transacionais repassados ao tenant (019).
- T064 foi acrescentada pelo `/speckit-analyze` da 006 (2026-11-26); a numeração não foi refeita.
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-NOT que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhum aviso de agendamento depende só de push, e nenhum aviso leva dado sensível.
- WhatsApp fica atrás de flag e nunca é usado para promoção.
- SMS e WhatsApp são pagos pelo tenant; push, Web Push e e-mail ficam em R$ 0 até a cota.
- Commit por tarefa ou grupo lógico, em branch `011-notificacoes-multicanal`, por PR.
- T073 acrescentada na análise da 026 (2026-11-27): avisos de turmas e planos.
- T072 acrescentada na análise da 025 (2026-11-27): avisos dos atendidos.
- T071 acrescentada na análise da 024 (2026-11-27): avisos da vitrine.
- T070 acrescentada na análise da 022 (2026-11-27): avisos de privacidade.
- T069 acrescentada na análise da 021 (2026-11-27): avisos do back-office.
- T066 acrescentada na análise da 018 (2026-11-27): avisos do fechamento à equipe.
- T067 acrescentada na análise da 019 (2026-11-27): avisos da cobrança ao Proprietário.
- T068 acrescentada na análise da 020 (2026-11-27): pedido e revogação do consentimento para anotações.
