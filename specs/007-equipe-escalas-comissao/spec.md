# Feature Specification: Equipe, escalas e comissão

**Feature Branch**: `007-equipe-escalas-comissao`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "007 equipe-escalas-comissao — seguir a sequência da constituição (seção 10): vínculos, escalas, folgas e trocas, regras de comissão [D17]. Depende de 005. Pendências PEN-04 e PEN-14. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (com o modelo preparado para o colaborador em vários negócios da fase 2, `[D31]`)

**Superfícies afetadas**: painel do cliente (Colaboradores, Regras de comissão, Escalas, folgas e bloqueios; passo "Horários e colaboradores" do onboarding) · app do colaborador e `/pro` (Folgas e trocas, Comissões, Perfil e portfólio) · web e app do consumidor (profissionais na página do estabelecimento)

**Depende de**: 005 `negocio-filiais-onboarding` (e, por ela, 002 e 003); usa o catálogo da 006

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I, III, IV, V, VII, seções 2, 4.4, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.2, 2.3, 2.4, 3.3, 6, 7, 8 (J3, J4, J7), 9.2 a 9.4, 9.9, 10.4 e 18. Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Quem executa o serviço é o **colaborador** (DF 2.3). Para a agenda funcionar, a Koovela precisa saber quem trabalha onde, em que horários, quais serviços cada um faz e quando cada um está de folga. Para o dinheiro funcionar, precisa saber quanto cada um ganha por atendimento.

O vínculo do colaborador com o estabelecimento varia (CLT, PJ, comissionado, arrendatário de estação), e o vínculo muda a regra de comissão (DF 2.3). A comissão tem base configurável, percentual por serviço ou por colaborador, piso e teto (DF 10.4). Pela `[D17]`, cada tenant escolhe se a comissão incide sobre o valor cheio ou sobre o valor com desconto, e a tela precisa explicar a consequência: comissão sobre o valor com desconto faz o colaborador torcer contra a promoção do próprio estabelecimento.

O modelo também separa **pessoa** de **vínculo** desde já (DF 2.3, spec 003), para que o colaborador em vários negócios da fase 2 (`[D31]`) não exija migração.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.3.2 | Prever comissões com exatidão | Divergência previsto/pago |
| 3.3.5 | Pedir folga e trocar escala | Tempo de aprovação |
| 3.3.6 | Construir reputação própria | Avaliações por colaborador (com a spec 016) |
| 3.3.1 | Aumentar volume de atendimento | Ocupação pessoal (com a spec 009) |
| 3.2.5 | Gerir agenda e comissões | Tempo de fechamento (com a spec 018) |

Personas: Proprietário; Gerente de filial; Colaborador; prestador autônomo (Proprietário e Colaborador ao mesmo tempo); Recepção (consulta); Financeiro/Ops (consulta de regras de comissão).

---

## Clarifications

### Session 2026-11-25

- Q: O colaborador pode atender em mais de uma filial do mesmo negócio? (PEN-04) → A: Sim: um vínculo com o negócio e escala por filial e dia; o motor de agenda impede o mesmo horário em duas filiais.
- Q: Na v1.0, a comissão é só cálculo e prévia ou é repassada automaticamente via split? (PEN-14) → A: Repassada via split para todos os colaboradores (PJ e CLT); todo colaborador que recebe comissão precisa ser recebedor verificado no PSP. Risco registrado: o enquadramento do colaborador CLT precisa ser validado com contador e jurídico antes do lançamento.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar a equipe e o que cada um faz (Priority: P1)

Como Proprietário ou Gerente, quero cadastrar cada colaborador com vínculo, filial, serviços que executa e perfil público, e convidá-lo para o app, para que ele possa ser escolhido pelo consumidor.

**Why this priority**: sem colaborador com serviço e horário não existe horário para agendar (spec 008).

**Independent Test**: cadastrar dois colaboradores numa filial, marcar os serviços de cada um, convidar um para o app, e ver os dois na página pública com foto e especialidades.

**Acceptance Scenarios**:

