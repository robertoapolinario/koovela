# Feature Specification: Trilha de auditoria e feature flags

**Feature Branch**: `004-auditoria-flags`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "004 auditoria-flags — seguir a sequência da constituição (seção 10): trilha de auditoria append-only e feature flags por tenant. Depende de 003. Sem pendências listadas. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: back-office (telas "Trilha de auditoria" e "Feature flags", DF 9.5) · todos os serviços (gravam auditoria e consultam flags) · app do consumidor, web do consumidor, painel do cliente, app do colaborador e `/pro` (consultam flags)

**Depende de**: 003 `identidade-acesso` (e, por ela, 001 e 002)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios III, IV, V e IX, seções 4.4, 6, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.5, 3.4.1, 3.4.6, 6, 7, 9.5, 13 e 16. Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A Koovela promete que **nenhum acesso da Gestão a dados de tenant é silencioso** (DF 2.5) e que **100% das ações da Gestão e das ações financeiras ficam registradas** (CONST V, DF 13). As specs 002 e 003 já criaram registros provisórios de ações (provisionamento, papéis, sessões de suporte). Falta uma trilha única, que só aceita inclusão, que não possa ser alterada sem que se perceba, e onde se possa pesquisar.

Ao mesmo tempo, com um desenvolvedor e deploy contínuo, publicar código não pode significar ligar a funcionalidade para todos. É preciso **liberar funções por tenant** (DF 3.4.6), desligar uma função com problema sem novo deploy, e medir quantos releases saem protegidos por flag.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.4.6 | Liberar função por tenant | % de releases com flag |
| 3.4.1 | Gestão técnica da plataforma e dos tenants | Cobertura de observabilidade |
| DF 13 | Auditoria | 100% das ações de Gestão e financeiras registradas |
| DF 16 | Vazamento de dado de saúde; fraude e abuso de pontos | Auditoria como mitigação |

Personas: Engenharia/SRE (único perfil que altera flags e lê toda a trilha); Financeiro/Ops; Suporte; Encarregado de dados (DPO), quando houver pedido de titular ou incidente; Proprietário do tenant, quanto às ações sobre o próprio tenant; desenvolvedor, que grava auditoria e consulta flags.

---

## Clarifications

### Session 2026-11-25

- Q: No painel, o Proprietário vê qual trilha de auditoria? → A: Toda a trilha do próprio tenant: ações da própria equipe e das sessões de suporte da Koovela, com filtros; exige tela nova no painel.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toda ação obrigatória vira registro, sem exceção (Priority: P1)

Como responsável pelo produto, quero que toda ação da Gestão, toda ação financeira e toda ação administrativa de tenant gere um registro na trilha de auditoria, no mesmo momento da ação, para cumprir a CONST V.

**Why this priority**: é o requisito da constituição e a base de confiança com o tenant; todas as specs seguintes dependem dele.

**Independent Test**: executar cada tipo de ação obrigatória em ambiente de teste e verificar que há exatamente um registro por ação, com todos os campos; simular falha da gravação e verificar que a ação não acontece.

**Acceptance Scenarios**:

1. **Given** uma ação de categoria obrigatória (ver "Regras e estados"), **When** ela é concluída, **Then** existe um registro com ator, perfil, ação, alvo, tenant (quando houver), sessão de suporte (quando houver), justificativa (quando exigida), IP, `request_id`, `correlation_id`, resultado e horário (UTC).
2. **Given** uma ação obrigatória cujo registro não pode ser gravado, **When** a gravação falha, **Then** a ação também falha e nada é alterado (registro e ação são atômicos).
3. **Given** um endpoint administrativo ou financeiro novo, **When** o CI roda, **Then** um teste falha se o endpoint não gerar registro de auditoria.
4. **Given** a mesma ação reprocessada (mesma chave de idempotência), **When** ela roda de novo, **Then** não gera registro duplicado.
5. **Given** os registros provisórios das specs 002 e 003, **When** esta spec é implantada, **Then** eles são migrados para a trilha sem perda e na ordem original, e os registros provisórios deixam de ser usados.

---

### User Story 2 - A trilha não pode ser alterada sem que se perceba (Priority: P1)

Como SRE e como DPO, quero que a trilha só aceite inclusões e que qualquer alteração ou remoção seja detectável, para que ela sirva como prova.

**Why this priority**: uma trilha que pode ser editada em silêncio não serve como controle (CONST V, "append-only").

