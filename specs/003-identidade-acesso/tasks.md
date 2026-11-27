---
description: "Lista de tarefas da spec 003 — Identidade e acesso"
---

# Tasks: Identidade e acesso

**Input**: documentos de `specs/003-identidade-acesso/` (locais, fora do repositório público).

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md); specs 001 e 002 concluídas.

**Tests**: incluídos. O Princípio VIII (portão G-VIII) exige escrever os testes primeiro. Em cada história, as tarefas de teste vêm antes e DEVEM falhar antes do código. Os testes de integração rodam com Testcontainers (MySQL, Redis, RabbitMQ reais).

**Organization**: por história de usuário (US1–US8). A ordem segue a prioridade da spec ajustada pelas dependências: a matriz (US4) vem antes da equipe (US3), e as contas da Gestão (US7) vêm antes da sessão de suporte (US5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história de usuário (US1…US8).
- Caminhos relativos à raiz do repositório `koovela/`, na estrutura do plan.md.

---

## Phase 1: Setup

**Purpose**: criar o domínio `identity`, os pacotes de plataforma novos e as dependências.

- [ ] T001 Criar o domínio `services/identity/`: `package.json`, `tsconfig.json`, plugin Fastify registrado em `KOOVELA_DOMAINS` e as pastas `src/{consumer,otp,staff,team,platform-admins,sessions,support-sessions,http}` e `migrations/`.
- [ ] T002 [P] Criar os pacotes `packages/platform/crypto/`, `packages/platform/sms/`, `packages/platform/authz/` e `packages/platform/email/` (`package.json`, `tsconfig.json`, `src/index.ts`).
- [ ] T003 [P] Adicionar as dependências fixadas por versão: `@node-rs/argon2`, `jose`, `@simplewebauthn/server`, `@simplewebauthn/browser`, `otplib` e `libphonenumber-js` nos pacotes de serviço; `react-native-passkey` e `expo-secure-store` nos apps.
- [ ] T004 [P] Copiar os contratos para `packages/contracts/openapi/identity.openapi.yaml`, `packages/contracts/asyncapi/identity-events.asyncapi.yaml` e `packages/contracts/rbac/permissions.schema.json` (fonte: `specs/003-identidade-acesso/contracts/`) e rodar `pnpm contracts:generate`.
- [ ] T005 [P] Adicionar ao esquema de `packages/platform/config/` as chaves abaixo e atualizar `.env.example`:
  - `JWT_SIGNING_KEY_REF`, `JWT_KID`, `CRYPTO_KEK_REF`, `CRYPTO_KEK_LOCAL` (só em dev), `HMAC_KEY_PHONE`, `HMAC_KEY_EMAIL`, `HMAC_KEY_CPF`, `HMAC_KEY_OTP`, `TURNSTILE_SECRET` e `HIBP_ENABLED`, com `secret: true` onde couber;
  - `SMS_PRIMARY` e `SMS_FALLBACK`;
  - `EMAIL_PROVIDER` (`resend`, `mailpit` ou `fake`).
- [ ] T006 [P] Adicionar o Mailpit em `infra/compose/dev.yml`, no endereço `mail.koovela.localhost`.

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**Purpose**: cifra por campo, tabelas de `koovela_identity`, sessões e tokens, autenticação básica no gateway, eventos e adaptadores de SMS e e-mail.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever primeiro; devem falhar)

- [ ] T007 [P] Teste de `packages/platform/crypto` em `packages/platform/crypto/src/envelope.test.ts`:
  - AES-256-GCM envelope `{key_version, nonce, ciphertext}` com ida e volta;
  - nonce único;
  - rotação de DEK lê as versões antigas;
  - HMAC determinístico por tipo de campo normalizado (REQ-IDN-004).
- [ ] T008 [P] Teste "campo `@pii` em claro" em `services/identity/src/__tests__/pii-at-rest.int.test.ts`: falha se alguma coluna 🔒 de `data-model.md` for gravada sem cifra (`consumer.name`, `consumer.phone`, `consumer.email`, `consumer.cpf`, `consumer.birth_date`, `person.display_name`, `staff_account.email`, `staff_account.mfa_totp_secret`, `invitation.email`) (CONST IV).
- [ ] T009 [P] Teste de tokens em `services/identity/src/sessions/tokens.test.ts`:
  - JWT Ed25519 com `sub`, `sid`, `kind`, `tid` e `auth_time`, sem papéis, validade de 15 min;
  - refresh opaco guardado só como hash;
  - reutilização de refresh já trocado revoga a família (`data-model.md` `refresh_token.family_id`, `refresh_token.rotated_at`; REQ-IDN-030).
- [ ] T010 [P] Teste do plugin `authn` do gateway em `services/gateway/src/plugins/authn.test.ts`: JWT inválido → 401; sessão em `sess:revoked:{sid}` → 401 na requisição seguinte; JWKS em cache.
- [ ] T011 [P] Teste dos adaptadores em `packages/platform/sms/src/sms.test.ts` e `packages/platform/email/src/email.test.ts`: o `fake` grava a mensagem para leitura; failover do primário para o alternativo; nenhum conteúdo de mensagem nos logs.

### Implementação da fundação