1. **Given** uma filial ativa, **When** o Proprietário cadastra um colaborador com nome de exibição, foto, tipo de vínculo (CLT, PJ, comissionado, arrendatário de estação), data de início e filial, **Then** o colaborador existe naquele tenant ligado a uma pessoa da identidade global (spec 003).
2. **Given** um colaborador, **When** o Proprietário marca os serviços e combos que ele executa (catálogo da spec 006), **Then** só esses podem ser agendados com ele.
3. **Given** um colaborador e um serviço, **When** o Proprietário define duração própria ou preço próprio para aquele colaborador (por exemplo, profissional sênior com preço maior), **Then** esses valores prevalecem sobre os do serviço, são versionados e aparecem ao consumidor quando ele escolhe aquele profissional.
4. **Given** um colaborador cadastrado, **When** o Proprietário o convida para o app, **Then** ele recebe o convite da spec 003 com o papel Colaborador; um colaborador sem conta continua agendável, com a agenda operada pela Recepção.
5. **Given** um negócio de saúde (cluster B), **When** um colaborador é cadastrado, **Then** é obrigatório informar conselho, número de registro e UF (por exemplo, CRP, CREFITO, CRO), exibidos na página pública.
6. **Given** um colaborador, **When** o consumidor abre a página do estabelecimento, **Then** vê nome de exibição, foto, especialidades, registro (em saúde) e, a partir da spec 016, avaliações; nunca vê vínculo nem comissão.
7. **Given** um colaborador numa filial, **When** o Proprietário tenta vinculá-lo também a outra filial do mesmo negócio, **Then** o vínculo passa a valer para as duas filiais, com escala própria por filial e dia; o motor de agenda (spec 008) impede o mesmo horário em duas filiais (`[PEN-04]` resolvido).

---

### User Story 2 - Escala de trabalho (Priority: P1)

Como Proprietário, Gerente ou autônomo, quero definir os dias e horários em que cada colaborador atende, com intervalos e datas de vigência, dentro do horário de funcionamento da filial, para que a agenda ofereça os horários certos.

**Why this priority**: a escala é, junto com o horário da filial (spec 005), a base do cálculo de disponibilidade (spec 008).

**Independent Test**: definir a escala de um colaborador de terça a sábado, das 9h às 18h com almoço, com uma nova escala a partir do mês seguinte, e consultar pelo contrato os intervalos de trabalho de cada dia.

**Acceptance Scenarios**:

1. **Given** um colaborador numa filial, **When** a escala é definida por dia da semana com um ou mais intervalos, **Then** fica salva no fuso da filial e passa a valer na data de início informada.
2. **Given** uma escala que ultrapassa o horário de funcionamento da filial, **When** salva, **Then** o sistema avisa e considera disponível só a interseção com o horário da filial.
3. **Given** uma nova escala com vigência futura, **When** a data chega, **Then** substitui a anterior sem ação manual; a anterior continua no histórico.
4. **Given** uma mudança de escala que deixa agendamentos futuros fora do novo horário, **When** salva, **Then** o sistema mostra quantos e quais ficam fora e não os cancela automaticamente (spec 009 decide).
5. **Given** o autônomo, **When** informa o "horário de trabalho" no onboarding (J3), **Then** esse horário vira, ao mesmo tempo, o horário da filial única e a escala dele.
6. **Given** o contrato de disponibilidade de trabalho, **When** a spec 008 pede os intervalos de um colaborador num dia, **Then** recebe escala ∩ horário da filial − folgas − bloqueios, já no fuso da filial e em UTC.

---

### User Story 3 - Folgas, bloqueios e aprovação (Priority: P1)

Como Colaborador, quero pedir folga pelo app e saber rápido se foi aprovada; como Gerente ou Proprietário, quero aprovar, recusar ou lançar folgas e bloqueios diretamente, vendo os agendamentos afetados.

**Why this priority**: DF 3.3.5; uma folga não registrada vira atendimento sem profissional.

**Independent Test**: pelo app, pedir folga num dia com dois agendamentos; aprovar no painel, ver o aviso dos dois agendamentos afetados, e conferir que o dia deixa de ter horários livres.

**Acceptance Scenarios**:

1. **Given** um Colaborador no app, **When** pede folga com período (dia inteiro ou intervalo) e tipo (férias, folga, ausência, outro), **Then** o pedido fica `pendente` e o Gerente da filial e o Proprietário são avisados.
2. **Given** um pedido pendente, **When** o Gerente ou o Proprietário aprova, **Then** o período deixa de ter horários livres, o Colaborador é avisado, e os agendamentos existentes no período são listados para remarcação ou troca de profissional (spec 009); nenhum é cancelado automaticamente.
3. **Given** um pedido pendente, **When** é recusado, **Then** o Colaborador recebe o motivo.
4. **Given** um pedido, **When** o período começa sem decisão, **Then** o pedido expira e o Colaborador e o Gerente são avisados.
5. **Given** o Gerente ou o Proprietário, **When** lança um bloqueio (por exemplo, reunião ou curso) ou uma folga diretamente, **Then** vale na hora, sem aprovação, e o Colaborador é avisado.
6. **Given** um pedido de folga, **When** o Colaborador escreve o motivo, **Then** a tela avisa para não informar dados de saúde; o campo é opcional e não aceita anexos.

---

### User Story 4 - Troca de escala entre colaboradores (Priority: P2)

Como Colaborador, quero propor a troca de um dia de trabalho com um colega, com o aceite dele e a aprovação do Gerente, sem bagunçar os agendamentos.

