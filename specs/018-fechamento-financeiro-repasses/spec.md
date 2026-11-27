# Feature Specification: Fechamento financeiro e repasses

**Feature Branch**: `018-fechamento-financeiro-repasses`

**Created**: 2026-11-24

**Status**: Clarified

**Input**: User description: "018 fechamento-financeiro-repasses — seguir a sequência da constituição (seção 10): J7 completo, comissões no app do colaborador. Depende de 007, 012 e 017. Pendência PEN-14. Deixar [NEEDS CLARIFICATION] para rodar /speckit-clarify de todas as specs depois."

**Fase**: v1.0

**Superfícies afetadas**: painel do cliente ("Repasses ao colaborador"; fechamento do período; relatório do negócio para o contador) · app do colaborador e `/pro` ("Comissões": previsto, a receber, recebido; conferência do fechamento) · back-office (consulta pelo Financeiro/Ops)

**Depende de**: 007 `equipe-escalas-comissao` · 012 `pagamentos-split` · 017 `fiscal-nfse` (e, por elas, 002 a 016)

**Documentos-fonte**: Constituição v1.0.0 (`.specify/memory/constitution.md`), Princípios III, IV, V, VII, IX, seções 2, 8 e 10 · Documento Fundamental v0.5 (`.specify/docs/fundamental/koovela-inicioII.md`), seções 2.3, 3.2.5, 3.3.2, 6, 7, 8 (J7), 9.3, 9.4, 9.9, 10.4, 17 (`[D17]`) e 18 (`[PEN-14]`). Abreviações usadas nas origens: **CONST** = constituição, **DF** = Documento Fundamental.

---

## Contexto e problema

O fim do mês num salão ou numa clínica costuma ser uma planilha: somar atendimentos de cada profissional, aplicar a comissão, descontar estornos, conferir com o extrato, emitir as notas que faltaram e pagar a equipe. Isso demora (DF 3.2.5, "tempo de fechamento") e gera desconfiança: o colaborador quer "prever comissões com exatidão" (DF 3.3.2, "divergência previsto/pago").

A J7 (DF 8) é o fluxo inteiro: **atendimentos concluídos → comissão conforme a regra e a absorção de desconto (`[D17]`) → split → repasse (`[PEN-14]`) → NFS-e → conciliação**. As peças já existem nas specs anteriores: regra e cálculo de comissão (007), split, estornos e conciliação (012), notas (017). Esta spec **fecha o ciclo**: junta tudo num fechamento por período, por colaborador e por negócio, com conferência, aprovação, registro do repasse e exportação.

A comissão é repassada automaticamente pelo split a todos os colaboradores (`[PEN-14]` decidido); o fechamento confere o repassado com o calculado.

Problemas do Documento Fundamental atendidos:

| # | Problema | Indicador |
|---|---|---|
| 3.2.5 | Gerir agenda e comissões | Tempo de fechamento |
| 3.3.2 | Prever comissões com exatidão | Divergência previsto/pago |
| 3.2.12 | Cumprir obrigação fiscal | Notas pendentes no fechamento |
| DF 14 | Monetização | Margem por tenant |

Personas: Proprietário; Gerente de filial; Colaborador; Financeiro/Ops; contador do estabelecimento (pela exportação).

---

## Clarifications

### Session 2026-11-25

- Q: Como o Gerente vê o resumo e como a taxa aparece? → A: Gerente (PEN-03, decidido na spec 003): vê faturamento e configura fidelidade só da própria filial; o Proprietário pode retirar. Taxa por agendamento (PEN-09, decidido na spec 012): retida no split nos pagamentos pela plataforma; na fatura nos pagamentos no local. Comissão (PEN-14, decidido nas specs 007 e 012): repassada pelo split a todos os colaboradores.
- Q: A comissão é paga fora da plataforma ou repassada pelo split? (PEN-14) → A: Repassada pelo split a todos os colaboradores (PJ e CLT), cada um como recebedor verificado no PSP; o fechamento confere o repassado com o calculado. Risco: enquadramento do CLT a validar com contador e jurídico.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fechamento do período por colaborador (Priority: P1)