- [ ] T012 Implementar `packages/platform/crypto/src/{envelope,hmac,keys}.ts`: DEK por domínio e versão cifrada pela KEK do OCI Vault (KEK local em dev), HMAC por tipo, normalizadores de celular (E.164), e-mail e CPF, e job de reescrita em lote para rotação (research R9).
- [ ] T013 Criar a migração `services/identity/migrations/0001_identity_core.ts` no `koovela_identity` com:
  - `consumer`: UNIQUE em `data-model.md` `consumer.phone` (via `phone_hmac`) e `consumer.cpf` (via `cpf_hmac`); CHECK em `consumer.profile_stage` e `consumer.state`;
  - `otp_challenge`: CHECK em `otp_challenge.purpose` e `otp_challenge.state`;
  - `erasure_request`, `person`;
  - `staff_account`: UNIQUE em `staff_account.email` (via HMAC); CHECK em `staff_account.state` e `staff_account.kind`;
  - `webauthn_credential`, `recovery_code`;
  - `tenant_membership`: índice único `(tenant_id, person_id, role)`; CHECK em `tenant_membership.role` e `tenant_membership.state`;
  - `invitation`, `platform_admin_profile`;
  - `session`: CHECK em `session.subject_kind` e `session.surface`;
  - `refresh_token`, `support_session`, `privileged_action_log` (append-only) e `outbox`.
- [ ] T014 Implementar a emissão e o refresh em `services/identity/src/sessions/{issue,refresh,revoke}.ts`:
  - JWT Ed25519 com `kid` rotativo e JWKS interno;
  - refresh rotativo com `family_id`, e reutilização → revogação da família e evento `identity.session.revoked.v1` com `reuse_detected`;
  - revogação grava `sess:revoked:{sid}` com TTL de 15 min (research R5).
- [ ] T015 Implementar as durações por superfície em `services/identity/src/sessions/policy.ts`, conforme `data-model.md` `session.surface` e `session.idle_expires_at` (REQ-IDN-031).
- [ ] T016 Implementar o plugin `services/gateway/src/plugins/authn.ts`: validação do JWT pelo JWKS em cache, checagem de revogação no Redis, extração de `kind`/`sub`/`sid`/`tid`/`ss_id` e injeção do `ActorContext` em `packages/platform/tenancy` (REQ-IDN-041).
- [ ] T017 [P] Implementar `packages/platform/sms/` (`SmsProvider` com adaptadores `fake` e `generic-http` configurável, mais failover e webhook de status) e `packages/platform/email/` (`EmailSender` com `resend`, `mailpit` e `fake`, remetente `notificacoes@mail.koovela.com`) (research R3/R4).
- [ ] T018 Implementar o outbox e o publicador do `identity` e os eventos do `identity-events.asyncapi.yaml`, sem PII, em `services/identity/src/events.ts` (REQ-IDN-081).
- [ ] T019 Implementar os cookies web (`HttpOnly`, `Secure`, `SameSite=Lax`, por subdomínio) e o CSRF *double submit* com `X-Koovela-CSRF` em `services/gateway/src/plugins/cookies-csrf.ts` (REQ-IDN-033).
- [ ] T020 [P] Implementar o subcomando `pnpm koovela otp last <celular>` (leitura do adaptador `fake`) em `tools/koovela-cli/src/commands/otp.ts`.

**Checkpoint**: tokens emitidos, validados e revogados; cifra por campo testada.

---

## Phase 3: User Story 1 - Consumidor entra com celular e OTP (Priority: P1) 🎯 MVP

**Goal**: etapa 1 com nome e celular, verificada por OTP no app e na web, sem permitir descobrir quais celulares estão cadastrados e com limites anti-abuso.

**Independent Test**: no app e na web, informar nome e celular de teste, confirmar o código, chegar autenticado, sair e entrar de novo (quickstart §1).

### Tests for User Story 1 ⚠️

- [ ] T021 [P] [US1] Teste de contrato de `requestOtp`, `verifyOtp` e `refreshSession` em `services/identity/src/http/auth.contract.test.ts`.
- [ ] T022 [P] [US1] Teste de tempo constante em `services/identity/src/otp/no-enumeration.int.test.ts`: corpo idêntico e diferença de tempo estatisticamente nula entre celular cadastrado e não cadastrado (REQ-IDN-012, SC-002).
- [ ] T023 [P] [US1] Teste do desafio em `services/identity/src/otp/challenge.int.test.ts`: 6 dígitos, expiração em 5 min, até 5 tentativas e uso único (`data-model.md` `otp_challenge.code_hmac`, `otp_challenge.attempts`, `otp_challenge.expires_at`, `otp_challenge.state`; REQ-IDN-010).
- [ ] T024 [P] [US1] Teste dos limites em `services/identity/src/otp/rate-limit.int.test.ts`:
  - 60 s entre pedidos;
  - 5 por hora e 10 por dia por número;
  - 20 por hora por IP;
  - limite por prefixo;
  - Turnstile a partir do 2º pedido (REQ-IDN-011).
