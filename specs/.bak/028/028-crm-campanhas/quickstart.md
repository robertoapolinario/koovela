# Quickstart de validação: CRM e campanhas (028)

Pré-requisitos: specs 001–027 no ar; adaptadores `fake` de push, e-mail e SMS; negócio de beleza e de saúde com base sintética; plano com cota. Contratos em [contracts/](./contracts/).

## 1. Consentimento

Confirmação de agendamento pergunta comunicações por canal; padrão "sem". Consumidora aceita e-mail → registro (e no registro central); oferta de horário ocioso (014) passa a usar o mesmo consentimento. Descadastro pelo link sem login → efeito ≤ 1 min (próximo envio pulado). Menor/atendido nunca aparece no alcance.

## 2. Segmento

"Sumidos há 60 dias" → total e alcançáveis por canal; lista nominal só para o Proprietário; Gerente alcança só a filial dele.

## 3. Campanha

Criar com WhatsApp → `crm.channel_not_allowed`. Saúde com "20% off" → `crm.health_price_content`. Prévia e teste ao Proprietário. Cotação: 1.200 alcançáveis, cota 1.000 → sem confirmar excedente envia 1.000; confirmando, 1.200 e excedente vai para a fatura (019). E-mail sai de `ofertas@news.koovela.com`; SMS começa com o remetente e o negócio. Silêncio 21h–8h respeitado; terceira campanha em 7 dias para o mesmo consumidor → pulada.

## 4. Oferta e resultados

Agendar pelo link → desconto aplicado e congelado, origem `campaign`; com resgate de fidelidade → não acumula. Fora da validade → sem desconto. Resultados por canal com receita e reativações; atribuição por janela de 7 dias.

## 5. Abuso e automações

Injetar 3% de descadastros → campanha pausada, novas bloqueadas, fila da Gestão e aviso. Automação de aniversário rodando 2× no dia → uma mensagem só por consumidor no ano.

## 6. Privacidade

```bash
pnpm test:privacy --filter crm   # export e erase cobrem consentimentos e histórico de envios
```