Como Proprietário, quero que, ao fim de cada período, o sistema monte o fechamento de cada colaborador com os atendimentos, a comissão, os ajustes e o total a pagar, para eu revisar e aprovar em minutos.

**Why this priority**: é o núcleo da J7 e a resposta ao "tempo de fechamento" (DF 3.2.5).

**Independent Test**: com um mês de atendimentos de teste de três colaboradores (com desconto, estorno e pagamento no local), gerar o fechamento e conferir, linha a linha, que cada comissão bate com o contrato de cálculo da spec 007.

**Acceptance Scenarios**:

1. **Given** o período do negócio (semanal, quinzenal ou mensal; padrão mensal), **When** o período termina, **Then** um fechamento em `rascunho` é gerado para cada colaborador ativo no período, com cada atendimento concluído e pago: data, serviço, valor pago, base da comissão (pela regra do `[D17]`), regra aplicada e comissão.
2. **Given** o rascunho, **When** há estornos, chargebacks ou correções de períodos já fechados, **Then** entram como ajustes do período atual, com referência ao atendimento original; nada de um período fechado é alterado.
3. **Given** o rascunho, **When** o Proprietário acrescenta ajustes manuais (bônus, desconto, vale, taxa de estação do arrendatário), **Then** cada ajuste tem valor, tipo e motivo, e gera registro na trilha de auditoria.
4. **Given** atendimentos do período ainda pendentes (sem check-out ou sem pagamento registrado, REQ-AGE-061), **When** o rascunho é aberto, **Then** aparecem numa lista separada, fora do total, com a opção de resolver antes de fechar.
5. **Given** o rascunho revisado, **When** o Proprietário aprova, **Then** o fechamento fica `aprovado` e imutável; correções posteriores só entram como ajustes do próximo período.
6. **Given** todos os valores, **When** calculados, **Then** estão em centavos inteiros, e o total do fechamento é exatamente a soma das linhas e ajustes (CONST III).

---

### User Story 2 - Colaborador confere antes da aprovação (Priority: P1)

Como Colaborador, quero ver no app o fechamento do meu período antes de ser aprovado e contestar uma linha que eu ache errada.

**Why this priority**: a transparência é o que reduz a "divergência previsto/pago" (DF 3.3.2) e o conflito no fim do mês.

**Independent Test**: gerar um rascunho, abrir no app do colaborador, contestar uma linha com motivo, responder pelo painel e aprovar; conferir que o colaborador vê a resposta.

**Acceptance Scenarios**:

1. **Given** um fechamento em `rascunho`, **When** o período termina, **Then** o Colaborador é avisado (spec 011) e vê no app o total, cada atendimento e cada ajuste, com a regra aplicada.
2. **Given** o rascunho, **When** o Colaborador contesta uma linha ou ajuste, com motivo, em até 3 dias após o aviso (padrão), **Then** a contestação aparece no painel do Proprietário e do Gerente da filial.
3. **Given** uma contestação, **When** o Proprietário responde (corrige com ajuste ou mantém com explicação), **Then** o Colaborador é avisado.
4. **Given** contestações abertas, **When** o Proprietário tenta aprovar, **Then** vê o aviso e pode aprovar mesmo assim, registrando a decisão; a contestação fica no histórico.
5. **Given** o prazo de conferência vencido sem contestação, **When** o Proprietário aprova, **Then** o fechamento é aprovado normalmente.

---

### User Story 3 - Registrar e acompanhar o repasse (Priority: P1)

Como Proprietário, quero registrar o pagamento da comissão de cada colaborador, ou acompanhar o repasse automático, e como Colaborador quero ver o que está a receber e o que já recebi.

**Why this priority**: sem o repasse, o fechamento não termina; é o "repasse" da J7 e o "previsto / a receber / recebido" da tela de comissões (REQ-EQP-048).

