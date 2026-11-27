# Feature Specification: Fundação da plataforma Koovela

**Feature Branch**: `001-fundacao-plataforma`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "Fundação da plataforma Koovela (spec 001 "fundacao-plataforma", fase v1.0): base única onde as especificações 002 a 038 são construídas, testadas, publicadas e operadas do mesmo jeito — ambiente local, portões de PR, build ARM64 e deploy, endereços koovela.com, observabilidade, backup, design tokens e shells, contratos, segredos e links universais."

**Fase**: v1.0

**Superfícies afetadas**: app do consumidor (shell) · web do consumidor (shell e páginas públicas esqueleto) · painel do cliente (shell, inclui modo desktop do colaborador) · app do colaborador (shell) · back-office (shell) · BI (somente endereço protegido) · portal do parceiro (somente endereço reservado, fase 3)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), seções 1, 3, 4, 6, 9 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.5, 3.4, 11, 12, 13 e 16. Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Antes de qualquer funcionalidade de negócio, a Koovela precisa de uma base comum. Sem ela, cada especificação seguinte (002 a 038) reinventaria como é construída, testada, publicada e operada, e os erros caros apareceriam tarde. Hoje não existe nada: nem repositório estruturado, nem ambientes, nem domínio configurado, nem pipeline.

Problemas do Documento Fundamental atendidos (DF 3.4):

| # | Problema | Indicador |
|---|---|---|
| 3.4.1 | Gestão técnica da plataforma | Cobertura de observabilidade; MTTD |
| 3.4.2 | Corrigir problemas técnicos | MTTR |

Riscos que esta base contém (DF 16):

- **C3**: complexidade operacional de microsserviços e schema por tenant com um desenvolvedor e dois hosts.
- **D22**: imagem de produção construída fora de ARM64 ou na máquina de desenvolvimento.
- Vazamento de segredo ou de dado pessoal em log.
- Dois hosts sem redundância e sem backup testado.

Personas: desenvolvedor da Koovela; Engenharia/SRE (DF 2.5); e, indiretamente, todo consumidor, tenant e colaborador que acessa um endereço koovela.com.

---

## Clarifications

### Session 2026-11-24

- Q: Como os serviços rodam em produção nos dois hosts da OCI (PEN-20)? → A: Docker Compose em cada host, sem orquestrador; domínios agrupados em poucos processos, separáveis depois sem emenda. Decisão proposta como D44.
- Q: Em que máquina o staging roda? → A: Em duas VMs ARM64 na OCI, em conta separada da produção, espelhando a topologia de produção (um host de aplicação e um host de dados). VMs x86_64 no Mac foram descartadas por não executarem as imagens ARM64 de produção.
- Q: A quem e em que horário os alertas chegam? → A: Alertas críticos de produção chegam como push no celular 24x7; avisos e tudo o que é de staging chegam por e-mail ou resumo, só em horário comercial (seg. a sex., 9h às 18h, America/Sao_Paulo).
- Q: Os apps nativos de teste vão para os canais de teste da Apple e do Google nesta spec? → A: Só Android agora (teste interno do Google Play). O iOS roda em simulador; o arquivo de associação da Apple é publicado e validado apenas no formato, e a comprovação em iPhone real fica para quando existir a conta Apple Developer.
- Q: Qual é o teto mensal de gasto com serviços fora das VMs da OCI? → A: R$ 0. Só planos gratuitos ou alternativas auto-hospedadas (nas VMs da OCI ou em equipamento próprio).

### Session 2026-11-25

- Q: O GitHub Free não oferece proteção de branch nem aprovação de ambiente em repositório privado; como garantir REQ-FND-011 e REQ-FND-024 com custo R$ 0? → A: Tornar o repositório de código público no GitHub (proteção de branch, aprovação de ambiente e runners ARM64 gratuitos). Segredos e dados reais continuam fora do repositório.
- Q: Onde rodam o CI e o build ARM64? → A: Nos runners hospedados do GitHub (gratuitos e sem limite de minutos em repositório público), com build nativo `ubuntu-24.04-arm`.
- Q: Com o repositório público, `specs/` e `.specify/` vão para o repositório? → A: Não. Specs, constituição e Documento Fundamental ficam só locais; o lint de especificação roda como hook local antes do commit e por comando, não no PR.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ambiente local completo com um comando (Priority: P1)

Como desenvolvedor, quero subir o ambiente local completo com um único comando, em macOS Intel, com dados sintéticos, para começar qualquer especificação em minutos.

**Why this priority**: tudo o mais, inclusive os testes de integração do pipeline, depende de um ambiente reproduzível. É também a mitigação direta de C3.

**Independent Test**: em uma máquina macOS Intel recém-preparada, clonar o repositório, copiar o arquivo de exemplo de configuração e executar o comando único; todas as superfícies e dependências respondem saudáveis.

**Acceptance Scenarios**:

1. **Given** uma máquina macOS Intel com apenas os pré-requisitos documentados instalados, **When** o desenvolvedor executa o comando único de subida, **Then** banco, fila, cache, gateway, serviços e todas as superfícies web sobem e respondem saudáveis em até 15 minutos na primeira execução e em até 3 minutos nas seguintes.
2. **Given** o ambiente local no ar, **When** o desenvolvedor abre as superfícies em endereços `*.localhost`, **Then** cada shell aparece com a identidade visual Koovela e a navegação do protótipo.
3. **Given** o ambiente local recém-criado, **When** o desenvolvedor consulta qualquer dado carregado, **Then** todo dado é sintético e marcado como tal; nenhum dado real de pessoa existe no ambiente.
4. **Given** o ambiente local no ar, **When** o desenvolvedor executa o comando de reinício limpo, **Then** o ambiente volta ao estado inicial com os mesmos dados sintéticos, de forma determinística.
5. **Given** uma dependência que falha ao subir, **When** o comando único termina, **Then** ele informa qual componente falhou e por quê, e retorna erro, em vez de declarar sucesso parcial.

---

### User Story 2 - Portões obrigatórios no PR (Priority: P1)

Como desenvolvedor, quero que todo PR passe automaticamente pelos portões obrigatórios e que o merge seja bloqueado se algum falhar.

**Why this priority**: os portões são o mecanismo que torna a constituição verificável (CONST 9.3 e Princípio VIII). Sem eles, nenhuma regra é aplicada de fato.

**Independent Test**: abrir PRs de teste, cada um violando de propósito um portão diferente, e verificar que cada um é bloqueado com a mensagem do portão violado; um PR limpo é liberado.

