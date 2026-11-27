# Quickstart de validação: Fechamento financeiro e repasses (018)

Pré-requisitos: specs 001–017 no ar; mês sintético com atendimentos pagos pela plataforma e no local, um estorno e um chargeback; duas colaboradoras (uma com recebedor pendente). Contratos em [contracts/](./contracts/).

## 1. Geração (J7)

Fechar o período mensal → um rascunho por colaboradora com linhas (data, serviço, pago, base, regra, comissão) iguais ao contrato da 007; atendimentos sem registro ou pagamento em seção separada, fora do total.

```bash
pnpm test:property --filter settlement-totals   # total = Σ linhas + Σ ajustes, em centavos
pnpm test:reconcile --filter period-summary     # resumo bate com o livro financeiro (012) e as notas (017)
```

## 2. Conferência e contestação (K03/KD3)

Colaboradora recebe aviso, contesta uma linha em até 3 dias; Gerente responde com ajuste → colaboradora avisada. Contestar depois da janela → `settlement.dispute_window_closed`. Aprovar com contestação aberta exige nota.

## 3. Aprovação e imutabilidade

Proprietário aprova → imutável; ajuste posterior → `settlement.statement_approved`. Estorno de atendimento de período aprovado → ajuste no período atual com referência.

## 4. Repasses

Comissão dos pagamentos pela plataforma já repassada no split; fechamento mostra repassado × calculado e lança diferença no próximo período. Comissão de pagamentos no local → saldo a pagar; registrar Pix parcial → saldo pendente; 10 dias sem pagar → lembrete. Colaboradora confirma recebimento ou aponta divergência.

## 5. Resumo, verificação e exportação (P21)

Resumo por filial e total; Gerente vê só a própria filial. Lista de verificação com notas pendentes, divergências de conciliação, contestações e repasses não registrados. Concluir → pendências vão ao próximo período. Exportar planilha + exportação fiscal; colaboradora baixa o demonstrativo em PDF.
