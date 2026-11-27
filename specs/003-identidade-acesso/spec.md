# Feature Specification: Identidade e acesso

**Feature Branch**: `003-identidade-acesso`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "003 identidade-acesso — seguir a sequência da constituição (seção 10): consumidor global (C5), OTP, staff, MFA, RBAC, impersonation. Depende de 001 e 002. Pendências PEN-03 e PEN-10. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: app do consumidor · web do consumidor · painel do cliente (inclui o modo desktop do colaborador em `/pro`) · app do colaborador · back-office · gateway (`api.koovela.com`)

**Depende de**: 001 `fundacao-plataforma` · 002 `tenancy-provisionamento`

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, V e VIII, seções 3, 5, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.1 a 2.5, 3.1, 6, 7, 8 (J1, J3, J9), 9.1, 9.3 a 9.5, 9.8, 9.9, 12 e 18. Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Toda ação na Koovela começa por saber **quem** está agindo e **em nome de qual tenant**. Três públicos muito diferentes entram por portas diferentes:

- o **consumidor**, que chega por link ou QR, sem senha, e precisa agendar em segundos (DF 2.1, J1);
- a **equipe do estabelecimento** (Proprietário, Gerente, Recepção, Colaborador), que opera agenda e dinheiro (DF 2.2, 2.3);
- a **Gestão** da Koovela (Suporte, Financeiro/Ops, Comercial/Growth, SRE), que nunca pode ter acesso silencioso a dados de tenant (DF 2.5).

Com schema por tenant `[D06]`, a identidade do consumidor precisa existir **fora** dos tenants para que ele tenha uma conta só em todos os estabelecimentos `[C5]`.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.2 | Agendar e controlar agendamentos (porta de entrada) | Tempo até confirmação |
| 2.5 (regra inegociável) | Nenhum acesso irrestrito e silencioso da Gestão | 100% das sessões de suporte registradas |
| J9 | Suporte com impersonation | Tempo de atendimento com sessão registrada |
| DF 12 | MFA, rate limit no OTP, proteção contra enumeração de telefone | Tentativas bloqueadas; 0 contas tomadas |

Personas: consumidor; Proprietário, Gerente de filial, Recepção, Colaborador e prestador autônomo (DF 2.4, que acumula Proprietário e Colaborador); Suporte N1/N2, Financeiro/Ops, Comercial/Growth e Engenharia/SRE.

---

## Clarifications

### Session 2026-11-25

- Q: Como ficam as células da matriz de permissões depois das decisões? → A: Atualizadas: Gerente com faturamento e fidelidade da própria filial; anotação para Proprietário e, se liberado, Gerente.
- Q: Como o Colaborador entra no app? → A: Como o resto da equipe: e-mail com senha forte ou passkey, mais segundo fator (CONST 5). Sem emenda.
- Q: O Gerente de filial vê o faturamento e configura a fidelidade da própria filial? (PEN-03) → A: Sim, só da própria filial; o Proprietário pode retirar essas permissões.
- Q: Quem acessa a anotação de atendimento? (PEN-10) → A: Os profissionais que atendem o cliente e o Proprietário; o Gerente só se o Proprietário liberar; a Recepção nunca; todo acesso é registrado na trilha.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor entra com celular e OTP (Priority: P1)

Como consumidor que chegou por link ou QR, quero me cadastrar só com nome e celular, confirmados por um código enviado por SMS, para agendar sem criar senha.

**Why this priority**: é a etapa 1 do cadastro, porta de entrada da J1 e de toda a receita.

**Independent Test**: em app e web, informar nome e celular de teste, receber o código, confirmá-lo e chegar a "Meus agendamentos" (vazio) autenticado; sair e entrar de novo só com celular e código.

**Acceptance Scenarios**:

1. **Given** um celular nunca usado na Koovela, **When** o consumidor informa nome e celular e confirma o código recebido por SMS, **Then** uma conta global de consumidor é criada e ele entra autenticado, sem senha.
2. **Given** um celular já cadastrado, **When** o consumidor informa o celular e confirma o código, **Then** entra na mesma conta, em app ou web, vinda de qualquer estabelecimento.
3. **Given** qualquer celular, cadastrado ou não, **When** o código é pedido, **Then** a resposta é a mesma e no mesmo tempo, sem revelar se o número já existe.
4. **Given** um código errado 5 vezes, **When** a quinta tentativa falha, **Then** o código é invalidado e é preciso pedir outro.
5. **Given** um código pedido, **When** passam 5 minutos, **Then** ele expira.
6. **Given** pedidos de código em sequência, **When** o consumidor pede de novo antes de 60 segundos, ou passa de 5 pedidos por número por hora, ou de 20 por IP por hora, **Then** o pedido é recusado com mensagem de "aguarde", sem envio.
7. **Given** o consumidor autenticado no app, **When** ele volta ao app em até 90 dias, **Then** continua autenticado; na web, por até 30 dias.
8. **Given** um link de estabelecimento aberto sem conta, **When** o consumidor conclui a etapa 1, **Then** volta exatamente para a página de onde saiu.

---

### User Story 2 - Consumidor completa a etapa 2 quando necessário (Priority: P1)

Como consumidor, quero informar e-mail, CPF e data de nascimento só quando forem necessários (pagar, acumular fidelidade, receber nota), e poder corrigi-los depois.