**Acceptance Scenarios**:

1. **Given** um PR aberto contra a branch principal, **When** o pipeline roda, **Then** executa: lint, verificação de tipos, testes de unidade, testes de integração com banco, fila e cache reais (sem substituição por simulação), testes de contrato, varredura de segredos, auditoria de dependências e verificação de build ARM64.
2. **Given** um PR em que qualquer portão falha, **When** alguém tenta o merge, **Then** o merge é bloqueado, inclusive para o administrador do repositório.
3. **Given** uma `spec.md` local sem fase, sem superfícies, com requisito sem origem ou com pendência bloqueante sem decisão, **When** o desenvolvedor faz commit (hook local) ou roda o comando de lint de especificação, **Then** o lint falha indicando a linha e a regra violada.
4. **Given** um PR que introduz um segredo (chave, token, senha) em qualquer arquivo, **When** a varredura roda, **Then** o PR falha e o segredo não chega à branch principal.
5. **Given** um PR que usa versão flutuante (imagem base sem digest, dependência sem lockfile, tag `latest`), **When** o pipeline roda, **Then** o PR falha.
6. **Given** um PR típico que altera um único domínio, **When** o pipeline roda, **Then** termina em até 15 minutos (p90).

---

### User Story 3 - Build ARM64, deploy em staging, promoção e rollback (Priority: P1)

Como SRE, quero que o merge na branch principal gere imagens ARM64 com versão imutável, publicadas no registro, implantadas automaticamente em staging na OCI, com promoção manual e aprovada para produção e rollback para a versão anterior em um passo.

**Why this priority**: D22 e CONST X proíbem build de produção fora do pipeline; staging em ARM é exigido antes do primeiro cliente real.

**Independent Test**: fazer merge de uma mudança visível, observar a versão nova em staging, promovê-la para produção com aprovação e, em seguida, reverter com um único comando; cada passo deixa registro.

**Acceptance Scenarios**:

1. **Given** um merge na branch principal, **When** o pipeline de entrega roda, **Then** gera imagens `linux/arm64` identificadas por versão imutável (ligada ao commit) e por digest, e as publica no registro.
2. **Given** imagens novas publicadas, **When** o pipeline termina, **Then** staging passa a executar exatamente aquelas versões em até 20 minutos após o merge, e as verificações de saúde pós-deploy passam.
3. **Given** uma versão saudável em staging, **When** o SRE solicita a promoção para produção, **Then** a promoção só acontece após aprovação explícita registrada (quem, quando, qual versão) e usa os mesmos digests validados em staging, sem novo build.
4. **Given** uma versão em produção com problema, **When** o SRE executa o rollback, **Then** a versão anterior volta a responder em até 10 minutos, com um único comando, e o evento fica registrado.
5. **Given** uma verificação de saúde que falha após o deploy, **When** o deploy termina, **Then** o deploy é marcado como falho, o ambiente permanece na versão anterior e um alerta é emitido.
6. **Given** qualquer tentativa de publicar imagem de produção a partir de fora do pipeline, **When** o registro recebe a imagem, **Then** ela é recusada ou não é elegível para deploy.

---

### User Story 4 - Endereços koovela.com protegidos na borda (Priority: P2)

Como SRE, quero que cada endereço canônico de koovela.com (CONST 3) exista em staging e produção, com TLS, HSTS, WAF, rate limit e cabeçalhos de segurança, e que as superfícies internas (admin, bi) só abram com autenticação de borda e MFA.

**Why this priority**: o domínio é a porta de entrada de todo consumidor e tenant; configurá-lo depois exigiria retrabalho em links, QR codes e cookies.

**Independent Test**: varredura automatizada de cada endereço canônico em staging e produção conferindo resolução, TLS, cabeçalhos, redirecionamentos e bloqueio das superfícies internas.

**Acceptance Scenarios**:

1. **Given** a tabela de endereços canônicos (CONST 3), **When** a varredura roda, **Then** cada endereço resolve em produção e cada equivalente `*.staging.koovela.com` resolve em staging.
2. **Given** um acesso a `www.koovela.com`, **When** a requisição chega, **Then** é redirecionada com 301 para `koovela.com`, preservando caminho e parâmetros.
3. **Given** qualquer endereço público, **When** a resposta é inspecionada, **Then** ela vem apenas por TLS, com HSTS (incluindo `preload`), CSP própria da superfície, `X-Frame-Options: DENY` e demais cabeçalhos de segurança definidos.
4. **Given** um visitante sem autenticação de borda, **When** acessa `admin.koovela.com` ou `bi.koovela.com`, **Then** é bloqueado antes de chegar à aplicação; com autenticação de borda mas sem MFA, também é bloqueado.
5. **Given** muitas requisições em sequência da mesma origem, **When** o limite definido é ultrapassado, **Then** a borda passa a responder com recusa por excesso de requisições, sem atingir os serviços.
6. **Given** qualquer endereço de staging, **When** um robô de busca o acessa, **Then** recebe instrução de não indexação; o mesmo vale para `admin.koovela.com` em produção.
7. **Given** o endereço `parceiros.koovela.com` (fase 3), **When** acessado, **Then** está reservado e não serve aplicação.

---

### User Story 5 - Observabilidade, alertas e página de status (Priority: P2)

Como SRE, quero logs estruturados com tenant_id, request_id e correlation_id, mascaramento automático de PII, métricas, rastreamento entre gateway, serviços e filas, alertas e uma página pública de status fora da OCI, para detectar e corrigir falhas (DF 3.4: MTTD e MTTR).

**Why this priority**: com um desenvolvedor e dois hosts, detectar cedo é o que mantém o MTTR baixo.

**Independent Test**: disparar uma requisição de teste que atravessa gateway, um serviço e uma fila; localizar todos os registros pelo `correlation_id`; provocar uma falha e verificar alerta e página de status.

**Acceptance Scenarios**:

1. **Given** uma requisição que passa por gateway, serviço e fila, **When** o SRE pesquisa pelo `correlation_id`, **Then** encontra os logs e o rastreamento completo de ponta a ponta, com `service`, `request_id` e `tenant_id` quando houver tenant.
2. **Given** um log que contém CPF, telefone, e-mail, token ou segredo, **When** ele é gravado, **Then** esses valores aparecem mascarados, sem exceção e sem depender de cada desenvolvedor lembrar de mascarar.
3. **Given** um serviço de produção que para de responder, a qualquer hora, **When** a verificação de saúde falha, **Then** um alerta crítico chega ao celular do SRE em até 5 minutos e é reenviado se não for reconhecido em 15 minutos.
4. **Given** uma falha apenas em staging fora do horário comercial, **When** o alerta dispara, **Then** ele é entregue como aviso no próximo horário comercial, sem push noturno.
5. **Given** uma fila cuja fila de mensagens mortas cresce, **When** o limite é ultrapassado, **Then** um alerta é emitido.
6. **Given** uma indisponibilidade da OCI inteira, **When** um consumidor acessa `status.koovela.com`, **Then** a página responde (porque está fora da OCI) e mostra o estado dos componentes.
7. **Given** uma janela de manutenção planejada, **When** ela é declarada, **Then** aparece na página de status com antecedência.