- [ ] T025 [P] [US1] Teste E2E em `apps/consumer-web/e2e/otp-login.spec.ts` (Playwright e axe) e teste RNTL em `apps/consumer-mobile/__tests__/otp-login.test.tsx`: etapa 1 completa e retorno à ação de origem; "reenviar" só habilita após 60 s; depois de 3 falhas de entrega registradas pelo webhook do provedor, a tela mostra o contato do suporte (edge case "SMS que não chega").

### Implementation for User Story 1

- [ ] T026 [US1] Implementar o desafio OTP em `services/identity/src/otp/challenge.ts`: código CSPRNG, `code_hmac`, `phone_hmac` sem número em claro e IP truncado (`data-model.md` `otp_challenge.phone_hmac`, `otp_challenge.ip_trunc`).
- [ ] T027 [US1] Implementar os limites Redis de janela deslizante (`otp:rl:phone`, `otp:rl:ip`, `otp:rl:prefix`) e a verificação Turnstile em `services/identity/src/otp/rate-limit.ts`.
- [ ] T028 [US1] Implementar o envio assíncrono pela fila `identity.otp.send` no `workers`, com resposta HTTP de tempo fixo, em `services/identity/src/otp/send-worker.ts`.
- [ ] T029 [US1] Implementar a criação ou entrada da conta na confirmação em `services/identity/src/consumer/stage1.ts`: `consumer` com `profile_stage = 1` e sessão `consumer_app` ou `consumer_web` (`data-model.md` `consumer.profile_stage`, `consumer.state`; REQ-IDN-001/002). Se o celular já tiver um consumidor `pre_registered` (pré-cadastro da 009), a verificação do OTP assume essa conta (vira `active`, mantém o `consumer_id` e os agendamentos) em vez de criar outra; o nome informado pela pessoa prevalece.
- [ ] T030 [US1] Implementar `POST /v1/auth/otp/request`, `POST /v1/auth/otp/verify` e `POST /v1/auth/refresh` em `services/identity/src/http/auth.ts`.
- [ ] T031 [P] [US1] Implementar as telas C01 e C02 em `apps/consumer-mobile/src/app/(auth)/` (refresh no `expo-secure-store`) e W05 em `apps/consumer-web/src/routes/entrar/`, com Turnstile, contador de 60 s para "reenviar" e contato do suporte após 3 falhas de entrega (lidas do estado de entrega do desafio).
- [ ] T032 [US1] Adicionar as métricas de gasto diário e taxa de entrega de SMS e os alertas em `infra/observability/alerts/identity.yml`, com o limite de gasto lido do back-office (REQ-IDN-013).

**Checkpoint**: consumidor entra com OTP no app e na web (quickstart §1).

---

## Phase 4: User Story 2 - Consumidor completa a etapa 2 quando necessário (Priority: P1)

**Goal**: e-mail, CPF e data de nascimento coletados só quando a ação exige, cifrados, únicos e mascarados, com volta à ação.

**Independent Test**: com uma conta de etapa 1, preencher a etapa 2 pelo perfil e conferir os dados mascarados e cifrados (quickstart §2).

### Tests for User Story 2 ⚠️

- [ ] T033 [P] [US2] Teste de contrato de `getConsumerProfile` e `updateConsumerProfile` em `services/identity/src/http/consumer.contract.test.ts`.
- [ ] T034 [P] [US2] Teste de integração em `services/identity/src/consumer/stage2.int.test.ts`:
  - CPF com dígito inválido é recusado;
  - CPF de outra conta é recusado sem revelá-la (REQ-IDN-005);
  - menor de 18 anos é recusado (REQ-IDN-006);
  - e-mail só vale com `email_verified_at`.

### Implementation for User Story 2

- [ ] T035 [US2] Implementar a etapa 2 em `services/identity/src/consumer/stage2.ts`: validação de CPF, unicidade por `cpf_hmac`, idade ≥ 18, confirmação de e-mail por link de uso único (24 h) e `profile_stage = 2` (`data-model.md` `consumer.cpf`, `consumer.birth_date`, `consumer.email`; REQ-IDN-003).
- [ ] T036 [US2] Implementar `GET` e `PATCH /v1/consumer/me` com mascaramento de CPF e telefone e o erro `identity.stage2_required` com `return_to`, em `services/identity/src/http/consumer.ts` (REQ-IDN-071).
- [ ] T037 [P] [US2] Implementar as telas C09 em `apps/consumer-mobile/src/app/perfil/etapa-2.tsx` e W12 em `apps/consumer-web/src/routes/perfil/etapa-2.tsx`, com volta à ação.

**Checkpoint**: etapa 2 completa e mascarada.

---

## Phase 5: User Story 4 - Permissões declarativas, testadas célula por célula (Priority: P1)

**Goal**: matriz `permissions.yaml` como fonte única. Dela saem `can()` e um teste por célula; o CI bloqueia qualquer divergência e nega ação sem célula.

**Independent Test**: `pnpm rbac:generate && pnpm test --filter authz` mostra todas as células verdes; mudar uma célula sem atualizar a matriz faz o CI falhar (quickstart §4).

### Tests for User Story 4 ⚠️

