# Quickstart de validação: Pagamentos e split (012)

Pré-requisitos: specs 001–011 no ar; adaptador sandbox do PSP (ou `fake`); negócio com recebedor ativo e colaborador com recebedor pendente; política com sinal. Contratos em [contracts/](./contracts/).

## 1. Checkout (C10/C11, W13)

Agendar "Coloração" com sinal → `PENDENTE_PAGAMENTO` → Pix com QR e copia-e-cola expirando junto com a reserva → simular pagamento no sandbox → agendamento `CONFIRMADO` em ≤ 10 s. Cartão: campos hospedados do PSP; a requisição à Koovela só tem token (inspecionar no DevTools). Pagar depois de expirado → estorno automático e aviso. Seis recusas de cartão em 1 h → `payments.card_attempts_limited`.

## 2. Split

```bash
pnpm test:property --filter split   # Σ partes = líquido; nenhuma parte negativa; com estornos
```

Pagamento de R$ 200 com taxa PSP de R$ 6: partes Koovela (take rate + taxa por agendamento), comissão da colaboradora (contrato da 007) e estabelecimento com o resto. Colaboradora sem recebedor → parte `pending_professional` no recebedor do negócio; verificar o recebedor dela → transferência. Saúde: taxa de agendamento só com Koovela e estabelecimento; restante registrado no local.

## 3. Multas e devoluções (010)

Cancelar dentro da janela → sinal devolvido integralmente pelo mesmo meio. Cancelamento tardio com multa < sinal → retém a multa e devolve o resto. Forma "sinal + cartão" sem consentimento de multa → não cobra. Abono ou contestação aceita → devolve e desfaz o split.

## 4. Estorno e chargeback

Estorno manual pelo Proprietário (step-up, motivo, auditado); acima do estornável → recusado. Estorno de valor já repassado → débito no próximo repasse. Chargeback simulado → registro com prazo e pacote de provas (check-in, aceite da política, avisos entregues).

## 5. Saldos de pacote

Comprar pacote de 5 sessões → saldo 5; agendar → reserva; concluir → consome; cancelar na janela → devolve.

```bash
pnpm test:concurrency --filter balances   # saldo 1, 20 reservas simultâneas → 1 sucesso; saldo nunca negativo
```

## 6. Pagamento no local e financeiro

Registrar pagamento em dinheiro no check-out (K02); anular depois de 24 h como Recepção → negado; como Proprietário → ok, auditado. P21: recebido, a receber, taxas, estornos e chargebacks por período, meio e filial; exportar planilha. Gerente vê só a própria filial.

## 7. Webhooks e conciliação

Reenviar o mesmo webhook 3 vezes → efeito único. Conciliação diária com uma divergência injetada → alerta e item na fila; encerrar só com justificativa.