---

### User Story 6 - Backup com restauração testada (Priority: P2)

Como SRE, quero backup diário com restauração a qualquer ponto no tempo, cópia fora da OCI e teste de restauração registrado, cumprindo RPO de 1 h e RTO de 4 h.

**Why this priority**: dois hosts sem redundância (DF 16) tornam o backup a única defesa contra perda de dados.

**Independent Test**: restaurar o banco de staging para um instante escolhido, a partir da cópia fora da OCI, medindo o tempo e conferindo os dados.

**Acceptance Scenarios**:

1. **Given** a operação normal, **When** o dia termina, **Then** existe um backup completo do dia e os registros contínuos necessários para restaurar qualquer instante com perda máxima de 1 hora.
2. **Given** um backup concluído, **When** ele é verificado, **Then** existe uma cópia íntegra fora da OCI, cifrada.
3. **Given** o teste mensal de restauração, **When** é executado, **Then** o banco é restaurado em até 4 horas, os dados são conferidos e o resultado (data, duração, ponto restaurado, quem executou, sucesso ou falha) fica registrado.
4. **Given** um backup que falha ou não acontece, **When** o horário previsto passa, **Then** um alerta é emitido.
5. **Given** 35 dias sem teste de restauração registrado, **When** o prazo vence, **Then** um alerta é emitido.

---

### User Story 7 - Design tokens únicos e shells navegáveis (Priority: P2)

Como desenvolvedor de interface, quero design tokens únicos, consumidos igualmente por web e app nativo, e os shells vazios das superfícies navegáveis com identidade visual, para que cada funcionalidade só precise plugar telas.

**Why this priority**: CONST XI proíbe cor ou fonte fixa no código; sem tokens e shells desde o início, cada spec criaria sua própria versão da interface.

**Independent Test**: alterar o valor de um token de cor e verificar que a mudança aparece em todos os shells, web e nativos, sem outra alteração de código.

**Acceptance Scenarios**:

1. **Given** o conjunto de tokens, **When** inspecionado, **Then** contém as cores de marca terracota `#B5532F`, oliveira `#3F4A2E` e creme `#F7EEDC`, a paleta funcional (sucesso, alerta, erro, informação), a escala de neutros, os estados de componente (hover, foco, desabilitado, carregando) e a tipografia DM Sans.
2. **Given** a troca do valor de um token, **When** os shells são reconstruídos, **Then** a mudança aparece em todas as superfícies web e nativas.
3. **Given** código de interface com cor ou fonte fixa, **When** o lint roda, **Then** o PR falha.
4. **Given** cada shell (app do consumidor, app do colaborador, web do consumidor, painel com modo desktop do colaborador, back-office), **When** aberto, **Then** mostra a identidade visual e a navegação do protótipo Figma (abas do consumidor, abas do colaborador, menu lateral do painel e do back-office), com cada destino levando a uma tela vazia identificada pelo código da tela do protótipo.
5. **Given** qualquer texto de interface nos shells, **When** inspecionado, **Then** vem de arquivo de i18n em pt-BR, não de texto fixo no código.
6. **Given** os shells, **When** avaliados por verificação automática de acessibilidade, **Then** não há violações de nível AA.

---

### User Story 8 - Contratos como fonte dos clientes (Priority: P3)

Como desenvolvedor, quero que contratos de API e de eventos sejam a fonte dos clientes gerados, e que uma quebra de contrato seja detectada no PR.

**Why this priority**: CONST VII exige contratos antes do código; esta spec entrega o mecanismo, que só ganha volume a partir da 003.

**Independent Test**: alterar o contrato de exemplo de forma incompatível e verificar que o PR falha; alterar de forma compatível e verificar que os clientes gerados se atualizam.

**Acceptance Scenarios**:

1. **Given** o contrato de saúde do gateway e um evento de exemplo, **When** o pipeline roda, **Then** os clientes web e nativo são gerados a partir deles, sem código escrito à mão para montar URL ou payload.
2. **Given** uma mudança incompatível em contrato publicado sem nova versão, **When** o PR roda, **Then** falha indicando a quebra.
3. **Given** uma rota externa nova, **When** é publicada, **Then** nasce sob `api.koovela.com/v1/...`.

---

### User Story 9 - Segredos, e-mail autenticado e security.txt (Priority: P2)

Como responsável pela segurança, quero segredos fora do repositório, um arquivo de exemplo com todas as chaves vazias, rotação documentada, e-mail com SPF/DKIM/DMARC nos domínios de envio e `security.txt` publicado.

**Why this priority**: um segredo vazado no histórico do repositório é praticamente irreversível.

**Independent Test**: conferir que o repositório não contém segredo (varredura do histórico inteiro), que o arquivo de exemplo lista todas as chaves usadas, e que os registros de DNS de e-mail e o `security.txt` estão publicados.

**Acceptance Scenarios**:

1. **Given** o repositório, **When** o histórico inteiro é varrido, **Then** não há nenhum segredo.
2. **Given** uma chave de configuração nova usada pelo código, **When** ela não está no arquivo de exemplo, **Then** o PR falha.
3. **Given** staging e produção, **When** inspecionados, **Then** os segredos vêm do cofre ou do mecanismo de segredos do ambiente, nunca de arquivo versionado, e nunca aparecem em log.
4. **Given** a saída de uma pessoa do projeto, **When** o procedimento documentado de rotação é executado, **Then** todos os segredos a que ela teve acesso são trocados e a rotação fica registrada.
5. **Given** os domínios de envio `mail.koovela.com` e `news.koovela.com`, **When** verificados, **Then** têm SPF, DKIM e DMARC com `p=quarantine`.
6. **Given** `koovela.com/.well-known/security.txt`, **When** acessado, **Then** responde com contato `seguranca@koovela.com` e data de expiração válida.

---

### User Story 10 - Links universais de koovela.com (Priority: P3)