- [ ] T038 [P] [US4] Teste do gerador em `packages/platform/authz/src/__tests__/generator.test.ts`: YAML válido pelo `permissions.schema.json`; um teste por célula `(papel × ação × escopo)`; papel ausente = `deny`; `pending: PEN-##` gera `deny`.
- [ ] T039 [P] [US4] Teste de `can()` em `packages/platform/authz/src/can.test.ts`:
  - `allow_scoped` respeita `data-model.md` `tenant_membership.branch_scope`;
  - `allow_if_granted` respeita `tenant_membership.grants`;
  - os papéis se somam;
  - recurso de outro escopo → 404 e ação sem permissão → 403 (REQ-IDN-052/056).
- [ ] T040 [P] [US4] Teste do verificador de contratos em `tools/contracts-check/__tests__/rbac-actions.test.ts`: operação do OpenAPI sem `x-koovela-action`, ou com ação fora da matriz, falha o `pnpm contracts:check`.

### Implementation for User Story 4

- [ ] T041 [US4] Escrever `packages/contracts/rbac/permissions.yaml` (versão 1) derivado da DF 7. Inclui as ações desta spec e das 001/002 com os 9 papéis e as células especiais:
  - `manager.billing.view` e `manager.loyalty.configure` como `allow_if_granted` (PEN-03, REQ-IDN-053);
  - `care_note.read` conforme REQ-IDN-054;
  - ações `allow_in_support_session` conforme REQ-IDN-063;
  - `team.revoke_sessions` permitida só ao Proprietário (REQ-IDN-032).
- [ ] T042 [US4] Implementar o gerador `pnpm rbac:generate` em `packages/platform/authz/src/generator/`: tipos TypeScript, `can(actor, action, resource)` e um arquivo Vitest por ação em `packages/platform/authz/src/generated/__tests__/`.
- [ ] T043 [US4] Implementar o plugin `services/gateway/src/plugins/authz.ts`:
  - lê o `x-koovela-action` da rota;
  - monta o contexto de autorização pelo cache `authz:{person_id}:{tenant_id}:v{version}` (`data-model.md` `tenant_membership.version`);
  - aplica 404 ou 403;
  - exige reautenticação nas ações `sensitive` (`data-model.md` `session.auth_time` e `session.mfa_at` há no máximo 5 min, senão `identity.step_up_required`; REQ-IDN-022);
  - registra a negação com a versão da matriz.
- [ ] T044 [US4] Implementar a regra `rbac-actions` em `tools/contracts-check/` e torná-la parte de `pnpm contracts:check` no `.github/workflows/pr.yml` (REQ-IDN-051, SC-003).
- [ ] T045 [US4] Implementar a auditoria automática das ações `audit: true` em `privileged_action_log` no plugin `authz`, mais um teste que falha se um endpoint administrativo não registrar (`data-model.md` `privileged_action_log.action`, `privileged_action_log.result`; REQ-IDN-080).

**Checkpoint**: autorização declarativa e testada célula por célula.

---

## Phase 6: User Story 3 - Equipe do estabelecimento entra com segurança (Priority: P1)

**Goal**: e-mail confirmado, senha forte ou passkey, segundo fator obrigatório para toda a equipe, convites, papéis por tenant, último Proprietário protegido e troca de tenant ativo.

**Independent Test**: criar uma Proprietária, ativar o segundo fator, convidar uma Recepção, aceitar em outro navegador e conferir o que cada uma vê (quickstart §3).

### Tests for User Story 3 ⚠️

- [ ] T046 [P] [US3] Teste de contrato de `staffLogin`, `staffMfa`, `passkeyOptions`, `passkeyVerify`, `stepUp`, `switchTenant`, `inviteTeamMember`, `updateTeamMember`, `removeTeamMember` e `acceptInvitation` em `services/identity/src/http/staff.contract.test.ts`.
- [ ] T047 [P] [US3] Teste de credenciais em `services/identity/src/staff/credentials.int.test.ts`:
  - senha com menos de 12 caracteres ou vazada (HIBP *range*, com lista local de fallback) é recusada;
  - argon2id;
  - 10 falhas → bloqueio de 15 min e e-mail (`data-model.md` `staff_account.failed_logins`, `staff_account.locked_until`; REQ-IDN-020/026).
- [ ] T048 [P] [US3] Teste do segundo fator em `services/identity/src/staff/mfa.int.test.ts`:
  - sem `mfa_enrolled_at` não há acesso a dados;
  - TOTP com janela ±1;
  - 10 códigos de recuperação de uso único;
  - passkey conta como dois fatores (`data-model.md` `staff_account.mfa_enrolled_at`, `recovery_code.used_at`; REQ-IDN-021/027, SC-006).
- [ ] T049 [P] [US3] Teste da equipe em `services/identity/src/team/team.int.test.ts`:
  - convite de 7 dias e uso único (`data-model.md` `invitation.expires_at`, `invitation.state`);
  - remover o último Proprietário é recusado (REQ-IDN-025);
  - remover um papel encerra as sessões afetadas em ≤ 1 min (REQ-IDN-032, SC-007);
  - `switch-tenant` emite uma nova credencial (REQ-IDN-023);
  - o Proprietário encerra as sessões de um membro sem remover o papel, e elas caem em ≤ 1 min (REQ-IDN-032);
  - a lista da equipe mostra quem aceitou cada convite e quando (`data-model.md` `invitation.accepted_by_person_id`, `invitation.accepted_at`).
