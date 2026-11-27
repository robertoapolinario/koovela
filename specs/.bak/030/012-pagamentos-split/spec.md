# Feature Specification: Pagamentos e split

**Feature Branch**: `012-pagamentos-split`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "012 pagamentos-split — seguir a sequência da constituição (seção 10): PSP, Pix e cartão, sinal, split, estorno, conciliação, livro-razão. Depende de 009 e 010. Pendências PEN-09, PEN-11, PEN-13, PEN-14. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: app do consumidor e web do consumidor (Meio de pagamento, Checkout e sinal; na web, "Meio de pagamento e checkout Pix" numa página só) · painel do cliente (passo "Recebedor, KYC" do onboarding; "Financeiro: recebimentos e split"; registro de pagamento presencial; estornos) · app do colaborador e `/pro` (pagamento no check-out, quando houver) · back-office (conciliação, divergências, estornos e chargebacks, em conjunto com a spec 021)

**Depende de**: 009 `agendamento-ciclo-de-vida` · 010 `politica-cancelamento-no-show` (e, por elas, 002 a 008)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípio III (integral), Princípios I, II, IV, V, VII, IX, seções 4.4 (`payments`), 5, 6, 7, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.2, 2.5, 3.1.4, 3.2.7, 3.4.4, 3.4.5, 5.1, 5.2, 6, 6.1 (invariantes 2 e 4), 7, 8 (J1, J6, J7), 9.1 a 9.3, 9.8, 11.6, 12, 14, 16 e 18. Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

A Koovela cobra o consumidor por **Pix e cartão, com split** `[D04]`: o valor pago é dividido automaticamente entre o estabelecimento, a própria Koovela e, conforme a decisão de `[PEN-14]`, o colaborador. É por aqui que o estabelecimento "cobra com agilidade" (DF 3.2.7), que o consumidor "paga de maneira prática e segura" (DF 3.1.4) e que a Koovela recebe a parte transacional da receita (DF 5.2: take rate, taxa por agendamento, taxa de horário ocioso).

Dinheiro é o domínio com menos tolerância a erro. A constituição exige (CONST III):

- valores em centavos inteiros com código de moeda, sem número com ponto flutuante em nenhuma camada;
- soma dos splits igual ao valor líquido, com arredondamento explícito e determinístico;
- saldos nunca negativos, sempre por livro-razão;
- toda operação financeira idempotente e segura para reprocessar;
- o provedor de pagamento (PSP) isolado atrás de uma interface (`PaymentProvider`, `[D07]`), com o SDK dele só no adaptador;
- conciliação diária com o PSP, com alerta em qualquer divergência.

O PSP ainda não foi escolhido (`[D07]`: "PSP a comparar"); esta spec descreve o que qualquer PSP precisa suportar.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.1.4 | Pagar de maneira prática e segura | % de pagamento in-app |
| 3.2.7 | Cobrar com agilidade e split | Prazo médio de recebimento |
| 3.4.4 | Onboardar tenant (KYC, recebedor) | Tempo de ativação |
| 3.4.5 | Conter fraude, chargeback e abuso | Perda por fraude / GMV |
| 3.2.8 | Reduzir no-show | Sinal e multa efetivamente recebidos |
| DF 14 | Monetização e North Star | GMV; take rate efetivo; atendimentos concluídos e pagos |

Personas: consumidor; Proprietário (recebedor, financeiro); Recepção (pagamento presencial); Gerente; Financeiro/Ops (estornos, chargebacks, conciliação); SRE.

---

## Clarifications

### Session 2026-11-25

- Q: Como o Gerente acessa o financeiro? → A: Gerente (PEN-03, decidido na spec 003): vê faturamento e configura fidelidade só da própria filial; o Proprietário pode retirar.
- Q: O recebedor do split é por negócio ou por filial? (PEN-11) → A: Por negócio, usado por todas as filiais; o modelo fica pronto para recebedor por filial no futuro.
- Q: A taxa por agendamento é retida no split ou cobrada na fatura? (PEN-09) → A: Retida no split quando o pagamento passa pela Koovela; somada na fatura mensal da assinatura quando o pagamento é feito no local.
- Q: A comissão do colaborador é só prévia ou repassada via split? (PEN-14) → A: Repassada via split para todos os colaboradores (PJ e CLT), cada um como recebedor verificado no PSP. Risco: enquadramento do CLT a validar com contador e jurídico.
- Q: Como funciona o pagamento em saúde, onde o preço não aparece? (PEN-06) → A: O consumidor paga só a taxa de agendamento fixa pela plataforma; ela é abatida do valor cobrado no atendimento, devolvida no cancelamento dentro do prazo gratuito e retida na falta ou no cancelamento tardio.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estabelecimento habilita o recebimento (Priority: P1)

Como Proprietário, quero cadastrar meu recebedor (dados do titular e conta bancária) e passar pela verificação do PSP, para receber os pagamentos dos consumidores direto na minha conta.

**Why this priority**: sem recebedor aprovado não existe pagamento online nem split; é o passo "Recebedor, KYC" do onboarding (DF 9.2).

**Independent Test**: no onboarding, cadastrar um recebedor pessoa física e outro pessoa jurídica em ambiente de testes do PSP, acompanhar os estados até "aprovado" e "recusado com motivo", e conferir que só o aprovado recebe pagamentos.

