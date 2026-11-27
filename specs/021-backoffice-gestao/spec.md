# Feature Specification: Back-office da Gestão

**Feature Branch**: `021-backoffice-gestao`

**Created**: 2026-11-24

**Status**: Clarified (sem perguntas; analisada em 2026-11-27)

**Input**: User description: "021 backoffice-gestao — seguir a sequência da constituição (seção 10): tenants, KYC, concessões, antifraude, chargebacks. Depende de 003, 004, 012 e 019. Sem pendências listadas. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: back-office (`admin.koovela.com`): Visão geral da plataforma, Tenants, Onboarding e KYC, Concessões, Antifraude, estornos e chargebacks, e as filas operacionais vindas das specs anteriores · painel do cliente (aviso de concessões, pedidos de documento e chargebacks ao tenant) · app e web do consumidor (aviso e contestação de bloqueio)

**Depende de**: 003 `identidade-acesso` · 004 `auditoria-flags` · 012 `pagamentos-split` · 019 `assinatura-koovela-cobranca` (e, por elas, 002 e 005 a 018)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, V, seções 3 (`admin.koovela.com`), 4.4 (`backoffice`), 5 (antifraude), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.5, 3.4.1 a 3.4.5, 7, 9.5, 12, 14, 16 e 19 (`trial_grant`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A Gestão da Koovela tem quatro perfis (DF 2.5): **Suporte**, **Financeiro/Ops**, **Comercial/Growth** e **Engenharia/SRE**, e uma regra inegociável: **nenhum perfil tem acesso irrestrito e silencioso a dados de tenant**; todo acesso é registrado, justificado e expira.

As specs anteriores já criaram partes do back-office: provisionamento e migração (002), sessões de suporte e contas da Gestão (003), feature flags e trilha de auditoria (004), registro de chargebacks e conciliação (012), planos e inadimplência (019). Esta spec entrega o que falta das 10 telas do back-office (DF 9.5) e junta tudo num lugar de trabalho:

- **Visão geral da plataforma** e **Tenants** (DF 3.4.1);
- **Onboarding e KYC** (DF 3.4.4: tempo de ativação);
- **Concessões**: desconto e degustação (DF 3.4.3: tempo de concessão, conversão);
- **Antifraude, estornos e chargebacks** (DF 3.4.5: perda por fraude / GMV), com os sinais que as specs 003, 008, 009, 012, 015 e 016 já produzem.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.4.1 | Gestão técnica da plataforma e dos tenants | Cobertura de observabilidade; MTTD |
| 3.4.3 | Conceder desconto e degustação | Tempo de concessão; conversão |
| 3.4.4 | Onboardar tenant (KYC, recebedor, contrato) | Tempo de ativação |
| 3.4.5 | Conter fraude, chargeback e abuso | Perda por fraude / GMV |

Personas: Suporte N1/N2; Financeiro/Ops; Comercial/Growth; Engenharia/SRE.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Encontrar um tenant e entender a situação dele em segundos (Priority: P1)

Como Suporte ou Financeiro/Ops, quero buscar um tenant e ver numa única tela o estado da conta, do plano, do recebedor, dos negócios e filiais, os alertas e o histórico, sem ver dados pessoais além do necessário.

**Why this priority**: é a tela "Tenants" (DF 9.5) e o ponto de partida de quase todo atendimento e investigação.

**Independent Test**: buscar um tenant de teste por nome, por CNPJ e por slug, abrir o detalhe e conferir que cada bloco mostra o estado vindo da spec dona, com os dados pessoais mascarados.

**Acceptance Scenarios**:

1. **Given** a tela "Tenants", **When** o Suporte busca por nome do negócio, slug, CNPJ completo ou e-mail completo do Proprietário, **Then** a lista mostra os tenants encontrados com estado (spec 002), plano e estado da assinatura (spec 019), estado do recebedor (spec 012) e data de ativação.
2. **Given** o detalhe de um tenant, **When** aberto, **Then** mostra: negócios, verticais e filiais (spec 005); plano, faturas e régua (spec 019); recebedor e KYC (spec 012); volume de agendamentos e de pagamentos dos últimos 30 dias (agregado); alertas de antifraude abertos; chargebacks; sessões de suporte (spec 003); concessões; e o histórico de ações da Gestão (spec 004).
3. **Given** dados pessoais no detalhe (documento, e-mail, celular do Proprietário), **When** exibidos, **Then** aparecem mascarados; ver o valor completo exige justificativa, fica registrado na trilha de auditoria e vale só para aquele campo.
4. **Given** o detalhe, **When** o Suporte precisa agir dentro do painel do tenant, **Then** abre uma sessão de suporte a partir dali (spec 003), com a justificativa já ligada ao atendimento.
5. **Given** o detalhe, **When** a Gestão registra uma observação interna sobre o tenant (até 1.000 caracteres, não sensível), **Then** ela fica visível só para a Gestão, com autor e data.

---

### User Story 2 - Visão geral da plataforma (Priority: P2)

Como qualquer perfil da Gestão, quero uma tela inicial com os números da plataforma e o que está pendente para mim.

**Why this priority**: tela "Visão geral da plataforma" (DF 9.5); orienta o dia de um time pequeno.

**Independent Test**: com dados sintéticos, abrir a visão geral com cada perfil e conferir os números e as filas mostradas para cada um.

**Acceptance Scenarios**:

1. **Given** a visão geral, **When** aberta, **Then** mostra: tenants ativos, ativados no mês e em degustação; agendamentos concluídos e pagos no mês (North Star); GMV; inadimplência (spec 019); chargebacks abertos; alertas de antifraude abertos; e a saúde técnica resumida (spec 001).
2. **Given** o perfil de quem abre, **When** a tela carrega, **Then** mostra as filas daquele perfil, com a quantidade e o item mais antigo: Suporte (moderação de avaliações, spec 016; recuperações de segundo fator, spec 003; pedidos de troca de slug, spec 005); Financeiro/Ops (divergências de conciliação e chargebacks, spec 012; inadimplência, spec 019; alertas de antifraude financeiros); Comercial/Growth (pedidos de concessão e tenants em onboarding parado); SRE (falhas de provisionamento e migração, spec 002; quebra da trilha, spec 004).
3. **Given** os números, **When** exibidos, **Then** são agregados, sem dados pessoais, e atualizados pelo menos a cada 15 minutos.

---

### User Story 3 - Acompanhar onboarding e KYC (Priority: P1)

Como Comercial/Growth ou Financeiro/Ops, quero ver em que passo cada tenant novo está, o que trava a ativação, e tratar os casos de KYC que o PSP não aprovou sozinho.

**Why this priority**: DF 3.4.4 (tempo de ativação); sem KYC aprovado não há pagamento online (REQ-PAG-013).

**Independent Test**: com tenants sintéticos em passos diferentes do onboarding e um recebedor recusado, abrir "Onboarding e KYC", conferir o funil, pedir um documento ao tenant e acompanhar a nova análise.

**Acceptance Scenarios**:

1. **Given** "Onboarding e KYC", **When** aberta, **Then** mostra os tenants em onboarding com o passo atual (spec 005), há quantos dias estão parados e o estado do recebedor.
2. **Given** um recebedor `recusado` ou `em_análise` há mais de 3 dias úteis, **When** o Financeiro/Ops o abre, **Then** vê o motivo informado pelo PSP e pode pedir documento ou correção ao tenant (o Proprietário recebe aviso no painel e por e-mail) e reenviar para análise.
3. **Given** um recebedor `ativo`, **When** o Financeiro/Ops identifica risco, **Then** pode bloqueá-lo (spec 012), com motivo e registro na trilha de auditoria; novos pagamentos online do negócio ficam suspensos e o Proprietário é avisado.
4. **Given** um tenant parado no onboarding há mais de 7 dias, **When** o prazo passa, **Then** entra na fila do Comercial/Growth.
5. **Given** os dados do tenant, **When** a Gestão os confere, **Then** vê se o CNPJ está ativo na consulta pública (quando o tenant for pessoa jurídica) e se o titular do recebedor corresponde aos dados cadastrais.

---

### User Story 4 - Conceder degustação e desconto (Priority: P1)

Como Comercial/Growth, quero conceder degustação (uso gratuito por um período), desconto na assinatura ou isenção de taxa a um tenant, dentro do meu limite, com justificativa, e acompanhar se a concessão converteu.

**Why this priority**: DF 3.4.3 e o `trial_grant` do glossário; a assinatura (spec 019) aplica as concessões, mas alguém precisa concedê-las com controle.

**Independent Test**: conceder 30 dias de degustação a um tenant de teste, conferir o estado `em_degustação` na assinatura (spec 019) e o aviso ao Proprietário; tentar conceder um desconto acima do limite do perfil e conferir o pedido de aprovação ao Financeiro/Ops.

**Acceptance Scenarios**:

1. **Given** um tenant, **When** o Comercial/Growth cria uma concessão, **Then** escolhe o tipo (degustação de N dias; desconto percentual ou em reais na assinatura por N ciclos; isenção da taxa por agendamento por N dias; crédito avulso), o valor, a duração e a justificativa.
2. **Given** os limites do perfil (configuráveis no back-office; padrão: degustação até 30 dias, desconto até 50% por até 3 ciclos, crédito até R$ 300), **When** a concessão está dentro do limite, **Then** vale na hora; acima, fica `aguardando_aprovação` do Financeiro/Ops.
3. **Given** uma concessão aprovada, **When** passa a valer, **Then** a assinatura a aplica (REQ-ASS-015), o Proprietário vê a concessão em "Assinatura Koovela e faturas" com data de fim, e é avisado 7 dias antes do fim.
4. **Given** um tenant, **When** já teve degustação, **Then** uma nova degustação exige aprovação do Financeiro/Ops.
5. **Given** as concessões, **When** o Comercial/Growth abre o painel de resultados, **Then** vê, por período e por autor: concessões feitas, valor concedido, e conversão (tenants que pagaram a primeira fatura cheia depois da concessão).
6. **Given** qualquer concessão, **When** criada, alterada, aprovada ou cancelada, **Then** gera registro na trilha de auditoria.

---

### User Story 5 - Antifraude: alertas, investigação e ação (Priority: P1)

Como Financeiro/Ops, quero receber numa fila os sinais de fraude e abuso da plataforma, investigar com o contexto necessário e agir (reter, bloquear, liberar), sempre com uma pessoa tomando a decisão final.

**Why this priority**: DF 3.4.5 e CONST 5 (antifraude registra o motivo da decisão); vários domínios já geram sinais e precisam de um destino.

**Independent Test**: gerar sinais sintéticos (cartões recusados em sequência, agendamentos em massa, acúmulo anormal de pontos, avaliações combinadas), conferir os alertas na fila com severidade e contexto, tomar uma ação de bloqueio e revertê-la depois.

**Acceptance Scenarios**:

1. **Given** os sinais das specs anteriores (pedidos de OTP em massa, spec 003; reservas temporárias em massa, spec 008; agendamentos futuros acima do limite, spec 009; cartões recusados em sequência e chargebacks, spec 012; abuso de pontos, spec 015; avaliações suspeitas, spec 016), **When** um sinal dispara uma regra, **Then** vira um alerta com tipo, severidade, alvo (consumidor, tenant, colaborador, aparelho, IP), evidências e o motivo da regra.
2. **Given** um alerta, **When** o Financeiro/Ops investiga, **Then** vê o histórico relevante do alvo, com dados pessoais mascarados por padrão (ver completo exige justificativa registrada), e nunca vê anotações de atendimento (spec 020).
3. **Given** a decisão, **When** o Financeiro/Ops age, **Then** escolhe uma ação proporcional: arquivar como falso positivo; reter pontos ou avaliações (specs 015 e 016); bloquear meio de pagamento; reter repasses de um tenant (DF 2.5, "bloqueio de repasse"); bloquear temporariamente um consumidor na plataforma; ou suspender um tenant (spec 002). Toda ação exige motivo e gera registro na trilha de auditoria.
4. **Given** as regras automáticas, **When** disparam, **Then** só podem reter ou limitar temporariamente (por até 72 horas); bloqueio de conta e suspensão de tenant são sempre decisão humana.
5. **Given** um consumidor bloqueado, **When** tenta agendar, **Then** vê que a conta está bloqueada para análise, com o canal para pedir revisão (LGPD art. 20); a revisão é decidida por outra pessoa da Gestão em até 5 dias úteis.
6. **Given** qualquer ação, **When** revertida, **Then** desfaz os efeitos (libera pontos, repasses, conta), com motivo e registro.
7. **Given** um tenant com taxa de chargeback acima de 1% do volume de cartão em 30 dias (padrão), **When** isso acontece, **Then** um alerta de severidade alta é gerado para o Financeiro/Ops.

---

### User Story 6 - Defesa de chargebacks e estornos manuais (Priority: P2)

Como Financeiro/Ops, quero tratar cada chargeback dentro do prazo, com as provas reunidas e a participação do tenant, e fazer estornos manuais com controle.

**Why this priority**: DF 2.5 (Financeiro/Ops: chargebacks, estorno) e a parte de análise e defesa deixada pela spec 012 (REQ-PAG-054).

**Independent Test**: com um chargeback simulado pelo PSP, abrir a fila, conferir o prazo e o dossiê de provas, pedir complemento ao tenant, enviar a defesa e registrar o resultado.

**Acceptance Scenarios**:

1. **Given** um chargeback registrado (spec 012), **When** aparece na fila, **Then** mostra prazo de defesa, valor, motivo, tenant e o dossiê de provas reunido automaticamente (check-in, check-out, aceite da política, avisos entregues, histórico do agendamento).
2. **Given** o dossiê, **When** o Financeiro/Ops pede complemento, **Then** o Proprietário recebe o pedido no painel e pode anexar documentos e um relato em até 3 dias antes do prazo.
3. **Given** a defesa, **When** enviada ao PSP, **Then** o chargeback fica `em_defesa`; o resultado (ganho ou perdido) é registrado pela spec 012 com o lançamento correspondente.
4. **Given** um prazo de defesa a 2 dias de vencer sem defesa enviada, **When** o prazo chega, **Then** o Financeiro/Ops é alertado.
5. **Given** um estorno manual pedido pelo back-office (REQ-PAG-052), **When** o valor passa do limite de aprovação (padrão R$ 500), **Then** precisa da aprovação de uma segunda pessoa do Financeiro/Ops.

---

### Edge Cases

- **Gestão com uma só pessoa** (a equipe inicial é pequena): onde a spec exige uma segunda pessoa (aprovação de estorno grande, revisão de bloqueio), a mesma pessoa pode aprovar com uma justificativa extra e registro de "aprovação sem segunda pessoa", visível nas métricas.
- **Tenant suspenso por fraude e por inadimplência ao mesmo tempo**: a reativação exige que as duas causas sejam resolvidas (a spec 002 guarda os motivos de suspensão como conjunto, e cada origem só retira o próprio); o painel do tenant mostra só o motivo financeiro.
- **Consumidor bloqueado com agendamentos futuros**: os agendamentos continuam válidos, salvo decisão explícita de cancelar, com aviso aos estabelecimentos.
- **Alerta sobre colaborador** (conluio com consumidor): o alvo é o vínculo no tenant; a ação possível é reter pontos e avaliações e avisar o Proprietário, nunca bloquear a pessoa em outros tenants.
- **Concessão para tenant inadimplente**: permitida só com aprovação do Financeiro/Ops.
- **Busca por CPF**: só por valor completo (HMAC), nunca por parte (CONST IV).
- **Exportação de listas do back-office**: só agregados ou listas sem dados pessoais; listas com dados pessoais exigem justificativa e registro.
- **Mesmo sinal repetido**: alertas iguais para o mesmo alvo em 24 horas são agrupados.

---

## Requirements *(mandatory)*

Formato: `REQ-BKO-NNN (origem: …)`.

### Functional Requirements

**Tenants e visão geral**

- **REQ-BKO-001** (origem: DF 9.5 "Tenants" | DF 3.4.1): A tela "Tenants" DEVE permitir buscar por nome do negócio, slug, CNPJ completo ou e-mail completo do Proprietário, e mostrar estado do tenant, plano e assinatura, recebedor e data de ativação.
- **REQ-BKO-002** (origem: DF 9.5): O detalhe do tenant DEVE reunir: negócios e filiais, assinatura e faturas, recebedor e KYC, volumes agregados de 30 dias, alertas, chargebacks, sessões de suporte, concessões e histórico de ações da Gestão, lendo cada parte pelo contrato da spec dona (CONST VII).
- **REQ-BKO-003** (origem: CONST V | CONST IV | DF 2.5): Dados pessoais no back-office DEVEM aparecer mascarados por padrão; ver o valor completo de um campo DEVE exigir justificativa e gerar registro na trilha de auditoria.
- **REQ-BKO-004** (origem: REQ-IDN-060): O detalhe DEVE permitir abrir sessão de suporte (spec 003), com a justificativa ligada ao atendimento.
- **REQ-BKO-005** (origem: DF 2.5): A Gestão DEVE poder registrar observações internas não sensíveis sobre o tenant, visíveis só à Gestão.
- **REQ-BKO-006** (origem: DF 9.5 "Visão geral da plataforma" | DF 14): A visão geral DEVE mostrar números agregados (tenants ativos, ativados e em degustação, North Star, GMV, inadimplência, chargebacks e alertas abertos, saúde técnica) atualizados pelo menos a cada 15 minutos, e as filas do perfil de quem abre, com quantidade e item mais antigo.

**Onboarding e KYC**

- **REQ-BKO-010** (origem: DF 9.5 "Onboarding e KYC" | DF 3.4.4): A tela DEVE mostrar os tenants em onboarding com o passo atual, os dias parados e o estado do recebedor; tenants parados há mais de 7 dias DEVEM entrar na fila do Comercial/Growth.
- **REQ-BKO-011** (origem: D04 | REQ-PAG-010): Recebedores recusados ou em análise há mais de 3 dias úteis DEVEM ir à fila do Financeiro/Ops, com o motivo do PSP e a ação de pedir documento ou correção ao tenant e reenviar.
- **REQ-BKO-012** (origem: DF 2.5 "bloqueio de repasse" | REQ-PAG-010): O Financeiro/Ops DEVE poder bloquear e desbloquear recebedor, com motivo e registro; o Proprietário é avisado.
- **REQ-BKO-013** (origem: DF 3.4.4): O back-office DEVE mostrar a situação do CNPJ em consulta pública e a correspondência entre o titular do recebedor e os dados cadastrais.

**Concessões**

- **REQ-BKO-020** (origem: DF 3.4.3 | DF 19 `trial_grant`): Os tipos de concessão DEVEM ser: degustação por N dias, desconto percentual ou em reais na assinatura por N ciclos, isenção da taxa por agendamento por N dias, e crédito avulso; cada uma com valor, duração, justificativa, autor e estado.
- **REQ-BKO-021** (origem: CONST V | CONST 8): Os limites por perfil DEVEM ser configuráveis no back-office (padrão para Comercial/Growth: degustação até 30 dias, desconto até 50% por até 3 ciclos, crédito até R$ 300); acima do limite, segunda degustação ou tenant inadimplente, a concessão exige aprovação do Financeiro/Ops.
- **REQ-BKO-022** (origem: REQ-ASS-015): A concessão aprovada DEVE ser aplicada pela assinatura (spec 019) e aparecer ao Proprietário com data de fim, com aviso 7 dias antes.
- **REQ-BKO-023** (origem: DF 3.4.3): O painel de concessões DEVE mostrar, por período e por autor, quantidade, valor concedido, tempo de concessão (pedido → vigência) e conversão (primeira fatura cheia paga depois da concessão).
- **REQ-BKO-024** (origem: CONST V | REQ-AUD-001): Toda criação, alteração, aprovação e cancelamento de concessão DEVE gerar registro na trilha de auditoria.

**Antifraude**

- **REQ-BKO-030** (origem: CONST 5 | DF 12 | DF 3.4.5): DEVE existir um motor de regras de antifraude que recebe os sinais das specs 003, 008, 009, 012, 015 e 016 e gera alertas com tipo, severidade, alvo, evidências e motivo da regra; regras e limites configuráveis no back-office.
- **REQ-BKO-031** (origem: CONST 5): Toda decisão de antifraude DEVE registrar o motivo (CONST 5) e gerar registro na trilha de auditoria.
- **REQ-BKO-032** (origem: LGPD art. 20 | CONST IV): Regras automáticas só PODEM reter ou limitar temporariamente (até 72 horas); bloqueio de conta de consumidor e suspensão de tenant DEVEM ser decisão humana.
- **REQ-BKO-033** (origem: DF 2.5): As ações disponíveis DEVEM ser: arquivar como falso positivo, reter pontos ou avaliações, bloquear meio de pagamento, reter repasses do tenant, bloquear temporariamente consumidor na plataforma e suspender tenant (spec 002); todas reversíveis, com motivo.
- **REQ-BKO-034** (origem: LGPD art. 20): O consumidor bloqueado DEVE ver o motivo genérico e o canal para pedir revisão; a revisão DEVE ser decidida por outra pessoa da Gestão (ou com justificativa extra, se houver uma só) em até 5 dias úteis.
- **REQ-BKO-035** (origem: CONST II | REQ-EQP-001): Alertas sobre colaborador DEVEM ter como alvo o vínculo no tenant; ações sobre ele NÃO DEVEM afetar a mesma pessoa em outros tenants.
- **REQ-BKO-036** (origem: DF 3.4.5): Taxa de chargeback de um tenant acima de 1% do volume de cartão em 30 dias (configurável) DEVE gerar alerta de severidade alta.
- **REQ-BKO-037** (origem: REQ-ANO-030): A investigação NUNCA DEVE exibir anotações de atendimento nem alertas de cuidado (spec 020).
- **REQ-BKO-038** (origem: edge case): Alertas iguais para o mesmo alvo em 24 horas DEVEM ser agrupados.

**Chargebacks e estornos**

- **REQ-BKO-040** (origem: REQ-PAG-054 | DF 9.5): A fila de chargebacks DEVE mostrar prazo, valor, motivo, tenant e o dossiê de provas reunido automaticamente, e permitir pedir complemento ao tenant, enviar a defesa e acompanhar o resultado.
- **REQ-BKO-041** (origem: REQ-PAG-054): O Proprietário DEVE poder anexar documentos e relato ao dossiê pelo painel, até 3 dias antes do prazo.
- **REQ-BKO-042** (origem: CONST X): Chargeback a 2 dias do prazo sem defesa DEVE gerar alerta ao Financeiro/Ops.
- **REQ-BKO-043** (origem: CONST V | REQ-PAG-052): Estorno manual acima do limite de aprovação (padrão R$ 500, configurável) DEVE exigir a aprovação de uma segunda pessoa do Financeiro/Ops (ou justificativa extra, se houver uma só).

**Filas, permissões e isolamento**

- **REQ-BKO-050** (origem: CONST VII): O back-office DEVE reunir as filas das outras specs (moderação de avaliações, recuperação de segundo fator, troca de slug, divergências de conciliação, inadimplência, falhas de provisionamento, quebra da trilha, alertas de abuso) por perfil, mantendo a regra e a decisão em cada spec dona.
- **REQ-BKO-051** (origem: CONST V | DF 7): Cada tela e ação do back-office DEVE ter célula na matriz de permissões (spec 003), testada; nenhum perfil tem acesso a dados de tenant fora das telas desta spec e da sessão de suporte.
- **REQ-BKO-052** (origem: CONST 3 | REQ-FND-034): O back-office DEVE continuar acessível só por `admin.koovela.com`, com autenticação de borda, MFA e lista de IPs.
- **REQ-BKO-053** (origem: CONST II): O back-office lê dados de tenants só por contratos e projeções; nunca acessa o espaço de dados de um tenant diretamente.
- **REQ-BKO-054** (origem: edge case | CONST V): Onde a spec exige segunda pessoa, a aprovação pela mesma pessoa DEVE exigir justificativa extra, ficar marcada como "sem segunda pessoa" e aparecer nas métricas.

### Key Entities

- **Observação interna do tenant**: tenant, autor, texto, data.
- **Revelação de dado pessoal**: autor, alvo, campo, justificativa, data.
- **Concessão** (`trial_grant` e similares): tenant, tipo, valor, duração, justificativa, autor, aprovador, estado, datas.
- **Limite de concessão por perfil**: perfil, tipo, valor máximo, duração máxima.
- **Regra de antifraude**: sinal, condição, severidade, ação automática permitida (reter ou limitar), estado.
- **Alerta de antifraude**: regra, alvo, evidências, severidade, estado, responsável, decisão, motivo.
- **Ação de antifraude**: alerta, tipo, alvo, motivo, autor, datas, reversão.
- **Pedido de revisão de bloqueio**: consumidor, alerta, texto, decisor, decisão, data.
- **Dossiê de chargeback**: chargeback, provas automáticas, complementos do tenant, defesa enviada, resultado.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.5) | Código |
|---|---|---|
| Back-office | Visão geral da plataforma | Registrado no plano |
| Back-office | Tenants | Registrado no plano |
| Back-office | Onboarding e KYC | Registrado no plano |
| Back-office | Concessões | Registrado no plano |
| Back-office | Antifraude, estornos e chargebacks | Registrado no plano |
| Painel do cliente | Pedido de documento, aviso de concessão, complemento de chargeback | Registrados no plano |
| App e web do consumidor | Aviso de bloqueio e pedido de revisão | Registrado no plano |

