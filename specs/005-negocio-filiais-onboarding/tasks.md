---
description: "Lista de tarefas da spec 005 — Negócio, filiais e onboarding"
---

# Tasks: Negócio, filiais e onboarding

**Input**: documentos de `specs/005-negocio-filiais-onboarding/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 a 004 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige testes escritos antes do código. Em cada história, as tarefas de teste vêm primeiro e DEVEM falhar antes da implementação.

**Organization**: por história de usuário (US1–US6), na ordem de prioridade da spec (P1: US1, US2, US3; P2: US4, US5, US6). O registro global de slugs, o catálogo de verticais e os termos ficam na fundação porque o onboarding do autônomo (US1) depende deles.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US6).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

- [ ] T001 Criar as pastas do domínio em `services/tenancy/src/{onboarding,business,branches,hours,slugs,client-profile,public}/` e registrar as rotas novas no plugin do `tenancy`.
- [ ] T002 [P] Criar os pacotes `packages/platform/geo/` e `packages/platform/media/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T003 [P] Adicionar as dependências fixadas: `sharp`, `qrcode`, `pdf-lib` e `date-holidays` no `tenancy`; `maplibre-gl` no `tenant-web` e no `consumer-web`.
- [ ] T004 [P] Copiar os contratos para `packages/contracts/openapi/business.openapi.yaml` e `packages/contracts/asyncapi/business-events.asyncapi.yaml` (fonte: `specs/005-negocio-filiais-onboarding/contracts/`), rodar `pnpm contracts:generate` e incluir as ações novas em `packages/contracts/rbac/permissions.yaml`, com `audit_category` nas que REQ-NEG-071 lista.
- [ ] T005 [P] Adicionar ao esquema de `packages/platform/config/` as chaves `BRASILAPI_BASE_URL`, `NOMINATIM_BASE_URL`, `NOMINATIM_USER_AGENT` (genérico), `CLOUDFLARE_PURGE_TOKEN` (`secret: true`), `CDN_BASE_URL` e `MEDIA_MAX_BYTES`, e atualizar o `.env.example`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: tabelas, registro global de slugs, verticais, termos e as bibliotecas `geo` e `media`.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T006 [P] Teste do normalizador e validador de slug em `services/tenancy/src/slugs/normalize.test.ts`: NFD sem acentos, minúsculas, `[a-z0-9-]`, 3 a 50 caracteres, sem hífen nas pontas, e recusa de reservados e ofensivos (REQ-NEG-040).
- [ ] T007 [P] Teste da corrida de slug em `services/tenancy/src/slugs/race.int.test.ts`: dois pedidos simultâneos do mesmo slug resultam em exatamente um vencedor (`data-model.md` `tenancy_slug_registry.slug`).
- [ ] T008 [P] Teste de `packages/platform/geo` em `packages/platform/geo/src/geo.test.ts`: CEP pela BrasilAPI, geocodificação com cache e limite de 1 req/s do Nominatim, e falha que devolve "marcar no mapa"; a consulta ao Nominatim nunca leva complemento e, com `address_visibility = neighborhood`, também não leva o número (só rua, bairro, cidade, UF e CEP), verificado pela requisição capturada (CONST IV, REQ-NEG-051).
- [ ] T009 [P] Teste de `packages/platform/media` em `packages/platform/media/src/media.test.ts`: limite de tamanho, conversão para AVIF e WebP em 3 larguras, gravação no R2 (MinIO em dev) e URL em `cdn.koovela.com` (REQ-NEG-056); a imagem servida não tem EXIF, GPS nem outros metadados, verificado com uma foto de teste que traz localização (regra de dados pessoais da spec, "fotos enviadas passam por remoção de metadados").

### Implementação da fundação

- [ ] T010 Criar as migrações globais em `services/tenancy/migrations/0101_business_globals.ts`, em `koovela_platform`:
  - `tenancy_slug_registry`: PK `slug`; CHECK em `data-model.md` `tenancy_slug_registry.state` e `tenancy_slug_registry.kind` (só `business`); `redirect_to`;
  - `tenancy_reserved_term`, `tenancy_vertical` e `tenancy_terms_document`;
  - `platform_setting`;
  - em `koovela_projections`, a `business_slug` (que já existe pela 003) passa a ter o `tenancy` como dono de escrita.