- [ ] T050 [P] [US3] Teste E2E em `apps/tenant-web/e2e/staff-auth.spec.ts`: entrar, cadastrar MFA, convidar, aceitar e ver só a filial do escopo, com axe.

### Implementation for User Story 3

- [ ] T051 [US3] Implementar as contas de equipe em `services/identity/src/staff/{account,password,lockout}.ts`: e-mail confirmado, argon2id com parâmetros OWASP (`data-model.md` `staff_account.password_hash`, NULL só quando a conta usa apenas passkey), HIBP *range* com fallback e bloqueio (research R4).
- [ ] T052 [US3] Implementar o segundo fator em `services/identity/src/staff/{totp,webauthn,recovery}.ts`: TOTP (`otplib`), passkey (`@simplewebauthn/server`) e 10 códigos de recuperação com argon2id (`data-model.md` `staff_account.mfa_totp_secret`, `webauthn_credential.sign_count`).
- [ ] T053 [US3] Implementar convites, papéis e escopo em `services/identity/src/team/{invitations,memberships}.ts`:
  - token de uso único guardado como hash;
  - verificação transacional do último Proprietário com `SELECT … FOR UPDATE`;
  - incremento de `tenant_membership.version`;
  - evento `identity.staff.changed`, que invalida o cache e revoga as sessões (research R10);
  - no aceite, cria a `person` global e a `staff_account` ou reaproveita as existentes do mesmo e-mail verificado (REQ-IDN-007), e grava `invitation.accepted_by_person_id` e `invitation.accepted_at`;
  - revogação das sessões de um membro pelo Proprietário, sem remover o papel (REQ-IDN-032).
- [ ] T054 [US3] Implementar as rotas `/v1/auth/staff/*`, `/v1/auth/passkey/*`, `/v1/auth/step-up`, `/v1/auth/switch-tenant`, `/v1/tenant/team/*` (inclusive `DELETE /v1/tenant/team/members/{membership_id}/sessions`, ação `team.revoke_sessions`) e `/v1/invitations/{token}/accept` em `services/identity/src/http/staff.ts`.
- [ ] T055 [US3] Implementar `pnpm koovela staff create-owner --tenant --email` em `tools/koovela-cli/src/commands/staff.ts`, criando `person`, `staff_account` e o vínculo `owner` pelo mesmo caminho do aceite de convite (REQ-IDN-007).
- [ ] T056 [P] [US3] Implementar as telas do `tenant-web`: entrar, segundo fator, recuperação e aceite de convite em `apps/tenant-web/src/routes/auth/`, e equipe e papéis (P15) em `apps/tenant-web/src/routes/equipe/`, com quem aceitou e quando, revogar convite pendente e "encerrar sessões" por membro. As telas sem protótipo seguem os componentes da 001.
- [ ] T057 [P] [US3] Implementar entrar e segundo fator no `pro-mobile` em `apps/pro-mobile/app/(auth)/`, com passkey via `react-native-passkey` e refresh no `expo-secure-store`.

**Checkpoint**: equipe entra com segundo fator e vê só o que o papel permite.

---

## Phase 7: User Story 6 - Gateway resolve identidade e tenant na borda (Priority: P2)

**Goal**: o tenant vem só da credencial (equipe e suporte) ou do slug (consumidor e público). Qualquer `tenant_id` enviado pelo cliente é ignorado, e a suíte de isolamento passa a usar credenciais reais.

**Independent Test**: requisições como A com `tenant_id` de B no corpo, no cabeçalho e na query são ignoradas, e recursos de B respondem 404 (quickstart §5).

### Tests for User Story 6 ⚠️

- [ ] T058 [P] [US6] Teste do plugin em `services/gateway/src/plugins/tenant-resolution.test.ts`: `tid` do token para equipe e suporte; slug em `/v1/public/{slug}/…` e `/v1/consumer/businesses/{slug}/…` resolvido pela projeção `koovela_projections.business_slug`; `tenant_id` em corpo, cabeçalho ou query descartado (REQ-IDN-040).
- [ ] T059 [P] [US6] Casos de isolamento com credenciais reais em `services/identity/src/isolation.cases.ts`: equipe de tenants diferentes, consumidor, e Gestão sem sessão de suporte → 404 (REQ-IDN-042, SC-004); a mesma pessoa com conta de consumidor e conta de equipe: a credencial de consumidor não alcança nada do painel e a de equipe não alcança os dados de consumidor, sem nenhuma permissão herdada (edge case "mesma pessoa como consumidora e como equipe").

### Implementation for User Story 6

- [ ] T060 [US6] Implementar `services/gateway/src/plugins/tenant-resolution.ts`, que preenche o `TenantContext` da 002 uma única vez por requisição.
- [ ] T061 [US6] Criar a migração da projeção `koovela_projections.business_slug` em `services/identity/migrations/0002_business_slug_projection.ts` (dono de escrita: 005) e a fixture de teste em `packages/testing/tenants/src/slugs.ts`.
- [ ] T062 [US6] Atualizar o harness de `packages/testing/isolation` para emitir credenciais reais por papel e tenant, em `packages/testing/isolation/src/credentials.ts`.

