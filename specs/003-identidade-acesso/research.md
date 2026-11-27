# Research: Identidade e acesso (003)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base herdada: 001 (Fastify, Zod, Kysely, Cloudflare, OCI Vault, observabilidade) e 002 (`koovela_identity`, resolvedor de schema, `TenantContext`, suíte de isolamento). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Domínio e espaço de dados

- **Decisão**: domínio `identity` (CONST 4.4), dono exclusivo de `koovela_identity`. Ali ficam consumidor, pessoa, conta de equipe, papéis por tenant, convites, contas da Gestão, sessões, desafios OTP, sessões de suporte, registro de ações privilegiadas e pedidos de eliminação. Os schemas de tenant guardam só `consumer_id` e `person_id`.
- **Por quê**: `[C5]` e REQ-IDN-001/023 — identidade e papéis precisam existir antes e fora de qualquer tenant; a pessoa com vínculos em vários tenants tem um login só.
- **Alternativas**: papéis dentro de cada schema de tenant (o gateway teria de consultar N schemas para listar os tenants de uma pessoa).

## R2. OTP do consumidor

- **Decisão**:
  - Fluxo único "pedir código → confirmar código" para cadastro e entrada: o código é enviado a qualquer celular válido, e só na confirmação se decide criar ou abrir a conta. Isso elimina a enumeração na origem (REQ-IDN-012); o tempo de resposta é fixo porque o envio é assíncrono (fila `identity.otp.send`).
  - Código de 6 dígitos de gerador criptográfico; guardado só como `HMAC-SHA256(código, chave)`; 5 min, 5 tentativas, uso único.
  - Limites em Redis (janela deslizante): 60 s entre pedidos, 5/h e 10/dia por número, 20/h por IP, e por prefixo de número (DDD + 4 dígitos) para bombardeio.
  - Anti-robô: **Cloudflare Turnstile** (gratuito) a partir do segundo pedido da mesma origem.
  - Celular normalizado em E.164 (`libphonenumber-js`), só números brasileiros na v1.0.
- **Por quê**: CONST 5 e DF 12; Turnstile entra no R$ 0 e já está na borda.
- **Alternativas**: verificação gerenciada do provedor (o código sai do nosso controle e o limite de anti-abuso fica na mão do provedor); reCAPTCHA (Google, coleta mais dado).

## R3. Provedor de SMS

- **Decisão**: interface `SmsProvider` em `packages/platform/sms` (como o `PaymentProvider`), com dois adaptadores configurados (primário e alternativo, REQ-IDN-edge "SMS que não chega"), escolhidos por cotação na implementação entre provedores nacionais e internacionais com entrega no Brasil. Em dev e CI, adaptador `fake` que grava a mensagem para leitura no teste (`pnpm koovela otp last <celular>`). Métricas de entrega por *webhook* de status do provedor; alerta de gasto diário e de entrega abaixo de 90% (REQ-IDN-013).
- **Por quê**: o SMS de OTP é custo do produto (fora do R$ 0 de infraestrutura, conforme Assumptions da spec); o adaptador evita aprisionamento e permite *failover*.
- **Decisão de custo (2026-11-26)**: o SMS de OTP é aceito como **custo variável do produto**, única exceção à regra de serviços de terceiros com R$ 0. O gasto fica limitado por um teto diário configurado no back-office (CONST 8), com alerta de gasto e de entrega (REQ-IDN-013) e os limites anti-abuso da REQ-IDN-011. Em dev, CI e staging com contas sintéticas, só o adaptador `fake` (custo zero).
- **Pendência não bloqueante**: escolher os dois provedores por cotação e o valor inicial do teto diário.

## R4. Credenciais da equipe e da Gestão

- **Decisão**:
  - Senha com **argon2id** (parâmetros OWASP: 19 MiB, 2 iterações), mínimo 12 caracteres, conferida contra senhas vazadas pela API de *range* do Have I Been Pwned (k-anonimato: só 5 caracteres do hash saem); se a API falhar, cai para uma lista local das 100 mil mais comuns.
  - **Passkey** (WebAuthn) com `@simplewebauthn/server` e `@simplewebauthn/browser`; no app nativo, `react-native-passkey`. Passkey conta como os dois fatores.
  - Segundo fator obrigatório para **toda** a equipe e a Gestão (clarify 2026-11-25): **TOTP** (`otplib`, 30 s, janela ±1) ou passkey; 10 códigos de recuperação de 10 caracteres, guardados com argon2id.
  - Bloqueio após 10 falhas por 15 min, com aviso por e-mail.
  - E-mail de equipe confirmado por link de uso único (24 h). Envio pelo provedor gratuito da spec 001 (Resend) com remetente `notificacoes@mail.koovela.com`; localmente, **Mailpit**.
