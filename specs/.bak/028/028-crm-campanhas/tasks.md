---
description: "Lista de tarefas da spec 028 — CRM e campanhas"
---

# Tasks: CRM e campanhas

**Input**: documentos de `specs/028-crm-campanhas/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 027 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- nenhum envio sem consentimento vigente no momento do envio (SC-001);
- menores e atendidos nunca recebem (REQ-CRM-005);
- sem WhatsApp em campanhas (REQ-CRM-021);
- em saúde, nenhum preço, desconto ou promoção (REQ-CRM-028);
- automação dispara uma vez por ciclo (REQ-CRM-051).

**Organization**: por história de usuário. P1: US1 (consentimento), US2 (segmentos) e US3 (campanha). P2: US4 (resultados) e US5 (cota e controle da Gestão). P3: US6 (automações). O caminho de envio pelo `notification` e a migração do opt-in da 014 ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o submódulo `services/engagement/src/crm/{consent,segments,campaigns,content-guard,quota,sending,attribution,automations,health,holder-data,http}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/crm.openapi.yaml` e `packages/contracts/asyncapi/crm-events.asyncapi.yaml` (fonte: `specs/028-crm-campanhas/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - consentimentos do consumidor `self`;
  - descadastro público por token;
  - segmentos e campanhas pelo Proprietário, e pelo Gerente só na própria filial;
  - lista nominal só pelo Proprietário;
  - cota, concessão e revisão pela Gestão, com `audit_category`.

  Declarar as flags `crm.consent` e `crm.campaigns` (esta desligada até haver provedor de volume) em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, consentimento único com migração da 014 e caminho de envio pelo `notification` com checagem no momento do envio.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste do caminho de envio (portão de merge) em `services/notification/src/marketing/__tests__/send-time-consent.int.test.ts`:
  - o `notification` checa `data-model.md` `engagement_marketing_consent.revoked_at` no momento do envio, não só na seleção;
  - menores e atendidos (025) nunca entram;
  - o horário de silêncio é respeitado sem exceção (SC-007);
  - o limite por consumidor (padrão 2 a cada 7 dias) gera `crm_send.state` = `skipped_limit` (SC-005).
- [ ] T005 [P] Teste da migração em `services/scheduling/src/idle/__tests__/consent-migration.int.test.ts`: todo `scheduling_offer_optin` da 014 vira `engagement_marketing_consent` com `data-model.md` `engagement_marketing_consent.origin` = `offer`, e as ofertas de horário ocioso passam a ler o novo consentimento (REQ-CRM-004).

### Implementação da fundação

- [ ] T006 Criar a migração de tenant `services/engagement/migrations/tenant/0028_crm.ts` com:
  - `engagement_marketing_consent`: CHECK em `data-model.md` `engagement_marketing_consent.channel` e `engagement_marketing_consent.origin`;
  - `crm_segment`;
  - `crm_campaign`: CHECK em `crm_campaign.state`, e `crm_campaign.channels` sem `whatsapp`;
  - `crm_send`: CHECK em `crm_send.state` e UNIQUE `(campaign_id, consumer_id, channel)`;
  - `crm_attribution`: CHECK em `crm_attribution.kind`;
  - `crm_automation`: CHECK em `crm_automation.kind`;
  - `crm_automation_fire`: UNIQUE `(automation_id, consumer_id, cycle_key)`;
  - `crm_tenant_health`.
- [ ] T007 [P] Criar a migração `services/billing/migrations/0028_crm_quota.ts` com `data-model.md` `billing_plan_version.crm_quota` e `billing_plan_version.crm_overage_cents` por canal (019).
- [ ] T008 Implementar a migração do opt-in da 014 em três passos (expandir → migrar → contrair) em `services/scheduling/src/idle/consent-migration.ts`, com o contrato de leitura em `services/engagement/src/crm/consent/read-contract.ts`.
- [ ] T009 Implementar no `notification` a categoria `marketing` (checagem de consentimento no envio, silêncio, limite por consumidor configurável pela Gestão e remetente `ofertas@news.koovela.com`) em `services/notification/src/marketing/marketing.ts` (REQ-CRM-022/025).
- [ ] T010 Implementar o despachante em lotes do `crm`, que cria `crm_send` e pede o aviso ao `notification` (o `crm` nunca fala com provedor), em `services/engagement/src/crm/sending/dispatcher.ts`.