**Why this priority**: DF 3.3.5 ("trocar escala"); é comum em salões e clínicas e hoje é resolvido por mensagem pessoal.

**Independent Test**: dois colaboradores da mesma filial trocam um sábado por uma terça; com aceite e aprovação, as escalas dos dois dias se invertem.

**Acceptance Scenarios**:

1. **Given** dois colaboradores da mesma filial, **When** o primeiro propõe trocar o dia A (dele) pelo dia B (do colega), **Then** o colega recebe a proposta e pode aceitar ou recusar.
2. **Given** uma proposta aceita, **When** o Gerente aprova, **Then** a escala do dia A passa ao colega e a do dia B passa ao primeiro, como exceções de escala.
3. **Given** uma troca, **When** algum dos dois dias tem agendamentos do proponente ou do colega, **Then** a troca só é aprovada depois que esses agendamentos forem remarcados ou passados para o profissional que vai trabalhar no dia, desde que ele execute os serviços (spec 009).
4. **Given** um colega que não executa os serviços agendados no dia, **When** a troca é proposta, **Then** o sistema avisa antes do envio.

---

### User Story 5 - Regras de comissão com a escolha da `[D17]` (Priority: P1)

Como Proprietário, quero configurar a comissão por colaborador, por serviço ou pela combinação, com piso e teto, e escolher se ela incide sobre o valor cheio ou sobre o valor com desconto, entendendo a consequência dessa escolha (DF 10.4, `[D17]`).

**Why this priority**: comissão é a principal dor de fechamento (DF 3.2.5) e de confiança do colaborador (DF 3.3.2); a regra precisa existir antes do primeiro atendimento pago (specs 012 e 018).

**Independent Test**: configurar regra padrão de 40%, 50% para um colaborador específico e 30% para um serviço específico, com base "valor com desconto"; simular um atendimento com desconto e conferir o valor e a explicação.

**Acceptance Scenarios**:

1. **Given** a tela "Regras de comissão", **When** o Proprietário define a regra padrão do negócio, **Then** informa o percentual, o piso e o teto opcionais por atendimento, e a base de cálculo.
2. **Given** a escolha da base, **When** o Proprietário escolhe entre "valor cheio" e "valor com desconto", **Then** a tela mostra um exemplo numérico com um desconto e explica, em linguagem simples, que comissão sobre o valor com desconto faz o colaborador perder quando o estabelecimento faz promoção.
3. **Given** regras em vários níveis, **When** a comissão de um atendimento é calculada, **Then** vale a mais específica: colaborador + serviço > serviço > colaborador > padrão do negócio.
4. **Given** a opção "descontar taxas de pagamento da base" (padrão: não), **When** ligada, **Then** a base da comissão é o valor da base escolhida menos a taxa do meio de pagamento informada pela spec 012.
5. **Given** um colaborador com vínculo "arrendatário de estação", **When** a regra dele é configurada, **Then** ela é expressa como a parte que fica com o estabelecimento (cota-parte), e o simulador mostra quanto fica com cada um.
6. **Given** uma mudança de regra, **When** salva, **Then** cria uma nova versão com vigência, gera registro na trilha de auditoria (spec 004) e não altera a comissão de agendamentos já criados (CONST III).
7. **Given** o simulador, **When** o Proprietário escolhe colaborador, serviço, valor e desconto, **Then** vê a comissão, a parte do estabelecimento e qual regra foi usada.

---

### User Story 6 - Colaborador acompanha a própria comissão (Priority: P2)

Como Colaborador, quero ver no app quanto vou receber pelos meus atendimentos, com a regra usada em cada um, para não ter surpresa no fechamento (DF 3.3.2).

**Why this priority**: transparência reduz conflito no fechamento; a tela "Comissões" é uma das 5 do app do colaborador (DF 9.4).

**Independent Test**: com atendimentos concluídos de teste (spec 009 ou contrato), abrir "Comissões" no app e conferir o total do período, o detalhe por atendimento e a regra aplicada.

**Acceptance Scenarios**:

1. **Given** atendimentos concluídos do Colaborador, **When** ele abre "Comissões", **Then** vê o total previsto do período (semana e mês), e o detalhe por atendimento com data, serviço, valor-base, regra aplicada e comissão.
2. **Given** um atendimento estornado ou cancelado depois de concluído (spec 012), **When** isso acontece, **Then** a comissão prevista é ajustada e o ajuste aparece como lançamento separado, não como edição silenciosa.
3. **Given** a forma de pagamento da comissão, **When** a tela mostra o status, **Then** mostra "previsto, a receber e recebido", porque a comissão é repassada automaticamente via split (spec 012) a todo colaborador, que precisa ser recebedor verificado no PSP (`[PEN-14]` resolvido).
4. **Given** um Colaborador, **When** tenta ver a comissão de um colega, **Then** é negado (DF 7: "leitura própria").