**Independent Test**: gravar registros, alterar um diretamente no armazenamento com credencial administrativa e verificar que a verificação de integridade aponta exatamente aquele registro.

**Acceptance Scenarios**:

1. **Given** qualquer credencial de aplicação, **When** tenta alterar ou apagar um registro, **Then** a operação é recusada; os serviços só têm permissão de inclusão.
2. **Given** cada registro, **When** gravado, **Then** fica encadeado ao anterior por uma impressão digital, de modo que alterar, remover ou reordenar qualquer registro quebre a cadeia.
3. **Given** a cadeia, **When** a verificação diária roda, **Then** confere a cadeia inteira do dia e grava um selo do dia fora do banco e fora da OCI; se a cadeia estiver quebrada, emite alerta crítico.
4. **Given** um registro alterado por alguém com acesso direto ao banco, **When** a verificação roda, **Then** aponta o primeiro registro inconsistente e o intervalo afetado.
5. **Given** a trilha, **When** o backup da spec 001 roda, **Then** ela entra no backup e na cópia fora da OCI, com o mesmo RPO.

---

### User Story 3 - Pesquisar a trilha no back-office (Priority: P2)

Como SRE, Financeiro/Ops ou Suporte, quero pesquisar a trilha por período, tenant, ator, ação, alvo e sessão de suporte na tela "Trilha de auditoria", vendo só o que meu perfil permite, e exportar o resultado.

**Why this priority**: sem consulta, a trilha só é útil para quem tem acesso ao banco, o que contraria o próprio controle.

**Independent Test**: com registros sintéticos de vários tenants e perfis, pesquisar com cada perfil e conferir que o resultado respeita o recorte do perfil e chega no tempo-alvo.

**Acceptance Scenarios**:

1. **Given** o SRE na tela, **When** pesquisa por qualquer combinação de filtros num período de até 90 dias, **Then** o resultado aparece em até 5 segundos, ordenado por horário, com paginação.
2. **Given** Financeiro/Ops na tela, **When** pesquisa, **Then** vê só as categorias financeiras.
3. **Given** Suporte na tela, **When** pesquisa, **Then** vê só os próprios registros e os das sessões de suporte em que esteve.
4. **Given** qualquer consulta ou exportação da trilha, **When** é feita, **Then** gera ela mesma um registro de auditoria (quem consultou, com quais filtros).
5. **Given** uma exportação, **When** pedida, **Then** exige justificativa, gera um arquivo com os registros e a prova de integridade do intervalo, e o link expira em 24 horas.
6. **Given** um registro com dado pessoal (IP, identificador do ator), **When** exibido, **Then** o IP aparece completo só para SRE; para os demais, truncado.

---

### User Story 4 - Ligar e desligar funções por tenant sem deploy (Priority: P1)

Como SRE, quero criar uma flag, ligá-la para todos, para nenhum, para uma lista de tenants, para uma vertical ou para uma porcentagem de tenants, e que a mudança chegue a todas as superfícies em até 60 segundos, sem deploy.

**Why this priority**: é o que permite publicar com segurança sendo uma pessoa só (DF 3.4.6, `[C3]`), e é o "desligar já" quando algo quebra em produção.

**Independent Test**: criar uma flag numa funcionalidade de exemplo dos shells, ligá-la para um tenant sintético e ver a funcionalidade aparecer só para ele em web e app; desligá-la e ver sumir em até 60 segundos.

**Acceptance Scenarios**:

1. **Given** uma flag nova, **When** criada, **Then** exige nome, descrição, responsável, tipo (liberação, interruptor de emergência, operacional), valor seguro (usado quando a avaliação falha), valor por ambiente e data prevista de remoção.
2. **Given** uma regra de alvo (todos, nenhum, lista de tenants, vertical, porcentagem de tenants), **When** salva, **Then** a avaliação para cada tenant é determinística: o mesmo tenant recebe sempre o mesmo valor enquanto a regra não mudar, inclusive na porcentagem.
3. **Given** uma mudança de flag, **When** salva, **Then** chega a serviços, web e app em até 60 segundos, sem deploy nem reinício.
4. **Given** uma falha na avaliação (serviço de flags fora, app sem rede), **When** a flag é consultada, **Then** vale o último valor conhecido e, sem ele, o valor seguro.
5. **Given** um interruptor de emergência, **When** o SRE o desliga, **Then** a funcionalidade para em todos os tenants em até 60 segundos, e o painel de alertas mostra o interruptor como acionado.
6. **Given** uma requisição de consumidor numa página de estabelecimento, **When** uma flag é avaliada, **Then** vale o tenant daquele estabelecimento; em telas sem tenant (por exemplo, "Meus agendamentos"), vale a regra global.