**Why this priority**: a minimização (CONST IV) é regra; os dados da etapa 2 são pré-requisito de pagamento (012), fidelidade (015) e nota fiscal (017).

**Independent Test**: com uma conta de etapa 1, abrir "Cadastro etapa 2" pelo perfil, preencher, salvar e conferir que os dados ficam visíveis só ao próprio consumidor, mascarados.

**Acceptance Scenarios**:

1. **Given** um consumidor só com etapa 1, **When** uma ação exige etapa 2, **Then** a tela "Cadastro etapa 2" pede e-mail, CPF e data de nascimento, e ao concluir retorna para a ação.
2. **Given** um CPF inválido (dígito verificador), **When** o consumidor tenta salvar, **Then** é recusado com mensagem clara.
3. **Given** um CPF já ligado a outra conta, **When** o consumidor tenta salvar, **Then** é recusado sem revelar a outra conta e com orientação de contato com o suporte.
4. **Given** um e-mail informado, **When** salvo, **Then** é confirmado por link ou código antes de ser usado para comunicação ou recuperação.
5. **Given** o perfil, **When** o consumidor o abre, **Then** vê seus dados com CPF e telefone parcialmente mascarados e pode corrigir nome, e-mail e data de nascimento.
6. **Given** um consumidor com menos de 18 anos pela data de nascimento, **When** tenta concluir a etapa 2, **Then** a conta própria é recusada, com orientação de que o agendamento de menores é feito pelo responsável (fase 2, `[D28]`).

---

### User Story 3 - Equipe do estabelecimento entra com segurança (Priority: P1)

Como Proprietário, Gerente, Recepção ou Colaborador, quero entrar no painel e no app do colaborador com credencial forte e segundo fator, e o Proprietário quer convidar a equipe com o papel certo.

**Why this priority**: sem acesso da equipe não há agenda, catálogo nem financeiro. É a base para a spec 005 em diante.

**Independent Test**: criar uma conta de Proprietário, ativar o segundo fator, convidar uma Recepção, aceitar o convite em outro navegador e verificar que cada um vê só o que o papel permite.

**Acceptance Scenarios**:

1. **Given** uma pessoa que cria conta de equipe (pela spec 005, onboarding), **When** ela confirma o e-mail e define uma senha forte ou uma passkey, **Then** a conta existe e ela é obrigada a cadastrar o segundo fator antes do primeiro acesso a dados de tenant.
2. **Given** um Proprietário, **When** convida alguém por e-mail com um papel (Gerente, Recepção, Colaborador) e, quando couber, as filiais do escopo, **Then** a pessoa recebe um convite válido por 7 dias e, ao aceitar, ganha exatamente aquele papel naquele tenant.
3. **Given** uma pessoa com vínculos em mais de um tenant (por exemplo, autônoma dona de um negócio e Colaboradora em outro), **When** entra, **Then** escolhe o tenant ativo, e todo acesso fica restrito a ele até trocar.
4. **Given** 10 senhas erradas seguidas, **When** a décima falha, **Then** a conta fica bloqueada por 15 minutos e o titular é avisado por e-mail.
5. **Given** uma ação financeira ou administrativa, **When** a última autenticação tem mais de 5 minutos, **Then** é pedida reautenticação com segundo fator.
6. **Given** um Proprietário, **When** remove o papel de alguém, **Then** todas as sessões daquela pessoa naquele tenant são encerradas em até 1 minuto.
7. **Given** a forma de entrar do Colaborador no app, **When** ele faz login, **Then** entra como o resto da equipe: e-mail com senha forte ou passkey, mais segundo fator (CONST 5).

---

### User Story 4 - Permissões declarativas, testadas célula por célula (Priority: P1)

Como responsável pelo produto, quero que a matriz de permissões do Documento Fundamental (seção 7) seja a única fonte das permissões, versionada e testada célula por célula, com pendências negadas por padrão.

**Why this priority**: Princípio V; toda spec seguinte pluga suas ações nessa matriz.

**Independent Test**: gerar a suíte a partir da matriz e verificar que cada combinação de papel e ação dá o resultado da célula; mudar uma célula sem atualizar a matriz faz o CI falhar.

**Acceptance Scenarios**:

1. **Given** a matriz de permissões versionada, **When** o CI roda, **Then** gera e executa um teste para cada célula (papel × ação × escopo) e falha se qualquer resultado divergir.
2. **Given** uma ação nova numa spec, **When** ela não está na matriz, **Then** é negada para todos e o PR falha até a matriz ser atualizada.
3. **Given** um Gerente da filial X, **When** tenta ver a agenda da filial Y, **Then** é negado (resposta "não encontrado").
4. **Given** um papel com escopo de filial, **When** o Proprietário muda o escopo, **Then** a mudança vale na próxima requisição, sem precisar sair e entrar.
5. **Given** a célula "Gerente vê faturamento da filial e configura fidelidade" (`[PEN-03]`), **When** a ação é pedida, **Then** é PERMITIDO só para a filial do Gerente; o Proprietário pode retirar a permissão por Gerente (`[PEN-03]` resolvido).
6. **Given** a ação "ver anotação de atendimento" para Gerente e Proprietário (`[PEN-10]`), **When** é pedida, **Then** é PERMITIDO ao Proprietário e aos profissionais que atendem o cliente; ao Gerente só se o Proprietário liberar; à Recepção nunca; todo acesso gera registro na trilha (`[PEN-10]` resolvido).
7. **Given** um perfil da Gestão, **When** tenta acessar dados de qualquer tenant fora de uma sessão de suporte, **Then** é negado.