**Independent Test**: com um fechamento aprovado, registrar o pagamento por Pix fora da plataforma, conferir o estado "pago" no painel e "recebido" no app do colaborador, e a confirmação do colaborador.

**Acceptance Scenarios**:

1. **Given** um fechamento aprovado, **When** o repasse é feito, **Then** a comissão já foi repassada ao colaborador pelo split de cada pagamento (spec 012); o fechamento confere o repassado com o calculado e lança a diferença como ajuste (REQ-FEC-023); comissões retidas de colaborador sem recebedor verificado são liberadas quando ele for verificado (`[PEN-14]` resolvido).
2. **Given** pagamento fora da plataforma, **When** o Proprietário registra o repasse, **Then** informa data, meio (Pix, transferência, dinheiro, outro) e valor; repasse parcial deixa o saldo pendente.
3. **Given** um repasse registrado, **When** o Colaborador abre o app, **Then** vê o valor como "recebido" e pode confirmar o recebimento ou apontar divergência.
4. **Given** o repasse automático pelo split (`[PEN-14]`), **When** o fechamento é aprovado, **Then** o sistema confere o que já foi repassado a cada colaborador no período com o total calculado, e a diferença vira ajuste (a pagar ou a descontar) no próximo período.
5. **Given** "Comissões" no app (REQ-EQP-050), **When** o Colaborador abre, **Then** vê, por período: previsto (atendimentos concluídos ainda não fechados), a receber (fechamentos aprovados não pagos) e recebido.
6. **Given** um fechamento aprovado e não pago há mais de 10 dias, **When** o prazo passa, **Then** o Proprietário é lembrado.

---

### User Story 4 - Fechamento do negócio e exportação para o contador (Priority: P2)

Como Proprietário, quero um resumo do período do negócio, com receita, taxas, comissões, estornos, notas e pendências, e exportar tudo para o contador.

**Why this priority**: "tempo de fechamento" (DF 3.2.5) inclui o financeiro inteiro, não só a equipe.

**Independent Test**: com um mês de dados de teste, abrir o resumo do negócio, conferir os totais contra a tela "Financeiro" (spec 012) e o histórico de notas (spec 017), e exportar.

**Acceptance Scenarios**:

1. **Given** o resumo do período, **When** o Proprietário abre, **Then** vê, por filial e no total: receita (por meio de pagamento, pela plataforma e no local), taxas do PSP, taxas da Koovela, comissões, ajustes, estornos, chargebacks, notas emitidas e pendentes, e resultado do período para o estabelecimento.
2. **Given** a lista de verificação do fechamento, **When** exibida, **Then** mostra o que falta: atendimentos pendentes de registro, notas pendentes (spec 017), divergências de conciliação abertas (spec 012), contestações de colaboradores e repasses não registrados.
3. **Given** o período, **When** o Proprietário marca o fechamento do negócio como concluído, **Then** fica registrado com data e ator; pendências restantes ficam visíveis no período seguinte.
4. **Given** a exportação, **When** pedida, **Then** gera planilha com o resumo, as linhas por colaborador, os pagamentos e os ajustes, junto com a exportação fiscal (REQ-FIS-031) do mesmo período.
5. **Given** cada colaborador, **When** o fechamento é aprovado, **Then** um demonstrativo do período (atendimentos, comissão, ajustes, total, repasses) fica disponível para ele baixar.

---

### User Story 5 - Gerente prepara o fechamento da filial (Priority: P3)

Como Gerente de filial, quero revisar o fechamento dos colaboradores da minha filial e responder às contestações, deixando a aprovação para o Proprietário.

**Why this priority**: DF 7 dá ao Gerente "ver e alterar comissão"; numa rede, o Proprietário não revisa linha a linha.

**Independent Test**: com uma rede de 2 filiais, o Gerente da filial A revisa os fechamentos da A, inclui um ajuste e responde a uma contestação; não vê os da B; o Proprietário aprova.