- **Alternativas**: bcrypt (menos resistente a GPU), SMS como segundo fator (fraco contra SIM swap), WebAuthn só no navegador (exclui o app do colaborador).

## R5. Tokens e sessões

- **Decisão**:
  - **Access token**: JWT assinado com **Ed25519** (chave no OCI Vault, `kid` rotativo, JWKS publicado internamente para o gateway), validade de 15 min, com `sub`, `sid` (sessão), `kind` (`consumer` \| `staff` \| `platform_admin` \| `support`), `tid` (tenant ativo, só equipe e suporte) e `auth_time`. Sem papéis dentro do token.
  - **Refresh token**: opaco (256 bits), guardado só como hash, **rotativo** com `family_id`; reutilização de um token já trocado revoga a família inteira e avisa o titular (REQ-IDN-030).
  - **Revogação em até 1 minuto** (REQ-IDN-032): o gateway consulta, a cada requisição, um conjunto de sessões revogadas em Redis (`sess:revoked:{sid}`, com TTL igual ao do access token), alimentado por evento.
  - **Papéis e escopo na próxima requisição** (História 4, cenário 4): o gateway monta o contexto de autorização a partir de um cache Redis por `(person_id, tenant_id)` com versão, invalidado pelo evento `identity.staff.role_changed.v1`; nunca a partir do token.
  - Durações (REQ-IDN-031): consumidor 90 dias de inatividade no app e 30 na web; equipe 12 h no painel e 30 dias no app do colaborador; Gestão 8 h.
  - Web: tokens em cookies `HttpOnly`, `Secure`, `SameSite=Lax`, escopados ao subdomínio (REQ-FND-036); proteção CSRF por cabeçalho `X-Koovela-CSRF` com *double submit*. Apps: refresh token no Keychain/Keystore (`expo-secure-store`).
  - Reautenticação para ações sensíveis: `auth_time` há no máximo 5 min com segundo fator (REQ-IDN-022); o endpoint `POST /v1/auth/step-up` renova `auth_time`.
- **Alternativas**: sessão só em servidor com cookie (não serve aos apps nativos); papéis no JWT (mudança de papel só valeria após 15 min).

## R6. Gateway: identidade e tenant na borda

- **Decisão**: plugin `authn` no `gateway`:
  1. valida o JWT (JWKS em cache) e a revogação;
  2. resolve o tenant: equipe/suporte → `tid` do token; consumidor e páginas públicas → **slug** do caminho (`/v1/public/{slug}/…` e `/v1/consumer/businesses/{slug}/…`) resolvido por uma projeção `koovela_projections.business_slug` (preenchida pela spec 005; nesta spec, por fixture);
  3. descarta qualquer `tenant_id` de corpo, cabeçalho do cliente ou query para fins de escopo (há teste que manda os três e confere);
  4. carrega o contexto de autorização (R5) e injeta `TenantContext` + `ActorContext` para o resolvedor da 002.
  O gateway responde 404 para recurso de outro escopo e 403 para ação não permitida sobre recurso visível (REQ-IDN-056).
- **Por quê**: Princípio II ("tenant resolvido uma única vez, na borda").

## R7. RBAC declarativo

- **Decisão**: matriz em `packages/contracts/rbac/permissions.yaml` (CONST 1.1.0), derivada da DF 7:
  - `roles`: `consumer`, `professional`, `receptionist`, `manager`, `owner`, `support`, `finance_ops`, `growth`, `sre`;
  - `actions`: um id estável por ação (`team.invite`, `support_session.open`, `care_note.read`, …), cada uma com `scope` (`network` \| `branch` \| `self` \| `platform`);
  - `cells`: `allow` \| `deny` \| `allow_scoped` \| `allow_if_granted` (permissão que o Proprietário concede ou retira, como `manager.billing.view` e `care_note.read` do Gerente) \| `allow_in_support_session` (`✔*`).
  - Geração (`pnpm rbac:generate`): tipos TypeScript, a função `can(actor, action, resource)` em `packages/platform/authz` e **um teste Vitest por célula** (REQ-IDN-051).
  - Toda operação do OpenAPI declara `x-koovela-action`; o CI falha se a ação não existir na matriz, e ação sem célula é negada (cenário 4.2).
  - Pendências futuras entram como `deny` com `pending: PEN-##`.