---

### User Story 5 - Sessão de suporte (impersonation) auditada e visível (Priority: P2)

Como Suporte N1/N2 ou SRE, quero abrir uma sessão temporária na visão de um tenant, com justificativa, para resolver um chamado; como Proprietário, quero saber que ela aconteceu e o que foi feito (J9).

**Why this priority**: é a única forma permitida de a Gestão tocar dados de tenant (CONST V).

**Independent Test**: abrir uma sessão de suporte num tenant sintético, executar uma ação permitida, deixar a sessão expirar, e conferir no painel do Proprietário o aviso e a lista de ações.

**Acceptance Scenarios**:

1. **Given** um Suporte autenticado no back-office com segundo fator, **When** pede uma sessão num tenant, **Then** é obrigado a informar justificativa (mínimo 20 caracteres) e, se houver, o número do chamado, e a duração (padrão 30 minutos, máximo 60).
2. **Given** uma sessão aberta, **When** o Suporte age no painel do tenant, **Then** cada ação é registrada com sessão, ator, ação, alvo, justificativa, IP, `request_id` e horário.
3. **Given** uma sessão aberta, **When** qualquer pessoa do tenant está no painel, **Then** vê um aviso visível de "sessão de suporte da Koovela em andamento", com o nome do atendente e o horário de fim; o Proprietário é avisado por e-mail no início da sessão.
4. **Given** uma sessão, **When** o prazo vence, **Then** é encerrada automaticamente, sem renovação silenciosa; uma nova sessão exige nova justificativa.
5. **Given** uma sessão de suporte, **When** o atendente tenta ver anotação de atendimento, alterar recebedor ou dados bancários, fazer estorno ou mudar papéis da equipe, **Then** é negado.
6. **Given** o Proprietário, **When** abre a lista de sessões de suporte do seu tenant, **Then** vê todas as sessões com atendente, justificativa, início, fim e ações executadas, e pode encerrar uma sessão em andamento.

---

### User Story 6 - Gateway resolve identidade e tenant na borda (Priority: P2)

Como desenvolvedor, quero que o gateway valide a credencial e defina o tenant uma única vez, na borda, para que nenhum serviço precise (nem possa) decidir escopo a partir do corpo da requisição.

**Why this priority**: Princípio II; completa a cadeia iniciada na spec 002 (que entregou o resolvedor de schema).

**Independent Test**: com dois tenants sintéticos, enviar requisições autenticadas como A com `tenant_id` de B no corpo, no cabeçalho e no caminho; todas falham ou são ignoradas, e a suíte de isolamento passa.

**Acceptance Scenarios**:

1. **Given** uma requisição de equipe, **When** passa pelo gateway, **Then** o tenant vem do tenant ativo da credencial; qualquer `tenant_id` no corpo é ignorado para decidir escopo.
2. **Given** uma requisição de consumidor para um estabelecimento, **When** passa pelo gateway, **Then** o tenant vem do slug público do estabelecimento resolvido pelo gateway, nunca do corpo.
3. **Given** uma credencial expirada, revogada ou de sessão encerrada, **When** usada, **Then** é recusada.
4. **Given** um token de atualização já usado de novo (reutilização), **When** apresentado, **Then** toda a família de sessão é revogada e o titular é avisado.
5. **Given** a suíte de isolamento da spec 002, **When** roda com credenciais reais desta spec, **Then** todo acesso de A a recursos de B retorna 404.

---

### User Story 7 - Contas da Gestão (Priority: P2)

Como SRE, quero criar, alterar e desativar as contas da Gestão (Suporte, Financeiro/Ops, Comercial/Growth, SRE), sempre com segundo fator, para que o back-office tenha controle de acesso próprio além da borda.

**Why this priority**: a spec 001 protegeu `admin.koovela.com` na borda; agora a aplicação precisa saber quem é cada pessoa e o que ela pode fazer.

**Independent Test**: criar uma conta de Suporte, entrar no back-office, verificar que ela vê "Impersonation" e não vê "Provisionamento"; desativar e verificar que as sessões caem.

**Acceptance Scenarios**:

1. **Given** um SRE, **When** cria uma conta da Gestão com perfil, **Then** a pessoa recebe convite, define credencial e segundo fator, e só vê as telas do perfil.
2. **Given** a desativação de uma conta da Gestão, **When** confirmada, **Then** todas as sessões caem em até 1 minuto e o procedimento de rotação de segredos (spec 001) é lembrado.
3. **Given** qualquer ação de criação, alteração ou desativação de conta da Gestão, **When** ocorre, **Then** é registrada como ação privilegiada.

---

### User Story 8 - Excluir a própria conta e gerenciar sessões (Priority: P3)

Como consumidor, quero excluir minha conta pelo app (exigência das lojas, `[D03]`) e ver e encerrar minhas sessões em outros aparelhos.

**Why this priority**: obrigatório para publicar nas lojas; o processamento completo dos direitos do titular é da spec 022.

