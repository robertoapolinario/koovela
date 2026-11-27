# Research: Antecipação de recebíveis (036)

**Data**: 2026-11-26 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisões aplicadas:

- **D36**: fase 3.
- **D38**: sob demanda, para o estabelecimento e para o colaborador, via parceiro financeiro; a Koovela ganha uma taxa.
- **PEN-28**: desligada em produção até haver parceiro e parecer regulatório; construída com parceiro de teste; PJ e CLT elegíveis no modelo.
- **PEN-14**: comissão via split para todos.
- **PEN-11**: recebedor verificado.
- **PEN-06**: as verticais de saúde podem ser excluídas.

Base: 002 e 019 (suspensão e inadimplência), 003 (reautenticação), 004 (flags, auditoria, aprovação dupla), 011 (avisos), 012 (`PaymentProvider`, recebedores, split, livro de dupla entrada, idempotência, webhooks, conciliação), 018 (extrato aprovado, `paid_via_split_cents`, ajustes em período futuro), 021 (back-office), 022 (retenção).

Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono e localização

- **Decisão**: domínio `finance` (CONST 4.4), submódulo `advances`. As tabelas ficam assim:
  - **operação e lançamentos**: no schema do tenant, junto ao livro da 012, porque os recebíveis e os recebedores são do tenant;
  - **configuração global e receita da Koovela**: no `koovela_platform`.
- O `finance` lê o `payments` (agenda, recebedores, livro) e o `settlement` da 018 (extratos aprovados) por contrato. Não escreve nas tabelas desses domínios: os lançamentos no livro passam pela API do livro da 012.

## R2. Porta do parceiro

- **Decisão**: a interface `AdvanceProvider` em `packages/platform/advances` (REQ-ANT-002) tem estas operações:
  - `getSchedule(recipientRef)`: agenda de recebíveis por data de liquidação, livres ou cedidos, e limite disponível;
  - `quote(recipientRef, selection)`: preço do parceiro e data do crédito, com `quote_id` e validade;
  - `request(quoteId, idempotencyKey)`;
  - `status(requestRef)`;
  - `statement(date)`: extrato para conciliação;
  - webhook assinado de mudança de estado.
- **Adaptadores**:
  - `sandbox`: determinístico, com cenários de aprovação, recusa, tempo esgotado, crédito parcial e divergência, usado em dev, CI e homologação;
  - o adaptador real entra quando o parceiro for contratado. Pode ser o próprio PSP da 012, se ele oferecer antecipação, ou outra instituição que registre a cessão numa registradora de recebíveis.
- A Koovela nunca usa recursos próprios (REQ-ANT-003). O parceiro é quem antecipa e é controlador próprio dos dados da operação.
- **Alternativa rejeitada**: integrar direto com uma registradora. Seria a Koovela atuando como instituição, o que contraria a D38.

## R3. Interruptor de produção (PEN-28)

- **Decisão**: a flag `finance.advances` (004) é ligada por grupo de negócios (REQ-ANT-041). Uma segunda flag, `finance.advances.commission`, controla a parte do colaborador.
- Em produção, ligar a flag exige uma `finance_advance_config_version` aprovada com estes campos preenchidos: `partner_contract_ref`, `regulatory_opinion_ref`, `opinion_scope` (estabelecimento, colaborador PJ, colaborador CLT).
  - A checagem acontece no serviço de flags, como a 024 faz com a política de privacidade.
  - Sem esses campos, a flag recusa ligar em `prod` (REQ-ANT-001).
- `opinion_scope` permite liberar só o que o parecer cobrir. Por exemplo, liberar o estabelecimento antes do colaborador CLT. O modelo continua aceitando PJ e CLT.

## R4. Agenda e elegibilidade do estabelecimento

- **Decisão**: a agenda (REQ-ANT-010) junta duas fontes:
  - a agenda do parceiro, que é a fonte de verdade da cessão;
  - o livro da 012, só com pagamentos feitos pela Koovela, por data de liquidação.
  Pagamentos no local não entram (edge case).
