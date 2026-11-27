# Implementation Plan: Motor de agenda e disponibilidade

**Branch**: `008-motor-agenda-disponibilidade` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-motor-agenda-disponibilidade/spec.md`

## Summary

Criar a parte de disponibilidade e ocupação do domínio `scheduling`:

- **Zero reserva dupla por construção.** Lock Redis por profissional e data, com token de posse e chaves em ordem, mais uma última linha de defesa no MySQL: a janela protegida vira **células de 5 minutos com chave primária por profissional** (o equivalente transacional de uma *exclusion constraint*). Qualquer sobreposição desfaz a transação inteira, inclusive no combo atômico.
- **Reserva temporária e confirmação.** A reserva dura 10 min e pode ser estendida uma vez, até 30 min. A confirmação muda o tipo da mesma linha, então a janela nunca fica livre no meio. Há limite de 2 reservas temporárias por consumidor e negócio.
- **Cálculo de horários.** Tempo livre = intervalos de trabalho da 007 menos as células ocupadas, na grade do negócio e com antecedência e horizonte. "Qualquer profissional" atribui ao menos ocupado do dia. Cache de tempo livre em Redis invalidado por eventos em ≤ 5 s; sem cache, o cálculo vem das fontes.
- **Equipe.** Agendamento com encaixe justificado, mas nunca sobre folga ou outra ocupação.
- **Recusa.** Toda recusa por conflito devolve alternativas.
- **Preparado para o futuro.** Modelo latente para recurso, turma e evento. Detecção de conflito entre negócios: o bloqueio opcional é da spec 027 (C6 decidido).

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `ioredis` (lock com Lua), `@js-temporal/polyfill`, fast-check.

**Storage**: schema do tenant (`scheduling_settings`, `scheduling_occupancy`, `scheduling_occupancy_cell` particionada por mês, `scheduling_resource_cell`, `scheduling_consumer_hold_counter`); Redis (locks, cache de tempo livre); `koovela_projections.person_occupancy_index`; RabbitMQ `scheduling.events`.

**Testing**: concorrência (50 pedidos → 1 sucesso; serviço, combo, recurso; com e sem Redis) como portão de merge; propriedades do cálculo (fusos e horário de verão); máquina de estados da ocupação; carga (50 req/s por filial, p95 ≤ 500 ms); isolamento; contratos.

**Target Platform**: `core` (consultas e comandos), `workers` (expiração de *holds*, invalidação de cache, detecção entre tenants).

**Project Type**: núcleo de domínio sem tela própria; alimenta as telas da spec 009.

**Performance Goals**: consulta de 7 dias ≤ 500 ms p95 com 50 req/s por filial; escrita de ocupação ≤ 100 ms p95; propagação de mudança ≤ 5 s; liberação de *hold* vencido ≤ 1 min.

**Constraints**: consulta nunca é garantia; janela protegida inclui preparo e limpeza (arredondada para fora a 5 min); UTC no banco, hora local por data; chaves Redis com prefixo de tenant.

**Scale/Scope**: 2.000 profissionais, 50 mil agendamentos/mês; ~14 milhões de células em 60 dias no pior caso, somando os tenants.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock e constraint, teste de concorrência | Lock Redis com token + células com PK no banco; combo atômico; teste de concorrência como portão; recusa com alternativas | ✅ |
| G-II | Isolamento | Tabelas no schema do tenant; chaves Redis com prefixo; contratos na suíte; projeção entre tenants só com ids | ✅ |
| G-III | Dinheiro | Sem dinheiro; versão do serviço passada pela 009 | ✅ N/A |
| G-IV | Dados pessoais | Só ids (consumidor, pessoa); nada pessoal em evento | ✅ |
| G-V | Permissões e auditoria | Encaixe fora do horário com motivo e ator, auditado; rotas de equipe na matriz | ✅ |
| G-VI | Rastreabilidade | REQ-AGD com origem; C6 alinhado à decisão de 2026-11-25 | ✅ |
| G-VII | Contratos | [availability.openapi.yaml](./contracts/availability.openapi.yaml), [scheduling-occupancy-events.asyncapi.yaml](./contracts/scheduling-occupancy-events.asyncapi.yaml); insumos de 005/006/007 por contrato e evento | ✅ |
| G-VIII | Testes antes, invariantes | Invariante 1 (concorrência), propriedades do cálculo, máquina de estados | ✅ |
| G-IX | Outbox | Eventos pelo outbox; consumidores de invalidação idempotentes por versão | ✅ |
| G-X | Migrações, observabilidade | Executor da 002; métricas de conflitos, latência, *holds* vencidos | ✅ |
| G-XI | Superfícies | Sem tela própria; alimenta C06/C07, W09/W10, P03–P05 (spec 009) | ✅ |
| G-XII | Complexidade | Células justificadas abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/008-motor-agenda-disponibilidade/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── availability.openapi.yaml
    └── scheduling-occupancy-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/scheduling/
├── src/availability/      # tempo livre, grade, inícios, "qualquer profissional", próximo dia
├── src/occupancy/         # lock, células, hold, confirmação, liberação, combo atômico, alternativas
├── src/cache/             # tempo livre em Redis + invalidação por evento
├── src/cross-tenant/      # índice por pessoa e detecção (C6)
├── src/http/              # rotas públicas, de equipe e internas
└── migrations/
packages/domain/time-grid/ # funções puras: células, grade, interseção de intervalos (testes de propriedade)
```

**Structure Decision**: o motor é parte do domínio `scheduling` no `core`, com a lógica pura de intervalos em `packages/domain/time-grid` para os testes de propriedade; o agendamento (009) usa os comandos internos deste contrato.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Células de 5 minutos com PK como constraint de sobreposição | O MySQL não tem *exclusion constraint*; a CONST I exige uma regra no banco além do lock | `SELECT … FOR UPDATE` por intervalo (depende de *gap locks*, frágil sob carga) |

## Riscos e pendências

- **Preparo e limpeza**: a 006 passou a aceitar só múltiplos de 5 (REQ-CAT-003, ajuste de 2026-11-26); o arredondamento para fora continua como defesa.
- **Células sem FK**: a partição mensal impede FK no MySQL; a liberação apaga as células na mesma transação e um job diário verifica órfãs (T055).
- **Redis de nó único**: a falha do lock é coberta pela célula no banco (testado).
- **Ajuste feito na spec**: REQ-AGD-061 e a tabela de pendências alinhadas à decisão do `[C6]` (bloqueio só quando o colaborador liga, spec 027).