Como consumidor, quero que `koovela.com/{slug}` e `app.koovela.com` abram o app quando ele estiver instalado e a web quando não estiver, mesmo que nesta spec a página ainda seja só um esqueleto.

**Why this priority**: links e QR codes impressos pelos estabelecimentos são duradouros; a associação precisa estar certa desde o primeiro.

**Independent Test**: em um aparelho Android com o app instalado pelo teste interno do Google Play, abrir um link de slug de teste; repetir sem o app. No iOS, validar o formato do arquivo de associação e o shell em simulador.

**Acceptance Scenarios**:

1. **Given** o app do consumidor instalado em Android pelo teste interno do Google Play, **When** o consumidor toca em `koovela.com/{slug}` ou em `app.koovela.com/...`, **Then** o app abre no shell, recebendo o slug ou o caminho.
2. **Given** o app não instalado, **When** o consumidor toca no mesmo link, **Then** a web do consumidor abre a página esqueleto correspondente, sem bloqueio pedindo instalação.
3. **Given** os arquivos de associação em `koovela.com/.well-known/`, **When** validados, **Then** associam `com.koovela.app` aos caminhos `koovela.com/{slug}` e `app.koovela.com/*`.
4. **Given** um slug inexistente, **When** acessado na web, **Then** a resposta é uma página de "não encontrado" com a identidade visual, não um erro técnico.

---

### Edge Cases

- **Pipeline indisponível** (GitHub Actions fora do ar): não existe caminho alternativo de build de produção; o deploy espera. O procedimento está no runbook.
- **Dependência nativa sem suporte a ARM64**: o build ARM64 do PR falha antes do merge, não no deploy.
- **Staging indisponível** (conta ou VM de staging fora do ar): nenhuma promoção para produção acontece, porque a versão precisa de saúde verde em staging; o rollback em produção continua disponível.
- **Deploy simultâneo** (dois merges em sequência rápida): os deploys em staging são serializados; o último merge vence e nenhum deploy fica pela metade.
- **Rollback para versão com migração de banco já aplicada**: as migrações seguem expandir → migrar → contrair, então a versão anterior continua compatível com o banco. A migração multi-schema em si é da spec 002.
- **Disco cheio no host de banco**: alerta antes de atingir o limite (por exemplo, 80%), e o backup não sobrescreve a última cópia boa.
- **Cópia fora da OCI inacessível**: o backup local continua e um alerta é emitido; o RPO é medido também na cópia externa.
- **Log com PII em formato inesperado** (por exemplo, CPF sem pontuação dentro de um texto livre): o mascaramento cobre padrões, não apenas nomes de campos.
- **Expiração do certificado de origem ou do `security.txt`**: alerta com 30 dias de antecedência.
- **Slug com caracteres especiais ou maiúsculas** nos links universais: normalização definida (minúsculas, sem acento), com redirecionamento para a forma canônica.
- **Mac de desenvolvimento sem recursos suficientes**: o comando único verifica memória e disco disponíveis antes de subir e avisa.

---

## Requirements *(mandatory)*

Formato: `REQ-FND-NNN (origem: …)`. Cada requisito é verificado pelos cenários de aceite da história indicada.

### Functional Requirements

**Repositório e ambiente local (História 1)**

- **REQ-FND-001** (origem: CONST 4.2 | CONST XII): O repositório DEVE seguir a estrutura única da CONST 4.2 (apps, services, packages, bi, infra, specs, docs), em um monorepo com toolchain compartilhada.
- **REQ-FND-002** (origem: CONST XII | DF 11.1): DEVE existir um único comando que sobe o ambiente local completo em macOS Intel (x86_64): banco, fila, cache, gateway, serviços e superfícies web, com acesso por endereços `*.localhost`.
- **REQ-FND-003** (origem: CONST 3 | CONST IV): Os ambientes de desenvolvimento e staging DEVEM usar apenas dados sintéticos, gerados de forma determinística e marcados como sintéticos.
- **REQ-FND-004** (origem: CONST X): Versões de runtime, imagens base (por digest) e dependências (por lockfile) DEVEM estar fixadas; tag `latest` e intervalos de versão flutuantes são proibidos.
- **REQ-FND-005** (origem: CONST XII | CONST 4.4): A base DEVE permitir implantar vários domínios num mesmo processo mantendo código, contrato e dados separados por domínio, e DEVE impedir no lint que um domínio importe o código interno de outro.
- **REQ-FND-006** (origem: CONST XII): As bibliotecas compartilhadas de plataforma (contexto de tenant, logging com mascaramento, erros padronizados, tipo de dinheiro, saúde do serviço) DEVEM existir como pacotes únicos, consumidos por todos os serviços. Nesta spec elas nascem com o mínimo necessário para o gateway e o serviço de exemplo; tenancy, auth, outbox e auditoria são completados nas specs 002 a 004.

**Portões de PR (História 2)**

- **REQ-FND-010** (origem: CONST VIII | CONST 9.3): Todo PR DEVE executar automaticamente: lint, verificação de tipos, testes de unidade, testes de integração com banco, fila e cache reais em contêiner, testes de contrato, varredura de segredos, auditoria de dependências e de imagens e verificação de build ARM64.
- **REQ-FND-011** (origem: CONST VIII | CONST 4.3): O merge na branch principal DEVE ser bloqueado enquanto qualquer portão falhar, sem exceção para administradores, e DEVE exigir PR (sem push direto).
- **REQ-FND-012** (origem: CONST VI | CONST 9.2 | esclarecimento 2026-11-25): O lint de especificação DEVE rodar como hook local antes do commit e por comando (as specs ficam fora do repositório público) e DEVE rejeitar `spec.md` sem fase, sem superfícies, sem alguma das seções obrigatórias da CONST 9.2, com requisito sem origem, ou com pendência marcada como bloqueante e sem decisão.
- **REQ-FND-013** (origem: CONST 4.3): O pipeline DEVE validar mensagens de commit no padrão Conventional Commits e nomes de branch no padrão `NNN-nome`; a única exceção são as branches automáticas do Dependabot (`dependabot/*`, REQ-FND-014).
- **REQ-FND-014** (origem: CONST 5): Cada release DEVE gerar SBOM, e atualizações de dependência DEVEM ser propostas automaticamente.
- **REQ-FND-015** (origem: pedido do responsável | CONST XII): O pipeline de PR DEVE terminar em até 15 minutos (p90) para um PR que altera um único domínio, executando apenas o que foi afetado, mais as suítes globais obrigatórias.

**Build, deploy e ambientes (História 3)**

