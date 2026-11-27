# Quickstart de validação: Motor de agenda e disponibilidade (008)

Pré-requisitos: specs 001–007 no ar; negócio de beleza com 2 filiais, 3 profissionais com escalas, serviços e um combo. Contratos em [contracts/](./contracts/), modelo em [data-model.md](./data-model.md).

## 1. Horários de verdade (História 1)

`GET /v1/public/businesses/{slug}/availability?branch_id=…&item_kind=service&item_id=…&from=<hoje>&days=7`

Esperado: inícios na grade de 15 min; nenhum antes de agora + 2 h nem depois de 60 dias; nenhum dentro de almoço, folga, bloqueio ou ocupação; serviço de 60 min com limpeza de 10 não aparece às 17:00 se a escala termina às 18:00 com limpeza; sem horário na semana → `next_available_date`. Filial pausada ou negócio despublicado → lista vazia. p95 ≤ 500 ms com `pnpm load --scenario availability --rps 50`.

## 2. Zero reserva dupla (História 2)

```bash
pnpm test:concurrency --filter scheduling     # 50 pedidos na mesma janela → exatamente 1 sucesso (serviço, combo, recurso)
pnpm test:concurrency --filter scheduling -- --no-redis   # sem o lock, a célula ainda impede a sobreposição
```

Conflito manual: dois *holds* no mesmo horário → o segundo recebe `scheduling.slot_taken` com até 3 inícios próximos e o mesmo horário com outro profissional.

## 3. Reserva temporária (História 3)

Criar *hold* → expira em 10 min; estender uma vez → até 30 min; tentar estender de novo → recusado; deixar vencer → liberado em ≤ 1 min com `scheduling.occupancy.hold_expired.v1`. Terceiro *hold* do mesmo consumidor no mesmo negócio → `scheduling.hold_limit_reached`. Confirmar → a janela nunca fica livre entre *hold* e definitiva (teste de corrida na confirmação).

## 4. Combo (História 4)

*Hold* de "Corte + Escova" com a etapa 2 em conflito → nenhuma etapa ocupada. Sem conflito → duas ocupações filhas ligadas à mãe, preparo só antes da primeira e limpeza só depois da última.

## 5. Equipe e encaixe (História 5)

Visão de equipe (`/v1/tenant/availability`) mostra horários dentro das próximas 2 h e serviços internos. Encaixe fora da escala com `override.reason` → aceito e registrado (ator e motivo, trilha da spec 004). Dentro de folga aprovada → recusado (`scheduling.time_off_conflict`). Sobre outra ocupação → recusado para qualquer perfil.

## 6. Coerência (História 6)

Aprovar uma folga (spec 007) → os inícios do dia somem em ≤ 5 s. Desligar o Redis → a consulta continua correta (mais lenta), sem mostrar horário ocupado.

```bash
pnpm test:property --filter availability   # nenhum início sobrepõe ocupação/folga/bloqueio; todo início cabe; fusos e horário de verão
```

## 7. Latentes (História 7)

Ocupação com `resource_id` (fixture) protegida pela tabela de células do recurso. Teste de contrato: duas ocupações da mesma pessoa em tenants sintéticos diferentes → `scheduling.cross_tenant_conflict.detected.v1`, sem bloqueio. `pnpm test:isolation` inclui as rotas desta spec.