**Independent Test**: pedir exclusão da conta pelo app, verificar que todas as sessões caem e que o celular não entra mais na conta antiga.

**Acceptance Scenarios**:

1. **Given** um consumidor autenticado, **When** pede a exclusão da conta no perfil e confirma com código OTP, **Then** a conta é desativada na hora, todas as sessões são encerradas e um pedido de eliminação é registrado para a spec 022.
2. **Given** um consumidor com agendamentos futuros confirmados, **When** pede a exclusão, **Then** é avisado de que eles serão cancelados conforme a política de cada estabelecimento e precisa confirmar de novo.
3. **Given** o perfil, **When** o consumidor abre "Aparelhos conectados", **Then** vê aparelho, local aproximado e último acesso, e pode encerrar qualquer sessão.

---

### Edge Cases

- **Celular reciclado pela operadora**: na entrada por aparelho novo numa conta com etapa 2 e sem acesso há mais de 180 dias, além do OTP é pedida a confirmação da data de nascimento; se falhar, a conta antiga não é aberta e o caso vai para o suporte.
- **Troca de número do consumidor**: feita pelo perfil, com OTP no número antigo e no novo; sem acesso ao antigo, com confirmação de e-mail verificado e da data de nascimento; sem isso, só pelo suporte.
- **SMS que não chega**: depois de 60 segundos, oferece reenviar; após 3 falhas de entrega registradas, mostra contato do suporte. O provedor de SMS tem alternativa configurada.
- **Ataque de envio de SMS em massa** (bombardeio de OTP para gerar custo): limites por número, por IP e por prefixo, desafio anti-robô após o segundo pedido da mesma origem, e alerta de custo diário.
- **Mesma pessoa como consumidora e como equipe**: são contas distintas (celular + OTP; e-mail + credencial), ligadas à mesma pessoa só quando ela mesma comprovar as duas; nenhuma permissão passa de uma para a outra.
- **Convite aceito por outra pessoa** (e-mail encaminhado): o aceite exige definir credencial e segundo fator; o Proprietário vê quem aceitou e quando, e pode revogar.
- **Último Proprietário tentando remover a si mesmo**: é recusado; todo tenant tem pelo menos um Proprietário.
- **Perda do segundo fator**: códigos de recuperação de uso único (10) gerados no cadastro; sem eles, a recuperação é feita pelo suporte com verificação de identidade e registro como ação privilegiada.
- **Sessão de suporte aberta quando o tenant é suspenso** (spec 002): a sessão continua apenas para leitura, com aviso.
- **Relógio do aparelho errado**: a validade dos códigos e tokens é decidida pelo servidor.

---

## Requirements *(mandatory)*

Formato: `REQ-IDN-NNN (origem: …)`.

### Functional Requirements

**Identidade global do consumidor**

- **REQ-IDN-001** (origem: C5 | CONST II | DF 6): A conta do consumidor DEVE ser global, guardada no espaço `koovela_identity` (spec 002), única por celular, e usada em todos os tenants, no app e na web. Os schemas de tenant só guardam o identificador do consumidor.
- **REQ-IDN-002** (origem: DF 2.1 | CONST IV): A etapa 1 DEVE coletar apenas nome e celular, verificado por OTP.
- **REQ-IDN-003** (origem: DF 2.1 | CONST IV): A etapa 2 DEVE coletar e-mail, CPF e data de nascimento apenas quando uma ação os exige, e voltar para a ação ao concluir. O meio de pagamento é da spec 012.
- **REQ-IDN-004** (origem: CONST IV): Celular, e-mail, CPF e data de nascimento DEVEM ser cifrados por campo, com busca por HMAC determinístico para celular, e-mail e CPF.
- **REQ-IDN-005** (origem: DF 2.1 | CONST IV): CPF DEVE ser validado pelo dígito verificador e ser único entre contas; a recusa por duplicidade NÃO DEVE revelar a outra conta.
- **REQ-IDN-006** (origem: CONST IV art. 14 | D28): Conta própria de consumidor DEVE exigir 18 anos ou mais pela data de nascimento.
- **REQ-IDN-007** (origem: DF 6 | D31): A pessoa (colaborador como pessoa, independente de vínculo) DEVE existir na identidade global, separada dos vínculos com tenants, que ficam na spec 007.

**OTP**

- **REQ-IDN-010** (origem: CONST 5 | DF 12): O OTP DEVE ser enviado por SMS, ter 6 dígitos, expirar em 5 minutos, aceitar no máximo 5 tentativas e ser de uso único.
- **REQ-IDN-011** (origem: CONST 5 | DF 12): Pedidos de OTP DEVEM respeitar: 60 segundos entre pedidos, 5 por número por hora, 10 por número por dia, 20 por IP por hora; após o segundo pedido da mesma origem, DEVE ser exigido desafio anti-robô.
- **REQ-IDN-012** (origem: CONST 5 | DF 12): A resposta ao pedido de OTP DEVE ser idêntica em conteúdo e tempo para celular cadastrado e não cadastrado.
- **REQ-IDN-013** (origem: DF 12 | edge case): DEVE haver alerta quando o gasto diário com SMS de OTP passar do limite configurado no back-office, e quando a taxa de entrega cair abaixo de 90%.

**Equipe do estabelecimento e Gestão**