- **REQ-FND-020** (origem: D22 | CONST X | DF 11.1): Imagens de produção DEVEM ser construídas exclusivamente no pipeline, para `linux/arm64`, e publicadas no registro com versão imutável ligada ao commit e com digest.
- **REQ-FND-021** (origem: D22 | CONST X): Somente imagens produzidas pelo pipeline, identificadas por digest, DEVEM ser elegíveis para deploy em staging e produção.
- **REQ-FND-022** (origem: D22 | DF 11.1): O deploy DEVE ser feito por pull a partir do registro pelos hosts de destino.
- **REQ-FND-023** (origem: CONST X | DF 11.1 | esclarecimento 2026-11-24): Staging DEVE rodar em dois hosts ARM64 na OCI, em conta separada da de produção, espelhando a topologia de produção (um host de aplicação com rota pública via borda e um host de dados sem rota pública), com a mesma composição de processos (REQ-FND-029) e a mesma topologia de subdomínios, e DEVE receber deploy automático a cada merge na branch principal. Rede, regras de firewall e composição de staging e produção DEVEM vir da mesma descrição como código, parametrizada por ambiente; credenciais, segredos e chaves de staging NÃO DEVEM ser compartilhados com produção.
- **REQ-FND-024** (origem: CONST 9.5 | pedido do responsável): A promoção para produção DEVE ser manual, exigir aprovação explícita registrada e reutilizar os digests validados em staging, sem novo build.
- **REQ-FND-025** (origem: pedido do responsável | DF 3.4.2): O rollback para a versão anterior DEVE ser executável em um único comando e concluído em até 10 minutos.
- **REQ-FND-026** (origem: CONST X): Todo deploy DEVE rodar verificações de saúde (liveness e readiness) e, se falharem, manter a versão anterior e emitir alerta.
- **REQ-FND-027** (origem: CONST X | DF 11.1): Rede, regras de firewall da OCI, DNS e WAF DEVEM estar descritos como código no repositório; o host de banco NÃO DEVE ter rota pública, a porta do banco NÃO DEVE sair da rede privada, e o acesso administrativo DEVE passar por bastion ou túnel.
- **REQ-FND-028** (origem: CONST 5): Cada serviço DEVE usar credencial própria de banco, com permissão apenas sobre os próprios objetos.
- **REQ-FND-029** (origem: PEN-20 → D44 | C3 | CONST XII | DF 11.1): Produção DEVE rodar nos dois hosts declarados (`app-prod-01` e `db-worker-01`), sem orquestrador, com a composição de contêineres de cada host descrita como código no repositório. Os domínios DEVEM ser agrupados em poucos processos implantáveis (por exemplo: gateway, núcleo de domínios v1.0, workers), e o agrupamento DEVE ser configuração, de modo que separar um domínio em processo próprio não exija mudança de código de domínio. Deploy e rollback operam por host e por processo, seguindo REQ-FND-022 a REQ-FND-026.

**Domínio e borda (História 4)**