---

### User Story 5 - Toda mudança de flag é controlada e reversível (Priority: P2)

Como SRE, quero que toda mudança de flag exija justificativa, fique na trilha de auditoria, tenha histórico e possa ser revertida para o valor anterior num passo.

**Why this priority**: uma flag ligada por engano em produção tem o mesmo efeito de um deploy errado.

**Independent Test**: mudar uma flag três vezes, conferir o histórico com autor, justificativa e valores, e reverter para a primeira versão num passo.

**Acceptance Scenarios**:

1. **Given** um perfil que não é SRE, **When** tenta alterar uma flag, **Then** é negado (DF 7, CONST V).
2. **Given** uma mudança em produção, **When** salva, **Then** exige justificativa, reautenticação recente com segundo fator (REQ-IDN-022) e mostra antes quantos tenants serão afetados.
3. **Given** o histórico de uma flag, **When** o SRE escolhe uma versão anterior, **Then** a flag volta àquela configuração num passo, com novo registro de auditoria.
4. **Given** uma mudança de flag, **When** salva, **Then** publica um evento e gera registro na trilha com valor anterior e novo.

---

### User Story 6 - Flags não viram dívida (Priority: P3)

Como desenvolvedor, quero ser avisado de flags vencidas e de flags que ninguém consulta, para remover o código morto e não acumular combinações não testadas.

**Why this priority**: com um desenvolvedor, flags esquecidas são a principal fonte de comportamento inesperado.

**Independent Test**: criar uma flag com data de remoção no passado e outra sem consultas há 30 dias, e verificar os avisos.

**Acceptance Scenarios**:

1. **Given** uma flag de liberação com data de remoção vencida, **When** a verificação semanal roda, **Then** gera aviso ao responsável; após 30 dias vencida, o CI passa a falhar nos PRs que tocam o código dela até que seja removida ou a data seja renovada com justificativa.
2. **Given** uma flag sem nenhuma consulta há 30 dias, **When** a verificação roda, **Then** é marcada como sem uso.
3. **Given** uma flag referenciada no código mas inexistente no cadastro (ou o contrário), **When** o CI roda, **Then** o PR falha.
4. **Given** uma flag de liberação, **When** o CI roda os testes, **Then** os testes cobrem a funcionalidade com a flag ligada e desligada.

---

### Edge Cases

- **Volume alto de registros** (por exemplo, migração de 500 tenants gerando milhares de registros): a gravação não atrasa a ação além de 50 ms (p95), e a consulta continua no tempo-alvo.
- **Ação em lote** (por exemplo, suspender 20 tenants de uma vez): gera um registro por alvo, ligados pelo mesmo `correlation_id`.
- **Relógios divergentes entre hosts**: a ordem oficial é a da cadeia, não a do horário; o horário vem de fonte sincronizada e diferença acima de 1 segundo gera alerta.
- **Pedido de eliminação de dados de um titular** (spec 022) que aparece na trilha: a trilha guarda identificadores; os dados pessoais ligados a eles ficam num cadastro separado que pode ser apagado ou anonimizado sem quebrar a cadeia.
- **Flag avaliada antes do contexto de tenant existir** (por exemplo, na abertura do app): vale a regra global.
- **Duas mudanças simultâneas na mesma flag**: a segunda é recusada se partiu de uma versão desatualizada.
- **Flag com porcentagem e lista de tenants ao mesmo tempo**: a ordem de precedência é fixa: interruptor de emergência desligado > lista de exclusão > lista de inclusão > vertical > porcentagem > valor padrão do ambiente.
- **App do colaborador offline** com flag desatualizada: usa o último valor conhecido; ao reconectar, atualiza antes de qualquer escrita.
- **Selo diário não gravado fora da OCI** (serviço externo indisponível): nova tentativa a cada hora e alerta após 24 horas sem selo.

---

## Requirements *(mandatory)*

Formatos: `REQ-AUD-NNN` (trilha de auditoria) e `REQ-FLG-NNN` (feature flags).

### Functional Requirements

**Trilha de auditoria: o que é registrado**