**Acceptance Scenarios**:

1. **Given** o passo "Recebedor" do onboarding, **When** o Proprietário informa o titular (os dados cadastrais da spec 005), a conta bancária (banco, agência, conta, tipo) e os documentos pedidos pelo PSP, **Then** o recebedor é enviado para verificação e fica `em_análise`.
2. **Given** a estrutura do negócio, **When** o recebedor é cadastrado, **Then** ele fica ligado ao negócio e serve a todas as filiais (`[PEN-11]` resolvido).
3. **Given** a resposta do PSP, **When** aprovado, **Then** o recebedor fica `ativo` e o negócio pode cobrar online; quando recusado, o Proprietário vê o motivo e o que corrigir.
4. **Given** um recebedor ativo, **When** o Proprietário troca a conta bancária, **Then** a troca exige reautenticação com segundo fator (REQ-IDN-022), passa por nova verificação, gera registro na trilha de auditoria e aviso por e-mail ao Proprietário; os repasses seguem para a conta antiga até a nova ser aprovada.
5. **Given** um negócio sem recebedor ativo, **When** um consumidor agenda, **Then** só o pagamento no local está disponível, e o painel mostra o passo pendente.

---

### User Story 2 - Consumidor paga com Pix ou cartão no checkout (Priority: P1)

Como consumidor, quero pagar o sinal ou o valor total com Pix ou cartão, no app ou na web, e ver o agendamento confirmado assim que o pagamento for aprovado.

**Why this priority**: é o passo "pagamento ou sinal" da J1 e a condição para `PENDENTE_PAGAMENTO` → `CONFIRMADO` (spec 009).

**Independent Test**: agendar um serviço com sinal, pagar com Pix de teste e ver o agendamento confirmado; repetir com cartão; repetir deixando o Pix expirar.

**Acceptance Scenarios**:

1. **Given** um agendamento em `PENDENTE_PAGAMENTO` (spec 009), **When** o consumidor escolhe Pix, **Then** vê o QR e o código copia-e-cola com o valor, o prazo (até o fim da reserva temporária, REQ-AGD-031) e uma contagem regressiva.
2. **Given** o Pix pago, **When** o PSP confirma, **Then** o agendamento vai para `CONFIRMADO` em até 10 segundos e o consumidor vê a tela de confirmação (REQ-AGE-014), sem precisar recarregar.
3. **Given** a escolha de cartão de crédito, **When** o consumidor informa os dados do cartão, **Then** eles vão direto ao PSP (a Koovela nunca recebe nem guarda número, validade ou código de segurança) e o pagamento é aprovado ou recusado em até 10 segundos.
4. **Given** um cartão recusado, **When** isso acontece, **Then** o consumidor vê o motivo em linguagem simples e pode tentar outro meio, sem perder o horário dentro do prazo da reserva.
5. **Given** o prazo vencido sem pagamento, **When** o Pix expira, **Then** o agendamento vai para `EXPIRADO` (spec 009) e, se um pagamento chegar depois disso, ele é devolvido automaticamente em até 1 dia útil.
6. **Given** um consumidor, **When** paga com cartão, **Then** pode salvar o cartão (como referência do PSP, nunca o número) para próximas compras, com consentimento explícito e a opção de remover em "Meio de pagamento".
7. **Given** o mesmo pedido de pagamento enviado duas vezes (toque duplo, rede instável), **When** processado, **Then** gera uma única cobrança (chave de idempotência).

---

### User Story 3 - Split exato a cada pagamento (Priority: P1)

Como plataforma, quero que cada pagamento seja dividido entre as partes com regra explícita, e que a soma das partes seja exatamente o valor líquido, sempre.

**Why this priority**: invariante 2 do DF 6.1 e Princípio III; o split é o que diferencia a Koovela de uma agenda simples (DF 3.2.7).

**Independent Test**: rodar o teste de propriedade com milhares de combinações de valor, desconto, taxa, comissão e partes, e verificar que a soma é sempre igual ao líquido e que o resto do arredondamento vai sempre para a mesma parte.

**Acceptance Scenarios**:

1. **Given** um pagamento aprovado, **When** o split é calculado, **Then** as partes são: estabelecimento (recebedor), Koovela (take rate e, conforme `[PEN-09]`, a taxa por agendamento) e, conforme `[PEN-14]`, o colaborador; a soma das partes é igual ao valor líquido (valor pago menos a taxa do PSP).
2. **Given** qualquer arredondamento, **When** calculado, **Then** cada parte é arredondada para baixo ao centavo e o resto vai para o estabelecimento.
3. **Given** a taxa por agendamento da Koovela (`[D13]`), **When** um agendamento é pago online, **Then** ela é retida no split da transação; nos agendamentos pagos no local, ela é somada na fatura mensal da assinatura (spec 019) (`[PEN-09]` resolvido).
4. **Given** a comissão do colaborador (contrato REQ-EQP-046), **When** o pagamento é dividido, **Then** ela é repassada automaticamente ao colaborador como parte do split, para o recebedor próprio dele, verificado no PSP (`[PEN-14]` resolvido).
5. **Given** o split calculado, **When** registrado, **Then** guarda as versões de regra usadas (comissão, take rate, taxa) e não muda depois; correções são novos lançamentos.

---

### User Story 4 - Pagamento no local e restante no check-out (Priority: P1)

