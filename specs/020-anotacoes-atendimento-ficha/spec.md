# Feature Specification: Anotações de atendimento e ficha do consumidor

**Feature Branch**: `020-anotacoes-atendimento-ficha`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "020 anotacoes-atendimento-ficha — seguir a sequência da constituição (seção 10): dado sensível. Depende de 003 e 009. Pendências PEN-05 e PEN-10. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: painel do cliente ("Ficha do consumidor ou paciente", "Anotações de atendimento", "Base de consumidores") · app do colaborador e `/pro` (anotação no detalhe do atendimento) · app do consumidor e web do consumidor (consentimento e consulta das próprias anotações)

**Depende de**: 003 `identidade-acesso` · 009 `agendamento-ciclo-de-vida` (e, por elas, 002 e 004 a 008)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, V, VIII, seções 2 (escopo negativo), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.2, 3.5, 4.1, 6, 7, 9.3, 9.4, 10.8, 11.4, 12, 16 e 18 (`[PEN-05]`, `[PEN-10]`, `[C4]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Todo profissional anota alguma coisa sobre o atendimento: a fórmula da coloração, a área tratada na depilação, a evolução da fisioterapia, o que foi conversado na sessão de terapia. Hoje isso fica num caderno ou no celular pessoal. Na saúde, e muitas vezes também na beleza (alergia a um produto, por exemplo), essas anotações são **dado pessoal sensível** (LGPD art. 11).

A constituição trata o tema com rigor (CONST IV):

- anotações de atendimento são cifradas por campo, com a chave fora do banco, e nunca pesquisadas por texto;
- dado de saúde exige base legal específica, **consentimento destacado**, **acesso segregado** e **retenção própria**;
- nenhum perfil da Gestão vê anotação (DF 7: Suporte não, SRE nunca).

O Documento Fundamental deixa claro o limite: **anotação de atendimento, não prontuário clínico completo** (DF 3.5, escopo negativo). E deixa abertas duas decisões: se a anotação existe na v1.0, quem acessa e por quanto tempo é guardada (`[PEN-05]`), e se Gerente e Proprietário acessam (`[PEN-10]`).

A spec também cobre a **ficha do consumidor** (ou do paciente, na saúde) dentro do estabelecimento e a **base de consumidores**, que hoje não têm dono em nenhuma spec anterior.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.2.10 | Provar o que foi feito | % de atendimentos com registro |
| 3.2.4 | Reter clientes | Recompra em 30, 60 e 90 dias (ficha e base) |
| DF 16 | Vazamento de dado de saúde | Criptografia por campo, segregação, auditoria |

Personas: Colaborador (escreve e lê as próprias anotações); consumidor ou paciente (consente e lê as próprias); Proprietário e Gerente (`[PEN-10]`); Recepção (ficha e base, sem anotações).

---

## Clarifications

### Session 2026-11-25

- Q: O Gerente vê o gasto dos consumidores na base? → A: Gerente (PEN-03, decidido na spec 003): vê faturamento e configura fidelidade só da própria filial; o Proprietário pode retirar.
- Q: A anotação de atendimento existe na v1.0, e por quanto tempo é retida? (PEN-05) → A: Existe na v1.0; retenção de 5 anos após o último atendimento do consumidor no negócio, para todas as verticais, inclusive saúde (o prontuário oficial exigido pelos conselhos fica com o estabelecimento, fora da plataforma).
- Q: Quem acessa anotações escritas por outros profissionais? (PEN-10) → A: Os profissionais que atendem o cliente e o Proprietário; o Gerente só se o Proprietário liberar; a Recepção nunca; todo acesso registrado.
- Q: Quem conta como "profissional que atende o cliente"? (análise 2026-11-27) → A: O Colaborador com agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses com o consumidor, no negócio; vínculo encerrado nunca conta.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor consente com o registro de anotações (Priority: P1)

Como consumidor, quero ser perguntado, de forma clara e separada de tudo o mais, se aceito que o estabelecimento registre anotações sobre meus atendimentos, sabendo quem vai ver e por quanto tempo.

**Why this priority**: a CONST IV exige consentimento destacado para dado de saúde; sem ele, nenhuma anotação sensível pode ser guardada.

**Independent Test**: num estabelecimento de saúde, agendar como consumidor novo, receber o pedido de consentimento, aceitar e conferir o registro; com outro consumidor, recusar e conferir que o profissional não consegue gravar anotação.

**Acceptance Scenarios**:

1. **Given** o primeiro agendamento de um consumidor num estabelecimento com anotações ligadas, **When** confirmado, **Then** o consumidor recebe (no app, na web ou pelo link do aviso, spec 011) um pedido de consentimento separado, explicando o que é anotado, quem lê, por quanto tempo fica guardado e como revogar.
2. **Given** o pedido, **When** o consumidor aceita, **Then** o consentimento fica registrado com estabelecimento, versão do texto, horário, aparelho e IP.
3. **Given** o pedido, **When** o consumidor recusa ou não responde, **Then** o profissional vê "sem consentimento para anotações" no atendimento e não consegue gravar anotação sobre aquele consumidor; o atendimento acontece normalmente.
4. **Given** o atendimento presencial sem resposta no app, **When** o profissional pede o consentimento no balcão, **Then** o consumidor aceita no próprio celular (aviso no app ou código OTP); a equipe não consegue registrar o consentimento sozinha.
5. **Given** um consentimento dado, **When** o consumidor o revoga no perfil, **Then** novas anotações deixam de ser possíveis; as existentes seguem a regra de retenção e de eliminação (spec 022), e o estabelecimento é avisado.

---

### User Story 2 - Profissional registra a anotação do atendimento (Priority: P1)

Como Colaborador, quero escrever a anotação do atendimento no app ou no painel, durante ou logo depois do atendimento, e ver as minhas anotações anteriores sobre aquele consumidor.

**Why this priority**: é a tela "Anotações de atendimento" (DF 9.3) e a função de prova do atendimento (DF 3.2.10).

**Independent Test**: no app do colaborador, abrir um atendimento de um consumidor com consentimento, escrever uma anotação com o modelo da vertical, salvar, e abrir o histórico das próprias anotações sobre ele.

**Acceptance Scenarios**:

1. **Given** um agendamento `EM_ATENDIMENTO` ou `CONCLUIDO` há até 7 dias, de um consumidor com consentimento, **When** o Colaborador do atendimento abre "anotação", **Then** escreve texto livre (até 5.000 caracteres), opcionalmente seguindo o modelo da vertical (por exemplo, beleza: produtos e fórmula; estética: área e parâmetros; saúde: evolução e conduta), e pode anexar até 5 fotos.
2. **Given** a anotação, **When** salva, **Then** fica cifrada, ligada ao agendamento, ao consumidor e ao autor, com data e hora.
3. **Given** a anotação salva, **When** passam 24 horas, **Then** não pode mais ser editada; correções viram adendos com data e autor, e a versão original continua guardada.
4. **Given** o Colaborador, **When** abre o histórico de um consumidor, **Then** vê as próprias anotações sobre ele, das mais recentes às mais antigas, filtrando por data; a busca por texto dentro das anotações não existe (CONST IV).
5. **Given** a tela de escrita, **When** aberta, **Then** avisa que o consumidor pode ler a anotação (DF 7, "própria") e que ela não substitui o prontuário exigido pelo conselho profissional.
6. **Given** a existência da anotação na v1.0, **When** o negócio é configurado, **Then** a anotação existe na v1.0, ligada por padrão na saúde e desligada na beleza, com retenção de 5 anos após o último atendimento do consumidor no negócio, para todas as verticais; a tela avisa que o prontuário oficial exigido pelo conselho fica sob responsabilidade do estabelecimento (`[PEN-05]` resolvido).

---

### User Story 3 - Alerta de cuidado visível a quem vai atender (Priority: P1)

Como Colaborador, quero marcar um alerta curto (por exemplo, "alergia a amônia") que apareça em destaque para qualquer profissional do estabelecimento que vá atender aquele consumidor, sem que ele precise abrir as anotações.

**Why this priority**: segurança do atendimento; o risco precisa estar à vista no momento do atendimento, e a Recepção precisa saber que existe sem ver o conteúdo.

**Independent Test**: o profissional A registra um alerta; o profissional B, com agendamento do mesmo consumidor, vê o alerta em destaque no atendimento; o profissional C, sem agendamento nem atendimento nos últimos 12 meses com ele, não vê o alerta nem as anotações de A; a Recepção vê só o indicativo.

**Acceptance Scenarios**:

1. **Given** uma anotação, **When** o Colaborador marca um alerta de cuidado (até 140 caracteres), **Then** o alerta fica cifrado e ligado ao consumidor naquele negócio.
2. **Given** um agendamento futuro do consumidor com qualquer profissional do negócio, **When** esse profissional abre o atendimento, **Then** vê os alertas ativos, com autor e data; não vê as anotações.
3. **Given** um alerta, **When** o autor ou o Proprietário o desativa, **Then** deixa de aparecer e fica no histórico.
4. **Given** a Recepção, **When** abre o agendamento, **Then** vê só que "há alerta de cuidado para o profissional", sem o conteúdo.

---

### User Story 4 - Acesso segregado e registrado (Priority: P1)

Como plataforma, quero que só as pessoas permitidas pela matriz vejam anotações, que toda leitura fique registrada e que nenhum perfil da Gestão tenha acesso.

**Why this priority**: CONST IV e V; o vazamento de dado de saúde é risco alto (DF 16).

**Independent Test**: com anotações de teste, tentar ler com Recepção, com um Colaborador que não atende o cliente, com Suporte em sessão de suporte e com SRE; todos são negados. Ler com o autor e conferir o registro da leitura.

**Acceptance Scenarios**:

1. **Given** uma anotação, **When** o autor a lê, **Then** a leitura é permitida e registrada (quem, quando, qual anotação).
2. **Given** um Colaborador que não atende o cliente, a Recepção, o Suporte (mesmo em sessão de suporte, REQ-IDN-063) ou o SRE, **When** tentam ler, **Then** são negados.
3. **Given** o Gerente ou o Proprietário, **When** tentam ler anotações de outros profissionais, **Then** o Proprietário pode ler; o Gerente só se o Proprietário tiver liberado; todo acesso é registrado na trilha (`[PEN-10]` resolvido).
4. **Given** o consumidor, **When** abre os próprios atendimentos no app ou na web, **Then** vê as anotações sobre ele (DF 7, "própria"), com autor e data, e o registro dessa leitura também fica guardado.
5. **Given** qualquer leitura de anotação, **When** acontece, **Then** gera registro na trilha de auditoria (spec 004) sem o conteúdo.
6. **Given** um Colaborador com vínculo encerrado (spec 007), **When** tenta acessar, **Then** é negado; as anotações dele continuam guardadas pelo negócio.

---

### User Story 5 - Ficha do consumidor ou paciente (Priority: P2)

Como Recepção, Gerente, Proprietário ou Colaborador, quero ver a ficha de cada consumidor do meu estabelecimento: contato, histórico de atendimentos, faltas, pacotes, pontos, avaliações, preferências e alertas, sem expor anotações.

**Why this priority**: tela "Ficha do consumidor ou paciente" (DF 9.3); é o atendimento personalizado que retém o cliente (DF 3.2.4).

**Independent Test**: abrir a ficha de um consumidor com histórico de teste e conferir cada bloco, e que a Recepção não vê anotações nem dados financeiros que o papel não permite.

**Acceptance Scenarios**:

1. **Given** um consumidor com agendamento no negócio, **When** a equipe abre a ficha, **Then** vê: nome e nome preferido, celular, e-mail (se houver e o papel permitir), histórico de agendamentos no negócio, não comparecimentos (spec 010), séries (spec 013), saldo de pacotes (spec 012), pontos e tier (spec 015), avaliações (spec 016) e o indicativo de alertas de cuidado.
2. **Given** a ficha, **When** a equipe registra preferências não sensíveis (nome preferido, profissional preferido, observação operacional de até 500 caracteres, etiquetas), **Then** ficam visíveis à equipe do negócio; a tela avisa para não registrar ali dados de saúde, que vão na anotação.
3. **Given** um consumidor, **When** a ficha é aberta, **Then** só mostra dados daquele negócio; nada de outros estabelecimentos (CONST II).
4. **Given** a vertical de saúde, **When** a ficha é exibida, **Then** usa o vocabulário "paciente" (spec 005).

---

### User Story 6 - Base de consumidores (Priority: P2)

Como Proprietário ou Gerente, quero ver a lista dos meus consumidores com filtros (último atendimento, frequência, gasto, faltas, etiquetas), para saber quem está sumindo e quem são os melhores clientes.

**Why this priority**: tela "Base de consumidores" (DF 9.3); prepara a reconquista da fase 2 (DF 3.2.9, spec 028).

**Independent Test**: com 200 consumidores de teste, filtrar "sem atendimento há mais de 90 dias" e "mais de 5 atendimentos no ano", e exportar a lista como Proprietário, conferindo o registro na trilha de auditoria.

**Acceptance Scenarios**:

1. **Given** a base, **When** aberta, **Then** lista os consumidores com atendimento no negócio, com nome, último atendimento, número de atendimentos e gasto nos últimos 12 meses, faltas e etiquetas.
2. **Given** a busca, **When** feita por nome ou por celular completo, **Then** encontra o consumidor; busca por parte do celular ou do e-mail não existe (CONST IV).
3. **Given** filtros (último atendimento há mais de N dias, frequência, gasto, faltas, etiqueta, filial), **When** aplicados, **Then** a lista se atualiza em até 2 segundos para 10 mil consumidores.
4. **Given** a exportação, **When** o Proprietário pede, **Then** gera planilha com nome, celular, e-mail (se houver), último atendimento e etiquetas, sem anotações nem alertas, com reautenticação por segundo fator e registro na trilha de auditoria.
5. **Given** um Gerente, **When** abre a base, **Then** vê só os consumidores com atendimento na própria filial; o gasto aparece só para a própria filial (`[PEN-03]` decidido na spec 003).

---

### Edge Cases

- **Consumidor que pede eliminação dos dados** (spec 022): as anotações seguem a regra da spec 022 (retenção legal × eliminação, `[C4]`); o pedido é registrado aqui e tratado lá.
- **Anotação em agendamento cancelado ou não comparecimento**: não permitida; só `EM_ATENDIMENTO` e `CONCLUIDO`.
- **Anotação depois de 7 dias da conclusão**: não permitida como anotação do atendimento; o profissional pode registrar um adendo à última anotação.
- **Fotos de anotação**: cifradas, nunca públicas, sem metadados de localização; não aparecem em portfólio (spec 007).
- **Combo com o mesmo profissional**: uma anotação por agendamento.
- **Profissional que também é Proprietário** (autônomo): vê todas as anotações porque é o autor delas.
- **Consentimento revogado e depois dado de novo**: vale a partir da nova data; o histórico de consentimentos fica guardado.
- **Mudança do texto do consentimento**: consumidores existentes mantêm o consentimento anterior; o novo texto vale para novos pedidos; mudanças que ampliem o uso exigem novo consentimento.
- **Menor de idade e dependentes** (fase 2, `[D28]`): o consentimento é do responsável; o modelo já liga a anotação ao atendido e o consentimento ao titular.
- **Pedido judicial ou do conselho profissional**: tratado fora da plataforma, pelo Proprietário, com a exportação do próprio autor ou do Proprietário (conforme `[PEN-10]`), registrada na trilha de auditoria.

---

## Requirements *(mandatory)*

Formato: `REQ-ANO-NNN (origem: …)`.

### Functional Requirements

**Consentimento**

- **REQ-ANO-001** (origem: CONST IV | DF 12): Antes da primeira anotação sobre um consumidor num negócio, DEVE haver consentimento destacado do consumidor para aquele negócio, separado de outros aceites, com texto que explique o que é anotado, quem lê, a retenção e a revogação.
- **REQ-ANO-002** (origem: CONST 5): O consentimento DEVE registrar negócio, versão do texto, horário, aparelho e IP, e só pode ser dado pelo consumidor no próprio aparelho (app, web, link do aviso, ou confirmação por OTP no balcão).
- **REQ-ANO-003** (origem: CONST IV): Sem consentimento, NÃO DEVE ser possível gravar anotação nem alerta de cuidado sobre o consumidor; a revogação impede novas anotações e avisa o estabelecimento.

**Anotações**

- **REQ-ANO-010** (origem: PEN-05 | DF 3.5): A anotação DEVE existir na v1.0, ligada por padrão nas verticais de saúde e desligada na beleza, com retenção de 5 anos após o último atendimento do consumidor no negócio, para todas as verticais; o prontuário oficial de saúde fica fora da plataforma, sob responsabilidade do estabelecimento.
- **REQ-ANO-011** (origem: DF 6 `AnotacaoAtendimento` | DF 9.4): A anotação DEVE ser escrita pelo Colaborador do atendimento, em agendamento `EM_ATENDIMENTO` ou `CONCLUIDO` há até 7 dias, com texto de até 5.000 caracteres, modelo opcional da vertical e até 5 fotos.
- **REQ-ANO-012** (origem: CONST IV | DF 11.4): Texto, fotos e alertas DEVEM ser cifrados por envelope, com a chave fora do banco; NÃO DEVE existir busca por texto nas anotações.
- **REQ-ANO-013** (origem: CONST V): A anotação DEVE ser editável só por 24 horas; depois, correções são adendos com data e autor, preservando a versão original.
- **REQ-ANO-014** (origem: DF 3.5 | CONST 2): A tela DEVE avisar que a anotação não substitui o prontuário exigido pelo conselho profissional e que o consumidor pode lê-la.

**Alerta de cuidado**

- **REQ-ANO-020** (origem: segurança do atendimento): O Colaborador DEVE poder marcar alerta de cuidado (até 140 caracteres), cifrado, ligado ao consumidor no negócio.
- **REQ-ANO-021** (origem: DF 7 | CONST IV): Alertas ativos DEVEM aparecer a qualquer profissional do negócio com agendamento daquele consumidor; a Recepção vê só que há alerta, sem o conteúdo.
- **REQ-ANO-022** (origem: CONST V): O autor ou o Proprietário DEVEM poder desativar o alerta, com histórico.

**Acesso**

- **REQ-ANO-030** (origem: DF 7 | CONST IV): Podem ler anotações: o autor e o consumidor sobre quem ela foi escrita, além dos papéis da REQ-ANO-031. Recepção, Colaboradores que não atendem o cliente, Suporte (inclusive em sessão de suporte) e SRE NÃO DEVEM ler.
- **REQ-ANO-031** (origem: PEN-10 | REQ-IDN-054): O Proprietário e os profissionais que atendem o cliente (Colaborador com agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses com o consumidor, no negócio) DEVEM poder ler as anotações de outros profissionais; o Gerente só com liberação do Proprietário; a Recepção nunca; todo acesso registrado na trilha.
- **REQ-ANO-032** (origem: CONST V | REQ-AUD-001): Toda leitura, criação, adendo e exportação de anotação DEVE gerar registro na trilha de auditoria, sem o conteúdo.
- **REQ-ANO-033** (origem: REQ-EQP-062): Colaborador com vínculo encerrado NÃO DEVE acessar anotações; elas continuam guardadas pelo negócio.
- **REQ-ANO-034** (origem: CONST VIII | REQ-IDN-051): A matriz de permissões DEVE ter células para anotação e alerta, testadas uma a uma, incluindo sessões de suporte.

**Ficha e base de consumidores**

- **REQ-ANO-040** (origem: DF 9.3 "Ficha do consumidor ou paciente"): A ficha DEVE mostrar, para o negócio: identificação e contato conforme o papel, histórico de agendamentos, faltas, séries, saldos de pacote, pontos e tier, avaliações e o indicativo de alertas.
- **REQ-ANO-041** (origem: DF 3.2.4): A ficha DEVE aceitar preferências não sensíveis (nome preferido, profissional preferido, observação operacional de até 500 caracteres, etiquetas), com aviso para não registrar dados de saúde.
- **REQ-ANO-042** (origem: CONST II): A ficha e a base mostram só dados do próprio negócio; nada de outros negócios ou tenants.
- **REQ-ANO-043** (origem: DF 9.3 "Base de consumidores"): A base DEVE listar consumidores com nome, último atendimento, número de atendimentos e gasto em 12 meses, faltas e etiquetas, com filtros e busca por nome ou celular completo; para até 10 mil consumidores, filtros respondem em até 2 segundos.
- **REQ-ANO-044** (origem: CONST V | C4): A exportação da base DEVE ser só do Proprietário, com reautenticação por segundo fator e registro na trilha de auditoria, sem anotações nem alertas.
- **REQ-ANO-045** (origem: DF 7 | PEN-03): O Gerente vê a base e as fichas da própria filial; o gasto segue `[PEN-03]`.

**Dados de atendidos e contratos**

- **REQ-ANO-050** (origem: D28 | CONST 2): O modelo DEVE ligar a anotação ao atendido (na v1.0, sempre o próprio consumidor) e o consentimento ao titular, para os dependentes da fase 2 sem migração.
- **REQ-ANO-051** (origem: CONST VII | spec 022): O domínio DEVE fornecer à spec 022 os contratos de exportação e de eliminação das anotações e consentimentos de um titular.
- **REQ-ANO-052** (origem: CONST II | CONST IX): Anotações, alertas, consentimentos e fichas ficam no espaço de dados do tenant; eventos nunca contêm conteúdo de anotação ou alerta.

### Key Entities

- **Consentimento para anotações**: consumidor (titular), negócio, versão do texto, horário, aparelho, IP, estado (dado, revogado).
- **Anotação de atendimento**: agendamento, consumidor (atendido), autor, texto cifrado, modelo usado, fotos cifradas, data, adendos.
- **Adendo**: anotação, autor, texto cifrado, data.
- **Alerta de cuidado**: consumidor, negócio, autor, texto cifrado, estado, datas.
- **Modelo de anotação** (por vertical): campos sugeridos.
- **Ficha do consumidor no negócio**: consumidor, negócio, nome preferido, profissional preferido, observação operacional, etiquetas.
- **Registro de acesso**: anotação ou alerta, quem, ação (ler, criar, adendo, exportar), quando.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| Painel (DF 9.3) | Ficha do consumidor ou paciente · Anotações de atendimento · Base de consumidores | Registrados no plano |
| App do colaborador (DF 9.4) | Detalhe com check-in e check-out (anotação e alerta) | Registrado no plano |
| Colaborador desktop (DF 9.9) | Atendimento com check-in e check-out (anotação e alerta) | Registrado no plano |
| App e web do consumidor | Pedido de consentimento; anotações próprias no histórico | Registrados no plano |

O pedido de consentimento destacado e a leitura das anotações pelo consumidor precisam ser conferidos no protótipo; se não existirem, são telas novas.

---

## Regras e estados

- **Consentimento**: `pedido` → `dado` | `recusado` | `sem_resposta`; `dado` → `revogado` → `dado` (novo pedido).
- **Anotação**: `rascunho` → `salva` (editável por 24 horas) → `fechada` (só adendos).
- **Alerta**: `ativo` → `desativado`.
- **Quem lê a anotação**: autor e consumidor; profissionais que atendem o cliente (agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses com o consumidor, no negócio) e Proprietário; Gerente só se liberado pelo Proprietário; ninguém mais.
- **Janela para anotar**: de `EM_ATENDIMENTO` até 7 dias após `CONCLUIDO`.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Anotação de atendimento (texto e fotos) | Sensível (saúde, art. 11) ou pessoal | Consentimento destacado (art. 11, I) | 5 anos após o último atendimento no negócio; ao vencer, o estabelecimento decide (`[C4]`, spec 022) | Autor; o próprio consumidor; profissionais que atendem o cliente; Proprietário; Gerente se liberado (`[PEN-10]`) |
| Alerta de cuidado | Sensível | Consentimento destacado | Igual à anotação | Profissionais do negócio com agendamento do consumidor; autor; Proprietário |
| Consentimento | Pessoal | Obrigação de comprovar o consentimento (art. 8, §2) | Enquanto houver anotação ou alerta + 5 anos | Proprietário; o próprio consumidor |
| Registro de acesso às anotações | Pessoal (atores) | Segurança (art. 7, IX) | Igual à trilha de auditoria (5 anos) | SRE (sem conteúdo); Proprietário |
| Ficha (preferências, observação operacional, etiquetas) | Pessoal, não sensível | Execução de contrato; o tenant é controlador | Enquanto houver relação com o negócio; conforme spec 022 | Equipe do negócio conforme papel |
| Base exportada | Pessoal | Legítimo interesse do controlador (tenant) | Fora da plataforma, responsabilidade do tenant | Proprietário |

Regras: anotações e alertas nunca aparecem em log, evento, notificação, nota fiscal ou exportação da base; a chave das anotações só é usada para os acessos permitidos; a guarda exigida por conselho profissional fica sob responsabilidade do tenant (a anotação não é prontuário).

---

## Permissões

Recorte da matriz RBAC (DF 7, "Ver anotação de atendimento"):

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte | SRE |
|---|---|---|---|---|---|---|---|
| Dar e revogar consentimento | ✔ | — | — | — | — | — | — |
| Escrever anotação e alerta | — | ✔ própria | — | — | ✔ (se for o profissional) | — | ✖ |
| Ver anotação | ✔ própria | ✔ própria e dos clientes que atende | — | ✔ se liberado pelo Proprietário | ✔ | — | ✖ |
| Ver alerta de cuidado | — | ✔ (com agendamento) | indicativo | ✔ filial | ✔ | — | ✖ |
| Ver ficha | ✔ (os próprios dados) | ✔ (dos próprios atendidos) | ✔ filial, com celular e e-mail | ✔ filial, com celular e e-mail | ✔ | ✔* (sem anotações; celular e e-mail mascarados) | — |
| Ver base de consumidores | — | — | ✔ filial (sem gasto) | ✔ filial | ✔ | ✔* | — |
| Exportar base | — | — | — | — | ✔ | — | — |

`✔*` = apenas em sessão de suporte (spec 003); nunca inclui anotações nem alertas.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `engagement.care_consent.{requested,granted,refused,revoked}.v1` | Consentimento |
| `engagement.care_note.{saved,closed,addendum_added}.v1` | Anotação (sem conteúdo) |
| `engagement.care_alert.{activated,deactivated}.v1` | Alerta (sem conteúdo) |
| `engagement.customer_base.exported.v1` | Exportação da base |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| % de atendimentos com anotação (onde ligada) | DF 3.2.10 | Acompanhada |
| Taxa de consentimento dado / pedido | CONST IV | Acompanhada |
| Acessos negados a anotações por perfil | CONST IV · DF 16 | Acompanhada; alerta em tentativas repetidas |
| Consumidores sem atendimento há mais de 90 dias (base) | DF 3.2.4 | Acompanhada |
| Exportações da base por mês | CONST V | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhuma anotação é gravada sem consentimento do consumidor, em 100% dos testes.
- **SC-002**: Em 100% dos testes da matriz, só o autor, o consumidor, os profissionais que atendem o cliente e o Proprietário (e o Gerente, se liberado) leem anotações; Colaborador que não atende, Recepção, Suporte e SRE nunca.
- **SC-003**: 100% das leituras de anotação geram registro na trilha de auditoria.
- **SC-004**: Nenhum conteúdo de anotação ou alerta aparece em log, evento, notificação ou exportação, verificado por varredura automática.
- **SC-005**: O Colaborador registra a anotação de um atendimento em até 2 minutos no app.
- **SC-006**: Um profissional que vai atender um consumidor vê os alertas de cuidado ativos em 100% dos casos.
- **SC-007**: A Recepção encontra a ficha de um consumidor por nome ou celular em até 5 segundos.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-05** — anotação existe na v1.0, quem acessa e por quanto tempo é retida | Escopo da spec; retenção; LGPD | **Resolvido (clarify 2026-11-25)**: existe; 5 anos para todos |
| **PEN-10** — Gerente e Proprietário acessam anotações de outros profissionais | Matriz de permissões; segregação | **Resolvido (clarify 2026-11-25)**: profissionais que atendem + Proprietário |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **C4** — retenção × portabilidade × eliminação | Spec 022 | Esta spec fornece os contratos; a regra é de lá |
| **PEN-03** — Gerente vê gasto | Spec 003 | Decidido: só da própria filial |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Consumidor lê as próprias anotações | ASSUMIDO pela DF 7 ("✔ própria"), com aviso ao profissional na hora de escrever |
| Alerta de cuidado | ASSUMIDO: visível a todo profissional do negócio que vá atender o consumidor |
| Profissional que atende | DECIDIDO (2026-11-27): agendamento futuro confirmado ou atendimento concluído nos últimos 12 meses com o consumidor, no negócio |
| Janela para anotar | ASSUMIDO: até 7 dias após a conclusão; edição por 24 horas |
| Anotação ligada por padrão | ASSUMIDO: na saúde sim, na beleza não |

---

## Fora do escopo desta especificação

- Prontuário clínico completo, laudos, prescrições e atestados (escopo negativo, CONST 2).
- Busca por texto dentro das anotações (proibida pela CONST IV).
- Compartilhamento de anotações entre estabelecimentos.
- Exportação, eliminação e portabilidade completas para o titular (spec 022).
- Campanhas para a base de consumidores (spec 028).
- Dependentes, menores e pets como atendidos (spec 025).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: anotação de até 5.000 caracteres e 5 fotos; alerta de até 140 caracteres; observação operacional de até 500; edição por 24 horas; anotação até 7 dias após a conclusão; base de até 10 mil consumidores com filtros em até 2 segundos; anotação registrada em até 2 minutos.
- A leitura das anotações pelo consumidor atende ao direito de acesso (LGPD art. 18) sem pedido formal.
- O texto do consentimento é mantido pela Gestão (com revisão jurídica), com versões; o tenant não edita o texto.
- O domínio dono desta spec é `engagement` para a ficha e a base, e as anotações ficam no mesmo domínio com chave própria e acesso segregado; o plano pode separá-las em domínio próprio se a segregação exigir (CONST 4.4 não lista um domínio específico).
