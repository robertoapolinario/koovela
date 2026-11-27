# Implementation Plan: Parceiros indicadores

**Branch**: `038-parceiros-indicadores` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/038-parceiros-indicadores/spec.md`

## Summary

Criar o domínio `partners` (D43) no schema global `koovela_platform`, com portal próprio em `parceiros.koovela.com` (`apps/partner-web`, usuários `kind = partner` e segundo fator obrigatório).

- **Cadastro e valor**: parceiro PJ com CNPJ e dados bancários cifrados, aprovado pelo Comercial. O valor por tenant ativado é versionado (padrão ou de contrato), com aprovação do Fin/Ops e sem número no código (PEN-30).
- **Indicação**: link (`koovela.com/p/{code}` com cookie de 90 dias), código no onboarding (005) e convites em lote (até 500 linhas). O lote tem declaração de autorização, um convite por contato a cada 90 dias, supressão global e descadastro em um clique, com SMS só com cota.
- **Atribuição**: o toque válido mais antigo em 90 dias vence. Não há atribuição para tenant que já existia nem para autoindicação, comparada por HMAC. Um tenant tem no máximo um parceiro. O Proprietário pode contestar em 7 dias.
- **Ativação** = primeira fatura de ciclo paga em até 90 dias depois da criação (PEN-30). O valor é congelado e lançado no livro de dupla entrada com idempotência. Reembolso em 30 dias gera estorno no extrato seguinte.
- **Pagamento**: extrato mensal, NFS-e validada automaticamente e conferida pelo Fin/Ops, pagamento registrado com comprovante e vencimento em 12 meses sem nota.
- **Portal**: mostra só nome, cidade, etapa e prazo dos indicados.
- **Back-office**: gestão completa e métricas de custo por ativado.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**:
- Fastify 5, Zod, Kysely, `packages/platform/crypto`.
- React Router 7 (`partner-web`).
- `exceljs` e `csv-parse` (planilhas).
- Leitor de XML de NFS-e da 017.
- Contratos de 002, 003, 004, 005, 011, 019, 021, 022 e 023.
- `fast-check`.

**Storage**:
- `koovela_platform`: `partners_*`, incluindo o livro.
- Object Storage: notas, comprovantes e materiais.
- Redis: limite de requisições do portal.
- RabbitMQ: `partners.events`.

**Testing**:
- Propriedade: um tenant tem no máximo uma atribuição, uma ativação e um pagamento; o livro soma zero; idempotência.
- Autoindicação e tenant que já existia.
- Janelas de 90, 30, 7 dias e 12 meses com relógio simulado.
- Lote: limites, descartes, supressão e tempo.
- Contrato do portal (só os campos permitidos).
- Validação de NFS-e.
- Pagamento sem nota recusado.
- Segundo fator obrigatório; axe AA.

**Target Platform**: `core` (`partners`), `workers` (lote, vencimentos, fechamento mensal, projeção), `partner-web`, `admin-web` e `tenant-web` (onboarding).

**Project Type**: novo domínio global, novo portal e extensões no onboarding.

**Performance Goals**:
- Lote de 100 convites ≤ 3 min (SC-002).
- Ativação no portal ≤ 1 h (SC-005; na prática, minutos).
- Portal ≤ 1 s p95.

**Constraints**:
- Valor fixo por ativado, sem comissão recorrente.
- Só PJ.
- Nenhum pagamento sem nota.
- O parceiro não vê dados do tenant.
- SMS com cota, por causa do custo.

**Scale/Scope**: centenas de parceiros; até cerca de 10 mil convites por mês.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Não se aplica | ✅ N/A |
| G-II | Isolamento | Domínio global; o portal lê só a projeção mínima; nenhuma chamada a domínios de tenant | ✅ |
| G-III | Dinheiro | Centavos; valor congelado; livro de dupla entrada; idempotência por tenant; estorno no extrato seguinte | ✅ |
| G-IV | Dados pessoais | Dados bancários cifrados; contatos de convite com declaração do parceiro (controlador), descadastro, supressão e 90 dias de retenção; autoindicação por HMAC | ✅ |
| G-V | Permissões e auditoria | Segundo fator no portal; aprovação dupla de valores; contestação, conferência e pagamento auditados | ✅ |
| G-VI | Rastreabilidade | D43 e PEN-30 (critério decidido, valor configurável) | ✅ |
| G-VII | Contratos | [partners.openapi.yaml](./contracts/partners.openapi.yaml), [partners-events.asyncapi.yaml](./contracts/partners-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Propriedades de atribuição e livro; contrato do portal | ✅ |
| G-IX | Outbox e idempotência | Consumo da 019 idempotente por `tenant_id`; eventos sem dado sensível | ✅ |
| G-X | Observabilidade | Ativados, taxa de ativação, custo por ativado, contestações, falhas de envio | ✅ |
| G-XI | Figma e a11y | Portal (DF 9.11) a conferir; lote, extrato com nota e contestação a conferir; WCAG AA | ✅ com pendência de protótipo |
| G-XII | Complexidade | Novo app `partner-web`, previsto na CONST 5 (`parceiros.koovela.com`) | ✅ |

**Reavaliação pós-design**: mantida. As extensões em 003 (`kind = partner`), 005 (código e aviso) e 011 (modelo de convite) são aditivas.

## Project Structure

### Documentation (this feature, local only)

```text
specs/038-parceiros-indicadores/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── partners.openapi.yaml
    └── partners-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/partners/src/{applications,members,rates,invites,touches,attribution,disputes,activation,ledger,statements,invoices,payouts,materials,portal-view}/
services/workers/src/partners/{send-batch,expire-activations,close-month,expire-statements,purge-invites}/
apps/partner-web/src/routes/{cadastro,inicio,convidar,indicados,extratos,materiais,usuarios}
apps/consumer-web/src/routes/p.$code      # landing do link (cookie kv_ref)
apps/tenant-web/src/routes/onboarding     # campo de código, "indicado por", contestação
apps/admin-web/src/routes/partners
```

**Structure Decision**: o `partners` é um domínio global com portal próprio. Ele só consome eventos de `tenancy` e `billing` e não lê dados operacionais de tenants.

## Complexity Tracking

Nenhuma violação.

## Riscos e pendências

- **Termos do programa e declaração de autorização dos contatos**: precisam de revisão jurídica antes de abrir o portal. Os dois cuidam da responsabilidade pelo envio a terceiros e do vencimento em 12 meses sem nota.
- **Custo de SMS**: a cota diária limita o gasto. O padrão é e-mail.
- **Pagamento manual**: a transferência é feita fora da plataforma pelo Fin/Ops. Com volume, automatizar por Pix pelo PSP fica como evolução.
- **Telas**: o portal (DF 9.11) precisa ser conferido. O envio em lote, o extrato com nota e a contestação ainda não estão no protótipo.