Como Recepção ou Colaborador, quero registrar o pagamento feito no local (dinheiro, maquininha própria, Pix direto) e cobrar pelo app o restante depois do sinal, para que o atendimento conte como pago e a comissão seja calculada.

**Why this priority**: a maior parte dos estabelecimentos ainda recebe no balcão (DF 2.2, Recepção "recebe pagamento presencial"); sem esse registro, a North Star ("concluídos e pagos") e a comissão ficam erradas.

**Independent Test**: concluir três atendimentos: um pago no local em dinheiro, um com sinal online e restante no local, e um com restante cobrado pelo app; conferir os valores registrados e o estado "pago" de cada um.

**Acceptance Scenarios**:

1. **Given** um atendimento no check-out (spec 009), **When** a equipe escolhe "pagamento no local", **Then** informa o meio (dinheiro, cartão em maquininha própria, Pix direto, outro) e o valor, e o atendimento fica `pago` com origem "fora da plataforma".
2. **Given** um agendamento com sinal pago, **When** o atendimento é concluído, **Then** o restante (valor final menos sinal) pode ser pago no local ou cobrado pelo app.
3. **Given** a cobrança do restante pelo app, **When** enviada ao consumidor, **Then** ele recebe o pedido de pagamento (spec 011) com Pix ou cartão salvo, e a diferença do preço "a partir de" (REQ-AGE-051) aparece separada.
4. **Given** um pagamento registrado fora da plataforma, **When** registrado, **Then** não passa pelo split nem pelo PSP, mas entra no cálculo de comissão (spec 007), no relatório financeiro e, conforme `[PEN-09]`, na base da taxa por agendamento.
5. **Given** um pagamento fora da plataforma registrado por engano, **When** corrigido em até 24 horas pela equipe, **Then** é anulado com registro; depois disso, só pelo Proprietário, com registro na trilha de auditoria.

---

### User Story 5 - Sinal, multa e devolução seguem a política (Priority: P1)

Como estabelecimento e como consumidor, quero que o sinal, a multa e a devolução aconteçam como a política do agendamento diz, sem cálculo manual (specs 010 e J6).

**Why this priority**: é a execução financeira da J6 e do Princípio III para a política; sem ela, a política é só texto.

**Independent Test**: com uma política de sinal de 30% e multa de 50%, cancelar dentro da janela (sinal devolvido), cancelar fora da janela (multa retida) e marcar não comparecimento (multa aplicada), conferindo cada lançamento.

**Acceptance Scenarios**:

1. **Given** um cancelamento dentro da janela gratuita, **When** a spec 010 informa "sem custo", **Then** o sinal é devolvido integralmente pelo mesmo meio em até 1 dia útil (Pix) ou conforme o prazo do cartão, e o split é desfeito na mesma proporção.
2. **Given** uma multa aplicada pela spec 010, **When** a forma escolhida pelo estabelecimento (`[PEN-13]`, decidido na spec 010) é "retida do sinal", **Then** o valor da multa fica com as partes do split e o resto do sinal é devolvido; quando a forma é "cobrada no cartão salvo", a cobrança só acontece se o consumidor tiver autorizado esse uso; quando é "perdida", só é registrada.
3. **Given** um cancelamento pelo estabelecimento, **When** acontece, **Then** todo valor pago é devolvido, sem multa (REQ-POL-026).
4. **Given** uma multa abonada, revertida ou contestação aceita (spec 010), **When** isso acontece, **Then** o valor retido ou cobrado é devolvido com novo lançamento.
5. **Given** a conclusão do atendimento, **When** houve sinal, **Then** o sinal é abatido do valor final.

---

### User Story 6 - Estorno e chargeback (Priority: P2)

Como Proprietário ou Financeiro/Ops, quero estornar total ou parcialmente um pagamento, com motivo; como plataforma, quero tratar contestações do cartão (chargebacks) com o registro do atendimento como prova.

**Why this priority**: DF 3.4.5; sem estorno controlado, devoluções viram transferências manuais sem rastro.

**Independent Test**: estornar parcialmente um pagamento com split e conferir que cada parte devolve sua fração; simular um chargeback pelo PSP e conferir o registro, o aviso ao estabelecimento e a reserva do valor.

**Acceptance Scenarios**:

1. **Given** um pagamento aprovado, **When** o Proprietário ou o Financeiro/Ops pede estorno total ou parcial, com motivo e reautenticação com segundo fator, **Then** o PSP devolve ao consumidor, cada parte do split devolve sua fração proporcional, e tudo é registrado na trilha de auditoria.
2. **Given** um estorno, **When** pedido duas vezes (mesma chave), **Then** acontece uma vez só.
3. **Given** um valor já repassado ao recebedor, **When** estornado, **Then** a diferença é descontada dos próximos repasses do recebedor e aparece no financeiro.
4. **Given** um chargeback notificado pelo PSP, **When** recebido, **Then** é registrado ligado ao pagamento e ao agendamento, o Proprietário e o Financeiro/Ops são avisados, e as provas disponíveis (check-in, check-out, aceite da política, avisos entregues) são reunidas para a defesa; o fluxo de análise é do back-office (spec 021).
5. **Given** o resultado do chargeback, **When** o PSP informa, **Then** a perda ou a recuperação vira lançamento, sem editar lançamentos anteriores.

---

