# Implementation Plan: Identidade e acesso

**Branch**: `003-identidade-acesso` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-identidade-acesso/spec.md`

## Summary

Criar o domínio `identity` em `koovela_identity` e a camada de autenticação e autorização do `gateway`:

- consumidor global com etapa 1 por OTP (fluxo único que não revela se o número existe, Turnstile, limites em Redis) e etapa 2 cifrada por campo;
- equipe e Gestão com senha argon2id ou passkey e **segundo fator obrigatório para todos** (clarify 2026-11-25), convites, papéis por tenant com escopo de filial e permissões concedidas pelo Proprietário;
- JWT Ed25519 de 15 min + refresh rotativo com detecção de reutilização e revogação em até 1 min;
- gateway que resolve o tenant uma vez (credencial ou slug) e ignora `tenant_id` do cliente;
- matriz de permissões declarativa em `packages/contracts/rbac/permissions.yaml` com um teste por célula;
- sessão de suporte auditada e visível ao tenant;
- exclusão de conta no app e "Aparelhos conectados".

Decisões e alternativas em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; `@node-rs/argon2`; `jose` (JWT Ed25519/JWKS); `@simplewebauthn/server` e `/browser`, `react-native-passkey`; `otplib` (TOTP); `libphonenumber-js`; Cloudflare Turnstile; `ioredis`; `expo-secure-store` (apps); adaptadores `SmsProvider` e `EmailSender` (Resend em staging e produção, Mailpit e *fake* em dev e CI).

**Storage**: MySQL 8.4 `koovela_identity` (dono `identity`) e `koovela_projections.business_slug` (lida pelo gateway; preenchida pela 005); Redis (limites de OTP, revogação de sessão, cache de autorização); RabbitMQ (`identity.events`, `identity.otp.send`); OCI Vault (KEK da cifra por campo e chave de assinatura dos JWT).

**Testing**: Vitest + Testcontainers; testes gerados por célula da matriz; suíte de isolamento com credenciais reais; testes de tempo constante do OTP; testes de reutilização de refresh token; teste de "campo `@pii` em claro"; Playwright + axe nas telas de entrada, etapa 2, equipe e impersonation; React Native Testing Library nas telas do app.

**Target Platform**: `gateway` (authn/authz), `core` (domínio `identity`), `workers` (envio de OTP e e-mail, expiração de sessões de suporte); `consumer-mobile`, `consumer-web`, `tenant-web` (+ `/pro`), `pro-mobile`, `admin-web`.

**Project Type**: domínio de serviço + plugins do gateway + bibliotecas de plataforma (`authz`, `crypto`, `sms`) + telas em cinco superfícies.

**Performance Goals**: etapa 1 em até 90 s (p90) do pedido à conta; validação de credencial e autorização no gateway ≤ 5 ms p95 (cache); revogação efetiva em ≤ 1 min.

**Constraints**: nenhum código, senha ou token em claro; nenhuma PII em evento ou log; resposta de OTP idêntica em corpo e tempo; tenant nunca vindo do cliente; SMS de OTP é custo do produto (fora do R$ 0 de infraestrutura, conforme a spec).

**Scale/Scope**: CONST 6 — 500 tenants, 2.000 colaboradores e o volume de consumidores de 50 mil agendamentos/mês; matriz com ~150 ações ao fim da v1.0 × 9 papéis.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock e constraint na agenda | Sem escrita de agenda | ✅ N/A |
| G-II | Isolamento | Tenant resolvido só na borda (credencial ou slug); `tenant_id` do cliente ignorado; suíte de isolamento com credenciais reais; 404 fora do escopo | ✅ |
| G-III | Dinheiro, ledger, idempotência | Sem dinheiro | ✅ N/A |
| G-IV | Dados pessoais | Minimização (etapa 1 só nome e celular), cifra por campo com HMAC de busca, OTP só como HMAC, PII fora de eventos e logs, retenções da spec | ✅ |
| G-V | Permissões e auditoria | Matriz declarativa com um teste por célula; MFA para toda a equipe e a Gestão; reautenticação ≤ 5 min; sessão de suporte com justificativa, prazo, visibilidade e registro de cada ação | ✅ |
| G-VI | Rastreabilidade | Todos os REQ-IDN com origem; PEN-03, PEN-10 e login do Colaborador decididos no clarify | ✅ |
| G-VII | Contratos antes do código | [identity.openapi.yaml](./contracts/identity.openapi.yaml), [identity-events.asyncapi.yaml](./contracts/identity-events.asyncapi.yaml), [permissions.schema.json](./contracts/permissions.schema.json); gateway lê o slug por projeção, não por tabela da 005 | ✅ |
| G-VIII | Testes antes, invariantes | Teste por célula RBAC, isolamento, tempo constante, reutilização de token, último Proprietário | ✅ |
| G-IX | Outbox, idempotência, DLQ | Eventos pelo outbox; fila de OTP com DLQ; consumidores do cache de autorização idempotentes por `version` | ✅ |
| G-X | ARM64, migrações, observabilidade | Migrações de `koovela_identity` pelo executor da 002; métricas de OTP, entrega, gasto, reutilização | ✅ |
| G-XI | Figma, tokens, a11y | C01, C02, C09, C18, W05, W12, W20, P15, P26, G05; telas de entrada da equipe sem código no Figma (ver Riscos) | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhum motor externo de autorização; um domínio, bibliotecas compartilhadas | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/003-identidade-acesso/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── identity.openapi.yaml
    ├── identity-events.asyncapi.yaml
    └── permissions.schema.json
```