**Checkpoint**: só sai mensagem para quem consentiu, no momento do envio.

---

## Phase 3: User Story 1 - Consumidor escolhe receber comunicações de cada estabelecimento (Priority: P1) 🎯 MVP

**Goal**: opt-in por estabelecimento e canal (padrão "sem"), perguntado na Confirmação e gerido no Perfil, registrado na 022. Descadastro sem login com efeito em ≤ 1 min.

**Independent Test**: aceitar só e-mail, conferir que a campanha chega por e-mail e não por SMS, e descadastrar pelo link (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Teste de contrato de `listMarketingConsents`, `setMarketingConsent` e `unsubscribe` em `services/engagement/src/crm/http/consent.contract.test.ts`.
- [ ] T012 [P] [US1] Teste de integração em `services/engagement/src/crm/consent/consent.int.test.ts`:
  - o consentimento grava `data-model.md` `engagement_marketing_consent.text_version`, `engagement_marketing_consent.granted_at`, `engagement_marketing_consent.device` e `engagement_marketing_consent.consent_ref` (022);
  - o descadastro pelo token, sem login, tem efeito em ≤ 1 min (SC-002);
  - a revogação de um canal não afeta os outros.

### Implementation for User Story 1

- [ ] T013 [US1] Implementar o consentimento, a revogação e o espelho no registro central da 022 em `services/engagement/src/crm/consent/consent.ts`, publicando `engagement.marketing_consent.changed`.
- [ ] T014 [US1] Implementar os tokens de descadastro (`jose`, por mensagem e canal) e a rota pública em `services/engagement/src/crm/consent/unsubscribe.ts`, com as rotas do consumidor em `services/engagement/src/crm/http/consent.ts`.
- [ ] T015 [P] [US1] Implementar a pergunta por canal na Confirmação (C12/W14) e a gestão por estabelecimento em Perfil e notificações (C18/W20) em `apps/consumer-mobile/src/app/agendar/confirmacao/consentimento.tsx`, `apps/consumer-mobile/src/app/perfil/notificacoes/estabelecimentos.tsx` e `apps/consumer-web/src/routes/perfil.notificacoes.tsx`, mais a página de descadastro em `apps/consumer-web/src/routes/descadastrar.$token.tsx`.

**Checkpoint**: o consumidor controla o que recebe.

---

## Phase 4: User Story 2 - Montar um segmento de clientes (Priority: P1)

**Goal**: regras sobre a ficha da 020, segmentos sugeridos e editáveis, total e alcançáveis por canal, e lista nominal só para o Proprietário.

**Independent Test**: com 500 consumidores sintéticos, montar "sem atendimento há mais de 60 dias e já fez corte" e conferir as contagens (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T016 [P] [US2] Teste de contrato de `saveSegment` e `previewSegment` em `services/engagement/src/crm/http/segments.contract.test.ts`.
- [ ] T017 [P] [US2] Teste de integração em `services/engagement/src/crm/segments/segments.int.test.ts`:
  - cada regra de `data-model.md` `crm_segment.rules` filtra corretamente sobre `records_consumer_summary`;
  - os alcançáveis por canal contam só consentimento vigente e destino válido;
  - a lista nominal só aparece ao Proprietário;
  - o Gerente fica restrito a `crm_segment.branch_scope`;
  - a prévia de 10 mil leva ≤ 2 s.

### Implementation for User Story 2

- [ ] T018 [US2] Implementar o esquema das regras e o gerador de SQL no schema do tenant em `services/engagement/src/crm/segments/rules.ts` e `services/engagement/src/crm/segments/evaluate.ts`.
- [ ] T019 [US2] Implementar os segmentos sugeridos (`data-model.md` `crm_segment.suggested_key`: sumidos há 60 dias, frequentes, aniversariantes, sem volta após o primeiro) e as rotas em `services/engagement/src/crm/segments/suggested.ts` e `services/engagement/src/crm/http/segments.ts`.
- [ ] T020 [P] [US2] Implementar a tela de segmentos em `apps/tenant-web/src/routes/crm/segments/`.

**Checkpoint**: o negócio sabe a quem pode falar.

---

## Phase 5: User Story 3 - Criar, testar e enviar uma campanha (Priority: P1)

**Goal**: campanha por push, e-mail e SMS com variáveis, oferta pelo link e preço congelado. Prévia, teste e cotação antes do envio. Bloqueio de conteúdo e, em saúde, de preço.

**Independent Test**: campanha de e-mail e push com 15% em corte por 7 dias: teste ao Proprietário, custo estimado e envio (quickstart §3 e §4).

### Tests for User Story 3 ⚠️

- [ ] T021 [P] [US3] Teste de contrato de `saveCampaign`, `sendTest`, `quoteCampaign` e `sendCampaign` em `services/engagement/src/crm/http/campaigns.contract.test.ts`, com WhatsApp → `crm.channel_not_allowed`.
- [ ] T022 [P] [US3] Teste do guarda de conteúdo (portão de merge) em `services/engagement/src/crm/content-guard/guard.test.ts`:
  - termo da lista bloqueado gera `data-model.md` `crm_campaign.blocked_reason`;
  - em saúde, valor monetário, `%`, "desconto", "promoção", "off" ou oferta anexada → `crm.health_price_content`.
- [ ] T023 [P] [US3] Teste de integração em `services/engagement/src/crm/campaigns/campaigns.int.test.ts`:
  - sem `data-model.md` `crm_campaign.overage_confirmed`, envia só até a cota (SC-004);
  - o SMS começa com "Koovela/{negocio}:" e toda mensagem tem descadastro (REQ-CRM-026);
  - a oferta só vale pelo link, dentro de `crm_campaign.offer` `valid_until`, congelada no agendamento com origem `campaign`, e não acumula com resgate de fidelidade (REQ-CRM-027);
  - `crm_campaign.audience_snapshot` é gravado no envio.

### Implementation for User Story 3

- [ ] T024 [US3] Implementar a campanha (rascunho, agendada, cancelada), as variáveis e o template de e-mail em `mjml` em `services/engagement/src/crm/campaigns/campaigns.ts` e `services/engagement/src/crm/campaigns/render.ts`.
- [ ] T025 [US3] Implementar o guarda de conteúdo (lista da Gestão reaproveitada da 016 e detector de preço em saúde) em `services/engagement/src/crm/content-guard/guard.ts`.
- [ ] T026 [US3] Implementar a cotação (alcançáveis, cota e excedente) em `services/engagement/src/crm/quota/quote.ts` e o envio imediato ou agendado em `services/engagement/src/crm/campaigns/send.ts`, publicando `engagement.campaign.changed`.
- [ ] T027 [US3] Implementar o token do link da oferta (`campaign_id`, `consumer_id`, `offer_id`, `exp`) e a aplicação do desconto congelado na 009 em `services/engagement/src/crm/campaigns/offer-link.ts` e `services/scheduling/src/appointments/origin-campaign.ts`.
- [ ] T028 [US3] Implementar as rotas `/v1/tenant/crm/campaigns*` em `services/engagement/src/crm/http/campaigns.ts`.
- [ ] T029 [P] [US3] Implementar a tela de campanhas (criação, prévia por canal, teste e cotação, até 5 min a partir de um segmento sugerido, SC-003) em `apps/tenant-web/src/routes/crm/campaigns/`.

**Checkpoint**: o negócio envia campanhas dentro das regras.

---

## Phase 6: User Story 4 - Resultado da campanha (Priority: P2)

**Goal**: resultado por canal (enviados, entregues, aberturas, cliques, descadastros, agendamentos, atendimentos, receita, descontos e reativações), com atribuição pelo link ou por janela de 7 dias.

**Independent Test**: campanha para 100 consumidores com 10 agendamentos atribuídos; conferir o painel (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T030 [P] [US4] Teste de integração em `services/engagement/src/crm/attribution/attribution.int.test.ts`:
  - o agendamento pelo link é `data-model.md` `crm_attribution.kind` = `link`;
  - recebimento + agendamento em até 7 dias sem outra campanha entre os dois é `window`;
  - `crm_attribution.revenue_cents`, `crm_attribution.discount_cents` e `crm_attribution.reactivation` batem;
  - `campaignResults` traz os números por canal (SC-006).

### Implementation for User Story 4

- [ ] T031 [US4] Implementar o consumidor dos retornos do `notification` (entregue, bounce, abertura por pixel no e-mail, clique, reclamação), que atualiza `crm_send.state`, em `services/engagement/src/crm/sending/feedback.ts`.
- [ ] T032 [US4] Implementar a atribuição (consumindo eventos da 009 e da 012) e `campaignResults` em `services/engagement/src/crm/attribution/attribution.ts`.
- [ ] T033 [P] [US4] Implementar a tela de resultados (em até 2 toques) em `apps/tenant-web/src/routes/crm/campaigns/Results.tsx`.

**Checkpoint**: o negócio vê o retorno de cada campanha.

---

## Phase 7: User Story 5 - Cota, excedente e controle pela Gestão (Priority: P2)

**Goal**: cota e excedente por plano, versionados. Excedente como item de uso na fatura. Uso por tenant e cota extra no back-office. Pausa automática por abuso, com revisão da Gestão e trilha.

**Independent Test**: cota de 1.000 e-mails e 100 SMS; passar da cota e conferir aviso, confirmação e item na fatura (quickstart §3 e §5).

### Tests for User Story 5 ⚠️

- [ ] T034 [P] [US5] Teste de contrato de `tenantQuotaUsage` e `reviewPausedTenant` em `services/engagement/src/crm/http/admin.contract.test.ts`.
- [ ] T035 [P] [US5] Teste de integração em `services/engagement/src/crm/health/health.int.test.ts`:
  - o excedente confirmado gera `engagement.crm_usage.recorded.v1` → item `usage:crm_<canal>` na fatura (019), idempotente;
  - a cota extra por concessão da 021 aumenta o limite do mês;
  - descadastro > 2%, spam ou bounce > 5% → campanha `paused` e `data-model.md` `crm_tenant_health.paused_for_review`, com aviso ao Proprietário e fila da Gestão (REQ-CRM-043);
  - envios, pausas, revisões e concessões vão para a trilha (REQ-CRM-044).

### Implementation for User Story 5

- [ ] T036 [US5] Implementar o consumo da cota e o registro de uso em `services/engagement/src/crm/quota/usage.ts`, e o consumidor de uso na fatura em `services/billing/src/invoices/usage-crm.ts`.
- [ ] T037 [US5] Implementar a saúde do tenant e a pausa automática em `services/engagement/src/crm/health/health.ts`, com a revisão (`data-model.md` `crm_tenant_health.reviewed_by`, `crm_tenant_health.reviewed_at`) integrada à fila da 021.
- [ ] T038 [US5] Implementar as rotas `/v1/admin/crm/*` em `services/engagement/src/crm/http/admin.ts`.
- [ ] T039 [P] [US5] Implementar a tela "Cota de envios do CRM por tenant" e a revisão no back-office em `apps/admin-web/src/routes/crm/`, mais a configuração da cota por plano na tela de planos da 019 em `apps/admin-web/src/routes/billing/plans/CrmQuota.tsx`.

**Checkpoint**: o custo do volume fica coberto e o abuso, contido.

---

## Phase 8: User Story 6 - Automações simples (Priority: P3)

**Goal**: sumido há N dias, aniversário e sem volta N dias após o primeiro atendimento. Cada uma tem texto, canais, oferta e limite mensal, e dispara uma vez por ciclo.

**Independent Test**: ligar "sumidos há 60 dias" e conferir, em dias simulados, uma mensagem por consumidor (quickstart §5).

### Tests for User Story 6 ⚠️

- [ ] T040 [P] [US6] Teste com relógio simulado (portão de merge) em `services/engagement/src/crm/automations/automations.int.test.ts`:
  - rodar duas vezes no mesmo dia dá uma mensagem por consumidor (`crm_automation_fire.cycle_key`; para aniversário, o ano; para sumido, a data do último atendimento);
  - opt-in, silêncio, limite por consumidor e cota são respeitados;
  - `data-model.md` `crm_automation.monthly_limit` é respeitado.

### Implementation for User Story 6

- [ ] T041 [US6] Implementar as automações (`data-model.md` `crm_automation.n_days`, `crm_automation.enabled`) e a tarefa diária no `workers` em `services/engagement/src/crm/automations/automations.ts`, com a rota `saveAutomation` em `services/engagement/src/crm/http/automations.ts`.
- [ ] T042 [P] [US6] Implementar a tela de automações em `apps/tenant-web/src/routes/crm/automations/`.

**Checkpoint**: lembretes automáticos sem excesso.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T043 Implementar o `HolderDataPort` do CRM (consentimentos e histórico de envios) em `services/engagement/src/crm/holder-data/port.ts` e registrá-lo em `packages/contracts/privacy/holder-ports.yaml` (REQ-CRM-061).
- [ ] T044 [P] Teste de privacidade em `services/engagement/src/crm/holder-data/port.int.test.ts` (quickstart §6).
- [ ] T045 [P] Caso de isolamento em `tests/isolation/cases/crm.ts`.
- [ ] T046 [P] Testes com as flags `crm.consent` e `crm.campaigns` ligadas e desligadas em `services/engagement/src/crm/__tests__/flags.int.test.ts`, e axe na tela de campanhas em `apps/tenant-web/e2e/crm-a11y.spec.ts`.
- [ ] T047 [P] Teste de carga (10 mil mensagens em ≤ 15 min, respeitando os limites do provedor) em `tests/load/crm-send.k6.ts`.
- [ ] T048 [P] Painel Grafana "CRM" (entregas, bounces, descadastros, pausas, uso da cota) em `infra/observability/dashboards/crm.json` e mapas de ingestão do BI em `bi/ingest/mappings/crm.yaml`.
- [ ] T049 Registrar as telas a conferir (campanhas e cota) em `docs/design/telas-sem-prototipo-028.md` e a pendência comercial do provedor de e-mail e SMS em volume, com o domínio `news.koovela.com` separado, em `docs/ops/decisions/provedor-envio-volume.md`.
- [ ] T050 Executar o [quickstart.md](./quickstart.md) inteiro em staging com os adaptadores `fake` e registrar em `docs/ops/decisions/validacao-028.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende da fase 2 e pode correr em paralelo com US1.
- **US3** depende de US1 e US2.
- **US4** e **US5** dependem de US3 e podem correr em paralelo.
- **US6** depende de US1, US2 e da cota (T036).
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004, T005 e T007.
- Depois da fase 2: US1 e US2 em paralelo. Depois de US3: US4 e US5 em paralelo.

---

## Parallel Example: User Story 3

```bash
Task: "T021 contrato da campanha"
Task: "T022 guarda de conteúdo"
Task: "T023 cota, oferta e SMS"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1 (consentimento único, que já atende as ofertas de horário ocioso da 014).
3. **Parar e validar** com o quickstart §1. A flag `crm.consent` pode ser ligada antes de `crm.campaigns`.

### Incremental Delivery

1. US2 → US3 (segmentos e campanhas): liga `crm.campaigns` só com o provedor de volume escolhido.
2. US4 → US5 (resultados, cota e controle).
3. US6 → Polish (automações e privacidade).

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → US6 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-CRM que atende. Campos com restrição citam `data-model.md` e o campo.
- O `crm` nunca fala com provedor; todo envio é um pedido de aviso ao `notification` com `category = marketing`.
- Sem WhatsApp em campanhas; em saúde, nada de preço, desconto ou promoção.
- Commit por tarefa ou grupo lógico, em branch `028-crm-campanhas`, por PR.