**Checkpoint**: tenant só da borda; isolamento com credenciais reais.

---

## Phase 8: User Story 7 - Contas da Gestão (Priority: P2)

**Goal**: contas Suporte, Financeiro/Ops, Comercial/Growth e SRE, criadas e desativadas só pelo SRE, com segundo fator e sem acesso a dados de tenant fora de uma sessão de suporte.

**Independent Test**: criar uma conta de Suporte, confirmar que vê "Impersonation" e não vê "Schemas", e desativá-la (as sessões caem) (quickstart §7).

### Tests for User Story 7 ⚠️

- [ ] T063 [P] [US7] Teste de contrato de `createPlatformAdmin` e `deactivatePlatformAdmin` em `services/identity/src/http/platform-admins.contract.test.ts`.
- [ ] T064 [P] [US7] Teste de integração em `services/identity/src/platform-admins/admins.int.test.ts`:
  - só o SRE cria e desativa (REQ-IDN-028);
  - perfis de `data-model.md` `platform_admin_profile.profile` e `platform_admin_profile.support_level`;
  - desativação revoga as sessões em ≤ 1 min;
  - nenhum perfil lê dados de tenant sem sessão de suporte (REQ-IDN-055).

### Implementation for User Story 7

- [ ] T065 [US7] Implementar as contas da Gestão em `services/identity/src/platform-admins/admins.ts` (`staff_account.kind = platform_admin` e `platform_admin_profile`), com evento `identity.platform_admin.changed` e lembrete de rotação de segredos na desativação.
- [ ] T066 [US7] Implementar as rotas `/v1/admin/platform-admins*` em `services/identity/src/http/platform-admins.ts` e o comando de bootstrap do primeiro SRE em `tools/koovela-cli/src/commands/staff.ts`.
- [ ] T067 [P] [US7] Implementar no `admin-web` a entrada com segundo fator em `apps/admin-web/src/routes/auth/`, a tela de contas da Gestão em `apps/admin-web/src/routes/contas/` e o menu filtrado por perfil pela matriz.
- [ ] T068 [US7] Ligar a tela G03 da 002 à permissão "Provisionar schema" da matriz, além do Cloudflare Access, em `services/tenancy/src/http/admin.ts` (REQ-TEN-052).

**Checkpoint**: Gestão com contas próprias e perfis.

---

## Phase 9: User Story 5 - Sessão de suporte (impersonation) auditada e visível (Priority: P2)

**Goal**: sessão de suporte com justificativa, prazo, só as ações permitidas, registro de cada ação, faixa de aviso e e-mail ao Proprietário, e encerramento pelo tenant.

**Independent Test**: abrir uma sessão num tenant sintético, executar uma ação permitida, deixar expirar e conferir o aviso e a lista no painel do Proprietário (quickstart §6).

### Tests for User Story 5 ⚠️

- [ ] T069 [P] [US5] Teste de contrato de `openSupportSession`, `listTenantSupportSessions`, `getActiveSupportSession` e `endSupportSessionByTenant` em `services/identity/src/http/support.contract.test.ts`.
- [ ] T070 [P] [US5] Teste de integração em `services/identity/src/support-sessions/support.int.test.ts`:
  - justificativa com menos de 20 caracteres é recusada (`data-model.md` `support_session.justification`);
  - 30 min por padrão e no máximo 60, sem renovação (`support_session.expires_at`);
  - ações fora de `allow_in_support_session` são negadas, inclusive anotação, recebedor, estorno, papéis e segundo fator (REQ-IDN-063);
  - cada requisição gera uma linha em `privileged_action_log` (REQ-IDN-061);
  - tenant suspenso → `support_session.read_only`;
  - não existe sessão de suporte em conta de consumidor (REQ-IDN-064);
  - conta que não é Suporte nem SRE não abre sessão (`data-model.md` `support_session.agent_account_id`; REQ-IDN-060).
- [ ] T071 [P] [US5] Teste E2E em `apps/tenant-web/e2e/support-banner.spec.ts`: faixa visível durante a sessão, lista com ações e encerramento pela Proprietária (SC-005).

### Implementation for User Story 5

- [ ] T072 [US5] Implementar a abertura, o token `kind = support` com `tid` e `ss_id` até o fim, o encerramento e a expiração (tarefa no `workers`) em `services/identity/src/support-sessions/{open,end,expire}.ts` (`data-model.md` `support_session.end_reason`).
- [ ] T073 [US5] Estender os plugins `authn` e `authz` do gateway para `kind = support`: só as ações `allow_in_support_session` e leitura de configurações, e registro de cada requisição em `services/gateway/src/plugins/authz.ts`.
- [ ] T074 [US5] Implementar as rotas `/v1/admin/support-sessions` e `/v1/tenant/support-sessions*` em `services/identity/src/http/support.ts`, e o e-mail ao Proprietário na abertura.
- [ ] T075 [P] [US5] Implementar a tela G05 (Impersonation) em `apps/admin-web/src/routes/impersonation/`.
- [ ] T076 [P] [US5] Implementar no `tenant-web` a faixa de aviso (consulta a cada 30 s e no foco da aba) em `apps/tenant-web/src/components/SupportBanner.tsx` e a lista de sessões com encerramento (P26) em `apps/tenant-web/src/routes/configuracoes/sessoes-suporte/`.

