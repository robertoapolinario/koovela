# Implementation Plan: Back-office de gestão

**Branch**: `021-backoffice-gestao` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/021-backoffice-gestao/spec.md`

## Summary

Criar o domínio `backoffice` em `koovela_platform`, acessível só por `admin.koovela.com`:

- **Tenants e visão geral**: busca por nome, slug, CNPJ ou e-mail completos; detalhe composto **só por contratos e projeções** (nunca o schema do tenant); PII mascarada com revelação por campo justificada e auditada; observações internas; sessão de suporte pela 003; KPIs a cada 15 min.
- **Onboarding e KYC**: filas de parados (> 7 dias) e de recebedores recusados (> 3 dias úteis), pedido de documento, bloqueio de recebedor, situação do CNPJ por consulta pública gratuita.
- **Concessões** com limites por perfil configuráveis, aprovação acima do limite, aplicação pela 019 e métricas de conversão.
- **Antifraude**: motor de regras versionadas sobre sinais de 003/008/009/012/015/016; automático só retém por até 72 h; bloqueio e suspensão só por humano, com motivo; revisão por outra pessoa em 5 dias úteis (LGPD art. 20); alvo colaborador = vínculo; nunca expõe anotações.
- **Chargebacks e estornos** com complemento do tenant, alerta de prazo e segunda pessoa acima do limite.
- **Filas reunidas** de todas as specs.

Decisões em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`) sobre Node.js 24 LTS.

**Primary Dependencies**: Fastify 5, Zod, Kysely, `packages/platform/audit`, `packages/platform/pii-mask`, `packages/domain/fraud-rules` (motor declarativo próprio), clientes dos contratos das specs 002–020; BrasilAPI (consulta pública de CNPJ, gratuita).

**Storage**: `koovela_platform` (`bko_*`); Redis (agrupamento de alertas, cache); RabbitMQ `backoffice.events`.

**Testing**: matriz por célula; teste de arquitetura (sem acesso a schema de tenant); automático nunca bloqueia/suspende; retenção ≤ 72 h com escalada; segunda pessoa e marca "sem segunda pessoa"; mascaramento e revelação auditada; ausência de anotações em toda resposta; agrupamento de 24 h; axe em G01, G02, G04, G06, G08.

**Target Platform**: `core` (APIs admin), `workers` (motor de antifraude, KPIs, prazos, filas), `admin-web`, telas no painel e no consumidor.

**Project Type**: domínio de gestão + console administrativo.

**Performance Goals**: busca de tenant ≤ 500 ms; detalhe composto ≤ 2 s (partes com timeout); alerta gerado ≤ 1 min após o sinal.

**Constraints**: sem acesso direto a dados de tenant; PII mascarada por padrão; decisões automatizadas limitadas (LGPD art. 20); custo zero (sem bureau pago).

**Scale/Scope**: 500 tenants; equipe da Gestão de 3–10 pessoas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Portão | Situação | Resultado |
|---|---|---|---|
| G-I | Agenda | Sem escrita de agenda | ✅ N/A |
| G-II | Isolamento | Só contratos e projeções; teste de arquitetura | ✅ |
| G-III | Dinheiro | Concessões e estornos pelas specs donas (019, 012) com idempotência | ✅ |
| G-IV | Dados pessoais | Mascaramento padrão; revelação justificada; anotações nunca expostas; LGPD art. 20 (revisão humana) | ✅ |
| G-V | Permissões e auditoria | Célula por tela e ação; toda decisão com motivo e trilha; segunda pessoa | ✅ |
| G-VI | Rastreabilidade | Sem PEN aberta nesta spec | ✅ |
| G-VII | Contratos | [backoffice.openapi.yaml](./contracts/backoffice.openapi.yaml), [backoffice-events.asyncapi.yaml](./contracts/backoffice-events.asyncapi.yaml) | ✅ |
| G-VIII | Testes antes | Matriz, arquitetura, limites de automação | ✅ |
| G-IX | Outbox | Ações por evento às specs donas; idempotentes | ✅ |
| G-X | Observabilidade | KPIs, prazos de filas, métricas de "sem segunda pessoa" | ✅ |
| G-XI | Figma, a11y | G01, G02, G04, G06, G08; filas reunidas e telas do painel/consumidor a desenhar | ✅ com pendência de protótipo |
| G-XII | Complexidade | Motor de regras justificado abaixo | ✅ com justificativa |

**Reavaliação pós-design**: mantida.

## Project Structure

### Documentation (this feature, local only)

```text
specs/021-backoffice-gestao/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── backoffice.openapi.yaml
    └── backoffice-events.asyncapi.yaml
```

### Source Code (repository root)

```text
services/backoffice/src/{overview,tenants,reveal,onboarding,grants,fraud,chargebacks,refunds,dual-control,queues}/
packages/domain/fraud-rules/             # motor declarativo
packages/platform/pii-mask/
apps/admin-web/src/routes/{overview,tenants,onboarding,grants,antifraud,queues}   # G01 G02 G04 G06 G08 + filas
apps/tenant-web/src/routes/backoffice-requests   # pedidos de documento, concessão, complemento
apps/consumer-mobile · consumer-web      # aviso de bloqueio e revisão
```

**Structure Decision**: domínio `backoffice` no `core` (CONST 4.4), compondo contratos das specs donas; motor de antifraude no `workers`.

## Complexity Tracking

| Complexidade | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| Motor de regras declarativo e versionado | Regras e limites configuráveis sem deploy (CONST 8), com versão gravada em cada alerta para explicar a decisão (CONST 5) | Regras fixas no código (exigiriam deploy e não guardariam a versão aplicada) |

## Riscos e pendências

- **Telas a desenhar**: filas reunidas (back-office), pedidos ao tenant no painel e aviso de bloqueio ao consumidor.
- **Consulta de CNPJ**: serviço público gratuito pode ficar fora do ar; degradação graciosa.
- **Equipe pequena**: a marca "sem segunda pessoa" deve ser acompanhada até a Gestão ter duas pessoas por perfil.
