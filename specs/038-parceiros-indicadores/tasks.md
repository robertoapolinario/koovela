---
description: "Lista de tarefas da spec 038 — Parceiros indicadores"
---

# Tasks: Parceiros indicadores

**Input**: documentos de `specs/038-parceiros-indicadores/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 037 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- um tenant gera no máximo uma atribuição, uma ativação e um pagamento, a um único parceiro (SC-001);
- o livro do parceiro soma zero em cada lançamento, com idempotência por chave;
- nenhuma resposta do portal traz campo além de nome, cidade, data, etapa e prazo (SC-004);
- nenhum pagamento aprovado sem nota conferida (SC-003).

**Organization**: por história de usuário. P1: US1 (cadastro e aprovação), US2 (indicação e convites) e US3 (ativação e pagamento). P2: US4 (funil no portal). O domínio global, a identidade do parceiro e o livro ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US4).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/partners/` (`package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS`, `src/{applications,members,rates,invites,touches,attribution,disputes,activation,ledger,statements,invoices,payouts,materials,portal-view,http}/`, `migrations/`), o app `apps/partner-web/` (React Router 7, rotas `cadastro`, `inicio`, `convidar`, `indicados`, `extratos`, `materiais`, `usuarios`) e as pastas `services/workers/src/partners/{send-batch,expire-activations,close-month,expire-statements,purge-invites}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/partners.openapi.yaml` e `packages/contracts/asyncapi/partners-events.asyncapi.yaml` (fonte: `specs/038-parceiros-indicadores/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - no portal, `admin` convida usuários e envia nota, e `member` indica e vê o funil;
  - aprovação, valor, suspensão e contestações pelo Comercial;
  - mudanças de valor com aprovação do Fin/Ops (004);
  - nota e pagamento pelo Fin/Ops;
  - contestação pelo Proprietário do tenant;
  - tudo com `audit_category`.

  Declarar a flag `partners.v1` em `packages/contracts/flags/flags.yaml`.
- [ ] T004 [P] Publicar `parceiros.koovela.com` pelo Cloudflare Tunnel em `infra/cloudflare/tunnel.yml`, com o app `partner-web` em `infra/compose/apps.yml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas globais, identidade `partner` com 2FA, livro de dupla entrada e valor padrão versionado.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T005 [P] Teste de propriedade do livro (portão de merge) em `services/partners/src/ledger/ledger.property.test.ts`: sequências aleatórias de ativação, estorno, transporte de saldo e pagamento mantêm Σ partidas = 0 por lançamento; a mesma chave (`data-model.md` `partners_ledger_entry.idempotency_key`) não gera um segundo lançamento.
- [ ] T006 [P] Teste de identidade em `services/identity/src/__tests__/partner-kind.int.test.ts`: `kind = partner` exige TOTP ou WebAuthn desde o primeiro acesso; as sessões ficam separadas das de consumidor e de equipe; uma pessoa que também é Proprietário usa a mesma identidade com outro `kind`.

### Implementação da fundação

- [ ] T007 Criar a migração `services/partners/migrations/0001_partners.ts` em `koovela_platform`, com:
  - `partners_partner`: `data-model.md` `partners_partner.cnpj` cifrado com HMAC UNIQUE, CHECK em `partners_partner.kind` e `partners_partner.state`, `partners_partner.bank_account` cifrado e `partners_partner.referral_code` UNIQUE;
  - `partners_member`: CHECK em `partners_member.role`;
  - `partners_rate_default_version` e `partners_rate_version`: `amount_cents` > 0, CHECK em `partners_rate_version.source`;
  - `partners_invite_batch`: CHECK em `partners_invite_batch.state`;
  - `partners_invite`: CHECK em `partners_invite.channel`, `partners_invite.state` e `partners_invite.skip_reason`, com `partners_invite.contact` cifrado;
  - `partners_invite_suppression`, `partners_touch` (CHECK em `partners_touch.source`);
  - `partners_attribution`: UNIQUE `tenant_id` e CHECK em `partners_attribution.state`;
  - `partners_activation`: UNIQUE `tenant_id`, CHECK em `partners_activation.state` e `partners_activation.reverse_reason`;
  - `partners_statement`: UNIQUE `(partner_id, month)` e CHECK em `partners_statement.state`;
  - `partners_statement_invoice`: CHECK em `partners_statement_invoice.state`;
  - `partners_payout`: UNIQUE `statement_id`;
  - `partners_ledger_entry` e `partners_ledger_posting`: CHECK em `partners_ledger_posting.account`;
  - `partners_material` e a projeção `partners_referral_view`.
- [ ] T008 Incluir `kind = partner` na 003, com 2FA obrigatório e sessão própria, em `services/identity/src/kinds/partner.ts`.
- [ ] T009 Implementar o livro de dupla entrada com idempotência em `services/partners/src/ledger/ledger.ts`.
- [ ] T010 Implementar o valor padrão versionado com o `dual_control` da 021 (`kind = partner_rate`; `proposeDefaultRate`, `approveRate`), e a `partners_policy` versionada (`data-model.md` `partners_policy.attribution_window_days`, `partners_policy.activation_window_days`, `partners_policy.reversal_window_days`, `partners_policy.dispute_window_days`, `partners_policy.statement_expiry_months`, `partners_policy.batch_max_rows`, `partners_policy.invite_cooldown_days`; seed dos valores iniciais; tela no back-office em `apps/admin-web/src/routes/partners/Policy.tsx`), em `services/partners/src/rates/rates.ts`. Sem versão vigente, nenhum parceiro é aprovado e não há valor no código.

**Checkpoint**: identidade, livro e valor prontos.

---

## Phase 3: User Story 1 - Cadastrar e aprovar um parceiro (Priority: P1) 🎯 MVP

**Goal**: pedido pelo portal com CNPJ, dados e termos. Aprovação ou recusa com motivo pelo Comercial, definindo o valor (padrão ou contrato). Acesso com 2FA, convite de usuários da empresa e suspensão sem novas atribuições.

**Independent Test**: cadastro com CNPJ de teste, aprovação no back-office e acesso ao portal com link e código (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Teste de contrato de `applyAsPartner`, `getPartnerHome`, `invitePartnerMember`, `listPartners` e `decidePartner` em `services/partners/src/http/partners.contract.test.ts`.
- [ ] T012 [P] [US1] Teste de integração em `services/partners/src/applications/applications.int.test.ts`:
  - CNPJ com dígito inválido ou já cadastrado é recusado, e MEI é aceito;
  - o aceite grava `data-model.md` `partners_partner.terms_version` e `partners_partner.terms_accepted_at`;
  - a recusa exige `partners_partner.reject_reason`;
  - a aprovação gera `partners_partner.referral_code` de 8 caracteres sem caracteres ambíguos e define o valor;
  - a suspensão (`partners_partner.suspend_reason`) impede novas atribuições, e as ativações já conquistadas seguem os termos;
  - o admin convida membros (`partners_member.invited_at`, `partners_member.joined_at`) e o membro não convida.

### Implementation for User Story 1

- [ ] T013 [US1] Implementar o pedido, a aprovação, a recusa, a suspensão e o encerramento em `services/partners/src/applications/applications.ts`, publicando `partners.partner.approved.v1` e `partners.partner.suspended.v1`.
- [ ] T014 [US1] Implementar os usuários do parceiro (convite, aceite com 2FA, remoção, `data-model.md` `partners_member.cpf_hmac`) em `services/partners/src/members/members.ts`.
- [ ] T015 [US1] Implementar as rotas do portal e do admin para o cadastro em `services/partners/src/http/partners.ts`.
- [ ] T016 [P] [US1] Implementar as telas de cadastro, início e usuários do portal em `apps/partner-web/src/routes/cadastro/`, `apps/partner-web/src/routes/inicio/` e `apps/partner-web/src/routes/usuarios/`, e a gestão de pedidos e parceiros no back-office em `apps/admin-web/src/routes/partners/`.

**Checkpoint**: parceiros aprovados com código e link.

---

## Phase 4: User Story 2 - Indicar negócios, sozinhos ou em lote (Priority: P1)

**Goal**: link com cookie de 90 dias e código no onboarding. Lote de até 500 linhas com prévia, declaração de autorização, um convite por contato a cada 90 dias, supressão global e cota de SMS. Atribuição pelo toque válido mais antigo, sem tenant existente nem autoindicação. Contestação pelo Proprietário em 7 dias.

**Independent Test**: lote de 5 convites e dois tenants criados pelos links; conferir a atribuição e o funil (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T017 [P] [US2] Teste de contrato de `referralLanding`, `uploadInviteBatch`, `sendInviteBatch`, `getMyReferral`, `disputeReferral` e `decideDispute` em `services/partners/src/http/referrals.contract.test.ts`.
- [ ] T018 [P] [US2] Teste de convites em `services/partners/src/invites/invites.int.test.ts`:
  - mais de 500 linhas é recusado;
  - repetidos na planilha, contato em `data-model.md` `partners_invite_suppression` e contato já convidado nos últimos 90 dias pelo mesmo parceiro geram `partners_invite.skip_reason`;
  - SMS só para linhas sem e-mail e dentro da cota diária (`sms_cap`);
  - sem `partners_invite_batch.authorization_declaration_version`, o envio é recusado;
  - o descadastro em um clique entra na supressão global;
  - o lote de 100 sai em até 3 minutos (SC-002);
  - `partners_invite.purge_after` apaga o contato em 90 dias, mantendo só o HMAC da supressão.
  - o lote acima de `partners_policy.batch_max_rows` é recusado; convite só por e-mail; com a política alterada, valem os novos limites.
- [ ] T019 [P] [US2] Teste de atribuição (portão de merge) em `services/partners/src/attribution/attribution.int.test.ts`:
  - na criação do tenant, vale o toque válido mais antigo dentro de 90 dias, e os demais ficam em `data-model.md` `partners_attribution.superseded_touches`;
  - tenant que já existia, CNPJ do parceiro ou CPF de um usuário do parceiro → sem atribuição (REQ-PAR-013);
  - parceiro suspenso → sem atribuição;
  - várias filiais contam uma vez, e unidades com CNPJ próprio contam cada uma;
  - uma atribuição por tenant (SC-001);
  - contestação em até `partners_attribution.dispute_until` → `disputed` e fila do Comercial; decisão `valid` ou `voided` com `partners_attribution.decision_reason` e auditoria.
  - sem consentimento de medição, nenhum cookie é gravado e a atribuição vem do token na URL ou do código; `acquisition_channel = partner` gravado na 005.

### Implementation for User Story 2

- [ ] T020 [US2] Implementar a página do link (`koovela.com/p/{code}`), que leva o token de indicação assinado na URL até o cadastro (sem cookie; cookie `kv_ref` só se o visitante aceitar a medição no banner da 024, REQ-VIT-053), com validade de `partners_policy.attribution_window_days`, em `apps/consumer-web/src/routes/p.$code.tsx` e `services/partners/src/touches/touches.ts`.
- [ ] T021 [US2] Implementar a leitura do token da URL (ou do cookie, se consentido), o campo de código no onboarding, a gravação de `tenancy_client_profile.acquisition_channel = partner` e `acquisition_ref` (005), o aviso "indicado por" e o botão de contestação da 005 em `apps/tenant-web/src/routes/onboarding/Referral.tsx` e `services/tenancy/src/onboarding/referral.ts`.
- [ ] T022 [US2] Implementar o lote (upload CSV/XLSX, validação, prévia, declaração), até `partners_policy.batch_max_rows` linhas, o envio só por e-mail pela 011 (de `news.koovela.com`; SMS atrás da flag `partners.sms_invites`, desligada) no `workers` com o modelo de convite e descadastro, e a limpeza no prazo da categoria `partner_invite_contacts` da 022 em `services/partners/src/invites/invites.ts`, `services/workers/src/partners/send-batch/send.ts` e `services/workers/src/partners/purge-invites/purge.ts`.
- [ ] T023 [US2] Implementar a atribuição (consumidor da criação do tenant da 002/005, checagens por HMAC de documento, janela de `partners_policy.attribution_window_days`) e a contestação (prazo de `partners_policy.dispute_window_days`) em `services/partners/src/attribution/attribution.ts` e `services/partners/src/disputes/disputes.ts`, publicando `partners.referral.*.v1`.
- [ ] T024 [P] [US2] Implementar as telas "Convidar" e "Indicados" do portal em `apps/partner-web/src/routes/convidar/` e `apps/partner-web/src/routes/indicados/`, e a fila de contestações no back-office em `apps/admin-web/src/routes/partners/Disputes.tsx`.

**Checkpoint**: indicações atribuídas a quem de fato indicou.

---

## Phase 5: User Story 3 - Ativação e pagamento do parceiro (Priority: P1)

**Goal**: ativação na primeira fatura de ciclo paga em até 90 dias, com valor congelado e exatamente um lançamento. Estorno em até 30 dias desconta no próximo extrato. Extrato mensal, nota fiscal conferida, pagamento registrado e retenção de 12 meses sem nota.

**Independent Test**: levar um tenant atribuído à ativação e conferir o extrato, o fechamento e o pagamento depois da nota (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T025 [P] [US3] Teste de contrato de `listStatements`, `submitStatementInvoice`, `reviewStatementInvoice` e `registerPayout` em `services/partners/src/http/statements.contract.test.ts`.
- [ ] T026 [P] [US3] Teste de ativação (portão de merge) em `services/partners/src/activation/activation.int.test.ts`:
  - só a primeira fatura `kind = cycle` paga, com valor > 0 e `paid_at` ≤ `data-model.md` `partners_activation.deadline_at`, ativa; fatura avulsa (032) e degustação sem cobrança não contam;
  - `partners_activation.amount_cents` fica congelado com `partners_activation.rate_version_id`;
  - o mesmo evento reprocessado gera uma ativação e um lançamento;
  - sem pagamento em 90 dias → `expired`;
  - estorno, reembolso ou crédito integral em até 30 dias → `reversed`, com lançamento negativo no próximo extrato e saldo negativo transportado (`partners_statement.carried_cents`);
  - atribuição anulada depois da ativação → `reversed` com `attribution_voided`;
  - a ativação aparece no portal em até 1 hora (SC-005).
  - ativação e estorno seguem `partners_policy.activation_window_days` e `partners_policy.reversal_window_days`.
- [ ] T027 [P] [US3] Teste de extrato e pagamento (portão de merge) em `services/partners/src/statements/statements.int.test.ts`:
  - o fechamento no 1º dia útil soma `data-model.md` `partners_statement.activations_cents` e `partners_statement.reversals_cents`;
  - a nota passa pela checagem automática (CNPJ do prestador igual ao do parceiro, tomador Koovela, valor igual ao total, nota não cancelada; `partners_statement_invoice.auto_check`) e pela aprovação do Fin/Ops;
  - sem nota `approved`, `registerPayout` é recusado (SC-003);
  - o pagamento grava `partners_payout.receipt_key` e muda o extrato para `paid`;
  - `awaiting_invoice` vira `expired` em `partners_statement.expires_at` (12 meses).
  - o extrato sem nota vence em `partners_policy.statement_expiry_months`.

### Implementation for User Story 3

- [ ] T028 [US3] Implementar a ativação (consumidor de `billing.invoice.changed` da 019), o estorno (eventos de estorno e crédito da 019 e da 012) e o vencimento diário em `services/partners/src/activation/activation.ts` e `services/workers/src/partners/expire-activations/expire.ts`, publicando `partners.activation.*.v1`.
- [ ] T029 [US3] Implementar o fechamento mensal e a expiração de extratos no `workers` em `services/partners/src/statements/statements.ts`, `services/workers/src/partners/close-month/close.ts` e `services/workers/src/partners/expire-statements/expire.ts`, publicando `partners.statement.*.v1`.
- [ ] T030 [US3] Implementar o envio e a conferência da nota (XML NFS-e no padrão nacional pelo leitor da 017, PDF, aprovação ou recusa) em `services/partners/src/invoices/invoices.ts`, e o registro do pagamento com comprovante e lançamento `partner_payable` → `cash_bank` em `services/partners/src/payouts/payouts.ts`.
- [ ] T031 [US3] Implementar as rotas de extrato, nota e pagamento em `services/partners/src/http/statements.ts`.
- [ ] T032 [P] [US3] Implementar a tela "Extratos" (com envio da nota) no portal em `apps/partner-web/src/routes/extratos/`, e a conferência de notas e o registro de pagamentos no back-office em `apps/admin-web/src/routes/partners/Statements.tsx`.

**Checkpoint**: o parceiro recebe, com nota, uma vez por tenant ativado.

---

## Phase 6: User Story 4 - Acompanhar o funil no portal (Priority: P2)

**Goal**: funil por mês (convidados, cadastrados, ativados, pagos), lista de indicados com o mínimo, extrato e materiais de divulgação.

**Independent Test**: com dados sintéticos, conferir o funil e o extrato no portal (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T033 [P] [US4] Teste de contrato e isolamento (portão de merge) em `services/partners/src/portal-view/portal-view.contract.test.ts`:
  - nenhuma resposta do portal traz campo fora de `data-model.md` `partners_referral_view.business_name`, `partners_referral_view.city`, `partners_referral_view.signed_up_at`, `partners_referral_view.stage` e `partners_referral_view.days_left`;
  - `partners_referral_view.tenant_id` nunca é exposto;
  - o portal não chama domínios de tenant;
  - um parceiro não vê indicados de outro (SC-004).

### Implementation for User Story 4

- [ ] T034 [US4] Implementar a projeção `partners_referral_view`, o funil mensal (`listReferrals`) e os materiais aprovados pelo Comercial, baixados por URL assinada (`listMaterials`, `data-model.md` `partners_material.approved_by`, `partners_material.retired_at`), em `services/partners/src/portal-view/portal-view.ts` e `services/partners/src/materials/materials.ts`.
- [ ] T035 [P] [US4] Implementar o painel do funil e a tela "Materiais" do portal em `apps/partner-web/src/routes/inicio/Funnel.tsx` e `apps/partner-web/src/routes/materiais/`.

**Checkpoint**: o parceiro acompanha o próprio resultado.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T036 [P] Implementar no back-office as métricas por parceiro e no total (indicados, ativados, taxa de ativação, custo por tenant ativado) em `apps/admin-web/src/routes/partners/Metrics.tsx`, e os mapas de ingestão do BI, com o custo entrando no CAC do canal "parceiros" (023), em `bi/ingest/mappings/partners.yaml` (REQ-PAR-042).
- [ ] T037 Implementar o `HolderDataPort` (022) para os usuários do parceiro, com retenção enquanto a parceria existir e por mais 5 anos, em `services/partners/src/holder-data/port.ts`, registrado em `packages/contracts/privacy/holder-ports.yaml`, com `applyRetention` para as categorias `partner_members` (parceria + 5 anos), `partner_invite_contacts` (90 dias) e `invite_suppression` (sem prazo, só o HMAC), prazos lidos da tabela da 022. Registrar na trilha toda leitura de dados bancários pelo Fin/Ops.
- [ ] T038 [P] Testes com a flag `partners.v1` ligada e desligada em `services/partners/src/__tests__/flags.int.test.ts`, e axe no portal em `apps/partner-web/e2e/partners-a11y.spec.ts`.
- [ ] T039 [P] Painel Grafana "Parceiros" (convites enviados e suprimidos, uso da cota de SMS, ativações, extratos pendentes de nota) em `infra/observability/dashboards/partners.json`.
- [ ] T040 Registrar as pendências em `docs/ops/decisions/parceiros.md`:
  - os termos do programa e a declaração de autorização dos contatos, que precisam de revisão jurídica antes de abrir o portal;
  - o pagamento manual pelo Fin/Ops, com a automação por Pix como evolução;
  - convites por SMS desligados (custo zero); ligar só com decisão sobre o custo;
  - o critério de "ativado" daqui (primeira fatura paga) é diferente do "tenant ativado" do BI da 023 (primeiro atendimento pago): são métricas diferentes.

  Registrar as telas a conferir (portal, lote, extrato com nota, contestação) em `docs/design/telas-sem-prototipo-038.md`.
- [ ] T041 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-038.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (parceiro aprovado e código).
- **US3** depende de US2 (atribuição).
- **US4** depende de US2 e pode correr em paralelo com US3. O extrato no funil depende de US3.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 a T004.
- Fundação: T005 e T006.
- Depois de US2: US3 e US4 em paralelo.

---

## Parallel Example: User Story 2

```bash
Task: "T017 contrato da indicação"
Task: "T018 convites em lote"
Task: "T019 atribuição"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fases 1 e 2.
2. US1 (cadastro), US2 (indicação) e US3 (ativação e pagamento). Indicar sem pagar não sustenta o programa.
3. **Parar e validar** com o quickstart §1 a §3. O portal só abre depois da revisão jurídica dos termos.

### Incremental Delivery

1. US4 (funil e materiais).
2. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-PAR que atende. Campos com restrição citam `data-model.md` e o campo.
- O `partners` é global e só consome eventos de `tenancy` e `billing`; o portal lê só a própria projeção.
- Sem valor no código; sem versão de valor padrão aprovada, nenhum parceiro é aprovado.
- Commit por tarefa ou grupo lógico, em branch `038-parceiros-indicadores`, por PR.
- Análise de 2026-11-27: `partners_policy` versionada (CONST 8, T010); atribuição sem cookie sem consentimento (T020/T021); convite só por e-mail de `news.koovela.com` (custo zero, T022); `dual_control` da 021; retenção pela 022 (T037); origem gravada no perfil da 005. Avisos na 011 (T083). Sem tarefas novas nesta spec.