- **REQ-AUD-001** (origem: CONST V | DF 13): DEVEM ser registradas 100% das ações das categorias obrigatórias: toda ação da Gestão; toda ação financeira (cobrança, estorno, repasse, antecipação, emissão fiscal, assinatura, concessão de desconto, ajuste de saldo); toda ação em sessão de suporte; e as ações administrativas de tenant (equipe e papéis, recebedor e dados bancários, regras de comissão, políticas de cancelamento e de fidelidade, configurações de preço).
- **REQ-AUD-002** (origem: CONST V): Cada registro DEVE conter: identificador, ator (identificador), perfil do ator, ação (código estável), alvo (tipo e identificador), tenant (quando houver), sessão de suporte (quando houver), justificativa (quando exigida), IP, `request_id`, `correlation_id`, resultado (sucesso ou negado) e horário em UTC.
- **REQ-AUD-003** (origem: CONST V | CONST IX): A gravação do registro DEVE ser atômica com a ação: se o registro não puder ser gravado, a ação NÃO DEVE acontecer.
- **REQ-AUD-004** (origem: CONST III | CONST IX): Ações reprocessadas com a mesma chave de idempotência NÃO DEVEM gerar registro duplicado.
- **REQ-AUD-005** (origem: CONST V): Tentativas negadas de ação das categorias obrigatórias DEVEM ser registradas, com resultado "negado".
- **REQ-AUD-006** (origem: CONST V | REQ-IDN-080): O CI DEVE ter teste que falha se um endpoint administrativo ou financeiro não gerar registro. A lista de ações por categoria é mantida junto da matriz de permissões (REQ-IDN-050).
- **REQ-AUD-007** (origem: REQ-TEN-051 | REQ-IDN-080): Os registros provisórios das specs 002 e 003 DEVEM ser migrados para a trilha, sem perda e na ordem original.

**Trilha de auditoria: integridade**

- **REQ-AUD-010** (origem: CONST V "append-only"): A trilha DEVE aceitar apenas inclusão; nenhuma credencial de aplicação DEVE ter permissão de alterar ou apagar registros.
- **REQ-AUD-011** (origem: CONST V): Cada registro DEVE estar encadeado ao anterior por impressão digital criptográfica, de modo que qualquer alteração, remoção ou reordenação seja detectável.
- **REQ-AUD-012** (origem: CONST V | CONST X): Uma verificação diária DEVE conferir a cadeia e gravar um selo do dia fora do banco e fora da OCI; quebra da cadeia DEVE gerar alerta crítico (REQ-FND-045).
- **REQ-AUD-013** (origem: CONST X | REQ-FND-050): A trilha DEVE entrar no backup e na cópia fora da OCI da spec 001.
- **REQ-AUD-014** (origem: CONST IV | C4): A trilha DEVE guardar identificadores de pessoas, não nomes, e-mails nem celulares; os dados pessoais associados ficam num cadastro separado que pode ser apagado ou anonimizado (spec 022) sem alterar a trilha.
- **REQ-AUD-015** (origem: CONST II): Registros com tenant DEVEM carregar o `tenant_id` como campo indexado; consultas feitas a partir de um tenant só alcançam registros daquele tenant.

**Trilha de auditoria: retenção e consulta**

- **REQ-AUD-020** (origem: CONST IV guarda fiscal | DF 13): Os registros DEVEM ser retidos por no mínimo 5 anos; após esse prazo, só podem ser removidos em bloco por procedimento registrado que preserve o selo dos dias removidos.
- **REQ-AUD-021** (origem: DF 9.5): A tela "Trilha de auditoria" do back-office DEVE permitir pesquisar por período, tenant, ator, perfil, ação, alvo, sessão de suporte, resultado e `correlation_id`, com paginação.
- **REQ-AUD-022** (origem: CONST 6): Consultas de até 90 dias DEVEM responder em até 5 segundos (p95); consultas maiores podem ser assíncronas, com aviso quando prontas.
- **REQ-AUD-023** (origem: CONST V | DF 7): O recorte por perfil DEVE ser: SRE vê tudo; Financeiro/Ops, as categorias financeiras; Suporte, os próprios registros e os das sessões de que participou; o DPO, pelo perfil SRE ou por acesso temporário registrado.
- **REQ-AUD-024** (origem: CONST V): Toda consulta e exportação da trilha DEVE gerar registro na própria trilha.
- **REQ-AUD-025** (origem: CONST V): A exportação DEVE exigir justificativa, incluir a prova de integridade do intervalo e expirar em 24 horas.
- **REQ-AUD-026** (origem: CONST IV): Fora do perfil SRE, o IP DEVE aparecer truncado.
- **REQ-AUD-027** (origem: REQ-IDN-062 | DF 2.5): O Proprietário DEVE ver no painel toda a trilha do próprio tenant, incluindo as ações da própria equipe e as das sessões de suporte (spec 003), com filtros por pessoa, ação, filial e período; a tela é nova no painel e precisa entrar no protótipo.
- **REQ-AUD-028** (origem: CONST 6): A gravação do registro NÃO DEVE acrescentar mais de 50 ms (p95) à ação.