### User Story 7 - Financeiro do estabelecimento e conciliação diária (Priority: P2)

Como Proprietário ou Gerente, quero ver o que recebi, por meio, por dia e por filial, com o split de cada pagamento; como Financeiro/Ops, quero a conciliação diária com o PSP e alerta para qualquer divergência.

**Why this priority**: tela "Financeiro: recebimentos e split" (DF 9.3) e exigência de conciliação da CONST III.

**Independent Test**: com pagamentos de teste em dois dias, abrir o financeiro e conferir totais por meio, por filial e o detalhe do split; criar uma divergência proposital no extrato do PSP e conferir o alerta.

**Acceptance Scenarios**:

1. **Given** o financeiro do negócio, **When** o Proprietário abre, **Then** vê recebido, a receber (agenda de repasses do PSP), taxas, estornos e chargebacks por período, por meio de pagamento e por filial, e o detalhe de cada pagamento com o split.
2. **Given** um Gerente, **When** abre o financeiro, **Then** vê só a própria filial e só se a decisão de `[PEN-03]` (spec 003) permitir; até lá, não vê.
3. **Given** a conciliação diária, **When** roda, **Then** compara cada transação, taxa, estorno, chargeback e repasse da Koovela com o extrato do PSP e marca cada uma como conciliada ou divergente.
4. **Given** uma divergência, **When** encontrada, **Then** gera alerta ao Financeiro/Ops e ao SRE, entra numa fila de divergências no back-office, e só é encerrada com justificativa.
5. **Given** o financeiro, **When** exportado, **Then** gera planilha com os mesmos dados da tela.

---

### User Story 8 - Livro-razão de saldos (Priority: P2)

Como plataforma, quero que todo saldo (sessões de pacote agora; vale-presente, créditos de aula e outros nas fases seguintes) seja movimentado só por lançamentos num livro-razão, e nunca fique negativo.

**Why this priority**: invariante 4 do DF 6.1 e Princípio III; a spec 006 depende disso para pacotes.

**Independent Test**: comprar um pacote de 5 sessões, reservar 5 agendamentos simultâneos e um sexto: o sexto é recusado; cancelar um e conferir a devolução; conferir que o saldo é sempre a soma dos lançamentos.

**Acceptance Scenarios**:

1. **Given** uma compra de pacote (spec 006) paga, **When** confirmada, **Then** um lançamento de crédito com o número de sessões é criado na conta de saldo do consumidor naquele pacote.
2. **Given** reservas, consumos, devoluções, expirações e estornos, **When** acontecem, **Then** cada um é um lançamento; o saldo é sempre a soma dos lançamentos.
3. **Given** dois pedidos simultâneos que levariam o saldo abaixo de zero, **When** processados, **Then** só o que cabe é aceito.
4. **Given** um lançamento, **When** feito, **Then** nunca é alterado nem apagado; correções são lançamentos de ajuste com motivo.
5. **Given** o saldo de um consumidor, **When** consultado por ele no app, **Then** vê sessões disponíveis, reservadas, usadas e a validade.

---

### Edge Cases

- **Webhook do PSP duplicado ou fora de ordem**: processado uma vez; o estado final é o do evento mais recente pela data do PSP.
- **Pagamento confirmado pelo PSP depois de o agendamento expirar**: devolvido automaticamente; o consumidor é avisado.
- **PSP fora do ar**: o checkout mostra "pagamento indisponível no momento"; se o negócio permitir, oferece pagamento no local; nenhuma cobrança fica em estado desconhecido sem verificação posterior.
- **Pagamento em estado desconhecido** (tempo esgotado na resposta): é consultado no PSP até ter estado final antes de qualquer nova tentativa.
- **Estorno maior que o valor pago menos estornos anteriores**: recusado.
- **Recebedor bloqueado pelo PSP**: novos pagamentos online do negócio são suspensos, com aviso ao Proprietário e à Gestão; o pagamento no local continua.
- **Cartão salvo expirado**: o consumidor é avisado na próxima compra.
- **Teste de cartões em sequência** (cartão testado no checkout, DF 12): limite de tentativas recusadas por consumidor, por aparelho e por IP; acima do limite, bloqueio temporário e alerta (spec 021).
- **Combo e pacote**: split sobre o preço do combo ou do pacote; a comissão usa o rateio por etapa ou por sessão (specs 006 e 007).
- **Valor zero** (serviço gratuito): não gera cobrança nem split; o atendimento conta como "pago" com valor zero.
- **Taxa do PSP diferente da prevista**: o split usa a taxa efetiva informada pelo PSP; a diferença aparece na conciliação.

---

## Requirements *(mandatory)*

Formato: `REQ-PAG-NNN (origem: …)`.

### Functional Requirements

**Provedor de pagamento**

- **REQ-PAG-001** (origem: D07 | CONST III): Toda interação com o PSP DEVE passar pela interface `PaymentProvider`; o SDK do PSP NÃO DEVE aparecer fora do adaptador.
- **REQ-PAG-002** (origem: D04 | D07): O PSP escolhido DEVE suportar: Pix com QR e copia-e-cola e expiração, cartão de crédito com tokenização no próprio PSP, split com várias partes, cadastro e verificação (KYC) de recebedores, estorno total e parcial, notificação de chargeback, extrato para conciliação e repasse aos recebedores.
- **REQ-PAG-003** (origem: CONST 5 | DF 12): Dados de cartão NUNCA DEVEM passar pelos servidores da Koovela nem ser guardados por ela; só a referência (token) do PSP.
- **REQ-PAG-004** (origem: CONST III): Toda operação financeira (cobrança, estorno, repasse, cobrança de multa) DEVE aceitar chave de idempotência e ser segura para reprocessar; notificações do PSP DEVEM ser processadas uma única vez.