**Acceptance Scenarios**:

1. **Given** um Gerente, **When** abre "Repasses ao colaborador", **Then** vê os fechamentos dos colaboradores da própria filial.
2. **Given** o rascunho, **When** o Gerente inclui ajustes e responde a contestações, **Then** fica registrado; o fechamento passa a `revisado`.
3. **Given** a aprovação, **When** o Gerente tenta aprovar, **Then** só o Proprietário aprova (padrão); o Proprietário pode delegar a aprovação ao Gerente da filial.
4. **Given** o resumo do negócio com receita, **When** o Gerente tenta abrir, **Then** vê só o resumo da própria filial, salvo se o Proprietário retirar (`[PEN-03]` decidido na spec 003).

---

### Edge Cases

- **Colaborador que saiu no meio do período** (spec 007): o fechamento dele é gerado até a data de fim do vínculo, com os ajustes posteriores entrando num fechamento final extra.
- **Atendimento concluído num período e pago no seguinte**: entra no período em que ficou concluído e pago.
- **Estorno de atendimento de período já pago**: ajuste negativo no próximo período; se o colaborador não tiver mais atendimentos, o saldo negativo fica registrado e é mostrado ao Proprietário, sem cobrança automática.
- **Combo e pacote**: a comissão por etapa e por sessão segue a spec 007 (REQ-EQP-044).
- **Autônomo sem equipe**: não há fechamento de colaborador; o resumo do negócio continua.
- **Arrendatário de estação**: o fechamento mostra a cota-parte do estabelecimento e o valor do colaborador (REQ-EQP-043); a taxa de estação entra como ajuste.
- **Mudança de regra de comissão no meio do período**: cada atendimento usa a versão congelada no agendamento (REQ-EQP-045).
- **Período sem atendimentos**: fechamento gerado com total zero, só se houver ajustes.
- **Fuso e virada do período**: o período usa a data local da filial.

---

## Requirements *(mandatory)*

Formato: `REQ-FEC-NNN (origem: …)`.

### Functional Requirements

**Período e geração**

- **REQ-FEC-001** (origem: J7 | DF 3.2.5): O negócio DEVE configurar o período de fechamento (semanal, quinzenal ou mensal; padrão mensal), na data local da filial.
- **REQ-FEC-002** (origem: J7): Ao fim do período, DEVE ser gerado um fechamento em `rascunho` por colaborador ativo no período, com cada atendimento concluído e pago: data, serviço, valor pago, base, regra aplicada e comissão, calculados pelo contrato da spec 007 (REQ-EQP-046).
- **REQ-FEC-003** (origem: CONST III): Estornos, chargebacks e correções de períodos aprovados DEVEM entrar como ajustes do período atual, com referência ao original; fechamentos aprovados NUNCA DEVEM ser alterados.
- **REQ-FEC-004** (origem: DF 2.3 | CONST V): Ajustes manuais (bônus, desconto, vale, taxa de estação, outro) DEVEM ter valor, tipo e motivo, e gerar registro na trilha de auditoria.
- **REQ-FEC-005** (origem: REQ-AGE-061): Atendimentos do período pendentes de registro ou de pagamento DEVEM aparecer separados, fora do total.
- **REQ-FEC-006** (origem: CONST III | CONST VIII): Os valores DEVEM estar em centavos inteiros, e o total DEVE ser exatamente a soma das linhas e ajustes; DEVE existir teste de propriedade que verifique isso.

**Conferência e aprovação**

- **REQ-FEC-010** (origem: DF 3.3.2): O Colaborador DEVE ser avisado do rascunho e poder conferir e contestar linhas ou ajustes, com motivo, em até 3 dias após o aviso (configurável de 1 a 10).
- **REQ-FEC-011** (origem: DF 3.3.2): Contestações DEVEM aparecer ao Proprietário e ao Gerente da filial, ser respondidas (com ajuste ou explicação) e avisar o Colaborador.
- **REQ-FEC-012** (origem: CONST V): Aprovar com contestação aberta DEVE ser possível com registro da decisão; a contestação fica no histórico.
- **REQ-FEC-013** (origem: DF 7): A aprovação DEVE ser do Proprietário, que pode delegá-la ao Gerente da filial; o fechamento aprovado fica imutável.

