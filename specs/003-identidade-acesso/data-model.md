# Data Model: Identidade e acesso (003)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md)

Espaço: `koovela_identity` (dono: `identity`). UUIDv7 em `BINARY(16)`, datas `DATETIME(6)` UTC. Colunas marcadas 🔒 são cifradas por campo (AES-256-GCM envelope) e 🔎 têm índice HMAC para busca. Nenhum código, senha ou token é guardado em claro.

---

## 1. Consumidor

### `consumer`

| Coluna | Tipo | Regra |
|---|---|---|
| `consumer_id` | PK | UUIDv7 |
| `name` | 🔒 | Etapa 1 |
| `phone` | 🔒 🔎 (`phone_hmac` UNIQUE) | E.164, etapa 1 |
| `email` | 🔒 🔎 (`email_hmac`) | Etapa 2; `email_verified_at` |
| `cpf` | 🔒 🔎 (`cpf_hmac` UNIQUE) | Etapa 2; dígito verificador |
| `birth_date` | 🔒 | Etapa 2; idade ≥ 18 |
| `profile_stage` | `1` \| `2` | — |
| `state` | `pre_registered` \| `active` \| `deactivated` \| `erasure_pending` | `pre_registered`: criado pela equipe (spec 009) com nome e celular, sem OTP; não autentica e vira `active` na primeira verificação de OTP do mesmo celular. `deactivated` não autentica |
| `last_seen_at`, `created_at`, `updated_at` | `DATETIME(6)` | — |

### `otp_challenge`

| Coluna | Regra |
|---|---|
| `challenge_id` PK | — |
| `phone_hmac` | Nunca o número em claro |
| `purpose` | `login` \| `phone_change_old` \| `phone_change_new` \| `account_deletion` |
| `code_hmac` | HMAC do código |
| `attempts` | Máximo 5 |
| `expires_at` | +5 min |
| `state` | `issued` → `verified` \| `expired` \| `exhausted` |
| `ip_trunc`, `created_at` | IP truncado; retenção 30 dias |

Limites de pedido em Redis: `otp:rl:phone:{hmac}`, `otp:rl:ip:{ip}`, `otp:rl:prefix:{ddd+4}`.

### `erasure_request`

`request_id`, `consumer_id`, `requested_at`, `state` (`registered` → tratada pela spec 022), `channel` (`app` \| `web`).

---

## 2. Pessoa, equipe e papéis

### `person`

`person_id` PK, `display_name` 🔒, `created_at`. Independente de vínculo (D31); vínculos de trabalho ficam na spec 007.

### `staff_account`

| Coluna | Regra |
|---|---|
| `account_id` PK | — |
| `person_id` | FK `person` (1:1) |
| `email` | 🔒 🔎 UNIQUE; `email_verified_at` |
| `password_hash` | argon2id, NULL se só passkey |
| `mfa_totp_secret` | 🔒, NULL se não usa TOTP |
| `mfa_enrolled_at` | Obrigatório antes de acessar dados |
| `failed_logins`, `locked_until` | 10 falhas → 15 min |
| `state` | `invited` → `active` ↔ `temporarily_locked` · `active` → `deactivated` |
| `kind` | `tenant_staff` \| `platform_admin` |

### `webauthn_credential`

`credential_id` (PK, bytes), `account_id`, `public_key`, `sign_count`, `transports`, `name`, `created_at`, `last_used_at`.

### `recovery_code`

`account_id`, `code_hash` (argon2id), `used_at`. Dez por conta, gerados no cadastro do segundo fator.

### `tenant_membership`

| Coluna | Regra |
|---|---|
| `membership_id` PK | — |
| `tenant_id` | Tenant da spec 002 |
| `person_id` | FK |
| `role` | `owner` \| `manager` \| `receptionist` \| `professional` |
| `branch_scope` | JSON com `branch_id` (Gerente e Recepção); NULL = rede (Proprietário) ou próprio (Colaborador) |
| `grants` | JSON de permissões concedidas pelo Proprietário (`manager.billing.view`, `manager.loyalty.configure`, `manager.care_note.read`) |
| `state` | `active` \| `removed` |
| `version` | Inteiro; incrementado a cada mudança (invalida o cache de autorização) |