**Recebedor**

- **REQ-PAG-010** (origem: D04 | DF 3.4.4 | DF 9.2): O Proprietário DEVE cadastrar o recebedor (titular dos dados cadastrais da spec 005, conta bancária, documentos pedidos pelo PSP) e acompanhar os estados `em_análise`, `ativo`, `recusado` (com motivo), `bloqueado`.
- **REQ-PAG-011** (origem: PEN-11): O recebedor DEVE ser por negócio; o modelo DEVE aceitar recebedor por filial no futuro, sem migração.
- **REQ-PAG-012** (origem: CONST V | CONST IV): Trocar a conta bancária DEVE exigir reautenticação com segundo fator, nova verificação, registro na trilha de auditoria e aviso ao Proprietário; dados bancários DEVEM ser cifrados.
- **REQ-PAG-013** (origem: REQ-NEG-016): Negócio sem recebedor ativo DEVE aceitar apenas pagamento no local.

**Cobrança ao consumidor**

- **REQ-PAG-020** (origem: J1 | D04): O checkout DEVE oferecer Pix e cartão de crédito à vista, no app e na web; na web, meio de pagamento e Pix numa página só (DF 9.8).
- **REQ-PAG-021** (origem: REQ-AGD-031): O prazo do Pix DEVE ser o restante da reserva temporária do horário, no máximo 30 minutos.
- **REQ-PAG-022** (origem: REQ-AGE-013 | CONST 6): O pagamento aprovado DEVE levar o agendamento a `CONFIRMADO` em até 10 segundos (p95) após a confirmação do PSP.
- **REQ-PAG-023** (origem: J1): Pagamento recebido após a expiração do agendamento DEVE ser devolvido automaticamente em até 1 dia útil, com aviso ao consumidor.
- **REQ-PAG-024** (origem: DF 9.1 "Meio de pagamento" | CONST IV): O consumidor DEVE poder salvar e remover cartões (token do PSP), com consentimento explícito; o uso do cartão salvo para multa exige autorização específica no aceite da política.
- **REQ-PAG-025** (origem: DF 12 antifraude): Tentativas de cartão recusadas DEVEM ser limitadas por consumidor, aparelho e IP (padrão: 5 por hora), com bloqueio temporário e alerta à spec 021.
- **REQ-PAG-026** (origem: DF 9.3): A cobrança do restante após o sinal e da diferença do preço "a partir de" DEVE poder ser feita pelo app, com pedido de pagamento enviado ao consumidor (spec 011).
- **REQ-PAG-027** (origem: J6 | PEN-13): A cobrança de multa DEVE seguir a forma escolhida pelo estabelecimento entre as permitidas pelo back-office (spec 010): retenção do sinal ou da taxa de agendamento, cobrança da diferença no cartão salvo com autorização prévia, ou só registro.

**Pagamento no local**

- **REQ-PAG-030** (origem: DF 2.2): A equipe DEVE registrar pagamento no local (dinheiro, maquininha própria, Pix direto, outro) com valor; ele não passa por PSP nem split, mas conta para comissão, financeiro e North Star.
- **REQ-PAG-031** (origem: CONST V): A anulação de pagamento no local DEVE ser possível pela equipe em até 24 horas e, depois, só pelo Proprietário, sempre com registro na trilha de auditoria.

**Split**

- **REQ-PAG-040** (origem: CONST III | DF 6.1 inv. 2): A soma das partes do split DEVE ser igual ao valor líquido (pago menos taxa do PSP) em todo pagamento; cada parte é arredondada para baixo ao centavo e o resto vai para o estabelecimento.
- **REQ-PAG-041** (origem: DF 5.2 | D04 | D13 | D15): As partes possíveis DEVEM ser: estabelecimento; Koovela (take rate sobre o transacionado; taxa de horário ocioso, spec 014; e, conforme `[PEN-09]`, taxa por agendamento); colaborador, conforme `[PEN-14]`.
- **REQ-PAG-042** (origem: PEN-09 | D13): A taxa por agendamento DEVE ser retida no split quando o pagamento passa pela Koovela e somada na fatura da assinatura (spec 019) quando o pagamento é no local; a conciliação DEVE mostrar as duas origens.
- **REQ-PAG-043** (origem: PEN-14 | REQ-EQP-048): A comissão DEVE ser parte do split, paga ao recebedor verificado de cada colaborador (PJ e CLT), calculada pelo contrato da spec 007 (REQ-EQP-046); colaborador sem recebedor verificado tem a comissão retida no recebedor do negócio, marcada como pendente, até a verificação. Risco: enquadramento do CLT a validar com contador e jurídico.
- **REQ-PAG-044** (origem: CONST III): Valores de take rate e de taxas da Koovela DEVEM ser configuráveis no back-office, versionados, nunca fixos no código (CONST 8, `[PEN-08]`, `[PEN-30]`); cada split guarda as versões usadas.
- **REQ-PAG-045** (origem: CONST VIII): O CI DEVE ter testes de propriedade do split (soma igual ao líquido para qualquer combinação de partes, descontos, taxas e estornos) como portão de merge.
- **REQ-PAG-046** (origem: PEN-06 | REQ-NEG-052): Em saúde, a plataforma DEVE cobrar só a taxa de agendamento fixa; ela entra no split como valor do estabelecimento, é abatida do valor cobrado no atendimento (registrado como pagamento no local pelo restante), devolvida no cancelamento dentro do prazo gratuito e retida na falta ou no cancelamento tardio; nenhuma tela ou comprovante da plataforma mostra o preço do serviço.

