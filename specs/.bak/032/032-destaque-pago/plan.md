# Implementation Plan: Destaque pago na vitrine

**Branch**: `032-destaque-pago` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/032-destaque-pago/spec.md`

## Summary

Criar o submódulo `sponsored` do `discovery` (fase 3, D37): o Proprietário compra, por filial, um pacote fixo de dias num bairro (região aberta da 024) e categoria, dentro de um inventário limitado por dia com reserva atômica no MySQL (nunca vende além da capacidade). A cobrança é na hora pela forma de pagamento da assinatura, via fatura avulsa do `billing` (019) com nota da Koovela, com reautenticação 2FA. Os destaques aparecem numa faixa separada "Patrocinado" com rotação justa e os mesmos filtros da busca. A lista orgânica não é tocada: separação de código e teste de invariância. Os pacotes e preços ficam versionados no back-office com aprovação do Fin/Ops (PEN-30, sem valor no código). O resultado é medido de forma agregada e sem cookie, com atribuição na mesma sessão por token. O ciclo de pausa, cancelamento e reembolso segue a spec.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely; contratos de 004 (aprovação dupla, auditoria), 009 (origem), 012 (`PaymentProvider`), 017 (`FiscalProvider`), 019 (`getEntitlements`, fatura), 023 (BI), 024 (região, participação, listagem, busca Meilisearch); TanStack Query.

**Storage**: `koovela_discovery` (`discovery_sponsored_*`, `discovery_sponsorship*`); `koovela_platform` (fatura avulsa da 019); Redis (contadores de exibição/toque, cursor de rotação, cache de destaques ativos); RabbitMQ `discovery.events` e `billing.events`.

**Testing**: invariância orgânica (com e sem destaques, byte a byte); lint de fronteira de módulo; concorrência do último espaço; contrato (selo em 100%, sem preço em saúde); saga de cobrança (cartão, Pix expirado, falha); máquina de estados (pausa, 48 h, região fechada, moderação); atribuição só na mesma sessão; privacidade (nenhum consumidor nos agregados); axe AA.

**Target Platform**: `core` (`discovery`, `billing`), `workers` (ciclo diário, descarga de contadores), `tenant-web` (Destaque na vitrine), `consumer-mobile` e `consumer-web` (faixa), `admin-web` (inventário).

**Project Type**: submódulo de domínio + saga com billing + telas.

**Performance Goals**: a faixa soma ≤ 50 ms ao p95 da busca (que continua ≤ 1 s); compra ≤ 2 min de ponta a ponta (SC-004); clique ≤ 100 ms p95.

**Constraints**: lista orgânica intocada (D37); nenhum valor de preço no código (CONST 8); saúde sem preço; nenhuma identificação do consumidor; custo zero (sem serviço novo).

**Scale/Scope**: até 10 mil filiais; inventário típico de 3 espaços por (bairro, categoria); horizonte de calendário de 90 dias.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Agendamento pelo fluxo da 024/009; só `origin_ref` aditivo | ✅ |
| G-II | Isolamento | Global em `koovela_discovery`; cobrança no `billing`; atribuição consome eventos sem consumidor | ✅ |
| G-III | Dinheiro | Centavos; preço congelado; cobrança e estorno idempotentes pelo `sponsorship_id`; nota da Koovela | ✅ |
| G-IV | Dados pessoais | Medição agregada e sem cookie (legítimo interesse); token de sessão sem identidade | ✅ |
| G-V | Permissões e auditoria | Compra e cancelamento com 2FA; ofertas com aprovação dupla; reembolso fora da regra só Fin/Ops; trilha completa | ✅ |
| G-VI | Rastreabilidade | D37, PEN-26, PEN-30, PEN-06 | ✅ |
| G-VII | Contratos | [sponsored.openapi.yaml](./contracts/sponsored.openapi.yaml), [sponsored-events.asyncapi.yaml](./contracts/sponsored-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Invariância orgânica, concorrência, saga | ✅ |
| G-IX | Outbox, idempotência | Saga discovery ↔ billing por outbox; agregados em lote | ✅ |
| G-X | Observabilidade | Ocupação, receita, falhas de cobrança, latência da faixa | ✅ |
| G-XI | Figma, a11y | Telas da DF 9.11 a conferir; selo com texto; WCAG AA | ✅ com pendência de protótipo |
| G-XII | Complexidade | Nenhum serviço novo | ✅ |

**Reavaliação pós-design**: mantida. As extensões em 009 (`origin_ref`), 019 (`invoice.kind = one_off`) e 024 (campo `sponsored`) são aditivas e compatíveis com os contratos v1.

## Project Structure

### Documentation (this feature, local only)

```text
specs/032-destaque-pago/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── sponsored.openapi.yaml
    └── sponsored-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/discovery/src/sponsored/{offers,inventory,purchase,lifecycle,band,metrics,attribution}/
services/discovery/src/search/                  # só anexa o campo `sponsored` montado por band/
services/billing/src/one-off/                   # fatura avulsa, cobrança e estorno
services/workers/src/discovery/sponsored/       # ciclo diário, descarga de contadores
apps/tenant-web/src/routes/discovery/destaque   # compra, calendário, resultado
apps/consumer-mobile/src/components/SponsoredBand
apps/consumer-web/src/components/SponsoredBand
apps/admin-web/src/routes/discovery/destaques   # ofertas, ocupação, reembolsos
```

**Structure Decision**: submódulo do `discovery`, com regra de lint que impede `search/` e `ranking/` de importar `sponsored/`; cobrança como capacidade genérica de fatura avulsa no `billing`, que pode ser reaproveitada depois (por exemplo, pela 038).

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Telas**: "Destaque na vitrine" e "Parceiros e inventário de destaques" (DF 9.11) a conferir no Figma. A parte de parceiros é da 038.
- **Valores (PEN-30)**: a venda só começa quando a Gestão publicar a primeira versão de oferta.
- **Nota fiscal no estorno**: o cancelamento de NFS-e depende do prazo do município (017). Fora do prazo, sai nota de crédito ou abatimento conforme o perfil fiscal da Koovela.
- **Inferência de categoria pela consulta**: busca sem filtro explícito depende da taxonomia (024). Se a categoria for ambígua, a faixa não aparece.
- **Itens visíveis na faixa**: ASSUMIDO 3 na web e 2 no app, configurável.
