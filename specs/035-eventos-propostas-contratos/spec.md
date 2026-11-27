# Feature Specification: Eventos — propostas, contratos e sinal

**Feature Branch**: `035-eventos-propostas-contratos`

**Created**: 2026-11-25

**Status**: Clarified

**Input**: User description: "035 eventos-propostas-contratos — seguir a sequência da constituição (seção 10), fase 3: [D42]. Depende de 033. Pendências PEN-29 e PEN-31. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 3 (em todas as plataformas, `[D36]`)

**Superfícies afetadas**: painel do cliente ("Eventos: datas, propostas e contratos") · app do consumidor ("Evento: pedir proposta", "Evento: proposta, contrato e sinal") · web do consumidor (mesmos fluxos)

**Depende de**: 033 `atendimento-no-endereco-orcamentos` (pedido de orçamento `quote_request`); usa 012 `pagamentos-split` (sinal e saldo) e 008 `motor-agenda-disponibilidade` (proteção contra reserva dupla)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I (lock em cada data de evento pré-reservada `[D42]`), III, IV, V, seções 3 (criptografia de CPF e endereço), 4.4 (`quotes`: "orçamentos, propostas, contratos, pré-reserva de data"), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 4.2 (eventos), 4.3, 9.11, 17 (`[D42]`) e 18 (`[PEN-29]`, `[PEN-31]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Fornecedores de eventos (fotógrafo, buffet, espaço de festas) não vendem horários de 1 hora: vendem **um dia ou um período** (manhã, tarde, noite, fim de semana), com preço montado caso a caso, **sinal** para garantir a data e **contrato**. Hoje isso é feito por mensagens, planilha e contrato em PDF assinado à mão, e a mesma data às vezes é prometida a dois clientes.

A decisão `[D42]` define:

- **reserva por dia ou período, sempre com proposta**;
- **sinal definido por cada fornecedor**;
- **contrato aceito no app**;
- **pré-reserva da data** enquanto a proposta está válida;
- decididos no clarify de 2026-11-25: **o fornecedor escolhe a forma do aceite** (simples por padrão, avançada acima de um valor, `[PEN-29]`) e **validade configurável** (`[PEN-31]`).

O pedido de proposta reaproveita o pedido de orçamento da spec 033 (`quote_request`), com campos próprios de evento. A data pré-reservada tem a mesma proteção contra reserva dupla dos horários (CONST I).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 4.2 | Atender fornecedores de eventos | Negócios ativos da vertical |
| DF 4.3 | Reserva por dia ou período com proposta | Propostas enviadas e aceitas |
| 3.2.1 | Aumentar receita | Valor contratado por evento |

Personas: Proprietário do fornecedor; Gerente; consumidor contratante.

---

## Clarifications

### Session 2026-11-25

- Q: O aceite do contrato no app basta, ou é preciso assinatura eletrônica avançada? (PEN-29) → A: O fornecedor escolhe: aceite eletrônico simples com reautenticação e evidências por padrão; pode exigir assinatura eletrônica avançada em contratos acima de um valor que ele define.
- Q: Qual a validade da proposta e da pré-reserva? (PEN-31) → A: Configurável no back-office e pelo fornecedor; valor inicial para eventos: 7 dias, de 1 a 15.
- Q: Como fazer a assinatura eletrônica avançada sem custo? (análise 2026-11-27) → A: Pela assinatura gov.br: acima do valor definido pelo fornecedor, o consumidor baixa o PDF do contrato, assina no gov.br (gratuito; assinatura avançada pela Lei 14.063/2020) e envia o arquivo assinado; a Koovela confere a assinatura no validador gratuito do ITI e que o documento assinado tem o mesmo hash do contrato exibido. Sem provedor pago.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar o fornecedor de eventos (Priority: P1)

Como Proprietário de um espaço de festas, quero definir os períodos que vendo, quantos eventos aceito por período, as regras do sinal e o meu modelo de contrato.

**Why this priority**: sem capacidade, sinal e contrato, não há proposta.

**Independent Test**: num negócio de teste, configurar os períodos "tarde" e "noite", capacidade 1 por período, sinal de 30% e um modelo de contrato; conferir a pré-visualização do contrato com campos preenchidos de exemplo.

**Acceptance Scenarios**:

1. **Given** um negócio de eventos, **When** o Proprietário configura, **Then** define a unidade de reserva (dia inteiro ou períodos com horário de início e fim, por exemplo manhã, tarde, noite) e a capacidade de eventos por unidade (padrão 1), por filial ou por profissional (fotógrafo).
2. **Given** a regra do sinal, **When** configurada, **Then** o fornecedor escolhe percentual do total (de 10% a 50%, padrão 30%) ou valor fixo, e o prazo do saldo (padrão: quitado até 7 dias antes do evento), em até 3 parcelas.
3. **Given** o modelo de contrato, **When** o Proprietário edita, **Then** parte do modelo base da Koovela, com campos automáticos (partes, data, local, itens, valores, sinal, saldo, regras de cancelamento), e pode acrescentar cláusulas; cada versão salva fica guardada.
4. **Given** as regras de cancelamento do contrato, **When** configuradas, **Then** o fornecedor define faixas por antecedência (por exemplo, mais de 90 dias: devolução de X% do sinal), sempre respeitando o direito de arrependimento (História 4, cenário 3).
5. **Given** um bloqueio de data (feriado, manutenção), **When** o Proprietário bloqueia, **Then** a data não pode receber pré-reserva.

---

### User Story 2 - Pedir proposta e receber com a data pré-reservada (Priority: P1)

Como consumidor que vai fazer um aniversário, quero pedir uma proposta informando data, número de convidados e o que preciso; como fornecedor, quero responder com itens e valores e segurar a data enquanto o cliente decide.

**Why this priority**: telas "Evento: pedir proposta" (app) e "Eventos: datas, propostas e contratos" (painel), DF 9.11.

**Independent Test**: pedir uma proposta para um sábado à noite; responder com 3 itens e sinal de 30%; conferir que a data fica pré-reservada e que um segundo pedido para a mesma data e período vê "data em negociação".

**Acceptance Scenarios**:

1. **Given** um fornecedor de eventos, **When** o consumidor pede proposta, **Then** informa tipo de evento, data e período (ou até 3 datas alternativas), número de convidados, local (se o fornecedor vai até o evento), descrição (até 2.000 caracteres) e até 5 fotos de referência; vê antes se a data está livre, em negociação ou ocupada.
2. **Given** o pedido, **When** o fornecedor responde, **Then** monta a proposta com itens (descrição, quantidade, valor), total, sinal (pela regra configurada, podendo ajustar dentro da faixa), datas do saldo, data e período escolhidos e validade.
3. **Given** a proposta enviada, **When** a data e o período têm capacidade, **Then** a data fica **pré-reservada** para aquele consumidor durante a validade da proposta, com a proteção contra reserva dupla (CONST I).
4. **Given** duas propostas para a última vaga da mesma data e período, **When** enviadas ao mesmo tempo, **Then** só uma pré-reserva é aceita; o fornecedor vê o motivo na outra.
5. **Given** a validade, **When** a proposta é enviada, **Then** a validade (e, com ela, a pré-reserva) é a configurada pelo fornecedor dentro dos limites do back-office; valor inicial: 7 dias, de 1 a 15.
6. **Given** a proposta vencida sem aceite, **When** a validade termina, **Then** a pré-reserva cai e a data volta a ficar livre; o consumidor e o fornecedor são avisados 24 horas antes.
7. **Given** uma proposta, **When** o consumidor pede ajuste, **Then** o fornecedor envia uma nova versão; a anterior fica substituída e a pré-reserva continua até a validade da nova.

---

### User Story 3 - Aceitar a proposta, o contrato e pagar o sinal (Priority: P1)

Como consumidor, quero aceitar a proposta, ler e aceitar o contrato e pagar o sinal no app, para garantir a data.

**Why this priority**: tela "Evento: proposta, contrato e sinal" (DF 9.11); é o núcleo da `[D42]`.

**Independent Test**: aceitar uma proposta de teste, aceitar o contrato e pagar o sinal; conferir que a data passa a "confirmada", que as duas partes recebem o contrato em PDF e que o registro do aceite tem as evidências.

**Acceptance Scenarios**:

1. **Given** uma proposta válida, **When** o consumidor toca em "aceitar", **Then** vê o contrato preenchido (partes, itens, valores, datas, regras de cancelamento) e precisa informar nome completo e CPF, se ainda não estiverem na conta.
2. **Given** o contrato, **When** o consumidor aceita, **Then** o aceite segue a forma escolhida pelo fornecedor (REQ-EVT-020): aceite eletrônico simples com reautenticação e registro de evidências (versão e resumo criptográfico do documento, data e hora, conta, aparelho e IP), ou assinatura eletrônica avançada quando o contrato passa do valor definido pelo fornecedor.
3. **Given** o aceite, **When** registrado, **Then** o consumidor paga o sinal pelo app (spec 012); só com o sinal pago a data passa de pré-reservada a **confirmada**.
4. **Given** o pagamento do sinal não concluído em 24 horas depois do aceite (ou até o fim da validade, o que vier antes), **When** o prazo vence, **Then** o aceite perde efeito e a pré-reserva segue a validade da proposta.
5. **Given** o contrato confirmado, **When** isso acontece, **Then** consumidor e fornecedor recebem o contrato em PDF, com as evidências do aceite; o contrato não pode mais ser editado.
6. **Given** a necessidade de mudar algo depois da confirmação (convidados, itens, data), **When** o fornecedor propõe, **Then** envia um **aditivo**, que só vale depois de aceito pelo consumidor da mesma forma; mudança de data exige data livre.

---

### User Story 4 - Saldo, cancelamento e realização do evento (Priority: P2)

Como fornecedor, quero receber o saldo nas datas combinadas e ter as regras de cancelamento aplicadas automaticamente; como consumidor, quero saber quanto recebo de volta se cancelar.

**Why this priority**: fecha o ciclo financeiro e reduz conflito.

**Independent Test**: num contrato de teste, pagar a primeira parcela do saldo, cancelar pelo consumidor a 60 dias do evento e conferir o valor devolvido pela faixa do contrato.

**Acceptance Scenarios**:

1. **Given** as parcelas do saldo, **When** chegam as datas, **Then** o consumidor é avisado 3 dias antes e paga pelo app (spec 012); atraso gera aviso ao fornecedor, que decide o que fazer conforme o contrato.
2. **Given** o cancelamento pelo consumidor, **When** pedido, **Then** o app mostra antes quanto será devolvido pela faixa de antecedência do contrato, e a devolução é feita pelo meio do pagamento (spec 012).
3. **Given** o cancelamento pelo consumidor em até 7 dias do aceite (direito de arrependimento, CDC art. 49), **When** pedido, **Then** a devolução é integral, qualquer que seja a faixa do contrato.
4. **Given** o cancelamento pelo fornecedor, **When** acontece, **Then** o consumidor recebe de volta tudo o que pagou, mais o que o contrato previr; o fornecedor recebe uma marca de cancelamento na reputação interna (spec 016).
5. **Given** o dia do evento, **When** termina, **Then** o fornecedor marca "realizado" (ou o sistema marca automaticamente 24 horas depois), e o consumidor é convidado a avaliar (spec 016).
6. **Given** valores em aberto no dia do evento, **When** o evento é realizado, **Then** o fornecedor vê o aviso de saldo pendente; a cobrança fora do app não é tratada pela Koovela.

---

### Edge Cases

- **Evento de vários dias**: a proposta pode ter várias datas seguidas; a pré-reserva é atômica (todas ou nenhuma).
- **Fotógrafo com equipe**: a capacidade é por profissional; a proposta indica quem atende.
- **Fornecedor de vários serviços para o mesmo evento** (espaço + buffet do mesmo negócio): uma proposta só, com itens dos dois.
- **Fornecedores diferentes para o mesmo evento**: cada um tem a sua proposta e o seu contrato; não há pacote entre tenants.
- **Consumidor menor de idade**: não pode aceitar contrato; só maiores de 18 anos.
- **Data passada ou a menos de 7 dias**: a proposta só pode ser enviada se o fornecedor aceitar o prazo curto; o saldo vence junto com o sinal.
- **Mudança da regra de cancelamento ou do modelo de contrato**: vale só para propostas novas; contratos aceitos ficam com a versão aceita (CONST III).
- **Disputa entre as partes**: a Koovela guarda as evidências e o histórico, mas não arbitra; o suporte (spec 021) atende questões de pagamento.

---

## Requirements *(mandatory)*

Formato: `REQ-EVT-NNN (origem: …)`.

### Functional Requirements

**Configuração**

- **REQ-EVT-001** (origem: D42): O fornecedor DEVE definir a unidade de reserva (dia inteiro ou períodos com início e fim) e a capacidade por unidade (padrão 1), por filial ou por profissional.
- **REQ-EVT-002** (origem: D42): O sinal DEVE ser definido por cada fornecedor (percentual de 10% a 50%, padrão 30%, ou valor fixo), com o saldo em até 3 parcelas e quitação padrão até 7 dias antes do evento. A faixa do sinal, o máximo de parcelas e o prazo padrão do saldo são limites da `quotes_events_policy` no back-office (valores iniciais: 10% a 50%, até 3 parcelas, 7 dias); o fornecedor escolhe dentro deles (CONST 8).
- **REQ-EVT-003** (origem: D42 | CONST III): O fornecedor DEVE ter modelo de contrato a partir do modelo base da Koovela, com campos automáticos e cláusulas próprias, versionado.
- **REQ-EVT-004** (origem: D42): As regras de cancelamento DEVEM ser faixas por antecedência definidas pelo fornecedor, sem contrariar o REQ-EVT-032.
- **REQ-EVT-005** (origem: REQ-AGD-030): O fornecedor DEVE poder bloquear datas.

**Pedido e proposta**

- **REQ-EVT-010** (origem: D42 | REQ-ORC-009): O pedido de proposta DEVE usar o `quote_request` da spec 033 com campos de evento: tipo, data e período (até 3 alternativas), convidados, local, descrição (até 2.000 caracteres) e até 5 fotos.
- **REQ-EVT-011** (origem: D42): O consumidor DEVE ver, antes de pedir, se cada data e período estão livres, em negociação ou ocupados, sem ver quem os ocupa.
- **REQ-EVT-012** (origem: D42): A proposta DEVE ter itens, total, sinal, parcelas do saldo, data e período e validade; nova versão substitui a anterior.
- **REQ-EVT-013** (origem: CONST I | D42): Ao enviar a proposta, a data e o período DEVEM ser pré-reservados com lock e regra no banco; propostas simultâneas para a última vaga DEVEM resultar em exatamente uma pré-reserva; eventos de vários dias pré-reservam todas as datas ou nenhuma.
- **REQ-EVT-014** (origem: PEN-31): A validade da proposta e da pré-reserva DEVE ser configurável pelo fornecedor dentro dos limites do back-office; valor inicial 7 dias, de 1 a 15.
- **REQ-EVT-015** (origem: D42): Ao vencer, a pré-reserva DEVE cair, com aviso às duas partes 24 horas antes. A antecedência do aviso vem da `quotes_events_policy` (valor inicial 24 horas).

**Aceite, contrato e sinal**

- **REQ-EVT-020** (origem: PEN-29 | D42): O aceite DEVE ser, por padrão, eletrônico simples com reautenticação e evidências (versão e resumo criptográfico do documento, data e hora, conta, aparelho, IP); o fornecedor PODE exigir assinatura eletrônica avançada em contratos acima de um valor que ele define, por meio de um adaptador de assinatura (custo do serviço a definir no plano). O modelo base do contrato DEVE ser validado pelo jurídico antes do lançamento. Decisão de 2026-11-27: a assinatura avançada é feita pelo gov.br (gratuita), com o arquivo assinado enviado pelo consumidor e validado pelo validador do ITI e pelo hash do documento; nenhum provedor pago.
- **REQ-EVT-021** (origem: D42 | REQ-PAG-001): Só o sinal pago DEVE confirmar a data; sem pagamento em 24 horas depois do aceite (ou até o fim da validade, o que vier antes), o aceite perde efeito. O prazo para pagar o sinal vem da `quotes_events_policy` (valor inicial 24 horas).
- **REQ-EVT-022** (origem: CONST III): O contrato confirmado DEVE ser imutável e enviado em PDF às duas partes, com as evidências do aceite; mudanças só por aditivo aceito da mesma forma.
- **REQ-EVT-023** (origem: CDC | Código Civil): Só maiores de 18 anos DEVEM poder aceitar contrato; nome completo e CPF são obrigatórios no aceite.
- **REQ-EVT-024** (origem: REQ-PAG-020): Sinal e saldo DEVEM passar pelo split da spec 012, com o valor do fornecedor creditado ao tenant.

**Saldo, cancelamento e realização**

- **REQ-EVT-030** (origem: D42): As parcelas do saldo DEVEM ser cobradas pelo app, com aviso 3 dias antes; atraso avisa o fornecedor. A antecedência do aviso vem da `quotes_events_policy` (valor inicial 3 dias).
- **REQ-EVT-031** (origem: D42): O cancelamento pelo consumidor DEVE mostrar antes o valor devolvido pela faixa do contrato e devolver pelo meio do pagamento.
- **REQ-EVT-032** (origem: CDC art. 49): Cancelamento pelo consumidor em até 7 dias do aceite DEVE ter devolução integral.
- **REQ-EVT-033** (origem: D42): Cancelamento pelo fornecedor DEVE devolver tudo o que foi pago, mais o previsto no contrato, e registrar a marca na reputação interna (spec 016).
- **REQ-EVT-034** (origem: REQ-AVA-001): O evento DEVE ser marcado como realizado pelo fornecedor, ou automaticamente 24 horas depois, com convite para avaliação. O prazo da realização automática vem da `quotes_events_policy` (valor inicial 24 horas). A nota fiscal do evento sai na realização, pelo total pago (spec 017, `source_kind = event_contract`).
- **REQ-EVT-035** (origem: CONST V): Aceites, aditivos, cancelamentos e devoluções DEVEM gerar registro imutável na trilha de auditoria.

**Isolamento**

- **REQ-EVT-040** (origem: CONST II | CONST 4.4): Propostas, contratos e pré-reservas DEVEM ficar no domínio `quotes`, no espaço de dados do tenant; a projeção do consumidor ("Meus eventos") recebe os dados por eventos.

### Key Entities

- **Configuração de eventos** (por filial ou profissional): unidade de reserva, períodos, capacidade, regra do sinal, prazos do saldo, regras de cancelamento.
- **Modelo de contrato** (versionado): texto base, cláusulas do fornecedor, campos automáticos.
- **Pedido de proposta** (`quote_request` com tipo "evento").
- **Proposta** (`proposal`, versionada): itens, total, sinal, parcelas, data e período, validade.
- **Pré-reserva de data** (`date_hold`): fornecedor ou profissional, data, período, proposta, validade.
- **Contrato** (`contract`): proposta aceita, versão do modelo, PDF, evidências do aceite, aditivos.
- **Parcela**: contrato, valor, vencimento, estado.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.11) | Código |
|---|---|---|
| App do consumidor | Evento: pedir proposta | Registrado no plano |
| App do consumidor | Evento: proposta, contrato e sinal | Registrado no plano |
| Web do consumidor | Mesmos fluxos (sem tela própria no protótipo) | Registrado no plano |
| Painel do cliente | Eventos (datas, propostas e contratos) | Registrado no plano |

O editor do modelo de contrato, os aditivos e o cancelamento com simulação de devolução precisam ser conferidos no protótipo.

---

## Regras e estados

- **Proposta**: `rascunho` → `enviada` (data pré-reservada) → `aceita` (aguardando sinal) → `contratada` | `substituída` (nova versão) | `recusada` | `vencida`.
- **Data**: `livre` → `em_negociação` (pré-reservada) → `confirmada` (sinal pago) → `realizada`; `em_negociação` → `livre` (vencida, recusada, aceite sem pagamento); `confirmada` → `livre` (cancelada).
- **Contrato**: `vigente` → `aditado` (com aditivo aceito) → `cumprido` | `cancelado_pelo_consumidor` | `cancelado_pelo_fornecedor`.
- **Parcela**: `a_vencer` → `paga` | `atrasada` | `devolvida`.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Nome completo e CPF no contrato | Pessoal; CPF cifrado (CONST 3) | Execução de contrato (art. 7, V) | 5 anos depois do evento (prazo de cobrança, Código Civil art. 206 §5º) | Consumidor; Proprietário e Gerente do fornecedor |
| Local do evento | Pessoal; cifrado | Execução de contrato | Igual ao contrato | Igual ao contrato |
| Evidências do aceite (IP, aparelho, data e hora) | Pessoal | Exercício regular de direitos (art. 7, VI) | Igual ao contrato | Proprietário; Gestão em disputa, com acesso auditado |
| Descrição e fotos do pedido | Pessoal | Execução de contrato | 90 dias se não virar contrato; senão, igual ao contrato | Consumidor; quem responde no fornecedor |

---

## Permissões

| Ação | Usuário | Recepção | Gerente | Proprietário |
|---|---|---|---|---|
| Configurar eventos, sinal, cancelamento, modelo de contrato | — | — | ✔ filial (sem modelo de contrato) | ✔ |
| Pedir proposta, aceitar, pagar, cancelar | ✔ (maior de 18) | — | — | — |
| Responder pedido e enviar proposta | — | ✔ filial | ✔ filial | ✔ |
| Enviar aditivo, cancelar pelo fornecedor | — | — | ✔ filial | ✔ |
| Ver contratos e evidências | ✔ próprios | — | ✔ filial | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `quotes.proposal.sent.v1` / `.accepted.v1` / `.expired.v1` / `.declined.v1` | Ciclo da proposta |
| `quotes.date_hold.created.v1` / `.released.v1` / `.confirmed.v1` | Pré-reserva da data |
| `quotes.contract.signed.v1` / `.amended.v1` / `.cancelled.v1` / `.fulfilled.v1` | Ciclo do contrato |
| `payments.event_installment.paid.v1` / `.overdue.v1` / `.refunded.v1` | Sinal e saldo |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Conversão de proposta em contrato | DF 4.3 | Acompanhada |
| Valor contratado por evento | DF 3.2.1 | Acompanhada |
| Pré-reservas que vencem sem aceite | `[PEN-31]` | Acompanhada |
| Cancelamentos por fornecedor | Reputação | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes de concorrência, uma data e período nunca têm mais pré-reservas ou confirmações do que a capacidade.
- **SC-002**: O consumidor aceita a proposta, aceita o contrato e paga o sinal em até 5 minutos.
- **SC-003**: 100% dos contratos confirmados têm PDF enviado às duas partes e evidências do aceite guardadas.
- **SC-004**: 100% dos cancelamentos dentro de 7 dias do aceite têm devolução integral.
- **SC-005**: O fornecedor monta e envia uma proposta com 5 itens em até 5 minutos.

---

## Pendências e conflitos

### Bloqueantes

| Item | Pergunta | Decisão (clarify 2026-11-25) |
|---|---|---|
| **PEN-29** | O aceite no app tem validade jurídica suficiente? | Fornecedor escolhe: simples por padrão, avançada acima de um valor |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-31** — validade da proposta | Spec 033 | Configurável; valor inicial 7 dias, de 1 a 15 (decidido) |
| **PEN-14** — split da comissão | Specs 007 e 012 | Sinal e saldo seguem o split do tenant |
| **PEN-19** — avaliações públicas | Spec 016 | Avaliação do evento segue a mesma regra |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Sinal | ASSUMIDO: de 10% a 50%, padrão 30%, ou valor fixo |
| Saldo | ASSUMIDO: até 3 parcelas, quitado até 7 dias antes |
| Prazo do sinal | ASSUMIDO: 24 horas depois do aceite |
| Arrependimento | ASSUMIDO: 7 dias com devolução integral (CDC art. 49) |
| Realização automática | ASSUMIDO: 24 horas depois do fim do evento |

---

## Fora do escopo desta especificação

- Assinatura eletrônica qualificada com certificado ICP-Brasil (a avançada é opção do fornecedor; a qualificada fica fora).
- Pacotes de vários fornecedores para o mesmo evento.
- Lista de convidados, cronograma do evento e gestão de equipe terceirizada.
- Arbitragem de disputas pela Koovela.
- Antecipação dos valores do contrato (spec 036).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: sinal de 10% a 50%; 3 parcelas; 7 dias de validade; 24 horas para pagar o sinal; aceite e pagamento em até 5 minutos.
- O modelo base de contrato da Koovela será revisado pelo jurídico antes do lançamento.
- O fornecedor de eventos é um negócio da Koovela como os demais; a vitrine (spec 024) mostra "pedir proposta" em vez de horários.
- O domínio dono é `quotes` (CONST 4.4), com pagamentos em `payments` (spec 012).