**Feature flags**

- **REQ-FLG-001** (origem: DF 3.4.6 | CONST 4.4 `backoffice`): DEVE existir um cadastro único de flags, com nome estável, descrição, responsável, tipo (liberação, interruptor de emergência, operacional), valor seguro, valor por ambiente, regras de alvo e data prevista de remoção (obrigatória para flags de liberação).
- **REQ-FLG-002** (origem: DF 3.4.6): As regras de alvo DEVEM aceitar: todos, nenhum, lista de inclusão de tenants, lista de exclusão de tenants, vertical e porcentagem de tenants, com a precedência: interruptor de emergência desligado > exclusão > inclusão > vertical > porcentagem > valor padrão do ambiente.
- **REQ-FLG-003** (origem: DF 3.4.6): A avaliação DEVE ser determinística por tenant; na porcentagem, o mesmo tenant fica sempre no mesmo grupo enquanto a regra não mudar.
- **REQ-FLG-004** (origem: CONST II): Na requisição de equipe, a flag é avaliada pelo tenant ativo; na do consumidor, pelo tenant do estabelecimento da página; sem tenant, pela regra global. O tenant da avaliação NUNCA vem do cliente.
- **REQ-FLG-005** (origem: DF 3.4.6 | CONST X): Mudanças DEVEM chegar a serviços, web e app em até 60 segundos, sem deploy nem reinício.
- **REQ-FLG-006** (origem: CONST X): Na falha da avaliação, DEVE valer o último valor conhecido e, sem ele, o valor seguro.
- **REQ-FLG-007** (origem: DF 7 | CONST V | CONST 4.1): Só o perfil SRE DEVE criar, alterar ou remover flags.
- **REQ-FLG-008** (origem: CONST V | REQ-IDN-022): Mudanças em produção DEVEM exigir justificativa e reautenticação recente com segundo fator, mostrar antes quantos tenants serão afetados, e gerar registro de auditoria com valor anterior e novo.
- **REQ-FLG-009** (origem: CONST X): Toda flag DEVE ter histórico de versões, e o SRE DEVE poder voltar a qualquer versão anterior num passo.
- **REQ-FLG-010** (origem: concorrência): Mudança feita a partir de versão desatualizada da flag DEVE ser recusada.
- **REQ-FLG-011** (origem: DF 9.5): A tela "Feature flags" do back-office DEVE listar flags com tipo, estado por ambiente, regras, tenants afetados, responsável, data de remoção e último uso, e permitir criar, alterar, reverter e acionar interruptores.
- **REQ-FLG-012** (origem: DF 3.4.6): Toda funcionalidade nova visível ao usuário DEVE chegar a produção protegida por flag de liberação, desligada por padrão; exceção registrada no plano da spec (CONST 9.4).
- **REQ-FLG-013** (origem: CONST VIII): Os testes DEVEM cobrir cada funcionalidade com flag de liberação ligada e desligada.
- **REQ-FLG-014** (origem: CONST XII): DEVE haver verificação semanal de flags vencidas e sem uso há 30 dias; flag de liberação vencida há mais de 30 dias DEVE fazer falhar os PRs que tocam o código dela; flag citada no código e ausente do cadastro (ou o contrário) DEVE falhar o PR.
- **REQ-FLG-015** (origem: escopo): Flags são operacionais. Liberar funções por plano de assinatura é da spec 019, e concessões e degustação são da spec 021; nenhuma delas usa este cadastro para decidir cobrança.

### Key Entities

