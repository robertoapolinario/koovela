# Quickstart de validação: Antecipação de recebíveis (036)

Pré-requisitos:

- Specs 001 a 035 no ar.
- Adaptador `sandbox` do `AdvanceProvider` em uso.
- Configuração de antecipação de teste aprovada, com taxa fictícia.
- Flags `finance.advances` e `finance.advances.commission` ligadas para o grupo de teste (em `staging`).
- Negócio com recebedor verificado e pagamentos por cartão com liquidação futura.
- Colaborador com recebedor próprio e extrato aprovado (018) com parte paga por split.

Os contratos estão em [contracts/](./contracts/) e o modelo em [data-model.md](./data-model.md).

## 1. Interruptor de produção

Em `prod`, tente ligar `finance.advances` com uma configuração sem `partner_contract_ref` ou sem `regulatory_opinion_ref`. Esperado: recusado. Com `opinion_scope` sem `professional_clt`, um colaborador CLT vê "não disponível".

## 2. Estabelecimento

1. Abra "Antecipação de recebíveis". Esperado: agenda por data, disponível e histórico, sem pagamentos no local.
2. Simule R$ 1.000,00. Esperado: bruto, taxa do parceiro, taxa da Koovela, líquido, CET ao mês e ao ano e data do crédito (SC-004). O valor não vem pré-selecionado e não há mensagem de urgência.
3. Espere mais de 10 min e confirme. Esperado: `finance.quote_expired`.
4. Refaça a simulação e confirme com 2FA, em até 2 minutos (SC-003). Esperado: `credited`, recebíveis `ceded` e lançamentos com soma zero.
5. Com o cenário de recusa do sandbox: motivo exibido e nada lançado.
6. Com o cenário de tempo esgotado: fica `requested`, a reconsulta resolve e não há pedido duplicado.
7. Elegibilidade: troque a conta bancária (bloqueio de 72 h), use uma fatura em atraso (019) e uma vertical excluída. Esperado: cada caso mostra o seu motivo.

```bash
pnpm test:idempotency --filter advances   # toque duplo, retentativas e rede instável → 1 operação (SC-001)
pnpm test:unit --filter cet               # TIR mensal com casos de referência
```

## 3. Colaborador

1. Sem `allow_commission_advance`, a opção não aparece. Ligue a opção como Proprietário.
2. Esperado: extrato aprovado com a parte antecipável (split futuro) e a não antecipável (manual). Extrato em `draft` ou `in_review`: `finance.statement_not_approved` (SC-005).
3. Simule e confirme 50%. Esperado: crédito, Proprietário avisado só com o valor e o extrato com `advanced_cents`. A liquidação vai ao parceiro.
4. Aplique um ajuste negativo no período seguinte. Esperado: desconto na comissão futura.

## 4. Estornos

1. Estorne um pagamento cedido. Esperado: desconto nos próximos recebíveis livres e aviso.
2. Sem recebíveis futuros suficientes: `debt_opened`, painel mostra o saldo devedor e novas antecipações ficam bloqueadas. Ao quitar: `debt_settled`.

```bash
pnpm test:property --filter advances-ledger   # antecipação, estorno, chargeback, liquidação e repasse → soma zero (SC-002)
```

## 5. Conciliação e back-office

1. Rode a conciliação com o cenário de divergência do sandbox. Esperado: `reconciliation_mismatch` e alerta ao Fin/Ops no mesmo dia (SC-006). A divergência só fecha com justificativa.
2. O dashboard mostra volume, receita, recusas, saldos devedores e divergências por dia.
3. O Proprietário consulta as antecipações do colaborador. Esperado: nunca vê taxas nem CET (teste de autorização).