- **REQ-FND-030** (origem: CONST 3): Cada endereço canônico da CONST 3 DEVE existir em produção, e seu equivalente `*.staging.koovela.com` em staging. Superfícies ainda sem funcionalidade respondem com o shell ou com página esqueleto; `parceiros.koovela.com` fica reservado sem aplicação (fase 3); `dev.koovela.com` fica reservado.
- **REQ-FND-031** (origem: CONST 3): `www.koovela.com` DEVE redirecionar com 301 para o apex, preservando caminho e parâmetros.
- **REQ-FND-032** (origem: CONST 3 | DF 11.2): Todo endereço público DEVE ser servido apenas por TLS, com HSTS com `preload`, CSP restritiva por superfície, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` restritiva e `Permissions-Policy` mínima.
- **REQ-FND-033** (origem: CONST 3 | CONST 4.1): Todo tráfego de aplicação DEVE passar pela borda com WAF e rate limit e entrar apenas por `api.koovela.com`; os hosts de origem NÃO DEVEM aceitar tráfego que não venha da borda.
- **REQ-FND-034** (origem: CONST 3 | CONST V): `admin.koovela.com` e `bi.koovela.com` DEVEM exigir autenticação de borda com MFA antes de qualquer requisição chegar à aplicação; `admin.koovela.com` DEVE também restringir por lista de IPs e nunca ser indexado.
- **REQ-FND-035** (origem: CONST 3): Staging DEVE responder com instrução de não indexação em todas as superfícies.
- **REQ-FND-036** (origem: CONST 3): Cookies de sessão DEVEM ser escopados ao subdomínio (nunca a `.koovela.com`), com `Secure`, `HttpOnly` e `SameSite=Lax`; o CORS do gateway DEVE aceitar apenas as origens canônicas do ambiente.

**Observabilidade e status (História 5)**

- **REQ-FND-040** (origem: CONST X | DF 11.7): Todo serviço DEVE emitir logs estruturados em JSON com `service`, `request_id`, `correlation_id` e, quando houver, `tenant_id`.
- **REQ-FND-041** (origem: CONST IV | DF 12): O logger compartilhado DEVE mascarar automaticamente as categorias de dado da seção "Dados pessoais", por nome de campo e por padrão de conteúdo; DEVE existir teste automatizado que falha se algum desses valores aparecer em claro em log, trace, métrica ou mensagem de erro.
- **REQ-FND-042** (origem: CONST X): O rastreamento DEVE propagar o contexto (incluindo `correlation_id`) entre borda, gateway, serviços e filas.
- **REQ-FND-043** (origem: CONST X | DF 11.7): DEVEM existir métricas por serviço (taxa de requisições, erros, latência p50/p95/p99, saturação) e por fila (profundidade, idade da mensagem mais antiga, fila de mensagens mortas), com painéis.
- **REQ-FND-044** (origem: CONST X): Erros não tratados DEVEM ser capturados por ferramenta de rastreamento de erros, já com o mascaramento aplicado.
- **REQ-FND-045** (origem: DF 3.4.1 | CONST X): DEVEM existir alertas para: serviço sem saúde, taxa de erro acima do limite, latência acima da meta da CONST 6, crescimento da fila de mensagens mortas, disco acima de 80%, falha de deploy, falha de backup, teste de restauração vencido e certificado ou `security.txt` a 30 dias de expirar. Cada alerta DEVE ter severidade. São **críticos**, e DEVEM chegar ao SRE como push no celular, 24x7, em até 5 minutos: produção sem saúde, taxa de erro de produção acima do limite, falha de backup de produção, disco de produção acima de 80% e falha de deploy em produção. Os demais, e todos os de staging, são **avisos**, entregues por e-mail ou resumo em horário comercial (seg. a sex., 9h às 18h, America/Sao_Paulo). Um alerta crítico não reconhecido em 15 minutos DEVE ser reenviado.
- **REQ-FND-048** (origem: esclarecimento 2026-11-24 | DF 14 | CONST XII): Todo serviço de terceiros usado pela base (borda, página de status, rastreamento de erros, envio de alertas, armazenamento da cópia de backup, observabilidade) DEVE estar em plano gratuito ou ser auto-hospedado; o gasto mensal fora das VMs da OCI DEVE ser R$ 0. Ferramentas auto-hospedadas DEVEM caber na capacidade dos hosts declarados, sem prejudicar as metas da CONST 6, e o plano DEVE registrar o limite de cada plano gratuito usado (cota, retenção, número de alertas) e o que acontece quando ele é atingido.
- **REQ-FND-046** (origem: CONST 3 | CONST 6): `status.koovela.com` DEVE estar hospedado fora da OCI (em plano gratuito de terceiro ou em equipamento próprio; nunca nas VMs da OCI), mostrar o estado de cada superfície pública e permitir declarar janelas de manutenção.
- **REQ-FND-047** (origem: DF 3.4.2): DEVE existir runbook para cada alerta, no repositório.

**Backup (História 6)**

- **REQ-FND-050** (origem: CONST X | DF 11.7): DEVE existir backup completo diário do banco e retenção contínua dos registros de transação que permita restaurar qualquer instante com perda máxima de 1 hora (RPO).
- **REQ-FND-051** (origem: CONST X | REQ-FND-048): Cada backup DEVE ter cópia cifrada fora da OCI, em cota gratuita de armazenamento de terceiro ou em equipamento próprio. Se a cota gratuita não comportar a retenção da REQ-FND-053, a retenção NÃO DEVE ser reduzida: a cópia passa para equipamento próprio.
- **REQ-FND-052** (origem: CONST X | CONST 6): O teste de restauração DEVE ocorrer pelo menos uma vez por mês, cumprir RTO de 4 horas e ter o resultado registrado no repositório (data, duração, ponto restaurado, executor, resultado).
- **REQ-FND-053** (origem: CONST X): Backups diários DEVEM ser mantidos por 35 dias e um backup mensal por 12 meses, salvo regra mais longa definida em spec posterior (guarda fiscal, CONST IV).

**Design tokens e shells (História 7)**

- **REQ-FND-060** (origem: CONST XI | DF 1.2 | D12): DEVE existir um único conjunto de design tokens com as cores de marca (terracota `#B5532F`, oliveira `#3F4A2E`, creme `#F7EEDC`), a paleta funcional e os neutros propostos no protótipo, os estados de componente e a tipografia DM Sans, consumido igualmente pela web e pelo app nativo.
- **REQ-FND-061** (origem: CONST XI): Cor ou fonte fixa no código de interface DEVE ser rejeitada pelo lint.
- **REQ-FND-062** (origem: CONST XI | CONST 10): DEVEM existir os shells de: app do consumidor (`com.koovela.app`), app do colaborador (`com.koovela.pro`), web do consumidor (`app.koovela.com` e páginas públicas de `koovela.com`), painel do cliente (`painel.koovela.com`, incluindo o modo desktop do colaborador em `/pro`) e back-office (`admin.koovela.com`).
- **REQ-FND-063** (origem: CONST XI | protótipo Figma): Cada shell DEVE reproduzir a navegação do protótipo (abas do consumidor, abas do colaborador, menu lateral do painel e do back-office); cada destino leva a uma tela vazia que exibe o código da tela do protótipo.
- **REQ-FND-064** (origem: CONST XI | D11): Todo texto de interface DEVE vir de arquivos de i18n, com pt-BR implementado.
- **REQ-FND-065** (origem: CONST XI | CONST VIII): Os shells DEVEM passar na verificação automática de acessibilidade nível AA, executada no pipeline.

**Contratos (História 8)**

- **REQ-FND-070** (origem: CONST VII): Contratos de API e de eventos DEVEM ficar em um local único do repositório e ser a fonte dos clientes gerados para web e app; código de cliente NÃO DEVE montar URL ou payload à mão.
- **REQ-FND-071** (origem: CONST VII): Uma mudança incompatível em contrato sem nova versão DEVE falhar no PR.
- **REQ-FND-072** (origem: CONST VII | D36): Toda rota externa DEVE nascer versionada sob `api.koovela.com/v1/...`. Esta spec publica apenas o contrato de saúde do gateway e um evento de exemplo seguindo o formato `<domínio>.<entidade>.<fato>.v<N>` (CONST IX).
- **REQ-FND-073** (origem: CONST 4.3): Erros de API DEVEM seguir o formato Problem Details (RFC 9457), com `code` estável e mensagem em pt-BR.

**Segredos, e-mail e segurança (História 9)**

- **REQ-FND-080** (origem: DF 11.5 | CONST 4.3): Arquivos de configuração local por ambiente DEVEM ser ignorados pelo controle de versão; um arquivo de exemplo versionado DEVE listar todas as chaves usadas, com valores vazios, e o PR DEVE falhar se o código usar chave ausente dele.
- **REQ-FND-081** (origem: DF 11.5 | CONST 4.3): Em staging e produção, segredos DEVEM vir do mecanismo de segredos do ambiente ou do cofre da OCI, nunca de arquivo versionado; variáveis de ambiente NUNCA DEVEM ser logadas.
- **REQ-FND-082** (origem: CONST 5): Segredos DEVEM ser verificados antes do push e no pipeline, e o histórico inteiro do repositório DEVE estar livre deles.
- **REQ-FND-083** (origem: DF 11.5 | CONST 4.3): DEVE existir procedimento documentado de rotação de segredos, executado na saída de qualquer pessoa e registrado.
- **REQ-FND-084** (origem: CONST 3): Os domínios de envio `mail.koovela.com` e `news.koovela.com` DEVEM ter SPF, DKIM e DMARC com `p=quarantine`; os endereços `suporte@`, `privacidade@` e `seguranca@koovela.com` DEVEM receber mensagens.
- **REQ-FND-085** (origem: CONST 3): `koovela.com/.well-known/security.txt` DEVE estar publicado, com contato `seguranca@koovela.com` e data de expiração.

**Links universais (História 10)**