- **REQ-IDN-020** (origem: CONST 5): A equipe (tenant e Gestão) DEVE entrar com e-mail confirmado e senha forte (mínimo 12 caracteres, recusada se constar em listas de senhas vazadas) ou passkey.
- **REQ-IDN-021** (origem: CONST V | CONST 5): O segundo fator DEVE ser obrigatório para toda a Gestão, para o Proprietário e para o Gerente, cadastrado antes do primeiro acesso a dados; passkey conta como segundo fator. Recepção e Colaborador também têm segundo fator obrigatório, porque entram como o resto da equipe (clarify 2026-11-25, CONST 5).
- **REQ-IDN-022** (origem: CONST V): Ações financeiras e administrativas DEVEM exigir autenticação com segundo fator feita há no máximo 5 minutos.
- **REQ-IDN-023** (origem: DF 2.2 | DF 2.3): A conta de equipe DEVE ser global (uma pessoa, um login) com papéis por tenant; o acesso vale para um tenant ativo por vez, e trocar de tenant emite nova credencial.
- **REQ-IDN-024** (origem: DF 2.2): O Proprietário DEVE poder convidar, alterar papel e escopo de filial, e remover membros da equipe; o convite vale por 7 dias e é de uso único.
- **REQ-IDN-025** (origem: DF 2.2): Todo tenant DEVE ter pelo menos um Proprietário.
- **REQ-IDN-026** (origem: CONST 5): Após 10 falhas de senha seguidas, a conta DEVE ser bloqueada por 15 minutos, com aviso ao titular.
- **REQ-IDN-027** (origem: CONST 5): Cada conta com segundo fator DEVE receber 10 códigos de recuperação de uso único; recuperação sem eles é feita pelo suporte e registrada como ação privilegiada.
- **REQ-IDN-028** (origem: DF 2.5 | DF 7): Contas da Gestão DEVEM ser criadas, alteradas e desativadas apenas pelo SRE, com perfis Suporte, Financeiro/Ops, Comercial/Growth e SRE.

**Sessões e credenciais**

- **REQ-IDN-030** (origem: CONST 5): A credencial de acesso DEVE durar no máximo 15 minutos; a de atualização DEVE ser rotativa, e reutilização DEVE revogar toda a família de sessão.
- **REQ-IDN-031** (origem: CONST 5 | DF 2.1): A sessão do consumidor DEVE durar até 90 dias de inatividade no app e 30 dias na web; a da equipe, até 12 horas no painel e 30 dias no app do colaborador; a da Gestão, até 8 horas.
- **REQ-IDN-032** (origem: CONST 5): Toda sessão DEVE ser revogável pelo titular e, para membros de tenant, pelo Proprietário; remoção de papel ou desativação de conta DEVE encerrar as sessões afetadas em até 1 minuto.
- **REQ-IDN-033** (origem: CONST 3): Cookies de sessão na web DEVEM seguir REQ-FND-036 (escopados ao subdomínio, `Secure`, `HttpOnly`, `SameSite=Lax`).

**Gateway e escopo**

- **REQ-IDN-040** (origem: CONST II): O gateway DEVE validar a credencial e definir o tenant uma única vez: para equipe, pelo tenant ativo da credencial; para requisições públicas e do consumidor dirigidas a um estabelecimento, pelo slug resolvido pelo gateway. `tenant_id` vindo do corpo, de cabeçalho do cliente ou de parâmetro NÃO DEVE decidir escopo.
- **REQ-IDN-041** (origem: CONST II | REQ-TEN-042): O gateway DEVE propagar identidade, papel, escopo e tenant no contexto da requisição, consumido pelo resolvedor de schema da spec 002.
- **REQ-IDN-042** (origem: CONST II | REQ-TEN-044): A suíte de isolamento DEVE passar a usar credenciais reais desta spec, cobrindo equipe de tenants diferentes, consumidor e Gestão sem sessão de suporte.

**RBAC**

- **REQ-IDN-050** (origem: CONST V | DF 7): As permissões DEVEM ser declarativas, versionadas num arquivo de matriz em formato de máquina no repositório (`packages/contracts/rbac/permissions.yaml`, derivado da seção 7 do Documento Fundamental; CONST 1.1.0, Princípio V), e ser a única fonte do controle de acesso.
- **REQ-IDN-051** (origem: CONST V): O CI DEVE gerar e executar um teste por célula (papel × ação × escopo) e falhar em qualquer divergência; ação sem célula DEVE ser negada e falhar o PR.
- **REQ-IDN-052** (origem: DF 7 | DF 2.2): Papéis de tenant DEVEM ter escopo: Proprietário vale para a rede; Gerente e Recepção, para uma lista de filiais; Colaborador, para os próprios dados. Papéis se somam quando a mesma pessoa tem mais de um.
- **REQ-IDN-053** (origem: PEN-03 | CONST 8): Gerente ver faturamento da filial e configurar fidelidade DEVE ser PERMITIDO só para a própria filial, com opção de o Proprietário retirar.
- **REQ-IDN-054** (origem: PEN-10 | PEN-05 | CONST 8): Anotação de atendimento DEVE ser acessível aos profissionais que atendem o cliente e ao Proprietário; ao Gerente só com liberação do Proprietário; à Recepção nunca; todo acesso registrado. Suporte nunca; SRE nunca (DF 7).
- **REQ-IDN-055** (origem: CONST V | DF 2.5): Nenhum perfil da Gestão DEVE ter acesso a dados de tenant fora de uma sessão de suporte; Financeiro/Ops acessa dados financeiros apenas pelo back-office, nas telas das specs 018 e 021.
- **REQ-IDN-056** (origem: CONST II): Negação por falta de permissão sobre recurso de outro escopo DEVE responder "não encontrado" (404); negação de ação sobre recurso visível, "proibido" (403).

