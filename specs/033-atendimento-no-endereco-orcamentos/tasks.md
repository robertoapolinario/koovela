---
description: "Lista de tarefas da spec 033 — Atendimento no endereço e orçamentos"
---

# Tasks: Atendimento no endereço e orçamentos

**Input**: documentos de `specs/033-atendimento-no-endereco-orcamentos/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 032 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. São portões de merge:
- o tempo de deslocamento é respeitado entre atendimentos do mesmo profissional, pela PK de células (SC-001);
- ninguém fora da área consegue agendar serviço no endereço (SC-002);
- o colaborador só lê o endereço de atendimentos atribuídos a ele, do dia e não encerrados, e cada leitura é registrada (SC-006);
- agendamento vindo de orçamento tem o preço do orçamento (SC-004).

**Organization**: por história de usuário. P1: US1 (local e área), US2 (agendar no endereço), US3 (rota do dia) e US4 (orçamentos). P2: US5 (veículo). A geocodificação sem custo e os endereços do consumidor ficam na fundação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US5).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar o domínio `services/quotes/` (`package.json`, `tsconfig.json`, plugin Fastify em `KOOVELA_DOMAINS`, `src/{requests,quotes,photos,settings,expiry,http}/`, `migrations/`), o pacote `packages/platform/geo/` e as pastas `services/scheduling/src/{service-area,travel,route,field-events,address}/` e `services/identity/src/{addresses,subjects/vehicle}/`.
- [ ] T002 [P] Copiar os contratos para `packages/contracts/openapi/address-quotes.openapi.yaml` e `packages/contracts/asyncapi/address-quotes-events.asyncapi.yaml` (fonte: `specs/033-atendimento-no-endereco-orcamentos/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T003 [P] Incluir as ações em `packages/contracts/rbac/permissions.yaml`:
  - área de atendimento pelo Proprietário e pelo Gerente;
  - rota e ações de campo pelo colaborador atribuído, e pela filial para Recepção, Gerente e Proprietário;
  - responder orçamento e ver fotos pela Recepção, Gerente e Proprietário;
  - `quotes.report_photo`;
  - limites de orçamento pela Gestão, com `audit_category`.

  Declarar as flags `scheduling.at_address` e `quotes.v1` em `packages/contracts/flags/flags.yaml`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: geocodificação sem custo, endereços cifrados do consumidor, área de atendimento e migrações.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T004 [P] Teste do pacote geo em `packages/platform/geo/src/__tests__/geo.test.ts`:
  - CEP → bairro, cidade e centróide pela BrasilAPI, com fallback Nominatim a 1 requisição por segundo e cache em `data-model.md` `geo_cep_cache`;
  - haversine;
  - CEP geral de cidade ou área rural usa o centróide do bairro (base IBGE da 024);
  - nenhuma chamada a serviço pago (REQ-END-005).
- [ ] T005 [P] Teste de endereços em `services/identity/src/addresses/addresses.int.test.ts`:
  - `data-model.md` `identity_consumer_address.street`, `identity_consumer_address.number`, `identity_consumer_address.complement` e `identity_consumer_address.reference_point` ficam cifrados;
  - `identity_consumer_address.cep` também fica cifrado; em claro ficam só `identity_consumer_address.cep_prefix5`, `city_ibge` e `neighborhood_normalized` (CONST IV);
  - o 11º endereço ativo é recusado.

### Implementação da fundação