- **REQ-FND-090** (origem: CONST 3 | D27): Os arquivos de associação de app em `koovela.com/.well-known/` DEVEM associar `koovela.com/{slug}` e `app.koovela.com/*` ao app `com.koovela.app`.
- **REQ-FND-091** (origem: CONST 3 | D27): Sem o app instalado, esses links DEVEM abrir a web do consumidor, sem bloqueio pedindo instalação.
- **REQ-FND-094** (origem: esclarecimento 2026-11-24 | D03): Os shells nativos Android (`com.koovela.app` e `com.koovela.pro`) DEVEM ser assinados no pipeline e distribuídos pelo teste interno do Google Play. Os shells iOS DEVEM compilar no pipeline e rodar em simulador; o arquivo `apple-app-site-association` DEVE ser publicado e validado no formato. A assinatura iOS, a distribuição pelo TestFlight e a validação em iPhone real ficam pendentes até existir a conta Apple Developer, e DEVEM ser concluídas antes da primeira spec com tela do consumidor em produção.
- **REQ-FND-092** (origem: CONST 3): `koovela.com/{slug}` DEVE ter página esqueleto com identidade visual, e slug inexistente DEVE retornar página de "não encontrado" com status 404. Unicidade, imutabilidade e redirecionamento de slug são da spec 005.
- **REQ-FND-093** (origem: CONST 6): As páginas públicas esqueleto DEVEM ter LCP abaixo de 2,5 s em 4G.

### Key Entities

Esta spec não cria entidades de negócio. Os registros operacionais abaixo são criados e guardados pela base:

- **Versão de release**: identificador imutável ligado ao commit, digests das imagens ARM64, SBOM, data de build.
- **Registro de deploy**: ambiente, versão, quem aprovou (produção), início, fim, resultado, se foi rollback.
- **Registro de backup**: tipo (diário, contínuo, mensal), início, fim, tamanho, local (OCI ou externo), resultado.
- **Registro de teste de restauração**: data, ponto restaurado, duração, executor, conferência, resultado.
- **Registro de rotação de segredo**: motivo, segredos afetados, data, executor (sem os valores).
- **Alerta**: regra, severidade, início, reconhecimento, resolução, runbook associado.

---

## Telas do protótipo cobertas

Nenhuma tela de negócio. Os shells seguem a estrutura de navegação do protótipo Figma "Koovela — Protótipo v1.0" (`https://www.figma.com/design/uHnkbY8CjhyvGU31WrpKN0`):

| Shell | Navegação do protótipo |
|---|---|
| App do consumidor | Abas do consumidor |
| App do colaborador | Abas do colaborador |
| Web do consumidor | Navegação equivalente às abas do consumidor |
| Painel do cliente (e `/pro`) | Menu lateral do painel |
| Back-office | Menu lateral do back-office |

A lista exata de itens de cada aba ou menu, com o código de tela de destino, é extraída do Figma no `/speckit-plan`.

---

## Regras e estados

- **Ciclo de uma versão**: `construída` → `publicada no registro` → `em staging` → (`aprovada`) → `em produção` → `substituída` ou `revertida`. Uma versão só entra em produção depois de estar em staging com saúde verde.
- **Ciclo de um deploy**: `iniciado` → `verificando saúde` → `concluído` ou `falho`; `falho` mantém a versão anterior.
- **Ciclo de um backup**: `agendado` → `em execução` → `concluído` (com cópia externa) ou `falho`.
- Apenas um deploy por ambiente executa por vez.

---

## Dados pessoais

Esta spec **não armazena dado pessoal de negócio**. Ela define o mascaramento que todas as specs seguintes herdam.

| Item | Definição |
|---|---|
| **Campos de negócio armazenados** | Nenhum |
| **Dados sintéticos** | Dev e staging usam apenas pessoas fictícias, geradas de forma determinística; carregar dado real nesses ambientes é proibido |
| **Categorias sempre mascaradas em log, trace, métrica e erro** | CPF, telefone, e-mail, data de nascimento, endereço, dados bancários e de cartão, anotações de atendimento, dados de menores, códigos OTP, tokens de acesso e de atualização, senhas, chaves e segredos, cabeçalhos de autorização e cookies |
| **Forma do mascaramento** | Por nome de campo e por padrão de conteúdo (CPF, telefone, e-mail, cartão), aplicado no logger compartilhado e no rastreamento de erros, sem depender do desenvolvedor |
| **Endereço IP** | Dado pessoal: completo apenas nos registros de segurança da borda; truncado nos logs de aplicação |
| **Retenção de logs** | Logs de aplicação por 30 dias; registros de segurança da borda por 90 dias |
| **Base legal** | Legítimo interesse e segurança da plataforma (LGPD art. 7, IX), restrito à operação |
| **Quem acessa** | Apenas o perfil Engenharia/SRE (DF 2.5), com acesso às ferramentas de observabilidade protegido por MFA |

---

## Permissões

Recorte da matriz RBAC: nesta spec não há RBAC de aplicação (spec 003). As permissões operacionais são:

| Ação | Quem |
|---|---|
| Fazer merge na branch principal | Desenvolvedor, via PR com todos os portões verdes |
| Aprovar promoção para produção e executar rollback | Engenharia/SRE |
| Acessar logs, métricas, traces, erros e alertas | Engenharia/SRE |
| Acessar segredos de staging e produção | Engenharia/SRE |
| Acessar `admin.koovela.com` e `bi.koovela.com` na borda | Perfis da Gestão listados na política de acesso da borda, com MFA |

Com um desenvolvedor, a mesma pessoa acumula os perfis. A promoção continua exigindo aprovação registrada.

---

## Eventos e métricas

### Eventos operacionais (registrados pela base)

| Evento | Quando |
|---|---|
| `platform.release.built.v1` | Imagens ARM64 publicadas no registro |
| `platform.deployment.started.v1` / `.succeeded.v1` / `.failed.v1` | Deploy em staging ou produção |
| `platform.deployment.promoted.v1` | Promoção aprovada para produção |
| `platform.deployment.rolled_back.v1` | Rollback executado |
| `platform.backup.completed.v1` / `.failed.v1` | Backup diário ou contínuo |
| `platform.restore_test.recorded.v1` | Teste de restauração registrado |
| `platform.secret.rotated.v1` | Rotação de segredo (sem valores) |
| `platform.alert.fired.v1` / `.resolved.v1` | Alerta disparado e resolvido |

### Métricas operacionais