---

### User Story 7 - Perfil e portfólio do colaborador (Priority: P3)

Como Colaborador, quero manter meu perfil (foto, apresentação, especialidades) e um portfólio de fotos de trabalhos, para construir reputação própria (DF 3.3.6).

**Why this priority**: diferencia o profissional na escolha do consumidor (J1, "Escolha de profissional"); a reputação por avaliação é da spec 016.

**Independent Test**: pelo app, atualizar a apresentação e enviar 3 fotos ao portfólio; ver na página do estabelecimento depois da aprovação do Proprietário.

**Acceptance Scenarios**:

1. **Given** um Colaborador no app, **When** edita apresentação, especialidades e foto, **Then** as mudanças vão para a página pública.
2. **Given** fotos de portfólio enviadas pelo Colaborador, **When** o estabelecimento exige aprovação (padrão: sim), **Then** elas só aparecem depois que o Proprietário ou o Gerente aprovar.
3. **Given** uma foto de portfólio, **When** enviada, **Then** o Colaborador declara ter autorização de uso de imagem da pessoa retratada, e os metadados de localização são removidos.
4. **Given** um portfólio, **When** exibido, **Then** mostra até 30 fotos, das mais recentes para as mais antigas.

---

### User Story 8 - Encerrar o vínculo (Priority: P3)

Como Proprietário, quero encerrar o vínculo de um colaborador que saiu, sem perder o histórico de atendimentos e de comissões.

**Why this priority**: saída de colaborador é frequente no setor; perder histórico quebra o fechamento e a auditoria.

**Independent Test**: encerrar o vínculo de um colaborador com agendamentos futuros; conferir que o sistema exige resolvê-los, que o acesso ao app cai e que o histórico continua consultável.

**Acceptance Scenarios**:

1. **Given** um colaborador com agendamentos futuros, **When** o Proprietário define a data de fim do vínculo, **Then** precisa remarcar ou passar a outro profissional os agendamentos posteriores a essa data (spec 009) antes de confirmar.
2. **Given** o vínculo encerrado, **When** a data de fim chega, **Then** o colaborador sai da página pública, deixa de ser agendável, e o papel Colaborador no tenant é removido (spec 003), encerrando as sessões.
3. **Given** um vínculo encerrado, **When** o Proprietário consulta o histórico, **Then** vê os atendimentos e as comissões daquele colaborador; comissões pendentes continuam no fechamento (spec 018).
4. **Given** a mesma pessoa contratada de novo, **When** o Proprietário cria novo vínculo, **Then** ela é reconhecida como a mesma pessoa e o histórico anterior fica ligado.

---

### Edge Cases

- **Autônomo**: é Proprietário e Colaborador; a comissão dele não é configurada (100% fica com o próprio negócio), e a tela de regras não aparece no caminho autônomo até haver um segundo colaborador.
- **Último colaborador ativo de uma filial encerrado**: a filial fica sem horários; o painel avisa e a página pública mostra "sem horários disponíveis".
- **Folga aprovada sobre um dia já trocado**: vale a folga; a troca do dia é desfeita com aviso aos dois.
- **Escala com intervalo atravessando a meia-noite** (por exemplo, 20h às 2h): aceita, dividida em dois dias no cálculo.
- **Horário de verão ou mudança de fuso**: escalas são definidas em hora local da filial; a conversão para UTC é feita para cada data.
- **Comissão com piso maior que o valor do serviço**: o piso é limitado ao valor-base; a tela avisa ao salvar.
- **Combo com desconto** (spec 006): a comissão de cada etapa usa o rateio do desconto informado pelo catálogo, conforme a base escolhida.
- **Sessão de pacote** (spec 006): o valor-base de cada sessão é o preço do pacote dividido pelo número de sessões, com o resto do arredondamento na última sessão.
- **Arredondamento da comissão**: calculada em centavos, arredondada para baixo; o resto fica com o estabelecimento (CONST III).
- **Colaborador sem nenhum serviço marcado**: não aparece para o consumidor nem no cálculo de disponibilidade.
- **Duas propostas de troca para o mesmo dia**: a segunda é recusada enquanto a primeira estiver pendente.

---

## Requirements *(mandatory)*

Formato: `REQ-EQP-NNN (origem: …)`.

### Functional Requirements

**Colaborador e vínculo**