**Política, devolução e estorno**

- **REQ-PAG-050** (origem: REQ-POL-021 | REQ-POL-026): Devoluções determinadas pela política (cancelamento gratuito, cancelamento pelo estabelecimento, multa revertida, abonada ou contestação aceita) DEVEM ser executadas automaticamente, pelo mesmo meio, desfazendo o split na mesma proporção.
- **REQ-PAG-051** (origem: REQ-POL-024): Com multa menor que o sinal, DEVE ser retido só o valor da multa e devolvido o resto.
- **REQ-PAG-052** (origem: DF 7 | CONST V): O estorno manual, total ou parcial, DEVE ser feito pelo Proprietário ou pelo Financeiro/Ops, com motivo, reautenticação com segundo fator e registro na trilha de auditoria; nunca maior que o saldo estornável.
- **REQ-PAG-053** (origem: CONST III): Estorno de valor já repassado DEVE ser descontado dos próximos repasses do recebedor.
- **REQ-PAG-054** (origem: DF 3.4.5 | DF 2.5): O chargeback DEVE ser registrado com pagamento, agendamento, motivo e prazo, avisar o Proprietário e o Financeiro/Ops e reunir as provas (check-in, check-out, aceite da política, avisos entregues); análise e defesa no back-office (spec 021).
- **REQ-PAG-055** (origem: CONST III): Nenhum lançamento financeiro DEVE ser alterado ou apagado; correções, estornos e resultados de chargeback são novos lançamentos.

**Livro-razão de saldos**

- **REQ-PAG-060** (origem: CONST III | CONST 4.4 | DF 6.1 inv. 4): DEVE existir um livro-razão de saldos, com contas por titular e produto (na v1.0, sessões de pacote; nas fases seguintes, vale-presente, créditos de aula e outros), movimentadas só por lançamentos (crédito, reserva, consumo, devolução, expiração, estorno, ajuste).
- **REQ-PAG-061** (origem: CONST III): O saldo NUNCA DEVE ficar negativo, inclusive sob pedidos simultâneos; DEVE existir teste de concorrência e de reprocessamento.
- **REQ-PAG-062** (origem: REQ-CAT-042 | REQ-CAT-045): O livro-razão DEVE fornecer à spec 009 os contratos de reservar, consumir e devolver sessão.

**Financeiro e conciliação**

- **REQ-PAG-070** (origem: DF 9.3): A tela "Financeiro: recebimentos e split" DEVE mostrar recebido, a receber, taxas, estornos e chargebacks por período, meio de pagamento e filial, com o detalhe do split de cada pagamento, e exportar planilha.
- **REQ-PAG-071** (origem: DF 7 | PEN-03): O acesso ao financeiro segue a matriz: Proprietário e Financeiro/Ops sempre; Gerente só da própria filial, salvo se o Proprietário retirar (`[PEN-03]` decidido na spec 003).
- **REQ-PAG-072** (origem: CONST III): A conciliação DEVE rodar todo dia, comparar transações, taxas, estornos, chargebacks e repasses com o extrato do PSP e alertar o Financeiro/Ops e o SRE em qualquer divergência, que só é encerrada com justificativa.
- **REQ-PAG-073** (origem: DF 14): O sistema DEVE fornecer, por tenant e por mês, GMV, take rate efetivo, taxas do PSP e atendimentos concluídos e pagos, para as specs 018, 019 e 023.

**Isolamento, eventos e auditoria**

- **REQ-PAG-080** (origem: CONST II): Pagamentos, splits e saldos DEVEM ficar no espaço de dados do tenant; cartões salvos ficam ligados à identidade global do consumidor.
- **REQ-PAG-081** (origem: CONST V | REQ-AUD-001): Toda ação financeira (cobrança, estorno, devolução, multa, anulação, troca de conta, encerramento de divergência) DEVE gerar registro na trilha de auditoria.
- **REQ-PAG-082** (origem: CONST IX): Os eventos desta spec DEVEM seguir o padrão outbox e não conter PII nem dados de cartão.

### Key Entities