**Repasse**

- **REQ-FEC-020** (origem: PEN-14 | J7): O repasse DEVE ser feito pelo split (spec 012) a todos os colaboradores; o registro manual de pagamento fora da plataforma (REQ-FEC-021) fica só para ajustes e valores de pagamentos no local. Risco: enquadramento do CLT a validar com contador e jurídico.
- **REQ-FEC-021** (origem: J7): O registro do repasse DEVE ter data, meio, valor e ator; repasse parcial deixa saldo pendente; tudo gera registro na trilha de auditoria.
- **REQ-FEC-022** (origem: DF 3.3.2): O Colaborador DEVE poder confirmar o recebimento ou apontar divergência no app.
- **REQ-FEC-023** (origem: PEN-14 | REQ-PAG-043): O fechamento DEVE conferir o repassado pelo split com o calculado e lançar a diferença como ajuste do próximo período; a comissão retida por falta de recebedor verificado (spec 012) aparece à parte, não conta como diferença e entra como repassada no período em que for liberada.
- **REQ-FEC-024** (origem: REQ-EQP-050 | DF 9.4): "Comissões" no app DEVE mostrar previsto, a receber e recebido por período.
- **REQ-FEC-025** (origem: J7): Fechamento aprovado e não pago há mais de 10 dias DEVE gerar lembrete ao Proprietário.

**Fechamento do negócio**

- **REQ-FEC-030** (origem: DF 3.2.5 | DF 9.3): O resumo do período DEVE mostrar, por filial e no total: receita por meio (plataforma e no local), taxas do PSP, taxas da Koovela, comissões, ajustes, estornos, chargebacks, notas emitidas e pendentes e o resultado do estabelecimento; os números DEVEM bater com a tela "Financeiro" (spec 012) e o histórico de notas (spec 017).
- **REQ-FEC-031** (origem: J7): A lista de verificação DEVE mostrar pendências: atendimentos sem registro, notas pendentes, divergências de conciliação, contestações e repasses não registrados.
- **REQ-FEC-032** (origem: CONST V): Marcar o fechamento do negócio como concluído DEVE registrar data e ator; pendências restantes passam ao período seguinte.
- **REQ-FEC-033** (origem: DF 3.2.5 | REQ-FIS-031): A exportação DEVE gerar planilha com resumo, linhas por colaborador, pagamentos e ajustes, junto com a exportação fiscal do período.
- **REQ-FEC-034** (origem: DF 3.3.2): Cada colaborador DEVE ter um demonstrativo do período aprovado para baixar.

**Isolamento, contratos e eventos**

- **REQ-FEC-040** (origem: CONST II): Fechamentos, ajustes e repasses ficam no espaço de dados do tenant.
- **REQ-FEC-041** (origem: CONST VII): O fechamento DEVE usar só contratos das specs 007, 012 e 017; nenhuma regra de comissão, split ou nota é recalculada aqui de outra forma.
- **REQ-FEC-042** (origem: CONST IX): Os eventos desta spec DEVEM conter apenas identificadores e valores, sem dados bancários.

### Key Entities

- **Período de fechamento**: negócio, tipo (semanal, quinzenal, mensal), início, fim.
- **Fechamento do colaborador**: colaborador, período, linhas, ajustes, total, estado, prazo de conferência, quem revisou e aprovou.
- **Linha do fechamento**: atendimento, valor pago, base, regra (versão), comissão.
- **Ajuste**: fechamento, tipo, valor, motivo, referência (atendimento, estorno, período anterior), autor.
- **Contestação**: fechamento, linha ou ajuste, motivo, resposta, estado.
- **Repasse**: fechamento, data, meio, valor, autor, confirmação do colaborador.
- **Fechamento do negócio**: negócio, período, totais, pendências, concluído por, data.

