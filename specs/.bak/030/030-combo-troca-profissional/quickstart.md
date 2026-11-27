# Quickstart de validação: Combo com troca de profissional (030)

Pré-requisitos: specs 001–029 no ar; salão com "Corte + Coloração + Escova" (3 etapas, intervalo máx. 10 min), 4 profissionais com habilidades diferentes. Contratos em [contracts/](./contracts/).

## 1. Configuração

Painel: etapas com profissionais possíveis e intervalo. Encerrar o vínculo da única colorista → etapa vazia → combo indisponível na filial, com aviso.

## 2. Horários e sequência

Inícios do dia listam só os que têm sequência completa. Escolher 14h → sugestão com menor espera; trocar a etapa 2 para outra colorista → etapa 3 se ajusta; opção que estouraria o intervalo aparece desabilitada com o motivo. "Mesmo profissional" aparece quando alguém faz as três.

```bash
pnpm test:property --filter combo-sequencing   # toda sequência oferecida é viável
pnpm test:load --filter combo-starts           # p95 ≤ 1 s
```

## 3. Reserva atômica

```bash
pnpm test:concurrency --filter combo-per-step  # N disputando uma etapa → 1 aceito; falha na última etapa → nada ocupado (portão)
```

Conflito na reserva → `scheduling.slot_taken` com a próxima sequência viável.

## 4. Depois de reservado

Recepção troca o profissional da etapa 3 → só ela muda, consumidor avisado. Remarcar → todas as etapas juntas. Consumidor cancela → combo inteiro, com a política. Etapa 1 atrasa 20 min → aviso ao profissional da etapa 2 e à Recepção (aguardar, trocar, remarcar a etapa). Folga aprovada de um profissional → combo na lista de afetados com sugestão. Fechamento (018): comissão por etapa com o desconto rateado.