- O `workers` atualiza a projeção `finance_receivable` a cada hora e quando a tela é aberta.
- **Elegibilidade** (REQ-ANT-013/015), avaliada na abertura, na simulação e na confirmação, com o motivo exibido:
  - recebedor `active` (012);
  - assinatura sem fatura em atraso e sem suspensão (019/002);
  - sem saldo devedor com o parceiro;
  - vertical fora das excluídas;
  - mais de 72 h desde a última troca de conta bancária;
  - dentro do limite diário da configuração;
  - flag ligada para o grupo.

## R5. Simulação e CET

- **Decisão**: a simulação (`finance_advance_quote`) é válida por 10 minutos (REQ-ANT-011, SC-004). Mostra:
  - valor bruto;
  - taxa do parceiro;
  - taxa da Koovela, em pontos-base sobre o bruto, pela versão de configuração vigente;
  - valor líquido;
  - **CET** ao mês e ao ano;
  - data do crédito.
- **Cálculo do CET**: é a taxa interna de retorno mensal do fluxo "+líquido na data do crédito" contra "−bruto em cada data de liquidação cedida".
  - Usa Newton-Raphson com bisseção de segurança.
  - É uma função pura em `packages/domain/advances` (centavos e dias corridos), testada por propriedade e com casos de referência.
- **Sem padrões enganosos** (REQ-ANT-014): o valor começa vazio, o máximo não vem pré-selecionado, não há contagem regressiva nem mensagem de urgência. O texto da validade é neutro ("simulação válida até HH:MM"). Um teste de componente verifica esses pontos.
- **Seleção**: um valor (o parceiro escolhe as datas mais próximas primeiro) ou um conjunto de datas da agenda.

## R6. Confirmação idempotente

- **Decisão**: confirmar exige reautenticação com segundo fator há no máximo 5 minutos e simulação válida (REQ-ANT-012).
  - A `Idempotency-Key` do cliente é guardada em `payments_idempotency`, com o resultado (012). A chave enviada ao parceiro é `advance_id`.
  - Toque duplo ou rede instável geram uma única operação (SC-001).
  - **Estados**: `simulated` → `requested` → `approved` → `credited`, ou `declined`, ou `failed`.
  - Tempo esgotado no parceiro: a operação fica `requested` e o `workers` reconsulta com `status` até ter uma resposta definitiva. O pedido nunca é reenviado com uma chave nova.
  - **Aprovada**: os recebíveis selecionados ficam `ceded` na projeção, com a referência do parceiro.
  - **Creditada**: lançamentos no livro (R9), aviso pela 011 e auditoria pela 004.
  - **Recusada**: o motivo do parceiro é mostrado e nada é lançado.
- Meta de ponta a ponta: simular e confirmar em até 2 minutos (SC-003).

## R7. Antecipação de comissão do colaborador

- **Decisão**: `allow_commission_advance` nas configurações do negócio, alterada só pelo Proprietário e auditada (REQ-ANT-020).
- **O que pode ser antecipado**:
  - só extrato `approved` da 018 (SC-005);
  - só a parte paga pelo **split** com liquidação futura, ou seja, as partes `professional` do recebedor do colaborador (012) ainda não liquidadas pelo PSP.
- **O que não pode**: a parte manual (`manual_due_cents`, paga pelo negócio fora da plataforma), que aparece como "não antecipável". O parceiro só recebe por cessão de recebível registrado, e é por isso que o repasse da parte antecipada vai ao parceiro "conforme a forma do repasse" (PEN-14, REQ-ANT-022).
- **Fluxo**: igual ao do estabelecimento (simulação, CET, reautenticação, idempotência), com o recebedor do colaborador.
- **Depois do crédito**:
  - aviso ao Proprietário com o valor antecipado, sem as taxas (REQ-ANT-021);
  - o extrato ganha `advanced_cents` (informativo, linha "antecipado ao parceiro").
- **Ajustes negativos** posteriores seguem a regra da 018: entram na comissão de período futuro e nunca no valor já antecipado (REQ-ANT-023).
- **Vínculo encerrado** não bloqueia o que já foi aprovado nem o que já foi antecipado.
- **Elegibilidade**: recebedor do colaborador `active`, `opinion_scope` cobrindo o tipo de vínculo (PJ ou CLT, da 007) e limite diário por colaborador.

## R8. Estornos, chargebacks e saldo devedor

