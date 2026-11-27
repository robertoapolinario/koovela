# Implementation Plan: Catálogo

**Branch**: `006-catalogo` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-catalogo/spec.md`

## Summary

Criar o domínio `catalog`:

- **serviços** com versões imutáveis de preço e duração (vigência imediata ou futura) e disponibilidade e preço próprio por filial;
- **combos de 2 a 5 etapas com o mesmo profissional**, com rateio determinístico do desconto (resto na última etapa) e plano de etapas para o motor de agenda;
- **pacotes de N sessões** (v1.0, venda simples) com versão congelada na compra; o saldo fica no `payments`;
- **sugestões por vertical**;
- **exibição pública** sem nenhum campo de preço em saúde. Pacotes de saúde só são vendidos no local (consequência do PEN-06).

Contratos de "versão vigente em T" e "versão por id" para que a spec 009 congele o preço. Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/money`, `packages/platform/media` (fotos), `packages/platform/audit`, fast-check (propriedades).

**Storage**: schema do tenant (`catalog_*`), `koovela_platform.catalog_service_suggestion`; RabbitMQ `catalog.events`.

**Testing**: Vitest + Testcontainers; propriedade do rateio (soma = desconto); "versão vigente em T" com vigências futuras e substituições; congelamento (versão por id imutável); isolamento estendido; contratos; Playwright + axe em O03, P12, P13, P14, C05/W08.

**Target Platform**: `core` (`catalog`), `workers` (consumidor de clonagem, ativação de versões agendadas), `tenant-web`, `consumer-web`, `consumer-mobile`.

**Project Type**: domínio de serviço + telas do painel e do consumidor.

**Performance Goals**: catálogo público de uma filial ≤ 150 ms p95 (cache); "versão vigente em T" ≤ 10 ms p95 (consultado em cada agendamento).

**Constraints**: dinheiro em centavos com `Money`; versões imutáveis; nenhum campo de preço em respostas públicas de saúde; serviço usado nunca apagado.

**Scale/Scope**: ~30 serviços, 5 combos e 5 pacotes por negócio em média; 500 tenants.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Combo entregue como plano ao motor (008); reserva atômica não é deste domínio | ✅ N/A |
| G-II | Isolamento | Catálogo no schema do tenant; página pública pelo tenant do slug | ✅ |
| G-III | Dinheiro e versão congelada | `Money` em centavos; versões imutáveis; rateio determinístico com teste de propriedade; versão do pacote congelada na compra | ✅ |
| G-IV | Dados pessoais | Sem dado pessoal; fotos sem metadados (spec 005) | ✅ |
| G-V | Permissões e auditoria | Proprietário tudo; Gerente só a própria filial; mudanças de preço e composição auditadas | ✅ |
| G-VI | Rastreabilidade | REQ-CAT com origem; PEN-07 e PEN-06 decididos | ✅ |
| G-VII | Contratos antes do código | [catalog.openapi.yaml](./contracts/catalog.openapi.yaml), [catalog-events.asyncapi.yaml](./contracts/catalog-events.asyncapi.yaml); saldo de pacote no `payments` | ✅ |
| G-VIII | Testes antes | Propriedade do rateio, versões, congelamento | ✅ |
| G-IX | Outbox | Eventos pelo outbox; consumidor de clonagem idempotente | ✅ |
| G-X | Migrações, observabilidade | Executor da 002 | ✅ |
| G-XI | Figma, a11y | O03, P12, P13, P14, C04, C05, W07, W08 | ✅ |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/006-catalogo/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── catalog.openapi.yaml
    └── catalog-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/catalog/
├── src/{services,versions,branches,combos,packages,suggestions,public,internal}/
└── migrations/
apps/tenant-web/src/routes/{onboarding/services,catalog/services,catalog/combos,catalog/packages}/   # O03 · P12 · P13 · P14
apps/consumer-web/app/routes/$slug.servico.$id.tsx    # W08
apps/consumer-mobile/app/business/[slug]/service/[id].tsx   # C05
```

**Structure Decision**: novo serviço lógico `catalog` carregado pelo processo `core` (D44).

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Pacotes de saúde só no local**: decorre do PEN-06 (preço nunca exibido). Se o negócio quiser vender pacote pelo app, isso exige nova decisão de produto.
- **Ajuste registrado**: REQ-CAT-040 a 046 confirmados na v1.0 (PEN-07 decidido no clarify).
