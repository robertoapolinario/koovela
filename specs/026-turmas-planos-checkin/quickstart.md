# Quickstart de validação: Turmas, planos e check-in (026)

Pré-requisitos: specs 001–025 no ar; estúdio de pilates sintético; instrutor; alunos com cartão salvo; um menor (025). Contratos em [contracts/](./contracts/).

## 1. Turma e aulas

Criar "Pilates iniciante", seg/qua 19h, capacidade 8 → aulas geradas até o horizonte; tempo do instrutor ocupado (008). Outra turma na mesma sala e hora → aviso, sem bloqueio. Reduzir capacidade para 5 numa aula com 6 inscritos → `classes.capacity_below_enrolled`.

## 2. Última vaga

```bash
pnpm test:concurrency --filter class-last-seat   # 20 inscrições simultâneas na última vaga → exatamente 1 (portão de merge)
```

Aula lotada → `classes.full` com as próximas aulas da modalidade com vaga; sem fila de espera.

## 3. Formas de pagamento

Avulso → pagamento com split. Pacote de 10 aulas → inscrição reserva 1 crédito; presença consome; cancelar dentro da política → devolve. Plano 2x/semana → terceira inscrição na semana → `classes.plan_limit_reached` com opção avulsa. Responsável inscreve o menor e paga.

## 4. Check-in

QR do aluno lido pelo instrutor; QR do estúdio lido pelo aluno; manual. Fora da janela (−30/+15 min) → recusado. Instrutor sem rede registra 3 check-ins → enviados ao reconectar, sem duplicar. Fim da aula → ausentes `no_show` com a consequência da política. Aluno de última hora com vaga → inscrição, pagamento e presença juntos.

## 5. Plano do aluno

Assinar → cobrança no ato com split e nota; cobrança mensal no mesmo dia. Cartão recusado → tentativas nos dias 1, 3, 5; dia 7 suspenso (inscrições existentes continuam). Cancelar → vale no fim do ciclo; fidelidade só se aceita. Aumento de preço → assinantes avisados, novo preço só no ciclo seguinte a 30 dias. Tenant suspenso (019) → cobranças pausadas com aviso.

## 6. Comissão e créditos

Turma com 40% por presença sobre o preço por aula do pacote → comissão no fechamento (018) conforme o contrato da 007. Saldo de créditos com validade; aviso 7 dias antes de vencer.
