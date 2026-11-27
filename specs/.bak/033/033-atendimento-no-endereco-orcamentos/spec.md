# Feature Specification: Atendimento no endereço e orçamentos

**Feature Branch**: `033-atendimento-no-endereco-orcamentos`

**Created**: 2026-11-25

**Status**: Clarified

**Input**: User description: "033 atendimento-no-endereco-orcamentos — seguir a sequência da constituição (seção 10), fase 3: [D40]. Depende de 006, 008 e 012. Pendências PEN-27 e PEN-31. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 3 (em todas as plataformas, `[D36]`)

**Superfícies afetadas**: painel do cliente ("Onde cada serviço é feito", "Orçamentos recebidos") · app do consumidor ("Pedir orçamento", "Orçamento recebido e agendamento no endereço") · web do consumidor (mesmos fluxos) · app do colaborador e `/pro` ("Rota do dia no endereço")

**Depende de**: 006 `catalogo` · 008 `motor-agenda-disponibilidade` · 012 `pagamentos-split` (e, por elas, a v1.0 e a fase 2)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I, III, IV, seções 3 (criptografia por campo: endereço), 4.4 (`catalog` "local do serviço `[D40]`", `quotes`), 5 (`cdn.koovela.com` para fotos de orçamento), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 4.2 (automotivo e casa), 4.3, 9.11, 17 (`[D40]`) e 18 (`[PEN-27]`, `[PEN-31]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

As verticais da fase 3 **automotivo** (estética, lavagem, oficina) e **casa e serviços técnicos** (diarista, elétrica, dedetização) trazem duas necessidades que a agenda da v1.0 não cobre:

1. **O serviço acontece no endereço do cliente.** O profissional vai até a casa ou o carro do consumidor; o tempo de deslocamento ocupa a agenda; o colaborador precisa de uma rota do dia.
2. **O preço nem sempre é conhecido antes.** Um reparo elétrico ou um polimento dependem do que o profissional vai encontrar; o consumidor precisa pedir um **orçamento**, muitas vezes com fotos.

A decisão `[D40]` define:

- **cada serviço define se é feito no endereço do cliente ou no estabelecimento**;
- **o deslocamento é embutido no preço** (não há taxa de deslocamento separada);
- **orçamento opcional por serviço, com fotos**;
- decididos no clarify de 2026-11-25: área por **raio ou bairros**, à escolha do estabelecimento (`[PEN-27]`); **prazos configuráveis** (`[PEN-31]`).

O DF 4.2 também cria a entidade **veículo** para o automotivo, que entra aqui como um novo tipo de atendido, ao lado de dependentes e pets (spec 025).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 4.2 | Atender automotivo e casa | Negócios ativos dessas verticais |
| DF 4.3 | Atendimento no endereço do cliente | Agendamentos no endereço |
| 3.2.2 | Aumentar volume de clientes | Orçamentos convertidos em agendamento |

Personas: Proprietário e Gerente (configuram serviços, respondem orçamentos); Recepção; colaborador em campo; consumidor.

---

## Clarifications

### Session 2026-11-25

- Q: Como o estabelecimento define até onde atende no endereço do cliente? (PEN-27) → A: O estabelecimento escolhe entre raio em km a partir da filial (padrão 10 km) e lista de bairros.
- Q: Qual o prazo de resposta ao pedido de orçamento e a validade do orçamento? (PEN-31) → A: Tudo configurável no back-office e pelo negócio; valores iniciais: resposta em 48 horas e validade de 7 dias.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Definir onde cada serviço é feito e até onde o negócio atende (Priority: P1)

Como Proprietário de uma empresa de limpeza, quero marcar que "faxina completa" é feita no endereço do cliente, definir até onde atendemos e o tempo de deslocamento entre atendimentos.

**Why this priority**: tela "Onde cada serviço é feito" (DF 9.11); sem ela não existe atendimento no endereço.

**Independent Test**: num negócio de teste, marcar dois serviços como "no endereço do cliente", definir a área de atendimento e o tempo de deslocamento, e conferir que um consumidor fora da área não consegue agendar.

**Acceptance Scenarios**:

1. **Given** a ficha do serviço (spec 006), **When** o Proprietário define o local, **Then** escolhe "no estabelecimento" (padrão, como na v1.0) ou "no endereço do cliente".
2. **Given** um serviço no endereço, **When** salvo, **Then** o preço é o mesmo para qualquer endereço dentro da área, com o deslocamento embutido (`[D40]`); não existe campo de taxa de deslocamento.
3. **Given** a filial com serviços no endereço, **When** o Proprietário define a área de atendimento, **Then** escolhe a forma: raio em km a partir da filial (padrão 10 km) ou lista de bairros atendidos (REQ-END-003).
4. **Given** a filial, **When** o Proprietário define o tempo de deslocamento entre atendimentos no endereço (padrão 30 minutos), **Then** esse tempo bloqueia a agenda do profissional antes de cada atendimento no endereço que não venha logo depois de outro no mesmo endereço.
5. **Given** um serviço que pode ser feito nos dois lugares, **When** o Proprietário quer oferecer as duas formas, **Then** cadastra dois serviços (por exemplo, "lavagem no local" e "lavagem a domicílio"), cada um com seu preço.

---

### User Story 2 - Consumidor agenda um serviço no próprio endereço (Priority: P1)

Como consumidor, quero escolher o endereço onde vou ser atendido, saber se o negócio atende ali e ver os horários com o deslocamento já considerado.

**Why this priority**: é o fluxo de agendamento da `[D40]`.

**Independent Test**: com um consumidor de teste, cadastrar dois endereços, um dentro e outro fora da área; conferir que só o de dentro mostra horários, e que dois atendimentos seguidos do mesmo profissional ficam separados pelo tempo de deslocamento.

**Acceptance Scenarios**:

1. **Given** um serviço no endereço, **When** o consumidor começa a agendar, **Then** escolhe um endereço salvo ou cadastra um novo (CEP, rua, número, complemento, bairro, cidade, ponto de referência opcional).
2. **Given** o endereço, **When** fora da área de atendimento, **Then** o consumidor vê "este estabelecimento não atende no seu endereço" e não vê horários.
3. **Given** o endereço dentro da área, **When** os horários são calculados (spec 008), **Then** consideram o tempo de deslocamento antes de cada atendimento no endereço, além do preparo e da limpeza.
4. **Given** a vitrine (spec 024), **When** o consumidor busca um serviço feito no endereço, **Then** pode filtrar por "atende no meu endereço", usando o endereço informado naquele momento.
5. **Given** o agendamento confirmado, **When** o consumidor vê o detalhe, **Then** o endereço do atendimento aparece junto com o profissional e o horário; mudar o endereço depois da confirmação só é possível dentro da área, e a Recepção é avisada.

---

### User Story 3 - Rota do dia do colaborador (Priority: P1)

Como colaborador que atende na casa dos clientes, quero ver meus atendimentos do dia em ordem, com endereço, ponto de referência e um botão para abrir o mapa no celular.

**Why this priority**: tela "Rota do dia no endereço" (DF 9.11); sem ela o colaborador depende de mensagens soltas.

**Independent Test**: com três atendimentos no endereço no mesmo dia, abrir a rota no app do colaborador e conferir a ordem, os endereços e o botão de abrir o mapa.

**Acceptance Scenarios**:

1. **Given** o app do colaborador, **When** ele abre "Rota do dia", **Then** vê os atendimentos no endereço do dia em ordem de horário, com nome de exibição do consumidor, serviço, horário, endereço completo, complemento, ponto de referência e o veículo (no automotivo).
2. **Given** um atendimento da rota, **When** o colaborador toca em "abrir no mapa", **Then** o endereço é aberto no aplicativo de mapas do próprio aparelho.
3. **Given** a chegada ao endereço, **When** o colaborador registra "cheguei", **Then** o atendimento passa a "em atendimento" (check-in da spec 009), e o consumidor é avisado.
4. **Given** o consumidor ausente, **When** o colaborador registra "cliente ausente" depois de esperar a tolerância da política (spec 010), **Then** o atendimento segue a regra de no-show.
5. **Given** um atraso na rota, **When** o colaborador avisa "vou atrasar" com a estimativa, **Then** o consumidor seguinte é avisado (spec 011).
6. **Given** o endereço do consumidor, **When** o atendimento termina, **Then** o endereço some da rota do colaborador; ele não consegue consultar endereços de atendimentos passados.

---

### User Story 4 - Pedir e responder orçamento com fotos (Priority: P1)

Como consumidor, quero descrever o problema, mandar fotos e receber um orçamento; como estabelecimento, quero responder com preço e duração para que o consumidor agende direto.

**Why this priority**: telas "Pedir orçamento", "Orçamento recebido e agendamento no endereço" (app) e "Orçamentos recebidos" (painel), DF 9.11; é o "orçamento opcional por serviço" da `[D40]`.

**Independent Test**: num serviço com orçamento, pedir um orçamento com 3 fotos; responder pelo painel com preço e duração; aceitar no app e agendar; conferir que o preço do agendamento é o do orçamento.

**Acceptance Scenarios**:

1. **Given** um serviço, **When** o Proprietário marca "exige orçamento" ou "aceita orçamento", **Then** o consumidor vê "pedir orçamento" (exige: não há preço público; aceita: há preço de referência e a opção de pedir orçamento).
2. **Given** "pedir orçamento", **When** o consumidor preenche, **Then** informa a descrição (até 1.000 caracteres), até 5 fotos, o endereço (se o serviço for no endereço), o veículo (se automotivo) e a preferência de datas.
3. **Given** um pedido recebido, **When** a Recepção, o Gerente ou o Proprietário responde, **Then** informa preço, duração estimada, observações e validade; ou recusa com motivo; ou pede mais informações (uma rodada de mensagens dentro do pedido).
4. **Given** os prazos, **When** o pedido é criado e respondido, **Then** valem o prazo de resposta e a validade configurados pelo negócio dentro dos limites do back-office (REQ-ORC-004); valores iniciais: resposta em até 48 horas e validade de 7 dias.
5. **Given** um orçamento recebido, **When** o consumidor aceita dentro da validade, **Then** vai direto à escolha de horário (spec 008) com o serviço, a duração e o preço do orçamento; o preço fica congelado no agendamento (CONST III).
6. **Given** um orçamento sem resposta no prazo, **When** o prazo vence, **Then** o pedido expira, o consumidor é avisado e pode pedir a outro estabelecimento.
7. **Given** um orçamento vencido, **When** o consumidor tenta aceitar, **Then** só pode pedir um novo.

---

### User Story 5 - Veículo como atendido no automotivo (Priority: P2)

Como consumidor, quero cadastrar meu carro uma vez e escolhê-lo ao agendar uma lavagem, para que a duração e o preço considerem o porte.

**Why this priority**: entidade veículo do automotivo (DF 4.2); reaproveita o modelo de atendidos da spec 025.

**Independent Test**: cadastrar um carro de porte grande; agendar uma lavagem com regra de duração por porte e conferir a duração maior.

**Acceptance Scenarios**:

1. **Given** "Meus atendidos" (spec 025), **When** o consumidor adiciona um veículo, **Then** informa tipo (carro, moto, utilitário), marca, modelo, cor, porte (pequeno, médio, grande) e placa (opcional).
2. **Given** um serviço automotivo com regra de duração ou preço por porte (spec 006, regras de duração `[D29]`), **When** o veículo é escolhido, **Then** duração e preço seguem o porte.
3. **Given** o histórico do veículo, **When** o estabelecimento consulta, **Then** vê os atendimentos feitos naquele veículo no próprio negócio.

---

### Edge Cases

- **Endereço sem número ou em área rural**: aceita ponto de referência obrigatório; a verificação de área usa o CEP e o bairro.
- **Dois atendimentos seguidos no mesmo endereço** (por exemplo, dois serviços na mesma casa): não há deslocamento entre eles.
- **Combo com etapa no endereço** (specs 006 e 030): todas as etapas do combo devem ser no mesmo local; combo misto não é permitido.
- **Orçamento com fotos inadequadas**: o estabelecimento pode denunciar; a Gestão modera (spec 024).
- **Pedido de orçamento para vários estabelecimentos**: o consumidor faz um pedido por estabelecimento; não há leilão.
- **Orçamento aceito sem horário livre na validade**: o consumidor pode escolher qualquer horário disponível; a validade se aplica à aceitação, não à data do atendimento.
- **Serviço de saúde no endereço** (`[PEN-06]`): segue as restrições da vertical; esta spec não muda as regras de saúde.
- **Pagamento antecipado** (spec 012): se o serviço exigir, o pagamento é feito na confirmação, com o preço do orçamento.
- **Colaborador sem conexão na rua**: a rota do dia fica guardada no aparelho desde o início do dia e é apagada ao fim dele.

---

## Requirements *(mandatory)*

Formato: `REQ-END-NNN` (atendimento no endereço) e `REQ-ORC-NNN` (orçamentos) (origem: …).

### Functional Requirements

**Local do serviço e área de atendimento**

- **REQ-END-001** (origem: D40 | CONST 4.4 `catalog`): Cada serviço DEVE ter o local "no estabelecimento" (padrão) ou "no endereço do cliente"; um serviço não pode ter os dois.
- **REQ-END-002** (origem: D40): O preço de serviço no endereço DEVE ter o deslocamento embutido, igual para qualquer endereço dentro da área; NÃO DEVE existir taxa de deslocamento separada.
- **REQ-END-003** (origem: PEN-27): A filial com serviços no endereço DEVE definir a área de atendimento escolhendo entre raio em km a partir da filial (padrão 10 km) e lista de bairros atendidos; a verificação de área usa o CEP e o bairro do endereço.
- **REQ-END-004** (origem: D40): A filial DEVE definir o tempo de deslocamento entre atendimentos no endereço (padrão 30 minutos), que bloqueia a agenda antes de cada atendimento no endereço, exceto quando o anterior foi no mesmo endereço.
- **REQ-END-005** (origem: CONST XII | CONST 1): A verificação de área e o tempo de deslocamento NÃO DEVEM depender de serviço externo pago; usam os dados configurados pelo negócio e a geocodificação de CEP de fonte gratuita ou base própria.

**Agendamento no endereço**

- **REQ-END-010** (origem: D40): O consumidor DEVE escolher ou cadastrar o endereço do atendimento; fora da área, não vê horários.
- **REQ-END-011** (origem: REQ-AGD-001): O cálculo de horários DEVE incluir o tempo de deslocamento além de preparo e limpeza.
- **REQ-END-012** (origem: REQ-VIT-010): A vitrine DEVE oferecer o filtro "atende no meu endereço" para serviços no endereço.
- **REQ-END-013** (origem: D40): Mudança de endereço depois da confirmação SÓ DEVE ser aceita dentro da área, com aviso à Recepção.
- **REQ-END-014** (origem: CONST I): Todas as etapas de um combo DEVEM ter o mesmo local.

**Rota do dia**

- **REQ-END-020** (origem: DF 9.11): O colaborador DEVE ver a rota do dia com os atendimentos no endereço em ordem, com endereço completo, complemento, ponto de referência e veículo, e abrir cada endereço no aplicativo de mapas do aparelho.
- **REQ-END-021** (origem: REQ-AGE-040): "Cheguei" DEVE fazer o check-in e avisar o consumidor; "cliente ausente", depois da tolerância, DEVE seguir a regra de no-show (spec 010).
- **REQ-END-022** (origem: REQ-NOT-001): "Vou atrasar" DEVE avisar o consumidor seguinte com a estimativa.
- **REQ-END-023** (origem: CONST IV): O colaborador SÓ DEVE ver o endereço do consumidor nos atendimentos atribuídos a ele, do dia, até o fim do atendimento; endereços de atendimentos passados não ficam acessíveis a ele.
- **REQ-END-024** (origem: CONST XI): A rota do dia DEVE ficar disponível sem conexão, guardada no aparelho só durante o dia e apagada ao fim dele.

**Orçamentos**

- **REQ-ORC-001** (origem: D40): Cada serviço DEVE ter a opção de orçamento: "sem orçamento" (padrão), "aceita orçamento" (com preço de referência) ou "exige orçamento" (sem preço público).
- **REQ-ORC-002** (origem: D40): O pedido DEVE ter descrição (até 1.000 caracteres), até 5 fotos, endereço (se no endereço), veículo (se automotivo) e preferência de datas.
- **REQ-ORC-003** (origem: D40): A resposta DEVE ter preço, duração estimada, observações e validade, ou recusa com motivo, ou pedido de mais informações (troca de mensagens dentro do pedido).
- **REQ-ORC-004** (origem: PEN-31): Prazo de resposta e validade DEVEM ser configuráveis no back-office (limites) e pelo negócio (dentro deles); valores iniciais: resposta em até 48 horas e validade de 7 dias.
- **REQ-ORC-005** (origem: CONST III): Ao aceitar, o preço e a duração do orçamento DEVEM ser congelados no agendamento; mudanças posteriores no catálogo não afetam.
- **REQ-ORC-006** (origem: PEN-31): Pedido sem resposta no prazo DEVE expirar com aviso ao consumidor; orçamento vencido não pode ser aceito.
- **REQ-ORC-007** (origem: CONST 5 | CONST IV): As fotos DEVEM ser privadas, com acesso por endereço assinado e temporário, visíveis só ao consumidor e aos papéis do estabelecimento que respondem orçamentos.
- **REQ-ORC-008** (origem: REQ-PAG-001): Se o serviço exigir pagamento antecipado (spec 012), ele DEVE ser feito na confirmação com o preço do orçamento.
- **REQ-ORC-009** (origem: CONST 4.4 `quotes`): Pedidos e orçamentos DEVEM ficar no domínio `quotes`, no espaço de dados do tenant; a entidade é `quote_request`, reaproveitável pela spec 035 (propostas de eventos).

**Veículo**

- **REQ-END-030** (origem: DF 4.2 | REQ-SER-001): O veículo DEVE ser um tipo de atendido (spec 025), com tipo, marca, modelo, cor, porte e placa opcional, ligado à conta do consumidor.
- **REQ-END-031** (origem: D29): Regras de duração e preço por porte DEVEM valer para veículos.
- **REQ-END-032** (origem: CONST II): O estabelecimento DEVE ver o histórico do veículo só com os atendimentos feitos no próprio negócio.

### Key Entities

- **Local do serviço** (atributo do serviço, versionado): estabelecimento ou endereço do cliente.
- **Área de atendimento** (por filial): raio em km ou lista de bairros.
- **Tempo de deslocamento** (por filial): minutos entre atendimentos no endereço.
- **Endereço do consumidor**: CEP, rua, número, complemento, bairro, cidade, ponto de referência; cifrado (CONST 3); guardado na conta global do consumidor e copiado para o agendamento.
- **Veículo** (tipo de atendido, spec 025): tipo, marca, modelo, cor, porte, placa.
- **Pedido de orçamento** (`quote_request`): consumidor, serviço, descrição, fotos, endereço, veículo, preferência de datas, prazo, estado.
- **Orçamento**: pedido, preço, duração, observações, validade, estado.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.11) | Código |
|---|---|---|
| Painel do cliente | Onde cada serviço é feito | Registrado no plano |
| Painel do cliente | Orçamentos recebidos | Registrado no plano |
| App do consumidor | Pedir orçamento | Registrado no plano |
| App do consumidor | Orçamento recebido e agendamento no endereço | Registrado no plano |
| Web do consumidor | Mesmos fluxos (sem tela própria no protótipo) | Registrado no plano |
| App do colaborador e `/pro` | Rota do dia no endereço | Registrado no plano |

O cadastro de veículo em "Meus atendidos" e o aviso "vou atrasar" precisam ser conferidos no protótipo.

---

## Regras e estados

- **Pedido de orçamento**: `enviado` → `respondido` | `recusado` | `aguardando_informação` (→ `enviado`) | `expirado` (sem resposta no prazo).
- **Orçamento**: `válido` → `aceito` (vira agendamento) | `recusado_pelo_consumidor` | `vencido`.
- **Atendimento no endereço**: estados do agendamento (spec 009), com "cheguei" como check-in e "cliente ausente" como no-show.
- **Deslocamento**: bloqueio antes de cada atendimento no endereço, exceto quando o anterior foi no mesmo endereço.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Endereço do consumidor | Pessoal; cifrado por campo (CONST 3) | Execução de contrato (art. 7, V) | Na conta: até o consumidor remover; no agendamento: prazo do agendamento (spec 022) | Consumidor; Recepção, Gerente, Proprietário da filial; colaborador atribuído só no dia |
| Fotos do orçamento | Pessoal (podem mostrar a casa ou o veículo) | Execução de contrato (art. 7, V) | 90 dias depois do fim do pedido, salvo se viraram agendamento (então o prazo do agendamento) | Consumidor; quem responde orçamentos no negócio |
| Descrição do orçamento | Pessoal | Execução de contrato | Igual às fotos | Igual às fotos |
| Placa do veículo | Pessoal (identifica o dono) | Execução de contrato | Até o consumidor remover | Consumidor; estabelecimento nos atendimentos do veículo |

O consumidor é avisado, ao pedir orçamento, que as fotos não devem mostrar pessoas nem documentos.

---

## Permissões

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário |
|---|---|---|---|---|---|
| Definir local do serviço, área e deslocamento | — | — | — | ✔ filial | ✔ |
| Pedir orçamento, aceitar e agendar no endereço | ✔ | — | — | — | — |
| Responder orçamentos | — | — | ✔ filial | ✔ filial | ✔ |
| Ver rota do dia e endereço do atendimento | — | ✔ (só os seus, no dia) | ✔ filial | ✔ filial | ✔ |
| Registrar "cheguei", "cliente ausente", "vou atrasar" | — | ✔ | ✔ filial | ✔ filial | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `catalog.service.location_changed.v1` | Local do serviço alterado |
| `scheduling.branch.service_area_changed.v1` | Área ou deslocamento alterados |
| `quotes.quote_request.created.v1` / `.answered.v1` / `.declined.v1` / `.expired.v1` | Ciclo do pedido |
| `quotes.quote.accepted.v1` / `.expired.v1` | Ciclo do orçamento |
| `scheduling.appointment.arrived_at_address.v1` / `.running_late.v1` | Rota do dia |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Agendamentos no endereço | DF 4.3 | Acompanhada |
| Taxa de resposta de orçamentos dentro do prazo | `[PEN-31]` | ≥ 90% |
| Conversão de orçamento em agendamento | DF 3.2.2 | Acompanhada |
| Atrasos na rota do dia | Operação | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos agendamentos no endereço respeitam o tempo de deslocamento entre atendimentos do mesmo profissional, verificado por teste.
- **SC-002**: Nenhum consumidor fora da área de atendimento consegue agendar serviço no endereço.
- **SC-003**: O consumidor pede um orçamento com fotos em até 2 minutos.
- **SC-004**: 100% dos agendamentos vindos de orçamento têm o preço do orçamento aceito.
- **SC-005**: O colaborador vê a rota do dia e abre o primeiro endereço no mapa em até 2 toques.
- **SC-006**: Nenhum colaborador consegue ver o endereço de um consumidor fora do dia e dos atendimentos atribuídos a ele, verificado por teste.

---

## Pendências e conflitos

### Bloqueantes

| Item | Pergunta | Decisão (clarify 2026-11-25) |
|---|---|---|
| **PEN-27** | Como o estabelecimento define até onde atende? | Raio (padrão 10 km) ou bairros, à escolha |
| **PEN-31** | Prazo de resposta e validade do orçamento | Tudo configurável; valores iniciais 48 horas e 7 dias |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-06** — restrições de saúde | Spec 005 | Serviços de saúde no endereço seguem as regras da vertical |
| **PEN-26** — base mínima por região | Spec 024 | O filtro "atende no meu endereço" só aparece em regiões abertas |
| **PEN-29** — eventos | Spec 035 | Reaproveita `quote_request`; regras próprias de proposta e contrato ficam lá |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Local | ASSUMIDO: um local por serviço; para oferecer os dois, dois serviços |
| Deslocamento | ASSUMIDO: tempo fixo por filial (padrão 30 minutos), sem cálculo de rota |
| Fotos | ASSUMIDO: até 5 por pedido, retidas 90 dias se não virarem agendamento |
| Combo | ASSUMIDO: todas as etapas no mesmo local |

---

## Fora do escopo desta especificação

- Cálculo de rota otimizada ou de tempo real de trânsito.
- Rastreamento da localização do colaborador em tempo real.
- Taxa de deslocamento separada ou variável por distância (contraria `[D40]`).
- Orçamento com vários itens e materiais detalhados (orçamento é um preço e uma duração).
- Propostas, contratos e sinal de eventos (spec 035).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: raio de 10 km; deslocamento de 30 minutos; 5 fotos; resposta em 48 horas; validade de 7 dias; meta de 90% de respostas no prazo.
- A geocodificação de CEP usa fonte gratuita ou base própria, conforme a restrição de custo zero da spec 001.
- O endereço do consumidor fica na conta global (como os atendidos da spec 025) e é copiado para o agendamento no tenant.
- Os domínios donos são `catalog` (local do serviço), `scheduling` (área, deslocamento, rota) e `quotes` (orçamentos), conforme a CONST 4.4.