**Checkpoint**: impersonation auditada e visível ao tenant.

---

## Phase 10: User Story 8 - Excluir a própria conta e gerenciar sessões (Priority: P3)

**Goal**: exclusão da conta pelo app e pela web com OTP, aparelhos conectados, troca de número e proteção contra celular reciclado.

**Independent Test**: pedir a exclusão pelo app, confirmar que as sessões caem e que o celular não entra mais na conta antiga (quickstart §8).

### Tests for User Story 8 ⚠️

- [ ] T077 [P] [US8] Teste de contrato de `requestAccountDeletion`, `listMySessions` e `revokeMySession` em `services/identity/src/http/me.contract.test.ts`.
- [ ] T078 [P] [US8] Teste de integração em `services/identity/src/consumer/deletion.int.test.ts`:
  - exclusão confirmada por OTP (`otp_challenge.purpose = account_deletion`) → `consumer.state = deactivated`, sessões revogadas e linha em `erasure_request` (`data-model.md` `erasure_request.state`; REQ-IDN-070);
  - aviso quando há agendamentos futuros (*stub* da 009).
- [ ] T079 [P] [US8] Teste dos casos de borda em `services/identity/src/consumer/phone-edge.int.test.ts`:
  - troca de número com OTP nos dois números, ou e-mail verificado com data de nascimento;
  - aparelho novo em conta com etapa 2 e mais de 180 dias sem acesso pede a data de nascimento;
  - celular reciclado não toma a conta (REQ-IDN-072, SC-009).

### Implementation for User Story 8

- [ ] T080 [US8] Implementar a exclusão em `services/identity/src/consumer/deletion.ts` e a troca de número e a verificação de aparelho novo em `services/identity/src/consumer/phone-change.ts` (research R11). A troca de número publica `identity.consumer.phone_changed.v1` (só identificadores) para a 011 refazer os destinos dos avisos programados.
- [ ] T081 [US8] Implementar `GET /v1/me/sessions`, `DELETE /v1/me/sessions/{session_id}` e `POST /v1/consumer/me/deletion` em `services/identity/src/http/me.ts`, com aparelho e país vindos de `CF-IPCountry` (`data-model.md` `session.device_name`, `session.country`).
- [ ] T082 [P] [US8] Implementar o perfil com aparelhos conectados e "excluir conta" em até 3 toques (C18 em `apps/consumer-mobile/src/app/perfil/` e W20 em `apps/consumer-web/src/routes/perfil/`) (SC-008).

**Checkpoint**: autosserviço do consumidor sobre conta e sessões.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T083 [P] Teste de segurança em `services/identity/src/__tests__/account-takeover.int.test.ts`: reutilização de token, enumeração e celular reciclado não tomam nenhuma conta (SC-009).
- [ ] T084 [P] Teste de tempo da etapa 1 em `apps/consumer-web/e2e/stage1-timing.spec.ts`: do pedido à conta autenticada em ≤ 90 s no p90 da execução sintética (SC-001).
- [ ] T085 [P] Teste de desempenho do gateway em `services/gateway/bench/authz.bench.ts`: autenticação e autorização em ≤ 5 ms p95 com cache.
- [ ] T086 [P] Painel Grafana "Identity" em `infra/observability/dashboards/identity.json`: OTP pedidos e entregues, gasto de SMS, bloqueios, sessões revogadas e sessões de suporte.
- [ ] T087 [P] Escrever os runbooks `docs/ops/runbooks/{sms-nao-chega,recuperacao-segundo-fator,rotacao-chaves-identity}.md`. A recuperação sem códigos é feita pelo suporte e registrada como ação privilegiada (REQ-IDN-027).
- [ ] T088 Registrar em `docs/design/telas-sem-prototipo-003.md` as telas sem código no Figma (entrar da equipe, segundo fator, recuperação, aceite de convite, contas da Gestão e faixa de suporte) para desenho antes da revisão final da interface.
- [ ] T089 Executar o [quickstart.md](./quickstart.md) inteiro em staging e registrar o resultado em `docs/ops/decisions/validacao-003.md`.
- [ ] T090 [P] Implementar a retenção em `services/identity/src/retention/purge.ts` (job diário no `workers`, em lotes): apaga `otp_challenge` com `created_at` há mais de 30 dias (`data-model.md` `otp_challenge.ip_trunc`, retenção 30 dias) e `session` encerradas ou expiradas há mais de 90 dias, com seus `refresh_token` (`data-model.md` `session.revoked_at`, `session.idle_expires_at`, retenção 90 dias); teste em `services/identity/src/retention/purge.int.test.ts` e métrica de linhas apagadas (CONST IV).
  - Prazos e ação ao vencer lidos da tabela de retenção da 022 (`getRetentionRules`, com cache; categorias registradas em `packages/contracts/privacy/holder-ports.yaml`); os números desta tarefa são só os valores iniciais do seed da 022. O job roda pelo `applyRetention` do `HolderDataPort` do domínio, disparado pela 022 (T040 da 022), e nenhum prazo fica no código (CONST 8; análise da 022, 2026-11-27).
