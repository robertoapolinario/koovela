# Implementation Plan: Vale-presente e pacotes

**Branch**: `029-vale-presente-pacotes` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/029-vale-presente-pacotes/spec.md`

## Summary

Criar o submódulo `gift_cards` do `payments` (fase 2, D33):

- **Vale-presente** por valor ou por serviço, combo ou pacote (preço congelado), comprado por qualquer pessoa com Pix ou cartão e split para a filial; entrega por aviso agendado ou só por código; reenvio único antes do resgate.
- **Código** de 80 bits guardado só como HMAC, com limite de tentativas.
- **Saldo** no livro de saldos da 012 (nunca negativo, uso parcial), só na filial da compra; reserva → consumo → devolução pelo fluxo do agendamento; vale de pacote vira pacote do presenteado; balcão com confirmação no celular; estorno volta ao saldo.
- **Ordem de abatimento** oferta → fidelidade → vale → pagamento, com teste de propriedade.
- **Reembolso** em 7 dias sem uso; validade por filial com avisos e extensão por suspensão; encerramento de filial com alternativa.
- **NFS-e no uso** (PEN-24) pelo valor coberto, venda como adiantamento; comissão e pontos no uso.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/money`, `packages/platform/crypto` (HMAC, contatos cifrados), `packages/domain/pricing` (abatimentos); contratos de 006, 009, 010, 011, 012, 015, 017, 019, 022, 028.

**Storage**: schema do tenant (`gift_card*`), livro de saldos (012); `koovela_projections.consumer_wallet`; RabbitMQ `payments.events`.

**Testing**: propriedade dos abatimentos; concorrência do saldo; entropia e armazenamento do código; limite de tentativas; reembolso em 7 dias; extensão de validade; NFS-e no uso; isolamento; axe nas telas.

**Target Platform**: `core`, `workers` (entregas agendadas, avisos de validade, expiração), app e web do consumidor, painel.

**Project Type**: submódulo financeiro + telas.

**Performance Goals**: compra ≤ 1,5 s p95 (como o checkout da 012); resgate ≤ 500 ms.

**Constraints**: saldo só por lançamentos; código nunca em claro; uso só na filial; estorno nunca em dinheiro ao presenteado.

**Scale/Scope**: picos em datas comemorativas (10× o normal).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Uso pelo fluxo da 009 | ✅ N/A |
| G-II | Isolamento | Vales no tenant; carteira por projeção | ✅ |
| G-III | Dinheiro, ledger, idempotência, versão congelada | Livro de saldos nunca negativo; preço congelado; abatimentos por propriedade; idempotência em compra/uso/reembolso | ✅ |
| G-IV | Dados pessoais | Contato do destinatário cifrado; eventos sem código nem contato; port da 022 | ✅ |
| G-V | Permissões e auditoria | Reembolso fora da regra e cancelamento pelo estabelecimento, auditados | ✅ |
| G-VI | Rastreabilidade | D33, PEN-24 decididos (conflito de padrão com a 017 registrado) | ✅ com pendência |
| G-VII | Contratos | [gift-cards.openapi.yaml](./contracts/gift-cards.openapi.yaml), [gift-cards-events.asyncapi.yaml](./contracts/gift-cards-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Propriedade, concorrência, segurança do código | ✅ |
| G-IX | Outbox | Eventos pelo outbox; consumidores idempotentes | ✅ |
| G-X | Observabilidade | Tentativas de código, vencimentos, reembolsos | ✅ |
| G-XI | Figma, a11y | Telas da DF 9.10 a conferir; resgate, carteira e balcão a conferir | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova (reutiliza o livro da 012) | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/029-vale-presente-pacotes/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── gift-cards.openapi.yaml
    └── gift-cards-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/payments/src/gift-cards/{purchase,delivery,codes,redeem,apply,refund,expiry,settings,wallet-projection}/
packages/domain/pricing/            # applyDeductions()
apps/consumer-mobile · consumer-web # comprar, resgatar, carteira
apps/tenant-web/src/routes/gift-cards   # lista, totais, venda e uso no balcão
```

**Structure Decision**: submódulo do `payments`, reaproveitando o livro de saldos e o checkout da 012.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Pacotes na 017**: resolvido em 2026-11-27 — a REQ-FIS-013 passou a ter `per_session` como padrão (configurável), alinhada ao PEN-24; falta só a validação do contador.
- **NFS-e no uso**: validar com contador (base do ISS e momento do fato gerador).
- **Telas** a conferir no Figma.
