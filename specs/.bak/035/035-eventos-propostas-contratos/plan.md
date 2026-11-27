# Implementation Plan: Eventos — propostas, contratos e sinal

**Branch**: `035-eventos-propostas-contratos` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/035-eventos-propostas-contratos/spec.md`

## Summary

Atender os fornecedores de eventos (D42) no domínio `quotes`.

- **Configuração** por filial ou por profissional: unidade (dia inteiro ou períodos), capacidade, regra do sinal (10% a 50% ou valor fixo), saldo em até 3 parcelas, faixas de cancelamento e bloqueios de data.
- **Modelo de contrato**: modelo base da Koovela, com revisão jurídica obrigatória, mais cláusulas próprias. A cláusula do arrependimento é fixa.
- **Pedido de proposta**: o `quote_request` da 033 com `kind = event`. O consumidor vê se a data está livre, em negociação ou ocupada.
- **Proposta versionada**, com **pré-reserva** garantida por uma PK de vagas por unidade (como os assentos da 026). Evento de vários dias reserva tudo ou nada. Para profissional, as células do período também são ocupadas na 008. A validade é configurável (PEN-31: de 1 a 15 dias, padrão 7).
- **Aceite**:
  - só maior de 18 anos, com CPF e reautenticação;
  - evidências com o hash do PDF exibido;
  - assinatura avançada opcional acima de um valor (PEN-29), por uma porta para o provedor, com o custo repassado ao tenant como uso na fatura.
- **Sinal pago** pela 012 com split confirma a data e emite o PDF imutável para as duas partes. Sem pagamento em 24 h, o aceite perde efeito.
- **Depois da confirmação**: saldo em parcelas com aviso; aditivos aceitos da mesma forma; cancelamento com simulação e 100% de devolução em até 7 dias do aceite (CDC 49), depois pelas faixas; cancelamento pelo fornecedor devolve tudo e marca a reputação; realização manual ou automática com convite de avaliação.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**:
- Fastify 5, Zod (schemas fechados), Kysely e `packages/platform/crypto`.
- `markdown-it` com sanitização e renderização HTML → PDF pelo Chromium headless (como a 018).
- Porta `SignatureProvider`, com o primeiro adaptador atrás de flag.
- Contratos de 003, 004, 008, 011, 012, 016, 017, 019, 022, 024 e 033.
- TanStack Query.

**Storage**:
- Schema do tenant: `quotes_event_*`, `quotes_proposal*`, `quotes_date_slot`, `quotes_date_hold`, `quotes_contract*`, `quotes_installment`, `quotes_cancellation` e extensões de `quotes_request` e `scheduling_occupancy`.
- `koovela_platform`: `quotes_contract_base_version` e `quotes_limits` estendido.
- `koovela_projections`: `consumer_events_index`.
- Object Storage: PDFs com retenção de 5 anos e bloqueio de remoção.
- RabbitMQ: `quotes.events` e `payments.events`.

**Testing**:
- Concorrência de vagas: capacidade, vários dias e troca de data.
- Propriedade de devoluções: 7 dias, faixas, Σ estornos ≤ Σ pago.
- Contrato: PDF e evidência em 100% dos confirmados; cláusula fixa presente.
- Bloqueio de menor; reautenticação obrigatória.
- Expiração e lembretes com relógio simulado.
- Saga do sinal: pago, não pago, falha.
- Privacidade: CPF e local cifrados; evidência com acesso auditado.
- axe AA.

**Target Platform**: `core` (`quotes`, `payments`, `scheduling`), `workers` (expiração, lembretes, PDF, realização automática), `consumer-mobile`, `consumer-web` e `tenant-web`.

**Project Type**: expansão do domínio `quotes` com contratos e pagamentos, mais telas.

**Performance Goals**:
- Disponibilidade de 90 dias ≤ 500 ms p95.
- Envio da proposta com pré-reserva ≤ 1 s p95.
- PDF gerado ≤ 10 s, em segundo plano.
- Aceite, contrato e sinal ≤ 5 min de ponta a ponta (SC-002).

**Constraints**:
- Só o sinal confirma a data.
- Contrato imutável depois de confirmado.
- Custo zero no aceite simples; a assinatura avançada é paga pelo fornecedor.
- A Koovela não arbitra nem debita multas do fornecedor.
- O modelo base só vale com revisão jurídica.

**Scale/Scope**: centenas de eventos por fornecedor por ano; até 6 períodos por dia; até cerca de 30 itens por proposta.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Pré-reserva por PK de vagas; células da 008 para profissional; vários dias atômico | ✅ |
| G-II | Isolamento | Tudo no tenant; "Meus eventos" por projeção sem dado sensível | ✅ |
| G-III | Dinheiro | Centavos e pontos-base; versões congeladas; estornos idempotentes e limitados ao pago; split da 012 | ✅ |
| G-IV | Dados pessoais | CPF e local cifrados; evidências com acesso restrito e auditado; retenção de 5 anos justificada; 90 dias para pedidos não convertidos | ✅ |
| G-V | Permissões e auditoria | Tabela da spec; reautenticação no aceite e nos cancelamentos; trilha de aceites, aditivos, cancelamentos e devoluções | ✅ |
| G-VI | Rastreabilidade | D42, PEN-29 e PEN-31 decididos; PEN-14 e PEN-19 herdados | ✅ |
| G-VII | Contratos | [events.openapi.yaml](./contracts/events.openapi.yaml), [events-events.asyncapi.yaml](./contracts/events-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Concorrência de vagas, propriedade das devoluções | ✅ |
| G-IX | Outbox e idempotência | Sinal, parcelas e estornos com `Idempotency-Key`; eventos sem dado sensível | ✅ |
| G-X | Observabilidade | Conversão, valor contratado, pré-reservas vencidas, cancelamentos por fornecedor | ✅ |
| G-XI | Figma e a11y | Telas da DF 9.11 a conferir; editor, aditivo e simulação a conferir; WCAG AA | ✅ com pendência de protótipo |
| G-XII | Complexidade | Porta `SignatureProvider` justificada abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida. As extensões em 008 (`day_period`), 024 (`booking_mode`) e 033 (`kind = event` e limites de evento) são aditivas.

## Project Structure

### Documentation (this feature, local only)

```text
specs/035-eventos-propostas-contratos/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── events.openapi.yaml
    └── events-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/quotes/src/events/{settings,blocks,availability}/
