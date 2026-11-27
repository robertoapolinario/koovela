# Feature Specification: Fila de espera e horário ocioso

**Feature Branch**: `014-fila-espera-horario-ocioso`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "014 fila-espera-horario-ocioso — seguir a sequência da constituição (seção 10): J2. Depende de 009, 011 e 012. Pendência PEN-18. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: app do consumidor e web do consumidor ("Fila de espera e aviso de vaga"; oferta de horário ocioso; preferência de ofertas no perfil) · painel do cliente ("Fila de espera e encaixe", "Regra de horário ocioso") · back-office (limites da plataforma e taxa de horário ocioso)

**Depende de**: 009 `agendamento-ciclo-de-vida` · 011 `notificacoes-multicanal` · 012 `pagamentos-split` (e, por elas, 002 a 008 e 010)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios I, III, IV, IX, seções 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.2.1, 3.2.3, 4.3, 5.2, 6, 8 (J2, J6), 9.1, 9.3, 9.8, 10.6, 17 (`[D15]`) e 18 (`[PEN-18]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Horário vago é receita perdida que não volta. Ele aparece de dois jeitos: quando alguém cancela ou falta (a J6 libera o horário) e quando a agenda simplesmente não enche. O estabelecimento quer **preencher horários vagos** (DF 3.2.3), e o consumidor quer ser avisado quando abrir um horário que ele queria.

A J2 (DF 8) descreve o fluxo: **vaga detectada → regra de elegibilidade e desconto do tenant → oferta disparada para a fila de espera e para consumidores elegíveis → agendamento → cobrança da taxa de horário ocioso**. O horário ocioso está na v1.0 `[D15]`, e a taxa sobre ele é uma das fontes de receita da Koovela (DF 5.2).

A regra do horário ocioso tem quatro parâmetros (DF 10.6): critério de elegibilidade do consumidor, desconto máximo permitido, antecedência mínima e limite de ofertas por consumidor. Os valores ainda estão abertos (`[PEN-18]`).

Esta spec trata de duas coisas diferentes, com regras de privacidade diferentes:

- **fila de espera**: o consumidor pediu para ser avisado; o aviso é transacional;
- **oferta de horário ocioso**: a iniciativa é do estabelecimento, com desconto; é comunicação promocional e exige opt-in (CONST IV).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.2.3 | Preencher horários vagos | Ocupação; receita de ocioso |
| 3.2.1 | Aumentar receita | Receita por filial/mês |
| 3.2.8 | Reduzir no-show (reposição do horário, J6) | Horários liberados que foram repostos |
| 3.3.1 | Aumentar volume de atendimento | Ocupação pessoal |

Personas: consumidor; Recepção (encaixe); Proprietário (configura a regra); Gestão (limites e taxa).

---

## Clarifications

### Session 2026-11-25

- Q: Como ficam fila e horário ocioso para o Gerente? → A: Gerente (PEN-03, decidido na spec 003): vê faturamento e configura fidelidade só da própria filial; o Proprietário pode retirar.
- Q: Quais são os limites da plataforma para o horário ocioso? (PEN-18) → A: Tudo configurável no back-office e pelo negócio, dentro dos limites do back-office. Valores iniciais: consumidores atendidos nos últimos 180 dias ou na fila; desconto máximo de 50%; oferta entre 2 e 48 horas à frente; no máximo 2 ofertas por consumidor por semana por negócio.
- Q: O horário ocioso com desconto vale em saúde? (PEN-06) → A: Não: em saúde não há oferta com desconto, porque nenhum preço aparece; a fila de espera continua valendo.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar na fila de espera (Priority: P1)

Como consumidor que não encontrou o horário que queria, quero entrar na fila de espera para um serviço, um profissional (ou qualquer) e um período, e ser avisado se abrir uma vaga.

**Why this priority**: é o destino natural de "sem horários disponíveis" (REQ-AGD-008) e a primeira forma de repor um cancelamento.

**Independent Test**: com uma agenda cheia, entrar na fila para "corte, com a Ana, sábado de manhã"; cancelar um agendamento compatível e conferir que o consumidor da fila recebe o aviso.

**Acceptance Scenarios**:

1. **Given** a tela de horários sem o horário desejado, **When** o consumidor escolhe "entrar na fila de espera", **Then** informa serviço (ou combo), profissional (ou qualquer), filial e o período desejado (datas e faixa do dia: manhã, tarde, noite, ou horário específico).
2. **Given** a entrada na fila, **When** confirmada, **Then** fica ativa até o fim do período desejado (no máximo 30 dias) e aparece em "Fila de espera" no app e na web, com a opção de sair.
3. **Given** um consumidor, **When** tenta entrar em mais de 3 filas ativas no mesmo negócio, **Then** é recusado com a lista das filas atuais.
4. **Given** um consumidor sem conta, **When** escolhe entrar na fila, **Then** precisa concluir a etapa 1 do cadastro (spec 003).
5. **Given** uma entrada na fila, **When** o consumidor agenda o mesmo serviço por outro caminho no período, **Then** a entrada é encerrada automaticamente.

---

### User Story 2 - Vaga oferecida à fila e agendada em minutos (Priority: P1)

Como consumidor na fila, quero receber o aviso de vaga com tempo para aceitar e agendar em poucos toques; como estabelecimento, quero que a vaga seja oferecida de forma justa e preenchida rápido.

**Why this priority**: é a reposição do horário da J6 e o núcleo da J2 para a fila.

**Independent Test**: com 5 consumidores na fila compatível, cancelar um agendamento; conferir que os 3 primeiros recebem a oferta, que o primeiro a aceitar fica com o horário, que os outros dois são avisados de que a vaga foi preenchida, e que nenhum horário é ocupado duas vezes.

**Acceptance Scenarios**:

1. **Given** um horário que ficou livre (cancelamento, remarcação, não comparecimento antecipado, folga revogada, nova escala) **When** o evento chega, **Then** o sistema procura entradas compatíveis na fila: serviço que cabe no tempo livre (spec 008), profissional igual ou "qualquer", filial e período desejados.
2. **Given** entradas compatíveis, **When** a oferta é disparada, **Then** vai para as 3 primeiras pela ordem de entrada na fila, ao mesmo tempo, com prazo de 15 minutos para aceitar.
3. **Given** a oferta, **When** um consumidor aceita, **Then** o horário é segurado (spec 008) e o fluxo normal de agendamento segue (resumo, política, pagamento quando exigido, confirmação; spec 009), com origem "fila de espera".
4. **Given** o horário já aceito por outro, **When** um segundo consumidor tenta aceitar, **Then** vê "a vaga já foi preenchida" e continua na fila.
5. **Given** ninguém aceita em 15 minutos, **When** o prazo vence, **Then** a oferta vai para os 3 seguintes, até acabar a fila ou faltar menos que a antecedência mínima do negócio (REQ-AGD-003).
6. **Given** um horário que fica livre com menos de 2 horas de antecedência, **When** a oferta sai, **Then** o prazo de aceite cai para 5 minutos.
7. **Given** os avisos de vaga, **When** enviados, **Then** são avisos transacionais (spec 011), pedidos pelo próprio consumidor; não exigem opt-in de promoção.

---

### User Story 3 - Recepção encaixa pela fila (Priority: P1)

Como Recepção, quero ver, para cada horário livre do dia, quem está na fila e pode encaixar, e agendar essa pessoa diretamente.

**Why this priority**: tela "Fila de espera e encaixe" (DF 9.3); muitos estabelecimentos preferem ligar para o cliente.

**Independent Test**: com um horário livre e duas entradas compatíveis, abrir a tela de encaixe, agendar uma delas manualmente e conferir que a oferta automática não é enviada para aquele horário.

**Acceptance Scenarios**:

1. **Given** a tela "Fila de espera e encaixe", **When** a Recepção abre, **Then** vê os horários livres do dia e da semana da filial e, para cada um, as entradas compatíveis da fila, por ordem.
2. **Given** um horário livre, **When** a Recepção agenda uma entrada da fila, **Then** o agendamento é criado como manual com origem "fila de espera" (spec 009), e a entrada é encerrada.
3. **Given** o negócio, **When** o Proprietário escolhe "oferta automática à fila" desligada (padrão: ligada), **Then** nenhuma oferta é enviada sozinha, e a fila serve só para encaixe manual.
4. **Given** a Recepção, **When** abre a fila, **Then** vê o nome e o celular de quem está na fila do próprio negócio, nunca de outros negócios.

---

### User Story 4 - Regra de horário ocioso (Priority: P2)

Como Proprietário, quero configurar uma regra que ofereça automaticamente, com desconto, os horários que vão ficar vazios, a consumidores que aceitaram receber ofertas, para encher a agenda sem desvalorizar o preço normal (`[D15]`).

**Why this priority**: é a segunda metade da J2 e uma fonte de receita da Koovela (DF 5.2); vem depois da fila porque envolve desconto, taxa e opt-in.

**Independent Test**: configurar a regra "horários livres nas próximas 24 horas, terça a quinta, desconto de 20%, só para quem já foi atendido nos últimos 90 dias"; com uma agenda de teste, conferir quais consumidores recebem a oferta e com qual preço.

**Acceptance Scenarios**:

1. **Given** a tela "Regra de horário ocioso", **When** o Proprietário configura, **Then** define: serviços e profissionais elegíveis, dias e faixas de horário, antecedência (oferecer horários que começam entre X e Y horas à frente), desconto, consumidores elegíveis e limite de ofertas por consumidor, dentro dos limites configurados no back-office (`[PEN-18]` resolvido: tudo configurável); valores iniciais: elegíveis = atendidos nos últimos 180 dias ou na fila; desconto máximo de 50%; oferta entre 2 e 48 horas à frente; no máximo 2 ofertas por consumidor por semana por negócio. Em saúde, a regra de horário ocioso com desconto não existe (PEN-06).
2. **Given** a regra ligada, **When** a tela mostra a taxa de horário ocioso da Koovela (configurada no back-office), **Then** o Proprietário vê o valor e um exemplo ("num corte de R$ 60 com 20% de desconto, você recebe R$ X") antes de ligar.
3. **Given** a regra ligada, **When** um horário elegível continua livre ao entrar na janela de antecedência, **Then** a oferta é enviada aos consumidores elegíveis que deram opt-in para ofertas, respeitando o limite por consumidor; quem está na fila daquele horário recebe primeiro, pela História 2.
4. **Given** a oferta, **When** o consumidor aceita, **Then** agenda pelo fluxo normal com o preço com desconto congelado e origem "horário ocioso".
5. **Given** o mesmo horário, **When** já foi preenchido, **Then** quem tentar aceitar vê "a vaga já foi preenchida".
6. **Given** a regra, **When** o Proprietário a desliga, **Then** nenhuma oferta nova sai; as já aceitas seguem normalmente.

---

### User Story 5 - Consumidor escolhe receber ofertas (Priority: P2)

Como consumidor, quero escolher se recebo ofertas de horários com desconto, de quais estabelecimentos e por qual canal, e sair a qualquer momento.

**Why this priority**: oferta com desconto é comunicação promocional; sem opt-in explícito, viola a CONST IV e a LGPD.

**Independent Test**: depois de um agendamento, aceitar receber ofertas daquele negócio por push; conferir que a oferta chega; desligar no perfil e conferir que não chega mais.

**Acceptance Scenarios**:

1. **Given** a tela de confirmação de um agendamento (spec 009), **When** exibida, **Then** pergunta se o consumidor quer receber ofertas de horários vagos daquele estabelecimento; a resposta padrão é "não".
2. **Given** "Perfil e notificações" (spec 011), **When** o consumidor abre "Ofertas", **Then** vê os estabelecimentos de que aceitou ofertas e os canais, e pode desligar cada um.
3. **Given** uma oferta recebida, **When** o consumidor usa o descadastro, **Then** deixa de receber ofertas daquele estabelecimento naquele canal, em um clique.
4. **Given** o opt-in, **When** registrado, **Then** guarda estabelecimento, canal, versão do texto aceito e horário.

---

### User Story 6 - Taxa de horário ocioso e resultado (Priority: P3)

Como Proprietário, quero ver quanto a regra trouxe de receita e quanto paguei de taxa; como Koovela, quero cobrar a taxa de horário ocioso só sobre o que veio da oferta.

**Why this priority**: DF 3.2.3 ("receita de ocioso") e DF 5.2 (taxa); mede se a regra compensa o desconto.

**Independent Test**: com agendamentos de teste vindos da regra, abrir o painel e conferir receita, descontos dados, taxa e comparação com a ocupação anterior.

**Acceptance Scenarios**:

1. **Given** um agendamento com origem "horário ocioso" concluído e pago, **When** o split é calculado (spec 012), **Then** a taxa de horário ocioso é aplicada como parte da Koovela, conforme a forma de cobrança decidida para as taxas da Koovela (`[PEN-09]`).
2. **Given** um agendamento com origem "fila de espera", **When** cobrado, **Then** não tem taxa de horário ocioso nem desconto, salvo se também veio de uma oferta da regra.
3. **Given** o painel da regra, **When** o Proprietário abre, **Then** vê, por período: ofertas enviadas, aceitas, agendamentos concluídos, receita, descontos concedidos e taxa paga.

---

### Edge Cases

- **Horário livre que só cabe um serviço mais curto**: só entradas e ofertas de serviços que cabem inteiros (com preparo e limpeza) são consideradas.
- **Consumidor da fila que é o mesmo que cancelou o horário**: não recebe a oferta daquele horário.
- **Oferta aceita e pagamento não concluído**: o horário volta a ser oferecido ao próximo grupo (REQ-AGD-032).
- **Vários horários livres para a mesma entrada**: o consumidor recebe uma oferta com até 3 opções.
- **Consumidor com limite de agendamentos futuros** (REQ-AGE-017) atingido: não recebe ofertas daquele negócio.
- **Consumidor com N faltas e regra de sinal** (spec 010): a oferta mostra que haverá sinal.
- **Horário de silêncio** (REQ-NOT-013): avisos de vaga com aceite curto (horário em menos de 3 horas) podem sair no silêncio; ofertas de horário ocioso nunca saem no silêncio.
- **Oferta de horário ocioso para quem está na fila**: a fila tem prioridade e recebe o aviso de vaga sem desconto; o desconto só vai para quem está na fila se a regra de horário ocioso também o alcançar.
- **Desconto em combo**: aplicado sobre o preço do combo e rateado por etapa (REQ-CAT-034).
- **Pacote de sessões**: um agendamento coberto por pacote não recebe desconto de horário ocioso.
- **Tenant suspenso ou filial pausada**: nenhuma oferta sai.

---

## Requirements *(mandatory)*

Formato: `REQ-FIL-NNN (origem: …)`.

### Functional Requirements

**Fila de espera**

- **REQ-FIL-001** (origem: DF 6 `FilaEspera` | D15): A entrada na fila DEVE ter consumidor, serviço ou combo, profissional (ou qualquer), filial, período desejado (datas e faixa do dia ou horário específico), ordem de entrada e estado.
- **REQ-FIL-002** (origem: D15): A entrada DEVE valer até o fim do período desejado, no máximo 30 dias; o consumidor DEVE poder sair a qualquer momento.
- **REQ-FIL-003** (origem: CONST 5 antifraude): Um consumidor NÃO DEVE ter mais de 3 entradas ativas por negócio.
- **REQ-FIL-004** (origem: J2): A entrada DEVE ser encerrada automaticamente quando o consumidor agendar o mesmo serviço no período por outro caminho.

**Detecção de vaga e oferta à fila**

- **REQ-FIL-010** (origem: J2 | J6 | REQ-POL-028): A detecção de vaga DEVE ouvir os eventos de liberação de horário (cancelamento, remarcação, cancelamento tardio, liberação de reserva temporária, mudança de escala ou folga revogada) e procurar entradas compatíveis.
- **REQ-FIL-011** (origem: CONST I | REQ-AGD-001): Entrada compatível é aquela cujo serviço cabe inteiro no tempo livre (com preparo e limpeza), com profissional igual ou "qualquer", na filial e no período desejados.
- **REQ-FIL-012** (origem: J2): A oferta DEVE ir para as 3 primeiras entradas compatíveis, ao mesmo tempo, com prazo de aceite de 15 minutos (5 minutos quando o horário começa em menos de 2 horas), seguindo para as 3 seguintes ao vencer, até acabar a fila ou passar a antecedência mínima.
- **REQ-FIL-013** (origem: CONST I): O aceite DEVE segurar o horário pela spec 008; só o primeiro aceite vence; os demais veem "a vaga já foi preenchida" e continuam na fila.
- **REQ-FIL-014** (origem: J2 | REQ-AGE-010): O aceite DEVE seguir o fluxo normal da spec 009 (política, pagamento quando exigido, confirmação), com origem "fila de espera".
- **REQ-FIL-015** (origem: CONST IV): Avisos de vaga da fila DEVEM ser transacionais (spec 011), sem exigir opt-in de promoção; o consumidor que cancelou o horário não recebe a oferta dele.
- **REQ-FIL-016** (origem: DF 9.3): O Proprietário DEVE poder desligar a oferta automática à fila (padrão: ligada).

**Encaixe pela equipe**

- **REQ-FIL-020** (origem: DF 9.3 "Fila de espera e encaixe"): A tela DEVE mostrar os horários livres do dia e da semana da filial com as entradas compatíveis por ordem, e permitir agendar uma entrada diretamente.
- **REQ-FIL-021** (origem: J2): O encaixe manual DEVE criar agendamento manual com origem "fila de espera", encerrar a entrada e impedir a oferta automática para aquele horário.

**Regra de horário ocioso**

- **REQ-FIL-030** (origem: D15 | DF 10.6): A regra DEVE ser configurável por negócio, com: serviços e profissionais elegíveis, dias e faixas de horário, janela de antecedência, desconto, consumidores elegíveis e limite de ofertas por consumidor.
- **REQ-FIL-031** (origem: PEN-18 | DF 10.6 | CONST 8): Elegibilidade, desconto máximo, antecedência e limite de ofertas DEVEM ser configuráveis no back-office e, dentro desses limites, pelo negócio; os valores iniciais estão na História 4; em saúde, ofertas com desconto NÃO DEVEM existir.
- **REQ-FIL-032** (origem: J2): Horário elegível ainda livre ao entrar na janela de antecedência DEVE gerar oferta para os consumidores elegíveis com opt-in, respeitando o limite por consumidor; a fila daquele horário tem prioridade.
- **REQ-FIL-033** (origem: CONST III): O preço com desconto DEVE ser calculado em centavos, arredondado para baixo, e congelado no agendamento; a comissão usa a base escolhida no `[D17]` (spec 007).
- **REQ-FIL-034** (origem: CONST XI): A tela da regra DEVE mostrar a taxa de horário ocioso e um exemplo numérico do valor líquido antes de ligar.
- **REQ-FIL-035** (origem: edge case): Ofertas de horário ocioso NÃO DEVEM sair no horário de silêncio, nem para agendamentos cobertos por pacote, nem para consumidores no limite de agendamentos futuros.

**Opt-in de ofertas**

- **REQ-FIL-040** (origem: CONST IV | D32): Ofertas de horário ocioso DEVEM ser enviadas só a consumidores com opt-in explícito para ofertas daquele estabelecimento e por canal; o padrão é "sem opt-in".
- **REQ-FIL-041** (origem: CONST IV): O opt-in DEVE ser oferecido na confirmação do agendamento e gerido em "Perfil e notificações", com descadastro em um clique em cada oferta.
- **REQ-FIL-042** (origem: CONST IV): O opt-in DEVE registrar estabelecimento, canal, versão do texto aceito e horário.

**Taxa e resultado**

- **REQ-FIL-050** (origem: DF 5.2 | D15 | REQ-PAG-041): Agendamentos com origem "horário ocioso" concluídos e pagos DEVEM gerar a taxa de horário ocioso da Koovela, com valor configurável no back-office (versionado) e forma de cobrança igual à decidida no `[PEN-09]` para as taxas da Koovela.
- **REQ-FIL-051** (origem: J2): Agendamentos com origem "fila de espera" NÃO DEVEM ter taxa de horário ocioso nem desconto, salvo quando também vieram de oferta da regra.
- **REQ-FIL-052** (origem: DF 3.2.3): O painel da regra DEVE mostrar ofertas enviadas, aceitas, agendamentos concluídos, receita, descontos e taxa, por período.

**Contratos, isolamento e eventos**

- **REQ-FIL-060** (origem: CONST II): Fila, regra, ofertas e opt-ins de um negócio ficam no espaço de dados do tenant; o opt-in também é visível ao consumidor no perfil global, sem que um tenant veja os de outro.
- **REQ-FIL-061** (origem: CONST IX): Os avisos e ofertas DEVEM ser idempotentes por horário e consumidor (nunca duas ofertas do mesmo horário para a mesma pessoa).
- **REQ-FIL-062** (origem: CONST 6): A oferta à fila DEVE sair em até 1 minuto após a liberação do horário.

### Key Entities

- **Entrada na fila de espera** (`waitlist_entry`): consumidor, serviço ou combo, profissional, filial, período desejado, ordem, estado.
- **Oferta**: horário (filial, profissional, início, serviço), destinatários, rodada, prazo de aceite, origem (fila ou horário ocioso), desconto, estado, quem aceitou.
- **Regra de horário ocioso** (versionada): negócio, serviços, profissionais, dias e faixas, janela de antecedência, desconto, elegibilidade, limite por consumidor, ligada (sim ou não).
- **Opt-in de ofertas**: consumidor, estabelecimento, canal, versão do texto, horário, revogação.
- **Limites da plataforma** (back-office, versionados): desconto máximo, antecedência mínima, limite por consumidor, critério de elegibilidade, taxa de horário ocioso.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor (DF 9.1) | Fila de espera e aviso de vaga · pergunta de opt-in na Confirmação · Ofertas em "Perfil e notificações" | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Fila de espera | `W..` registrado no plano |
| Painel (DF 9.3) | Fila de espera e encaixe · Regra de horário ocioso | Registrados no plano |
| Back-office | Limites da plataforma e taxa de horário ocioso | Registrado no plano |

A tela de oferta de horário ocioso para o consumidor e o painel de resultado da regra precisam ser conferidos no protótipo.

---

## Regras e estados

- **Entrada na fila**: `ativa` → `ofertada` (em rodada) → `atendida` (agendou) | `ativa` (não aceitou ou perdeu a vaga) · `ativa` → `encerrada` (saiu, venceu, agendou por outro caminho).
- **Oferta**: `enviada` → `aceita` (primeiro aceite) | `expirada` (prazo) | `preenchida` (outro aceitou) | `cancelada` (horário ocupado por outro caminho).
- **Prioridade**: para um horário livre, primeiro a fila (sem desconto); depois, se o horário for elegível e entrar na janela de antecedência, a regra de horário ocioso (com desconto).
- **Rodadas da fila**: 3 destinatários por vez; 15 minutos de prazo (5 minutos com menos de 2 horas de antecedência).
- **Opt-in**: `não` (padrão) → `sim` por estabelecimento e canal → `revogado`.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Entrada na fila (consumidor, serviço, período desejado) | Pessoal | Execução de contrato a pedido do titular (art. 7, V) | 90 dias após encerrada | O próprio consumidor; equipe da filial |
| Opt-in de ofertas | Pessoal | Consentimento (art. 7, I) | Enquanto válido + 5 anos como prova do consentimento | O próprio consumidor; Proprietário (só se aceitou, sem detalhes de outros negócios) |
| Elegibilidade (histórico de atendimento no negócio) | Pessoal | Consentimento dado no opt-in | Igual ao agendamento | Processamento automático; equipe da filial |
| Ofertas enviadas e aceitas | Pessoal | Consentimento (horário ocioso) ou execução de contrato (fila) | 12 meses | O próprio consumidor; Proprietário (agregado) |

Regras: a elegibilidade usa só o histórico do próprio negócio, nunca de outros tenants; ofertas não mencionam serviços "discretos" (REQ-NOT-033) e nunca existem para serviços de saúde, onde nenhum preço aparece (`[PEN-06]` decidido na spec 005).

---

## Permissões

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte |
|---|---|---|---|---|---|---|
| Entrar e sair da fila; aceitar oferta; gerir opt-in | ✔ | — | — | — | — | — |
| Ver fila e encaixar | — | ✔ (própria agenda) | ✔ filial | ✔ filial | ✔ | ✔* |
| Ligar e desligar oferta automática à fila | — | — | — | — | ✔ | — |
| Configurar regra de horário ocioso | — | — | — | — | ✔ | — |
| Ver resultado da regra | — | — | — | ✔ filial | ✔ | — |
| Configurar limites da plataforma e taxa | — | — | — | — | — | Gestão (Comercial/Growth com aprovação do Financeiro/Ops) |

`✔*` = apenas em sessão de suporte (spec 003). O Gerente vê o resultado financeiro da regra só da própria filial (`[PEN-03]` decidido na spec 003).

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `scheduling.waitlist.joined.v1` / `.left.v1` / `.fulfilled.v1` | Ciclo da entrada na fila |
| `scheduling.offer.sent.v1` / `.accepted.v1` / `.expired.v1` / `.filled.v1` | Ciclo da oferta |
| `scheduling.idle_rule.changed.v1` | Regra de horário ocioso alterada |
| `scheduling.offers_opt_in.granted.v1` / `.revoked.v1` | Opt-in de ofertas |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Horários liberados que foram repostos (fila ou regra) | DF 3.2.3 · J6 | Acompanhada |
| Tempo da liberação ao novo agendamento (mediana) | J2 | Acompanhada |
| Conversão da fila (entradas → agendamentos) | J2 | Acompanhada |
| Receita de horário ocioso; descontos concedidos; taxa | DF 3.2.3 · DF 5.2 | Acompanhada |
| Ocupação da agenda antes e depois de ligar a regra | DF 3.2.3 · DF 14 | Acompanhada |
| Taxa de opt-in de ofertas e de descadastro | CONST IV | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A oferta de um horário liberado chega aos consumidores da fila em até 1 minuto em 95% dos casos.
- **SC-002**: Nenhum horário é ocupado duas vezes quando vários consumidores aceitam a mesma oferta, em 100% dos testes de concorrência.
- **SC-003**: Nenhuma oferta de horário ocioso é enviada a consumidor sem opt-in, verificado por teste automatizado.
- **SC-004**: O consumidor aceita uma oferta e chega à confirmação em até 2 minutos (mediana), com conta e sem pagamento.
- **SC-005**: A Recepção encaixa alguém da fila num horário livre em até 30 segundos.
- **SC-006**: Nenhum agendamento vindo só da fila tem desconto ou taxa de horário ocioso.
- **SC-007**: O Proprietário vê, no painel da regra, a receita, os descontos e a taxa do mês em até 2 toques.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-18** — parâmetros do horário ocioso (elegibilidade, desconto máximo, antecedência, limite por consumidor) | Regra do tenant, limites da plataforma, receita da taxa | **Resolvido (clarify 2026-11-25)**: tudo configurável |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-09** — forma de cobrança das taxas da Koovela | Spec 012 | A taxa de horário ocioso segue a mesma forma |
| **PEN-06** — publicidade em saúde | Spec 005 | Decidido: sem ofertas com desconto em saúde |
| **PEN-08** / **PEN-30** — valores | Back-office | Taxa e limites configuráveis, sem valor fixo no código |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Oferta à fila | ASSUMIDO: 3 destinatários por rodada, 15 minutos de prazo (5 com menos de 2 horas) |
| Prioridade | ASSUMIDO: a fila vem antes da regra de horário ocioso |
| Natureza das mensagens | ASSUMIDO: aviso de vaga da fila é transacional; oferta de horário ocioso é promocional e exige opt-in |
| Limites da fila | ASSUMIDO: 3 entradas ativas por consumidor e negócio, 30 dias de validade |

---

## Fora do escopo desta especificação

- Cálculo de horários e proteção contra reserva dupla (spec 008).
- Envio dos avisos e ofertas (spec 011) e cobrança da taxa (spec 012).
- Campanhas de CRM com segmentos e cotas (spec 028).
- Cupons e promoções fora do horário ocioso.
- Fila de espera para turmas (não existe, `[D30]`).
- Destaque pago na vitrine (spec 032).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: fila de até 30 dias e 3 entradas por consumidor e negócio; 3 destinatários por rodada; prazo de aceite de 15 minutos (5 com menos de 2 horas); oferta em até 1 minuto; padrões provisórios da regra (180 dias, 50%, 2 a 48 horas, 2 ofertas por semana).
- A elegibilidade "já atendido no negócio" usa só agendamentos concluídos daquele negócio.
- A taxa de horário ocioso é cobrada só sobre agendamentos concluídos e pagos; cancelados e faltas não geram taxa.
- O domínio dono desta spec é `scheduling` (CONST 4.4), que inclui "fila de espera, horário ocioso".
