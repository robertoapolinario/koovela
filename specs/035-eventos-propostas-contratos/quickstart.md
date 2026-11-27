# Quickstart de validação: Eventos — propostas, contratos e sinal (035)

Pré-requisitos:

- Specs 001 a 034 no ar.
- Modelo base de contrato de teste marcado como revisado no seed local.
- Flag `quotes.events` ligada.
- Espaço de festas de teste e um fotógrafo.
- PSP em sandbox (012).
- Consumidor maior de 18 anos com CPF e 2FA.
- Consumidor menor de 18 anos.

Os contratos estão em [contracts/](./contracts/) e o modelo em [data-model.md](./data-model.md).

## 1. Configuração

1. Configure os períodos "tarde" e "noite", capacidade 1, sinal de 30%, saldo em 2 parcelas e faixas de cancelamento.
2. Salve cláusulas extras e gere a prévia do PDF. Esperado: cláusula do arrependimento presente e não removível.
3. Bloqueie um feriado. Esperado: a disponibilidade mostra `occupied`.
4. Configure o fotógrafo com capacidade 2. Esperado: `quotes.professional_capacity_must_be_1`.

## 2. Proposta e pré-reserva

1. O consumidor consulta a disponibilidade e pede proposta para um sábado à noite.
2. O fornecedor envia 5 itens em até 5 minutos (SC-005). Esperado: data `negotiating` para outros consumidores.
3. Envie duas propostas simultâneas para a última vaga. Esperado: exatamente uma pré-reserva e a outra com `quotes.date_unavailable`.
4. Envie um evento de 2 dias com o segundo dia ocupado. Esperado: nenhuma data reservada.
5. Envie uma proposta do fotógrafo num período com agendamentos comuns. Esperado: `quotes.professional_busy`.
6. Envie uma nova versão da proposta. Esperado: a anterior fica `superseded` e a pré-reserva se estende.
7. Deixe a validade vencer. Esperado: aviso 24 h antes e, no vencimento, data `free`.

```bash
pnpm test:concurrency --filter event-date-holds   # nunca acima da capacidade; vários dias tudo ou nada (SC-001)
```

## 3. Aceite, contrato e sinal

1. O consumidor menor tenta aceitar. Esperado: `quotes.minor_cannot_contract`.
2. O consumidor maior aceita com CPF e 2FA. Esperado: contrato `awaiting_deposit` e evidência com o hash do PDF exibido.
3. Paga o sinal por Pix. Esperado: contrato `active`, data `confirmed`, PDF enviado às duas partes. O fluxo todo leva até 5 minutos (SC-002).
4. Num outro aceite, não pague o sinal em 24 h. Esperado: contrato `void`, proposta de volta a `sent` e pré-reserva mantida até a validade.
5. Com um contrato acima do limite da assinatura avançada e a flag ligada no sandbox do provedor: o envelope é criado e o custo entra como `usage:advanced_signature` na fatura (019).

```bash
pnpm test:contract --filter event-contracts   # 100% dos confirmados com PDF e evidências (SC-003)
```

## 4. Saldo, aditivo, cancelamento e realização

| Ação | Esperado |
|---|---|
| Parcela a 3 dias do vencimento | Aviso; pagar pelo app → `paid` |
| Parcela vencida sem pagamento | `overdue`; fornecedor avisado |
| Aditivo com +20 convidados e +R$ 500 | Aceito com 2FA; nova parcela; novo PDF |
| Aditivo trocando para data ocupada | `quotes.date_unavailable` |
| Consumidor cancela no 5º dia após o aceite | Simulação mostra 100%; devolução integral (SC-004) |
| Consumidor cancela a 60 dias do evento | Simulação mostra a faixa; estornos pela 012 |
| Fornecedor cancela | Devolução de 100%; multa registrada; marca na reputação (016) |
| Fim do evento + 24 h | `fulfilled` automático; convite de avaliação |

```bash
pnpm test:property --filter event-refunds   # 7 dias = 100%; faixas; Σ estornos ≤ Σ pago
pnpm test:privacy --filter event-contracts  # CPF e local cifrados; evidências só para Proprietário/Gerente; retenção de 5 anos
```
