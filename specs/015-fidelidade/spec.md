# Feature Specification: Fidelidade com pontos, tiers e simulador

**Feature Branch**: `015-fidelidade`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "015 fidelidade — seguir a sequência da constituição (seção 10): J8, simulador, tiers. Depende de 012. Pendências PEN-16 e PEN-17. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0 (com o modelo preparado para o titular que acumula pelos atendidos da fase 2, `[D28]`)

**Superfícies afetadas**: app do consumidor e web do consumidor ("Fidelidade: pontos, tier e catálogo"; resgate no checkout) · painel do cliente ("Fidelidade: regra, tiers, catálogo e simulador"; resgate no balcão) · app do colaborador e `/pro` (resgate no check-out) · back-office (limites da plataforma e alertas de abuso)

**Depende de**: 012 `pagamentos-split` (e, por ela, 002 a 011)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios III, IV, V, seções 4.4 (`loyalty`), 5, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.1.3, 3.2.4, 3.2.6, 6, 6.1 (invariante 4), 7, 8 (J1, J8), 9.1, 9.3, 9.8, 10.5, 12, 16 e 18 (`[PEN-03]`, `[PEN-06]`, `[PEN-16]`, `[PEN-17]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A fidelidade com pontos e níveis (tiers) está na v1.0 `[D09]`. Para o consumidor, é "receber benefícios por fidelidade" (DF 3.1.3); para o estabelecimento, é "reter clientes" (DF 3.2.4), mas com uma condição: **benefícios sustentáveis financeiramente** (DF 3.2.6). Programa de pontos sem conta feita vira desconto permanente que come a margem.

Por isso o Documento Fundamental exige (DF 10.5):

- regra de acúmulo, níveis com critério de subida e de queda, catálogo de recompensas, expiração de pontos e **teto de custo mensal**;
- **simulador obrigatório antes de ativar**;
- painel que compara o **custo do benefício com a receita incremental** atribuída.

A J8 (DF 8) descreve o fluxo: regra, tiers e catálogo definidos pelo tenant → simulação de custo → acúmulo por atendimento pago → subida de tier → resgate no checkout → medição de custo contra receita incremental.

Duas decisões estão abertas: a **mecânica concreta dos pontos** (`[PEN-16]`) e se o **saldo é por filial ou por negócio** (`[PEN-17]`). Pela constituição, saldo de pontos nunca fica negativo e toda mudança é lançamento num livro-razão (CONST III; DF 6.1, invariante 4).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.3 | Receber benefícios por fidelidade | Usuários com saldo ativo; recompra em 90 dias |
| 3.2.4 | Reter clientes | Recompra em 30, 60 e 90 dias |
| 3.2.6 | Benefícios sustentáveis financeiramente | Custo do benefício / receita incremental |
| DF 16 | Fraude e abuso de pontos | Teto de custo, expiração, auditoria de resgate |

Personas: consumidor; Proprietário (configura); Gerente (`[PEN-03]`); Recepção e Colaborador (resgate no balcão); Gestão (limites e abuso).

---

## Clarifications

### Session 2026-11-25

- Q: Como fica a fidelidade em saúde e para o Gerente? → A: Saúde (PEN-06, decidido na spec 005): o preço nunca aparece em nenhum lugar; taxa de agendamento fixa abatida do valor do atendimento; fica restrito só o que mostra preço. Fidelidade disponível sem desconto em dinheiro. Gerente (PEN-03, decidido na spec 003): vê faturamento e configura fidelidade só da própria filial; o Proprietário pode retirar.
- Q: Qual é a mecânica de pontos e quais os limites? (PEN-16) → A: O negócio escolhe entre pontos por real pago (padrão 1 ponto por R$ 1) e pontos por visita (cartão de selos: a cada N atendimentos, uma recompensa); validade padrão de 12 meses; teto de custo definido pelo negócio; limites configuráveis no back-office.
- Q: O saldo de pontos é por filial ou por negócio? (PEN-17) → A: O negócio escolhe: saldo único em todas as filiais ou saldo por filial.
- Q: O Gerente configura a fidelidade da filial? (PEN-03) → A: Sim, só da própria filial; o Proprietário pode retirar a permissão.
- Q: Como fica a fidelidade em saúde? (PEN-06) → A: Disponível, mas sem recompensa em desconto em dinheiro (recompensas só em serviço ou brinde), porque nenhum preço aparece.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar o programa e simular antes de ativar (Priority: P1)

Como Proprietário, quero definir como o consumidor ganha pontos, os níveis, o catálogo de recompensas, a expiração e o teto de custo mensal, e ver no simulador quanto o programa vai custar e quanto pode trazer, antes de ligar.

**Why this priority**: o simulador é obrigatório antes de ativar (DF 10.5); sem regra não há programa.

**Independent Test**: com o histórico de atendimentos de um negócio de teste, configurar um programa, rodar o simulador e conferir o custo estimado por mês, o ponto de equilíbrio e que o botão "ativar" só aparece depois da simulação.

**Acceptance Scenarios**:

1. **Given** a tela "Fidelidade", **When** o Proprietário configura o acúmulo, **Then** escolhe a mecânica: pontos por real pago (padrão 1 ponto por R$ 1, com bônus fixo opcional por atendimento) ou pontos por visita (cartão de selos: a cada N atendimentos, uma recompensa); define validade (padrão 12 meses) e teto de custo mensal, dentro dos limites configurados no back-office (`[PEN-16]` resolvido).
2. **Given** os tiers, **When** o Proprietário os define (até 4, por exemplo Bronze, Prata, Ouro, Diamante), **Then** cada tier tem um critério de entrada (pontos ganhos nos últimos 12 meses) e benefícios (multiplicador de acúmulo de 1,0 a 2,0 e um texto de vantagem); a queda acontece na revisão anual de cada consumidor.
3. **Given** o catálogo, **When** o Proprietário cria recompensas, **Then** cada uma tem tipo (serviço grátis, desconto em reais num serviço, desconto percentual num serviço), custo em pontos, valor em reais para o estabelecimento, tier mínimo, estoque mensal opcional e validade.
4. **Given** a configuração, **When** o Proprietário abre o simulador, **Then** vê, com base nos últimos 6 meses de atendimentos do negócio (ou em números que ele informar, se o negócio é novo): pontos emitidos por mês, custo estimado de resgate por mês, valor dos pontos em aberto, e quanto de receita a mais (recompra) seria necessária para empatar.
5. **Given** o simulador ainda não rodado com a configuração atual, **When** o Proprietário tenta ativar, **Then** não consegue; cada mudança na regra exige nova simulação antes de valer.
6. **Given** o teto de custo mensal, **When** configurado, **Then** é obrigatório e aparece no simulador.
7. **Given** um negócio de saúde, **When** o Proprietário abre "Fidelidade", **Then** o programa está disponível, mas as recompensas só podem ser serviços ou brindes, nunca desconto em dinheiro, e nenhuma tela mostra preço (`[PEN-06]` decidido na spec 005).

---

### User Story 2 - Consumidor acumula pontos ao ser atendido e pagar (Priority: P1)

Como consumidor, quero ganhar pontos automaticamente a cada atendimento pago e ver meu saldo, meu nível e quanto falta para o próximo.

**Why this priority**: é o "acúmulo por atendimento pago" da J8 e o último passo da J1 ("pontos creditados").

**Independent Test**: concluir e pagar um atendimento de R$ 80 num programa de 1 ponto por real; conferir 80 pontos no app; estornar o pagamento e conferir que os pontos são retirados.

**Acceptance Scenarios**:

1. **Given** um programa ativo, **When** um atendimento é concluído e pago (spec 009 e 012), **Then** o consumidor recebe os pontos da regra congelada no agendamento (REQ-AGE-015), multiplicados pelo tier dele, e é avisado (spec 011).
2. **Given** o valor que gera pontos, **When** calculado, **Then** é o valor efetivamente pago (sem a parte coberta por resgate de pontos), arredondado para baixo em pontos inteiros.
3. **Given** um pagamento registrado no local (REQ-PAG-030), **When** o negócio permitir pontos em pagamento no local (padrão: permite), **Then** os pontos são creditados igualmente; quando não permitir, só pagamentos pela plataforma geram pontos.
4. **Given** um estorno total ou parcial do pagamento (spec 012), **When** acontece, **Then** os pontos correspondentes são retirados por lançamento; se o consumidor já usou esses pontos, o saldo pode ficar com dívida registrada, que será abatida de pontos futuros, mas o saldo disponível exibido nunca é negativo.
5. **Given** "Fidelidade" no app, **When** o consumidor abre, **Then** vê saldo, tier, progresso para o próximo tier, pontos que vencem nos próximos 30 dias, catálogo disponível para o tier dele e histórico de lançamentos.
6. **Given** pontos a vencer em 30 dias, **When** o prazo chega, **Then** o consumidor é avisado; no vencimento, os pontos mais antigos expiram primeiro.

---

### User Story 3 - Resgatar recompensa no checkout ou no balcão (Priority: P1)

Como consumidor, quero usar meus pontos para trocar por uma recompensa ao agendar pelo app ou no balcão do estabelecimento.

**Why this priority**: é o "resgate no checkout" da J8; sem resgate, ponto não tem valor percebido.

**Independent Test**: com 500 pontos, agendar um serviço escolhendo a recompensa "R$ 20 de desconto" (300 pontos); conferir a reserva dos pontos, o preço com desconto e o consumo ao concluir; cancelar outro agendamento com resgate e conferir a devolução.

**Acceptance Scenarios**:

1. **Given** o resumo do agendamento (spec 009), **When** o consumidor tem pontos e há recompensa aplicável ao serviço, **Then** pode escolher uma recompensa; o preço com o resgate e o saldo restante aparecem antes de confirmar.
2. **Given** a confirmação com resgate, **When** feita, **Then** os pontos ficam reservados; ao concluir o atendimento, são consumidos; ao cancelar dentro da política, voltam ao saldo.
3. **Given** um não comparecimento com resgate, **When** marcado (spec 010), **Then** os pontos reservados voltam ao saldo, e a multa da política é calculada sobre o preço cheio.
4. **Given** o resgate no balcão, **When** a Recepção ou o Colaborador aplica uma recompensa no check-out, **Then** o consumidor confirma no próprio celular (aviso no app ou código OTP); sem confirmação, o resgate não acontece.
5. **Given** uma recompensa com estoque mensal esgotado ou o teto de custo do mês atingido, **When** o consumidor tenta resgatar, **Then** vê que a recompensa está indisponível este mês, sem perder os pontos.
6. **Given** pedidos simultâneos de resgate que levariam o saldo abaixo de zero, **When** processados, **Then** só o que cabe é aceito (CONST III).
7. **Given** um resgate "serviço grátis", **When** concluído, **Then** o atendimento é registrado com valor pago zero e o valor da recompensa como custo do programa; a comissão segue a base escolhida no `[D17]` (spec 007).

---

### User Story 4 - Painel de resultado: custo contra receita incremental (Priority: P2)

Como Proprietário, quero ver quanto o programa custou e quanto trouxe, para decidir se ajusto a regra.

**Why this priority**: DF 3.2.6 e DF 10.5 ("o painel compara custo do benefício com receita incremental atribuída").

**Independent Test**: com 3 meses de dados de teste, abrir o painel e conferir custo de resgates, pontos em aberto, recompra dos participantes contra a dos não participantes e a razão custo/receita.

**Acceptance Scenarios**:

1. **Given** o painel, **When** o Proprietário abre, **Then** vê por mês: pontos emitidos, resgatados e expirados; custo dos resgates em reais; valor dos pontos em aberto; consumidores com saldo ativo; e uso do teto de custo.
2. **Given** a receita incremental, **When** calculada, **Then** compara a recompra em 90 dias e o gasto médio dos participantes com os de consumidores do mesmo negócio que não participam (ou com o período anterior à ativação), e mostra a razão custo do benefício / receita incremental, com a explicação do método.
3. **Given** o teto de custo mensal, **When** 80% for atingido, **Then** o Proprietário é avisado; a 100%, o catálogo é pausado até o mês seguinte e os consumidores veem "recompensas disponíveis a partir de {data}".

---

### User Story 5 - Saldo em rede com várias filiais (Priority: P2)

Como consumidor de uma rede, quero saber onde posso usar meus pontos; como Proprietário de rede, quero que o programa funcione do jeito que decidi para as filiais.

**Why this priority**: `[PEN-17]`; muda o modelo de saldo e o que o consumidor vê.

**Independent Test**: com uma rede de 2 filiais, acumular pontos na filial A e tentar resgatar na B; conferir o resultado conforme a decisão.

**Acceptance Scenarios**:

1. **Given** uma rede com várias filiais, **When** o consumidor acumula e resgata, **Then** o saldo segue a escolha do Proprietário: único no negócio (válido em todas as filiais, com o custo do resgate atribuído à filial onde a recompensa foi usada) ou por filial (`[PEN-17]` resolvido).
2. **Given** um Gerente de filial, **When** tenta configurar o programa, **Then** é permitido só para a própria filial, salvo se o Proprietário tiver retirado a permissão (`[PEN-03]` decidido na spec 003).

---

### User Story 6 - Ajustes e proteção contra abuso (Priority: P3)

Como Proprietário, quero ajustar pontos com motivo (por exemplo, compensar um problema); como Gestão, quero detectar abuso (acúmulo fora do normal, resgate em sequência, conluio entre equipe e consumidor).

**Why this priority**: DF 12 e DF 16 ("fraude e abuso de pontos": teto de custo, expiração, auditoria de resgate).

**Independent Test**: fazer um ajuste manual com motivo e conferir o registro na trilha de auditoria; registrar vários pagamentos no local de valores altos para o mesmo consumidor no mesmo dia e conferir o alerta.

**Acceptance Scenarios**:

1. **Given** um consumidor, **When** o Proprietário faz um ajuste manual (crédito ou débito) com motivo, **Then** vira lançamento e registro na trilha de auditoria; ajustes acima de 1.000 pontos exigem reautenticação com segundo fator.
2. **Given** padrões de abuso (mais de 3 atendimentos pagos no local para o mesmo consumidor no mesmo dia, acúmulo semanal acima de 5 vezes a média do negócio, resgates sucessivos sem atendimento concluído entre eles), **When** detectados, **Then** geram alerta ao Proprietário e à Gestão (spec 021), e os pontos envolvidos ficam pendentes até revisão.
3. **Given** a conta do consumidor, **When** ele pede exclusão (spec 003), **Then** os pontos são encerrados sem conversão em dinheiro.

---

### Edge Cases

- **Mudança da regra com pontos já acumulados**: os pontos existentes continuam; a nova regra vale para novos agendamentos (regra congelada no agendamento); mudanças que reduzem benefícios de tier valem a partir da próxima revisão anual de cada consumidor, com aviso de 30 dias.
- **Programa desligado pelo Proprietário**: o acúmulo para; os pontos existentes continuam resgatáveis por 90 dias, com aviso aos consumidores.
- **Recompensa removida do catálogo**: resgates já reservados continuam válidos.
- **Combo**: os pontos são calculados sobre o valor pago do combo.
- **Pacote de sessões**: os pontos são gerados na compra do pacote (valor pago), não em cada sessão.
- **Preço "a partir de"**: os pontos usam o valor final pago.
- **Atendimento com valor zero**: não gera pontos.
- **Dependentes da fase 2** (`[D28]`): os pontos dos atendidos vão para o titular; o modelo já liga o lançamento ao titular pagante.
- **Consumidor em dois negócios do mesmo tenant**: programas e saldos independentes por negócio.
- **Arredondamento**: pontos sempre inteiros, arredondados para baixo; o valor em reais do custo é calculado em centavos.

---

## Requirements *(mandatory)*

Formato: `REQ-FID-NNN (origem: …)`.

### Functional Requirements

**Configuração e simulador**

- **REQ-FID-001** (origem: D09 | DF 6 `ProgramaFidelidade` | DF 10.5): O programa DEVE ser configurado por negócio, desligado por padrão, com: regra de acúmulo (pontos por real pago e bônus fixo opcional por atendimento), até 4 tiers, catálogo de recompensas, prazo de expiração, teto de custo mensal e opção "pontos em pagamento no local" (padrão: sim).
- **REQ-FID-002** (origem: PEN-16 | CONST 8): O programa DEVE oferecer as mecânicas "pontos por real" (padrão 1 ponto por R$ 1) e "pontos por visita" (cartão de selos), à escolha do negócio, com validade padrão de 12 meses e teto de custo definido pelo negócio; limites configuráveis no back-office, sem valor fixo no código. Em saúde, recompensas NÃO DEVEM ser desconto em dinheiro.
- **REQ-FID-003** (origem: DF 10.5): Cada tier DEVE ter critério de entrada (pontos ganhos nos últimos 12 meses), multiplicador de acúmulo (1,0 a 2,0) e texto de vantagem; subida imediata ao atingir o critério; queda só na revisão anual de cada consumidor.
- **REQ-FID-004** (origem: DF 10.5): Cada recompensa DEVE ter tipo (serviço grátis, desconto em reais, desconto percentual, brinde), serviço ou serviços aplicáveis, custo em pontos, valor em reais para o estabelecimento, tier mínimo, estoque mensal opcional e validade.
- **REQ-FID-005** (origem: DF 10.5 | DF 3.2.6): O simulador DEVE ser obrigatório antes de ativar e após cada mudança; DEVE estimar pontos emitidos, custo de resgate, valor dos pontos em aberto e a receita incremental necessária para empatar, com base nos últimos 6 meses do negócio ou em números informados.
- **REQ-FID-006** (origem: DF 10.5): O teto de custo mensal DEVE ser obrigatório; a 80%, aviso ao Proprietário; a 100%, catálogo pausado até o mês seguinte para resgates novos; resgates já reservados continuam valendo.
- **REQ-FID-007** (origem: CONST III): A regra DEVE ser versionada; o agendamento congela a versão vigente na criação (REQ-AGE-015).
- **REQ-FID-008** (origem: PEN-06 | CONST 5): Nas verticais de saúde, o programa DEVE estar disponível só com recompensas em serviço ou brinde, sem desconto em dinheiro e sem mostrar preço.

**Acúmulo**

- **REQ-FID-010** (origem: J8 | J1): Atendimento concluído e pago DEVE gerar pontos pela regra congelada e pelo multiplicador do tier, sobre o valor efetivamente pago (sem a parte coberta por resgate), arredondado para baixo.
- **REQ-FID-011** (origem: REQ-PAG-030): Pagamento no local DEVE gerar pontos se o negócio permitir.
- **REQ-FID-012** (origem: edge case): Pacote gera pontos na compra; sessões do pacote não geram pontos.
- **REQ-FID-013** (origem: CONST III | REQ-PAG-050): Estorno DEVE retirar os pontos correspondentes por lançamento; se já usados, a diferença fica como dívida abatida de pontos futuros; o saldo disponível exibido NUNCA é negativo.
- **REQ-FID-014** (origem: DF 10.5): Pontos DEVEM expirar pelo prazo da regra, os mais antigos primeiro, com aviso 30 dias antes.

**Resgate**

- **REQ-FID-020** (origem: J8): O consumidor DEVE poder resgatar recompensa no resumo do agendamento (app e web), vendo preço e saldo antes de confirmar.
- **REQ-FID-021** (origem: CONST III): O resgate DEVE reservar os pontos na confirmação, consumir na conclusão e devolver no cancelamento dentro da política e no não comparecimento.
- **REQ-FID-022** (origem: DF 16 "auditoria de resgate"): O resgate no balcão (Recepção ou Colaborador) DEVE exigir confirmação do consumidor no próprio celular (aviso no app ou OTP).
- **REQ-FID-023** (origem: CONST III | DF 6.1 inv. 4): O saldo de pontos NUNCA DEVE ficar negativo, inclusive sob resgates simultâneos; DEVE existir teste de concorrência e de reprocessamento.
- **REQ-FID-024** (origem: D17 | REQ-PAG-040): O desconto do resgate DEVE entrar no split como desconto do estabelecimento e na comissão conforme a base do `[D17]` (spec 007); "serviço grátis" registra valor pago zero e o valor da recompensa como custo do programa.
- **REQ-FID-025** (origem: REQ-POL-023): A multa de não comparecimento com resgate DEVE ser calculada sobre o preço cheio.

**Saldo e rede**

- **REQ-FID-030** (origem: CONST III | CONST 4.4): Os pontos DEVEM ser movimentados só por lançamentos imutáveis (crédito, bônus, reserva, consumo, devolução, expiração, estorno, ajuste), num livro-razão do domínio `loyalty`, com o saldo sempre igual à soma.
- **REQ-FID-031** (origem: PEN-17): O Proprietário DEVE escolher entre saldo único no negócio (custo atribuído à filial do resgate) e saldo por filial; a troca de modo vale só para pontos ganhos depois dela.
- **REQ-FID-032** (origem: D28 | CONST 2): O lançamento DEVE ficar ligado ao titular pagante, para que os atendidos da fase 2 acumulem para o titular sem migração.
- **REQ-FID-033** (origem: CONST II): Programas e saldos ficam no espaço de dados do tenant, por negócio; pontos de um negócio NUNCA valem em outro.

**Consumidor**

- **REQ-FID-040** (origem: DF 9.1 | DF 9.8): A tela "Fidelidade" DEVE mostrar saldo, tier, progresso, pontos a vencer em 30 dias, catálogo disponível e histórico, por negócio em que o consumidor participa.
- **REQ-FID-041** (origem: CONST XI): Todo crédito, subida de tier, resgate e expiração DEVE gerar aviso (spec 011).

**Resultado, ajustes e abuso**

- **REQ-FID-050** (origem: DF 10.5 | DF 3.2.6): O painel DEVE mostrar, por mês, pontos emitidos, resgatados e expirados, custo dos resgates, valor em aberto, participantes ativos, uso do teto e a razão custo / receita incremental, com o método explicado.
- **REQ-FID-051** (origem: DF 3.2.6): A receita incremental DEVE comparar recompra em 90 dias e gasto médio de participantes contra não participantes do mesmo negócio (ou contra o período anterior à ativação).
- **REQ-FID-052** (origem: CONST V | REQ-AUD-001): Ajustes manuais DEVEM exigir motivo e gerar registro na trilha de auditoria; acima de 1.000 pontos, reautenticação com segundo fator.
- **REQ-FID-053** (origem: DF 12 | DF 16): DEVEM existir regras de detecção de abuso (pagamentos no local repetidos no mesmo dia para o mesmo consumidor, acúmulo semanal acima de 5 vezes a média, resgates sucessivos sem atendimento), com alerta e pontos pendentes até revisão.
- **REQ-FID-054** (origem: CONST IV): Pontos NÃO DEVEM ser convertidos em dinheiro nem transferidos entre consumidores; na exclusão da conta, são encerrados.
- **REQ-FID-055** (origem: edge case): Desligar o programa DEVE parar o acúmulo e manter o resgate por 90 dias, com aviso aos consumidores.

### Key Entities

- **Programa de fidelidade** (versionado): negócio, regra de acúmulo, pontos em pagamento no local, expiração, teto mensal, estado (rascunho, simulado, ativo, encerrando, desligado).
- **Tier** (`loyalty_tier`): programa, nome, ordem, critério de entrada, multiplicador, vantagem.
- **Recompensa**: programa, tipo, serviços, custo em pontos, valor em reais, tier mínimo, estoque mensal, validade, estado.
- **Simulação**: programa e versão, base usada, resultados, data.
- **Conta de pontos**: consumidor (titular), negócio (ou filial, conforme PEN-17), tier atual, data da revisão anual.
- **Lançamento de pontos**: conta, tipo, quantidade, origem (agendamento, pagamento, resgate, ajuste), validade, horário, motivo.
- **Resgate**: conta, recompensa, agendamento, estado (reservado, consumido, devolvido), confirmação do consumidor.
- **Alerta de abuso**: conta, regra disparada, pontos envolvidos, estado da revisão.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor (DF 9.1) | Fidelidade: pontos, tier e catálogo · resgate no Resumo | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Fidelidade | `W..` registrado no plano |
| Painel (DF 9.3) | Fidelidade: regra, tiers, catálogo e simulador · painel de resultado | Registrados no plano |
| App do colaborador e `/pro` | Resgate no check-out | Registrado no plano |
| Back-office | Limites da plataforma e alertas de abuso | Registrado no plano |

A confirmação do resgate no celular do consumidor (no balcão) precisa ser conferida no protótipo.

---

## Regras e estados

- **Programa**: `rascunho` → `simulado` → `ativo` → (mudança) `rascunho` da nova versão → `simulado` → `ativo`; `ativo` → `encerrando` (90 dias de resgate) → `desligado`.
- **Resgate**: `reservado` → `consumido` (conclusão) | `devolvido` (cancelamento dentro da política, não comparecimento, expiração da reserva).
- **Tier**: sobe ao atingir o critério; cai só na revisão anual do consumidor; benefícios reduzidos valem na próxima revisão, com aviso de 30 dias.
- **Saldo disponível** = créditos − reservas − consumos − expirações − estornos ± ajustes, nunca menor que zero na exibição; dívidas de estorno são abatidas de créditos futuros.
- **Expiração**: pelo prazo da regra, os pontos mais antigos primeiro.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Conta e lançamentos de pontos | Pessoal (comportamento de consumo) | Execução de contrato, com adesão ao programa (art. 7, V) | 5 anos após o último lançamento | O próprio consumidor; Proprietário; Recepção (saldo e tier, para o resgate) |
| Tier e histórico de gasto usado na revisão | Pessoal | Execução de contrato | Igual à conta | O próprio consumidor; Proprietário |
| Alertas de abuso | Pessoal | Legítimo interesse e segurança (art. 7, IX) | 2 anos | Proprietário; Gestão |
| Dados usados no simulador e no painel | Agregados, sem identificação | — | 2 anos | Proprietário |

Regras: a participação no programa é informada ao consumidor na primeira vez em que ele recebe pontos, com a regra e a opção de sair; sair encerra os pontos sem conversão em dinheiro; nenhum dado de fidelidade é compartilhado entre negócios ou tenants.

---

## Permissões

Recorte da matriz RBAC (DF 7, "Configurar fidelidade"):

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Suporte |
|---|---|---|---|---|---|---|
| Configurar programa, simular, ativar | — | — | — | ✔ filial | ✔ | — |
| Ver painel de resultado | — | — | — | ✔ filial | ✔ | — |
| Ver saldo e tier de um consumidor | ✔ próprio | ✔ | ✔ filial | ✔ filial | ✔ | ✔* |
| Aplicar resgate no balcão (com confirmação do consumidor) | — | ✔ próprio | ✔ filial | ✔ filial | ✔ | — |
| Ajuste manual de pontos | — | — | — | — | ✔ | — |
| Revisar alertas de abuso | — | — | — | — | ✔ | Gestão |
| Configurar limites da plataforma | — | — | — | — | — | Gestão (Comercial/Growth com aprovação do Financeiro/Ops) |

`✔*` = apenas em sessão de suporte (spec 003).

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `loyalty.program.simulated.v1` / `.activated.v1` / `.changed.v1` / `.deactivated.v1` | Ciclo do programa |
| `loyalty.points.credited.v1` / `.reversed.v1` / `.expired.v1` / `.adjusted.v1` | Lançamentos |
| `loyalty.tier.upgraded.v1` / `.downgraded.v1` | Mudança de tier |
| `loyalty.redemption.reserved.v1` / `.consumed.v1` / `.released.v1` | Resgates |
| `loyalty.cost_cap.reached.v1` | Teto de custo atingido |
| `loyalty.abuse.flagged.v1` | Alerta de abuso |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Consumidores com saldo ativo | DF 3.1.3 | Acompanhada |
| Recompra em 30, 60 e 90 dias (participantes x não participantes) | DF 3.1.3 · DF 3.2.4 | Acompanhada |
| Custo do benefício / receita incremental | DF 3.2.6 | Acompanhada; alerta ao Proprietário acima de 1,0 |
| Pontos em aberto (valor em reais) | DF 10.5 | Acompanhada |
| Taxa de resgate e de expiração | DF 10.5 | Acompanhada |
| Alertas de abuso por mês | DF 16 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhum programa é ativado sem simulação da configuração atual, em 100% dos casos.
- **SC-002**: Nenhum saldo de pontos fica negativo, em 100% dos testes de concorrência e reprocessamento.
- **SC-003**: Os pontos aparecem no app do consumidor em até 1 minuto após o atendimento ser concluído e pago.
- **SC-004**: O consumidor resgata uma recompensa no resumo do agendamento em até 2 toques.
- **SC-005**: Nenhum custo mensal de resgates passa do teto configurado.
- **SC-006**: O Proprietário vê, no painel, a razão custo do benefício / receita incremental do mês em até 2 toques, com o método explicado.
- **SC-007**: Nenhum resgate no balcão acontece sem confirmação do consumidor no próprio celular.
- **SC-008**: O Proprietário configura e simula um programa completo em até 10 minutos.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-16** — mecânica concreta (acúmulo, tier, expiração, teto) | Regra, simulador, limites da plataforma | **Resolvido (clarify 2026-11-25)**: pontos por real ou por visita |
| **PEN-17** — saldo por filial ou por negócio | Modelo da conta de pontos; experiência em rede | **Resolvido (clarify 2026-11-25)**: o negócio escolhe |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-03** — Gerente configura fidelidade | Spec 003 | Decidido: só da própria filial |
| **PEN-06** — publicidade em saúde | Spec 005 | Decidido: disponível sem desconto em dinheiro |
| **D17** — base da comissão | Spec 007 | O desconto do resgate segue a base escolhida |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| **D28** (fase 2) | Pontos ligados ao titular pagante desde já |
| Pagamento no local | ASSUMIDO: gera pontos por padrão, com detecção de abuso |
| Estorno com pontos já usados | ASSUMIDO: dívida abatida de pontos futuros; saldo exibido nunca negativo |
| Programa desligado | ASSUMIDO: 90 dias para resgatar |
| Receita incremental | ASSUMIDO: participantes contra não participantes do mesmo negócio, ou contra o período anterior |

---

## Fora do escopo desta especificação

- Cupons e promoções fora do programa.
- Pontos que valem em vários estabelecimentos (coalizão) ou na Koovela.
- Conversão de pontos em dinheiro, cashback ou transferência entre pessoas.
- Campanhas de CRM para participantes (spec 028).
- Vale-presente (spec 029).
- Antifraude completa e revisão de alertas no back-office (spec 021); aqui só as regras de detecção.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: simulação com 6 meses de histórico; aviso de teto a 80%; aviso de expiração 30 dias antes; ajuste acima de 1.000 pontos com segundo fator; 90 dias de resgate após desligar; programa configurado e simulado em até 10 minutos; pontos visíveis em até 1 minuto.
- A primeira participação é automática quando o programa está ativo e o consumidor é atendido; ele é informado e pode sair.
- O valor em reais de cada recompensa é informado pelo Proprietário e é a base do custo no simulador e no painel.
- O domínio dono desta spec é `loyalty` (CONST 4.4), que mantém o próprio livro-razão de pontos com as regras da CONST III.