services/quotes/src/{proposals,date-holds,contracts,amendments,installments,cancellations}/
packages/platform/signature/                 # SignatureProvider + adaptador (flag quotes.advanced_signature)
packages/platform/documents/                 # Markdown restrito → HTML → PDF (compartilhado com a 018)
services/workers/src/quotes/{expiry,reminders,render-pdf,auto-fulfill}/
apps/consumer-mobile/src/app/eventos
apps/consumer-web/src/routes/eventos
apps/tenant-web/src/routes/eventos/{calendario,propostas,contratos,configuracao,modelo}
```

**Structure Decision**: a lógica de eventos fica no `quotes`. A agenda da 008 só é tocada para profissional, pela API de ocupação. A geração de documentos sai para `packages/platform/documents` e é reaproveitada da 018.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Porta `SignatureProvider` com provedor externo pago | A PEN-29 decidiu que o fornecedor pode exigir assinatura avançada acima de um valor | Só aceite simples (contraria a decisão do clarify); assinatura própria (não é "avançada" sem certificação e identificação forte) |

## Riscos e pendências

- **Revisão jurídica do modelo base**: bloqueia o lançamento, e a flag `quotes.events` só liga com uma versão revisada.
- **Provedor de assinatura avançada**: escolher na contratação, entre provedores nacionais com API e cobrança por documento. Até lá, a flag `quotes.advanced_signature` fica desligada e a opção não aparece ao fornecedor.
- **Multa do fornecedor**: é registrada e mostrada, mas não é cobrada pela Koovela nesta fase. Cobrar exigiria débito no saldo do tenant, a avaliar junto com a 036.
- **Telas**: as da DF 9.11 precisam ser conferidas. O editor do modelo, os aditivos e a simulação de cancelamento ainda não estão no protótipo.
- **Parcelas sem cobrança automática**: o saldo depende de o consumidor pagar pelo app. Atrasos ficam com o fornecedor, conforme a spec.