| Métrica | Origem | Meta |
|---|---|---|
| MTTD (falha até o alerta) | DF 3.4.1 | Até 5 minutos para alertas críticos |
| MTTR (alerta até a resolução) | DF 3.4.2 · DF 14 | Acompanhada, sem meta nesta spec |
| Cobertura de observabilidade (% de serviços com logs, métricas, traces e saúde) | DF 3.4.1 | 100% |
| Disponibilidade mensal por superfície | CONST 6 | 99,5% |
| Duração do pipeline de PR (p90) | REQ-FND-015 | Até 15 minutos |
| Tempo do merge até staging | REQ-FND-023 | Até 20 minutos |
| Frequência de deploy e taxa de falha de deploy | CONST 9.5 | Acompanhadas |
| Tempo de rollback | REQ-FND-025 | Até 10 minutos |
| Idade do último backup íntegro e do último teste de restauração | REQ-FND-050, REQ-FND-052 | Até 1 hora (contínuo) · até 35 dias |
| Custo mensal fora das VMs da OCI | DF 14 · REQ-FND-048 | R$ 0 |
| Uso das cotas gratuitas (% do limite de cada serviço) | REQ-FND-048 | Aviso a partir de 80% |
| Achados de segredo e de vulnerabilidade crítica abertos | CONST 5 | 0 |

As métricas de produto da CONST 7 (taxa de instalação, parcela de agendamentos pela web, no-show, incidentes de reserva dupla) começam nas specs de negócio. Esta spec entrega o meio de emiti-las.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor sem contato prévio com o projeto, em macOS Intel, coloca o ambiente local completo no ar com um único comando em até 15 minutos na primeira vez e em até 3 minutos nas seguintes.
- **SC-002**: 100% dos PRs que violam um portão obrigatório são bloqueados (verificado com um PR de teste por portão), e nenhum PR é mesclado com portão falhando.
- **SC-003**: O pipeline de PR termina em até 15 minutos em 90% dos PRs de um único domínio.
- **SC-004**: 100% das versões em staging e produção correspondem a imagens ARM64 produzidas pelo pipeline, verificável pelo digest; zero imagens construídas em máquina de desenvolvimento.
- **SC-005**: Uma mudança mesclada aparece em staging em até 20 minutos, e um rollback em produção é concluído em até 10 minutos, em um passo.
- **SC-006**: 100% dos endereços canônicos passam na varredura de borda (resolução, TLS, HSTS, cabeçalhos, redirecionamento), e 100% das tentativas de acesso a admin e BI sem autenticação de borda com MFA são bloqueadas.
- **SC-007**: Uma falha de produção provocada em teste, inclusive fora do horário comercial, gera alerta crítico no celular em até 5 minutos, e a página de status continua respondendo com a OCI indisponível.
- **SC-008**: Zero ocorrências de dado pessoal ou segredo em claro nos logs, verificado pela suíte automatizada e por varredura mensal.
- **SC-009**: O primeiro teste de restauração recupera os dados a um instante escolhido, com perda de no máximo 1 hora, em até 4 horas, e fica registrado; depois disso, há um teste registrado a cada mês.
- **SC-010**: Trocar o valor de um token de cor muda a aparência de todos os cinco shells sem alteração em nenhum outro arquivo.
- **SC-011**: Em Android, o link `koovela.com/{slug}` abre o app quando instalado e a web quando não, em 100% das tentativas de teste; no iOS, o arquivo de associação passa na validação de formato e o shell abre em simulador.
- **SC-012**: O gasto mensal fora das VMs da OCI (dois hosts de produção e dois de staging) é R$ 0 em todos os meses, e nenhuma cota gratuita é ultrapassada sem aviso prévio.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma. `PEN-20` foi decidida em 2026-11-24 (ver Clarifications): Docker Compose em cada host, sem orquestrador, domínios agrupados em poucos processos. A decisão DEVE ser registrada como **D44** no registro de decisões e no Documento Fundamental (CONST VI).

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **PEN-02** | ASSUMIDO: koovela.com pertence a esta plataforma |
| **PEN-01** | ASSUMIDO: paleta funcional, neutros e estados propostos no protótipo; uma troca altera apenas valores de tokens, não nomes nem estrutura |
| **C1** | Não afeta esta spec: os domínios de envio de e-mail já nascem autenticados, preparando o canal multicanal da spec 011 |

---

## Fora do escopo desta especificação

- Schema por tenant, provisionamento e executor de migração multi-schema (spec 002).
- Identidade, login, OTP, MFA de aplicação, RBAC e impersonation (spec 003).
- Trilha de auditoria append-only e feature flags (spec 004).
- Qualquer regra de negócio de agenda, pagamento, catálogo ou fidelidade, e qualquer tela de negócio.
- Publicação dos apps nas lojas públicas; nesta spec o Android vai apenas para o teste interno do Google Play.
- Assinatura iOS, TestFlight e validação de links universais em iPhone real (dependem da conta Apple Developer; ver REQ-FND-094).
- Unicidade, imutabilidade e redirecionamento de slug (spec 005).
- Painéis de BI (spec 023); aqui só existe o endereço protegido.
- Portal do parceiro (fase 3, spec 038); aqui só existe o endereço reservado.
- Envio de e-mail transacional ou de campanha (specs 011 e 028); aqui só existe a autenticação dos domínios.

---

## Assumptions

- O Documento Fundamental usado como fonte é a v0.5, em `.specify/docs/fundamental/koovela-inicioII.md`, com as decisões D01 a D43.
- Nenhuma outra pessoa precisa aprovar produção além do responsável pelo produto, que acumula o perfil Engenharia/SRE na fase inicial.
- O registro de imagens, o pipeline e o repositório usam as contas já existentes; o repositório de código é **público** no GitHub (esclarecimento 2026-11-25), e as imagens no GHCR são públicas e assinadas. Nenhum segredo, dado real ou documento de negócio vai para o repositório; specs ficam locais. Os commits usam o e-mail `noreply` do GitHub.
- A conta Google Play Console será aberta para esta spec; a conta Apple Developer ainda não existe.
- Metas sem número no pedido foram fixadas assim: pipeline de PR em até 15 minutos (p90); merge até staging em até 20 minutos; rollback em até 10 minutos; alerta crítico em até 5 minutos; retenção de backup de 35 dias (diários) e 12 meses (mensais); logs de aplicação por 30 dias.
- A página de status e a cópia externa de backup usam planos gratuitos fora da OCI ou equipamento próprio (REQ-FND-048). Equipamento próprio, como o Mac de desenvolvimento, só conta como "fora da OCI" se o RTO de 4 horas continuar viável quando a cópia for necessária.
- A lista exata de abas e itens de menu vem do protótipo Figma e é registrada no plano.