- **Registro de auditoria**: identificador, posição na cadeia, impressão digital do anterior e do próprio registro, ator, perfil, ação, alvo, tenant, sessão de suporte, justificativa, IP, `request_id`, `correlation_id`, resultado, horário.
- **Catálogo de ações auditáveis**: código da ação, categoria (Gestão, financeira, suporte, administrativa de tenant), exige justificativa (sim ou não).
- **Selo diário**: data, impressão digital final do dia, quantidade de registros, local externo, horário da gravação.
- **Cadastro de pessoas da trilha**: identificador usado na trilha e dados de exibição, apagáveis ou anonimizáveis.
- **Consulta ou exportação da trilha**: quem, filtros, justificativa (na exportação), validade do link.
- **Flag**: nome, descrição, responsável, tipo, valor seguro, valores por ambiente, regras de alvo, data de remoção, versão, estado (ativa, vencida, sem uso, removida).
- **Versão de flag**: flag, número, configuração completa, autor, justificativa, horário.
- **Avaliação de flag** (agregada): flag, superfície, contagem por valor, último uso.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.5) | Código |
|---|---|---|
| Back-office | Trilha de auditoria | G10 |
| Back-office | Feature flags | G09 |
| Painel do cliente | Trilha do próprio tenant (REQ-AUD-027) | Sem tela no protótipo: precisa ser desenhada |

---

## Regras e estados

**Categorias obrigatórias de auditoria** (REQ-AUD-001):

| Categoria | Exemplos | Justificativa obrigatória |
|---|---|---|
| Gestão | Provisionar, suspender, flags, contas da Gestão, concessões, KYC | Sim |
| Sessão de suporte | Toda ação durante a sessão | Sim (a da sessão) |
| Financeira | Cobrança, estorno, repasse, antecipação, NFS-e, assinatura, desconto, ajuste de saldo | Sim para ações manuais; não para automáticas |
| Administrativa de tenant | Equipe e papéis, recebedor, comissão, políticas, preços | Não |

**Estados da flag**: `ativa` → `vencida` (data de remoção passou) → `removida`; `ativa` → `sem_uso` (30 dias sem consulta) → `ativa` (voltou a ser consultada) ou `removida`. Uma flag `removida` não volta; recria-se com outro nome.

**Precedência de regras**: interruptor de emergência desligado > exclusão > inclusão > vertical > porcentagem > padrão do ambiente.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Identificador do ator e do alvo | Pseudônimo | Obrigação legal e segurança (art. 7, II e IX) | 5 anos (REQ-AUD-020) | Conforme recorte do REQ-AUD-023 |
| Dados de exibição do ator (nome, e-mail) | Pessoal | Segurança | Enquanto houver vínculo; apagáveis ou anonimizáveis pela spec 022 | Mesmo recorte |
| IP | Pessoal | Segurança | 5 anos | Completo só para SRE; truncado para os demais |
| Justificativa (texto livre) | Pode conter dado pessoal | Segurança e transparência | 5 anos | Mesmo recorte; a tela avisa para não escrever dados de terceiros |
| Flags | Sem dado pessoal | — | — | SRE |

Regras: a trilha nunca guarda conteúdo de negócio (valores de anotação, dados bancários, CPF); só identificadores e o código da ação. O mascaramento da spec 001 vale para tudo o que esta spec registra em log.

---

## Permissões

Recorte da matriz RBAC (DF 7):

| Ação | Proprietário | Suporte | Fin/Ops | Comercial/Growth | SRE |
|---|---|---|---|---|---|
| Ver trilha completa | — | — | — | — | ✔ |
| Ver trilha das categorias financeiras | — | — | ✔ | — | ✔ |
| Ver os próprios registros e os das próprias sessões de suporte | — | ✔ | ✔ | ✔ | ✔ |
| Exportar trilha | — | — | ✔ (financeira) | — | ✔ |
| Ver toda a trilha do próprio tenant (equipe e sessões de suporte) | ✔ (REQ-AUD-027, clarify 2026-11-25) | — | — | — | — |
| Criar, alterar, reverter flag; acionar interruptor | — | — | — | — | ✔ |
| Ver flags | — | — | — | — | ✔ |

Nenhum perfil de tenant, além do Proprietário no recorte acima, e nenhum consumidor acessa funções desta spec.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `backoffice.audit_chain.verified.v1` | Verificação diária concluída, com o selo |
| `backoffice.audit_chain.broken.v1` | Quebra da cadeia detectada |
| `backoffice.audit.exported.v1` | Exportação gerada |
| `backoffice.feature_flag.created.v1` / `.changed.v1` / `.reverted.v1` / `.removed.v1` | Ciclo da flag |
| `backoffice.feature_flag.kill_switch_triggered.v1` | Interruptor de emergência acionado |

