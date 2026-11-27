# Feature Specification: Notificações multicanal

**Feature Branch**: `011-notificacoes-multicanal`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "011 notificacoes-multicanal — seguir a sequência da constituição (seção 10): push, e-mail e SMS transacionais, lembretes. Depende de 009. Pendências C1 e PEN-25. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (com o modelo preparado para campanhas da fase 2, `[D32]`)

**Superfícies afetadas**: app do consumidor e web do consumidor ("Perfil e notificações", central de avisos, links de gestão do agendamento) · painel do cliente (avisos à equipe, configuração de lembretes, confirmação de presença na agenda) · app do colaborador e `/pro` (push e avisos) · back-office (modelos de mensagem, limites e custos de envio)

**Depende de**: 009 `agendamento-ciclo-de-vida` (e, por ela, 002 a 008); usa domínios de e-mail da 001 e identidade da 003

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios II, IV, VII, IX, XI, seções 3 (e-mail), 4.4 (`notification`), 5, 7, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.1, 3.1.7, 3.2.8, 8 (J1, J6), 9.1, 9.8, 12, 14, 17 (`[D03]`, `[D10]`, `[D27]`, `[D32]`) e 18 (`[C1]`, `[PEN-25]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O lembrete é o que mais reduz o não comparecimento, e o não comparecimento é a maior dor do estabelecimento (DF 3.2.8). Mas existe um conflito aberto, o **`[C1]`**: push só alcança quem instalou o app, e todo consumidor novo chega sem ele. Sem canal alternativo, não há como confirmar nem lembrar justamente o primeiro agendamento, onde o no-show mais acontece. Com a web do consumidor (`[D27]`), o problema cresce: no navegador não há push nativo (`[PEN-25]`).

A decisão `[D10]` ("só push") continua valendo, no Documento Fundamental, para notificações transacionais. A constituição, porém, manda que o domínio de notificação **nasça multicanal** (push, e-mail, SMS), com escolha de canal por política, e que **nenhuma spec de agendamento dependa só de push** enquanto `[C1]` estiver aberto (CONST 8).

Esta spec entrega, portanto, a capacidade completa de envio em três canais, mais a central de avisos dentro do app e da web, e uma **política de canais** configurável que permite operar tanto com a `[D10]` como está quanto com a decisão que resolver `[C1]`.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.7 | Não esquecer o compromisso | No-show com e sem lembrete |
| 3.2.8 | Reduzir no-show | Taxa de no-show |
| 3.2.13 | Não depender do WhatsApp pessoal | % de avisos enviados pela plataforma |
| DF 14 | Taxa de instalação do app | Métrica mais crítica da v1.0 |

Personas: consumidor (com e sem app); Proprietário (configura lembretes); Recepção, Gerente e Colaborador (recebem avisos); Gestão (modelos, limites e custos).

---

## Clarifications

### Session 2026-11-25

- Q: Para quem não tem o app, qual canal substitui o push? (C1 / PEN-25) → A: Em ordem de preferência: 1) SMS, 2) e-mail (verificado), 3) WhatsApp; sempre com a central de avisos. Revisa a `[D10]`, que passa a valer só para quem tem o app.
- Q: Quem paga o SMS transacional? → A: O tenant, com cota mensal incluída no plano e excedente cobrado na fatura da assinatura (como nas campanhas da `[D32]`).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consumidor recebe confirmação e lembrete, com ou sem o app (Priority: P1)

Como consumidor, quero receber a confirmação do meu agendamento e lembretes antes do horário, pelo canal que me alcança, mesmo que eu tenha agendado pela web e não tenha o app.

**Why this priority**: é a resposta ao `[C1]` e a principal alavanca contra o não comparecimento.

**Independent Test**: agendar com três consumidores de teste (um com app e push ativo, um só com celular pela web, um com e-mail verificado e sem app) e conferir que cada um recebe confirmação e lembretes pelo canal previsto na política.

**Acceptance Scenarios**:

1. **Given** um agendamento confirmado (spec 009), **When** o evento chega, **Then** o consumidor recebe a confirmação em até 1 minuto pelo canal escolhido pela política de canais.
2. **Given** um consumidor com o app instalado e push permitido, **When** um aviso é enviado, **Then** vai por push e fica na central de avisos do app.
3. **Given** um consumidor sem app (agendou pela web ou foi agendado pela Recepção), **When** um aviso transacional é enviado, **Then** o canal segue a ordem 1) SMS, 2) e-mail verificado, 3) WhatsApp, passando ao seguinte quando o anterior não está disponível ou falha; o aviso também fica na central de avisos (`[C1]`/`[PEN-25]` resolvidos; a `[D10]` passa a valer só para quem tem o app).
4. **Given** um agendamento confirmado, **When** chega o momento dos lembretes do negócio (padrão: 24 horas e 2 horas antes), **Then** o consumidor recebe cada lembrete com data, hora, endereço, link para ver o agendamento e as ações "confirmar presença", "remarcar" e "cancelar".
5. **Given** um push não entregue em 10 minutos (token inválido, aparelho desligado, permissão retirada), **When** a política permite outro canal, **Then** o aviso vai pelo próximo canal da política.
6. **Given** um agendamento cancelado ou remarcado, **When** isso acontece antes de um lembrete, **Then** o lembrete antigo não é enviado; os lembretes do novo horário são programados.
7. **Given** um lembrete que cairia no horário de silêncio (padrão 21h às 8h, no fuso da filial), **When** o agendamento é no dia seguinte cedo, **Then** o lembrete de 24 horas é antecipado para antes das 21h; o de 2 horas é enviado no horário certo mesmo dentro do silêncio, porque é urgente.

---

### User Story 2 - Gerir o agendamento pelo link da mensagem (Priority: P1)

Como consumidor sem app, quero abrir o link do SMS ou do e-mail e ver, confirmar presença, remarcar ou cancelar meu agendamento sem precisar baixar nada nem fazer login completo.

**Why this priority**: sem isso, o lembrete por SMS ou e-mail não reduz no-show, só informa; e o consumidor que agendou pela web fica sem caminho de volta.

**Independent Test**: receber um lembrete por SMS, abrir o link num navegador sem sessão, confirmar presença e depois cancelar; conferir no painel que a presença foi confirmada e depois o cancelamento.

**Acceptance Scenarios**:

1. **Given** um aviso com link de gestão, **When** o consumidor o abre, **Then** vê o agendamento (estabelecimento, serviço, profissional, data, hora, endereço, política) sem login.
2. **Given** o link de gestão, **When** o consumidor escolhe "confirmar presença", **Then** a agenda do painel e do colaborador mostra o agendamento como "presença confirmada".
3. **Given** o link de gestão, **When** o consumidor escolhe remarcar ou cancelar, **Then** a ação segue a política (spec 010) e, antes de executar, pede um código OTP enviado ao celular do agendamento.
4. **Given** um link de gestão, **When** o agendamento termina há mais de 24 horas, **Then** o link expira e mostra só "este agendamento já aconteceu", com o caminho para a página do estabelecimento.
5. **Given** um link de gestão, **When** aberto, **Then** dá acesso apenas àquele agendamento; nada da conta do consumidor nem de outros agendamentos aparece.
6. **Given** o link aberto num celular com o app instalado, **When** tocado, **Then** abre o app no agendamento (links universais, spec 001).

---

### User Story 3 - Catálogo de avisos transacionais (Priority: P1)

Como plataforma, quero que todo fato importante do agendamento, da política e do pagamento gere o aviso certo, para a pessoa certa, uma única vez.

**Why this priority**: as specs 003, 006, 009 e 010 dependem destes avisos para cumprir seus requisitos (por exemplo, "o consumidor é avisado").

**Independent Test**: percorrer os eventos do catálogo em ambiente de teste e verificar que cada um gera exatamente um aviso por destinatário, com o texto do modelo e os dados certos; reenviar o mesmo evento e verificar que não há aviso duplicado.

**Acceptance Scenarios**:

1. **Given** um evento do catálogo (ver "Regras e estados"), **When** publicado, **Then** gera os avisos previstos para cada destinatário (consumidor, Colaborador, Recepção da filial, Proprietário), conforme as preferências e a política de canais.
2. **Given** o mesmo evento entregue mais de uma vez (CONST IX), **When** processado, **Then** gera um único aviso por destinatário e canal.
3. **Given** eventos fora de ordem (por exemplo, cancelamento antes da confirmação), **When** processados, **Then** o consumidor não recebe aviso contraditório; vale o estado mais recente do agendamento.
4. **Given** um aviso, **When** montado, **Then** usa o modelo em pt-BR do catálogo, com nome do estabelecimento, serviço, profissional, data e hora no fuso da filial, e nunca dados de saúde nem a observação do consumidor.
5. **Given** um tenant, **When** o Proprietário escreve uma nota curta (até 140 caracteres) para a confirmação e o lembrete (por exemplo, "chegue 10 minutos antes"), **Then** a nota é incluída nos avisos daquele negócio.

---

### User Story 4 - Preferências do consumidor (Priority: P2)

Como consumidor, quero escolher por quais canais recebo os avisos e desligar os que não são essenciais, sem deixar de receber o que importa.

**Why this priority**: tela "Perfil e notificações" (DF 9.1); LGPD e lojas de aplicativo exigem controle.

**Independent Test**: no perfil, desligar push de avaliação e manter lembretes por SMS; conferir que o pedido de avaliação não chega e o lembrete chega.

**Acceptance Scenarios**:

1. **Given** "Perfil e notificações", **When** o consumidor abre, **Then** vê os tipos de aviso agrupados (essenciais: confirmação, mudança feita pelo estabelecimento, multa; lembretes; pós-atendimento: avaliação, pontos) e os canais de cada grupo.
2. **Given** os avisos essenciais, **When** o consumidor tenta desligá-los, **Then** pode trocar o canal, mas não desligar todos: pelo menos um canal fica ativo (no mínimo, a central de avisos).
3. **Given** lembretes e pós-atendimento, **When** desligados, **Then** deixam de ser enviados por aquele canal em até 1 minuto.
4. **Given** um link de descadastro em e-mail ou SMS, **When** usado, **Then** desliga aquele grupo naquele canal, em um clique, sem login.
5. **Given** comunicações promocionais, **When** a fase 2 chegar (`[D32]`), **Then** exigem opt-in próprio por canal; nada desta spec envia promoção.

---

### User Story 5 - Equipe recebe os avisos da operação (Priority: P2)

Como Colaborador, Recepção ou Proprietário, quero ser avisado de agendamentos novos, cancelamentos, remarcações, presença confirmada, folgas e contestações, no app ou no painel.

**Why this priority**: a equipe precisa reagir (por exemplo, encaixar alguém num horário cancelado) sem ficar olhando a agenda o tempo todo.

**Independent Test**: com o app do colaborador aberto e o painel aberto, criar e cancelar um agendamento pelo consumidor; conferir push no colaborador e aviso no painel.

**Acceptance Scenarios**:

1. **Given** um agendamento novo, cancelado ou remarcado, **When** acontece, **Then** o Colaborador do atendimento recebe push no app (ou aviso no `/pro`) e a Recepção da filial vê o aviso no painel em até 1 minuto.
2. **Given** o painel aberto, **When** chega um aviso, **Then** aparece sem recarregar a página, com som opcional.
3. **Given** a equipe, **When** cada pessoa configura seus avisos, **Then** pode escolher quais tipos recebe por push e por e-mail; avisos de segurança da conta (spec 003) não podem ser desligados.
4. **Given** o Proprietário, **When** quer um resumo, **Then** pode receber um e-mail diário com os agendamentos do dia seguinte e os cancelamentos do dia.

---

### User Story 6 - Controle de entrega, custo e limites (Priority: P2)

Como Gestão (SRE e Financeiro/Ops), quero saber o que foi enviado, entregue e falhou, por canal e por tenant, quanto custou, e limitar abusos.

**Why this priority**: SMS tem custo por mensagem; sem controle, um erro ou um ataque gera prejuízo; sem medição, não há como comparar no-show com e sem lembrete (CONST 7).

**Independent Test**: enviar avisos de teste por todos os canais, simular falhas do provedor e conferir os estados de entrega, a troca para o provedor alternativo e o painel de custo.

**Acceptance Scenarios**:

1. **Given** um aviso, **When** enviado, **Then** fica registrado com destinatário (identificador), tipo, canal, estado (programado, enviado, entregue, falhou, aberto, quando o canal informar) e horários.
2. **Given** a falha de um provedor de SMS ou e-mail, **When** a taxa de falha passar de 10% em 5 minutos, **Then** o envio passa ao provedor alternativo (quando configurado) e um alerta é emitido.
3. **Given** um limite diário de SMS por tenant e global, **When** ultrapassado, **Then** os avisos não urgentes por SMS são adiados ou trocados pelo próximo canal, e a Gestão é alertada.
4. **Given** o custo dos envios, **When** consultado no back-office, **Then** aparece por mês, tenant e canal; o SMS transacional é pago pelo tenant, com cota mensal incluída no plano e excedente cobrado na fatura (spec 019).
5. **Given** um mesmo destinatário, **When** vários avisos não urgentes seriam enviados em menos de 10 minutos, **Then** são agrupados em uma mensagem.

---

### Edge Cases

- **Consumidor com o app em dois aparelhos**: o push vai para todos os aparelhos ativos; a leitura num aparelho marca como lido nos outros.
- **Celular do consumidor trocado** (spec 003): os avisos vão para o número novo a partir da troca; os agendados para o número antigo são refeitos.
- **Pré-cadastro feito pela Recepção** (REQ-AGE-042): o primeiro aviso apresenta a Koovela, identifica o estabelecimento e oferece o descadastro, além do link de gestão.
- **Agendamento feito com menos de 2 horas de antecedência**: só a confirmação é enviada; lembretes que já passaram não são enviados.
- **Agendamento muito distante** (por exemplo, 60 dias): os lembretes são programados para a data e recalculados se a política de lembretes do negócio mudar.
- **Mudança de horário de verão ou fuso**: o horário de envio é calculado no fuso da filial, na data.
- **Provedor de push recusa o token**: o token é marcado inválido e não é usado de novo; o próximo canal da política é usado.
- **E-mail que volta (bounce) ou é marcado como spam**: o endereço é suspenso para aquele tipo de aviso e o consumidor vê o aviso no perfil para corrigir.
- **SMS para número fixo ou inválido**: falha registrada; nada é reenviado por SMS para esse número.
- **Tenant suspenso** (spec 002): avisos ao consumidor sobre agendamentos existentes continuam; avisos de marketing do tenant não existem nesta spec.
- **Aviso com dado de saúde** (por exemplo, nome de procedimento sensível): o Proprietário pode marcar serviços como "discretos", e os avisos passam a dizer apenas "seu atendimento em {estabelecimento}".

---

## Requirements *(mandatory)*

Formato: `REQ-NOT-NNN (origem: …)`.

### Functional Requirements

**Canais e política de canais**

- **REQ-NOT-001** (origem: CONST 8 `[C1]` | CONST 4.4 | clarify 2026-11-25): O domínio de notificação DEVE suportar os canais push no app (consumidor e colaborador), SMS, e-mail, WhatsApp (só transacional) e central de avisos dentro do app e da web; e, opcionalmente, notificação do navegador na web para quem permitir.
- **REQ-NOT-002** (origem: CONST 8 `[C1]`): A escolha do canal DEVE seguir uma política de canais configurável pela Gestão, por tipo de aviso, com ordem de preferência e regra de troca de canal na falha; nenhum aviso de agendamento DEVE depender só de push.
- **REQ-NOT-003** (origem: C1 | PEN-25 | D10 | D27): A política padrão DEVE ser: push quando houver app; sem app, SMS, depois e-mail verificado, depois WhatsApp, nessa ordem de preferência; sempre a central de avisos. Registrar a revisão da `[D10]` no registro de decisões.
- **REQ-NOT-004** (origem: CONST 3): E-mails transacionais DEVEM sair de `notificacoes@mail.koovela.com`, com SPF, DKIM e DMARC (REQ-FND-084); nenhum aviso desta spec sai de `news.koovela.com`.
- **REQ-NOT-005** (origem: CONST 5 | D32 | clarify 2026-11-25): WhatsApp NÃO DEVE ser usado para campanhas nem promoções (CONST 5); como canal transacional, é a 3ª opção da política padrão (REQ-NOT-003), só com modelos de utilidade aprovados, e seu custo segue a regra do SMS (cota no plano e excedente).
- **REQ-NOT-006** (origem: CONST XI): Push não entregue em 10 minutos DEVE passar ao próximo canal da política, quando houver.

**Lembretes e confirmação de presença**

- **REQ-NOT-010** (origem: DF 3.1.7 | J1): O negócio DEVE configurar até 3 lembretes por agendamento, de 30 minutos a 72 horas antes (padrão: 24 horas e 2 horas).
- **REQ-NOT-011** (origem: DF 3.2.8): Todo lembrete DEVE trazer data, hora no fuso da filial, endereço, link de gestão e as ações "confirmar presença", "remarcar" e "cancelar".
- **REQ-NOT-012** (origem: DF 3.2.8): A confirmação de presença DEVE aparecer na agenda do painel e do colaborador (spec 009).
- **REQ-NOT-013** (origem: CONST IV | DF 12): DEVE existir horário de silêncio (padrão 21h às 8h no fuso da filial) para avisos não urgentes; o lembrete mais próximo do horário (até 3 horas antes) é urgente e ignora o silêncio; lembretes que cairiam no silêncio são antecipados.
- **REQ-NOT-014** (origem: CONST I | CONST IX): Lembretes DEVEM ser cancelados ou reprogramados quando o agendamento for cancelado, remarcado ou mudar de profissional ou horário.

**Link de gestão do agendamento**

- **REQ-NOT-020** (origem: C1 | D27): Avisos por SMS e e-mail DEVEM ter link de gestão que abre o agendamento sem login, restrito àquele agendamento, válido até 24 horas após o horário.
- **REQ-NOT-021** (origem: CONST 5): Ver e confirmar presença pelo link NÃO exige OTP; remarcar e cancelar pelo link DEVEM exigir OTP enviado ao celular do agendamento.
- **REQ-NOT-022** (origem: REQ-FND-090): Com o app instalado, o link DEVE abrir o app no agendamento.
- **REQ-NOT-023** (origem: CONST 5): O link DEVE ser impossível de adivinhar, de uso restrito ao agendamento, revogável, e o seu uso DEVE ser limitado por IP para evitar varredura.

**Catálogo de avisos e conteúdo**

- **REQ-NOT-030** (origem: CONST VII | CONST IX): DEVE existir um catálogo de avisos transacionais (tipo, evento de origem, destinatários, grupo, urgência, canais permitidos, modelo), com a lista mínima de "Regras e estados".
- **REQ-NOT-031** (origem: CONST IX): O processamento DEVE ser idempotente por evento, destinatário e canal, e tolerar eventos fora de ordem, conferindo o estado atual antes de enviar.
- **REQ-NOT-032** (origem: CONST XI | D11): Os modelos DEVEM estar em pt-BR, em arquivos de i18n, mantidos pela Gestão no back-office, com variáveis definidas; o tenant só acrescenta uma nota curta (até 140 caracteres) na confirmação e no lembrete.
- **REQ-NOT-033** (origem: CONST IV): Avisos NÃO DEVEM conter observação do consumidor, anotação de atendimento nem dado de saúde; serviços marcados como "discretos" aparecem como "seu atendimento em {estabelecimento}".
- **REQ-NOT-034** (origem: edge case): Avisos não urgentes para o mesmo destinatário em menos de 10 minutos DEVEM ser agrupados.

**Preferências**

- **REQ-NOT-040** (origem: DF 9.1 "Perfil e notificações" | CONST IV): O consumidor DEVE escolher canais por grupo (essenciais, lembretes, pós-atendimento); os essenciais não podem ficar sem nenhum canal (a central de avisos é o mínimo).
- **REQ-NOT-041** (origem: CONST IV | D32): E-mail e SMS DEVEM ter descadastro do grupo em um clique, sem login.
- **REQ-NOT-042** (origem: D32 | CONST IV): Promoções NÃO DEVEM ser enviadas por esta spec; o modelo de preferências DEVE aceitar o opt-in por canal das campanhas da fase 2 (spec 028).
- **REQ-NOT-043** (origem: DF 2.2 | DF 2.3): Cada membro da equipe DEVE escolher os avisos que recebe por push e por e-mail; avisos de segurança da conta não podem ser desligados.

**Equipe**

- **REQ-NOT-050** (origem: DF 9.3 | DF 9.4): Agendamento novo, cancelado, remarcado, com troca de profissional ou com presença confirmada DEVE avisar o Colaborador do atendimento (push ou `/pro`) e a Recepção da filial (painel) em até 1 minuto.
- **REQ-NOT-051** (origem: DF 9.3): O painel DEVE mostrar avisos em tempo real, sem recarregar.
- **REQ-NOT-052** (origem: DF 3.2.5): O Proprietário DEVE poder receber um e-mail diário com os agendamentos do dia seguinte e os cancelamentos do dia.

**Entrega, custo e limites**

- **REQ-NOT-060** (origem: CONST X): Todo aviso DEVE ter registro de entrega por canal (programado, enviado, entregue, falhou, aberto), com horários e motivo de falha.
- **REQ-NOT-061** (origem: CONST X | CONST XII): Cada canal pago DEVE ter provedor principal e, quando configurado, alternativo, com troca automática quando a falha passar de 10% em 5 minutos, e alerta.
- **REQ-NOT-062** (origem: CONST 5 antifraude | REQ-IDN-013): DEVEM existir limites diários de SMS por tenant e global, configuráveis no back-office, com alerta; acima do limite, avisos não urgentes por SMS são adiados ou trocados de canal.
- **REQ-NOT-063** (origem: PEN-08 | D32): O SMS transacional DEVE ser pago pelo tenant: cota mensal no plano e excedente na fatura (spec 019); esta spec DEVE medir o consumo por tenant e canal e avisar o Proprietário ao atingir 80% da cota.
- **REQ-NOT-064** (origem: CONST 7): Todo agendamento DEVE ficar marcado com os lembretes efetivamente entregues, para medir o no-show com e sem lembrete.
- **REQ-NOT-065** (origem: edge case): E-mail com bounce ou marcação de spam e número inválido DEVEM ser suspensos para aquele tipo de aviso, com aviso ao titular no perfil.

**Isolamento e contratos**

- **REQ-NOT-070** (origem: CONST II): Preferências do consumidor ficam na identidade global; o registro de avisos de agendamentos fica no tenant, com o tenant como campo; nenhum tenant vê avisos de outro.
- **REQ-NOT-071** (origem: CONST VII): O domínio DEVE publicar contrato para outros domínios pedirem avisos do catálogo (por exemplo, multa pela spec 010, pagamento pela spec 012) e eventos de entrega.
- **REQ-NOT-072** (origem: CONST 6): A confirmação DEVE chegar em até 1 minuto (p95) após o evento; o lembrete, em até 2 minutos (p95) do horário programado.

### Key Entities

- **Tipo de aviso** (catálogo): código, evento de origem, destinatários, grupo, urgência, canais permitidos, modelo.
- **Política de canais**: tipo ou grupo, ordem de canais, regra de troca, limites.
- **Aviso** (`notification`): tipo, destinatário (identificador), tenant, agendamento ou referência, canal, conteúdo final, estado, horários, provedor.
- **Lembrete programado**: agendamento, momento, estado (programado, enviado, cancelado).
- **Configuração de lembretes do negócio**: momentos dos lembretes, nota curta, serviços discretos.
- **Preferência de aviso**: pessoa (consumidor ou equipe), grupo, canais.
- **Destino de entrega**: aparelho e token de push, celular, e-mail, navegador, com estado (válido, suspenso).
- **Link de gestão**: agendamento, identificador secreto, validade, revogação, usos.
- **Confirmação de presença**: agendamento, horário, canal.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor (DF 9.1) | Perfil e notificações (parte de notificações) | `9.1.x` registrado no plano |
| Web do consumidor (DF 9.8) | Perfil e notificações | `W..` registrado no plano |
| Painel (DF 9.3) | Configurações (lembretes, nota curta, serviços discretos); avisos em tempo real | Registrados no plano |
| App do colaborador (DF 9.4) | Avisos (push) e preferências no Perfil | Registrados no plano |
| Back-office | Modelos de aviso, política de canais, limites e custos de envio | Registrados no plano |

A página de gestão do agendamento pelo link e a central de avisos não aparecem no protótipo; precisam de telas novas.

---

## Regras e estados

**Catálogo mínimo de avisos**

| Aviso | Evento de origem | Para | Grupo | Urgente |
|---|---|---|---|---|
| Agendamento confirmado | spec 009 `confirmed` | Consumidor; Colaborador; Recepção | Essencial | Não |
| Aguardando pagamento | spec 009 `payment_pending` | Consumidor | Essencial | Sim |
| Agendamento expirado | spec 009 `expired` | Consumidor | Essencial | Não |
| Lembrete | Programado | Consumidor | Lembretes | O mais próximo, sim |
| Remarcado / cancelado pelo consumidor | spec 009 | Colaborador; Recepção | Essencial (equipe) | Não |
| Cancelado ou alterado pelo estabelecimento; troca de profissional | spec 009 | Consumidor | Essencial | Sim |
| Agendamento manual criado (pré-cadastro) | spec 009 | Consumidor | Essencial | Não |
| Presença confirmada | Esta spec | Colaborador; Recepção | Essencial (equipe) | Não |
| Não comparecimento e multa; multa revertida ou abonada; contestação decidida | spec 010 | Consumidor | Essencial | Não |
| Contestação aberta | spec 010 | Recepção; Gerente | Essencial (equipe) | Não |
| Folga ou troca pedida, aprovada, recusada | spec 007 | Colaborador; Gerente | Essencial (equipe) | Não |
| Sessões do pacote a vencer | spec 006 | Consumidor | Pós-atendimento | Não |
| Pagamento aprovado, recusado, estornado | spec 012 | Consumidor | Essencial | Não |

As specs 014 (vaga na fila), 015 (pontos) e 016 (pedido de avaliação) acrescentam seus tipos ao catálogo.

**Aviso**: `programado` → `enviado` → `entregue` | `falhou` → (troca de canal) `enviado` …; `programado` → `cancelado` (agendamento mudou).

**Destino de entrega**: `válido` → `suspenso` (bounce, spam, token inválido, número inválido) → `válido` (corrigido pelo titular).

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Tokens de push, celular, e-mail (destinos) | Pessoal; celular e e-mail cifrados (spec 003) | Execução de contrato (art. 7, V) | Enquanto válidos; tokens inválidos apagados em 30 dias | Ninguém em claro além do envio; SRE em investigação |
| Conteúdo dos avisos enviados | Pessoal | Execução de contrato | 90 dias | O próprio destinatário (central de avisos); SRE |
| Registro de entrega (estado, horários) | Pessoal (pseudônimo) | Execução de contrato e segurança | 12 meses | SRE; Financeiro/Ops (agregado); Proprietário (avisos do próprio tenant, sem conteúdo) |
| Preferências | Pessoal | Execução de contrato; consentimento para campanhas (fase 2) | Enquanto a conta existir | O próprio titular |
| Link de gestão | Credencial temporária | Execução de contrato | Até 24 horas após o atendimento; depois, só o registro de uso por 90 dias | Ninguém além do destinatário |
| Confirmação de presença | Pessoal | Execução de contrato | Igual ao agendamento | Equipe da filial |

Regras: provedores de envio recebem apenas o mínimo (número ou e-mail e o texto final); nenhum aviso leva dado de saúde (REQ-NOT-033); logs mascaram destinos (REQ-FND-041).

---

## Permissões

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Fin/Ops | SRE |
|---|---|---|---|---|---|---|---|
| Gerir as próprias preferências | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Configurar lembretes, nota curta e serviços discretos do negócio | — | — | — | — | ✔ | — | — |
| Ver registro de entrega dos avisos do tenant | — | — | ✔ filial | ✔ filial | ✔ | — | — |
| Manter modelos, política de canais e limites | — | — | — | — | — | — | ✔ |
| Ver custos de envio | — | — | — | — | ✔ (do próprio tenant) | ✔ | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `notification.message.scheduled.v1` / `.sent.v1` / `.delivered.v1` / `.failed.v1` | Ciclo do aviso |
| `notification.reminder.delivered.v1` | Lembrete entregue (para a métrica de no-show com e sem lembrete) |
| `notification.attendance.confirmed.v1` | Consumidor confirmou presença (consumido pela spec 009) |
| `notification.destination.suspended.v1` | Destino suspenso |
| `notification.preferences.changed.v1` | Preferências alteradas |
| `notification.provider.failover.v1` | Troca para provedor alternativo |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| No-show com e sem lembrete entregue | CONST 7 · DF 3.1.7 · `[C1]` | Desde o primeiro tenant |
| No-show com e sem confirmação de presença | DF 3.2.8 | Acompanhada |
| % de consumidores alcançados por canal (push, SMS, e-mail, só central) | `[C1]` | Acompanhada |
| Taxa de entrega por canal | REQ-NOT-060 | Push e SMS acima de 95%; e-mail acima de 98% |
| Tempo do evento à confirmação entregue (p95) | REQ-NOT-072 | Até 1 min |
| Custo de envio por tenant e por mês | REQ-NOT-063 · DF 14 (custo por tenant) | Acompanhada |
| Taxa de instalação do app depois do primeiro aviso por SMS ou e-mail | DF 14 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos consumidores com agendamento confirmado recebem a confirmação por pelo menos um canal fora da plataforma, ou na central de avisos se nenhum canal externo estiver disponível pela política.
- **SC-002**: 95% das confirmações chegam em até 1 minuto, e 95% dos lembretes em até 2 minutos do horário programado.
- **SC-003**: Nenhum lembrete é enviado para agendamento já cancelado ou remarcado.
- **SC-004**: Nenhum evento reenviado gera aviso duplicado.
- **SC-005**: Um consumidor sem app confirma presença, remarca ou cancela pelo link da mensagem em até 3 toques, sem instalar nada.
- **SC-006**: A taxa de não comparecimento com lembrete entregue pode ser comparada à sem lembrete desde o primeiro mês de cada tenant.
- **SC-007**: Nenhum aviso contém dado de saúde ou observação do consumidor, verificado por teste automatizado nos modelos.
- **SC-008**: O gasto com SMS nunca passa do limite diário configurado sem alerta à Gestão.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **C1** / **PEN-25** — canal para quem não tem o app (SMS, e-mail, notificação do navegador) e revisão da `[D10]` | Política de canais; custo; no-show do primeiro agendamento | **Resolvido (clarify 2026-11-25)**: SMS, e-mail, WhatsApp; revisa a `[D10]` |
| Quem paga o SMS transacional (Koovela ou tenant) | Custo, planos (spec 019) | **Resolvido (clarify 2026-11-25)**: tenant, cota no plano + excedente |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **D10** | Mantida como possibilidade: a política de canais permite operar só com push e central de avisos, se a decisão de `[C1]` for essa |
| **D32** | Campanhas ficam na spec 028; esta spec só prepara o opt-in por canal |
| Lembretes padrão | ASSUMIDO: 24 horas e 2 horas antes; até 3 lembretes por agendamento |
| Horário de silêncio | ASSUMIDO: 21h às 8h no fuso da filial, com o lembrete mais próximo como urgente |
| Link de gestão | ASSUMIDO: sem login para ver e confirmar presença; OTP para remarcar e cancelar |

---

## Fora do escopo desta especificação

- OTP de login e cadastro (spec 003), que usa o mesmo provedor de SMS mas não este catálogo.
- Alertas operacionais da plataforma para o SRE (spec 001).
- Campanhas, segmentos, cotas e excedentes de CRM (spec 028).
- Avisos de vaga na fila e de horário ocioso (spec 014), de pontos (spec 015) e de pedido de avaliação (spec 016); esses domínios acrescentam seus tipos.
- Cobrança do custo de envio ao tenant (spec 019), se essa for a decisão.
- WhatsApp para campanhas e promoções (proibido pela CONST 5); o uso transacional segue o REQ-NOT-005.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: confirmação em até 1 minuto (p95); lembrete em até 2 minutos (p95); troca de canal após 10 minutos sem entrega de push; troca de provedor com 10% de falha em 5 minutos; agrupamento de avisos em 10 minutos; nota curta de 140 caracteres; conteúdo guardado por 90 dias; registro de entrega por 12 meses.
- O provedor de e-mail tem cota gratuita suficiente para a fase inicial (REQ-FND-048); passar da cota gratuita exige decisão antes da escala, avaliando antes alternativas sem custo.
- Decisão de 2026-11-26 (custo): SMS e WhatsApp transacionais são exceção à regra de R$ 0 junto com o SMS de OTP (spec 003), com custo repassado ao tenant pela cota no plano e pelo excedente na fatura (spec 019, REQ-NOT-063).
- A notificação do navegador na web é opcional e só é pedida depois do primeiro agendamento, nunca na primeira visita.
- A central de avisos guarda os últimos 90 dias e está no app e na web.
- O domínio dono desta spec é `notification` (CONST 4.4).
