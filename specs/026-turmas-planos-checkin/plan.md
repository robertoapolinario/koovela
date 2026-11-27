# Implementation Plan: Turmas, planos e check-in

**Branch**: `026-turmas-planos-checkin` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/026-turmas-planos-checkin/spec.md`

## Summary

Criar turmas com capacidade (fase 2, D30):

- **Turmas e aulas** (`scheduling.classes`) geradas até o horizonte, ocupando o instrutor pela 008; sala só como nome (PEN-23); mudanças para o futuro; cancelamento e troca de instrutor com devolução.
- **Vagas sem dupla reserva**: lock Redis por aula + assento com PK no banco; teste de concorrência da última vaga como portão; sem fila de espera.
- **Inscrição** avulsa, por crédito de pacote ou por plano (reserva na inscrição, consumo na presença); menor pelo responsável; cancelamento pela política (010).
- **Check-in** por QR do aluno, QR rotativo do estúdio ou manual, na janela −30/+15 min, com envio atrasado sem rede; faltas no fim da aula; aluno de última hora.
- **Pacotes de aulas** no livro de saldos da 012; **planos de aulas** (`payments.memberships`) com cobrança recorrente, split, nota, limite por período, régua, cancelamento no fim do ciclo, fidelidade só aceita e aviso de 30 dias para preço.
- **Comissão do instrutor** por turma pelo contrato da 007; vertical bem-estar e fitness.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `ioredis` (lock), `packages/domain/recurrence` (013), contratos de 006, 007, 008, 010, 011, 012, 017, 019; `jose` (tokens de QR); armazenamento offline no app (SQLite do Expo).

**Storage**: schema do tenant (`classes_*`, `memberships_*`, extensões do catálogo e do livro de saldos); RabbitMQ `scheduling.events` e `payments.events`.

**Testing**: concorrência da última vaga (portão); saldos nunca negativos; limite do plano por semana local; janela de check-in e envio offline idempotente; régua da assinatura com relógio simulado; aviso de preço; isolamento; axe nas telas.

**Target Platform**: `core`, `workers` (geração de aulas, faltas, cobranças recorrentes, régua, avisos de validade), app e web do consumidor, painel, app do colaborador.

**Project Type**: submódulos em domínios existentes + telas.

**Performance Goals**: inscrição ≤ 500 ms p95; check-in por QR ≤ 300 ms.

**Constraints**: capacidade garantida no banco; sem fila de espera; créditos e usos só por lançamentos; cobrança recorrente só com consentimento.

**Scale/Scope**: estúdios com até 50 turmas e 1.000 alunos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock e constraint | Lock por aula + PK de assento; instrutor pela 008; teste de concorrência como portão | ✅ |
| G-II | Isolamento | Schema do tenant; eventos para "Meus agendamentos" | ✅ |
| G-III | Dinheiro, ledger, idempotência, versão congelada | Créditos e usos no livro de saldos; cobranças idempotentes; preços e comissão congelados | ✅ |
| G-IV | Dados pessoais | Menor pelo responsável (025); tokens de QR sem PII | ✅ |
| G-V | Permissões e auditoria | Cancelamento de aula e troca de instrutor pelo Proprietário, auditados | ✅ |
| G-VI | Rastreabilidade | D30, PEN-23, PEN-07 aplicados | ✅ |
| G-VII | Contratos | [classes.openapi.yaml](./contracts/classes.openapi.yaml), [classes-events.asyncapi.yaml](./contracts/classes-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Concorrência, saldos, régua | ✅ |
| G-IX | Outbox, idempotência | Check-ins e cobranças idempotentes; consumidores com DLQ | ✅ |
| G-X | Observabilidade | Ocupação das turmas, faltas, inadimplência de planos | ✅ |
| G-XI | Figma, a11y | Telas da DF 9.10 a conferir; assinatura do aluno e saldo a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova (reutiliza 008, 012, 013) | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/026-turmas-planos-checkin/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── classes.openapi.yaml
    └── classes-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/scheduling/src/classes/{groups,sessions,seats,enrollments,checkin,walk-ins,no-shows}/
services/payments/src/memberships/{subscriptions,charges,dunning,usage-limits}/
services/catalog/src/{class-packages,class-plans}/
apps/consumer-mobile · consumer-web       # turmas, inscrição, QR, créditos, assinatura
apps/tenant-web/src/routes/classes        # grade, capacidade, planos e pacotes
apps/pro-mobile/src/app/class-checkin     # lista, leitura de QR, modo offline
```

**Structure Decision**: turmas no `scheduling` (agenda e vagas), assinaturas no `payments` (cobrança recorrente), definições no `catalog`.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas** a conferir no Figma; gestão da assinatura pelo aluno e saldo de créditos podem ser novas.
- **Cobrança recorrente sem o cliente presente** depende do PSP escolhido na 012 (mesmo risco da 013).