- [ ] T091 [US1] Implementar o pré-cadastro em `services/identity/src/consumer/pre-register.ts` e a rota interna `POST /v1/internal/identity/consumers/pre-register` (só credencial de serviço; nome e celular, sem OTP): cria `consumer.state = pre_registered` ou devolve o existente do mesmo `phone_hmac`, sem revelar dados de outro tenant; publica `identity.consumer.pre_registered.v1`. Teste em `services/identity/src/consumer/pre-register.int.test.ts`: pré-cadastro não autentica; OTP do mesmo celular assume a conta; dois tenants pré-cadastrando o mesmo celular apontam para o mesmo `consumer_id` (contrato pedido pela spec 009, REQ-AGE-041/042).
- [ ] T092 [P] Consumir `backoffice.consumer_block.changed` (021) em `services/identity/src/blocks/consumer-block.ts`: `blocked` impede login de agendamento, novos agendamentos e resgates (resposta `identity.account_blocked` com o motivo genérico e o link de revisão); `unblocked` libera; o bloqueio vale na plataforma inteira, mas nunca altera vínculos de colaborador em tenants. Teste em `services/identity/src/blocks/consumer-block.int.test.ts`.
- [ ] T093 [P] Publicar `identity.consumer.app_first_seen.v1` em `services/identity/src/sessions/app-first-seen.ts` no primeiro login de um consumidor pelo app (consumer-mobile), com `consumer_id`, `first_booking_channel` (`web` \| `app` \| `none`) e data, sem PII, para a taxa de instalação e o web → app do BI (023). Teste: o segundo login não publica de novo.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1** (OTP) depende só da fase 2.
- **US2** (etapa 2) depende de US1, porque precisa de uma conta de etapa 1.
- **US4** (matriz) depende da fase 2. Pode correr em paralelo com US1 e US2.
- **US3** (equipe) depende de US4, porque o `authz` decide o que cada papel vê.
- **US6** (tenant na borda) depende de US3 (`tid` da equipe) e da fixture de slug.
- **US7** (Gestão) depende de US4 e US3, porque reusa as credenciais de equipe.
- **US5** (suporte) depende de US7 (conta de Suporte) e de US4 (`allow_in_support_session`).
- **US8** (exclusão) depende de US1.
- **Polish** depois das histórias.

### Within Each User Story

- Testes primeiro (falhando) → domínio → HTTP → gateway → telas → alertas e runbooks.

### Parallel Opportunities

- Fase 1: T002–T006.
- Fase 2: testes T007–T011; T017 e T020 junto com T012–T016.
- Depois da fase 2: US1 e US4 em paralelo; depois US2 e US8, em paralelo com US3.
- Telas de app e web marcadas com [P] em paralelo dentro de cada história.

---

## Parallel Example: User Story 3

```bash
# Testes primeiro, juntos:
Task: "T046 contrato em services/identity/src/http/staff.contract.test.ts"
Task: "T047 credenciais em services/identity/src/staff/credentials.int.test.ts"
Task: "T048 segundo fator em services/identity/src/staff/mfa.int.test.ts"
Task: "T049 equipe em services/identity/src/team/team.int.test.ts"
Task: "T050 E2E em apps/tenant-web/e2e/staff-auth.spec.ts"

# Depois do domínio e das rotas (T051–T055), as telas juntas:
Task: "T056 tenant-web auth e equipe"
Task: "T057 pro-mobile auth"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fases 1 e 2.
2. US1: consumidor entra com OTP.
3. **Parar e validar** com o quickstart §1.

### Incremental Delivery

1. US1 → US2 (consumidor completo).
2. US4 → US3 → US6 (equipe com autorização declarativa e tenant na borda; a partir daqui o isolamento usa credenciais reais).
3. US7 → US5 (Gestão e impersonation).
4. US8 → Polish.

### Observação para um desenvolvedor

Ordem sugerida: Fase 1 → Fase 2 → US1 → US2 → US4 → US3 → US6 → US7 → US5 → US8 → Polish.

---

## Notes

- T091 foi acrescentada pelo `/speckit-analyze` da 009 (2026-11-26): pré-cadastro de consumidor pela equipe.
- [P] = arquivos diferentes, sem dependência pendente.
- Cada tarefa cita o REQ-IDN que atende. Campos com restrição citam `data-model.md` e o campo.
- Nenhum código, senha, token ou PII em claro, em log ou em evento.
- O SMS de OTP é custo variável do produto, aceito como exceção à regra de R$ 0 (decisão de 2026-11-26, research R3), com teto diário no back-office e alerta (T032). A escolha dos dois provedores fica para a implementação.
- T090 foi acrescentada pelo `/speckit-analyze` de 2026-11-26 (Polish); a numeração não foi refeita.
- Commit por tarefa ou grupo lógico, em branch `003-identidade-acesso`, por PR.
- T093 acrescentada na análise da 023 (2026-11-27): evento de primeiro acesso pelo app.
- T092 acrescentada na análise da 021 (2026-11-27): aplicação do bloqueio de consumidor.