---

## Telas do protótipo cobertas

| Superfície | Tela (DF 9) | Código |
|---|---|---|
| Painel (DF 9.3) | Repasses ao colaborador · resumo do período e lista de verificação | Registrados no plano |
| App do colaborador (DF 9.4) | Comissões (previsto, a receber, recebido; conferência e contestação) | Registrado no plano |
| Colaborador desktop (DF 9.9) | Comissões | Registrado no plano |
| Back-office | Consulta de fechamentos pelo Financeiro/Ops | Registrado no plano |

A contestação pelo colaborador e a lista de verificação do fechamento precisam ser conferidas no protótipo.

---

## Regras e estados

- **Fechamento do colaborador**: `rascunho` → `em_conferência` (aviso ao colaborador) → `revisado` (Gerente) → `aprovado` → `pago_parcial` | `pago`. A confirmação ou divergência do colaborador fica em cada repasse (`confirmado` | `divergente`), não no estado do fechamento.
- **Imutabilidade**: a partir de `aprovado`, linhas, ajustes e totais não mudam; só o estado de pagamento avança (`pago_parcial`, `pago`). Correções viram ajustes do próximo período.
- **Período de um atendimento**: o período em que ficou concluído e pago, pela data local da filial.
- **Total** = soma das comissões das linhas + soma dos ajustes, em centavos.

---

## Dados pessoais

| Campo | Classificação | Base legal (LGPD) | Retenção | Quem acessa |
|---|---|---|---|---|
| Comissões, ajustes e repasses do colaborador | Pessoal (remuneração) | Execução de contrato (art. 7, V); obrigação legal | 5 anos (guarda fiscal e trabalhista) | O próprio colaborador; Proprietário; Gerente da filial; Financeiro/Ops |
| Contestações e respostas | Pessoal | Execução de contrato | 5 anos | O próprio colaborador; Proprietário; Gerente da filial |
| Resumo do negócio | Dado da empresa; agregado | Execução de contrato | 5 anos | Proprietário; Financeiro/Ops |

Os dados bancários do colaborador ficam só no recebedor do PSP (specs 007 e 012); esta spec não guarda dado bancário. Passados os 5 anos, comissões, ajustes, repasses e contestações são anonimizados (o colaborador vira "colaborador removido"), mantendo os totais.

Regras: um colaborador nunca vê o fechamento de outro (DF 7, "leitura própria"); os consumidores aparecem nas linhas só pelo primeiro nome e pelo serviço; os demonstrativos não incluem dados de consumidores além disso.

---

## Permissões

Recorte da matriz RBAC (DF 7, "Ver e alterar comissão"):

| Ação | Colaborador | Recepção | Gerente | Proprietário | Fin/Ops |
|---|---|---|---|---|---|
| Ver o próprio fechamento; contestar; confirmar recebimento | ✔ | — | ✔ (o próprio) | — | — |
| Ver e revisar fechamentos da equipe; incluir ajustes; responder contestações | — | — | ✔ filial | ✔ | ✔ (leitura) |
| Aprovar fechamento | — | — | ✔ filial, se delegado | ✔ | — |
| Registrar repasse | — | — | — | ✔ | — |
| Ver o resumo do negócio e exportar | — | — | ✔ filial | ✔ | ✔ |

O Suporte em sessão de suporte não aprova fechamentos nem registra repasses (REQ-IDN-063).

---

## Eventos e métricas

### Eventos de domínio

| Evento | Quando |
|---|---|
| `payments.settlement_statement.{drafted,reviewed,approved,paid,payout_overdue}.v1` | Ciclo do fechamento do colaborador |
| `payments.settlement_dispute.{opened,answered}.v1` | Contestação |
| `payments.settlement_payout.recorded.v1` / `payments.settlement_payout.acknowledged.v1` (`confirmed` \| `diverged`) | Repasse |
| `payments.settlement_period.closed.v1` | Fechamento do negócio concluído |

