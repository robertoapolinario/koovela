# Quickstart de validação: Vale-presente e pacotes (029)

Pré-requisitos: specs 001–028 no ar; adaptadores `fake` do PSP e fiscal; salão com vale-presente ligado. Contratos em [contracts/](./contracts/).

## 1. Compra e entrega

Comprar vale de R$ 150 com mensagem, entrega amanhã 9h por SMS, pagando por Pix → split para a filial; venda registrada como adiantamento (sem NFS-e). Vale de "Escova" → preço congelado; aumentar o preço da escova → o vale continua cobrindo. Só código → entregue pessoalmente. Reenviar a outro destinatário → ok; segunda vez → `gift_card.already_resent`.

## 2. Resgate e código

Resgatar pelo link ou código → carteira do presenteado. Seis códigos errados em 1 h → `gift_card.too_many_attempts`.

```bash
pnpm test:security --filter gift-card-code   # 80 bits de entropia, código só como HMAC, nada em log
```

## 3. Uso

Agendar R$ 90 com oferta de campanha (−10) → vale abate 80; saldo 70. Fidelidade + oferta → recusado (não acumulam); fidelidade + vale → ok. Outra filial → `gift_card.wrong_branch`. Cancelar dentro da política → devolve ao saldo. Concluir → NFS-e emitida pelo valor coberto (017); comissão sobre o valor coberto; presenteado ganha pontos, comprador não. Balcão → confirmação no celular do presenteado. Estorno do agendamento → volta ao saldo do vale.

```bash
pnpm test:property --filter deductions          # oferta → fidelidade → vale → pagamento; nada negativo; soma = preço
pnpm test:concurrency --filter gift-card-balance # usos simultâneos nunca deixam saldo negativo
```

## 4. Reembolso e validade

Reembolso sem uso no dia 5 → integral pelo mesmo meio; no dia 8 → `gift_card.refund_window_closed`. Avisos 30 e 7 dias antes do vencimento. Tenant suspenso 10 dias → validade +10. Filial encerrada → oferta da filial mais próxima ou reembolso do saldo.

## 5. Pacote presenteado e painel

Vale de pacote de 5 sessões → vira pacote do presenteado (006). Painel com lista e totais do mês; Recepção vende e aplica no balcão.
