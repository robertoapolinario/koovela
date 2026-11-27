# Feature Specification: Colaborador em vários negócios

**Feature Branch**: `027-colaborador-multinegocio`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "027 colaborador-multinegocio — seguir a sequência da constituição (seção 10), fase 2: [D31]. Depende de 007 e 008. Pendência C6. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 2 (em todas as plataformas, `[D35]`)

**Superfícies afetadas**: app do colaborador e `/pro` ("Agendas de vários negócios"; troca de negócio; comissões por negócio) · painel do cliente (convite a quem já trabalha em outro negócio; aviso de conflito) · app e web do consumidor (nenhuma mudança visível, exceto horários)

**Depende de**: 007 `equipe-escalas-comissao` · 008 `motor-agenda-disponibilidade` (e, por elas, 002, 003, 005, 006)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I (`[C6]`), II, IV, seções 2 (`pessoa` × `vínculo`), 8 (`[C6]`) e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.3, 3.3.4, 6, 6.1, 9.10, 17 (`[D31]`) e 18 (`[C6]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Muitos profissionais atendem em mais de um lugar: a manicure que trabalha num salão de manhã e em outro à tarde, a fisioterapeuta com duas clínicas. Para eles, o problema é ter uma **agenda única atendendo em vários lugares** (DF 3.3.4).

A decisão `[D31]` define a regra: **agendas separadas por negócio, juntas só na visão do colaborador**; cada negócio vê só os próprios agendamentos; **não há bloqueio automático de conflito** entre negócios; o app **avisa a sobreposição**.

Isso abre o conflito `[C6]`: com agendas separadas, o mesmo colaborador pode ser marcado em dois lugares no mesmo horário. A reserva dupla é a falha mais cara do produto, e a invariante 1 (DF 6.1) só protege dentro de uma filial. A constituição exige (CONST I, CONST 8):

- o conflito **DEVE**, no mínimo, ser **detectado e mostrado ao colaborador e aos dois tenants**;
- enquanto `[C6]` estiver aberto, **nenhuma spec pode dizer que esse conflito está "resolvido"**;
- **bloqueio automático só por decisão**.

O modelo já está pronto desde a v1.0: a pessoa é global e o vínculo é por tenant (specs 003 e 007), e o motor de agenda já detecta sobreposição da mesma pessoa entre tenants (REQ-AGD-061).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.3.4 | Agenda única atendendo em vários lugares | Colaboradores multi-tenant |
| `[C6]` | Marcação dupla entre negócios | Conflitos detectados, avisados e resolvidos pelas pessoas |

Personas: colaborador com vínculo em mais de um negócio; Proprietário e Recepção de cada negócio.

---

## Clarifications

### Session 2026-11-25

- Q: Como ficam as menções ao C6 em casos-limite e fora do escopo? → A: Atualizadas para a decisão: bloqueio só quando escolhido pelo colaborador.
- Q: Pode existir bloqueio entre as agendas de negócios diferentes do mesmo colaborador? (C6) → A: Sim, escolhido pelo próprio colaborador: ele pode ligar "bloquear nos outros negócios os horários em que já estou agendado"; os outros negócios veem só "indisponível", sem saber onde. A detecção e o aviso continuam obrigatórios.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar no segundo negócio com a mesma conta (Priority: P1)

Como colaborador que já trabalha num negócio da Koovela, quero aceitar o convite de outro negócio usando a mesma conta, sem criar outro cadastro.

**Why this priority**: sem isso, cada vínculo vira uma pessoa diferente, e a agenda unificada e a detecção de conflito ficam impossíveis.

**Independent Test**: com uma colaboradora no tenant A, o Proprietário do tenant B a convida pelo e-mail; ela aceita com a conta existente e passa a ter dois vínculos; nenhum dos dois tenants vê dados do outro.

**Acceptance Scenarios**:

1. **Given** o Proprietário do tenant B, **When** convida um colaborador pelo e-mail ou celular (spec 003), **Then** o convite chega à pessoa; o tenant B não fica sabendo se ela já trabalha em outro negócio.
2. **Given** a pessoa com conta existente, **When** aceita o convite, **Then** um novo vínculo com o tenant B é criado para a mesma pessoa (REQ-EQP-003), com papel, filial e serviços definidos por B.
3. **Given** o colaborador com dois ou mais vínculos, **When** entra no app, **Then** escolhe ver um negócio por vez ou a agenda unificada.
4. **Given** um vínculo, **When** o colaborador sai de um negócio ou o vínculo termina (spec 007), **Then** os outros vínculos não mudam.

---

### User Story 2 - Agenda unificada só para o colaborador (Priority: P1)

Como colaborador, quero ver numa única agenda os meus atendimentos de todos os negócios, com a cor e o nome de cada um, para me organizar.

**Why this priority**: tela "Agendas de vários negócios" (DF 9.10) e o centro da `[D31]`.

**Independent Test**: com atendimentos sintéticos em dois tenants, abrir a agenda unificada no app e no `/pro`, conferir que aparecem todos, e que nenhum dos tenants vê os do outro.

**Acceptance Scenarios**:

1. **Given** a agenda unificada, **When** o colaborador abre, **Then** vê todos os atendimentos do dia e da semana de todos os negócios em que tem vínculo, com nome do negócio, cor, filial, horário, serviço e nome do consumidor.
2. **Given** um atendimento de um negócio, **When** o colaborador o abre na agenda unificada, **Then** entra no contexto daquele negócio (check-in, check-out, anotações), com as regras e permissões dele.
3. **Given** os tenants, **When** consultam a agenda do colaborador, **Then** cada um vê só os próprios atendimentos e os horários livres pela escala que ele definiu para aquele negócio (CONST II).
4. **Given** a agenda unificada, **When** montada, **Then** vem de uma projeção só do colaborador, alimentada por eventos dos tenants, como a de "Meus agendamentos" (`[C5]`); nenhum tenant lê o espaço de dados de outro.
5. **Given** a agenda dos próximos 7 dias, **When** o aparelho fica sem rede, **Then** a agenda unificada continua legível (CONST XI).

---

### User Story 3 - Conflito detectado e avisado a todos (Priority: P1)

Como colaborador e como estabelecimento, quero saber na hora quando o mesmo colaborador ficou marcado em dois negócios no mesmo horário, para resolver antes que o consumidor fique sem atendimento.

**Why this priority**: exigência mínima da constituição para o `[C6]` (CONST I).

**Independent Test**: com a colaboradora com escalas sobrepostas em A e B, agendar no B um horário já ocupado no A; conferir que o agendamento é aceito (sem bloqueio automático), e que o aviso chega à colaboradora, à Recepção de A e à de B, sem revelar a A o que há em B e vice-versa.

**Acceptance Scenarios**:

1. **Given** um agendamento novo num negócio que sobrepõe outro agendamento do mesmo colaborador em outro negócio, **When** é criado, **Then** é aceito (sem bloqueio automático, `[D31]`), e o conflito é registrado.
2. **Given** um conflito, **When** registrado, **Then** o colaborador recebe aviso imediato (spec 011) com os dois atendimentos, negócios, horários e serviços.
3. **Given** um conflito, **When** registrado, **Then** a Recepção e o Proprietário de cada negócio recebem aviso de que "o colaborador tem outro compromisso fora deste negócio nesse horário", com o horário da sobreposição, sem o nome do outro negócio, do consumidor nem do serviço.
4. **Given** a agenda do painel, **When** um agendamento tem conflito aberto, **Then** aparece marcado como "conflito de agenda do colaborador" até ser resolvido.
5. **Given** um conflito, **When** um dos agendamentos é remarcado, trocado de profissional ou cancelado (spec 009), **Then** o conflito é encerrado e todos os avisados são informados.
6. **Given** a Recepção que agenda manualmente, **When** escolhe um horário em que o colaborador já tem compromisso em outro negócio, **Then** vê o aviso antes de confirmar e pode seguir ou escolher outro horário.
7. **Given** o tratamento do conflito, **When** a plataforma o apresenta, **Then** nunca diz que o conflito está "resolvido" por regra automática; só quando uma pessoa remarca, troca ou cancela um dos agendamentos.

---

### User Story 4 - Colaborador protege a própria agenda (Priority: P2)

Como colaborador, quero poder impedir que um negócio me marque num horário em que já estou ocupado em outro, ou que meus horários livres apareçam em dois lugares ao mesmo tempo.

**Why this priority**: o aviso sozinho não impede a marcação dupla feita pelo consumidor; a constituição permite bloqueio só por decisão.

**Independent Test**: com a opção de proteção ligada pela colaboradora, conferir o comportamento decidido no `[C6]` quando um consumidor tenta agendar no B um horário ocupado no A.

**Acceptance Scenarios**:

1. **Given** um colaborador com vínculos em mais de um negócio, **When** quer proteger a própria agenda, **Then** ele pode ligar "bloquear nos outros negócios os horários em que já estou agendado": cada agendamento num negócio vira, nos outros, um bloqueio "indisponível", sem revelar onde nem o quê; desligar a opção remove os bloqueios futuros; a detecção e o aviso de conflito continuam obrigatórios (CONST I).
2. **Given** escalas sobrepostas em dois negócios (spec 007), **When** o colaborador abre a agenda unificada, **Then** vê o aviso "suas escalas em {A} e {B} se sobrepõem às terças, das 14h às 16h" e um atalho para pedir ajuste de escala em cada negócio.
3. **Given** um pedido de folga, **When** o colaborador escolhe "pedir em todos os negócios", **Then** um pedido separado é enviado a cada negócio, cada um aprovado pelas próprias regras (spec 007).

---

### User Story 5 - Comissões e reputação por negócio (Priority: P2)

Como colaborador, quero ver minhas comissões de cada negócio separadas e o total, e meu perfil e minhas avaliações em cada lugar.

**Why this priority**: cada negócio tem a própria regra de comissão (spec 007) e o próprio fechamento (spec 018); o colaborador precisa da visão consolidada.

**Independent Test**: com fechamentos sintéticos em dois tenants, abrir "Comissões" no app e conferir os valores por negócio e o total; abrir o perfil e conferir as avaliações de cada negócio.

**Acceptance Scenarios**:

1. **Given** "Comissões" (spec 007 e 018), **When** o colaborador abre, **Then** vê o previsto, a receber e o recebido por negócio e o total geral.
2. **Given** o perfil profissional, **When** o colaborador edita, **Then** pode usar o mesmo perfil (foto, apresentação, especialidades) em todos os negócios ou ajustar por negócio; o portfólio segue a aprovação de cada negócio (spec 007).
3. **Given** as avaliações (spec 016), **When** o colaborador abre o perfil, **Then** vê as avaliações de cada negócio separadas; nenhum negócio vê as avaliações do colaborador em outro.

---

### Edge Cases

- **Dois negócios no mesmo tenant** (mesmo Cliente com dois negócios, spec 005): não é multi-tenant; vale a proteção completa da spec 008 dentro do tenant.
- **Conflito por deslocamento**: atendimentos em negócios diferentes sem sobreposição, mas sem tempo de deslocamento entre eles; não é conflito na fase 2; o colaborador pode configurar um intervalo mínimo entre negócios só como aviso na agenda unificada.
- **Colaborador que é Proprietário de um negócio e colaborador em outro**: os papéis são por vínculo (spec 003); a agenda unificada mostra os dois.
- **Vínculo encerrado com conflito aberto**: o conflito é encerrado com o vínculo, e os agendamentos posteriores são resolvidos pela spec 007.
- **Tenant suspenso** (spec 002): os agendamentos dele continuam na agenda unificada com o aviso "negócio indisponível".
- **Colaborador sem conta no app** (spec 007): não há agenda unificada; o conflito é detectado mesmo assim pela pessoa global, e os avisos vão aos tenants.
- **Privacidade entre negócios**: nenhum negócio sabe, pela plataforma, em quais outros negócios o colaborador trabalha; os avisos de conflito não identificam o outro negócio.

---

## Requirements *(mandatory)*

Formato: `REQ-MUL-NNN (origem: …)`.

### Functional Requirements

**Vínculos**

- **REQ-MUL-001** (origem: D31 | REQ-EQP-003 | CONST 2): Uma pessoa DEVE poder ter vínculos com vários tenants, criados por convite e aceite (spec 003), cada um com papel, filial, serviços, escala e regra de comissão do próprio tenant.
- **REQ-MUL-002** (origem: CONST II | CONST IV): Um tenant NÃO DEVE saber, pela plataforma, se a pessoa tem vínculos com outros tenants.
- **REQ-MUL-003** (origem: D31): Encerrar um vínculo NÃO DEVE afetar os outros.

**Agenda unificada**

- **REQ-MUL-010** (origem: D31 | DF 9.10 "Agendas de vários negócios"): O colaborador DEVE ter, no app e no `/pro`, a agenda unificada do dia e da semana com os atendimentos de todos os vínculos, identificados por negócio e cor.
- **REQ-MUL-011** (origem: CONST II | C5): A agenda unificada DEVE vir de uma projeção do colaborador alimentada por eventos dos tenants; nenhum tenant lê o espaço de dados de outro.
- **REQ-MUL-012** (origem: CONST II): Ações num atendimento (check-in, check-out, anotação) DEVEM acontecer no contexto do negócio dono, com as regras e permissões dele.
- **REQ-MUL-013** (origem: CONST XI): A agenda unificada dos próximos 7 dias DEVE ficar legível sem rede.

**Conflito entre negócios (`[C6]`)**

- **REQ-MUL-020** (origem: CONST I | C6 | D31): A sobreposição de agendamentos da mesma pessoa em tenants diferentes DEVE ser detectada na criação e em toda mudança de qualquer dos agendamentos (REQ-AGD-061), sem bloqueio automático.
- **REQ-MUL-021** (origem: CONST I | C6): O conflito DEVE ser mostrado ao colaborador (com os detalhes dos dois atendimentos) e aos dois tenants (só o horário da sobreposição e "compromisso fora deste negócio"), por aviso imediato e por marca na agenda até ser encerrado.
- **REQ-MUL-022** (origem: CONST I | C6): A Recepção que agenda manualmente DEVE ver o aviso de compromisso externo antes de confirmar.
- **REQ-MUL-023** (origem: CONST I): O conflito só DEVE ser encerrado quando uma pessoa remarcar, trocar de profissional ou cancelar um dos agendamentos, ou quando um vínculo terminar; nenhuma tela ou texto pode dizer que o conflito foi "resolvido" automaticamente.
- **REQ-MUL-024** (origem: C6 | CONST 8): O colaborador DEVE poder ligar o bloqueio entre negócios: cada agendamento num negócio gera, nos outros, bloqueio "indisponível" sem detalhes, criado com a mesma proteção contra reserva dupla da spec 008; o bloqueio é opcional e só do colaborador; detecção e aviso continuam obrigatórios.
- **REQ-MUL-025** (origem: D31 | REQ-EQP-020): A agenda unificada DEVE avisar escalas sobrepostas entre negócios e oferecer atalho para pedir ajuste em cada um.
- **REQ-MUL-026** (origem: CONST VIII): O CI DEVE ter teste de contrato da detecção de conflito entre dois tenants sintéticos (criação, remarcação, cancelamento) como portão de merge.

**Folgas, comissões e perfil**

- **REQ-MUL-030** (origem: REQ-EQP-030): O pedido de folga DEVE poder ser enviado a todos os negócios de uma vez, como pedidos separados, aprovados pelas regras de cada um.
- **REQ-MUL-031** (origem: REQ-EQP-050 | REQ-FEC-024): "Comissões" DEVE mostrar previsto, a receber e recebido por negócio e no total.
- **REQ-MUL-032** (origem: REQ-EQP-004): O perfil profissional DEVE poder ser único para todos os negócios ou ajustado por negócio; portfólio e avaliações ficam por negócio.
- **REQ-MUL-033** (origem: CONST II): Nenhum negócio DEVE ver comissões, avaliações, portfólio ou agenda do colaborador em outro negócio.

### Key Entities

- **Pessoa** (global, spec 003): identidade do colaborador.
- **Vínculo** (por tenant, spec 007): tenant, papel, filial, serviços, escala, regra de comissão.
- **Agenda unificada** (projeção da pessoa): atendimentos de todos os vínculos, com negócio, horário, serviço, consumidor (só para o colaborador).
- **Conflito entre negócios**: pessoa, agendamentos envolvidos (por tenant), horário da sobreposição, data de detecção, estado (aberto, encerrado), quem encerrou e como.
- **Preferência de perfil**: pessoa, perfil único ou por negócio.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.10) | Código |
|---|---|---|
| App do colaborador | Agendas de vários negócios | Registrado no plano |
| Colaborador desktop (`/pro`) | Agenda unificada | Registrado no plano |
| Painel do cliente | Marca e aviso de conflito na agenda; aviso no agendamento manual | Registrados no plano |

O aviso de conflito ao colaborador e a escolha "pedir folga em todos" precisam ser conferidos no protótipo.

---

## Regras e estados

- **Conflito**: `aberto` (detectado) → `encerrado` (remarcação, troca de profissional, cancelamento ou fim de vínculo, sempre por ação de uma pessoa ou por término do vínculo).
- **Quem vê o quê no conflito**: colaborador — os dois atendimentos completos; cada tenant — o próprio atendimento e "compromisso fora deste negócio" com o horário.
- **Bloqueio automático entre negócios**: só existe quando o próprio colaborador o liga (REQ-MUL-024); nenhum negócio pode ligá-lo por ele.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Agenda unificada (atendimentos de vários tenants) | Pessoal (do colaborador e dos consumidores) | Execução de contrato (art. 7, V) | Igual aos agendamentos (spec 009) | Só o próprio colaborador |
| Existência de outros vínculos | Pessoal (trabalho do colaborador) | Execução de contrato | Enquanto houver vínculo | Só o próprio colaborador |
| Conflitos | Pessoal | Legítimo interesse e execução de contrato | 12 meses após encerrado | Colaborador (completo); cada tenant (só o próprio lado) |

Regras: nenhum dado de consumidor de um tenant chega a outro tenant; os avisos de conflito aos tenants não identificam o outro negócio, o consumidor nem o serviço.

---

## Permissões

| Ação | Colaborador | Recepção | Gerente | Proprietário |
|---|---|---|---|---|
| Ver a agenda unificada | ✔ (só a própria) | — | — | — |
| Aceitar e encerrar vínculos | ✔ | — | — | ✔ (do próprio tenant) |
| Ver conflitos | ✔ (completos) | ✔ filial (só o próprio lado) | ✔ filial | ✔ |
| Encerrar conflito (remarcar, trocar, cancelar) | ✔ (como estabelecimento, no contexto de cada negócio) | ✔ filial | ✔ filial | ✔ |
| Pedir folga em todos os negócios | ✔ | — | — | — |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `workforce.employment.linked_existing_person.v1` | Vínculo novo com pessoa que já tinha conta |
| `scheduling.occupation.cross_tenant_overlap_detected.v1` | Conflito detectado (já previsto na spec 008) |
| `scheduling.cross_tenant_conflict.closed.v1` | Conflito encerrado, com a forma |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Colaboradores com vínculos em mais de um tenant | DF 3.3.4 | Acompanhada |
| Conflitos detectados por mês e tempo até o encerramento | `[C6]` | Acompanhada |
| Conflitos que chegaram à hora do atendimento sem encerramento | `[C6]` | Acompanhada; alvo 0 |
| Uso da agenda unificada | DF 3.3.4 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das sobreposições entre negócios são detectadas e avisadas ao colaborador e aos dois tenants em até 1 minuto.
- **SC-002**: Nenhum tenant recebe, em nenhum aviso ou tela, o nome do outro negócio, do consumidor ou do serviço, verificado por teste.
- **SC-003**: O colaborador vê todos os atendimentos de todos os negócios numa única agenda em até 2 toques.
- **SC-004**: O colaborador entra num segundo negócio com a conta que já tem, sem criar outro cadastro.
- **SC-005**: Nenhuma tela ou mensagem diz que um conflito foi "resolvido" sem ação de uma pessoa, verificado por teste.
- **SC-006**: A agenda unificada dos próximos 7 dias fica legível sem rede.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **C6** — bloqueio escolhido pelo colaborador entre negócios, ou nenhum bloqueio até nova decisão | Risco de marcação dupla; experiência do consumidor nos dois negócios | **Decidido (clarify 2026-11-25)**: bloqueio escolhido pelo colaborador; detecção e aviso obrigatórios. Registrar no Documento Fundamental para fechar o `[C6]` |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-04** — colaborador em várias filiais do mesmo negócio | Spec 007 | Dentro de um tenant, vale a proteção completa da spec 008 |
| **PEN-14** — comissão via split | Spec 007 / 012 / 018 | Cada negócio segue a mesma decisão |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Privacidade entre negócios | ASSUMIDO: nenhum negócio sabe dos outros vínculos do colaborador |
| Deslocamento | ASSUMIDO: não é conflito; só aviso opcional na agenda unificada |
| Perfil | ASSUMIDO: único por padrão, ajustável por negócio |

---

## Fora do escopo desta especificação

- Portabilidade do colaborador (levar clientes de um negócio para outro), fora por ora (`[D36]`).
- Bloqueio automático entre negócios imposto pelos negócios (só o colaborador pode ligar).
- Busca de profissional entre estabelecimentos na vitrine.
- Folha de pagamento e vínculos trabalhistas (escopo negativo).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: aviso de conflito em até 1 minuto; agenda offline de 7 dias; retenção de conflitos por 12 meses.
- O convite a uma pessoa que já tem conta reutiliza o fluxo de convite da spec 003, identificando a pessoa pelo e-mail ou celular.
- O domínio dono desta spec é `workforce` (vínculos e perfil) com `scheduling` (agenda unificada e conflitos), conforme a CONST 4.4 ("+2 multi-negócio").