**Sessão de suporte (impersonation)**

- **REQ-IDN-060** (origem: CONST V | DF 7 | J9): A sessão de suporte DEVE ser aberta apenas por Suporte ou SRE, com justificativa de pelo menos 20 caracteres, duração padrão de 30 minutos e máxima de 60, sem renovação; nova sessão exige nova justificativa.
- **REQ-IDN-061** (origem: CONST V): Toda ação durante a sessão DEVE ser registrada com sessão, ator, ação, alvo, justificativa, IP, `request_id` e horário.
- **REQ-IDN-062** (origem: CONST V | J9): A sessão DEVE ser visível ao tenant: aviso permanente no painel enquanto durar, e-mail ao Proprietário no início, e lista de sessões com ações no painel do Proprietário, que pode encerrar a sessão.
- **REQ-IDN-063** (origem: DF 7 | CONST V): Durante a sessão são permitidas apenas as ações marcadas `✔*` na matriz (agendar, ver agendas, cancelar e remarcar) e leitura de configurações; são proibidos anotação de atendimento, dados bancários e de recebedor, estorno, mudança de papéis e de segundo fator.
- **REQ-IDN-064** (origem: CONST V): Não existe sessão de suporte na conta do consumidor na v1.0.

**Conta do consumidor**

- **REQ-IDN-070** (origem: D03 | CONST IV | DF 12): O consumidor DEVE poder pedir a exclusão da conta no app e na web, confirmada por OTP; a conta é desativada na hora, as sessões caem, e o pedido de eliminação é registrado para processamento pela spec 022.
- **REQ-IDN-071** (origem: CONST IV): O consumidor DEVE poder ver e corrigir os próprios dados e ver e encerrar as próprias sessões.
- **REQ-IDN-072** (origem: edge case | DF 12): Troca de número e entrada por aparelho novo em conta antiga DEVEM seguir as verificações dos casos de borda.

**Auditoria e eventos**

- **REQ-IDN-080** (origem: CONST V): Todo endpoint administrativo e toda ação privilegiada (contas da Gestão, papéis, sessões de suporte, recuperação de segundo fator) DEVE emitir registro de auditoria; teste DEVE falhar se algum não emitir. O registro passa para a trilha append-only na spec 004.
- **REQ-IDN-081** (origem: CONST IX): Os eventos desta spec DEVEM seguir a CONST IX, sem PII em claro.

### Key Entities

- **Consumidor** (`consumer`): identificador global, nome, celular (cifrado), e-mail, CPF e data de nascimento (cifrados, opcionais até a etapa 2), estado (ativo, desativado, eliminação pendente), datas.
- **Pessoa**: indivíduo independente de vínculo com tenant, ligada a uma conta de equipe.
- **Conta de equipe**: e-mail confirmado, credencial (senha ou passkey), segundo fator, códigos de recuperação, estado.
- **Papel no tenant**: conta de equipe, tenant, papel (Proprietário, Gerente, Recepção, Colaborador), escopo (rede, filiais, próprio).
- **Convite**: tenant, e-mail, papel, escopo, quem convidou, validade, estado.
- **Conta da Gestão** (`platform_admin`): pessoa, perfil (Suporte, Financeiro/Ops, Comercial/Growth, SRE), estado.
- **Sessão**: titular, tipo (consumidor, equipe, Gestão), aparelho, tenant ativo, criação, último uso, revogação.
- **Desafio OTP**: celular (por HMAC), finalidade, tentativas, expiração, resultado. Nunca guarda o código em claro.
- **Sessão de suporte** (`support_session`): atendente, tenant, justificativa, chamado, início, fim previsto, fim real, quem encerrou.
- **Ação registrada**: sessão (quando houver), ator, ação, alvo, justificativa, IP, `request_id`, horário.
- **Matriz de permissões**: versão, papéis, ações, escopos, células.
- **Pedido de eliminação**: consumidor, data, estado (para a spec 022).

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor | Abertura e instalação · Login e cadastro etapa 1 com OTP · Cadastro etapa 2 · Perfil (dados, aparelhos, excluir conta) | Códigos `9.1.x` do Figma registrados no plano |
| Web do consumidor | Entrar e cadastro etapa 1 (OTP) · Cadastro etapa 2 · Perfil | Códigos `W..` do Figma registrados no plano |
| Painel do cliente | Entrar, segundo fator, recuperação · Aceite de convite · Equipe e papéis (convites, escopo) · Aviso e lista de sessões de suporte | Telas de acesso do Figma; registrar no plano |
| App do colaborador e `/pro` | Entrar e segundo fator · Perfil (parte de acesso) | Códigos do Figma registrados no plano |
| Back-office | Entrar e segundo fator · Impersonation (DF 9.5) · Contas da Gestão | Códigos `G..` do Figma registrados no plano |

