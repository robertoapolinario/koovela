# Implementation Plan: CRM e campanhas

**Branch**: `028-crm-campanhas` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/028-crm-campanhas/spec.md`

## Summary

Criar o submódulo `crm` do `engagement` (fase 2, D32):

- **Consentimento único** de comunicações promocionais por estabelecimento e canal (substitui o opt-in da 014), no registro central da 022; padrão "sem"; descadastro sem login em ≤ 1 min; menores e atendidos nunca recebem.
- **Segmentos** sobre a ficha da 020 (sugeridos e editáveis), com alcance por canal e lista nominal só ao Proprietário.
- **Campanhas** por push, e-mail (`ofertas@news.koovela.com`) e SMS — **sem WhatsApp** —, com prévia, teste, oferta pelo link com preço congelado, bloqueio de conteúdo e, em saúde, de preço e promoção (PEN-06).
- **Cota por plano e excedente na fatura** (019), silêncio e limite por consumidor aplicados no `notification`.
- **Resultados e atribuição**, **antifraude** (pausa por descadastro, spam ou bounce) e **automações** idempotentes por ciclo.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; contratos de 009, 011, 012, 014, 015, 019, 020, 021, 022, 025; `jose` (tokens de link e descadastro); `mjml` (e-mail).

**Storage**: schema do tenant (`engagement_marketing_consent`, `crm_*`); extensão de `billing_plan_version` (019); RabbitMQ `engagement.events`.

**Testing**: consentimento no momento do envio; descadastro ≤ 1 min; exclusão de menores e atendidos; bloqueio de WhatsApp e de preço em saúde; cota e excedente; limite por consumidor e silêncio; idempotência das automações; atribuição; pausa por abuso; privacidade; isolamento; axe na tela de campanhas.

**Target Platform**: `core`, `workers` (envio em lotes, automações diárias, atribuição, saúde do tenant), painel, back-office, app e web do consumidor.

**Project Type**: submódulo de domínio + telas.

**Performance Goals**: prévia de segmento ≤ 2 s para 10 mil consumidores; envio de 10 mil mensagens ≤ 15 min respeitando limites do provedor.

**Constraints**: envio só pelo `notification`; custo do volume coberto por cota/excedente; flag `crm.campaigns` desligada até haver provedor de volume.

**Scale/Scope**: até 10 mil consumidores por negócio; algumas campanhas por mês.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Agendamento pelo fluxo da 009 | ✅ N/A |
| G-II | Isolamento | Segmentos só no schema do tenant; Gerente da filial | ✅ |
| G-III | Dinheiro | Oferta congelada; excedente por item de uso idempotente | ✅ |
| G-IV | Dados pessoais | Opt-in explícito por canal com prova; descadastro sem login; menores excluídos; port da 022 | ✅ |
| G-V | Permissões e auditoria | Lista nominal só Proprietário; envios, pausas, revisões e concessões auditados | ✅ |
| G-VI | Rastreabilidade | D32 e PEN-06 decididos; provedor de volume pendente (não bloqueante, atrás de flag) | ✅ |
| G-VII | Contratos | [crm.openapi.yaml](./contracts/crm.openapi.yaml), [crm-events.asyncapi.yaml](./contracts/crm-events.asyncapi.yaml); envio pelo contrato da 011 | ✅ |
| G-VIII | Testes antes | Consentimento, bloqueios, cota, automações | ✅ |
| G-IX | Outbox, idempotência | `crm_send` e `crm_automation_fire` únicos | ✅ |
| G-X | Observabilidade | Entregas, bounces, descadastros, pausas | ✅ |
| G-XI | Figma, a11y | Campanhas e cota a conferir; C12, C18, W14, W20 | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhuma nova | ✅ |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/028-crm-campanhas/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── crm.openapi.yaml
    └── crm-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/engagement/src/crm/{consent,segments,campaigns,content-guard,quota,sending,attribution,automations,health,holder-data}/
services/scheduling/src/idle/   # passa a ler engagement_marketing_consent (migração do opt-in da 014)
apps/tenant-web/src/routes/crm  # campanhas, segmentos, resultados, automações
apps/admin-web/src/routes/crm   # cota por tenant, revisão
apps/consumer-mobile · consumer-web  # consentimento na Confirmação e no Perfil
```

**Structure Decision**: submódulo `crm` do `engagement`; envio sempre pelo `notification`.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Provedor de e-mail e SMS em volume**: planos gratuitos não comportam campanhas; escolha comercial pendente, com custo repassado por cota e excedente. Flag `crm.campaigns` desligada até lá.
- **Migração do opt-in da 014** para o consentimento único (expandir → migrar → contrair).
- **Telas** de campanhas e de cota a conferir no Figma.
