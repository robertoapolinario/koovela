# Research: Motor de agenda e disponibilidade (008)

**Data**: 2026-11-25 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md)

Base: 005 (horário da filial), 006 (versões e plano de combo), 007 (intervalos de trabalho em UTC e eventos de disponibilidade). Princípio I é integral aqui. Formato: **Decisão / Por quê / Alternativas**.

---

## R1. Dono

- **Decisão**: domínio `scheduling` (CONST 4.4), parte "disponibilidade e lock"; tabelas `scheduling_*` no schema do tenant. O ciclo de vida do agendamento é da spec 009, no mesmo domínio, mas com contrato interno separado (ocupações × agendamentos).

## R2. A última linha de defesa no MySQL: células de tempo

- **Decisão**: o MySQL não tem *exclusion constraint* de intervalos. O mecanismo transacional equivalente (CONST I) é **discretizar a janela protegida em células de 5 minutos**: `scheduling_occupancy_cell (professional_id, cell_start)` com **PRIMARY KEY** composta. Ocupar = inserir, na mesma transação da ocupação, uma linha por célula; qualquer sobreposição viola a chave primária e a transação inteira é desfeita. Recurso (latente, `[C2]`): tabela irmã `scheduling_resource_cell (resource_id, cell_start)`.
  - A janela protegida (com preparo e limpeza, REQ-AGD-023) é **arredondada para fora** até múltiplos de 5 minutos. Nunca permite sobreposição; no máximo desperdiça 4 minutos quando preparo ou limpeza não são múltiplos de 5. (Recomendação à spec 006: aceitar só múltiplos de 5 em preparo e limpeza, como já é na duração.)
  - Volume: ~120 células por profissional por dia de 10 h; 2.000 profissionais × 60 dias ≈ 14 milhões de linhas pequenas no total (somadas entre tenants), particionáveis por data.
- **Por quê**: garante a invariante 1 no banco, sem depender da aplicação, com um índice comum e o teste de unicidade nativo.
- **Alternativas**: `SELECT … FOR UPDATE` no intervalo (depende de *gap locks* e do nível de isolamento; frágil sob carga); *trigger* que verifica sobreposição (corrida entre transações concorrentes); tabela por dia com bitmap (complexo de atualizar).

## R3. Lock distribuído

- **Decisão**: Redis (instância única do host de dados) com `SET t:{tenant}:lock:prof:{professional_id}:{data} <token> NX PX 5000`, liberação por script Lua que confere o token (marca de posse, REQ-AGD-020); para combo e recursos, as chaves são adquiridas **em ordem lexicográfica** para evitar deadlock, com tempo total máximo de 2 s antes de desistir. O lock reduz conflitos e faz a recusa rápida; a célula no banco é a garantia (lock sem constraint não basta, constraint sem lock não basta — CONST I).
- **Alternativas**: Redlock com 5 nós (não temos 5 nós; a constraint cobre a falha do lock).

## R4. Reserva temporária e confirmação

- **Decisão**: ocupação com `kind = hold`, `expires_at = agora + 10 min`, células já inseridas. Extensão única até 30 min no total (REQ-AGD-031). Confirmação = `UPDATE kind = definitive, expires_at = NULL` na mesma linha: as células nunca saem, então não há intervalo em que outra escrita ocupe a janela (REQ-AGD-034). Liberação de *holds* vencidos por tarefa no `workers` a cada 30 s (≤ 1 min, REQ-AGD-032), apagando células e publicando evento. Limite de 2 *holds* ativos por consumidor por negócio (REQ-AGD-033): contador numa linha `scheduling_consumer_hold_counter` travada `FOR UPDATE` na mesma transação.

## R5. Combo atômico

- **Decisão**: a partir do plano da 006 (etapas, durações, intervalo, regra de profissional), uma transação insere a ocupação-mãe e uma ocupação por etapa, com todas as células; qualquer conflito desfaz tudo (REQ-AGD-024). Na v1.0, `same_for_all`; o modelo aceita `per_step` (fase 2, `[D34]`).

## R6. Cálculo de horários livres

