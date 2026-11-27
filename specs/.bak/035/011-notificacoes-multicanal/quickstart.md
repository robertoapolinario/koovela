# Quickstart de validação: Notificações multicanal (011)

Pré-requisitos: specs 001–010 no ar; adaptadores falsos de push, SMS, WhatsApp e Mailpit em dev. Contratos em [contracts/](./contracts/).

## 1. Política de canais (C1)

- Consumidor com app → confirmação por push + central de avisos.
- Consumidor sem app (agendado pela Recepção) → SMS; derrubar o SMS falso → e-mail verificado; sem e-mail → WhatsApp (flag ligada em dev); sempre na central.
- Push sem recibo em 10 min → próximo canal.

## 2. Lembretes

P26: lembretes de 24 h e 2 h. Agendar para amanhã 9h → lembrete das 21h de hoje antecipado (silêncio 21h–8h), o de 7h (2 h antes) enviado mesmo no silêncio. Remarcar → lembretes reprogramados; cancelar → cancelados. Lembrete com ações "confirmar presença", "remarcar", "cancelar"; confirmar → presença aparece na agenda (009). p95 ≤ 2 min do horário (`pnpm load --scenario reminders`).

## 3. Link de gestão

Abrir o link do SMS sem login → vê o agendamento e confirma presença; remarcar ou cancelar pede OTP. Link de outro agendamento ou vencido → 404; 50 tentativas por IP → 429. Com o app instalado (Android), o link abre o app.

## 4. Conteúdo e privacidade

Serviço marcado como discreto → aviso diz "seu atendimento em {estabelecimento}". Negócio de saúde → nenhum preço. `pnpm test:pii --filter notification` → nenhum aviso contém observação, anotação ou dado de saúde. Três avisos não urgentes em 5 min → um agrupado.

## 5. Preferências e descadastro

C18/W20: desligar SMS de "lembretes" → só push; tentar deixar "essenciais" sem canal → recusado. Descadastro em um clique pelo link do e-mail → sem login.

## 6. Equipe

Novo agendamento → push à colaboradora e aviso no painel em ≤ 1 min (SSE). E-mail diário ao Proprietário (opcional).

## 7. Entrega, limites e custo

Webhook de bounce → e-mail suspenso com aviso no perfil. Limite diário de SMS do tenant atingido → não urgentes adiados. Consumo chega a 80% da cota → aviso ao Proprietário e evento para a 019. Métrica "no-show com e sem lembrete" disponível no BI.