- **REQ-EQP-001** (origem: DF 2.3 | DF 6 | CONST 2): O colaborador (`professional`) DEVE existir no tenant ligado a uma pessoa da identidade global (REQ-IDN-007); a ligação com o tenant é o vínculo, com tipo (CLT, PJ, comissionado, arrendatário de estação ou proprietário que atende, no caso do autônomo), data de início, data de fim opcional e filial.
- **REQ-EQP-002** (origem: PEN-04 | DF 2.3): O vínculo DEVE poder valer para várias filiais do mesmo negócio, com escala por filial e dia; o mesmo horário em duas filiais DEVE ser impedido pelo motor de agenda.
- **REQ-EQP-003** (origem: D31 | CONST 2): O modelo DEVE permitir, sem migração destrutiva, que a mesma pessoa tenha vínculos em tenants diferentes (fase 2), com agendas separadas por negócio.
- **REQ-EQP-004** (origem: DF 2.3 | DF 7): O colaborador DEVE ter nome de exibição, foto, apresentação, especialidades e, nas verticais de saúde, conselho, número de registro e UF obrigatórios.
- **REQ-EQP-005** (origem: DF 2.3): Colaborador sem conta no app DEVE continuar agendável; o convite para o app usa a spec 003 com o papel Colaborador.
- **REQ-EQP-006** (origem: REQ-NEG-011): DEVE existir o contrato usado pela spec 005 para criar o colaborador do autônomo, com escala igual ao horário de trabalho informado.

**Serviços por colaborador**

- **REQ-EQP-010** (origem: DF 6 | D19): Cada colaborador DEVE ter a lista de serviços e combos do catálogo (spec 006) que executa; só esses podem ser agendados com ele.
- **REQ-EQP-011** (origem: CONST III): Duração e preço próprios por colaborador e serviço DEVEM ser opcionais, versionados com vigência, e prevalecer sobre os do serviço; a versão vigente na criação do agendamento é congelada (spec 009).
- **REQ-EQP-012** (origem: D19): Um colaborador só executa um combo se executar todas as etapas dele.

**Escala e disponibilidade de trabalho**

- **REQ-EQP-020** (origem: DF 6 "escala" | J3 | J4): A escala DEVE ser definida por colaborador e filial, por dia da semana, com um ou mais intervalos, em hora local da filial, com data de início e de fim opcional; novas escalas com vigência futura substituem as anteriores na data.
- **REQ-EQP-021** (origem: REQ-NEG-030): O tempo disponível para agendar DEVE ser a interseção da escala com o horário de funcionamento da filial; o sistema avisa quando a escala ultrapassa esse horário.
- **REQ-EQP-022** (origem: CONST I): Mudar escala, aprovar folga ou lançar bloqueio NÃO DEVE cancelar agendamentos; o sistema DEVE listar os afetados e publicar evento para a spec 009.
- **REQ-EQP-023** (origem: CONST VII | CONST XI): DEVE existir contrato que entrega à spec 008 os intervalos de trabalho de um colaborador numa data (escala ∩ horário da filial − folgas − bloqueios), em UTC, e eventos a cada mudança desses insumos.

**Folgas, bloqueios e trocas**

- **REQ-EQP-030** (origem: DF 3.3.5 | DF 9.4): O Colaborador DEVE poder pedir folga (dia inteiro ou intervalo) com tipo (férias, folga, ausência, outro) e motivo opcional, sem anexos.
- **REQ-EQP-031** (origem: DF 3.3.5 | DF 7): O Gerente da filial e o Proprietário DEVEM poder aprovar ou recusar (com motivo) pedidos de folga; pedidos sem decisão até o início do período expiram, com aviso.
- **REQ-EQP-032** (origem: DF 9.3): O Gerente e o Proprietário DEVEM poder lançar folgas e bloqueios diretamente, valendo na hora.
- **REQ-EQP-033** (origem: DF 3.3.5): A troca de dia de trabalho entre dois colaboradores da mesma filial DEVE exigir o aceite do colega e a aprovação do Gerente ou do Proprietário, e só ser aprovada quando os agendamentos dos dias envolvidos estiverem resolvidos (remarcados ou passados a quem vai trabalhar, se executar os serviços).
- **REQ-EQP-034** (origem: CONST IV): O motivo de folga NÃO DEVE pedir nem guardar dado de saúde; a tela avisa e não aceita anexos.

**Comissão**

