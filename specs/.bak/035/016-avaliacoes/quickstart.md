# Quickstart de validação: Avaliações (016)

Pré-requisitos: specs 001–015 no ar; negócio de beleza e de saúde com atendimentos concluídos. Contratos em [contracts/](./contracts/).

## 1. Pedido e envio

Concluir atendimento → pedido em 2 h, lembrete no 3º dia (011). Avaliar (C13/W15) com 5 estrelas, "pontualidade" e comentário → `submitted`; tentar de novo → `review.already_reviewed`; agendamento não concluído → `review.not_completed`; após 14 dias → `review.window_closed`. Membro da equipe → `review.staff_member`. Pré-cadastro → exige OTP.

## 2. Publicação e média

Avaliação publicada 48 h depois do envio, com ou sem resposta. Com 4 avaliações → página mostra "novo" sem média; com a 5ª → média com uma casa decimal. Autor exibido "Ana S." e mês. Proprietário desliga "mostrar na página" → some da página e da vitrine; o painel continua mostrando. Negócio de saúde → nunca público.

## 3. Resposta e avisos

Avaliação de 2 estrelas → aviso ao Proprietário, Gerente da filial e Colaborador. Responder (P24/K05) → consumidor avisado; editar depois de 24 h → `review.reply_locked`. Tentar editar ou remover a avaliação como estabelecimento → negado (teste da matriz).

## 4. Triagem e moderação

Comentário com celular ou termo ofensivo → `held`, consumidor avisado, item na fila de moderação. Estabelecimento denuncia como "spam" → continua visível até a decisão (prazo 3 dias úteis). Moderação remove → sai da média e da página, fica registrada; decisão na trilha e aviso aos dois lados. Denúncia só por nota baixa → rejeitada.

## 5. Antifraude e eventos

Injetar volume de avaliações 4× a média vindo de agendamentos manuais pagos no local → novas `held` e alerta à Gestão.

```bash
pnpm test:contract --filter reviews-events   # nenhum evento contém comment ou dados do autor
```
