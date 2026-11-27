# Feature Specification: Antecipação de recebíveis

**Feature Branch**: `036-antecipacao-recebiveis`

**Created**: 2026-11-25

**Status**: Clarified

**Input**: User description: "036 antecipacao-recebiveis — seguir a sequência da constituição (seção 10), fase 3: [D38]. Pendência PEN-28. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: Fase 3 (em todas as plataformas, `[D36]`)

**Superfícies afetadas**: painel do cliente ("Antecipação de recebíveis") · app do colaborador e `/pro` ("Antecipar comissão") · back-office (parceiro, taxas, acompanhamento)

**Depende de**: 012 `pagamentos-split` · 018 `fechamento-financeiro-repasses` (e, por elas, a v1.0)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios III (idempotência em toda antecipação `[D38]`, ledger), IV, V, seções 3 (dados bancários cifrados), 4.4 (`finance`: "antecipação de recebíveis via parceiro"), 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 3.3.3, 5.2 (taxa sobre o adiantamento), 9.11, 17 (`[D38]`) e 18 (`[PEN-28]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

Pagamentos com cartão chegam ao estabelecimento dias ou semanas depois do atendimento, e a comissão do colaborador só é paga no fechamento (spec 018). Pequenos negócios e profissionais precisam de dinheiro antes, e hoje recorrem à maquininha ou a empréstimos caros fora da plataforma.

A decisão `[D38]` define:

- **antecipação sob demanda** (só quando o usuário pede; nada automático);
- **para o estabelecimento** (recebíveis de pagamentos feitos pela Koovela) **e para o colaborador** (sobre a **própria comissão**);
- **por meio de um parceiro financeiro**: a Koovela não empresta dinheiro nem compra recebíveis; ela mostra a oferta do parceiro, registra a operação e ganha uma taxa sobre o adiantamento (DF 5.2);
- decidido no clarify de 2026-11-25 (`[PEN-28]`): **desligada em produção até haver parceiro e parecer regulatório**; PJ e CLT elegíveis no modelo.

A constituição exige que toda antecipação seja idempotente e lançada no ledger (CONST III). Esta spec define o comportamento visível e as regras de segurança; o parceiro concreto entra por um adaptador, como o PSP da spec 012.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.3.3 | Antecipar recebíveis | Volume antecipado |
| DF 5.2 | Receita de antecipação | Receita da taxa da Koovela |

Personas: Proprietário; colaborador (PJ ou CLT); Fin/Ops da Koovela.

---

## Clarifications

### Session 2026-11-25

- Q: Como fica a antecipação enquanto não há parceiro financeiro e parecer regulatório? (PEN-28) → A: Construída com parceiro de teste e desligada em produção até haver parceiro e parecer; no modelo, colaboradores PJ e CLT são elegíveis, já que a comissão passa pelo split para todos.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estabelecimento antecipa recebíveis (Priority: P1)

Como Proprietário, quero ver quanto tenho a receber nos próximos dias, simular quanto recebo hoje se antecipar e confirmar.

**Why this priority**: tela "Antecipação de recebíveis" (DF 9.11); é o uso principal da `[D38]`.

**Independent Test**: com o parceiro de teste e uma agenda de recebíveis sintética, simular a antecipação de R$ 1.000,00, conferir taxas e valor líquido, confirmar e ver o crédito e os lançamentos no ledger.

**Acceptance Scenarios**:

1. **Given** um negócio elegível, **When** o Proprietário abre "Antecipação de recebíveis", **Then** vê a agenda de recebíveis dos pagamentos feitos pela Koovela (valor por data de liquidação), o valor disponível para antecipar (pelo limite do parceiro) e as antecipações anteriores.
2. **Given** a simulação, **When** o Proprietário escolhe um valor ou um conjunto de datas, **Then** vê o valor bruto, a taxa do parceiro, a taxa da Koovela, o valor líquido, o custo efetivo total (CET) ao mês e a data do crédito, antes de confirmar.
3. **Given** a confirmação, **When** feita com reautenticação com segundo fator (REQ-IDN-022), **Then** a operação é enviada ao parceiro com chave de idempotência; o valor é creditado na conta do recebedor (spec 012) na data informada; os recebíveis antecipados ficam marcados como cedidos.
4. **Given** a resposta do parceiro, **When** recusada, **Then** o Proprietário vê o motivo informado; nada é lançado.
5. **Given** um negócio não elegível, **When** abre a tela, **Then** vê o motivo (recebedor não verificado, histórico insuficiente, fatura em atraso, vertical restrita) e não vê oferta.
6. **Given** a oferta, **When** exibida, **Then** não há antecipação automática, pré-seleção do valor máximo nem mensagem de urgência.

---

### User Story 2 - Colaborador antecipa a própria comissão (Priority: P1)

Como colaborador, quero receber agora parte da comissão já apurada, sem esperar a data do repasse.

**Why this priority**: tela "Antecipar comissão" (DF 9.11); é a parte da `[D38]` voltada ao colaborador.

**Independent Test**: num negócio que permite antecipação de comissão, com um fechamento aprovado e não pago, o colaborador simula e confirma a antecipação de 50% da comissão; conferir o crédito, o aviso ao Proprietário e o ajuste no repasse.

**Acceptance Scenarios**:

1. **Given** o app do colaborador, **When** o negócio ativou "permitir antecipação de comissão" e o colaborador é elegível, **Then** ele vê a comissão já aprovada no fechamento (spec 018) e ainda não paga, com a data prevista do repasse e o valor disponível para antecipar.
2. **Given** a simulação, **When** o colaborador escolhe o valor, **Then** vê as taxas, o valor líquido, o CET e a data do crédito, antes de confirmar.
3. **Given** a confirmação com segundo fator, **When** aceita pelo parceiro, **Then** o valor líquido vai para a conta do colaborador; o Proprietário é avisado; no repasse daquele fechamento, a parte antecipada é paga ao parceiro, e não ao colaborador, conforme a forma do repasse (spec 018, `[PEN-14]`).
4. **Given** a comissão ainda em rascunho ou contestada, **When** o colaborador tenta antecipar, **Then** não pode; só comissão aprovada é antecipável.
5. **Given** o tipo de vínculo do colaborador (PJ ou CLT), **When** a oferta é calculada, **Then** colaboradores PJ e CLT são elegíveis no modelo (REQ-ANT-001), porque a comissão de todos passa pelo split; a elegibilidade real em produção depende do parecer regulatório.

---

### User Story 3 - Estornos depois da antecipação (Priority: P2)

Como Koovela, quero que estornos e chargebacks de pagamentos já antecipados sejam tratados sem deixar o ledger desequilibrado nem prejudicar o parceiro.

**Why this priority**: risco financeiro central da antecipação.

**Independent Test**: antecipar um recebível de teste e depois estornar o pagamento original; conferir o débito do valor no próximo recebível do estabelecimento e o equilíbrio do ledger.

**Acceptance Scenarios**:

1. **Given** um pagamento antecipado, **When** é estornado ou sofre chargeback, **Then** o valor é descontado dos próximos recebíveis do estabelecimento, conforme o contrato com o parceiro; o Proprietário é avisado.
2. **Given** recebíveis futuros insuficientes, **When** o desconto não cabe, **Then** fica um saldo devedor do estabelecimento com o parceiro, mostrado no painel, e novas antecipações ficam bloqueadas até a quitação.
3. **Given** uma comissão antecipada, **When** o fechamento recebe ajuste negativo no período seguinte (spec 018), **Then** o ajuste é descontado da comissão futura do colaborador, e não do valor já antecipado.
4. **Given** qualquer operação, **When** lançada, **Then** o ledger fica equilibrado (débitos iguais a créditos) e a conciliação diária com o parceiro aponta divergências ao Fin/Ops.

---

### User Story 4 - Parceiro, taxas e acompanhamento no back-office (Priority: P2)

Como Fin/Ops, quero configurar o parceiro, a taxa da Koovela e os limites, e acompanhar volume, receita e inadimplência.

**Why this priority**: sem configuração, a função não abre; sem acompanhamento, o risco não é visto.

**Independent Test**: no back-office, definir a taxa da Koovela, ativar a função para um grupo de teste de negócios e conferir o relatório depois de duas operações.

**Acceptance Scenarios**:

1. **Given** o back-office, **When** o Fin/Ops configura, **Then** define a taxa da Koovela (percentual sobre o valor antecipado, versionado, sem valor fixo no código), os limites diários por negócio e por colaborador e as verticais excluídas.
2. **Given** a função, **When** ativada, **Then** é ligada por flag (spec 004), por grupo de negócios, só depois de haver parceiro contratado e parecer regulatório.
3. **Given** o acompanhamento, **When** o Fin/Ops abre, **Then** vê volume antecipado, receita da Koovela, recusas, saldos devedores e divergências da conciliação, por dia.

---

### Edge Cases

- **Parceiro fora do ar**: a simulação mostra "indisponível no momento"; nenhuma operação fica pela metade (idempotência e reconsulta).
- **Confirmação repetida** (toque duplo, rede instável): uma operação só, pela chave de idempotência.
- **Simulação vencida**: vale por 10 minutos; depois disso, é refeita.
- **Recebedor que troca a conta bancária** (REQ-PAG-012): antecipações ficam bloqueadas por 72 horas depois da troca.
- **Negócio em suspensão ou encerramento** (specs 002 e 019): sem novas antecipações; as já feitas seguem o contrato com o parceiro.
- **Colaborador que sai do negócio**: só pode antecipar comissão já aprovada; o vínculo encerrado não bloqueia o que já foi antecipado.
- **Pagamentos no local** (REQ-PAG-030): não geram recebíveis antecipáveis.

---

## Requirements *(mandatory)*

Formato: `REQ-ANT-NNN (origem: …)`.

### Functional Requirements

**Enquadramento e parceiro**

- **REQ-ANT-001** (origem: PEN-28 | D38): A função DEVE ficar desligada em produção até haver parceiro financeiro contratado e parecer regulatório (Bacen); DEVE ser construída e testada com o parceiro de teste; no modelo, colaboradores PJ e CLT são elegíveis.
- **REQ-ANT-002** (origem: D38 | CONST VII): Toda interação com o parceiro DEVE passar por uma interface de antecipação, como o PSP na spec 012; existe um parceiro de teste para desenvolvimento e homologação.
- **REQ-ANT-003** (origem: D38): A Koovela NÃO DEVE emprestar nem comprar recebíveis com recursos próprios; a operação é do parceiro, e a Koovela recebe a sua taxa.

**Estabelecimento**

- **REQ-ANT-010** (origem: D38 | DF 9.11): O Proprietário DEVE ver a agenda de recebíveis dos pagamentos feitos pela Koovela, o valor disponível e as antecipações anteriores.
- **REQ-ANT-011** (origem: CDC | Res. CMN): A simulação DEVE mostrar valor bruto, taxa do parceiro, taxa da Koovela, valor líquido, CET ao mês e data do crédito; vale por 10 minutos.
- **REQ-ANT-012** (origem: CONST III | CONST V): A confirmação DEVE exigir reautenticação com segundo fator e chave de idempotência; os recebíveis antecipados ficam marcados como cedidos.
- **REQ-ANT-013** (origem: D38): A elegibilidade DEVE exigir recebedor verificado (spec 012), sem fatura em atraso (spec 019), sem saldo devedor com o parceiro e fora das verticais excluídas; o motivo da inelegibilidade é mostrado.
- **REQ-ANT-014** (origem: D38 "sob demanda"): NÃO DEVE existir antecipação automática, pré-seleção do valor máximo nem mensagem de urgência.
- **REQ-ANT-015** (origem: REQ-PAG-012): Antecipações DEVEM ficar bloqueadas por 72 horas depois de troca da conta bancária.

**Colaborador**

- **REQ-ANT-020** (origem: D38): O colaborador SÓ DEVE poder antecipar comissão aprovada no fechamento (spec 018) e ainda não paga, quando o negócio tiver ativado "permitir antecipação de comissão".
- **REQ-ANT-021** (origem: CONST V): A confirmação DEVE exigir segundo fator; o Proprietário é avisado de cada antecipação.
- **REQ-ANT-022** (origem: REQ-FEC-020 | PEN-14): No repasse do fechamento, a parte antecipada DEVE ser paga ao parceiro, e não ao colaborador, conforme a forma do repasse decidida no `[PEN-14]`.
- **REQ-ANT-023** (origem: REQ-FEC-003): Ajustes negativos posteriores DEVEM ser descontados da comissão futura, não do valor antecipado.

**Estornos e conciliação**

- **REQ-ANT-030** (origem: CONST III): Estorno ou chargeback de pagamento antecipado DEVE ser descontado dos próximos recebíveis do estabelecimento, com aviso; o que não couber vira saldo devedor, que bloqueia novas antecipações.
- **REQ-ANT-031** (origem: CONST III): Toda operação DEVE ser lançada no ledger em centavos, sempre equilibrado; o CI DEVE ter testes de propriedade do equilíbrio para antecipação, estorno e repasse.
- **REQ-ANT-032** (origem: CONST III): DEVE existir conciliação diária com o parceiro, com divergências enviadas ao Fin/Ops.

**Back-office**

- **REQ-ANT-040** (origem: CONST 8 | DF 5.2): A taxa da Koovela, os limites diários e as verticais excluídas DEVEM ser configuráveis no back-office, versionados, sem valor fixo no código.
- **REQ-ANT-041** (origem: CONST 8 | REQ-FLG-001): A função DEVE ser ligada por flag por grupo de negócios.
- **REQ-ANT-042** (origem: DF 3.3.3): O back-office DEVE mostrar por dia volume, receita, recusas, saldos devedores e divergências.
- **REQ-ANT-043** (origem: CONST V): Toda operação, configuração e acesso aos dados financeiros DEVE gerar registro na trilha de auditoria.

### Key Entities

- **Agenda de recebíveis** (projeção do PSP e do ledger): valor por data de liquidação, cedido ou livre.
- **Simulação**: solicitante, valor, taxas, líquido, CET, validade.
- **Antecipação**: solicitante (estabelecimento ou colaborador), recebíveis ou comissão, valores, chave de idempotência, estado, referência do parceiro.
- **Saldo devedor**: estabelecimento, valor, origem (estorno), estado.
- **Configuração de antecipação** (back-office, versionada): parceiro, taxa da Koovela, limites, verticais excluídas.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9.11) | Código |
|---|---|---|
| Painel do cliente | Antecipação de recebíveis | Registrado no plano |
| App do colaborador e `/pro` | Antecipar comissão | Registrado no plano |
| Back-office | Antecipação: parceiro, taxas e acompanhamento (sem tela própria no protótipo) | Registrado no plano |

A opção "permitir antecipação de comissão" nas configurações do negócio precisa ser conferida no protótipo.

---

## Regras e estados

- **Antecipação**: `simulada` → `solicitada` → `aprovada` → `creditada` | `recusada` | `falhou` (reconsulta idempotente).
- **Recebível**: `livre` → `cedido` (antecipado) → `liquidado` (pago ao parceiro).
- **Saldo devedor**: `aberto` → `quitado`.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Dados bancários e documento do solicitante | Pessoal; cifrado (CONST 3) | Execução de contrato (art. 7, V) | 5 anos depois da última operação (prazo fiscal e regulatório) | Solicitante; Fin/Ops com acesso auditado |
| Dados enviados ao parceiro | Pessoal (compartilhamento) | Execução de contrato; aviso claro antes da primeira operação | Pelo contrato do parceiro | Parceiro, como controlador próprio da operação financeira |
| Histórico de antecipações | Pessoal e financeiro | Cumprimento de obrigação legal (art. 7, II) | 5 anos | Solicitante; Proprietário (só o total antecipado pelo colaborador); Fin/Ops |

O Proprietário vê que o colaborador antecipou e quanto (porque afeta o repasse), mas não vê as taxas pagas pelo colaborador.

---

## Permissões

| Ação | Colaborador | Gerente | Proprietário | Fin/Ops |
|---|---|---|---|---|
| Antecipar recebíveis do negócio | — | — | ✔ | — |
| Permitir antecipação de comissão | — | — | ✔ | — |
| Antecipar a própria comissão | ✔ | ✔ (a própria) | — | — |
| Configurar parceiro, taxas e limites | — | — | — | ✔ |
| Ver acompanhamento e conciliação | — | — | — | ✔ |

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `finance.advance.requested.v1` / `.approved.v1` / `.credited.v1` / `.declined.v1` | Ciclo da antecipação |
| `finance.advance.clawback_applied.v1` | Desconto de estorno |
| `finance.advance.debt_opened.v1` / `.debt_settled.v1` | Saldo devedor |
| `finance.advance.reconciliation_mismatch.v1` | Divergência na conciliação |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Volume antecipado por dia | DF 3.3.3 | Acompanhada |
| Receita da taxa da Koovela | DF 5.2 | Acompanhada |
| Taxa de recusa do parceiro | Operação | Acompanhada |
| Saldo devedor aberto | Risco | Acompanhada |
| Divergências de conciliação | CONST III | 0 sem tratamento em 1 dia útil |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes de repetição, uma confirmação gera exatamente uma operação.
- **SC-002**: O ledger fica equilibrado em 100% dos testes de propriedade com antecipação, estorno e repasse.
- **SC-003**: O Proprietário ou o colaborador simula e confirma uma antecipação em até 2 minutos.
- **SC-004**: 100% das simulações mostram CET, taxas e valor líquido antes da confirmação.
- **SC-005**: Nenhuma comissão em rascunho ou contestada é antecipada, verificado por teste.
- **SC-006**: Toda divergência de conciliação chega ao Fin/Ops no mesmo dia.

---

## Pendências e conflitos

### Bloqueantes

| Item | Pergunta | Decisão (clarify 2026-11-25) |
|---|---|---|
| **PEN-28** | Qual parceiro e qual enquadramento regulatório, inclusive para colaborador PJ e CLT? | Desligada em produção até parceiro e parecer; PJ e CLT no modelo; parceiro de teste |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-14** — comissão via split | Specs 007, 012 e 018 | Split para todos (decidido): a parte antecipada vai ao parceiro no split |
| **PEN-11** — nível do recebedor | Spec 012 | Elegibilidade exige recebedor verificado |
| **PEN-06** — restrições de saúde | Spec 005 | Verticais de saúde podem ser excluídas pelo back-office |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Validade da simulação | ASSUMIDO: 10 minutos |
| Bloqueio por troca de conta | ASSUMIDO: 72 horas |
| Estorno | ASSUMIDO: desconto nos próximos recebíveis; o resto vira saldo devedor |

---

## Fora do escopo desta especificação

- Empréstimos, crédito pessoal, capital de giro e outros produtos financeiros (fora da fase 3 por `[D36]`).
- Antecipação automática ou programada.
- Antecipação de pagamentos feitos fora da Koovela.
- Antecipação para o consumidor (por exemplo, parcelamento próprio).

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: simulação válida por 10 minutos; bloqueio de 72 horas; operação em até 2 minutos.
- O parceiro fornece agenda de recebíveis, limites e preço; a Koovela soma a sua taxa e mostra o CET.
- O domínio dono é `finance` (CONST 4.4), lendo dados de `payments` (spec 012) e do fechamento (spec 018).