Índice único `(tenant_id, person_id, role)`. Invariante: todo `tenant_id` com algum vínculo tem ≥ 1 `owner` ativo (verificado na transação de remoção).

### `invitation`

`invitation_id`, `tenant_id`, `email` 🔒 🔎, `role`, `branch_scope`, `invited_by`, `token_hash`, `expires_at` (+7 dias), `state` (`pending` → `accepted` \| `expired` \| `revoked`), `accepted_by_person_id`, `accepted_at`.

### `platform_admin_profile`

`account_id` (PK, FK `staff_account` com `kind=platform_admin`), `profile` (`support` \| `finance_ops` \| `growth` \| `sre`), `support_level` (`n1` \| `n2`, só Suporte), `created_by`, `state`.

---

## 3. Sessões e tokens

### `session`

| Coluna | Regra |
|---|---|
| `session_id` PK | Vai no JWT como `sid` |
| `subject_kind` | `consumer` \| `staff` \| `platform_admin` \| `support` |
| `subject_id` | `consumer_id`, `account_id` ou `support_session_id` |
| `active_tenant_id` | Equipe e suporte |
| `surface` | `consumer_app` \| `consumer_web` \| `tenant_web` \| `pro_app` \| `admin_web` |
| `device_name`, `country` | Para "Aparelhos conectados" |
| `auth_time`, `mfa_at` | Reautenticação ≤ 5 min |
| `created_at`, `last_used_at`, `idle_expires_at`, `revoked_at`, `revoked_reason` | Retenção 90 dias após o fim |

### `refresh_token`

`token_hash` (PK), `session_id`, `family_id`, `issued_at`, `rotated_at`, `replaced_by`. Apresentar um token já `rotated` → revoga a família e emite `identity.session.revoked.v1` com motivo `reuse_detected`.

Redis: `sess:revoked:{sid}` (TTL 15 min), `authz:{person_id}:{tenant_id}:v{version}`.

---

## 4. Sessão de suporte

### `support_session`

| Coluna | Regra |
|---|---|
| `support_session_id` PK | — |
| `agent_account_id` | Suporte ou SRE |
| `tenant_id` | — |
| `justification` | ≥ 20 caracteres, sem PII |
| `ticket_ref` | Opcional |
| `started_at`, `expires_at` | 30 min padrão, máximo 60 |
| `ended_at`, `end_reason` | `expired` \| `agent` \| `tenant` \| `tenant_suspended` |
| `read_only` | `true` se o tenant for suspenso durante a sessão |

### `privileged_action_log` (append-only: `INSERT`/`SELECT`; migra para a trilha da spec 004)

`action_id`, `actor_account_id`, `actor_profile`, `support_session_id` (NULL fora de sessão), `action` (id da matriz), `target_type`, `target_id`, `tenant_id`, `justification`, `ip` (completo), `request_id`, `occurred_at`, `result` (`allowed` \| `denied`).

---

## 5. Matriz de permissões

Arquivo `packages/contracts/rbac/permissions.yaml` (formato em [contracts/permissions.schema.json](./contracts/permissions.schema.json)). Não é tabela: é a fonte da qual se geram `can()` e os testes. Versão do arquivo vai em todo registro de negação.

---

## 6. Máquinas de estado

| Entidade | Transições |
|---|---|
| Consumidor | `active` → `deactivated` → `erasure_pending` (spec 022) |
| Conta de equipe | `invited` → `active` ↔ `temporarily_locked`; `active` → `deactivated` |
| Convite | `pending` → `accepted` \| `expired` \| `revoked` |
| Sessão de suporte | `open` → `ended(expired \| agent \| tenant \| tenant_suspended)` |
| Desafio OTP | `issued` → `verified` \| `expired` \| `exhausted` |

Cada transição grava evento no outbox do `identity` na mesma transação (CONST IX).