- [ ] T006 Extrair a geocodificação da 005 para `packages/platform/geo/src/{cep,haversine,neighborhood}.ts`, com cliente BrasilAPI, cliente Nominatim com limitação e cache, e atualizar `services/tenancy` para usar o pacote. Para fora vai só o CEP (nunca rua, número ou ponto de referência); o resultado fica em `geo_cep_cache`, sem ligação com o consumidor. Criar a migração de `geo_cep_cache` em `services/platform/migrations/0033_geo_cep_cache.ts`.
- [ ] T007 Criar a migração `services/identity/migrations/0033_addresses_vehicle.ts` com `identity_consumer_address` (CHECK em `data-model.md` `identity_consumer_address.state`; `identity_consumer_address.cep` cifrado e `identity_consumer_address.cep_prefix5` em claro) e `service_subject_vehicle` (CHECK em `service_subject_vehicle.vehicle_type` e `service_subject_vehicle.size`; `service_subject_vehicle.plate` cifrada).
- [ ] T008 [P] Criar a migração de tenant `services/scheduling/migrations/tenant/0033_at_address.ts` com:
  - `scheduling_service_area`: CHECK em `data-model.md` `scheduling_service_area.mode`, `scheduling_service_area.radius_km` e `scheduling_service_area.travel_min`;
  - `scheduling_occupancy.kind` com `travel` e a coluna `scheduling_occupancy.address_key`;
  - `appointment_address_snapshot`, com os campos cifrados;
  - `scheduling_field_event`: CHECK em `scheduling_field_event.kind` e UNIQUE em `scheduling_field_event.client_op_id`;
  - `scheduling_address_access_log`.
- [ ] T009 [P] Criar a migração de tenant `services/catalog/migrations/tenant/0033_location_quote.ts` com `data-model.md` `catalog_service_version.location` e `catalog_service_version.quote_mode` (padrões `on_premises` e `none`), `vehicle{types}` em `accepted_subjects`, e `catalog_duration_rule_version.base_by_vehicle_size` e `catalog_duration_rule_version.price_by_vehicle_size_cents`.
- [ ] T010 Implementar os endereços do consumidor (`listMyAddresses`, `addMyAddress`, `removeMyAddress`) em `services/identity/src/addresses/addresses.ts`, com o `HolderDataPort` (022) atualizado em `services/identity/src/holder-data/port.ts` (`data-model.md` `identity_consumer_address.label`), com `applyRetention` para `consumer_addresses` e `vehicle_plates` (até a remoção).

**Checkpoint**: endereços seguros e área verificável sem custo.

---

## Phase 3: User Story 1 - Definir onde cada serviço é feito e até onde o negócio atende (Priority: P1) 🎯 MVP

**Goal**: local por serviço (no estabelecimento ou no endereço do cliente), sem taxa de deslocamento. Área por raio ou por bairros, tempo de deslocamento por filial e combo com local único.