As telas "Provisionamento e migração" (002), "Impersonation" (003), "Feature flags" e "Trilha de auditoria" (004), e "Planos, cobrança e inadimplência" (019) são das specs indicadas.

---

## Regras e estados

- **Concessão**: `rascunho` → `aguardando_aprovação` (acima do limite) → `ativa` → `encerrada`; `ativa` → `cancelada`.
- **Alerta**: `aberto` → `em_investigação` → `ação_tomada` | `falso_positivo`; `ação_tomada` → `revertido`.
- **Retenção automática**: no máximo 72 horas sem decisão humana; ao vencer, a retenção cai e o alerta sobe de severidade.
- **Bloqueio de consumidor**: `bloqueado` → `em_revisão` (pedido) → `mantido` | `desbloqueado`.
- **Chargeback** (complementa a spec 012): `aberto` → `aguardando_tenant` → `em_defesa` → `ganho` | `perdido`.
- **Segunda pessoa**: obrigatória para estorno acima do limite e para revisão de bloqueio; exceção registrada quando a Gestão tem uma só pessoa.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Dados do tenant e do Proprietário exibidos no back-office | Pessoal (mascarado) | Execução de contrato; legítimo interesse | Conforme a spec dona | Perfis da Gestão conforme a matriz |
| Revelações de dado pessoal | Pessoal (atores) | Segurança (art. 7, IX) | 5 anos (trilha) | SRE; DPO |
| Alertas e evidências de antifraude | Pessoal | Legítimo interesse e prevenção à fraude (art. 7, IX; art. 11, II, g para dado sensível) | 5 anos após o encerramento | Financeiro/Ops; SRE |
| Bloqueios e pedidos de revisão | Pessoal | Legítimo interesse; direito de revisão (art. 20) | 5 anos | Financeiro/Ops; o próprio consumidor (decisão) |
| Observações internas | Pessoal (eventualmente) | Legítimo interesse | Enquanto houver relação + 2 anos | Gestão |
| Concessões | Dado da empresa | Execução de contrato | 5 anos | Gestão; Proprietário (as próprias) |

