# Quickstart de validação: Atendimento no endereço e orçamentos (033)

Pré-requisitos: specs 001 a 032 no ar; negócio de teste de limpeza e outro de estética automotiva; filial com endereço geocodificado (005); consumidor de teste com conta; colaborador com `pro-mobile`. Os contratos estão em [contracts/](./contracts/) e o modelo em [data-model.md](./data-model.md).

## 1. Local, área e deslocamento

1. Em "Onde cada serviço é feito", marque "faxina completa" como `customer_address`. Confira que não aparece nenhum campo de taxa de deslocamento.
2. Defina a área por raio de 10 km e o deslocamento de 30 min.
3. Tente montar um combo misto. Esperado: `catalog.combo_mixed_location`.
4. Troque para a lista de bairros e confira que a área tem nova versão e que a listagem da 024 foi atualizada.

## 2. Agendar no endereço

1. Cadastre dois endereços: um dentro e um fora da área. O de fora mostra "este estabelecimento não atende no seu endereço" e não mostra horários.
2. Agende duas faxinas seguidas, com o mesmo profissional e em endereços diferentes. Esperado: 30 min de "deslocamento" na agenda da equipe e nada visível para o consumidor.
3. Agende de novo no mesmo endereço, logo em seguida. Esperado: nenhum deslocamento entre os dois.
4. Cancele o primeiro de um par no mesmo endereço. Esperado: o segmento de deslocamento é recriado ou, se houver conflito, abre uma pendência para a Recepção.
5. Mude o endereço depois de confirmar. Dentro da área, a mudança é aceita e a Recepção é avisada. Fora da área, é rejeitada.
6. Na vitrine, use "atende no meu endereço" e confira que só aparecem filiais que cobrem aquele CEP ou bairro.

```bash
pnpm test:concurrency --filter scheduling-travel   # nenhuma sobreposição com segmentos travel (SC-001)
pnpm test:contract --filter coverage               # fora da área → sem horários nem hold (SC-002)
```

## 3. Rota do dia

1. Com 3 atendimentos no endereço no dia, abra "Rota do dia". Confira a ordem por horário, o endereço, o complemento, o ponto de referência, o veículo e "abrir no mapa" em até 2 toques (SC-005).
2. Toque em "Cheguei". Esperado: `EM_ATENDIMENTO` e aviso ao consumidor.
3. Teste "Cliente ausente" antes da tolerância. Esperado: `scheduling.tolerance_not_elapsed`. Depois da tolerância: `NO_SHOW`, com a multa da 010.
4. Use "Vou atrasar 20 min". Esperado: só o próximo consumidor da rota é avisado.
5. Ative o modo avião: a rota continua visível e as ações ficam na fila. Na virada do dia, ou no logout, o cache é apagado.

```bash
pnpm test:privacy --filter route   # endereço só de atendimentos atribuídos, do dia, não encerrados; leitura auditada (SC-006)
```

## 4. Orçamento

1. Num serviço `requires`, peça um orçamento com descrição e 3 fotos, em até 2 minutos (SC-003). Confira que as fotos ficam sem EXIF e só abrem por URL assinada.
2. No painel, em "Orçamentos recebidos", peça mais informações. Esperado: o consumidor responde, o pedido volta a `sent` e o prazo reinicia.
3. Responda com R$ 250, 180 min e validade de 7 dias. O consumidor aceita, escolhe o horário e o agendamento sai com `price_snapshot_cents = 25000` e `frozen.quote_id` (SC-004).
4. Com pagamento antecipado ligado, a cobrança da 012 usa o preço do orçamento.
5. Deixe um pedido sem resposta além do prazo. Esperado: `expired` e aviso ao consumidor.
6. Tente aceitar um orçamento vencido. Esperado: `quotes.quote_expired`.
7. Configure no negócio uma validade fora dos limites do back-office. Esperado: `quotes.settings_out_of_limits`.
8. Avance o relógio 90 dias depois de um pedido recusado. Esperado: fotos `purged`.

```bash
pnpm test:privacy --filter quotes   # fotos só para o consumidor e para quem responde; retenção 90 dias; HolderDataPort
```

## 5. Veículo

1. Em "Meus atendidos", cadastre um carro grande com placa.
2. Agende uma lavagem com regra por porte. Esperado: duração e preço do porte L.
3. No painel, o histórico do veículo mostra só os atendimentos daquele negócio.