### Source Code (repository root)

```text
services/identity/
├── src/
│   ├── consumer/            # etapa 1 (OTP), etapa 2, perfil, exclusão, troca de número
│   ├── otp/                 # desafios, limites, envio assíncrono
│   ├── staff/               # contas, senha, passkey, TOTP, recuperação, bloqueio
│   ├── team/                # convites, papéis, escopo, grants, último Proprietário
│   ├── platform-admins/     # contas da Gestão
│   ├── sessions/            # emissão, refresh rotativo, revogação, aparelhos
│   ├── support-sessions/    # impersonation
│   └── http/                # rotas do identity.openapi.yaml
└── migrations/              # koovela_identity
services/gateway/src/plugins/
├── authn.ts                 # JWT, revogação, kind, sessão de suporte
├── tenant-resolution.ts     # tid da credencial ou slug → tenant
└── authz.ts                 # can() da matriz, 404/403, step-up
packages/contracts/rbac/permissions.yaml
packages/platform/authz/      # gerado: tipos, can(), gerador de testes
packages/platform/crypto/     # envelope AES-GCM, HMAC de busca
packages/platform/sms/        # SmsProvider + adaptadores
apps/consumer-mobile · consumer-web   # C01, C02, C09, C18 · W05, W12, W20
apps/tenant-web               # entrar, MFA, recuperação, convite, P15 (equipe), P26 (sessões de suporte), faixa de aviso
apps/pro-mobile               # entrar e MFA
apps/admin-web                # entrar, MFA, G05 Impersonation, contas da Gestão
```

**Structure Decision**: domínio `identity` no processo `core`; autenticação e autorização como plugins do `gateway` (onde o Princípio II manda resolver o tenant); a matriz fica em `packages/contracts` porque o CI precisa dela no repositório público (CONST 1.1.0).

## Complexity Tracking

Nenhuma violação. Escolhas que poderiam parecer complexidade e por que são mínimas:

| Item | Por que é necessário | Alternativa mais simples rejeitada |
|---|---|---|
| Cache de autorização por `(pessoa, tenant, versão)` no gateway | Mudança de papel e escopo valer na próxima requisição sem papéis no token | Papéis no JWT (valeria só após 15 min) |
| Lista de sessões revogadas em Redis | Revogação em ≤ 1 min com access token de 15 min | Access token de 1 min (refresh constante nos apps) |

## Riscos e pendências

- **Telas sem código no Figma**: entrar da equipe, segundo fator, recuperação, aceite de convite, contas da Gestão e faixa de sessão de suporte. Desenhar no protótipo antes de implementar a interface (CONST XI).
- **Provedores de SMS**: custo variável aceito em 2026-11-26 como exceção ao R$ 0, com teto diário no back-office (research R3). Falta escolher primário e alternativo por cotação e o valor inicial do teto (não bloqueia o design: há adaptador e *fake*, usado em dev, CI e staging).
- **Projeção de slug**: o gateway depende de `koovela_projections.business_slug`, preenchida pela spec 005; até lá, fixture.
- **Ajustes feitos na spec**: REQ-IDN-021 e SC-006 passam a exigir segundo fator de toda a equipe (consequência do clarify); REQ-IDN-050 e a premissa da matriz apontam para `packages/contracts/rbac/` (CONST 1.1.0).