A parte de notificações de "Perfil e notificações" é da spec 011; o portfólio de "Perfil e portfólio" do colaborador é da spec 007.

---

## Regras e estados

- **Conta do consumidor**: `ativa` → `desativada` (pedido de exclusão) → `eliminação_pendente` → tratamento da spec 022. Uma conta `desativada` não autentica.
- **Conta de equipe**: `convidada` → `ativa` ↔ `bloqueada_temporariamente` · `ativa` → `desativada`.
- **Convite**: `pendente` → `aceito` · `pendente` → `expirado` · `pendente` → `revogado`.
- **Sessão de suporte**: `aberta` → `encerrada_por_prazo` · `encerrada_pelo_atendente` · `encerrada_pelo_tenant` · `encerrada_por_suspensão`.
- **Desafio OTP**: `emitido` → `verificado` · `expirado` · `esgotado`.
- Toda mudança de papel, escopo, segundo fator e sessão de suporte publica evento e gera registro de auditoria.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Nome do consumidor | Pessoal | Execução de contrato (art. 7, V) | Enquanto a conta existir; depois, conforme spec 022 (`[C4]`) | Próprio consumidor; tenants com quem ele agendou (spec 009) |
| Celular do consumidor | Pessoal, cifrado | Execução de contrato | Idem | Próprio consumidor; tenants com quem agendou, mascarado quando possível |
| E-mail, CPF, data de nascimento | Pessoal, cifrado | Execução de contrato; obrigação legal para nota fiscal (art. 7, II) | Idem; CPF ligado a nota fiscal segue a guarda fiscal de 5 anos | Próprio consumidor; tenant quando necessário para nota (spec 017) |
| E-mail e nome da equipe e da Gestão | Pessoal | Execução de contrato | Enquanto houver vínculo, mais 5 anos para auditoria | Proprietário do tenant (da própria equipe); SRE (da Gestão) |
| Credenciais, segundo fator, códigos de recuperação | Segredo | Segurança (art. 7, IX) | Enquanto a conta existir | Ninguém; guardados apenas como verificadores irreversíveis |
| Desafios OTP | Técnico com celular por HMAC | Segurança | 30 dias | SRE, para investigar abuso |
| Sessões (aparelho, IP, local aproximado) | Pessoal | Segurança | 90 dias após o fim | Próprio titular; SRE |
| Registro de sessão de suporte e ações | Pessoal (ator) | Segurança e transparência ao controlador | Igual à trilha de auditoria (spec 004) | Proprietário do tenant; SRE |
| Pedido de eliminação | Pessoal | Obrigação legal (art. 18) | Conforme spec 022 | Privacidade (DPO) |

Regras: nenhum desses campos aparece em log (REQ-FND-041); o código OTP nunca é guardado em claro; dado de menor não é coletado nesta spec (REQ-IDN-006).

---

## Permissões

Recorte da matriz RBAC (DF 7) que esta spec cria ou usa:

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte | Fin/Ops | SRE |
|---|---|---|---|---|---|---|---|---|
| Gerir a própria conta e sessões | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Convidar e remover equipe, mudar papel e escopo | — | — | — | — | ✔ | — | — | — |
| Ver e encerrar sessões de suporte do tenant | — | — | — | — | ✔ | — | — | — |
| Impersonar tenant | — | — | — | — | — | ✔ auditado | — | ✔ auditado |
| Criar e desativar contas da Gestão | — | — | — | — | — | — | — | ✔ |
| Recuperar segundo fator de terceiro | — | — | — | — | — | ✔ auditado | — | ✔ auditado |
| Ver faturamento da filial / configurar fidelidade | — | — | — | ✔ filial | ✔ | — | ✔ (faturamento) | — |
| Ver anotação de atendimento | ✔ própria | ✔ própria | — | ✔ se liberado | ✔ | — | — | ✖ |

