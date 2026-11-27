---
description: "Lista de tarefas da spec 017 — Fiscal (NFS-e)"
---

# Tasks: Fiscal — NFS-e

**Input**: documentos de `specs/017-fiscal-nfse/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 016 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- idempotência da emissão;
- varredura de segredos do certificado.

**Organization**: por história de usuário (US1–US5). P1: US1, US2 e US3. P2: US4. P3: US5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/fiscal/` com:
  - `package.json` e `tsconfig.json`;
  - plugin Fastify em `KOOVELA_DOMAINS`;
  - pastas `src/{settings,issuers,certificates,service-tax,emission,retries,cancellation,exports,pending,http}` e `migrations/`.
- [ ] T002 [P] Criar o pacote `packages/platform/fiscal/` (`FiscalProvider` e adaptadores). Adicionar `node-forge` e `xml-crypto`, que só podem ser usados dentro do adaptador (regra no dependency-cruiser). Adicionar `exceljs` e `archiver` ao `fiscal`.
- [ ] T003 [P] Copiar os contratos para `packages/contracts/openapi/fiscal.openapi.yaml` e `packages/contracts/asyncapi/fiscal-events.asyncapi.yaml` (fonte: `specs/017-fiscal-nfse/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T004 [P] Incluir as ações fiscais em `packages/contracts/rbac/permissions.yaml`:
  - emissão manual para Recepção, Gerente, Proprietário e Fin/Ops;
  - certificado com `sensitive`;
  - `audit_category` nas ações listadas em REQ-FIS-042.

  Declarar em `packages/contracts/flags/flags.yaml` as flags `fiscal.v1` e `fiscal.koovela_issuer`, esta desligada (REQ-FIS-001).
- [ ] T005 [P] Configurar o bucket de XML e PDF com retenção de 5 anos e bloqueio de remoção em `infra/oci/fiscal-bucket.tf`, e o MinIO com object lock em dev (REQ-FIS-033). Métrica de uso do bucket com aviso em 80% da cota gratuita de 20 GB.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, adaptador fiscal, cifra do certificado e emissão idempotente.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T006 [P] Varredura de segredos (portão de merge) em `services/fiscal/src/__tests__/secrets.int.test.ts`: a senha e o `.pfx` nunca aparecem em log, resposta, evento ou banco em claro (`data-model.md` `fiscal_certificate.pfx_ciphertext`, `fiscal_certificate.password_ciphertext`; REQ-FIS-003, SC-007).
- [ ] T007 [P] Teste de idempotência (portão de merge) em `services/fiscal/src/emission/idempotency.int.test.ts`:
  - 3 reenvios geram uma nota válida só (UNIQUE de `data-model.md` `fiscal_invoice.source_kind` + `fiscal_invoice.source_id` + `fiscal_invoice.source_part`);
  - o RPS nunca é reutilizado (`data-model.md` `fiscal_issuer.next_rps_number`, `fiscal_invoice.rps_number`; REQ-FIS-014, SC-002).

### Implementação da fundação

- [ ] T008 Criar a migração `services/fiscal/migrations/0001_fiscal.ts` no schema do tenant:
  - `fiscal_settings`: CHECK em `data-model.md` `fiscal_settings.issuer_mode` e `fiscal_settings.package_emission` (padrão `per_session`, PEN-24);
  - `fiscal_issuer`: CHECK em `fiscal_issuer.kind`, `fiscal_issuer.provider` e `fiscal_issuer.state`;
  - `fiscal_branch_issuer`;
  - `fiscal_certificate`: CHECK em `fiscal_certificate.state`;
  - `fiscal_service_tax`;
  - `fiscal_invoice`: CHECK em `fiscal_invoice.state` e `fiscal_invoice.source_kind`; UNIQUE parcial em `fiscal_invoice.source_kind` + `source_id` + `source_part` para nota válida;
  - `fiscal_attempt`;
  - `fiscal_pending_item`: CHECK em `fiscal_pending_item.kind` e `fiscal_pending_item.state`;
  - `fiscal_audit_outbox` e `fiscal_outbox`.

  Criar também a global `koovela_platform.fiscal_service_suggestion` em `services/fiscal/migrations/0002_suggestions.ts`.
- [ ] T009 Implementar `FiscalProvider` (`emit`, `query`, `cancel`, `downloadPdf`, `validateCertificate`) em `packages/platform/fiscal/src/provider.ts` e o adaptador `fake` para CI em `packages/platform/fiscal/src/adapters/fake.ts` (REQ-FIS-040).
- [ ] T010 Implementar a cifra por envelope do certificado (chave de dados por tenant embrulhada pelo OCI Vault; senha cifrada à parte; decifrado só em memória no `workers`) em `services/fiscal/src/certificates/vault.ts` (`data-model.md` `fiscal_certificate.wrapped_data_key`). Adicionar a redação no logger (`packages/platform/logger`).
- [ ] T011 Implementar o núcleo de emissão em `services/fiscal/src/emission/emit.ts`:
  - pedido idempotente e RPS atribuído uma vez;
  - assinatura pelo adaptador;
  - XML e PDF guardados no bucket com retenção (`data-model.md` `fiscal_invoice.xml_ref`, `fiscal_invoice.pdf_ref`);
  - valores congelados na nota (`data-model.md` `fiscal_invoice.amount_cents`, `fiscal_invoice.iss_cents`, `fiscal_invoice.iss_rate_bps`, `fiscal_invoice.service_code`), com `fiscal_invoice.branch_id`, `fiscal_invoice.issuer_id` e `fiscal_invoice.payment_id`;
  - retorno da prefeitura em `fiscal_invoice.municipal_number`, `fiscal_invoice.verification_code` e `fiscal_invoice.public_url`; recusa em `fiscal_invoice.rejection_code`;
  - combo com códigos de serviço diferentes: uma nota por código (`data-model.md` `fiscal_invoice.source_part`), com o valor pago rateado pelo rateio do combo da 006;
  - registro de tentativas;
  - evento `fiscal.invoice.changed`.

**Checkpoint**: emissão idempotente pelo adaptador falso.

---

## Phase 3: User Story 1 - Configurar a emissão de notas (Priority: P1) 🎯 MVP

**Goal**: emitente por CNPJ ou CPF, filial apontando o emitente, certificado A1 validado e cifrado, dados fiscais por serviço com sugestão, modo "nota pela Koovela" atrás de flag, recibo não fiscal para PF sem CNPJ e aviso de vencimento.

**Independent Test**: na homologação de São Paulo, cadastrar o perfil, enviar o certificado e preencher código e alíquota (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T012 [P] [US1] Teste de contrato de `getFiscalSettings`, `setFiscalSettings`, `upsertIssuer`, `uploadCertificate`, `removeCertificate` e `setServiceTax` em `services/fiscal/src/http/settings.contract.test.ts`.
- [ ] T013 [P] [US1] Teste de integração em `services/fiscal/src/issuers/issuers.int.test.ts`:
  - certificado de outro CNPJ gera `fiscal.certificate_document_mismatch`;
  - troca e remoção exigem step-up e auditoria;
  - `issuer_mode = koovela` com a flag desligada gera `fiscal.koovela_issuer_disabled`;
  - PF sem CNPJ recebe recibo não fiscal (REQ-FIS-006);
  - município sem adaptador gera `provider = unsupported`, emissão indisponível e pendência (REQ-FIS-041);
  - serviço sem dados fiscais não emite automaticamente e gera pendência (REQ-FIS-005).
- [ ] T014 [P] [US1] Teste de contrato com a homologação de São Paulo em `packages/platform/fiscal/src/adapters/sp-paulistana.contract.test.ts`, que roda só em staging com o certificado de teste.

### Implementation for User Story 1

- [ ] T015 [US1] Implementar o adaptador da NFS-e Paulistana em `packages/platform/fiscal/src/adapters/sp-paulistana.ts`, com o leiaute vigente confirmado na implementação (research R2).
- [ ] T016 [US1] Implementar o adaptador do padrão nacional (MEI) em `packages/platform/fiscal/src/adapters/national.ts` e registrar em `docs/ops/decisions/nfse-nacional-cobertura.md` a cobertura e o calendário de adesão confirmados.
- [ ] T017 [US1] Implementar os emitentes, o vínculo por filial e as configurações em `services/fiscal/src/{issuers,settings}/` (`data-model.md` `fiscal_issuer.document`, `fiscal_issuer.municipal_registration`, `fiscal_issuer.tax_regime`, `fiscal_issuer.municipality_ibge`, `fiscal_issuer.address`, `fiscal_issuer.rps_series`; `fiscal_settings.auto_emit`, ligado por padrão quando o perfil fica completo; REQ-FIS-002/004).
- [ ] T018 [US1] Implementar o envio, a validação, a troca e a remoção do certificado, com o job de aviso 30 dias antes do vencimento e o bloqueio quando vence (evento `fiscal.certificate.expiring.v1`), em `services/fiscal/src/certificates/certificates.ts` (`data-model.md` `fiscal_certificate.subject_document` comparado com `fiscal_issuer.document`, `fiscal_certificate.not_after`, `fiscal_certificate.uploaded_by`; REQ-FIS-007). Certificado trocado: as notas seguintes usam o novo; as anteriores não mudam (caso de borda).
- [ ] T019 [US1] Implementar os dados fiscais do serviço com sugestão por categoria em `services/fiscal/src/service-tax/service-tax.ts` (`data-model.md` `fiscal_service_tax.iss_rate_bps`, `fiscal_service_tax.iss_withheld`, `fiscal_service_tax.municipal_code`, `fiscal_service_tax.national_code`, `fiscal_service_tax.suggested_from_category`). Mudança de alíquota ou código vale só para as notas seguintes.
- [ ] T020 [US1] Implementar o recibo não fiscal em PDF para PF sem CNPJ em `services/fiscal/src/emission/receipt.ts`.
- [ ] T021 [US1] Implementar as rotas `/v1/tenant/fiscal/settings`, `/issuers*` e `/services/*` em `services/fiscal/src/http/settings.ts`.
- [ ] T022 [P] [US1] Implementar o passo fiscal do O05 em `apps/tenant-web/src/routes/onboarding/fiscal/` e os dados fiscais na P09 em `apps/tenant-web/src/routes/catalog/services/FiscalFields.tsx`. Meta: 10 serviços em ≤ 15 min (SC-004).

**Checkpoint**: emissão configurada.

---

## Phase 4: User Story 2 - Nota emitida automaticamente a cada atendimento pago (Priority: P1)

**Goal**: emissão automática com o valor pago e CPF por escolha do consumidor, sem nota para valor zero, multa ou sinal. Regra de pacote, envio ao consumidor e consulta no app e na web.

**Independent Test**: três atendimentos pagos (Pix, cartão e no local) geram três notas enviadas (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T023 [P] [US2] Teste de contrato de `getMyInvoice` em `services/fiscal/src/http/consumer.contract.test.ts`.
- [ ] T024 [P] [US2] Teste de integração em `services/fiscal/src/emission/auto.int.test.ts`:
  - concluído e pago gera nota com o valor efetivamente pago (REQ-FIS-010);
  - CPF só com "CPF na nota" (`data-model.md` `fiscal_invoice.consumer_cpf`; REQ-FIS-011);
  - sem nota para valor zero, multa ou sinal não convertido (REQ-FIS-012);
  - pacote com o padrão `per_session` (nota por sessão, pelo valor coberto) e com `on_sale` (nota na venda, sem nota nas sessões) (REQ-FIS-013);
  - combo com dois códigos de serviço gera duas notas com `source_part` 0 e 1 e valores rateados;
  - sinal online e restante no local geram uma nota só, depois do total pago;
  - resgate de fidelidade "serviço grátis" (015) não gera nota; desconto de fidelidade reduz o valor (`scheduling_appointment.loyalty_discount_cents` da 009);
  - nota enviada pela 011 e ligada ao agendamento e ao pagamento (REQ-FIS-015);
  - 95% em ≤ 10 min com o adaptador `fake` (SC-001).

### Implementation for User Story 2

- [ ] T025 [US2] Implementar o gatilho automático, consumindo `scheduling.appointment.state_changed` e os eventos de pagamento da 012, em `services/fiscal/src/emission/auto.ts`. Emitir só quando o atendimento está concluído e o total pago é igual ao valor devido menos `scheduling_appointment.loyalty_discount_cents` (009). Respeitar `data-model.md` `fiscal_settings.auto_emit` e `fiscal_settings.package_emission`.
- [ ] T026 [US2] Implementar a rota `/v1/consumer/appointments/{id}/invoice` em `services/fiscal/src/http/consumer.ts`.
- [ ] T027 [P] [US2] Implementar "CPF na nota" no resumo C08/W11 e a nota no agendamento concluído C16/W18 em `apps/consumer-mobile/app/booking/invoice.tsx` e `apps/consumer-web/app/routes/agendamento.$id.nota.tsx`. Meta: até 2 toques (SC-005).

**Checkpoint**: nota emitida para cada atendimento pago.

---

## Phase 5: User Story 3 - Falhas, contingência e cancelamento (Priority: P1)

**Goal**:
- novas tentativas com intervalos crescentes por até 72 h;
- recusa explicada em linguagem simples;
- cancelamento no estorno total dentro do prazo;
- pendência fiscal no estorno parcial ou fora do prazo;
- avisos e alertas.

**Independent Test**: prefeitura fora do ar, recusa por código inválido e estorno (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T028 [P] [US3] Teste de contrato de `cancelInvoice` e `listPending` em `services/fiscal/src/http/pending.contract.test.ts`.
- [ ] T029 [P] [US3] Teste de integração em `services/fiscal/src/retries/retries.int.test.ts`:
  - intervalos de 1 min, 5 min, 30 min, 2 h e depois a cada 6 h, até 72 h, e então `failed_permanent` (`data-model.md` `fiscal_attempt.next_retry_at`; REQ-FIS-020, SC-003);
  - recusa traduzida com o que corrigir (`data-model.md` `fiscal_invoice.rejection_hint`; REQ-FIS-021);
  - estorno total dentro do prazo cancela; parcial ou fora do prazo vira `fiscal_pending` (REQ-FIS-022);
  - pendente há mais de 24 h avisa o Proprietário e o Fin/Ops (REQ-FIS-023).

### Implementation for User Story 3

- [ ] T030 [US3] Implementar as novas tentativas no `workers` em `services/fiscal/src/retries/retries.ts` e a tabela de tradução de códigos por adaptador em `packages/platform/fiscal/src/adapters/*/rejections.ts` (`data-model.md` `fiscal_attempt.attempt_no`, `fiscal_attempt.outcome`, `fiscal_attempt.provider_code`).
- [ ] T031 [US3] Implementar o cancelamento e a pendência a partir dos estornos da 012 em `services/fiscal/src/cancellation/cancellation.ts`, mais a rota `/v1/tenant/fiscal/invoices/{id}/cancel` e as pendências em `services/fiscal/src/pending/pending.ts` (evento `fiscal.pending.opened.v1`; `data-model.md` `fiscal_pending_item.resolution` registrado ao resolver).
- [ ] T032 [US3] Implementar os avisos de pendência há mais de 24 h e o alerta ao SRE por falhas acumuladas por município em `services/fiscal/src/retries/alerts.ts` e `infra/observability/alerts/fiscal.yml`.

**Checkpoint**: nenhuma nota se perde.

---

## Phase 6: User Story 4 - Histórico, consulta e exportação para o contador (Priority: P2)

**Goal**: histórico com filtros e totais, detalhe com as tentativas, exportação mensal (planilha mais zip de XML e PDF) e relatório de atendimentos sem nota.

**Independent Test**: filtrar o histórico e exportar o mês (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T033 [P] [US4] Teste de contrato de `listInvoices`, `getInvoice` e `monthlyExport` em `services/fiscal/src/http/invoices.contract.test.ts`.
- [ ] T034 [P] [US4] Teste de integração em `services/fiscal/src/exports/export.int.test.ts`:
  - o zip traz os XMLs e PDFs autorizados e cancelados do mês, mais a planilha com totais de valor e ISS (REQ-FIS-031, SC-006);
  - o relatório lista os atendimentos concluídos e pagos sem nota (REQ-FIS-032).

### Implementation for User Story 4

- [ ] T035 [US4] Implementar o histórico, o detalhe e o relatório sem nota em `services/fiscal/src/exports/history.ts` e as rotas `/v1/tenant/fiscal/invoices*`.
- [ ] T036 [US4] Implementar a exportação mensal no `workers` (planilha com `exceljs`, zip com `archiver`, link assinado) em `services/fiscal/src/exports/export.ts` e a rota `/v1/tenant/fiscal/exports/{month}`.
- [ ] T037 [P] [US4] Implementar a tela P23 (NFS-e: emissão e histórico) em `apps/tenant-web/src/routes/fiscal/`.

**Checkpoint**: o contador recebe tudo num arquivo.

---

## Phase 7: User Story 5 - Emissão manual e nota avulsa (Priority: P3)

**Goal**: emissão manual individual ou em lote, com registro do ator, e reemissão depois de cancelar (por exemplo, para corrigir o CPF).

**Independent Test**: com a emissão automática desligada, emitir uma nota manualmente, corrigir o CPF e reemitir (quickstart §2).

### Tests for User Story 5 ⚠️

- [ ] T038 [P] [US5] Teste de contrato de `emitManual` em `services/fiscal/src/http/manual.contract.test.ts`.
- [ ] T039 [P] [US5] Teste de integração em `services/fiscal/src/emission/manual.int.test.ts`:
  - emissão manual pelos papéis permitidos, com `issued_by` igual ao ator (`data-model.md` `fiscal_invoice.issued_by`; REQ-FIS-016);
  - emissão em lote;
  - reemissão só depois do cancelamento, sem duplicar a nota válida;
  - tudo auditado (REQ-FIS-042).

### Implementation for User Story 5

- [ ] T040 [US5] Implementar a emissão manual, o lote e a reemissão em `services/fiscal/src/emission/manual.ts`, com a rota `POST /v1/tenant/fiscal/invoices`. A reemissão usa `fiscal_invoice.service_code` e `fiscal_invoice.iss_rate_bps` da nota original, não os dados fiscais atuais do serviço.
- [ ] T041 [P] [US5] Acrescentar a emissão manual e em lote e a reemissão à P23 em `apps/tenant-web/src/routes/fiscal/ManualEmission.tsx`.

**Checkpoint**: controle manual quando necessário.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T042 [P] Registrar os casos de isolamento em `services/fiscal/src/isolation.cases.ts`: perfil, certificados e notas de outro tenant → 404 (REQ-FIS-043).
- [ ] T043 [P] Testes com a flag `fiscal.v1` ligada e desligada em `services/fiscal/src/__tests__/flags.int.test.ts`.
- [ ] T044 [P] Implementar a tela nova do back-office (falhas por município e certificados a vencer) em `apps/admin-web/src/routes/fiscal/` e a rota `/v1/admin/fiscal/health`.
- [ ] T045 [P] Painel Grafana "Fiscal" em `infra/observability/dashboards/fiscal.json` (tempo até a autorização, tentativas, recusas por código, pendências).
- [ ] T046 Registrar a pendência do parecer de contador para ligar o modo "nota pela Koovela" em `docs/ops/decisions/nfse-koovela-emitente.md` e o runbook `docs/ops/runbooks/prefeitura-fora-do-ar.md`.
- [ ] T047 Executar o [quickstart.md](./quickstart.md) inteiro em staging (homologação de São Paulo) e registrar em `docs/ops/decisions/validacao-017.md`.
- [ ] T048 [P] Consumir os eventos das turmas (026) em `services/fiscal/src/triggers/classes.ts`: aula avulsa paga e concluída e presença com crédito de pacote → nota `source_kind = class_enrollment` pelo valor da aula (pacote pelo preço por aula, como na regra `per_session`); cobrança mensal do plano aprovada → nota `source_kind = membership_charge`. A venda do pacote de aulas é adiantamento, sem nota. Casos em `services/fiscal/src/triggers/classes.int.test.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1 (perfil completo), da 009 e da 012.
- **US3** depende de US2.
- **US4** depende de US2.
- **US5** depende de US2.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → adaptador e domínio → rotas → telas → alertas.

### Parallel Opportunities

- Setup: T002 a T005.
- Fundação: T006 e T007.
- Em US1: T015 e T016 (adaptadores) em paralelo com T017 a T019.
- Depois de US2: US3, US4 e US5 em paralelo.

---

## Parallel Example: User Story 1

```bash
# Testes primeiro, juntos:
Task: "T012 contrato em services/fiscal/src/http/settings.contract.test.ts"
Task: "T013 integração em services/fiscal/src/issuers/issuers.int.test.ts"
Task: "T014 homologação SP em packages/platform/fiscal/src/adapters/sp-paulistana.contract.test.ts"

# Adaptadores juntos:
Task: "T015 sp-paulistana"
Task: "T016 national"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fases 1 e 2.
2. US1 (configurar) e US2 (emissão automática).
3. **Parar e validar** com o quickstart §1 e §2 na homologação de São Paulo.

### Incremental Delivery

1. US3 (contingência e cancelamento).
2. US4 → US5 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-FIS que atende. Campos com restrição citam `data-model.md` e o campo.
- Sem agregador pago (custo zero). O leiaute de cada município fica só no adaptador.
- O certificado só é decifrado em memória no `workers`, e a senha nunca aparece.
- Commit por tarefa ou grupo lógico, em branch `017-fiscal-nfse`, por PR.
- T048 acrescentada na análise da 026 (2026-11-27): nota de aula e de plano de turmas.
- Análise de 2026-11-27: PEN-24 aplicado (padrão `per_session`, vale sempre no uso, alinhado com a 029); `source_part` para combo com códigos diferentes; campos de `data-model.md` citados em T011, T017, T018, T019, T030 e T031; pagamento parcial e desconto de fidelidade em T024/T025; reemissão com os dados da nota original em T040; aviso de cota do bucket em T005. Sem tarefas novas.