- **Decisão**: por profissional e data, "tempo livre" = intervalos de trabalho (contrato da 007, em UTC) − células ocupadas. Inícios candidatos na grade do negócio (5–60 min, alinhada ao início de cada intervalo de trabalho, REQ-AGD-002), aceitos se a janela protegida inteira (duração própria do profissional + preparo + limpeza, combos somados) cabe no tempo livre. Regras do consumidor: antecedência mínima, horizonte, filial e negócio ativos (REQ-AGD-003/009). "Qualquer profissional" = união; atribuição na reserva pelo menos ocupado do dia (células ocupadas), empate pelo `professional_id` menor (estável, REQ-AGD-004). Sem horário no período → próximo dia livre dentro do horizonte (REQ-AGD-008). Hora local com `Temporal` e base IANA (REQ-AGD-006).
- **Cache** (REQ-AGD-050): em Redis, o **tempo livre** por `(tenant, profissional, data)` com versão dos insumos (não os inícios por serviço, que são calculados na hora a partir do tempo livre, em microssegundos). Invalidação por eventos (`scheduling.occupancy.*`, `workforce.availability.changed.v1`, `tenancy.branch.hours_changed.v1`, `catalog.*.changed`) em ≤ 5 s (REQ-AGD-051). Sem cache, cálculo a partir das fontes (REQ-AGD-052) — nunca mostra horário dentro de ocupação conhecida, porque as células são sempre lidas do banco na ausência do cache.
- **Desempenho**: meta 500 ms p95 e 50 consultas/s por filial (REQ-AGD-007); estimativa de 20–40 ms por consulta de 7 dias com cache.

## R7. Agendamento pela equipe e encaixe

- **Decisão**: rotas de equipe ignoram antecedência e mostram serviços internos (REQ-AGD-040). Ocupar fora da escala ou do horário da filial exige `override = { reason }` e grava ator e motivo na ocupação e na trilha de auditoria (REQ-AGD-041). Folga ou bloqueio aprovado continua impedindo (REQ-AGD-043): o motor confere o contrato da 007 antes da escrita. Sobreposição com outra ocupação é impossível para qualquer perfil (a célula).

## R8. Alternativas na recusa

- **Decisão**: em conflito, a resposta Problem Details `scheduling.slot_taken` traz `alternatives`: os 3 inícios livres mais próximos do mesmo profissional e o mesmo horário com outro profissional que executa o serviço, se houver (REQ-AGD-025).

## R9. Conflito entre negócios (C6)

- **Decisão**: cada ocupação definitiva publica o `person_id` do profissional; o `scheduling` mantém em `koovela_projections.person_occupancy_index` (dono `scheduling`) as janelas por pessoa entre tenants, detecta sobreposição e publica `scheduling.cross_tenant_conflict.detected.v1` para o colaborador e os dois tenants (REQ-AGD-061). O **bloqueio opcional ligado pelo colaborador** (decisão do `[C6]`, CONST 1.1.0) é da spec 027, que cria ocupações do tipo `external_block` pelo mesmo caminho de células. Na v1.0 a detecção existe e é coberta por teste de contrato.

## R10. Modelo latente das fases 2 e 3

- **Decisão**: `scheduling_occupancy` já tem `resource_id`, `capacity_unit` (para turma, com tabela de vagas separada na spec 026) e `granularity` (`cells` \| `day_period`, para eventos da spec 035) — sem interface na v1.0 (REQ-AGD-060/062).

## R11. Testes obrigatórios

- **Decisão**:
  - **Concorrência** (portão de merge, REQ-AGD-071): 50 pedidos simultâneos para a mesma janela → exatamente 1 sucesso, para serviço, combo (com uma etapa em conflito) e recurso, contra MySQL e Redis reais.
  - **Propriedade** (fast-check, REQ-AGD-072): nenhum início oferecido sobrepõe ocupação, folga ou bloqueio; todo início cabe inteiro no tempo de trabalho; inclusive em fusos diferentes e datas com horário de verão histórico.
  - **Falha do lock**: com o Redis fora, a constraint ainda impede a sobreposição.
  - **Isolamento**: contratos na suíte da 002 (REQ-AGD-073).

## R12. Telas

Esta spec não tem tela própria: alimenta C07/W10 ("Data e horário"), C06/W09 ("Escolha de profissional"), P03/P04 (agendas) e P05 ("Novo agendamento manual"), entregues pela spec 009.