Regras: anotações de atendimento nunca aparecem no back-office (REQ-BKO-037); evidências de antifraude guardam identificadores e resumos, não conteúdo de comentários nem de anotações; listas exportadas com dados pessoais exigem justificativa e registro.

---

## Permissões

| Ação | Suporte | Fin/Ops | Comercial/Growth | SRE |
|---|---|---|---|---|
| Ver tenants e detalhe (mascarado) | ✔ | ✔ | ✔ | ✔ |
| Revelar dado pessoal com justificativa | ✔ | ✔ | — | ✔ |
| Observação interna | ✔ | ✔ | ✔ | ✔ |
| Abrir sessão de suporte | ✔ auditado | — | — | ✔ auditado |
| Ver onboarding e KYC | ✔ (leitura) | ✔ | ✔ | — |
| Pedir documento, reenviar KYC, bloquear recebedor | — | ✔ | — | — |
| Criar concessão dentro do limite | — | ✔ | ✔ | — |
| Aprovar concessão acima do limite | — | ✔ | — | — |
| Ver e tratar alertas de antifraude | ✔ (os de conta e avaliação) | ✔ | — | ✔ (leitura) |
| Bloquear consumidor, reter repasses, suspender tenant por fraude | — | ✔ | — | ✔ (suspensão técnica, spec 002) |
| Tratar chargebacks e estornos manuais | — | ✔ | — | — |
| Configurar regras de antifraude e limites | — | ✔ | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `backoffice.grant.{requested,activated,ending_soon,ended,cancelled}.v1` | Concessões (aplicadas pela spec 019) |
| `backoffice.fraud_alert.{opened,escalated,closed}.v1` | Antifraude |
| `backoffice.fraud_action.{applied,expired,reverted}.v1` | Ações executadas pela spec dona: 002 (suspensão), 012 (repasses e meio de pagamento), 015 (pontos), 016 (avaliações) |
| `backoffice.consumer_block.{blocked,review_requested,kept,unblocked}.v1` | Bloqueio de consumidor (aplicado pela spec 003; a 009 mantém os agendamentos) |
| `backoffice.chargeback.defense_submitted.v1` | Defesa enviada |
| `backoffice.personal_data.revealed.v1` | Revelação de dado pessoal |
| `backoffice.tenant_request.changed` | Pedido de documento ou de complemento ao tenant (avisado pela 011) |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Tempo de ativação (conta criada → primeiro agendamento pago) | DF 3.4.4 | Acompanhada |
| Tempo de concessão (pedido → vigência) e conversão | DF 3.4.3 | Acompanhada |
| Perda por fraude e chargeback / GMV | DF 3.4.5 | Acompanhada |
| Taxa de chargeback por tenant | DF 3.4.5 | Alerta acima de 1% |
| Alertas por tipo; % falso positivo; tempo até decisão | CONST 5 | Acompanhada |
| Chargebacks defendidos no prazo e taxa de vitória | DF 3.4.5 | 100% defendidos no prazo |
| Aprovações "sem segunda pessoa" | REQ-BKO-054 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O Suporte encontra um tenant e entende a situação dele (estado, plano, recebedor, alertas) em até 30 segundos.
- **SC-002**: 100% das revelações de dado pessoal, concessões e ações de antifraude têm justificativa e registro na trilha de auditoria.
- **SC-003**: Nenhuma regra automática bloqueia conta ou suspende tenant sem decisão humana, em 100% dos testes.
- **SC-004**: 100% dos chargebacks recebem defesa (ou decisão registrada de não defender) dentro do prazo.
- **SC-005**: 100% dos pedidos de revisão de bloqueio são decididos em até 5 dias úteis.
- **SC-006**: Uma concessão dentro do limite passa a valer em até 2 minutos depois de criada.
- **SC-007**: Nenhuma tela do back-office exibe anotação de atendimento ou alerta de cuidado, verificado por teste.