**Independent Test**: marcar dois serviços como "no endereço", definir área e deslocamento, e conferir que um consumidor de fora não vê horários (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Teste de contrato de `getServiceArea`, `setServiceArea` e `checkCoverage` em `services/scheduling/src/service-area/service-area.contract.test.ts`.
- [ ] T012 [P] [US1] Teste de integração em `services/scheduling/src/service-area/coverage.int.test.ts`:
  - no modo raio, haversine do centróide até a filial contra `data-model.md` `scheduling_service_area.radius_km`;
  - no modo bairros, `scheduling_service_area.neighborhoods` no mesmo município;
  - nova versão (`scheduling_service_area.valid_from`) não altera agendamentos;
  - combo com etapas de locais diferentes é recusado (REQ-END-014);
  - não existe campo de taxa de deslocamento (REQ-END-002).

### Implementation for User Story 1

- [ ] T013 [US1] Implementar `location` e `quote_mode` na versão do serviço e a regra de combo em `services/catalog/src/services/location.ts`, publicando `catalog.service.location_changed.v1`.
- [ ] T014 [US1] Implementar a área versionada e a verificação de cobertura em `services/scheduling/src/service-area/service-area.ts`, publicando `scheduling.branch.service_area_changed.v1`.
- [ ] T015 [P] [US1] Implementar a tela "Onde é feito" no catálogo e a área de atendimento por filial em `apps/tenant-web/src/routes/catalog/onde/`.

**Checkpoint**: o negócio define o que faz no endereço e até onde vai.

---

## Phase 4: User Story 2 - Consumidor agenda um serviço no próprio endereço (Priority: P1)

**Goal**: escolher ou cadastrar o endereço e ver horários só dentro da área. O deslocamento ocupa a agenda como segmento próprio, dispensado no mesmo endereço. Mudança de endereço só dentro da área, com aviso. Filtro "atende no meu endereço" na vitrine.

**Independent Test**: dois endereços, um dentro e outro fora da área; dois atendimentos seguidos do mesmo profissional respeitam o deslocamento (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T016 [P] [US2] Teste de concorrência e propriedade (portão de merge) em `services/scheduling/src/travel/travel.concurrency.test.ts`:
  - o segmento `travel` ocupa `[início_protegido − travel_min, início_protegido)` com `parent_occupancy_id` e nunca se sobrepõe (SC-001);
  - com a mesma `data-model.md` `scheduling_occupancy.address_key` e o anterior terminando no início, o deslocamento é dispensado;
  - inserir antes de um atendimento no mesmo endereço remove o segmento do seguinte na mesma transação.
- [ ] T017 [P] [US2] Teste de integração em `services/scheduling/src/address/address.int.test.ts`:
  - endereço fora da área → sem horários e hold recusado (SC-002);
  - a disponibilidade com `address_ref` soma o deslocamento ao preparo e à limpeza (REQ-END-011);
  - `changeAppointmentAddress` só aceita endereço dentro da área e avisa a Recepção (REQ-END-013);
  - cancelar o anterior recompõe o deslocamento do seguinte ou abre a pendência "deslocamento sem tempo", sem desfazer nada sozinho;
  - `appointment_address_snapshot` fica congelado.
  - endereço sem número ou rural exige ponto de referência e a área é checada por CEP e bairro;
  - serviço de saúde no endereço segue as regras da vertical (PEN-06).

### Implementation for User Story 2

- [ ] T018 [US2] Implementar o segmento de deslocamento e a dispensa por `address_key` (HMAC-SHA256 com a chave do tenant) no hold da 008 em `services/scheduling/src/travel/travel.ts`, e o parâmetro `address_ref` retrocompatível na disponibilidade em `services/scheduling/src/availability/address-ref.ts`.
- [ ] T019 [US2] Implementar o snapshot do endereço na confirmação (009) e `changeAppointmentAddress` em `services/scheduling/src/address/address.ts` (`data-model.md` `appointment_address_snapshot.street`, `appointment_address_snapshot.number`, `appointment_address_snapshot.complement`, `appointment_address_snapshot.reference_point`, `appointment_address_snapshot.cep` cifrado, `appointment_address_snapshot.cep_prefix5`, `appointment_address_snapshot.address_key`, `appointment_address_snapshot.source_address_id`). A mudança de endereço avisa a Recepção pela 011 (T079).
- [ ] T020 [US2] Implementar a recomposição do deslocamento depois de um cancelamento, com a pendência para a Recepção, em `services/workers/src/scheduling/travel-recompose/recompose.ts`.
- [ ] T021 [P] [US2] Incluir `home_service` e `service_area` público em `discovery_listing` e o filtro `at_my_address` em `services/discovery/src/search/at-my-address.ts` (024).
- [ ] T022 [P] [US2] Implementar a escolha e o cadastro de endereço no fluxo de agendamento e a tela de endereços em `apps/consumer-mobile/src/app/enderecos/`, `apps/consumer-mobile/src/app/agendar/endereco.tsx` e `apps/consumer-web/src/routes/enderecos.tsx`.

**Checkpoint**: o consumidor agenda em casa sem conflito de agenda.

---

## Phase 5: User Story 3 - Rota do dia do colaborador (Priority: P1)

**Goal**: atendimentos no endereço em ordem, com endereço completo e "abrir no mapa". "Cheguei" faz check-in, "Vou atrasar" avisa o próximo e "Cliente ausente" segue o no-show. Acesso restrito e registrado, com rota offline apagada no fim do dia.

**Independent Test**: três atendimentos no endereço no mesmo dia; conferir ordem, endereços e mapa (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T023 [P] [US3] Teste de acesso (portão de merge) em `services/scheduling/src/route/route-access.int.test.ts`:
  - só atendimentos atribuídos, do dia local e em `CONFIRMADO` ou `EM_ATENDIMENTO` devolvem endereço;
  - os demais → `scheduling.address_not_accessible`;
  - toda leitura grava `data-model.md` `scheduling_address_access_log.viewer_id` e `scheduling_address_access_log.viewer_role` (SC-006).
- [ ] T024 [P] [US3] Teste de contrato e integração de `getMyRouteToday` e `postFieldEvent` em `services/scheduling/src/field-events/field-events.int.test.ts`:
  - "cheguei" faz o check-in e avisa o consumidor;
  - "vou atrasar" (`data-model.md` `scheduling_field_event.estimate_min` de 5 a 120) avisa só o próximo da rota;
  - "cliente ausente" só depois da tolerância da política congelada (010), seguindo o no-show;
  - eventos offline são idempotentes por `scheduling_field_event.client_op_id`.

### Implementation for User Story 3

- [ ] T025 [US3] Implementar a rota do dia, com decifragem por requisição e registro de acesso, em `services/scheduling/src/route/route.ts`.
- [ ] T026 [US3] Implementar as ações de campo em `services/scheduling/src/field-events/field-events.ts`, publicando `scheduling.appointment.arrived_at_address.v1` e `scheduling.appointment.running_late.v1`.
- [ ] T027 [P] [US3] Implementar a rota no `pro-mobile`, com SQLite cifrado (chave no `expo-secure-store`) apagado na virada do dia, no logout ou no fim do vínculo, fila offline idempotente e "abrir no mapa" (`geo:`/`maps:`) em até 2 toques (SC-005), em `apps/pro-mobile/app/rota/`. Implementar também a versão do `/pro` em `apps/tenant-web/src/routes/pro/rota/`.

**Checkpoint**: o colaborador faz a rota com o mínimo de dados.

---

## Phase 6: User Story 4 - Pedir e responder orçamento com fotos (Priority: P1)

**Goal**: pedido com descrição, até 5 fotos, endereço, veículo e datas. Resposta com preço, duração e validade, recusa ou pedido de informação. Prazos configuráveis, expiração e aceite com preço congelado. Fotos privadas, sem EXIF e com retenção.

**Independent Test**: pedir um orçamento com 3 fotos, responder pelo painel, aceitar e agendar com o preço do orçamento (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T028 [P] [US4] Teste de contrato de `listMyQuoteRequests`, `createQuoteRequest`, `getMyQuoteRequest`, `replyQuoteInfo`, `acceptQuote`, `rejectQuote`, `listReceivedQuoteRequests`, `answerQuoteRequest`, `reportQuotePhoto`, `setQuoteSettings` e `setQuoteLimits` em `services/quotes/src/http/quotes.contract.test.ts`.
- [ ] T029 [P] [US4] Teste de integração em `services/quotes/src/requests/requests.int.test.ts`:
  - transições de `data-model.md` `quotes_request.state` e `quotes_quote.state`;
  - no máximo 3 `quotes_message` por lado, e a resposta do consumidor volta o pedido a `sent` e reinicia o prazo;
  - `quotes_request.response_due_at` e `quotes_quote.valid_until` ficam congelados, dentro de `quotes_settings` e `quotes_limits`;
  - expiração com aviso;
  - orçamento fora de `valid` não é aceito;
  - o aceite cria o agendamento com `price_snapshot_cents` = `quotes_quote.price_cents` e duração `quotes_quote.duration_min` (SC-004);
  - pagamento antecipado (012) usa o preço do orçamento.
  - orçamento aceito sem horário dentro da validade: o consumidor escolhe qualquer horário disponível (a validade vale para o aceite).
- [ ] T030 [P] [US4] Teste de fotos em `services/quotes/src/photos/photos.int.test.ts`:
  - upload por URL assinada de 10 min, só JPEG, PNG, HEIC e WebP até 10 MB;
  - EXIF removido, conversão para WebP, miniatura e cifra com a chave do tenant;
  - leitura por URL de 5 min só para o consumidor dono e para Recepção, Gerente e Proprietário;
  - `data-model.md` `quotes_photo.purge_after` = 90 dias depois do fim, salvo se virou agendamento;
  - a denúncia vai para a moderação (024/021).

### Implementation for User Story 4

- [ ] T031 [US4] Criar a migração de tenant `services/quotes/migrations/tenant/0001_quotes.ts` com:
  - `quotes_settings`;
  - `quotes_request`: CHECK em `data-model.md` `quotes_request.state`, e `quotes_request.description` cifrada;
  - `quotes_message`: CHECK em `quotes_message.author_side`;
  - `quotes_photo`: CHECK em `quotes_photo.state`;
  - `quotes_quote`: UNIQUE `request_id`, CHECK em `quotes_quote.price_cents` > 0, `quotes_quote.duration_min` múltiplo de 5 e `quotes_quote.state`.

  Criar também `quotes_limits` em `services/platform/migrations/0033_quotes_limits.ts` e `consumer_quotes_index` em `services/quotes/migrations/projections/0001_consumer_quotes_index.ts`.
- [ ] T032 [US4] Implementar pedidos, mensagens e respostas em `services/quotes/src/requests/requests.ts` e `services/quotes/src/quotes/quotes.ts`, (`data-model.md` `quotes_request.date_preferences`, `quotes_request.decline_reason`, `quotes_quote.answered_by`), publicando `quotes.quote_request.*.v1` e `quotes.quote.*.v1` (avisados pela 011, T079).
- [ ] T033 [US4] Implementar o aceite, que abre o horário da 008 com a duração do orçamento e cria na 009 com `frozen.quote_id`, em `services/quotes/src/quotes/accept.ts` e `services/scheduling/src/appointments/from-quote.ts`.
- [ ] T034 [US4] Implementar as fotos (URLs assinadas, tratamento no `workers`, leitura, denúncia) em `services/quotes/src/photos/photos.ts` e `services/workers/src/quotes/photo-process.ts`, e a limpeza diária em `services/workers/src/quotes/photo-purge.ts`, com o prazo da categoria `quote_photos_text` lido da tabela da 022 (valor inicial 90 dias), nunca fixo no código.
- [ ] T035 [US4] Implementar prazos, configurações (`data-model.md` `quotes_settings.response_hours`, `quotes_settings.validity_days`, dentro de `quotes_limits`) e a expiração diária em `services/quotes/src/settings/settings.ts` e `services/workers/src/quotes/expiry.ts`, mais a projeção `consumer_quotes_index` em `services/quotes/src/requests/index-projection.ts`.
- [ ] T036 [US4] Implementar as rotas de consumidor, tenant e admin em `services/quotes/src/http/quotes.ts`.
- [ ] T037 [P] [US4] Implementar as telas de orçamento do consumidor (pedido em até 2 minutos, SC-003) em `apps/consumer-mobile/src/app/orcamentos/` e `apps/consumer-web/src/routes/orcamentos.tsx`, a caixa de orçamentos do negócio em `apps/tenant-web/src/routes/quotes/` e os limites no back-office em `apps/admin-web/src/routes/quotes/limites/`.

**Checkpoint**: serviços sem preço fixo viram agendamento com preço congelado.

---

## Phase 7: User Story 5 - Veículo como atendido no automotivo (Priority: P2)

**Goal**: veículo como tipo de atendido (025), com tipo, marca, modelo, cor, porte e placa opcional. Duração e preço por porte, e histórico só do próprio negócio.

**Independent Test**: cadastrar um carro grande e agendar uma lavagem com duração maior (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T038 [P] [US5] Teste de integração em `services/identity/src/subjects/vehicle/vehicle.int.test.ts`:
  - `kind = vehicle` com `data-model.md` `service_subject_vehicle.size`;
  - a duração e o preço usam `catalog_duration_rule_version.base_by_vehicle_size` e `catalog_duration_rule_version.price_by_vehicle_size_cents`;
  - o snapshot entra no agendamento e no orçamento;
  - o estabelecimento vê só o histórico do próprio negócio (REQ-END-032).

### Implementation for User Story 5

- [ ] T039 [US5] Implementar o veículo como atendido em `services/identity/src/subjects/vehicle/vehicle.ts`, e o cálculo por porte de veículo em `packages/domain/catalog/src/vehicle-duration.ts`.
- [ ] T040 [P] [US5] Implementar o cadastro de veículo em `apps/consumer-mobile/src/app/atendidos/veiculo.tsx` e a regra por porte no catálogo em `apps/tenant-web/src/routes/catalog/VehicleSizeRule.tsx`.

**Checkpoint**: o automotivo funciona com o veículo no centro.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T041 Atualizar o `HolderDataPort` (022) para pedidos, mensagens, fotos e snapshots de endereço em `services/quotes/src/holder-data/port.ts` e `services/scheduling/src/holder-data/port.ts`, e registrar em `packages/contracts/privacy/holder-ports.yaml`, com `applyRetention` para as categorias `quote_photos_text` e `appointment_address_snapshot` (prazos lidos da tabela da 022).
- [ ] T042 [P] Casos de isolamento em `tests/isolation/cases/quotes.ts` e `tests/isolation/cases/address.ts`.
- [ ] T043 [P] Testes com as flags `scheduling.at_address` e `quotes.v1` ligadas e desligadas em `services/quotes/src/__tests__/flags.int.test.ts`, e axe nas telas novas em `apps/consumer-web/e2e/address-quotes-a11y.spec.ts`.
- [ ] T044 [P] Métricas (cobertura recusada, pendências de deslocamento, orçamentos expirados, tempo de resposta) no painel `infra/observability/dashboards/address-quotes.json`, e mapas de ingestão do BI em `bi/ingest/mappings/quotes.yaml`.
- [ ] T045 Registrar as telas a conferir na DF 9.11 em `docs/design/telas-sem-prototipo-033.md`, e o uso da BrasilAPI e do Nominatim (política de uso e limites; só o CEP sai) em `docs/ops/decisions/geocodificacao.md`.
- [ ] T046 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar em `docs/ops/decisions/validacao-033.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** depende da fase 2.
- **US2** depende de US1.
- **US3** depende de US2 (atendimentos no endereço).
- **US4** depende da fase 2 e de US1 (`quote_mode`), e pode correr em paralelo com US2 e US3.
- **US5** depende da fase 2 e pode correr em paralelo com as demais.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas.

### Parallel Opportunities

- Setup: T002 e T003.
- Fundação: T004, T005, T008 e T009.
- Depois de US1: US2 e US4 em paralelo. A US5 pode correr a qualquer momento depois da fase 2.

---

## Parallel Example: depois de US1

```bash
Task: "T016 deslocamento (concorrência)"
Task: "T029 ciclo do orçamento"
Task: "T038 veículo"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fases 1 e 2.
2. US1 (local e área), US2 (agendar no endereço) e US3 (rota do dia). Sem a rota, o atendimento no endereço não se executa.
3. **Parar e validar** com o quickstart §1 a §3.

### Incremental Delivery

1. US4 (orçamentos), reaproveitável depois pela 035.
2. US5 (veículo).
3. Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US3 → US4 → US5 → Polish.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-END ou REQ-ORC que atende. Campos com restrição citam `data-model.md` e o campo.
- Não existe taxa de deslocamento; o deslocamento é tempo na agenda, modelado como ocupação.
- Nenhuma coordenada da casa é guardada; a área é verificada pelo CEP e pelo bairro.
- Commit por tarefa ou grupo lógico, em branch `033-atendimento-no-endereco-orcamentos`, por PR.
- Análise de 2026-11-27: CEP cifrado com `cep_prefix5` em claro (CONST IV); só o CEP sai para geocodificação; retenção pela 022 (T010, T034, T041); campos citados; casos de borda em T017/T029. Nas specs donas: 011 T079 (avisos), 017 T049 (ISS no local do serviço).
