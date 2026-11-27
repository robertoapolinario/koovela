# Quickstart de validação: Educação — aulas avulsas recorrentes (034)

Pré-requisitos:

- Specs 001 a 033 no ar.
- Negócio de teste da vertical educação (escola de música), com o serviço "violão individual" e a turma "violão em grupo, sábado 10h, capacidade 6".
- Política (010) com janela gratuita de 24 h e no-show cobrado.
- Responsável de teste com um filho de 10 anos cadastrado (025) e cartão salvo (012).
- Instrutor com `pro-mobile`.

Os contratos estão em [contracts/](./contracts/) e o modelo em [data-model.md](./data-model.md).

## 1. Configuração

1. Ative a aula recorrente para "violão individual" (semanal e a cada 2 semanas; por aula e por pacote) e para a turma (semanal; pacote).
2. Envie um campo `enrollment_fee`. Esperado: `lessons.unknown_field`.
3. Num negócio de beleza, tente ativar. Esperado: `lessons.vertical_not_allowed`.

## 2. Reserva

1. Como responsável, monte "terças 18h, semanal" para o filho. Esperado: a prévia mostra as ocorrências e o feriado marcado como conflito.
2. Tente confirmar sem aceitar o aviso. Esperado: `lessons.terms_not_accepted`.
3. Aceite e confirme. Esperado: série `kind=lesson`, 4 agendamentos com `origin=lesson`, tudo em até 2 minutos (SC-002).
4. Crie outra série no mesmo horário para outro filho. Esperado: permitido. Para o mesmo filho: `scheduling.series_overlap`.
5. Reserve uma vaga fixa na turma de sábado com pacote. Esperado: 4 inscrições com reserva de crédito.
6. Com a turma lotada num sábado, essa ocorrência fica em conflito, com alternativas da mesma modalidade.

## 3. Faltas, cancelamentos e escola

| Ação | Esperado |
|---|---|
| Cancelar "só esta" com mais de 24 h | Sem cobrança, ou crédito devolvido |
| Cancelar com menos de 24 h | Cancelamento tardio (010) |
| Instrutor marca ausência | No-show cobrado, ou crédito consumido |
| Segunda falta seguida | `paused_for_no_shows` e aviso |
| Escola cancela a aula | Sem cobrança, ou estorno, ou crédito revertido; contador de faltas intacto; "oferecer outro horário" envia link avulso |
| Encerrar a série | Futuras canceladas sem multa de saída |

```bash
pnpm test:property --filter lessons-no-makeup   # nenhuma combinação cria ocorrência, agendamento ou crédito (SC-001)
pnpm test:contract --filter lessons-terms       # 100% das confirmações com aceite do aviso (SC-004)
pnpm test:integration --filter lessons-business-cancel   # 100% sem cobrança ou com crédito devolvido (SC-003)
```

## 4. Recesso

Declare o recesso de 15 a 31 de julho na filial. Esperado:

- ocorrências do período `skipped` com motivo `recess`, sem custo;
- aulas da turma canceladas pela escola, com créditos revertidos;
- avisos enviados;
- a materialização seguinte pula o período.

## 5. Presença e registro

1. No `pro-mobile`, faça o check-in da aula individual e registre o conteúdo. Esperado: o responsável vê o registro em "Minhas séries".
2. Na turma, faça a chamada e use "aplicar a todos". Esperado: um registro por aluno, e nenhum aluno vê o de outro.
3. Edite depois de 24 h. Esperado: `lessons.record_closed`.

```bash
pnpm test:authz --filter lessons-record   # só aluno ou responsável, instrutor autor e Proprietário leem (SC-005)
pnpm test:privacy --filter lessons-record # cifrado; export e erase (022); evento sem conteúdo
```