O registro de auditoria em si não é publicado como evento para outros domínios; outros domínios gravam na trilha pela biblioteca compartilhada de auditoria (CONST 4.2, `packages/platform`).

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Cobertura de auditoria (ações obrigatórias com registro / total) | CONST V · DF 13 | 100% |
| Verificações diárias da cadeia com sucesso | REQ-AUD-012 | 100% |
| Tempo de consulta da trilha (p95, 90 dias) | REQ-AUD-022 | Até 5 s |
| Tempo acrescentado pela gravação (p95) | REQ-AUD-028 | Até 50 ms |
| % de releases com flag | DF 3.4.6 | Acompanhada; meta de 100% das funcionalidades visíveis |
| Tempo de propagação de mudança de flag (p95) | REQ-FLG-005 | Até 60 s |
| Flags vencidas e sem uso | REQ-FLG-014 | 0 vencidas há mais de 30 dias |
| Acionamentos de interruptor de emergência | REQ-FLG-001 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das ações das categorias obrigatórias têm exatamente um registro, verificado por teste automatizado para cada ação existente.
- **SC-002**: Qualquer alteração, remoção ou reordenação de registro feita diretamente no armazenamento é detectada pela verificação diária em 100% dos testes de adulteração.
- **SC-003**: O SRE encontra todas as ações de um tenant num período de 90 dias em até 5 segundos, sem acesso ao banco.
- **SC-004**: Uma funcionalidade protegida por flag é ligada para um único tenant e aparece só para ele, em todas as superfícies, em até 60 segundos.
- **SC-005**: Um interruptor de emergência acionado para a funcionalidade em todos os tenants em até 60 segundos, sem deploy.
- **SC-006**: 100% das mudanças de flag em produção têm justificativa, autor e registro na trilha, e podem ser revertidas num passo.
- **SC-007**: Nenhuma flag de liberação fica vencida por mais de 30 dias sem que o CI bloqueie o código dela.
- **SC-008**: 100% dos registros provisórios das specs 002 e 003 estão na trilha após a implantação.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| Visibilidade da trilha para o Proprietário (REQ-AUD-027) | Escopo do painel; tela nova no protótipo; recorte de dados da própria equipe | **Resolvido (clarify 2026-11-25)**: toda a trilha do tenant; tela nova no painel |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **C4** | ASSUMIDO: a trilha guarda pseudônimos; dados de exibição apagáveis pela spec 022 sem quebrar a cadeia |
| **C3** | Flags por tenant reduzem o risco de release com um desenvolvedor; ferramenta gratuita ou auto-hospedada (REQ-FND-048) escolhida no plano |
| Retenção | ASSUMIDO: 5 anos, alinhado à guarda fiscal (CONST IV) |
| Fronteira com planos e concessões | ASSUMIDO: flags não decidem cobrança; planos na spec 019, concessões na spec 021 |

---

## Fora do escopo desta especificação

- Liberação de funções por plano de assinatura (spec 019) e concessões e degustação (spec 021).
- Antifraude e chargebacks (spec 021).
- Processamento de pedidos de titular sobre a trilha (spec 022); aqui só nasce a separação entre pseudônimo e dado de exibição.
- Testes A/B com métricas de conversão por variante; as flags desta spec são liga e desliga por tenant.
- Flags por consumidor individual.
- Painéis de BI sobre a trilha (spec 023).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: consulta de 90 dias em até 5 s; gravação com até 50 ms a mais; propagação de flag em até 60 s; verificação semanal de flags; 30 dias para "sem uso" e para bloquear flag vencida; link de exportação válido por 24 horas; retenção de 5 anos.
- O selo diário usa o mesmo armazenamento fora da OCI do backup da spec 001, respeitando o custo zero (REQ-FND-048).
- O DPO usa o perfil SRE ou recebe acesso temporário registrado; não há perfil próprio de DPO na v1.0 (DF 2.5 não o lista).
- A lista de ações auditáveis por categoria cresce a cada spec; cada spec que cria ação obrigatória a registra no catálogo e na matriz de permissões.
- Ações automáticas (por exemplo, cobrança recorrente) usam como ator a identidade do processo que as executou.
