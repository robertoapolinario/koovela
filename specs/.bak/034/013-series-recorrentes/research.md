# Research: Séries recorrentes (013)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Decisão do clarify: PEN-12 → **sempre as próximas 4 ocorrências materializadas**, renovadas automaticamente. Base: 008 (ocupação com lock e células), 009 (agendamento e estados), 010 (política congelada), 012 (sinal no cartão salvo, saldo de pacote). Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: submódulo `series` do domínio `scheduling`, tabelas `scheduling_series*` no schema do tenant. Cada ocorrência materializada é um agendamento da 009 (REQ-SER-011), criado pelo mesmo módulo de ocupação da 008, com `origin = series`.

## R2. Regra de recorrência

- **Decisão**: função pura `expand(rule, from, count)` em `packages/domain/recurrence`, em **hora local da filial**, com as frequências:
  - semanal;
  - a cada 2, 3 ou 4 semanas;
  - mensal por posição do dia da semana na semana do mês (primeira, segunda, terceira, quarta ou última; o mês sem a posição cai em "última").
  
  O fim da série é por N ocorrências (2 a 52), por data ou sem fim. A conversão para UTC é feita por data, com a base IANA (horário de verão histórico incluído). Testes de propriedade cobrem a regra.
- **Alternativas**: RRULE (RFC 5545) completa (expressiva demais para o produto; aumenta a superfície de erro).

## R3. Materialização das próximas 4

- **Decisão**: ao criar a série, materializa as 4 primeiras ocorrências; uma tarefa diária no `workers` (e um gatilho a cada ocorrência concluída, cancelada ou pulada) completa até haver **sempre 4 futuras** materializadas, mesmo além do horizonte de agendamento do negócio (REQ-SER-010). Idempotência por `(series_id, sequence)` (UNIQUE): rodar duas vezes nunca cria duas ocorrências (REQ-SER-012). Cada materialização congela as versões vigentes naquele momento; mudança de preço ou política é avisada antes da próxima materialização (REQ-SER-013).

## R4. Conflitos e alternativas

- **Decisão**: ocorrência que cai em exceção da filial, folga, bloqueio ou horário ocupado não ocupa a agenda: fica `in_conflict`, com até 3 alternativas calculadas pela 008 (mesmo profissional no mesmo dia, mesmo profissional em dia próximo, outro profissional no mesmo horário; REQ-SER-021). Sem escolha até 24 h antes do horário original → `skipped`, sem custo, com aviso (REQ-SER-022). Afetados posteriores (folga aprovada depois) entram na lista de afetados da 009 com a marca "série" (REQ-SER-023).

## R5. Alcance das mudanças (invariante 6)

- **Decisão**: remarcar e cancelar ocorrência exigem `scope` explícito: `this` (padrão) \| `this_and_following` \| `whole_series` (futuras). Implementação:
  - `this` altera só a ocorrência e marca `has_own_time = true`;
  - `this_and_following` cria uma **nova versão da regra** com início na data, reserva de novo cada futura pela 008 (as que não couberem ficam `in_conflict`) e preserva as que têm horário próprio, salvo escolha explícita (REQ-SER-031/033);
  - ocorrências passadas nunca mudam.
  
  Cancelamento em alcance maior aplica a política congelada de cada ocorrência e mostra antes o total de multas (REQ-SER-032). Toda mudança registrada e publicada (REQ-SER-034).
- **Teste**: teste de propriedade (portão de merge) prova que nenhuma sequência de mudanças `this` altera outra ocorrência (REQ-SER-035).

## R6. Pagamento das ocorrências

- **Decisão**: na criação, a forma de pagamento da série:
  - **sinal por ocorrência**: exige a autorização de cobrança automática do sinal no cartão salvo (012), cobrada na materialização ou X horas antes, conforme a política; falha de cobrança → aviso e ocorrência fica `PENDENTE_PAGAMENTO` até a reserva vencer (REQ-SER-003);
  - **pacote**: cada ocorrência reserva uma sessão no livro de saldos (012); fim do saldo → série `awaiting_payment` até escolher novo pacote ou pagamento por ocorrência (REQ-SER-004/044);
  - **no local**: sem cobrança online.

## R7. Ciclo de vida

- **Decisão**: estados da série `active` ↔ `paused` (até 90 dias; ocorrências do período `skipped`, sem custo fora da janela gratuita; retoma sozinha, REQ-SER-040) · `active` → `paused_for_no_shows` após N faltas seguidas (padrão 2, 1–5, configurável pelo Proprietário; libera as futuras; equipe retoma, REQ-SER-043) · `active` → `awaiting_payment` · qualquer → `ended` (fim, profissional saiu sem substituto, encerramento manual; convite para nova série, REQ-SER-041). Profissional com data de fim (007) → resolução dos afetados com opção de passar a série a outro profissional a partir de uma data (REQ-SER-042).

## R8. Limites

- **Decisão**: no máximo 3 séries ativas por consumidor e negócio, sem duas no mesmo horário; ocorrências de série não contam no limite de 5 agendamentos futuros da 009 (REQ-SER-005).

## R9. Telas

| Superfície | Tela | Código |
|---|---|---|
| App do consumidor | Minhas séries recorrentes · "repetir" no Resumo e na Confirmação | C14 · C08 · C12 |
| Web do consumidor | Minhas séries | W16 |
| Painel | Gestão de séries recorrentes · marca "série" na agenda | P06 · P03 |
| Colaborador | Marca "série" e numeração na agenda | K01 · KD1 |
| A conferir no Figma | Escolha de alcance e tela de alternativas de conflito | Desenhar se não existirem |
