# Feature Specification: Vale-presente e pacotes para presentear

**Feature Branch**: `029-vale-presente-pacotes`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "029 vale-presente-pacotes — seguir a sequência da constituição (seção 10), fase 2: [D33]. Depende de 012 e 017. Pendência PEN-24. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 2 (em todas as plataformas, `[D35]`)

**Superfícies afetadas**: app do consumidor ("Comprar vale-presente"; resgate; carteira de vales) · web do consumidor ("Vale-presente"; página de resgate) · painel do cliente ("Vale-presente e pacotes vendidos"; uso no balcão) · app do colaborador e `/pro` (uso no check-out)

**Depende de**: 012 `pagamentos-split` · 017 `fiscal-nfse` (e, por elas, a v1.0); usa o catálogo e os pacotes da 006

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios III, IV, IX, seções 4.4 (`commerce`), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 5.2, 6 (fase 2, `ValePresente`), 9.10, 14 (fase 2), 17 (`[D33]`) e 18 (`[PEN-07]`, `[PEN-24]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

"Pacotes e vale-presente" são venda antecipada de serviço (DF 5.2): o estabelecimento recebe antes e ganha um cliente novo, que muitas vezes nunca tinha ido lá. Datas como Dia das Mães, Natal e aniversários são o momento dessa venda.

A decisão `[D33]` define as regras:

- **qualquer pessoa compra para presentear**;
- o vale vale **só na filial da compra**;
- **reembolso em até 7 dias sem uso**.

O Documento Fundamental modela o vale-presente com comprador, destinatário, filial, saldo, validade e reembolso (DF 6). Ainda falta decidir **quando sai a nota fiscal**: na venda ou no uso do serviço (`[PEN-24]`; o protótipo assume no uso).

Pela constituição, saldo de vale-presente **nunca fica negativo** e toda mudança é lançamento num livro-razão (CONST III).

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| DF 5.2 | Pacotes e vale-presente (venda antecipada) | Receita de vales e pacotes presenteados |
| DF 14 (fase 2) | Uso do saldo de vale-presente e pacotes | Valor usado / vendido |
| 3.2.2 | Aumentar volume de clientes | Novos consumidores que chegaram por vale |

Personas: comprador (qualquer pessoa); presenteado; Proprietário e Recepção do estabelecimento.

---

## Clarifications

### Session 2026-11-25

- Q: A NFS-e do vale-presente e do pacote sai na venda ou no uso? (PEN-24) → A: No uso, pelo valor do serviço coberto, usando a configuração da spec 017. Validar com contador.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comprar um vale-presente para alguém (Priority: P1)

Como qualquer pessoa, quero comprar um vale-presente de um estabelecimento (um valor em reais ou um serviço ou pacote específico), escrever uma mensagem e enviar para quem vou presentear, agora ou numa data.

**Why this priority**: tela "Comprar vale-presente" (app) e "Vale-presente" (web) da DF 9.10; é o centro da `[D33]`.

**Independent Test**: comprar um vale de R$ 150 e outro de "corte + escova", agendar o envio do primeiro para a semana seguinte e enviar o segundo na hora; conferir pagamento, split, e o aviso ao presenteado na data.

**Acceptance Scenarios**:

1. **Given** a página do estabelecimento com vale-presente ligado, **When** a pessoa escolhe "dar de presente", **Then** escolhe a filial, o tipo (valor em reais dentro da faixa do estabelecimento, ou serviço, combo ou pacote da lista de presenteáveis), a arte, a mensagem (até 300 caracteres), o nome do presenteado e como entregar (celular ou e-mail do presenteado, ou só um código para entregar pessoalmente).
2. **Given** a compra, **When** o comprador confirma, **Then** faz a etapa 1 do cadastro se ainda não tiver conta (spec 003), paga por Pix ou cartão (spec 012) e recebe o comprovante com o código do vale e a validade.
3. **Given** a entrega agendada, **When** a data chega, **Then** o presenteado recebe o aviso com a mensagem, o nome de quem deu e o link de resgate; com entrega na hora, recebe imediatamente.
4. **Given** um vale de serviço ou pacote, **When** comprado, **Then** o preço pago fica congelado: o presenteado tem direito àquele serviço ou pacote mesmo que o preço suba depois (CONST III).
5. **Given** a faixa de valores do estabelecimento, **When** o comprador informa um valor fora dela, **Then** é recusado com a faixa permitida.

---

### User Story 2 - Presenteado resgata e usa o vale (Priority: P1)

Como presenteado, quero abrir o link, guardar o vale na minha conta e usá-lo ao agendar naquela filial, aos poucos se for de valor.

**Why this priority**: sem resgate e uso, o vale não vira atendimento; é o cliente novo para o estabelecimento.

**Independent Test**: resgatar um vale de R$ 150, usar R$ 90 num agendamento e R$ 60 noutro; conferir o saldo a cada uso, o atendimento coberto e a recusa de uso em outra filial.

**Acceptance Scenarios**:

1. **Given** o link de resgate, **When** o presenteado o abre, **Then** vê a mensagem, o valor ou o serviço, a filial e a validade, e guarda o vale na carteira da conta (etapa 1, spec 003).
2. **Given** o vale na carteira, **When** o presenteado agenda na filial do vale, **Then** pode usá-lo no resumo do agendamento (spec 009): vale de valor abate do preço; vale de serviço cobre aquele serviço.
3. **Given** um vale de valor maior que o atendimento, **When** usado, **Then** o saldo restante continua na carteira até a validade; menor que o atendimento, a diferença é paga pelos meios normais (spec 012).
4. **Given** uma filial diferente da do vale, **When** o presenteado tenta usar, **Then** é recusado com a explicação (`[D33]`).
5. **Given** o uso, **When** o agendamento é confirmado, **Then** o valor fica reservado no saldo; ao concluir, é consumido; ao cancelar dentro da política (spec 010), volta ao saldo.
6. **Given** um vale com código entregue pessoalmente, **When** o presenteado informa o código no app ou na Recepção, **Then** o vale é resgatado na conta dele.
7. **Given** um vale de pacote de sessões, **When** resgatado, **Then** vira um pacote do presenteado, com as sessões no livro-razão (specs 006 e 012).

---

### User Story 3 - Reembolso e validade (Priority: P1)

Como comprador, quero poder desistir e receber o dinheiro de volta em até 7 dias se o vale não foi usado; como estabelecimento, quero uma validade clara.

**Why this priority**: regra da `[D33]` e direito de arrependimento da compra pela internet.

**Independent Test**: comprar um vale e pedir reembolso no 5º dia (aceito, estorno pelo mesmo meio); usar parte de outro vale e pedir reembolso (recusado); deixar um terceiro vencer e conferir o aviso antes e o fim do saldo.

**Acceptance Scenarios**:

1. **Given** um vale sem nenhum uso, **When** o comprador pede reembolso em até 7 dias da compra, **Then** o valor é devolvido integralmente pelo mesmo meio (spec 012), o vale é cancelado e o presenteado (se já tiver resgatado) é avisado.
2. **Given** um vale com qualquer uso ou depois de 7 dias, **When** o comprador pede reembolso, **Then** é recusado com a regra; o estabelecimento pode conceder reembolso por decisão própria, com registro.
3. **Given** a validade do vale (configurada pelo estabelecimento, padrão 12 meses, mínimo 6), **When** faltam 30 e 7 dias, **Then** o presenteado (ou o comprador, se não foi resgatado) é avisado.
4. **Given** o vale vencido, **When** a validade passa, **Then** o saldo deixa de poder ser usado, e o lançamento de expiração fica registrado.

---

### User Story 4 - Estabelecimento configura, vende e acompanha (Priority: P2)

Como Proprietário, quero ligar o vale-presente, definir valores, artes, o que pode ser presenteado e a validade, e ver os vales vendidos, usados e a vencer.

**Why this priority**: tela "Vale-presente e pacotes vendidos" (DF 9.10).

**Independent Test**: configurar a faixa de R$ 50 a R$ 500, dois serviços presenteáveis e validade de 12 meses; vender três vales de teste; conferir a lista com saldo, usos e vencimentos.

**Acceptance Scenarios**:

1. **Given** o painel, **When** o Proprietário configura, **Then** liga ou desliga o vale-presente por filial, define a faixa de valores (ou valores fixos), os serviços, combos e pacotes presenteáveis, as artes disponíveis e a validade.
2. **Given** "Vale-presente e pacotes vendidos", **When** aberto, **Then** mostra cada vale com comprador (nome), presenteado (nome, se resgatado), tipo, valor ou serviço, saldo, usos, validade e estado, com totais do mês: vendido, usado, a vencer, vencido e reembolsado.
3. **Given** a Recepção no balcão, **When** um presenteado apresenta o código, **Then** a Recepção pode consultar o saldo e aplicar o vale no check-out, com confirmação do presenteado no celular (como no resgate de fidelidade, REQ-FID-022).
4. **Given** a venda presencial, **When** a Recepção vende um vale no balcão, **Then** registra o pagamento (no local ou pela plataforma) e o vale é emitido com o código para entregar.

---

### Edge Cases

- **Vale de serviço que deixou de existir** (serviço arquivado, spec 006): o presenteado pode usar o valor pago como saldo em outros serviços da filial.
- **Filial encerrada** (spec 005): os vales dela passam a valer na filial mais próxima do mesmo negócio, ou são reembolsados, à escolha do presenteado, com aviso.
- **Tenant suspenso** (spec 002): os vales continuam válidos; a validade é estendida pelo tempo de suspensão.
- **Vale transferido**: antes do resgate, o comprador pode reenviar a outro destinatário uma vez; depois do resgate, não é transferível.
- **Código digitado errado repetidamente**: 5 tentativas por hora por conta e aparelho, depois bloqueio temporário (antifraude, spec 021).
- **Vale e fidelidade no mesmo agendamento**: podem ser usados juntos; o vale abate primeiro.
- **Vale e oferta de campanha** (spec 028): podem ser usados juntos; a oferta reduz o preço antes do vale.
- **Comissão** (spec 007): calculada no uso, sobre o valor do serviço coberto, conforme a base do `[D17]`.
- **Pontos de fidelidade** (spec 015): o comprador não ganha pontos na compra do vale; o presenteado ganha pontos no uso, sobre o valor coberto pelo vale.
- **Estorno de agendamento pago com vale**: o valor volta ao saldo do vale, nunca em dinheiro ao presenteado.

---

## Requirements *(mandatory)*

Formato: `REQ-VAL-NNN (origem: …)`.

### Functional Requirements

**Compra**

- **REQ-VAL-001** (origem: D33 | DF 6 `ValePresente`): O vale-presente (`gift_card`) DEVE ter comprador, destinatário (nome e, opcionalmente, celular ou e-mail), filial, tipo (valor em reais; serviço, combo ou pacote), valor pago, saldo, mensagem, arte, código, data de entrega, validade e estado.
- **REQ-VAL-002** (origem: D33): Qualquer pessoa com etapa 1 do cadastro (spec 003) DEVE poder comprar, pagando por Pix ou cartão pela spec 012, com split para a filial do vale.
- **REQ-VAL-003** (origem: D33): A entrega DEVE ser por aviso ao destinatário (celular ou e-mail, spec 011) na hora ou numa data escolhida, ou só pelo código, para entregar pessoalmente.
- **REQ-VAL-004** (origem: CONST III): Vales de serviço, combo ou pacote DEVEM congelar o preço pago; o direito vale mesmo com mudança de preço.
- **REQ-VAL-005** (origem: CONST 5): O código DEVE ser impossível de adivinhar; tentativas de código errado DEVEM ser limitadas (5 por hora por conta e aparelho).

**Resgate e uso**

- **REQ-VAL-010** (origem: D33): O resgate DEVE guardar o vale na carteira do presenteado (etapa 1 do cadastro), pelo link ou pelo código.
- **REQ-VAL-011** (origem: D33): O vale SÓ DEVE ser usado na filial da compra.
- **REQ-VAL-012** (origem: CONST III | REQ-PAG-060): O saldo DEVE ser uma conta no livro-razão da spec 012 (compra, reserva, consumo, devolução, expiração, reembolso, ajuste), nunca negativa; vales de valor admitem uso parcial.
- **REQ-VAL-013** (origem: REQ-AGE-010): O uso DEVE ser feito no resumo do agendamento (spec 009); a reserva acontece na confirmação, o consumo na conclusão e a devolução no cancelamento dentro da política.
- **REQ-VAL-014** (origem: D33 | REQ-CAT-041): O vale de pacote, ao ser resgatado, DEVE virar um pacote do presenteado, com as regras da spec 006.
- **REQ-VAL-015** (origem: REQ-FID-022): O uso no balcão DEVE exigir confirmação do presenteado no próprio celular.
- **REQ-VAL-016** (origem: edge case): Antes do resgate, o comprador PODE reenviar o vale a outro destinatário uma vez; depois do resgate, o vale não é transferível.

**Reembolso e validade**

- **REQ-VAL-020** (origem: D33 | CDC art. 49): Vale sem nenhum uso DEVE poder ser reembolsado ao comprador, integralmente e pelo mesmo meio, em até 7 dias da compra.
- **REQ-VAL-021** (origem: D33): Fora dessa regra, o reembolso só por decisão do estabelecimento, com registro na trilha de auditoria.
- **REQ-VAL-022** (origem: D33): A validade DEVE ser configurada pelo estabelecimento (padrão 12 meses, mínimo 6), com aviso 30 e 7 dias antes do vencimento.
- **REQ-VAL-023** (origem: edge case): Suspensão do tenant DEVE estender a validade pelo tempo suspenso; encerramento da filial DEVE oferecer ao presenteado a filial mais próxima do negócio ou o reembolso do saldo.

**Nota fiscal**

- **REQ-VAL-030** (origem: PEN-24 | REQ-FIS-013): A NFS-e do vale-presente e do pacote DEVE sair no uso do serviço, pelo valor coberto, conforme a configuração de emitente da spec 017; a venda é registrada como adiantamento. Validar com contador.
- **REQ-VAL-031** (origem: REQ-FIS-012): Reembolso de vale cuja nota já foi emitida na venda DEVE seguir o cancelamento da spec 017.

**Configuração e acompanhamento**

- **REQ-VAL-040** (origem: DF 9.10): O Proprietário DEVE configurar por filial: ligar ou desligar, faixa ou valores fixos, serviços, combos e pacotes presenteáveis, artes e validade.
- **REQ-VAL-041** (origem: DF 9.10 "Vale-presente e pacotes vendidos"): O painel DEVE listar os vales com comprador, presenteado, tipo, saldo, usos, validade e estado, e os totais do mês (vendido, usado, a vencer, vencido, reembolsado).
- **REQ-VAL-042** (origem: DF 2.2): A Recepção DEVE poder vender vales no balcão e aplicar vales no check-out.

**Comissão, pontos e combinação**

- **REQ-VAL-050** (origem: D17 | REQ-EQP-046): A comissão DEVE ser calculada no uso, sobre o valor do serviço coberto, conforme a base do `[D17]`.
- **REQ-VAL-051** (origem: REQ-FID-010): O comprador NÃO DEVE ganhar pontos na compra; o presenteado ganha pontos no uso, sobre o valor coberto pelo vale.
- **REQ-VAL-052** (origem: edge case): O vale pode ser combinado com resgate de fidelidade e com oferta de campanha; a oferta reduz o preço antes, o vale abate em seguida.
- **REQ-VAL-053** (origem: CONST III): Estorno de agendamento pago com vale DEVE devolver o valor ao saldo do vale, nunca em dinheiro ao presenteado.

**Isolamento e contratos**

- **REQ-VAL-060** (origem: CONST II): Vales ficam no espaço de dados do tenant; a carteira do consumidor (vales de vários estabelecimentos) é uma projeção global, como "Meus agendamentos".
- **REQ-VAL-061** (origem: REQ-PRI-005): Os contratos de exportação e eliminação (spec 022) DEVEM cobrir vales comprados e recebidos.

### Key Entities

- **Vale-presente** (`gift_card`): comprador, destinatário, filial, tipo, item presenteado (serviço, combo ou pacote, com versão), valor pago, mensagem, arte, código, entrega, validade, estado.
- **Conta de saldo do vale** (spec 012): vale, lançamentos.
- **Carteira do consumidor** (projeção global): vales resgatados, por estabelecimento e filial, com saldo e validade.
- **Configuração de vale-presente da filial**: ligado, faixa ou valores, itens presenteáveis, artes, validade.
- **Pedido de reembolso**: vale, comprador, data, resultado.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.10) | Código |
|---|---|---|
| App do consumidor | Comprar vale-presente | Registrado no plano |
| Web do consumidor | Vale-presente | Registrado no plano |
| Painel do cliente | Vale-presente e pacotes vendidos | Registrado no plano |

A página de resgate, a carteira de vales do consumidor e o uso no balcão precisam ser conferidos no protótipo; se não existirem, são telas novas.

---

## Regras e estados

- **Vale**: `pago` → `entregue` (aviso enviado ou código entregue) → `resgatado` → `em_uso` (saldo parcial) → `esgotado` | `vencido` · `pago` ou `entregue` → `reembolsado` (até 7 dias, sem uso) · qualquer → `cancelado` (decisão do estabelecimento, com registro).
- **Saldo**: soma dos lançamentos; nunca negativo; consumo só na filial do vale.
- **Ordem de abatimento no agendamento**: oferta de campanha → resgate de fidelidade → vale-presente → pagamento.
- **Validade**: padrão 12 meses, mínimo 6; estendida pelo tempo de suspensão do tenant.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Comprador (conta, pagamento) | Pessoal | Execução de contrato (art. 7, V) | 5 anos (guarda fiscal) | O próprio comprador; Proprietário e Recepção (nome) |
| Destinatário (nome, celular ou e-mail) informado pelo comprador | Pessoal de terceiro | Legítimo interesse para a entrega do presente (art. 7, IX) | Até o resgate; sem resgate, até a validade + 30 dias | O comprador; o sistema de envio; Proprietário (só o nome) |
| Mensagem do presente | Pessoal | Execução de contrato | Igual ao vale | O comprador; o presenteado |
| Carteira e uso do vale | Pessoal | Execução de contrato | 5 anos | O presenteado; Proprietário e Recepção |

Regras: o destinatário recebe só o aviso do presente, sem nenhum uso do contato para marketing (spec 028 exige opt-in próprio); o celular ou e-mail do destinatário não é exibido ao estabelecimento.

---

## Permissões

| Ação | Comprador | Presenteado | Recepção | Gerente | Proprietário |
|---|---|---|---|---|---|
| Comprar, reenviar antes do resgate, pedir reembolso | ✔ | — | — | — | — |
| Resgatar e usar | — | ✔ | — | — | — |
| Vender no balcão e aplicar no check-out | — | — | ✔ filial | ✔ filial | ✔ |
| Configurar vale-presente | — | — | — | ✔ filial | ✔ |
| Ver vales vendidos e totais | — | — | ✔ filial (sem totais financeiros) | ✔ filial | ✔ |
| Reembolso fora da regra | — | — | — | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `commerce.gift_card.purchased.v1` / `.delivered.v1` / `.redeemed.v1` | Compra, entrega e resgate |
| `commerce.gift_card.refunded.v1` / `.expired.v1` / `.cancelled.v1` | Fim do vale |
| `payments.balance.reserved.v1` / `.consumed.v1` / `.released.v1` | Movimentos de saldo (spec 012) |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Vales vendidos e receita por mês | DF 5.2 | Acompanhada |
| Uso do saldo (valor usado / vendido) | DF 14 (fase 2) | Acompanhada |
| Novos consumidores que chegaram por vale | DF 3.2.2 | Acompanhada |
| Valor vencido sem uso | DF 14 (fase 2) | Acompanhada |
| Reembolsos em 7 dias | `[D33]` | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O comprador compra e envia um vale-presente em até 3 minutos.
- **SC-002**: 100% dos vales entregues por aviso chegam na data escolhida.
- **SC-003**: Nenhum saldo de vale fica negativo, em 100% dos testes de concorrência e reprocessamento.
- **SC-004**: Nenhum vale é usado fora da filial da compra, verificado por teste.
- **SC-005**: 100% dos pedidos de reembolso dentro da regra (até 7 dias, sem uso) são devolvidos sem ação manual.
- **SC-006**: O presenteado resgata o vale e agenda usando-o em até 3 minutos.
- **SC-007**: O Proprietário vê o total vendido, usado e a vencer do mês em até 2 toques.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-24** — nota fiscal na venda ou no uso | Fiscal e financeiro; reembolso | **Resolvido (clarify 2026-11-25)**: no uso |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-07** — pacotes na v1.0 | Spec 006 | Vale de pacote existe na fase 2 de qualquer forma |
| **PEN-17** — saldo de pontos por filial | Spec 015 | Pontos do uso seguem a decisão de lá |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Validade | ASSUMIDO: 12 meses por padrão, mínimo 6 (validar com o jurídico) |
| Pontos | ASSUMIDO: no uso, para o presenteado; nada na compra |
| Transferência | ASSUMIDO: uma vez, antes do resgate |
| Estorno | ASSUMIDO: sempre volta ao saldo do vale |

---

## Fora do escopo desta especificação

- Vale-presente que vale em vários estabelecimentos ou em toda a Koovela.
- Venda de vales por parceiros ou empresas (corporativo B2B2C, fora por ora, `[D36]`).
- Cartão físico com tarja ou chip.
- Conversão de saldo em dinheiro para o presenteado.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: compra em até 3 minutos; resgate e agendamento em até 3 minutos; validade de 12 meses (mínimo 6); avisos 30 e 7 dias antes; mensagem de até 300 caracteres; 5 tentativas de código por hora.
- O dinheiro do vale vai para o recebedor da filial na venda, pelo split da spec 012; o estabelecimento assume o compromisso de atender.
- A validade mínima e o tratamento do saldo vencido devem ser validados com o jurídico, pela legislação de defesa do consumidor.
- O domínio dono desta spec é `commerce` (CONST 4.4, fase 2), com os saldos no livro-razão de `payments`.
