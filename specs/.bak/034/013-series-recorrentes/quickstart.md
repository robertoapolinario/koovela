# Quickstart de validação: Séries recorrentes (013)

Pré-requisitos: specs 001–012 no ar; consumidor com cartão salvo; profissional com escala. Contratos em [contracts/](./contracts/).

## 1. Criar a série (História 1)

App: após confirmar "Escova, terça 19h", tocar em "repetir" → semanal, 10 ocorrências, sinal por ocorrência (autorizar cobrança automática). Esperado: 4 ocorrências materializadas na agenda com a marca "série 1/10…4/10"; C14 mostra a regra. Painel: série quinzenal sem fim → também 4 materializadas.

```bash
pnpm koovela jobs run series-materializer   # rodar 2× → nenhuma duplicada; sempre 4 futuras
```

## 2. Conflitos

Lançar folga (007) numa terça futura ainda não materializada → ao materializar, `in_conflict` com até 3 alternativas; escolher uma → materializada; não escolher até 24 h antes → `skipped`, sem custo, com aviso.

## 3. Alcance das mudanças (invariante 6)

Remarcar a ocorrência 3 "só esta" → só ela muda e fica com horário próprio. Remarcar a 5 "esta e as próximas" para quarta 19h → nova regra; a 3 (horário próprio) preservada. Cancelar "a série inteira" → total de multas mostrado antes.

```bash
pnpm test:property --filter series-scope   # nenhuma sequência de "só esta" altera outra ocorrência
pnpm test:property --filter recurrence     # expansão em fusos e horário de verão; "última terça"
```

## 4. Pagamento

Sinal por ocorrência: cobrança automática no cartão salvo na materialização; cartão recusado → ocorrência `PENDENTE_PAGAMENTO` e aviso. Pacote de 5 sessões: cada ocorrência reserva uma; acabou o saldo → série `awaiting_payment`.

## 5. Ciclo de vida

Pausar por 30 dias → ocorrências do período `skipped`, retoma sozinha. Duas faltas seguidas → `paused_for_no_shows`, futuras liberadas; equipe retoma. Profissional com data de fim → afetados com "passar a série a outro profissional". Última ocorrência concluída → `ended` e convite para nova série. Quarta série ativa no mesmo negócio → `series.limit_reached`.