### Métricas

| Métrica | Origem | Meta |
|---|---|---|
| Tempo de fechamento (fim do período → fechamento do negócio concluído) | DF 3.2.5 | Mediana até 2 dias úteis |
| Divergência entre comissão prevista e paga | DF 3.3.2 | 0 centavos sem ajuste explicado |
| % de fechamentos com contestação | DF 3.3.2 | Acompanhada |
| % de repasses confirmados pelo colaborador | DF 3.3.2 | Acompanhada |
| Pendências no fechamento (notas, divergências, registros) | REQ-FEC-031 | Acompanhada |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O Proprietário revisa e aprova o fechamento de 5 colaboradores em até 15 minutos.
- **SC-002**: Em 100% dos testes de propriedade, o total de cada fechamento é a soma exata das linhas e ajustes, e cada comissão é igual à do contrato de cálculo da spec 007.
- **SC-003**: Nenhum fechamento aprovado é alterado; 100% das correções aparecem como ajustes do período seguinte.
- **SC-004**: O Colaborador vê no app o previsto, o a receber e o recebido do mês em até 2 toques.
- **SC-005**: Os totais do resumo do negócio batem com a tela "Financeiro" e com o histórico de notas do mesmo período em 100% dos testes.
- **SC-006**: O contador recebe a exportação financeira e fiscal do mês num único pedido.
- **SC-007**: Metade dos negócios conclui o fechamento do mês em até 2 dias úteis após o fim do período.

---

## Pendências e conflitos

### Bloqueantes

| Item | Impacto | Situação |
|---|---|---|
| **PEN-14** — comissão só calculada (paga fora) ou repassada pelo split | Forma do repasse; conferência do repassado; tela de comissões | **Resolvido (clarify 2026-11-25)**: split para todos |

### Dependentes de decisão em outra spec

| Item | Onde é decidido | Comportamento aqui |
|---|---|---|
| **PEN-03** — Gerente vê faturamento | Spec 003 | Decidido: só da própria filial |
| **PEN-09** — taxa da Koovela no split ou na fatura | Spec 012 | Decidido: split + fatura; o resumo mostra as duas origens |
| **D17** — base da comissão | Spec 007 | O fechamento usa a base escolhida, congelada no agendamento |

### Assumidos

| Item | Padrão assumido (explícito e reversível) |
|---|---|
| Período | ASSUMIDO: mensal por padrão |
| Conferência | ASSUMIDO: 3 dias para o colaborador contestar |
| Aprovação | ASSUMIDO: do Proprietário, delegável ao Gerente da filial |
| Saldo negativo do colaborador | ASSUMIDO: registrado e mostrado, sem cobrança automática |

---

## Fora do escopo desta especificação

- Regra e cálculo de comissão (spec 007), split, estornos e conciliação (spec 012), emissão de notas (spec 017).
- Folha de pagamento, encargos trabalhistas, eSocial e contabilidade (escopo negativo, CONST 2).
- Nota fiscal do colaborador PJ ou parceiro para o estabelecimento.
- Antecipação de comissão (spec 036).
- Pagamento automático por transferência bancária fora do split.

---

## Assumptions

- Metas sem número nas fontes foram fixadas assim: período mensal; 3 dias de conferência (de 1 a 10); lembrete de repasse em 10 dias; fechamento do negócio em até 2 dias úteis (mediana); revisão de 5 colaboradores em até 15 minutos.
- Os ajustes manuais não mudam regras de comissão; são lançamentos pontuais com motivo.
- O fechamento usa apenas atendimentos concluídos e pagos; o previsto do app inclui também os concluídos ainda não fechados.
- O domínio dono desta spec é `payments` (CONST 4.4: "repasse"), lendo as comissões calculadas pela spec 007 e as notas da spec 017.