- **Decisão**: o `finance` consome os eventos de estorno e chargeback da 012 (REQ-ANT-030).
  - Se o pagamento tem recebível `ceded`, o valor é descontado dos próximos recebíveis livres do mesmo recebedor (`finance_clawback`), conforme o contrato com o parceiro, e o Proprietário é avisado.
  - O que não couber vira `finance_advance_debt`. A dívida bloqueia novas antecipações até a quitação, que pode vir de recebíveis futuros ou de pagamento pelo PSP.
  - Comissão antecipada que sofre estorno do pagamento de origem: o valor entra como ajuste negativo no período seguinte da 018, e não no valor já antecipado.
  - Eventos `clawback_applied`, `debt_opened` e `debt_settled`.

## R9. Livro e equilíbrio (CONST III)

- **Decisão**: todas as partidas vão para o livro de dupla entrada da 012, em centavos e com soma zero por lançamento (REQ-ANT-031, SC-002). As novas contas, por recebedor, são:
  - `receivable_free` e `receivable_ceded`;
  - `partner_payable` (o que a liquidação deve ao parceiro);
  - `advance_cost_partner` e `advance_cost_koovela`;
  - `recipient_bank_inflow`;
  - `advance_debt`.
- **Lançamentos**:

  | Momento | Débito | Crédito |
  |---|---|---|
  | Crédito ao recebedor | `recipient_bank_inflow` (líquido) + custos (partner + koovela) | `partner_payable` (bruto) |
  | Cessão do recebível | `receivable_ceded` | `receivable_free` |
  | Liquidação ao parceiro | `partner_payable` | `receivable_ceded` |
  | Desconto de estorno | `clawback_offset` | `receivable_free` |
  | Saldo devedor (o que não coube) | `advance_debt` | `clawback_offset` |
  | Quitação da dívida | `receivable_free` ou `recipient_bank_inflow` | `advance_debt` |
- A receita da Koovela é repassada pelo parceiro e conciliada. Fica registrada em `koovela_platform.finance_koovela_fee_ledger`.
- Testes de propriedade com sequências aleatórias de antecipação, estorno, chargeback, liquidação e repasse da 018 mantêm a soma zero e o saldo de cada recebedor igual ao do parceiro.

## R10. Conciliação diária

- **Decisão**: o `workers` compara `statement(date)` do parceiro com as antecipações e liquidações do livro e com a receita da Koovela recebida (REQ-ANT-032).
  - Cada divergência vira um `finance_reconciliation_issue`, com alerta no mesmo dia ao Fin/Ops (SC-006) e entrada na fila de divergências da 012/021.
  - A divergência só fecha com justificativa. A meta é nenhuma sem tratamento depois de 1 dia útil.

## R11. Configuração e acompanhamento

- **Decisão**: `koovela_platform.finance_advance_config_version`, imutável, com (REQ-ANT-040):
  - parceiro;
  - taxa da Koovela em pontos-base, sem padrão no código (sem versão, a função não abre);
  - limites diários por negócio e por colaborador;
  - verticais excluídas;
  - referências de contrato e parecer;
  - `opinion_scope`.
- A proposta precisa de aprovação dupla pela 004.
- O back-office mostra por dia volume, receita da Koovela, recusas, saldos devedores e divergências (REQ-ANT-042). As métricas também vão para o BI (023).

## R12. Dados pessoais

- **Decisão**:
  - Dados bancários e documento: os do recebedor da 012, já cifrados. Não há cópia.
  - Aviso de compartilhamento com o parceiro, versionado e aceito antes da primeira operação (`finance_partner_notice_ack`).
  - O Proprietário vê o total antecipado pelo colaborador, nunca as taxas dele. A restrição é por campo na API, com teste de autorização.
  - Histórico guardado por 5 anos depois da última operação, com prioridade sobre o pedido de eliminação (022), por obrigação legal.
  - Toda leitura de dados financeiros pelo Fin/Ops é auditada (REQ-ANT-043).

## R13. Telas

| Superfície | Tela | Código |
|---|---|---|
| Painel do cliente | Antecipação de recebíveis (agenda, simulação, histórico, saldo devedor) · opção "permitir antecipação de comissão" | Nova (DF 9.11) · opção a conferir |
| App do colaborador e `/pro` | Antecipar comissão | Nova (DF 9.11) |
| Back-office | Antecipação: parceiro, taxas, limites, acompanhamento, conciliação | Nova (sem tela no protótipo) |