---

## Pendências e conflitos

### Bloqueantes

Nenhuma.

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-08** — valores dos planos | Spec 019 | Concessões são calculadas sobre o plano vigente |
| **PEN-19** — moderação de avaliações | Spec 016 | O back-office só oferece a fila; a regra é de lá |
| **PEN-11** — recebedor por negócio ou filial | Spec 005 / 012 | O detalhe do tenant mostra o recebedor no nível decidido |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Limites de concessão | ASSUMIDO: degustação até 30 dias, desconto até 50% por 3 ciclos, crédito até R$ 300 para Comercial/Growth |
| Decisão humana | ASSUMIDO: regras automáticas só retêm ou limitam por até 72 horas |
| Chargeback | ASSUMIDO: alerta acima de 1% do volume de cartão em 30 dias |
| Estorno manual | ASSUMIDO: segunda aprovação acima de R$ 500 |
| Equipe de uma pessoa | ASSUMIDO: a "segunda pessoa" pode ser dispensada com justificativa extra registrada |

---

## Fora do escopo desta especificação

- Provisionamento e migração (spec 002), sessões de suporte e contas da Gestão (spec 003), feature flags e trilha de auditoria (spec 004), planos e régua de inadimplência (spec 019), que têm as próprias telas.
- Regras de negócio das filas reunidas (moderação, conciliação, slug, recuperação de segundo fator), que ficam nas specs donas.
- Atendimento ao consumidor por chat ou telefone e sistema de chamados.
- Painéis de BI (spec 023).
- Prevenção à lavagem de dinheiro e obrigações regulatórias do PSP, que são do PSP.

---

## Assumptions

- Metas sem número nas fontes viram valores iniciais do seed de `bko_settings` (configuráveis no back-office pelo Fin/Ops, CONST 8; nunca no código): números da visão geral a cada 15 minutos; onboarding parado há 7 dias; KYC em análise há 3 dias úteis; retenção automática de até 72 horas; revisão de bloqueio em até 5 dias úteis; complemento do tenant até 3 dias antes do prazo; alerta de chargeback 2 dias antes; agrupamento de alertas em 24 horas; tenant encontrado em até 30 segundos.
- A verificação de CNPJ usa consulta pública gratuita (REQ-FND-048).
- O dossiê de chargeback é montado com dados que as specs 009, 010 e 011 já guardam; nada novo é coletado para isso.
- O domínio dono desta spec é `backoffice` (CONST 4.4: "concessões, flags, antifraude, impersonation, auditoria consolidada").
