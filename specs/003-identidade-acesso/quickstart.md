# Quickstart de validação: Identidade e acesso (003)

Pré-requisitos: ambiente das specs 001 e 002 (`pnpm koovela up`, 3 tenants sintéticos). Em dev, SMS e e-mail vão para os adaptadores falsos (`pnpm koovela otp last <celular>` e Mailpit em `http://mail.koovela.localhost`). Contratos em [contracts/](./contracts/).

## 1. Consumidor: etapa 1 com OTP (História 1)

1. Abrir `http://app.koovela.localhost/estudio-sintetico-1`, tocar em agendar, informar nome e celular `+55 11 90000-0001`.
2. `pnpm koovela otp last +5511900000001` → informar o código → volta à página do estabelecimento, autenticado.
3. Sair e entrar de novo só com celular e código → mesma conta.

Verificações automáticas: `pnpm test --filter identity -- otp`:
- tempo e corpo da resposta iguais para celular cadastrado e não cadastrado (SC-002);
- 5 códigos errados invalidam; código expira em 5 min;
- 2º pedido em menos de 60 s, 6º pedido na hora e 21º pedido do mesmo IP → recusados; Turnstile exigido a partir do 2º pedido.

## 2. Etapa 2 (História 2)

Perfil → "Cadastro etapa 2": CPF inválido recusado; CPF de outra conta sintética recusado sem revelar a conta; data de nascimento com menos de 18 anos recusada; e-mail só vale depois da confirmação (Mailpit). `GET /v1/consumer/me` devolve CPF e telefone mascarados; `pnpm test:pii` confirma que estão cifrados no banco.

## 3. Equipe: credencial forte, segundo fator, convite e tenant ativo (História 3)

```bash
pnpm koovela staff create-owner --tenant <A> --email dona@sintetico.test
```

1. Confirmar e-mail (Mailpit), definir senha de 12+ caracteres (uma senha vazada conhecida é recusada), cadastrar TOTP e guardar os 10 códigos de recuperação.
2. Convidar `recepcao@sintetico.test` como Recepção da filial 1; aceitar em outra janela; conferir que vê só a filial 1.
3. Errar a senha 10 vezes → bloqueio de 15 min e e-mail.
4. Ação sensível com login há mais de 5 min → `identity.step_up_required`.
5. Remover a Recepção → as sessões dela caem em até 1 minuto.
6. Uma pessoa com vínculo nos tenants A e B troca o tenant ativo com `POST /v1/auth/switch-tenant`.

## 4. Matriz de permissões (História 4)

```bash
pnpm rbac:generate && pnpm test --filter authz
```

Esperado: um teste por célula, todos verdes. Mudar uma célula no YAML sem atualizar a matriz derivada da DF 7 → falha. Criar uma rota no OpenAPI com `x-koovela-action` inexistente → `pnpm contracts:check` falha. Gerente da filial X pedindo agenda da filial Y → 404.

## 5. Gateway: tenant só da borda (História 6)

`pnpm test:isolation` agora com credenciais reais: equipe de A mandando `tenant_id` de B no corpo, num cabeçalho e na query → ignorado; recursos de B → 404. Reutilizar um refresh token já trocado → toda a família revogada e evento `identity.session.revoked.v1` com `reuse_detected`.

## 6. Sessão de suporte (História 5)

1. No back-office (`/impersonation`, tela G05), como Suporte com segundo fator, abrir sessão no tenant A com justificativa de 20+ caracteres e 30 min.
2. No painel de A, conferir a faixa "sessão de suporte da Koovela em andamento" e o e-mail à Proprietária.
3. Como Suporte, tentar ler anotação, alterar recebedor ou mudar papel → negado; cancelar um agendamento sintético → permitido e registrado em `privileged_action_log`.
4. A Proprietária vê a sessão e as ações e encerra; ou esperar o prazo → encerrada sem renovação.

## 7. Contas da Gestão (História 7)

Como SRE, criar uma conta de Suporte; ela vê "Impersonation" e não vê "Schemas"; desativar → sessões caem em até 1 minuto e aparece o lembrete de rotação de segredos.

## 8. Exclusão de conta e aparelhos (História 8)

No app (perfil → excluir conta) em até 3 toques, confirmar com OTP → conta `deactivated`, sessões revogadas, linha em `erasure_request`. "Aparelhos conectados" lista sessões e encerra uma delas.