- **Recebedor**: tenant, nível (negócio ou filial, conforme PEN-11), titular, conta bancária (cifrada), referência no PSP, estado.
- **Pagamento** (`payment`): tenant, agendamento ou compra, consumidor, tipo (sinal, total, restante, diferença, pacote, multa), meio (Pix, cartão, no local e qual), valor, taxa do PSP, estado, referência no PSP, chave de idempotência.
- **Split** (`payment_split`): pagamento, partes (estabelecimento, Koovela por tipo de taxa, colaborador), valores, versões de regra.
- **Estorno**: pagamento, valor, motivo, origem (política, manual, expiração), ator, estado.
- **Chargeback**: pagamento, motivo, prazo, provas, estado, resultado.
- **Cartão salvo**: consumidor (global), referência do PSP, bandeira, final, validade, consentimentos (compra, multa).
- **Conta de saldo**: titular, produto (pacote e versão), validade.
- **Lançamento de saldo**: conta, tipo, quantidade, origem (agendamento, compra, estorno), horário, motivo.
- **Lançamento financeiro**: tipo, valor, parte, pagamento, horário (imutável).
- **Conciliação diária**: data, transações conferidas, divergências, estado.
- **Configuração de taxas da Koovela** (versionada): take rate, taxa por agendamento, taxa de horário ocioso, vigência.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| App do consumidor (DF 9.1) | Meio de pagamento · Checkout e sinal | `9.1.x` registrados no plano |
| Web do consumidor (DF 9.8) | Meio de pagamento e checkout Pix (uma página só) | `W..` registrado no plano |
| Painel (onboarding, DF 9.2) | Recebedor, KYC (parte do recebedor) | Registrado no plano |
| Painel (DF 9.3) | Financeiro: recebimentos e split | Registrado no plano |
| App do colaborador e `/pro` | Registro de pagamento no check-out | Registrado no plano |
| Back-office (DF 9.5) | Antifraude, estornos e chargebacks (parte de registro) · conciliação e divergências | Registrados no plano; análise completa na spec 021 |

A tela de saldo de sessões do consumidor e a fila de divergências do back-office não aparecem no protótipo; precisam de telas novas.

---

## Regras e estados

- **Pagamento**: `criado` → `pendente` (Pix aguardando, cartão em processamento) → `aprovado` | `recusado` | `expirado`; `aprovado` → `estornado_parcial` | `estornado` | `em_chargeback` → `chargeback_perdido` | `chargeback_revertido`. Pagamento no local: `registrado` → `anulado`.
- **Estado desconhecido**: qualquer pagamento sem resposta final é consultado no PSP antes de nova tentativa.
- **Recebedor**: `em_análise` → `ativo` | `recusado`; `ativo` → `bloqueado` → `ativo`.
- **Split**: calculado na aprovação; imutável; estornos geram splits negativos proporcionais.
- **Saldo**: soma dos lançamentos; nunca negativo; nenhum lançamento é alterado.
- **Arredondamento**: cada parte para baixo ao centavo; resto para o estabelecimento.
- **Atendimento "pago"** (North Star): concluído e com pagamento aprovado ou registrado no local cobrindo o valor final (ou valor zero).

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Dados do recebedor (CPF ou CNPJ, conta bancária, documentos) | Pessoal e financeiro, cifrado | Execução de contrato; obrigação legal (art. 7, II e V) | Contrato + 5 anos | Proprietário; Financeiro/Ops; nunca exibidos completos |
| Pagamentos do consumidor (valor, meio, data) | Pessoal (financeiro) | Execução de contrato; obrigação legal | 5 anos (guarda fiscal) | O próprio consumidor; equipe do tenant conforme papel; Financeiro/Ops |
| Cartão salvo (referência, bandeira, final, validade) | Pessoal (financeiro); nunca o número | Consentimento (art. 7, I) | Até o consumidor remover ou a validade vencer | O próprio consumidor |
| Provas de chargeback | Pessoal | Exercício regular de direitos (art. 7, VI) | 5 anos | Financeiro/Ops; Proprietário |
| Saldo de pacote | Pessoal | Execução de contrato | Até 5 anos após o fim da validade | O próprio consumidor; equipe do tenant |

Regras: nenhum dado de cartão é guardado ou registrado em log (REQ-PAG-003, REQ-FND-041); o PSP recebe apenas o necessário; o mascaramento automático cobre conta bancária e documentos.

---

## Permissões

Recorte da matriz RBAC (DF 7):

| Ação | Usuário | Colaborador | Recepção | Gerente | Proprietário | Fin/Ops | Suporte |
|---|---|---|---|---|---|---|---|
| Pagar; salvar e remover cartões | ✔ | — | — | — | — | — | — |
| Cadastrar e alterar recebedor | — | — | — | — | ✔ | — | — |
| Registrar pagamento no local | — | ✔ próprio | ✔ filial | ✔ filial | ✔ | — | — |
| Cobrar restante pelo app | — | ✔ próprio | ✔ filial | ✔ filial | ✔ | — | — |
| Anular pagamento no local após 24 h | — | — | — | — | ✔ | ✔ | — |
| Estornar manualmente | — | — | — | — | ✔ | ✔ | — |
| Ver faturamento da filial | — | — | — | `[PEN-03]` | ✔ | ✔ | — |
| Ver faturamento da rede | — | — | — | — | ✔ | ✔ | — |
| Conciliação, divergências, chargebacks | — | — | — | — | (ver chargebacks do próprio tenant) | ✔ | — |
| Configurar taxas da Koovela | — | — | — | — | — | ✔ (com aprovação do SRE no back-office) | — |