- **REQ-EQP-040** (origem: DF 10.4): As regras de comissão DEVEM ter: percentual, piso e teto opcionais por atendimento (em centavos), base de cálculo e nível (padrão do negócio, colaborador, serviço, colaborador + serviço), com a precedência colaborador + serviço > serviço > colaborador > padrão.
- **REQ-EQP-041** (origem: D17 | DF 10.4): O tenant DEVE escolher, por negócio, se a base é o valor cheio ou o valor com desconto; a tela DEVE mostrar um exemplo numérico e explicar a consequência da escolha antes de salvar.
- **REQ-EQP-042** (origem: DF 10.4 "base configurável"): O tenant DEVE poder escolher se as taxas do meio de pagamento (informadas pela spec 012) são descontadas da base (padrão: não).
- **REQ-EQP-043** (origem: DF 2.3): Para o vínculo arrendatário de estação, a regra DEVE ser expressa como cota-parte do estabelecimento; o cálculo é equivalente ao percentual complementar.
- **REQ-EQP-044** (origem: CONST III): Valores DEVEM ser calculados em centavos inteiros, arredondados para baixo, com o resto para o estabelecimento; combos usam o rateio de desconto por etapa da spec 006 (REQ-CAT-034), e sessões de pacote usam o preço do pacote dividido pelo número de sessões, com o resto na última.
- **REQ-EQP-045** (origem: CONST III): Toda regra DEVE ser versionada com vigência; o agendamento congela a versão vigente na criação (spec 009); mudanças não alteram agendamentos já criados.
- **REQ-EQP-046** (origem: CONST VII | J7): DEVE existir um contrato de cálculo que, dado um atendimento (colaborador, serviço, valor cheio, desconto, taxas, versão da regra), devolve comissão, parte do estabelecimento e regra aplicada, usado pelas specs 009, 012 e 018 e pelo simulador.
- **REQ-EQP-047** (origem: DF 10.4): O painel DEVE ter um simulador de comissão (colaborador, serviço, valor, desconto, meio de pagamento).
- **REQ-EQP-048** (origem: PEN-14 | J7): A comissão DEVE ser repassada via split a todos os colaboradores (PJ e CLT), cada um como recebedor verificado no PSP; esta spec entrega regra, cálculo, prévia e o cadastro do colaborador como recebedor; repasse e fechamento são das specs 012 e 018. Risco: enquadramento do CLT a validar com contador e jurídico.
- **REQ-EQP-049** (origem: CONST V | REQ-AUD-001): Criar ou alterar regra de comissão DEVE gerar registro na trilha de auditoria.

**Comissão no app do colaborador**

- **REQ-EQP-050** (origem: DF 3.3.2 | DF 9.4): A tela "Comissões" DEVE mostrar ao Colaborador o total previsto por semana e por mês, e o detalhe por atendimento (data, serviço, valor-base, regra, comissão).
- **REQ-EQP-051** (origem: CONST III): Ajustes por estorno ou cancelamento DEVEM aparecer como lançamentos separados, nunca como edição do valor anterior.
- **REQ-EQP-052** (origem: DF 7): O Colaborador DEVE ver apenas a própria comissão.

**Perfil, portfólio e encerramento**

- **REQ-EQP-060** (origem: DF 9.4 "Perfil e portfólio" | DF 3.3.6): O Colaborador DEVE poder editar apresentação, especialidades e foto, e enviar até 30 fotos de portfólio, com aprovação do Proprietário ou do Gerente quando o estabelecimento exigir (padrão: exige).
- **REQ-EQP-061** (origem: CONST IV): O envio de foto de portfólio DEVE exigir a declaração de autorização de uso de imagem e remover metadados de localização.
- **REQ-EQP-062** (origem: DF 2.3): O encerramento do vínculo DEVE exigir a resolução dos agendamentos posteriores à data de fim, remover o papel Colaborador (spec 003) na data, tirar o colaborador da página pública e preservar todo o histórico.
- **REQ-EQP-063** (origem: DF 2.3 | D31): Recontratar a mesma pessoa DEVE criar novo vínculo ligado à mesma pessoa.

**Exibição e isolamento**

- **REQ-EQP-070** (origem: DF 9.1 "Escolha de profissional"): A página do estabelecimento DEVE mostrar, por filial, os colaboradores ativos com pelo menos um serviço, com nome de exibição, foto, especialidades, registro (em saúde) e portfólio aprovado; vínculo e comissão NUNCA são públicos.
- **REQ-EQP-071** (origem: CONST II): Colaboradores, vínculos, escalas, folgas e regras ficam no espaço de dados do tenant; só a pessoa fica na identidade global.

### Key Entities