- **Alternativas**: Casbin/OpenFGA (servidor ou motor extra para uma matriz pequena, fere XII); permissões no código (não testáveis célula por célula a partir da DF).

## R8. Sessão de suporte (impersonation)

- **Decisão**: `support_session` em `koovela_identity`. Abertura pelo back-office (tela **G05 · Impersonation**) com justificativa ≥ 20 caracteres, chamado opcional e duração 30 min (máximo 60, sem renovação). Emite um access token `kind=support` com `tid` e `ss_id`, válido até o fim da sessão, que o gateway só aceita para as ações `allow_in_support_session` da matriz; as proibidas (anotação, dados bancários e de recebedor, estorno, papéis, segundo fator) são negadas mesmo que a célula do Proprietário permita. Cada requisição com `ss_id` grava uma linha em `privileged_action_log`. Visibilidade: o `tenant-web` consulta `GET /v1/tenant/support-sessions/active` (a cada 30 s e no foco da aba) e mostra a faixa de aviso; e-mail ao Proprietário na abertura; lista e encerramento pelo Proprietário. Encerramento automático por prazo (tarefa no `workers` + verificação no gateway pelo `exp`). Tenant suspenso → sessão só leitura.
- **Por quê**: CONST V e J9.

## R9. Cifra por campo

- **Decisão**: `packages/platform/crypto`: **AES-256-GCM** com *envelope*: uma chave de dados (DEK) por domínio e versão, guardada cifrada pela chave mestra (KEK) do **OCI Vault**; campos cifrados guardam `{key_version, nonce, ciphertext}`. Busca por **HMAC-SHA256** com chave separada para celular, e-mail e CPF normalizados (REQ-IDN-004). Rotação: nova versão de DEK para escrita, reescrita em lote pelo `workers`. Teste falha se um campo marcado `@pii` for gravado em claro (CONST IV). Em dev, KEK local vinda do `.env`.
- **Alternativas**: cifra no banco (`AES_ENCRYPT` — a chave passaria pelo SQL e pelos logs de consulta); KMS externo pago.

## R10. Convites, papéis e escopo

- **Decisão**: convite com token de uso único (hash guardado), 7 dias, e-mail, papel e lista de filiais (`branch_id` da spec 005). Aceite exige criar ou entrar na conta de equipe, segundo fator e vínculo. Remoção de papel, mudança de escopo e desativação publicam evento que invalida o cache de autorização e revoga as sessões afetadas. "Último Proprietário" protegido por verificação transacional (contagem com `SELECT … FOR UPDATE` dos donos ativos).

## R11. Conta do consumidor: exclusão, aparelhos e casos de borda

- **Decisão**: exclusão confirmada por OTP → estado `deactivated`, sessões revogadas, linha em `erasure_request` para a spec 022, aviso prévio quando há agendamentos futuros (consulta à projeção da 009; nesta spec, *stub*). "Aparelhos conectados" lista sessões com nome do aparelho (do cliente), país (`CF-IPCountry`) e último uso. Celular reciclado: entrada por aparelho novo numa conta com etapa 2 e sem acesso há mais de 180 dias pede a data de nascimento; falha → caso para o suporte. Troca de número: OTP nos dois números, ou e-mail verificado + data de nascimento.

## R12. Telas (Figma)

| Superfície | Telas | Código Figma |
|---|---|---|
| App do consumidor | Abertura e instalação · Login e cadastro etapa 1 (OTP) · Cadastro etapa 2 · Perfil (dados, aparelhos, excluir conta) | C01 · C02 · C09 · C18 |
| Web do consumidor | Entrar e cadastro etapa 1 · Cadastro etapa 2 · Perfil | W05 · W12 · W20 |
| Painel do cliente | Equipe e papéis (convites, escopo) · Aviso e lista de sessões de suporte | P15 (Colaboradores) · P26 (Configurações) |
| Back-office | Impersonation · contas da Gestão | G05 · (sem tela no protótipo) |
| Todas as superfícies de equipe | Entrar, segundo fator, recuperação, aceite de convite | **Sem tela no protótipo** |

As telas sem código no Figma (entrar da equipe, segundo fator, recuperação, aceite de convite, contas da Gestão, aviso de sessão de suporte) precisam ser desenhadas no protótipo antes da implementação da interface; até lá, seguem os componentes Botão, Campo e os tokens da 001.
