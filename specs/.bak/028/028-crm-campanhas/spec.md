# Feature Specification: CRM e campanhas

**Feature Branch**: `028-crm-campanhas`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "028 crm-campanhas — seguir a sequência da constituição (seção 10), fase 2: [D32]. Depende de 011, 019 e 022. Sem pendências listadas. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 2 (em todas as plataformas, `[D35]`)

**Superfícies afetadas**: painel do cliente ("Campanhas (CRM)": segmentos, campanhas, automações, resultados, cota) · app e web do consumidor (consentimento de comunicações por estabelecimento e canal; descadastro) · back-office ("Cota de envios do CRM por tenant"; moderação de campanhas)

**Depende de**: 011 `notificacoes-multicanal` · 019 `assinatura-koovela-cobranca` · 022 `privacidade-direitos-titular` (e, por elas, a v1.0); usa a base de consumidores da 020

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, VII, seções 3 (`ofertas@news.koovela.com`), 4.4 (`campaigns`, `notification`), 5, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.2.4, 3.2.9, 5.2, 6 (fase 2), 9.10, 12, 14 (fase 2) e 17 (`[D10]`, `[D32]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O estabelecimento quer **reconquistar o cliente sumido** (DF 3.2.9) e **reter clientes** (DF 3.2.4). Hoje faz isso por mensagem pessoal, sem saber quem respondeu.

A decisão `[D32]` define as campanhas de CRM:

- canais **push, e-mail e SMS**; **WhatsApp fica fora**;
- custo por **cota no plano mais excedente** por envio (DF 5.2);
- e-mail e SMS só com **opt-in** e **descadastro em um clique** (DF 12, CONST IV).

A `[D32]` também revê a `[D10]` ("só push") **para campanhas**. A spec 011 já preparou o modelo de preferências para o opt-in por canal, e a spec 014 já tem o opt-in de ofertas de horário ocioso.

O e-mail de campanha sai de `ofertas@news.koovela.com`, um subdomínio separado para proteger a reputação do transacional (CONST 3).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.2.9 | Reconquistar cliente sumido | Reativação por campanha |
| 3.2.4 | Reter clientes | Recompra em 30, 60 e 90 dias |
| DF 14 (fase 2) | Reagendamentos atribuídos a campanhas | Agendamentos atribuídos |
| DF 5.2 | Excedente de envios do CRM | Receita de excedente |

Personas: Proprietário (e Gerente, com recorte da filial); consumidor; Gestão (cotas e moderação).

---

## Clarifications

### Session 2026-11-25

- Q: Campanhas são permitidas em saúde? → A: Saúde (PEN-06, decidido na spec 005): o preço nunca aparece em nenhum lugar; taxa de agendamento fixa abatida do valor do atendimento; fica restrito só o que mostra preço. Campanhas são permitidas, desde que não mostrem preço nem promoção de preço.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor escolhe receber comunicações de cada estabelecimento (Priority: P1)

Como consumidor, quero decidir de quais estabelecimentos recebo novidades e ofertas, e por qual canal, e sair com um toque.

**Why this priority**: sem opt-in não há campanha legal (CONST IV, DF 12); é a base de toda a spec.

**Independent Test**: depois de um agendamento, aceitar comunicações do estabelecimento só por e-mail; conferir que uma campanha de teste chega por e-mail e não por SMS; usar o descadastro do e-mail e conferir que a próxima não chega.

**Acceptance Scenarios**:

1. **Given** a tela de confirmação de um agendamento (spec 009), **When** exibida, **Then** pergunta se o consumidor quer receber novidades e ofertas daquele estabelecimento, com a escolha de canais (push, e-mail, SMS); a resposta padrão é "não".
2. **Given** "Perfil e notificações" (spec 011) e "Meus consentimentos" (spec 022), **When** o consumidor abre, **Then** vê, por estabelecimento, os canais que aceitou, e pode mudar ou revogar cada um.
3. **Given** o consentimento, **When** registrado, **Then** guarda estabelecimento, canal, versão do texto, data, aparelho e origem (app, web, balcão).
4. **Given** uma campanha recebida, **When** o consumidor usa o descadastro (link no e-mail, palavra "SAIR" ou link no SMS, opção no push), **Then** sai daquele estabelecimento naquele canal em um passo, sem login, em até 1 minuto.
5. **Given** o opt-in de ofertas de horário ocioso (spec 014), **When** existe, **Then** é o mesmo consentimento desta spec (comunicações promocionais do estabelecimento); uma única escolha vale para os dois.

---

### User Story 2 - Montar um segmento de clientes (Priority: P1)

Como Proprietário, quero montar um público com regras simples (por exemplo, "não vem há mais de 60 dias", "fez coloração", "aniversariantes do mês") e ver quantos podem receber por canal.

**Why this priority**: o segmento é o "para quem" da campanha (DF 6, `Campanha (segmento…)`).

**Independent Test**: com uma base sintética de 500 consumidores, montar "sem atendimento há mais de 60 dias e já fez corte" e conferir a contagem total e por canal com opt-in.

**Acceptance Scenarios**:

1. **Given** "Campanhas (CRM)", **When** o Proprietário cria um segmento, **Then** combina regras sobre: dias desde o último atendimento, quantidade de atendimentos, gasto em 12 meses, serviços feitos, profissional, filial, etiquetas (spec 020), tier de fidelidade (spec 015), faltas (spec 010), aniversário no mês (só para quem informou a data de nascimento).
2. **Given** o segmento, **When** salvo, **Then** mostra quantos consumidores atende e quantos podem receber por canal (com opt-in e destino válido); a lista nominal só é exibida ao Proprietário e não é exportável por aqui.
3. **Given** um segmento salvo, **When** usado depois, **Then** é recalculado na hora do envio.
4. **Given** um Gerente, **When** cria segmentos, **Then** só alcança consumidores com atendimento na própria filial.
5. **Given** segmentos prontos sugeridos ("sumidos há 60 dias", "clientes frequentes", "aniversariantes do mês", "nunca voltaram depois do primeiro atendimento"), **When** o Proprietário escolhe um, **Then** ele é criado com as regras editáveis.

---

### User Story 3 - Criar, testar e enviar uma campanha (Priority: P1)

Como Proprietário, quero escrever uma mensagem, escolher o segmento e os canais, incluir uma oferta opcional, ver o custo antes e enviar agora ou agendar.

**Why this priority**: é a campanha da `[D32]`.

**Independent Test**: criar uma campanha de e-mail e push com oferta de 15% em corte, válida por 7 dias, para um segmento de teste; enviar um teste para o próprio Proprietário; conferir o custo estimado e a cota; agendar e conferir o envio no horário.

**Acceptance Scenarios**:

1. **Given** uma campanha nova, **When** o Proprietário a cria, **Then** define nome, segmento, canais, texto por canal (com variáveis: primeiro nome, nome do estabelecimento, link de agendamento), imagem opcional no e-mail e oferta opcional (desconto percentual ou em reais em serviços escolhidos, válido até uma data, usado pelo link da campanha).
2. **Given** a campanha, **When** o Proprietário pede a prévia, **Then** vê como fica em cada canal e pode enviar um teste para si mesmo.
3. **Given** o envio, **When** o Proprietário confirma, **Then** vê antes: quantos vão receber por canal, quanto consome da cota do mês e quanto custa de excedente, se houver (spec 019); sem confirmação do excedente, a campanha envia só até a cota.
4. **Given** a campanha agendada, **When** o horário chega, **Then** é enviada respeitando o horário de silêncio (padrão 21h às 8h, fuso da filial, REQ-NOT-013) e o limite por consumidor.
5. **Given** o limite por consumidor, **When** um consumidor já recebeu 2 campanhas daquele estabelecimento nos últimos 7 dias (padrão, configurável pela Gestão), **Then** não recebe a terceira naquele período.
6. **Given** a mensagem, **When** enviada, **Then** identifica o estabelecimento, inclui o descadastro em todos os canais, e sai de `ofertas@news.koovela.com` no e-mail; o SMS identifica o remetente e o estabelecimento no começo do texto.
7. **Given** a oferta, **When** o consumidor agenda pelo link da campanha dentro da validade, **Then** o desconto é aplicado no resumo (spec 009), congelado no agendamento, com origem "campanha".

---

### User Story 4 - Resultado da campanha (Priority: P2)

Como Proprietário, quero saber quantos receberam, abriram, clicaram e agendaram por causa de cada campanha, e quanto isso rendeu.

**Why this priority**: DF 14 ("reagendamentos atribuídos a campanhas") e DF 3.2.9 ("reativação por campanha").

**Independent Test**: com uma campanha de teste enviada a 100 consumidores e 10 agendamentos de origem "campanha", conferir os números do painel de resultados.

**Acceptance Scenarios**:

1. **Given** uma campanha enviada, **When** o Proprietário abre o resultado, **Then** vê por canal: enviados, entregues, aberturas (e-mail), cliques, descadastros, agendamentos atribuídos, atendimentos concluídos atribuídos, receita atribuída e descontos concedidos.
2. **Given** a atribuição, **When** calculada, **Then** um agendamento é atribuído à campanha se foi feito pelo link dela, ou se o consumidor recebeu a campanha e agendou no estabelecimento em até 7 dias, sem outra campanha entre os dois (padrão configurável).
3. **Given** os resultados, **When** exibidos, **Then** mostram também a reativação: consumidores que estavam havia mais de 60 dias sem atendimento e voltaram.

---

### User Story 5 - Cota, excedente e controle pela Gestão (Priority: P2)

Como Gestão, quero definir a cota de envios por plano e canal, ver o uso de cada tenant, cobrar o excedente e barrar abusos.

**Why this priority**: tela "Cota de envios do CRM por tenant" (DF 9.10) e a receita de excedente (DF 5.2).

**Independent Test**: no back-office, definir a cota do plano de teste em 1.000 e-mails e 100 SMS por mês; enviar campanhas até passar da cota e conferir o aviso, a confirmação de excedente e o item na fatura (spec 019).

**Acceptance Scenarios**:

1. **Given** o back-office, **When** a Gestão configura, **Then** define por plano a cota mensal por canal (push, e-mail, SMS) e o preço do excedente por envio, versionados e sem valor fixo no código (CONST 8, `[PEN-08]`).
2. **Given** um tenant, **When** a Gestão abre "Cota de envios do CRM", **Then** vê o uso do mês por canal, o excedente e o histórico, e pode conceder cota extra (concessão da spec 021).
3. **Given** o fim do mês, **When** a fatura é gerada (spec 019), **Then** o excedente entra como item de uso (REQ-ASS-026).
4. **Given** sinais de abuso (taxa de descadastro acima de 2% numa campanha, reclamações de spam, bounces acima de 5%), **When** detectados, **Then** novas campanhas do tenant ficam pausadas para revisão pela Gestão, com aviso ao Proprietário.
5. **Given** uma campanha com conteúdo proibido (termos da lista de bloqueio; em saúde, qualquer preço, desconto ou promoção de preço), **When** o Proprietário tenta enviar, **Then** o envio é bloqueado com o motivo.

---

### User Story 6 - Automações simples (Priority: P3)

Como Proprietário, quero deixar campanhas automáticas ligadas (por exemplo, "mandar oferta para quem sumiu há 60 dias" ou "parabéns no aniversário"), para não precisar montar uma a uma.

**Why this priority**: reconquista contínua (DF 3.2.9) com pouco esforço, importante para estabelecimentos pequenos.

**Independent Test**: ligar a automação "sumidos há 60 dias" e conferir que, ao longo de dias simulados, cada consumidor que cruza o limite recebe uma vez a mensagem, respeitando cota e limite por consumidor.

**Acceptance Scenarios**:

1. **Given** as automações disponíveis (sumido há N dias; aniversário; N dias depois do primeiro atendimento sem volta), **When** o Proprietário liga uma, **Then** define o texto, os canais, a oferta opcional e o limite mensal de envios.
2. **Given** uma automação ligada, **When** um consumidor entra na condição, **Then** recebe a mensagem uma única vez por ciclo da condição, respeitando opt-in, horário de silêncio, limite por consumidor e cota.
3. **Given** uma automação, **When** o Proprietário a desliga, **Then** nada mais é enviado por ela.

---

### Edge Cases

- **Consumidor sem nenhum opt-in**: não entra em nenhuma contagem de envio; aparece só na contagem total do segmento.
- **Destino inválido ou suspenso** (spec 011): fica fora do envio por aquele canal.
- **Consumidor que pediu eliminação** (spec 022) ou com conta excluída: sai de todos os segmentos imediatamente.
- **Menores e atendidos** (spec 025): nunca recebem campanhas; o titular pode receber, pelo próprio opt-in.
- **Campanha enviada com erro**: não há "desfazer"; o Proprietário pode enviar uma correção, que também consome cota.
- **Oferta usada em agendamento cancelado**: o desconto não é reaplicado em nova marcação depois da validade.
- **Oferta e fidelidade no mesmo agendamento**: o consumidor escolhe uma das duas; não se acumulam (padrão).
- **Push sem app instalado**: o consumidor fica fora do envio por push; não há troca automática de canal em campanhas (diferente do transacional da spec 011).
- **Mudança de plano no meio do mês**: a cota do mês passa a ser a do novo plano, proporcional aos dias restantes.

---

## Requirements *(mandatory)*

Formato: `REQ-CRM-NNN (origem: …)`.

### Functional Requirements

**Consentimento**

- **REQ-CRM-001** (origem: D32 | CONST IV | DF 12): Campanhas DEVEM ser enviadas só a consumidores com opt-in explícito para comunicações promocionais daquele estabelecimento e daquele canal; o padrão é "sem opt-in".
- **REQ-CRM-002** (origem: CONST IV | REQ-PRI-022): O consentimento DEVE registrar estabelecimento, canal, versão do texto, data, aparelho e origem, no registro central de consentimentos (spec 022).
- **REQ-CRM-003** (origem: D32): Todo envio DEVE ter descadastro em um passo, sem login, por canal, com efeito em até 1 minuto.
- **REQ-CRM-004** (origem: REQ-FIL-040): O opt-in de ofertas de horário ocioso (spec 014) e o desta spec DEVEM ser o mesmo consentimento.
- **REQ-CRM-005** (origem: D28 | CONST IV): Menores e atendidos NUNCA DEVEM receber campanhas.

**Segmentos**

- **REQ-CRM-010** (origem: DF 6 `Campanha (segmento)` | DF 3.2.9): Segmentos DEVEM combinar regras sobre dias desde o último atendimento, quantidade de atendimentos, gasto em 12 meses, serviços, profissional, filial, etiquetas, tier, faltas e aniversário no mês.
- **REQ-CRM-011** (origem: CONST IV): O segmento DEVE mostrar o total e quantos podem receber por canal; a lista nominal só ao Proprietário, sem exportação por aqui (a exportação da base é da spec 020).
- **REQ-CRM-012** (origem: CONST II | DF 7): Segmentos usam só dados do próprio negócio; o Gerente só alcança a própria filial.
- **REQ-CRM-013** (origem: DF 3.2.9): DEVEM existir segmentos sugeridos (sumidos há 60 dias, frequentes, aniversariantes, sem volta após o primeiro atendimento), editáveis.

**Campanhas**

- **REQ-CRM-020** (origem: D32): A campanha DEVE ter nome, segmento, canais (push, e-mail, SMS), texto por canal com variáveis, imagem opcional no e-mail, oferta opcional (desconto em serviços escolhidos, com validade) e envio imediato ou agendado.
- **REQ-CRM-021** (origem: D32 | CONST 5): WhatsApp NÃO DEVE ser canal de campanha.
- **REQ-CRM-022** (origem: CONST 3): O e-mail de campanha DEVE sair de `ofertas@news.koovela.com`; nenhum envio de campanha sai do domínio transacional.
- **REQ-CRM-023** (origem: CONST XI): A campanha DEVE ter prévia por canal e envio de teste para o próprio Proprietário.
- **REQ-CRM-024** (origem: D32 | DF 5.2): Antes de enviar, o Proprietário DEVE ver quantos vão receber, o consumo da cota e o custo do excedente; sem confirmação do excedente, envia só até a cota.
- **REQ-CRM-025** (origem: REQ-NOT-013): Campanhas DEVEM respeitar o horário de silêncio (sem exceção para urgência) e o limite por consumidor (padrão: 2 campanhas por estabelecimento a cada 7 dias, configurável pela Gestão).
- **REQ-CRM-026** (origem: CONST 5): Cada mensagem DEVE identificar o estabelecimento e ter descadastro; o SMS identifica remetente e estabelecimento no começo.
- **REQ-CRM-027** (origem: CONST III): A oferta DEVE ser aplicada só pelo link da campanha, dentro da validade, com o preço congelado no agendamento (origem "campanha"); não se acumula com resgate de fidelidade.
- **REQ-CRM-028** (origem: PEN-06 | CONST 5): Campanhas com conteúdo bloqueado (lista mantida pela Gestão) DEVEM ser bloqueadas com o motivo; em saúde, campanhas são permitidas, mas DEVEM ser bloqueadas se mostrarem preço, desconto ou promoção de preço (`[PEN-06]` decidido na spec 005).

**Resultados**

- **REQ-CRM-030** (origem: DF 14 fase 2 | DF 3.2.9): O resultado DEVE mostrar, por canal: enviados, entregues, aberturas (e-mail), cliques, descadastros, agendamentos e atendimentos atribuídos, receita atribuída, descontos e reativações.
- **REQ-CRM-031** (origem: DF 14): A atribuição DEVE considerar agendamento pelo link da campanha, ou recebimento da campanha e agendamento no estabelecimento em até 7 dias sem outra campanha entre os dois (configurável).

**Cota, excedente e controle**

- **REQ-CRM-040** (origem: D32 | DF 5.2 | CONST 8): A Gestão DEVE configurar, por plano, a cota mensal por canal e o preço do excedente por envio, versionados, sem valor fixo no código.
- **REQ-CRM-041** (origem: DF 9.10 "Cota de envios do CRM por tenant"): O back-office DEVE mostrar, por tenant, o uso do mês por canal, o excedente e o histórico, e permitir cota extra por concessão (spec 021).
- **REQ-CRM-042** (origem: REQ-ASS-026): O excedente DEVE entrar na fatura do mês como item de uso (spec 019).
- **REQ-CRM-043** (origem: CONST 5 antifraude): Descadastro acima de 2% numa campanha, reclamações de spam ou bounces acima de 5% DEVEM pausar novas campanhas do tenant para revisão da Gestão, com aviso ao Proprietário.
- **REQ-CRM-044** (origem: CONST V): Envios, pausas, revisões e concessões de cota DEVEM gerar registro na trilha de auditoria.

**Automações**

- **REQ-CRM-050** (origem: DF 3.2.9): DEVEM existir automações (sumido há N dias; aniversário; N dias após o primeiro atendimento sem volta) com texto, canais, oferta opcional e limite mensal.
- **REQ-CRM-051** (origem: CONST IX): Cada consumidor DEVE receber a mensagem de uma automação uma única vez por ciclo da condição, respeitando opt-in, silêncio, limite por consumidor e cota.

**Isolamento e contratos**

- **REQ-CRM-060** (origem: CONST II | CONST 4.4): Segmentos, campanhas e resultados ficam no espaço de dados do tenant; o envio usa o domínio `notification` (spec 011) pelo contrato de pedido de aviso.
- **REQ-CRM-061** (origem: REQ-PRI-005): Os contratos de exportação e eliminação (spec 022) DEVEM cobrir consentimentos e histórico de envios de campanhas.

### Key Entities

- **Consentimento de comunicações promocionais**: consumidor, estabelecimento, canal, versão, data, origem, revogação.
- **Segmento** (`segment`): negócio, regras, contagens.
- **Campanha** (`campaign`): negócio, nome, segmento, canais, textos, imagem, oferta, agendamento, estado, autor.
- **Oferta de campanha**: campanha, serviços, desconto, validade, link.
- **Envio de campanha**: campanha, consumidor, canal, estado, eventos (entregue, aberto, clicado, descadastrado).
- **Atribuição**: campanha, agendamento, forma (link ou janela), valores.
- **Cota de envio** (`CotaEnvio`): tenant, mês, canal, cota, usado, excedente.
- **Automação**: negócio, tipo, condição, texto, canais, oferta, limite mensal, estado.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.10) | Código |
|---|---|---|
| Painel do cliente | Campanhas (CRM) | Registrado no plano |
| Back-office | Cota de envios do CRM por tenant | Registrado no plano |
| App e web do consumidor | Consentimento de comunicações na Confirmação; gestão por estabelecimento em "Perfil e notificações" | Registrados no plano |

Segmentos, resultados e automações precisam ser conferidos dentro da tela "Campanhas (CRM)" do protótipo.

---

## Regras e estados

- **Campanha**: `rascunho` → `agendada` → `enviando` → `enviada` | `pausada` (abuso ou revisão) → `enviando` | `cancelada`.
- **Envio por consumidor**: só se opt-in naquele canal, destino válido, fora do silêncio, dentro do limite por consumidor e da cota (ou excedente confirmado).
- **Limite por consumidor**: 2 campanhas por estabelecimento a cada 7 dias (padrão).
- **Atribuição**: link da campanha, ou janela de 7 dias sem outra campanha entre recebimento e agendamento.
- **Oferta**: não se acumula com resgate de fidelidade; vale só pelo link e dentro da validade.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Consentimentos de comunicações | Pessoal | Consentimento (art. 7, I) | Enquanto válido + 5 anos como prova | O próprio consumidor; Proprietário (se aceitou, por canal) |
| Membros de segmento | Pessoal (perfil de consumo no negócio) | Consentimento dado no opt-in | Recalculado no envio; não guardado além da campanha | Proprietário |
| Envios e interações (aberturas, cliques) | Pessoal | Consentimento | 12 meses | Proprietário (agregado e por campanha); o próprio consumidor (exportação) |
| Atribuições | Pessoal (pseudonimizado no BI) | Legítimo interesse do estabelecimento | Igual ao agendamento | Proprietário |

Regras: a data de nascimento só é usada se o consumidor a informou (spec 003); campanhas nunca usam dados de anotações, alertas ou observações (spec 020); provedores de envio recebem só destino e texto final.

---

## Permissões

| Ação | Usuário | Recepção | Gerente | Proprietário | Comercial/Growth | Fin/Ops |
|---|---|---|---|---|---|---|
| Dar e revogar consentimento; descadastrar | ✔ | — | — | — | — | — |
| Criar segmentos e campanhas; enviar; automações | — | — | ✔ filial | ✔ | — | — |
| Confirmar excedente | — | — | — | ✔ | — | — |
| Ver resultados | — | — | ✔ filial | ✔ | — | — |
| Configurar cotas e preço do excedente | — | — | — | — | ✔ (com aprovação do Fin/Ops) | ✔ |
| Revisar campanhas pausadas; lista de bloqueio | — | — | — | — | — | ✔ (com o Suporte) |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `campaigns.consent.granted.v1` / `.revoked.v1` | Consentimento por estabelecimento e canal |
| `campaigns.campaign.scheduled.v1` / `.sent.v1` / `.paused.v1` | Ciclo da campanha |
| `campaigns.message.delivered.v1` / `.opened.v1` / `.clicked.v1` / `.unsubscribed.v1` | Interações |
| `campaigns.attribution.recorded.v1` | Agendamento atribuído |
| `campaigns.quota.exceeded.v1` | Cota do mês ultrapassada |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Reativação por campanha (sumidos que voltaram) | DF 3.2.9 | Acompanhada |
| Agendamentos e receita atribuídos a campanhas | DF 14 (fase 2) | Acompanhada |
| Taxa de opt-in por canal | CONST IV | Acompanhada |
| Taxa de descadastro e de reclamação | CONST 5 | Descadastro abaixo de 2% |
| Receita de excedente | DF 5.2 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhuma campanha chega a consumidor sem opt-in naquele estabelecimento e canal, verificado por teste.
- **SC-002**: 100% dos descadastros têm efeito em até 1 minuto.
- **SC-003**: O Proprietário cria e agenda uma campanha a partir de um segmento sugerido em até 5 minutos.
- **SC-004**: O custo e o consumo da cota aparecem antes de todo envio, e nenhum excedente é cobrado sem confirmação.
- **SC-005**: Nenhum consumidor recebe mais campanhas de um estabelecimento do que o limite configurado.
- **SC-006**: O Proprietário vê agendamentos e receita atribuídos a cada campanha em até 2 toques.
- **SC-007**: Nenhuma campanha é enviada no horário de silêncio.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma.

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-08** — valores de cota e excedente | Spec 019 / back-office | Configuráveis, sem valor no código |
| **PEN-06** — publicidade em saúde | Spec 005 | Decidido: campanhas sem preço nem promoção de preço |
| **C1** / **PEN-25** — canais | Spec 011 | Campanhas usam só os canais com opt-in; sem troca automática de canal |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Consentimento | ASSUMIDO: um único opt-in promocional por estabelecimento e canal, compartilhado com a spec 014 |
| Limite por consumidor | ASSUMIDO: 2 campanhas por estabelecimento a cada 7 dias |
| Atribuição | ASSUMIDO: link ou janela de 7 dias |
| Abuso | ASSUMIDO: pausa com descadastro acima de 2% ou bounce acima de 5% |
| Oferta | ASSUMIDO: não acumula com fidelidade |

---

## Fora do escopo desta especificação

- WhatsApp, em qualquer forma (`[D32]`).
- Campanhas da Koovela para consumidores da plataforma (marketing próprio), que exigiriam a Koovela como controladora e outra base legal.
- Testes A/B de mensagens.
- Editor visual de e-mail com modelos complexos; aqui só texto, imagem e botão.
- Cupons avulsos fora de campanha.
- Integração com outras ferramentas de CRM.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: descadastro em até 1 minuto; limite de 2 campanhas a cada 7 dias; atribuição em 7 dias; pausa com descadastro acima de 2% e bounce acima de 5%; interações guardadas por 12 meses; criação de campanha em até 5 minutos.
- O envio usa os provedores e o registro de entrega da spec 011, no domínio de campanha separado.
- O SMS de campanha segue as regras do setor para mensagens comerciais (identificação, horário, descadastro); a lista de horários permitidos é mantida pela Gestão.
- Os domínios donos são `campaigns` (segmentos, campanhas, atribuição) e `notification` (envio, preferências, cotas), conforme a CONST 4.4.