As demais células da DF 7 entram na matriz nesta spec e são testadas, mas as ações só existem quando a spec dona for implementada.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `identity.consumer.registered.v1` | Etapa 1 concluída |
| `identity.consumer.profile_completed.v1` | Etapa 2 concluída |
| `identity.consumer.deactivated.v1` | Pedido de exclusão confirmado |
| `identity.staff.invited.v1` / `.joined.v1` / `.removed.v1` | Ciclo do convite e da equipe |
| `identity.staff.role_changed.v1` | Mudança de papel ou escopo |
| `identity.session.revoked.v1` | Sessão encerrada por revogação ou reutilização |
| `identity.support_session.opened.v1` / `.closed.v1` | Início e fim de sessão de suporte |
| `identity.platform_admin.created.v1` / `.deactivated.v1` | Contas da Gestão |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Tempo do pedido do código até a etapa 1 concluída (p50 / p90) | DF 3.1.2 · J1 | Até 45 s / 90 s |
| Conversão da etapa 1 (código pedido → conta autenticada) | J1 | Acompanhada; acima de 85% |
| Taxa de entrega do SMS de OTP | REQ-IDN-013 | Acima de 95% |
| Gasto diário com SMS de OTP | REQ-IDN-013 | Abaixo do limite configurado |
| Pedidos de OTP bloqueados por limite ou anti-robô | DF 12 | Acompanhada |
| Adoção de passkey na equipe | CONST 5 | Acompanhada |
| Sessões de suporte por semana, duração média e % com chamado | J9 · DF 2.5 | 100% com justificativa |
| Reutilizações de token detectadas | CONST 5 | Acompanhada; alerta a cada ocorrência |
| Contas tomadas confirmadas | DF 12 | 0 |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% dos consumidores novos concluem a etapa 1 (do pedido do código à conta autenticada) em até 90 segundos, no app e na web.
- **SC-002**: Em teste automatizado, não é possível distinguir celular cadastrado de não cadastrado pela resposta nem pelo tempo do pedido de OTP.
- **SC-003**: 100% das células da matriz de permissões têm teste, e o CI bloqueia qualquer divergência.
- **SC-004**: A suíte de isolamento, com credenciais reais, passa em 100% das execuções: nenhum acesso de um tenant alcança recurso de outro.
- **SC-005**: 100% das sessões de suporte têm justificativa, expiram no prazo e aparecem para o Proprietário do tenant com todas as ações executadas.
- **SC-006**: 100% das contas da Gestão e da equipe do estabelecimento (Proprietário, Gerente, Recepção e Colaborador) têm segundo fator ativo antes do primeiro acesso a dados.
- **SC-007**: A remoção de papel ou a desativação de conta encerra as sessões afetadas em até 1 minuto em 100% dos testes.
- **SC-008**: Um consumidor consegue pedir a exclusão da conta pelo app em até 3 toques a partir do perfil.
- **SC-009**: Zero contas tomadas por reutilização de token, por enumeração ou por celular reciclado nos testes de segurança desta spec.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-03** — Gerente vê faturamento e configura fidelidade da filial? | Células da matriz; telas 24 e 42 (DF 18) | **Resolvido (clarify 2026-11-25)**: permitido só na própria filial |
| **PEN-10** — Quem acessa anotação de atendimento? | Células da matriz; spec 020 | **Resolvido (clarify 2026-11-25)**: profissionais que atendem + Proprietário; Gerente se liberado |
| Forma de entrar do Colaborador (História 3, cenário 7) | Experiência no app do colaborador; segundo fator | **Resolvido (clarify 2026-11-25)**: como a equipe, sem emenda |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **C5** | ASSUMIDO: conta do consumidor global em `koovela_identity`; o índice "Meus agendamentos" entre tenants é projeção da spec 009 |
| **C1** / **PEN-25** | Não afeta esta spec: o OTP já é por SMS e o e-mail é verificado na etapa 2, o que prepara os canais da spec 011 |
| **C4** | O pedido de eliminação só é registrado aqui; o tratamento (retenção × portabilidade × guarda fiscal) é da spec 022 |
| **D28** (fase 2) | Menores não têm conta própria; dependentes entram na spec 025 |
| **D31** (fase 2) | Pessoa separada de vínculo; uma conta de equipe com papéis em vários tenants já é suportada |
| Login social | ASSUMIDO: não existe na v1.0, portanto Sign in with Apple não é exigido (CONST 5) |

---

## Fora do escopo desta especificação

- Cadastro do negócio, das filiais e do slug, e a criação da conta do Proprietário no onboarding (spec 005); esta spec fornece a criação de conta de equipe que o onboarding chama.
- Cadastro de colaboradores, vínculos, escalas e portfólio (spec 007).
- Meio de pagamento do consumidor (spec 012).
- Preferências de notificação e envio de lembretes (spec 011).
- Trilha de auditoria append-only consolidada e feature flags (spec 004).
- Processamento completo dos direitos do titular: exportação, eliminação, portabilidade (spec 022).
- Antifraude além dos limites de OTP e de login (spec 021).
- Dependentes, menores e pets (spec 025); colaborador em vários negócios com agendas unidas (spec 027).
- Login social e sessão de suporte na conta do consumidor.

---

## Assumptions

- O envio de SMS de OTP é custo do produto, pago por mensagem, e **não** entra na regra de custo zero da spec 001 (REQ-FND-048), que trata da infraestrutura. Decisão de 2026-11-26: é a única exceção aceita à regra de R$ 0, limitada por um teto diário de gasto configurado no back-office; o provedor é escolhido por cotação na implementação.
- Metas sem número nas fontes foram fixadas assim: OTP de 6 dígitos, 5 minutos, 5 tentativas; limites de pedido 60 s, 5 por hora, 10 por dia e 20 por IP por hora; sessões de 90 dias (app do consumidor), 30 dias (web do consumidor e app do colaborador), 12 horas (painel) e 8 horas (Gestão); reautenticação a cada 5 minutos para ações sensíveis; bloqueio após 10 falhas por 15 minutos; convite válido por 7 dias; sessão de suporte de 30 minutos (máximo 60); 10 códigos de recuperação.
- "Gerente" também tem segundo fator obrigatório, por ter acesso financeiro à própria filial (DF 2.2), mesmo que a CONST V cite só a Gestão e o Proprietário.
- O arquivo da matriz de permissões fica em `packages/contracts/rbac/permissions.yaml` (o CI precisa dele no repositório público), derivado da seção 7 do Documento Fundamental, que continua local (CONST 1.1.0).
- Consumidor e equipe são contas distintas mesmo quando são a mesma pessoa; não há fusão na v1.0.
- O consumidor não precisa de segundo fator além do OTP, exceto nas verificações de celular reciclado e troca de número.
