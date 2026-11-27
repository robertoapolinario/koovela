# Quickstart de validação: Fila de espera e horário ocioso (014)

Pré-requisitos: specs 001–013 no ar; 6 consumidores sintéticos; agenda lotada numa sexta. Contratos em [contracts/](./contracts/).

## 1. Fila (J2)

Seis consumidores entram na fila de "Corte, sexta à tarde, qualquer profissional" (C17/W19); o sétimo pedido de um mesmo consumidor (quarta entrada no negócio) → `waitlist.limit_reached`. Cancelar um agendamento de sexta 15h → em ≤ 1 min, oferta aos 3 primeiros (não ao consumidor que cancelou), prazo 15 min. Dois aceitam ao mesmo tempo → um vence (hold da 008), o outro vê "a vaga já foi preenchida" e continua na fila. Ninguém aceita em 15 min → rodada para os próximos 3.

```bash
pnpm test:concurrency --filter offer-accept   # N aceites simultâneos → 1 vence
```

Consumidor agenda o mesmo serviço no período por outro caminho → entrada encerrada automaticamente.

## 2. Encaixe manual (P07)

Painel mostra horários livres com entradas compatíveis por ordem; agendar a 2ª entrada direto → origem `waitlist`, entrada encerrada, nenhuma oferta automática para aquele horário.

## 3. Horário ocioso (P08)

Regra: terça e quarta, 10h–14h, 20% de desconto, antecedência 2–24 h. Desconto de 60% → recusado (limite do back-office 50%). Negócio de saúde → regra indisponível. A tela mostra a taxa de horário ocioso e o líquido de exemplo. Horário de terça 11h ainda livre 20 h antes → oferta só a consumidores com opt-in naquele estabelecimento e canal, respeitando o limite de 2 por semana e o silêncio das 21h–8h; a fila daquele horário tem prioridade.

## 4. Preço, taxa e resultado

Aceitar oferta → preço com desconto congelado (centavos, arredondado para baixo); concluir e pagar → split com `koovela_idle_fee` (012). Origem `waitlist` sem oferta → sem desconto e sem taxa. Painel de resultado com ofertas, aceites, concluídos, receita, descontos e taxa.

## 5. Opt-in

Pergunta na confirmação (C12/W14), gestão em C18/W20, descadastro em um clique em cada oferta; registro com estabelecimento, canal, versão do texto e horário.