Suporte em sessão de suporte não faz estorno nem altera recebedor (REQ-IDN-063).

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `payments.payment.created.v1` / `.approved.v1` / `.declined.v1` / `.expired.v1` | Ciclo do pagamento (consumidos pela spec 009) |
| `payments.payment.recorded_offline.v1` / `.offline_voided.v1` | Pagamento no local |
| `payments.split.settled.v1` | Split calculado |
| `payments.refund.requested.v1` / `.completed.v1` | Estorno e devolução |
| `payments.chargeback.opened.v1` / `.resolved.v1` | Chargeback |
| `payments.recipient.approved.v1` / `.rejected.v1` / `.blocked.v1` | Recebedor |
| `payments.balance.credited.v1` / `.reserved.v1` / `.consumed.v1` / `.released.v1` / `.expired.v1` | Livro-razão de saldos |
| `payments.reconciliation.completed.v1` / `.divergence_found.v1` | Conciliação diária |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Atendimentos concluídos e pagos por mês | CONST 7 · DF 14 (North Star) | Acompanhada |
| % de pagamento in-app (sobre o total pago) | DF 3.1.4 | Acompanhada |
| Prazo médio de recebimento | DF 3.2.7 | Acompanhada |
| GMV, take rate efetivo, ARPA | DF 14 | Acompanhada |
| Conversão do checkout por meio (Pix, cartão) | J1 | Acompanhada |
| Tempo de aprovação do recebedor | DF 3.4.4 | Acompanhada |
| Perda por fraude e chargeback / GMV | DF 3.4.5 | Acompanhada |
| Divergências de conciliação abertas | CONST III | 0 com mais de 2 dias úteis |
| Splits com soma diferente do líquido | CONST III | 0 |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes de propriedade e em produção, a soma das partes do split é igual ao valor líquido.
- **SC-002**: 95% dos agendamentos pagos com Pix ou cartão ficam confirmados em até 10 segundos após o pagamento.
- **SC-003**: Nenhuma cobrança é feita em duplicidade, em 100% dos testes de reenvio e de notificações duplicadas.
- **SC-004**: Nenhum saldo fica negativo, em 100% dos testes de concorrência e de reprocessamento.
- **SC-005**: 100% das divergências da conciliação geram alerta no mesmo dia, e nenhuma fica aberta por mais de 2 dias úteis.
- **SC-006**: Devoluções determinadas pela política acontecem sem ação manual em 100% dos casos.
- **SC-007**: Nenhum dado de cartão aparece em armazenamento, log ou evento da Koovela, verificado por varredura.
- **SC-008**: A Recepção registra um pagamento no local em até 15 segundos no check-out.
- **SC-009**: O Proprietário encontra quanto recebeu no mês, por meio e por filial, em até 30 segundos no painel.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-09** — taxa por agendamento retida no split ou cobrada na fatura | Composição do split; base sobre pagamentos no local; spec 019 | **Resolvido (clarify 2026-11-25)**: split + fatura |
| **PEN-14** — comissão só prévia ou repasse via split | Partes do split; recebedor do colaborador; spec 018 | **Resolvido (clarify 2026-11-25)**: split para todos |
| **PEN-11** — recebedor por negócio ou por filial | Cadastro de recebedor; repasses | **Resolvido (clarify 2026-11-25)**: por negócio |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-13** — forma da multa | Spec 010 | Decidido: parametrizável pelo estabelecimento e pelo back-office; esta spec implementa as três formas |
| **PEN-15** — quando o sinal é exigido | Spec 010 | Esta spec cobra o sinal sempre que a política o exigir |
| **PEN-03** — Gerente vê faturamento | Spec 003 | Decidido: só da própria filial |
| **PEN-08** / **PEN-30** — valores | Back-office | Todas as taxas configuráveis, sem valor fixo no código (CONST 8) |
| **D07** — PSP a comparar | Plano | A escolha do PSP é tarefa do plano, contra a lista do REQ-PAG-002 |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Cartão | ASSUMIDO: crédito à vista na v1.0; parcelamento e débito ficam fora |
| Pagamento no local | ASSUMIDO: registrado pela equipe, sem split, contando para comissão e North Star |
| Arredondamento | ASSUMIDO: cada parte para baixo, resto para o estabelecimento |
| Limite de cartão recusado | ASSUMIDO: 5 por hora por consumidor, aparelho e IP |

---

## Fora do escopo desta especificação

- Repasse e fechamento das comissões do colaborador (spec 018).
- Emissão de NFS-e (spec 017).
- Cobrança da assinatura Koovela e da fatura do tenant (spec 019).
- Análise de antifraude, KYC no back-office e defesa de chargeback (spec 021).
- Antecipação de recebíveis (spec 036).
- Vale-presente, planos de aula e pacotes para presente (specs 026 e 029), que usam o livro-razão desta spec.
- Parcelamento, cartão de débito, boleto, carteiras digitais e maquininha integrada (produtos financeiros "fora por ora", `[D36]`).
- Gorjeta.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: confirmação em até 10 segundos após o pagamento; devolução de pagamento tardio em até 1 dia útil; anulação de pagamento no local pela equipe em até 24 horas; divergência resolvida em até 2 dias úteis; registro no local em até 15 segundos.
- O PSP escolhido no plano oferece ambiente de testes gratuito; as taxas do PSP são custo da transação, descontadas do valor líquido.
- O Pix devolvido usa a devolução do próprio Pix (pelo mesmo meio); o estorno de cartão segue o prazo da bandeira.
- Os repasses ao estabelecimento seguem a agenda do PSP (prazo e frequência); a Koovela mostra a agenda, mas não a define.
- O domínio dono desta spec é `payments` (CONST 4.4), que também mantém o livro-razão de saldos.
