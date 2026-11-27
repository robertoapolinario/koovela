# Implementation Plan: Agendamento e ciclo de vida

**Branch**: `009-agendamento-ciclo-de-vida` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-agendamento-ciclo-de-vida/spec.md`

## Summary

Completar o domínio `scheduling` com o agendamento:

- **máquina de estados explícita**, com transições gravadas e eventos pelo outbox; teste de propriedade como portão;
- **J1 do link à confirmação**: `RASCUNHO` + reserva temporária da 008; etapas 1 e 2 sob demanda; resumo com política; `PENDENTE_PAGAMENTO` quando a 010/012 exigir;
- **versões congeladas** de serviço, preço, profissional, comissão, política e fidelidade;
- **remarcação atômica** na mesma transação da 008 (mesmo domínio);
- **"Meus agendamentos" entre tenants** por projeção global sem PII (C5);
- **agenda da equipe** em tempo real por SSE e agendamento manual com pré-cadastro sem OTP (novo contrato no `identity`);
- **atendimento**: check-in, check-out com valor final "a partir de", app do colaborador offline por 7 dias;
- **exceções**: não comparecimento com tolerância e correção em 48 h, pendências de registro e afetados por mudanças.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5 (+ SSE), Zod, Kysely, módulo de ocupação da 008, `ics` (calendário), fast-check; no app do colaborador, `expo-sqlite` e fila local de comandos.

**Storage**: schema do tenant (`scheduling_appointment*`, contadores, afetados, pendências, `scheduling_client_link`); `koovela_projections.consumer_appointments_index`; RabbitMQ `scheduling.events`; Redis (fan-out do SSE).

**Testing**: propriedade da máquina de estados (portão); remarcação atômica sob concorrência; congelamento de versões; limite de futuros; projeção entre tenants (e não leitura por tenant); isolamento; E2E da J1 em app e web (Playwright e Detox) com axe nas telas de agendamento (CONST VIII item 7); testes do modo offline do app do colaborador.

**Target Platform**: `core` (scheduling), `gateway` (SSE), `workers` (expiração, pendências do fim do dia, projeção, afetados), `consumer-mobile`, `consumer-web`, `tenant-web` (+ `/pro`), `pro-mobile`.

**Project Type**: domínio de serviço + jornada principal em cinco superfícies.

**Performance Goals**: confirmação ≤ 2 s p95 (sem pagamento); agenda do painel atualizada ≤ 5 s; lista "Meus agendamentos" ≤ 300 ms p95.

**Constraints**: nenhuma transição fora da tabela; `CONCLUIDO` nunca apagado; versões congeladas imutáveis; projeção global sem PII e nunca lida por tenant; tenant das ações do consumidor vindo da projeção do próprio consumidor; observação cifrada.

**Scale/Scope**: 50 mil agendamentos/mês (escala inicial), ~2 mil por dia em pico.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Lock, constraint, máquina de estados | Escrita sempre pela 008 (lock + células); máquina de estados explícita com teste de propriedade; remarcação atômica; `CONCLUIDO` nunca apagado | ✅ |
| G-II | Isolamento | Agendamentos no schema do tenant; projeção global só para o consumidor; contratos na suíte | ✅ |
| G-III | Dinheiro e versão congelada | Preço em centavos e todas as versões congeladas na criação e mantidas na remarcação | ✅ |
| G-IV | Dados pessoais | Observação cifrada (sensível em saúde); eventos e projeção sem PII; endereço completo só após confirmar | ✅ |
| G-V | Permissões e auditoria | Escopo por papel na agenda; encaixe e exceção de limite com motivo; correções de no-show registradas | ✅ |
| G-VI | Rastreabilidade | REQ-AGE com origem; sem pendência bloqueante | ✅ |
| G-VII | Contratos | [appointments.openapi.yaml](./contracts/appointments.openapi.yaml), [appointment-events.asyncapi.yaml](./contracts/appointment-events.asyncapi.yaml); pré-cadastro como contrato novo do `identity` | ✅ |
| G-VIII | Testes antes, invariantes | Propriedade da máquina de estados; E2E da J1; axe | ✅ |
| G-IX | Outbox, idempotência, DLQ | Transição + evento na mesma transação; comandos com `Idempotency-Key`; consumidores com DLQ | ✅ |
| G-X | Migrações, observabilidade | Executor da 002; métricas de conversão, expiração, no-show | ✅ |
| G-XI | Figma, a11y, superfícies | C03, C07, C08, C12, C13, W06, W10, W11, W14, W15, P03, P04, P05, K01, K02, KD1, KD2 | ✅ |
| G-XII | Complexidade | SSE em vez de WebSocket; nenhum serviço novo | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/009-agendamento-ciclo-de-vida/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── appointments.openapi.yaml
    └── appointment-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/scheduling/src/
├── appointments/          # criação, confirmação, remarcação, cancelamento, check-in/out, no-show
├── projections/           # consumer_appointments_index
├── agenda/                # agenda do dia/semana, SSE, afetados, pendências
└── manual/                # agendamento manual, busca de cliente, pré-cadastro
packages/domain/appointment-state/   # máquina de estados pura
services/identity/src/consumer/pre-register.ts   # contrato novo pedido por esta spec
apps/consumer-mobile · consumer-web            # C03 C07 C08 C12 C13 · W06 W10 W11 W14 W15
apps/tenant-web/src/routes/agenda · pro/agenda # P03 P04 P05 · KD1 KD2
apps/pro-mobile/app/agenda                     # K01 K02 (+ cache offline)
```

**Structure Decision**: tudo no domínio `scheduling` (mesmo dono da 008), no processo `core`; a máquina de estados fica em `packages/domain` por ser lógica pura com teste de propriedade.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Contrato novo no `identity`** (pré-cadastro sem OTP): precisa entrar no contrato da spec 003 quando ela for implementada.
- **Exigência de pagamento e consequências da política** dependem das specs 010 e 012; até lá, nenhum agendamento exige pagamento online e as consequências são *stubs*.
- **App do colaborador offline**: conflito resolvido pelo servidor; o colaborador vê a correção na próxima sincronização.