- [ ] T011 Criar as migrações do schema do tenant em `services/tenancy/migrations/0102_business_tenant.ts`:
  - `tenancy_client_profile`;
  - `tenancy_business`: CHECK em `data-model.md` `tenancy_business.state` e `tenancy_business.price_display`; `tenancy_business.name` com 1 a 80 caracteres; `tenancy_business.description` com até 1.000;
  - `tenancy_branch`: CHECK em `tenancy_branch.state` e `tenancy_branch.address_visibility`; UNIQUE `(business_id, slug)`;
  - `tenancy_opening_hours` e `tenancy_hours_exception`;
  - `tenancy_terms_acceptance` (append-only);
  - `tenancy_onboarding_progress`, `tenancy_publication_readiness`, `tenancy_page_visit_daily` e `tenancy_audit_outbox`.
- [ ] T012 Semear `tenancy_vertical` com as categorias da DF 4.1 (cluster A ativo, cluster B com `price_display = never` e `health_restrictions = true`, fases 2 e 3 desativadas) e `tenancy_reserved_term` com as rotas, os subdomínios e `.well-known`, em `services/tenancy/seeds/verticals.ts` (`data-model.md` `tenancy_vertical.vocabulary`, `tenancy_vertical.phase`, `tenancy_vertical.enabled`; REQ-NEG-002/003).
- [ ] T013 Implementar o registro de slugs em `services/tenancy/src/slugs/registry.ts`: reservar por `INSERT` com `data-model.md` `tenancy_slug_registry.kind = business` (slug de filial não entra no registro global), ativar na publicação, nunca liberar `redirect` nem `blocked`, e manter a projeção `business_slug` por evento com invalidação do cache `slug:{slug}` (research R2; REQ-NEG-042).
- [ ] T014 [P] Implementar `packages/platform/geo/src/{cep,geocode,rate-limit}.ts`: BrasilAPI, Nominatim com cache Redis e fila de 1 req/s, e cálculo do centróide do bairro (research R6). A função `geocode(address, visibility)` monta a consulta sem complemento e, quando `visibility = neighborhood`, também sem número; o ponto exato é ajustado pelo Proprietário no mapa.
- [ ] T015 [P] Implementar `packages/platform/media/src/{upload,transform}.ts`: `sharp` para AVIF e WebP em 3 larguras, com remoção explícita de todos os metadados (EXIF, GPS, XMP, IPTC; nunca `withMetadata`) e orientação aplicada antes, R2 e URL do CDN. O original enviado não é guardado.
- [ ] T016 Implementar os documentos de termos e o aceite em `services/tenancy/src/client-profile/terms.ts`: registro append-only com hash, versão, IP, aparelho e horário (`data-model.md` `tenancy_terms_acceptance.document_sha256`, `tenancy_terms_acceptance.version`; REQ-NEG-061), com `audit.record()` da 004 na mesma transação (REQ-NEG-071), mais `pnpm koovela terms publish --version` em `tools/koovela-cli/src/commands/terms.ts`.
- [ ] T017 Implementar a máquina de estados do negócio e da filial em `services/tenancy/src/business/states.ts` e `services/tenancy/src/branches/states.ts`, com as transições de `data-model.md` §4, auditoria pela 004 e eventos `tenancy.business.changed` e `tenancy.branch.changed` (REQ-NEG-071).
- [ ] T018 Atualizar o plugin `services/gateway/src/plugins/tenant-resolution.ts` para ler a projeção `business_slug`, com cache Redis de TTL 5 min, e responder 301 a slug `redirect` (REQ-NEG-072).

**Checkpoint**: slugs, verticais, termos e as bibliotecas `geo` e `media` prontos.

---

## Phase 3: User Story 1 - Autônomo pronto para receber agendamento em minutos (Priority: P1) 🎯 MVP

**Goal**: o caminho "trabalho sozinho(a)" cria o Cliente, provisiona o tenant e cria o negócio com a filial única automática. A pessoa recebe os papéis de Proprietária e Colaboradora. A lista de prontidão leva à publicação, com link e QR, sem as palavras "filial", "colaborador" ou "comissão".