- **Colaborador** (`professional`): pessoa (global), nome de exibição, foto, apresentação, especialidades, registro profissional (saúde), estado.
- **Vínculo**: colaborador, tipo, filial (uma ou várias, conforme PEN-04), início, fim.
- **Serviço do colaborador**: colaborador, serviço ou combo, duração e preço próprios (versionados).
- **Escala**: colaborador, filial, vigência, dias e intervalos em hora local.
- **Exceção de escala**: colaborador, data, intervalos (inclui as trocas aprovadas).
- **Folga ou bloqueio**: colaborador, período, tipo, motivo opcional, origem (pedido ou lançamento direto), estado, quem decidiu.
- **Proposta de troca**: proponente, colega, dia A, dia B, estado, aceite, aprovação.
- **Regra de comissão** (versionada): nível, colaborador, serviço, percentual, piso, teto, vigência.
- **Configuração de comissão do negócio**: base (cheio ou com desconto), descontar taxas (sim ou não).
- **Foto de portfólio**: colaborador, imagem, declaração de autorização, estado de aprovação.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| Painel (DF 9.3) | Colaboradores · Regras de comissão · Escalas, folgas e bloqueios | Códigos do Figma registrados no plano |
| Painel (onboarding, DF 9.2) | Horários e colaboradores (parte de equipe e escala) | Código do Figma registrado no plano |
| App do colaborador (DF 9.4) | Comissões · Folgas e trocas · Perfil e portfólio | Códigos do Figma registrados no plano |
| Colaborador desktop (DF 9.9) | Comissões · Folgas e trocas · Perfil e portfólio | Códigos do Figma registrados no plano |
| App e web do consumidor (DF 9.1, 9.8) | Escolha de profissional (perfil exibido) | `9.1.x` e `W..` registrados no plano |

A "Agenda do dia" e o "Detalhe com check-in e check-out" do app do colaborador são das specs 008 e 009.

---

## Regras e estados

- **Vínculo**: `ativo` → `com_fim_agendado` → `encerrado`.
- **Pedido de folga**: `pendente` → `aprovado` | `recusado` | `expirado` | `cancelado_pelo_colaborador`.
- **Proposta de troca**: `proposta` → `aceita_pelo_colega` → `aprovada` | `recusada` | `expirada`.
- **Foto de portfólio**: `enviada` → `aprovada` | `recusada`.
- **Regra de comissão (versão)**: `agendada` → `vigente` → `substituída`.
- **Precedência da comissão**: colaborador + serviço > serviço > colaborador > padrão do negócio.
- **Tempo de trabalho disponível numa data**: escala vigente (ou exceção) ∩ horário da filial − folgas aprovadas − bloqueios.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Nome de exibição, foto, apresentação, especialidades | Pessoal (público por escolha) | Execução de contrato (art. 7, V) | Enquanto o vínculo existir; o histórico mantém só o identificador e o nome | Público; equipe do tenant |
| Registro profissional (conselho, número, UF) | Pessoal, de divulgação obrigatória em saúde | Obrigação legal e regulatória (art. 7, II) | Enquanto o vínculo existir + 5 anos | Público; equipe do tenant |
| Tipo de vínculo, datas | Pessoal | Execução de contrato | Vínculo + 5 anos | Proprietário; Gerente da filial; Financeiro/Ops |
| Regras e prévias de comissão | Pessoal (remuneração) | Execução de contrato | Vínculo + 5 anos (guarda fiscal) | O próprio colaborador; Gerente da filial; Proprietário; Financeiro/Ops |
| Pedidos de folga e motivo | Pessoal | Execução de contrato | 2 anos | O próprio colaborador; Gerente da filial; Proprietário |
| Fotos de portfólio (podem retratar consumidores) | Pessoal de terceiros | Consentimento do retratado, declarado pelo colaborador (art. 7, I) | Até a remoção pelo colaborador ou pelo estabelecimento | Público após aprovação |

Regras: nenhum dado de saúde do colaborador é coletado (REQ-EQP-034); dados bancários do colaborador para repasse são da spec 012/018, cifrados.

---

## Permissões

Recorte da matriz RBAC (DF 7):

| Ação | Colaborador | Recepção | Gerente | Proprietário | Fin/Ops | Suporte |
|---|---|---|---|---|---|---|
| Cadastrar e editar colaborador, vínculo, serviços que executa | — | — | ✔ filial | ✔ | — | ✔* |
| Editar a própria escala | — | — | — | ✔ (autônomo) | — | — |
| Definir escalas da equipe | — | — | ✔ filial | ✔ | — | ✔* |
| Pedir folga, propor e aceitar troca | ✔ própria | — | ✔ própria | ✔ própria | — | — |
| Aprovar folgas e trocas; lançar bloqueios | — | — | ✔ filial | ✔ | — | — |
| Ver escalas e folgas da equipe | — | ✔ filial | ✔ filial | ✔ | — | ✔* |
| Ver e alterar comissão (DF 7) | ✔ leitura própria | — | ✔ | ✔ | ✔ | — |
| Editar perfil e portfólio | ✔ próprio | — | ✔ filial (aprovar) | ✔ | — | — |
| Encerrar vínculo | — | — | — | ✔ | — | — |

`✔*` = apenas em sessão de suporte (spec 003). O Gerente "altera comissão" (DF 7) apenas de colaboradores da própria filial; a base de cálculo do negócio (`[D17]`) é só do Proprietário.

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `workforce.professional.created.v1` / `.updated.v1` | Cadastro e mudanças do colaborador |
| `workforce.employment.started.v1` / `.ending_scheduled.v1` / `.ended.v1` | Ciclo do vínculo |
| `workforce.professional.services_changed.v1` | Serviços executados ou valores próprios alterados |
| `workforce.schedule.changed.v1` | Escala nova ou alterada (consumido pela spec 008) |
| `workforce.time_off.requested.v1` / `.approved.v1` / `.rejected.v1` / `.expired.v1` | Ciclo da folga |
| `workforce.block.created.v1` / `.removed.v1` | Bloqueio lançado ou removido |
| `workforce.shift_swap.proposed.v1` / `.approved.v1` / `.rejected.v1` | Ciclo da troca |
| `workforce.commission_rule.published.v1` | Nova versão de regra de comissão |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Tempo de aprovação de folga (pedido → decisão) | DF 3.3.5 | Mediana até 24 horas |
| % de pedidos de folga expirados sem decisão | DF 3.3.5 | Abaixo de 5% |
| Divergência entre comissão prevista e paga | DF 3.3.2 | 0 centavos (completa com a spec 018) |
| Colaboradores com perfil completo (foto e especialidades) | DF 3.3.6 | Acompanhada |
| Ocupação pessoal | DF 3.3.1 | Acompanhada (completa com a spec 009) |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O Proprietário cadastra um colaborador com serviços e escala em até 3 minutos.
- **SC-002**: Para qualquer combinação de regras, o cálculo de comissão devolve sempre o mesmo valor para os mesmos dados, sem erro de centavo, em 100% dos testes de propriedade.
- **SC-003**: Nenhuma mudança de regra de comissão altera a comissão de agendamento já criado.
- **SC-004**: Metade dos pedidos de folga é decidida em até 24 horas.
- **SC-005**: Nenhuma escala, folga ou bloqueio cancela agendamento sem decisão do estabelecimento, e 100% dos agendamentos afetados são listados.
- **SC-006**: O Colaborador vê no app o total previsto do mês e o detalhe por atendimento, com a regra aplicada, em até 2 toques.
- **SC-007**: Depois de ler a explicação da `[D17]`, o Proprietário consegue dizer qual base escolheu e por quê (verificado em teste com 5 donos de estabelecimento).
- **SC-008**: O contrato de disponibilidade de trabalho devolve os intervalos corretos em 100% dos casos de teste com escala, exceção, folga, bloqueio, troca e mudança de fuso.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-04** — colaborador em mais de uma filial do mesmo negócio? | Modelo do vínculo, escala por filial, motor de agenda (spec 008) | **Resolvido (clarify 2026-11-25)**: várias filiais, escala por filial |
| **PEN-14** — comissão só cálculo e prévia, ou repasse automático via split? | Tela "Comissões"; specs 012 e 018 | **Resolvido (clarify 2026-11-25)**: split para todos; risco CLT a validar |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **D31** / **C6** (fase 2) | Pessoa separada de vínculo; vínculos em vários tenants aceitos pelo modelo, sem interface na v1.0 |
| **D17** | Escolha por negócio, com explicação obrigatória na tela |
| Arrendatário de estação | ASSUMIDO: expresso como cota-parte do estabelecimento; o contrato entre as partes (por exemplo, Lei do Salão Parceiro, Lei 13.352/2016) fica fora da plataforma |
| Duração e preço por colaborador | ASSUMIDO: pertencem a esta spec (a spec 006 deixou para cá) |
| Taxas de pagamento na base | ASSUMIDO: opção do tenant, padrão "não descontar" |

---

## Fora do escopo desta especificação

- Agenda do dia, check-in e check-out do colaborador (specs 008 e 009).
- Remarcação e troca de profissional dos agendamentos afetados (spec 009).
- Repasse, split e dados bancários do colaborador (specs 012 e 018).
- Fechamento financeiro e conciliação das comissões (spec 018).
- Avaliações do colaborador (spec 016).
- Colaborador em vários negócios com agendas unidas (spec 027).
- Antecipação de comissão (spec 036).
- Folha de pagamento, eSocial, controle de ponto e férias trabalhistas (escopo negativo, CONST 2).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: cadastro de colaborador em até 3 minutos; decisão de folga em até 24 horas (mediana); até 30 fotos de portfólio; retenção de pedidos de folga por 2 anos.
- A aprovação de portfólio vem ligada por padrão e pode ser desligada pelo Proprietário.
- O Gerente gere colaboradores, escalas e comissões apenas da própria filial; a base de cálculo do negócio é do Proprietário.
- Os tipos de folga são categorias operacionais, não trabalhistas; não substituem controle de ponto nem registro de férias legais.
- O cálculo da comissão desta spec é a única fonte de verdade para as specs 009, 012 e 018 (contrato REQ-EQP-046).