**Independent Test**: uma pessoa sem conta percorre o onboarding do autônomo até ver o link publicado, com o tempo medido (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T019 [P] [US1] Teste de contrato de `startOnboarding`, `getOnboardingProgress`, `checkSlug`, `getReadiness` e `publishBusiness` em `services/tenancy/src/http/onboarding.contract.test.ts`.
- [ ] T020 [P] [US1] Teste de integração em `services/tenancy/src/onboarding/solo.int.test.ts`:
  - provisionamento pedido de forma idempotente (002);
  - filial única criada em silêncio;
  - papéis `owner` e `professional` pelo contrato do `identity`;
  - pessoa que já é Colaboradora em outro tenant reaproveita a mesma `staff_account` e só ganha o vínculo `owner` no tenant novo (edge case);
  - evento `tenancy.client.onboarded.v1` com `path=solo`;
  - progresso retomado em outro aparelho (`data-model.md` `tenancy_onboarding_progress.steps`; REQ-NEG-010/011/013/014).
- [ ] T021 [P] [US1] Teste da prontidão em `services/tenancy/src/business/readiness.int.test.ts`:
  - publicar exige termos, serviço publicado e profissional com horário (`data-model.md` `tenancy_publication_readiness.terms_ok`, `tenancy_publication_readiness.has_published_service`, `tenancy_publication_readiness.has_professional_with_hours`);
  - KYC e assinatura não bloqueiam (REQ-NEG-016).
- [ ] T022 [P] [US1] Teste E2E em `apps/tenant-web/e2e/onboarding-solo.spec.ts`: fluxo O01 a O05 completo com stubs de eventos de 006 e 007; nenhuma ocorrência das palavras "filial", "colaborador" ou "comissão"; axe; tempo medido (SC-001).

### Implementation for User Story 1

- [ ] T023 [US1] Implementar a orquestração do onboarding em `services/tenancy/src/onboarding/orchestrator.ts`:
  - gera o `tenant_id`;
  - pede o provisionamento (002);
  - cria a Proprietária pelo contrato do `identity`, reaproveitando a `person` e a `staff_account` do e-mail verificado quando já existirem (mesmo caminho da T053 da 003);
  - cria o negócio com a vertical e, no caminho solo, a filial única com `timezone` padrão (`data-model.md` `tenancy_branch.timezone`);
  - grava o caminho em `data-model.md` `tenancy_client_profile.onboarding_path` e salva o progresso a cada passo (research R3).
- [ ] T024 [US1] Implementar a espera do provisionamento em `services/tenancy/src/onboarding/provisioning-wait.ts`: consulta a cada 3 s; depois de 2 min, segue em segundo plano e manda e-mail ao terminar.
- [ ] T025 [US1] Implementar a prontidão de publicação por eventos (`catalog.service.published.v1`, `workforce.professional.availability_set.v1` e `tenancy.terms.accepted.v1`) em `services/tenancy/src/business/readiness.ts`, mais a publicação e a despublicação com a ativação do slug e `audit.record()` na mesma transação (REQ-NEG-015/016/071).
- [ ] T026 [US1] Implementar as rotas `/v1/onboarding/*`, `/v1/slugs/availability` (com sugestões) e `/v1/tenant/businesses*` (criar, editar, prontidão, publicar, despublicar) em `services/tenancy/src/http/{onboarding,business}.ts`.
- [ ] T027 [US1] Implementar `pnpm koovela fake-event <tipo> …` em `tools/koovela-cli/src/commands/fake-event.ts`, para simular os eventos de 006 e 007 enquanto elas não existem.
- [ ] T028 [P] [US1] Implementar as telas O01 a O05 em `apps/tenant-web/src/routes/onboarding/` (O03 e O05 só como passos encadeados que delegam às specs 006, 012 e 017) e a lista de passos no P01 em `apps/tenant-web/src/routes/dashboard/SetupChecklist.tsx`, usando o vocabulário da vertical.

**Checkpoint**: o autônomo publica o próprio link (quickstart §1).

---

## Phase 4: User Story 2 - Rede com várias filiais (Priority: P1)

**Goal**: caminho rede com várias filiais, cada uma com endereço, geolocalização, fuso e estado; clonagem em rascunho; encerramento seguro; categoria única por negócio.

**Independent Test**: criar 3 filiais, clonar uma e conferir que a nova herda a configuração e fica em rascunho (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T029 [P] [US2] Teste de contrato de `createBranch`, `updateBranch`, `cloneBranch` e `changeBranchState` em `services/tenancy/src/http/branches.contract.test.ts`.
- [ ] T030 [P] [US2] Teste de integração em `services/tenancy/src/branches/branches.int.test.ts`:
  - clonagem copia horário, exceções futuras e exibição, mas não endereço, telefone e equipe; nasce `draft` (`data-model.md` `tenancy_branch.cloned_from_branch_id`; REQ-NEG-021);
  - encerrar com agendamentos futuros é recusado (*stub* da 009);
  - encerrar a última filial ativa despublica o negócio (REQ-NEG-023);
  - categoria diferente da do negócio é recusada (REQ-NEG-005);
  - o Gerente edita só a própria filial; outra filial responde 404 (REQ-NEG-070);
  - a Recepção lê filiais, horários e negócio, e qualquer escrita responde 403 (REQ-NEG-070).

### Implementation for User Story 2

- [ ] T031 [US2] Implementar o CRUD de filiais em `services/tenancy/src/branches/branches.ts`:
  - endereço cifrado (`data-model.md` `tenancy_branch.address`, `tenancy_branch.contact_phone`);
  - geolocalização pelo `packages/platform/geo` em `data-model.md` `tenancy_branch.geo_point` (e `tenancy_business.geo_point` da filial principal), com `tenancy_branch.public_geo_point` no centróide do bairro quando o endereço está oculto; a geocodificação respeita a regra de envio mínimo da T014;
  - `address_visibility` com ponto público no centróide (`data-model.md` `tenancy_branch.address_visibility`; REQ-NEG-051);
  - slug de filial único no negócio (`data-model.md` `tenancy_branch.slug`, UNIQUE `(business_id, slug)`; REQ-NEG-043).
- [ ] T032 [US2] Implementar a clonagem em `services/tenancy/src/branches/clone.ts`, com evento `tenancy.branch.cloned.v1` para a 006 (a 007 não consome: comissão é por negócio), e o encerramento com redirecionamento do link da filial para o negócio.
- [ ] T033 [US2] Implementar as rotas `/v1/tenant/branches*` em `services/tenancy/src/http/branches.ts`.
- [ ] T034 [P] [US2] Implementar a tela P25 (Filiais: criar e clonar) em `apps/tenant-web/src/routes/branches/` e o passo O02 do caminho rede, com o mapa MapLibre e tiles OpenFreeMap para marcar o ponto.
- [ ] T035 [US2] Medir a clonagem do clique até a ativação em ≤ 10 min de trabalho, num roteiro E2E em `apps/tenant-web/e2e/branch-clone.spec.ts` (REQ-NEG-022, SC-002).

**Checkpoint**: rede com filiais e clonagem.

---

## Phase 5: User Story 3 - Slug, link e QR que nunca quebram (Priority: P1)

**Goal**: slug estável, troca só pelo Suporte com 301 permanente e sem reutilização, QR para tela e impressão com origem marcada, links universais e pré-visualização em redes sociais.

**Independent Test**: publicar, baixar e escanear o QR; trocar o slug pelo suporte e confirmar que o QR antigo continua funcionando (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T036 [P] [US3] Teste de contrato de `getQr` e `supportChangeSlug` em `services/tenancy/src/http/slugs.contract.test.ts`.
- [ ] T037 [P] [US3] Teste de integração em `services/tenancy/src/slugs/change.int.test.ts`:
  - depois de publicado, o Proprietário não edita o slug (REQ-NEG-041);
  - o Suporte troca com justificativa e auditoria;
  - o slug antigo vira `redirect` e responde 301;
  - outro negócio não reserva o slug antigo (`data-model.md` `tenancy_slug_registry.state`, `tenancy_slug_registry.redirect_to`; SC-003);
  - slug com marca de terceiro retirado pelo Suporte fica `blocked`: não redireciona e nunca é reservado de novo (edge case).
- [ ] T038 [P] [US3] Teste E2E em `apps/consumer-web/e2e/qr-and-preview.spec.ts`: o QR aponta para `?src=qr` e o link para `?src=link`; meta tags Open Graph com nome, capa e cidade (REQ-NEG-044/047).

### Implementation for User Story 3

- [ ] T039 [US3] Implementar a troca pelo suporte em `services/tenancy/src/slugs/support-change.ts`, com evento `tenancy.slug.changed.v1`, purge da Cloudflare e auditoria; duas opções: "trocar" (antigo vira `redirect`) e "retirar e bloquear" (antigo vira `blocked`, para marca de terceiro), ambas com justificativa.
- [ ] T040 [US3] Implementar o QR em `services/tenancy/src/business/qr.ts`: SVG para tela e PDF A6 para impressão com logo e nome, por negócio e por filial.
- [ ] T041 [US3] Implementar as rotas `/v1/tenant/businesses/{id}/qr` e `/v1/admin/slugs/{slug}/change` em `services/tenancy/src/http/slugs.ts`.
- [ ] T042 [P] [US3] Implementar a tela P26 (Configurações, link e QR) em `apps/tenant-web/src/routes/settings/link-qr/`, com copiar link, baixar QR e mostrar visitas por origem.
- [ ] T043 [US3] Validar que os links universais da 001 abrem o app com `/{slug}` e a web sem bloqueio pedindo instalação, num roteiro de verificação em Android registrado em `docs/ops/decisions/qr-android-005.md` (REQ-NEG-046, SC-004).

**Checkpoint**: link e QR estáveis.

---

## Phase 6: User Story 4 - Página pública do estabelecimento e publicação (Priority: P2)

**Goal**: página pública com SSR, rápida, acessível e indexável; preço oculto em saúde, com taxa de agendamento; mensagem neutra quando indisponível; visitas contadas por origem.

**Independent Test**: preencher o perfil, publicar e abrir a página no navegador e no app (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T044 [P] [US4] Teste de contrato de `getPublicBusiness` e `uploadBusinessMedia` em `services/tenancy/src/http/public.contract.test.ts`: nenhum preço na resposta quando `price_display = never` (`data-model.md` `tenancy_business.price_display`; REQ-NEG-052).
- [ ] T045 [P] [US4] Teste de integração das visitas em `services/tenancy/src/public/visits.int.test.ts`: contadores no Redis por (negócio, filial, origem, dia), job de gravação em `tenancy_page_visit_daily` (`data-model.md` `tenancy_page_visit_daily.source`) e origem repassada em cookie para a 009 (REQ-NEG-045, SC-006).
- [ ] T046 [P] [US4] Testes de Lighthouse CI (LCP < 2,5 s no perfil 4G) e axe AA em `apps/consumer-web/e2e/public-page.spec.ts`, mais a mensagem neutra para despublicado, suspenso e filial encerrada com 200 e `noindex` (REQ-NEG-053/054/055, SC-005).

### Implementation for User Story 4

- [ ] T047 [US4] Implementar `GET /v1/public/businesses/{slug}` em `services/tenancy/src/public/business.ts`, com dados públicos, filiais com endereço ou bairro, horários e `price_display`.
- [ ] T048 [US4] Implementar a taxa de agendamento de saúde em `services/tenancy/src/business/booking-fee.ts`:
  - padrão e faixa vindos de `platform_setting` (`data-model.md` `platform_setting` chave `health_booking_fee`);
  - valor do negócio dentro da faixa (`data-model.md` `tenancy_business.booking_fee_cents`, com `tenancy_business.booking_fee_currency` = `BRL`);
  - tela do back-office em `apps/admin-web/src/routes/settings/health-booking-fee/`.
- [ ] T049 [US4] Implementar o envio de logo, capa e fotos em `services/tenancy/src/business/media.ts` (`packages/platform/media`) e o purge da Cloudflare ao publicar ou editar.
- [ ] T050 [US4] Implementar a contagem de visitas no SSR e o job horário `page-visits-flush` em `services/tenancy/src/public/visits.ts`.
- [ ] T051 [P] [US4] Implementar a página W04/W07 com SSR em `apps/consumer-web/app/routes/$slug.tsx` e `$slug.$filial.tsx`: cache `s-maxage=60, stale-while-revalidate`, mapa, meta tags e página neutra.
- [ ] T052 [P] [US4] Implementar a página C04 no app em `apps/consumer-mobile/app/business/[slug].tsx`.

**Checkpoint**: página pública no ar com as metas de desempenho e acessibilidade.

---

## Phase 7: User Story 5 - Horário de funcionamento e exceções (Priority: P2)

**Goal**: horário semanal por filial em hora local mais fuso, exceções por data, feriados sugeridos, mudança que nunca cancela agendamento, e publicação do horário para a 008.

**Independent Test**: configurar segunda a sábado com almoço e um feriado e conferir o calendário da filial (quickstart §5).

### Tests for User Story 5 ⚠️

- [ ] T053 [P] [US5] Teste de contrato de `getOpeningHours`, `setOpeningHours` e `getHolidaySuggestions` em `services/tenancy/src/http/hours.contract.test.ts`.
- [ ] T054 [P] [US5] Teste de integração em `services/tenancy/src/hours/hours.int.test.ts`:
  - intervalos sem sobreposição (`data-model.md` `tenancy_opening_hours.start_local`, `tenancy_opening_hours.end_local`);
  - exceção prevalece sobre o horário semanal (`data-model.md` `tenancy_hours_exception.kind`, `tenancy_hours_exception.confirmed`);
  - filial em `America/Manaus` mostrada no próprio fuso;
  - mudança com agendamentos fora do novo horário informa a contagem (ou "não disponível" antes da 009) e não cancela nada (REQ-NEG-030/031/032, SC-008).

### Implementation for User Story 5

- [ ] T055 [US5] Implementar o horário e as exceções em `services/tenancy/src/hours/hours.ts`, com evento `tenancy.branch.hours_changed.v1` e o contrato de leitura para a 008 (REQ-NEG-033).
- [ ] T056 [US5] Implementar a sugestão de feriados nacionais, estaduais e municipais com `date-holidays` em `services/tenancy/src/hours/holidays.ts`, com a origem gravada em `data-model.md` `tenancy_hours_exception.source`.
- [ ] T057 [US5] Implementar as rotas `/v1/tenant/branches/{id}/opening-hours` e `/holiday-suggestions` em `services/tenancy/src/http/hours.ts`, editáveis pelo Gerente da filial.
- [ ] T058 [P] [US5] Implementar a tela P18 (Horário de funcionamento) em `apps/tenant-web/src/routes/hours/` e o passo O04 (parte do horário de funcionamento).

**Checkpoint**: horário por filial publicado para a agenda.

---

## Phase 8: User Story 6 - Dados cadastrais do Cliente e aceite dos termos (Priority: P2)

**Goal**: Cliente PF ou PJ com documento validado e cifrado, consulta de CNPJ, endereço fiscal e aceite de termos com evidência. Uma versão nova dos termos bloqueia o painel até ser aceita.

**Independent Test**: cadastrar um negócio PF e um PJ, aceitar os termos e conferir o registro do aceite (quickstart §6).

### Tests for User Story 6 ⚠️

- [ ] T059 [P] [US6] Teste de contrato de `upsertClientProfile`, `lookupCnpj`, `getCurrentTerms` e `acceptTerms` em `services/tenancy/src/http/client-profile.contract.test.ts`.
- [ ] T060 [P] [US6] Teste de integração em `services/tenancy/src/client-profile/profile.int.test.ts`:
  - CPF e CNPJ por dígito verificador, cifrados e com HMAC (`data-model.md` `tenancy_client_profile.document`, `tenancy_client_profile.person_type`, `tenancy_client_profile.fiscal_address`);
  - o CPF nunca é enviado a serviço externo;
  - aceite com hash, versão, IP, aparelho e horário (SC-007);
  - versão nova dos termos faz qualquer rota do painel, exceto a de aceite, responder `tenancy.terms_acceptance_required`.

### Implementation for User Story 6

- [ ] T061 [US6] Implementar o perfil do Cliente em `services/tenancy/src/client-profile/profile.ts`: só o Proprietário edita, com auditoria; recebedor por negócio (`data-model.md` `tenancy_business.payee_level`; REQ-NEG-063).
- [ ] T062 [US6] Implementar a consulta de CNPJ pela BrasilAPI, com confirmação, em `services/tenancy/src/client-profile/cnpj.ts`.
- [ ] T063 [US6] Implementar o bloqueio por versão nova dos termos no gateway em `services/gateway/src/plugins/terms-gate.ts`.
- [ ] T064 [US6] Implementar as rotas `/v1/tenant/client-profile`, `/v1/tenant/cnpj-lookup/{cnpj}` e `/v1/tenant/terms` em `services/tenancy/src/http/client-profile.ts`.
- [ ] T065 [P] [US6] Implementar no `tenant-web` a tela de dados cadastrais e a tela de aceite dos termos, com o texto deixando claro que a Koovela intermedeia e não executa o serviço, em `apps/tenant-web/src/routes/settings/client-profile/` e `apps/tenant-web/src/routes/terms/` (REQ-NEG-062).

**Checkpoint**: cadastro fiscal e aceite com evidência.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T066 [P] Registrar os casos de isolamento das rotas desta spec em `services/tenancy/src/isolation.cases.ts`: negócio, filial, horário, perfil e visitas de outro tenant respondem 404.
- [ ] T067 [P] Adicionar `pnpm test:pii` para `tenancy_client_profile` e `tenancy_branch`, e confirmar que nenhum evento ou log leva endereço, telefone ou documento, em `services/tenancy/src/__tests__/pii.int.test.ts`.
- [ ] T068 [P] Testes com a flag de liberação desta spec ligada e desligada (`withFlag`), cobrindo o onboarding e a página pública, em `services/tenancy/src/__tests__/flags.int.test.ts` (REQ-FLG-013).
- [ ] T069 [P] Painel Grafana "Onboarding e páginas" em `infra/observability/dashboards/onboarding.json`: funil do onboarding, tempo até a publicação, visitas por origem, fila do Nominatim e LCP real.
- [ ] T070 Escrever os runbooks `docs/ops/runbooks/{troca-de-slug,geocodificacao-falhou}.md` e a lista de telas sem protótipo em `docs/design/telas-sem-prototipo-005.md`; registrar em `docs/legal/operadores.md` os terceiros que recebem dados (Nominatim/OSM: endereço sem complemento; OpenFreeMap: IP do visitante ao baixar o mapa; BrasilAPI: só CEP e CNPJ) para a política de privacidade.
- [ ] T071 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-005.md`.
- [ ] T072 [P] Gravar o canal de aquisição no cadastro do tenant (`data-model.md` `tenancy_client_profile.acquisition_channel`, `acquisition_ref` por UTM ou código de parceiro da 038) em `services/tenancy/src/onboarding/acquisition.ts` e incluí-lo no evento de criação do cliente, para o CAC por canal do BI (023).
- [ ] T073 [P] Incluir a acessibilidade declarada da filial (`data-model.md` `tenancy_branch.accessibility`) no cadastro da filial (P05) e no evento de mudança da filial, para o filtro da vitrine (024), em `services/tenancy/src/branches/accessibility.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** (autônomo) depende da fase 2.
- **US2** (rede) depende da fase 2. Usa a orquestração de US1 no caminho rede (T023).
- **US3** (slug e QR) depende de US1 (publicação ativa o slug).
- **US4** (página pública) depende de US1 (negócio publicado). Pode correr em paralelo com US2 e US3.
- **US5** (horário) depende de US2 (filiais). Pode correr em paralelo com US4.
- **US6** (cadastro e termos) depende da fase 2 (T016). Pode correr em paralelo com US2.
- **Polish** vem depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → rotas → telas → medições.

### Parallel Opportunities

- Fase 1: T002–T005.
- Fase 2: testes T006–T009; T014 e T015 em paralelo com T010–T013.
- Depois de US1: US2, US3, US4 e US6 em paralelo; US5 depois de US2.
- As telas marcadas com [P] rodam em paralelo dentro de cada história.

---

## Parallel Example: User Story 4

```bash
# Testes primeiro, juntos:
Task: "T044 contrato público em services/tenancy/src/http/public.contract.test.ts"
Task: "T045 visitas em services/tenancy/src/public/visits.int.test.ts"
Task: "T046 Lighthouse e axe em apps/consumer-web/e2e/public-page.spec.ts"

# Páginas juntas:
Task: "T051 consumer-web $slug.tsx"
Task: "T052 consumer-mobile business/[slug].tsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: autônomo até o link publicado.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US1 → US3 (link e QR estáveis) → US4 (página pública com metas).
2. US2 → US5 (rede e horários).
3. US6 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US3 → US4 → US2 → US5 → US6 → Polish.

---

## Notes

- REQ-NEG-021 e T032 corrigidas pelo `/speckit-analyze` da 007 (2026-11-26): a clonagem não copia regras de comissão.
- T009/T015 ajustadas pelo `/speckit-analyze` da 006 (2026-11-26): remoção de metadados das fotos.
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-NEG que atende. Campos com restrição citam `data-model.md` e o campo.
- Endereço, telefone e documento nunca vão para evento ou log. O CPF nunca sai para serviço externo.
- Preço nunca aparece em saúde; todas as superfícies leem `price_display`.
- Commit por tarefa ou grupo lógico, em branch `005-negocio-filiais-onboarding`, por PR.
- T073 acrescentada na análise da 024 (2026-11-27): acessibilidade da filial.
- T072 acrescentada na análise da 023 (2026-11-27): canal de aquisição do tenant.
